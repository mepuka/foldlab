/** The pure fold lifted onto Effect Stream; chunks remain transport only. */

import { Effect, Stream } from "effect"
import type { FoldState } from "./algebra.ts"
import type { Fold } from "./fold.ts"

/** Rechunk invariance licenses the stream sink as the same fold over any chunking. */
export const runFold =
  <Event, A extends FoldState>(fold: Fold<Event, A>) =>
  <Error, Requirements>(
    self: Stream.Stream<Event, Error, Requirements>,
  ): Effect.Effect<A, Error, Requirements> =>
    Stream.runFold(self, () => fold.empty, fold.extend)
