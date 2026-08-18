/**
 * Plane: internal — private adapters serve any layer and reach back only to their own public seam.
 *
 * @module
 */
import {
  DeliverPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  ReplayPolicy,
  StorageType,
  jetstream,
  jetstreamManager,
  type Consumer,
  type ConsumerMessages,
  type JetStreamClient,
  type JsMsg,
} from "@nats-io/jetstream"
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Result, Schema, Scope, Stream } from "effect"

import type {
  FabricClientOptions,
  FabricClientService,
  ReceivedEnvelope,
} from "../FabricClient.js"
import { structuralRefusal, type Refusal } from "../Refusal.js"
import { encodeEnvelope, verifyEnvelopeDigest } from "../Wire.js"
import {
  acquireConnection,
  teachRetryOperation,
  transportRefusalFor,
} from "./transport.js"

const fabricSubjects = [
  "flb.fab.fact.*",
  "flb.fab.node.*",
] as const

const messageIdWindowNanos = 2 * 60 * 1_000_000_000
const ephemeralConsumerInactiveNanos = 30 * 1_000_000_000

const StreamShape = Schema.Struct({
  config: Schema.Struct({
    storage: Schema.Literal("file"),
    num_replicas: Schema.Literal(1),
    duplicate_window: Schema.Literal(messageIdWindowNanos),
    subjects: Schema.Array(Schema.String),
  }),
})

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "transport-unavailable",
  law: "Transport absence may be retried; structural envelope evidence may not.",
  expected: "the pinned local NATS operation to be available",
  next: teachRetryOperation,
})

const streamShapeRefusal = (got: string): Refusal =>
  structuralRefusal({
    kind: "substrate-shape",
    law: "The commons control stream is file-backed R=1 and excludes partition evidence streams.",
    path: ["stream", "config"],
    got,
    expected: {
      storage: StorageType.File,
      num_replicas: 1,
      duplicate_window: messageIdWindowNanos,
      subjects: fabricSubjects,
    },
    next: [{
      subject: "stream.ensure",
      note: "Configure the file-backed fact/node control stream with one replica and the ruled subjects.",
      body: {
        storage: StorageType.File,
        num_replicas: 1,
        duplicate_window: messageIdWindowNanos,
        subjects: fabricSubjects,
      },
    }],
  })

const ensureStream = Effect.fn("FabricClient.ensureStream")(function* (
  connection: NatsConnection,
  stream: string,
) {
  const info = yield* Effect.tryPromise({
    try: async () => {
      const manager = await jetstreamManager(connection)
      try {
        return await manager.streams.info(stream)
      } catch (error) {
        if (error instanceof JetStreamApiError && error.code === JetStreamApiCodes.StreamNotFound) {
          return manager.streams.add({
            name: stream,
            subjects: [...fabricSubjects],
            storage: StorageType.File,
            num_replicas: 1,
            duplicate_window: messageIdWindowNanos,
          })
        }
        throw error
      }
    },
    catch: (cause) => transportRefusal("stream.ensure", cause),
  })

  const decoded = Schema.decodeUnknownResult(StreamShape)(info)
  if (Result.isFailure(decoded)) {
    return yield* streamShapeRefusal(String(decoded.failure))
  }
  const actualSubjects = [...decoded.success.config.subjects].sort()
  const expectedSubjects = [...fabricSubjects].sort()
  if (actualSubjects.length !== expectedSubjects.length ||
    actualSubjects.some((subject, index) => subject !== expectedSubjects[index])) {
    return yield* streamShapeRefusal(JSON.stringify(decoded.success.config))
  }
})

const acquireConsumer = (
  js: JetStreamClient,
  stream: string,
  subject: string,
): Effect.Effect<Consumer, Refusal> =>
  Effect.tryPromise({
    try: () => js.consumers.get(stream, {
      filter_subjects: subject,
      deliver_policy: DeliverPolicy.All,
      replay_policy: ReplayPolicy.Instant,
      inactive_threshold: ephemeralConsumerInactiveNanos,
    }),
    catch: (cause) => transportRefusal("subscribe.acquire", cause),
  })

const deleteConsumer = (consumer: Consumer): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => consumer.delete(),
    catch: () => undefined,
  }).pipe(
    Effect.catch(() => Effect.void),
    Effect.asVoid,
  )

interface PulledMessages {
  readonly iterable: AsyncIterable<JsMsg>
  readonly close: Effect.Effect<void>
}

/**
 * The pinned client's messages, pulled, with the one end an interrupted pump
 * can actually reach.
 *
 * `ConsumerMessages` is an async generator, and a generator parked on an
 * `await` cannot be preempted by `return()` — the return queues behind the
 * pending pull and never runs. An idle subscription is parked exactly there,
 * so this iterator withholds `return`: handed one, `Stream.fromAsyncIterable`
 * registers it as a scope finalizer and an interrupted idle pump would hang
 * closing its scope (`repos/effect/packages/effect/src/Channel.ts:1867-1883`).
 *
 * `close()` is the end that does reach it. It unsubscribes the inbox, cancels
 * the timers and stops the status iterator synchronously, then queues the
 * iterator's stop behind the pending pull, which that pull delivers
 * (`@nats-io/jetstream@3.4.0` `lib/consumer.js:581-607`). Waiting on the
 * close is therefore sound while a pull is outstanding and only there: parked
 * between pulls nothing is left to carry the queued stop, and the client's own
 * teardown has already happened by the time `close()` returns.
 */
const pullMessages = (messages: ConsumerMessages): PulledMessages => {
  const iterator = messages[Symbol.asyncIterator]()
  let pulling = false
  return {
    iterable: {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          pulling = true
          return iterator.next().finally(() => {
            pulling = false
          })
        },
      }),
    },
    close: Effect.suspend(() => {
      const closed = messages.close()
      if (pulling) return Effect.promise(() => closed).pipe(Effect.asVoid)
      return Effect.sync(() => {
        void closed.catch(() => undefined)
      })
    }),
  }
}

/**
 * The commons read pump: the pinned client's own message iterator, pulled one
 * message at a time under the returned stream's own scope.
 *
 * The bound is the client's, not this package's. An iterator is pulled, so
 * this pump owns no queue to size and discards nothing — every stored frame
 * reaches the verifier, in stream order. That is the property the callback
 * adapter this replaces could not reach at any setting: a synchronous callback
 * can only `Queue.offerUnsafe`, which discards instead of suspending, so every
 * bound it admits punches holes in the middle of an ordered read (DECISIONS
 * DEV-736 T0/T1). What is still buffered is the client's own `consume()` pull
 * window (`max_messages`, 100 at the pin), which is one answer in one place
 * rather than a second queue this package would have to size.
 *
 * Interruption still ends the pump: the release closes the client's iterator,
 * which is the single property T4 chose the callback adapter for.
 *
 * Exported for `test/CommonsPumpBackpressure.test.ts`; no other `src` module
 * imports it.
 */
export const commonsPump = (
  open: Effect.Effect<ConsumerMessages, Refusal>,
): Stream.Stream<JsMsg, Refusal> =>
  Stream.unwrap(
    Effect.acquireRelease(
      Effect.map(open, pullMessages),
      (pulled) => pulled.close,
    ).pipe(
      Effect.map((pulled) =>
        Stream.fromAsyncIterable(
          pulled.iterable,
          (cause) => transportRefusal("subscribe.read", cause),
        )
      ),
    ),
  )

export const makeNatsService = Effect.fn("FabricClient.make")(function* (
  options: FabricClientOptions,
): Effect.fn.Return<FabricClientService, Refusal, Scope.Scope> {
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait",
    "connection.acquire",
    transportRefusal,
  )
  yield* ensureStream(connection, options.stream)
  const js = jetstream(connection)

  const publish: FabricClientService["publish"] = Effect.fn("FabricClient.publish")(
    function* (subject, envelope) {
      const encoded = yield* encodeEnvelope(envelope)
      const acknowledgement = yield* Effect.tryPromise({
        try: () => js.publish(subject, encoded.bytes, { msgID: encoded.digest }),
        catch: (cause) => transportRefusal("publish", cause),
      })
      return {
        digest: encoded.digest,
        sequence: acknowledgement.seq,
        duplicate: acknowledgement.duplicate,
      }
    },
  )

  const subscribe: FabricClientService["subscribe"] = Effect.fn("FabricClient.subscribe")(
    function* (subject) {
      const subscribedStream = yield* Effect.tryPromise({
        try: async () => {
          const manager = await jetstreamManager(connection)
          return manager.streams.find(subject)
        },
        catch: (cause) => transportRefusal("subscribe.discover-stream", cause),
      })
      const consumer = yield* Effect.acquireRelease(
        acquireConsumer(js, subscribedStream, subject),
        deleteConsumer,
      )
      return commonsPump(
        Effect.tryPromise({
          try: () => consumer.consume(),
          catch: (cause) => transportRefusal("subscribe.read", cause),
        }),
      ).pipe(
        Stream.mapEffect(Effect.fn("FabricClient.verifyReceived")(function* (
          message,
        ): Effect.fn.Return<ReceivedEnvelope, Refusal> {
          const messageId = message.headers?.get("Nats-Msg-Id") ?? ""
          const verified = yield* verifyEnvelopeDigest(message.data, messageId)
          return {
            subject,
            envelope: verified.envelope,
            digest: verified.digest,
          }
        })),
      )
    },
  )

  return { publish, subscribe }
})
