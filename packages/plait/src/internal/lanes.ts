/**
 * Plane: internal — private adapters serve any layer and reach back only to their own public seam.
 *
 * @module
 */
import {
  JetStreamApiCodes,
  JetStreamApiError,
  StorageType,
  jetstream,
  jetstreamManager,
  type StreamInfo,
} from "@nats-io/jetstream"
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Scope } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import type {
  DeclaredLane,
  LaneOptions,
  LaneService,
} from "../planes/Lane.js"
import { partition } from "../planes/Lane.js"
import { structuralRefusal, type Refusal } from "../truth/Refusal.js"
import { evidenceSubject } from "../kernel/Subjects.js"
import { encodeEnvelope, type Envelope } from "../kernel/Wire.js"
import { acquireConnection, transportRefusalFor } from "./transport.js"

const messageIdWindowNanos = 2 * 60 * 1_000_000_000

export const laneStreamName = (lane: DeclaredLane<unknown>, part: number): string =>
  `FLB_FAB_EV_${lane.digest}_${part}`

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "lane-transport-unavailable",
  law: "Transport absence may be retried; declared lane shape violations may not.",
  expected: "the pinned local NATS JetStream operation to be available",
  next: () => [{
    subject: "Lane.emit",
    note: "Reconnect and re-emit; F2 makes duplicate delivery harmless, and the envelope digest is the message id.",
  }],
})

const shapeRefusal = (
  lane: DeclaredLane<unknown>,
  part: number,
  subject: string,
  info: StreamInfo,
): Refusal => structuralRefusal({
  kind: "lane-substrate-shape",
  law: "Each declared (lane, partition) has one exact, file-backed R=1 stream with no count, byte, or age eviction.",
  path: ["lane", lane.digest, "partition", String(part), "stream", "config"],
  got: JSON.stringify(info.config),
  expected: {
    subjects: [subject],
    storage: StorageType.File,
    num_replicas: 1,
    max_msgs: -1,
    max_msgs_per_subject: -1,
    max_bytes: -1,
    max_age: 0,
    duplicate_window: messageIdWindowNanos,
    deny_delete: true,
    deny_purge: true,
  },
  next: [{
    subject: "Lane.emit",
    note: "Restore the declared partition stream shape before admitting evidence.",
  }],
})

const hasExpectedShape = (info: StreamInfo, subject: string): boolean => {
  const { config } = info
  return config.subjects?.length === 1 &&
    config.subjects[0] === subject &&
    config.storage === StorageType.File &&
    config.num_replicas === 1 &&
    config.max_msgs === -1 &&
    config.max_bytes === -1 &&
    config.max_age === 0 &&
    config.max_msgs_per_subject === -1 &&
    config.duplicate_window === messageIdWindowNanos &&
    config.deny_delete === true &&
    config.deny_purge === true
}

const ensurePartitionStream = Effect.fn("Lanes.ensurePartitionStream")(function* (
  connection: NatsConnection,
  lane: DeclaredLane<unknown>,
  part: number,
) {
  const subject = yield* evidenceSubject(lane.handle, part)
  const name = laneStreamName(lane, part)
  const info = yield* Effect.tryPromise({
    try: async () => {
      const manager = await jetstreamManager(connection)
      try {
        return await manager.streams.info(name)
      } catch (error) {
        if (error instanceof JetStreamApiError && error.code === JetStreamApiCodes.StreamNotFound) {
          return manager.streams.add({
            name,
            subjects: [subject],
            storage: StorageType.File,
            num_replicas: 1,
            max_msgs: -1,
            max_bytes: -1,
            max_age: 0,
            max_msgs_per_subject: -1,
            duplicate_window: messageIdWindowNanos,
            deny_delete: true,
            deny_purge: true,
          })
        }
        throw error
      }
    },
    catch: (cause) => transportRefusal("lane.stream.ensure", cause),
  })
  if (!hasExpectedShape(info, subject)) {
    return yield* shapeRefusal(lane, part, subject, info)
  }
})

export const ensureLaneStreams = Effect.fn("Lanes.ensureStreams")(function* (
  connection: NatsConnection,
  lane: DeclaredLane<unknown>,
) {
  yield* Effect.forEach(
    Array.from({ length: lane.partitions }, (_, part) => part),
    (part) => ensurePartitionStream(connection, lane, part),
    { concurrency: "unbounded", discard: true },
  )
})

export const makeLaneService = Effect.fn("Lanes.make")(function* (
  options: LaneOptions,
): Effect.fn.Return<LaneService, Refusal, Scope.Scope> {
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait-lanes",
    "lane.connection.acquire",
    transportRefusal,
  )
  const js = jetstream(connection)
  const ensured = new Set<string>()

  const emit: LaneService["emit"] = Effect.fn("Lanes.emit")(function* (
    lane,
    event,
    options,
  ) {
    const coordinate = yield* partition(lane, event)
    if (!ensured.has(lane.digest)) {
      yield* ensureLaneStreams(connection, lane)
      ensured.add(lane.digest)
    }
    const subject = yield* evidenceSubject(lane.handle, coordinate.partition)
    const envelope: Envelope = {
      v: 0,
      kind: "emit",
      lane: lane.digest,
      key: coordinate.key,
      holder: options.holder,
      body: event as WireValue,
      pins: options.pins === undefined ? [] : [...options.pins],
      ...(options.cert === undefined ? {} : { cert: options.cert }),
    }
    const encoded = yield* encodeEnvelope(envelope)
    const acknowledgement = yield* Effect.tryPromise({
      try: () => js.publish(subject, encoded.bytes, { msgID: encoded.digest }),
      catch: (cause) => transportRefusal("lane.emit", cause),
    })
    return {
      digest: encoded.digest,
      partition: coordinate.partition,
      position: acknowledgement.seq,
      duplicate: acknowledgement.duplicate,
    }
  })

  return { emit }
})
