/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A positional algebra asked to read the set plane. The set plane forgets both
 * order and multiplicity, so a fold may read it only when its algebra respects
 * both erasures; an algebra that earned no law respects neither.
 *
 * What this control proves and what it does not: the read site is declared here
 * rather than imported, because no shipped function takes a quotient yet. The
 * claim is that the exported rule routes - `Reads` refuses a quotient deeper
 * than the laws allow - not that some package function enforces it today.
 *
 * The lawful twin below compiles, so the failure is the quotient and not the
 * shape of the call around it.
 */
import type {
  Algebra,
  BoundedSemilattice,
  DeclaredAlgebra,
  LawSet,
  Reads,
} from "../src/truth/Algebra.js"

/** The rung⇒carrier rule at a call site: a read is bounded by what the laws respect. */
declare function readFrom<State, Laws extends LawSet, Quotient extends Reads<Laws>>(
  algebra: Algebra<State, Laws>,
  quotient: Quotient,
): State

declare const membership: Algebra<ReadonlyArray<string>, BoundedSemilattice>
declare const positional: DeclaredAlgebra<number>

/** The witness: a set-plane read at an algebra where duplicates are free. */
export const lawful = readFrom(membership, "set")

/** The planted spelling: the same read where a redelivery would change the state. */
export const planted = readFrom(positional, "set")
