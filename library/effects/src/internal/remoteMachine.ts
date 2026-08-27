/**
 * Total sans-io remote client machine mirrored from
 * Effects/Remote/Machine.lean.
 *
 * Helper names and branch order intentionally follow the Lean source so the
 * correspondence review can align both files rule by rule. This module owns
 * no Effect service and performs no I/O.
 */
import { HashMap, HashSet, Option } from "effect"

export interface Budgets {
  readonly maxBytes: number
  readonly maxKeys: number
}

export interface Params<K, B> {
  readonly budgets: Budgets
  readonly size: (bytes: B) => number
  readonly verify: (key: K, bytes: B) => boolean
}

export type OpId = number

export type OpState<K, B> =
  | { readonly _tag: "Loading"; readonly key: K }
  | { readonly _tag: "Uploading"; readonly key: K; readonly bytes: B }

export type Op<K, B> =
  | { readonly _tag: "Load"; readonly key: K }
  | { readonly _tag: "Upload"; readonly key: K; readonly bytes: B }

export type KeyStatus<K, B> =
  | { readonly _tag: "Found"; readonly key: K; readonly bytes: B }
  | { readonly _tag: "Missing"; readonly key: K }
  | { readonly _tag: "Failed"; readonly key: K }

export type Event<K, B> =
  | { readonly _tag: "Ok"; readonly declared: number; readonly bytes: B }
  | { readonly _tag: "Absent" }
  | { readonly _tag: "Truncated" }
  | { readonly _tag: "Reset" }
  | { readonly _tag: "Silence" }
  | { readonly _tag: "Unauthenticated" }
  | { readonly _tag: "Denied" }
  | { readonly _tag: "RateLimited"; readonly retryAfter: number }
  | { readonly _tag: "Capacity" }
  | { readonly _tag: "Redirected" }
  | { readonly _tag: "IntegrityMismatch" }
  | { readonly _tag: "BatchResult"; readonly results: ReadonlyArray<KeyStatus<K, B>> }
  | {
    readonly _tag: "Capabilities"
    readonly limits: { readonly maxBatchKeys: number; readonly maxBlobBytes: number }
  }
  | { readonly _tag: "Interrupted" }

export type MInput<K, B> =
  | { readonly _tag: "Request"; readonly id: OpId; readonly op: Op<K, B> }
  | { readonly _tag: "FromWire"; readonly id: OpId; readonly event: Event<K, B> }

export type Command<K, B> =
  | { readonly _tag: "ProbeCapabilities" }
  | { readonly _tag: "Load"; readonly key: K }
  | { readonly _tag: "FindMissing"; readonly keys: ReadonlyArray<K> }
  | { readonly _tag: "Upload"; readonly key: K; readonly bytes: B }
  | { readonly _tag: "QueryCommitted"; readonly key: K }
  | { readonly _tag: "PublishRoot"; readonly key: K }

export type MResult<K, B> =
  | { readonly _tag: "Commanded" }
  | { readonly _tag: "Delivered"; readonly key: K; readonly bytes: B }
  | { readonly _tag: "Uploaded"; readonly key: K }
  | { readonly _tag: "NotFound"; readonly key: K }
  | { readonly _tag: "BudgetRejected"; readonly key: K }
  | { readonly _tag: "IntegrityRejected"; readonly key: K }
  | { readonly _tag: "RepeatRefused"; readonly key: K }
  | { readonly _tag: "TransportFailed"; readonly key: K }
  | { readonly _tag: "AuthFailed"; readonly key: K }
  | { readonly _tag: "DuplicateId" }
  | { readonly _tag: "Absorbed" }

export type RDecision<K, B> =
  | { readonly _tag: "Issued"; readonly command: Command<K, B> }
  | { readonly _tag: "Verified"; readonly key: K }
  | { readonly _tag: "Cached"; readonly key: K }
  | { readonly _tag: "Returned"; readonly key: K }
  | { readonly _tag: "BudgetRejected"; readonly key: K }
  | { readonly _tag: "IntegrityRejected"; readonly key: K }
  | { readonly _tag: "RepeatRefused"; readonly key: K }
  | { readonly _tag: "GaveUp"; readonly key: K }

export interface TaggedCommand<K, B> {
  readonly op: OpId
  readonly command: Command<K, B>
}

export interface TaggedDecision<K, B> {
  readonly op: OpId
  readonly decision: RDecision<K, B>
}

export interface MachineState<K, B> {
  readonly inFlight: HashMap.HashMap<OpId, OpState<K, B>>
  readonly cache: HashSet.HashSet<K>
  readonly rejected: HashSet.HashSet<readonly [K, B]>
}

export interface StepOut<K, B> {
  readonly result: MResult<K, B>
  readonly state: MachineState<K, B>
  readonly commands: ReadonlyArray<TaggedCommand<K, B>>
  readonly decisions: ReadonlyArray<TaggedDecision<K, B>>
}

export interface RunOut<K, B> {
  readonly state: MachineState<K, B>
  readonly results: ReadonlyArray<MResult<K, B>>
  readonly decisions: ReadonlyArray<TaggedDecision<K, B>>
  readonly commands: ReadonlyArray<TaggedCommand<K, B>>
}

export const initialMachineState = <K, B>(): MachineState<K, B> => ({
  inFlight: HashMap.empty(),
  cache: HashSet.empty(),
  rejected: HashSet.empty(),
})

/** Absorb an uncorrelated or unexpected input. */
export const absorbOut = <K, B>(state: MachineState<K, B>): StepOut<K, B> => ({
  result: { _tag: "Absorbed" },
  state,
  commands: [],
  decisions: [],
})

/** Handle a load's correlated wire event. */
export const loadEvent = <K, B>(
  params: Params<K, B>,
  state: MachineState<K, B>,
  id: OpId,
  key: K,
  event: Event<K, B>,
): StepOut<K, B> => {
  if (event._tag === "Ok") {
    if (event.declared > params.budgets.maxBytes) {
      return {
        result: { _tag: "BudgetRejected", key },
        state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
        commands: [],
        decisions: [
          { op: id, decision: { _tag: "BudgetRejected", key } },
          { op: id, decision: { _tag: "GaveUp", key } },
        ],
      }
    }
    if (params.verify(key, event.bytes)) {
      return {
        result: { _tag: "Delivered", key, bytes: event.bytes },
        state: {
          ...state,
          inFlight: HashMap.remove(state.inFlight, id),
          cache: HashSet.add(state.cache, key),
        },
        commands: [],
        decisions: [
          { op: id, decision: { _tag: "Verified", key } },
          { op: id, decision: { _tag: "Cached", key } },
          { op: id, decision: { _tag: "Returned", key } },
        ],
      }
    }
    return {
      result: { _tag: "IntegrityRejected", key },
      state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
      commands: [],
      decisions: [
        { op: id, decision: { _tag: "IntegrityRejected", key } },
        { op: id, decision: { _tag: "GaveUp", key } },
      ],
    }
  }

  if (event._tag === "Absent") {
    return {
      result: { _tag: "NotFound", key },
      state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
      commands: [],
      decisions: [{ op: id, decision: { _tag: "GaveUp", key } }],
    }
  }

  if (event._tag === "Unauthenticated") {
    return {
      result: { _tag: "AuthFailed", key },
      state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
      commands: [],
      decisions: [{ op: id, decision: { _tag: "GaveUp", key } }],
    }
  }

  if (event._tag === "Denied") {
    return {
      result: { _tag: "AuthFailed", key },
      state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
      commands: [],
      decisions: [{ op: id, decision: { _tag: "GaveUp", key } }],
    }
  }

  return {
    result: { _tag: "TransportFailed", key },
    state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
    commands: [],
    decisions: [{ op: id, decision: { _tag: "GaveUp", key } }],
  }
}

/** Handle an upload's correlated wire event. */
export const uploadEvent = <K, B>(
  params: Params<K, B>,
  state: MachineState<K, B>,
  id: OpId,
  key: K,
  bytes: B,
  event: Event<K, B>,
): StepOut<K, B> => {
  if (event._tag === "Ok") {
    if (params.verify(key, bytes)) {
      return {
        result: { _tag: "Uploaded", key },
        state: {
          ...state,
          inFlight: HashMap.remove(state.inFlight, id),
          cache: HashSet.add(state.cache, key),
        },
        commands: [],
        decisions: [{ op: id, decision: { _tag: "Cached", key } }],
      }
    }
    return {
      result: { _tag: "IntegrityRejected", key },
      state: {
        ...state,
        inFlight: HashMap.remove(state.inFlight, id),
        rejected: HashSet.add(state.rejected, [key, bytes] as const),
      },
      commands: [],
      decisions: [
        { op: id, decision: { _tag: "IntegrityRejected", key } },
        { op: id, decision: { _tag: "GaveUp", key } },
      ],
    }
  }

  if (event._tag === "IntegrityMismatch") {
    return {
      result: { _tag: "IntegrityRejected", key },
      state: {
        ...state,
        inFlight: HashMap.remove(state.inFlight, id),
        rejected: HashSet.add(state.rejected, [key, bytes] as const),
      },
      commands: [],
      decisions: [
        { op: id, decision: { _tag: "IntegrityRejected", key } },
        { op: id, decision: { _tag: "GaveUp", key } },
      ],
    }
  }

  if (event._tag === "Unauthenticated") {
    return {
      result: { _tag: "AuthFailed", key },
      state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
      commands: [],
      decisions: [{ op: id, decision: { _tag: "GaveUp", key } }],
    }
  }

  if (event._tag === "Denied") {
    return {
      result: { _tag: "AuthFailed", key },
      state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
      commands: [],
      decisions: [{ op: id, decision: { _tag: "GaveUp", key } }],
    }
  }

  return {
    result: { _tag: "TransportFailed", key },
    state: { ...state, inFlight: HashMap.remove(state.inFlight, id) },
    commands: [],
    decisions: [{ op: id, decision: { _tag: "GaveUp", key } }],
  }
}

/** The total remote client step. */
export const step = <K, B>(
  params: Params<K, B>,
  state: MachineState<K, B>,
  input: MInput<K, B>,
): StepOut<K, B> => {
  if (input._tag === "Request") {
    if (Option.isSome(HashMap.get(state.inFlight, input.id))) {
      return { result: { _tag: "DuplicateId" }, state, commands: [], decisions: [] }
    }

    if (input.op._tag === "Load") {
      const command: Command<K, B> = { _tag: "Load", key: input.op.key }
      return {
        result: { _tag: "Commanded" },
        state: {
          ...state,
          inFlight: HashMap.set(state.inFlight, input.id, {
            _tag: "Loading",
            key: input.op.key,
          }),
        },
        commands: [{ op: input.id, command }],
        decisions: [{ op: input.id, decision: { _tag: "Issued", command } }],
      }
    }

    const { bytes, key } = input.op
    if (params.size(bytes) > params.budgets.maxBytes) {
      return {
        result: { _tag: "BudgetRejected", key },
        state,
        commands: [],
        decisions: [{ op: input.id, decision: { _tag: "BudgetRejected", key } }],
      }
    }
    if (HashSet.has(state.rejected, [key, bytes] as const)) {
      return {
        result: { _tag: "RepeatRefused", key },
        state,
        commands: [],
        decisions: [{ op: input.id, decision: { _tag: "RepeatRefused", key } }],
      }
    }
    if (params.verify(key, bytes)) {
      if (HashSet.has(state.cache, key)) {
        return {
          result: { _tag: "Uploaded", key },
          state,
          commands: [],
          decisions: [{ op: input.id, decision: { _tag: "Verified", key } }],
        }
      }
      const command: Command<K, B> = { _tag: "Upload", key, bytes }
      return {
        result: { _tag: "Commanded" },
        state: {
          ...state,
          inFlight: HashMap.set(state.inFlight, input.id, {
            _tag: "Uploading",
            key,
            bytes,
          }),
        },
        commands: [{ op: input.id, command }],
        decisions: [
          { op: input.id, decision: { _tag: "Verified", key } },
          { op: input.id, decision: { _tag: "Issued", command } },
        ],
      }
    }
    return {
      result: { _tag: "IntegrityRejected", key },
      state: {
        ...state,
        rejected: HashSet.add(state.rejected, [key, bytes] as const),
      },
      commands: [],
      decisions: [
        { op: input.id, decision: { _tag: "IntegrityRejected", key } },
        { op: input.id, decision: { _tag: "GaveUp", key } },
      ],
    }
  }

  const current = HashMap.get(state.inFlight, input.id)
  if (Option.isNone(current)) return absorbOut(state)
  if (current.value._tag === "Loading") {
    return loadEvent(params, state, input.id, current.value.key, input.event)
  }
  return uploadEvent(
    params,
    state,
    input.id,
    current.value.key,
    current.value.bytes,
    input.event,
  )
}

/** RMT-001's entitlement guard. */
export const entitledToCache = <K, B>(
  params: Params<K, B>,
  state: MachineState<K, B>,
  input: MInput<K, B>,
): boolean => {
  if (input._tag !== "FromWire" || input.event._tag !== "Ok") return false
  const current = HashMap.get(state.inFlight, input.id)
  if (Option.isNone(current)) return false
  if (current.value._tag === "Loading") {
    return !(input.event.declared > params.budgets.maxBytes)
      && params.verify(current.value.key, input.event.bytes)
  }
  return params.verify(current.value.key, current.value.bytes)
}

/** RMT-002's declared-budget guard. */
export const overBudget = <K, B>(
  params: Params<K, B>,
  state: MachineState<K, B>,
  input: MInput<K, B>,
): boolean => {
  switch (input._tag) {
    case "Request":
      return input.op._tag === "Upload"
        && Option.isNone(HashMap.get(state.inFlight, input.id))
        && params.size(input.op.bytes) > params.budgets.maxBytes
    case "FromWire": {
      if (input.event._tag !== "Ok") return false
      const current = HashMap.get(state.inFlight, input.id)
      return Option.isSome(current)
        && current.value._tag === "Loading"
        && input.event.declared > params.budgets.maxBytes
    }
  }
}

/** Whether a result is the budget rejection. */
export const isBudgetRejection = <K, B>(result: MResult<K, B>): boolean =>
  result._tag === "BudgetRejected"

/** Run the machine over an input list. */
export const run = <K, B>(
  params: Params<K, B>,
  state: MachineState<K, B>,
  inputs: ReadonlyArray<MInput<K, B>>,
): RunOut<K, B> => {
  const [input, ...restInputs] = inputs
  if (input === undefined) {
    return { state, results: [], decisions: [], commands: [] }
  }
  const output = step(params, state, input)
  const rest = run(params, output.state, restInputs)
  return {
    state: rest.state,
    results: [output.result, ...rest.results],
    decisions: [...output.decisions, ...rest.decisions],
    commands: [...output.commands, ...rest.commands],
  }
}
