/- Proof-bearing negative controls, separated from the mutant definitions. -/
import Fabric.Proofs
import Fabric.Mutants

namespace Fabric

/-- The multiplicity cell retains the associative part of the shipped merge. -/
theorem drop_idempotence_keeps_associativity
    (left middle right : Mutants.MultiplicityCell) :
    Mutants.multiplicityMerge (Mutants.multiplicityMerge left middle) right =
      Mutants.multiplicityMerge left (Mutants.multiplicityMerge middle right) := by
  funext observation
  exact Nat.add_assoc _ _ _

/-- The multiplicity cell retains the commutative part of the shipped merge. -/
theorem drop_idempotence_keeps_commutativity
    (left right : Mutants.MultiplicityCell) :
    Mutants.multiplicityMerge left right = Mutants.multiplicityMerge right left := by
  funext observation
  exact Nat.add_comm _ _

/-- The exact duplication vector agrees in the shipped set cell and diverges
    in the multiplicity-retaining variant. -/
theorem drop_idempotence_killed :
    foldEvidence Emitter.observationCmp Emitter.duplicatedEvidence =
        foldEvidence Emitter.observationCmp Emitter.exactEvidence /\
      Mutants.foldMultiplicity Emitter.duplicatedEvidence (1, 10) ≠
        Mutants.foldMultiplicity Emitter.exactEvidence (1, 10) := by
  constructor
  · exact f2_duplication (cmp := Emitter.observationCmp) (1, 10) [(2, 20)]
  · decide

/-- Left choice retains associativity. -/
theorem drop_commutativity_keeps_associativity
    (left middle right : Emitter.GroundCell) :
    Mutants.leftBiasedCellMerge (Mutants.leftBiasedCellMerge left middle) right =
      Mutants.leftBiasedCellMerge left (Mutants.leftBiasedCellMerge middle right) := by
  rfl

/-- Left choice retains idempotence. -/
theorem drop_commutativity_keeps_idempotence (cell : Emitter.GroundCell) :
    Mutants.leftBiasedCellMerge cell cell = cell := by
  rfl

/-- The exact permutation vector agrees in the shipped set cell and diverges
    in the left-biased variant over that same carrier. -/
theorem drop_commutativity_killed :
    foldEvidence Emitter.observationCmp Emitter.permutedEvidence =
        foldEvidence Emitter.observationCmp Emitter.sequentialEvidence /\
      Mutants.foldLeftBiased Emitter.permutedEvidence ≠
        Mutants.foldLeftBiased Emitter.sequentialEvidence := by
  constructor
  · apply f2_permutation (cmp := Emitter.observationCmp)
    decide
  · decide

theorem floor_replay_vector_is_at_least_once :
    AtLeastOnceSchedule 10 [2, 3] Mutants.floorReplayVector := by
  rfl

theorem floor_guard_survives_replay :
    guardedApply Nat.add 10 2 Mutants.floorReplayVector 0 = fold Nat.add 0 [2, 3] := by
  exact f2b_guarded_exactly_once Nat.add 10 [2, 3] Mutants.floorReplayVector 0
    floor_replay_vector_is_at_least_once

/-- The replay vector refutes the variant that dropped the floor guard. -/
theorem drop_floor_guard_killed :
    Mutants.unguardedApply Nat.add 10 2 Mutants.floorReplayVector 0 ≠
      fold Nat.add 0 [2, 3] := by
  decide

theorem meet_clamp_survives_escalating_request :
    Policy.meet Mutants.rootPolicy Mutants.escalatingRequest <= Mutants.rootPolicy :=
  policy_meet_le_left _ _

/-- The attenuation vector refutes the variant that trusts the request. -/
theorem drop_meet_clamping_killed :
    ¬ Mutants.unclampedChild Mutants.rootPolicy Mutants.escalatingRequest <=
      Mutants.rootPolicy := by
  intro escalated
  have impossible : ¬ 20 <= 10 := by decide
  exact impossible escalated.budget

end Fabric
