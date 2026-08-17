import type { Effect } from "effect"
import { Schema } from "effect"

import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class SchemaDecodeError extends Schema.TaggedError<SchemaDecodeError>()(
  "SchemaDecodeError",
  {},
) {}

/** A newly exported schema-shaped value adds a fallible decode operation. */
declare const plantedPublicApi: {
  readonly Schemas: {
    readonly Added: typeof Schema.String & {
      readonly decode: (input: unknown) => Effect.Effect<string, SchemaDecodeError>
    }
  }
}

export type SchemaValueMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
