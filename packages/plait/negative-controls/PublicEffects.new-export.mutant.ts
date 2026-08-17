import type { Effect } from "effect"
import { Schema } from "effect"

import type {
  AssertNever,
  PublicSurfaceViolations,
} from "../test/PublicEffects.typecheck.js"

class NewExportError extends Schema.TaggedError<NewExportError>()(
  "NewExportError",
  {},
) {}

/** Plant B: a newly exported Effect operation carries a non-Refusal error. */
declare const plantedPublicApi: {
  readonly Subjects: {
    readonly clusterSubject: (
      token: string,
    ) => Effect.Effect<string, NewExportError>
  }
}

export type NewExportMustConform = AssertNever<
  PublicSurfaceViolations<typeof plantedPublicApi>
>
