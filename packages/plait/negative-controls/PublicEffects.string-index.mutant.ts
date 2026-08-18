import type { Effect } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/truth/Refusal.js"

class StringIndexError extends Schema.TaggedError<StringIndexError>()(
  "StringIndexError",
  {},
) {}

/** A newly exported registry hides fallible operations behind a string index. */
export declare const plantedPublicApi: {
  readonly Registry: {
    readonly [name: string]: () => Effect.Effect<string, StringIndexError>
  }
  readonly safe: () => Effect.Effect<void, Refusal>
}
