import type { Effect } from "effect"
import { Schema } from "effect"

import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class EffectValueError extends Schema.TaggedError<EffectValueError>()(
  "EffectValueError",
  {},
) {}

/** A newly exported Effect value carries a non-Refusal error. */
declare const plantedEffectValue: Effect.Effect<void, EffectValueError>
declare const plantedPublicApi: {
  readonly Tasks: {
    readonly running: typeof plantedEffectValue
  }
}

export type EffectValueMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
