# The breaker's reference

The breaker writes the contract packet — laws, falsification
equations, red battery — before any implementation exists, and never
implements what they broke. Packet format: [CONTRACT.md](CONTRACT.md).
Ground truth: [CATALOG.md](CATALOG.md), the section-by-section tagging
of *Program Proofs* (120 sections; raw table
[book-tags.json](book-tags.json)). This page and
[IMPLEMENTER.md](IMPLEMENTER.md) are projections of that ONE catalog —
same reference set, different instructions. That sameness is the
design: a falsifier drawn from the catalog the implementer was also
handed cannot be answered with "but I was so careful." Craft is not a
defense; only the equations are.

## The breaker's loop

1. **Open the ticket's categories.** The dispatch arrives tagged
   with taxonomy categories — that IS the trigger: pull those
   catalog rows and their cited book sections before anything else.
   Add tags the ticket missed, saying so.
2. **State the work in algebra** — to as much a degree as possible.
   Even one state formula about the piece of work forces the
   reasoning that leads to good falsification attempts. There is no
   rigor ranking; the degree is what the work's algebra supports,
   written until it runs out. Name the obligation classes it touches
   (CONTRACT.md).
3. **Harvest error states.** Concrete wrong behaviors, one line each
   — a defect, not a vibe.
4. **Write the laws** that exclude them, then per law the
   exhibit-form falsifier, each citing its catalog row or stating
   its work-specific ground. No executable falsifier, no admission.
5. **Write the battery** — every falsifier a red host test.
6. **Hand over and stop.**

## Attack artifacts are record, never scratch

Everything a breaker proves is PRESERVED, mechanically (operator
law, 2026-08-30). An attack that elaborates — a wrong-but-passing
implementation with its law analogues, a counter-witness, an
exhaustive check, a drift refutation — is committed by the
breaker's own hand to `contracts/attacks/<ticket>/` in the package
under attack (attack module + a RESULTS.md naming verdict,
witnesses, and the failed attempts), on an `attack/<agent>/<ticket>`
branch. Deleting a proof that fired is destroying evidence;
deleting one that failed is destroying earned confidence — both are
record. A fired attack becomes a regression object: after the fix,
the attack is re-run and its refutation by the amended laws is the
mechanical proof the hole closed — recorded in RESULTS.md next to
the original verdict.

## Falsifier shapes, by category

Each shape is a schema — bind its metavariables to the work at hand.
Section numbers cite the catalog.

### contracts

- **Adequacy gap** — exhibit a wrong-but-passing implementation:
  `c'` with `{P} c' {Q}` yet `c'` breaks the stated intent. The
  book's own: `m <= x && m <= y` admits an `m` equal to neither
  (§1.4); `x <= More(x)` admits `More(x) == x` (§5.0);
  `Average(r,3x) == 3x` admits `r != 3x` (§1.5).
- **Caller leans on the body** — exhibit an alternative valid
  implementation that breaks the client (§1.4, §2.7).
- **Unestablished precondition** — exhibit a call site with `P(E)`
  false; the assumed postcondition is then unlicensed (§2.10).
- **Favorable-witness proof** — the contract allows many outputs;
  exhibit an allowed `y'` the proof did not cover (§2.7, §2.10).
- **Determinism assumed, not granted** — exhibit two equal-input
  calls the underspecified contract lets disagree (§1.4).

### assertions

- **Sampling as proof** — exhibit the untested input reaching a
  false assertion (§1.1).
- **Assert/assume confusion** — the fact is used without being
  proved; exhibit the state where it fails (§2.8).
- **Unguarded branch** — exhibit an input driving the unanalyzed
  branch to violate the goal (§1.3, §2.5).

### wp-sp-calculus

- **Direction error** — WP computed forward or SP backward; exhibit
  the state the reversed derivation accepts wrongly (§2.4, §2.6).
- **Sequential-for-simultaneous** — a right-hand side reads an
  already-updated variable; exhibit the swap that loses a value
  (§2.3, §14.1 rotation).
- **WLP passed off as WP** — crash-freedom dropped; exhibit the
  crashing run declared correct (§2.9).
- **Excluded miracle** — `assume false` (or vacuous pre) proves
  anything; exhibit the vacuously-verified claim (§2.N).

### termination

- **No strict decrease** — exhibit the branch (often `else`) where
  the variant stays equal: infinite recursion or loop (§3.0, §11.2).
- **Not well-founded** — exhibit the infinite descending chain the
  order admits (reals: 1, 1/2, 1/3, …; integers unbounded below)
  (§3.2).
- **Lexicographic misread** — exhibit `(2,100) → (3,0)` accepted
  because a later component fell (§3.3).
- **Mutual recursion at equal argument** — exhibit the cycle the
  per-function metric misses; a rank constant is owed (§3.3).
- **Default metric trusted** — exhibit the recursive edge the
  guessed tuple does not shrink (§3.4).

### inductive-data

- **Non-exhaustive match** — exhibit the constructor with no branch
  (§4.1).
- **Destructor off its variant** — exhibit `t.left` on a leaf
  (§4.2).
- **Constructor laws broken** — exhibit
  `Node(l,r).left != l`, or two different payloads comparing equal
  (§4.2, §4.7).
- **Round-trip failure** — exhibit `x` with `from(to(x)) != x`
  (§7.0; the universal decode/encode falsifier).

### lemmas-proofs

- **Bodyless lemma as axiom** — the claim is assumed, never proved;
  demand the body or exhibit the counterexample (§5.2).
- **Circular or non-decreasing proof** — the lemma proves itself at
  the same argument (§5.2).
- **Wrong instantiation** — the lemma is invoked on a value that is
  not the expression at the failing point (§5.1).
- **calc direction abuse** — `==` written where only `<=` holds; an
  inequality silently strengthened (§5.4).
- **Branch join without the fact** — one path establishes the
  property, the other reaches the join without it (§5.3).

### algebraic-laws

- **Unit/associativity/commutativity** — exhibit
  `f(e,x) != x`, `f(f(x,y),z) != f(x,f(y,z))`, `f(x,y) != f(y,x)`
  where claimed (§6.2, §7.2).
- **Homomorphism failure** — exhibit `x,y` with
  `h(op(x,y)) != op'(h(x),h(y))` (§7.2 `UnaryToNat/Add`; the shape
  of every abstraction-function obligation).
- **Shallow involution** — `g(g(x)) == x` can pass while the
  defining equation fails; falsify the DEFINING equation, not only
  the composite (§5.7 Mirror — the canonical trap).
- **Reconstruction** — exhibit inputs where
  `Add(Sub(x,y),y) != x` or `d*y + m != x ∨ m >= y` (§7.4).

### specification-design

- **The sorting trinity** — each conjunct alone is passable wrongly:
  ordered-but-lost-elements (`sorted(out) ∧ bag(out) != bag(in)`),
  multiset-kept-but-unordered, both-kept-but-unstable on equal keys.
  Falsify each conjunct separately (§8.0, §8.3, §15.1).
- **Predicate too weak** — exhibit the instance the predicate
  accepts against intent (Ordered checking only the first adjacent
  pair, §8.0).
- **Ghost leakage** — exhibit a compiled result that changes when
  ghost state is erased (§1.6).

### abstraction-modules

- **α-commutation failure** — exhibit an op with
  `α(op_rep(r)) != op_abs(α(r))` (Enqueue at the head instead of
  the tail, §9.3).
- **Representation leak** — exhibit the client proof that unfolds a
  private body, then break it by swapping implementations (§9.5).
- **Equality confusion** — exhibit two representations of one
  abstract value reported unequal (two-list queue, §9.4).
- **Export closure** — exhibit the exported signature naming a
  hidden type, or the wildcard export a client coupled to (§9.2).

### representation-invariants

- **Valid in, broken out** — exhibit the op taking `Valid(r)` to
  `!Valid(op(r))` (§10.1).
- **Valid too weak** — exhibit the broken representation `Valid`
  accepts; every lemma conditioned on it is then unsound (§10.4).
- **Lemma without Valid** — exhibit the invalid input certified
  because the invariant premise was skipped (§10.1, §10.3).
- **Abstraction disagrees** — exhibit
  `Elements(op(r)) != specified effect on Elements(r)` (§10.0,
  §10.2 — the multiset equations).

### loops

- **The four-way loop falsifier** (§11.3, §11.5): exhibit entry
  with `J` false; a body run from `J ∧ B` ending outside `J`; an
  exit state with `J ∧ ¬B ∧ ¬Q` (invariant too weak); a body
  preserving `J` with the variant unchanged. Each kills a distinct
  obligation — try all four.
- **Wrong-state postcondition** — the exit bounds hold for a
  modified input, not the entry value; exhibit the run where `N`
  moved (§11.0; snapshot falsifier).
- **Mixed-generation update** — sequential updates read the new
  value; exhibit the drift (§12.0, §12.1).
- **Boundary shift** — exhibit the half-open range off by one at
  either end (§12.3, §13.7).

### arrays-search

- **Bounds** — exhibit `i < 0 ∨ i >= len` reached (§13.0).
- **Wrong witness** — a later match returned while an earlier index
  satisfies `P` (§13.1); a value below all elements that is in the
  array's order but not the array (§13.3 Minimum — the
  witness-missing shape).
- **Discarded region** — exhibit the input where the answer lives
  in the region the search ruled out (§13.2 unsorted input, §13.5
  wrong direction, §13.6 the unexplored corner: `a=[0,100],
  b=[50,51]` → 49).
- **Stuck window** — exhibit the state where the window does not
  shrink (`lo := mid`, one-element window, §13.2).

### mutation-frames

- **Unlisted write** — exhibit a location outside the declared
  frame differing pre→post (§14.0, §14.2).
- **old placement** — `old(a)[i]` vs `old(a[i])`; exhibit the run
  where they differ (§14.0).
- **Aliasing** — exhibit `src == dst` (or `b := a` as shallow
  copy) making the spec vacuous or the copy wrong (§13.0, §14.1).
- **Freshness** — exhibit the returned-but-old alias whose caller
  update smashes existing state (§14.0).

### objects-dynamic-frames

- **Repr closure** — exhibit `this ∉ Repr`, a child object outside
  `Repr` being written, or a child's grown `Repr` not unioned back
  (§16.2–16.4).
- **Overlapping constituents** — exhibit shared state between two
  children: one op invalidates the other (§16.3).
- **Stale iterator** — exhibit container mutation with an
  outstanding iterator still answering (§17.3, §17.4).
- **Duplicate/omitted traversal** — exhibit a key yielded twice,
  or `None` while `RemainingKeys != {}` (§17.3).

### proof-mechanics

- **Connective slips** — implication as conjunction; De Morgan or
  distribution changing a guard; quantifier negation flipping the
  wrong way (§B.1–B.8).
- **Capture** — substitution touching a bound occurrence, or the
  replacement captured by a quantifier (§B.6).
- **One-witness universal** — a `forall` accepted after one witness
  (§B.7); an `exists` accepted with none (§B.8).
- **Well-definedness order** — exhibit the reordered conjunction
  that divides by zero (§B.2).
