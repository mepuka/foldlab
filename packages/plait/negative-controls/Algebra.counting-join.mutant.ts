/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A counting monoid asked to read the set plane. Order of arrival does not
 * matter to a count, so the multiset presentation is lawful for it; hearing the
 * same observation twice is not the same as hearing it once, so the set plane
 * is not. This is the row the ladder exists to catch: the rung above the one a
 * count earns is exactly the rung that makes redelivery free.
 *
 * The lawful twin below compiles at the multiset presentation, so the failure
 * is the missing idempotence and not the algebra being unbranded.
 */
import type {
  Algebra,
  CommutativeMonoid,
  LawSet,
  Reads,
} from "../src/truth/Algebra.js"

/** The rung⇒carrier rule at a call site: a read is bounded by what the laws respect. */
declare function readFrom<State, Laws extends LawSet, Quotient extends Reads<Laws>>(
  algebra: Algebra<State, Laws>,
  quotient: Quotient,
): State

declare const counting: Algebra<number, CommutativeMonoid>

/** The witness: the deepest quotient a count respects, and it is not the set plane. */
export const lawful = readFrom(counting, "multiset")

/** The planted spelling: a redelivered observation counted twice. */
export const planted = readFrom(counting, "set")
