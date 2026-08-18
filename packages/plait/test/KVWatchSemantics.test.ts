import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test"

import { StorageType } from "@nats-io/jetstream"
import { Kvm, KvWatchInclude, type KvWatchEntry } from "@nats-io/kv"
import type { QueuedIterator, Status } from "@nats-io/nats-core"
import { connect } from "@nats-io/transport-node"

import {
  buildServerBinary,
  startNatsServer,
  type NatsHarness,
  type NatsServerBinary,
} from "./NatsHarness.js"

const encode = (value: string): Uint8Array => new TextEncoder().encode(value)

interface EntrySnapshot {
  readonly key: string
  readonly value: string
  readonly revision: number
  readonly operation: "PUT" | "DEL" | "PURGE"
  readonly isUpdate: boolean
}

const snapshot = (entry: KvWatchEntry): EntrySnapshot => ({
  key: entry.key,
  value: entry.string(),
  revision: entry.revision,
  operation: entry.operation,
  isUpdate: entry.isUpdate,
})

const withDeadline = async <A>(
  operation: Promise<A>,
  label: string,
  milliseconds = 10_000,
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

const collect = async (
  watcher: QueuedIterator<KvWatchEntry>,
  count: number,
  label: string,
): Promise<ReadonlyArray<EntrySnapshot>> =>
  withDeadline((async () => {
    const entries: Array<EntrySnapshot> = []
    for await (const entry of watcher) {
      entries.push(snapshot(entry))
      if (entries.length === count) break
    }
    return entries
  })(), label)

const waitForStatus = async (
  statuses: AsyncIterator<Status>,
  wanted: Status["type"],
): Promise<Status> =>
  withDeadline((async () => {
    while (true) {
      const next = await statuses.next()
      if (next.done) throw new Error(`connection status ended before ${wanted}`)
      if (next.value.type === wanted) return next.value
    }
  })(), `connection status ${wanted}`)

let built: NatsServerBinary
let harness: NatsHarness | undefined

beforeAll(async () => {
  built = await buildServerBinary()
})

afterAll(async () => {
  await built.cleanup()
})

beforeEach(async () => {
  harness = await startNatsServer(built.binary)
})

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

describe("ninth substrate suite: @nats-io/kv 3.4.0 watch semantics", () => {
  test("default replay coalesces to the latest value per key and preserves bucket order", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      const kv = await new Kvm(connection).create("WATCH_REPLAY", {
        history: 64,
        replicas: 1,
        storage: StorageType.File,
      })
      expect(await kv.put("alpha", encode("alpha-1"))).toBe(1)
      expect(await kv.put("beta", encode("beta-1"))).toBe(2)
      expect(await kv.put("alpha", encode("alpha-2"))).toBe(3)

      const watcher = await kv.watch()
      expect(await kv.put("beta", encode("beta-2"))).toBe(4)
      expect(await kv.put("alpha", encode("alpha-3"))).toBe(5)

      const entries = await collect(watcher, 4, "coalesced replay and live updates")
      expect(entries).toEqual([
        { key: "beta", value: "beta-1", revision: 2, operation: "PUT", isUpdate: false },
        { key: "alpha", value: "alpha-2", revision: 3, operation: "PUT", isUpdate: true },
        { key: "beta", value: "beta-2", revision: 4, operation: "PUT", isUpdate: true },
        { key: "alpha", value: "alpha-3", revision: 5, operation: "PUT", isUpdate: true },
      ])

      const oneKeyReplay = await kv.watch({ key: "alpha" })
      expect(await collect(oneKeyReplay, 1, "one-key initial replay")).toEqual([
        { key: "alpha", value: "alpha-3", revision: 5, operation: "PUT", isUpdate: true },
      ])

      console.info(
        "SUBSTRATE KV WATCH TRACE default-replay=[beta@2,alpha@3] pre-watch-alpha@1=coalesced live=[beta@4,alpha@5] order=bucket-global initial-isUpdate=two-key:[false,true],one-key:[true]",
      )
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("a bounded connected live burst is delivered without coalescing", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      const kv = await new Kvm(connection).create("WATCH_LIVE_BURST", {
        history: 64,
        replicas: 1,
        storage: StorageType.File,
      })
      const watcher = await kv.watch({
        key: "burst",
        include: KvWatchInclude.UpdatesOnly,
      })
      const entriesPromise = collect(watcher, 32, "32 live watch entries")

      for (let revision = 1; revision <= 32; revision++) {
        expect(await kv.put("burst", encode(`value-${revision}`))).toBe(revision)
      }

      const entries = await entriesPromise
      expect(entries.map((entry) => entry.revision)).toEqual(
        Array.from({ length: 32 }, (_, index) => index + 1),
      )
      expect(entries.map((entry) => entry.value)).toEqual(
        Array.from({ length: 32 }, (_, index) => `value-${index + 1}`),
      )
      expect(entries.every((entry) => entry.isUpdate)).toBe(true)

      console.info(
        "SUBSTRATE KV WATCH TRACE connected-live-burst=32/32 order=1..32 coalesced=0 bound=single-node-R1-one-connected-client",
      )
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("delete and purge markers are delivered and resume uses an inclusive bucket revision", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      const kv = await new Kvm(connection).create("WATCH_RESUME", {
        history: 64,
        replicas: 1,
        storage: StorageType.File,
      })
      const tombstones = await kv.watch({
        key: "tombstone",
        include: KvWatchInclude.UpdatesOnly,
      })
      const tombstoneEntriesPromise = collect(tombstones, 4, "live tombstone entries")

      expect(await kv.put("tombstone", encode("before-delete"))).toBe(1)
      await kv.delete("tombstone")
      expect(await kv.put("tombstone", encode("before-purge"))).toBe(3)
      await kv.purge("tombstone")

      expect(await tombstoneEntriesPromise).toEqual([
        { key: "tombstone", value: "before-delete", revision: 1, operation: "PUT", isUpdate: true },
        { key: "tombstone", value: "", revision: 2, operation: "DEL", isUpdate: true },
        { key: "tombstone", value: "before-purge", revision: 3, operation: "PUT", isUpdate: true },
        { key: "tombstone", value: "", revision: 4, operation: "PURGE", isUpdate: true },
      ])

      const firstWatcher = await kv.watch({
        key: "resume",
        include: KvWatchInclude.UpdatesOnly,
      })
      const firstEntryPromise = collect(firstWatcher, 1, "entry before watcher stop")
      const firstSeen = await kv.put("resume", encode("seen-before-stop"))
      expect(firstSeen).toBe(5)
      expect(await firstEntryPromise).toEqual([
        {
          key: "resume",
          value: "seen-before-stop",
          revision: 5,
          operation: "PUT",
          isUpdate: true,
        },
      ])
      expect(await kv.put("other", encode("bucket-gap"))).toBe(6)
      const firstMissed = await kv.put("resume", encode("missed-put"))
      expect(firstMissed).toBe(7)
      await kv.delete("resume")

      const resumed = await kv.watch({ key: "resume", resumeFromRevision: firstMissed })
      expect(await collect(resumed, 2, "inclusive resumed entries")).toEqual([
        { key: "resume", value: "missed-put", revision: 7, operation: "PUT", isUpdate: false },
        { key: "resume", value: "", revision: 8, operation: "DEL", isUpdate: true },
      ])

      const afterLastSeen = await kv.watch({
        key: "resume",
        resumeFromRevision: firstSeen + 1,
      })
      expect(await collect(afterLastSeen, 2, "entries after last seen revision")).toEqual([
        { key: "resume", value: "missed-put", revision: 7, operation: "PUT", isUpdate: false },
        { key: "resume", value: "", revision: 8, operation: "DEL", isUpdate: true },
      ])

      console.info(
        "SUBSTRATE KV WATCH TRACE tombstones=[PUT@1,DEL@2,PUT@3,PURGE@4] marker-bytes=empty resume=start-inclusive cursor=bucket-global first-seen=5 gap-other=6 resumed=[PUT@7,DEL@8]",
      )
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("a watcher catches up an update published during a forced client reconnect", async () => {
    const writerConnection = await connect({ servers: harness!.url })
    const watcherConnection = await connect({
      servers: harness!.url,
      maxReconnectAttempts: 10,
      reconnectDelayHandler: () => 750,
    })
    try {
      const writer = await new Kvm(writerConnection).create("WATCH_RECONNECT", {
        history: 64,
        replicas: 1,
        storage: StorageType.File,
      })
      const reader = await new Kvm(watcherConnection).open("WATCH_RECONNECT")
      const watcher = await reader.watch({
        key: "reconnect",
        include: KvWatchInclude.UpdatesOnly,
      })
      const statuses = watcherConnection.status()[Symbol.asyncIterator]()

      await watcherConnection.reconnect()
      await waitForStatus(statuses, "disconnect")
      expect(await writer.put("reconnect", encode("during-disconnect"))).toBe(1)
      await waitForStatus(statuses, "reconnect")
      expect(await writer.put("reconnect", encode("after-reconnect"))).toBe(2)

      const entries = await collect(watcher, 2, "entries spanning reconnect")
      expect(entries).toEqual([
        {
          key: "reconnect",
          value: "during-disconnect",
          revision: 1,
          operation: "PUT",
          isUpdate: true,
        },
        {
          key: "reconnect",
          value: "after-reconnect",
          revision: 2,
          operation: "PUT",
          isUpdate: true,
        },
      ])

      console.info(
        "SUBSTRATE KV WATCH TRACE reconnect=forced-750ms during-disconnect=[revision-1] after-reconnect=[revision-2] delivered=[1,2] bound=same-server-same-consumer-no-process-restart",
      )
    } finally {
      await watcherConnection.close()
      await writerConnection.close()
    }
  }, 120_000)
})
