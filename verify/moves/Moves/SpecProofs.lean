/-
Implementer-owned discharge lemmas for the frozen DEV-673 specification.
Every `spec_*` name proves the corresponding frozen `Prop` in Spec.lean by
reference to Model.lean theorems; the concrete mutant and witness claims
evaluate over the frozen `SpecCarrier`.
-/
import Moves.Spec

namespace Moves

universe uH uA uV

section SpecProofs

variable {HoleId : Type uH} {Holder : Type uA} {Value : Type uV}
variable {valueCmp : Value → Value → Ordering}
variable {candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering}
variable [FiniteCarrier HoleId] [DecidableEq HoleId]
variable [DecidableEq Holder] [DecidableEq Value]
variable [Std.TransCmp valueCmp] [Std.LawfulEqCmp valueCmp]
variable [Std.TransCmp candidateCmp] [Std.LawfulEqCmp candidateCmp]

theorem spec_no_loss_strong :
    SpecL1 (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) :=
  fun intents h v actor hmem =>
    runRepairK_fill_pair intents initial initial_wf h v actor hmem

theorem spec_meaning_confluent :
    SpecL2 (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) := by
  intro l₁ l₂ hperm hfd
  show (runRepairK initial l₁).1.holes = (runRepairK initial l₂).1.holes
  rw [runRepairK_perm hperm (fun m hm => wireMove_of_not_decide (hfd m hm))
    initial]

theorem spec_evidence_confluent :
    SpecL3 (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) := by
  intro l₁ l₂ hperm hfd h
  rw [runRepairK_perm hperm (fun m hm => wireMove_of_not_decide (hfd m hm))
    initial]

theorem spec_fence_schedule_free :
    SpecL4 (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) := by
  intro f l₁ l₂ hperm hfd h cs₁ cs₂ h₁ h₂ hne₁ hne₂
  have hstate := runRepairK_perm hperm
    (fun m hm => wireMove_of_not_decide (hfd m hm)) initial
  rw [hstate, h₂] at h₁
  injection h₁ with hcs
  subst hcs
  rfl

theorem spec_refusal_iff :
    SpecL5 (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) := by
  intro s m
  rw [repairK_false_iff]
  cases m with
  | fill h v actor =>
    simp only [D85Refusal]
    exact iff_of_false (repair_fill_ne_none s h v actor) not_false
  | dispute h cs actor =>
    simp only [D85Refusal]
    exact repair_dispute_none_iff s h cs actor
  | decide h v =>
    simp only [D85Refusal]
    exact repair_decide_none_iff s h v

theorem spec_alignment :
    SpecL6 (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) :=
  fun s l => runRepairK_alignment s l

theorem spec_repairK_iff_admitted :
    SpecL7 (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) :=
  fun s s' m => repairK_iff_admitted s s' m

theorem spec_runRepairK_preserves_wf :
    SpecL8WF (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) :=
  fun l => runRepairK_preserves_wf l initial initial_wf

theorem spec_decided_stable_total :
    SpecL8Stable (HoleId := HoleId) (Holder := Holder) (Value := Value)
      (candidateCmp := candidateCmp) :=
  fun s m h v hdec => repairK_decided_stable s m h v hdec

end SpecProofs

/-! ## Mutant kills and pinned witnesses over the frozen carrier -/

theorem spec_mutant_legacy_killed_by_L1 : SpecM1 := by
  refine ⟨SpecCarrier.specBag, SpecCarrier.h0, 30, SpecCarrier.x,
    List.mem_cons_of_mem _ (List.mem_cons_of_mem _ List.mem_cons_self), ?_⟩
  decide

theorem spec_mutant_legacy_killed_by_L2 : SpecM2 := by
  refine ⟨[.fill SpecCarrier.h0 10 SpecCarrier.a,
           .fill SpecCarrier.h0 20 SpecCarrier.b,
           .fill SpecCarrier.h0 30 SpecCarrier.x],
          [.fill SpecCarrier.h0 10 SpecCarrier.a,
           .fill SpecCarrier.h0 30 SpecCarrier.x,
           .fill SpecCarrier.h0 20 SpecCarrier.b], ?_, ?_, ?_⟩
  · exact List.Perm.cons _ (List.Perm.swap _ _ _)
  · intro m hm h v
    simp only [List.mem_cons, List.not_mem_nil, or_false] at hm
    rcases hm with rfl | rfl | rfl <;> simp
  · intro hme
    have hh :
        (SpecCarrier.legacyRunRepairK initial
          [.fill SpecCarrier.h0 10 SpecCarrier.a,
           .fill SpecCarrier.h0 20 SpecCarrier.b,
           .fill SpecCarrier.h0 30 SpecCarrier.x]).1.holes SpecCarrier.h0 =
        (SpecCarrier.legacyRunRepairK initial
          [.fill SpecCarrier.h0 10 SpecCarrier.a,
           .fill SpecCarrier.h0 30 SpecCarrier.x,
           .fill SpecCarrier.h0 20 SpecCarrier.b]).1.holes SpecCarrier.h0 :=
      congrFun hme SpecCarrier.h0
    have hobs := congrArg
      (fun hs : HoleState SpecCarrier.Holder SpecCarrier.Value compare =>
        match hs with
        | .disputed cs => decide ((20, SpecCarrier.b) ∈ cs)
        | _ => false) hh
    exact absurd hobs (by decide)

theorem spec_mutant_refuseAll_killed : SpecM3 := by
  refine ⟨initial, .fill SpecCarrier.h0 0 SpecCarrier.a, ?_⟩
  intro hiff
  exact hiff.mp rfl

theorem spec_witness_three_fill : SpecW1 := by
  constructor
  · decide
  · decide

theorem spec_witness_confirm_recorded : SpecW2 := by
  unfold SpecW2
  decide

end Moves
