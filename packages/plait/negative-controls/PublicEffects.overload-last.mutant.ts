import type { Effect } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/truth/Refusal.js"

class OverloadLastError extends Schema.TaggedError<OverloadLastError>()(
  "OverloadLastError",
  {},
) {}

interface FourSignatureOperation {
  (input: string): Effect.Effect<string, Refusal>
  (input: number): Effect.Effect<string, Refusal>
  (input: boolean): Effect.Effect<string, Refusal>
  (input: Date): Effect.Effect<string, OverloadLastError>
}

/** A newly exported overload exposes its non-Refusal error in the last signature. */
export declare const plantedPublicApi: {
  readonly Overloaded: {
    readonly read: FourSignatureOperation
  }
}
