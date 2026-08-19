/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import {
  DeliverPolicy,
  ReplayPolicy,
  jetstream,
  jetstreamManager,
  type ConsumerMessages,
  type JsMsg,
} from "@nats-io/jetstream"
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Queue, Result, Schema, Scope, Stream } from "effect"

import type {
  DeclaredLane,
  LandedFact,
  LaneReadOptions,
  LaneReadService,
} from "../planes/Lane.js"
import { LANE_TAIL_LIMIT_DEFAULT, LANE_TAIL_LIMIT_MAX } from "../planes/Lane.js"
import { structuralRefusal, type Refusal } from "../truth/Refusal.js"
import { evidenceSubject } from "../kernel/Subjects.js"
import { verifyEnvelopeDigest } from "../kernel/Wire.js"
import { laneStreamName } from "./lanes.js"
import { acquireConnection, transportRefusalFor } from "./transport.js"

/**
 * The lane read: a bounded tail of one declared lane's facts, and the live
 * continuation of it.
 *
 * **A read acknowledges nothing and checkpoints nothing.** Both faces below run
 * on EPHEMERAL ORDERED consumers, which are ack-none and expire on their own
 * inactivity. That is the whole reason a read may exist beside the fold's
 * durable pump without being a second one: the pump owns a durable consumer, an
 * anchor, and an acknowledgement discipline, and a reader that acquired any of
 * the three would be advancing a frontier some other party depends on. Nothing
 * here creates a durable consumer, commits an anchor, or acknowledges a
 * message.
 *
 * **Positions are per-partition coordinates, so a tail never interleaves.** A
 * declared `(lane, partition)` owns one exact stream and its dense stream
 * sequence is the position; two partitions' positions come from two sequences
 * and are not comparable at all. So the tail reads each requested partition's
 * own span and reports the spans one after another, each in its own position
 * order — never merged into a single order by position, which would be an order
 * no reader ever saw. Every row carries the partition it was read from, so the
 * grouping is legible in the value rather than remembered by the caller.
 *
 * **Bounded by construction, not by hope.** The span is computed from the
 * stream's own reported first and last positions and then clipped to a limit
 * that has a default and a ceiling; a caller asking for more than the ceiling
 * receives the ceiling, and one asking for less than one receives one. There is
 * no unbounded read on this seam to reach for.
 *
 * **Verify-on-read is the fetched bytes'.** Every row is admitted by
 * `verifyEnvelopeDigest` over the exact octets the substrate returned, before
 * anything decodes them, and only then is the body decoded through the lane's
 * own declared event schema. A row whose message id is not SHA-256 over its own
 * canonical bytes refuses rather than being repaired into one that agrees.
 *
 * **No clock is read as meaning.** The substrate stamps a time on every stored
 * message and nothing here consults it: what a row carries is its position, its
 * identity, its holder, and its fact. A reader that wanted an age would be
 * asking a question positions do not answer.
 */

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "lane-read-transport-unavailable",
  law: "Transport absence may be retried; a fact whose identity does not verify may not.",
  expected: "the pinned local NATS JetStream stream read to be available",
  next: () => [{
    subject: "Lane.tail",
    note: "Reconnect and read again; a read acknowledges nothing, so a repeated read costs the substrate nothing.",
  }],
})

/**
 * The bound one read span is clipped to.
 *
 * Stated as a total function over the stream's own reported edges so that the
 * clipping is one arithmetic fact a reader can check rather than a scatter of
 * comparisons inside a promise. An empty stream answers with no span at all,
 * which is how a lane nobody has emitted onto reads as an empty tail rather
 * than as a refusal.
 */
export interface ReadSpan {
  /** The first position the read starts at. */
  readonly from: number
  /** How many positions the read covers. */
  readonly count: number
}

/**
 * Clips a read to the last `limit` positions the stream actually carries.
 *
 * `first` and `last` are the substrate's own reported edges. A stream reporting
 * no message, or a last position behind its first, has no span: the pair is not
 * repaired into one, because a span invented over an empty stream would be a
 * read of positions nobody wrote.
 */
export const readSpan = (
  first: number,
  last: number,
  limit: number,
): ReadSpan | undefined => {
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return undefined
  if (last < 1 || last < first) return undefined
  const start = Math.max(first, 1, last - limit + 1)
  return { from: start, count: last - start + 1 }
}

/**
 * The limit one request is admitted under: the default when none is asked for,
 * the ceiling when more is, and one when less is.
 *
 * A read surface without a ceiling is an unbounded read wearing a parameter, so
 * the clamp is here rather than at each caller — and it is total, so a
 * malformed number reaches the default rather than the substrate.
 */
export const admittedLimit = (requested: number | undefined): number => {
  if (requested === undefined || !Number.isFinite(requested)) return LANE_TAIL_LIMIT_DEFAULT
  const floored = Math.floor(requested)
  if (floored < 1) return 1
  return floored > LANE_TAIL_LIMIT_MAX ? LANE_TAIL_LIMIT_MAX : floored
}

const outOfRange = (
  lane: DeclaredLane<unknown>,
  requested: number,
): Refusal =>
  structuralRefusal({
    kind: "invalid-partition-key",
    law: "Lane partition routing is derived only from the declared path over the admitted event value.",
    path: ["lane", lane.digest, "partition"],
    got: requested,
    expected: `an integer from 0 through ${lane.partitions - 1}`,
    next: [{
      subject: "Lane.tail",
      note: "Read a partition the lane declares, or omit the partition to read every one of them.",
    }],
  })

const mismatched = (
  path: ReadonlyArray<string>,
  got: string | number,
  expected: string | number,
): Refusal =>
  structuralRefusal({
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

/** The partitions one request covers: the named one, or every declared one. */
export const requestedPartitions = Effect.fn("LaneReads.partitions")(function* <
  Event,
  const Partitions extends number,
>(
  lane: DeclaredLane<Event, Partitions>,
  requested: number | undefined,
): Effect.fn.Return<ReadonlyArray<number>, Refusal> {
  if (requested === undefined) {
    return Array.from({ length: lane.partitions }, (_, part) => part)
  }
  if (!Number.isSafeInteger(requested) || requested < 0 || requested >= lane.partitions) {
    return yield* outOfRange(lane, Number.isFinite(requested) ? requested : -1)
  }
  return [requested]
})

/**
 * Admits one stored message as a landed fact of the lane it was read from.
 *
 * The identity check runs over the fetched octets first, then the body is
 * decoded through the lane's declared event schema, then the subject is checked
 * against the one the declared `(handle, partition)` routes under. A row that
 * fails any of the three refuses with the fact's own coordinates named, so a
 * reader can find the row rather than merely learn that one was wrong.
 */
export const admitFact = Effect.fn("LaneReads.admit")(function* <
  Event,
  const Partitions extends number,
>(
  lane: DeclaredLane<Event, Partitions>,
  part: number,
  message: { readonly subject: string; readonly seq: number; readonly data: Uint8Array; readonly messageId: string },
): Effect.fn.Return<LandedFact<Event>, Refusal> {
  const verified = yield* verifyEnvelopeDigest(message.data, message.messageId)
  if (verified.envelope.lane !== lane.digest) {
    return yield* mismatched(
      ["lane", lane.digest, "partition", String(part), String(message.seq), "lane"],
      verified.envelope.lane,
      lane.digest,
    )
  }
  const subject = yield* evidenceSubject(lane.handle, part)
  if (message.subject !== subject) {
    return yield* mismatched(
      ["lane", lane.digest, "partition", String(part), String(message.seq), "subject"],
      message.subject,
      subject,
    )
  }
  const decoded = Schema.decodeUnknownResult(lane.event, {
    onExcessProperty: "error",
    errors: "first",
  })(verified.envelope.body)
  if (Result.isFailure(decoded)) {
    return yield* mismatched(
      ["lane", lane.digest, "partition", String(part), String(message.seq), "body"],
      verified.digest,
      "one event admitted by the declared lane schema",
    )
  }
  return {
    partition: part,
    position: message.seq,
    digest: verified.digest,
    holder: verified.envelope.holder,
    event: decoded.success,
  }
})

const messageIdOf = (message: JsMsg): string => message.headers?.get("Nats-Msg-Id") ?? ""

/**
 * The ordered ephemeral consumer one read runs on.
 *
 * Ordered consumers are the pinned client's own read affordance: ephemeral,
 * ack-none, recreated by the client when the server's delivery sequence gaps.
 * Nothing durable is created and nothing is acknowledged, which is what keeps a
 * read out of the fold pump's discipline.
 */
const orderedConsumer = Effect.fn("LaneReads.consumer")(function* (
  connection: NatsConnection,
  stream: string,
  subject: string,
  start: { readonly deliver_policy: DeliverPolicy; readonly opt_start_seq?: number },
) {
  return yield* Effect.tryPromise({
    try: () =>
      jetstream(connection).consumers.get(stream, {
        filter_subjects: subject,
        replay_policy: ReplayPolicy.Instant,
        ...start,
      }),
    catch: (cause) => transportRefusal("lane.read.consumer", cause),
  })
})

const closeMessages = (messages: ConsumerMessages): Effect.Effect<void> =>
  Effect.promise(() => messages.close()).pipe(Effect.asVoid)

/**
 * One partition's bounded tail, oldest position first.
 *
 * The span is read from the stream's own state before a single message is
 * asked for, so the fetch is exactly as large as the positions that exist: a
 * bound computed against what is there cannot hang waiting for messages nobody
 * wrote.
 */
const tailPartition = Effect.fn("LaneReads.tailPartition")(function* <
  Event,
  const Partitions extends number,
>(
  connection: NatsConnection,
  lane: DeclaredLane<Event, Partitions>,
  part: number,
  limit: number,
): Effect.fn.Return<ReadonlyArray<LandedFact<Event>>, Refusal> {
  const stream = laneStreamName(lane, part)
  const subject = yield* evidenceSubject(lane.handle, part)
  const state = yield* Effect.tryPromise({
    try: async () => {
      const manager = await jetstreamManager(connection)
      const info = await manager.streams.info(stream)
      return info.state
    },
    catch: (cause) => transportRefusal("lane.read.info", cause),
  })
  const span = readSpan(state.first_seq, state.last_seq, limit)
  if (span === undefined) return []

  const consumer = yield* orderedConsumer(connection, stream, subject, {
    deliver_policy: DeliverPolicy.StartSequence,
    opt_start_seq: span.from,
  })
  const stored = yield* Effect.acquireUseRelease(
    Effect.tryPromise({
      try: () => consumer.fetch({ max_messages: span.count, expires: 5_000 }),
      catch: (cause) => transportRefusal("lane.read.fetch", cause),
    }),
    (messages) =>
      Effect.tryPromise({
        try: async () => {
          const collected: Array<JsMsg> = []
          for await (const message of messages) collected.push(message)
          return collected
        },
        catch: (cause) => transportRefusal("lane.read.drain", cause),
      }),
    closeMessages,
  )
  return yield* Effect.forEach(stored, (message) =>
    admitFact(lane, part, {
      subject: message.subject,
      seq: message.seq,
      data: message.data,
      messageId: messageIdOf(message),
    }))
})

/**
 * One partition's live continuation, element by element as the substrate
 * delivers it.
 *
 * The consumer's own in-flight window is the flow control: the client asks for
 * at most that many messages ahead, so a reader that stops pulling stops the
 * request from being renewed rather than filling memory. Nothing is collected
 * here — every arrival is one element, and the first is available before the
 * second exists.
 */
const followPartition = <Event, const Partitions extends number>(
  connection: NatsConnection,
  lane: DeclaredLane<Event, Partitions>,
  part: number,
  window: number,
): Stream.Stream<LandedFact<Event>, Refusal> =>
  Stream.callback<JsMsg, Refusal>((queue) =>
    Effect.gen(function* () {
      const stream = laneStreamName(lane, part)
      const subject = yield* evidenceSubject(lane.handle, part)
      const consumer = yield* orderedConsumer(connection, stream, subject, {
        deliver_policy: DeliverPolicy.New,
      })
      return yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () =>
            consumer.consume({
              max_messages: window,
              callback: (message) => {
                Queue.offerUnsafe(queue, message)
              },
            }),
          catch: (cause) => transportRefusal("lane.read.consume", cause),
        }),
        closeMessages,
      )
    }), { bufferSize: window }).pipe(
      Stream.mapEffect((message) =>
        admitFact(lane, part, {
          subject: message.subject,
          seq: message.seq,
          data: message.data,
          messageId: messageIdOf(message),
        })),
    )

/**
 * The bounded ack-none read surface over declared lanes.
 *
 * One connection, owned by the scope that built the service, exactly as every
 * other carrier in this package owns its own.
 */
export const makeLaneReadService = Effect.fn("LaneReads.make")(function* (
  options: LaneReadOptions,
): Effect.fn.Return<LaneReadService, Refusal, Scope.Scope> {
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait-lane-reads",
    "lane.read.connection.acquire",
    transportRefusal,
  )

  const tail: LaneReadService["tail"] = Effect.fn("LaneReads.tail")(function* (lane, request) {
    const parts = yield* requestedPartitions(lane, request?.partition)
    const limit = admittedLimit(request?.limit)
    const spans = yield* Effect.forEach(
      parts,
      (part) => tailPartition(connection, lane, part, limit),
    )
    return spans.flat()
  })

  const follow: LaneReadService["follow"] = (lane, request) =>
    Stream.unwrap(Effect.map(
      requestedPartitions(lane, request?.partition),
      (parts) =>
        Stream.mergeAll(
          parts.map((part) =>
            followPartition(connection, lane, part, admittedLimit(request?.window))),
          { concurrency: "unbounded" },
        ),
    ))

  return { tail, follow }
})
