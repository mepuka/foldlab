import type { Effect } from "effect"
import { Schema } from "effect"

import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class CurriedOperationError extends Schema.TaggedError<CurriedOperationError>()(
  "CurriedOperationError",
  {},
) {}

/** A new data-last operation hides its Effect behind two function layers. */
declare const plantedPublicApi: {
  readonly Curried: {
    readonly read: (subject: string) => (
      limit: number,
    ) => Effect.Effect<string, CurriedOperationError>
  }
}

export type CurriedOperationMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
