# R-D — the typing plane: M17, B4, and the Conforms-on-canonical ruling

**Posture: G0 advisory, 2026-08-25. This document decides nothing; the rulings are the
operator's.** Consolidation pass over the in-repo corpus — no new design, no new probe.
Every claim below carries a receipt (file:line, or a named kernel theorem in
`.staging/scouts/2026-08-25-wave2/`). Claims that are *reasoning over* the corpus rather
than a receipt from it are marked **UNVERIFIED** and say what would verify them. No file
was edited to produce this report; no Lean was run.

Lane: wave-2 family 1 — F-25, F-26, F-28, F-36 — and the ruling the triage says family 1
needs (`audit/2026-08-25-wave2-triage.md:76-78`: *"Ruling needed on whether `Conforms`
becomes the judgment on canonical forms only; that repair also retires bridge pin B4 and
unblocks A-6"*).

**Sources read in full.** `docs/entity-store/audit/2026-08-25-wave2-faults.md`;
`audit/2026-08-25-wave2-triage.md`; `audit/FINDINGS.md` rows F-21..F-42;
`STORE-MODEL.md` §3–§9; `MAPPING.md` (table + admission rules);
`research/schema-ast-census.md` §5a; `.staging/scouts/2026-08-25-wave2/R1-canon-bridges.md`
with `R1-p4_m17.lean`/`.out` and `R1-p5_a6.lean`/`.out`; `R3-p4_q12.lean`;
`formal/entity-store/E2/{Core,Canon,Obligations,Model,Bridge,Resolve,Faithful,Closure,Reject,Correspondence}.lean`.

---

## 1. The gap, restated exactly

`Reachable.putE` (`E2/Model.lean:310-312`):

```lean
| putE {σ sAddr v s} : Reachable H env σ → σ.find sAddr = some (preimageS s) →
    Conforms env s v → AllResolve σ (refsV v) →
    Reachable H env (putEntity H σ sAddr v)
```

`putEntity` stores `preimageE sAddr v` = `… ++ encValue (canonV v)`
(`E2/Obligations.lean:25-26`); the schema address's body is `encSchema (canonS s)`
(`E2/Obligations.lean:19-20`). **What is judged is `(s, v)`; what is held is
`(canonS s, canonV v)`.** The schema half repeats the shape at `putS`
(`Model.lean:308`): premise `WFS s`, stored `canonS s`.

Two kernel-checked falsifications, both re-verified by the coordinator (F-25):

- **Route A (`.lit`)** — `M17_store_form_FALSE` (`R1-p4_m17.lean:137-142`). A two-put
  reachable store over an injective `H`; both resolves succeed
  (`sigma2_reachable`, `entity_resolves`, `schema_resolves`, lines 92-123); the schema is
  `.lit vBad`, the stored value is `canonV vBad = vGood`, and `Conforms (.lit vBad) vGood`
  demands `vGood = vBad`. Carrier form: `M17_carrier_form_FALSE` (65-74) — **`WFS` does
  not imply `litsCanonicalB`** (`.out` 1.4 `WFS sLit = true`, 1.5 `litsCanonicalB sLit = false`).
- **Route B (`refine`/`checkSem`)** — `M17_survives_A6_FALSE` (171-183). Witness
  `.refine (.object [b:int, a:int]) c` with an order-sensitive `env.checkSem`. `WFS` holds,
  `litsCanonicalB` holds (`.out` 4.1/4.2 both `true`), `canonS` reorders the fields
  (4.3 `false`), `canonV` reorders the value, the check rejects. **No `lit` node anywhere
  in the witness**, so A-6's equation change cannot touch it.

Bridge pin B4 (`E2/Bridge.lean:75-81`) is exactly this gap, carrying three hypotheses:
`checkSem` `canonV`-invariance (F-24), `∀ a, env.res a = none` (ref-free fragment), and
`litsCanonicalB s` (F-23). R1's verdict on B4 itself: **SURVIVED as pinned**
(`R1-canon-bridges.md:158-160`, five constructed derivations `W1`–`W5` in
`R1-p7_b4_object.lean` plus four sweeps over 61,494 schemas). The defect is not B4's
truth — it is that **none of B4's three hypotheses is a clause of `WFS`, `Reachable`, or
`ConformsEnv`** (`Model.lean:163-164`, `306-312`, `210-213`).

### 1.1 A divergence the register has not yet named (proposed row, coordinator to assign)

STORE-MODEL §5's typing precondition reads (`STORE-MODEL.md:136-139`):

> `put_E (sAddr, v) σ` is legal only when: `resolve_S sAddr σ = some s` (the schema exists
> in this store), and `Conforms s v` (the value conforms).

Read literally, `s` is **bound by the first bullet to the resolved schema**, and
`resolve_k` is `getChecked` + strip + decode (`STORE-MODEL.md:90`), which returns
`canon_k c` by L-faithful (`:107-108`; proved as `M15_faithful_schema`,
`E2/Faithful.lean:51`). So the ratified spec's precondition is
**`Conforms (canonS s₀) v`** — the schema half of option (i) is *already ratified text*,
and `Model.lean:310-311` transcribes it onto the raw carrier instead. That is an F-22-class
transcription divergence (spec-to-scaffold, untracked), not a design gap.

The **value half is a genuine spec gap**: §5's pre-image line already demands
`ser_V(canonV v)` (`:129-130`) while the same §5 checks `Conforms s v` on the raw `v`.
Consequence for the ruling: option (i)'s schema half is a *correction*, its value half is
an *amendment*. **UNVERIFIED as a finding** — it turns on the operator's read of whether
§5's `s` is the resolved schema or an informal existence gloss.

---

## 2. Five structural facts the options turn on

**S-1. The `Conforms` family is already documented as a judgment on canonical forms.**
`E2/Model.lean:206-208`: *"Inductive proposition; parameterized by the check semantics
(R-4 pending) and a schema resolver for `.ref` … **Assumes both sides canonical (field
lists sorted).**"* The assumption was written and never enforced. Option (i)/(iii) make the
comment true; option (ii) leaves it a comment.

**S-2. `ConformsF` is order-lockstep, so an unsorted schema does not accept a sorted
value.** `ConformsF.req`/`opt_present` match `.cons k t _ rest` against `.cons k v vfs` —
same key, same position (`Model.lean:242-245`); `opt_absent` may skip a schema field
(`:246-247`). So a conforming value's field list is a key-for-key *subsequence, in order*,
of the schema's. Consequence: `Conforms env s (canonV v)` with `s` unsorted is very nearly
unsatisfiable at object nodes. **This is why the value-only strengthening in the brief's
(i) cannot stand alone** — see §3.2. (UNVERIFIED as a general statement; the lockstep
receipts are `Model.lean:240-247` and F-19's pinned note, `STORE-MODEL.md:275-277`.)

**S-3. The `putE` `Conforms` premise is consumed by exactly zero proved theorems.**
Every theorem that inducts on `Reachable` binds it as a hole:

| Theorem | Site | Pattern | `WFS` used? | `Conforms` used? |
|---|---|---|---|---|
| `M8_wf1` | `Model.lean:335-340` | `\| putS _ _ _ ih`, `\| putE _ _ _ _ ih` | no | no |
| `wf2_of_reachable` → `M9_wf2` | `Closure.lean:190-236` | `\| @putS σ s _ _ href ih`, `\| @putE σ sAddr v s _ hschema _ href ih` | no | no |
| `reachable_ne_dangling_singleton` → NEG-2 | `Reject.lean:19-56` | `\| @putS σ s _ _ href ih`, `\| @putE σ sAddr v s _ _ _ _ ih` | no | no |

The typing precondition is **inert in the entire proved ledger**. That is precisely why
the bill arrives at M17 and nowhere else — and why strengthening it is nearly free (§3.1).

**S-4. Nothing canonicalizes `Check` payloads, and no proposed repair reaches them.**
`canonS (.refine s c) = .refine (canonS s) c` (`Canon.lean:42`); `litsCanonicalB` does not
inspect the check (`Bridge.lean:37`); `dupFreeS` does not (`Canon.lean:118`); A-6 does not
(`R1-p5_a6.out` 6.1 `false`) and the F-26 repair does not (6.2 `dupFreeS6 refB = true`).
Receipts `C5`/`C6`/`C7` (F-29). Any closure claim about duplicate-key or non-canonical
*values* must exempt check payloads, or the R-4 session must extend clause 4 to them.

**S-5. The union `mode` byte is in identity and not in conformance.** `encUMode`
(`E2/Encode.lean:113`) and the union equation (`:123`) put `mode` in the pre-image;
`canonS` passes it through untouched (`Canon.lean:41`). Kernel receipts:
`mode_is_in_identity`, `mode_is_not_in_conformance` (`R3-p4_q12.lean:77-81`).

---

## 3. Option (i) — strengthen `Reachable`

### 3.1 (i-a) — both premises on the stored form (recommended reading of the brief)

```lean
| putS {σ s} : Reachable H env σ → WFS (canonS s) → AllResolve σ (refsS (canonS s)) → …
| putE {σ sAddr v s} : Reachable H env σ → σ.find sAddr = some (preimageS s) →
    Conforms env (canonS s) (canonV v) → AllResolve σ (refsV (canonV v)) → …
```

**Direction of change.** Every replacement is *weaker or equal* except the `Conforms` one,
which is incomparable:

- `WFS s → WFS (canonS s)` is B1∧B2∧B3 (`Bridge.lean:59-70`), swept `true` over 61,494
  schemas in **both** the pin form and the strictly stronger `iff` form
  (`R1-canon-bridges.md:101-112`). So the new `putS` premise admits at least as many stores.
- `AllResolve σ (refsS s) → AllResolve σ (refsS (canonS s))` is **proved**:
  `allResolve_canonS` (`Closure.lean:150-153`), from `mem_refsS_canon`. Value twin:
  `allResolve_canonV` (`:155-158`).
- `Conforms env s v` vs `Conforms env (canonS s) (canonV v)`: incomparable — route A gives
  a witness of the first and not the second (`M17_carrier_form_FALSE`); the same witness
  read backwards (`Conforms (.lit vBad) vGood` false, `Conforms (canonS6 (.lit vBad)) (canonV vBad)`
  true, `A6_closes_route_A`) gives the converse under A-6.

**What breaks in the proved ledger (STORE-MODEL §9's state):** *nothing semantically.*

| Ledger item | Where | Impact of (i-a) |
|---|---|---|
| M8 WF1 | `Model.lean:335` | none — premises unused; patterns keep their arity because premises are **replaced**, not added |
| M9 WF2 | `Closure.lean:233` | proof **shortens**: `allResolve_canonS href` (`:207`) and `allResolve_canonV href` (`:225`) collapse to `href` |
| NEG-2 | `Reject.lean:53` | none — putS case uses `href` with `s = .ref a₀`, and `canonS (.ref a₀) = .ref a₀` (`Canon.lean:49`) |
| M15 fresh / schema / entity | `Faithful.lean:35,51,67` | untouched — `Reachable` enters only through `find_putPre_injective` → `M8_wf1` (`:23-33`); statements (`Resolve.lean:83-107`) quantify `s`/`v` with **no** legality premise (that is finding (h), `R1-canon-bridges.md:400-414`) |
| M12, M12E, M13, M14 | `Model.lean:344,352,359,372` | untouched — none mentions `Reachable` |
| M5 `directionA`, M7 `kind_separation` | `Obligations.lean:35,42` | untouched |
| F/S, F/V (`encSchema_inj`, `encValue_inj`) | `Faithful.lean:85,91` | untouched |
| M11, M18 (stated Props) | `Model.lean:380,386` | untouched — M18's hypothesis is `WFS s` on an arbitrary `s`, independent of `Reachable` |

Verified by grep: `Reachable` occurs outside `Model.lean` only at `Closure.lean:192`,
`Faithful.lean:24`, `Reject.lean:20`, and in the four pinned statements
(`Resolve.lean:95,105,114,124`). **Three proofs touched, two of them shortened, zero
statements restated, one definition amended.**

**Does M17 follow by construction?** UNVERIFIED (no seat run), but the skeleton is
mechanical and every ingredient already exists:

1. Induct on `Reachable`; split each case with `find_putPre_cases` (**proved**,
   `Closure.lean:177-188`) into *the inserted pre-image* and *an old binding*.
2. Inserted **schema** case: `resolveEntity` fails at `stripPre kindEntity` because the
   kind byte is `kindSchema` (`Resolve.lean:26-28`, `Obligations.lean:15-17`) — no
   `H`-injectivity needed, byte-level kind separation suffices.
3. Inserted **entity** case: `resolveEntity` returns `(sAddr, canonV v)` by
   `decAddr_encAddress` + `M4a_value`, exactly as `M15_faithful_entity` does
   (`Faithful.lean:67-83`). `σ.find sAddr = some (preimageS s)` plus **M8** gives
   `H (preimageS s) = sAddr`, so `getChecked` succeeds and `resolveSchema` returns
   `canonS s` via `M4a_schema`. The new premise **is** the goal. No `H`-injectivity needed —
   the probe's `ObligationM17_typed_reachability` (`R1-p4_m17.lean:128-135`) carries
   injectivity as a hypothesis; under (i-a) it looks dischargeable without it.
4. Old-binding cases: `M13_frame` (**proved**, `Model.lean:359`) preserves both the entity
   bytes and its schema's binding; IH closes.

Cost shape: one seat mirroring `Closure.lean`'s structure, ~4 helper lemmas, all with
existing analogues. **B4 is retired, not proved** — F-23 and F-24 cease to be bridge
conditions (they remain live for F-29 and R-4 on their own merits).

**Two residuals the ruling should name.**

- *M17 is env-relative.* Under (i-a), `.ref` nodes inside the stored schema are typed
  through `env.res`, which nothing ties to the store. M17 then certifies conformance *in
  the ambient environment*, not *in the store*. The store-coherent statement is M17′ —
  **owed and unstated** (`Model.lean:404`, `Bridge.lean:14-16`). This is not introduced by
  (i-a); it is inherited, and (i-a) makes it the only remaining hole in §5's sentence.
- *The check moves to the boundary.* (i-a) obliges the shell to canonicalize **before**
  checking conformance. That is the same canonical-image discipline Q5 already imposes on
  bytes (`STORE-MODEL.md:217-221`), extended to typing — but it lands in family 2's
  boundary work (F-33: the boundary today enforces no part of `WFS` at all).

### 3.2 (i-b) — the brief's literal form: value-only, plus a new bridge B4′

The brief's wording is `Conforms env s (canonV v)`. Taken literally this leaves the schema
half raw, so M17's store form (which is about `canonS s`) still needs a bridge — but a
**much weaker one than B4**, because the value is no longer moved:

> **B4′ (proposed):** `dupFreeS s = true → canonV w = w → Conforms env s w →
>   Conforms env (canonS s) w`.

Why B4′ is strictly cheaper than B4 (all UNVERIFIED — this is reasoning over the
definitions, and it is the one place a probe would earn its keep):

- **`refine`**: `canonS (.refine s c) = .refine (canonS s) c` (`Canon.lean:42`) and the
  value is unchanged, so `env.checkSem c w` transfers verbatim. **F-24's hypothesis is not
  needed.** This is the single largest difference from B4.
- **`ref`**: `canonS (.ref a) = .ref a` (`Canon.lean:49`), value unchanged. **B4's
  `∀ a, env.res a = none` hypothesis is not needed** — the ref-free restriction dissolves.
- **`lit`, today**: `canonS (.lit v) = .lit v` (`Canon.lean:47`) — premise and conclusion
  are identical. **F-23's `litsCanonicalB` is not needed.** *Under A-6*
  (`canonS (.lit v) = .lit (canonV v)`), `Conforms (.lit v) w` forces `w = v`
  (`lit_inv`, `R1-p4_m17.lean:31-32`), so the conclusion needs `canonV v = v`, which the
  F-26 repair (`dupFreeS (.lit v) := dupFreeV v`) plus `canonV`-canonicity of `w` supplies.
- **`object`**: the danger case. With `dupFreeS s` and `canonV w = w`, the value's keys are
  sorted, the matched schema fields appear in that same order (S-2), and sorting the schema
  list leaves that subsequence in place while interleaving only fields the value omitted —
  which were skipped by `opt_absent` and are therefore optional. The B4 seat's five
  constructed witnesses (`W1`–`W5`) probe exactly this region and all derive on both sides
  (`R1-canon-bridges.md:144-156`).
- **`mu`**: needs `canonS (unfoldMu d b) = unfoldMu d (canonS b)` — **already
  kernel-checked** as `K1_unfold_commutes`, with sweeps `B4.iii`/`B4.iv` `true` over 61,494
  schemas (`R1-canon-bridges.md:131-136`). Induction is on the `Conforms` derivation, so the
  `mu` premise is structurally smaller.

Net: B4′ needs **`WFS`-supplied `dupFreeS` and a canonical value — both of which (i-b)
plus the F-28 premise already provide** — and none of B4's three hypotheses. But note the
sting in S-2: with the schema left raw, `Conforms env s (canonV v)` is close to
unsatisfiable at unsorted object nodes, so (i-b) makes `Reachable` *smaller* in a way no
one designed. (i-a) is both cheaper and more permissive.

---

## 4. Option (ii) — keep `Reachable`, prove B4

**Is B4 provable at all?** R1 says yes *as pinned*: `litsCanonicalB` is sufficient, four
sub-attacks run, five constructed derivations at the duplicate-key × absent-optional edge,
`dupFreeS` genuinely not needed (`R1-canon-bridges.md:114-160`). So the seat is a proof
task, not a refutation risk. **But proving B4 does not give M17**, and that is the decisive
objection:

> B4's hypotheses are not inhabited at the put site. `M17_carrier_form_FALSE` is precisely
> `WFS ⊬ litsCanonicalB`; `M17_survives_A6_FALSE` is precisely "nothing in `Reachable` or
> `ConformsEnv` gives `checkSem` invariance".

So option (ii) is not "keep `Reachable`" — it is *also* a `Reachable`/`ConformsEnv`
amendment, just with weaker content. Either `Reachable.putS` gains `litsCanonicalB s` and
`ConformsEnv` gains an invariance field, **or** M17 is restated with both as hypotheses, in
which case it becomes a statement about a *subset* of reachable stores and STORE-MODEL
§5's sentence (`:141-143`) needs the matching qualification.

**The condition set that makes B4 dischargeable, condition by condition:**

| B4 hypothesis | Origin | Dischargeable when | Verdict |
|---|---|---|---|
| `litsCanonicalB s` | F-23 | on **canon images** after A-6 **with** the F-26 repair: `lits_new = true` over 15,310 schemas (`R1-p5_a6.out` 5.5), `false` without (4.6/4.7) | **conditionally yes** — but never on the *raw* `s`: `dupFreeS6 (.lit vBad) = true` while `litsCanonicalB (.lit vBad) = false` |
| `∀ a, env.res a = none` | ref-free fragment, `Bridge.lean:16` | only by the owed M17′ resolver-coherent extension — **unstated** (`Model.lean:404`) | **open, unstated** |
| `checkSem` `canonV`-invariance | F-24 | only when R-4 replaces the `ConformsEnv.checkSem` *parameter* (`Model.lean:211`) with allowlist-indexed semantics and proves invariance per id | **conditional until R-4** |

**Does A-6 + the F-26 repair suffice for the lit route?** Yes, and more cleanly than the
pinned form suggests: `A6_closes_route_A` (`R1-p5_a6.lean:94-98`) proves
`Conforms env (canonS6 litB) (canonV vBad)` *unconditionally* — because both sides are
moved by the same function, the lit node needs no `litsCanonicalB` hypothesis at all once
A-6 lands. **Refine stays conditional on the R-4 allowlist**, exactly as F-24 routed it.

**One measurement that makes R-4's job look small (UNVERIFIED, corpus reasoning).** The v1
minted-id register is six ids (`MAPPING.md:63-66`, admission rule 3): `lab/keyword/Void`,
`lab/keyword/Undefined`, `lab/keyword/Symbol`, `lab/uniqueSymbol`, `lab/enum`,
`lab/mutable` (+ `lab/pattern`). `canonV`-invariance is a property of the check's
**argument**, not its payload (`Bridge.lean:77`: `env.checkSem c w ↔ env.checkSem c (canonV w)`).
Five of the six ride on `.prim .str`/`.prim .null` or a union of scalar literals
(`MAPPING.md` rows 9, 22, 23, 25, 27, 30), where `canonV w = w` by `Canon.lean:74-81` and
invariance is trivial. Only `lab/mutable` (row 19) can sit on a property whose schema is an
object or array. So F-24's admission criterion looks like **five trivial lemmas and one
real one** — provided R-4 also rules on F-29 (check payloads uncanonicalized, S-4).

**Cost of (ii), honestly.** `ConformsEnv` gaining a Prop field is not a local edit: every
`ConformsEnv` literal in the corpus must supply a proof (`envTrivial`,
`envOrderSensitive` in `R1-p4_m17.lean:61,153`; the R3 probes; any future seat), and the
six statements quantifying `∀ env : ConformsEnv` (`Resolve.lean:93,103,113,123`,
`Model.lean:387`, `Bridge.lean:76`) silently narrow their meaning. Plus the B4 seat's four
owed lemmas (`R1-canon-bridges.md:469-473`). Plus M17′, unstated. And at the end of it the
result is *conditional forever* on an R-4 session that has not been convened.

---

## 5. Option (iii) — canonical-by-construction carriers

**ACQUISITION-GAP.** There is no "Std-carrier lane" document in the repo: `grep -rn "Std"
docs/entity-store/` returns only STORE-SHELL's toolchain receipts for `Std.Http`/`Std.Async`/
`Std.Sync`/`Std.Do` (`STORE-SHELL.md:18-22,40,56,60,67-75,135,144,149,168`) and one
`Std.Tactic.BVDecide` trust note. Nothing in the corpus describes a canonical-by-construction
carrier lane, so I can neither summarize its state nor cost it. The nearest ratified
vocabulary is Q5 canonical-image strictness (`STORE-MODEL.md:217-221`) and Q-R1-1(iii)
(`R1-canon-bridges.md:484-486`).

**The interaction that matters for this ruling.** If carriers later become canonical by
construction (a subtype or quotient with `canonS s = s`), then `canonS` is the identity on
the carrier, B4/B4′ vanish, M17 is immediate, and F-23/F-24/F-29 dissolve as *bridge*
questions. Therefore:

> **(i-a) is the statement-level shadow of (iii), and is forward-compatible with it.**
> Under (iii), (i-a)'s premises `WFS (canonS s)` / `Conforms (canonS s) (canonV v)`
> degenerate to `WFS s` / `Conforms s v` with no re-ruling required. Option (ii) is **not**
> forward-compatible: `litsCanonicalB` as a `WFS` clause and an invariance field on
> `ConformsEnv` would both become dead weight, and the B4 seat's proof would be discarded.

---

## 6. F-28 — duplicate-key values, and the A-3 record

### 6.1 Does (i) close it?

Adding `dupFreeV (canonV v)` to `putE` blocks **the value plane only**, and it does block
it: R1's two witnesses both go through `putE` — `E5_dup_value_reachable` (`vDup` under
`.record (.prim .int)`, whose `ConformsAllF` is key-agnostic, `Model.lean:264-267`) and
`F2_lit_dup_reachable` (`vDup` under `.lit vDup`, `Conforms.lit`, `Model.lean:226`).
Both premises now fail: `dupFreeV vDup = false` (`E7_hypothesis_fails_there`).

**But duplicate-key values reach the store by two further routes that `putE` does not
guard**, and the answer to the brief's question is therefore *no, one clause is not enough*:

| Route | Guarded by | Status |
|---|---|---|
| entity value | `putE` premise `dupFreeV (canonV v)` | closed by (i) + the added premise |
| `.lit v` payload inside a **schema** (`putS`) | `dupFreeS (.lit _) = true` unconditionally (`Canon.lean:112`) | closed **only** by the F-26 repair `dupFreeS (.lit v) := dupFreeV v` |
| `Check` payload inside a `refine` | nothing (S-4) | **open** — F-29 / R-4 |

So the complete value-plane closure is **two clauses plus one R-4 ruling**, and the F-26
repair — which the register currently reads as "A-6 must ship with this" — turns out to be
load-bearing for F-28 as well, *independently of whether A-6 ships*.

`dupFreeV (canonV v)` vs `dupFreeV v`: equivalent modulo a value-plane twin of B3
(`canonV` permutes keys, never multiplies them); the schema twin is swept `true`
(`R1-p5_a6.out` 5.6). Stating it on the stored form keeps every `putE` premise about what
the store holds — the whole point of (i). **UNVERIFIED**: the value-plane B3 twin is not a
pinned statement anywhere; it would be one small owed lemma.

Mechanical note: `dupFreeV` is an **added** premise, not a replacement, so it *does* shift
the three `putE` induction patterns by one hole — `Model.lean:340`, `Closure.lean:212`,
`Reject.lean:44`. Three character-level edits.

### 6.2 Does this reverse the A-3 record, and what evidence changed?

The record (`STORE-MODEL.md:261-262`):

> "Value-plane duplicate-freedom stays a boundary admission, not a `Reachable` clause (a JS
> object cannot carry duplicate keys, so the excluded values have no host counterpart)."

Yes — adding the premise reverses it. Four items of evidence postdate the record:

1. **The excluded values do not need a host counterpart, because they are constructed
   inside the model.** `Conforms.record` leaves keys unconstrained and `Conforms.lit`
   admits the payload itself; no host object is involved on either route. Receipts
   `E4_record_admits_dup_keys`, `E5_dup_value_reachable`, `F2_lit_dup_reachable`
   (kernel). The parenthetical is a claim about the host; the sentence before it is a claim
   about the model, and the model does not enforce it.
2. **The boundary the admission was delegated to does not perform it, and — by the method
   the shell uses — cannot.** F-33: the boundary enforces no part of `WFS`. F-40: a
   *palindromic* duplicate-key run byte-compares equal to its own re-canonicalization
   (`canonFields` is an involution there), so re-canonicalize-and-compare admits it and
   `check` reports clean; the same holds on the value plane for `vobj`. F-41 is the mirror.
   A-3 delegated to a check that does not exist and whose intended mechanism is defeated.
3. **A-4 widened the opening after A-3 was recorded.** `.record` (tag 0x3C, landed
   2026-08-25, `STORE-MODEL.md:269-274`) is a second, key-agnostic route.
4. **The model's own dedup theorem has a hole exactly there.**
   `ObligationCanonVIdempotent` (`Obligations.lean:73-74`) is *vacuous* on the reachable
   region F-12 identified (`E6_canonV_not_idempotent_there`), and L-dedup is undefined on
   duplicate-key permutations (`dup_pair_two_addresses`, `R1-canon-bridges.md:388-397`).

**Does the value plane need its own `Reachable` clause?** Structurally, no separate
constructor is required — values enter through `putE` (as values) and through `putS` (as
`.lit`/`Check` payloads), so the two premises above sit on the two existing constructors.
The A-3 record's *decision* is what reverses, not the shape of `Reachable`. Note the
pattern: this is the second time a "boundary admission, not a model clause" has been
falsified inside the model (A-3 → F-28; MAPPING admission rule 1 → F-35, where
`.lit (.vaddr a)` hides an address from `refsS` and the boundary rule became load-bearing
for WF2). That recurrence is itself an argument about *where* admissions belong.

---

## 7. Q12 / F-36 — the two postures

### 7.1 Posture (a) — name the price in M17's anti-claim

**Drafted anti-claim sentence (for STORE-MODEL §6's coupling table and the M17 pin):**

> **M17 anti-claim.** M17 certifies conformance *as this model defines `Conforms`*, and
> `Conforms` does not observe the union `mode` byte (ruling Q12). Under `mode = oneOf` a
> second successful member match is a decode **failure** in the pinned implementation
> (`SchemaAST.ts:3071-3073`; census §5a) while `Conforms` accepts on the first match, so
> M17 claims *typed reachability up to union-mode blindness*: it does **not** claim that a
> stored entity decodes under the pinned Effect decoder at its stored schema. The
> divergence is observable, not notional — `mode` rides in the pre-image (`encUMode`,
> `E2/Encode.lean:113,123`), so the `anyOf` and `oneOf` spellings are two addresses
> carrying one typing judgment (`mode_is_in_identity`, `mode_is_not_in_conformance`).
> Under `anyOf` there is no accept/reject divergence: `Conforms` and first-match decoding
> agree on acceptance and differ only in *which* member is selected, which M17 does not
> speak about.

Two caveats to carry with it. (1) The `anyOf` half of the sentence assumes the census's
candidate **filter** only removes members that could not have matched; §5a describes the
filter as narrowing and never claims soundness (`census:687-703`) — mark that clause
UNVERIFIED or drop it. (2) STORE-MODEL §6's *"Anti-claim"* column exists only on the
identity-spine table (`:163-171`); the store-algebra and coupling tables carry
`| # | Statement |` alone (`:175-186`, `:190-193`). Adopting (a) means adding the column to
the coupling table — a documentation delta, consistent with §6's own discipline sentence
(`:159`: *"what a theorem does **not** claim is part of its statement discipline"*).

**Cost: zero obligations, zero Lean.** One table column, one sentence, one FINDINGS
disposition.

### 7.2 Posture (b) — strengthen `Conforms` with `oneOf` exclusivity

**The structural blocker.** The natural rule

```lean
| union_one {ms m v} : SMem m ms → Conforms env m v →
    (∀ m', SMem m' ms → m' ≠ m → ¬ Conforms env m' v) → Conforms env (.union .oneOf ms) v
```

puts `Conforms env m' v → False` in a premise — a **negative occurrence of the type being
defined**, which the kernel rejects for strict positivity. So (b) **cannot** be done by
adding a constructor to the existing mutual family (`Model.lean:219-268`).
**UNVERIFIED by elaboration** (no file written); it is the standard positivity rule, and it
is the single most important fact about (b)'s cost.

Three ways out, with their real costs:

1. **Move `Conforms` to the shape the spec already describes.** STORE-MODEL §5's joint C
   says `Conforms` is *"total by well-founded recursion on value size"* (`:148-154`); the
   scaffold implemented an inductive family instead (`Model.lean:206-268`, "joint C
   shape"). As a function, the negative premise is legal. Cost: rewrite five mutual
   inductives as mutual well-founded definitions; re-derive every existing derivation term
   (`A4Probe.lean`, `R1-p3/p4/p7`, `R3-p4`, F-19's lockstep note); and **mechanize joint
   C's termination argument for the first time** — guardedness ⇒ well-founded on value
   size, which today is cited as a *shape demonstration* in
   `research/rocq-itrees-lean-probe.lean`, not a proof. M18 would then be nearly free.
   This is a lane-sized rewrite that also re-opens a ratified joint.
2. **A second family layered on top (cheapest honest route).** Define `Conforms` as today,
   then a *separate* inductive `ConformsX` mirroring it whose `oneOf` case may freely use
   `¬ Conforms …` — legal, because `Conforms` is no longer the type being defined.
   `Reachable.putE` and M17 switch to `ConformsX`. Cost: one new family of ~15 constructors
   + 4 auxiliaries, plus a second half of M18.
3. **Reject the construct instead** — §7.3.

**Exclusivity must be positional, not up to schema equality.** R3's scenario 1 is
`.union .oneOf [.prim .str, .prim .str]` (`R3-p4_q12.lean:16`): both *positions* succeed,
so Effect raises `SchemaIssue.OneOf`, but any formulation quantified over `SMem` sees
`m' = m` as schemas and accepts. `SMem` (`Model.lean:215-217`) is a membership relation
with no index, so (b) needs indexed membership vocabulary — a further delta touching every
`union_mem` derivation in the corpus.

**M18 decidability under (b):** still decidable — a `oneOf` node requires trying all
members instead of stopping at the first, so the cost is complexity, not decidability. The
real M18 impact is definitional order: route 2 makes M18 a two-part statement, route 1
makes M18 nearly trivial but only after the rewrite.

**Addresses under (b): unchanged.** `canonS` never touches `mode` or member order
(`Canon.lean:41`), `encSchema` already carries `mode` (`Encode.lean:113,123`), and no
pre-image byte moves. (b) shrinks `Reachable` (strictly fewer admitted entities at `oneOf`
nodes) — and by S-3 no proved theorem consumes the `Conforms` premise, so **the ledger
survives (b) untouched too**. (b) is safe for the store algebra and expensive only in the
`Conforms` family.

### 7.3 Does anything in the corpus argue for (b) over (a)?

**For (a) — three receipts.** Q12 was ruled a priced divergence on the reasoning that
*"conformance is a typing judgment; `oneOf` exclusivity is a decode semantic"*
(`STORE-MODEL.md:279-282`). The claim posture disclaims Effect entirely: *"Nothing here
claims anything about the pinned Effect implementation (that is the correspondence lane's
separate, gated business)"* (`:364-367`). And §6's anti-claim discipline exists for exactly
this (`:159`). F-36 demonstrates the price is **observable**, not that the reasoning was
wrong. Refuter 3 recommends (a) (`FINDINGS.md` F-36).

**For (b) — one real argument, from MAPPING's G2 posture.** MAPPING row 1 (`:24`) rejects
`Any` because *"the mu-union approximation silently **narrows** conformance, which G2's
posture forbids elsewhere"*, and the disposition vocabulary insists REJECTED-v1 is
*"explicitly and loudly … never a silent reinterpretation"* (`MAPPING.md:15-16`). Under `oneOf`,
`Conforms` silently **widens** conformance relative to the source semantics. By row 1's own
standard, a silent widening is the same class of defect as a silent narrowing — that is a
genuine corpus argument that (a) as *currently worded* (a ruling recorded in §7 prose) is
not enough, and that the price must at minimum be loud at the same place row 1 is loud: the
admission table.

**A third posture the corpus points at, which the brief did not ask for.** MAPPING already
declares one `oneOf` spelling **INADMISSIBLE** under the single-spelling rule (row 12,
`MAPPING.md:35`: *"the `oneOf`-nil spelling is INADMISSIBLE"*). Extending that to `oneOf` generally —
admit `anyOf` only in v1, reject `oneOf` loudly — costs **nothing** in the model
(`Conforms` unchanged, addresses unchanged, M18 unchanged) and removes the divergence
outright. Its weakness is exactly F-28's lesson: an *admission* rule is not a model clause,
so the model would still build and certify `.union .oneOf` entities. If the operator takes
this route it should be a `WFS` conjunct (`anyOfOnly`), not a boundary promise — the third
time the corpus has faced this choice (A-3 → F-28; MAPPING rule 1 → F-35).

---

## 8. Proof-cost estimates and A-6's shipping order

| Choice | Seats | Obligations restated / added | New definitions | Proofs touched |
|---|---|---|---|---|
| **(i-a)** both premises canonical | **1** (M17) | 0 restated; B4 **retired**; 1 owed value-plane B3 twin if `dupFreeV` is added | `Reachable` amended (2 constructors) | 3 (`M8_wf1`, `wf2_of_reachable`, `reachable_ne_dangling_singleton`) — 2 of them shorten; +3 pattern holes if `dupFreeV` is added |
| **(i-b)** value-only + B4′ | **2** (M17, B4′) | B4 retired, B4′ pinned; 3 owed lemmas, 2 of which are already kernel-checked (`K1_unfold_commutes`, `B4.ii`) | as (i-a) | as (i-a), plus the object-subsequence lemma |
| **(ii)** prove B4 | **2–3** (B4, + `WFS`/`ConformsEnv` amendments, + M17 seat) | B4 (4 owed lemmas) + `litsCanonicalB` into `WFS` (touches B1–B3, M18, every `WFS` witness) + invariance field on `ConformsEnv` (touches 6 statements + every env literal) + **M17′ unstated** | `ConformsEnv` gains a field; `WFS` gains a clause | 3, plus every probe constructing a `ConformsEnv` |
| **(a)** anti-claim | **0** | 0 | 0 | 0 (one §6 table column, one sentence) |
| **(b)** oneOf exclusivity | **2** (new `ConformsX` family; M18 second half) | `Reachable.putE` + M17 restated over the new judgment; indexed-membership vocabulary | 1 family (~15 constructors) + indexed `SMem` | 0 in the store algebra (S-3); every `union_mem` derivation in the probe corpus |

**A-6's shipping order.** Invariant across every branch: **A-6 never ships without the F-26
clause-4 extension** `dupFreeS (.lit v) := dupFreeV v` — `5.3 false` / `5.4 true` /
`5.5 true` / `5.6-5.8 true` over 15,310 schemas (`R1-p5_a6.out`). Beyond that:

- **Under (i-a)/(i-b):** A-6 is *independent* of M17 — it is a dedup (L-2787) fix, not a
  typing fix. But it changes `canonS`'s equations, and the additive-vs-arity rule extended
  to equation changes (`STORE-MODEL.md:290-295`) says not to mix substrates. **Order:
  A-6 + F-26 first (equation change) → the `Reachable` amendment (definition change) → the
  M17 seat (proof).** The M17 seat never unfolds `canonS`'s equations, so it is robust
  afterwards; running it first would mean re-running it.
- **Under (ii):** A-6 + F-26 is a **prerequisite**, not an ordering preference: B4's
  `litsCanonicalB` hypothesis is dischargeable only on canon images and only after the
  repair (`4.6`/`4.7 false` without it, `5.5 true` with). Even then, only the lit route
  closes; the refine route waits on R-4.
- **Under (a)/(b):** orthogonal — A-6 touches neither the anti-claim nor the union rules.
- **Cross-cutting note for whichever branch:** A-6 buys out a gap whose *host* counterpart
  is already forbidden. MAPPING admission rule 1 admits only `vstr`/`vbool`/`vint` payloads
  in `.lit` (`MAPPING.md:57-59`), so the entire F-23/route-A `.lit (vobj …)` family is
  **model-only** if that rule is ever enforced — while route B (`refine`) sits on the
  admitted image of six MAPPING rows (9, 19, 22, 23, 25, 27, 30). If the operator is
  ranking by host reach, the `checkSem` side outranks the `lit` side.

---

## 9. Questions this report cannot answer

1. **Is §5's `s` the resolved schema?** (§1.1.) If yes, option (i-a)'s schema half is a
   transcription correction and needs no amendment vote; if no, §5 needs rewording either way.
2. **`dupFreeV` premise: `putE` only, or `putE` + the F-26 repair + an R-4 ruling on check
   payloads?** (§6.1.) Closing two of three planes and calling the value plane closed would
   repeat A-3's error at a smaller scale.
3. **Does M17′ (resolver coherence) enter this ruling or the next one?** Under (i-a) it is
   the *only* remaining hole in §5's sentence, and it has never been stated
   (`Model.lean:404`, `Bridge.lean:14-16`).
4. **Q12: (a), (b), or admission-side rejection with a `WFS` conjunct?** (§7.3.)

## 10. What I did not do

No Lean was written or run — B4′, the strict-positivity blocker, the M17-by-construction
skeleton, and the object-subsequence argument are **reasoning over the definitions**, and
each says above what would verify it. I did not touch family 2 (boundary: F-33/F-40/F-32/
F-41), family 3 (F-39), the M19/M10 vocabulary, or the R-4 allowlist beyond the single
measurement in §4. No file in the repository was modified.
