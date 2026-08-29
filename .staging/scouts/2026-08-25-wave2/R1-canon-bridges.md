# R1 — canon and bridges

Wave 2, refuter 1. Advisory, pre-grade, gate G0. 2026-08-25.
Substrate: `formal/entity-store` at `d994bd3`, `lake build` green, opaque/unsafe gate
`ok (1444 constants scanned)`, every pinned `#print axioms` within
`[propext, Classical.choice, Quot.sound]`. Probes are the seven `R1-p*.lean` files beside
this report, with their captured `.out` files; every probe elaborates clean (no `sorry`,
no error) and every theorem below carries its `#print axioms` line in the `.out`.

---

## Result

| # | Target | Verdict | One line |
|---|---|---|---|
| 1 | Conditional S1, both kinds | **SURVIVED** | `String <` is a linear order, so the only sort tie is genuine key equality — exactly what `dupFreeS`/`dupFreeV` exclude. No second tie mechanism exists. |
| 2 | B1 / B2 / B3 | **SURVIVED** | 61,494-schema exhaustive sweep, pin form and the stronger iff form, zero counterexamples. |
| 2 | B4 (as pinned) | **SURVIVED** | 5 constructed derivations at the duplicate-key × absent-optional edge; 4 side-lemmas swept clean. `litsCanonicalB` **is** sufficient for the pinned statement. |
| 3 | A-4 conformance edges | **REFUTED** (as identity, not as typing) | `.array e` and `.tupleRest .nil e` are the **same conformance predicate for every `e`** and two addresses. Plus three more collapse pairs. L-2787. |
| 3 | `Conforms.record` / `Conforms.lit` vs A-3 | **REFUTED** | Duplicate-key **values** are reachable, by two routes. A-3's "value-plane duplicate-freedom stays a boundary admission" is not enforced by the model, so `ObligationCanonVIdempotent` is vacuous exactly where F-12 bit. |
| 4 | F-23's disposition / M17 | **REFUTED** | M17 ("every stored entity's schema resolves and its value conforms", STORE-MODEL §5/§6) is **FALSE on today's `Reachable`**, by two independent routes. F-23 and F-24 were priced into B4 only; they are `Reachable`-level defects. |
| 4 | Q13 / amendment A-6 | **REFUTED, pre-emptively** | With A-6's equation in place, `ObligationCanonIdempotent` is **FALSE again** (F-12's involution, one plane up), and §7's "the `litsCanonicalB` hypothesis becomes dischargeable on canon images" is false as written. A one-clause repair is verified over 15,310 schemas. |
| 5 | M15 / M12E adversarial | **SURVIVED as theorems; scope gaps found** | No distinction is dropped (13-pair L-3509 table clean). Two scope facts: L-dedup does not reach duplicate-key permutations, and M15's entity half quantifies over puts `Reachable` refuses. |
| — | Side finding | **REFUTED** | `Check` payloads are address-significant and **nothing** canonicalizes them — F-24's twin, which A-6 does not reach. |

Eight items for the ledger are proposed in **§8**. The three that change what is
buildable next week are: **M17 cannot be proved from `Reachable` as it stands** (§5),
**A-6 must not land without extending clause 4** (§6), and **`.array` / `.tupleRest .nil`
needs a ruling before any address is published** (§4).

---

## 1. Target 1 — the conditional S1 obligations

`ObligationCanonIdempotent` (`E2/Obligations.lean:62-63`) and
`ObligationCanonVIdempotent` (`E2/Obligations.lean:73-74`).

**What was attacked.** F-12 killed the unconditional forms with a *tie*: `insertField`
inserts before the first strictly-greater key (`E2/Canon.lean:31`) while `canonFields`
folds right-to-left (`E2/Canon.lean:55`), so a run of equal keys reverses. The
conditional forms exclude ties through `dupFreeS`/`dupFreeV`, which are `==`-based
(`E2/Canon.lean:101-107`, `137-143`). The one way left to win is a key pair that is
`==`-**distinct** (so `dupFree` passes) but `<`-**incomparable** (so the sort still ties).
That is precisely the failure the anatomy files under "Leave": *"Canonical orders whose
sort key can tie without a total tiebreak (#2787)"* (`hash-db-anatomy.md` §3.6 table).

**Result: no such pair exists.** `String` is a linear order in this toolchain — the sort's
`<` is `fun s₁ s₂ => s₁.toList < s₂.toList`
(`~/.elan/.../v4.33.1/src/lean/Init/Data/String/Basic.lean:421-423`) with
`String.le_antisymm` and `String.le_total` proved at
`Init/Data/String/Lemmas/StringOrder.lean:32-33`. Kernel receipt in `R1-p1_order.lean`:

```
theorem string_no_tie (a b : String) (h₁ : ¬ a < b) (h₂ : ¬ b < a) : a = b
  -- axioms: [propext, Classical.choice, Quot.sound]
theorem string_beq_lawful (a b : String) : (a == b) = true ↔ a = b
  -- axioms: [propext]   ⇒ dupFree's decision procedure excludes exactly the tie set
```

So E2 does **not** repeat Unison #2787's mechanism. Unison's sort key is a *hash of a
name-erased form*, which can tie between structurally identical members; E2's sort key is
the field **name** itself under a total order, and A-3 forbids two fields to share one.
The tiebreak is not "stable `sortOn` falling back to `Ord v`" — there is nothing to break.

**Attack list (all tried, all failed to refute):**

| Attack | Receipt |
|---|---|
| Sort tie between `==`-distinct keys | impossible — `string_no_tie` |
| Unlawful `BEq String` letting a real tie through `dupFreeS` | impossible — `string_beq_lawful` |
| Kernel-vs-extern disagreement (`decidableLT` is `@[extern "lean_string_dec_lt"]`, so `#eval` runs C and `decide` runs `List.decidableLT`) | `R1-p1_order.lean` §B: five `#eval` / `decide` pairs on `""`, `"a"`, `"ab"`, `"z"`, `"aa"`, U+00E9, `e`+U+0301, U+1F600, `"~"`. Agreement on all. |
| Exotic keys: empty string, combining vs precomposed, astral plane, long common prefix, `~` vs 4-byte UTF-8 | `D4_exotic_idem` — kernel-checked idempotence on a 9-field dup-free object over that key set |
| Deep nesting through every constructor `canonS` recurses into (object/tuple/array/union/refine/mu/tupleRest/record, 4 levels) | `D9_deep_idem` — kernel-checked |
| Value plane, same treatment (`vaddr`, negative ints, nested `varr` of `vobj`) | `E3_exotic_v_idem` — kernel-checked |
| `dupFreeS` not descending into `lit` payloads or `Check` payloads | harmless **today** (`canonS` leaves both alone: `E2/Canon.lean:42,47`) — receipts F.1–F.5. Stops being harmless the moment A-6 lands; see §6. |

**VERDICT: SURVIVED.** Both conditional S1 obligations. F-12's counterexample still
reproduces on today's tree (`C3_unconditional_still_false`), so the conditional
restatement is load-bearing, not cosmetic.

**One divergence recorded, no defect.** The order is code-point lexicographic on the key
string, which is *not* RFC 8949 §4.2.1's "bytewise lexicographic order of the deterministic
**encodings**". Measured difference: E2 puts `"aa"` before `"z"` (`B1_kernel`), CBOR
core-deterministic puts `"z"` first, because the length header sorts before the payload.
Self-consistency is unaffected; interop with DAG-CBOR/CBOR-deterministic tooling is. See
question Q-R1-6.

---

## 2. Target 2 — the four bridge pins

### B1 / B2 / B3

These are decidable `Bool` implications, so they were attacked by **exhaustion** rather
than argument. `R1-p2_bridge.lean` generates a bounded universe from ten leaves (including
`var 0`, `var 1`, `ref`, `address`, and canonical / non-canonical / duplicate-key `lit`
payloads) through nineteen constructor shapes at three depths — including duplicate-key
field lists, empty-string keys, `union .anyOf .nil`, `mu` under `mu`, `tupleRest .nil`, and
`record (record _)`.

```
universe size = 61494
B1 (pin form)  = true     B1' (iff)  = true
B2 (pin form)  = true     B2' (iff)  = true
B3 (pin form)  = true     B3' (iff)  = true
```

The `iff` sweeps are strictly stronger than the pins: they also show `canonS` never
*invents* well-formedness, which matters because `Reachable.putS` gates on `WFS s` for the
raw `s` while storing `canonS s`.

**VERDICT: SURVIVED.** All three, on 61,494 schemas, in both directions.

### B4 (`ObligationCanonRespectsConforms`, `E2/Bridge.lean:75-81`)

The question the brief posed — *is `litsCanonicalB` sufficient, or does another asymmetry
hide?* — decomposes into four sub-attacks. All four were run.

**(a) Do check payloads hide a second asymmetry?** They are `Value`s inside a schema
(`Check.filter (id) (payload : Value) (aborted)`, `E2/Core.lean:66`) and **nothing
canonicalizes them**: `canonS (.refine s c) = .refine (canonS s) c` (`E2/Canon.lean:42`)
and `litsCanonicalB (.refine s _) = litsCanonicalB s` (`E2/Bridge.lean:37`). But the
pass-through is *symmetric* — the payload is never compared against the conforming value —
so B4 itself is unharmed. It is a **dedup** defect, not a bridge defect; see §7.

**(b) Does `litsCanonicalB` survive `unfoldMu`?** Yes.
`K2_lits_survive_unfold` (kernel), plus the sweep `B4.ii = true` over all 61,494 schemas.
Substitution only copies `.mu d b` (whose lits are canonical by hypothesis) into `b`, and
`litsCanonicalB` is a conjunction over `lit` leaves.

**(c) Does `Conforms.mu`'s unfolding interact with canon?** It forces a commutation
lemma the B4 seat cannot avoid: `canonS (unfoldMu d b) = unfoldMu d (canonS b)`. It holds —
`K1_unfold_commutes` (kernel) and the sweeps `B4.iii = true` (`canonS` commutes with
`substS` at k = 0,1,2 against three substituends including an unsorted object and a `mu`)
and `B4.iv = true`. **This is an owed lemma the pin does not name; flag it in the B4
dispatch brief.**

**(d) The `obj` case — the real hazard.** `ConformsF` is lockstep with an absence rule
(`E2/Model.lean:246-247`), so a conforming value's field list is a *subsequence* of the
schema's. B4 sorts both sides — and the sort is **not stable**: on a run of equal keys it
reverses. B4 does **not** condition on `dupFreeS`. So the attack is a duplicate-key schema
run crossed with an absent optional, arranged so the two reversals disagree.
`R1-p7_b4_object.lean` builds five such witnesses, each with a **constructed derivation on
both sides**:

| W | Arrangement | Result |
|---|---|---|
| W1 | `[a:int?, a:str?]`, value supplies only the first, and it does not conform to the second | both sides derived |
| W2 | `[a:int, a:str?]` — reversal moves a **required** entry behind an optional | both sides derived |
| W3 | non-contiguous run `[a:int?, b:str?, a:bool?]` with the splitting key absent — sorting closes the gap *and* reverses the run | both sides derived |
| W4 | `.record` with a duplicate-key value run (`ConformsAllF` is key-agnostic) | both sides derived |
| W5 | `tupleRest` with an unsorted object in the prefix and a two-element suffix | both sides derived |

The reason it holds: reversal is applied to schema run and value run by *the same
algorithm on the same keys*, so it is an order-reversing bijection on both sides and
preserves the matching. `dupFreeS` is genuinely not needed for B4.

**VERDICT: SURVIVED, as pinned.** `litsCanonicalB` is sufficient for
`ObligationCanonRespectsConforms`. **But the two hypotheses B4 carries have no counterpart
anywhere in `WFS`, `Reachable`, or `ConformsEnv` — which is §5.**

---

## 3. Target 3 — A-4's conformance rules at the edges

All results in `R1-p3_a4_edges.lean`, axiom-free or within the allowlist.

**The headline. `.array e` and `.tupleRest .nil e` are the same predicate, for every `e`:**

```
theorem A1_array_eq_tupleRest_nil (env) (e) (v) :
    Conforms env (.array e) v ↔ Conforms env (.tupleRest .nil e) v
  -- does not depend on any axioms
theorem A2_two_addresses (H) (hinj) : addressS H arrInt ≠ addressS H trInt
```

`ConformsL env .nil pre` forces `pre = .nil` and `ValueList.append .nil suf = suf` by the
first equation, so the two rules coincide exactly. This is an **infinite family** of
one-meaning/two-address pairs, and it needs no uninhabited schema: every array type in the
v1 universe now has a second spelling. `encSchema` opens `.array` at 0x34 and `.tupleRest`
at 0x3B (`E2/Encode.lean:122,129`), so the addresses differ under every injective `H`.

**Three more collapse pairs**, each kernel-checked, each using `.union .anyOf .nil` — which
is not a lab curiosity but MAPPING row 12's **admitted image of Effect's `Never`**:

- `B3_tuple_eq_tupleRest_never` — `.tuple es` ≡ `.tupleRest es Never`, for every `es`.
- `B4_three_spellings_one_meaning` — `.tuple .nil`, `.array Never`, `.tupleRest .nil Never`
  are one predicate (exactly `.varr .nil`) and three addresses.
- `D2_record_never_eq_object_nil` — `.record Never` ≡ `.object .nil`.

Taxonomy: this is **L-2787** — *"the encoder ADMITS information the intended equivalence
class does not contain … one carrier → many possible byte strings"*
(`hash-db-anatomy.md` §3.5). Scout A's census already flagged `Never`'s two spellings as
L-2787 (A-expressibility row 8) and the single-spelling rule was ruled for it. **A-4
re-opened the same class and the single-spelling rule was not re-applied**, because A-4 was
argued at the value plane (`flat_rejected`) and nobody asked the dual question.

**Edges that behaved correctly (no finding):**

| Edge | Result |
|---|---|
| `.record cod` against non-`vobj` | rejects `.varr` and scalars — `D1_record_rejects_varr`, `D1b_record_rejects_scalars` |
| `record (record cod)` nesting | derivation constructed — `D3_record_record` |
| `tupleRest` with `varr .nil` | forces the empty split, hence `ConformsL env es .nil` — `C1_tupleRest_varr_nil`. F-19's "split point is forced" confirmed at the degenerate end. |
| `.tuple es` ⊆ `.tupleRest es rest` | `B2_tuple_subset_tupleRest`, for every `rest` |

**The one that bites: duplicate-key VALUES are reachable.**
`Conforms.record` (`E2/Model.lean:238`) leaves keys unconstrained — `ConformsAllF`
(`E2/Model.lean:264-267`) only constrains values — and `Reachable.putE`
(`E2/Model.lean:310-312`) has no `dupFreeV` premise. So:

```
theorem E4_record_admits_dup_keys (env) : Conforms env (.record (.prim .int)) vDup
theorem E5_dup_value_reachable (H) (env) :
    Reachable H env (putEntity H (putSchema H [] recInt) (addressS H recInt) vDup)
theorem E6_canonV_not_idempotent_there : canonV (canonV vDup) ≠ canonV vDup
theorem E7_hypothesis_fails_there : dupFreeV vDup = false
```

`.lit` is a **second, older route to the same place**, needing no A-4 at all:
`dupFreeS (.lit _) = true` unconditionally (`E2/Canon.lean:112`) and `Conforms.lit`
(`E2/Model.lean:226`) admits the payload itself, so `F2_lit_dup_reachable` puts the same
duplicate-key value under a `WFS` schema.

STORE-MODEL §7's A-3 record says: *"Value-plane duplicate-freedom stays a boundary
admission, not a `Reachable` clause (a JS object cannot carry duplicate keys, so the
excluded values have no host counterpart)."* The second clause is a claim about the host;
the first is a claim about the model, and the model does not enforce it. The consequence:
**`ObligationCanonVIdempotent` is not wrong, it is vacuous on part of the reachable state
space — exactly the part F-12 identified.** A-3 closed the schema plane and left the value
plane open, and A-4 widened the opening.

**VERDICT: REFUTED** on two counts (the collapse family; the value-plane reachability of
duplicate keys). The typing rules themselves are sound at the edges — the defect is that
A-4 added spellings without re-applying the single-spelling rule, and that `Reachable`
never acquired the value-plane clause A-3 assumed the boundary would supply.

---

## 4. Target 4a — F-23's disposition, escalated: **M17 is false**

This is the finding I would put first in the docket.

`Reachable.putE` requires `Conforms env s v` on the **raw** carrier and then stores
`preimageE sAddr v`, whose body is `encValue (canonV v)` (`E2/Obligations.lean:25-26`),
under a schema address whose body is `encSchema (canonS s)`. **What the store holds is
`(canonS s, canonV v)`; what it checked is `(s, v)`.** The bridge from one to the other is
exactly B4 — and B4's two hypotheses (`litsCanonicalB s` from F-23, `canonV`-invariance of
`checkSem` from F-24) appear **nowhere** in `WFS` (`E2/Model.lean:163-164`), `Reachable`, or
`ConformsEnv`. F-23 and F-24 were dispositioned into one pinned `Prop`; they are
`Reachable`-level defects.

STORE-MODEL §5 asserts the opposite: *"Every reachable store is internally well-typed: for
every stored entity, its schema resolves and its value conforms"*, and §6 pins that as M17.

**Route A — the `.lit` route.** `R1-p4_m17.lean` builds a two-put reachable store over a
concrete injective `H`, and drives the resolve chain end to end:

```
theorem sigma2_reachable (env) : Reachable toyH env σ₂
theorem entity_resolves  (env) : resolveEntity toyH σ₂ eD = some (sA, vGood)   -- via M15_faithful_entity
theorem schema_resolves        : resolveSchema toyH σ₂ sA = some sLit          -- via M13_frame + M4a_schema
theorem M17_store_form_FALSE   : ¬ ObligationM17_typed_reachability
  -- axioms: [propext, Classical.choice, Quot.sound]
```

Both resolves succeed. The conformance does not: the schema is `.lit vBad`, the stored
value is `canonV vBad = vGood`, and `Conforms env (.lit vBad) vGood` requires `vGood = vBad`.
The carrier-level form falls the same way with the judgment `Reachable` actually enforces:

```
theorem M17_carrier_form_FALSE :
    ¬ (∀ env s v, WFS s → Conforms env s v → Conforms env (canonS s) (canonV v))
```

i.e. **`WFS` does not imply `litsCanonicalB`.**

**Route B — the `refine` route, which A-6 does not close.** The witness carries no `lit`
node at all, so A-6's equation change cannot touch it:

```
theorem M17_survives_A6_FALSE :
    ¬ (∀ env s v, WFS s → litsCanonicalB s = true →
        Conforms env s v → Conforms env (canonS s) (canonV v))
```

Schema `.refine (.object [b:int, a:int]) c` with an `env` whose `checkSem` is
order-sensitive. `WFS` holds, `litsCanonicalB` holds, `Conforms` holds; `canonS` reorders
the fields, `canonV` reorders the value, and the check rejects the reordered value.
Nothing in `Reachable` or `ConformsEnv` forbids that `env`.

**VERDICT: REFUTED.** M17 as worded in STORE-MODEL §5/§6 is false on today's `Reachable`,
by two routes. It is not provable by strengthening the proof; `Reachable` (or
`ConformsEnv`) has to acquire the two conditions, or M17 has to be restated with them as
hypotheses — which would make it a statement about a *subset* of reachable stores, and the
spec's §5 sentence would need the matching qualification.

Taxonomy note: this is the anatomy's *"Routing carrier information around the encoder for
convenience (#3509)"* in mirror image — the **typing judgment** is routed around the
canonicalizer. The store admits an object whose declared type it never checked.

---

## 5. Target 4b — Q13 / amendment A-6, attacked before it lands

Q13 is RULED YES; A-6 is scheduled for the window that opens when wave 2 returns.
`R1-p5_a6.lean` models it as `canonS6` — `canonS` with exactly one equation changed
(`| .lit v => .lit (canonV v)`), everything else including `insertField` being the shipped
code.

**What A-6 buys, confirmed.** The live dedup gap it is bought to close is real today:

```
theorem one_stored_value (env) (v) : Conforms env litG v ∨ Conforms env litB v → canonV v = vGood
theorem two_addresses (H) (hinj)   : addressS H litG ≠ addressS H litB
```

Two `lit` schemas whose payloads differ only in `vobj` field order admit **exactly the same
stored entity bytes** and take two addresses. That is the L-2787 measurement backing the
ruling. Post-A-6: `canonS6 litG == canonS6 litB = true`, and
`A6_closes_route_A` shows M17's route A closes for duplicate-free payloads.

**What A-6 breaks.** `dupFreeS` does not descend into a `lit` payload
(`E2/Canon.lean:112`). The moment `canonS` starts running `canonV` there, F-12's
involution is back **inside the schema plane**, and the S1 hypothesis no longer excludes it:

```
theorem A6_refalsifies_S1 :
    ¬ (∀ s, dupFreeS s = true → canonS6 (canonS6 s) = canonS6 s)
  -- witness: .lit (vobj [("a",1),("a",2)]);  dupFreeS = true, canonS6 is an INVOLUTION
theorem A6_lits_not_dischargeable :
    ¬ (∀ s, litsCanonicalB (canonS6 s) = true)
theorem A6_lits_not_dischargeable_even_dupfree :
    ¬ (∀ s, dupFreeS s = true → litsCanonicalB (canonS6 s) = true)
```

The last two falsify STORE-MODEL §7's A-6 note as written: *"the `litsCanonicalB`
hypothesis becomes dischargeable on canon images"* — it becomes dischargeable only on
`lit` payloads that are themselves duplicate-free.

**The repair, verified.** Extend STORE-MODEL §5 clause 4 to the `lit` payload:
`dupFreeS (.lit v) := dupFreeV v`. `R1-p5_a6.lean` §5 defines `dupFreeS6` with that one
clause changed and sweeps a 15,310-schema universe carrying canonical, non-canonical, and
duplicate-key `lit` payloads at every depth:

```
5.3 S1 under A-6 with TODAY's dupFreeS      = false   (the falsification, swept)
5.4 S1 under A-6 with the REPAIRED dupFreeS6 = true
5.5 litsCanonicalB dischargeable under dupFreeS6 = true
5.6 B3 under A-6 + repair = true    5.7 B1 = true    5.8 B2 = true
```

So A-6 is safe **iff** it lands together with the clause-4 extension. Landing the equation
alone re-commits Unison #2787's error one level down: a canonical order whose sort key can
tie, with the tiebreak excluded by a predicate that does not look where the sort now looks.

**VERDICT: REFUTED, pre-emptively.** A-6 as scoped in §7 falsifies `ObligationCanonIdempotent`
and its own B4 restatement. The repair is one clause and is verified.

**Scope note the operator should see with the ruling:** A-6 does **not** reach `Check`
payloads (`6.1 canonS6 refG == canonS6 refB = false`), and the repair does not either
(`6.2 dupFreeS6 refB = true`). See §7.

---

## 6. Target 5 — M15 and M12E under adversarial values

M12/M12E are two-line `rw` theorems and cannot be false, so the attack was on **fit**:
`canon c₁ = canon c₂ → …` implements L-dedup only where `canon` decides the declared
equivalence `≈`.

**L-3509 direction (a distinction dropped) — clean.** `R1-p6_m15_m12e.lean` runs a 13-pair
table over every distinction the v1 value universe is supposed to carry: array order (bare
and under a key), int/bool, int/string, null/false, null/empty-array, empty-array/empty-object,
`vaddr`/`vstr`, address-byte length, Unicode precomposed vs combining (in values **and** in
keys, built via `Char.ofNat` so the file's own encoding cannot fake it), and cross-class
`vobj`s.

```
2.1 no pair in the table is merged by canonV = true
2.1 merged pairs = []
```

Kernel receipts: `array_order_survives`, `within_class_merges`, `across_class_separates`.
`canonV` merges within a permutation class and nowhere else, on this table.

**L-2787 direction — a gap.** Two values that differ *only* in `vobj` field order keep two
entity addresses when the shared key is duplicated:

```
theorem dup_pair_two_addresses (H) (sAddr) (hinj) :
    H (preimageE sAddr vDup) ≠ H (preimageE sAddr vDupR)
```

`canonV` swaps the run rather than sorting it, so the pair is separated, not merged. Both
members are **reachable** (§3). The honest statement is that the declared equivalence
(kickoff §4.3 / R-10, *"duplicate names are inadmissible"*) is **not defined** on values
`Reachable` admits — the same hole as §3, seen from the dedup side.

**M15 scope fact.** `ObligationM15_faithful_entity` (`E2/Resolve.lean:102-107`) quantifies
`sAddr` and `v` with no legality premise; only the **pre**-store must be reachable. So it
is a theorem about `putPre` mechanics, true of puts `Reachable` would refuse:

```
theorem M15_holds_on_an_illegal_put (env) :
    resolveEntity toyH (putEntity toyH [] ⟨[]⟩ vDup) (toyH (preimageE ⟨[]⟩ vDup))
      = some (⟨[]⟩, canonV vDup)
-- 4.1 the schema address in that put resolves to nothing = false
-- 4.2 the value it faithfully returns is dup-key         = false (dupFreeV = false)
```

Not a defect. Worth pinning because it is the reason M15 must not be read as evidence for
M17: M15 tells you *what comes back*, and what comes back is `canonV v`, which §4 shows need
not conform.

**Carrier note.** `Address` has no length invariant (`E2/Core.lean:26-28`: *"The length
invariant is an obligation, not yet a field"*), so `⟨[]⟩` is a legal address and
`refsS (.ref ⟨[]⟩) = [⟨[]⟩]` — a reference to a digest no `H` can produce. `encAddress`
length-frames, so injectivity is unharmed, and `AllResolve` makes such a schema unputtable.
Self-limiting today; it becomes load-bearing when M10/M19's reference-graph vocabulary is
minted.

**VERDICT: SURVIVED** as theorems. Two scope gaps recorded (the undefined equivalence on
duplicate-key values; M15's quantifiers).

---

## 7. Side finding — check payloads are address-significant and nobody canonicalizes them

F-24 recorded that B4's `refine` case forces `checkSem` to be invariant under `canonV` of
its **argument**, and routed it to R-4 as an allowlist admission criterion. Its twin was not
recorded: nothing constrains, or canonicalizes, the check's **own payload**.

```
theorem C5_check_payload_splits_addresses : canonS refA ≠ canonS refB
theorem C6_check_payload_splits_preimages : preimageS refA ≠ preimageS refB
theorem C7_check_payload_splits_addresses (H) (hinj) : addressS H refA ≠ addressS H refB
```

`refA`/`refB` are `.refine (.prim .int) (.filter "between" p _)` with `p` the same two
fields in two orders. `canonS` passes the check through whole (`E2/Canon.lean:42`),
`litsCanonicalB` does not inspect it (`E2/Bridge.lean:37`), `dupFreeS` does not either
(`E2/Canon.lean:118`), and A-6 does not reach it (`R1-p5_a6.lean` §6). On the host side a
check payload **is** a JS object whose key order is a host incidental — which is verbatim
the Q11 rationale for minting `canonV` in the first place. So today, two source-identical
refinements can take two addresses. L-2787.

C6 goes through the proved `encSchema_inj` rather than byte arithmetic — house lesson F-18
sidestepped rather than fought.

---

## 8. Proposed ledger rows

F-numbers to be assigned by the coordinator. Every row's receipt is a named theorem in the
probe files beside this report, with its axiom report in the matching `.out`.

| Proposed | Finding | Receipt | Suggested disposition |
|---|---|---|---|
| a | M17 ("every reachable store is internally well-typed", STORE-MODEL §5/§6) is FALSE: `Reachable.putE` checks `(s, v)` and stores `(canonS s, canonV v)`, and neither B4 hypothesis is a clause of `WFS`/`Reachable`/`ConformsEnv` | `M17_store_form_FALSE`, `M17_carrier_form_FALSE` (`R1-p4_m17.lean`) | **Grill immediately** (PROCEDURE §3 rule 1). `Reachable` gains the conditions, or M17 is restated with them and §5's sentence is qualified. |
| b | The `refine`/`checkSem` route to (a) survives A-6 — the fix for F-23 does not fix F-24 | `M17_survives_A6_FALSE` | F-24 is promoted from an R-4 allowlist note to a `ConformsEnv`/`Reachable` side-condition, or M17 carries it as a hypothesis |
| c | A-6 as scoped re-falsifies `ObligationCanonIdempotent`; §7's "dischargeable on canon images" is false as written | `A6_refalsifies_S1`, `A6_lits_not_dischargeable_even_dupfree` (`R1-p5_a6.lean`) | A-6 lands **with** `dupFreeS (.lit v) := dupFreeV v`; verified over 15,310 schemas (`5.4`–`5.8`) |
| d | Duplicate-key VALUES are reachable, via `.record` (A-4) and via `.lit` (pre-A-4); A-3's value-plane assumption is not enforced by the model | `E5_dup_value_reachable`, `F2_lit_dup_reachable`, `E7_hypothesis_fails_there` (`R1-p3_a4_edges.lean`) | `Reachable.putE` gains `dupFreeV v`, or `Conforms.record` constrains keys, or the vacuity is recorded against `ObligationCanonVIdempotent` |
| e | `.array e` ≡ `.tupleRest .nil e` for every `e` — an infinite two-spelling family introduced by A-4; plus `.tuple es` ≡ `.tupleRest es Never`, the `.tuple .nil`/`.array Never`/`.tupleRest .nil Never` triple, and `.record Never` ≡ `.object .nil` | `A1_array_eq_tupleRest_nil`, `A2_two_addresses`, `B3_…`, `B4_…`, `D2_…` (`R1-p3_a4_edges.lean`) | The single-spelling rule (MAPPING, ruled for `Never`) is re-applied to A-4's constructors: an admission rule rejecting `tupleRest` with an empty element list, and a `canonS` normalization is **not** the answer (it would change `Conforms`' subject) |
| f | Check payloads are address-significant; `canonS`, `litsCanonicalB`, `dupFreeS`, and A-6 all leave them alone | `C5`/`C6`/`C7` (`R1-p2_bridge.lean`) | Q13's scope extended to `Check` payloads, or recorded as a priced divergence with the host-incidental argument answered |
| g | L-dedup does not reach duplicate-key `vobj` permutations; the declared equivalence is undefined where `Reachable` admits | `dup_pair_two_addresses` (`R1-p6_m15_m12e.lean`) | Closes automatically if (d) closes |
| h | `ObligationM15_faithful_entity` quantifies `sAddr`/`v` with no legality premise — true of puts `Reachable` refuses | `M15_holds_on_an_illegal_put` (`R1-p6_m15_m12e.lean`) | Scope note in STORE-MODEL §9; M15 is not evidence for M17 |

**Owed lemmas the B4 dispatch brief should carry** (swept clean, not yet proved):
`canonS` commutes with `substS`; `canonS (unfoldMu d b) = unfoldMu d (canonS b)`;
`litsCanonicalB` survives `unfoldMu`; `WFS` survives `unfoldMu` (the last is M18's, not
B4's, and `guardedB` is the non-obvious conjunct). `B4.iii`, `B4.iv`, `B4.ii`, and the WFS
sweep are all `true` over 61,494 schemas.

---

## 9. Questions for the grill

**Q-R1-1 (blocking).** M17 is false as worded. Which repair — (i) `Reachable.putE` gains
`litsCanonicalB s = true` and `ConformsEnv` gains a `canonV`-invariance field, making M17
provable as stated; (ii) M17 is restated with both as hypotheses, and STORE-MODEL §5's
"every reachable store is internally well-typed" acquires an explicit qualification; or
(iii) `Conforms` is redefined to be the judgment on canonical forms only, so the store never
checks a non-canonical object? (iii) is the deepest and probably the right one — it makes
"canonical-image strictness" (Q5) cover the typing plane too, and it retires B4 rather than
proving it. What does the operator want?

**Q-R1-2 (blocks A-6).** A-6 must land with `dupFreeS (.lit v) := dupFreeV v`, or S1 falls.
Confirmed? And does the same reasoning extend clause 4 to `Check` payloads, or are those
staying uncanonicalized (f)?

**Q-R1-3.** `.array e` ≡ `.tupleRest .nil e` for every `e`. Three options: admission
rejects `tupleRest` with `.nil` elements (cheapest, matches the `Never` single-spelling
precedent); `canonS` rewrites `.tupleRest .nil e ↦ .array e` (changes `Conforms`' subject —
B4 would need `Conforms env (canonS s) v ↔ Conforms env s v`, which is a *new and much
stronger* obligation than anything pinned); or it is priced as a divergence. Note the
family is infinite, so "price it" means every array type in v1 has two addresses forever.

**Q-R1-4.** Is `dupFreeV` a `Reachable` clause or a boundary admission? The A-3 record
chose "boundary", on the argument that JS objects cannot carry duplicate keys. But `.lit`
payloads and `.record` values are *inside the model*, and the model admits them. If the
answer stays "boundary", then STORE-SHELL owes the check that F-21 already flags as owed for
`dupFreeS` — and the model should carry an explicit unchecked-claim marker (audit §6.3) on
the §7 sentence.

**Q-R1-5.** `.tuple es` ⊆ `.tupleRest es rest` for every `rest`. Is that intended? It means
every fixed-arity tuple value is also typed by an unbounded-arity schema at a different
address — benign for typing, but it means "the type of this entity" is not unique even up to
address, and M17's phrasing ("*its* schema") assumes a functional relation that does not hold.

**Q-R1-6 (low priority, interop).** The key order is code-point lexicographic on the key
string, not RFC 8949 §4.2.1's bytewise order on the *encoded* key. Measured divergence:
`"aa" < "z"` here, `"z" < "aa"` under CBOR core-deterministic. Self-consistent either way.
Should the spec record the choice explicitly (and the reason), so a future DAG-CBOR bridge
does not silently disagree?

**Q-R1-7 (methodology).** `String.decidableLT` is `@[extern "lean_string_dec_lt"]`, so
`#eval` receipts and `decide` receipts run different code. Probe 1 §B checks agreement on
the keys this wave used. Should that check become a standing item in the probe idiom
alongside house lesson F-18, or is it over-cautious?

---

## 10. What I did not attack

Named so the operator knows the boundary of this report:

- **Q12** (`Conforms` does not observe the union `mode` byte) — named a wave-2 target, but
  not mine; another refuter's `p4_q12.lean` sits in this directory.
- **R-4 / the check-id allowlist** — deferred by ruling to a dedicated session. §7 hands it
  one new admission criterion, no more.
- **M10 / M19 / the reference-graph vocabulary** — brief says refuter 3.
- **The shell side** (`experiments/`, STORE-SHELL) — model plane only.
- **Any claim about `H`** — every address claim here is either unconditional or carries
  injectivity as a named hypothesis, never an axiom.
