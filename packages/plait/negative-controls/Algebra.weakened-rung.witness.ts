/**
 * MUTATION ARM - this file must typecheck, and that is the whole point.
 *
 * Three controls beside this one refuse three unlawful spellings. A refusal
 * proves nothing on its own: a control can fail because its file rotted rather
 * than because a rung is load-bearing. So this file plants the SAME three
 * spellings against a weakened rule - the quotient bound dropped to `LawSet`,
 * which every algebra satisfies - and asserts they compile. What that isolates
 * is the rung: everything else about the three spellings is well-formed, so a
 * control that fails is failing on the law and not on its own spelling.
 *
 * The other half - that the SHIPPED rule is the one doing the work - is the
 * runner's own shape: weaken `LawsFor` or `Reads` in `src/truth/Algebra.ts` and
 * the planted spellings typecheck, which the runner reports by name rather than
 * absorbing. That was measured against both rules when the arm landed.
 */
import { declare, type Contribution } from "../src/planes/Fold.js"
import type { DeclaredLane } from "../src/planes/Lane.js"
import type {
  Algebra,
  CommutativeMonoid,
  DeclaredAlgebra,
  LawSet,
  Quotient,
} from "../src/truth/Algebra.js"

interface Reading {
  readonly tenant: string
  readonly delta: number
}

/** The weakened rule: a read bounded by nothing, which is the pre-ladder surface. */
declare function readFromWeakened<State, Laws extends LawSet, Q extends Quotient>(
  algebra: Algebra<State, Laws>,
  quotient: Q,
): State

/** The weakened door: a fold declaration that asks its algebra for no law. */
declare function declareWeakened<Event, State, const Partitions extends number>(
  options: {
    readonly lane: DeclaredLane<Event, Partitions>
    readonly algebra: DeclaredAlgebra<State>
    readonly contribution: Contribution<Event, State>
  },
): ReturnType<typeof declare>

declare const shardedLane: DeclaredLane<Reading, 4>
declare const counting: Algebra<number, CommutativeMonoid>
declare const positional: DeclaredAlgebra<number>
declare const contribution: Contribution<Reading, number>

/** Fold.positional-shards, un-refused: four partitions at an algebra with no law. */
export const shards = declareWeakened({
  lane: shardedLane,
  algebra: positional,
  contribution,
})

/** Algebra.set-plane-read, un-refused: a positional algebra reading the set plane. */
export const positionalSetRead = readFromWeakened(positional, "set")

/** Algebra.counting-join, un-refused: a count reading the set plane. */
export const countingSetRead = readFromWeakened(counting, "set")
