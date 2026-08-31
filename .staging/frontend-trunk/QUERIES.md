# QUERIES — the operations on the word, one step below views

Status: **STAGED ALGEBRA DIRECTION — pre-grade**. Written 2026-08-30
on operator order ("start more fundamentally from the operations we
can do on the data structure… derive general query functions… peruse
Mathlib to see if we can prove we're doing it in the optimal way…
think in terms of human semantics and surface modeling debts").
Sits BELOW [STANDUP.md](STANDUP.md)'s stack: nothing above changes;
`Word.View` stays the UI-facing kind (the don't-overwrite rule), and
this file derives the layer it should be generated from. Mathlib rows
in §6 were RESOLVED 2026-08-30 by a reader lane that verified every
claim against the SOURCE of `leanprover-community/mathlib4` at tag
`v4.33.1` (our exact toolchain) — not docs summaries; `.reference/`
receipts are owed at promotion, URLs carried inline meanwhile.

## 1. The primitive, derived rather than chosen

The word is the **free monoid on `Binding`** — `Word = List Binding`
under `++`/`[]` is that object literally. The universal property of a
free monoid: **to give a monoid homomorphism out of it is exactly to
give a function on the generators.** So the fundamental query datum is
not a `View`; it is

```
a target monoid (α, ⋄, e)   +   one function  f : Binding → α
```

and the query is `run w = (w.map f).foldr (⋄) e`. Both View laws —
`run_nil`, `run_append` — become **theorems proved once, generically**,
instead of proof obligations per query (they are the free monoid's
`map_one`/`map_mul`, in Mathlib's spelling — pin PENDING).

**The verdict on `Word.View` this implies.** `View` carries its two
laws as fields and carries NO laws on the carrier — its own docstring
argues associativity only on the image (`View.lean:27-31`). That is
not wrong; it is one step above the floor. Under the universal
property the structure factors:

```
structure Aggregator (α) where            -- the target monoid, spelled
  merge : α → α → α                        -- (no typeclass exists
  empty : α                                --  in-tree; the record IS
  assoc / empty_left / empty_right         --  the zero-dep spelling)

def Query.run (A : Aggregator α) (f : Binding → α) : Word → α

theorem Query.run_nil  …                   -- once, for every query
theorem Query.run_append …                 -- once, for every query

def Word.View.ofQuery : Aggregator α → (Binding → α) → View α
```

A new query then costs **one function and one instance** — the two law
fields vanish into the universal property. Every landed view
re-derives: `column t` (f = keep-if-classified, target `(Word,++,[])`),
`height t` (f = 0/1, target `(Nat,+,0)`), `unregistered`, and — the
result that says the floor is right — **`toStore` itself**: f = the
singleton store, target = stores under left-biased union, and
`toStore_append` ([Join.lean:62](../../library/cas/Cas/IR/Join.lean))
is precisely the homomorphism law. The store is not beside the query
algebra; it is its oldest instance.

## 2. The refinement ladder — symmetries bought by premises

The same biased-fact/earned-symmetry shape as everywhere else in the
tree. Each rung is a property of the TARGET monoid, and each buys a
stated capability:

| rung | premise on (α,⋄,e) | what it buys |
|---|---|---|
| **R0 monoid** | assoc + identity | incremental render (`run_append`); order-SENSITIVE — per-device honest (SPEC N5) |
| **R1 commutative** | ⋄ comm | the answer factors through the word **up to reordering** (the Perm/multiset quotient — pin PENDING): two devices holding the same content in different admission orders AGREE. The decision-35 replication companion, statable as one theorem |
| **R2 idempotent** | ⋄ idem (R1+R2 = join-semilattice) | replay-safe: duplicate delivery cannot corrupt — the CRDT rung; where every index lives |

`height` is R1 (Nat,+ commutes). `column` is R0 only — a strip's
internal order is admission order, deliberately. An inverted index is
R2. **Replica agreement is not a protocol property; it is a rung of
the query's target.**

## 3. Three query shapes — the claim of completeness

Everything a human asks of this store is one of three shapes:

- **Q-HOM** — pointwise + aggregate (§1). Patchable by `run_append`.
- **Q-SEG** — a Q-HOM run on a segment `w[m₁,m₂)` of the word.
  `since` is the suffix segment (W1/W5); diffs between marks; windows.
  The law is segment composition —
  `seg(m₁,m₃) = seg(m₁,m₂) ⋄ seg(m₂,m₃)` — and mark-keyed caching of
  partial folds is the measured-monoid/finger-tree direction GEOMETRY
  already queued (arithmetic later; the law is statable now).
- **Q-FIX** — relational/fixpoint: reachability, closure, "everything
  about X". Monotone operators on the subset lattice; least fixpoints
  exist by Knaster–Tarski (pin PENDING); the rules-as-spec emission
  (store-crdt.md) is this shape's spec plane.

## 4. The patchability law (CALM, made a surface rule)

> **A query's rendered answer may be PATCHED across growth iff the
> query is monotone under append. A non-monotone answer is computed AT
> A CUT and carries its mark on its face.**

Q-HOM and Q-SEG are patchable by construction. A Q-FIX is patchable
when its operator is monotone (reachability is: the word only grows,
refs only point backward). The non-monotone family — "what is NOT
referenced", orphans, absence counts — can flip as the word grows, so
those surfaces say "as of mark m" the way the CLI already says
"nothing since mark N". This is the CALM boundary drawn as a UI
honesty rule: coordination-free = patchable; everything else is
stamped.

## 5. The human search inventory — and the debts it surfaces

The semantics pass: what a person actually asks, which shape answers
it, and where the model is silent.

| a person asks | shape | carrier today | debt |
|---|---|---|---|
| "what happened since I looked?" | Q-SEG | `since` (W1/W5); wire route owed (FT-1a) | — |
| "is X here / show me X" | Q-HOM | `toStore`, L63/64, L195 | — |
| "everything X depends on" | Q-FIX ↓ | refs live in nodes; only the HOST walks them (`Graph.ts`) | **QD-1** |
| "everything that depends on X" | Q-FIX ↑ | nothing | **QD-2** |
| "who did this?" | Q-HOM | receipts carry per-device `host`; content carries NO agent | **QD-3** |
| "what happened Tuesday?" | Q-SEG by time | receipt-plane `at`, per-device honest | **QD-4** |
| "find it by name" | Q-HOM | naming roots; decision 34 multi-valued fail-closed | — (UI shows all bindings; "latest" needs a ruling nobody has asked for) |
| "how many, per column?" | Q-HOM | `columnBy`/`height`, one label at a time | **QD-5** |
| "find text inside content" | Q-HOM → R2 | nothing; decision 36g's white-box tier is the plan | **QD-6** |
| "what's orphaned / dangling?" | non-monotone | `doctor`/`verify` verbs, partially | **QD-7** |
| "what will this program touch?" | Q-HOM | envelope + `ProgProse` (N6 limits stand) | — |
| "what changed between these two points?" | Q-SEG | `drop`/`take` — append-only means diff IS the segment | — |
| "what MEANS X?" (semantic search) | not a store query | the judge/panel plane, decisions 36/37 | — deliberately: pinned judge instances only, never smuggled into the query algebra |

**The debts, each theorem-shaped:**

- **QD-1 `Reach`.** The model has no reachability relation — the
  product's core gesture ("everything about X") has no Lean carrier.
  Mint `Reach := ReflTransGen refEdge` and prove the pair that makes
  it cheap: (a) `wf w → Acyclic` — admission WF says refs resolve
  strictly earlier, so **admission order is a topological sort of the
  reference DAG** (a new theorem, ours); (b) `Reach` monotone under
  append (patchable, §4).
- **QD-2 the inverted ref index.** Up-closure needs `address → set of
  referrers` — an R2 query (semilattice target). The owed law is
  agreement: `b ∈ invIndex w a ↔ refEdge b a`. Then "what depends on
  X" is Q-FIX over an index that patches.
- **QD-3 attribution.** "Who" has no content carrier —
  `entry.agent` (COLUMNS ask 1) rises from naming nicety to **modeling
  debt**: without it, agency is per-device receipt metadata, not
  content with an address.
- **QD-4 time is receipt-plane only.** The model's word has no clock;
  `at` is per-device honest. Not a defect — a boundary to keep saying
  on every time-shaped surface (N5's rule extended to queries).
- **QD-5 `groupBy`.** `columnBy` answers one label; the human question
  is the whole partition at once. One query into a finitely-supported
  map carrier (label → sub-word / count) — the `Finsupp` shape (pin
  PENDING) — so the trunk's whole column set is ONE incremental query,
  not eleven coordinated ones.
- **QD-6 occurrence.** Content search = an R2 index whose owed law is
  `token ∈ index w ↔ token occurs in some payload of w` — also the
  carrier decision 36g's co-occurrence functions want to stand on.
- **QD-7 cut-stamped negation.** The other half of §4: give the
  non-monotone verbs their discipline (answer + mark, never a bare
  claim) instead of leaving each verb to improvise.

## 6. The Mathlib correspondence — RESOLVED (reader lane, 2026-08-30)

"Prove we're doing it in the optimal way" is made precise as:
**exhibit each of our primitives as a known universal construction.**
The reader verified every row below against mathlib4 SOURCE at tag
`v4.33.1` — our exact toolchain (`lean-toolchain` byte-identical, so
a matching release exists and no toolchain event is needed). This
section is the ADOPTION; the reader's full report is banked verbatim
at [../agent-reports/2026-08-30-mathlib-correspondence.md](../agent-reports/2026-08-30-mathlib-correspondence.md).
URL bases: `DOCS/` = leanprover-community.github.io/mathlib4_docs/,
`SRC/` = github.com/leanprover-community/mathlib4/blob/v4.33.1/.

### 6.1 Standard-issue — the fit is literal, not analogical

- `FreeMonoid α := List α` **by `def`** — definitionally our word
  carrier (`SRC/Mathlib/Algebra/FreeMonoid/Basic.lean:65`).
- `FreeMonoid.lift : (α → M) ≃ (FreeMonoid α →* M)` — a genuine
  `Equiv` (`…/Basic.lean:315`), with
  `lift_apply : lift f l = ((toList l).map f).prod` — exactly §1's
  `run`. Extensionality on generators: `FreeMonoid.hom_eq` (`:295`).
- `run_nil`/`run_append` = `map_one`/`map_mul` on `MonoidHom`
  (`SRC/Mathlib/Algebra/Group/Hom/Defs.lean:234,326`).
- **R1 factoring, cleanest form**: `Multiset.prod_add :
  prod (s + t) = prod s * prod t` over `[CommMonoid M]`
  (`SRC/Mathlib/Algebra/BigOperators/Group/Multiset/Basic.lean:50`);
  the fold's well-definedness route is `List.Perm.foldr_eq` under
  `LeftCommutative` (`SRC/Mathlib/Data/List/Perm/Basic.lean:175`) —
  **sharper than expected: left-commutativity alone suffices**, no
  associativity, for the quotient fold. (`Comm + assoc ⇒ LeftComm`
  covers our Aggregator route.)
- Segment laws: `List.foldr_append`, `List.foldl_append`,
  `List.take_append_drop` — **Lean core**, no Mathlib needed. Our
  `columnBy_append` is literally `List.filter_append` (core), our
  height laws are `List.length_append`/`countP_append` (core).
- `OrderHom.lfp` + Knaster–Tarski
  (`OrderHom.fixedPoints.completeLattice`, docstring names the
  theorem) exist as expected (`SRC/Mathlib/Order/FixedPoints.lean:49,252`);
  `GaloisConnection`/`ClosureOperator` (with `ClosureOperator.ofPred`
  — the exact constructor a ref-closure would use) and
  `lowerClosure`/`upperClosure` with their Galois insertions all
  present for the closure story.
- `Finsupp` (`α →₀ M`) is the group-by carrier as guessed — and
  carries **its own universal property**,
  `Finsupp.liftAddHom : (α → M →+ N) ≃+ ((α →₀ M) →+ N)`: group-by
  queries are determined by their action on single columns exactly as
  word queries are by single bindings (QD-5's law comes canonical).
- **LIMIT-STABLE has an exact Mathlib name**: `Filter.eventually_atTop
  : (∀ᶠ x in atTop, p x) ↔ ∃ a, ∀ b, a ≤ b → p b`
  (`SRC/Mathlib/Order/Filter/AtTopBot/Basic.lean:79`) — the judge
  lattice's L3 rung should adopt this vocabulary (`Eventually` is
  closed under finite conjunction and monotone implication; a filter
  of propositions, no joins — which is itself design information).

### 6.2 Already bundled better than ours (adopt the shapes)

- `List.dlookup` / `List.dlookup_append` **IS `find`/`toStore_append`**
  — first-binding resolution with `Option.or`, pointwise identical to
  our `.elim … some` (`SRC/Mathlib/Data/List/Sigma.lean:155,267`).
- `AList.union` is documented "left-biased" in so many words;
  `AList.lookup_union_left/right` are our `find_append_of_some/none`
  (`SRC/Mathlib/Data/List/AList.lean:385,415,419`).
- `FreeAddMonoid.countP : FreeAddMonoid α →+ ℕ` is
  `height ∘ columnBy` **already bundled as a hom**
  (`SRC/Mathlib/Algebra/FreeMonoid/Count.lean:70`).
- `MonoidHom.prod` is `View.prod` byte-for-byte
  (`SRC/Mathlib/Algebra/Group/Prod.lean:392`); `SupBotHom` is
  `View`'s exact structural twin at the R2 rung (`run_append` =
  `map_sup'`, `run_nil` = `map_bot'`).
- `FreeMonoid.mkMulAction (f : α → β → β) : MulAction (FreeMonoid α) β`
  — "replay a word against a state" as a monoid action
  (`…/Basic.lean:354`): the free-monoid packaging of the interpreter
  itself; adjacent to `step`, worth knowing when the interpreter's
  algebra is next touched.
- `Con` (congruence) + `Con.ker` + first-iso: the general form of §2 —
  a query is determined by its kernel congruence; R1 says `Perm`
  refines that kernel. Future vocabulary, not a landing.

### 6.3 House-shaped, deliberately — and where we are STRONGER

- `View` is strictly weaker than `MonoidHom`/`SupBotHom` (no laws on
  the carrier; argued on the image) — documented in-file, and the §1
  refactor is what closes the gap from below.
- Our `toStore_append_comm`/`_self` are **conditional** on
  `Store.Compatible` where `SemilatticeSup` gets `sup_comm`/`sup_idem`
  free from an order — the biased-fact pattern, priced not hidden.
- **`AList` ERASES shadowed keys** (`NodupKeys` invariant; `kunion`
  defined via `kerase`) — our word keeps them physically and lets
  `find` make them inert. `toStore_append_shadowed` has NO Mathlib
  counterpart **because Mathlib's canonical structure forbids the
  representation**. The divergence is the product: the surplus over
  the store is the history the trunk renders (SPEC §1.1).
- **Mathlib has no decidability for closures and no DAG theory**: no
  `Decidable` instance for `ReflTransGen`/`TransGen`; `Digraph` has
  no path/reachability/acyclicity API at all; `Quiver.Path` has no
  acyclicity; the only topological-order content is Szpilrajn
  (`extend_partialOrder`), non-constructive by Zorn. Our decidable
  `wf`/`resolvesIn` — and QD-1's proposed
  admission-order-is-a-topological-sort theorem — are **genuinely
  ours**: nothing to import, nothing to certify against, a candidate
  publishable seam (J10-adjacent: decidable reachability over
  shadow-keeping words with WF-forced acyclicity).
- Master-drift caught in passing: `FreeMonoid.hom_eq_iff` is on the
  docs site but absent from `v4.33.1` source — cite tags, not master.

### 6.4 Import posture — updated by the toolchain finding

The tower stays zero-dependency (fast-compile ruling stands). The
**certification annex** — a separate Lake package importing Mathlib +
Cas, holding only correspondence theorems, imported by NOTHING, built
by an optional gate — is now known cheap: mathlib4 tag `v4.33.1`
matches our toolchain exactly and `lake exe cache get` fetches
prebuilt oleans (the community wiki treats narrow vs full import as
build-cost-equivalent because of the cache). Doc-plane pins (this
section) hold the correspondence meanwhile. QA-2 remains the ruling.

## 6b. The IVM correspondence — where our incrementality sits (operator-ranked MOST FUNDAMENTAL, 2026-08-30)

RESOLVED by the SOTA reader
([../agent-reports/2026-08-30-sota-search-survey.md](../agent-reports/2026-08-30-sota-search-survey.md)
§3, with verbatim quotes and URLs): DBSP requires the commutative
group ONLY to define differentiation (§2.2, Def 2.17) and itself
names positive Z-sets / monotone streams as the distinguished
sub-case (Defs 4.2/4.4); Olteanu (Gems of PODS 2024) states plainly
that "insert-only batches can be processed asymptotically faster";
and Chmielewski–Draghici–Olteanu–Zhang (Jun 2026) prove sharp bounds
AND a dichotomy for exactly our intersection — insert-only over
semirings WITHOUT additive inverse — so the closure question at the
end of this section now has a literature home. DABA additionally
gives worst-case O(1) segment aggregation for non-invertible
operators — the Q-SEG algorithm, ready-made. The mapping says WHY we
get to be simple:

- **Their carrier is a GROUP; ours is a MONOID — because they have
  deletion and we refuse it.** DBSP's Z-sets weight rows with signed
  integers so a retraction is a negative delta; the whole calculus
  (streams, the incrementalization operator `Q^Δ = D ∘ Q ∘ I`) is
  built to push retractions through operators. The store's grow-only
  law deletes the need for the group structure: our deltas are only
  ever appends, so monoid targets suffice. **The simplification is
  not naivety — it is the structural dividend of no-deletion**, the
  same dividend CALM named (no coordination) and the trunk named (no
  invalidation, only extension). Even our "deletes" (text tombstones,
  §text-crdt) are appends of death-assertions, never retractions —
  we stay in the monoid corner by construction.
- **"Linear operators are their own incremental form" — that is
  `run_append`.** DBSP's theorem that a linear query needs no extra
  machinery to incrementalize IS our Q-HOM story stated in their
  vocabulary. The operator's "what can we get away with" has a name
  in this theory: linearity.
- **What their generality buys us next, when wanted:**
  (a) *bilinear operators* — the incremental JOIN rule
  `Δ(A ⋈ B) = ΔA ⋈ B + A ⋈ ΔB + ΔA ⋈ ΔB` — is the law for
  incrementally maintaining `log ⋈ store` (SPEC §1.1's join) and any
  two-view combination beyond `prod`;
  (b) *incrementalized fixpoints* — DBSP derives semi-naive Datalog
  evaluation as the incremental form of recursion, which is exactly
  "patch `Reach` under append" (QD-1) done optimally — the monotone
  case is their easy half and our only case.
- **The boundary to respect**: their closure theorems (compose,
  recurse, nest) are proved over the group structure; which survive
  restriction to monoid weights is a real question for the annex,
  not an assumption. Where one fails, that is a fact about how much
  deletion-freedom is worth, and worth knowing precisely.

## 7. The query plane as data — where this meets the service law

A Q-HOM query is a ROW: `{generator spec, aggregator, rung}`. Emitted
through the meta machinery like everything else, the query registry
becomes the thing "generating CAS APIs for all languages" needs:
any host implements an engine for the three shapes once; each query
is data; conformance is byte-gates against Lean-computed answers on
witness words. The Datalog-shaped direction (store-crdt.md) supplies
Q-FIX's rule rows. **Queries stop being code that each host writes
and become content each host interprets** — the same move the
programs plane already made (`step`/`cont`), one level up.

## 8. Ruling asks — status 2026-08-31

**QA-1 LANDED** (`Cas/IR/Query.lean`, kernel-checked, zero-dep, no
`Classical.choice`): `Aggregator` + `Query.run` with generic
`run_nil`/`run_append`; rungs as `Prop` predicates with
`run_perm` (**QA-6's replication companion, delivered**: commutative
targets agree across admission orders), `run_replay`,
`run_dup_adjacent` (at `Idem` alone — cheaper than proposed), and
`run_redelivered` (the FULL per-message replay form, no debt);
`View.ofQuery` + `View.ext` with the three landed views proved
STRUCTURALLY EQUAL to their `ofQuery` forms; `toStore` agreement
clean and premise-free (`Query.run_storeAgg`). **QA-3 LANDED**
(`Cas/IR/Reach.lean`): `Edge` reads the RESOLVED occurrence — the
occurrence reading is REFUTED by a three-binding shadowing
counterexample under which acyclicity is false on an admitted word
(docstring carries it); `wf_edge_index` (admission order IS a
topological sort), `reach_acyclic`, `reach_mono` (the patchability
licence, premise-free), AND the decision procedure `reachB` — sound
unconditionally, complete on admitted words — where Mathlib has no
decidable closure at all. One structured debt:
owed(reach-search-memoized). Full report:
[../agent-reports/2026-08-31-query-layer.md](../agent-reports/2026-08-31-query-layer.md).
Open asks below: QA-2 (annex posture) only. **QA-4 RATIFIED
2026-08-31 (decision 42a)** — the patchability law is standing
surface rule. QA-5 superseded by decision 40's `agent` sort,
closed.

## The original asks

- **QA-1** adopt the query layer: `Aggregator`/`Query` under
  `Cas/IR/`, generic `run_nil`/`run_append` proved once,
  `View.ofQuery` bridge; landed views re-derived through it; `View`
  stays the UI-facing kind. (A refactor that DELETES proof
  obligations; no new sort, no wire change.)
- **QA-2** Mathlib posture: doc-plane pins now, certification annex
  as an optional lane if the toolchain aligns — or pins only.
- **QA-3** commission QD-1 `Reach` (+ the topological-sort theorem)
  and QD-2 the index law as the next Lean lane — the product's core
  gesture acquires its carrier.
- **QA-4** the patchability law (§4) as a standing surface rule
  beside SPEC's N-rules.
- **QA-5** rule `entry.agent` (QD-3) — now load-bearing for "who"
  queries, not just naming.
- **QA-6** commission the R1 replication companion ("commutative
  targets agree across replicas") as the decision-35 theorem.

## Provenance

Local citations resolve at `main` @ `d9cf99ee`. Every Mathlib row is
model-knowledge survey, `pin: PENDING`, reader lane out 2026-08-30.
No gate was run by this lane; no soundness word above names a judgment
that does not exist — "theorems" in §5/§6 are PROPOSED statements
except where a `file:line` is cited.
