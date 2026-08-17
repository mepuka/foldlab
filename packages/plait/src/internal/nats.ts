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
import { connect } from "@nats-io/transport-node"
import { Effect, Queue, Result, Schema, Scope, Stream } from "effect"

import type {
  FabricClientOptions,
  FabricClientService,
  ReceivedEnvelope,
} from "../FabricClient.js"
import { absenceRefusal, structuralRefusal, type Refusal } from "../Refusal.js"
import { encodeEnvelope, verifyEnvelopeDigest } from "../Wire.js"

const fabricSubjects = [
  "flb.fab.ev.*.*",
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

const transportRefusal = (operation: string, cause: unknown): Refusal =>
  absenceRefusal({
    kind: "transport-unavailable",
    law: "Transport absence may be retried; structural envelope evidence may not.",
    path: [operation],
    got: String(cause),
    expected: "the pinned local NATS operation to be available",
    next: [{
      subject: operation,
      note: "Retry this absence with retryAbsence and a temporal Schedule.",
    }],
  })

const streamShapeRefusal = (got: string): Refusal =>
  structuralRefusal({
    kind: "substrate-shape",
    law: "The slice-0 commons stream is file-backed with exactly one replica.",
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
      note: "Configure a file-backed commons stream with one replica and the ruled subjects.",
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

const closeConnection = (connection: NatsConnection): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => connection.close(),
    catch: () => undefined,
  }).pipe(Effect.catch(() => Effect.void))

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

const closeConsumerMessages = (messages: ConsumerMessages): Effect.Effect<void> =>
  Effect.promise(() => messages.close()).pipe(Effect.asVoid)

export const makeNatsService = Effect.fn("FabricClient.make")(function* (
  options: FabricClientOptions,
): Effect.fn.Return<FabricClientService, Refusal, Scope.Scope> {
  const connection = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => connect({
        servers: typeof options.servers === "string" ? options.servers : [...options.servers],
        name: options.connectionName ?? "foldlab-plait",
      }),
      catch: (cause) => transportRefusal("connection.acquire", cause),
    }),
    closeConnection,
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
      const consumer = yield* Effect.acquireRelease(
        acquireConsumer(js, options.stream, subject),
        deleteConsumer,
      )
      return Stream.callback<JsMsg, Refusal>((queue) =>
        Effect.acquireRelease(
          Effect.tryPromise({
            try: () => consumer.consume({
              callback: (message) => {
                Queue.offerUnsafe(queue, message)
              },
            }),
            catch: (cause) => transportRefusal("subscribe.read", cause),
          }),
          closeConsumerMessages,
        )
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
