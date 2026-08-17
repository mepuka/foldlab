import type { Effect } from "effect"
import { Schema } from "effect"

import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class PlainClassError extends Schema.TaggedError<PlainClassError>()(
  "PlainClassError",
  {},
) {}

declare class AddedClass {
  static readonly load: () => Effect.Effect<string, PlainClassError>
}

/** A newly exported plain class adds a fallible static operation. */
declare const plantedPublicApi: {
  readonly Classes: {
    readonly Added: typeof AddedClass
  }
}

export type PlainClassMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
