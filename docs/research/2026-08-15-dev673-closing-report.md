# DEV-673 closing report — the D85 confluence package, discharged

Branch: `agent/codex/DEV-673`. Series: `c13251e17` (freeze, codex) →
`7cba47f4c` (Rev re-pin, D86) → `e2f04034b` (semantics + proofs +
discharge) → gate hardening → this record. Implementation taken over
by Fable on operator authorization after codex paused on the blocking
finding; the finding, the ratification, and the repair are recorded in
[the spec review](2026-08-15-dev673-spec-review.md).

## Acceptance, item by item

- `bash verify/moves/run.sh` is green:
  `GATE: PASS (move-calculus proofs, axiom footprint, spec pin, orphan rule)`.
- Spec.lean sha256 pin verified by the gate. Pinned value:
  `36c3203e3e6edbcc15f7561ab91d1e2d0b03cf40bf6e23a8f9c58e47be2b5b43`.
- Roster count: **39** axiom reports, every one exactly
  `{propext, Classical.choice, Quot.sound}` (several `decide`-based
  witnesses report no axioms at all, which the gate accepts as a
  subset). All fourteen `spec_*` obligations are rostered, plus
  `spec_discharged` itself and the confluence core
  (`runRepairK_perm`, `runRepairK_fill_pair`).
- Widened greps active and demonstrated red once each: a planted
  `exact sorry` failed the gate at the source guard; a planted
  `private axiom` failed at the axiom guard; a planted unrostered
  public theorem (`orphan_probe`) failed at the orphan rule. Each was
  reverted and the clean run re-passed.
- Orphan rule enforced: roster ∪ `gate-exclusions.txt` covers all 115
  public theorems; 76 exclusions each carry a one-line reason.
- All three mutants proved killed. The pre-D85 chain is frozen
  verbatim in Spec.lean (`legacyRepair`/`legacyRepairK`/
  `legacyRunRepairK`) so the kill theorems mean something:
  `spec_mutant_legacy_killed_by_L1` (the three-fill bag loses
  `(30, x)`), `spec_mutant_legacy_killed_by_L2` (kernel-checked
  non-confluence on a fill-only permutation),
  `spec_mutant_refuseAll_killed`.
- `decided_stable` (legacy, step-level) present, unchanged, rostered.
- **Immutability statement: no commit in this series modified
  Spec.lean or its pin after the Rev commit.** Verified:
  `git log --follow -- verify/moves/Moves/Spec.lean` lists exactly
  `c13251e17` and `7cba47f4c`; `git log -S` on the pinned hash lists
  exactly `7cba47f4c` (the gate-hardening rewrite of run.sh carried
  the pin byte-identically); the working-tree file hashes to the pin.

## The one Rev re-pin (D86)

The frozen `D85Refusal` dispute clause made L2 and L5 jointly
unsatisfiable: an empty dispute offer was refused at an open hole but
admitted at a filled one, so a two-move permutation changed terminal
meaning — found independently by codex (kernel-checked, Lean 4.33.0)
and by the Rev review's probe, and forced by L5's iff. The operator
ratified the amendment: the dispute refusal test is `cs = ∅` on the
offer, so an empty offer refuses at every state and refusal is a
function of the move and the meaning fold alone. `FillDisputeOnly` and
every law text are unchanged; the D85 absorb ratification and the D86
amendment are recorded under the DEV-673 heading in
`proto/DECISIONS.md` (numbers task-local until merge).

## Scope disposition

1. Fill-on-disputed absorbs via the canonical dispute-merge step. Done
   (`repair`, disputed branch).
2. Fill-on-filled-same-value journals the confirming pair; meaning
   unchanged. Done — MOVES-5 closed, witnessed by
   `spec_witness_confirm_recorded`.
3. Fill-on-decided leaves the tombstone and appends the ghost receipt;
   fills never refuse. Done; `decided_stable` survives verbatim and
   `spec_decided_stable_total` covers the total runner.
4. `runK`, `no_lossK`, `no_lossK_admitted` deleted in favor of the
   spec laws; the pre-D85 vacuity control retired with them (its
   subject matter lives on as the frozen mutant kills and W1).
5. Record hygiene: MOVES-1 header now reads closed-at-the-model-layer
   with the wall half pending; MOVES-5 disposition appended, not
   rewritten; README results table regenerated to the post-D85
   roster; VERIFICATION.md bounds restate the deliberate residual —
   decide-bearing bags are order-sensitive by design, decide enters
   only through the fence at close.

## The mathematics that landed

The proof architecture is the one the spec review predicted: L2 and L3
are projections of one theorem. Every wire move (fill or dispute) is a
local update on its hole's (meaning, journal) cell
(`repair_fill_eq_local`, `repair_dispute_eq_local`, `repairK_cell`);
two wire moves commute on a cell unconditionally — no well-formedness
premise — because refusals are identities and admissions are
semilattice joins (`cellApply_comm`); state-level commutation follows
same-hole via the cell diamond and cross-hole via the put frame
algebra (`repairK_comm`); and induction over `List.Perm` gives
`runRepairK_perm`: the terminal state, meaning and journal both, is a
function of the bag, not the schedule. Strong no-loss is the
composition of fill totality (`repair_fill_total`), the pair journal
(`repair_fill_records_pair`, all five hole states), and journal
monotonicity. The empty-dispute amendment is exactly what makes the
cell diamond unconditional: the only move whose admission depended on
state it did not join with is now refused everywhere.

## What remains before merge

Per the anti-gaming protocol, the closing commit needs the independent
Rev re-review (statement fidelity, mechanical, math — three lenses)
before merge, and merge to `main` is the coordinator's act. This
report was written by the implementing seat; it is evidence for that
review, not a substitute. Companions unblocked: DEV-674 (daemon
absorbs D85 on the wire; the no-self-revision refusal becomes a named
Divergence) and DEV-670 (the wall generates against post-D85
semantics with a smaller Divergence enum).
