import type { Effect } from "effect"
import { Schema } from "effect"

import type { Refusal } from "../src/truth/Refusal.js"

class SchemaDeclarationError extends Schema.TaggedError<SchemaDeclarationError>()(
  "SchemaDeclarationError",
  {},
) {}

/** A package-authored Schema extension adds a fallible operation beside vendor members. */
export declare const plantedPublicApi: {
  readonly Schemas: {
    readonly Added: typeof Schema.String & {
      readonly decode: (input: unknown) => Effect.Effect<string, SchemaDeclarationError>
    }
  }
  readonly safe: () => Effect.Effect<void, Refusal>
}
