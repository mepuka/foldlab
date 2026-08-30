# The implementer's reference

The implementer receives a contract packet — laws, falsifiers, red
battery — and develops until the battery is green. They did not write
the packet and may not edit it. Ground truth:
[CATALOG.md](CATALOG.md), the same catalog the breaker drew from —
same reference set, different instructions. A falsifier grounded in
that shared set is never unfair; the only admissible dispute is that
it misquotes the catalog or the contract, and that dispute is a BLOCK
filed back to the breaker in writing — never an edit, never an
argument from effort.

## The implementer's loop

1. **Read the packet whole.** REQUIRES / ENSURES / DECREASES /
   FRAME / FALSIFIER, the work's algebraic statement, the battery
   paths. The battery already exists and is already red — it shows
   you exactly what to test.
2. **Open the ticket's categories.** The dispatch's taxonomy tags
   name your catalog rows and book sections — look them up first;
   each law's category below carries its discharge pattern.
3. **Develop.** One red test at a time, minimal code to green
   without reddening another, typecheck often, full gate once at
   the end (`mise run check`).
4. **When the algebra is wrong, stop.** A gap in the laws is a
   block back to the breaker. Patching the spec from inside the
   implementation is the defect this process exists to kill.
5. **Close** by the board register (`board-style`).

## Discharge patterns, by category

Section numbers cite [CATALOG.md](CATALOG.md).

### contracts

- Prove the precondition at every call, the postcondition at every
  return; when an allowed-but-unintended result defeats a client,
  the fix is a stronger spec — filed as a block, not patched (§1.4).
- Desugar a call: fresh formals, assign actuals, assert the callee's
  precondition, assume its postcondition, assign outputs. Never
  reason from the callee's body (§2.10).
- Treat an underspecified output universally — cover every allowed
  result, not one favorable witness (§2.7).

### assertions

- Discharge symbolically; runs on selected inputs discharge nothing
  (§1.1). Localize gaps with intermediate assertions, then supply
  the missing precondition, invariant, or lemma (§1.2).
- Analyze each branch under its own guard; prove the joined fact on
  every path (§1.3, §5.3).

### wp-sp-calculus

- Goals: compute WP backward by substitution, simplifying as you
  go. Reachable facts: SP forward. Never mix directions (§2.3–2.6).
- Simultaneous assignment substitutes simultaneously; when an update
  overwrites needed information, introduce a logical variable for
  the old value (§2.3).
- Using WLP, conjoin the separate no-crash obligation (§2.9).

### termination

- Choose a remaining-work measure (`hi - lo`, `len - n`) and check
  the strict decrease on EVERY branch (§3.1, §11.2).
- Lexicographic: dominant component first; add a rank constant when
  mutually recursive calls pass equal arguments (§3.3).
- Datatypes: recurse on structurally included children and the
  decrease is free (§4.3). Inspect any default metric; write the
  explicit clause the moment an edge fails it (§3.4).

### inductive-data

- Exhaustive match, one branch per constructor, destructors only
  behind their discriminators (§4.1–4.2).
- Prove by the same case split the function makes; induct on the
  definition's own recursion parameter (§5.6, §6.x, §7.x).
- Prove round-trips (`from(to(x)) == x`) before building anything
  on a conversion (§7.0).

### lemmas-proofs

- Intrinsic for the property every client needs; extrinsic by
  induction for the rest — multi-call properties (involution,
  commutativity) cannot be intrinsic (§6.2).
- Mirror each recursive function with a lemma following its match
  structure; strengthen the helper lemma, not the executable code
  (§8.1).
- calc from the more structured side; the step relation is what the
  facts support (`==`, `<=`, `==>`), lemma calls inside the hint
  for the step they justify (§5.4).
- When iteration direction and recursion direction disagree,
  introduce the exact bridge lemma; do not weaken the invariant
  (§12.4).

### algebraic-laws

- Choose the spec form that composes: multiset/projection
  preservation beats a permutation relation through recursive
  algorithms (§8.0).
- For each abstract op, prove the concrete op commutes with the
  abstraction function — that square is the whole obligation
  (§9.5).

### specification-design

- Ghost values flow only into ghost constructs; erasure must not
  change executable results (§1.6).
- A sorted result is ordered AND multiset-preserving — and stable,
  when keys have satellites (§8.0).

### abstraction-modules

- The abstraction function is the bridge: state every public
  contract over it, keep the representation behind `provides`,
  reveal only what clients must unfold (§9.2, §9.5).
- Export emptiness (and any decidable observation) as an operation
  agreeing with the abstract definition, rather than exposing
  representation equality (§9.4).
- Imports explicit and hierarchical; never cyclic (§9.1).

### representation-invariants

- Establish `Valid` in the constructor; require and restore it
  around every mutating operation; state every correctness lemma
  under it (§10.1, §16.0).
- Layer an intrinsically specified public wrapper over the
  extrinsic core, each wrapper contract discharged by its proof
  lemma (§10.3).

### loops

- Choose `J` so initialization proves it and `J ∧ ¬B` proves the
  postcondition; then discharge three cuts — establish, preserve
  while decreasing, conclude (§11.3).
- Replace-constant-by-variable: turn the postcondition's bound into
  the index (`x == Fib(i)` until `i == n`) (§12.0). Programming by
  wishes: record each wish as an invariant, solve its base value,
  derive its update by WP algebra, commit coupled updates
  simultaneously (§12.1).
- Snapshot inputs the postcondition mentions; an invariant relating
  a live variable to a mutated input proves the wrong theorem
  (§11.0).

### arrays-search

- Regions are half-open intervals; the invariant names the
  processed region's property and the window's exclusions
  (§13.1–13.2).
- Carry a witness invariant when the result must come FROM the
  data, not merely bound it (§13.3).
- Frontier searches: start where the witness rectangle is the whole
  space, move only the side sortedness licenses, decrease a
  frontier measure (§13.5–13.6).

### mutation-frames

- `modifies` every object that may change, `reads` every mutable
  dependency; `old` around the dereference (`old(a[i])`), `fresh`
  promised when callers must own the result (§14.0).
- Nested loops: the inner invariant carries the outer's completed
  work (§14.1). Independent uniform updates: aggregate semantics,
  so every right-hand side reads the pre-state (§14.1).

### objects-dynamic-frames

- `Valid` reads `this, Repr`; constructors establish
  `fresh(Repr)`; mutators restore `Valid` and promise new
  representation members fresh (§16.2).
- Two-phase construction: build children first, assemble the
  parent's frame after; when a child's `Repr` grows, union it back
  into the parent's (§16.3).
- Keep constituent `Repr`s disjoint; `this` belongs to its own
  `Repr` and to no child's (§16.3–16.4).
- Iterators: immutable view of remaining work, validity tied to the
  container's unchanged representation (§17.3).

### proof-mechanics

- Normalize negations; alpha-rename before substituting; substitute
  free occurrences only, simultaneously (§B.0, §B.6).
- Universals: prove for arbitrary; existentials: provide the
  witness; split bounded ranges at concrete endpoints without
  moving them (§B.7–B.8).
- Order well-definedness left-to-right: guards before the partial
  operations they license (§B.2).
