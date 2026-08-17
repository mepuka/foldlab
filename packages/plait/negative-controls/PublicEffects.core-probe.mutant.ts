import type {
  AssertNever,
  BoundSurfaceViolations,
  PublicApi,
} from "../test/PublicEffects.typecheck.js"

/**
 * Plant: a fallible member authored in the sibling workspace package
 * `@foldlab/core`, surfaced through the whole real barrel.
 *
 * This is DECISIONS T7's externally-authored class. The emitted-declaration
 * walk's authorship filter is this package's own emitted `src`, so it is silent
 * here by construction; the type-level walk is the mechanism that owns the
 * class, and this control is its executable witness.
 */
declare const plantedPublicApi: PublicApi & {
  readonly CoreProbe: typeof import(
    "../../core/negative-controls/plait-public-surface-probe.js"
  )
}

export type CoreProbeMustConform = AssertNever<
  BoundSurfaceViolations<typeof plantedPublicApi>
>
