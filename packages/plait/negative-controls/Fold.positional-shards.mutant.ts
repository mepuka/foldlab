/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A fold declared over a partitioned lane at an algebra that earned nothing.
 * Partitioning erases the order across partitions, so the fold reads the
 * multiset presentation; an algebra whose order of arrival matters has no
 * meaning there. The door already refuses this at runtime; this control is the
 * claim that the spelling never reaches the door.
 *
 * The lawful twin below compiles, so the failure is the unearned rung and not
 * the shape of the call around it.
 */
import { declare, type Contribution } from "../src/planes/Fold.js"
import type { DeclaredLane } from "../src/planes/Lane.js"
import type { Algebra, CommutativeMonoid, DeclaredAlgebra } from "../src/truth/Algebra.js"

interface Reading {
  readonly tenant: string
  readonly delta: number
}

declare const shardedLane: DeclaredLane<Reading, 4>
declare const counting: Algebra<number, CommutativeMonoid>
declare const positional: DeclaredAlgebra<number>
declare const contribution: Contribution<Reading, number>

/** The witness: the same lane at an algebra whose order of arrival does not matter. */
export const lawful = declare({ lane: shardedLane, algebra: counting, contribution })

/** The planted spelling: four partitions merged by an algebra that earned no law. */
export const planted = declare({ lane: shardedLane, algebra: positional, contribution })
