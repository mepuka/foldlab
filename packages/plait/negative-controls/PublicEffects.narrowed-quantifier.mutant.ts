import type {
  AssertNever,
  BoundSurfaceViolations,
  PublicApi,
} from "../test/PublicEffects.typecheck.js"

/**
 * Plant: the quantifier narrowed to one clean export. Refuse-empty admits it —
 * the surface is inhabited — so only the bound witness can refuse a walk that
 * silently stopped covering the rest of the barrel.
 */
export type NarrowedQuantifierMustConform = AssertNever<
  BoundSurfaceViolations<Pick<PublicApi, "Subjects">>
>
