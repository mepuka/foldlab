/**
 * The spawn consumer: an admitted spawn becomes a seat, a refused one becomes
 * nothing, and one spawn is one seat however often its trace arrives.
 *
 * Every claim here is measured against a recorder OUTSIDE the consumer: the
 * lane fixture records what it was handed, so a consumer that carried for a
 * refused spawn would be caught by data it cannot reach. The suite executes
 * that falsification once — the same consumer is run over a trace whose refused
 * node was PROMOTED INTO ITS STEPS, and the recorder must catch the seat that
 * mutation brings up — so the zero-carriage reading is a check that has been
 * seen to fail.
 *
 * The spawn sentences are the door's own. Nothing here hand-types a verdict or
 * an encoding: the admitted spawns are produced by running programs through the
 * shipped engine, and the one planted step is framed by the door's own
 * `encodeAct`, so the mutant is a mutation of a law rather than an invented
 * vector.
 *
 * What this file does NOT claim: nothing here has touched a substrate. Whether
 * a seat's facts survive canonicalization, routing, storage, and the lane's own
 * verify-on-read is `SpawnSeatWall.test.ts`'s, over a real server.
 */
import { describe, expect, test } from "bun:test"

import { Effect, Layer, Scope, Stream } from "effect"

import type { WireValue } from "../src/truth/Canonical.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import type { Refusal } from "../src/truth/Refusal.js"
import { encodeAct } from "../src/kernel/KernelDoor.js"
import { kernelIdentity } from "../src/kernel/KernelIdentity.js"
import { program, type KernelProgram } from "../src/kernel/KernelProgram.js"
import { Holder } from "../src/kernel/Wire.js"
import {
  LaneHandle,
  LaneReads,
  Lanes,
  partition,
  type DeclaredLane,
  type EmittedEvent,
  type LandedFact,
} from "../src/planes/Lane.js"
import { Engine, type EngineService, type RunSupplies } from "../src/carriage/Engine.js"
import { declareTraceLane, runTraced } from "../src/carriage/RunTrace.js"
import { runTraceLane, type RunTraceFact, type RunTraceStep } from "../src/internal/runtraces.js"
import {
  SPAWN_SEAT_OPENED,
  SPAWN_SEAT_RETIRED,
  seatName,
  spawnSeatLane,
  type SeatFact,
  type SeatOpened,
  type SeatRetired,
} from "../src/internal/seats.js"
import {
  attachSpawnSeats,
  declareSeatLane,
  matchSeatBringUp,
  spawnsIn,
  type SeatBringUp,
  type SeatCharter,
  type SpawnSeats,
} from "../src/internal/spawnseats.js"

import { engineLayer, fixtureLane, makeCarriers, rootWritDigest } from "./EngineRun.harness.js"

/* ------------------------------------------------------------- carriage */

/** One fact the lane fixture was handed, recorded outside the consumer. */
interface RecordedFact {
  readonly handle: string
  readonly event: unknown
  readonly holder: Holder
  readonly digest: Digest
  readonly partition: number
  readonly position: number
}

/**
 * A lane fixture with the two halves a fold needs: an emit that routes and
 * positions like the real one, and a read that answers what was emitted.
 *
 * It is deliberately one store: what the consumer reads is what somebody
 * emitted, so a bring-up's own facts are visible to a second consumer exactly
 * as they would be over a substrate. Emission order across every lane is kept,
 * which is what lets an order claim be read off the recorder directly.
 */
const makeCarriage = () => {
  const landed: Array<RecordedFact> = []
  const positions = new Map<string, number>()

  const rowsOf = <Event>(
    lane: DeclaredLane<Event, number>,
  ): ReadonlyArray<LandedFact<Event>> =>
    landed
      .filter((row) => row.handle === lane.handle)
      .map((row) => ({
        partition: row.partition,
        position: row.position,
        digest: row.digest,
        holder: row.holder,
        event: row.event as Event,
      }))

  return {
    landed,
    rowsOf,
    lanes: Lanes.testLayer({
      emit: (lane, event, options) =>
        Effect.gen(function* () {
          const routed = yield* partition(lane, event)
          const key = `${lane.handle}/${routed.partition}`
          const position = (positions.get(key) ?? -1) + 1
          positions.set(key, position)
          const digest = yield* digestOf(event as WireValue)
          landed.push({
            handle: lane.handle,
            event,
            holder: options.holder,
            digest,
            partition: routed.partition,
            position,
          })
          return { digest, partition: routed.partition, position, duplicate: false } satisfies
            EmittedEvent
        }),
    }),
    reads: LaneReads.testLayer({
      tail: (lane) => Effect.sync(() => rowsOf(lane)),
      follow: (lane) => Stream.fromIterableEffect(Effect.sync(() => rowsOf(lane))),
    }),
  }
}

type Carriage = ReturnType<typeof makeCarriage>

const holder = Holder.make("spawn-seat-suite")

/** The policy a seat speaks under, declared through the engine under the root. */
const CHILD_POLICY: WireValue = { v: 0, kind: "policy", name: "spawn-seat-child" }

/** A policy no declaration ever lands, so a sentence naming it is refused. */
const GHOST_POLICY: WireValue = { v: 0, kind: "policy", name: "spawn-seat-ghost" }

/* ---------------------------------------------------------------- stage */

/** The staged world one row runs in. */
interface Staged {
  readonly engine: EngineService
  readonly carriage: Carriage
  /** The address the run-trace lane was declared at. */
  readonly traceLane: Digest
  /** The address the seat lane was declared at. */
  readonly seatLane: Digest
  /** The policy a seat speaks under, and its identity label. */
  readonly child: { readonly digest: Digest; readonly label: bigint }
  /** The root policy's identity label; every spawn's parent here. */
  readonly parentLabel: bigint
  /** The label of a policy nothing declared. */
  readonly ghostLabel: bigint
  /** The charter a consumer is given for the child policy. */
  readonly charter: SeatCharter
}

/** The one program a seat runs: declare a value, emit it. Table and payload. */
const seatWork = (lane: bigint): {
  readonly declaration: KernelProgram<never>
  readonly supplies: RunSupplies
} => {
  const built = program("spawn-seat-work", {}, ($) => {
    const declared = $.declare({ kind: "resource", value: $.literal(42n) })
    return $.emit({ lane: $.digest("lane", lane), body: declared })
  })
  // The declare node is the first the body contributed, so it is named 1; the
  // kind is the one slot the declaration form deliberately does not carry.
  return { declaration: built, supplies: { kinds: new Map([[1n, "resource" as const]]) } }
}

const stage = Effect.fn("suite.stage")(function* (
  carriage: Carriage,
): Effect.fn.Return<Staged, Refusal, Engine> {
  const engine = yield* Engine
  const traceLane = yield* declareTraceLane(rootWritDigest)
  if (traceLane._tag !== "carried") throw new Error("the trace lane was refused")
  const seatLane = yield* declareSeatLane(rootWritDigest)
  if (seatLane._tag !== "carried") throw new Error("the seat lane was refused")
  const child = yield* engine.declare({
    kind: "policy",
    value: CHILD_POLICY,
    writ: rootWritDigest,
  })
  if (child._tag !== "carried") throw new Error("the child policy was refused")
  const work = yield* engine.declareLane({
    lane: fixtureLane(LaneHandle.make("spawn-seat-work-lane")),
    writ: rootWritDigest,
  })
  if (work._tag !== "carried") throw new Error("the seat's work lane was refused")
  const built = seatWork(work.landed.label)
  return {
    engine,
    carriage,
    traceLane: traceLane.landed.digest,
    seatLane: seatLane.landed.digest,
    child: { digest: child.landed.digest, label: child.landed.label },
    parentLabel: yield* kernelIdentity(rootWritDigest),
    ghostLabel: yield* kernelIdentity(yield* digestOf(GHOST_POLICY)),
    charter: {
      writ: child.landed.digest,
      holder,
      program: built.declaration,
      supplies: built.supplies,
    },
  }
})

/** Runs one traced spawn and answers with the trace fact as it landed. */
const spawnTrace = Effect.fn("suite.spawnTrace")(function* (
  staged: Staged,
  parent: bigint,
  request: bigint,
): Effect.fn.Return<
  { readonly fact: LandedFact<RunTraceFact>; readonly outcome: string },
  Refusal,
  Engine
> {
  const spawn = program("spawn-seat-caller", {}, ($) =>
    $.spawn({
      parent: $.digest("policy", parent),
      request: $.digest("policy", request),
    }))
  const traced = yield* runTraced(spawn, {
    writ: rootWritDigest,
    holder,
    lane: staged.traceLane,
  })
  if (traced.landing._tag !== "carried") {
    throw new Error(`the trace did not land: ${traced.landing._tag}`)
  }
  return {
    fact: {
      partition: traced.landing.emitted.partition,
      position: traced.landing.emitted.position,
      digest: traced.landing.emitted.digest,
      holder,
      event: traced.trace,
    },
    outcome: traced.outcome._tag,
  }
})

const withStage = <A>(
  body: (
    staged: Staged,
    seats: SpawnSeats,
  ) => Effect.Effect<A, Refusal, Engine | LaneReads | Scope.Scope>,
  charters?: (staged: Staged) => ReadonlyArray<SeatCharter>,
): Promise<A> => {
  const carriage = makeCarriage()
  const carriers = makeCarriers(carriage.lanes)
  return Effect.runPromise(
    Effect.gen(function* () {
      const staged = yield* stage(carriage)
      const seats = yield* attachSpawnSeats({
        traceLane: staged.traceLane,
        seatLane: staged.seatLane,
        charters: charters === undefined ? [staged.charter] : charters(staged),
      })
      return yield* body(staged, seats)
    }).pipe(
      Effect.provide(Layer.mergeAll(engineLayer(carriers.layer), carriage.reads)),
      Effect.scoped,
      Effect.orDie,
    ),
  )
}

/** Every fact one lane carries, in the order the recorder was handed them. */
const factsOn = (staged: Staged, handle: string): ReadonlyArray<unknown> =>
  staged.carriage.landed.filter((row) => row.handle === handle).map((row) => row.event)

const traceHandle = Effect.runSync(runTraceLane().pipe(Effect.orDie)).handle
const seatHandle = Effect.runSync(spawnSeatLane().pipe(Effect.orDie)).handle

/* --------------------------------------------------------------- walls */

describe("an admitted spawn brings up a seat under the writ it requested", () => {
  test("the seat's first landed act carries the spawned writ", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        const brought = yield* seats.consume(Stream.fromIterable([trace.fact]))
        return {
          outcome: trace.outcome,
          step: trace.fact.event.steps[0],
          brought,
          seatFacts: factsOn(staged, seatHandle) as ReadonlyArray<SeatFact>,
          traceFacts: factsOn(staged, traceHandle) as ReadonlyArray<RunTraceFact>,
          childDigest: staged.child.digest,
          childLabel: staged.child.label,
          name: yield* seatName(trace.fact.digest, trace.fact.event.steps[0]!.node),
        }
      })
    )

    // The spawn was admitted and landed NOTHING: the model reads it as
    // world-identity and the trace says so rather than this suite assuming it.
    expect(measured.outcome).toBe("landed")
    expect(measured.step?.landed).toBe(null)

    // One sighting, one seat.
    expect(measured.brought.length).toBe(1)
    const brought = measured.brought[0]!
    expect(brought._tag).toBe("opened")
    if (brought._tag !== "opened") throw new Error("the seat opened")
    expect(brought.seat.seat).toBe(measured.name)
    expect(brought.seat.writ).toBe(measured.childDigest)

    // The FIRST act the seat landed is its opening, and it carries the writ the
    // spawn requested — checked against the spawn's own request label, so the
    // chain runs from the admitted sentence to the fact with nothing assumed
    // in between.
    const opening = measured.seatFacts[0] as SeatOpened
    expect(opening.kind).toBe(SPAWN_SEAT_OPENED)
    expect(opening.seat).toBe(measured.name)
    expect(opening.writ).toBe(measured.childDigest)
    expect(opening.request).toBe(String(measured.childLabel))
    expect(Effect.runSync(kernelIdentity(opening.writ).pipe(Effect.orDie)))
      .toBe(measured.childLabel)

    // The seat's own run acted under that writ: its trace says so.
    const seatTrace = measured.traceFacts[1]!
    expect(seatTrace.writ).toBe(measured.childDigest)
    expect(seatTrace.outcome).toBe("landed")
    expect(brought.seat.run.trace).toEqual(seatTrace)
  })

  test("the run's trace lands, then the retirement, in that order", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        const brought = yield* seats.consume(Stream.fromIterable([trace.fact]))
        return {
          brought,
          order: staged.carriage.landed.map((row) => row.handle),
          seatFacts: factsOn(staged, seatHandle) as ReadonlyArray<SeatFact>,
          traceFacts: factsOn(staged, traceHandle) as ReadonlyArray<RunTraceFact>,
        }
      })
    )

    const brought = measured.brought[0]!
    if (brought._tag !== "opened") throw new Error("the seat opened")

    // Two seat facts and no more: one opening, one retirement.
    expect(measured.seatFacts.map((fact) => fact.kind))
      .toEqual([SPAWN_SEAT_OPENED, SPAWN_SEAT_RETIRED])

    // The order across lanes, read off the recorder: the seat opened, its
    // program's own fact landed, the run's trace landed, and only then did the
    // seat retire. A retirement that preceded its own trace would put the
    // record of a run after the announcement that it was over.
    const retiredAt = measured.order.lastIndexOf(seatHandle)
    const tracedAt = measured.order.lastIndexOf(traceHandle)
    expect(tracedAt).toBeLessThan(retiredAt)

    // And the retirement names where that trace landed, so a reader reaches the
    // run from the retirement without comparing two lanes' positions.
    const retirement = measured.seatFacts[1] as SeatRetired
    expect(retirement.outcome).toBe("landed")
    expect(retirement.landing).toBe("carried")
    if (brought.seat.run.landing._tag !== "carried") throw new Error("the trace landed")
    expect(retirement.trace).toBe(brought.seat.run.landing.emitted.digest)
    expect(measured.traceFacts.length).toBe(2)
  })

  test("the seat lane orders one seat's own two facts on one partition", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        yield* seats.consume(Stream.fromIterable([trace.fact]))
        return staged.carriage.landed.filter((row) => row.handle === seatHandle)
      })
    )
    expect(measured.length).toBe(2)
    expect(measured[1]!.partition).toBe(measured[0]!.partition)
    expect(measured[1]!.position).toBe(measured[0]!.position + 1)
  })
})

describe("a refused spawn brings up nothing", () => {
  test("the recorder shows zero carriage for a spawn the door refused", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        // The parent names a policy nothing declared, so the door refuses the
        // sentence; the request is the chartered child, so a consumer that
        // sighted this spawn WOULD have a seat to bring up.
        const trace = yield* spawnTrace(staged, staged.ghostLabel, staged.child.label)
        const before = staged.carriage.landed.length
        const brought = yield* seats.consume(Stream.fromIterable([trace.fact]))
        return {
          outcome: trace.outcome,
          steps: trace.fact.event.steps.length,
          brought,
          carried: staged.carriage.landed.length - before,
          seatFacts: factsOn(staged, seatHandle).length,
        }
      })
    )
    expect(measured.outcome).toBe("refused")
    // The refused node is not a step: every arm keeps the prefix that STOOD.
    expect(measured.steps).toBe(0)
    expect(measured.brought).toEqual([])
    expect(measured.carried).toBe(0)
    expect(measured.seatFacts).toBe(0)
  })

  test("the recorder catches the trace that kept its refused node", async () => {
    // The falsification: promote the refused node into the trace's own steps,
    // framed by the DOOR's own encoder, and hand it to the same consumer. If
    // the recorder could not see a bring-up, the zero reading above would be
    // vacuous; it sees this one.
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.ghostLabel, staged.child.label)
        if (trace.fact.event.outcome !== "refused") throw new Error("the spawn was refused")
        const promoted: RunTraceStep = {
          node: trace.fact.event.node,
          encoded: encodeAct({
            _tag: "spawn",
            parent: { id: staged.ghostLabel },
            request: { id: staged.child.label },
          }).map(String),
          landed: null,
        }
        const mutant: LandedFact<RunTraceFact> = {
          ...trace.fact,
          event: { ...trace.fact.event, steps: [promoted] },
        }
        const before = staged.carriage.landed.length
        const brought = yield* seats.consume(Stream.fromIterable([mutant]))
        return {
          brought,
          carried: staged.carriage.landed.length - before,
          seatFacts: factsOn(staged, seatHandle).length,
        }
      })
    )
    expect(measured.brought.length).toBe(1)
    expect(measured.brought[0]!._tag).toBe("opened")
    expect(measured.seatFacts).toBe(2)
    expect(measured.carried).toBeGreaterThan(0)
    console.log(
      "SPAWN CONTROL: PASS component=refused-spawn-zero-carriage"
        + " mutant=refused-node-promoted-to-step killed-by=recorder-outside-the-consumer"
        + ` carried=${measured.carried} law=an-arm-keeps-the-prefix-that-stood`,
    )
  })
})

describe("one spawn is one seat", () => {
  test("the same trace delivered twice brings up one seat", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        const brought = yield* seats.consume(Stream.fromIterable([trace.fact, trace.fact]))
        return {
          brought,
          seatFacts: factsOn(staged, seatHandle) as ReadonlyArray<SeatFact>,
          traceFacts: factsOn(staged, traceHandle).length,
          seats: yield* seats.seats,
        }
      })
    )
    expect(measured.brought.map((one) => one._tag)).toEqual(["opened", "absorbed"])
    expect(measured.seatFacts.map((fact) => fact.kind))
      .toEqual([SPAWN_SEAT_OPENED, SPAWN_SEAT_RETIRED])
    // One caller trace, one seat trace: the absorbed delivery ran nothing.
    expect(measured.traceFacts).toBe(2)
    expect(measured.seats.length).toBe(1)
  })

  test("a second consumer over the same lanes brings up nothing", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        yield* seats.consume(Stream.fromIterable([trace.fact]))
        const landedAfterFirst = staged.carriage.landed.length
        // A fresh consumer with an empty in-process fence, seeded only by what
        // the seat lane's own bounded tail shows.
        const second = yield* attachSpawnSeats({
          traceLane: staged.traceLane,
          seatLane: staged.seatLane,
          charters: [staged.charter],
        })
        const brought = yield* second.sweep
        return {
          brought,
          seeded: yield* second.seats,
          carried: staged.carriage.landed.length - landedAfterFirst,
        }
      })
    )
    expect(measured.seeded.length).toBe(1)
    expect(measured.brought.map((one) => one._tag)).toEqual(["absorbed"])
    expect(measured.carried).toBe(0)
  })

  test("a seat is named by the coordinate its spawn was sighted at", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        const sighted = yield* spawnsIn(trace.fact)
        void seats
        return {
          sighted,
          named: yield* seatName(trace.fact.digest, sighted[0]!.node),
          childLabel: staged.child.label,
          parentLabel: staged.parentLabel,
          traceDigest: trace.fact.digest,
        }
      })
    )
    expect(measured.sighted.length).toBe(1)
    const sighting = measured.sighted[0]!
    expect(sighting.seat).toBe(measured.named)
    expect(sighting.trace).toBe(measured.traceDigest)
    expect(sighting.parent).toBe(String(measured.parentLabel))
    expect(sighting.request).toBe(String(measured.childLabel))
  })
})

describe("the consumer builds and judges nothing", () => {
  test("a spawn whose requested policy no charter names brings up nothing", async () => {
    const measured = await withStage(
      (staged, seats) =>
        Effect.gen(function* () {
          const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
          const before = staged.carriage.landed.length
          const brought = yield* seats.consume(Stream.fromIterable([trace.fact]))
          return { brought, carried: staged.carriage.landed.length - before }
        }),
      () => [],
    )
    expect(measured.brought.length).toBe(1)
    const only = measured.brought[0]!
    expect(only._tag).toBe("unchartered")
    expect(measured.carried).toBe(0)
  })

  test("a step whose encoding the door cannot read refuses rather than guessing", async () => {
    const outcome = await withStage((staged, seats) =>
      Effect.gen(function* () {
        const trace = yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        const mutant: LandedFact<RunTraceFact> = {
          ...trace.fact,
          event: {
            ...trace.fact.event,
            steps: [{ node: "1", encoded: ["7", "-4", "5"], landed: null }],
          },
        }
        return yield* Effect.result(seats.consume(Stream.fromIterable([mutant])))
      })
    )
    expect(outcome._tag).toBe("Failure")
    if (outcome._tag !== "Failure") throw new Error("the fold refused")
    expect(outcome.failure.kind).toBe("malformed-value")
    expect(outcome.failure.sort).toBe("structural")
  })

  test("the standing run drains its source and brings the same seats up", async () => {
    const measured = await withStage((staged, seats) =>
      Effect.gen(function* () {
        yield* spawnTrace(staged, staged.parentLabel, staged.child.label)
        yield* seats.run
        return {
          seatFacts: factsOn(staged, seatHandle) as ReadonlyArray<SeatFact>,
          seats: yield* seats.seats,
        }
      })
    )
    expect(measured.seats.length).toBe(1)
    expect(measured.seatFacts.map((fact) => fact.kind))
      .toEqual([SPAWN_SEAT_OPENED, SPAWN_SEAT_RETIRED])
  })

  test("the bring-up fold is total over its four arms", () => {
    const named = matchSeatBringUp<string>({
      opened: (brought) => `opened:${brought.seat.seat}`,
      absorbed: (already) => `absorbed:${already.seat}`,
      unchartered: (missing) => `unchartered:${missing.request}`,
      unopened: (refused) => `unopened:${refused.refusal.reason}`,
    })
    const absorbed: SeatBringUp = { _tag: "absorbed", seat: "a".repeat(64) as Digest }
    expect(named(absorbed)).toBe(`absorbed:${"a".repeat(64)}`)
  })
})
