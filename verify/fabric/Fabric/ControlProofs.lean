/- Proof-bearing negative controls, separated from the mutant definitions. -/
import Fabric.Proofs
import Fabric.Mutants

namespace Fabric

/-- Addition retains the associative part of ACI. -/
theorem drop_idempotence_keeps_associativity (left middle right : Nat) :
    Mutants.additiveMerge (Mutants.additiveMerge left middle) right =
      Mutants.additiveMerge left (Mutants.additiveMerge middle right) :=
  Nat.add_assoc left middle right

/-- Addition retains the commutative part of ACI. -/
theorem drop_idempotence_keeps_commutativity (left right : Nat) :
    Mutants.additiveMerge left right = Mutants.additiveMerge right left :=
  Nat.add_comm left right

/-- The duplication vector refutes the variant that dropped idempotence. -/
theorem drop_idempotence_killed :
    Mutants.additiveMerge 1 1 ≠ 1 := by decide

/-- Left choice retains associativity. -/
theorem drop_commutativity_keeps_associativity (left middle right : Nat) :
    Mutants.leftBiasedMerge (Mutants.leftBiasedMerge left middle) right =
      Mutants.leftBiasedMerge left (Mutants.leftBiasedMerge middle right) := by
  rfl

/-- Left choice retains idempotence. -/
theorem drop_commutativity_keeps_idempotence (value : Nat) :
    Mutants.leftBiasedMerge value value = value := by
  rfl

/-- The permutation vector refutes the variant that dropped commutativity. -/
theorem drop_commutativity_killed :
    Mutants.leftBiasedMerge 1 2 ≠ Mutants.leftBiasedMerge 2 1 := by decide

theorem floor_replay_vector_is_at_least_once :
    AtLeastOnceSchedule 10 [2, 3] Mutants.floorReplayVector := by
  simp [AtLeastOnceSchedule, lookupPosition, Mutants.floorReplayVector]

theorem floor_guard_survives_replay :
    guardedApply Nat.add 10 2 Mutants.floorReplayVector 0 = fold Nat.add 0 [2, 3] := by
  exact f2b_guarded_exactly_once Nat.add 10 [2, 3] Mutants.floorReplayVector 0
    floor_replay_vector_is_at_least_once

/-- The replay vector refutes the variant that dropped the floor guard. -/
theorem drop_floor_guard_killed :
    Mutants.unguardedApply Nat.add Mutants.floorReplayVector 0 ≠
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
  have impossible : ¬ 2 <= 1 := by decide
  exact impossible escalated.budget

end Fabric
