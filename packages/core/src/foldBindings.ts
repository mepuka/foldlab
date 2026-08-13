/**
 * The pure fold lifted onto Effect's Stream. Chunking is transport: it decides
 * how events travel, never what they mean, and nothing in this file is allowed
 * to let one show through in an answer.
 */

import { Effect, Stream } from "effect"
import type { FoldState } from "./algebra.ts"
import type { Fold } from "./fold.ts"

/**
 * Runs a fold over a stream and returns the accumulated result.
 *
 * The sink starts from the fold's neutral value and adds one event at a time in
 * stream order, so the same events delivered in different chunk sizes — or one
 * at a time — give the same answer; rechunking a stream can never move a
 * result. The fold adds no failure of its own, so the effect fails only where
 * the stream does, with the stream's own failure unchanged.
 */
export const runFold =
  <Event, A extends FoldState>(fold: Fold<Event, A>) =>
  <Error, Requirements>(
    self: Stream.Stream<Event, Error, Requirements>,
  ): Effect.Effect<A, Error, Requirements> =>
    Stream.runFold(self, () => fold.empty, fold.extend)
