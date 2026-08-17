import { afterEach, describe, expect, test } from "bun:test"

import { StorageType, jetstreamManager } from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Fiber } from "effect"

import { canonicalBytes } from "../src/Canonical.js"
import { CELL_BUCKET, CELL_HISTORY, Cells } from "../src/Cell.js"
import { Digest } from "../src/Digest.js"
import { FabricClient } from "../src/FabricClient.js"
import { StructuralRefusalKind, decodeRefusing, type Refusal } from "../src/Refusal.js"
import { REGISTER_BUCKET, Registers } from "../src/Register.js"
import { evidenceSubject } from "../src/Subjects.js"
import {
  decodeEnvelope,
  INLINE_BODY_MAX_BYTES,
  verifyEnvelopeDigest,
} from "../src/Wire.js"
import {
  bucketPublishPrefixes,
  startHoldProxy,
  type HoldProxy,
} from "./HoldProxy.js"
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

let harness: NatsHarness | undefined
let registerHarness: NatsHarness | undefined
let cellHarness: NatsHarness | undefined
let proxy: HoldProxy | undefined

afterEach(async () => {
  if (proxy !== undefined) await proxy.stop()
  proxy = undefined
  if (cellHarness !== undefined) await cellHarness.stop()
  cellHarness = undefined
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
      // malformed-value: the one parse-boundary classification, minted where a
      // value the declared schema does not admit crosses decodeRefusing.
      Effect.runPromise(Effect.flip(decodeRefusing(Digest)("not-a-digest"))),
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
      // The cell bucket on this server retains more than the ruled single
      // revision, so cell acquisition below refuses on its own shape law.
      await new Kvm(connection).create(CELL_BUCKET, {
        history: CELL_HISTORY + 1,
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

    // cell-substrate-shape: acquisition against the wrong-shaped cell bucket
    // refuses on the shape law, not as retryable transport absence.
    const wrongCellShape = await Effect.runPromise(
      Cells.pipe(
        Effect.provide(Cells.layer({ servers: harness.url })),
        Effect.scoped,
        Effect.flip,
      ),
    )
    if (wrongCellShape.sort !== "structural") {
      throw new Error(`expected cell-substrate-shape structural refusal, got ${wrongCellShape.kind}`)
    }
    refusals.push(wrongCellShape)

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

    // The cell kinds run against a healthy cell server, every trigger through
    // the public Cells surface.
    cellHarness = await startNatsHarness()
    const cellUrl = cellHarness.url
    const cellRefusals = await Effect.runPromise(
      Effect.gen(function* () {
        const cells = yield* Cells
        const list: Array<Refusal> = []
        // invalid-cell-key: the key law refuses before any KV call.
        list.push(yield* Effect.flip(cells.read("not.a.cell")))
        return list
      }).pipe(Effect.provide(Cells.layer({ servers: cellUrl })), Effect.scoped),
    )
    for (const refusal of cellRefusals) {
      if (refusal.sort !== "structural") {
        throw new Error(`expected a structural cell refusal, got ${refusal.kind}`)
      }
      refusals.push(refusal)
    }

    // malformed-cell-state: bytes written past the cell surface do not decode
    // as the canonical observation array.
    {
      const raw = await connect({ servers: cellUrl })
      try {
        const bucket = await new Kvm(raw).open(CELL_BUCKET)
        await bucket.put("cellgamma", "not the canonical observation array")
      } finally {
        await raw.close()
      }
    }
    const malformedCell = await Effect.runPromise(
      Effect.gen(function* () {
        const cells = yield* Cells
        return yield* Effect.flip(cells.read("cellgamma"))
      }).pipe(Effect.provide(Cells.layer({ servers: cellUrl })), Effect.scoped),
    )
    if (malformedCell.sort !== "structural") {
      throw new Error(`expected malformed-cell-state structural refusal, got ${malformedCell.kind}`)
    }
    refusals.push(malformedCell)

    // concurrent-register-update: the hold proxy freezes the expire-steal's
    // CAS append in flight; a rival revision lands over a second connection
    // and is acknowledged; the released append then loses its CAS and the
    // read-back reconciliation mints the conflict kind. Every step is
    // barrier-awaited — no sleeps, no racing writers.
    proxy = await startHoldProxy(registerUrl, bucketPublishPrefixes(REGISTER_BUCKET))
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
