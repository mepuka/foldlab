import { Effect, Schema } from "effect"

import { advance, type Anchor } from "../Anchor.js"
import { digestOf, type Digest } from "../Digest.js"
import { structuralRefusal, type StructuralRefusal } from "../Refusal.js"

/** One event at its dense partition-stream position. */
export interface PositionedEvent<Event> {
  readonly position: number
  readonly event: Event
  readonly digest: Digest
}

/** Incremental state of the position-addressed replay discipline. */
export interface SuccessorMachine<Event, State> {
  readonly anchor: Anchor
  readonly state: State
  readonly buffer: ReadonlyMap<number, PositionedEvent<Event>>
}

/** Observable result of one finite replay schedule. */
export interface ReplayResult<State> {
  readonly anchor: Anchor
  readonly state: State
  readonly applied: number
  readonly buffered: number
}

/** Inputs shared by the lawful replay and its arrival-order control. */
export interface ReplayOptions<Event, State> {
  readonly anchor: Anchor
  readonly state: State
  readonly deliveries: ReadonlyArray<PositionedEvent<Event>>
  readonly step: (state: State, event: Event) => State
  /** Finite model window; live pumps roll this window forward after checkpointing. */
  readonly count?: number
}

const invalidState = (state: unknown): StructuralRefusal => structuralRefusal({
  kind: "invalid-fold-state",
  law: "Fold states are wire-grammar values whose state digest is SHA-256 over canonical bytes.",
  path: ["state"],
  got: String(state),
  expected: "one RFC 8785 wire value",
  next: [{
    subject: "Fold.declare",
    note: "Return a canonical wire value from every contribution and algebra combination.",
  }],
})

/**
 * Ingests one raw arrival and drains only consecutive successors.
 *
 * Every arrival enters the position-addressed buffer, including stale and
 * ahead-of-frontier entries. Redelivery replaces only its own position. The
 * floor is consulted solely by the contiguous drain; it is never an ingestion
 * guard and therefore receives no correctness attribution.
 */
export const ingestSuccessor = Effect.fn("Fold.ingestSuccessor")(function*<Event, State>(
  machine: SuccessorMachine<Event, State>,
  delivery: PositionedEvent<Event>,
  step: (state: State, event: Event) => State,
  ceiling: number = Number.POSITIVE_INFINITY,
): Effect.fn.Return<{
  readonly machine: SuccessorMachine<Event, State>
  readonly applied: ReadonlyArray<PositionedEvent<Event>>
}, StructuralRefusal> {
  const buffer = new Map(machine.buffer)
  buffer.set(delivery.position, delivery)
  let anchor = machine.anchor
  let state = machine.state
  const applied: Array<PositionedEvent<Event>> = []

  while (true) {
    if (anchor.floor >= ceiling) break
    const successor = buffer.get(anchor.floor + 1)
    if (successor === undefined) break
    const next = step(state, successor.event)
    if (!Schema.is(Schema.Json)(next)) return yield* invalidState(next)
    anchor = yield* advance(anchor, next, successor.digest, successor.position)
    state = next
    buffer.delete(successor.position)
    applied.push(successor)
  }

  return { machine: { anchor, state, buffer }, applied }
})

/** Replays a finite arrival schedule through the runtime successor discipline. */
export const replaySuccessors = Effect.fn("Fold.replaySuccessors")(function*<Event, State>(
  options: ReplayOptions<Event, State>,
): Effect.fn.Return<ReplayResult<State>, StructuralRefusal> {
  let machine: SuccessorMachine<Event, State> = {
    anchor: options.anchor,
    state: options.state,
    buffer: new Map(),
  }
  let applied = 0
  const ceiling = options.count === undefined
    ? Number.POSITIVE_INFINITY
    : options.anchor.floor + options.count
  for (const delivery of options.deliveries) {
    const result = yield* ingestSuccessor(machine, delivery, options.step, ceiling)
    machine = result.machine
    applied += result.applied.length
  }
  return {
    anchor: machine.anchor,
    state: machine.state,
    applied,
    buffered: machine.buffer.size,
  }
})

/**
 * Negative control: apply arrivals immediately in delivery order.
 *
 * This deliberately drops the whole successor discipline. Reordered arrivals
 * can advance over gaps and duplicates can apply repeatedly.
 */
export const arrivalOrderReplay = Effect.fn("Fold.arrivalOrderReplay")(function*<Event, State>(
  options: ReplayOptions<Event, State>,
): Effect.fn.Return<ReplayResult<State>, StructuralRefusal> {
  let anchor = options.anchor
  let state = options.state
  for (const delivery of options.deliveries) {
    const next = options.step(state, delivery.event)
    if (!Schema.is(Schema.Json)(next)) return yield* invalidState(next)
    const [stateDigest, head] = yield* Effect.all([
      digestOf(next),
      digestOf({
        v: 0,
        kind: "arrival-order-head",
        previous: anchor.head,
        event: delivery.digest,
        position: delivery.position,
      }),
    ])
    state = next
    anchor = {
      floor: Math.max(anchor.floor, delivery.position),
      stateDigest,
      head,
    }
  }
  return {
    anchor,
    state,
    applied: options.deliveries.length,
    buffered: 0,
  }
})
