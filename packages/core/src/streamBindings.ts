/**
 * The stream bindings: the batch algebra lifted onto Effect `Stream` — the
 * higher-order, backpressured, chunked world — with the SAME identity
 * discipline. The laws (test/stream.bindings.test.ts) say the lift is
 * faithful: a Stream pipeline produces equal-head output to the batch
 * pipeline (and therefore to the frozen Go pin — the wall reaches through
 * Stream), chunking is transport (rechunking never moves a head), and
 * collector ingestion via Stream equals batch ingestion.
 *
 * Division of labor, on purpose: `Xform` stays the fused per-event hot
 * path (what Go runs); `Stream` is the orchestration layer — concurrency,
 * backpressure, chunk boundaries, effectful sources and sinks. The
 * identity fold is indifferent to all of that, and that indifference is
 * exactly what makes the orchestration layer safe to vary.
 */

import { Effect, Stream } from "effect"
import type { Collector, EntityView, InvalidEntityAnchor, InvalidStreamEvent } from "./entity.ts"
import { extend, type Head, type MalformedPayload, type StreamEvent } from "./stream.ts"
import type { Xform } from "./xform.ts"

/** Lift a fused Xform pipeline onto a Stream (drop = empty substream). */
export const throughXform =
  (f: Xform) =>
  <E, R>(self: Stream.Stream<StreamEvent, E, R>): Stream.Stream<StreamEvent, E, R> =>
    Stream.flatMap(self, (e) => {
      const t = f(e)
      return t === null ? Stream.empty : Stream.succeed(t)
    })

/** The identity fold as a Stream sink: the head of everything that flowed. */
export const runHead =
  (seed: Head) =>
  <E, R>(self: Stream.Stream<StreamEvent, E, R>): Effect.Effect<Head, E, R> =>
    Stream.runFold(self, () => seed, extend)

/** Collector ingestion as a Stream sink: anchors of everything that flowed. */
export const runCollect =
  (collector: Collector) =>
  <E, R>(
    self: Stream.Stream<StreamEvent, E, R>,
  ): Effect.Effect<
    ReadonlyArray<EntityView>,
    E | MalformedPayload | InvalidStreamEvent | InvalidEntityAnchor,
    R
  > =>
    Effect.map(
      Stream.runForEach(self, (e) => Effect.asVoid(collector.ingest(e))),
      () => collector.anchors().map((a) => collector.entity(a.key)!),
    )
