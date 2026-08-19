import { afterEach, describe, expect, test } from "bun:test"

import { Effect, Layer } from "effect"

import type { WireValue } from "../src/truth/Canonical.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import { kernelIdentity } from "../src/kernel/KernelIdentity.js"
import { program } from "../src/kernel/KernelProgram.js"
import { Holder } from "../src/kernel/Wire.js"
import { LaneHandle, LaneReads, Lanes } from "../src/planes/Lane.js"
import { Engine } from "../src/carriage/Engine.js"
import { declareTraceLane, runTraced } from "../src/carriage/RunTrace.js"
import { runTraceLane, type RunTraceFact } from "../src/internal/runtraces.js"
import {
  SPAWN_SEAT_OPENED,
  SPAWN_SEAT_RETIRED,
  seatName,
  spawnSeatLane,
  type SeatOpened,
  type SeatRetired,
} from "../src/internal/seats.js"
import { attachSpawnSeats, declareSeatLane } from "../src/internal/spawnseats.js"

import { engineLayer, fixtureLane, makeCarriers, rootWritDigest } from "./EngineRun.harness.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

/**
 * The spawn consumer over a real substrate.
 *
 * `SpawnSeats.test.ts` holds what the consumer DOES — that a refused spawn is
 * invisible to it, that one spawn is one seat, that a seat's first act carries
 * the writ its spawn requested, that a step the door cannot read refuses. All
 * of that is held over a lane fixture, because a fixture is the only oracle
 * that lets a wall count what was handed to a carrier.
 *
 * What a fixture cannot say is whether a seat SURVIVES: whether the trace an
 * engine wrote canonicalizes, routes, stores, and comes back through the lane's
 * own declared event schema as the same sentence a consumer can sight a spawn
 * in — and whether the facts that seat lands do the same. That claim needs
 * octets on a wire and a server that stored them, and it is the only claim this
 * file makes.
 *
 * The chain this wall executes runs end to end with nothing assumed in the
 * middle: a program says a spawn, the door admits it, the engine lands the run
 * as one fact, a real server stores it, a standing consumer reads it back
 * through the lane's verify-on-read, and the seat it brings up lands its own
 * facts on a second real lane — where this file reads them again and checks the
 * writ against the identity label the admitted sentence itself named.
 */

let harness: NatsHarness | undefined

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const holder = Holder.make("spawn-seat-wall")

/** The policy a seat speaks under. */
const CHILD_POLICY: WireValue = { v: 0, kind: "policy", name: "spawn-seat-wall-child" }

/** A policy nothing declares, so a sentence naming it is refused. */
const GHOST_POLICY: WireValue = { v: 0, kind: "policy", name: "spawn-seat-wall-ghost" }

describe("an admitted spawn brings up a seat, over a substrate that stored it", () => {
  test("the seat's facts land, read back, and carry the writ the spawn requested", async () => {
    harness = await startNatsHarness()
    const servers = harness.url
    const carriers = makeCarriers(Lanes.layer({ servers }))

    const measured = await Effect.runPromise(Effect.gen(function* () {
      const engine = yield* Engine
      const reads = yield* LaneReads

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
        lane: fixtureLane(LaneHandle.make("spawn-seat-wall-work")),
        writ: rootWritDigest,
      })
      if (work._tag !== "carried") throw new Error("the seat's work lane was refused")

      const parentLabel = yield* kernelIdentity(rootWritDigest)
      const ghostLabel = yield* kernelIdentity(yield* digestOf(GHOST_POLICY))

      // The seat's own work: declare a value, emit it. Table and payload, the
      // shape the engine's own run suite executes.
      const seatWork = program("spawn-seat-wall-work-program", {}, ($) => {
        const declared = $.declare({ kind: "resource", value: $.literal(42n) })
        return $.emit({ lane: $.digest("lane", work.landed.label), body: declared })
      })

      const spawning = (parent: bigint, request: bigint) =>
        program("spawn-seat-wall-caller", {}, ($) =>
          $.spawn({
            parent: $.digest("policy", parent),
            request: $.digest("policy", request),
          }))

      // One spawn the door admits, and one it refuses for naming a policy
      // nothing declared. Both runs land a trace on the same real lane.
      const admitted = yield* runTraced(spawning(parentLabel, child.landed.label), {
        writ: rootWritDigest,
        holder,
        lane: traceLane.landed.digest,
      })
      const refused = yield* runTraced(spawning(ghostLabel, child.landed.label), {
        writ: rootWritDigest,
        holder,
        lane: traceLane.landed.digest,
      })

      const seats = yield* attachSpawnSeats({
        traceLane: traceLane.landed.digest,
        seatLane: seatLane.landed.digest,
        charters: [{
          writ: child.landed.digest,
          holder,
          program: seatWork,
          supplies: { kinds: new Map([[1n, "resource" as const]]) },
        }],
      })

      // The sweep reads the run-trace lane's own bounded tail: every fact here
      // came off the wire, was admitted by its envelope digest, and was decoded
      // through the lane's declared event schema before this consumer saw it.
      const brought = yield* seats.sweep
      // A second sweep re-reads the same tail. At-least-once delivery is safe
      // exactly because this one absorbs.
      const again = yield* seats.sweep
      // And a fresh consumer, with an empty in-process fence, seeded only by
      // what the seat lane's own tail shows: the restart claim, executed.
      const restarted = yield* attachSpawnSeats({
        traceLane: traceLane.landed.digest,
        seatLane: seatLane.landed.digest,
        charters: [{
          writ: child.landed.digest,
          holder,
          program: seatWork,
          supplies: { kinds: new Map([[1n, "resource" as const]]) },
        }],
      })
      const afterRestart = yield* restarted.sweep

      const seatFacts = yield* reads.tail(yield* spawnSeatLane(), {})
      const traceFacts = yield* reads.tail(yield* runTraceLane(), {})
      // The name a reader computes from what landed: the trace fact's own
      // identity and the node the spawn stood at, exactly as the trace writes
      // it. Nothing here reads the consumer's answer to derive it.
      if (admitted.landing._tag !== "carried") throw new Error("the caller's trace landed")
      const expectedName = yield* seatName(
        admitted.landing.emitted.digest,
        admitted.trace.steps[0]!.node,
      )
      return {
        admitted,
        refused,
        brought,
        again,
        afterRestart,
        seatFacts,
        traceFacts,
        child: child.landed,
        expectedName,
        childLabelOfWrit: yield* kernelIdentity(child.landed.digest),
      }
    }).pipe(
      Effect.provide(Layer.mergeAll(
        engineLayer(carriers.layer),
        LaneReads.layer({ servers }),
      )),
      Effect.scoped,
      Effect.orDie,
    ))

    // Both caller runs landed their traces on the real lane.
    expect(measured.admitted.landing._tag).toBe("carried")
    expect(measured.refused.landing._tag).toBe("carried")
    expect(measured.admitted.outcome._tag).toBe("landed")
    expect(measured.refused.outcome._tag).toBe("refused")

    // The refused spawn kept no step, so the consumer sighted exactly one
    // spawn across the two traces it read.
    expect(measured.brought.length).toBe(1)
    const brought = measured.brought[0]!
    expect(brought._tag).toBe("opened")
    if (brought._tag !== "opened") throw new Error("the seat opened")
    expect(brought.seat.seat).toBe(measured.expectedName)
    expect(brought.seat.writ).toBe(measured.child.digest)

    // One spawn is one seat: the second sweep and the restarted consumer both
    // absorbed, and neither is a claim about the fixture — the seat lane on the
    // server is what seeded the restarted one.
    expect(measured.again.map((one) => one._tag)).toEqual(["absorbed"])
    expect(measured.afterRestart.map((one) => one._tag)).toEqual(["absorbed"])

    // Exactly two seat facts survived the round trip: one opening, one
    // retirement, on one partition, at consecutive positions.
    expect(measured.seatFacts.length).toBe(2)
    const [opening, retirement] = measured.seatFacts
    expect(opening!.event.kind).toBe(SPAWN_SEAT_OPENED)
    expect(retirement!.event.kind).toBe(SPAWN_SEAT_RETIRED)
    expect(retirement!.partition).toBe(opening!.partition)
    expect(retirement!.position).toBe(opening!.position + 1)
    expect(opening!.holder).toBe(holder)
    expect(retirement!.holder).toBe(holder)

    // The seat's FIRST landed act carries the spawned writ, and the chain from
    // the admitted sentence to this fact closes: the opening's `request` is the
    // identity label the spawn named, and it is the label of the writ the
    // opening carries.
    const opened = opening!.event as SeatOpened
    expect(opened.seat).toBe(measured.expectedName)
    expect(opened.writ).toBe(measured.child.digest)
    expect(opened.request).toBe(String(measured.child.label))
    expect(measured.childLabelOfWrit).toBe(measured.child.label)

    // Three traces on the lane: the two callers' and the seat's own, which is
    // the one that acted under the spawned writ.
    expect(measured.traceFacts.length).toBe(3)
    const seatTrace = measured.traceFacts
      .map((row) => row.event as RunTraceFact)
      .filter((fact) => fact.writ === measured.child.digest)
    expect(seatTrace.length).toBe(1)
    expect(seatTrace[0]!.outcome).toBe("landed")

    // The retirement names how the run ended and where its record went, and
    // that digest is one the run-trace lane actually carries — so a reader
    // reaches the run from the retirement without comparing two lanes'
    // positions.
    const retired = retirement!.event as SeatRetired
    expect(retired.seat).toBe(measured.expectedName)
    expect(retired.writ).toBe(measured.child.digest)
    expect(retired.outcome).toBe("landed")
    expect(retired.landing).toBe("carried")
    const traceDigests: ReadonlyArray<Digest> = measured.traceFacts.map((row) => row.digest)
    expect(traceDigests).toContain(retired.trace as Digest)
  }, 180_000)
})
