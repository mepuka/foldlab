import {
  JetStreamApiCodes,
  JetStreamApiError,
  StorageType,
  jetstream,
  jetstreamManager,
} from "@nats-io/jetstream"
import type { NatsConnection, Subscription } from "@nats-io/nats-core"
import { connect } from "@nats-io/transport-node"
import { Effect, Result, Schema, Scope, Stream } from "effect"

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

const StreamShape = Schema.Struct({
  config: Schema.Struct({
    storage: Schema.Literal("file"),
    num_replicas: Schema.Literal(1),
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
    next: [],
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
      subjects: fabricSubjects,
    },
    next: [],
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
          })
        }
        throw error
      }
    },
    catch: (cause) => transportRefusal("stream.ensure", cause),
  })

  const decoded = Schema.decodeUnknownResult(StreamShape)(info)
  if (Result.isFailure(decoded)) {
    return yield* Effect.fail(streamShapeRefusal(String(decoded.failure)))
  }
  const actualSubjects = [...decoded.success.config.subjects].sort()
  const expectedSubjects = [...fabricSubjects].sort()
  if (actualSubjects.length !== expectedSubjects.length ||
    actualSubjects.some((subject, index) => subject !== expectedSubjects[index])) {
    return yield* Effect.fail(streamShapeRefusal(JSON.stringify(decoded.success.config)))
  }
})

const closeConnection = (connection: NatsConnection): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => connection.close(),
    catch: () => undefined,
  }).pipe(Effect.catch(() => Effect.void))

const acquireSubscription = (
  connection: NatsConnection,
  subject: string,
): Effect.Effect<Subscription, Refusal> =>
  Effect.tryPromise({
    try: async () => {
      const subscription = connection.subscribe(subject)
      try {
        await connection.flush()
        return subscription
      } catch (error) {
        subscription.unsubscribe()
        throw error
      }
    },
    catch: (cause) => transportRefusal("subscribe.acquire", cause),
  })

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
      const encoded = encodeEnvelope(envelope)
      if (!encoded.ok) return yield* Effect.fail(encoded.refusal)
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
      const subscription = yield* Effect.acquireRelease(
        acquireSubscription(connection, subject),
        (active) => Effect.sync(() => active.unsubscribe()),
      )
      return Stream.fromAsyncIterable(
        subscription,
        (cause) => transportRefusal("subscribe.read", cause),
      ).pipe(
        Stream.mapEffect((message): Effect.Effect<ReceivedEnvelope, Refusal> => {
          const messageId = message.headers?.get("Nats-Msg-Id") ?? ""
          const verified = verifyEnvelopeDigest(message.data, messageId)
          return verified.ok
            ? Effect.succeed({
              subject,
              envelope: verified.envelope,
              digest: verified.digest,
            })
            : Effect.fail(verified.refusal)
        }),
      )
    },
  )

  return { publish, subscribe }
})
