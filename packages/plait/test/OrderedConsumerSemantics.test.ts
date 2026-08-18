import { createServer, connect as netConnect, type Socket } from "node:net"

import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import {
  DeliverPolicy,
  ReplayPolicy,
  StorageType,
  jetstream,
  jetstreamManager,
  type ConsumerMessages,
  type ConsumerNotification,
  type JsMsg,
} from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"

import { PUMP_BUFFER_BOUND } from "../src/internal/pump.js"
import {
  buildServerBinary,
  startNatsServer,
  type NatsHarness,
  type NatsServerBinary,
} from "./NatsHarness.js"

const encode = (value: string): Uint8Array => new TextEncoder().encode(value)

const withDeadline = async <A>(
  operation: Promise<A>,
  label: string,
  milliseconds = 15_000,
): Promise<A> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), milliseconds)
  })
  try {
    return await Promise.race([operation, deadline])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

const nextMessage = async (iterator: AsyncIterator<JsMsg>, label: string): Promise<JsMsg> => {
  const next = await withDeadline(iterator.next(), label)
  if (next.done) throw new Error(`consumer ended before ${label}`)
  return next.value
}

const sequence = (message: JsMsg): number => message.info.streamSequence

const observeUntil = (
  messages: ConsumerMessages,
  wanted: ConsumerNotification["type"],
  sink: Array<ConsumerNotification> = [],
): Promise<ReadonlyArray<ConsumerNotification>> =>
  withDeadline((async () => {
    for await (const notification of messages.status()) {
      sink.push(notification)
      if (notification.type === wanted) return sink
    }
    throw new Error(`consumer status ended before ${wanted}`)
  })(), `consumer notification ${wanted}`)

interface RequestCountingProxy {
  readonly url: string
  readonly counts: () => { readonly batch: number; readonly perMessage: number }
  readonly stop: () => Promise<void>
}

interface InboundHoldProxy {
  readonly url: string
  readonly hold: () => void
  readonly release: () => void
  readonly stop: () => Promise<void>
}

/** Holds server-to-client frames while client-to-server management traffic continues. */
const startInboundHoldProxy = async (upstreamUrl: string): Promise<InboundHoldProxy> => {
  const target = new URL(upstreamUrl)
  const sockets = new Set<Socket>()
  let holding = false
  const held = new Map<Socket, Array<Buffer>>()

  const server = createServer((client) => {
    const upstream = netConnect(Number(target.port), target.hostname)
    sockets.add(client)
    sockets.add(upstream)
    held.set(client, [])

    upstream.on("data", (chunk: Buffer) => {
      if (holding) {
        held.get(client)?.push(Buffer.from(chunk))
      } else {
        client.write(chunk)
      }
    })
    client.on("data", (chunk) => {
      upstream.write(chunk)
    })

    const drop = (): void => {
      held.delete(client)
      client.destroy()
      upstream.destroy()
    }
    client.on("close", drop)
    client.on("error", drop)
    upstream.on("close", drop)
    upstream.on("error", drop)
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (address === null || typeof address === "string") {
    throw new Error("inbound-hold proxy did not bind a TCP port")
  }
  return {
    url: `nats://127.0.0.1:${address.port}`,
    hold: () => {
      holding = true
    },
    release: () => {
      holding = false
      for (const [client, chunks] of held) {
        for (const chunk of chunks) client.write(chunk)
        chunks.length = 0
      }
    },
    stop: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy()
      server.close(() => resolve())
    }),
  }
}

const parsePayloadLength = (line: string): number => {
  const bytes = Number(line.slice(line.lastIndexOf(" ") + 1))
  if (!Number.isSafeInteger(bytes)) throw new Error(`unparseable NATS frame: ${line}`)
  return bytes
}

/** Counts the two read request subjects at the wire while forwarding every frame unchanged. */
const startRequestCountingProxy = async (
  upstreamUrl: string,
  stream: string,
): Promise<RequestCountingProxy> => {
  const target = new URL(upstreamUrl)
  const sockets = new Set<Socket>()
  let batch = 0
  let perMessage = 0
  const batchSubject = `$JS.API.DIRECT.GET.${stream}`
  const perMessageSubject = `$JS.API.STREAM.MSG.GET.${stream}`

  const server = createServer((client) => {
    const upstream = netConnect(Number(target.port), target.hostname)
    sockets.add(client)
    sockets.add(upstream)
    let pending = Buffer.alloc(0)

    upstream.on("data", (chunk) => {
      client.write(chunk)
    })
    client.on("data", (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk])
      while (true) {
        const eol = pending.indexOf("\r\n")
        if (eol === -1) return
        const line = pending.subarray(0, eol).toString("latin1")
        let frameEnd = eol + 2
        if (line.startsWith("PUB ") || line.startsWith("HPUB ")) {
          frameEnd += parsePayloadLength(line) + 2
          if (pending.length < frameEnd) return
        }
        const frame = Buffer.from(pending.subarray(0, frameEnd))
        pending = pending.subarray(frameEnd)
        const subject = line.split(" ")[1]
        if (subject === batchSubject) batch += 1
        if (subject === perMessageSubject) perMessage += 1
        upstream.write(frame)
      }
    })

    const drop = (): void => {
      client.destroy()
      upstream.destroy()
    }
    client.on("close", drop)
    client.on("error", drop)
    upstream.on("close", drop)
    upstream.on("error", drop)
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (address === null || typeof address === "string") {
    throw new Error("request-counting proxy did not bind a TCP port")
  }
  return {
    url: `nats://127.0.0.1:${address.port}`,
    counts: () => ({ batch, perMessage }),
    stop: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy()
      server.close(() => resolve())
    }),
  }
}

let built: NatsServerBinary
let harness: NatsHarness | undefined

beforeAll(async () => {
  built = await buildServerBinary()
})

beforeEach(async () => {
  harness = await startNatsServer(built.binary)
})

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

describe("tenth substrate suite: @nats-io/jetstream 3.4.0 ordered-consumer semantics", () => {
  test("a consumer-sequence gap recreates from last delivered stream sequence plus one", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      const streamName = "ORDERED_GAP"
      const subject = "ordered.gap"
      const manager = await jetstreamManager(connection)
      const js = jetstream(connection)
      await manager.streams.add({
        name: streamName,
        subjects: [subject],
        storage: StorageType.File,
        num_replicas: 1,
      })
      for (let value = 1; value <= 2; value++) {
        expect((await js.publish(subject, encode(String(value)))).seq).toBe(value)
      }

      const consumer = await js.consumers.get(streamName, {
        filter_subjects: subject,
        deliver_policy: DeliverPolicy.All,
        replay_policy: ReplayPolicy.Instant,
      })
      const messages = await consumer.consume({
        max_messages: 2,
        idle_heartbeat: 500,
        expires: 2_000,
      })
      const iterator = messages[Symbol.asyncIterator]()
      const delivered = [
        sequence(await nextMessage(iterator, "gap prefix sequence 1")),
        sequence(await nextMessage(iterator, "gap prefix sequence 2")),
      ]
      const oldName = (await consumer.info(true)).name
      const observed: Array<ConsumerNotification> = []
      const notificationsPromise = observeUntil(messages, "ordered_consumer_recreated", observed)

      // Reset the server-side delivery cursor beyond the two messages the
      // client has accepted. The next delivery has consumer sequence 1 where
      // the ordered client expects 3, so the vector discriminates a real gap.
      await withDeadline(
        manager.consumers.reset(streamName, oldName, 5),
        "server-side consumer reset",
      )
      for (let value = 3; value <= 8; value++) {
        expect((await js.publish(subject, encode(String(value)))).seq).toBe(value)
      }
      for (let value = 3; value <= 8; value++) {
        delivered.push(sequence(await nextMessage(iterator, `gap recovery sequence ${value}`)))
      }

      const notifications = await notificationsPromise
      expect(delivered).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(new Set(delivered).size).toBe(delivered.length)
      expect(notifications.some((event) => event.type === "reset" && event.name === oldName)).toBe(true)
      const recreated = notifications.find((event) => event.type === "ordered_consumer_recreated")
      expect(recreated?.type === "ordered_consumer_recreated" && recreated.name).not.toBe(oldName)

      console.info(
        `SUBSTRATE ORDERED TRACE gap=server-reset-to-5 last-delivered=2 delivered=[${delivered.join(",")}] reset=${oldName} recreated=${recreated?.type === "ordered_consumer_recreated" ? recreated.name : "missing"} skipped=0 duplicates=0`,
      )
      // No downstream pull is outstanding here, so the pin queues its
      // iterator stop until a future pull. Teardown is synchronous; do not
      // await the otherwise unreachable iterator-closed promise.
      void messages.close().catch(() => undefined)
      await consumer.delete()
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("heartbeat loss after consumer deletion recreates at the same no-skip-no-dupe cursor", async () => {
    const writerConnection = await connect({ servers: harness!.url })
    const proxy = await startInboundHoldProxy(harness!.url)
    const readerConnection = await connect({ servers: proxy.url })
    try {
      const streamName = "ORDERED_HEARTBEAT"
      const subject = "ordered.heartbeat"
      const writerManager = await jetstreamManager(writerConnection)
      const writer = jetstream(writerConnection)
      const reader = jetstream(readerConnection)
      await writerManager.streams.add({
        name: streamName,
        subjects: [subject],
        storage: StorageType.File,
        num_replicas: 1,
      })
      for (let value = 1; value <= 2; value++) {
        expect((await writer.publish(subject, encode(String(value)))).seq).toBe(value)
      }

      const consumer = await reader.consumers.get(streamName, {
        filter_subjects: subject,
        deliver_policy: DeliverPolicy.All,
        replay_policy: ReplayPolicy.Instant,
      })
      const messages = await consumer.consume({
        max_messages: 2,
        idle_heartbeat: 500,
        expires: 2_000,
      })
      const iterator = messages[Symbol.asyncIterator]()
      const delivered = [
        sequence(await nextMessage(iterator, "heartbeat prefix sequence 1")),
        sequence(await nextMessage(iterator, "heartbeat prefix sequence 2")),
      ]
      const oldName = (await consumer.info(true)).name
      const heartbeatPromise = observeUntil(messages, "heartbeats_missed")
      const notificationsPromise = observeUntil(messages, "ordered_consumer_recreated")

      // Park one pull, withhold every server reply, and remove the underlying
      // ephemeral consumer while the client still believes it is live. The
      // local heartbeat monitor is now the event that starts recovery; the
      // manager lookup it performs can still reach the server through the
      // unblocked client-to-server half of the proxy.
      const firstRecoveryMessage = nextMessage(iterator, "heartbeat recovery sequence 3")
      await Bun.sleep(50)
      proxy.hold()
      expect(await writerManager.consumers.delete(streamName, oldName)).toBe(true)
      for (let value = 3; value <= 8; value++) {
        expect((await writer.publish(subject, encode(String(value)))).seq).toBe(value)
      }
      const heartbeatNotifications = await heartbeatPromise
      proxy.release()

      delivered.push(sequence(await firstRecoveryMessage))
      for (let value = 4; value <= 8; value++) {
        delivered.push(sequence(await nextMessage(iterator, `heartbeat recovery sequence ${value}`)))
      }

      const notifications = await notificationsPromise
      expect(delivered).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
      expect(new Set(delivered).size).toBe(delivered.length)
      expect(notifications.some((event) => event.type === "consumer_deleted")).toBe(true)
      expect(heartbeatNotifications.some((event) => event.type === "heartbeats_missed")).toBe(true)
      const recreated = notifications.find((event) => event.type === "ordered_consumer_recreated")
      expect(recreated?.type === "ordered_consumer_recreated" && recreated.name).not.toBe(oldName)

      console.info(
        `SUBSTRATE ORDERED TRACE heartbeat-loss=inbound-hold deleted=${oldName} delivered=[${delivered.join(",")}] heartbeat-notifications=[${heartbeatNotifications.map((event) => event.type).join(",")}] recovery-notifications=[${notifications.map((event) => event.type).join(",")}] recreated=${recreated?.type === "ordered_consumer_recreated" ? recreated.name : "missing"} skipped=0 duplicates=0`,
      )
      void messages.close().catch(() => undefined)
      await consumer.delete()
    } finally {
      proxy.release()
      await readerConnection.close()
      await proxy.stop()
      await writerConnection.close()
    }
  }, 120_000)

  test("direct consumer deletion enters a no-responders repull loop before heartbeat recovery", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      const streamName = "ORDERED_DELETION"
      const subject = "ordered.deletion"
      const manager = await jetstreamManager(connection)
      const js = jetstream(connection)
      await manager.streams.add({
        name: streamName,
        subjects: [subject],
        storage: StorageType.File,
        num_replicas: 1,
      })
      expect((await js.publish(subject, encode("1"))).seq).toBe(1)
      expect((await js.publish(subject, encode("2"))).seq).toBe(2)

      const consumer = await js.consumers.get(streamName, {
        filter_subjects: subject,
        deliver_policy: DeliverPolicy.All,
        replay_policy: ReplayPolicy.Instant,
      })
      const messages = await consumer.consume({
        max_messages: 2,
        idle_heartbeat: 500,
        expires: 2_000,
      })
      const iterator = messages[Symbol.asyncIterator]()
      expect(sequence(await nextMessage(iterator, "deletion prefix sequence 1"))).toBe(1)
      expect(sequence(await nextMessage(iterator, "deletion prefix sequence 2"))).toBe(2)
      const oldName = (await consumer.info(true)).name
      const notificationsPromise = withDeadline((async () => {
        const observed: Array<ConsumerNotification> = []
        let noResponders = 0
        for await (const notification of messages.status()) {
          observed.push(notification)
          if (notification.type === "no_responders") noResponders += 1
          if (noResponders === 3) return observed
        }
        throw new Error("consumer status ended before three no-responders replies")
      })(), "three no-responders replies")

      expect(await manager.consumers.delete(streamName, oldName)).toBe(true)
      expect((await js.publish(subject, encode("3"))).seq).toBe(3)
      const blockedRead = nextMessage(iterator, "deleted consumer recovery")
      void blockedRead.catch(() => undefined)
      const notifications = await notificationsPromise

      expect(notifications.some((event) => event.type === "consumer_deleted")).toBe(true)
      expect(notifications.filter((event) => event.type === "no_responders").length).toBe(3)
      expect(notifications.some((event) => event.type === "heartbeats_missed")).toBe(false)
      expect(notifications.some((event) => event.type === "ordered_consumer_recreated")).toBe(false)

      console.info(
        `SUBSTRATE ORDERED TRACE direct-delete=${oldName} bounded-notifications=[${notifications.map((event) => event.type).join(",")}] heartbeat-missed=0 recreated=0 finding=consume-repulls-deleted-name`,
      )
      void messages.close().catch(() => undefined)
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("max_messages keeps a slower downstream near the pump bound without loss", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      const streamName = "ORDERED_SLOW_READER"
      const subject = "ordered.slow"
      const load = PUMP_BUFFER_BOUND * 4
      const manager = await jetstreamManager(connection)
      const js = jetstream(connection)
      await manager.streams.add({
        name: streamName,
        subjects: [subject],
        storage: StorageType.File,
        num_replicas: 1,
      })
      await Promise.all(
        Array.from({ length: load }, (_, index) => js.publish(subject, encode(String(index + 1)))),
      )

      const consumer = await js.consumers.get(streamName, {
        filter_subjects: subject,
        deliver_policy: DeliverPolicy.All,
        replay_policy: ReplayPolicy.Instant,
      })
      const messages = await consumer.consume({
        max_messages: PUMP_BUFFER_BOUND,
        idle_heartbeat: 2_000,
        expires: 4_000,
      })

      const iterator = messages[Symbol.asyncIterator]()
      const delivered: Array<number> = []
      let peakPending = 0
      let secondPullObserved = false
      const secondPullPromise = withDeadline((async () => {
        let pulls = 0
        for await (const notification of messages.status()) {
          if (notification.type !== "next") continue
          pulls += 1
          if (pulls === 2) {
            secondPullObserved = true
            return
          }
        }
        throw new Error("consumer status ended before the second pull")
      })(), "second consume pull")
      let pausedAfterRefill = false
      for (let value = 1; value <= load; value++) {
        delivered.push(sequence(await nextMessage(iterator, `slow-reader sequence ${value}`)))
        peakPending = Math.max(peakPending, messages.getPending())
        if (!pausedAfterRefill) await Bun.sleep(0)
        // The status event is emitted at the exact point the refill request is
        // published. Pause on that event, rather than on a scheduler-derived
        // message number, and let the refilled batch outrun downstream work.
        if (secondPullObserved && !pausedAfterRefill) {
          pausedAfterRefill = true
          await Bun.sleep(250)
          peakPending = Math.max(peakPending, messages.getPending())
        }
      }
      await secondPullPromise

      expect(pausedAfterRefill).toBe(true)
      expect(peakPending).toBeGreaterThanOrEqual(PUMP_BUFFER_BOUND)
      expect(peakPending).toBeLessThan(load)
      expect(delivered).toEqual(Array.from({ length: load }, (_, index) => index + 1))
      expect(new Set(delivered).size).toBe(delivered.length)

      console.info(
        `SUBSTRATE ORDERED TRACE slow-reader load=${load} max_messages=${PUMP_BUFFER_BOUND} client-peak-pending=${peakPending} delivered=${delivered.length} skipped=0 duplicates=0`,
      )
      void messages.close().catch(() => undefined)
      await consumer.delete()
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("direct getBatch uses one request where the per-message management walk uses one per sequence", async () => {
    const streamName = "ORDERED_BATCH_READ"
    const subject = "ordered.batch"
    const load = 256
    const writerConnection = await connect({ servers: harness!.url })
    const proxy = await startRequestCountingProxy(harness!.url, streamName)
    const readerConnection = await connect({ servers: proxy.url })
    try {
      const writerManager = await jetstreamManager(writerConnection)
      const writer = jetstream(writerConnection)
      await writerManager.streams.add({
        name: streamName,
        subjects: [subject],
        storage: StorageType.File,
        num_replicas: 1,
        allow_direct: true,
      })
      for (let value = 1; value <= load; value++) {
        await writer.publish(subject, encode(String(value)))
      }

      const readerManager = await jetstreamManager(readerConnection)
      const perMessageStarted = performance.now()
      const perMessage: Array<{ readonly seq: number; readonly value: string }> = []
      for (let seq = 1; seq <= load; seq++) {
        const stored = await readerManager.streams.getMessage(streamName, { seq })
        if (stored === null) throw new Error(`per-message read missed stream sequence ${seq}`)
        perMessage.push({ seq: stored.seq, value: stored.string() })
      }
      const perMessageMilliseconds = performance.now() - perMessageStarted

      const batchStarted = performance.now()
      const batch: Array<{ readonly seq: number; readonly value: string }> = []
      for await (const stored of await readerManager.direct.getBatch(streamName, { seq: 1, batch: load })) {
        batch.push({ seq: stored.seq, value: stored.string() })
      }
      const batchMilliseconds = performance.now() - batchStarted

      expect(batch).toEqual(perMessage)
      expect(batch.map((entry) => entry.seq)).toEqual(
        Array.from({ length: load }, (_, index) => index + 1),
      )
      expect(proxy.counts()).toEqual({ batch: 1, perMessage: load })

      console.info(
        `SUBSTRATE ORDERED TRACE batch-read messages=${load} getBatch-requests=1 getBatch-ms=${batchMilliseconds.toFixed(2)} per-message-requests=${load} per-message-ms=${perMessageMilliseconds.toFixed(2)} sequence-payload-equality=true`,
      )
    } finally {
      await readerConnection.close()
      await proxy.stop()
      await writerConnection.close()
    }
  }, 120_000)
})
