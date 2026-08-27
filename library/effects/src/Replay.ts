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
import {
  Clock,
  Context,
  Data,
  Effect,
  Layer,
  Random,
  Ref,
  Schema,
} from "effect"
import {
  CasNodeInput,
  StoreFailure,
  UnknownKind,
  type CasError,
  type CasReference,
  type ContentId,
} from "./CasNode.ts"
import { CasStore, type CasStoreShape } from "./CasStore.ts"
import type { Decision, DecisionTrace } from "./Decision.ts"
import type { AnyOperationDescription, OperationSchema } from "./Operation.ts"
import { liveHandler } from "./ReplayLive.ts"
import {
  decodeHistoryEntry,
  decodeStoredValue,
  encodeHistoryEntry,
  encodeStoredValue,
  encodeWitness,
  InternalStorageError,
  StoredHistoryEntry,
  StoredWitness,
} from "./ReplayStorage.ts"

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

/** An ambient service caught by the replay-mode tripwire defaults. */
export type AmbientService = "Clock" | "Random"

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
  | { readonly _tag: "Violated"; readonly service: AmbientService }

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

  /** Session-facing: install the per-session invocation handler and execute
   * one complete record or replay attempt. Replay mode replaces the default
   * Clock and Random services with ambient-use tripwires. Effect.fn spans
   * consult the default Clock, so replayed orchestration control should use
   * Effect.fnUntraced unless a clock access is intentionally a violation. */
  readonly run: <A, E, R>(
    program: Effect.Effect<A, E, R>,
    options: { readonly mode: ReplayMode; readonly history?: ContentId },
  ) => Effect.Effect<SessionOutcome<A, E>, CasError, R>
}

export class Replay extends Context.Service<Replay, ReplayShape>()(
  "foldlab/effect-replay/Replay",
) {}

const HistoryKindTag = 0x48
const WitnessKindTag = 0x57

class MismatchTransport extends Data.TaggedError("ReplayMismatchTransport")<{
  readonly category: MismatchCategory
  readonly at: number
}> {}

class AmbientTransport extends Data.TaggedError("ReplayAmbientTransport")<{
  readonly service: AmbientService
}> {}

class CasTransport extends Data.TaggedError("ReplayCasTransport")<{
  readonly error: CasError
}> {}

class RuntimeTransport extends Data.TaggedError("ReplayRuntimeTransport")<{
  readonly reason: string
}> {}

interface ActiveSession {
  readonly state: SessionState<string, string, unknown, unknown>
  readonly historyRoot: ContentId | undefined
  readonly trace: ReadonlyArray<Decision>
}

const transportCasFailure = <A, R>(
  self: Effect.Effect<A, CasError, R>,
): Effect.Effect<A, never, R> =>
  Effect.matchEffect(self, {
    onFailure: (error) => Effect.die(new CasTransport({ error })),
    onSuccess: Effect.succeed,
  })

const abortOnCasFailure = <A, R>(
  self: Effect.Effect<A, CasError, R>,
  activeRef: Ref.Ref<ActiveSession>,
  active: ActiveSession,
): Effect.Effect<A, never, R> =>
  Effect.matchEffect(self, {
    onFailure: (error) => abortForStoreFailure(activeRef, active, error),
    onSuccess: Effect.succeed,
  })

const rejectOnCasFailure = <A, R>(
  self: Effect.Effect<A, CasError, R>,
  activeRef: Ref.Ref<ActiveSession>,
  active: ActiveSession,
): Effect.Effect<A, never, R> =>
  Effect.matchEffect(self, {
    onFailure: () => rejectForMismatch(activeRef, active, "OutcomeInadmissible"),
    onSuccess: Effect.succeed,
  })

const storageEffect = <A>(
  operation: string,
  evaluate: () => A,
): Effect.Effect<A, StoreFailure> =>
  Effect.sync(evaluate).pipe(
    Effect.catchDefect((cause) => Effect.fail(new StoreFailure({
      reason: `${operation}: ${String(cause)}`,
    }))),
  )

const encodeOperationValue = <S extends OperationSchema>(
  schema: S,
  value: S["Type"],
): Effect.Effect<string, StoreFailure> =>
  storageEffect("Operation value encoding failed", () => {
    const encoded = Schema.encodeUnknownResult(schema)(value)
    if (encoded._tag === "Failure") throw new InternalStorageError(String(encoded.failure))
    return encodeStoredValue(encoded.success)
  })

const decodeOperationValue = <S extends OperationSchema>(
  schema: S,
  value: string,
): Effect.Effect<S["Type"], StoreFailure> =>
  storageEffect("Operation value decoding failed", () => {
    const decoded = Schema.decodeUnknownResult(schema)(decodeStoredValue(value))
    if (decoded._tag === "Failure") throw new InternalStorageError(String(decoded.failure))
    return decoded.success
  })

const appendDecisions = (
  active: ActiveSession,
  state: SessionState<string, string, unknown, unknown>,
  decisions: DecisionTrace,
  historyRoot: ContentId | undefined = active.historyRoot,
): ActiveSession => ({
  state,
  historyRoot,
  trace: [...active.trace, ...decisions],
})

const abortForStoreFailure = (
  activeRef: Ref.Ref<ActiveSession>,
  active: ActiveSession,
  error: CasError,
): Effect.Effect<never> => {
  const aborted = reduce(active.state, { _tag: "AppendFailed" })
  return Ref.set(
    activeRef,
    appendDecisions(active, aborted.state, aborted.decisions),
  ).pipe(Effect.andThen(Effect.die(new CasTransport({ error }))))
}

const rejectForMismatch = (
  activeRef: Ref.Ref<ActiveSession>,
  active: ActiveSession,
  category: MismatchCategory,
): Effect.Effect<never> => {
  const rejected = rejectStep(active.state, category)
  return Ref.set(
    activeRef,
    appendDecisions(active, rejected.state, rejected.decisions),
  ).pipe(Effect.andThen(Effect.die(new MismatchTransport({
    category,
    at: active.state.cursor,
  }))))
}

const loadHistory = (
  store: CasStoreShape,
  root: ContentId,
): Effect.Effect<ReadonlyArray<StoredHistoryEntry>, CasError> =>
  Effect.gen(function* () {
    const entries: Array<StoredHistoryEntry> = []
    const visited = new Set<ContentId>()
    let current: ContentId | undefined = root

    while (current !== undefined) {
      if (visited.has(current)) {
        return yield* new StoreFailure({ reason: `Cyclic history root: ${current}` })
      }
      visited.add(current)

      const node: CasNodeInput = yield* store.load(current)
      if (node.kind.tag !== HistoryKindTag) return yield* new UnknownKind(node.kind)
      if (node.refs.length > 1) {
        return yield* new StoreFailure({ reason: `History node has multiple predecessors: ${current}` })
      }

      const raw = yield* storageEffect(
        `History payload decoding failed at ${current}`,
        () => decodeHistoryEntry(node.payload),
      )
      const entry = yield* Schema.decodeUnknownEffect(StoredHistoryEntry)(raw).pipe(
        Effect.mapError((issue) => new StoreFailure({
          reason: `History payload validation failed at ${current}: ${String(issue)}`,
        })),
      )
      entries.push(entry)

      const predecessor: CasReference | undefined = node.refs[0]
      if (predecessor !== undefined && predecessor.expectedTag !== HistoryKindTag) {
        return yield* new StoreFailure({
          reason: `History predecessor has wrong declared tag at ${current}`,
        })
      }
      current = predecessor?.id
    }

    entries.reverse()
    return entries
  })

const tripwireClock: Clock.Clock = {
  currentTimeMillisUnsafe: () => {
    throw new AmbientTransport({ service: "Clock" })
  },
  currentTimeMillis: Effect.die(new AmbientTransport({ service: "Clock" })),
  currentTimeNanosUnsafe: () => {
    throw new AmbientTransport({ service: "Clock" })
  },
  currentTimeNanos: Effect.die(new AmbientTransport({ service: "Clock" })),
  monotonicTimeNanosUnsafe: () => {
    throw new AmbientTransport({ service: "Clock" })
  },
  monotonicTimeNanos: Effect.die(new AmbientTransport({ service: "Clock" })),
  sleep: () => Effect.die(new AmbientTransport({ service: "Clock" })),
}

const tripwireRandom: Context.Service.Shape<typeof Random.Random> = {
  nextIntUnsafe: () => {
    throw new AmbientTransport({ service: "Random" })
  },
  nextDoubleUnsafe: () => {
    throw new AmbientTransport({ service: "Random" })
  },
}

const makeStoredTerminal = <A, E>(
  terminal: Terminal<A, E>,
): Effect.Effect<
  | { readonly _tag: "Succeeded"; readonly value: string }
  | { readonly _tag: "Failed"; readonly error: string },
  StoreFailure
> =>
  terminal._tag === "Succeeded"
    ? storageEffect("Witness terminal encoding failed", () => ({
        _tag: "Succeeded" as const,
        value: encodeStoredValue(terminal.value),
      }))
    : storageEffect("Witness terminal encoding failed", () => ({
        _tag: "Failed" as const,
        error: encodeStoredValue(terminal.error),
      }))

const makeStoredOutcome = <A, E>(
  outcome: SessionOutcome<A, E>,
): Effect.Effect<StoredWitness["outcome"], StoreFailure> =>
  Effect.gen(function* () {
    switch (outcome._tag) {
      case "Completed":
        return { _tag: "Completed", terminal: yield* makeStoredTerminal(outcome.terminal) }
      case "Violated":
        return { _tag: "Violated", service: outcome.service }
      case "Rejected": {
        if (outcome.terminalSoFar === undefined) {
          return { _tag: "Rejected", category: outcome.category, at: outcome.at }
        }
        return {
          _tag: "Rejected",
          category: outcome.category,
          at: outcome.at,
          terminalSoFar: yield* makeStoredTerminal(outcome.terminalSoFar),
        }
      }
    }
  })

const persistWitness = <A, E>(
  store: CasStoreShape,
  executionId: string,
  active: ActiveSession,
  outcome: SessionOutcome<A, E>,
): Effect.Effect<void, CasError> =>
  Effect.gen(function* () {
    const raw = {
      mode: active.state.mode,
      executionId,
      consumed: active.state.cursor,
      trace: active.trace,
      outcome: yield* makeStoredOutcome(outcome),
      ...(active.historyRoot === undefined ? {} : { historyRoot: active.historyRoot }),
    }
    const witness = yield* StoredWitness.makeEffect(raw).pipe(
      Effect.mapError((issue) => new StoreFailure({
        reason: `Witness validation failed: ${String(issue)}`,
      })),
    )
    const payload = yield* storageEffect("Witness encoding failed", () =>
      encodeWitness(witness))
    const node = CasNodeInput.make({
      kind: { version: 0, tag: WitnessKindTag },
      payload,
      refs: active.historyRoot === undefined
        ? []
        : [{ id: active.historyRoot, expectedTag: HistoryKindTag }],
    })
    yield* store.put(node)
  })

const appendRecordedOutcome = <D extends AnyOperationDescription>(
  store: CasStoreShape,
  activeRef: Ref.Ref<ActiveSession>,
  operation: D,
  invocation: Invocation<string, string>,
  outcome:
    | { readonly _tag: "Success"; readonly value: D["success"]["Type"] }
    | { readonly _tag: "Failure"; readonly error: D["failure"]["Type"] },
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const active = yield* Ref.get(activeRef)
    let stored: Outcome<string, string>
    if (outcome._tag === "Success") {
      const value = yield* abortOnCasFailure(
        encodeOperationValue(operation.success, outcome.value),
        activeRef,
        active,
      )
      stored = { _tag: "Success", value }
    } else {
      const error = yield* abortOnCasFailure(
        encodeOperationValue(operation.failure, outcome.error),
        activeRef,
        active,
      )
      stored = { _tag: "Failure", error }
    }

    const appended = reduce(active.state, {
      _tag: "Recorded",
      invocation,
      outcome: stored,
    })
    if (appended.result._tag !== "Appended") {
      return yield* Effect.die(new RuntimeTransport({
        reason: `Record append produced ${appended.result._tag}`,
      }))
    }

    const entry = yield* abortOnCasFailure(
      StoredHistoryEntry.makeEffect({
        ...invocation,
        outcome: stored,
      }).pipe(
        Effect.mapError((issue) => new StoreFailure({
          reason: `History entry validation failed: ${String(issue)}`,
        })),
      ),
      activeRef,
      active,
    )
    const payload = yield* abortOnCasFailure(
      storageEffect("History entry encoding failed", () => encodeHistoryEntry(entry)),
      activeRef,
      active,
    )
    const node = CasNodeInput.make({
      kind: { version: 0, tag: HistoryKindTag },
      payload,
      refs: active.historyRoot === undefined
        ? []
        : [{ id: active.historyRoot, expectedTag: HistoryKindTag }],
    })
    const root = yield* abortOnCasFailure(
      store.put(node),
      activeRef,
      active,
    )
    yield* Ref.set(
      activeRef,
      appendDecisions(active, appended.state, appended.decisions, root),
    )
  })

const invokeInSession = <D extends AnyOperationDescription>(
  store: CasStoreShape,
  activeRef: Ref.Ref<ActiveSession>,
  operation: D,
  request: D["request"]["Type"],
): Effect.Effect<D["success"]["Type"], D["failure"]["Type"]> =>
  Effect.gen(function* () {
    const active = yield* Ref.get(activeRef)
    const storedRequest = yield* transportCasFailure(
      encodeOperationValue(operation.request, request),
    )
    const invocation = {
      op: operation.id,
      revision: operation.revision,
      request: storedRequest,
    }

    if (active.state.mode === "record") {
      const invoked = reduce(active.state, { _tag: "Invoke", invocation })
      if (invoked.result._tag !== "Delegated") {
        return yield* Effect.die(new RuntimeTransport({
          reason: `Record invocation produced ${invoked.result._tag}`,
        }))
      }
      yield* Ref.set(
        activeRef,
        appendDecisions(active, invoked.state, invoked.decisions),
      )

      const handler = liveHandler(operation)
      if (handler === undefined) {
        return yield* Effect.die(new RuntimeTransport({
          reason: `No live role supplied for ${operation.id}`,
        }))
      }

      return yield* handler(request).pipe(
        Effect.matchEffect({
          onFailure: (error) =>
            appendRecordedOutcome(store, activeRef, operation, invocation, {
              _tag: "Failure",
              error,
            }).pipe(Effect.andThen(Effect.fail(error))),
          onSuccess: (value) =>
            appendRecordedOutcome(store, activeRef, operation, invocation, {
              _tag: "Success",
              value,
            }).pipe(Effect.as(value)),
        }),
      )
    }

    const replayed = reduce(active.state, { _tag: "Invoke", invocation })
    if (replayed.result._tag === "Rejected") {
      yield* Ref.set(
        activeRef,
        appendDecisions(active, replayed.state, replayed.decisions),
      )
      return yield* Effect.die(new MismatchTransport({
        category: replayed.result.category,
        at: replayed.result.at,
      }))
    }
    if (replayed.result._tag !== "Substituted") {
      return yield* Effect.die(new RuntimeTransport({
        reason: `Replay invocation produced ${replayed.result._tag}`,
      }))
    }

    const recorded = replayed.result.outcome
    const encoded = recorded._tag === "Success" ? recorded.value : recorded.error
    if (typeof encoded !== "string") {
      return yield* rejectForMismatch(activeRef, active, "OutcomeInadmissible")
    }

    if (recorded._tag === "Success") {
      const value = yield* rejectOnCasFailure(
        decodeOperationValue(operation.success, encoded),
        activeRef,
        active,
      )
      yield* Ref.set(
        activeRef,
        appendDecisions(active, replayed.state, replayed.decisions),
      )
      return value
    }

    const error = yield* rejectOnCasFailure(
      decodeOperationValue(operation.failure, encoded),
      activeRef,
      active,
    )
    yield* Ref.set(
      activeRef,
      appendDecisions(active, replayed.state, replayed.decisions),
    )
    return yield* Effect.fail(error)
  })

const finishSession = <A, E>(
  store: CasStoreShape,
  executionId: string,
  activeRef: Ref.Ref<ActiveSession>,
  terminal: Terminal<A, E>,
): Effect.Effect<SessionOutcome<A, E>, CasError> =>
  Effect.gen(function* () {
    const active = yield* Ref.get(activeRef)
    const completed = reduce(active.state, { _tag: "Complete", terminal })
    if (completed.result._tag !== "SessionOutcome") {
      return yield* Effect.die(new RuntimeTransport({
        reason: `Session completion produced ${completed.result._tag}`,
      }))
    }

    const next = appendDecisions(active, completed.state, completed.decisions)
    yield* Ref.set(activeRef, next)

    const reducedOutcome = completed.result.outcome
    let outcome: SessionOutcome<A, E>
    if (reducedOutcome._tag === "Completed") {
      outcome = { _tag: "Completed", terminal }
    } else if (reducedOutcome._tag === "Rejected") {
      outcome = {
        _tag: "Rejected",
        category: reducedOutcome.category,
        at: reducedOutcome.at,
        terminalSoFar: terminal,
      }
    } else {
      return yield* Effect.die(new RuntimeTransport({
        reason: "Completion reducer returned an ambient violation",
      }))
    }
    yield* persistWitness(store, executionId, next, outcome)
    return outcome
  })

const makeReplayRun = (
  store: CasStoreShape,
  executionCounter: Ref.Ref<number>,
): ReplayShape["run"] => {
  const run: ReplayShape["run"] = <A, E, R>(
    program: Effect.Effect<A, E, R>,
    options: { readonly mode: ReplayMode; readonly history?: ContentId },
  ): Effect.Effect<SessionOutcome<A, E>, CasError, R> =>
    Effect.gen(function* () {
      const executionNumber = yield* Ref.updateAndGet(executionCounter, (value) => value + 1)
      const executionId = `execution-${executionNumber}`
      const history = options.history === undefined
        ? []
        : yield* loadHistory(store, options.history)
      const activeRef = yield* Ref.make<ActiveSession>({
        state: {
          mode: options.mode,
          status: "active",
          history,
          cursor: options.mode === "record" ? history.length : 0,
        },
        historyRoot: options.history,
        trace: [],
      })

      const scopedReplay = Replay.of({
        invoke: (operation, request) =>
          invokeInSession(store, activeRef, operation, request),
        run,
      })
      const scopedProgram = options.mode === "replay"
        ? program.pipe(
            Effect.provideService(Replay, scopedReplay),
            Effect.provideService(Clock.Clock, tripwireClock),
            Effect.provideService(Random.Random, tripwireRandom),
          )
        : program.pipe(Effect.provideService(Replay, scopedReplay))
      const attempted = scopedProgram.pipe(
        Effect.match({
          onFailure: (error): Terminal<A, E> => ({ _tag: "Failed", error }),
          onSuccess: (value): Terminal<A, E> => ({ _tag: "Succeeded", value }),
        }),
        Effect.flatMap((terminal) =>
          finishSession(store, executionId, activeRef, terminal)),
      )

      return yield* attempted.pipe(
        Effect.catchDefect((defect): Effect.Effect<SessionOutcome<A, E>, CasError> => {
          if (defect instanceof CasTransport) return Effect.fail(defect.error)
          if (defect instanceof MismatchTransport) {
            const outcome: SessionOutcome<A, E> = {
              _tag: "Rejected",
              category: defect.category,
              at: defect.at,
            }
            return Ref.get(activeRef).pipe(
              Effect.flatMap((active) =>
                persistWitness(store, executionId, active, outcome)),
              Effect.as(outcome),
            )
          }
          if (defect instanceof AmbientTransport) {
            const outcome: SessionOutcome<A, E> = {
              _tag: "Violated",
              service: defect.service,
            }
            return Ref.get(activeRef).pipe(
              Effect.flatMap((active) =>
                persistWitness(store, executionId, active, outcome)),
              Effect.as(outcome),
            )
          }
          return Effect.die(defect)
        }),
      )
    })
  return run
}

/** Construct the replay runtime over the supplied CAS store. */
export const layerReplay: Layer.Layer<Replay, never, CasStore> = Layer.effect(
  Replay,
  Effect.gen(function* () {
    const store = yield* CasStore
    const executionCounter = yield* Ref.make(0)
    const run = makeReplayRun(store, executionCounter)
    const service = Replay.of({
      invoke: () => Effect.die(new RuntimeTransport({
        reason: "Replay.invoke used outside session",
      })),
      run,
    })
    return service
  }),
)

/** Run a program under a session. The history root resolves through the
 * Replay runtime's CasStore; record mode creates a fresh immutable suffix. */
export const session = <A, E, R>(
  program: Effect.Effect<A, E, R>,
  options: { readonly mode: ReplayMode; readonly history?: ContentId },
): Effect.Effect<SessionOutcome<A, E>, CasError, R | Replay> =>
  Replay.use((replay) => replay.run(program, options))
