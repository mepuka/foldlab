# The analysis algebra — phases, measures, and structures

Status: AGREED 2026-08-28 (operator, this session): the functional
model of the rung pipeline, the measure inventory, and the staged
structure plan. Companions: the rung services (`src/rung/`), the
form-register spec, and the differential-testing spec (the laws tier
lands as T11 there in spirit, `test/T11-laws.test.ts` in fact).

## 1. The phase algebra

```
resolve   : Source → Option<Bindings>          rung 0 — total; None is the early exit
linearize : Source → [Line]                    unfold; Line = (sym, depth, indent) @ byte offset
spans     : [Line] → [Span]                    SEGMENTED FOLD — adjacent anchored lines merge
                                               under a semigroup (max score, max depth, extend)
parse     : Source → Option<AST>               partial by R12; None = abstain
hits      : AST → [Hit]                        depth-indexed tree fold (foldMap over nodes)
annotate  : ([Span], [Hit]) → [Span ⋉ Hit]     ORDERED MERGE on byte position, never nested filter
reading   : evidence → Reading                 ONE foldMap into a PRODUCT MONOID
census    : [Reading] → Census                 foldMap again, one level up — commutative merge
```

Spans are the join key between rungs (operator ruling); byte position
is the universal index every phase shares.

## 2. The measure inventory — every rollup names its algebra

| rollup | algebraic object |
| --- | --- |
| construct/port/wiring counts | sum monoids |
| covered, offUniverse, canary sets, imports | sorted-set union monoids |
| span construction | semigroup on adjacent anchored segments |
| black-box spans | list monoid (position-sorted at assembly) |
| **generation verdict** | **4-point join-semilattice**: `indeterminate ⊑ v4`, `indeterminate ⊑ pre-v4`, both `⊑ mixed` — the verdict IS the join of per-evidence contributions |

Reading = foldMap of evidence into the product of these. Consequences,
each one free: parallel splits (associativity), streaming (the corpus
pass is `Stream.run` into a product `Sink`), incrementality, and —
decisive for this estate — **the laws are testable**: associativity,
identity, commutativity where claimed, lattice idempotence, and
split-vs-whole agreement (`foldMap(xs ++ ys) = combine(foldMap xs,
foldMap ys)`) run as property tests in `T11-laws.test.ts`. A verdict
computed by lattice join can never depend on evidence order — that is
a theorem of the shape, enforced by the tier.

## 3. The structure ladder (staged; the algebra is the design)

- **Step 1 (LANDED with this record; migrated to the pin's own
  algebra same day)**: the measures in `src/rung/Algebra.ts` are the
  PIN'S constructs — `effect/Reducer` (combiner-with-identity: our
  "monoid", in the ecosystem's own name, per the naming law) built
  with `Reducer.make`, the product via `Struct.makeReducer`, folding
  via the stock `combineAll`; `Reader` refactored to one `combineAll`
  over evidence; the span⋉hit join as an ordered two-pointer merge;
  the generation verdict as the lattice join. Behavior-identical —
  T10 stands unchanged over it, and T11's laws run against the stock
  constructs (the library gives the shape; the laws stay OURS to
  prove, per measure).
- **Step 2 (trigger: corpus scheduling or incremental re-reading)**:
  a measured sequence — the Hinze–Paterson finger tree (2006; pin
  pending, C6) or Hinze's priority search queue (2001; pin pending) —
  one persistent structure whose measure choice yields four views:
  position order (passive insertion), interval stabbing (the span
  join), max-score priority (the fidelity×speed scheduler: spend
  rung-2 effort on the best sieve signal first, under budget), and
  the product-measure rollups maintained incrementally.
- **Effect-native carriers, from the bank itself**: `Chunk`
  (sequence), `Order` (position/score), `Trie` (6,051 dotted
  construct keys), `TxPriorityQueue` (stock scheduler),
  `Stream`/`Sink` (corpus fold), and `effect/Graph` for the
  module-dependency phase — the per-reading `imports` list is its
  edge seed, and layer-construction / entry-point / runtime-logic
  regions become graph queries over reading-annotated nodes.

## 4. Law of the lane

New rollups enter as measures — an `(empty, combine)` pair plus its
law rows in T11 — never as imperative accumulation. A rollup that
cannot state its monoid (or lattice) is not ready to land.
