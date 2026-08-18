/*
 * EXEMPLAR ONLY — wired into nothing, gated by nothing, imported by nothing.
 *
 * A standalone demonstration that the KM-17 rung ladder can be carried as
 * phantom type constraints in the estate's pinned TypeScript, so that the
 * routing the design claims ("join elaborates only at semilattice-branded
 * carriers; partition merge demands commutative-or-better") is a
 * COMPILE-TIME fact rather than a runtime check.
 *
 * Written from docs/design/2026-08-18-km-algebraic-register.md. Zero imports,
 * strict mode, in the idiom of verify/kernel/projections/kernel.ts: the
 * `@ts-expect-error` lines are the must-not-compile controls, so this file
 * type-checks only if each of them FAILS to.
 *
 * Nothing here is generated yet. In the shipped design every declaration
 * below comes out of the conformance corpus's `rung` and `algebra` record
 * groups; this file is what generation owes.
 */

/* ── 1. Laws are the brand atoms; rungs are named bundles ───────────── */

declare const TOTAL: unique symbol
declare const ASSOC: unique symbol
declare const IDENTITY: unique symbol
declare const COMM: unique symbol
declare const IDEM: unique symbol
declare const BOUND: unique symbol
declare const INVERSE: unique symbol

/** Closure/totality: combine is a total function into the carrier. */
type Total = { readonly [TOTAL]: true }
/** (a∘b)∘c = a∘(b∘c). */
type Assoc = { readonly [ASSOC]: true }
/** e∘a = a = a∘e. */
type Identity = { readonly [IDENTITY]: true }
/** a∘b = b∘a. */
type Comm = { readonly [COMM]: true }
/** a∘a = a. */
type Idem = { readonly [IDEM]: true }
/** e is the bottom of the derived order: e ≤ a for every a. */
type Bound = { readonly [BOUND]: true }
/** every a has an a⁻¹ with a∘a⁻¹ = e. */
type Inverse = { readonly [INVERSE]: true }

/** Any earned law set. The brand carrier for every rung below. */
type LawSet = Partial<Total & Assoc & Identity & Comm & Idem & Bound & Inverse>

/** The five ladder rungs plus the two that sit beside it. */
type RungName =
  | 'magma'
  | 'monoid'
  | 'commutative-monoid'
  | 'bounded-semilattice'
  | 'group'
  | 'abelian-group'

/** Rung obligations, as law sets. Climbing adds laws; the class of
 *  algebras meeting them shrinks. `group` leaves the chain at `monoid`. */
type Magma = Total
type Monoid = Total & Assoc & Identity
type CommutativeMonoid = Monoid & Comm
type BoundedSemilattice = CommutativeMonoid & Idem & Bound
type Group = Monoid & Inverse
type AbelianGroup = CommutativeMonoid & Inverse

/* ── 2. Declared algebras carry their earned law set in the type ────── */

declare const KIND: unique symbol
type Digest<K extends string> = string & { readonly [KIND]: K }

/** Canonical, opaque here. */
type Value = string & { readonly __value?: true }

interface AlgebraCore<State> {
  readonly algebra_digest: Digest<'algebra'>
  /** The rung NAME, carried as data for the wire and the prose register. */
  readonly rung: RungName
  readonly initial: State
  readonly combine: (left: State, right: State) => State
}

/** A declared algebra branded with exactly the laws its suite earned. */
type Algebra<State, Laws extends LawSet> = AlgebraCore<State> & Laws

/* ── 3. The rung meet — the product combinator's inherited brand ───── */

/** The law set a product algebra earns: exactly the laws BOTH factors
 *  carry. Equational classes are closed under products (Birkhoff), and a
 *  product satisfies an equation iff both factors do — so the brand is the
 *  intersection, computed here rather than asserted. */
type Meet<A extends LawSet, B extends LawSet> = Pick<A, Extract<keyof A, keyof B>>

/* ── 4. Carriers inherit the brand of the algebra they were declared at ─ */

interface CellCore<State> {
  readonly cell_digest: Digest<'resource'>
  readonly algebra_digest: Digest<'algebra'>
  readonly read: () => State
}

/** A lattice carrier. Its brand is its algebra's brand, so a cell cannot
 *  exist at an algebra weaker than its own writes require. */
type Cell<State, Laws extends LawSet> = CellCore<State> & Laws

declare function declareCell<State, Laws extends LawSet>(
  algebra: Algebra<State, Laws>,
): Cell<State, Laws>

/* ── 5. The rights, routed by rung ──────────────────────────────────── */

/** join — licensed by the bounded-semilattice rung. ACI plus a bound is
 *  what makes the derived order a join-semilattice, and idempotence is
 *  what makes duplicate delivery free. Donor: join_semilattice_of_aci. */
declare function join<State>(
  cell: Cell<State, BoundedSemilattice>,
  contribution: State,
): Cell<State, BoundedSemilattice>

/** partition merge — licensed by the commutative-monoid rung, and by
 *  nothing weaker. Donor: f4_partition_fold. */
declare function partitionFold<State>(
  algebra: Algebra<State, CommutativeMonoid>,
  partitions: readonly (readonly State[])[],
): State

/** sequential fold — the magma rung suffices; exactness across
 *  redelivery is F2b's successor discipline, not the algebra's. */
declare function sequentialFold<State>(
  algebra: Algebra<State, Magma>,
  events: readonly State[],
): State

/** windowed difference — licensed by inverses, and only by inverses.
 *  This subtracts two FOLDED STATES; it does not un-emit evidence. */
declare function windowDifference<State>(
  algebra: Algebra<State, Group>,
  whole: State,
  prefix: State,
): State

/* ── 6. The three combinators ───────────────────────────────────────── */

/** product — the pair algebra, brand inherited as the meet. */
declare function product<A, B, LA extends LawSet, LB extends LawSet>(
  left: Algebra<A, LA>,
  right: Algebra<B, LB>,
): Algebra<readonly [A, B], Meet<LA, LB>>

/** A finished reading. Deliberately NOT an algebra and deliberately not
 *  assignable to one: no combine, no laws, no carrier brand. Averages
 *  cannot be merged because there is nothing to merge them with. */
interface Finished<Out> {
  readonly finished_of: Digest<'algebra'>
  readonly out: Out
}

/** present — the finishing projection. Read-time only. */
declare function present<State, Laws extends LawSet, Out>(
  algebra: Algebra<State, Laws>,
  phi: (state: State) => Out,
): (state: State) => Finished<Out>

/** Declared error bounds, carried as data inside the digest. */
interface ErrorBounds {
  readonly relative_error_ppm: number
  readonly confidence_ppm: number
  readonly register_count: number
}

/** A reading that is approximate BY DECLARATION, in its own sort so it
 *  cannot silently stand in for an exact one. */
interface Approximate<Out> {
  readonly approximate: Out
  readonly bounds: ErrorBounds
}

/** sketch — same rung, declared inexactness, distinct answer sort. */
type Sketch<State, Laws extends LawSet> = Algebra<State, Laws> & {
  readonly bounds: ErrorBounds
}

declare function sketch<State, Laws extends LawSet>(
  algebra: Algebra<State, Laws>,
  bounds: ErrorBounds,
): Sketch<State, Laws>

declare function readExact<Out>(reading: Finished<Out>): Out
declare function readApproximate<Out>(reading: Approximate<Out>): Out

/* ── 7. The measurement catalog, six named rows ─────────────────────── */

declare const count: Algebra<number, CommutativeMonoid>
declare const sum: Algebra<number, AbelianGroup>
declare const max: Algebra<number, BoundedSemilattice>
declare const distinctSet: Algebra<readonly string[], BoundedSemilattice>
declare const hll: Sketch<readonly number[], BoundedSemilattice>
declare const histogram: Algebra<readonly number[], CommutativeMonoid>
declare const firstWriteWins: Algebra<Value, Magma>

/* ── 8. Positive controls — the lawful compositions elaborate ───────── */

const maxCell = declareCell(max)
export const joined = join(maxCell, 42)

const setCell = declareCell(distinctSet)
export const unioned = join(setCell, ['a', 'b'])

const hllCell = declareCell(hll)
export const sketched = join(hllCell, [0, 3, 1])

export const countedAcrossShards = partitionFold(count, [[1, 1], [1]])
export const summedAcrossShards = partitionFold(sum, [[7], [9, 2]])
export const bucketedAcrossShards = partitionFold(histogram, [[[1, 0]], [[0, 2]]])

export const sequential = sequentialFold(firstWriteWins, [])
export const lastHour = windowDifference(sum, 100, 60)

/** average = (sum × count) presented by division. The product's rung is
 *  the meet — abelian group ∧ commutative monoid = commutative monoid —
 *  so an average's carrier is shard-mergeable and NOT cell-joinable. */
export const sumAndCount = product(sum, count)
export const averageShards = partitionFold(sumAndCount, [[[7, 1]], [[9, 2]]])
export const average = present(sumAndCount, ([s, n]) => (n === 0 ? 0 : s / n))
export const averageReading = readExact(average([16, 3]))

/* ── 9. Must-not-compile controls — the unlawful compositions refuse ── */

const countCell = declareCell(count)
// @ts-expect-error — join demands idempotence and a bound; count is a
// commutative monoid, so a duplicate delivery would double-count.
export const doubleCounted = join(countCell, 1)

const histogramCell = declareCell(histogram)
// @ts-expect-error — pointwise sum is not idempotent either; the bucket
// vector is shard-mergeable but not a lattice.
export const doubleBucketed = join(histogramCell, [1, 0])

// @ts-expect-error — partition merge demands commutative-or-better; a
// magma has no identity, no associativity, and no commutativity.
export const shardedMagma = partitionFold(firstWriteWins, [[], []])

// @ts-expect-error — inverses are earned, not assumed; max has none.
export const undoMax = windowDifference(max, 9, 4)

// @ts-expect-error — a finished reading is not an algebra: nobody merges
// averages, because an average has no merge to be called.
export const mergedAverages = partitionFold(average, [[], []])

// @ts-expect-error — the average carrier lost idempotence at the meet, so
// it cannot be a cell either.
export const averageCell = join(declareCell(sumAndCount), [1, 1])

declare const cardinalityEstimate: Approximate<number>
// @ts-expect-error — an approximate reading is not an exact one.
export const exactFromSketch = readExact(cardinalityEstimate)
export const honestEstimate = readApproximate(cardinalityEstimate)

/* ── 10. Implementation resolution — the Layer channel, sketched ────── */

/**
 * Two tiers, because TypeScript can carry one honestly and not the other.
 *
 * Tier 1 (compile-time): the standard library's algebras are cataloged at
 * generation time, so each gets its own generated service tag. A program
 * that folds `count` names `CountAlgebra` in its requirements, and a
 * runtime that never provided the measurement layer fails to typecheck.
 *
 * Tier 2 (run-time): an agent-declared algebra's digest is not known at
 * generation time, so it resolves through the one `Algebras` service and an
 * unprovided digest is a taught refusal, never a type error. Stated as a
 * bound rather than papered over.
 */
interface AlgebraImpl<State> {
  readonly initial: State
  readonly combine: (left: State, right: State) => State
}

interface AlgebraCatalog {
  /** Refuses `unresolved-algebra` when the digest is not provided. */
  readonly resolve: <State>(
    digest: Digest<'algebra'>,
  ) => AlgebraImpl<State> | { readonly refusal: 'unresolved-algebra' }
}

/** Tier-1 generated tags, one per cataloged standard measurement. */
interface CountAlgebraService { readonly impl: AlgebraImpl<number> }
interface MaxAlgebraService { readonly impl: AlgebraImpl<number> }

/** A program's requirements: the union of the service tags its pinned
 *  algebras imply, exactly as Effect's `R` channel already works. */
type Requires<R> = { readonly __requires?: R }

declare function runCountFold(): Requires<CountAlgebraService | AlgebraCatalog>
declare function provideMeasurements<R>(
  program: Requires<R>,
): Requires<Exclude<R, CountAlgebraService | MaxAlgebraService>>

/** After providing the generated measurement layer, only the open catalog
 *  remains — the same `Exclude` arithmetic Effect's `provide` performs. */
export const remaining: Requires<AlgebraCatalog> = provideMeasurements(runCountFold())
