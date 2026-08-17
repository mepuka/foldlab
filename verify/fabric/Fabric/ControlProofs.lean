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

/-- Arrival-order application agrees with the sequential fold when arrivals
    are already the contiguous positioned trace. The mutant differs from the
    shipped consumer only when the network reorders that trace. -/
theorem drop_successor_discipline_keeps_contiguous_trace
    (step : State -> Op -> State) (floor : Nat) (operations : List Op)
    (initial : State) :
    Mutants.arrivalOrderApply step floor (positionTrace floor operations) initial =
      fold step initial operations := by
  induction operations generalizing floor initial with
  | nil => rfl
  | cons operation operations inductionHypothesis =>
      simp only [positionTrace, Mutants.arrivalOrderApply, List.foldl_cons,
        Nat.lt_add_one, if_true, fold, foldFrom, List.foldl]
      exact inductionHypothesis (floor + 1) (step initial operation)

theorem reordered_vector_has_serial_successor_premise :
    Laws.F2bSerialSuccessorPremise 4 [2, 3] Mutants.reorderedDeliveryVector := by
  intro delivery
  rcases delivery with ⟨position, operation⟩
  simp [Mutants.reorderedDeliveryVector, Emitter.reorderedDeliveries, InWindow,
    positionTrace]
  omega

/-- An arrival-order consumer applies 6, advances to 6, then skips 5. -/
theorem arrival_order_apply_skips_six_before_five :
    Mutants.arrivalOrderApply Emitter.appendStep 4
        Mutants.reorderedDeliveryVector [] =
      [3] := by
  decide

theorem successor_discipline_survives_reordering :
    guardedApply Emitter.appendStep 4 2 Mutants.reorderedDeliveryVector [] =
      fold Emitter.appendStep [] [2, 3] := by
  simpa [guardedApply] using f2b_guarded_exactly_once Emitter.appendStep 4 [2, 3]
    Mutants.reorderedDeliveryVector [] reordered_vector_has_serial_successor_premise

/-- The 6-before-5 row refutes arrival-order application because applying 6
    first advances the frontier and causes 5 to be skipped forever. -/
theorem drop_successor_discipline_killed :
    Mutants.arrivalOrderApply Emitter.appendStep 4
        Mutants.reorderedDeliveryVector [] ≠
      fold Emitter.appendStep [] [2, 3] := by
  decide

theorem meet_clamp_survives_escalating_request :
    Policy.meet Mutants.rootPolicy Mutants.escalatingRequest <= Mutants.rootPolicy :=
  policy_meet_le_left _ _

/-- The unclamped mutant agrees with the meet when the request is already
    attenuated by the root policy. Its killed row therefore isolates
    escalation rather than ordinary delegation. -/
theorem drop_meet_clamping_keeps_already_attenuated
    (root requested : Mutants.GroundPolicy) (attenuated : requested <= root) :
    Mutants.unclampedChild root requested = Policy.meet root requested := by
  apply Policy.ext
  · apply Std.ExtTreeSet.ext_mem
    intro atom
    simp only [Mutants.unclampedChild, Policy.meet, Std.ExtTreeSet.mem_inter_iff]
    exact ⟨fun member => ⟨attenuated.capabilities atom member, member⟩, And.right⟩
  · apply Std.ExtTreeSet.ext_mem
    intro atom
    simp only [Mutants.unclampedChild, Policy.meet, Std.ExtTreeSet.mem_inter_iff]
    exact ⟨fun member => ⟨attenuated.contextAllowlist atom member, member⟩, And.right⟩
  · apply Std.ExtTreeSet.ext_mem
    intro atom
    simp only [Mutants.unclampedChild, Policy.meet, Std.ExtTreeSet.mem_inter_iff]
    exact ⟨fun member => ⟨attenuated.toolkits atom member, member⟩, And.right⟩
  · apply Std.ExtTreeSet.ext_mem
    intro atom
    simp only [Mutants.unclampedChild, Policy.meet, Std.ExtTreeSet.mem_inter_iff]
    exact ⟨fun member => ⟨attenuated.writ atom member, member⟩, And.right⟩
  · exact (Nat.min_eq_right attenuated.capabilityClass).symm
  · exact (Nat.min_eq_right attenuated.effortClass).symm
  · exact (Nat.min_eq_right attenuated.budget).symm
  · exact (Nat.min_eq_right attenuated.spawnBound).symm

/-- The attenuation vector refutes the variant that trusts the request. -/
theorem drop_meet_clamping_killed :
    ¬ Mutants.unclampedChild Mutants.rootPolicy Mutants.escalatingRequest <=
      Mutants.rootPolicy := by
  intro escalated
  have impossible : ¬ 20 <= 10 := by decide
  exact impossible escalated.budget

end Fabric
