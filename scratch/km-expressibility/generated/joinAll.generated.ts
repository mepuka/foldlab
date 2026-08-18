/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Artifact: scratch/km-expressibility/term.ts
 * Command:  bun scratch/km-expressibility/emit.ts
 * Term:     2dda26cb2435a3aed5e055f4169b05345bdb6c1ddeee6187779428e792d5b28e
 *
 * EXEMPLAR ONLY — wired into nothing, imported by nothing, gated by nothing.
 *
 * The fluent surface one declared term projects into TypeScript. Zero imports
 * on purpose: it type-checks alone under `--strict` with no config, so the
 * must-not-compile controls at the foot are load-bearing rather than
 * decorative.
 *
 * @module
 */

// -- The law atoms, emitted from the corpus `law` rows ----------------------

declare const ASSOCIATIVE: unique symbol
/** (a ∘ b) ∘ c = a ∘ (b ∘ c) — order of grouping does not matter. */
type Associative = { readonly [ASSOCIATIVE]: true }

declare const COMMUTATIVE: unique symbol
/** a ∘ b = b ∘ a — order of arrival does not matter. */
type Commutative = { readonly [COMMUTATIVE]: true }

declare const IDEMPOTENT: unique symbol
/** a ∘ a = a — saying it twice is saying it once. */
type Idempotent = { readonly [IDEMPOTENT]: true }

declare const IDENTITY: unique symbol
/** e ∘ a = a = a ∘ e — there is a starting value that changes nothing. */
type Identity = { readonly [IDENTITY]: true }

declare const BOUNDED: unique symbol
/** e ≤ a for every a (e is ⊥ under ∘) — the starting value is below everything. */
type Bounded = { readonly [BOUNDED]: true }

// -- The rung bundles, emitted from the corpus `rung` rows -------------------

/** duplicate-safe: associative, commutative, idempotent, identity, bounded. */
type BoundedSemilattice = Associative & Commutative & Idempotent & Identity & Bounded

/** order-free: associative, commutative, identity. */
type CommutativeMonoid = Associative & Commutative & Identity

type LawSet = Partial<Associative & Commutative & Idempotent & Identity & Bounded>

// -- The carrier ------------------------------------------------------------

declare const REFUSAL: unique symbol

/** The typed absence a carrier answers with; never a throw across the seam. */
interface Refusal {
  readonly [REFUSAL]: true
}

/** Stand-in for the pinned Effect's `Effect<A, E>`; this file imports nothing. */
interface Effect<out A, out E> {
  readonly _A?: () => A
  readonly _E?: () => E
}

interface CellCore<State> {
  readonly cell: string
  readonly read: () => State
}

/** A cell carries its algebra's earned law set in its own type. */
type Cell<State, Laws extends LawSet> = CellCore<State> & Laws

// -- The affordance ---------------------------------------------------------

/**
 * joinAll: s ↦ s ∨ (⋁ contributions) — ∨: (a ∨ b) ∨ c = a ∨ (b ∨ c); a ∨ b =
 * b ∨ a; a ∨ a = a. Derived order: a ≤ b ⟺ a ∨ b = b.
 *
 * what is known here comes to include at least the join of the contributions
 * in the batch.
 *
 * any grouping, any order, any duplication of the batch gives one result —
 * so batching is free and needs no ordering discipline.
 *
 * Denotes the shipped composition: `Cells.merge` over `casJoinLoop`
 * (packages/plait/src/internal/cas.ts) at the observation cell, join
 * `cellJoin`, discipline `lawfulMergeDiscipline`, attempt bound 8,
 * contention refused as `cell-update-contended`.
 *
 * Bound: convergence on success is F1's, never the loop's; completion is not
 * claimed, and an exhausted attempt bound refuses cell-update-contended.
 *
 * Licensed by f1_cell_merge_aci, f1_history_convergence (verify/fabric),
 * instantiated at the observation cell by f1_cell_join_semilattice. rung:
 * bounded-semilattice; evidence: donor.
 */
declare function joinAll<State>(
  cell: Cell<State, BoundedSemilattice>,
  contributions: ReadonlyArray<State>,
): Effect<Cell<State, BoundedSemilattice>, Refusal>

// -- Controls ---------------------------------------------------------------

declare const observationCell: Cell<ReadonlyArray<string>, BoundedSemilattice>
declare const observations: ReadonlyArray<ReadonlyArray<string>>
declare const countCell: Cell<number, CommutativeMonoid>
declare const counts: ReadonlyArray<number>

/** Positive: the observation cell earned the rung, so the whole batch is one call. */
export const batched = joinAll(observationCell, observations)

// @ts-expect-error — joinAll demands idempotence and a bound; the count
// cell is only order-free, so a redelivered batch double-counts.
export const doubleCounted = joinAll(countCell, counts)

// @ts-expect-error — a contribution is a state of the cell's own carrier; a batch
// of another sort has no join with what is already known.
export const crossSort = joinAll(observationCell, counts)
