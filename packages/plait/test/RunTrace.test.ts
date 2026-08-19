/**
 * The run-trace wall: what a run answered is what its trace says, verbatim.
 *
 * Every row here executes a run vector the corpus itself carries — the model's
 * own program declarations, doors, writs and supplies, staged onto real
 * carriers — and then reads what the trace landed. The corpus is the
 * independent oracle on the outcome: the arm, the refusing node, the taught
 * reason, the unspeakable slot and detail, and how many steps stood are all
 * read out of the committed vector rather than out of the engine that just ran.
 *
 * The steps are compared byte for byte, through the estate's one
 * canonicalizer, against a rendering written IN THIS FILE rather than imported
 * from the projection under test. A comparison against the projection's own
 * output would be the projection agreeing with itself.
 *
 * The comparison's own falsification is executed once: the same wall, run
 * against a one-atom mutation of what the run produced, must refuse it.
 */
import { beforeAll, describe, expect, test } from "bun:test"

import { Effect, Layer, Stream } from "effect"

import { canonicalBytes, type WireValue } from "../src/truth/Canonical.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import { decodeRefusing, structuralRefusal, type Refusal } from "../src/truth/Refusal.js"
import type { KernelRunRecord } from "../src/kernel/KernelCorpusSchemas.js"
import {
  LANE_TAIL_LIMIT_DEFAULT,
  LaneReads,
  type DeclaredLane,
  type LandedFact,
  type LaneReadService,
  type TailOptions,
} from "../src/planes/Lane.js"
import type { EngineService, RunStep } from "../src/carriage/Engine.js"
import { Engine } from "../src/carriage/Engine.js"
import {
  RUN_TRACE_EVENT_FORM,
  RUN_TRACE_KIND,
  RUN_TRACE_PARTITIONS,
  runTraceLane,
  type RunTraceFact,
} from "../src/internal/runtraces.js"
import {
  RunTraceFact as RunTraceFactSchema,
  declareTraceLane,
  matchTraceLanding,
  runTraced,
  traceOf,
  traces,
  type TraceLanding,
  type TracedRun,
} from "../src/carriage/RunTrace.js"

import {
  engineLayer,
  loadRunCorpus,
  makeCarriers,
  runHolder,
  runNamed,
  prepare,
  type FixtureCarriers,
  type RunCorpus,
} from "./EngineRun.harness.js"

/* --------------------------------------------------------------- corpus */

let corpus: RunCorpus = { runs: [], programs: [] }
let traceHandle = ""
let traceLaneDigest: Digest

beforeAll(async () => {
  corpus = await loadRunCorpus()
  const lane = await Effect.runPromise(runTraceLane() as Effect.Effect<
    DeclaredLane<RunTraceFact, typeof RUN_TRACE_PARTITIONS>
  >)
  traceHandle = lane.handle
  traceLaneDigest = lane.digest
})

/* -------------------------------------------------------------- running */

const withEngine = <A>(
  body: (engine: EngineService, carriers: FixtureCarriers) => Effect.Effect<A, Refusal, Engine>,
): Promise<A> => {
  const carriers = makeCarriers()
  return Effect.runPromise(
    Effect.flatMap(Engine, (engine) => body(engine, carriers)).pipe(
      Effect.provide(engineLayer(carriers.layer)),
    ) as Effect.Effect<A, never>,
  )
}

/** What one executed vector left behind: the traced run and what a lane took. */
interface Executed {
  readonly run: TracedRun
  /** Every event the run-trace lane's carrier was handed. */
  readonly landed: ReadonlyArray<unknown>
}

/**
 * Executes one corpus run vector with its trace landing on the declared lane.
 *
 * The lane is declared THROUGH the engine, which is the only way a lane
 * becomes usable: the engine has no registration surface beside the language.
 */
const execute = (vector: KernelRunRecord): Promise<Executed> =>
  withEngine((engine, carriers) =>
    Effect.gen(function* () {
      const prepared = yield* prepare(engine, corpus, vector, carriers.grant)
      const declared = yield* declareTraceLane(prepared.writ)
      if (declared._tag !== "carried") {
        throw new Error(`declaring the trace lane was refused: ${declared.refusal.reason}`)
      }
      const run = yield* runTraced(prepared.declaration, {
        writ: prepared.writ,
        holder: runHolder,
        supplies: prepared.supplies,
        lane: declared.landed.digest,
      })
      return {
        run,
        landed: carriers.emits
          .filter((recorded) => recorded.handle === traceHandle)
          .map((recorded) => recorded.event),
      }
    })
  )

/* ------------------------------------------------------------ the oracle */

/**
 * The steps as this wall states them.
 *
 * Written out here rather than imported, so a landed row is compared against
 * an independent rendering of the engine's answer instead of against the
 * projection that produced it. Every unbounded integer is its own minimal
 * decimal, which is the one transformation JSON forces.
 */
const expectedSteps = (steps: ReadonlyArray<RunStep>): WireValue =>
  steps.map((step) => ({
    node: `${step.node}`,
    encoded: step.encoded.map((atom) => `${atom}`),
    landed: step.landed === null ? null : {
      label: `${step.landed.label}`,
      kind: step.landed.kind,
      digest: step.landed.digest,
    },
  }))

const bytesOf = (value: WireValue): Promise<Uint8Array> =>
  Effect.runPromise(canonicalBytes(value) as Effect.Effect<Uint8Array>)

/** The fields the declared event form says one arm carries, plus the shared ones. */
const declaredKeys = (outcome: string): ReadonlyArray<string> => {
  const variant = RUN_TRACE_EVENT_FORM.variants.find((row) => row.outcome === outcome)
  if (variant === undefined) throw new Error(`the declared form carries no ${outcome} variant`)
  return ["v", "kind", "outcome", ...variant.fields].sort()
}

const keysOf = (fact: RunTraceFact): ReadonlyArray<string> =>
  Object.keys(fact as unknown as Record<string, unknown>).sort()

/* ------------------------------------------------------------------ walls */

describe("the trace records the run the engine answered", () => {
  test("the corpus carries run vectors, and every arm of the outcome", () => {
    expect(corpus.runs.length).toBeGreaterThan(0)
    const arms = new Set(corpus.runs.map((vector) => vector.outcome.outcome))
    expect([...arms].sort()).toEqual(["landed", "refused", "unspeakable"])
  })

  test("every run vector lands one trace whose steps are its own, byte for byte", async () => {
    for (const vector of corpus.runs) {
      const executed = await execute(vector)
      // One fact per run, and never one per step: however many nodes the run
      // walked, exactly one trace reached the lane.
      expect({ vector: vector.name, landed: executed.landed.length })
        .toEqual({ vector: vector.name, landed: 1 })

      const trace = executed.run.trace
      // The corpus is the oracle on the arm and on how many steps stood.
      expect({ vector: vector.name, outcome: trace.outcome })
        .toEqual({ vector: vector.name, outcome: vector.outcome.outcome })
      expect({ vector: vector.name, steps: trace.steps.length })
        .toEqual({ vector: vector.name, steps: vector.outcome.steps.length })

      const derived = await bytesOf(expectedSteps(executed.run.outcome.steps))
      expect(await bytesOf(trace.steps as unknown as WireValue)).toEqual(derived)

      // And the value that reached the carrier is the value the caller was
      // handed: what a reader finds on the lane is what the run answered.
      expect(await bytesOf(executed.landed[0] as WireValue))
        .toEqual(await bytesOf(trace as unknown as WireValue))
    }
    expect(corpus.runs.length).toBe(5)
  })

  test("a refused run lands the door's own row and the node it stopped at", async () => {
    const vector = runNamed(corpus, "distill-shape-unfenced")
    const executed = await execute(vector)
    const trace = executed.run.trace
    if (trace.outcome !== "refused") throw new Error("the vector's arm is refused")
    if (vector.outcome.outcome !== "refused") throw new Error("the vector's arm is refused")
    expect(trace.refusal.reason).toBe(vector.outcome.reason)
    expect(trace.node).toBe(`${vector.outcome.node}`)
    // The taught row is the generated table's, whole: a refusal that carried
    // only its reason would be a refusal a reader cannot act on.
    expect(trace.refusal.law.length).toBeGreaterThan(0)
    expect(trace.refusal.repair.length).toBeGreaterThan(0)
    expect(trace.refusal.applicability.length).toBeGreaterThan(0)
  })

  test("an unspeakable run lands the slot and which way it had no value", async () => {
    const vector = runNamed(corpus, "ground-two-node")
    const executed = await execute(vector)
    const trace = executed.run.trace
    if (trace.outcome !== "unspeakable") throw new Error("the vector's arm is unspeakable")
    if (vector.outcome.outcome !== "unspeakable") throw new Error("the vector's arm is unspeakable")
    expect({ node: trace.node, slot: trace.slot, detail: trace.detail }).toEqual({
      node: `${vector.outcome.node}`,
      slot: vector.outcome.slot,
      detail: vector.outcome.detail,
    })
  })

  test("both stopping arms land the prefix that stood", async () => {
    // The steps before a stopping node are what happened, and a trace that
    // discarded them would report a partial run as nothing. The corpus states
    // the prefix on both arms, and the trace has to carry it.
    for (const name of ["distill-shape-unfenced", "ground-two-node"]) {
      const vector = runNamed(corpus, name)
      const executed = await execute(vector)
      const stood = vector.outcome.steps
      expect({ name, steps: executed.run.trace.steps.length })
        .toEqual({ name, steps: stood.length })
      expect({ name, steps: stood.length }).toEqual({ name, steps: 1 })
      expect({ name, node: executed.run.trace.steps[0]!.node })
        .toEqual({ name, node: `${stood[0]!.node}` })
    }
  })

  test("the step comparison is sensitive, so its passes are evidence", async () => {
    const executed = await execute(runNamed(corpus, "distill-shape"))
    const stated = expectedSteps(executed.run.outcome.steps) as ReadonlyArray<
      Record<string, WireValue>
    >
    // One atom of one admitted sentence's encoding moves, and the same
    // comparison that passes above must refuse the mutant.
    const mutated = stated.map((step, index) =>
      index === 0 ? { ...step, node: `${step.node}0` } : step
    )
    expect(await bytesOf(mutated as WireValue)).not.toEqual(await bytesOf(stated as WireValue))
    expect(await bytesOf(executed.run.trace.steps as unknown as WireValue))
      .not.toEqual(await bytesOf(mutated as WireValue))
  })
})

describe("the fact is the shape the route declares", () => {
  test("the lane's handle is the digest of the declared event form", async () => {
    const derived = await Effect.runPromise(
      digestOf(RUN_TRACE_EVENT_FORM as unknown as WireValue) as Effect.Effect<Digest>,
    )
    expect(traceHandle).toBe(derived)
  })

  test("each arm carries exactly the fields its declared variant names", async () => {
    for (const vector of corpus.runs) {
      const executed = await execute(vector)
      expect({ vector: vector.name, keys: keysOf(executed.run.trace) })
        .toEqual({ vector: vector.name, keys: declaredKeys(executed.run.trace.outcome) })
    }
  })

  test("no arm carries a time of any kind", async () => {
    // A run's order is its steps' order and a lane's order is its positions;
    // both are what this estate has instead of a clock. A field naming a time
    // would be a clock read back as meaning.
    for (const vector of corpus.runs) {
      const executed = await execute(vector)
      for (const key of keysOf(executed.run.trace)) {
        expect({ vector: vector.name, key, timed: /time|clock|at$|stamp/i.test(key) })
          .toEqual({ vector: vector.name, key, timed: false })
      }
    }
  })

  test("the fact round-trips the one parse boundary byte-identically", async () => {
    for (const vector of corpus.runs) {
      const executed = await execute(vector)
      const landed = executed.landed[0] as WireValue
      const bytes = await bytesOf(landed)
      // Through the estate's one constrained decoder, from the bytes a reader
      // would receive rather than from the value this process holds.
      const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown
      const decoded = await Effect.runPromise(
        decodeRefusing(RunTraceFactSchema)(parsed) as Effect.Effect<RunTraceFact>,
      )
      expect(await bytesOf(decoded as unknown as WireValue)).toEqual(bytes)
      expect(decoded.kind).toBe(RUN_TRACE_KIND)
    }
  })

  test("the projection alone answers the same fact the run landed", async () => {
    const vector = runNamed(corpus, "holey-filled")
    const executed = await execute(vector)
    const projected = traceOf(executed.run.outcome, executed.run.trace.writ)
    expect(await bytesOf(projected as unknown as WireValue))
      .toEqual(await bytesOf(executed.run.trace as unknown as WireValue))
  })
})

describe("a trace nobody could land is reported, never swallowed", () => {
  test("the door refuses an emit onto a lane no declaration bound, and the run survives", async () => {
    const vector = runNamed(corpus, "holey-filled")
    const executed = await withEngine((engine, carriers) =>
      Effect.gen(function* () {
        const prepared = yield* prepare(engine, corpus, vector, carriers.grant)
        // A lane address the engine has never been told about: the door sweeps
        // the emit's referent and answers with its own taught row, which is
        // also what proves this emit reaches the door at all.
        const run = yield* runTraced(prepared.declaration, {
          writ: prepared.writ,
          holder: runHolder,
          supplies: prepared.supplies,
          lane: traceLaneDigest,
        })
        return { run, landed: carriers.emits.filter((one) => one.handle === traceHandle) }
      })
    )
    expect(executed.run.landing._tag).toBe("refused")
    if (executed.run.landing._tag !== "refused") throw new Error("the arm is refused")
    expect(executed.run.landing.refusal.reason).toBe("forward-reference")
    expect(executed.landed.length).toBe(0)
    // The run itself is untouched: its outcome and its trace stand.
    expect(executed.run.outcome._tag).toBe("landed")
    expect(executed.run.trace.steps.length).toBe(vector.outcome.steps.length)
  })

  test("a seam refusal on the landing keeps the run's own answer", async () => {
    const vector = runNamed(corpus, "holey-filled")
    const executed = await withEngine((engine, carriers) =>
      Effect.gen(function* () {
        const prepared = yield* prepare(engine, corpus, vector, carriers.grant)
        const lane = yield* runTraceLane()
        // Declared as a VALUE of kind lane rather than through the lane door:
        // the referent is in the catalog, so the door admits the emit, and no
        // carrier is bound, so the seam reports the absence.
        const declared = yield* engine.declare({
          kind: "lane",
          value: lane.declaration as unknown as WireValue,
          writ: prepared.writ,
        })
        if (declared._tag !== "carried") throw new Error("declaring the lane value was refused")
        const run = yield* runTraced(prepared.declaration, {
          writ: prepared.writ,
          holder: runHolder,
          supplies: prepared.supplies,
          lane: declared.landed.digest,
        })
        return { run, landed: carriers.emits.filter((one) => one.handle === traceHandle) }
      })
    )
    expect(executed.run.landing._tag).toBe("unlanded")
    if (executed.run.landing._tag !== "unlanded") throw new Error("the arm is unlanded")
    expect(executed.run.landing.refusal.sort).toBe("absence")
    expect(executed.landed.length).toBe(0)
    expect(executed.run.outcome._tag).toBe("landed")
  })

  test("a carried landing names the fact it wrote", async () => {
    const executed = await execute(runNamed(corpus, "holey-filled"))
    expect(executed.run.landing._tag).toBe("carried")
    if (executed.run.landing._tag !== "carried") throw new Error("the arm is carried")
    const named = await Effect.runPromise(
      digestOf(executed.run.trace as unknown as WireValue) as Effect.Effect<Digest>,
    )
    expect(executed.run.landing.emitted.digest).toBe(named)
  })

  test("the landing fold dispatches every arm to its own", () => {
    const named = matchTraceLanding<string>({
      carried: () => "carried",
      refused: () => "refused",
      unlanded: () => "unlanded",
    })
    const arms: ReadonlyArray<TraceLanding> = [
      { _tag: "carried", emitted: { digest: traceLaneDigest, partition: 0, position: 1, duplicate: false } },
      {
        _tag: "refused",
        refusal: { reason: "forward-reference", law: "l", repair: "r", applicability: "a" },
      },
      {
        _tag: "unlanded",
        refusal: structuralRefusal({
          kind: "malformed-value",
          law: "A closure suite mints one refusal so the seam arm has a value to carry.",
          path: ["lane"],
          got: "absent",
          expected: "a bound carrier",
          next: [{ subject: "lane", note: "Declare the lane through the engine first." }],
        }),
      },
    ]
    expect(arms.slice(0, 2).map(named)).toEqual(["carried", "refused"])
    expect(named(arms[2]!)).toBe("unlanded")
  })
})

describe("the read is the lane read seam's", () => {
  test("the bounded tail reads the run-trace lane at the bound it was given", async () => {
    const seen: Array<{ readonly lane: Digest; readonly options: TailOptions | undefined }> = []
    const executed = await execute(runNamed(corpus, "distill-shape"))
    const fact = executed.run.trace
    const rows: ReadonlyArray<LandedFact<RunTraceFact>> = [{
      partition: 3,
      position: 11,
      digest: await Effect.runPromise(
        digestOf(fact as unknown as WireValue) as Effect.Effect<Digest>,
      ),
      holder: runHolder,
      event: fact,
    }]
    const reads = LaneReads.testLayer({
      tail: ((lane: DeclaredLane<unknown, number>, options?: TailOptions) => {
        seen.push({ lane: lane.digest, options })
        return Effect.succeed(rows)
      }) as unknown as LaneReadService["tail"],
      follow: (() => Stream.empty) as unknown as LaneReadService["follow"],
    })
    const read = await Effect.runPromise(
      traces({ limit: LANE_TAIL_LIMIT_DEFAULT }).pipe(
        Effect.provide(reads as Layer.Layer<LaneReads>),
      ) as Effect.Effect<ReadonlyArray<LandedFact<RunTraceFact>>>,
    )
    expect(seen.length).toBe(1)
    expect(seen[0]!.lane).toBe(traceLaneDigest)
    expect(seen[0]!.options).toEqual({ limit: LANE_TAIL_LIMIT_DEFAULT })
    expect(read.length).toBe(1)
    expect(await bytesOf(read[0]!.event as unknown as WireValue))
      .toEqual(await bytesOf(fact as unknown as WireValue))
  })
})
