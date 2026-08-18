/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A fold declared over a lane whose partition count is known only as a union.
 * A lane that might have four partitions might erase order across them, so the
 * only quotient true for every member of the union is the multiset one, and the
 * algebra owes that rung. Read distributively the bound would be a union too,
 * and a union of bounds is satisfied by its weakest arm — which is how an
 * algebra that earned nothing served a lane that might shard.
 *
 * The lawful twin below compiles, so the failure is the unearned rung and not
 * the union in the lane type.
 */
import { declare, type Contribution } from "../src/planes/Fold.js"
import type { DeclaredLane } from "../src/planes/Lane.js"
import type { Algebra, CommutativeMonoid, DeclaredAlgebra } from "../src/truth/Algebra.js"

interface Reading {
  readonly tenant: string
  readonly delta: number
}

declare const maybeShardedLane: DeclaredLane<Reading, 1 | 4>
declare const counting: Algebra<number, CommutativeMonoid>
declare const positional: DeclaredAlgebra<number>
declare const contribution: Contribution<Reading, number>

/** The witness: the same union lane at an algebra that earned the rung it may need. */
export const lawful = declare({ lane: maybeShardedLane, algebra: counting, contribution })

/** The planted spelling: a lane that might shard, merged by an algebra with no law. */
export const planted = declare({ lane: maybeShardedLane, algebra: positional, contribution })
