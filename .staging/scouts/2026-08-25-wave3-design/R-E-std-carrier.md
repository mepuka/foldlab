# R-E — canonical-by-construction carriers, and the SHA3 performance path

**G0 advisory · 2026-08-25 · decides nothing; the rulings are the operator's.**

Lane: structural retirement of the duplicate-key fault family (F-12, F-21, F-26, F-28,
F-40, F-41) via a canonical-by-construction field carrier, plus the SHA3 leg of F-44.
Constraint honoured verbatim: **no mathlib, no crypto, no cslib** — everything below is
the pinned toolchain (`leanprover/lean4:v4.33.1`) and the estate's own code.

Consolidation pass. Nothing here is from-scratch design; where a claim rests on nothing
I could read or run, it is marked **ACQUISITION-GAP**.

---

## 0. Method, and the receipt classes

Three receipt classes appear below and are labelled at every use.

| Class | Meaning |
|---|---|
| **READ** | quoted or cited from a file, with path and line |
| **PROBE** | first-hand: I compiled or ran it on this Mac at v4.33.1; the source is in the session scratchpad and reproducible from the listing given |
| **READING** | my interpretation. Not a fact. |

Probes live in `…/scratchpad/probe/P{1..12}.lean` and `…/scratchpad/bench/`. Every probe
in this report is quoted with the exact source needed to re-run it; nothing depends on a
file the operator cannot reconstruct in two minutes.

**Std is toolchain-bundled, not a dependency.** `Std.Data.TreeMap` etc. ship inside
`~/.elan/toolchains/leanprover--lean4---v4.33.1/src/lean/Std/` and are linked into every
Lean binary (lean-host-capabilities.md §1, established fact 4: every binary statically
links `leancpp Lean Std Init leanrt`). Same pin, same trust surface the estate already
ratified. Using `Std.TreeMap` adds **no** `require` to `lakefile.toml` and **no** entry to
`lake-manifest.json` — which for `formal/entity-store` is empty and for `formal/fips202`
is the same (READ: `formal/entity-store/lakefile.toml`, four lines, no `[[require]]`).

---

## 1. The fault family, mechanism re-derived

STORE-MODEL §5 clause 4 demands duplicate-free field-name lists. `WFS` implements it via
`dupFreeS` (READ: `E2/Model.lean:163`). The carrier does not:

```
inductive FieldList
  | nil
  | cons (key : String) (val : SchemaCore) (optional : Bool) (rest : FieldList)
```
(READ: `E2/Core.lean:95-97`; the value twin `ValueFields` at `:54-56`.)

The sort is an insertion sort whose tie-break sends equal keys **after**:

```
def insertField (key : String) (val : SchemaCore) (opt : Bool) : FieldList → FieldList
  | .nil => .cons key val opt .nil
  | .cons k v o rest =>
      if key < k then .cons key val opt (.cons k v o rest)
      else .cons k v o (insertField key val opt rest)
```
(READ: `E2/Canon.lean:28-34`.) `canonFields` inserts the **head last**
(`E2/Canon.lean:53-55`), so the head lands after every equal key already placed: a
duplicate-key run comes out reversed. Twice reversed is the identity — the involution
that F-12 named, that F-40 turns into a palindromic admission, and that F-41 turns into
the shell rejecting its own bytes.

**PROBE P11** (exhaustive over all 243 length-5 lists on a 3-key alphabet, `#eval`):

```
canonE [("a",1),("a",2),("a",3)]                  = [("a",3),("a",2),("a",1)]
canonE (canonE [("a",1),("a",2),("a",3)])         = [("a",1),("a",2),("a",3)]
(allLists 5).all (fun l => canonE (canonE l) == canonE l)   =  false
```

The mechanism reproduces exactly. Note what it is **not**: it is not a property of sorting
by key, and it is not a property of a list carrier. It is the direction of one comparison.
§5 returns to this.

---

## 2. Option (a) — `Std.TreeMap` / `Std.ExtTreeMap` as the model's field carrier

### 2.1 Verdict: **infeasible as the model carrier.** Kernel-level, three probes.

`SchemaCore.object (fields : FieldList)` is a *nested* occurrence: the field carrier
contains `SchemaCore`, the type being defined. A map carrier therefore has to survive
nested-inductive elaboration. It does not.

**READ** — the toolchain says so in its own docstring, `Std/Data/TreeMap/Basic.lean:63-66`:

> These tree maps contain a bundled well-formedness invariant, which means that they
> cannot be used in nested inductive types. For these use cases, `Std.TreeMap.Raw` and
> `Std.TreeMap.Raw.WF` unbundle the invariant from the tree map.

**PROBE P1** — `Std.TreeMap`:
```lean
inductive S1 | leaf | node (fs : Std.TreeMap String S1)
```
```
error: (kernel) application type mismatch
  Std.DTreeMap.Internal.Impl.WF inner
argument has type _nested.Std.DTreeMap.Internal.Impl_3
but function has type (Std.DTreeMap.Internal.Impl String fun x => S1) → Prop
```
Rejected by the **kernel**, not the elaborator. The bundled `wf : inner.WF` field
(READ: `Std/Data/DTreeMap/Basic.lean:69-73`) cannot be re-indexed at the nested copy.

**PROBE P2** — `Std.ExtTreeMap`:
```
error: (kernel) application type mismatch
  Quotient (Std.DTreeMap.isSetoid String (fun x => S2) compare)
```
Same wall, one layer worse: `ExtDTreeMap.inner : Quotient (DTreeMap.isSetoid α β cmp)`
(READ: `Std/Data/ExtDTreeMap/Basic.lean:81`). A quotient of the nested type is not a
nested inductive at all.

**PROBE P3** — `Std.TreeMap.Raw` **compiles**. And this is where the option dies for a
different reason: `Raw` is the variant with the invariant *removed*
(READ: `Std/Data/TreeMap/Raw/Basic.lean:65-80` — `structure Raw` wraps
`DTreeMap.Raw`, and `WF` is a *separate* structure). Duplicate keys are therefore
representable again:

**PROBE P5**:
```lean
def dup : TreeMap.Raw String Nat :=
  ⟨⟨Impl.inner 2 "a" 1 (Impl.inner 1 "a" 2 .leaf .leaf) .leaf⟩⟩
#eval dup.toList     -- [("a", 2), ("a", 1)]
#eval dup.get? "a"   -- some 1
```
Two bindings for `"a"`, out of key order, in one line of ordinary code. **The one map
variant that fits the carrier provides none of the guarantee the option was for.**

Two further costs of the `Raw` route, both first-hand:

- **PROBE P4** — `deriving instance DecidableEq for S3` →
  `None of the deriving handlers for class DecidableEq applied to S3`.
  `E2/Core.lean:103` derives `DecidableEq` for `SchemaCore, FieldList, SchemaList`, and
  `:105-108` recovers all four `BEq` instances from it. Both are lost.
- **PROBE P12** — `termination_by structural` fails over the nested-`Raw` carrier
  (`failed to infer structural recursion: … failed to eliminate recursive application`).
  `E2/Canon.lean`, `E2/Encode.lean` and `E2/Model.lean` use `termination_by structural`
  on **every** mutual block. The estate's stated shape — "mutual-monomorphic per the
  metaprogramming survey §4 (deriving DecidableEq works, `induction` works)"
  (READ: `E2/Core.lean:17-18`) — does not survive.

**READING.** Option (a) as posed is not a cost question. It is a type-theory wall, and the
`Raw` escape hatch trades the wall for the exact defect the option existed to remove.

### 2.2 What the Std receipts *do* say — collected, because they are still worth having

These are real, they land at **`String` keys**, and they are sorry-free. They are the
answer to "which theorems come free from Std", and they remain usable **at the shell**
(where nothing is nested) even though they are unusable in the model carrier.

| Receipt | Statement | Where |
|---|---|---|
| `Std.TreeMap.ordered_keys_toList` | `(toList t).Pairwise (fun a b => cmp a.1 b.1 = .lt)` | `Std/Data/TreeMap/Lemmas.lean:960` |
| `Std.TreeMap.distinct_keys_toList` | `(toList t).Pairwise (fun a b => ¬ cmp a.1 b.1 = .eq)` | ibid. `:956` |
| `Std.TreeMap.ordered_keys` / `distinct_keys` / `nodup_keys` | same on `t.keys` | ibid. `:864 / :856 / :860` |
| `Std.TreeMap.map_fst_toList_eq_keys` | `(toList t).map Prod.fst = t.keys` | ibid. `:869` |
| `Std.TreeMap.length_toList` | `(toList t).length = t.size` | ibid. `:879` |
| `Std.TreeMap.equiv_iff_toList_eq` | `t₁ ~m t₂ ↔ t₁.toList = t₂.toList` | ibid. `:4511` |
| `Std.ExtTreeMap.toList_inj` | `t₁.toList = t₂.toList ↔ t₁ = t₂` | `Std/Data/ExtTreeMap/Lemmas.lean:3851` |
| `Std.ExtTreeMap.ext_getElem?` (`@[ext]`) | `(∀ k, t₁[k]? = t₂[k]?) → t₁ = t₂` | ibid. `:3834` |
| `Std.ExtTreeMap.ordered_keys_toList` / `distinct_keys_toList` | as above | ibid. `:856 / :852` |
| `DecidableEq (ExtTreeMap α β cmp)` | instance, given `LawfulEqCmp`+`TransCmp`+`LawfulBEq β` | `Std/Data/ExtTreeMap/Basic.lean:556` |

**Answering the lane question directly: yes, sortedness of `toList` is a Std lemma —
`ordered_keys_toList`.** Iteration order is byte order for `encSchema`
(READ: `E2/Encode.lean:133-137`, `encFieldList` walks the list in order), so
`ordered_keys_toList` is precisely the encode-side canonicity lemma one would want.

Every one of those lemmas is `[TransCmp cmp]`-conditional, so the load-bearing question is
whether `TransCmp` is instantiable for `String` **without mathlib**. It is.

**PROBE P8**, sorry-free:
```lean
example : TransCmp    (compare : String → String → Ordering) := inferInstance   -- ✓
example : LawfulEqCmp (compare : String → String → Ordering) := inferInstance   -- ✓
theorem sorted_for_string (t : TreeMap String Nat) :
    t.toList.Pairwise (fun a b => compare a.1 b.1 = .lt) := TreeMap.ordered_keys_toList
theorem ext_for_string (t₁ t₂ : ExtTreeMap String Nat) (h : t₁.toList = t₂.toList) :
    t₁ = t₂ := ExtTreeMap.toList_inj.mp h
```
```
'sorted_for_string' depends on axioms: [propext, Classical.choice, Quot.sound]
'nodup_for_string'  depends on axioms: [propext, Classical.choice, Quot.sound]
'ext_for_string'    depends on axioms: [propext, Classical.choice, Quot.sound]
```
`TransCmp` is `Init/Data/Order/Ord.lean:192`, with `isLE_trans` as its field; `OrientedCmp`
supplies `lt_of_not_isLE` (`:167`), `isGE_iff_isLE` (`:121`). All in `Init`, all pinned.

### 2.3 Which E2 theorems restate, die, or come free — *if* the carrier existed

Stated hypothetically, and it matters that it is hypothetical (§2.1).

**Die (become trivial or vanish):**
- `ObligationCanonSorts` (`E2/Obligations.lean:66`) — becomes `ordered_keys_toList`.
- `fieldsSortedB` (`E2/Canon.lean:168`) — no longer definable on the carrier; nothing to
  decide.
- `keyAbsent`, `fieldsDupFreeB`, `dupFreeF`, and their four value twins
  (`E2/Canon.lean:101-165`) — eight `Bool` predicates, all unrepresentable-away. The
  `dupFreeS` conjunct of `WFS` (`E2/Model.lean:163`) drops out of the definition, and with
  it F-26's repair (`dupFreeS (.lit v) := dupFreeV v`) becomes moot on the object plane —
  **but not on the `lit` plane**, see the residual note in §4.
- `ObligationCanonIdempotent` and `ObligationCanonVIdempotent`
  (`E2/Obligations.lean:62, 73`) lose their `dupFree` hypotheses; the whole conditional
  form introduced by the F-12 amendment is retired.

**Restate:** `canonFields`/`canonVFields`/`insertField`/`insertVField` disappear as
functions; `canonS`'s object leg becomes `.object (fs.map canonS)` — `Std.TreeMap.map`
exists with `toList_map` (`Std/Data/TreeMap/Lemmas.lean:4941`). `closedF`, `guardedF`,
`substF`, `refsF`, `ConformsF` and their value twins restate as folds; `foldl_eq_foldl_toList`
(`:976`) converts each into a list statement, so their proofs restate rather than restart.

**Come free:** `directionA` (`E2/Obligations.lean:35`) is unchanged. `M4a_schema` /
`M4a_value` (`E2/Decode.lean:929, 937`) — currently **proved unconditional** — would need
the decoder to rebuild via `ofList`, and `Std` supplies exactly the two lemmas required:
`size_ofList` (`:1536`) and `getElem?_ofList_of_mem` (`:1444`), **both** of which take a
`distinct : l.Pairwise (fun a b => ¬ cmp a.1 b.1 = .eq)` premise. The encode side supplies
that premise for free (`distinct_keys_toList`). Std's own lemma shape is the argument of
§2.4: without duplicate-freedom on the input list you get only `size_ofList_le` (`:1541`).

### 2.4 Decode: where the duplicate-key check must live — and why not check 2

**The hazard is real and I measured it. PROBE P6:**
```lean
#eval (TreeMap.ofList [("a",1),("b",2),("a",3)] compare).toList  -- [("a", 3), ("b", 2)]
#eval (TreeMap.ofList [("a",1),("b",2),("a",3)] compare).size    -- 2
```
Silent last-wins dedup. A decoder that builds the map from wire bytes launders F-41's bytes
into a well-formed carrier.

Under a map carrier, boundary check 2 (`Boundary.lean:138`, `p.canonicalPreimage ≠ b`, and
its scan twin at `:220`) **would** catch it: re-encoding a 2-entry map emits count frame 2
against the input's 3, so the byte-compare fails. But relying on that is exactly the F-43
pattern — a trust instrument that happens to cover a hole it was not designed for.

**Recommendation (advisory).** The check belongs in `decFs` / `decVFs`
(`E2/Decode.lean:350` and `:204`) as a **strictly-ascending-keys** requirement on the wire:
reject unless each decoded key strictly exceeds its predecessor. That single condition
enforces duplicate-freedom *and* canonical order in one place, it is decidable with
`compare`, and it is the exact predicate `ordered_keys_toList` produces on the encode side —
so `M4a` closes against it rather than around it. Three reasons to prefer it over check 2:

1. `decodeSchema` is called from `classify` (`Boundary.lean:65-74`) **and** from
   `resolveSchema` (`Boundary.lean:146`, `:225`). Only the first is followed by check 2.
2. Q5 says *reject, never normalize*. A map decode normalizes. Putting the check downstream
   of the normalization means the model briefly holds a value the ruling forbids.
3. `M4b` is already OWED (READ: `E2/Decode.lean:939-941`: "decode rejects every byte string
   outside the image of the encoding"). Strict ascent in `decFs` is a down-payment on M4b
   that the map carrier would need anyway.

### 2.5 Blast radius, counted

Live tree only (worktrees under `.claude/worktrees/` excluded). `grep -rc` over `*.lean`:

| File | occurrences of `FieldList`/`ValueFields` |
|---|---|
| `formal/entity-store/E2/Decode.lean` | 20 |
| `formal/entity-store/E2/Canon.lean` | 11 |
| `formal/entity-store/E2/Core.lean` | 9 |
| `formal/entity-store/E2/Model.lean` | 8 |
| `formal/entity-store/E2/Encode.lean` | 8 |
| `experiments/entity-store-shell/Shell/Render.lean` | 6 |
| `experiments/entity-store-shell/Shell/Carrier.lean` | 6 |
| `formal/entity-store/E2/Closure.lean` | 4 |
| `Obligations` / `Correspondence` / `Bridge` / `A4Probe` | 1 each |
| **total** | **76 occurrences across 12 files** |

Declarations *indexed by* the field carrier, enumerated by hand from the sources:

- **schema plane, 19**: `FieldList`, `FieldList.length`, `insertField`, `canonFields`,
  `keyAbsent`, `fieldsDupFreeB`, `dupFreeF`, `fieldsSortedB`, `closedF`, `guardedF`,
  `substF`, `ConformsF`, `refsF`, `encFieldList`, `decFs`, `szFs`, `litsCanonicalF`,
  `sexpToFieldList`, `renderFieldList`.
- **value plane, 14**: `ValueFields`, `ValueFields.length`, `insertVField`, `canonVFields`,
  `vkeyAbsent`, `vfieldsDupFreeB`, `dupFreeVF`, `refsVF`, `encValueFields`, `decVFs`,
  `szVFs`, `ConformsAllF`, `sexpToValueFields`, `renderValueFields`.
- **33 declarations total.**

Theorems stated directly at the field carrier: `rtFs` (`Decode.lean:740`), `szleFs` (`:893`),
`rtVFs` (`:538`), `szleVFs` (`:808`), `mem_refsF_insertField` (`Closure.lean:18`),
`mem_refsVF_insertVField` (`:37`), `mem_refsF_canon` (`:92`), `mem_refsVF_canon` (`:139`)
— **8**. A further ~13 pass through a field leg inside a mutual induction (`rtV`, `rtS`,
`szleV`, `szleS`, `mem_refsS_canon`, `mem_refsV_canon`, `encSchema_inj`, `encValue_inj`,
`M4a_value`, `M4a_schema`, `allResolve_canonS`, `allResolve_canonV`, `M9_wf2`).

**READING.** ~33 declarations, ~21 theorems, 12 files. That is a full re-seat of the
carrier layer, not an edit. It is affordable only if it buys something; §2.1 says it buys
nothing that the toolchain will let us keep.

---

## 3. Option (b) — subtype carrier `{l : FieldList // Sorted ∧ dupFree}`

### 3.1 Feasibility: yes, and it is the only one of the three that actually delivers (a)'s guarantee

No Std type appears in the carrier, so §2.1's nesting wall is irrelevant. The nested
occurrence is `Subtype (fun l : FieldList => …)` over the *existing* inductive; the
inductive itself is unchanged, so `deriving DecidableEq`, `termination_by structural` and
`induction` all keep working on `FieldList` — they just are not the public entry point any
more.

**ACQUISITION-GAP.** I did **not** probe whether a `Subtype` of a nested-mutual member
elaborates in the *object* position (`SchemaCore.object (fields : {l : FieldList // P l})`
where `P` mentions `SchemaCore` through `dupFreeF`). The predicate is `Bool`-valued and
mentions `SchemaCore`, so the subtype's *proposition* refers to the type being defined. I
believe this fails the same way P1/P2 do and that the workable shape is instead to keep
`FieldList` raw in the constructor and make the *smart constructor* the only public way in
(§3.3). **This is the single highest-value follow-up probe in this report** and it is
cheap: one `inductive` declaration and `lean` on it.

### 3.2 What it buys, priced against the actual code

- The eight `dupFree*`/`sorted` `Bool` predicates in `E2/Canon.lean:101-174` become the
  carrier's own proof component. `WFS` (`E2/Model.lean:163`) loses its `dupFreeS` conjunct.
- `ObligationCanonIdempotent` / `ObligationCanonVIdempotent` lose their hypotheses; the
  post-F-12 conditional forms retire.
- F-26 dies **only on the object plane**. `dupFreeS (.lit _) = true` unconditionally
  (READ: `E2/Canon.lean:112`) — the `lit` payload is a `Value`, and a `Value.vobj` inside a
  `lit` is still a `ValueFields`. **Unless the value plane gets the same subtype**, F-26
  reappears exactly where the F-26 repair put it. This is the plane-crossing that F-35 and
  F-29 also live on. The repair must be **both planes or neither**.
- Byte form is **unchanged**: `encFieldList` walks the underlying list, and the underlying
  list of a canonical carrier is byte-identical to today's `canonFields` output on
  duplicate-free input.

### 3.3 Ergonomics — the honest price

- **Every construction site needs a proof component.** In the model that is fine (the
  smart constructor supplies it). At the shell it lands on `sexpToFieldList`
  (`Shell/Carrier.lean:184`) and on `decFs` (`Decode.lean:350`), both of which return
  `Except`/`Option` already — so the proof obligation folds into the existing failure
  channel rather than adding one. That is the cheap half.
- **`canonFields` becomes the smart constructor**, and it must be *total into the subtype*.
  Today it is not: on a duplicate-key input it produces a duplicate-key output. So the smart
  constructor has to be `FieldList → Option {l // …}` (reject) or the sort must be changed
  (§5). **The subtype does not by itself say what happens to duplicate input** — it only
  says the result cannot hold it. That decision is still a ruling.
- **Every proof that pattern-matches a field list gains a `.val` / `.property` step.**
  Across the ~21 theorems in §2.5 that is mechanical but not free.
- `DecidableEq` survives: `Subtype` has a `DecidableEq` instance whenever the base and the
  predicate do, and the predicate is `Bool`-valued (decidable by `decide`). `BEq` recovery
  at `E2/Core.lean:105-108` is unaffected.

**READING.** (b) is feasible modulo the §3.1 gap, delivers what (a) promised, and costs
roughly the same 33 declarations — but keeps `deriving DecidableEq`, keeps structural
recursion, and adds zero Std surface. If the operator wants a carrier change, this is the
one that survives contact with the kernel.

---

## 4. Option (c) — status quo plus a strengthened `WFS`/boundary (family-2 point repair)

### 4.1 What it fixes

F-33's finding is that the boundary enforces **no** part of `WFS` — "not `closedB`, not
`guardedB`, not `dupFreeS`". Making `admit` (`Boundary.lean:125`) and `scanObject`
(`:215`) check `WFS` closes F-40 (the palindromic admission), closes F-28's boundary half,
and — with F-26's repair `dupFreeS (.lit v) := dupFreeV v` already supplied and checked
over 15,310 schemas — closes the `lit` plane too. It is by far the cheapest change: two
call sites and one new `Rejection` constructor.

### 4.2 Residual risk: the next plane the predicate misses

This is the question the option must answer, and the register already names four planes
where "the model accepts, the boundary rejects" has bitten (F-3, F-12, F-21, and now F-35).
The residual is structural, not incidental:

1. **`Check` payloads.** F-29: `Check.filter (id) (payload : Value)` carries a `Value`, and
   **nothing canonicalizes it** — `canonS`'s refine leg is `.refine (canonS s) c`, the
   check untouched (READ: `E2/Canon.lean:41`). A `payload = .vobj` with duplicate keys is
   neither sorted nor dup-checked, and it is address-significant. A `dupFreeS` strengthened
   to recurse into `lit` still does **not** reach `Check`. That is the next plane, named,
   with a receipt.
2. **`.lit (.vaddr a)`** — F-35: an address inside a `lit` payload is invisible to `refsS`.
   Same shape: a predicate over the schema spine that a payload evades.
3. **The predicate and the sort stay independent.** `dupFreeS` says "no duplicates";
   `canonFields` still *does the wrong thing* if one slips through. The boundary becomes
   the only thing standing between a duplicate-key carrier and a wrong address. F-43's
   lesson is that a single evadable instrument is not a guarantee.
4. **The model still constructs them.** F-28's core complaint survives entirely: duplicate-key
   values remain reachable *inside* the model via `.record` and `.lit`, so
   `ObligationCanonVIdempotent` stays vacuous exactly where F-12 bit. (c) moves the fault
   from "admitted" to "unreachable through the shell" — which is a real improvement and is
   not the same as retirement.

**READING.** (c) is the right *immediate* repair and the wrong *terminal* one. It leaves the
family alive in the model and buys time.

---

## 5. A fourth option the lane did not name, found while re-deriving the mechanism

**The involution is one comparison.** `E2/Canon.lean:31` reads `if key < k` — equals go
after. Change it to `if !(k < key)` — equals go before — and because `canonFields` inserts
the head last, the head now lands **first** among its equals. That is a stable insertion
sort.

**PROBE P11**, exhaustive over all 243 length-5 lists on a 3-key alphabet:

| | E2's guard `key < k` | stable guard `!(k' < k)` |
|---|---|---|
| `canon [("a",1),("a",2),("a",3)]` | `[("a",3),("a",2),("a",1)]` | `[("a",1),("a",2),("a",3)]` |
| idempotent on all 243? | **false** | **true** |
| stable (equal keys keep input order)? | no | **true** |

And the same result is available as a *theorem*, not a check, from the toolchain's own
mergeSort lemmas. **PROBE P10**, instantiated at the estate's actual key type `String`,
sorry-free:

```lean
abbrev F := String × Nat
def leK (a b : F) : Bool := (compare a.1 b.1).isLE

theorem canon_idem_unconditional (l : List F) :
    (l.mergeSort leK).mergeSort leK = l.mergeSort leK :=
  List.mergeSort_of_pairwise (List.pairwise_mergeSort leK_trans leK_total l)

theorem canon_sorts (l : List F) : (l.mergeSort leK).Pairwise (fun a b => leK a b = true) :=
  List.pairwise_mergeSort leK_trans leK_total l

theorem canon_perm (l : List F) : (l.mergeSort leK).Perm l := List.mergeSort_perm l leK
```
```
'canon_idem_unconditional' depends on axioms: [propext, Classical.choice, Quot.sound]
'canon_sorts'              depends on axioms: [propext, Classical.choice, Quot.sound]
'canon_perm'               depends on axioms: [propext, Classical.choice, Quot.sound]
```

Receipts: `List.mergeSort_of_pairwise` (`Init/Data/List/Sort/Lemmas.lean:321`),
`List.pairwise_mergeSort` (`:305`), `List.mergeSort_perm` (`:280`). And the docstring of
`pairwise_mergeSort` (READ, `:298-303`) says the load-bearing thing outright:

> The comparison function need not be irreflexive, i.e. `le a b` and `le b a` is allowed
> even when `a ≠ b`.

That is the duplicate-key case, named by Std, and the theorem holds through it.
`leK_trans` is `Std.TransCmp.isLE_trans` and `leK_total` falls out of
`Std.OrientedCmp.lt_of_not_isLE` — both in `Init/Data/Order/Ord.lean`.

### 5.1 What this option does and does not retire — and the trap

**Retires, unconditionally:**
- `ObligationCanonIdempotent` / `ObligationCanonVIdempotent` lose their `dupFree`
  hypotheses. The post-F-12 conditional forms retire.
- **F-41 dies outright.** `preimageS` becomes idempotent *as a byte function* on all input,
  so the shell can no longer reject bytes it produced.
- **F-26 dies.** The involution does not reappear one plane up under Q13, because there is
  no involution anywhere.
- F-12's mechanism ceases to exist.

**Makes strictly worse, and this is the trap:**
> **F-40 gets worse, not better.** Today only *palindromic* duplicate-key runs byte-compare
> equal to their re-canonicalization and are admitted. Under a stable sort **every**
> duplicate-key carrier is a fixed point, so check 2 admits **all** of them.

So option (5) is **necessary but not sufficient**, and deploying it *without* (c)'s boundary
`dupFree` check would widen F-40 from a special case to the general one. The pair
(5)+(c) retires the whole family at the byte layer; either alone does not.

### 5.2 Cost and the one implementation caveat

Two guards change (`E2/Canon.lean:31` and `:68`). No carrier change, no Std type in the
model, no arity change to the *duplicate-free* byte forms, `termination_by structural`
preserved, `deriving DecidableEq` preserved, 0 new declarations, ~2 lines.

**Caveat, and it is a genuine one.** The mergeSort route (`List.mergeSort`) is *not*
directly available: `FieldList` is a bespoke inductive, not `List`, and converting
`FieldList ↔ List (String × SchemaCore × Bool)` inside a mutual block would break
`termination_by structural` and force a well-founded measure. The guard flip keeps
structural recursion and gives the same behaviour (P11 checks it exhaustively on a finite
domain), but its idempotence would then need proving *by hand* rather than cited from
`mergeSort_of_pairwise`. **Choose deliberately**: cite-a-Std-theorem plus a termination
re-proof, or a two-token change plus an original proof. Both are small; they are not the
same small.

---

## 6. Alignment: I-004, I-002, and the arity law

| | I-004 license | I-002 | arity? |
|---|---|---|---|
| **(a) `Std.TreeMap`/`ExtTreeMap`** | Squarely licensed — I-004: "A dependency may supply storage, parsing, **collections**, tactics, or execution machinery when its semantic role and trust cost are declared", and Std is toolchain-bundled (STORE-SHELL §3/SH8, same pin). But I-004 also says "the project owns the definitions appearing in its public formal claims" — `E2.FieldList` **is** such a definition, appearing in `ConformsF`, `WFS`, `encSchema_inj`. Making it `Std.TreeMap` moves a public formal claim onto a dependency type. Declarable, not free. | `ExtTreeMap` is a quotient — immutable, referentially transparent, total. Clean. `Raw` is not: `Raw` + `WF` is exactly the "unchecked" shape I-002 warns about, and P5 shows the hole. | **No.** Byte form of a canonical field list is unchanged: same `encNat` count frame, same key/opt/schema triples, same order. What changes is the *accept set* — strictly narrower. That is a reject-set widening, not an arity change; it breaks re-opening only for stores that already violate STORE-MODEL §5 clause 4. Needs a ruling, not a version byte. |
| **(b) subtype** | Fully project-owned. The strongest I-004 position of the three. | Ideal: the invariant is a proof component, failure is a typed `Option`/`Except` at the two entry points that already have one. Matches I-001 step 3 ("define well-formedness … judgments") exactly. | **No**, same argument as (a). |
| **(c) boundary only** | Nothing enters. | Unchanged; but I-002's "must not hide … partial pattern matches" is arguably already violated by a `WFS` the boundary does not enforce (F-33). | **No.** Pure rejection widening at the shell. |
| **(5) stable sort** | Nothing enters if the guard is flipped; `List.mergeSort` if cited — licensed collections utility, toolchain-bundled. | Clean either way. | **Yes, on the faulty subset only.** `canonS` of a duplicate-key schema produces different bytes, hence a different address. Any store already holding one is invalidated. If (c) lands first and duplicates are rejected at the boundary, the change is invisible; if it lands alone, it is a silent re-addressing. **Sequencing matters: (c) before (5).** |

---

## 7. Part 2 — the SHA3 path inside "no crypto"

### 7.1 What the estate already has

`Sha3.Impl` is **already word-based at the state**: `abbrev St := Vector (BitVec 64) 25`
(READ: `formal/fips202/Sha3/Impl.lean:19-20`). θ/ρπ/χ/ι are lane operations. The
`List UInt8` representation is only at the **message and output boundary**: `padBytes`
(`:81`), `laneOfBytes` (`:71`), the absorb fold in `sha3_512` (`:92-98`), `bytesOfLane`
(`:87`). `Sha3.Spec` is bit-addressed (`StateArray := Fin 5 → Fin 5 → Fin 64 → Bool`,
`Spec.lean:19`) and is explicitly "the meaning, never the executor" (`Spec.lean:8-9`).

The survey's relevant line (READ: `verified-sha-survey.md` §6) is that the published Lean 4
SHA-3 (Doussot, ePrint 2024/1880) proves **index bounds, not functional correctness**, and
runs ~100× slower than Rust; `emberian/dregg` claims a sorry-free FIPS 202 refinement chain
but is AGPL, single-developer, unreviewed and **not built or checked by that sweep**. So
there is no artifact to import even if the constraint allowed it. Staying inside the
estate's own fips202 is the only option, and it is also the right one.

### 7.2 Where the 26 KB/s actually goes — measured, not argued

Compiled binary (not `#eval`), v4.33.1, on this Mac, with the estate's own benchmark trap
avoided (`IO.mkRef` pins the pure `let` between the clocks — lean-host-capabilities.md §3,
established fact 19). Scratch project at `…/scratchpad/bench/`, `require`ing
`formal/fips202` by path; no repo file touched.

**PROBE — `Sha3.Impl.sha3_512` as it stands:**

| bytes | ms | KB/s |
|---|---|---|
| 23,040 | 456 | 49 |
| 46,080 | 912 | 49 |
| 92,160 | 1,900 | 47 |
| 184,320 | 3,873 | 46 |
| 368,640 | 8,315 | 43 |

Throughput **degrades with size**. The cause is an accidental quadratic, and it is
isolable. `sha3_512`'s absorb fold (READ: `Impl.lean:95-97`) is

```lean
(List.range n).foldl (fun s i => absorbBlock s ((P.drop (i * rateBytes)).take rateBytes)) …
```

`List.drop (i*72)` walks `72i` cons cells on iteration `i`. **PROBE — the same fold shape
with the permutation removed:**

| bytes | drop-only ms | ratio per doubling |
|---|---|---|
| 92,160 | 69 | — |
| 184,320 | 283 | 4.10 |
| 368,640 | 1,135 | 4.01 |
| 737,280 | 4,731 | 4.17 |

×4 per doubling. **Θ(n²), confirmed.** Subtracting it, the remainder is exactly linear
(1,831 → 3,590 → 7,180 ms; ratios 1.96, 2.00), i.e. 19.48 µs/byte ≈ 50 KB/s of genuine
per-block cost.

**Extrapolating both terms to 2 MB** (2,097,152 bytes): linear part ≈ 40.9 s, quadratic
drop ≈ 1,135 ms × (2097152/368640)² = 36.7 s, **total ≈ 78 s**. F-44 recorded ~76 s for a
2 MB object on the PC. Independent host, independent method, same number. **F-44 is
corroborated, and roughly half of it is a `List.drop` that has nothing to do with SHA-3.**

### 7.3 Feasibility of a `ByteArray`/`UInt64` refinement — measured

I built one as a scratch prototype (`…/scratchpad/bench/Fast.lean`, ~90 lines): state
`Array UInt64` (25 lanes), message `ByteArray` read by offset (no `drop`), same algorithm
shape, same constants. **It agrees with `Sha3.Impl.sha3_512`** on the two CAVP vectors that
`Impl.lean:127-131` `#guard`s and on a 5,000-byte message:

```
agree0=true   agree1=true   agreeBig=true
```

| bytes | `Sha3.Impl` (List/BitVec) | prototype (ByteArray/UInt64) | speedup |
|---|---|---|---|
| 23,040 | 463 ms | 8 ms | **58×** |
| 92,160 | 1,976 ms | 32 ms | **62×** |
| 368,640 | 8,426 ms | 128 ms | **66×** |
| 1,048,576 | — | 366 ms | 2,797 KB/s |
| 2,097,152 | — | 733 ms | 2,793 KB/s |

Prototype throughput is **flat** (2,797 vs 2,793 KB/s) — the quadratic is gone.
Against F-44's 2 MB ≈ 76 s: 733 ms is **~104×**.

**Expected speedup class, stated honestly:** ~**60×** from the representation change alone
(per-block, size-independent), and a further ~**2× at 2 MB** from removing the Θ(n²) drop,
compounding to ~**100× at 2 MB** and growing with object size. The prototype is
unoptimised (it allocates a fresh 25-element `Array` per θ/ρπ/χ), so 60× is a floor for this
class of change, not a ceiling.

**Caveat, stated plainly.** The prototype uses `get!`/`set!` throughout, which I-002
forbids in the formal core ("partial pattern matches", and the estate's own note that
`arr[i]!` on user-controlled input aborts the host process). A production version must be
`Vector`-indexed with `Fin` bounds or carry the bounds proofs. That costs work; it does not
cost speed.

### 7.4 Why the representation is where the time is — the mechanism

`BitVec w` is `structure BitVec (w : Nat) where ofFin :: toFin : Fin (2^w)`
(READ: `Init/Prelude.lean:2376-2382`), i.e. a `Nat` at runtime. There is **no `@[extern]`**
on the BitVec operations in `Init/Data/BitVec/Basic.lean`. Lean's `Nat` is GMP-backed with
a small-integer tag, so a 64-bit lane whose value is ≥ 2^63 is a **heap-allocated bignum** —
about half of all lanes at any moment, in a permutation designed to look random.

`UInt64` is the opposite: `@[extern "lean_uint64_xor"]`, `_land`, `_lor`,
`_shift_left`, `_shift_right`, `_complement` (READ: `Init/Data/UInt/Basic.lean:636-704`),
unboxed native scalars, one machine instruction each. That is the 60×.

### 7.5 The bridge theorem: feasible, and the toolchain is unusually well set up for it

The refinement is **pointwise**: `UInt64.toBitVec` is a bijection, and the toolchain ships a
purpose-built simp set for exactly this direction — `@[int_toBitVec]`, defined across
`Init/Data/UInt/IntToBitVec.lean` and `Init/Data/UInt/Lemmas.lean`, with
`UInt64.toBitVec_xor`, `_and`, `_or`, `_not`, `_shiftLeft`, `_shiftRight` all present
(used at `Init/Data/UInt/Bitwise.lean:795, 876, 967, 1064`). θ, χ and ι bridge by
`simp [int_toBitVec]` congruence per lane. The message side bridges through a real
`ByteArray` lemma file (`Init/Data/ByteArray/Lemmas.lean`): `getElem_eq_getElem_data`
(`:107`), `List.getElem_eq_getElem_toByteArray` (`:127`), `List.data_toByteArray` (`:71`),
`List.size_toByteArray` (`:80`), `data_append` (`:62`), `getElem_append_left`/`_right`
(`:111`, `:116`).

**One genuine trap, and it must be proved rather than assumed.**
`UInt64.shiftLeft a b := a.toBitVec <<< (UInt64.mod b 64).toBitVec` — the shift amount is
taken **mod 64** (READ: `Init/Data/UInt/Basic.lean:664, 671`). `BitVec.ushiftRight` does
not mask (`Init/Data/BitVec/Basic.lean:591`). So `BitVec.rotateLeftAux x n = x <<< n ||| x >>> (64 - n)`
(`:627`) and the natural `UInt64` spelling **diverge at `n = 0`**: BitVec's `x >>> 64` is
`0`, UInt64's `x >>> 64` is `x`. The rotation still comes out right — `x ||| x = x` — but
*by accident*, and `rhov[0] = 0` (READ: `Impl.lean:36`) means the case is live on lane
(0,0) every round. There is no `UInt64.rotateLeft` in core to hide behind. This is the one
place in the bridge where a proof is doing real work.

**ACQUISITION-GAP.** I did not write or check the bridge theorem itself, only its
ingredients. Effort is unestimated here; the ingredient inventory above is what a seat
would start from.

### 7.6 Priority relative to SH5

Agreed and reinforced by the numbers. STORE-SHELL SH5 (READ: `STORE-SHELL.md:146`) reads
"full WF1+WF2 scan in v0; **amortized forms only by amendment**". F-44's cost is
`per-object-digest × every-verb`. The digest work retires ~100× of the first factor;
manifest amortization retires the second factor **entirely** for unchanged objects, and
also retires it for objects the digest speedup cannot help. SH5 is the dominant fix; the
digest is secondary — **but note that the cheapest single change in this whole report is
neither**: removing the `List.drop` from `Impl.lean:96` is a ~2-line, representation-preserving
edit that halves the 2 MB cost with a trivial bridge (the fold's accumulator carries the
remaining tail instead of re-dropping). It is worth doing whatever else is ruled.

---

## 8. ACQUISITION-GAPs

1. **Subtype-in-nested-position** (§3.1) — untested; the highest-value cheap probe here.
2. **Bridge theorem effort** (§7.5) — ingredients inventoried, theorem not attempted.
3. **`TreeMap.Raw` + hand-written `DecidableEq`** — I established the *derived* instance
   fails (P4). Whether a hand-written one is feasible (it needs `DecidableEq` on
   `DTreeMap.Internal.Impl`, which derives only `Inhabited`, READ:
   `Std/Data/DTreeMap/Internal/Def.lean:32`) is untested. Given P12, it would not rescue
   the option anyway.
4. **Well-founded recursion over a nested-`Raw` carrier** — P12 rules out *structural*;
   I did not attempt a `sizeOf` measure. No `sizeOf` lemma for `Raw.toList` was found.
5. **`Check` payload canonicalization** (§4.2 item 1) — I confirmed `canonS` leaves checks
   untouched (`Canon.lean:41`) and that F-29 records the consequence, but did not price a
   repair. It is the next plane and belongs in someone's lane.
6. **Whether the estate wants duplicate input rejected or normalized** by the smart
   constructor (§3.3) — a ruling, not a finding.
7. **My benchmarks are single-machine, single run set, no statistical treatment**, in the
   same posture as the estate's own probe. They establish orders of magnitude and the
   *shape* of the scaling (the ×4-per-doubling is unambiguous); nothing finer.

## 9. What I did not do

No repo file was modified. Probes and the benchmark project live in the session scratchpad.
I did not build `formal/entity-store` (only `formal/fips202`, which the bench project pulled
in as a path `require`; its `.lake/build` was already populated before I started and I added
no target to it). I did not run the shell harness. I read no worktree under
`.claude/worktrees/` except to exclude it from the counts.

---

*G0 advisory. Decides nothing.*
