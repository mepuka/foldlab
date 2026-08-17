import type { Effect } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/Refusal.js"

class OverloadFirstError extends Schema.TaggedError<OverloadFirstError>()(
  "OverloadFirstError",
  {},
) {}

interface FourSignatureOperation {
  (input: string): Effect.Effect<string, OverloadFirstError>
  (input: number): Effect.Effect<string, Refusal>
  (input: boolean): Effect.Effect<string, Refusal>
  (input: Date): Effect.Effect<string, Refusal>
}

/** A newly exported overload hides its non-Refusal error in the first signature. */
export declare const plantedPublicApi: {
  readonly Overloaded: {
    readonly read: FourSignatureOperation
  }
}
