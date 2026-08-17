import { Effect, Reducer, Schema } from "effect"

import * as Algebra from "../src/Algebra.js"
import { Digest } from "../src/Digest.js"
import * as Fold from "../src/Fold.js"
import * as Lane from "../src/Lane.js"

export const ChaosEvent = Schema.Struct({
  tenant: Schema.String,
  ordinal: Schema.Number,
  delta: Schema.Number,
})
export type ChaosEvent = typeof ChaosEvent.Type

export const chaosEventSchema = Digest.make("e".repeat(64))

/** The non-idempotent commutative counter shared by parent and killed child. */
export const declareChaosCounter = (handle: string) => Effect.gen(function* () {
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
    cases: Array.from({ length: 32 }, (_, value) => ({
      left: value - 16,
      middle: value,
      right: 16 - value,
    })),
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
