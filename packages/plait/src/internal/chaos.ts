import {
  AckPolicy,
  DeliverPolicy,
  ReplayPolicy,
  jetstream,
  jetstreamManager,
  type Consumer,
  type JsMsg,
} from "@nats-io/jetstream"
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Schema, Scope } from "effect"

import { initial } from "../Anchor.js"
import { type WireValue } from "../Canonical.js"
import { digestOf, type Digest } from "../Digest.js"
import type { DeclaredFold } from "../Fold.js"
import {
  absenceRefusal,
  structuralRefusal,
  type Refusal,
} from "../Refusal.js"
import { evidenceSubject } from "../Subjects.js"
import { laneStreamName } from "./lanes.js"
import { decodeDurableMessage } from "./pump.js"
import {
  arrivalOrderReplay,
  ingestSuccessor,
  type PositionedEvent,
  type SuccessorMachine,
} from "./successors.js"
import { acquireConnection, transportRefusalFor } from "./transport.js"

export interface RedeliveryChaosOptions<Event, State, Partitions extends number> {
  readonly servers: string | ReadonlyArray<string>
  readonly fold: DeclaredFold<Event, State, Partitions>
  readonly heads: ReadonlyArray<number>
  readonly seed: number
}

export interface RedeliveryChaosResult {
  readonly referenceDigests: ReadonlyArray<Digest>
  readonly successorDigests: ReadonlyArray<Digest>
  readonly arrivalOrderDigests: ReadonlyArray<Digest>
  readonly equal: boolean
  readonly arrivalOrderDiverged: boolean
  readonly eventsAdmitted: number
  readonly eventsApplied: number
  readonly arrivalsSuppressedAtFrontier: number
  readonly redeliveriesAbsorbed: number
  readonly bufferedOutOfOrderArrivals: number
  readonly bufferedOutOfOrderDrained: number
  readonly anchorWrites: number
}

const transportRefusal = transportRefusalFor({
  kind: "chaos-transport-unavailable",
  law: "The chaos schedule uses only the real durable-consumer protocol for redelivery.",
  expected: "the pinned local NATS consumer operation to be available",
  next: () => [{
    subject: "plait chaos",
    note: "Restore the consumer protocol and re-run the measurement against the same pinned span.",
  }],
})

const nextMessage = (
  consumer: Consumer,
): Effect.Effect<JsMsg, Refusal> => Effect.tryPromise({
  try: () => consumer.next({ expires: 5_000 }),
  catch: (cause) => transportRefusal("chaos.consumer.next", cause),
}).pipe(Effect.flatMap((message) => message === null
  ? Effect.fail(absenceRefusal({
    kind: "chaos-message-absent",
    law: "A pinned chaos span must already be present before the schedule starts.",
    path: ["consumer", "next"],
    got: "timeout",
    expected: "one message inside the pinned span",
    next: [{
      subject: "plait chaos",
      note: "Emit the complete pinned span, then re-run the measurement against that same span.",
    }],
  }))
  : Effect.succeed(message)))

const seededOrder = (length: number, seed: number): ReadonlyArray<number> => {
  const order = Array.from({ length }, (_, index) => index)
  let state = seed >>> 0
  for (let index = order.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const selected = state % (index + 1)
    const value = order[index]!
    order[index] = order[selected]!
    order[selected] = value
  }
  return order
}

interface PartitionMeasurement {
  readonly reference: Digest
  readonly successor: Digest
  readonly arrivalOrder: Digest
  readonly eventsAdmitted: number
  readonly eventsApplied: number
  readonly arrivalsSuppressedAtFrontier: number
  readonly redeliveriesAbsorbed: number
  readonly bufferedArrivals: number
  readonly bufferedDrained: number
  readonly anchorWrites: number
}

const measureSchedule = Effect.fn("Chaos.measureSchedule")(function*<Event, State> (
  fold: DeclaredFold<Event, State>,
  head: number,
  initialMessages: ReadonlyArray<PositionedEvent<Event>>,
  schedule: ReadonlyArray<PositionedEvent<Event>>,
): Effect.fn.Return<PartitionMeasurement, Refusal> {
  const initialState = fold.algebra.reducer.initialValue
  if (!Schema.is(Schema.Json)(initialState)) {
    return yield* structuralRefusal({
      kind: "invalid-fold-state",
      law: "Chaos measurements admit only the fold runtime's wire-grammar states.",
      path: ["state", "initial"],
      got: String(initialState),
      expected: "one RFC 8785 wire value",
      next: [{
        subject: "Algebra.declare",
        note: "Declare a canonical wire-grammar initial state before running chaos measurements.",
      }],
    })
  }
  let referenceState: State = initialState
  for (const message of [...initialMessages].sort((left, right) => left.position - right.position)) {
    referenceState = fold.step(referenceState, message.event)
  }

  const anchor = yield* initial(initialState)
  let machine: SuccessorMachine<Event, State> = {
    anchor,
    state: initialState,
    buffer: new Map(),
  }
  const buffered = new Set<number>()
  let bufferedArrivals = 0
  let bufferedDrained = 0
  let anchorWrites = 0
  let eventsApplied = 0
  for (const message of schedule) {
    if (message.position > machine.anchor.floor + 1 && !machine.buffer.has(message.position)) {
      buffered.add(message.position)
      bufferedArrivals += 1
    }
    const result = yield* ingestSuccessor(machine, message, fold.step, head)
    machine = result.machine
    eventsApplied += result.applied.length
    if (result.applied.length > 0) anchorWrites += 1
    for (const applied of result.applied) {
      if (buffered.delete(applied.position)) bufferedDrained += 1
    }
  }
  const arrivalOrder = yield* arrivalOrderReplay({
    anchor,
    state: initialState,
    deliveries: schedule,
    step: fold.step,
  })
  const [reference, successor, arrivalOrderDigest] = yield* Effect.all([
    digestOf(referenceState as WireValue),
    digestOf(machine.state as WireValue),
    digestOf(arrivalOrder.state as WireValue),
  ])
  return {
    reference,
    successor,
    arrivalOrder: arrivalOrderDigest,
    eventsAdmitted: initialMessages.length,
    eventsApplied,
    arrivalsSuppressedAtFrontier: schedule.length - eventsApplied,
    redeliveriesAbsorbed: schedule.length - initialMessages.length,
    bufferedArrivals,
    bufferedDrained,
    anchorWrites,
  }
})

const runPartition = Effect.fn("Chaos.redeliveryPartition")(function*<Event, State, Partitions extends number> (
  connection: NatsConnection,
  fold: DeclaredFold<Event, State, Partitions>,
  partition: number,
  head: number,
  seed: number,
): Effect.fn.Return<PartitionMeasurement, Refusal> {
  const stream = laneStreamName(fold.lane, partition)
  const subject = yield* evidenceSubject(fold.lane.handle, partition)
  const name = `FLB_CHAOS_${fold.digest}_${partition}_${seed >>> 0}`
  const manager = yield* Effect.tryPromise({
    try: () => jetstreamManager(connection),
    catch: (cause) => transportRefusal("chaos.manager", cause),
  })
  yield* Effect.tryPromise({
    try: () => manager.consumers.add(stream, {
      durable_name: name,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.StartSequence,
      opt_start_seq: 1,
      replay_policy: ReplayPolicy.Instant,
      filter_subject: subject,
      ack_wait: 5 * 1_000_000_000,
      max_ack_pending: Math.max(head, 1),
    }),
    catch: (cause) => transportRefusal("chaos.consumer.create", cause),
  })
  const cleanup = Effect.tryPromise({
    try: () => manager.consumers.delete(stream, name),
    catch: () => undefined,
  }).pipe(Effect.catch(() => Effect.void), Effect.asVoid)

  return yield* Effect.gen(function* () {
    const consumer = yield* Effect.tryPromise({
      try: () => jetstream(connection).consumers.get(stream, name),
      catch: (cause) => transportRefusal("chaos.consumer.acquire", cause),
    })
    const initialRaw: Array<JsMsg> = []
    for (let index = 0; index < head; index++) initialRaw.push(yield* nextMessage(consumer))

    const firstRedeliveryRaw: Array<JsMsg> = []
    for (let index = initialRaw.length - 1; index >= 0; index--) {
      initialRaw[index]!.nak()
      firstRedeliveryRaw.push(yield* nextMessage(consumer))
    }

    const secondRedeliveryRaw: Array<JsMsg> = []
    for (const index of seededOrder(firstRedeliveryRaw.length, seed + partition)) {
      firstRedeliveryRaw[index]!.nak()
      secondRedeliveryRaw.push(yield* nextMessage(consumer))
    }

    const decode = (message: JsMsg) => Effect.map(
      decodeDurableMessage(fold, partition, message),
      (record): PositionedEvent<Event> => ({
        position: record.position,
        event: record.event,
        digest: record.digest,
      }),
    )
    const [initialRecords, firstRedeliveries, secondRedeliveries] = yield* Effect.all([
      Effect.forEach(initialRaw, decode),
      Effect.forEach(firstRedeliveryRaw, decode),
      Effect.forEach(secondRedeliveryRaw, decode),
    ])
    for (const message of secondRedeliveryRaw) message.ack()

    // Every scheduled item is a real consumer delivery. Starting with the
    // reversed redelivery tranche makes arrival order differ from stream
    // order while retaining the initially delivered tranche for multiplicity.
    const schedule = [...firstRedeliveries, ...initialRecords, ...secondRedeliveries]
    return yield* measureSchedule(fold, head, initialRecords, schedule)
  }).pipe(Effect.ensuring(cleanup))
})

/** Runs a real NAK/redelivery schedule over an already-pinned declared fold span. */
export const runRedeliveryChaos = Effect.fn("Chaos.runRedelivery")(function*<
  Event,
  State,
  Partitions extends number,
> (
  options: RedeliveryChaosOptions<Event, State, Partitions>,
): Effect.fn.Return<RedeliveryChaosResult, Refusal, Scope.Scope> {
  if (options.heads.length !== options.fold.lane.partitions ||
    options.heads.some((head) => !Number.isSafeInteger(head) || head < 1)) {
    return yield* structuralRefusal({
      kind: "invalid-fold-declaration",
      law: "Chaos pins one positive stream head for every declared partition before scheduling.",
      path: ["heads"],
      got: JSON.stringify(options.heads),
      expected: `${options.fold.lane.partitions} positive safe-integer heads`,
      next: [{
        subject: "plait chaos",
        note: "Pin one positive stream head for each declared lane partition.",
      }],
    })
  }
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait-chaos",
    "chaos.connection.acquire",
    transportRefusal,
  )
  const partitions = yield* Effect.forEach(
    options.heads,
    (head, partition) => runPartition(
      connection,
      options.fold,
      partition,
      head,
      options.seed,
    ),
  )
  const referenceDigests = partitions.map((result) => result.reference)
  const successorDigests = partitions.map((result) => result.successor)
  const arrivalOrderDigests = partitions.map((result) => result.arrivalOrder)
  return {
    referenceDigests,
    successorDigests,
    arrivalOrderDigests,
    equal: referenceDigests.every((digest, index) => digest === successorDigests[index]),
    arrivalOrderDiverged: referenceDigests.some(
      (digest, index) => digest !== arrivalOrderDigests[index],
    ),
    eventsAdmitted: partitions.reduce((sum, result) => sum + result.eventsAdmitted, 0),
    eventsApplied: partitions.reduce((sum, result) => sum + result.eventsApplied, 0),
    arrivalsSuppressedAtFrontier: partitions.reduce(
      (sum, result) => sum + result.arrivalsSuppressedAtFrontier,
      0,
    ),
    redeliveriesAbsorbed: partitions.reduce(
      (sum, result) => sum + result.redeliveriesAbsorbed,
      0,
    ),
    bufferedOutOfOrderArrivals: partitions.reduce(
      (sum, result) => sum + result.bufferedArrivals,
      0,
    ),
    bufferedOutOfOrderDrained: partitions.reduce(
      (sum, result) => sum + result.bufferedDrained,
      0,
    ),
    anchorWrites: partitions.reduce((sum, result) => sum + result.anchorWrites, 0),
  }
})
