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
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

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

/-- The last-write buffer consumer coincides with the lawful fold on every
    schedule satisfying both premise halves: the kill below is attributable
    to the dropped integrity half alone. -/
theorem drop_payload_integrity_keeps_disciplined_schedules
    (step : State -> Op -> State) (floor : Nat) (operations : List Op)
    (deliveries : List (Positioned Op)) (initial : State)
    (coverage : WindowCoverage floor operations deliveries)
    (integrity : PositionPayloadIntegrity floor operations deliveries) :
    Mutants.lastWriteBufferApply step floor operations.length deliveries initial =
      fold step initial operations := by
  simpa [Mutants.lastWriteBufferApply] using
    f2b_guarded_exactly_once step floor operations deliveries initial
      ⟨coverage, integrity⟩

/-- The conflict row keeps the coverage half: positions 11 and 12 both
    arrive, so nothing below is attributable to a missing successor. -/
theorem payload_conflict_has_window_coverage :
    WindowCoverage 10 [2, 3] Mutants.payloadConflictDeliveries := by
  simp only [WindowCoverage]
  decide

/-- The conflict row drops exactly the integrity half: the in-window arrival
    `(11, 999)` is not the positioned trace's record at position 11. -/
theorem payload_conflict_lacks_payload_integrity :
    ¬ PositionPayloadIntegrity 10 [2, 3] Mutants.payloadConflictDeliveries := by
  simp only [PositionPayloadIntegrity, InWindow]
  decide

/-- The conflict row refutes the consumer that trusts its last-write buffer
    outside the integrity premise: the late `(11, 999)` overwrite is drained
    in place of operation 2, and the terminal state leaves the trace's
    sequential meaning. -/
theorem drop_payload_integrity_killed :
    Mutants.lastWriteBufferApply Nat.add 10 2 Mutants.payloadConflictDeliveries 0 ≠
      fold Nat.add 0 [2, 3] := by
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
  · apply Std.ExtTreeSet.ext_mem
    intro atom
    simp only [Mutants.unclampedChild, Policy.meet, Std.ExtTreeSet.mem_inter_iff]
    exact ⟨fun member => ⟨attenuated.indexes atom member, member⟩, And.right⟩
  · apply Std.ExtTreeSet.ext_mem
    intro atom
    simp only [Mutants.unclampedChild, Policy.meet, Std.ExtTreeSet.mem_inter_iff]
    exact ⟨fun member => ⟨attenuated.resources atom member, member⟩, And.right⟩
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

/-- The ambient-consulting assembly retains the congruence frame over its
    EXTENDED read set: agreement that also covers the ambient address
    keeps its outputs equal, so the kill below is attributable to the one
    undeclared read alone. -/
theorem drop_declared_reads_keeps_extended_agreement
    {Addr Value : Type} (ambient : ContextRead Addr Value)
    (program : ContextProgram Addr Value) (left right : Addr -> Value)
    (agree : forall addr, addr ∈ program.addresses -> left addr = right addr)
    (ambientAgree : left ambient.addr = right ambient.addr) :
    Mutants.ambientAssemble ambient program left =
      Mutants.ambientAssemble ambient program right := by
  unfold Mutants.ambientAssemble
  apply f7_assembly_reads_only_declared
  intro addr member
  rw [show ({ reads := program.reads ++ [ambient] } :
      ContextProgram Addr Value).addresses =
        program.addresses ++ [ambient.addr] by
    simp [ContextProgram.addresses]] at member
  rcases List.mem_append.mp member with declared | ambientMember
  · exact agree addr declared
  · obtain rfl := List.mem_singleton.mp ambientMember
    exact ambientAgree

/-- The two-valuations row kills the ambient-read variant: the undeclared
    timestamp address moved between the two valuations and the mutant's
    output moved with it, while the lawful assembly cannot observe the
    drift. -/
theorem drop_declared_reads_killed :
    Mutants.ambientAssemble Emitter.timestampRead Emitter.contextProgram
        Emitter.valuationOne ≠
      Mutants.ambientAssemble Emitter.timestampRead Emitter.contextProgram
        Emitter.valuationTwo := by
  decide

/-- The schedule-order variant agrees with lawful assembly when the
    completion schedule happens to be the declared class order: the kill
    is attributable to schedule sensitivity alone. -/
theorem drop_volatility_order_keeps_disciplined_schedule :
    Mutants.scheduleOrderAssemble Mutants.completionScheduleCanonical
        Emitter.contextProgram Emitter.valuationOne =
      assemble Emitter.contextProgram Emitter.valuationOne := by
  decide

/-- An arrival-order assembly emits the turn segment first when the turn
    read completes first: the class order the stability half pins is
    observably broken. -/
theorem arrival_order_assembly_breaks_class_order :
    (Mutants.scheduleOrderAssemble Mutants.completionScheduleEager
        Emitter.contextProgram Emitter.valuationOne).map
        ContextSegment.volatility ≠
      stableClassOrder (Emitter.contextProgram.reads.map
        ContextRead.volatility) := by
  decide

/-- The two-schedules row kills the variant: same program, same valuation,
    two completion orders, two different assembled values. The lawful
    assembly has no schedule parameter to vary. -/
theorem drop_volatility_order_killed :
    Mutants.scheduleOrderAssemble Mutants.completionScheduleEager
        Emitter.contextProgram Emitter.valuationOne ≠
      Mutants.scheduleOrderAssemble Mutants.completionScheduleLate
        Emitter.contextProgram Emitter.valuationOne := by
  decide

/-- The arrival-order top-k retains duplication absorption: its support
    dedup survives, isolating the kill to the dropped tie-break. -/
theorem drop_identity_tiebreak_keeps_duplication :
    Mutants.arrivalOrderTopK Emitter.groundWidth Emitter.queryArrivalOne =
      Mutants.arrivalOrderTopK Emitter.groundWidth
        Mutants.queryArrivalOneExact := by
  decide

/-- The lawful top-k is one value across both committed arrival orders —
    the two-orders row is exactly an F11 instance. -/
theorem topk_survives_reordered_arrival :
    topK Emitter.groundScore id Emitter.groundWidth Emitter.queryArrivalOne =
      topK Emitter.groundScore id Emitter.groundWidth
        Emitter.queryArrivalTwo := by
  apply f11_topk_of_support
  · unfold IdentityDistinct
    decide
  · exact same_delivered_of_mutual_contains (by decide) (by decide)

/-- The two-orders row kills the arrival-order variant: insertion order
    leaks straight into the result. -/
theorem drop_identity_tiebreak_killed :
    Mutants.arrivalOrderTopK Emitter.groundWidth Emitter.queryArrivalOne ≠
      Mutants.arrivalOrderTopK Emitter.groundWidth
        Emitter.queryArrivalTwo := by
  decide

/-- At the empty ambient thread the variant IS the lawful answer — at
    every width and every delivered list, definitionally — so the kill
    below is attributable to consulting the thread alone. -/
theorem drop_schedule_independence_keeps_empty_thread
    (k : Nat) (entries : List Emitter.GroundEntry) :
    Mutants.ambientScheduleAnswer Mutants.ambientThreadEmpty k entries =
      topK Emitter.groundScore id k entries :=
  rfl

/-- The ambient-thread variant retains duplication absorption under a
    FIXED thread: its declared sort still runs over the dedup'd support. -/
theorem drop_schedule_independence_keeps_duplication :
    Mutants.ambientScheduleAnswer Mutants.ambientThreadBoosting
        Emitter.groundWidth Emitter.queryArrivalOne =
      Mutants.ambientScheduleAnswer Mutants.ambientThreadBoosting
        Emitter.groundWidth Mutants.queryArrivalOneExact := by
  unfold Mutants.ambientScheduleAnswer topK
  rw [show dedup Emitter.queryArrivalOne = dedup Mutants.queryArrivalOneExact
    from by decide]

/-- The two-schedules row kills the variant: one anchored support, one
    query, two ambient threads, two answers. The lawful algebra has no
    thread parameter to vary, and the boosted side still emits its answer
    through the declared sort — the divergence is the thread read alone. -/
theorem drop_schedule_independence_killed :
    Mutants.ambientScheduleAnswer Mutants.ambientThreadEmpty
        Emitter.groundWidth Emitter.queryArrivalOne ≠
      Mutants.ambientScheduleAnswer Mutants.ambientThreadBoosting
        Emitter.groundWidth Emitter.queryArrivalOne := by
  simp [Mutants.ambientScheduleAnswer, Mutants.ambientThreadEmpty,
    Mutants.ambientThreadBoosting, topK, dedup, byScoreThenIdentity,
    List.mergeSort, Emitter.groundScore, Emitter.groundWidth,
    Emitter.queryArrivalOne]

/-- The rival keeps the congruence half at every program: valuations that
    agree on the declared addresses give it one output, so the kill below
    is not attributable to an undeclared read. -/
theorem rival_keeps_declared_reads_frame
    {Addr Value : Type} (program : ContextProgram Addr Value)
    {left right : Addr -> Value}
    (agree : forall addr, addr ∈ program.addresses -> left addr = right addr) :
    Mutants.rivalAssemble program left = Mutants.rivalAssemble program right := by
  unfold Mutants.rivalAssemble
  rw [render_reads_agree program agree]

/-- The rival keeps the class-projection half at every program and
    valuation: reversing inside a class cannot move the class projection,
    so the kill below is not attributable to the stability half. -/
theorem rival_keeps_class_projection
    {Addr Value : Type} (program : ContextProgram Addr Value)
    (valuation : Addr -> Value) :
    (Mutants.rivalAssemble program valuation).map ContextSegment.volatility =
      stableClassOrder (program.reads.map ContextRead.volatility) := by
  rw [<- map_volatility_render_reads program valuation]
  unfold Mutants.rivalAssemble Mutants.reversedWithinClass stableClassOrder
  rw [List.map_flatMap]
  congr 1
  funext volatility
  rw [reverse_map_volatility_filter_class, List.filter_map]
  rfl

/-- On the committed ground program — classes pairwise distinct — the
    rival is byte-identical to lawful assembly: no prior corpus row or
    control could see it. -/
theorem rival_keeps_distinct_class_ground_row :
    Mutants.rivalAssemble Emitter.contextProgram Emitter.valuationOne =
      assemble Emitter.contextProgram Emitter.valuationOne := by
  decide

/-- The lawful assembly's static-class subsequence is the program-order
    rendering's — the two-reads-one-class vector is an F7 instance. -/
theorem within_class_order_survives_two_static :
    (assemble Mutants.twoStaticProgram Emitter.valuationOne).filter
        (fun segment => segment.volatility == Volatility.static) =
      (renderReads Mutants.twoStaticProgram Emitter.valuationOne).filter
        (fun segment => segment.volatility == Volatility.static) :=
  f7_within_class_order Mutants.twoStaticProgram Emitter.valuationOne .static

/-- The two-reads-one-class row kills the rival: it reverses the static
    class's two segments — bytes neither the congruence half nor the
    class-projection half can see. -/
theorem drop_within_class_order_killed :
    (Mutants.rivalAssemble Mutants.twoStaticProgram Emitter.valuationOne).filter
        (fun segment => segment.volatility == Volatility.static) ≠
      (renderReads Mutants.twoStaticProgram Emitter.valuationOne).filter
        (fun segment => segment.volatility == Volatility.static) := by
  decide

end Fabric
