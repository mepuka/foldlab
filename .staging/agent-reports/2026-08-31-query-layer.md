# AGENT REPORT — the query layer and the Reach mint (QA-1, QA-3)

Lane: Lean implementation (Opus 5), dispatched by the Mac coordinator.
Date: 2026-08-31.
Consumed by: QUERIES.md QA-1/QA-3 stamping.
Package: `library/cas`, toolchain `leanprover/lean4:v4.33.1`, zero
dependencies (no Mathlib import added; every correspondence is a
restatement).
Claim stamp: **G1 Model** — kernel-checked theorems over the Lean
definitions, pinned toolchain, declared imports, axiom report below.
Nothing here is a claim about a TypeScript build, a host, or a wire.

Two new modules, both under `Cas/IR/`:

- `library/cas/Cas/IR/Query.lean` (QA-1 + the agreement derivations)
- `library/cas/Cas/IR/Reach.lean` (QA-3)

Plus `library/cas/Cas.lean`: two imports and the `IR/` front-page
bullet extended. Nothing else in the tree was edited — the
uncommitted decision-40 sort batch and the D2 effects work were built
on and left intact.

---

## 1. Skill stages run, and what Pass B changed

Invoked `lean`, `store-language`, `estate` first, as ordered.

`lean` routed to the stages the dispatch named, and all four ran:

| stage | what it produced here |
|---|---|
| `lean-model-invariants` | the representation record: `Aggregator` as a RECORD rather than a class (no algebraic hierarchy exists in-tree, so the record is the honest spelling of a monoid); the rungs as `Prop`-valued predicates on the record rather than as sub-structures, so a rung is a premise a theorem consumes and never a second carrier to keep in step; `firstIndex` as a recursion mirroring `find` step for step rather than a `List.findIdx` wrapper, so the coupling lemmas are one `by_cases` each. |
| `lean-algebraic-systems` | the operational shape: `Query.run` is a FOLD over a `map`, not a bespoke recursion, because the target is the free monoid's universal property in computed form; `Reach` is a reified two-constructor closure rather than a `Prop` defined by a fixpoint, so induction on a path is the induction the theorems want. |
| Pass B (signature freeze) | below. |
| `lean-llm-proof-loop` | the proof work; three compiler-driven repairs, all recorded in §7. |
| `lean-assurance-review` | §6 (axioms) and §8 (what is NOT claimed). |

**What Pass B changed, before any proof was written:**

1. **`run_dup_adjacent` weakened its premise from `Comm`+`Idem` to
   `Idem`.** The dispatch asked for "the per-message replay form under
   Comm+Idem". Reading the statement before proving showed the ADJACENT
   case needs only `assoc` and `Idem` — `merge (f b) (merge (f b) x) =
   merge (merge (f b) (f b)) x = merge (f b) x`. Splitting it in two
   (`run_dup_adjacent` at `Idem`, `run_redelivered` at `Comm`+`Idem`)
   states each at its real price. Flagged for the grill in §7.
2. **`Aggregator.foldr_seed` was added as a named lemma.** `run_append`
   was going to inline it; it is the ONLY place the identity laws are
   consumed, and naming it makes that visible.
3. **`Query.foldr_perm` was generalized off the `Aggregator`.** The
   banked report's sharpest row is that `List.Perm.foldr_eq` needs
   `LeftCommutative` ALONE, no associativity. Stating our restatement
   at that strength (a bare `g : β → γ → γ` with left-commutativity)
   preserves the finding; `run_perm` is the corollary that pays for it
   with `Comm` + `assoc`.
4. **The store generator was renamed `single` → `singleStore`.** In
   `Word`'s namespace a bare `Word.single` reads as "a one-binding
   word". Flagged in §7.
5. **`View.ext` was added and the three view agreements were promoted
   from pointwise to structure equality.** Pass B noticed that `View`'s
   law fields are `Prop`s, so proof irrelevance makes the structures
   equal as soon as the three data fields agree. "Re-derived, not
   replaced" then becomes literal: `View.column t = View.ofQuery …`, an
   equation, not a coincidence on every word.
6. **`Edge` was re-cut from occurrence to resolved binding.** Pass B on
   `Edge`'s statement produced the three-binding counterexample in §4.
   This is the single largest thing Pass B changed and it changed a
   THEOREM's truth value, not its ergonomics.
7. **`reachIn`'s address test was re-cut from `==` to `decide (a = b)`.**
   Measured, not guessed: see §6.

---

## 2. `Cas/IR/Query.lean` — every declaration

`import Cas.IR.View` only. Namespace `Cas.Word`.

### The target monoid

```lean
structure Aggregator (α : Type) where
  merge : α → α → α
  empty : α
  assoc : ∀ x y z : α, merge (merge x y) z = merge x (merge y z)
  empty_left : ∀ x : α, merge empty x = x
  empty_right : ∀ x : α, merge x empty = x

def Aggregator.Comm {α : Type} (A : Aggregator α) : Prop :=
  ∀ x y : α, A.merge x y = A.merge y x

def Aggregator.Idem {α : Type} (A : Aggregator α) : Prop :=
  ∀ x : α, A.merge x x = x

theorem Aggregator.left_comm {α : Type} {A : Aggregator α} (hc : A.Comm)
    (x y z : α) : A.merge x (A.merge y z) = A.merge y (A.merge x z)

theorem Aggregator.foldr_seed {α : Type} (A : Aggregator α) (l : List α) (z : α) :
    l.foldr A.merge z = A.merge (l.foldr A.merge A.empty) z
```

### The query

```lean
def Query.run {α : Type} (A : Aggregator α) (f : Binding → α) (w : Word) : α :=
  (w.map f).foldr A.merge A.empty

theorem Query.run_nil (A) (f) : Query.run A f [] = A.empty                     -- rfl
theorem Query.run_cons (A) (f) (b) (w) :
    Query.run A f (b :: w) = A.merge (f b) (Query.run A f w)                   -- rfl
theorem Query.run_singleton (A) (f) (b) : Query.run A f [b] = f b
theorem Query.run_append (A) (f) (w v : Word) :
    Query.run A f (w ++ v) = A.merge (Query.run A f w) (Query.run A f v)
```

`run_nil` and `run_cons` are `rfl`, as the dispatch predicted for the
first; `run_append` goes through `List.map_append`, core
`List.foldr_append`, and `foldr_seed`.

### Rung 1

```lean
theorem Query.foldr_perm {β γ : Type} {g : β → γ → γ}
    (hg : ∀ x y : β, ∀ z : γ, g x (g y z) = g y (g x z)) :
    ∀ {l₁ l₂ : List β}, l₁.Perm l₂ → ∀ z : γ, l₁.foldr g z = l₂.foldr g z

theorem Query.run_perm {α : Type} {A : Aggregator α} (hc : A.Comm) (f : Binding → α)
    {w v : Word} (h : w.Perm v) : Query.run A f w = Query.run A f v
```

`List.Perm` is core (four constructors, `nil/cons/swap/trans`);
`List.Perm.map` is core; `List.Perm.foldr_eq` is Mathlib and is what
`foldr_perm` restates. `run_perm`'s whole proof is
`foldr_perm (Aggregator.left_comm hc) (h.map f) A.empty`.

**This is QA-6's replication companion, statable now**: two replicas
holding the same bindings in different admission orders agree on every
commutative-target query. The premise is a property of the TARGET, so
the statement never mentions a protocol.

### Rung 2

```lean
theorem Query.run_replay {A} (hi : A.Idem) (f) (w) :
    Query.run A f (w ++ w) = Query.run A f w

theorem Query.run_dup_adjacent {A} (hi : A.Idem) (f) (b) (w v) :
    Query.run A f (w ++ b :: b :: v) = Query.run A f (w ++ b :: v)

theorem Query.run_redelivered {A} (hc : A.Comm) (hi : A.Idem) (f) (b) (w₁ w₂ w₃) :
    Query.run A f (w₁ ++ (b :: (w₂ ++ (b :: w₃))))
      = Query.run A f (w₁ ++ (b :: (w₂ ++ w₃)))
```

`run_redelivered` is the per-message replay form the dispatch asked
about, and it LANDED — the general one, not only the adjacent case: a
binding delivered twice at any two points of the word reads as one
delivery. No structured debt was needed here.

The parentheses in `run_redelivered` are written out deliberately.
`::` is `infixr:67` and `++` is `infixl:65`, so the unparenthesized
spelling `w₁ ++ b :: w₂ ++ b :: w₃` associates as
`(w₁ ++ (b :: w₂)) ++ (b :: w₃)` — the same list, a different
statement to read. The first proof attempt failed on exactly this.

### The bridge

```lean
def View.ofQuery {α : Type} (A : Aggregator α) (f : Binding → α) : View α where
  run := Query.run A f
  merge := A.merge
  empty := A.empty
  run_nil := rfl
  run_append := Query.run_append A f

theorem View.ext {α : Type} {V W : View α} (hrun : V.run = W.run)
    (hmerge : V.merge = W.merge) (hempty : V.empty = W.empty) : V = W
```

`Cas/IR/View.lean` was NOT edited. `View.ext` is a new theorem in a new
module ABOUT `View`; the don't-overwrite rule is intact.

### The three landed aggregators

```lean
def wordAgg  : Aggregator Word   -- (· ++ ·), [],  from List.append_assoc/nil_append/append_nil
def natAgg   : Aggregator Nat    -- (· + ·),  0,   from Nat.add_assoc/zero_add/add_zero
def storeAgg : Aggregator Store  -- fun σ τ a => (σ a).or (τ a),  fun _ => none

theorem natAgg_comm   : natAgg.Comm
theorem storeAgg_idem : storeAgg.Idem
```

One per rung, and the spread is the argument for keeping the rungs off
the floor: `wordAgg` is the floor and nothing more (a strip's internal
order is admission order, deliberately); `natAgg` is commutative and
not idempotent; `storeAgg` is idempotent and NOT commutative — which
is exactly why `toStore_append_comm` has to buy symmetry with
`Store.Compatible`. `storeAgg_idem` is `toStore_append_self` one level
down, stated about the target instead of about the word.

### The generic shapes

```lean
theorem Query.run_wordAgg_filter (p : Binding → Bool) (w : Word) :
    Query.run wordAgg (fun b => if p b then [b] else []) w = w.filter p

theorem Query.run_natAgg_count (p : Binding → Bool) (w : Word) :
    Query.run natAgg (fun b => if p b then 1 else 0) w = (w.filter p).length
```

`run_natAgg_count` is `FreeAddMonoid.countP` — which Mathlib bundles as
an `AddMonoidHom` and we get as one instance of the bundling this
module already has.

### The generators, and the four agreements

```lean
def columnGen {L : Type} [DecidableEq L] (c : Binding → Option L) (l : L)
    (b : Binding) : Word := if c b = some l then [b] else []
def unregisteredGen (b : Binding) : Word :=
    if Grammar.Ty.ofTag b.node.tag = none then [b] else []
def heightGen (t : Grammar.Ty) (b : Binding) : Nat :=
    if Grammar.Ty.ofTag b.node.tag = some t then 1 else 0
def singleStore (b : Binding) : Store :=
    fun a => if a = b.address then some b.node else none

theorem columnBy_eq_run {L} [DecidableEq L] (c) (l) (w) :
    Query.run wordAgg (columnGen c l) w = columnBy c l w
theorem column_eq_run (t : Grammar.Ty) (w : Word) :
    Query.run wordAgg (columnGen (fun b => Grammar.Ty.ofTag b.node.tag) t) w = column t w
theorem unregistered_eq_run (w : Word) :
    Query.run wordAgg unregisteredGen w = unregistered w
theorem height_eq_run (t : Grammar.Ty) (w : Word) :
    Query.run natAgg (heightGen t) w = (column t w).length
theorem Query.run_storeAgg (w : Word) :
    Query.run storeAgg singleStore w = toStore w
```

And the same four lifted to the structures:

```lean
theorem View.column_eq_ofQuery (t : Grammar.Ty) :
    View.column t = View.ofQuery wordAgg (columnGen (fun b => Grammar.Ty.ofTag b.node.tag) t)
theorem View.unregistered_eq_ofQuery :
    View.unregistered = View.ofQuery wordAgg unregisteredGen
theorem View.height_eq_ofQuery (t : Grammar.Ty) :
    View.height t = View.ofQuery natAgg (heightGen t)
```

---

## 3. The `toStore` agreement — VERDICT: it holds, and cleanly

`Query.run storeAgg singleStore w = toStore w` is proved by induction
on the word, four lines, with `funext` at the carrier and a `by_cases`
on the address. **Nothing fought.** No premise, no `Store.Compatible`,
no honesty hypothesis, no restriction to admitted words. The store is
the query algebra's oldest instance, exactly as QUERIES.md §1 claimed,
and `toStore_append` (`Join.lean:62`) is `run_append` at `storeAgg`.

Two things worth pinning from the proof:

- **The aggregator laws for stores hold unconditionally.** `assoc`,
  `empty_left`, `empty_right` are each `funext` plus a two-case split
  on `Option`. Left bias is not an obstacle to being a monoid; it is an
  obstacle to being COMMUTATIVE, and that is where the price is paid.
- **`Option.or` was chosen over `Option.elim`.** `toStore_append` is
  spelled `.elim (toStore w₂ a) some`; `Option.or` is the same function
  and is the spelling `List.dlookup_append` uses (banked report sweep
  A), which makes the correspondence citation exact. They are
  pointwise identical; the agreement proof crosses between them by
  `by_cases` on the address, not by a rewrite.

Axiom consequence, as asked: the store carrier is a function type, so
every store-valued equality goes through `funext`, which is proved from
quotients. `storeAgg` and `storeAgg_idem` therefore carry `Quot.sound`;
`Query.run_storeAgg` carries `Quot.sound` and `propext`. No
`Classical.choice` anywhere. See §6.

---

## 4. `Cas/IR/Reach.lean` — the edge, the index, the direction

### 4a. THE EDGE READS THE RESOLVED OCCURRENCE — and it is forced, not chosen

```lean
def Edge (w : Word) (a b : Addr32) : Prop :=
  ∃ n, find w a = some n ∧ ∃ r ∈ n.refs, r.addr = b
```

The dispatch asked for the decision to be justified from `wf`'s own
quantification. Here is the argument.

`wf` is `wfFrom []`, and

```lean
wfFrom prior (⟨a, n⟩ :: rest)
  = n.refs.all (resolvesIn prior) && wfFrom (prior ++ [⟨a,n⟩]) rest
```

so the scan quantifies over **every binding OCCURRENCE**: at each
position, that occurrence's references must resolve among the bindings
strictly before it. That is a per-occurrence check, and reading the
edge off every occurrence is therefore the *naive* match to the scan.

**It is also wrong, and the headline theorems are false under it.**
Witness, three bindings over two addresses `a ≠ b`:

```text
w = [ ⟨a, n₀⟩ , ⟨b, m⟩ , ⟨a, n₁⟩ ]
      n₀ : no references
      m  : references a    — resolves in [⟨a,n₀⟩]                 ✓
      n₁ : references b    — resolves in [⟨a,n₀⟩, ⟨b,m⟩]          ✓
```

Every occurrence's references resolve strictly earlier, so `wf w =
true`. The occurrence relation carries `a → b` (from the SECOND binding
at `a`) and `b → a`. That is a two-cycle between distinct addresses:
**acyclicity fails, and so does any strict-index statement** — the
edge `a → b` runs from index 0 to index 1, forward. No premise
available on a grow-only word repairs this, because the word is
legitimately admitted.

The resolved reading is the one the rest of the model already commits
to. `find` answers with the first binding; `toStore` is definitionally
`find`; `toStore_append_shadowed` (Word.lean:252) says the later
binding is invisible through the bridge; `wf_toStore_closed` states
closure of the store — that is, of the resolved nodes. So `Edge` is the
RESIDENT graph, the one `Store.Closed` is about. Under it the same
word carries only `b → a`; `n₁`'s references are still checked by `wf`,
but they belong to a node no query can see.

**Summary of the justification: `wf` licenses BOTH readings, and only
the resolved one supports the theorems — because `find`, not `wf`, is
what decides which node an address has.** The counterexample is
recorded verbatim in the module docstring so the next reader does not
have to rediscover it.

*It is described, not constructed in Lean.* Building two distinct
`Addr32` values means building two 32-byte `Bytes` with their length
proofs; the witness is a design justification rather than a claim, and
the module states it as prose. Flagged in §7.

### 4b. THE INDEX

```lean
def firstIndex : Word → Addr32 → Nat
  | [], _ => 0
  | ⟨c, _⟩ :: rest, b => if b = c then 0 else firstIndex rest b + 1
```

It mirrors `find`'s recursion step for step, including the `if b = c`
test, which is what makes it the index OF THE OCCURRENCE THE EDGE WAS
READ FROM. That is the honesty against shadowing: indexing a later
occurrence would index a node the store does not hold. An address the
word does not bind gets `w.length` — off the end, the standard
not-found convention, and `firstIndex_le_length` is unconditional.

Support lemmas:

```lean
theorem firstIndex_lt_length {w} {b} (h : (find w b).isSome) : firstIndex w b < w.length
theorem firstIndex_append_of_isSome {w} {b} (h : (find w b).isSome) (v : Word) :
    firstIndex (w ++ v) b = firstIndex w b
theorem firstIndex_lt_of_take {w} {b} {k} (h : (find (w.take k) b).isSome) :
    firstIndex w b < k
theorem firstIndex_le_length (w : Word) (b : Addr32) : firstIndex w b ≤ w.length
```

### 4c. THE DIRECTION, and the theorem that is ours

`Word.lean`'s `wfFrom_resolves` states resolution in the WHOLE word —
enough for `Store.Closed`, not enough for a direction. The sharper
reading the scan actually performs had to be extracted:

```lean
theorem wfFrom_refs_prefix : ∀ (w prior : Word), wfFrom prior w = true →
    ∀ {a : Addr32} {n : Node}, find w a = some n →
    ∀ {r : Ref}, r ∈ n.refs →
    resolvesIn (prior ++ w.take (firstIndex w a)) r = true

theorem wf_refs_prefix {w} (hw : wf w = true) {a} {n} (hf : find w a = some n)
    {r} (hr : r ∈ n.refs) : resolvesIn (w.take (firstIndex w a)) r = true
```

and then the headline:

```lean
theorem wf_edge_index {w : Word} (hw : wf w = true) {a b : Addr32}
    (h : Edge w a b) : firstIndex w b < firstIndex w a
```

**ADMISSION ORDER IS A TOPOLOGICAL SORT OF THE REFERENCE GRAPH**, and
the direction is `wfFrom`'s own: the scan hands each binding the prefix
BEFORE it and nothing else, so an edge cannot point forward or
sideways. The direction was read off `resolvesIn`'s quantification, not
selected.

### 4d. The closure, monotone, and acyclic

```lean
inductive Reach (w : Word) (a : Addr32) : Addr32 → Prop where
  | refl : Reach w a a
  | tail {b c : Addr32} : Reach w a b → Edge w b c → Reach w a c

theorem Reach.single {w} {a b} (h : Edge w a b) : Reach w a b
theorem Reach.trans {w} {a b c} : Reach w a b → Reach w b c → Reach w a c
theorem Reach.head {w} {a b c} : Edge w a b → Reach w b c → Reach w a c
theorem Reach.cases_head {w} {a b} (h : Reach w a b) :
    a = b ∨ ∃ c, Edge w a c ∧ Reach w c b

theorem edge_mono {w} (v : Word) {a b} : Edge w a b → Edge (w ++ v) a b
theorem reach_mono {w} (v : Word) {a b} : Reach w a b → Reach (w ++ v) a b

theorem reach_index {w} (hw : wf w = true) {a b} (h : Reach w a b) :
    a = b ∨ firstIndex w b < firstIndex w a
theorem reach_acyclic {w} (hw : wf w = true) {a b}
    (hab : Reach w a b) (hba : Reach w b a) : a = b
```

The two-constructor shape mirrors `Relation.ReflTransGen` exactly
(`refl`, `tail`), as the banked report spells it, restated because the
tower imports nothing. `single`/`trans`/`mono` are that API's.

**`reach_mono` is the patchability licence (QUERIES.md §4) and needs NO
admission premise** — grow-only is the whole argument. "Everything
about X" is patched by growth, never recomputed at a cut.

---

## 5. Decidability — IT LANDED. No debt was taken for it

The dispatch said to attempt it only if cheap and to refuse precisely
otherwise. It was cheap, because `wf_edge_index` IS the termination
measure: every edge strictly descends `firstIndex`, so a path out of
`a` is shorter than `firstIndex w a`, and running a bounded search at
the word's own length is exhaustive rather than merely optimistic.

```lean
def succs (w : Word) (a : Addr32) : List Addr32 :=
  match find w a with | some n => n.refs.map (·.addr) | none => []
theorem mem_succs_iff {w} {a c} : c ∈ succs w a ↔ Edge w a c

def edgeB (w : Word) (a b : Addr32) : Bool :=
  match find w a with
  | some n => n.refs.any (fun r => decide (r.addr = b))
  | none => false
theorem edgeB_iff {w} {a b} : edgeB w a b = true ↔ Edge w a b
instance instDecidableEdge (w : Word) (a b : Addr32) : Decidable (Edge w a b)

def reachIn (w : Word) (b : Addr32) : Nat → Addr32 → Bool
  | 0, a => decide (a = b)
  | k + 1, a => decide (a = b) || (succs w a).any (fun c => reachIn w b k c)

theorem reachIn_self (w) (b) (k) : reachIn w b k b = true
theorem reachIn_sound {w} {b} : ∀ (k) (a), reachIn w b k a = true → Reach w a b
theorem reachIn_complete {w} (hw : wf w = true) {b} :
    ∀ (k : Nat) {a : Addr32}, Reach w a b → firstIndex w a ≤ k → reachIn w b k a = true

def reachB (w : Word) (a b : Addr32) : Bool := reachIn w b w.length a
theorem reachB_sound {w} {a b} (h : reachB w a b = true) : Reach w a b
theorem reachB_complete {w} (hw : wf w = true) {a b} (h : Reach w a b) : reachB w a b = true
theorem reachB_iff {w} (hw : wf w = true) {a b} : reachB w a b = true ↔ Reach w a b

def decidableReach {w : Word} (hw : wf w = true) (a b : Addr32) : Decidable (Reach w a b)
```

Reading the claim discipline strictly: **`reachB_sound` is the
soundness judgment** (the computation says `true` only when a path
exists) and holds on ANY word with no premise; **`reachB_complete` is
the completeness judgment** and holds on an ADMITTED word, consuming
`wf` through `wf_edge_index`. The gap is real and stated: over an
unadmitted word the search may be run at too small a depth, and this
lane does not claim otherwise. `decidableReach` carries no `instance`
attribute for that reason — its premise is `wf w`, which instance
resolution cannot supply. `instDecidableEdge` (one step) IS an
instance, because one step is decidable outright.

Per the banked report §4e/§11d/§11e this is novel territory either way:
Mathlib has no `Decidable` instance for `ReflTransGen` or `TransGen`,
`Digraph` has no path/reachability/acyclicity API at all, `Quiver.Path`
has no acyclicity, and the only topological-order content is the
non-constructive Szpilrajn `extend_partialOrder`. Deciding the closure
here is a CONSEQUENCE of admission — the same sentence as "admission
order is a topological sort", read computationally.

**The one structured debt taken by this lane**, recorded in
`Cas.IR.Reach`'s module docstring in the named form and appearing as
exactly one new row in `meta/out/debts.META.json`:

```
owed(reach-search-memoized)
```

`reachIn` re-explores shared subgraphs, so the search is exponential in
the word's length where a visited-set walk would be linear in the
edges. Nothing above depends on the cost — the model states the
relation and the host computes it — but a frontier-carrying version and
its agreement theorem is a slice of its own.

Debt ledger delta: `docstrings` 26 → 27, `named` 6 → 7, `owed` 20 → 21.
One row, one id, no bare `owed` anywhere in either module.

---

## 6. Axiom report, per module

Ceiling for this lane: `propext` and `Quot.sound`, no
`Classical.choice`. The library's own clean set is wider (it admits
`Classical.choice`), so this is the stricter claim and it holds.

From `meta/out/axioms.META.json`, regenerated by `lake exe axioms`
(which REFUSES on emit, not only on `--check`):

| module | declarations carrying an axiom | axiom sets observed |
|---|---|---|
| `Cas.IR.Query` | 19 | `{Quot.sound}` × 2, `{propext}` × 2, `{Quot.sound, propext}` × 15 |
| `Cas.IR.Reach` | 20 | `{propext}` × 4, `{Quot.sound, propext}` × 16 |

`Classical.choice` count in both modules: **0**. Document-level
`beyondCleanSet`: `[]`. Every remaining declaration in the two modules
(`Aggregator`, `Query.run`, `run_nil`, `run_cons`, `run_singleton`,
`Query.foldr_perm`, `natAgg`, `natAgg_comm`, `View.ext`, the four
generators, `Edge`, `edgeB`, `firstIndex`, `Reach`, `Reach.single`,
`Reach.trans`, `Reach.head`, `Reach.cases_head`, `succs`, `reachIn`,
`reachIn_self`, `reachB`, …) depends on **no axiom at all**.

`Quot.sound` enters through `funext` (the store carrier is a function)
and through `List.Perm`/quotient-backed core lemmas. `propext` enters
through `simp`'s propositional rewriting.

**One measured finding, and it changed the code.** The first version of
`reachIn` tested addresses with `a == b`. That put
`reachIn_complete`, `reachB_complete`, `reachB_iff` and
`decidableReach` on `Classical.choice`. Isolated with `#print axioms`:

```
'p5 : (b == b) = true := beq_of_eq rfl'        depends on [propext, Classical.choice, Quot.sound]
'p6 : decide (b = b) = true := decide_eq_true rfl'   does not depend on any axioms
'p8 : (a == b) = true → a = b := eq_of_beq h'  depends on [propext]
```

`Addr32` is a subtype, and `Subtype.instReflBEq` / `Subtype.instLawfulBEq`
— the instances `beq_self_eq_true` and `beq_of_eq` resolve through —
are classical, while `eq_of_beq` at the same instances is not. Both
`edgeB` and `reachIn` were re-cut to `decide (· = ·)`, the spelling
`find` already uses; the four declarations dropped to
`{propext, Quot.sound}`. The reason is recorded in `reachIn`'s
docstring so nobody re-introduces `==` for tidiness.

---

## 7. Judgment calls, flagged for the grill

1. **`Edge` reads the resolved binding, not every occurrence.** §4a.
   This is the load-bearing call: under the occurrence reading,
   `reach_acyclic` and `wf_edge_index` are FALSE on an admitted word.
   The counterexample is prose in the docstring, not a Lean witness —
   building two distinct `Addr32` values costs two 32-byte `Bytes` with
   length proofs. If the coordinator wants the refutation mechanized,
   that is a separate small slice.
2. **`run_dup_adjacent` is stated at `Idem` alone**, not at the
   `Comm`+`Idem` the dispatch named. The general re-delivery form
   (`run_redelivered`) does consume both. Two theorems where the
   dispatch asked for one.
3. **`single` is spelled `singleStore`.** In `Word`'s namespace a bare
   `Word.single` reads as "a one-binding word". If QUERIES.md's `single`
   is meant to be the surface name, this renames back trivially.
4. **`Aggregator` is a record, `Comm`/`Idem` are `Prop`-valued defs on
   it.** The alternative — a rung as a sub-structure or a typeclass —
   was rejected in Pass B: a rung is a premise a theorem consumes, and
   making it a carrier would create a second thing to keep in step with
   the first.
5. **`View.ext` and the three structure-level agreements were added**
   beyond the pointwise agreements the dispatch listed. They make
   "re-derived, not replaced" an equation. If the coordinator considers
   equality of `View` values out of scope for QA-1, the three
   `*_eq_ofQuery` theorems delete without touching anything else.
6. **`edgeB`/`reachIn` use `decide`, not `==`.** §6. Driven by a
   measurement, but it is still a style divergence from
   `Ref`'s derived `BEq` and worth a look.
7. **Doc coverage.** `Cas.IR.Reach` is 32/32 documented;
   `Cas.IR.Query` is 36/41, the five gaps being `Aggregator`'s
   auto-generated field projections. That matches how `Cas.IR.View`
   treats `View`'s fields exactly (5/10 there), so it is
   house-consistent rather than an omission — but field docstrings are
   available in Lean 4 if the estate wants them.
8. **`Query`/`Aggregator` live in `namespace Cas.Word`**, giving
   `Cas.Word.Query.run` and `Cas.Word.Aggregator`, parallel to
   `Cas.Word.View`. QUERIES.md §1 spells them unqualified.

---

## 8. What is NOT claimed (assurance review)

- Elaboration proves the stated propositions and nothing more. No
  statement here is about a TypeScript build, a host, a transport, or a
  wire; nothing crossed G1.
- `reachB` is complete only on admitted words. On an unadmitted word
  only `reachB_sound` stands. This is a real gap, not a technicality:
  without `wf` a path may exceed the search depth, and no pigeonhole
  argument was attempted.
- `wordAgg` is not claimed commutative or idempotent, and `storeAgg` is
  not claimed commutative. No witness refuting either was constructed —
  the docstrings say what is proved and are silent on the rest.
- `Edge` is a relation on ADDRESSES, not on bindings. The word's
  shadowed bindings are outside its subject by construction, which is
  the point of §4a; a statement about shadowed nodes' references would
  be a different relation.
- No claim about performance beyond §5's stated cost.
- The Mathlib rows cited in the docstrings are the READER LANE's
  verification against source at tag `v4.33.1`
  (`.staging/agent-reports/2026-08-30-mathlib-correspondence.md`), not
  this lane's. `.reference/` receipts remain a promotion-time matter.

---

## 9. Gate tails, verbatim

**`mise run --force check:cas`** — exit **0**. 57 `ok` lines. Tail:

```
13 of 13 controls fire
ok meta/out/laws.META.json (9963 bytes) — 9 of 37 rulings bound, 28 unbound
```

Component tails from the same run:

```
lake --wfail build … (check:cas)          Build completed successfully (278 jobs).
.lake/build/bin/strata --check             ok meta/out/strata.META.json (34416 bytes) —
                                              9 strata, 137 modules (110 walked),
                                              1 violation(s) — 1 known
ok meta/out/environment.META.json (46965 bytes) — 52 tasks, 23 exes, 8 pins (2 distinct)
lake --wfail build (check:cas:surface)    Build completed successfully (113 jobs).
ok meta/out/surface.META.json (1095022 bytes) — 2499 declarations
16 of 16 controls fire
ok meta/out/obligations.META.json (27977 bytes) — 85 obligations
```

The single strata violation is the PRE-EXISTING known misfile (`Cas`
imports `Cas.Backend.HttpProfile`), declared in `lakefile.toml` and
mirrored in `tools/Strata.lean`. This lane added no edge to it.

**Ledgers regenerated through their own emitters** (no file
hand-edited):

```
lake exe surface      wrote meta/out/surface.META.json (1095022 bytes) — 2499 declarations
lake exe obligations  wrote meta/out/obligations.META.json (27977 bytes) — 85 obligations
lake exe laws         wrote meta/out/laws.META.json (9963 bytes) — 9 of 37 rulings bound, 28 unbound
lake exe debts        wrote meta/out/debts.META.json (15338 bytes) — 27 docstring debts, 28 unbound rulings
lake exe axioms       wrote meta/out/axioms.META.json (208211 bytes) — 1244 of 2499 declarations carry an axiom
lake exe strata       wrote meta/out/strata.META.json (34416 bytes) — 9 strata, 137 modules (110 walked), 1 violation(s) — 1 known
```

Surface ledger delta against `HEAD`: modules 85 → 87, declarations
2426 → 2499. The +73 is exactly this lane's two modules (41 walked rows
in `Cas.IR.Query`, 32 in `Cas.IR.Reach`); the uncommitted decision-40
sort batch contributes no net walked declaration, so the two numbers
account for each other with nothing unexplained.

**Effects package** (`library/effects`), the no-op check:

```
$ bun run typecheck
$ tsc --noEmit && tsc -p tsconfig.test.json --noEmit      exit 0

$ bun --bun vitest run
 Test Files  54 passed (54)
      Tests  439 passed (439)
```

439 as expected. **Nothing effects-side moved**: `git status --short
library/effects` lists exactly the 21 entries it listed before this
lane started (the D2 work), byte for byte.

---

## 10. Files

| path | change |
|---|---|
| `library/cas/Cas/IR/Query.lean` | NEW — QA-1 and the agreement derivations |
| `library/cas/Cas/IR/Reach.lean` | NEW — QA-3 |
| `library/cas/Cas.lean` | two imports; the `IR/` front-page bullet extended |
| `library/cas/meta/out/{surface,obligations,debts,axioms,strata}.META.json` | regenerated by their emitters; `laws.META.json` re-emitted byte-identical (this lane binds no ruling) |

Not committed, per the dispatch. No `.staging` contract document was
edited; this report is the lane's only `.staging` write.
