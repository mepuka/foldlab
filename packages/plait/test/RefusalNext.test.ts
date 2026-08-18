import { afterEach, describe, expect, test } from "bun:test"
import { resolve } from "node:path"

import {
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
  StorageType,
  jetstreamManager,
  type JsMsg,
} from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Fiber, Layer, Reducer, Schema } from "effect"

import { Admission } from "../src/kernel/Admission.js"
import { PLANTED_CONTEXT } from "./KernelDoor.reference.js"
import * as Algebra from "../src/truth/Algebra.js"
import { ANCHOR_BUCKET, advance, initial } from "../src/planes/Anchor.js"
import { canonicalBytes } from "../src/truth/Canonical.js"
import { CELL_BUCKET, CELL_HISTORY, Cells } from "../src/planes/Cell.js"
import { Digest } from "../src/truth/Digest.js"
import { admissionContextOver } from "../src/kernel/Candidates.js"
import { FabricClient } from "../src/carriage/FabricClient.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import {
  Next,
  StructuralRefusalKind,
  decodeRefusing,
  type Refusal,
  type StructuralRefusalKind as StructuralKind,
} from "../src/truth/Refusal.js"
import { REGISTER_BUCKET, Registers } from "../src/planes/Register.js"
import * as Session from "../src/planes/Session.js"
import { evidenceSubject } from "../src/kernel/Subjects.js"
import {
  decodeEnvelope,
  encodeEnvelope,
  INLINE_BODY_MAX_BYTES,
  verifyEnvelopeDigest,
} from "../src/kernel/Wire.js"
import { makeAnchorStore } from "../src/internal/anchors.js"
import { ensureLaneStreams, laneStreamName } from "../src/internal/lanes.js"
import {
  decodeDurableMessage,
  PUMP_BUFFER_BOUND,
  preparePartitionPump,
} from "../src/internal/pump.js"
import { replaySuccessors } from "../src/internal/successors.js"
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

const ProbeEvent = Schema.Struct({ tenant: Schema.String, delta: Schema.Number })
const probeEventSchema = Digest.make("a".repeat(64))
const CliStructuralRefusal = Schema.Struct({
  sort: Schema.Literal("structural"),
  kind: StructuralRefusalKind,
  law: Schema.String,
  path: Schema.Array(Schema.String),
  got: Schema.Json,
  expected: Schema.Json,
  next: Schema.Array(Next),
})

const declareProbeFold = (handle: string) => Effect.gen(function* () {
  const lane = yield* Lane.declare({
    handle,
    event: ProbeEvent,
    eventSchema: probeEventSchema,
    partitions: 1 as const,
    partitionKey: { path: ["tenant"] },
  })
  const algebra = yield* Algebra.declare({
    declaration: { name: `${handle}-sum`, version: 0 },
    reducer: Reducer.make<number>((left, right) => left + right, 0),
  })
  const fold = yield* Fold.declare({
    lane,
    algebra,
    contribution: {
      declaration: { name: `${handle}-delta`, version: 0 },
      apply: (event: typeof ProbeEvent.Type) => event.delta,
    },
  })
  return { lane, algebra, fold }
})

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
    const refusals: Array<Refusal> = await Promise.all([
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

    const invalidLane = await Effect.runPromise(Effect.flip(Lane.declare({
      handle: "refusal-lane",
      event: ProbeEvent,
      eventSchema: probeEventSchema,
      partitions: 0,
      partitionKey: { path: ["tenant"] },
    })))
    refusals.push(invalidLane)

    const invalidKeyLane = await Effect.runPromise(Lane.declare({
      handle: "refusal-key",
      event: ProbeEvent,
      eventSchema: probeEventSchema,
      partitions: 1 as const,
      partitionKey: { path: ["missing"] },
    }))
    refusals.push(await Effect.runPromise(Effect.flip(Lane.partition(
      invalidKeyLane,
      { tenant: "north", delta: 1 },
    ))))

    refusals.push(await Effect.runPromise(Effect.flip(Algebra.declare({
      declaration: { name: "invalid-initial", version: 0 },
      reducer: Reducer.make<number>((left, right) => left + right, Number.NaN),
    }))))

    const probe = await Effect.runPromise(declareProbeFold("refusal-probe"))
    refusals.push(await Effect.runPromise(Effect.flip(Algebra.commutative(
      probe.algebra,
      { arbitrary: () => 0, equals: Object.is },
    ))))

    // The consumer seam's two doors, both through public surfaces. The layer
    // provided below dies if it is ever reached, so both refusals are evidence
    // that the seam judges before any service does.
    const unreachable = Session.Sessions.testLayer({
      subscribe: () => Effect.die("the seam judges before any layer is reached"),
      read: () => Effect.die("the seam judges before any layer is reached"),
    })
    refusals.push(await Effect.runPromise(Effect.flip(Session.writ({
      holder: "reader",
      views: ["not-a-digest" as unknown as typeof Digest.Type],
    }))))
    const emptyWrit = await Effect.runPromise(Session.writ({ holder: "reader", views: [] }))
    refusals.push(await Effect.runPromise(Effect.flip(
      Session.subscribe(probe.fold, {
        writ: emptyWrit,
        partition: 0,
        policy: "resume",
      }).pipe(Effect.provide(unreachable)),
    )))

    const start = await Effect.runPromise(initial(0))
    refusals.push(await Effect.runPromise(Effect.flip(advance(
      start,
      1,
      Digest.make("1".repeat(64)),
      2,
    ))))
    refusals.push(await Effect.runPromise(Effect.flip(replaySuccessors({
      anchor: start,
      state: 0,
      deliveries: [{
        position: 1,
        event: 1,
        digest: Digest.make("2".repeat(64)),
      }],
      step: () => Number.NaN,
    }))))

    const subject = await Effect.runPromise(evidenceSubject(probe.lane.handle, 0))
    const mismatched = await Effect.runPromise(encodeEnvelope({
      v: 0,
      kind: "emit",
      lane: Digest.make("f".repeat(64)),
      key: "north",
      holder: "seat-a",
      body: { tenant: "north", delta: 1 },
      pins: [],
    }))
    const message = {
      data: mismatched.bytes,
      headers: { get: () => mismatched.digest },
      subject,
      seq: 1,
      ack: () => undefined,
    } as unknown as JsMsg
    refusals.push(await Effect.runPromise(Effect.flip(
      decodeDurableMessage(probe.fold, 0, message),
    )))

    const cli = Bun.spawn({
      cmd: ["bun", "run", "./src/surface/cli.ts", "not-chaos"],
      cwd: resolve(import.meta.dir, ".."),
      stdout: "ignore",
      stderr: "pipe",
    })
    const [cliExit, cliStderr] = await Promise.all([
      cli.exited,
      cli.stderr instanceof ReadableStream ? new Response(cli.stderr).text() : "",
    ])
    expect(cliExit).toBe(2)
    refusals.push(Schema.decodeUnknownSync(CliStructuralRefusal)(
      JSON.parse(cliStderr),
      { onExcessProperty: "error" },
    ) as unknown as Refusal)

    harness = await startNatsHarness()
    const shapeProbe = await Effect.runPromise(declareProbeFold("shape-probe"))
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
      await new Kvm(connection).create(ANCHOR_BUCKET, {
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
        Effect.provide(Layer.provide(
          FabricClient.layer({ servers: harness.url, stream: "WRONG_SHAPE" }),
          Admission.layer(admissionContextOver([])),
        )),
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

    const wrongAnchor = await Effect.runPromise(
      Fold.Folds.pipe(
        Effect.provide(Fold.Folds.layer({ servers: harness.url })),
        Effect.scoped,
        Effect.flip,
      ),
    )
    if (wrongAnchor.sort !== "structural") {
      throw new Error(`expected anchor-substrate-shape structural refusal, got ${wrongAnchor.kind}`)
    }
    refusals.push(wrongAnchor)

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

    const laneShapeConnection = await connect({ servers: harness.url })
    try {
      const manager = await jetstreamManager(laneShapeConnection)
      await manager.streams.delete("WRONG_SHAPE")
      const laneSubject = await Effect.runPromise(evidenceSubject(shapeProbe.lane.handle, 0))
      await manager.streams.add({
        name: laneStreamName(shapeProbe.lane, 0),
        subjects: [laneSubject],
        storage: StorageType.File,
        num_replicas: 1,
        max_msgs: -1,
        max_msgs_per_subject: -1,
        max_bytes: -1,
        max_age: 0,
        duplicate_window: 2 * 60 * 1_000_000_000,
        deny_delete: false,
        deny_purge: false,
      })
    } finally {
      await laneShapeConnection.close()
    }
    const laneShape = await Effect.runPromise(Effect.flip(Lane.emit(
      shapeProbe.lane,
      { tenant: "north", delta: 1 },
      { holder: "seat-a" },
    ).pipe(
      Effect.provide(Lane.Lanes.layer({ servers: harness.url })),
      Effect.scoped,
    )))
    if (laneShape.sort !== "structural") {
      throw new Error(`expected lane-substrate-shape structural refusal, got ${laneShape.kind}`)
    }
    expect(laneShape.expected).toEqual(expect.objectContaining({
      max_msgs_per_subject: -1,
      deny_delete: true,
      deny_purge: true,
    }))
    refusals.push(laneShape)

    // The remaining register kinds run against a healthy register server,
    // every trigger through the public Registers surface.
    registerHarness = await startNatsHarness()
    const registerUrl = registerHarness.url
    const invalidFoldDeclaration = await Effect.runPromise(
      Fold.deploy(probe.fold, { checkpointEvery: 0 }).pipe(
        Effect.flip,
        Effect.provide(Fold.Folds.layer({ servers: registerUrl })),
        Effect.scoped,
      ),
    )
    refusals.push(invalidFoldDeclaration)

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

    const foldConnection = await connect({ servers: registerUrl })
    try {
      const anchors = await Effect.runPromise(makeAnchorStore(foldConnection))
      const bucket = await new Kvm(foldConnection).open(ANCHOR_BUCKET)

      const malformedProbe = await Effect.runPromise(declareProbeFold("malformed-anchor"))
      await bucket.put(anchors.key(malformedProbe.fold, 0), "not a canonical anchor")
      refusals.push(await Effect.runPromise(Effect.flip(
        anchors.initialize(malformedProbe.fold, 0),
      )))

      const lostProbe = await Effect.runPromise(declareProbeFold("lost-anchor"))
      const [left, right] = await Effect.runPromise(Effect.all([
        anchors.initialize(lostProbe.fold, 0),
        anchors.initialize(lostProbe.fold, 0),
      ]))
      const eventDigest = Digest.make("3".repeat(64))
      const leftNext = await Effect.runPromise(advance(left.anchor, 1, eventDigest, 1))
      const rightNext = await Effect.runPromise(advance(right.anchor, 1, eventDigest, 1))
      const lostKey = anchors.key(lostProbe.fold, 0)
      await Effect.runPromise(anchors.commit(lostKey, left.revision, leftNext, 1))
      refusals.push(await Effect.runPromise(Effect.flip(
        anchors.commit(lostKey, right.revision, rightNext, 1),
      )))

      const consumerProbe = await Effect.runPromise(declareProbeFold("consumer-shape"))
      await Effect.runPromise(ensureLaneStreams(foldConnection, consumerProbe.lane))
      const loaded = await Effect.runPromise(anchors.initialize(consumerProbe.fold, 0))
      const consumerSubject = await Effect.runPromise(evidenceSubject(consumerProbe.lane.handle, 0))
      const manager = await jetstreamManager(foldConnection)
      await manager.consumers.add(laneStreamName(consumerProbe.lane, 0), {
        durable_name: `FLB_FOLD_${consumerProbe.fold.digest}`,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.StartSequence,
        opt_start_seq: 1,
        replay_policy: ReplayPolicy.Instant,
        filter_subject: consumerSubject,
        max_ack_pending: PUMP_BUFFER_BOUND - 1,
      })
      refusals.push(await Effect.runPromise(Effect.flip(preparePartitionPump(
        foldConnection,
        anchors,
        consumerProbe.fold,
        0,
        loaded,
        1,
        {
          messages: 0,
          redeliveriesAbsorbed: 0,
          bufferedOutOfOrderArrivals: 0,
          bufferedOutOfOrderDrained: 0,
          anchorWrites: 0,
          refusals: {},
        },
      ))))
    } finally {
      await foldConnection.close()
    }

    refusals.push(
      await Effect.runPromise(
        Effect.gen(function*() {
          const door = yield* Admission
          return yield* Effect.flip(door.admit({ _tag: "readLatest", subject: 6n }))
        }).pipe(Effect.provide(Admission.layer(PLANTED_CONTEXT))),
      ),
    )

    const exemptions = new Set<StructuralKind>(["fold-buffer-overflow"])
    expect([
      ...refusals.map((refusal) => refusal.kind),
      ...exemptions,
    ].sort()).toEqual(
      [...StructuralRefusalKind.literals].sort(),
    )
    for (const refusal of refusals) {
      expect(refusal.sort).toBe("structural")
      expect(refusal.next.length, refusal.kind).toBeGreaterThan(0)
    }
  }, 180_000)
})
