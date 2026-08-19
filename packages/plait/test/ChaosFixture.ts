import { Effect, Reducer, Schema } from "effect"

import * as Algebra from "../src/truth/Algebra.js"
import { Digest } from "../src/truth/Digest.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import { LaneHandle } from "../src/planes/Lane.js"

export const ChaosEvent = Schema.Struct({
  tenant: Schema.String,
  ordinal: Schema.Finite,
  delta: Schema.Finite,
})
export type ChaosEvent = typeof ChaosEvent.Type

export const chaosEventSchema = Digest.make("e".repeat(64))

/** The non-idempotent commutative counter shared by parent and killed child. */
export const declareChaosCounter = (handle: LaneHandle) => Effect.gen(function* () {
  const lane = yield* Lane.declare({
    handle,
    event: ChaosEvent,
    eventSchema: chaosEventSchema,
    partitions: 2 as const,
    partitionKey: { path: ["tenant"] },
  })
  const plain = yield* Algebra.declare({
    declaration: { name: "chaos-integer-sum", version: 0 },
    reducer: Reducer.make<number>((left, right) => left + right, 0),
  })
  const earned = yield* Algebra.commutative(plain, {
    arbitrary: (seed) => seed,
    equals: Object.is,
  })
  const fold = yield* Fold.declare({
    lane,
    algebra: earned,
    contribution: {
      declaration: { name: "chaos-counter-delta", version: 0 },
      apply: (event: ChaosEvent) => event.delta,
    },
  })
  return { lane, algebra: plain, fold }
})
