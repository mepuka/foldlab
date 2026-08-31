# Effect Core v1 — the local anchor table

Date: 2026-08-31
Subject: `.staging/effect-core-v1/PROOF-DAG.md` against
`library/cas/Cas/**` and `library/cas/tools/**` (990 `theorem`/`lemma`
declarations across 45 761 lines).

Every citation below was read, not inferred from the name. Every
CONTRADICTED row was proved in Lean against the live corpus; the four
witness files and their `#print axioms` output are reproduced in §2.

Snapshot note: `PROOF-DAG.md` and `ALGEBRA.md` were edited on disk during
this pass (declaration section only — `EC1-D006`–`D009` renumbered,
`CauseTree`/`CauseReasons`/`quotientCause` and `PublicSurface` added,
`await`/`join`/`requestInterrupt`/`interruptAwait` added to `EC1-D028`).
The `EC1-T*` tables were unchanged; every row below is against the
current text.

---

## 1. Counts

| Class | Rows |
| --- | ---: |
| INHERITS | 26 |
| SPECIALIZES | 21 |
| SIMULATES | 15 |
| **CONTRADICTED** | **4** |
| NO ANCHOR | 31 |
| **Total** | **97** |

> **SUPERSEDED — see §8.** This table classifies the 97 rows present at
> revision `fc41e11b…` (27 395 bytes). The packet has since grown to 110
> rows. §8 classifies the 13 new ones and re-issues the counts; the
> classifications below are unchanged except for one revision recorded at
> §8.4.

The 31 `NO ANCHOR` rows are not evenly spread: 16 of them are the two
concurrency bundles (§8 `T060`–`T067`, §9 `T070`–`T079`). The corpus
contains zero occurrences of *finalizer*, *fairness*, *mask*, or
*supervisor* (re-verified), and every hit for *fiber* / *race* /
*interrupt* is a false positive (`trace`, `brace`). *daemon* has three
hits — `Cas/Backend/HttpProfile.lean:433`, `Cas/Lang/Handler.lean:22`,
`tools/TrustCensus.lean:48` — but all three are the transport/CLI daemon
(`cas daemon`, `DaemonHttp.test.ts`), not a daemon fiber, so no row in
§9 has an anchor there. Those two bundles are genuinely new
territory; almost everything else has a local anchor.

---

## 2. CONTRADICTED — four rows, each proved false

### 2.1 `EC1-T015 diagnostic_local` — the estate's checker reports one clause, not a set

Row: `rejectsAt r path code -> exists d in checkErrors r, d.path=path and d.code=code`

Contradicting declarations, both at `library/cas/Cas/Core/Admission.lean`:

- `checkRefs` (`Cas/Core/Admission.lean:49`) returns
  `Except AdmissionError Unit` — **one** error, not a list. It scans in
  order and stops at the first failure.
- `checkRefs_complete` (`Cas/Core/Admission.lean:137`) states the
  completeness the estate could actually prove, and its docstring names
  the gap outright:

  > Completeness: a condemned reference list is rejected (with the first
  > failing clause found, not necessarily the condemning one).

So for the estate's only checker there is a reference list on which two
distinct clauses both hold (`AdmissionError.Condemns`) and only one
appears in the output. `EC1-T015` demands the other one.

Verified — `scratchpad/check1.lean`:

```lean
theorem diagnostic_local_is_false :
    ∃ (σ : Store) (rs : List Ref) (e : AdmissionError),
      AdmissionError.Condemns σ e rs
        ∧ ∀ e', checkRefs σ rs = .error e' → e' ≠ e
```

with `σ = Store.empty.set a2 ⟨0,7,[],[]⟩`, `rs = [⟨1,a1⟩, ⟨3,a2⟩]`
(`a1` dangles, `a2` resolves at the wrong kind), and

```lean
theorem checker_reports_only_the_first :
    checkRefs sigma rs = .error (.dangling a1)
```

```
'Check1.diagnostic_local_is_false' depends on axioms: [propext]
'Check1.checker_reports_only_the_first' depends on axioms: [propext]
```

**What this costs.** `EC1-T015` is not unprovable in principle — a
checker that accumulates diagnostics can satisfy it. But it is
incompatible with reusing `checkRefs`, and `EC1-D024`'s
`Except (NonEmpty Diagnostic)` signature quietly commits D3 to an
accumulating checker with a per-clause locality proof, which is a
strictly harder object than anything in the corpus. Either restate the
row existentially (matching `checkRefs_complete`), or state that D3's
checker is new construction and cannot reuse `Cas/Core/Admission.lean`.

### 2.2 `EC1-T088 classifier_semEq` — semantic equality does not determine the classification

Row: `SemEq full p q -> concreteClass (Denotation p) = concreteClass (Denotation q)`

The estate has both halves of this at the CAS sublanguage, and they
disagree. `PProg.envelope` (`Cas/Lang/Defun.lean:1205`) is the estate's
classifier — read set, put shapes in program order, answer-index
dataflow DAG. `ObsEq` (`Cas/Lang/Representation.lean:134`) is the
estate's ratified full-mask semantic equality, and
`ObsEq_embed_of_runP` (`Cas/Lang/Defun.lean:419`) is the bridge from
run-agreement to it.

Two tables — one load, versus the same load followed by a load of the
first line's *answer* — have identical direct runs at every starting
word, hence are `ObsEq`, and have different dataflow.

Verified — `scratchpad/check2.lean`:

```lean
theorem classifier_semEq_is_false :
    ∃ (p q : PProg),
      (∀ (H : Bytes → Addr32), ObsEq H (embed p) (embed q))
        ∧ PProg.envelope p ≠ PProg.envelope q :=
  ⟨p1, p2, fun H => obs_equal H, envelopes_differ⟩
-- p1 = [.load (.lit a0)]
-- p2 = [.load (.lit a0), .load (.ans 0)]
```

```
'Check2.classifier_semEq_is_false' depends on axioms: [propext]
'Check2.runs_agree' depends on axioms: [propext]
```

**What this costs.** The row's carve-out ("Tooling evidence and
provenance records are excluded … two semantically equal programs may
have different source bytes or pins") does not reach this. The dataflow
DAG is a *semantic dimension* of the classification product, not
provenance. `classify` is by construction a function of the checked
graph (`EC1-D063`), so it is invariant under semantic equality only
where it is trivial. This is the may/must confusion the packet's own
§16 prohibits, arriving in a theorem row. The correct row is one
direction only — `SemEq full p q -> gammaProduct (classify p) ∩ gammaProduct (classify q) ∋ concreteClass …`
— or a named list of the fields that *are* semantic invariants.

### 2.3 `EC1-T100 injectCas_checked` — `injectCas : PProg -> CheckedProgram` cannot be total

Row: `injectCas_checked : ProgramWF (erase (injectCas p))`, quantified over
`p : PProg` via `EC1-D080 injectCas : PProg -> CheckedProgram casAER`.

`PProg = List PLine` carries **no** well-formedness. Two disjoint
classes of `PProg` are representable that no `ProgramWF` can admit,
because `ALGEBRA.md` §4.3 requires `IdsWF` ("every reference resolves")
and `EntryWF` ("the entry accepts exactly its declared input and every
normal return has result type `A`"):

- the **empty table** — `runPFrom` refuses it by name
  (`Cas/Lang/Defun.lean:276`, `"defun: empty program"`). No entry,
  no result.
- a **dangling answer index** — `PIn.resolve [] (.ans 0) = none`
  (`Cas/Lang/Defun.lean:199-201`), refused as
  `"defun: dangling answer index"`. The estate keeps a static gate for
  exactly this class (`Envelope.dataflowClosed`,
  `Cas/Lang/Defun.lean:1221`) precisely *because* it is representable,
  and `runP_no_dangling` (`Cas/Lang/Defun.lean:2101`) is conditional on
  it.

Verified — `scratchpad/check3.lean`:

```lean
theorem injectCas_cannot_be_total :
    ∃ p q : PProg,
      p ≠ q
        ∧ (∀ H w, (runP H p w).1 = .refused (.failed "defun: empty program"))
        ∧ (∀ H w, (runP H q w).1 = .refused (.failed "defun: dangling answer index"))
        ∧ (PProg.envelope q).dataflowClosed = false
```

```
'Check3.injectCas_cannot_be_total' depends on axioms: [propext]
```

**What this costs.** `EC1-D080`'s signature is unsatisfiable as written,
and `T100`–`T106` all inherit the bad quantifier. The fix is small and
already sitting in the corpus: restrict the domain the way
`Cas/Backend/Mcp.lean` does — `ofPProg_isSome` (`Cas/Backend/Mcp.lean:436`)
names the image as *every well-formed table*, `toPProg_ofPProg` (`:446`)
is the left inverse on that image, and `run_ofPProg` (`:458`) transfers
the meaning. That triple is the shape `T100`/`T101`/`T102` want.

### 2.4 `EC1-T002 normalizeRow_canonical` — the forward direction is false without a duplicate-free premise

Row: `normalizeRow_canonical : rowEq r s <-> norm r = norm s`

`ErrorRow`/`RequirementRow` are declared as keyed rows, and `RawProgram`
deliberately keeps invalid rows representable (`ALGEBRA.md` §4.1). The
estate's only shipped keyed-row canonicalizer is `canonServices`
(`Cas/Backend/EmitLayer.lean:220`), and the estate keeps a live proof
that the forward direction fails when a key repeats — because `dedup`
keeps the **last** occurrence, so permuting the input changes which
reference survives:

`canonServices_perm_premise_is_necessary` (`Cas/Backend/Canon.lean:376`):

```lean
theorem canonServices_perm_premise_is_necessary :
    ¬ ∀ (xs ys : List ServiceRef), xs.Perm ys →
        canonServices xs = canonServices ys
```

Its docstring: *"E2 with its premise deleted is FALSE. The adversarial
reading — 'the `Nodup` hypothesis is bookkeeping, drop it' — dies on a
witness rather than on an argument."*

Verified — `scratchpad/check4.lean`:

```
'Check5.T002_forward_is_false' depends on axioms: [propext, Classical.choice, Quot.sound]
```

**What this costs.** `T002` holds with the duplicate-free premise, and
the estate already has both halves under it —
`canonServices_perm_of_nodup_keys` (`Cas/Backend/Canon.lean:288`) and
`canonServices_perm` (`:313`) — plus the door theorem that discharges
the premise mechanically, `nodup_keys_of_isCanonServices` (`:392`). The
row must carry that premise or name the door that supplies it.

---

## 3. Three rows are TRUE BUT VACUOUS

`EC1-T003 pure_eval_total` (`exists! v, evalPure e env = v`),
`EC1-T035 execStep_deterministic`, and `EC1-T115 render_deterministic`
are all satisfied by *any* Lean function. Verified — `scratchpad/check3.lean`:

```lean
theorem any_function_is_total_and_deterministic {α β : Type} (f : α → β) (x : α) :
    (∃ v, f x = v ∧ ∀ u, f x = u → u = v) ∧ (∀ y z, f x = y → f x = z → y = z)
```

```
'Check4.any_function_is_total_and_deterministic' does not depend on any axioms
```

They carry design content only if the intended obligations are named
instead: for `T003`, *termination of a structurally recursive evaluator*
plus injectivity where it is needed (the estate's model is
`natRepr_inj`, `Cas/Values/Digits.lean:147`); for `T035`, *the decision
tape is the only nondeterminism* (which is a statement about `Decision`,
not about `execStep`); for `T115`, *rendering is injective on the
admitted subset* — and note that the estate proved the opposite for its
own renderer: `renderPlain_not_injective` (`Cas/Values/JsonInj.lean:100`).

---

## 4. The anchor table

### 4.1 Foundation — `EC1-T001`–`T007`

| Row | Class | Anchor |
| --- | --- | --- |
| `T001` | INHERITS | `Cas/Backend/Canon.lean:297` `canonServices_idem` (keyed rows — exactly the `ErrorRow`/`RequirementRow` shape). Three more at other carriers: `Cas/Core/Canonicalize/Json.lean:123` `canonValue_idem`, `Cas/Core/Refs.lean:329` `canonR_idem`, `Cas/Values/JsonInj.lean:134` `Value.numNorm_idem`, `Cas/Schema/Basis.lean:479` `deNumNorm_idem`. Abstractly it is already a *structure field*, not a theorem: `Cas/Core/Canonicalize.lean:64` `isCanon_canon`. |
| `T002` | **CONTRADICTED** | §2.4. `Cas/Backend/Canon.lean:376`. |
| `T003` | INHERITS (vacuous) | §3. |
| `T004` | INHERITS | `Cas/Schema/Declarations.lean` is a complete closed registry with total unique lookup: `:202` `DeclarationId.all_complete`, `:210` `ofWire_wire`, `:276` `General.all_complete`, `:288` `General.row_surjective`, `:297` `General.row_inj`, plus a `#guard` `Nodup` on the wire at `:207`. Also `Cas/Grammar/Sorts.lean:114` `Ty.ofTag_wireTag` and `Cas/Lang/RefusalMap.lean:192` `CasErrorTag.all_complete`. |
| `T005` | SIMULATES | Model: the defunctionalization itself. `Cas/Lang/Prog.lean:27` `Prog.vis` *has* the function field (`k : S.Ans op → Prog S A`); `PLine`/`PIn` (`Cas/Lang/Defun.lean:167-187`) has none. The theorem that makes the boundary load-bearing is `PLine.hashDetermined` (`Cas/Lang/Defun.lean:1496`), and its counter-witness — an operation on the far side — is exhibited at `Cas/Lang/Defun.lean:2190`. |
| `T006` | SPECIALIZES | Same idempotence family as `T001`. **What widens:** a `RawProgram` has eight tables, so `normalizeRaw` is a *composite* of normalizers. The estate proved that composites owe two more theorems: `Cas/Schema/Basis.lean:432` `canonValue_numNorm_comm` (the stages commute) and `:612` `normalizers_are_independent` (no stage does another's work). `T006` as one row carries neither. |
| `T007` | SIMULATES | No anchor: the estate's serializable carrier has *positional* operands (`PIn = lit \| ans i`), so alpha-equivalence is identity and the theorem never arose. Model: `Cas/Schema/Basis.lean:634` `toRepresentationJson_eq_iff_repNorm` — an IFF between projection-equality and normal-form equality with **no** WF premise, which is the shape `T002`+`T007` jointly want. |

### 4.2 Admission — `EC1-T010`–`T017`

| Row | Class | Anchor |
| --- | --- | --- |
| `T010` | SPECIALIZES | `Cas/Core/Admission.lean:60` `checkRefs_ok_iff : checkRefs σ rs = .ok () ↔ RefsOk σ rs` — soundness *and* completeness in one iff, plus `:108` `checkRefs_error_condemns` (a returned error's clause holds of the list). **What widens:** one WF clause becomes twelve, and the judgment goes from store-relative to program-relative. |
| `T011` | SPECIALIZES | `Cas/Core/Admission.lean:137` `checkRefs_complete`, `:156` `admitNode_complete`. **What widens:** as `T010`. Note the estate's completeness is existential in the error, deliberately. |
| `T012` | INHERITS | Contrapositive of `checkRefs_ok_iff` (`Cas/Core/Admission.lean:60`). **What widens:** `NonEmpty Diagnostic` vs one error — and that widening is where `T015` breaks (§2.1). |
| `T013` | SIMULATES | Model: `Cas/Lang/Defun.lean:998` `decodeProg_encodeProg` — the estate's only erase/recover round trip. It carries **two** premises, `hwf` and `hsep`, and `hsep`'s necessity is *exhibited* (`Cas/Lang/Defun.lean:1013-1038`), not asserted. `T013` should expect the same. |
| `T014` | INHERITS | `Cas/Lift/Decode.lean:422` `decodeLift_wf` — the door answers only well-formed lines. Same statement one level up. |
| `T015` | **CONTRADICTED** | §2.1. |
| `T016` | SIMULATES | Vacuous if `SynthAER` is a function (§3). The substantive model is the pair that pins a table map to exactly one function: `Cas/Schema/Declarations.lean:288` `General.row_surjective` + `:297` `General.row_inj`, or `Cas/Backend/Canon.lean:259/278/288` (PRESERVE-keys / last-wins / exact) which together *determine* `canonServices` uniquely. |
| `T017` | NO ANCHOR | Nothing in the corpus synthesizes an `A/E/R` triple. The nearest object is `PProg.envelope` (`Cas/Lang/Defun.lean:1205`) — a static summary computed from the table alone with a proved sandwich — but it is a MAY set, not an exact type, and the estate proved it over-approximates (`T086` below). |

### 4.3 Flow algebra — `EC1-T020`–`T028`

| Row | Class | Anchor |
| --- | --- | --- |
| `T020` | SPECIALIZES | Sequential half only: `Cas/Lang/Interp.lean:119` `step_preserves_wf`, `Cas/IR/Word.lean:238` `wf_snoc`, `Cas/IR/Join.lean:187` `wf_append`. `wf_scope`/`wf_par`/`wf_race` have no anchor. |
| `T021` | INHERITS | `pure_bind := fun _ _ => rfl` in the `LawfulMonad (Prog S)` instance, `Cas/Lang/Representation.lean:54-58`. **Caution:** at the *serializable* carrier the estate proved the analogous unit law FALSE — `Cas/Lang/Wp.lean:815` `falsifier_empty_prefix` ("the empty table is NOT a unit of composition, so no unconditional composition law is available"). The `close` unit must be a real code point, never the empty graph. |
| `T022` | INHERITS | `Cas/Lang/Representation.lean:39` `Prog.bind_pure_right`. Same caution. |
| `T023` | INHERITS | `Cas/Lang/Representation.lean:46` `Prog.bind_assoc'`. At the table carrier it SPECIALIZES to `Cas/Lang/Wp.lean:528` `wp_append`, which needs `pre ≠ []` *and* the threaded answer history — the latter proved necessary by `Cas/Lang/Wp.lean:798` `falsifier_append_needs_history`. |
| `T024` | INHERITS | `id_map` from `Prog.bind_pure_right` in the instance at `Cas/Lang/Representation.lean:54`; `:68` `interpret_id` for the composition half. |
| `T025` | NO ANCHOR | The estate has no `catch`. `CasE.fail` answers `Empty` (`Cas/Lang/Ops.lean:30`) so a refusal has no continuation *by type*, and `failWith` eliminates into it (`Cas/Lang/Ops.lean:55`). Nearest partial models: `Cas/Lang/RefusalMap.lean` (a closed refusal vocabulary with a declared unhandled row) and `Cas/Lang/Wp.lean:263` `wlp_of_refused`. |
| `T026` | NO ANCHOR | `Cas/Lang/Prog.lean:17` states outright: *"There is no loop primitive."* `Cas/Lang/Handler.lean:28-30` names ITrees' `MonadIter` obligation as arriving "exactly when F3 adds loops, and will be taken then, not smuggled now". Model for the approximation route: `Cas/Lang/Handler.lean:214` `run_of_interpretRef`, where the fuel is **produced** by induction rather than assumed. |
| `T027` | NO ANCHOR | See `T007`. |
| `T028` | SIMULATES | The estate's exact house move for order-blindness under a named premise: `Cas/IR/Query.lean:199` `run_perm` (needs `A.Comm`), `:207` `run_replay` (needs `A.Idem`), `:230` `run_redelivered` (needs both). And the falsifiers that keep the premise honest: `Cas/IR/View.lean:229` `lastK_not_comm` and `Cas/IR/Query.lean:509` `View.lastK_not_ofQuery` — an order-sensitive observation is provably outside the commutative class. |

### 4.4 Machine safety and the semantic triangle — `EC1-T030`–`T044`

| Row | Class | Anchor |
| --- | --- | --- |
| `T030` | SPECIALIZES | `Cas/IR/Word.lean:207` `wf_toStore_closed`, `:231` `Admitted.closed`, `Cas/Core/Store.lean:46` `empty_closed`. **What widens:** `Configuration` is a nine-field record; the estate's state is one `Word`. |
| `T031` | SPECIALIZES | `Cas/Lang/Interp.lean:119` `step_preserves_wf`, one case per operation. Notably it is re-proved *through delegation* at both signature extensions: `Cas/Lang/Roots.lean:94` `stepRooted_preserves_wf` and `Cas/Lang/Worded.lean:144` `stepWorded_preserves_wf`. **What widens:** `Step` is a relation with administrative rules; `step` is a total 4-case function. |
| `T032` | INHERITS (vacuous at the estate's carrier) | `step` is total, so progress is definitional. The substantive premise — handler completeness — anchors at `Cas/Backend/SumAlgebra.lean:212` `Handler.sum_unique`. |
| `T033` | INHERITS | `Cas/Lang/Handler.lean:131` `step_handle` is exactly "the executable step IS the relation's clause", as a per-operation equation. |
| `T034` | SPECIALIZES | `Cas/Lang/Handler.lean:214` `run_of_interpretRef`. **Read the triage note at `Cas/Lang/Handler.lean:114-128`:** the fuel had to be *produced* existentially "because `Prog`'s continuations are host functions: there is no structural measure to quantify over". The exact bound survives only on the defunctionalized fragment — `Cas/Lang/Defun.lean:362` `runP_embed_agree` at fuel exactly `p.length + 1`, proved tight by `Cas/Lang/Wp.lean:858` `falsifier_fuel_bound_is_tight`. |
| `T035` | INHERITS (vacuous) | §3. |
| `T036` | SPECIALIZES | `Cas/Lang/Handler.lean:165` `interpretRef_of_run_done` and `:189` `interpretRef_of_run_refused` — the soundness half, with **no** fuel bound (a halted run is right at every fuel). |
| `T037` | SPECIALIZES | `Cas/Lang/Handler.lean:255` `run_interpretRef_agree` — the iff, past a produced fuel. This is the estate's whole semantic triangle in one theorem, and it already carries the asymmetry `T042` will need: on refusal the two faces agree on the refusal and on *nothing else*, because `Except Refusal (A × Word)` has no word slot in its error branch. |
| `T038` | NO ANCHOR | And the corpus names the obstruction: `Cas/Lang/Handler.lean:124-127` — `Prog.vis` branches over `Addr32`, not a finite index. Model for a finite static object: `Cas/Lang/Defun.lean:1205` `PProg.envelope`. |
| `T039` | NO ANCHOR | Closest shape in the corpus is a truncation-coherence theorem at the word: `Cas/IR/View.lean:181` `lastK_lastK` (`j ≤ k → lastK j (lastK k l) = lastK j l`), with `:193` `lastK_idem`, `:213` `lastK_append`, `:221` `lastK_assoc`. That family is `truncate`'s law set, one carrier down. |
| `T040` | SIMULATES | `Cas/Lang/Defun.lean:1672` `runP_puts_sound` — the run's observations are a **`Sublist`** of the static prediction, never a prefix, and the estate exhibits why (`Cas/Lang/Defun.lean:2149`, GAP 2: a put that executes and appends nothing). Expect `observe r ∈ approx n c` to need the same weakening. |
| `T041` | NO ANCHOR | Model: `Cas/Lang/Handler.lean:255` `run_interpretRef_agree`. |
| `T042` | INHERITS (vacuous as written — the conclusion restates the hypothesis) | The estate's substantive version is `Cas/Lang/Representation.lean:80` `eq_of_forall_interpret`: agreement under **every** interpretation collapses to structural identity. The estate's finding about a mask that drops an observation is `Cas/Lang/Representation.lean:198` `ObsEq.run_refused` — "the partial words the two runs leave are unconstrained … this is the whole of what the observation says". |
| `T043` | INHERITS | `SemEq` (`Cas/Lang/Representation.lean:122`) is an equality of interpretations; `ObsEq` (`:134`) is a ∀-equality. Both are equivalences by construction. |
| `T044` | SPECIALIZES to a triviality at the CAS carrier | `Cas/Lang/Defun.lean:403` `runP_halts` and `Cas/Backend/Universal.lean:939` `runP_never_running` prove `Diverges` is uninhabited there. **Warning on the `Live` predicate:** `Cas/Lang/Interp.lean:53-58` says `.running` is "the only status a fuelled run reports that says nothing about the program", and `run H 0 p w = (.running p, w)` for *every* `p`. A `Live` that fires at depth 0 makes the ← direction trivially available to terminating configurations. |

### 4.5 Direct handlers — `EC1-T050`–`T055`

| Row | Class | Anchor |
| --- | --- | --- |
| `T050` | INHERITS | `Cas/Backend/Universal.lean:128` `Handler.ext` (handlers agreeing per operation are equal), `:502` `prog_is_free` / `:519` `existsUnique_handler` (exactly one handler induces a given morphism), and at the sum `Cas/Backend/SumAlgebra.lean:212` `Handler.sum_unique`. |
| `T051` | INHERITS by construction | `Handler.handle : (op : S.Op) → M (S.Ans op)` (`Cas/Lang/Handler.lean:43`) is *indexed*, so exit typing is a typing fact, not a theorem. The estate's worked instance is `referenceHandler` in `StateT Word (Except Refusal)` (`Cas/Lang/Handler.lean:78`). |
| `T052` | SPECIALIZES | `Cas/Lang/Defun.lean:1965` `runP_frame_sound` — FRAME-1, closed for every run *including refusing ones*. Also `Cas/Lang/Auth.lean:137` `proveHandler_store_agree`. **What widens:** `EqualOutside h.frame` needs a declared frame projection; the estate's frame is the whole word. |
| `T053` | NO ANCHOR | No `HandlerEnv`, no regions, no provision. Nearest: `Cas/Lang/Tower.lean:65` `Handler.through` with `Cas/Backend/Universal.lean:785` `through_monoid` — service composition is associative with `idHandler` as a two-sided unit, and `:739` `through_assoc` states it as a *category* across signatures. That is what `provide` composes in. |
| `T054` | NO ANCHOR | The estate's answer is representational, not a theorem: a resume is a positional index into an append-only history (`PIn.resolve`, `Cas/Lang/Defun.lean:199`), so double consumption is not spellable. If `EC1-D016 Resume` keeps that shape, `T054` is definitional; if it gains a token, it is new. |
| `T055` | INHERITS | `Cas/Lang/Handler.lean:53` `interpret_bind` — the monad-morphism law, one proof for every handler into every lawful target; re-proved at strictly weaker hypotheses as `Cas/Backend/Universal.lean:195` `interpret_bind_of_equations`. **CRITICAL CAUTION.** At a *fixed fuel* the estate proved there is no composition law at all: `Cas/Backend/Universal.lean:894` `run_has_no_composition_law` — *"No binary operation on run-results reproduces the run of a bind … That kills EVERY candidate composition law at once, for any monad structure whatsoever."* `T055` must be stated at the coherent family (`Denotation`), never at `execN n`. |

### 4.6 Scope, resource, cause — `EC1-T060`–`T067`

All eight are **NO ANCHOR**. The corpus has no scope, no finalizer, no
resource token, and no `Cause`. Pattern models, one per hazard:

- `T060 region_non_escape` → `Cas/IR/Reach.lean:416` `reach_acyclic`
  (acyclicity discharged from a decidable `wf` premise, with `:531`/`:535`
  `reachB_sound`/`reachB_complete` making it computable) and
  `Cas/Core/Store.lean:53` `Closed.not_referenced` (an unbound address is
  unreferenced — the estate's non-escape statement).
- `T061`/`T062`/`T063` (counting registrations and releases) →
  `Cas/Lang/Defun.lean:1672` `runP_puts_sound`, which counts operations
  against observations and concludes **`Sublist`**, plus the witness at
  `Cas/Lang/Defun.lean:2149` showing an operation that *executes and
  observes nothing*. That is precisely the hazard
  `release_exactly_once` faces, already exhibited one carrier down.
- `T064 release_lifo` → `Cas/IR/View.lean:163` `lastK_append_eq` /
  `:198`/`:204` `lastK_left`/`lastK_right` — the estate's stack-order
  algebra over an append-only history.
- `T066`/`T067` (cause discipline) → `Cas/Lang/RefusalMap.lean:252`
  `CasErrorTag.mapped_or_hostOnly` and `:265`
  `clause?_none_iff_hostOnly` — the "some cases are deliberately not
  handled here, and the omission is *declared* rather than left out"
  pattern, which is exactly what `typed_catch_only_fail` needs for
  defects and interruption.

The packet's own note on `T062` (release began once, scope remains
finalizing, no fabricated completion) matches the estate's discipline
exactly and should be kept.

### 4.7 Fibers, scheduling, cancellation — `EC1-T070`–`T079`

| Row | Class | Anchor |
| --- | --- | --- |
| `T070`–`T076`, `T079` | NO ANCHOR | Zero corpus coverage. `Cas/Lang/Handler.lean:16-19` is the only mention and it *disclaims*: "fibers, interruption, and the error channel are the target monad's contribution, never the language's". Adopting `EC1-D070` reverses a standing estate position; that reversal is a ruling, not an implementation step. |
| `T077` | INHERITS (vacuous) | §3. Substantive replay anchors: `Cas/Lang/Handler.lean:279` `replayHandler` (recorded word as oracle) and `Cas/Lang/Auth.lean:757` `whole_run_correctness`. |
| `T078` | SPECIALIZES | `Cas/Lang/Interp.lean:163` `run_preserves_wf` — an invariant preserved over every finite prefix, with no fairness premise anywhere in its statement or proof. That **is** `safety_no_fairness` at the estate's one invariant. |

### 4.8 Classifier — `EC1-T080`–`T088`

| Row | Class | Anchor |
| --- | --- | --- |
| `T080` | SIMULATES | `Cas/Lang/Wp.lean:308` `wp_mono` and `:316` `wlp_mono`. **Read the trap first:** `Cas/Lang/Wp.lean:773` `falsifier_wp_not_faithful` proves monotonicity alone carries no information about the postcondition — "a transformer inequality carries no information about `Q`". `T080` alone therefore admits a transfer function that discards everything. |
| `T081` | SIMULATES | The estate's three-way sandwich: `Cas/Lang/Defun.lean:1618` `runPFrom_puts_sound` (upper), `:1839` `runP_absent_sound` and `:1992`/`:2002` `runPFrom_load_absent`/`runPFrom_load_present` (lower), `:1332` `PProg.resolve_sound` (per-operand). |
| `T082` | NO ANCHOR | No loops, no SCC, no fixed-point solver in the corpus. |
| `T083`, `T085` | SPECIALIZES | The `T081` family is a complete may-analysis soundness proof for the one shipped domain. **What widens:** many domains, and cycles. |
| `T084` | NO ANCHOR | Model: `Cas/Core/Canonicalize.lean:171` `comp_preserves` and `:180` `refinedBy_comp` — composing two reductions preserves a declared observation, *given* a `Coherent` premise. Every `reduceProduct` lemma will owe that premise. |
| `T086` | SIMULATES, with a live warning | The estate made exactly this claim for its one classifier and it was **refuted**: `DESIGN.md` §3.1's "exact: `over = under = actual`" is killed by two witnesses at `Cas/Lang/Defun.lean:2135` (GAP 1 — the suffix after the first refusal) and `:2150` (GAP 2 — `put`'s duplicate outcome), recorded at `Cas/Lang/Fragments.lean:70-78`. Any field marked `exact` in `ClassProduct` owes those two witnesses' analogues before the mark is credible. |
| `T087` | NO ANCHOR | See `T017`. |
| `T088` | **CONTRADICTED** | §2.2. |

### 4.9 Foreign — `EC1-T090`–`T094`

| Row | Class | Anchor |
| --- | --- | --- |
| `T090` | INHERITS | `Cas/Schema/Declarations.lean:202/210/276/288/297` — the closed-registry pattern in full (complete, wire round trip, surjective onto the non-dedicated rows, injective, `Nodup` guarded). Plus `Cas/Backend/SumAlgebra.lean:562` `llmOracleHandler_unique`: for the estate's one live foreign atom, the registry entry is **forced**, not chosen — proved from single-operation programs alone (`:549` `llmOracleHandler_unique_one_program`). |
| `T091` | SIMULATES | `Cas/Lang/Defun.lean:1965` `runP_frame_sound`. The estate's live *violation* witness is at `Cas/Lang/Defun.lean:2190`: one program, one word, one `H`, two oracles, two answer histories — the frame breach a foreign atom must declare. |
| `T092` | SPECIALIZES | A complete codec law set already exists: `Cas/Lift/Decode.lean:513` `decodeLift_encodeLift`, `:619` `encodeLift_decodeLift` (exactness), `:633` `decodeLift_inj`, `:753` `decodeLiftBytes_encodeLiftBytes` (premise-free at the bytes, because `:723` `encodeLift_canonical` and `:737` `encodeLift_numNormal` discharge the canonicality side). At the node: `Cas/Codec/NodeCodec.lean:203` `parseNode_encodeNode`, `:221` `parseNode_exact`, `:268` `encodeNode_injOn`. **What widens:** nothing structural — a receipt codec is another instance. |
| `T093` | SIMULATES | `Cas/Lang/Handler.lean:279` `replayHandler`, and far stronger, the authenticated pair `Cas/Lang/Auth.lean:678` `whole_run_security` / `:757` `whole_run_correctness` — a receipt-replay theorem in which the failure branch *exhibits a hash collision* instead of assuming none. |
| `T094` | SIMULATES | `tools/TrustCensus.lean`'s `model-gated` stratum is precisely "conditional on a named conformance artifact per row", and `Cas/Backend/TreeProgCorrect.lean` LAW X is the executed-consequence shape. |

### 4.10 CAS sublanguage — `EC1-T100`–`T106`

| Row | Class | Anchor |
| --- | --- | --- |
| `T100` | **CONTRADICTED** | §2.3. |
| `T101` | SPECIALIZES | The literal shape already exists one carrier over: `Cas/Backend/Mcp.lean:436` `ofPProg_isSome` (the image is every well-formed table), `:446` `toPProg_ofPProg` (left inverse on the image), `:458` `run_ofPProg` (meaning transfers with the spelling). Reuse this triple rather than restating it. |
| `T102` | INHERITS | `Cas/Lang/Defun.lean:362` `runP_embed_agree`: `run H (p.length + 1) (embed p) w = runP H p w`. **The "specified exact fuel relation" is already determined**: `p.length + 1`, and it may not be rounded down — `Cas/Lang/Wp.lean:858` `falsifier_fuel_bound_is_tight` shows one line short leaves the run `.running`. |
| `T103` | INHERITS | `Cas/Lang/Defun.lean:419` `ObsEq_embed_of_runP` — `runP`-agreement at every word implies `ObsEq`. **But name the mask:** that theorem's own docstring says the gate "decides `ObsEq` by checking something strictly finer; the implication runs only in this direction", and `Cas/Lang/Representation.lean:198` `ObsEq.run_refused` is the exact shortfall. |
| `T104` | SPECIALIZES | `Cas/Lang/Defun.lean:998` `decodeProg_encodeProg`, `:1051` `runP_decodeProg_encodeProg`, `:1062` `ObsEq_decodeProg_encodeProg`, `:2114` `envelope_decodeProg_encodeProg`. All four carry `hwf` **and** `hsep` (the address function separates the table's lines), and `hsep`'s necessity is exhibited at `Cas/Lang/Defun.lean:1023`. The stop theorem inherits two premises the row does not carry, and one of them is about `H`. |
| `T105` | INHERITS | The envelope facts are `Cas/Lang/Defun.lean:1618/1839/1332/2101`; `:2114` transfers them across the store round trip ("a stored program's grant can be recomputed from the store alone"). |
| `T106` | SPECIALIZES, with an ambiguity the corpus already resolved | There are **two** candidate CAS observations in the corpus and they are provably different: `runP`'s `(status, word)`, which carries the partial word on refusal, and `interpretRef`/`ObsEq`'s `Except Refusal (A × Word)`, which does not. The divergence is stated at `Cas/Lang/Handler.lean:103-113` ("the divergence is in the TYPES, not in an accident of the clauses") and `Cas/Lang/Representation.lean:139-158`. "statusAndWordOnly" must say which. |

### 4.11 TypeScript target — `EC1-T110`–`T122`

| Row | Class | Anchor |
| --- | --- | --- |
| `T110` | INHERITS | `Cas/Lang/Defun.lean:871` `encodeProg_wf` — the lowered artifact admits for **every** address function, hash-lattice Level 0, no premise. |
| `T111` | NO ANCHOR | No `A/E/R`. The target's *spelling* of the triple is pinned though: `Cas/Backend/Target.lean:33-64` `EffectType.lower`/`LayerType.lower`/`CodecType.lower` with `elideTrailingNever`, held to seven `rfl` examples against verbatim lines of the pinned Effect sources. |
| `T112` | SPECIALIZES — and the estate's move is **stronger** | `Cas/Backend/TreeProgCorrect.lean:679` `embed_treeProg` is an **equality in `Prog CasSig Addr32`**, not a simulation: "LAW M — the emitted table IS the term's program … Equality in the carrier's own equality, not an observational one and not an agreement of runs." Because of that, `:706` `treeProg_run` is obtained by *rewriting*, not a second proof. Prove lowering as an equality wherever the target admits it; simulate only where it does not. |
| `T113` | NO ANCHOR | No administrative-step quotient anywhere. |
| `T114` | SPECIALIZES | `Cas/Backend/TreeProgCorrect.lean:751` `treeProg_Triple` and `:764` `treeProg_two_state`. The `Triple` docstring is the model for stating a mask honestly: it names outright what the theorem does **not** carry (the frame) and exhibits the program that would satisfy it while writing an unrelated binding. |
| `T115` | INHERITS (vacuous) | §3. The estate's substantive renderer laws: `Cas/Core/Canonicalize/Json.lean:266` `canonJson_preserves_renderCompact`, `:272` `renderCompact_eq_of_equiv`, and the counterweight `Cas/Values/JsonInj.lean:100` `renderPlain_not_injective`. |
| `T116` | SPECIALIZES | `Cas/Lift/Decode.lean:513` `decodeLift_encodeLift`. **What widens is a domain, and it widens the wrong way:** the estate's encoder is *partial* (`encodeLift : Lifted → Option Json.Value`), and `Cas/Lift/Decode.lean:317-320` rules that "`encodeLift l = none` IS '`l` is outside the decoder's domain'". `T116`'s unconditional `∀ t : TsCore` is not the shape the estate could prove; `Cas/Backend/EmitProg.lean:32-38` shows the emitter refusing rather than printing text no decoder reads back. |
| `T117` | INHERITS | `Cas/Lift/Decode.lean:619` `encodeLift_decodeLift` — exactness, the second half of the pair — with `:723`/`:737` supplying canonicality so `:753` is premise-free at the bytes. |
| `T118` | SIMULATES | `Cas/Lift/Decode.lean:288` `decodeLift` plus `Cas/Backend/EmitProg.lean:138` `treeLifted` are the estate's source↔graph relation, and `Cas/Lift/Decode.lean:94` states its honest scope: the round trip is "evidence that an emitted program runs", not a proof that it does. |
| `T119` | INHERITS | The estate already enforces trust-boundary factorization *mechanically*: `tools/Strata.lean` — "LOWER NEVER IMPORTS HIGHER", checked against the compiled environment because "a Lake lib boundary does not refuse an out-of-stratum import, so a violating module still builds green". Plus `tools/TrustCensus.lean`'s four ordered strata (`emitted` / `model-gated` / `tested` / `bare`), where a file lands in the first stratum that claims it. |
| `T120` | NO ANCHOR | Model: `Cas/Core/Canonicalize.lean:116` `eq_obs_of_equiv` (a canonicalizer preserving a declared observation) with `:180` `refinedBy_comp` for the two-pass idempotence the packet's code-action admission rule wants. |
| `T121`, `T122` | SIMULATES | `tools/Axioms.lean` is the model for a pinned-trust statement: the clean set is `propext`/`Classical.choice`/`Quot.sound`, and it refuses `ofReduceBool` **by name** as "a kernel-level trust of native evaluation". `Cas/Backend/HttpProfile.lean` is the model for a pinned host profile with its claims proved (`:391` `resourcePaths_prefix_free`, `:411` `resources_success_refusal_disjoint`, `:459` `coTenants_claim_no_resource`). |

---

## 5. Orphans — proved results the DAG does not route through

990 theorems in the corpus; 110 rows in the DAG. The list below is not
exhaustive — it is the results whose loss would be *silent*, i.e. the
new lane would re-derive a weaker version without noticing.

### 5.1 The authenticated-computation pair — `Cas/Lang/Auth.lean`

- `whole_run_security` (`Cas/Lang/Auth.lean:678`) — W-SEC, λ• Theorem 1
  in estate form at **hash-lattice Level 0**: no premise on `H` anywhere,
  and the failure branch *exhibits* a collision pair
  (`∃ bs bs', bs ≠ bs' ∧ H bs = H bs'`) rather than excluding one. It
  also carries ADSF's (Brun–Traytel, ITP 2019) correction to the
  published ADSG shape: the "consumed a prefix and did not halt"
  conjunct is stated **outside** the disjunction, holding in both
  branches.
- `whole_run_correctness` (`Cas/Lang/Auth.lean:757`) — W-COR, the
  soundness half.
- Supporting: `verify_load_or_collision` (`:245`),
  `referenceHandler_honest` (`:271`), `interpret_agree_or_collision`
  (`:608`).

**No `EC1-T*` row mentions authenticated computation, proof streams, a
verifier that holds no store, or a prover/verifier pair at all.** The
DAG's nearest rows are `T092`/`T093` (foreign receipts), which are
strictly weaker: a receipt round trip plus a replay equation, with no
adversary and no collision witness. Adopting them without routing
through `Auth.lean` re-derives a worse theorem and quietly drops the
Level-0 discipline.

### 5.2 Freeness, initiality, the pin, and the boundary — `Cas/Backend/Universal.lean`

- `prog_is_free` (`:502`) — every monad morphism out of `Prog S` is
  induced by **exactly one** handler; `interpret` is a bijection
  `Handler S M ≃ Mor(Prog S, M)`.
- `prog_is_initial_in_S_models` (`:566`) — the *other* quantifier order,
  in the category where it actually holds. The file records that an
  earlier draft called freeness "initiality" and that this was **false**
  (`Prog S` admits two distinct monad morphisms into `StateT Nat Id`).
- `interpret_pinned` (`:598`) — there is no wrong-but-passing
  interpreter — together with its honest scope,
  `interpret_pinned_is_vacuous_over_collapse` (`:640`) and
  `interpret_inhabits_the_pin` (`:615`).
- `through_monoid` (`:785`), `through_assoc` (`:739`),
  `through_id_left`/`through_id_right` (`:765`/`:757`) — the service
  tower is a monoid at one signature and a category across signatures.
- `run_has_no_composition_law` (`:894`) — the boundary theorem, and
  `run_composite_outruns_its_parts` (`:918`), **renamed** from a name
  that promised the law and delivered only the witness. That rename is
  the estate's naming discipline in one artifact.

`EC1-D042`/`D043` assume a handler algebra and `T050` proves one
uniqueness fact about it. Everything above is dropped.

### 5.3 The predicate-transformer layer — `Cas/Lang/Wp.lean`

`wp`/`wlp` (`:150`/`:154`), `Triple` (`:552`), `PartialTriple` (`:559`),
`Triple_iff_wp` (`:566`), `Triple_two_state` (`:588`),
`Triple_two_state_rel` (`:606`), `Triple_iff_interpretRef` (`:652`),
`wp_append` (`:528`), the lattice family (`wp_and`, `wp_meet`,
`wp_forall`, `wp_or`, `wp_bot`, `wlp_top`, `wp_iff_wlp_and_total`), the
*computable* transformer `wpB` with `wpB_iff_wp` (`:726`), and **seven
falsifiers** (`:773`–`:858`).

The DAG has **no specification language at all** — no way to state a
per-program contract, only `Denotation` and `SemEq`. Every `T080`–`T088`
claim would therefore be stated directly against the denotation,
re-deriving a weaker form of a landed program logic. Note also
`Cas/Backend/Universal.lean:833-842`, which records that `wp`/`wlp` are
CONTRAVARIANT and so lie outside the handler shape entirely — a fact
`EC1-D052`–`D054` would have to rediscover.

### 5.4 The hash-hypothesis lattice — `Cas/Core/Address.lean` + `Cas/Core/Canonicalize.lean`

`addr_eq_or_collision` (`Cas/Core/Address.lean:56`, Level 0),
`addr_inj` (`:69`, Level 1, under a named `hInj`), the **empty Level 2**
with its degenerate-`H` witness, and the generic form
`formAddress_congr`/`formAddress_eq_or_collision`/`formAddress_inj`
(`Cas/Core/Canonicalize.lean:200/208/219`).

`EC1-T100`–`T106`, `canonCas`, `canonCore` and `render` all depend on an
address function, and **not one row states which level of the lattice it
sits at**. The corpus has already located where the premise bites:
admission is Level 0 (`encodeProg_wf` needs nothing), *recovery* is not
(`decodeProg_encodeProg` needs `hsep`, proved necessary). A DAG that does
not carry the lattice will import `Function.Injective H` out of habit —
which `Cas/Lang/Defun.lean:928-945` explicitly warns against, since
`hsep` is strictly weaker and vacuous for tables under two lines.

### 5.5 The language-composition algebra — `Cas/Backend/SumAlgebra.lean` + the two live extensions

`Handler.sum_unique` (`:212`), `interpret_inl`/`interpret_inr`
(`:231`/`:239`), `Prog.inl_unique`/`Prog.inr_unique` (`:427`/`:460`),
`sum_inlHandler_inrHandler` (`:371`), `handleLlm_eq_interpret` (`:485`),
`handleLlm_bind` (`:581`), `llmOracleHandler_unique` (`:562`), and five
**adversaries** kept beside the theorems that kill them:
`swapSum_not_sum_handle_inl` (`:685`),
`badAgentSum_not_interpret_inr` (`:753`),
`doubleInl_not_interpret_inl` (`:790`),
`narrowing_to_Id_fails` (`:966`),
`badHandleLlm_not_interpret` (`:1016`).

With them, the two shipped signature extensions and their
non-disturbance theorems: `Cas/Lang/Roots.lean:85`
`stepRooted_cas_agrees`, `Cas/Lang/Worded.lean:134` `since_cas_agrees`,
`:110` `since_suffix`, `:163` `since_next`, `:176` `since_compose`.

`EC1-A06 Alphabet` is one closed table with **no composition operation**,
and the packet's only statement about growth is "adding an operation
changes the alphabet version and reopens all totality and code-generation
tables". The estate has instead proved that an extension arrives by
signature sum and leaves the core's laws intact. That is a strictly
better answer and the DAG has no row for it.

### 5.6 Also orphaned (one line each)

- `Cas/Lang/RefusalMap.lean` — the model↔host refusal correspondence:
  totality in **both** directions (`:245`, `:252`), disjointness
  (`:281`), `Nodup` on both wires (`:299`, `:303`), and a *declared*
  host-only row (`:265`, `:293`). Directly bears on `T015` and `T119`.
- `Cas/IR/Query.lean` + `Cas/IR/View.lean` — the query/aggregation face
  of the word: `run_perm`/`run_replay`/`run_redelivered` with their
  algebraic premises, `columnBy_eq_run` (`:388`), and the `lastK`
  falsifiers (`View.lean:229`, `Query.lean:509`). No `ObservationMask`
  row reaches it.
- `Cas/IR/Reach.lean` — decidable reachability (`reachB_iff`, `:541`),
  acyclicity under `wf` (`:416`), and the shadowing witness
  `occurrence_two_cycle` (`:212`). The `RegionsWF` acyclicity clause
  would re-derive it.
- `Cas/Schema/Basis.lean` + `Cas/Schema/PayloadInj.lean` — the
  normalizer census: independence (`:612`), commutation (`:432`), the
  redundancy census as an IFF (`:634`), *bloat = 1 with the collapse
  named* (`:645`, `:656`, `:676`), and `payload_inj_needs_wf` (`:305`).
- `Cas/Schema/El.lean:178` `El : Ast → Type` — the estate already has
  `EC1-D001`/`D002` (`ValueTy` and `Value : ValueTy → Type`) as a
  shipped closed universe plus its decoding function, with the
  uninhabited arms stated honestly (`El (.decl …) = Empty`) rather than
  faked.
- `tools/` — the shipped evidence plane that `EC1-D096` proposes to
  mint: `Law.lean` (ruling registry with UNBOUND rows), `Obl.lean`
  (obligation harvester), `Debts.lean` (debt projection, minting
  nothing), `Axioms.lean` (axiom gate), `TrustCensus.lean` (four
  strata), `Strata.lean` (import-order gate), `Verdicts.lean`
  (disagreement corpus with verdicts *computed* by executing the model),
  `Materialize.lean` (two independent generators, one denotation),
  `Walk.lean` (one total order for every ledger). `EC1-H03`/`H06`/`H09`/
  `H10` describe this plane's discipline as if it did not exist.

---

## 6. Two structural observations

**The DAG's own §16 prohibitions are already theorems in this repo.**
"Using successful examples as completeness" is refuted by
`checkRefs_complete`'s existential; "comparing only final return values"
by `ObsEq.run_refused`; "enumerating infinite answer types or calling a
sweep universal" by `run_of_interpretRef`'s produced fuel; "syntactic
rewriting across ordered traces" by `lastK_not_comm`; "conflating may
and must" by GAP 1 / GAP 2. Each prohibition should cite its witness.

**The corpus's naming discipline is load-bearing and the DAG lacks it.**
`run_composite_outruns_its_parts` (`Cas/Backend/Universal.lean:918`) was
renamed *because* the old name promised a law and delivered a witness;
`prog_is_free` was renamed *because* "initial" was false in the only
category the file's vocabulary named. Several `EC1-T*` names make the
same class of promise — `classify_sound`, `render_deterministic`,
`fixed_schedule_replay`, `injectCas_checked` — and at least four of them
(§2, §3) deliver less than the name.

---

## 7. Verification artifacts

Four Lean files, run against a warm cache with `lake env lean`, no
`sorryAx` in any of them:

| File | Proves | Axioms |
| --- | --- | --- |
| `check1.lean` | `EC1-T015` false for `Cas.checkRefs` | `[propext]` |
| `check2.lean` | `EC1-T088` false at the CAS carrier | `[propext]` |
| `check3.lean` | `EC1-D080`/`T100` unsatisfiable; `T003`/`T035`/`T115` vacuous | `[propext]` / none |
| `check4.lean` | `EC1-T002` forward direction false | `[propext, Classical.choice, Quot.sound]` |

Scratchpad:
`/private/tmp/claude-501/-Users-pooks-Dev-foldlab/6ab4497e-2c3d-4bbb-ab61-c68155162b2b/scratchpad/`

---

# 8. Delta pass — the packet grew to 110 rows

Second pass, same day. `PROOF-DAG.md` was edited concurrently with the
first pass, so this section records both revisions:

| | bytes | md5 | `^\| \`EC1-T` rows |
| --- | ---: | --- | ---: |
| revision classified in §1–§7 | 27 395 | `fc41e11b7288fe898fdeda7adccab8ba` | 97 |
| revision classified in §8 | 36 326 | `24d2d4138f2ae6ffd102bee77a49a9ae` | 110 |

The second revision's bytes and digest were taken **before and after**
this pass and are identical, so §8 classifies one stable revision.

**Delta arithmetic.** 110 − 97 = **13 genuinely new rows**: `T008`,
`T009`, `T045`, `T046`, `T056`, `T057`, `T068`, `T069`, `T107`, `T108`,
`T109`, `T123`, `T124`. No row was deleted or renumbered; one row was
**restated** (`T072` `join_exit` → `await_exit`, following the
`await`/`join` split added to `EC1-D028`), and two were reworded
(`T044` gained "live is neither Refusal nor Cause"; `T067` gained "every
unhandled branch is retained").

**On the coverage diff.** Seven of the twenty ids flagged missing —
`T064`, `T065`, `T071`, `T072`, `T073`, `T074`, `T075` — were classified
in the first pass but written as ranges (§4.6 "All eight are NO ANCHOR"
for `T060`–`T067`; §4.7's table row "`T070`–`T076`, `T079`"), which a
literal id match cannot see. They are re-spelled individually in §8.3 so
a later diff finds them. Their classification is unchanged.

## 8.1 The three rows that land on already-completed work

### `EC1-T124 cas_total_correctness_bridge` — INHERITS, verbatim

Row: `wp H p Q w <-> (wlp H p Q w and wp H p WPost.top w)`

This is `wp_iff_wlp_and_total` (`Cas/Lang/Wp.lean:380`) **character for
character**, down to the `WPost.top` spelling — not a change of variable,
not a specialization. The row is the theorem.

```lean
theorem T124_is_verbatim (p : PProg) (Q : WPost) (w : Word) :
    wp H p Q w ↔ (wlp H p Q w ∧ wp H p WPost.top w) :=
  wp_iff_wlp_and_total H p Q w
```
```
'Check6.T124_is_verbatim' depends on axioms: [propext]
```

The row's own note — "the second conjunct is totality; no new modality" —
is the estate's docstring at `Cas/Lang/Wp.lean:375-378` restated. The
packet has correctly identified that it owes nothing here.

### `EC1-T123 cas_partial_correctness_bridge` — INHERITS after one mechanical lemma

Row: `ModelsPartial (injectCas p) Q <-> wlp H p Q`

The corpus has `PartialTriple` (`Cas/Lang/Wp.lean:557`),
`PartialTriple_iff_wlp` (`:573`) — `wlp` against the **run** face — and
`wp_iff_interpretRef` (`:629`) / `Triple_iff_interpretRef` (`:652`) —
`wp` against the **big-step** face. It does **not** have the `wlp` twin
of the latter, and that is exactly what `injectCas` needs, because the
injection lands on the big-step side (`embed p`, then
`interpret (referenceHandler H)`).

The gap is one lemma and it is mechanical — proved here rather than
asserted:

```lean
theorem wlp_iff_interpretRef (p : PProg) (Q : WPost) (w : Word) :
    wlp H p Q w
      ↔ ∀ a w', interpretRef H (embed p) w = .ok (a, w') → Q a w'
```
```
'Check6.wlp_iff_interpretRef' depends on axioms: [propext]
'Check6.T123_shape'          depends on axioms: [propext]
```

`T123_shape` then reads `PartialTriple` off it in three lines, mirroring
`Triple_iff_interpretRef`'s own proof. **Recommendation:** land
`wlp_iff_interpretRef` in `Cas/Lang/Wp.lean` beside `wp_iff_interpretRef`
regardless of the Effect Core lane — it is a missing member of a
symmetric pair, and its absence is the only reason `T123` is not
verbatim.

### `EC1-T107 cas_refusal_map_reused` — INHERITS

Row: `casRefusalClass (injectCas p) = existing RefusalMap classification`,
constrained by `EXISTING-TYPES.md` row `EC1-XT015A` (*reuse*; "no
duplicate CAS refusal enum or hand-maintained mapping is permitted").

`Cas/Lang/RefusalMap.lean` already carries every fact this needs:
`Refusal.clause` is the forgetful map with `Refusal.clause_surjective`
(`:148`) proving no dead rows; `Refusal.Clause.all_complete` (`:120`);
`Refusal.ofAdmission_clause` (`:165`) pinning the two admission clauses;
totality in both directions (`:245` `hosts_ne_nil`, `:252`
`mapped_or_hostOnly`); injectivity where the map claims it (`:281`
`hosts_disjoint`); and the table/function agreement (`:356`
`RefusalMap.table_agrees`).

**One caveat the row should carry.** `RefusalMap.lean:181` declares
itself a **HAND MIRROR**: *"this module reads no TypeScript, so the only
thing keeping the two in step today is that they are written down beside
each other."* `T107` inherits that caveat; it is a reuse theorem about
the *model* side of the join, not evidence about the host side.

## 8.2 The remaining ten new rows

| Row | Class | Anchor |
| --- | --- | --- |
| `T008 surface_disposition_total` | INHERITS (vacuous) | `∃! d, disposition row = d` is satisfied by any total function — this is the fourth instance of the §3 pattern, joining `T003`/`T035`/`T115`. The substantive form is the *pair* that pins a table map to exactly one function: `Cas/Schema/Declarations.lean:288` `General.row_surjective` ("nothing non-dedicated is left out — so a new row that forgets its disposition fails to build") with `:281` `General.row_not_dedicated` and `:297` `General.row_inj`. That is a `SurfaceDisposition` totality gate already shipped, at a seven-row registry instead of a seven-value enum. |
| `T009 surface_mapping_closed` | SIMULATES | `Cas/Lang/RefusalMap.lean:252` `CasErrorTag.mapped_or_hostOnly` — *every* row is either the image of a mapping **or** on a declared unmapped list — with `:265` `clause?_none_iff_hostOnly` (the two halves do not overlap) and `:293` `hostOnly_unmapped` (the declaration is honest, not merely asserted). That triple is exactly "constructive mapping **or** boundary witness, and the boundary is declared". Also `tools/TrustCensus.lean`'s four ordered strata for the census shape, including its own honesty note ("a row is what the census can see"). |
| `T045 denotes_unique_given` | INHERITS | Already discharged in prototype: `.staging/effect-core-v1/workshop/exhibits.lean:352` `denotes_unique`, factoring through `:331` `coherent_le` and `:325` `coherent`. Kernel-checked (`[propext, Quot.sound]`); I recompiled the whole file green this pass. |
| `T046 cas_block_denotes_specializes` | INHERITS | `exhibits.lean:216` `inject_embed` — and note it is proved by `Prog.bind_pure_right` (`Cas/Lang/Representation.lean:39`), so the injection is **syntactic**: "agrees with the exhibited big-step chain" is an *equality of programs*, not an agreement of runs. `:223` `runCore_runP` and `:230` `inject_obsEq` carry it to the run and to `ObsEq`; `:352` `denotes_unique` supplies the uniqueness half. Same house move as `embed_treeProg` (§4.11 `T112`). |
| `T056 direct_handler_elaborates` | INHERITS | The existence claim is discharged **by construction** at `exhibits.lean` §6: `scopeHandler : Handler ScopeSig ScopeM` with `ScopeM := ReaderT (GProg × Nat) (Prog CasSig)`, over an ordinary `Sig` — no `HHandler`, no higher-order signature functor, `Cas/Lang/Sig.lean` untouched. The reason it works is the estate's own defunctionalization: a scoped child is a `BlockId`, first-order data, the same move `PIn.ans` already runs. `EC1-K16`'s morphism law is then free — the exhibit closes it with `interpret_bind` (`Cas/Lang/Handler.lean:53`) applied directly. *(Upgraded from the SIMULATES I would have assigned without reading the exhibit.)* |
| `T057 handler_tower_composes` | INHERITS | Both halves exist and both are exercised. **Sum:** `Handler.sum` (`Cas/Lang/Handler.lean:63`) with `Handler.sum_handle_inl`/`_inr` (`Cas/Backend/SumAlgebra.lean:196`/`:202`) and uniqueness `Handler.sum_unique` (`:212`). **Through:** `Handler.through` (`Cas/Lang/Tower.lean:65`), `interpret_through` (`:71`), and the composition laws `through_assoc` (`Cas/Backend/Universal.lean:739`), `through_id_right` (`:757`), `through_id_left` (`:765`), `through_monoid` (`:785`). The exhibit builds `scopedCasHandler := storeInScope.sum scopeHandler` and discharges the tower collapse with `interpret_through` verbatim. Note `SumAlgebra.lean`'s own record that `Handler.sum` had **zero** call sites before this; the scoped layer is its first consumer. |
| `T068 quotientCause_then_both` | INHERITS (definitional) — **with a missing half** | Transcribing `EC1-A39` from `ALGEBRA.md` §7, the `then` and `both` arms are *the same expression*, so the row is `rfl`. Verified: `Check7.T068_as_written` **depends on no axioms**. That makes the row a restatement of the definition, not a statement about lossiness. The estate's model theorem for a named collapse states **both** halves — `Cas/Schema/Basis.lean:645` `repNorm_the_one_collapse` proves the collapse *and* that the two collapsed inputs are distinct. `T068` should carry the same second conjunct; here it is, plus the stronger fact that the quotient also forgets reason multiplicity: `Check7.T068_missing_half` and `Check7.quotient_forgets_repetition`, both axiom-free. Without them, nothing in the DAG says `effectReasonQuotient` is lossy at all. |
| `T069 stock_cause_bridge` | SIMULATES | No corpus anchor — it is a G4 host-evidence claim about rc.112. The estate's one model↔host observation join is `Cas/Lang/RefusalMap.lean`, and its self-description is the pattern *and* the warning: a **hand mirror**, with the host tags carried verbatim (`:224` `CasErrorTag.wire`) and the unmapped row declared (`:238` `hostOnly`). `T069` needs the same declared-gap discipline, and the row's own "never full topology" clause is the right instinct. |
| `T108 cas_error_row_from_ops` | SPECIALIZES | The row forbids `PProg.envelope` as the source of `E`, which is correct — and the corpus already has the object it *should* use, one operation at a time. `Refusal.ofAdmission_clause` (`Cas/Lang/RefusalMap.lean:165`) is literally "the error row this operation can produce is this two-element list" (`Refusal.admissionClauses`, `:161`), and `Cas/Lang/Interp.lean:28-38` is the closed six-arm refusal family for `put`/`load`/`fail`. **What widens:** per-`OpDesc` rows and the row *union* across a graph — the corpus has the per-operation fact and no union. |
| `T109 cas_world_observation_scoped` | INHERITS | This row is §4.10's `T106` caveat promoted into the packet, and the corpus already proves both clauses. **"exact writes quantify over `H`":** `Cas/Lang/Defun.lean:871` `encodeProg_wf` holds at *every* `H` (Level 0), while `Cas/Backend/TreeProgCorrect.lean:706` `treeProg_run` needs `hInj` — the two levels of the CAS-003 lattice, already separated. **"refusal-word equality only when the mask exposes it":** `Cas/Lang/Representation.lean:198` `ObsEq.run_refused` is the exact statement of what the estate's mask does *not* carry, and `Cas/Lang/Defun.lean:419` `ObsEq_embed_of_runP`'s docstring records that the run gate decides `ObsEq` "by checking something strictly finer; the implication runs only in this direction". |

## 8.3 The seven range-covered rows, re-spelled

Unchanged from §4.6/§4.7; listed individually so an id-level diff finds them.

| Row | Class | Note |
| --- | --- | --- |
| `T064 release_lifo` | NO ANCHOR | Model: `Cas/IR/View.lean:163` `lastK_append_eq`, `:198`/`:204` `lastK_left`/`lastK_right` — stack-order algebra over an append-only history. |
| `T065 scope_waits_cleanup` | NO ANCHOR | No scope frames in the corpus. |
| `T071 scoped_children_closed` | NO ANCHOR | No fibers. |
| `T072 await_exit` | NO ANCHOR | **Restated this revision** (`join_exit` → `await_exit`, following `EC1-D028`'s `await`/`join` split). Classification unchanged. |
| `T073 mask_retains_pending` | NO ANCHOR | *mask* has zero occurrences in the corpus. |
| `T074 unmask_delivers` | NO ANCHOR | As `T073`. |
| `T075 race_losers_interrupted` | NO ANCHOR | Every *race* hit in the corpus is `trace`/`brace`. |

## 8.4 One revision to a first-pass classification

`EC1-T039 approx_coherent` was classified **NO ANCHOR** in §4.4, with
`lastK_lastK` named only as a shape model. That was correct against the
library corpus and is now understated: `exhibits.lean:325`/`:331`
`coherent`/`coherent_le` prove the coherence chain over the graph
carrier, kernel-checked, factoring through `interpret_bind`. **Two
things about it are findings, not transcription:**

1. The exhibit proves a **`Refines` chain**, not the
   `truncate m (prefix n) = prefix m` *equality* `EC1-A30` makes a field
   of `Denotation`. Those are different statements.
2. `exhibits.lean:~118` `exhausted_is_not_a_refusal` proves the equality
   version **false** if out-of-fuel shares a leaf with an ordinary
   refusal — a one-block counterexample, at every `H`, resting on
   `putWord_ne_failed` (`Cas/Lang/Defun.lean:1694`).

So `T039` moves **NO ANCHOR → SIMULATES**, and the packet owes the
`live`/`halt` leaf separation `EC1-A29` already promises. This is the
only first-pass classification that changes.

## 8.5 Restated counts

| Class | §1 (97 rows) | new (13) | revision (§8.4) | **§8 total (110)** |
| --- | ---: | ---: | ---: | ---: |
| INHERITS | 26 | +10 | — | **36** |
| SPECIALIZES | 21 | +1 | — | **22** |
| SIMULATES | 15 | +2 | +1 | **18** |
| **CONTRADICTED** | **4** | +0 | — | **4** |
| NO ANCHOR | 31 | +0 | −1 | **30** |
| **Total** | **97** | **+13** | **0** | **110** |

The four CONTRADICTED rows (§2) are untouched by the delta: `T002`,
`T015`, `T088`, `T100` are all present and unchanged at the new revision.

The **vacuous** list of §3 grows from three to four: `T003`, **`T008`**,
`T035`, `T115` — every one of them satisfied by an arbitrary total
function.

## 8.6 Orphan #3, restated

§5.3 said the DAG had **no specification language at all**. That is no
longer true and the entry is withdrawn in that form. `EC1-T123` and
`EC1-T124` name `wp`, `wlp`, `WPost.top` and partial-versus-total
correctness directly, `EXISTING-TYPES.md` row `EC1-XT021` marks
`WPre`/`WPost`/`wp`/`wlp`/`Triple`/`PartialTriple` **reuse** ("must
select and relate to these definitions rather than minting an
unconnected modality"), and `exhibits.lean` §1 settles which of the two
is the modality — `wlp_bot_derivable` versus `wp_bot_never` — before
concluding with `wp_is_modality_and_total`.

**What survives, narrowed.** The packet now routes through the *two
bridge equations* and nothing else. Still unrouted, and still liable to
silent re-derivation:

- the **structural** laws — `wp_append` (`Cas/Lang/Wp.lean:528`) with its
  side condition, `wp_append_le_total` (`:538`), `wp_mono`/`wlp_mono`
  (`:308`/`:316`);
- the **lattice** laws — `wp_and` (`:323`), `wp_meet` (`:333`),
  `wp_forall` (`:341`), `wp_or` (`:356`), `wp_bot` (`:364`), `wlp_top`
  (`:373`);
- the **two-state** forms `Triple_two_state` (`:588`) and
  `Triple_two_state_rel` (`:606`) — the estate's `old`, and the only
  form that carries a frame (see `treeProg_two_state`, §4.11 `T114`);
- the **computable** transformer `wpB` with `wpB_iff_wp` (`:726`), which
  is what makes a computed verdict a statement about `wp`;
- and all **seven falsifiers** (`:773`–`:858`), four of which bear
  directly on rows already in the DAG: `falsifier_wp_not_faithful` on
  `T080`, `falsifier_append_needs_history` and `falsifier_empty_prefix`
  on `T021`–`T023`, `falsifier_fuel_bound_is_tight` on `T102`.

Orphans #1, #2, #4 and #5 (§5.1, §5.2, §5.4, §5.5) are unchanged: the
delta adds no row touching authenticated computation, freeness or
initiality, the hash-hypothesis lattice, or the language-composition
adversaries. `T056`/`T057` do reach `Handler.sum`/`Handler.through`,
which narrows orphan #5's *tower* half — but not its uniqueness half
(`Prog.inl_unique`, `Prog.inr_unique`) and none of its five adversaries.

## 8.7 Verification artifacts, delta pass

| File | Proves | Axioms |
| --- | --- | --- |
| `check5.lean` | `T124` verbatim; `T123`'s missing `wlp_iff_interpretRef` bridge; `T123_shape` | `[propext]` |
| `check6.lean` | `T068` is `rfl`; its missing distinctness half; the quotient also forgets multiplicity | none |
| `workshop/exhibits.lean` | recompiled green this pass — 14 `#print axioms` lines, no `sorryAx` | `[propext]` / `[propext, Quot.sound]` |

Same scratchpad as §7. `exhibits.lean` runs from `library/cas` with
`lake env lean ../../.staging/effect-core-v1/workshop/exhibits.lean`.
