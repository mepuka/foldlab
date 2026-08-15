# D85 absorb semantics: the confluence package, under a frozen spec

Issue: DEV-673 (slice stage 2, parent DEV-664; the frozen spec block
in this body is the tamper-proof anchor — the board is not the Eng
seat's to edit)

## Why now

Ratified by the operator 2026-08-15 (Branch A, after the DEV-671
three-lens review): a fill arriving at a disputed hole ABSORBS into
the candidate set; a fill arriving after `decided` appends to ghost
evidence with a refusal-style receipt; a confirming same-value refill
records the confirming holder's pair (closing MOVES-5). With those
changes the estate's actual thesis — terminal semantic state is a
function of WHAT was said, never WHEN — becomes a theorem package
instead of an aspiration: strong no-loss with no escape hatch, full
meaning/evidence confluence over the wire fragment, schedule-free
fences, and a complete refusal characterization. Record the
ratification as the next D-number (expected D85) per the
proto/DECISIONS.md numbering rule: decided / alternatives
(round-freeze: disputes frozen at two, order-dependence within
rounds) / why (order-dependence is time leaking into meaning; the
pair-set is already a proved semilattice) / load-bearing: yes.

Base: branch `agent/codex/DEV-671` (the total-runner machinery is
the foundation). This issue SUPERSEDES the DEV-671 repair list where
applicable: `no_lossK` is replaced by `spec_no_loss_strong` (the Q1
rename is moot); the non-confluence disclosure becomes the
legacy-mutant controls below (Q2 answered by changing the semantics);
merge to main happens only after this issue passes Rev re-review
(Q3). Record-hygiene items from the Rev report carry into scope.

## The anti-gaming protocol (read first; it governs everything below)

1. **`verify/moves/Moves/Spec.lean` is the frozen spec, and THIS
   ISSUE BODY is its authority.** Preferred: the Rev seat commits it
   first. If work begins before that commit exists, the implementer's
   FIRST commit creates Spec.lean as an exact transcription of this
   ticket's spec block — statements as `Prop`-valued definitions
   (`def SpecL1 : Prop := ∀ …`) so the file elaborates before the
   proofs exist, plus one discharge theorem in a SEPARATE
   implementer-owned file (`Moves/SpecDischarge.lean`:
   `theorem spec_discharged : SpecL1 ∧ SpecL2 ∧ … := ⟨…⟩`) that goes
   red-to-green as the work lands. The first commit also pins
   Spec.lean's sha256 in `run.sh` (`expected_spec_sha256=…`;
   mismatch = GATE: FAIL "Spec.lean is frozen; changes require a Rev
   re-pin"). After that first commit, NO commit may touch Spec.lean
   or the pin; Rev verifies (a) byte-fidelity of Spec.lean against
   this issue body (meaning-preserving elaboration fixes are
   reported as blockers per AGENTS.md — an executor never edits the
   spec it builds against — and applied only by Rev with a re-pin
   noted on the issue), and (b) immutability via
   `git log --follow -- verify/moves/Moves/Spec.lean`.
2. Every `spec_*` obligation in Spec.lean is discharged ONLY by
   `:= <implementation theorem>` / `:= by exact …` referencing
   Model.lean/Violations.lean names. The implementer never edits
   Spec.lean or the pin. Any commit touching either fails the gate
   and the review.
3. Acceptance is measured against the ISSUE BODY's spec block: Rev
   re-diffs the committed Spec.lean against this ticket
   (meaning-preserving elaboration fixes by Rev only, re-pinned and
   noted in a comment).
4. Every law ships with a mutant that must PROVABLY fail it (frozen
   below). A spec no mutant can fail is vacuous; here that is
   checked, not asserted.
5. Gate widenings land in the same commit series: the `sorry` grep
   also matches `exact sorry` / `sorry` anywhere; the `axiom` grep
   also matches `private axiom` and mid-line declarations; every new
   public theorem is rostered or listed in a committed exclusions
   file with a one-line reason (kills the orphan hole).
6. Rev re-review (statement fidelity + mechanical + math) runs on
   the closing commit before any merge.

## Scope — semantics (Model.lean, on top of DEV-671's machinery)

1. `repair` fill-on-disputed: `.fill h v actor` at
   `disputed cs` → the dispute-merge step with `cs ∪ {(v, actor)}`
   (the same canonical-repair move already used for conflicting
   fills). Fills from ANY seat absorb; seat governance stays a
   protocol-layer concern (see companion daemon issue).
2. `repair` fill-on-filled-same-value: state's meaning unchanged,
   evidence gains `(v, actor)` — the MOVES-5 closure.
3. `repair` fill-on-decided: meaning untouched (decided remains a
   tombstone; `decided_stable` must survive verbatim), evidence
   gains `(v, actor)`, observation records the receipt per the
   frozen `D85Refusal`/L5 discipline (fills never refuse; the
   receipt semantics is the admitted evidence-append).
4. Delete `runK` (inert; the runner is `runRepairK`) and delete
   `no_lossK`/`no_lossK_admitted` in favor of the spec laws — or
   keep them only if rostered and restated as corollaries.
5. Record hygiene (from the Rev report): MOVES-1 header "closed at
   the model layer; wall half pending"; MOVES-5 disposition "closed
   by D85"; audit records appended-to, never rewritten; README
   results table regenerated to the post-D85 roster; VERIFICATION.md
   bounds restate what remains partial (decide-bearing bags are
   order-sensitive by design — decide enters only through the fence
   at close).

## The frozen spec (verbatim basis for Spec.lean)

> Rev re-pin, 2026-08-15: the original `D85Refusal` dispute clause
> (`priorCandidates s h ∪ cs = ∅`) made L2 and L5 jointly
> unsatisfiable — an empty dispute was refused at an open hole but
> admitted at a filled one, so a kernel-checked two-move permutation
> changed terminal meaning (found independently by the implementer and
> the Rev review; see
> docs/research/2026-08-15-dev673-spec-review.md). The operator
> ratified the amendment: an empty dispute offer is refused at every
> state. The clause is now `cs = ∅`; `FillDisputeOnly` and every law
> are unchanged. New Spec.lean sha256 pinned in run.sh with this note.

Preamble: Model.lean's section variables and instances; a concrete
`SpecCarrier` instantiation defined IN Spec.lean (two holes `Fin 2`,
three holders, `Nat` values, lex pair comparator with its proved
`LawfulEqCmp`) for the witness/mutant statements; frozen definitions:

```
/-- Wire-fragment bags: no decide moves (decide enters only via the fence at close). -/
def FillDisputeOnly (l : List Mv) : Prop := ∀ m ∈ l, ∀ h v, m ≠ Move.decide h v

/-- The complete enumeration of lawful refusal under D85 as amended: fills
never refuse, and an empty dispute offer is refused at every state, so
refusal is a function of the move and the meaning fold alone. -/
def D85Refusal (s : State) : Mv → Prop
  | .fill _ _ _     => False
  | .dispute h cs _ => (∃ v, s.holes h = .decided v) ∨ cs = ∅
  | .decide h v     =>
      match s.holes h with
      | .disputed cs => ¬ ValueAppears cs v
      | _            => True
```

The laws (each `spec_*` discharged only by reference):

```
-- L1 STRONG NO-LOSS — no disjunct, no escape hatch.
theorem spec_no_loss_strong (intents : List Mv) (h : HoleId) (v : Value) (actor : Holder)
    (hmem : (.fill h v actor : Mv) ∈ intents) :
    ((v, actor) : Candidate Value Holder) ∈ (runRepairK initial intents).1.evidence h

-- L2 MEANING CONFLUENCE over the wire fragment.
theorem spec_meaning_confluent {l₁ l₂ : List Mv} (hperm : l₁.Perm l₂)
    (hfd : FillDisputeOnly l₁) :
    MeaningEq (runRepairK initial l₁).1 (runRepairK initial l₂).1

-- L3 EVIDENCE CONFLUENCE over the wire fragment.
theorem spec_evidence_confluent {l₁ l₂ : List Mv} (hperm : l₁.Perm l₂)
    (hfd : FillDisputeOnly l₁) (h : HoleId) :
    (runRepairK initial l₁).1.evidence h = (runRepairK initial l₂).1.evidence h

-- L4 SCHEDULE-FREE CLOSE: any sound fence chooses identically across permutations.
theorem spec_fence_schedule_free (f : FenceRule Holder Value candidateCmp)
    {l₁ l₂ : List Mv} (hperm : l₁.Perm l₂) (hfd : FillDisputeOnly l₁) (h : HoleId)
    (cs₁ cs₂) (h₁ : (runRepairK initial l₁).1.holes h = .disputed cs₁)
    (h₂ : (runRepairK initial l₂).1.holes h = .disputed cs₂)
    (hne₁ : cs₁ ≠ ∅) (hne₂ : cs₂ ≠ ∅) :
    f.choose cs₁ hne₁ = f.choose cs₂ hne₂

-- L5 REFUSAL CHARACTERIZED, per step, as an iff.
theorem spec_refusal_iff (s : State) (m : Mv) :
    (repairK s m).2 = false ↔ D85Refusal s m

-- L6 OBSERVATION ALIGNMENT (D79 becomes a theorem).
theorem spec_alignment (s : State) (l : List Mv) :
    (runRepairK s l).2.map Prod.fst = l

-- L7 AGREEMENT, both directions (the runner is pinned to the calculus).
theorem spec_repairK_iff_admitted (s s' : State) (m : Mv) :
    repairK s m = (s', true) ↔ repair s m = some s'

-- L8 SAFETY SURVIVES TOTALIZATION.
theorem spec_runRepairK_preserves_wf (l : List Mv) : WF (runRepairK initial l).1
theorem spec_decided_stable_total (s : State) (m : Mv) (h : HoleId) (v : Value)
    (hdec : s.holes h = .decided v) : (repairK s m).1.holes h = .decided v
```

Mutant-killers (over `SpecCarrier`; `legacyRunRepairK` is the
pre-D85 runner kept verbatim as the canonical mutant; `refuseAll`
maps every move to `(s, false)`):

```
-- M1 the old semantics is killed by L1 (the three-fill bag loses value 30).
theorem spec_mutant_legacy_killed_by_L1 : ∃ intents h v actor,
    (.fill h v actor : Mv) ∈ intents ∧
    ((v, actor)) ∉ (legacyRunRepairK initial intents).1.evidence h

-- M2 the old semantics is killed by L2 (kernel-checked non-confluence, from the review probes).
theorem spec_mutant_legacy_killed_by_L2 : ∃ l₁ l₂,
    l₁.Perm l₂ ∧ FillDisputeOnly l₁ ∧
    ¬ MeaningEq (legacyRunRepairK initial l₁).1 (legacyRunRepairK initial l₂).1

-- M3 refuse-everything is killed by L5.
theorem spec_mutant_refuseAll_killed : ∃ s m,
    ¬ ((refuseAll s m).2 = false ↔ D85Refusal s m)
```

Pinned executable witnesses (literal expected values; these caught
definition drift in review where statement gates could not):

```
-- W1 the three-fill bag under D85: all admitted; the third pair is journaled.
theorem spec_witness_three_fill :
    (runRepairK initial specBag).2.map Prod.snd = [true, true, true] ∧
    ((30, x)) ∈ (runRepairK initial specBag).1.evidence h0

-- W2 MOVES-5 closed: a confirming refill records the second holder.
theorem spec_witness_confirm_recorded :
    ((10, b)) ∈ (runRepairK initial [.fill h0 10 a, .fill h0 10 b]).1.evidence h0
```

## Acceptance (mechanical)

- `bash verify/moves/run.sh` green with: the Spec.lean sha256 pin
  verified; every `spec_*` name rostered with footprint exactly
  `{propext, Classical.choice, Quot.sound}`; widened greps active
  (demonstrated once each: planted `exact sorry` and `private axiom`
  go red); the orphan rule enforced (roster ∪ exclusions covers all
  public theorems).
- Spec.lean byte-faithful to this ticket (Rev diff; only
  Rev-committed elaboration fixes, each noted on the issue).
- All three mutants proved killed; `legacyRunRepairK` retained
  verbatim so the kill theorems mean something.
- `decided_stable` (legacy) still present, unchanged, rostered.
- Closing report includes: the sha256 of Spec.lean, the roster
  count, and the statement "no commit in this series modified
  Spec.lean or its pin after the Rev commit" — verified by Rev from
  `git log --follow`.
- Rev re-review (three lenses) passes before merge; merge to `main`
  is the coordinator's act.

## Out of scope

The daemon change (companion issue: fill-on-disputed appends the
candidate; fill-on-decided appends evidence; the daemon's
no-self-revision refusal stays and becomes a NAMED Divergence in the
DEV-670 wall mapping). The wall itself (staged after; its corpus
generates against post-D85 semantics, and its Divergence enum
shrinks accordingly). Any change to fence rules or close semantics.

## Pointers

`docs/research/2026-08-15-dev671-review.md` (the three-lens report
this supersedes the repair list of); the review's kernel-checked
probes (basis for M2); `docs/research/2026-08-15-sota-ranked-recommendation.md`
(why the spec-freeze pattern); `verify/moves/Moves/Model.lean` on
`agent/codex/DEV-671`; proto/DECISIONS.md numbering rule.
