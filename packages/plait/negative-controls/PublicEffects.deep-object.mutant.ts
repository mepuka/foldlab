import type { Effect } from "effect"
import { Schema } from "effect"

import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class DeepSurfaceError extends Schema.TaggedError<DeepSurfaceError>()(
  "DeepSurfaceError",
  {},
) {}

/** A new operation is nested below two plain-object levels. */
declare const plantedPublicApi: {
  readonly Diagnostics: {
    readonly nested: {
      readonly open: () => Effect.Effect<void, DeepSurfaceError>
    }
  }
}

export type DeepObjectMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
