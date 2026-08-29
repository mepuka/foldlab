# R3 — transport, admission, and the M10/M19 statement shapes

Wave 2, REFUTER 3. Status: **ADVISORY (G0), pre-grade.** Every claim below carries a
kernel-checked receipt or the `UNVERIFIED:` form. Probes are beside this file and were
re-run from this directory against a green tree (`lake build` clean, gate `1,444
constants scanned`, all reports within the estate allowlist `[propext, Classical.choice,
Quot.sound]`).

Probe files: `R3-p1_graph.lean`, `R3-p2_findext.lean`, `R3-p3_spellings.lean`,
`R3-p4_q12.lean`, `R3-p5_openscan.lean`. Run from `formal/entity-store` with
`~/.elan/bin/lake env lean <abs-path>`.

---

## Result

**Two statements should not freeze as planned, and one ratified shell claim is false.**

1. **M19 as worded in G8 is REFUTED.** "Every ref-closed acyclic finite set of
   pre-images admits an insertion order reaching the store containing exactly that set"
   fails on four independent counts, each with a receipt: naive ref-closure ignores the
   kind of the referent (`C_obstruction`), ignores the typing precondition
   (`D_no_conformance`), ignores schema well-formedness (`R3-p5_openscan.lean`), and
   "exactly that set" is false whenever `H` collides on the set (`F_exactly_fails`,
   `F_one_binding`). The fix is not a patch: the statement should be re-based from
   *sets of pre-images* onto *candidate stores*, where the collision clause dissolves
   and the remaining clauses are exactly the shell's checkable admission list. Proposed form in §6.

2. **M10 SURVIVES the attack** — acyclicity holds for an arbitrary `H`, colliding
   included, and the reason is load-bearing and worth pinning in the statement's prose:
   `putPre` no-ops on an occupied address, so an *effective* insert never binds an
   address its own refs already contain. But the statement must say **nodes are
   addresses, not pre-images** (`A_collision_drops`); the pre-image reading is not even
   well defined under a colliding `H`.

3. **STORE-SHELL SH5's ratified claim — "opening a directory as a store ESTABLISHES
   reachability … full WF1+WF2 scan" — is FALSE**, three times over, kernel-checked:
   `HEADLINE_wf1_wf2_insufficient` (a WF1+WF2-satisfying store with a reference cycle,
   unreachable) and `HEADLINE_scan_does_not_establish_reachability` (a store passing
   every SHELL-v0 boundary check and the whole scan, unreachable because the schema is
   not closed — `WFS` is checked nowhere in `Shell/Boundary.lean`); and
   `dup_canon_fixed`, which **refutes F-21's own disposition** — the canonicity
   byte-compare does not cover `dupFreeS`, because `canonS` is a fixed point on a run of
   *identical* duplicate fields. These are live incoherences, not hypotheticals.

4. **The MAPPING single-spelling rule names 2 constructs; there are at least 10
   families, one of them unbounded.** All ten proved: identical `Conforms`, distinct
   pre-images (`R3-p3_spellings.lean`, SP-1…SP-10). Separately, `.lit` of a `vaddr`
   hides an address from `refsS` entirely, which makes MAPPING admission rule 1
   **load-bearing for WF2** — owed a model-level clause, not just a boundary rule
   (SP-11).

5. **Q12's price is REAL, not theoretical**, and the census says so at line level: for
   `mode: "oneOf"` a *second* success is an error (`SchemaAST.ts:3071-3073`, census
   §5(a)). An entity whose value matches two members of a `oneOf` union is `Conforms`,
   is `Reachable`, and is certified by M17 as well-typed — while Effect's decoder
   rejects it at that same schema (`ov_reachable`).

Nothing here touches a proved theorem. M8/M9/M12/M12E/M13/M14/M15/NEG-2 and both M4a
halves are unaffected; the attacks land on planned statements, one ratified shell
claim, and two admission tables.

---

## Target 1 — M10 and M19's planned shapes

### 1.1 What "the graph" is, under a non-injective `H` — **CONDITION-FORCED**

The model's `H : Bytes → Address` is an unconstrained parameter (STORE-MODEL §1), so the
colliding case is inside the theorem's scope, not outside it.

Receipt (`R3-p1_graph.lean`, pathology A, `Hconst c = fun _ => c`):

```
A_collision_drops : σA2 = σA                            -- the second put is a NO-OP
A_bytes_are_s1    : σA2.find cAddr = some (preimageS s1)
A_not_s2          : σA2.find cAddr ≠ some (preimageS s2)
```

So the store is **not** the set of things put into it. `putPre` guards on
`σ.find (H b)`; a colliding second pre-image is silently dropped. Consequences for the
statement:

- **Nodes are ADDRESSES.** `σ` is a map, so each bound address carries exactly one byte
  string, and `refsAt σ a := (refsOfPreimage (σ.find a)).getD []` is total and single
  valued for every `H`. A "graph over pre-images" is ill-defined here: the dropped
  pre-image has no node.
- The pre-image reading only coincides with the address reading when `H` is injective on
  `dom σ`. **CLAUSE FOR THE PIN:** M10 must be stated over addresses and must carry the
  anti-claim *"says nothing about `H`; in particular a colliding `H` does not weaken
  it"* — which is true, and stronger than it sounds (§1.2).

### 1.2 Self-reference — **SURVIVED, with the reason pinned**

The brief asks whether `H (preimageS s)` can appear inside `s`'s own refs for a crafted
`H`. **It can**, trivially:

```
B_self_ref_address : Hconst cAddr (preimageS (.ref cAddr)) = cAddr
B_self_ref_refs    : refsS (.ref cAddr) = [cAddr]
```

So a self-loop is *constructible as a candidate*. It is not *reachable*:

```
B_not_reachable (env) : ¬ Reachable (Hconst cAddr) env [(cAddr, preimageS (.ref cAddr))]
```

and the proof is free — it is `NEG2_dangling_unreachable` instantiated at the
self-referential address. That is a pleasing fact worth recording: **NEG-2, already
proved, already forbids the 1-cycle for every `H`.**

The interaction with `putS`'s precondition is the whole story and should be in M10's
proof-shape note: `Reachable.putS` demands `AllResolve σ (refsS s)` against the
**pre-store**. Either `H (preimageS s) ∈ dom σ` already — and then `putPre` no-ops, so
nothing was added and the IH carries — or it is fresh, and then it is not in `dom σ`,
hence not in `refsS s`. **Every effective insert is a new sink-ward node.** Acyclicity is
two lines of induction with no hypothesis on `H`, exactly as STORE-MODEL §3 WF3 predicts.

### 1.3 WF1 + WF2 does **not** imply reachability — **the headline**

```
HEADLINE_wf1_wf2_insufficient (env) :
    (∀ d b, σB.find d = some b → Hconst cAddr b = d)                       -- WF1 ✓
  ∧ (∀ d b, σB.find d = some b → ∃ rs, refsOfPreimage b = some rs
                                      ∧ AllResolve σB rs)                  -- WF2 ✓
  ∧ ¬ Reachable (Hconst cAddr) env σB                                      -- unreachable
```

STORE-MODEL joint A's ratified sharpening says an implementation "must *establish*
reachability (verify WF1/WF2 on load …)". **WF1 and WF2 are not enough.** Acyclicity is
independent of them and must be checked. This is simultaneously (a) the proof that M19
cannot drop its acyclicity hypothesis, (b) a falsification of SH5 as worded, and (c) a
candidate NEG-3.

*Honest scope:* the witness uses a colliding toy `H`. Under a preimage-resistant `H` a
cycle is computationally infeasible to exhibit — but "infeasible" is a cryptographic
claim the model deliberately never makes (STORE-MODEL §8: "`H`'s properties are
hypotheses with names"). At the model layer the hypothesis is *needed*; at the shell
layer the check is *cheap* (§5.3).

### 1.4 M19's "ref-closed" must be KIND-AWARE — **REFUTED**

Witness (`R3-p1_graph.lean`, pathology C): three pre-images — a schema, an entity typed at
it, and an entity whose declared *schema address* is **the second entity**.

```
C_naive_closed (h12 h13 h23) :
  ∀ d b, (σC a₁ a₂ a₃).find d = some b →
    ∃ rs, refsOfPreimage b = some rs ∧ AllResolve (σC a₁ a₂ a₃) rs
```

Naive ref-closure **holds**. The set is finite and acyclic. Yet the third element is
uninsertable, because `Reachable.putE` demands `σ.find sAddr = some (preimageS s)`:

```
C_obstruction (h12 h23) (s) : (σC a₁ a₂ a₃).find a₂ ≠ some (preimageS s)
entity_is_never_a_schema (σ a sa w) (h : σ.find a = some (preimageE sa w)) (s) :
    σ.find a ≠ some (preimageS s)
```

both by `kind_separation`. **CLAUSE FOR THE PIN:** closure must be typed —
*for every stored entity pre-image, the address it names must hold a SCHEMA pre-image*.
"Present as bytes" is strictly weaker than "present as a schema", and the ratified `putE`
precondition already knows this; M19's hypothesis simply has not caught up.

### 1.5 M19's hypothesis must carry conformance too — **REFUTED**

`{preimageS (.prim .int), preimageE a (.vstr "x")}` with `a` the schema's address is
ref-closed, acyclic, and **kind**-correct. It is still uninsertable:

```
D_no_conformance (env) (n) : ¬ Conforms env (.prim .int) (.vstr n)
```

for every environment. **CLAUSE FOR THE PIN:** the typing precondition is two conjuncts,
and M19 needs both. Q4's ruling already noted that WF2 forces schema-*presence* and that
"the marginal content is the decidable `Conforms` check" — the marginal content is
exactly what M19's hypothesis must state.

### 1.6 The empty set — **SURVIVED**

`E_empty : Reachable H env []` by `Reachable.empty`, for every `H` and `env`. M19's base
case is sound and needs no side condition.

### 1.7 "the store containing exactly that set" — **REFUTED under collision**

```
F_exactly_fails : preimageS s1 ≠ preimageS s2
                ∧ Hconst cAddr (preimageS s1) = Hconst cAddr (preimageS s2)
F_one_binding   : σA2.length = 1
```

Two distinct pre-images, one address, one binding. No reachable store contains both.
**CLAUSE FOR THE PIN, or better, a re-basing:** either M19 carries "H injective on the
set" as a named hypothesis in the Direction-B tradition (STORE-MODEL §1: injectivity
"appears only as a named hypothesis … in Direction-B-shaped theorems"), or — recommended
— M19 is stated over a *candidate store* rather than a *set of pre-images*, in which case
the clause vanishes: a directory cannot hold two files at one name, so a colliding `H`
manifests as *absent* pre-images (an availability question), never as an unreachable
target. See §6.

### 1.8 One more clause, from the canonicalisation side

`Reachable.putS`'s precondition is `AllResolve σ (refsS s)` — refs of the **raw**
carrier — while the stored bytes carry `refsS (canonS s)`. The proved lemma
`mem_refsS_canon` (`E2/Closure.lean:57`) is one-directional (`canon ⊆ raw`), which is
what M9 needs but is the *wrong* direction for M19's reconstruction step. Carrying
`canonS s = s` in M19's hypothesis (which canonical-image strictness gives for free, and
which the shell already byte-checks) makes the two coincide and removes the need for the
missing direction. **CLAUSE FOR THE PIN:** the admitted carrier is already canonical.

---

## Target 2 — F-15's disposition: is find-extensionality the right equivalence?

**Verdict: CONDITION-FORCED.** Find-extensionality is adequate for the rung-1 observables
*as they stand*, but only because of a shell artifact and an unproved invariant, and it
is **not** adequate as a bare `∀ σ` statement.

### 2.1 The shell does not observe order — it deliberately sorts

`Shell/Boundary.lean:196-207`:

```lean
/-- Canonical ordering, so the model view and the disk view are the same list. A disk
    directory listing has no defined order; the store's observables must not inherit
    one. -/
def StoreView.normalize (v : StoreView) : StoreView := …  sortByAddr Prod.fst v.objects …
```

`StoreRoot.readView` (`Shell/Store.lean:96`) normalizes, and `checkReport`
(`Boundary.lean:240`) normalizes again. `refs` renders in carrier order
(`renderAddrList`, `Render.lean:116-118`), identical on both runners because it is the
same code. **So directory-listing order is not observable at rung 1**, and the F-15
concern about the harness inheriting a filesystem order does not bite. That question is
CLOSED, in the shell's favour.

### 2.2 But find-equality is strictly coarser than what `check` prints

`checkReport` sets `objectCount := view.objects.length` (`Boundary.lean:266`) and
`CheckReport.render` prints it in the verdict line: `… objects={r.objectCount} …`
(`Boundary.lean:278`). Two find-equal stores can differ there:

```
find_extensional      : ∀ d, σ1.find d = σ2.find d
observably_different  : σ1.length ≠ σ2.length          -- 2 vs 1
not_a_permutation     : ¬ (σ1.Perm σ2)
```

with `σ1 = [(a,x),(a,y)]`, `σ2 = [(a,x)]`. Sorting cannot rescue this: they are not
permutations. **So "M11-commutation up to find-extensionality" is not, on its own, an
observational-adequacy statement.**

### 2.3 The missing side condition, supplied and proved

The rescue is that reachable stores are key-functional — and that is not in the ledger.
Proved in `R3-p2_findext.lean`:

```
find_none_not_key    : ∀ σ d, σ.find d = none → d ∉ Keys σ
putPre_nodup         : (Keys σ).Nodup → (Keys (putPre H σ b)).Nodup
reachable_keys_nodup : Reachable H env σ → (Keys σ).Nodup      -- the invariant
```

With `Nodup` keys, find-equality and permutation coincide, `mergeSort` by address is
canonical, and every `checkReport` field agrees. **CLAUSE FOR THE PIN (F-15's
disposition):** M11-commutation pins up to find-extensionality **on reachable stores**,
and ships with `reachable_keys_nodup` as a companion lemma; or, equivalently and more
directly, it pins as list permutation, which implies both. The bare `∀ σ` find-ext
statement should not be pinned — it does not entail the observable equality the harness
compares.

*One residual, flagged not proved:* `List.mergeSort` is stable, so equal-key entries
would sort by input order. `Nodup` keys removes the case; without the invariant the
shell's canonical ordering is not canonical. This is the same condition, seen from the
shell side.

---

## Target 3 — MAPPING's admission rules: the multi-spelling sweep

**Verdict: REFUTED (the rule's coverage).** Admission rule 2 names two constructs
(`Never` via `anyOf`-nil vs `oneOf`-nil; `TemplateLiteral`'s three spellings). The
carrier has **at least ten families**, one of them unbounded, each an L-2787 instance:
one source construct, two (or infinitely many) byte forms, hence two (or infinitely many)
addresses, and `Conforms` cannot tell them apart.

Every row below is proved in `R3-p3_spellings.lean`: `sp*_same` is a full `↔` on `Conforms`
for all values and all environments; the byte receipt is `preimage_ne`, which derives
pre-image disequality from a `decide`-checked carrier disequality through the proved
`encSchema_inj` (`E2/Faithful.lean`).

| # | Spelling A | Spelling B | Denotation | Receipt |
|---|---|---|---|---|
| SP-1 | `.union m [X]` | `X` | identical | `sp1_same`, `sp1_bytes` |
| SP-2 | `.union .anyOf ms` | `.union .oneOf ms` | identical | `sp2_same`, `sp2_bytes` |
| SP-3 | `.union m [X, X]` | `.union m [X]` | identical | `sp3_same`, `sp3_bytes` |
| SP-4 | `.union m [X, Y]` | `.union m [Y, X]` | identical | `sp4_same`, `sp4_bytes` |
| SP-5 | `.refine (.refine S c₁) c₂` | `.refine (.refine S c₂) c₁` | identical | `sp5_same`, `sp5_bytes` |
| SP-6 | `.mu d X`, `X` closed | `X` | identical | `sp6_same`, `sp6_bytes_vs_body` |
| SP-6′ | `.mu d₁ X` | `.mu d₂ X` | identical, **unbounded family** | `sp6_bytes_family` |
| SP-7 | `.tupleRest .nil R` | `.array R` | identical | `sp7_same`, `sp7_bytes` |
| SP-8 | `.tupleRest ES Never` | `.tuple ES` | identical | `sp8_same`, `sp8_bytes` |
| SP-9 | `.record Never` | `.object .nil` | identical | `sp9_same`, `sp9_bytes` |
| SP-10 | `.array Never` | `.tuple .nil` | identical | `sp10_same`, `sp10_bytes` |

Notes the admission session needs:

- **SP-2 and SP-4 are Q12-shaped, not free.** Union `mode` and member *order* are
  semantic for Effect's **decoder** (census §5(a): `anyOf` is first-match and
  order-sensitive; `oneOf` errors on a second success), so they belong in identity by
  G6/Q12 and must NOT be collapsed. What they *do* prove is that `Conforms` is not the
  right yardstick for the single-spelling rule: the rule must be phrased against the
  *source construct*, not against conformance. SP-1 and SP-3 are the ones the source
  side can adjudicate (does Effect's `Union` constructor normalize a singleton or a
  duplicate member? — **UNVERIFIED:** not checked against the pinned bytes; report B's
  catalog is the place).
- **SP-6′ is the sharpest.** G3 ratified the `mu` discriminator into identity, and F-9
  recorded the alpha-invariance tension. SP-6′ shows the tension is not merely
  alpha-invariance: for a body that does not use its binder, the discriminator string is
  *pure* address entropy — an unbounded family of addresses for one denotation. An
  admission rule "`mu` whose body does not reference the binder is inadmissible" kills
  the family at zero cost and is decidable (`guardSpineB`'s machinery already computes
  the predicate).
- **SP-7…SP-10 are A-4 fallout.** A-4 landed `tupleRest`/`record` two days into the
  carrier's life and immediately created four collapse pairs with pre-existing
  constructors, none of which the ratified admission rules mention. They are exactly the
  "one source construct, two carrier forms" shape rule 2 exists to kill.
- **SP-1/SP-9/SP-10 involve `Never` = `.union .anyOf .nil`**, which MAPPING row 12
  already singles out. The rule as written kills the `oneOf`-nil *spelling of Never*; it
  does not notice that `Never` in a codomain or element position collapses whole
  constructors.

### SP-11 — `.lit` narrowing is load-bearing for WF2, not hygiene

Not a spelling pair; a coverage hole, and the most consequential row here.

```
sp11_refs_blind (a) : refsS (.lit (.vaddr a)) = []       -- refs cannot see it
sp11_ref_sees   (a) : refsS (.ref a) = [a]               -- contrast
sp11_wfs        (a) : WFS (.lit (.vaddr a))              -- admitted by the model
sp11_reachable (H e a) : Reachable H e (putSchema H [] (.lit (.vaddr a)))
```

An address inside a `.lit` payload is invisible to `refsS`, to `refsOfPreimage`, to
`AllResolve`, and to the shell's scan — so a **reachable** store can carry a dangling
address, at the very spelling where `.ref` is NEG-2-rejected. This is F-13's shape
(G5: "addresses never ride inside object KEYS") transplanted to the schema plane, and it
is worse, because `.lit` payloads are `Value`s and so can nest `vaddr` arbitrarily deep.

MAPPING admission rule 1 already forbids `vaddr` literals — **but it is a boundary rule
with no model counterpart**, exactly the A-3 / F-21 pattern the program has now hit
three times. **CLAUSE OWED:** a `litNarrowB` conjunct in `WFS` (or, minimally, an
`ObligationWFS_lit_narrow` stated in the ledger), so that the model does not accept what
the boundary rejects. Cheap: `dupFreeS`-shaped, decidable, and it lands in the same
serialization window as any other `WFS` amendment.

---

## Target 4 — Q12's price: **REAL**, with census receipts

Q12 kept `Conforms`'s blindness to the union `mode` byte as a priced divergence
("conformance is a typing judgment; `oneOf` exclusivity is a decode semantic"). The
census settles whether the price is theoretical.

**It is not.** Census §5(a) (`schema-ast-census.md:630-712`), quoting the pinned source:

- `SchemaAST.ts:3071-3073` — under `oneOf`, on a **second** success the step function
  pushes the candidate and returns `Exit.fail(new SchemaIssue.OneOf(...))`.
- `SchemaAST.ts:3076-3079` — under `anyOf` it stops at the first success.
- `SchemaAST.ts:2845` — the one `.sort()` in the index build restores declaration order;
  members are never reordered.

So a value matching **two** members of a `oneOf` union is an Effect decode **failure**,
and `Conforms` accepts it via `union_mem` after inspecting one member. Three scenarios,
proved in `R3-p4_q12.lean`:

| Scenario | Carrier | Value | Effect | `Conforms` |
|---|---|---|---|---|
| S1 duplicate members | `.union .oneOf [.prim .str, .prim .str]` | `.vstr "x"` | `OneOf` failure — no candidate filter can drop either member | accepts (`s1_conforms`) |
| S2 literal ⊂ widening | `.union .oneOf [.prim .str, .lit (.vstr "x")]` | `.vstr "x"` | second success | accepts (`s2_conforms`) |
| S3 two refinements | `.union .oneOf [str∧minLen, str∧maxLen]` | `.vstr "x"` | second success | accepts (`s3_conforms`) |

S1 is the one to lead with: identical members mean `getCandidates`' runtime-type index
(census 2718-2856) cannot prune either, so `candidates.length = 2` and both succeed. For
S2 and S3 the *mechanism* is receipted but the *candidate filtering* is not —
**UNVERIFIED:** whether a `Literal` member lands in the `otherwise[runtimeType]` bucket
alongside `String` for a mixed union (`SchemaAST.ts:2847-2851`) is not checked against
the pinned bytes.

### What the price actually costs

The divergence is not model-vs-shell: the shell will run this same `Conforms` when M18
lands, so both agree. It is **model-vs-Effect**, and it lands squarely on M17's
advertised value. Proved:

```
wfs_ovOneOf : WFS ovOneOf
ov_reachable (H env) :
    Reachable H env (putEntity H (putSchema H [] ovOneOf) (H (preimageS ovOneOf)) vstrX)
```

So the store contains an entity that **typed reachability certifies as well-typed** and
that Effect's decoder rejects at that entity's own declared schema. STORE-MODEL §5's
claim — "the entity plane is typed by construction of reachability" — remains true of the
*lab's* judgment and is silently read as a claim about the *source* judgment. It is not
one.

**CLAUSE FOR THE PIN (M17's anti-claim):** *M17 says every stored entity's value conforms
to its schema under the lab's `Conforms`. It does not say Effect's decoder would accept
the value at that schema; the two judgments are known to diverge on `oneOf` unions with
overlapping members (Q12).* That sentence costs nothing and closes the gap between what
is proved and what a reader will assume.

Cheaper alternative, if the operator prefers to remove the price rather than name it:
`Conforms` gains a `union_oneOf` rule requiring the member to be the **unique** matching
one. Cost: `Conforms` is no longer syntax-directed on unions (M18's decidability seat has
to decide non-conformance for every other member), and the mutual inductive gains a
negative occurrence unless it is phrased through the decision procedure. **Recommend
naming the price, not paying it** — but the grill should see the trade.

---

## Target 5 — R-15c transport adequacy vs what git actually guarantees

**Verdict: CONDITION-FORCED.** R-15c ("the store directory is git-storable; git addresses
transport integrity, SHA3-512 addresses semantic identity; two layers, never conflated")
is right about the layering, and G8 is right that M19 is owed. What is missing is a
precise statement of the *seam*, because git's integrity guarantee is about **git's DAG,
and the store's DAG is not git's DAG.**

### 5.1 What git gives

From the anatomy (`.staging/explore/hash-db-anatomy.md`):

- §2.2 (receipts: `gitdemo2`, `git version 2.55.0.windows.2`) — every git object's
  address is a hash of `"<type> <len>\0" ++ content`; the pre-image is exactly what is on
  disk post-inflate.
- §7.5 — `git fsck` re-hashes every object and compares to its address; cheap **because**
  the stored bytes are the pre-image. §8.4 makes storing the pre-image "the single
  highest-leverage decision", and the store already follows it.
- §2.5 / §7.3 — refs are the only mutable thing; they are the name plane, free.

**UNVERIFIED (my own knowledge of git internals, not receipted in-repo):** on `fetch`
and `clone`, `index-pack` computes each object's hash while writing the index, and git
runs a connectivity check over the received tips, so the delivered set is complete and
tamper-evident with respect to git's own object ids. Structural object validation
(`fsck`-grade) is *not* on by default — `transfer.fsckObjects`, `fetch.fsckObjects`,
`receive.fsckObjects` default off — but that gap is about malformed *git* trees and
commits, not about our payload.

### 5.2 What git does **not** give — and it is everything M19 needs

In git's view, `store/objects/` is a flat directory of unrelated blobs. Our reference
edges live **inside blob content**, which git never parses. Therefore git's connectivity
check contributes **exactly zero** to WF2 and WF3. Specifically, git guarantees none of:

| Property | Why git cannot | Owed to |
|---|---|---|
| WF1 — filename = hex(SHA3-512(content)) | git hashes with its own function into its own name space; our filename is opaque path text | verification-on-open |
| Q5 — bytes are a **canonical** pre-image | git does not decode | boundary check 2 (present) |
| `WFS` — closed, guarded, duplicate-free | git does not decode | **nowhere today** (§5.4) |
| WF2 — refs resolve | edges are inside blobs | verification-on-open (present) |
| Kind-correctness of an entity's schema address | edges are inside blobs | **nowhere today** (present only at PUT, check 4, and only as "resolves as a schema") |
| `Conforms` | requires the typing judgment | SH6 obligation records, until M18 |
| **WF3 — acyclicity** | edges are inside blobs | **nowhere today** (§5.3) |
| Append-onlyness (M13/L-frame) | `git checkout` of an earlier commit **deletes** object files | not a git property at all |

That last row deserves its own line in the ruling record: the store's append-only law is
a *model* law; a git working tree is not append-only, and a branch switch or a reset can
remove object files that a later name still points at. Git gives history for the name
plane; it does not give append-onlyness for the value plane.

**UNVERIFIED (not tested, mechanically plausible, cheap to prevent):** two dual-host
transport hazards specific to the Mac/PC practice — (a) line-ending translation. Object
files are binary pre-images that will frequently contain `0x0A`; with `core.autocrlf`
enabled on the Windows host and no `.gitattributes`, a checkout can rewrite `0x0A` to
`0x0D 0x0A` and break WF1 for every affected object. A one-line `.gitattributes` with
`* -text` (or `-diff -merge -text`) under the store root removes the class. (b) Path
length: a 64-byte digest is 128 hex characters, so `store/objects/<128>` plus a repo root
is comfortable on macOS/Linux but within sight of Windows' legacy `MAX_PATH` 260 without
long-path support. Both are worth a check before R-15c is exercised across hosts.

### 5.3 What verification-on-open must ADD: the acyclicity check, and it is free

The gap is proved (`HEADLINE_wf1_wf2_insufficient`). The addition is not expensive, and
it is the *same* computation as M19's witness:

> Run Kahn's algorithm over the address graph `refsAt`. It (i) decides acyclicity — the
> algorithm terminates with every node emitted iff the graph is a DAG — and (ii) **emits
> the topological order**, which is precisely the insertion sequence M19 asserts exists.

So the shell's verification-on-open should not merely *check* reachability; it should
**construct the witness**. That turns SH5 from an assertion into a computation whose
output can be replayed against the model in a differential script: open the directory,
obtain the order, replay it through `putSchema`/`putEntity` on the in-process `StoreMap`,
and compare byte-for-byte with the disk view. Cost is one linear pass over an object
graph the scan already walks for WF2. This is the classic Merkle-DAG sync discipline —
verify-on-arrival, then topologically install — and it is what git's own `index-pack`
plus connectivity check does one level down, in git's name space rather than ours.

### 5.4 The second, independent gap: `WFS` is checked nowhere

`Shell/Boundary.lean`'s `admit` enforces (1) parse, (1a) declared-schema agreement,
(2) canonicity byte-compare, (3) refs resolve, (4) entity schema resolves as a schema.
`scanObject` enforces WF1, parse, canonicity, WF2, and the entity typing half. **Neither
tests `closedB`, `guardedB`, or `dupFreeS`** — i.e. neither tests `WFS`, which
`Reachable.putS` demands. F-21 recorded the `dupFreeS` half and judged it "operationally
covered by the canonicity byte-compare" (true — canon reverses duplicate-key runs, so the
compare fails). **There is no such incidental coverage for closedness or guardedness.**

Kernel-checked exhibit (`R3-p5_openscan.lean`), with `bad = .var 0`:

```
chk1  : decodeSchema (encSchema (canonS bad)) = some bad    -- boundary check 1 passes
chk2  : preimageS (canonS bad) = preimageS bad              -- boundary check 2 passes
chk3  : refsS bad = []                                      -- boundary check 3 passes
not_wfs  : ¬ WFS bad                                        -- but WFS fails (closedB)
not_wfs2 : ¬ WFS (.mu "d" (.var 0))                         -- and for guardedness
exhibit_wf1 (H)  : WF1 holds of the singleton store
exhibit_wf2 (H)  : WF2 holds of the singleton store
HEADLINE_scan_does_not_establish_reachability (H env) :
    ¬ Reachable H env [(H (preimageS bad), preimageS bad)]
```

A store that `check` calls **clean** and that no model theorem applies to. Both `closedB`
and `guardedB` are decidable and already in `E2/Model.lean`; adding them to `admit` and
to `scanObject` is a two-line change to the shell, in the same follow-up as F-21.

*Downstream:* accepting an unguarded schema also voids M18's premise — `Conforms` is
defined only on guarded schemas (joint C), so the SH6 obligation record would be
recording an obligation that the M18 decision procedure is not defined to discharge.

### 5.5 F-21's disposition is itself REFUTED

F-21 is open with the note: the boundary "does not yet name `dupFreeS` — operationally
covered today because a duplicate-key submission fails the §5 check-2 re-canonicalization
byte-compare". That reasoning inherits F-12's finding that `canonS` **reverses** a
duplicate-key run. An involution has fixed points, and the run whose entries are
**identical** is one:

```
dupIdent := .object (.cons "k" (.prim .str) false (.cons "k" (.prim .str) false .nil))

dup_canon_fixed  : canonS dupIdent = dupIdent          -- the involution does nothing
dup_chk1         : decodeSchema (encSchema (canonS dupIdent)) = some dupIdent
dup_chk2         : preimageS (canonS dupIdent) = preimageS dupIdent   -- check 2 PASSES
dup_chk3         : refsS dupIdent = []                                -- check 3 passes
dup_not_dupfree  : dupFreeS dupIdent = false
dup_not_wfs      : ¬ WFS dupIdent                       -- A-3's clause-4 conjunct fails
```

So the canonicity byte-compare does **not** cover `dupFreeS`, and the F-21 follow-up is
not cosmetic: today a duplicate-key schema whose duplicated fields are identical is
admitted by the shell and rejected by `Reachable`. That is the model-accepts/shell-rejects
incoherence A-3 was landed to close, running in the opposite direction.

---

## 6. Proposed statement forms — Lean-ready

Vocabulary first. Everything below is expressible today against `E2/Model.lean` and
`E2/Resolve.lean`; `refsOfPreimage` already exists and is exactly the byte-level refs
reading the graph needs.

```lean
/-- The keys of a store, in list order (newest first — `putPre` conses). -/
def Keys (σ : StoreMap) : List Address := σ.map Prod.fst

/-- The references the object AT AN ADDRESS carries, read off the stored bytes.
    `[]` when the address is unbound or the bytes are not a well-formed pre-image
    (M9 rules the latter out on reachable stores). -/
def refsAt (σ : StoreMap) (a : Address) : List Address :=
  match σ.find a with
  | some b => (refsOfPreimage b).getD []
  | none   => []

/-- One edge of the reference graph.  NODES ARE ADDRESSES, not pre-images: `σ` is a map,
    so each bound address carries exactly one byte string, and this is well defined for
    every `H` — colliding or not.  (Under a colliding `H` a dropped pre-image has no
    node at all; probe `A_collision_drops`.) -/
def Edge (σ : StoreMap) (a b : Address) : Prop :=
  (σ.find a).isSome ∧ b ∈ refsAt σ a

inductive Path (σ : StoreMap) : Address → Address → Prop
  | one  {a b}   : Edge σ a b → Path σ a b
  | cons {a b c} : Edge σ a b → Path σ b c → Path σ a c

def Acyclic (σ : StoreMap) : Prop := ∀ a, ¬ Path σ a a
```

### M10 — WF3

```lean
/-- M10 — WF3.  The reference graph of a reachable store is acyclic.
    ANTI-CLAIMS.  Says nothing about `H`: no injectivity, no collision resistance, no
    preimage resistance — and in particular a COLLIDING `H` does not weaken it, because
    `putPre` no-ops on an occupied address, so every effective insert binds an address
    its own references cannot already contain.  Says nothing about raw maps: a WF1- and
    WF2-satisfying map CAN be cyclic (NEG-3a).  Nodes are addresses, never pre-images. -/
def ObligationM10_acyclic : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap),
    Reachable H env σ → Acyclic σ
```

Recommended proof shape — the **ranking form**, which is also M19's currency and should
be pinned beside it rather than inlined into M10's proof:

```lean
/-- M10′ — the store list IS a reverse topological order: `putPre` conses, so an object
    always sits nearer the head than everything it references.  Needs key-functionality
    (probe `reachable_keys_nodup`) for `idxOf` to be single-valued. -/
def ObligationM10_rank : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap), Reachable H env σ →
    ∀ a b, Edge σ a b → idxOf (Keys σ) a < idxOf (Keys σ) b
```

`Acyclic` follows: a path `a ⇝ a` gives `idxOf … a < idxOf … a`. The induction is the
two-liner STORE-MODEL §3 predicts: the no-op branch is the IH verbatim; the cons branch
gives the new node index 0 and shifts every old index by exactly 1, and its refs are in
the pre-store's domain by `AllResolve` composed with `mem_refsS_canon` / the `putE`
premises.

### M19 — transport adequacy (recommended form: candidate stores)

```lean
/-- What a delivered directory presents, once opened.  Every clause is decidable and is
    (or should be) a verification-on-open check; the numbering matches STORE-SHELL §5. -/
structure Admissible (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap) : Prop where
  /-- key-functional: one byte string per address.  `reachable_keys_nodup` is the
      converse; a directory gives this for free (one file per name). -/
  functional : (Keys σ).Nodup
  /-- WF1 — check 0 of the scan. -/
  hashed : ∀ d b, σ.find d = some b → H b = d
  /-- Checks 1+2 AND the admission clause the shell does not yet run: the bytes are the
      pre-image of a WELL-FORMED carrier that is ALREADY CANONICAL.  Canonicity makes
      `refsS s = refsS (canonS s)`, which is what the reconstruction step needs and what
      `mem_refsS_canon` alone does not give (§1.8).  `WFS` is the clause probe
      `R3-p5_openscan.lean` shows is missing from the shell today. -/
  admitted : ∀ d b, σ.find d = some b →
      (∃ s, WFS s ∧ canonS s = s ∧ b = preimageS s)
    ∨ (∃ sa v, canonV v = v ∧ b = preimageE sa v)
  /-- WF2 — check 3, over stored bytes. -/
  closed : ∀ d b, σ.find d = some b →
      ∃ rs, refsOfPreimage b = some rs ∧ AllResolve σ rs
  /-- The typing precondition IN FULL — check 4 plus check 5.  Naive ref-closure gives
      neither: `C_obstruction` (the referent must be a SCHEMA pre-image, not merely
      present bytes) and `D_no_conformance` (the value must conform). -/
  typed : ∀ d sa v, σ.find d = some (preimageE sa v) →
      ∃ s, σ.find sa = some (preimageS s) ∧ Conforms env s v
  /-- WF3 as a HYPOTHESIS.  It is NOT implied by the clauses above
      (`HEADLINE_wf1_wf2_insufficient`), and it is the clause verification-on-open does
      not currently compute (§5.3). -/
  acyclic : Acyclic σ

/-- M19 — transport adequacy (G8).  Any admissible candidate is reachable: there is an
    insertion order that builds exactly it.
    ANTI-CLAIMS.  Says nothing about the delivery mechanism (git, HTTP, a tarball) —
    only about the opened candidate.  Says nothing about `H`'s collision behaviour: the
    candidate IS a map, so a colliding `H` shows up as pre-images ABSENT from the
    directory, an availability question, never an unreachable target.  Says nothing
    about UNIQUENESS of the order — that is M11's commutation half. -/
def ObligationM19_transport : Prop :=
  ∀ (H : Bytes → Address) (env : ConformsEnv) (σ : StoreMap),
    Admissible H env σ → Reachable H env σ
```

**Proof shape.** Strong induction on `σ.length`. Empty: `Reachable.empty`. Non-empty: by
`acyclic` + finiteness there is a node `r` with **no incoming edge** (follow incoming
edges backwards; finiteness plus pigeonhole would otherwise give a cycle). Delete `r`:

- `closed` survives — nothing pointed at `r`, so no reference dangles;
- `typed` survives — if `r` were some remaining entity's schema, that entity would have
  an edge *into* `r`, contradicting root-ness;
- `functional`, `hashed`, `admitted`, `acyclic` are inherited by sublist;
- `σ = putPre H (σ \ r) (bytes at r)`, because `r ∉ Keys (σ \ r)` by `functional`;
- the last step is `Reachable.putS` (using `WFS s` and `canonS s = s` from `admitted`, so
  `AllResolve (σ \ r) (refsS s)` is exactly `closed` at `r`) or `Reachable.putE` (using
  `typed` at `r` for both halves).

The root-existence lemma is the only piece with real content; it is the standard finite-
DAG argument and is the same lemma a Kahn's-algorithm implementation in the shell would
be verified against — which is the argument for landing them together.

### If G8's literal "set of pre-images" wording is kept instead

Then the hypothesis must additionally carry:

```lean
  hinj_on : ∀ b₁ ∈ P, ∀ b₂ ∈ P, H b₁ = H b₂ → b₁ = b₂    -- else `F_exactly_fails`
```

and the conclusion must be `∃ σ, Reachable H env σ ∧ ∀ b ∈ P, σ.find (H b) = some b ∧
∀ d b, σ.find d = some b → b ∈ P`. The candidate-store form says the same thing with the
injectivity clause absorbed into "it is a map"; **recommended.**

### Two negative exhibits, proposed as NEG-3

```lean
/-- NEG-3a — WF1 ∧ WF2 does not imply reachability: a self-referential store under a
    colliding `H`.  Probe `HEADLINE_wf1_wf2_insufficient`; the unreachability half is
    `NEG2_dangling_unreachable` instantiated at the self-referential address. -/
/-- NEG-3b — a store passing every SHELL-v0 boundary check and the full scan, yet
    unreachable, because the schema is not closed.  Probe
    `HEADLINE_scan_does_not_establish_reachability`. -/
```

Both are already proved in the probes and would transplant into `E2/Reject.lean` beside
NEG-2 essentially verbatim.

---

## 7. Questions for the grill

1. **M19's subject.** Candidate store (recommended) or set of pre-images with an
   `H`-injectivity clause? The candidate-store form makes every hypothesis a shell check
   and makes the collision question disappear.
2. **SH5's wording.** "Verification-on-open ESTABLISHES reachability" is false as
   ratified. Amend to enumerate what v0 actually establishes, or extend the scan to
   `WFS` + acyclicity so the claim becomes true? If the latter — is the Kahn's-algorithm
   form (check *and* emit the insertion order) the right shape, so that M19's witness is
   computed rather than asserted?
3. **`WFS` at the boundary.** F-21 is open on `dupFreeS` with a disposition that probe
   `p5` refutes (`dup_canon_fixed`), and `closedB`/`guardedB` are missing too with no
   incidental coverage at all. Fold all three into one amendment (`WFS` as a named
   boundary check), or is the closedness half urgent on its own (it voids M18's
   premise)? Does F-21's disposition cell need a correcting row, given PROCEDURE §6's
   one-time-update rule?
4. **`.lit` narrowing in the model.** MAPPING admission rule 1 is currently a boundary
   rule; SP-11 shows it is load-bearing for WF2. Mint a `WFS` conjunct now (before more
   proofs are built over the current `Reachable`), or state it as an obligation and
   defer? This is the fourth model-accepts/boundary-rejects instance (F-3, F-12/A-3,
   F-21, now SP-11) — is a standing rule owed: *no admission rule without a model clause
   or a stated obligation naming it*?
5. **The single-spelling rule's yardstick.** Rule 2 currently reads as "one source
   construct, one byte form". SP-2/SP-4 show `Conforms`-equality is the wrong test (mode
   and member order are decode-semantic and belong in identity). Should the rule be
   restated against the *source* construct, with a companion carrier-side rule for the
   cases the source cannot see (SP-6′'s unused-binder `mu`, SP-7…SP-10's `Never` and nil
   collapses)?
6. **SP-6′.** Is "a `mu` whose body does not reference its binder is inadmissible" the
   right rule, given G3 ratified the discriminator into identity and F-9's tension was
   recorded-not-resolved?
7. **Q12.** Name the price in M17's anti-claim (recommended, free), or pay it by adding a
   uniqueness side condition to `Conforms`'s union rule (costs syntax-directedness and
   complicates M18)?
8. **F-15's disposition.** Pin M11-commutation up to find-extensionality **plus**
   `reachable_keys_nodup`, or pin it as permutation directly? The bare find-ext form does
   not entail the `check` verdict's `objects=` field.
9. **Append-onlyness under git.** A branch switch or reset deletes object files. Does
   R-15c need a rider — the store directory is git-*transported*, not git-*managed*, and
   a working tree is never the store of record?
10. **Dual-host transport hygiene.** `.gitattributes` with `* -text` under the store
    root, and a Windows long-path check, before R-15c is exercised. Both UNVERIFIED here;
    both cheap.

---

## Receipts index

| Claim | Probe | Theorem |
|---|---|---|
| colliding `H` drops a put | `R3-p1_graph.lean` | `A_collision_drops`, `A_bytes_are_s1`, `A_not_s2` |
| self-loop is constructible as a candidate | `R3-p1_graph.lean` | `B_self_ref_address`, `B_self_ref_refs` |
| WF1 ∧ WF2 ⇏ `Reachable` | `R3-p1_graph.lean` | `HEADLINE_wf1_wf2_insufficient` |
| naive ref-closure holds on the bad set | `R3-p1_graph.lean` | `C_naive_closed` |
| entity-as-schema is uninsertable | `R3-p1_graph.lean` | `C_obstruction`, `entity_is_never_a_schema` |
| conformance is an independent obstruction | `R3-p1_graph.lean` | `D_no_conformance` |
| empty set is reachable | `R3-p1_graph.lean` | `E_empty` |
| "exactly that set" fails under collision | `R3-p1_graph.lean` | `F_exactly_fails`, `F_one_binding` |
| refs-of-bytes lemmas (reusable) | `R3-p1_graph.lean` | `refsOfPreimage_schema`, `refsOfPreimage_entity` |
| find-ext ⇏ observational equality | `R3-p2_findext.lean` | `find_extensional`, `observably_different`, `not_a_permutation` |
| key-functionality is a `Reachable` invariant | `R3-p2_findext.lean` | `reachable_keys_nodup` |
| ten spelling families | `R3-p3_spellings.lean` | `sp1_same` … `sp10_same` + `*_bytes` |
| `.lit (.vaddr a)` is refs-invisible and reachable | `R3-p3_spellings.lean` | `sp11_refs_blind`, `sp11_wfs`, `sp11_reachable` |
| `oneOf` overlap conforms | `R3-p4_q12.lean` | `s1_conforms`, `s2_conforms`, `s3_both` |
| such an entity is reachable | `R3-p4_q12.lean` | `ov_reachable` |
| mode is in identity, not in conformance | `R3-p4_q12.lean` | `mode_is_in_identity`, `mode_is_not_in_conformance` |
| SHELL-v0 checks pass on an unclosed schema | `R3-p5_openscan.lean` | `chk1`, `chk2`, `chk3`, `not_wfs`, `not_wfs2` |
| …and the store is unreachable | `R3-p5_openscan.lean` | `HEADLINE_scan_does_not_establish_reachability`, `exhibit_wf1`, `exhibit_wf2` |
| F-21's disposition refuted (identical duplicate fields) | `R3-p5_openscan.lean` | `dup_canon_fixed`, `dup_chk1`, `dup_chk2`, `dup_chk3`, `dup_not_dupfree`, `dup_not_wfs` |

Literature cited: `.staging/explore/hash-db-anatomy.md` §2.2/§2.5/§7.5/§8.4/§8.6;
`docs/entity-store/research/schema-ast-census.md` §5(a) (`SchemaAST.ts:2718-2856`,
`2933-2976`, `3049-3083`, `2845`). `research/global-projection-survey.md` was read and
bears on R-15b/R-15d, not on R-15c's transport question; it is not cited above.

Claim posture: this report is G0 advisory. The Lean theorems it cites are G1 statements
about lab-owned definitions, kernel-checked on the pinned toolchain with axiom reports
inside the estate allowlist. Nothing here claims anything about SHA3-512's security,
about the pinned Effect implementation's behaviour beyond the census's quoted line
ranges, or about deployment.
