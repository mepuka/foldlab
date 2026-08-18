import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { connect as connectSocket } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { jetstream, jetstreamManager, StorageType } from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect, Layer, Schema } from "effect"

import { evidenceSubject } from "../src/kernel/Subjects.js"
import {
  BlobReference,
  decodeEnvelope,
  EMIT_HEADER_BYTES,
  EMIT_PAYLOAD_BUDGET_BYTES,
  INLINE_BODY_MARGIN,
  INLINE_BODY_MAX_BYTES,
  MAX_PAYLOAD_BYTES,
} from "../src/kernel/Wire.js"
import { Blobs } from "../src/planes/Blob.js"
import { declare, emit, Lanes } from "../src/planes/Lane.js"
import { canonicalBytes } from "../src/truth/Canonical.js"
import { Digest } from "../src/truth/Digest.js"
import { laneStreamName } from "../src/internal/lanes.js"
import {
  buildServerBinary,
  startNatsServer,
  type NatsHarness,
  type NatsServerBinary,
} from "./NatsHarness.js"
import { testFileSystemLayer } from "./TestFileSystem.js"

/**
 * The scorecard's one UNANSWERED item, measured
 * (`docs/research/2026-08-13-nats-vendor-corpus-scorecard.md`, item 4: "max_payload
 * — UNANSWERED by corpus (term appears once, bare)").
 *
 * Two halves travel together here and neither is evidence alone. The first
 * measures the effective publish limit on the pinned embedded server — from the
 * server's own INFO block, from the server's own enforcement past a raw socket,
 * and from the pinned client's local enforcement — so `MAX_PAYLOAD_BYTES` and
 * `EMIT_HEADER_BYTES` are numbers this suite produced rather than numbers a
 * vendor document was read for. The second pins the inline/blob threshold
 * against what was measured: the arithmetic the margin claims is checked over
 * the constants, the worst emit the threshold admits is landed on the wire, an
 * emit past the threshold is refused structurally before anything is published,
 * and the taught repair is followed to a landed envelope that cites its payload
 * by digest.
 *
 * Its negative control is the last row and it is a real substrate, not a mutant:
 * a pinned server started with a lowered `max_payload` makes the seam refuse. A
 * shape check that cannot fail would be the folklore this ticket exists to end.
 *
 * **Stated bound.** Every number here is the DEFAULT at `v2.14.4` on one
 * single-node embedded server. `max_payload` is operator-set server
 * configuration, which is exactly why the seam checks the live value rather than
 * trusting the pin, and nothing here measures a cluster, a leaf node, or a
 * gateway — each of which carries its own budget.
 */

const utf8 = new TextEncoder()
const eventSchema = Digest.make("c".repeat(64))

/**
 * The lane whose worst case the margin has to absorb: an empty partition-key
 * path keys by the whole event, so `key` and `body` carry the same value and one
 * emit publishes the body twice. Its event admits either an inline payload or
 * the blob reference the refusal teaches, which is what lets the control and its
 * repair run against one declaration.
 */
const Event = Schema.Union([Schema.String, BlobReference])

const declareDoublingLane = (handle: string) =>
  declare({
    handle,
    event: Event,
    eventSchema,
    partitions: 1 as const,
    partitionKey: { path: [] },
  })

/** A body whose canonical bytes are exactly `bytes` long: a JSON string adds two. */
const bodyOfCanonicalSize = (bytes: number): string => "x".repeat(bytes - 2)

const address = (url: string): { readonly host: string; readonly port: number } => {
  const parsed = new URL(url.includes("://") ? url : `nats://${url}`)
  return { host: parsed.hostname, port: Number(parsed.port) }
}

/**
 * What the SERVER answers to a PUB declaring `declared` bytes, past the pinned
 * client's own local check.
 *
 * The handshake is staged — CONNECT, wait for `+OK`, then the PUB — so the
 * server's verdict on the message is never confused with its verdict on the
 * connection. `pedantic` is on so the server validates rather than assumes.
 *
 * `body` is how many bytes actually follow the header, and the two probes below
 * need different answers to it. An admitted message is only acknowledged once it
 * is complete, so the accepted arm sends its whole body. A refused one is
 * decided on the declared size in the header alone, and sending the body anyway
 * would race the server's teardown: the server answers and closes, and the reset
 * drops the `-ERR` still sitting in the receive buffer, which reads as a silent
 * disconnect and measures this host's TCP stack instead of the server.
 */
const serverAnswerToPub = (
  url: string,
  declared: number,
  body: number,
): Promise<string> =>
  new Promise((resolve) => {
    const socket = connectSocket(address(url))
    let seen = ""
    let stage: "info" | "connect" | "published" = "info"
    const settle = (answer: string): void => {
      socket.destroy()
      resolve(answer)
    }
    socket.on("data", (chunk) => {
      seen += chunk.toString("latin1")
      if (stage === "info" && seen.startsWith("INFO ")) {
        stage = "connect"
        socket.write('CONNECT {"verbose":true,"pedantic":true,"protocol":1}\r\n')
        return
      }
      if (stage === "connect" && seen.includes("+OK")) {
        stage = "published"
        socket.write(`PUB flb.probe.raw ${declared}\r\n`)
        if (body > 0) {
          socket.write(Buffer.alloc(body, 0x78))
          socket.write("\r\n")
        }
        return
      }
      if (stage !== "published") return
      if (seen.includes("-ERR")) {
        settle((seen.slice(seen.indexOf("-ERR")).split("\r\n")[0] ?? "").trim())
      } else if ((seen.match(/\+OK/g) ?? []).length >= 2) {
        settle("+OK")
      }
    })
    socket.on("close", () => resolve(`closed with no answer at stage ${stage}`))
    socket.on("error", (cause) => resolve(`socket error: ${(cause as Error).message}`))
    setTimeout(() => settle(`no answer within ten seconds at stage ${stage}`), 10_000)
  })

let built: NatsServerBinary
let harness: NatsHarness | undefined
let blobRoot: string | undefined

beforeAll(async () => {
  built = await buildServerBinary()
})

beforeEach(async () => {
  harness = await startNatsServer(built.binary)
})

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
  if (blobRoot !== undefined) await rm(blobRoot, { recursive: true, force: true })
  blobRoot = undefined
})

describe("max_payload measured at the pin", () => {
  test("the server advertises the pinned budget in its own INFO block", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      expect(connection.info?.version).toBe("2.14.4")
      expect(connection.info?.max_payload).toBe(MAX_PAYLOAD_BYTES)
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("the server itself accepts the advertised budget and refuses one byte more", async () => {
    const url = harness!.url

    expect(await serverAnswerToPub(url, MAX_PAYLOAD_BYTES, MAX_PAYLOAD_BYTES)).toBe("+OK")
    expect(await serverAnswerToPub(url, MAX_PAYLOAD_BYTES + 1, 0)).toBe(
      "-ERR 'Maximum Payload Violation'",
    )
    expect(await serverAnswerToPub(url, MAX_PAYLOAD_BYTES * 2, 0)).toBe(
      "-ERR 'Maximum Payload Violation'",
    )
  }, 120_000)

  test("the pinned client enforces the same boundary locally, and does it as a caller defect", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      connection.publish("flb.probe.core", new Uint8Array(MAX_PAYLOAD_BYTES))
      await connection.flush()

      // The client refuses over-budget publishes without sending, and the class
      // it raises is `InvalidArgumentError` — which `internal/transport.ts`
      // names a caller defect and RETHROWS rather than minting a retryable
      // absence. So an emit that outgrew the budget would die as a defect, past
      // this package's whole refusal vocabulary. That is the hazard the
      // threshold's shape check exists to keep unreachable.
      expect(() =>
        connection.publish("flb.probe.core", new Uint8Array(MAX_PAYLOAD_BYTES + 1))
      ).toThrow("max_payload")
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("the emit path's Nats-Msg-Id header costs the pinned header block", async () => {
    const connection = await connect({ servers: harness!.url })
    try {
      const manager = await jetstreamManager(connection)
      await manager.streams.add({
        name: "FLB_PROBE_HEADROOM",
        subjects: ["flb.probe.js"],
        storage: StorageType.File,
        num_replicas: 1,
      })
      const js = jetstream(connection)
      // A distinct 64-character message id per attempt: a repeated id would be
      // answered from the duplicate window instead of being carried, and the
      // header's width is what is being measured, so its width may not move.
      const accepts = async (size: number, attempt: number): Promise<boolean> => {
        try {
          await js.publish("flb.probe.js", new Uint8Array(size), {
            msgID: attempt.toString(16).padStart(64, "0"),
          })
          return true
        } catch {
          return false
        }
      }

      // Bracket first, then bisect inside it: the assertions below are only
      // evidence if the boundary is known to lie between them.
      let attempt = 0
      let low = MAX_PAYLOAD_BYTES - 2 * EMIT_HEADER_BYTES
      let high = MAX_PAYLOAD_BYTES
      expect(await accepts(low, attempt++)).toBe(true)
      expect(await accepts(high, attempt++)).toBe(false)
      while (low + 1 < high) {
        const middle = Math.floor((low + high) / 2)
        if (await accepts(middle, attempt++)) low = middle
        else high = middle
      }

      expect(MAX_PAYLOAD_BYTES - low).toBe(EMIT_HEADER_BYTES)
      expect(low).toBe(EMIT_PAYLOAD_BUDGET_BYTES)

      // The independent oracle for the same number: the header block the wire
      // protocol requires for one `Nats-Msg-Id` carrying a 64-character digest,
      // counted off the grammar rather than off the server. Two routes to 91 —
      // a measurement and a derivation — and neither is the other's mirror.
      expect(
        utf8.encode(`NATS/1.0\r\nNats-Msg-Id: ${"0".repeat(64)}\r\n\r\n`).byteLength,
      ).toBe(EMIT_HEADER_BYTES)
    } finally {
      await connection.close()
    }
  }, 180_000)
})

describe("the inline threshold pinned against the measured budget", () => {
  test("the threshold is a stated margin under the measured budget", () => {
    // The margin is a quarter, and the quarter is checked rather than asserted:
    // the worst emit the threshold admits carries the body twice, so a half
    // would sit on the limit and only a quarter or smaller leaves room for the
    // envelope's own framing and the header block.
    expect(INLINE_BODY_MARGIN * INLINE_BODY_MAX_BYTES).toBe(MAX_PAYLOAD_BYTES)
    expect(INLINE_BODY_MARGIN).toBeGreaterThanOrEqual(2)
    expect(EMIT_PAYLOAD_BUDGET_BYTES).toBe(MAX_PAYLOAD_BYTES - EMIT_HEADER_BYTES)
    expect(2 * INLINE_BODY_MAX_BYTES).toBeLessThan(EMIT_PAYLOAD_BUDGET_BYTES)

    // The number the refusal quotes and the documents restate, pinned so the
    // arithmetic above cannot move it silently.
    expect(INLINE_BODY_MAX_BYTES).toBe(262144)
  })

  test("the worst emit the threshold admits lands inside the measured budget", async () => {
    const lane = await Effect.runPromise(declareDoublingLane("payload-doubling"))
    const body = bodyOfCanonicalSize(INLINE_BODY_MAX_BYTES)

    const emitted = await Effect.runPromise(
      emit(lane, body, { holder: "seat-alpha" }).pipe(
        Effect.provide(Lanes.layer({ servers: harness!.url })),
        Effect.scoped,
      ),
    )
    expect(emitted.position).toBe(1)

    const connection = await connect({ servers: harness!.url })
    try {
      const manager = await jetstreamManager(connection)
      const stored = await manager.streams.getMessage(laneStreamName(lane, 0), { seq: 1 })
      if (stored === null) throw new Error("the emitted envelope was not stored")

      // The margin, measured on the wire rather than argued: this frame really
      // does carry the body twice, and it really does fit.
      const decoded = await Effect.runPromise(decodeEnvelope(stored.data))
      expect(decoded.envelope.body).toBe(body)
      expect(decoded.envelope.key).toBe(body)
      expect(stored.data.byteLength).toBeGreaterThan(2 * INLINE_BODY_MAX_BYTES)
      expect(stored.data.byteLength + EMIT_HEADER_BYTES).toBeLessThan(MAX_PAYLOAD_BYTES)
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("an emit past the threshold refuses structurally and never reaches the wire", async () => {
    const lane = await Effect.runPromise(declareDoublingLane("payload-over-threshold"))
    const oversized = bodyOfCanonicalSize(INLINE_BODY_MAX_BYTES + 1)

    const refusal = await Effect.runPromise(
      Effect.flip(
        emit(lane, oversized, { holder: "seat-alpha" }).pipe(
          Effect.provide(Lanes.layer({ servers: harness!.url })),
          Effect.scoped,
        ),
      ),
    )

    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("inline-body-too-large")
    expect(refusal.path).toEqual(["body"])
    expect(refusal.got).toBe(INLINE_BODY_MAX_BYTES + 1)
    expect(refusal.expected).toBe(INLINE_BODY_MAX_BYTES)
    expect(refusal.law).toContain(String(INLINE_BODY_MAX_BYTES))
    expect(refusal.next[0]?.body).toEqual({ blob: "0".repeat(64) })

    // Structural means it never became carriage. The partition stream exists —
    // `emit` ensures it before encoding — and holds nothing.
    const connection = await connect({ servers: harness!.url })
    try {
      const manager = await jetstreamManager(connection)
      const info = await manager.streams.info(laneStreamName(lane, 0))
      expect(info.state.messages).toBe(0)
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("the taught repair routes the payload through the blob store and cites it by digest", async () => {
    const lane = await Effect.runPromise(declareDoublingLane("payload-taught-repair"))
    const oversized = bodyOfCanonicalSize(INLINE_BODY_MAX_BYTES + 1)
    const lanesLayer = Lanes.layer({ servers: harness!.url })

    const refusal = await Effect.runPromise(
      Effect.flip(
        emit(lane, oversized, { holder: "seat-alpha" }).pipe(
          Effect.provide(lanesLayer),
          Effect.scoped,
        ),
      ),
    )
    // The repair is FOLLOWED, not restated: the shape the emit takes below is
    // the skeleton the refusal handed back, with the store's digest in it.
    const skeleton = refusal.next[0]?.body
    expect(Schema.is(BlobReference)(skeleton)).toBe(true)

    blobRoot = await mkdtemp(join(tmpdir(), "plait-payload-blobs-"))
    const blobsLayer = Layer.provide(
      Blobs.layerFileSystem({ root: blobRoot }),
      testFileSystemLayer,
    )

    const landed = await Effect.runPromise(
      Effect.gen(function* () {
        const blobs = yield* Blobs
        const payload = yield* canonicalBytes(oversized)
        const digest = yield* blobs.put(payload)
        const emitted = yield* emit(lane, { blob: digest }, { holder: "seat-alpha" })
        // Verified get: the store re-derives over what it fetched, so the cited
        // digest is evidence about the bytes and not about the store.
        const fetched = yield* blobs.get(digest)
        return { digest, emitted, payload, fetched }
      }).pipe(
        Effect.provide(Layer.merge(lanesLayer, blobsLayer)),
        Effect.scoped,
      ),
    )

    expect(landed.emitted.position).toBe(1)
    expect(landed.fetched).toEqual(landed.payload)

    const connection = await connect({ servers: harness!.url })
    try {
      const manager = await jetstreamManager(connection)
      const stored = await manager.streams.getMessage(laneStreamName(lane, 0), { seq: 1 })
      if (stored === null) throw new Error("the repaired envelope was not stored")
      const decoded = await Effect.runPromise(decodeEnvelope(stored.data))

      expect(decoded.envelope.body).toEqual({ blob: landed.digest })
      expect(String(decoded.digest)).toBe(String(landed.emitted.digest))
      // The whole point of the repair: what crossed the wire is a reference, and
      // the payload it cites is larger than the frame that carries it.
      expect(stored.data.byteLength).toBeLessThan(INLINE_BODY_MAX_BYTES)
      expect(landed.payload.byteLength).toBeGreaterThan(stored.data.byteLength)
      expect(stored.subject).toBe(await Effect.runPromise(evidenceSubject(lane.handle, 0)))
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("the emit seam refuses a substrate advertising less than the pinned budget", async () => {
    // The negative control, and it is a real server rather than a mutant: the
    // same pinned binary, started with the one setting that has no flag.
    const lowered = await startNatsServer(built.binary, {
      config: `max_payload: ${INLINE_BODY_MAX_BYTES}\n`,
    })
    try {
      const connection = await connect({ servers: lowered.url })
      try {
        expect(connection.info?.max_payload).toBe(INLINE_BODY_MAX_BYTES)
      } finally {
        await connection.close()
      }

      const lane = await Effect.runPromise(declareDoublingLane("payload-under-pin"))
      const refusal = await Effect.runPromise(
        Effect.flip(
          emit(lane, "a body well under the threshold", { holder: "seat-alpha" }).pipe(
            Effect.provide(Lanes.layer({ servers: lowered.url })),
            Effect.scoped,
          ),
        ),
      )

      expect(refusal.sort).toBe("structural")
      expect(refusal.kind).toBe("payload-substrate-shape")
      expect(refusal.path).toEqual(["connection", "info", "max_payload"])
      expect(refusal.got).toBe(INLINE_BODY_MAX_BYTES)
      expect(refusal.expected).toBe(MAX_PAYLOAD_BYTES)
      expect(refusal.next[0]?.body).toBe(MAX_PAYLOAD_BYTES)

      // The check is a floor and refuses at acquisition, so no lane stream was
      // ensured on a substrate that cannot carry the threshold.
      const after = await connect({ servers: lowered.url })
      try {
        const manager = await jetstreamManager(after)
        expect(await manager.streams.names().next()).toEqual([])
      } finally {
        await after.close()
      }
    } finally {
      await lowered.stop()
    }
  }, 120_000)
})
