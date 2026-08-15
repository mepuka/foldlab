import Moves.Spec

namespace Moves

universe uH uA uV

variable {HoleId : Type uH} {Holder : Type uA} {Value : Type uV}
variable {candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering}
variable [DecidableEq HoleId] [DecidableEq Value]
variable [Std.TransCmp candidateCmp] [Std.LawfulEqCmp candidateCmp]

/-
This implementer-owned theorem is intentionally red in the frozen-spec commit.
Each field goes green only by exact reference to a theorem proved in
Model.lean or Violations.lean.
-/
theorem spec_discharged :
    SpecL1 (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL2 (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL3 (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL4 (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL5 (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL6 (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL7 (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL8WF (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecL8Stable (HoleId := HoleId) (Holder := Holder) (Value := Value)
        (candidateCmp := candidateCmp) ∧
      SpecM1 ∧ SpecM2 ∧ SpecM3 ∧ SpecW1 ∧ SpecW2 := by
  exact ⟨spec_no_loss_strong, spec_meaning_confluent, spec_evidence_confluent,
    spec_fence_schedule_free, spec_refusal_iff, spec_alignment,
    spec_repairK_iff_admitted, spec_runRepairK_preserves_wf,
    spec_decided_stable_total, spec_mutant_legacy_killed_by_L1,
    spec_mutant_legacy_killed_by_L2, spec_mutant_refuseAll_killed,
    spec_witness_three_fill, spec_witness_confirm_recorded⟩

end Moves
