/**
 * Replay data and behavior: the pure reducer, modes, the ratified mismatch
 * taxonomy, the recorded outcome envelope, the tagged session outcome, and
 * the session-owning service interface.
 *
 * Transport ruling (GR-1b): caller-facing method types are byte-identical
 * across live, record, and replay modes. Replay rejections and violations
 * travel from wrapped methods to the session boundary through a named
 * defect-class seam — they never widen a method's error union — and land in
 * the tagged session outcome. The internal defect is plumbing, never
 * modeled defect semantics.
 */
import { Context, type Effect, Schema } from "effect"
import type { CasError, ContentId } from "./CasNode.ts"
import type { DecisionTrace } from "./Decision.ts"
import type { AnyOperationDescription } from "./Operation.ts"

/** Record invokes live adapters and appends history; replay is hermetic. */
export const ReplayMode = Schema.Literals(["record", "replay"])
export type ReplayMode = typeof ReplayMode.Type

/** The six ratified mismatch categories (GR-2). Request-side, checked at
 * the cursor: operation, revision, request, history exhausted.
 * Completion-side: unconsumed suffix. Outcome-side, checked at consumption:
 * outcome inadmissible. "Order mismatch" is deliberately not a category;
 * CAS storage failures are a distinct typed family. */
export const MismatchCategory = Schema.Literals([
  "OperationMismatch",
  "RevisionMismatch",
  "RequestMismatch",
  "HistoryExhausted",
  "UnconsumedSuffix",
  "OutcomeInadmissible",
])
export type MismatchCategory = typeof MismatchCategory.Type

/** Channel-preserving recorded outcome envelope (GR-9): success of the
 * declared success Schema or failure of the declared typed-failure Schema.
 * Substitution re-injects through the native Effect channels so recovery
 * combinators fire exactly as they did live. */
export const RecordedOutcome = <S extends Schema.Top, F extends Schema.Top>(
  success: S,
  failure: F,
) =>
  Schema.Union([
    Schema.TaggedStruct("Success", { value: success }),
    Schema.TaggedStruct("Failure", { error: failure }),
  ])

/** A program terminal: success or declared typed failure. */
export type Terminal<A, E> =
  | { readonly _tag: "Succeeded"; readonly value: A }
  | { readonly _tag: "Failed"; readonly error: E }

/** An ambient-service violation caught by the replay-mode tripwire
 * Clock/Random defaults (ruling D7). */
export interface AmbientServiceViolation {
  readonly service: "Clock" | "Random"
}

/** The tagged session outcome (GR-5, GR-8). UnconsumedSuffix is the
 * Rejected case that populates terminalSoFar — the program terminated, but
 * a recorded action was never re-emitted; request-side mismatches leave it
 * empty. The durable witness Schema is internal until the M3 re-freeze. */
export type SessionOutcome<A, E> =
  | { readonly _tag: "Completed"; readonly terminal: Terminal<A, E> }
  | {
      readonly _tag: "Rejected"
      readonly category: MismatchCategory
      readonly at: number
      readonly terminalSoFar?: Terminal<A, E>
    }
  | { readonly _tag: "Violated"; readonly violation: AmbientServiceViolation }

/** A channel-preserving outcome stored in one history occurrence. */
export type Outcome<A, E> =
  | { readonly _tag: "Success"; readonly value: A }
  | { readonly _tag: "Failure"; readonly error: E }

/** One canonical invocation. Operation and request are string identities at
 * this boundary; branded string identities remain assignable without losing
 * their stronger application-level types. */
export interface Invocation<Op extends string = string, Req extends string = string> {
  readonly op: Op
  readonly revision: number
  readonly request: Req
}

/** One logical occurrence in the flat replay history. */
export interface HistoryEntry<
  Op extends string = string,
  Req extends string = string,
  Val = string,
  Err = string,
> extends Invocation<Op, Req> {
  readonly outcome: Outcome<Val, Err>
}

/** Structural session status. Aborted sessions absorb every later input. */
export type SessionStatus = "active" | "aborted"

/** State threaded through the pure reducer. */
export interface SessionState<
  Op extends string = string,
  Req extends string = string,
  Val = string,
  Err = string,
> {
  readonly mode: ReplayMode
  readonly status: SessionStatus
  readonly history: ReadonlyArray<HistoryEntry<Op, Req, Val, Err>>
  readonly cursor: number
}

/** Reducer input. The interpreter emits Recorded only after live delegation
 * returns and AppendFailed only when the record store refuses that outcome. */
export type Input<
  Op extends string = string,
  Req extends string = string,
  Val = string,
  Err = string,
> =
  | { readonly _tag: "Invoke"; readonly invocation: Invocation<Op, Req> }
  | {
      readonly _tag: "Recorded"
      readonly invocation: Invocation<Op, Req>
      readonly outcome: Outcome<Val, Err>
    }
  | { readonly _tag: "AppendFailed" }
  | { readonly _tag: "Complete"; readonly terminal: Terminal<Val, Err> }

/** What the caller of one reducer step observes. */
export type StepResult<Val = string, Err = string> =
  | { readonly _tag: "Substituted"; readonly outcome: Outcome<Val, Err> }
  | { readonly _tag: "Delegated" }
  | { readonly _tag: "Appended" }
  | { readonly _tag: "Rejected"; readonly category: MismatchCategory; readonly at: number }
  | { readonly _tag: "SessionOutcome"; readonly outcome: SessionOutcome<Val, Err> }
  | { readonly _tag: "Aborted" }
  | { readonly _tag: "Absorbed" }

/** One step's result, successor state, and emitted decisions. */
export interface StepOut<
  Op extends string = string,
  Req extends string = string,
  Val = string,
  Err = string,
> {
  readonly result: StepResult<Val, Err>
  readonly state: SessionState<Op, Req, Val, Err>
  readonly decisions: DecisionTrace
}

/** The state invariant mirrored by SessionState.WF. */
export const isWellFormed = <
  Op extends string,
  Req extends string,
  Val,
  Err,
>(state: SessionState<Op, Req, Val, Err>): boolean =>
  Number.isInteger(state.cursor) &&
  state.cursor >= 0 &&
  state.cursor <= state.history.length &&
  (state.mode === "replay" || state.cursor === state.history.length)

/** Absorb an input: no state change and no emitted decisions. */
export const absorb = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
): StepOut<Op, Req, Val, Err> => ({
  result: { _tag: "Absorbed" },
  state,
  decisions: [],
})

/** Reject at the current cursor, freezing history and aborting the session. */
export const rejectStep = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
  category: MismatchCategory,
): StepOut<Op, Req, Val, Err> => ({
  result: { _tag: "Rejected", category, at: state.cursor },
  state: { ...state, status: "aborted" },
  decisions: [{ _tag: "TypedRejection", category, at: state.cursor }],
})

/** Record mode, invocation: request live delegation without claiming an
 * occurrence. */
export const invokeRecord = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
  invocation: Invocation<Op, Req>,
): StepOut<Op, Req, Val, Err> => ({
  result: { _tag: "Delegated" },
  state,
  decisions: [{
    _tag: "LiveDelegation",
    operation: invocation.op,
    at: state.cursor,
  }],
})

/** Record mode, outcome arrived: append exactly one occurrence. */
export const appendRecord = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
  invocation: Invocation<Op, Req>,
  outcome: Outcome<Val, Err>,
): StepOut<Op, Req, Val, Err> => ({
  result: { _tag: "Appended" },
  state: {
    ...state,
    history: [...state.history, { ...invocation, outcome }],
    cursor: state.cursor + 1,
  },
  decisions: [{
    _tag: "OccurrenceAppended",
    operation: invocation.op,
    at: state.cursor,
  }],
})

/** Record mode, append refused: abort without recording the occurrence. */
export const abortRecord = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
): StepOut<Op, Req, Val, Err> => ({
  result: { _tag: "Aborted" },
  state: { ...state, status: "aborted" },
  decisions: [],
})

/** Complete exactly at the end of history; otherwise reject the unconsumed
 * suffix and retain the program terminal in the session outcome. */
export const completeStep = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
  terminal: Terminal<Val, Err>,
): StepOut<Op, Req, Val, Err> => {
  if (state.cursor === state.history.length) {
    return {
      result: {
        _tag: "SessionOutcome",
        outcome: { _tag: "Completed", terminal },
      },
      state,
      decisions: [{ _tag: "Completed", consumed: state.cursor }],
    }
  }

  return {
    result: {
      _tag: "SessionOutcome",
      outcome: {
        _tag: "Rejected",
        category: "UnconsumedSuffix",
        at: state.cursor,
        terminalSoFar: terminal,
      },
    },
    state: { ...state, status: "aborted" },
    decisions: [{
      _tag: "TypedRejection",
      category: "UnconsumedSuffix",
      at: state.cursor,
    }],
  }
}

/** Replay mode, invocation: match operation, revision, then request at the
 * cursor. A mismatch consumes nothing and aborts; an exact match substitutes
 * the recorded outcome and consumes exactly one occurrence. */
export const invokeReplay = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
  invocation: Invocation<Op, Req>,
): StepOut<Op, Req, Val, Err> => {
  const entry = state.history[state.cursor]
  if (entry === undefined) return rejectStep(state, "HistoryExhausted")
  if (entry.op !== invocation.op) return rejectStep(state, "OperationMismatch")
  if (entry.revision !== invocation.revision) return rejectStep(state, "RevisionMismatch")
  if (entry.request !== invocation.request) return rejectStep(state, "RequestMismatch")

  return {
    result: { _tag: "Substituted", outcome: entry.outcome },
    state: { ...state, cursor: state.cursor + 1 },
    decisions: [
      {
        _tag: "RecordedSubstitution",
        operation: invocation.op,
        at: state.cursor,
      },
      { _tag: "HistoryConsumed", at: state.cursor },
    ],
  }
}

/** The total, synchronous, pure replay reducer. The branch order mirrors
 * Effects.Replay.reduce so the implementation can be reviewed rule by rule. */
export const reduce = <Op extends string, Req extends string, Val, Err>(
  state: SessionState<Op, Req, Val, Err>,
  input: Input<Op, Req, Val, Err>,
): StepOut<Op, Req, Val, Err> => {
  if (state.status === "aborted") return absorb(state)

  if (state.mode === "record") {
    switch (input._tag) {
      case "Invoke":
        return invokeRecord(state, input.invocation)
      case "Recorded":
        return appendRecord(state, input.invocation, input.outcome)
      case "AppendFailed":
        return abortRecord(state)
      case "Complete":
        return completeStep(state, input.terminal)
    }
  }

  switch (input._tag) {
    case "Invoke":
      return invokeReplay(state, input.invocation)
    case "Recorded":
    case "AppendFailed":
      return absorb(state)
    case "Complete":
      return completeStep(state, input.terminal)
  }
}

export interface ReplayShape {
  /** Adapter-facing: route one described invocation through the session.
   * The error channel is exactly the operation's declared failure type.
   * Mismatch, inadmissibility, AND record-mode append failure all travel
   * the defect-class transport seam (GR-1b) — orchestration cannot catch
   * what is not in the channel, so a store failure aborts the session and
   * history stays a truthful prefix structurally (GR-7's poisoning intent,
   * realized without a mutable poisoned flag; the failure surfaces as the
   * session's typed CasError). */
  readonly invoke: <D extends AnyOperationDescription>(
    operation: D,
    request: D["request"]["Type"],
  ) => Effect.Effect<D["success"]["Type"], D["failure"]["Type"]>
}

export class Replay extends Context.Service<Replay, ReplayShape>()(
  "foldlab/effect-replay/Replay",
) {}

/** Run a program under a session. Signature frozen at M1; implementation
 * arrives at M4. The history root names a ratified recorded history for
 * replay mode; record mode produces one. */
export declare const session: <A, E, R>(
  program: Effect.Effect<A, E, R>,
  options: { readonly mode: ReplayMode; readonly history?: ContentId },
) => Effect.Effect<SessionOutcome<A, E>, CasError, R | Replay>
