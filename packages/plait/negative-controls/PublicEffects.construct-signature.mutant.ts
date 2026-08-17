import type { Effect } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/Refusal.js"

class ConstructSignatureError extends Schema.TaggedError<ConstructSignatureError>()(
  "ConstructSignatureError",
  {},
) {}

interface ConstructorOnly {
  new(): {
    readonly run: () => Effect.Effect<string, ConstructSignatureError>
    readonly safe: () => Effect.Effect<string, Refusal>
  }
}

/** A newly exported construct-only value hides a fallible operation in its result. */
export declare const plantedPublicApi: {
  readonly Constructors: {
    readonly Added: ConstructorOnly
  }
}
