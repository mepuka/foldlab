import { afterEach, beforeAll, describe, expect, test } from "bun:test"

import { Effect, Layer } from "effect"

import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
import { LaneReads, Lanes } from "../src/planes/Lane.js"
import { Engine } from "../src/carriage/Engine.js"
import { declareTraceLane, runTraced, traces } from "../src/carriage/RunTrace.js"
import type { RunTraceFact } from "../src/internal/runtraces.js"

import {
  engineLayer,
  loadRunCorpus,
  makeCarriers,
  prepare,
  runHolder,
  runNamed,
  type RunCorpus,
} from "./EngineRun.harness.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

/**
 * The run trace over a real substrate.
 *
 * `RunTrace.test.ts` holds what a trace SAYS — that its steps are the run's own
 * steps, that each arm carries the fields its declared form names, that a
 * refused landing is reported rather than swallowed. All of that is held over
 * fixtures, because a fixture is the only oracle that lets a wall compare a
 * landed value against the outcome it projects.
 *
 * What a fixture cannot say is whether the fact SURVIVES: whether the value the
 * projection built canonicalizes, routes, stores, and comes back through the
 * lane's own declared event schema — which admits on excess properties and on
 * missing ones — as the same bytes. That claim needs octets on a wire and a
 * server that stored them, and it is the only claim this file makes.
 *
 * The two arms are held apart for the same reason the read face's are: a trace
 * that agreed with its own projection but disagreed with what a substrate hands
 * back would pass one file and fail the other, which is what makes the pair
 * evidence rather than one implementation talking to itself.
 */

let harness: NatsHarness | undefined
let corpus: RunCorpus = { runs: [], programs: [] }

beforeAll(async () => {
  corpus = await loadRunCorpus()
})

afterEach(async () => {
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

const bytesOf = (value: WireValue): Promise<Uint8Array> =>
  Effect.runPromise(canonicalBytes(value) as Effect.Effect<Uint8Array>)

describe("a landed trace reads back as the value it was", () => {
  test("two runs under one writ land on one partition and read back byte-identical", async () => {
    harness = await startNatsHarness()
    const servers = harness.url
    const carriers = makeCarriers(Lanes.layer({ servers }))

    const measured = await Effect.runPromise(Effect.gen(function* () {
      const engine = yield* Engine
      // Two different programs under the same staged policy: the traces differ,
      // so the substrate stores two messages rather than absorbing a repeat of
      // one, and the writ they share is what routes them.
      const landing = yield* prepare(engine, corpus, runNamed(corpus, "holey-filled"), carriers.grant)
      const stopping = yield* prepare(engine, corpus, runNamed(corpus, "ground-two-node"), carriers.grant)
      expect(stopping.writ).toBe(landing.writ)

      const declared = yield* declareTraceLane(landing.writ)
      if (declared._tag !== "carried") {
        throw new Error(`declaring the trace lane was refused: ${declared.refusal.reason}`)
      }
      const lane = declared.landed.digest
      const first = yield* runTraced(landing.declaration, {
        writ: landing.writ,
        holder: runHolder,
        supplies: landing.supplies,
        lane,
      })
      const second = yield* runTraced(stopping.declaration, {
        writ: stopping.writ,
        holder: runHolder,
        supplies: stopping.supplies,
        lane,
      })
      const read = yield* traces({})
      return { first, second, read }
    }).pipe(
      Effect.provide(Layer.mergeAll(
        engineLayer(carriers.layer),
        LaneReads.layer({ servers }),
      )),
      Effect.scoped,
      Effect.orDie,
    ))

    // Both landings carried, and the substrate stored two distinct facts.
    expect(measured.first.landing._tag).toBe("carried")
    expect(measured.second.landing._tag).toBe("carried")
    if (measured.first.landing._tag !== "carried") throw new Error("the first landing carried")
    if (measured.second.landing._tag !== "carried") throw new Error("the second landing carried")
    const landedFirst = measured.first.landing.emitted
    const landedSecond = measured.second.landing.emitted
    expect(landedFirst.duplicate).toBe(false)
    expect(landedSecond.duplicate).toBe(false)

    // One writ keys the lane, so both traces are one partition's sequence and
    // their positions are comparable — which is the whole reason the key is the
    // writ rather than the run.
    expect(landedSecond.partition).toBe(landedFirst.partition)
    expect(landedSecond.position).toBe(landedFirst.position + 1)

    // And the read returns exactly those two facts, admitted by the envelope
    // digest over the fetched octets and decoded through the lane's own
    // declared event schema, byte-identical to what each run answered.
    const rows = measured.read.filter((fact) => fact.partition === landedFirst.partition)
    expect(measured.read.length).toBe(2)
    expect(rows.length).toBe(2)
    expect(rows.map((fact) => fact.position))
      .toEqual([landedFirst.position, landedSecond.position])
    for (const [index, traced] of [measured.first, measured.second].entries()) {
      const row = rows[index]!
      const landing = traced.landing
      if (landing._tag !== "carried") throw new Error("the landing carried")
      expect(await bytesOf(row.event as unknown as WireValue))
        .toEqual(await bytesOf(traced.trace as unknown as WireValue))
      expect({ digest: row.digest, holder: row.holder })
        .toEqual({ digest: landing.emitted.digest, holder: runHolder })
    }

    // The two arms both travelled: one run that landed and one whose completion
    // could not speak a node, each with the outcome word its own run answered.
    const outcomes = rows.map((row) => (row.event as RunTraceFact).outcome)
    expect(outcomes).toEqual(["landed", "unspeakable"])
  }, 180_000)
})
