import type {
  AssertNever,
  BoundSurfaceViolations,
  PublicApi,
} from "../test/PublicEffects.typecheck.js"

/**
 * Plant: the DEV-722 mutation — the walk's quantifier narrowed to nothing.
 * Every carrier the walk would have reached is gone, so the violation union is
 * empty and the assertion passes on merit unless the vacuity guard's
 * refuse-empty law fires first.
 */
export type EmptyQuantifierMustConform = AssertNever<
  BoundSurfaceViolations<Pick<PublicApi, never>>
>
