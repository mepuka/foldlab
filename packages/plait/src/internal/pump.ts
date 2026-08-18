import {
  AckPolicy,
  DeliverPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  ReplayPolicy,
  jetstream,
  jetstreamManager,
  type Consumer,
  type ConsumerInfo,
  type ConsumerMessages,
  type JsMsg,
} from "@nats-io/jetstream"
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Queue, Result, Schema, Stream } from "effect"

import type { Anchor } from "../Anchor.js"
import { digestOf } from "../Digest.js"
import type { DeclaredFold } from "../Fold.js"
import { partition } from "../Lane.js"
import { structuralRefusal, type Refusal } from "../Refusal.js"
import { evidenceSubject } from "../Subjects.js"
import { verifyEnvelopeDigest, type Envelope } from "../Wire.js"
import type { AnchorStore, LoadedAnchor } from "./anchors.js"
import { laneStreamName } from "./lanes.js"
import {
  ingestSuccessor,
  type PositionedEvent,
  type SuccessorMachine,
} from "./successors.js"
import { transportRefusalFor } from "./transport.js"

export const PUMP_BUFFER_BOUND = 256
export const PUMP_ACK_WAIT_NANOS = 1 * 1_000_000_000

/** Internal consumption unit; no NATS type crosses the public seam. */
export interface PositionedDurableRecord<Event> {
  readonly subject: string
  readonly position: number
  readonly envelope: Envelope
  readonly event: Event
  readonly digest: import("../Digest.js").Digest
  readonly ack: () => void
}

export interface MutableFoldScoreboard {
  messages: number
  redeliveriesAbsorbed: number
  bufferedOutOfOrderArrivals: number
  bufferedOutOfOrderDrained: number
  anchorWrites: number
  refusals: Record<string, number>
}

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "fold-transport-unavailable",
  law: "Transport absence may be retried; consumer and checkpoint shape violations may not.",
  expected: "the pinned local NATS durable-consumer operation to be available",
  next: () => [{
    subject: "Folds.deploy",
    note: "Reconnect and redeploy; resumption re-attaches at floor + 1, and redelivery replaces anything left unacknowledged.",
  }],
})

const consumerShapeRefusal = (
  foldDigest: string,
  partitionNumber: number,
  info: ConsumerInfo,
): Refusal => structuralRefusal({
  kind: "consumer-substrate-shape",
  law: "Every fold partition has one durable pull consumer with explicit ack and a bounded in-flight window.",
  path: ["fold", foldDigest, "partition", String(partitionNumber), "consumer", "config"],
  got: JSON.stringify(info.config),
  expected: `explicit ack, one exact filter subject, max_ack_pending=${PUMP_BUFFER_BOUND}`,
  next: [{
    subject: "Folds.deploy",
    note: "Restore the declared durable pull-consumer shape before attaching the pump.",
  }],
})

const evidenceMismatch = (
  path: ReadonlyArray<string>,
  got: string | number,
  expected: string | number,
): Refusal => structuralRefusal({
  kind: "lane-evidence-mismatch",
  law: "A durable partition pump accepts only verified events addressed by its declared lane and partition key.",
  path,
  got,
  expected,
  next: [{
    subject: "Lane.emit",
    note: "Emit through the declared lane so identity, key, subject, and partition are derived together.",
  }],
})

const durableName = (foldDigest: string): string => `FLB_FOLD_${foldDigest}`

const hasConsumerShape = (info: ConsumerInfo, subject: string): boolean =>
  info.config.durable_name === info.name &&
  info.config.ack_policy === AckPolicy.Explicit &&
  info.config.deliver_policy === DeliverPolicy.StartSequence &&
  info.config.replay_policy === ReplayPolicy.Instant &&
  info.config.filter_subject === subject &&
  info.config.max_ack_pending === PUMP_BUFFER_BOUND

const ensureConsumer = Effect.fn("Folds.ensureConsumer")(function*<Event, State, Partitions extends number> (
  connection: NatsConnection,
  fold: DeclaredFold<Event, State, Partitions>,
  partitionNumber: number,
  anchor: Anchor,
) {
  const stream = laneStreamName(fold.lane, partitionNumber)
  const subject = yield* evidenceSubject(fold.lane.handle, partitionNumber)
  const name = durableName(fold.digest)
  const info = yield* Effect.tryPromise({
    try: async () => {
      const manager = await jetstreamManager(connection)
      try {
        return await manager.consumers.info(stream, name)
      } catch (error) {
        if (error instanceof JetStreamApiError && error.code === JetStreamApiCodes.ConsumerNotFound) {
          return manager.consumers.add(stream, {
            durable_name: name,
            ack_policy: AckPolicy.Explicit,
            deliver_policy: DeliverPolicy.StartSequence,
            opt_start_seq: anchor.floor + 1,
            replay_policy: ReplayPolicy.Instant,
            filter_subject: subject,
            ack_wait: PUMP_ACK_WAIT_NANOS,
            max_ack_pending: PUMP_BUFFER_BOUND,
          })
        }
        throw error
      }
    },
    catch: (cause) => transportRefusal("fold.consumer.ensure", cause),
  })
  if (!hasConsumerShape(info, subject)) {
    return yield* consumerShapeRefusal(fold.digest, partitionNumber, info)
  }
  return yield* Effect.tryPromise({
    try: () => jetstream(connection).consumers.get(stream, name),
    catch: (cause) => transportRefusal("fold.consumer.acquire", cause),
  })
})

const closeMessages = (messages: ConsumerMessages): Effect.Effect<void> =>
  Effect.promise(() => messages.close()).pipe(Effect.asVoid)

const rawMessages = (
  consumer: Consumer,
  checkpointEvery: number,
): Stream.Stream<JsMsg, Refusal> => Stream.callback<JsMsg, Refusal>((queue) =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => consumer.consume({
        max_messages: Math.min(checkpointEvery, PUMP_BUFFER_BOUND),
        callback: (message) => {
          Queue.offerUnsafe(queue, message)
        },
      }),
      catch: (cause) => transportRefusal("fold.consumer.read", cause),
    }),
    closeMessages,
  )
)

export const decodeDurableMessage = Effect.fn("Folds.decodeRecord")(function*<Event, State, Partitions extends number> (
  fold: DeclaredFold<Event, State, Partitions>,
  partitionNumber: number,
  message: JsMsg,
): Effect.fn.Return<PositionedDurableRecord<Event>, Refusal> {
  const messageId = message.headers?.get("Nats-Msg-Id") ?? ""
  const verified = yield* verifyEnvelopeDigest(message.data, messageId)
  if (verified.envelope.kind !== "emit") {
    return yield* evidenceMismatch(["envelope", "kind"], verified.envelope.kind, "emit")
  }
  if (verified.envelope.lane !== fold.lane.digest) {
    return yield* evidenceMismatch(
      ["envelope", "lane"],
      verified.envelope.lane,
      fold.lane.digest,
    )
  }
  const decoded = Schema.decodeUnknownResult(fold.lane.event, {
    onExcessProperty: "error",
    errors: "first",
  })(verified.envelope.body)
  if (Result.isFailure(decoded)) {
    return yield* evidenceMismatch(
      ["envelope", "body"],
      String(decoded.failure),
      "one event admitted by the declared lane schema",
    )
  }
  const coordinate = yield* partition(fold.lane, decoded.success)
  if (coordinate.partition !== partitionNumber) {
    return yield* evidenceMismatch(
      ["envelope", "key", "partition"],
      coordinate.partition,
      partitionNumber,
    )
  }
  const [actualKey, envelopeKey] = yield* Effect.all([
    digestOf(coordinate.key),
    digestOf(verified.envelope.key),
  ])
  if (actualKey !== envelopeKey) {
    return yield* evidenceMismatch(["envelope", "key"], envelopeKey, actualKey)
  }
  const subject = yield* evidenceSubject(fold.lane.handle, partitionNumber)
  if (message.subject !== subject) {
    return yield* evidenceMismatch(["subject"], message.subject, subject)
  }
  return {
    subject: message.subject,
    position: message.seq,
    envelope: verified.envelope,
    event: decoded.success,
    digest: verified.digest,
    ack: () => message.ack(),
  }
})

const countRefusal = (scoreboard: MutableFoldScoreboard, refusal: Refusal): void => {
  const key = `${refusal.sort}:${refusal.kind}`
  scoreboard.refusals[key] = (scoreboard.refusals[key] ?? 0) + 1
}

export interface PartitionPump {
  readonly run: Effect.Effect<void, Refusal>
}

export const preparePartitionPump = Effect.fn("Folds.preparePartitionPump")(function*<
  Event,
  State,
  Partitions extends number,
> (
  connection: NatsConnection,
  anchors: AnchorStore,
  fold: DeclaredFold<Event, State, Partitions>,
  partitionNumber: number,
  loaded: LoadedAnchor<State>,
  checkpointEvery: number,
  scoreboard: MutableFoldScoreboard,
): Effect.fn.Return<PartitionPump, Refusal> {
  const consumer = yield* ensureConsumer(connection, fold, partitionNumber, loaded.anchor)
  const anchorKey = anchors.key(fold, partitionNumber)
  const stream = rawMessages(consumer, checkpointEvery).pipe(
    Stream.mapEffect((message) => decodeDurableMessage(fold, partitionNumber, message)),
  )

  const run = Effect.gen(function* () {
    let revision = loaded.revision
    let machine: SuccessorMachine<Event, State> = {
      anchor: loaded.anchor,
      state: loaded.state,
      buffer: new Map(),
    }
    const acknowledgements = new Map<number, PositionedDurableRecord<Event>>()
    const bufferedAhead = new Set<number>()

    yield* Stream.runForEach(stream, (record) => Effect.gen(function* () {
      scoreboard.messages += 1
      const wasStale = record.position <= machine.anchor.floor
      const wasBuffered = acknowledgements.has(record.position)
      if (wasStale || wasBuffered) scoreboard.redeliveriesAbsorbed += 1
      if (record.position > machine.anchor.floor + 1 && !machine.buffer.has(record.position)) {
        scoreboard.bufferedOutOfOrderArrivals += 1
        bufferedAhead.add(record.position)
      }
      acknowledgements.set(record.position, record)

      const positioned: PositionedEvent<Event> = {
        position: record.position,
        event: record.event,
        digest: record.digest,
      }
      const ingested = yield* ingestSuccessor(machine, positioned, fold.step)
      machine = ingested.machine
      if (machine.buffer.size > PUMP_BUFFER_BOUND) {
        return yield* structuralRefusal({
          kind: "fold-buffer-overflow",
          law: "The position-addressed reorder buffer is bounded by the durable consumer's in-flight window.",
          path: ["fold", fold.digest, "partition", String(partitionNumber), "buffer"],
          got: machine.buffer.size,
          expected: PUMP_BUFFER_BOUND,
          next: [{
            subject: "Folds.deploy",
            note: "Detach the pump and restore the declared max-ack-pending flow-control shape.",
          }],
        })
      }

      if (ingested.applied.length > 0) {
        revision = yield* anchors.commit(anchorKey, revision, machine.anchor, machine.state)
        scoreboard.anchorWrites += 1
        for (const applied of ingested.applied) {
          if (bufferedAhead.delete(applied.position)) {
            scoreboard.bufferedOutOfOrderDrained += 1
          }
          acknowledgements.get(applied.position)?.ack()
          acknowledgements.delete(applied.position)
        }
      }

      if (wasStale) {
        // The raw arrival entered the position map first. The successor drain
        // could not select it; only then does flow-control cleanup use the
        // already-landed anchor to ack and evict it.
        record.ack()
        acknowledgements.delete(record.position)
        const buffer = new Map(machine.buffer)
        buffer.delete(record.position)
        machine = { ...machine, buffer }
      }
    }))
  }).pipe(
    Effect.tapError((refusal) => Effect.sync(() => countRefusal(scoreboard, refusal))),
  )

  return { run }
})
