import { afterEach, describe, expect, test } from "bun:test"

import {
  DiscardPolicy,
  RetentionPolicy,
  StorageType,
  StoreCompression,
  jetstreamManager,
} from "@nats-io/jetstream"
import { connect } from "@nats-io/transport-node"
import { Effect, Schema } from "effect"

import { ANCHOR_BUCKET, ANCHOR_HISTORY } from "../src/planes/Anchor.js"
import { CELL_BUCKET, CELL_HISTORY, Cells } from "../src/planes/Cell.js"
import { Digest } from "../src/truth/Digest.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import type { Refusal, StructuralRefusalKind } from "../src/truth/Refusal.js"
import { evidenceSubject } from "../src/kernel/Subjects.js"
import { laneStreamName } from "../src/internal/lanes.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

/**
 * The admin-surface mutation arms (DEV-780).
 *
 * The vendor corpus graded a stream's admin surface UNCHECKED
 * (`docs/research/2026-08-13-nats-vendor-corpus-scorecard.md` item 6): every
 * field below is settable on a carrier's backing stream, and until this wall
 * every one of them was invisible to the carrier that opened it. Two of them
 * are not shape at all and carry their own named laws — a mirrored or sourced
 * carrier, and a carrier whose facts the server may expire.
 *
 * The discipline is one mutated-config control per newly pinned field, and the
 * arm that makes the others attributable is the LAWFUL one: it builds the same
 * base configs by hand and requires all three carriers to OPEN on them. Without
 * it, a base that was unlawful in some second field would make every arm below
 * refuse for a reason no assertion names, and a gate that stopped reading a
 * field would still look green.
 *
 * Each row runs on its own server because two of the three carriers are named
 * buckets: `flb-fab-cell` and `flb-fab-anchor` exist once per substrate, so one
 * mutation per incarnation is the only way to keep the arms independent.
 */
const duplicateWindowNanos = 2 * 60 * 1_000_000_000
const ProbeEvent = Schema.Struct({ tenant: Schema.String, delta: Schema.Number })
const probeEventSchema = Digest.make("b".repeat(64))

const declareProbeLane = (handle: string) =>
  Lane.declare({
    handle,
    event: ProbeEvent,
    eventSchema: probeEventSchema,
    partitions: 1 as const,
    partitionKey: { path: ["tenant"] },
  })

/** The mirror every mirrored arm imports from; its subjects touch no carrier. */
const MIRROR_ORIGIN = "FLB_TEST_MIRROR_ORIGIN"

type Config = Record<string, unknown>

/**
 * The lane partition stream exactly as `internal/lanes.ts` creates it. Written
 * out here rather than imported so that the wall states the shape it admits
 * instead of asking the gate to agree with itself.
 */
const lawfulLaneStream = (name: string, subject: string): Config => ({
  name,
  subjects: [subject],
  storage: StorageType.File,
  num_replicas: 1,
  max_msgs: -1,
  max_bytes: -1,
  max_age: 0,
  max_msgs_per_subject: -1,
  duplicate_window: duplicateWindowNanos,
  deny_delete: true,
  deny_purge: true,
  allow_direct: false,
  mirror_direct: false,
  allow_atomic: false,
  allow_msg_counter: false,
  compression: StoreCompression.None,
  max_msg_size: -1,
  allow_msg_ttl: false,
})

/**
 * The KV bucket's backing stream exactly as `@nats-io/kv` 3.4.0 creates it for
 * the options the two KV carriers pass, measured against the pinned
 * nats-server. Building it by hand is what lets a single admin field be moved
 * without moving anything else.
 */
const lawfulKvStream = (bucket: string, history: number): Config => ({
  name: `KV_${bucket}`,
  subjects: [`$KV.${bucket}.>`],
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  num_replicas: 1,
  max_msgs: -1,
  max_bytes: -1,
  max_age: 0,
  max_msgs_per_subject: history,
  discard: DiscardPolicy.New,
  duplicate_window: duplicateWindowNanos,
  deny_delete: false,
  deny_purge: false,
  allow_rollup_hdrs: true,
  allow_direct: true,
  mirror_direct: false,
  allow_atomic: false,
  allow_msg_counter: false,
  compression: StoreCompression.None,
  max_msg_size: -1,
  allow_msg_ttl: false,
})

/** Which law a mutated field is refused by; the two named laws are not shape. */
type Law = "shape" | "mirrored" | "expiring"

type Carrier = "lane" | "cell" | "anchor"

const everyCarrier: ReadonlyArray<Carrier> = ["lane", "cell", "anchor"]

interface Mutation {
  /** The admin field this arm moves, and nothing else. */
  readonly field: string
  /** The law that must name the refusal. */
  readonly law: Law
  /** The mutation applied to the lane partition stream. */
  readonly lane: (base: Config) => Config
  /** The mutation applied to both KV backing streams. */
  readonly kv: (base: Config, bucket: string) => Config
  /**
   * The carriers this arm can actually be planted on. Absent means all three;
   * a shorter list is a substrate fact, pinned by
   * `the pinned server refuses the configurations no arm can plant` below.
   */
  readonly carriers?: ReadonlyArray<Carrier>
}

const mutations: ReadonlyArray<Mutation> = [
  {
    field: "republish",
    law: "shape",
    lane: (base) => ({ ...base, republish: { src: "flb.fab.ev.>", dest: "leak.>" } }),
    kv: (base, bucket) => ({
      ...base,
      republish: { src: `$KV.${bucket}.>`, dest: "leak.>" },
    }),
  },
  {
    field: "subject_transform",
    law: "shape",
    lane: (base) => ({
      ...base,
      subject_transform: { src: "flb.fab.ev.>", dest: "moved.>" },
    }),
    kv: (base, bucket) => ({
      ...base,
      subject_transform: { src: `$KV.${bucket}.>`, dest: "moved.>" },
    }),
  },
  {
    // The one field whose lawful value is not the same at every carrier: the
    // lane reads through consumers and pins direct access off, while the KV
    // carriers read through it and pin it on. Each arm moves it the one way
    // that is unlawful there.
    field: "allow_direct",
    law: "shape",
    lane: (base) => ({ ...base, allow_direct: true }),
    kv: (base) => ({ ...base, allow_direct: false }),
  },
  {
    field: "allow_atomic",
    law: "shape",
    lane: (base) => ({ ...base, allow_atomic: true }),
    kv: (base) => ({ ...base, allow_atomic: true }),
  },
  {
    // Lane only: a KV bucket's backing stream discards NEW, and the pinned
    // server refuses a counter stream that does. The KV carriers still pin the
    // field — see the unplantable-configuration test.
    field: "allow_msg_counter",
    law: "shape",
    carriers: ["lane"],
    lane: (base) => ({ ...base, allow_msg_counter: true }),
    kv: (base) => ({ ...base, allow_msg_counter: true }),
  },
  {
    field: "compression",
    law: "shape",
    lane: (base) => ({ ...base, compression: StoreCompression.S2 }),
    kv: (base) => ({ ...base, compression: StoreCompression.S2 }),
  },
  {
    field: "max_msg_size",
    law: "shape",
    lane: (base) => ({ ...base, max_msg_size: 1024 }),
    kv: (base) => ({ ...base, max_msg_size: 1024 }),
  },
  {
    field: "allow_msg_ttl",
    law: "expiring",
    lane: (base) => ({ ...base, allow_msg_ttl: true }),
    kv: (base) => ({ ...base, allow_msg_ttl: true }),
  },
  {
    // A mirror carries no subjects of its own, which is exactly how the old
    // gates refused one — incidentally, on the subjects clause, teaching
    // "restore the stream shape" to an operator whose repair is a replica
    // carrier. This arm requires the named law instead.
    field: "mirror",
    law: "mirrored",
    lane: (base) => {
      const { subjects: _subjects, ...rest } = base
      return { ...rest, mirror: { name: MIRROR_ORIGIN } }
    },
    kv: (base) => {
      const { subjects: _subjects, ...rest } = base
      return { ...rest, mirror: { name: MIRROR_ORIGIN } }
    },
  },
  {
    // Sources keep their subjects, so no shape clause reads them at all: before
    // the named law a sourced carrier was admitted outright.
    field: "sources",
    law: "mirrored",
    lane: (base) => ({ ...base, sources: [{ name: MIRROR_ORIGIN }] }),
    kv: (base) => ({ ...base, sources: [{ name: MIRROR_ORIGIN }] }),
  },
]

const laneKind = (law: Law): StructuralRefusalKind =>
  law === "shape"
    ? "lane-substrate-shape"
    : law === "mirrored"
    ? "mirrored-authority-carrier"
    : "expiring-authority-carrier"

const bucketKind = (carrier: "cell" | "anchor", law: Law): StructuralRefusalKind =>
  law === "shape"
    ? (carrier === "cell" ? "cell-substrate-shape" : "anchor-substrate-shape")
    : law === "mirrored"
    ? "mirrored-authority-carrier"
    : "expiring-authority-carrier"

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const identity = (base: Config): Config => base

/**
 * Plants the three carriers' backing streams on a fresh server: the mutation
 * on the carriers it names, the lawful base on the rest. The lane's stream is
 * named for the declared lane, so the carrier finds it instead of creating its
 * own.
 */
const plant = async (
  url: string,
  lane: Lane.DeclaredLane<typeof ProbeEvent.Type>,
  mutation: Mutation,
  carriers: ReadonlyArray<Carrier>,
): Promise<void> => {
  const shapeLane = carriers.includes("lane") ? mutation.lane : identity
  const shapeKv = (base: Config, bucket: string, carrier: Carrier): Config =>
    carriers.includes(carrier) ? mutation.kv(base, bucket) : base
  const connection = await connect({ servers: url })
  try {
    const manager = await jetstreamManager(connection)
    await manager.streams.add({
      name: MIRROR_ORIGIN,
      subjects: ["flb.test.mirror.origin.>"],
      storage: StorageType.File,
      num_replicas: 1,
    } as never)
    const subject = await Effect.runPromise(evidenceSubject(lane.handle, 0))
    await manager.streams.add(
      shapeLane(lawfulLaneStream(laneStreamName(lane, 0), subject)) as never,
    )
    await manager.streams.add(
      shapeKv(lawfulKvStream(CELL_BUCKET, CELL_HISTORY), CELL_BUCKET, "cell") as never,
    )
    await manager.streams.add(
      shapeKv(lawfulKvStream(ANCHOR_BUCKET, ANCHOR_HISTORY), ANCHOR_BUCKET, "anchor") as never,
    )
  } finally {
    await connection.close()
  }
}

const emit = (
  lane: Lane.DeclaredLane<typeof ProbeEvent.Type>,
  url: string,
): Effect.Effect<unknown, Refusal> =>
  Lane.emit(lane, { tenant: "north", delta: 1 }, { holder: "seat-a" }).pipe(
    Effect.provide(Lane.Lanes.layer({ servers: url })),
    Effect.scoped,
  )

const openCells = (url: string): Effect.Effect<unknown, Refusal> =>
  Cells.pipe(Effect.provide(Cells.layer({ servers: url })), Effect.scoped)

const openFolds = (url: string): Effect.Effect<unknown, Refusal> =>
  Fold.Folds.pipe(Effect.provide(Fold.Folds.layer({ servers: url })), Effect.scoped)

describe("authority carrier admin surface", () => {
  test("the hand-built lawful shapes are admitted by all three carriers", async () => {
    harness = await startNatsHarness()
    const lane = await Effect.runPromise(declareProbeLane("admin-lawful"))
    await plant(harness.url, lane, { field: "none", law: "shape", lane: identity, kv: identity }, [])
    // No flip: each carrier must OPEN on the planted shape. This is what makes
    // every refusal below attributable to the one field its arm moved.
    await Effect.runPromise(emit(lane, harness.url))
    await Effect.runPromise(openCells(harness.url))
    await Effect.runPromise(openFolds(harness.url))
  }, 120_000)

  for (const mutation of mutations) {
    const carriers = mutation.carriers ?? everyCarrier
    test(`a carrier configured with ${mutation.field} refuses by its ${mutation.law} law`, async () => {
      harness = await startNatsHarness()
      const url = harness.url
      const lane = await Effect.runPromise(declareProbeLane(`admin-${mutation.field}`))
      await plant(url, lane, mutation, carriers)

      const expected: Array<[Carrier, StructuralRefusalKind, Effect.Effect<unknown, Refusal>]> = []
      if (carriers.includes("lane")) {
        expected.push(["lane", laneKind(mutation.law), emit(lane, url)])
      }
      if (carriers.includes("cell")) {
        expected.push(["cell", bucketKind("cell", mutation.law), openCells(url)])
      }
      if (carriers.includes("anchor")) {
        expected.push(["anchor", bucketKind("anchor", mutation.law), openFolds(url)])
      }
      const refused = await Promise.all(
        expected.map(([, , open]) => Effect.runPromise(Effect.flip(open))),
      )
      refused.forEach((refusal, index) => {
        const [carrier, kind] = expected[index]!
        const where = `${mutation.field} at ${carrier}`
        expect(refusal.sort, where).toBe("structural")
        expect(refusal.kind, where).toBe(kind)
        expect(refusal.next.length, where).toBeGreaterThan(0)
      })
    }, 120_000)
  }

  /**
   * The reason two pinned fields carry no mutation arm, pinned itself.
   *
   * `mirror_direct` and — on the KV carriers — `allow_msg_counter` cannot be
   * planted: the pinned server refuses the configuration before any carrier
   * sees it. Both assertions stay in the gates as defence against a substrate
   * that relaxes the coupling, and this arm is what notices if it does: the day
   * either configuration becomes creatable, this test reddens and the field
   * owes a mutation arm like every other.
   */
  test("the pinned server refuses the configurations no arm can plant", async () => {
    harness = await startNatsHarness()
    const connection = await connect({ servers: harness.url })
    const refusalOf = async (config: Config): Promise<string> => {
      const manager = await jetstreamManager(connection)
      try {
        await manager.streams.add(config as never)
        return "admitted"
      } catch (error) {
        return String((error as Error).message)
      }
    }
    try {
      expect(
        await refusalOf({
          ...lawfulLaneStream("FLB_TEST_MIRROR_DIRECT", "flb.test.unplantable.0"),
          mirror_direct: true,
        }),
      ).toBe("stream has no mirror but does have mirror direct")
      expect(
        await refusalOf({
          ...lawfulKvStream("flb-test-counter", 1),
          allow_msg_counter: true,
        }),
      ).toBe("counter stream cannot use discard new")
    } finally {
      await connection.close()
    }
  }, 120_000)
})
