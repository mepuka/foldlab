import { afterEach, describe, expect, test } from "bun:test"
import { createServer, connect as netConnect, type Socket } from "node:net"

import { StorageType, jetstreamManager } from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Fiber } from "effect"

import { canonicalBytes } from "../src/Canonical.js"
import { FabricClient } from "../src/FabricClient.js"
import { StructuralRefusalKind, type Refusal } from "../src/Refusal.js"
import { REGISTER_BUCKET, Registers } from "../src/Register.js"
import { evidenceSubject } from "../src/Subjects.js"
import {
  decodeEnvelope,
  INLINE_BODY_MAX_BYTES,
  verifyEnvelopeDigest,
} from "../src/Wire.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

const utf8 = new TextEncoder()
const digest = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"
const envelope = (body: unknown): Uint8Array => utf8.encode(JSON.stringify({
  v: 0,
  kind: "emit",
  lane: digest,
  key: "entity-1",
  holder: "seat-a",
  body,
  pins: [],
}))

interface HoldProxy {
  readonly url: string
  /** Arms the tap: the next register-bucket publish is withheld. */
  readonly arm: () => void
  /** The barrier that resolves once one register-bucket publish is withheld. */
  readonly captured: () => Promise<void>
  /** Forwards the withheld publish, and everything queued behind it, in order. */
  readonly release: () => void
  readonly stop: () => Promise<void>
}

const registerPublishPrefixes = [
  `PUB $KV.${REGISTER_BUCKET}.`,
  `HPUB $KV.${REGISTER_BUCKET}.`,
]

/**
 * A frame-aligned TCP tap between one NATS client and the live server.
 *
 * The client-to-server stream is parsed into complete protocol commands —
 * line commands, and PUB/HPUB with their declared byte counts — so the tap
 * can withhold exactly one in-flight register write. After `arm()`, the
 * first publish command addressed into the register bucket's subject space
 * is held at the proxy instead of forwarded. Matching is on the command
 * line prefix only, never on payload bytes: the direct-get API embeds the
 * same bucket subject inside its own request. The hold is a deterministic
 * barrier — the test lands a conflicting revision over a second connection,
 * awaits its acknowledgement, and only then releases the held CAS append.
 * Server-to-client bytes always pass through untouched.
 */
const startHoldProxy = async (upstreamUrl: string): Promise<HoldProxy> => {
  const target = new URL(upstreamUrl)
  const sockets = new Set<Socket>()
  let armed = false
  let holding = false
  let released = false
  let onCapture: (() => void) | undefined
  let captureBarrier: Promise<void> | undefined
  let heldUpstream: Socket | undefined
  let held: Array<Buffer> = []

  const server = createServer((client) => {
    const upstream = netConnect(Number(target.port), target.hostname)
    sockets.add(client)
    sockets.add(upstream)
    let pending = Buffer.alloc(0)

    upstream.on("data", (chunk) => {
      client.write(chunk)
    })
    client.on("data", (chunk: Buffer) => {
      if (released) {
        upstream.write(chunk)
        return
      }
      if (holding) {
        held.push(Buffer.from(chunk))
        return
      }
      pending = Buffer.concat([pending, chunk])
      while (true) {
        const eol = pending.indexOf("\r\n")
        if (eol === -1) return
        const line = pending.subarray(0, eol).toString("latin1")
        let frameEnd = eol + 2
        if (line.startsWith("PUB ") || line.startsWith("HPUB ")) {
          const bytes = Number(line.slice(line.lastIndexOf(" ") + 1))
          if (!Number.isSafeInteger(bytes)) throw new Error(`unparseable publish frame: ${line}`)
          frameEnd = eol + 2 + bytes + 2
          if (pending.length < frameEnd) return
        }
        const frame = Buffer.from(pending.subarray(0, frameEnd))
        pending = pending.subarray(frameEnd)
        if (armed && registerPublishPrefixes.some((prefix) => line.startsWith(prefix))) {
          holding = true
          heldUpstream = upstream
          held = pending.length > 0 ? [frame, Buffer.from(pending)] : [frame]
          pending = Buffer.alloc(0)
          onCapture?.()
          return
        }
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
    throw new Error("hold proxy did not bind a TCP port")
  }
  return {
    url: `nats://127.0.0.1:${address.port}`,
    arm: () => {
      captureBarrier = new Promise((resolve) => {
        onCapture = resolve
      })
      armed = true
    },
    captured: () => {
      if (captureBarrier === undefined) throw new Error("captured() before arm()")
      return captureBarrier
    },
    release: () => {
      const upstream = heldUpstream
      if (upstream === undefined) throw new Error("release before a register publish was captured")
      released = true
      holding = false
      for (const part of held) upstream.write(part)
      held = []
    },
    stop: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy()
      server.close(() => resolve())
    }),
  }
}

let harness: NatsHarness | undefined
let registerHarness: NatsHarness | undefined
let proxy: HoldProxy | undefined

afterEach(async () => {
  if (proxy !== undefined) await proxy.stop()
  proxy = undefined
  if (registerHarness !== undefined) await registerHarness.stop()
  registerHarness = undefined
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

describe("structural refusal repairs", () => {
  test("every shipped structural kind carries a taught next action", async () => {
    const refusals = await Promise.all([
      Effect.runPromise(Effect.flip(canonicalBytes(Number.NaN))),
      Effect.runPromise(Effect.flip(evidenceSubject("lane.*", 0))),
      Effect.runPromise(Effect.flip(decodeEnvelope(utf8.encode("{}")))),
      Effect.runPromise(Effect.flip(decodeEnvelope(envelope({ blob: "not-a-digest" })))),
      Effect.runPromise(Effect.flip(decodeEnvelope(envelope(
        "x".repeat(INLINE_BODY_MAX_BYTES - 1),
      )))),
      Effect.runPromise(Effect.flip(verifyEnvelopeDigest(envelope(1), "0".repeat(64)))),
    ])

    harness = await startNatsHarness()
    const connection = await connect({ servers: harness.url })
    try {
      const manager = await jetstreamManager(connection)
      await manager.streams.add({
        name: "WRONG_SHAPE",
        subjects: ["flb.fab.ev.*.*"],
        storage: StorageType.Memory,
        num_replicas: 1,
      })
      // The register bucket on this server carries the wrong retention
      // shape, so register acquisition below refuses on the shape law.
      await new Kvm(connection).create(REGISTER_BUCKET, {
        history: 1,
        replicas: 1,
        ttl: 0,
        max_bytes: -1,
      })
    } finally {
      await connection.close()
    }
    const substrate = await Effect.runPromise(
      FabricClient.pipe(
        Effect.provide(FabricClient.layer({
          servers: harness.url,
          stream: "WRONG_SHAPE",
        })),
        Effect.scoped,
        Effect.flip,
      ),
    )
    if (substrate.sort !== "structural") {
      throw new Error(`expected substrate-shape structural refusal, got ${substrate.kind}`)
    }
    refusals.push(substrate)

    // register-substrate-shape: acquisition against the wrong-shaped
    // bucket refuses on the shape law, not as retryable transport absence.
    const wrongShape = await Effect.runPromise(
      Registers.pipe(
        Effect.provide(Registers.layer({ servers: harness.url })),
        Effect.scoped,
        Effect.flip,
      ),
    )
    if (wrongShape.sort !== "structural") {
      throw new Error(`expected register-substrate-shape structural refusal, got ${wrongShape.kind}`)
    }
    refusals.push(wrongShape)

    // The remaining register kinds run against a healthy register server,
    // every trigger through the public Registers surface.
    registerHarness = await startNatsHarness()
    const registerUrl = registerHarness.url
    const registerRefusals = await Effect.runPromise(
      Effect.gen(function* () {
        const registers = yield* Registers
        const list: Array<Refusal> = []
        // invalid-register-key: the key law refuses before any KV call.
        list.push(yield* Effect.flip(registers.grant("not.a.key", "seat-a")))
        // register-absent: renew requires a present register.
        list.push(yield* Effect.flip(registers.renew("absentwork", 1)))
        // duplicate-grant: the same work granted twice.
        const granted = yield* registers.grant("workalpha", "seat-a")
        list.push(yield* Effect.flip(registers.grant("workalpha", "seat-b")))
        // outcome-already-landed: a landed outcome never changes.
        yield* registers.commit("workalpha", granted.token, "landed")
        list.push(yield* Effect.flip(registers.renew("workalpha", granted.token)))
        // stale-register-token: an expire-steal advances the fencing token,
        // then the superseded holder attempts the stale commit.
        const lease = yield* registers.grant("workbeta", "seat-a")
        yield* registers.expireSteal("workbeta", "seat-b")
        list.push(yield* Effect.flip(registers.commit("workbeta", lease.token, "late")))
        return list
      }).pipe(
        Effect.provide(Registers.layer({ servers: registerUrl })),
        Effect.scoped,
      ),
    )
    for (const refusal of registerRefusals) {
      if (refusal.sort !== "structural") {
        throw new Error(`expected a structural register refusal, got ${refusal.kind}`)
      }
      refusals.push(refusal)
    }

    // malformed-register-state: bytes written past the register surface do
    // not decode as the closed holder/outcome record.
    {
      const raw = await connect({ servers: registerUrl })
      try {
        const bucket = await new Kvm(raw).open(REGISTER_BUCKET)
        await bucket.put("workgamma", "not the closed register record")
      } finally {
        await raw.close()
      }
    }
    const malformed = await Effect.runPromise(
      Effect.gen(function* () {
        const registers = yield* Registers
        return yield* Effect.flip(registers.observe("workgamma"))
      }).pipe(
        Effect.provide(Registers.layer({ servers: registerUrl })),
        Effect.scoped,
      ),
    )
    if (malformed.sort !== "structural") {
      throw new Error(`expected malformed-register-state structural refusal, got ${malformed.kind}`)
    }
    refusals.push(malformed)

    // concurrent-register-update: the hold proxy freezes the expire-steal's
    // CAS append in flight; a rival revision lands over a second connection
    // and is acknowledged; the released append then loses its CAS and the
    // read-back reconciliation mints the conflict kind. Every step is
    // barrier-awaited — no sleeps, no racing writers.
    proxy = await startHoldProxy(registerUrl)
    const tap = proxy
    const conflicted = await Effect.runPromise(
      Effect.gen(function* () {
        const registers = yield* Registers
        const lease = yield* registers.grant("workdelta", "seat-a")
        yield* Effect.sync(() => tap.arm())
        const stealing = yield* Effect.forkChild(
          Effect.flip(registers.expireSteal("workdelta", "seat-b")),
        )
        yield* Effect.promise(() => tap.captured())
        yield* Effect.promise(async () => {
          const raw = await connect({ servers: registerUrl })
          try {
            const bucket = await new Kvm(raw).open(REGISTER_BUCKET)
            await bucket.update(
              "workdelta",
              JSON.stringify({ holder: "seat-c", outcome: null }),
              lease.token,
            )
          } finally {
            await raw.close()
          }
        })
        yield* Effect.sync(() => tap.release())
        return yield* Fiber.join(stealing)
      }).pipe(
        Effect.provide(Registers.layer({ servers: tap.url })),
        Effect.scoped,
      ),
    )
    if (conflicted.sort !== "structural") {
      throw new Error(`expected concurrent-register-update structural refusal, got ${conflicted.kind}`)
    }
    expect(conflicted.kind).toBe("concurrent-register-update")
    refusals.push(conflicted)

    expect(refusals.map((refusal) => refusal.kind).sort()).toEqual(
      [...StructuralRefusalKind.literals].sort(),
    )
    for (const refusal of refusals) {
      expect(refusal.sort).toBe("structural")
      expect(refusal.next.length, refusal.kind).toBeGreaterThan(0)
    }
  }, 180_000)
})
