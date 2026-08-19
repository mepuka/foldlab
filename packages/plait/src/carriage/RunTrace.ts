/**
 * Plane: carriage — hosts and transport clients.
 *
 * The engine's execution log: one program run, one landed fact.
 *
 * ## Flux is transport; the trace is meaning
 *
 * A run already produces a live per-act story — every judgment the engine
 * issues, admitted or refused, is published on its verdict stream as it
 * happens. That stream is FLUX: in process, unaddressed, gone once nobody is
 * listening, and load-bearing for nothing. What a reader needs afterwards is
 * different in kind: the run as ONE canonical value, landed as a fact, named
 * by its own digest, reachable from its root long after the fibre that ran it
 * is gone. That is what this module projects and lands.
 *
 * One fact per run, and never one per step. A lane that took a fact per
 * judgment would carry a confetti of tokens whose only reader is a tail, and
 * the digest of any one of them would name a keystroke rather than a run. A
 * trace is the causal chain of facts reachable by digest from a root; this
 * module writes one link of that chain per execution.
 *
 * ## The steps land verbatim
 *
 * `Engine.run` already answers with the walked steps on all three arms — a
 * landed run, a run the door refused at a node, and a run whose completion
 * could not speak one — and each stopping arm keeps the prefix that stood.
 * This module carries those steps through unchanged: same node names, same
 * canonical encodings, same landings, in the same order. The only
 * transformation is the one JSON forces — an unbounded natural becomes its
 * minimal decimal as text, because a JSON number holds 2^53 exactly and no
 * more, and an identity that rounds is a different identity.
 *
 * Nothing is restated on the way out. The refused arm carries the DOOR'S own
 * taught row, field for field; the unspeakable arm carries the slot and which
 * of the model's four ways it had no value; the arm itself is named by the
 * outcome's own word. No judgment happens here — this module folds an outcome
 * that has already been judged and could not turn a refusal into a landing if
 * it tried.
 *
 * ## Replay replays the trace
 *
 * A landed trace is what a replay reads. It carries every admitted sentence's
 * canonical encoding and every landing's identity, so reconstructing what a
 * run did is a read of one fact — never a re-execution, and never a second ask
 * of any completion. Re-running a program would re-derive its supplies, and a
 * supply is execution-time data the declaration deliberately does not carry:
 * the answer a completion gave once is in the trace, and asking again is
 * asking a different question.
 *
 * ## No clock, anywhere
 *
 * There is no wall-clock time on a trace and there will not be one. A run's
 * order is its steps' order, and a lane's order is its partition's positions;
 * both are what the estate has instead of a clock. The substrate stamps a time
 * on every stored message and nothing reads it back as meaning here either.
 *
 * ## The landing is judged like every other sentence
 *
 * Landing a trace is an ordinary emit through the one door: the lane must have
 * been declared through this engine, the emit is judged, and a refused emit
 * answers with the door's taught row exactly as any other refused sentence
 * does. That refusal is handed back in the value rather than thrown away —
 * a trace nobody could land is a fact about this estate, and the run it
 * describes still happened. Nor does it cost the caller its outcome: a seam
 * refusal on the trace's landing — an unbound carrier, a substrate that is not
 * answering, a fact past the payload budget — is carried in the same value, so
 * the run's own answer is never lost to the failure of its record.
 *
 * A run that refuses on the SEAM never produced an outcome at all, and there
 * is nothing to land for it: that refusal reaches the caller unchanged.
 *
 * @module
 */
import { Effect, Match, Result } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import type { Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import type { KernelProgramDeclaration } from "../kernel/KernelCorpusSchemas.js"
import type { KernelProgram } from "../kernel/KernelProgram.js"
import {
  LaneReads,
  type EmittedEvent,
  type LandedFact,
  type TailOptions,
} from "../planes/Lane.js"
import {
  RUN_TRACE_KIND,
  runTraceLane,
  type RunTraceFact,
  type RunTraceLanding,
  type RunTraceRow,
  type RunTraceStep,
} from "../internal/runtraces.js"
import {
  Engine,
  matchOutcome,
  matchRunOutcome,
  type DeclaredLanding,
  type EngineLanded,
  type EngineOutcome,
  type RunOptions,
  type RunOutcome,
  type RunStep,
} from "./Engine.js"

export {
  RUN_TRACE_KIND,
  RUN_TRACE_PARTITIONS,
  RunTraceFact,
  runTraceLane,
} from "../internal/runtraces.js"
export type {
  RunTraceLanding,
  RunTraceRow,
  RunTraceStep,
} from "../internal/runtraces.js"

/** Inputs for one traced run: the run's own, plus where its trace lands. */
export interface TraceOptions extends RunOptions {
  /**
   * The address of the run-trace lane, already declared through this engine.
   *
   * A lane becomes usable by being DECLARED — the engine has no registration
   * surface beside the language — so this is the digest that declaration
   * landed at, and {@link declareTraceLane} is the one call that produces it.
   */
  readonly lane: Digest
}

/**
 * What became of one trace's landing.
 *
 * Three arms and two registers, and they never dress as each other: the door's
 * taught row is what a refused SENTENCE answers with, and the estate's own
 * refusal is what a refused SEAM answers with. Merging them would leave a
 * reader unable to tell "the language says no" from "the substrate is not
 * there", which are different facts with different repairs.
 */
export type TraceLanding =
  | {
    readonly _tag: "carried"
    /** Where the fact landed: its partition, its position, and its identity. */
    readonly emitted: EmittedEvent
  }
  | {
    readonly _tag: "refused"
    /** The generated table's own row, passed through; nothing here mints one. */
    readonly refusal: RunTraceRow
  }
  | {
    readonly _tag: "unlanded"
    /** The estate refusal, in its own vocabulary; never the door's register. */
    readonly refusal: Refusal
  }

/** The arm where the door admitted the trace emit and the fact landed. */
type TraceCarried = Extract<TraceLanding, { readonly _tag: "carried" }>

/** The arm where the door refused the trace emit; the row is the whole answer. */
type TraceRefused = Extract<TraceLanding, { readonly _tag: "refused" }>

/** The arm where a seam refused before or after judgment. */
type TraceUnlanded = Extract<TraceLanding, { readonly _tag: "unlanded" }>

/** One traced run: what happened, what it says, and where it was written. */
export interface TracedRun {
  /** How the run ended, exactly as the engine answered. */
  readonly outcome: RunOutcome
  /** The run as one canonical value; its digest is the trace's identity. */
  readonly trace: RunTraceFact
  /** What became of landing that value on the lane. */
  readonly landing: TraceLanding
}

/**
 * Folds one trace landing over its three arms.
 *
 * **Bounds.** A fold over what became of a landing says nothing about the run:
 * a refused trace emit leaves the run's own outcome exactly as it was, and a
 * carried one adds nothing to it.
 *
 * @example
 * ```ts
 * import { matchTraceLanding } from "@foldlab/plait/RunTrace"
 *
 * const named = matchTraceLanding({
 *   carried: (landing) => landing.emitted.digest,
 *   refused: (landing) => landing.refusal.reason,
 *   unlanded: (landing) => landing.refusal.kind,
 * })
 * ```
 */
export const matchTraceLanding: <Out>(cases: {
  readonly carried: (carried: TraceCarried) => Out
  readonly refused: (refused: TraceRefused) => Out
  readonly unlanded: (unlanded: TraceUnlanded) => Out
}) => (landing: TraceLanding) => Out = <Out>(cases: {
  readonly carried: (carried: TraceCarried) => Out
  readonly refused: (refused: TraceRefused) => Out
  readonly unlanded: (unlanded: TraceUnlanded) => Out
}): ((landing: TraceLanding) => Out) =>
  // The same narrowing the engine's folds state: the pin's matcher answers
  // `Unify<Out>`, which reduces at every real application and cannot reduce
  // over a type parameter no call site has resolved.
  Match.type<TraceLanding>().pipe(Match.tagsExhaustive(cases)) as (
    landing: TraceLanding,
  ) => Out

/**
 * One unbounded integer as the trace writes it: minimal decimal, as text.
 *
 * Every identity label here is a content address read as a natural, and a JSON
 * number holds 2^53 exactly and no more — so a number would round an identity
 * into a different identity. The served tool face renders the same values the
 * same way for the same reason.
 */
const exact = (value: bigint): string => String(value)

/** One landing at both scales, with the model's label written exactly. */
const landingRow = (landed: EngineLanded | null): RunTraceLanding | null =>
  landed === null ? null : {
    label: exact(landed.label),
    kind: landed.kind,
    digest: landed.digest,
  }

/**
 * The walked steps, in the order the run walked them.
 *
 * A total projection of the engine's own value: every field, none dropped and
 * none added. What a step says here is what the engine said it was.
 */
const stepRows = (steps: ReadonlyArray<RunStep>): ReadonlyArray<RunTraceStep> =>
  steps.map((step) => ({
    node: exact(step.node),
    encoded: step.encoded.map(exact),
    landed: landingRow(step.landed),
  }))

/**
 * Projects one run outcome into the fact that records it.
 *
 * The fold is the engine's own, so a fourth way for a run to end would be an
 * arm the compiler demands here rather than a case this module quietly failed
 * to write. Every arm carries the writ the run acted under and the steps that
 * stood; the two stopping arms name the node they stopped at, and the refused
 * one carries the door's taught row field for field.
 *
 * **Bounds.** Nothing is judged and no verdict is constructed: the row on the
 * refused arm is the generated table's, passed through.
 *
 * @example
 * ```ts
 * import { traceOf } from "@foldlab/plait/RunTrace"
 *
 * const fact = traceOf(outcome, writ)
 * // { v: 0, kind: "engine-run-trace", writ, outcome: "landed", steps: [...] }
 * ```
 */
export const traceOf = (outcome: RunOutcome, writ: Digest): RunTraceFact =>
  matchRunOutcome<RunTraceFact>({
    landed: (run) => ({
      v: 0,
      kind: RUN_TRACE_KIND,
      writ,
      outcome: "landed",
      steps: stepRows(run.steps),
      landed: landingRow(run.landed),
    }),
    refused: (run) => ({
      v: 0,
      kind: RUN_TRACE_KIND,
      writ,
      outcome: "refused",
      node: exact(run.node),
      refusal: {
        reason: run.refusal.reason,
        law: run.refusal.law,
        repair: run.refusal.repair,
        applicability: run.refusal.applicability,
      },
      steps: stepRows(run.steps),
    }),
    unspeakable: (run) => ({
      v: 0,
      kind: RUN_TRACE_KIND,
      writ,
      outcome: "unspeakable",
      node: exact(run.node),
      slot: run.slot,
      detail: run.detail,
      steps: stepRows(run.steps),
    }),
  })(outcome)

/** What one judged emit of a trace answered, at this module's three arms. */
const landingOf = (
  emitted: Result.Result<EngineOutcome<EmittedEvent>, Refusal>,
): TraceLanding =>
  Result.isFailure(emitted)
    ? { _tag: "unlanded", refusal: emitted.failure }
    : matchOutcome(emitted.success, {
      carried: (carried): TraceLanding => ({ _tag: "carried", emitted: carried.landed }),
      refused: (refused): TraceLanding => ({
        _tag: "refused",
        refusal: {
          reason: refused.refusal.reason,
          law: refused.refusal.law,
          repair: refused.refusal.repair,
          applicability: refused.refusal.applicability,
        },
      }),
    })

/**
 * Declares the run-trace lane through the door and binds its carrier.
 *
 * The engine has no registration surface beside the language, so a lane
 * becomes usable by being declared — this is that sentence, spoken once per
 * engine, under the writ the caller acts by. The address it lands at is what
 * {@link runTraced} emits onto.
 *
 * @example
 * ```ts
 * import { declareTraceLane } from "@foldlab/plait/RunTrace"
 *
 * const declared = yield* declareTraceLane(writ)
 * ```
 */
export const declareTraceLane = Effect.fn("RunTrace.declareTraceLane")(function* (
  writ: Digest,
): Effect.fn.Return<EngineOutcome<DeclaredLanding>, Refusal, Engine> {
  const engine = yield* Engine
  const lane = yield* runTraceLane()
  return yield* engine.declareLane({ lane, writ })
})

/**
 * Runs one program and lands its trace as one fact.
 *
 * The run is the engine's own, unchanged and unwrapped: the same walk, the
 * same door, the same three ways to end. What this adds is the record — the
 * outcome projected into one canonical value and emitted onto the declared
 * run-trace lane, judged like every other sentence, attributed to the run's
 * own holder and keyed by the run's own writ.
 *
 * **Bounds.** The trace is written after the walk, so a process that dies
 * mid-run leaves no trace at all — this is a record of runs that finished
 * reaching an outcome, not a journal of a run in progress, and the live story
 * of a run in progress is the verdict stream. A trace larger than the
 * carrier's payload budget refuses at the emit, which is reported on the
 * `unlanded` arm rather than silently truncated.
 *
 * @example
 * ```ts
 * import { runTraced } from "@foldlab/plait/RunTrace"
 *
 * const traced = yield* runTraced(program, { writ, holder, lane })
 * ```
 */
export const runTraced = Effect.fn("RunTrace.runTraced")(function* (
  program: KernelProgram<never> | KernelProgramDeclaration,
  options: TraceOptions,
): Effect.fn.Return<TracedRun, Refusal, Engine> {
  const engine = yield* Engine
  const outcome = yield* engine.run(program, options)
  const trace = traceOf(outcome, options.writ)
  const emitted = yield* Effect.result(engine.emit({
    lane: options.lane,
    event: trace as unknown as WireValue,
    holder: options.holder,
  }))
  return { outcome, trace, landing: landingOf(emitted) }
})

/**
 * Reads the run-trace lane's bounded tail.
 *
 * The read is the lane read seam's — ack-none, creating nothing durable,
 * bounded per partition with a default and a ceiling — so this adds no read
 * dialect of its own and a trace reader may stand beside anything else reading
 * the same lane. Rows come back grouped by the partition that carried them,
 * each group in its own position order; two partitions' positions come from
 * two sequences and are never interleaved.
 *
 * **Bounds.** The bound is per PARTITION and a writ keys the lane, so reading
 * one partition reads one writ's traces together with those of every other
 * writ that hashes there. Selecting a writ out of that answer is the caller's,
 * and the bound stays the read's.
 *
 * @example
 * ```ts
 * import { traces } from "@foldlab/plait/RunTrace"
 *
 * const recent = yield* traces({ limit: 8 })
 * ```
 */
export const traces = Effect.fn("RunTrace.traces")(function* (
  options?: TailOptions,
): Effect.fn.Return<ReadonlyArray<LandedFact<RunTraceFact>>, Refusal, LaneReads> {
  const lane = yield* runTraceLane()
  const reads = yield* LaneReads
  return yield* reads.tail(lane, options)
})
