/- Kernel-checked proofs of the statements in `Fabric/Laws.lean`. -/
import Fabric.Laws

namespace Fabric

universe uH uV

section F1

variable {Holder : Type uH} {Value : Type uV}
variable {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
variable [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]

theorem cell_merge_comm (left right : Cell Holder Value cmp) :
    Cell.merge left right = Cell.merge right left := by
  apply Std.ExtTreeSet.ext_mem
  intro observation
  simp only [Cell.merge, Std.ExtTreeSet.mem_union_iff]
  exact or_comm

theorem cell_merge_assoc (left middle right : Cell Holder Value cmp) :
    Cell.merge (Cell.merge left middle) right =
      Cell.merge left (Cell.merge middle right) := by
  apply Std.ExtTreeSet.ext_mem
  intro observation
  simp only [Cell.merge, Std.ExtTreeSet.mem_union_iff]
  exact or_assoc

theorem cell_merge_idem (cell : Cell Holder Value cmp) :
    Cell.merge cell cell = cell := by
  apply Std.ExtTreeSet.ext_mem
  intro observation
  simp only [Cell.merge, Std.ExtTreeSet.mem_union_iff]
  constructor
  · exact fun member => member.elim id id
  · exact Or.inl

/-- F1: finite-set union supplies the cell's ACI join. -/
theorem f1_cell_merge_aci : Laws.F1CellMergeACI (cmp := cmp) :=
  ⟨cell_merge_comm, cell_merge_assoc, cell_merge_idem⟩

/-- F1: extensional equality turns equal verified sets into equal replicas.
    This is a statement about states; the history-level convergence the
    fabric also claims is `f1_history_convergence`. -/
theorem f1_cell_extensional :
    Laws.F1CellExtensional (cmp := cmp) := by
  intro left right same
  apply Std.ExtTreeSet.ext_mem
  exact same

end F1

section F2

variable {Holder : Type uH} {Value : Type uV}
variable {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
variable [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]
variable [BEq (Observation Holder Value)] [Std.LawfulBEqCmp cmp]

/-- F2: equal observation support yields byte-independent terminal state. -/
theorem f2_trace_invariant : Laws.F2TraceInvariant (cmp := cmp) := by
  intro left right same
  apply Std.ExtTreeSet.ext_mem
  intro observation
  simp only [foldEvidence, Std.ExtTreeSet.mem_ofList]
  rw [same observation]

/-- The permutation half of F2. -/
theorem f2_permutation {left right : List (Observation Holder Value)}
    (permutation : left.Perm right) :
    foldEvidence cmp left = foldEvidence cmp right := by
  exact f2_trace_invariant left right (fun _ => permutation.contains_eq)

/-- The duplication half of F2, exposed independently for the gate roster. -/
theorem f2_duplication [LawfulBEq (Observation Holder Value)]
    (observation : Observation Holder Value)
    (trace : List (Observation Holder Value)) :
    foldEvidence cmp (observation :: observation :: trace) =
      foldEvidence cmp (observation :: trace) := by
  apply f2_trace_invariant
  intro candidate
  simp

/-- F1, convergence half: two nodes folding the same evidence multiset in
    different delivery orders converge to one cell — derived from F2's
    permutation half. -/
theorem f1_history_convergence : Laws.F1HistoryConvergence (cmp := cmp) :=
  fun _ _ permutation => f2_permutation permutation

end F2

section EmitterComparator

/-- The emitter comparator returns equality only for equal holder/value pairs. -/
theorem emitter_observation_cmp_lawful_eq :
    Std.LawfulEqCmp Emitter.observationCmp := {
  compare_self := by
    intro observation
    simp [Emitter.observationCmp, compareLex, compareOn]
  eq_of_compare := by
    intro left right equalComparison
    rcases left with ⟨leftHolder, leftValue⟩
    rcases right with ⟨rightHolder, rightValue⟩
    simp [Emitter.observationCmp, compareLex, compareOn] at equalComparison
    rcases equalComparison with ⟨rfl, rfl⟩
    rfl
}

attribute [instance] emitter_observation_cmp_lawful_eq

/-- Boolean equality and comparator equality coincide on emitted observations. -/
theorem emitter_observation_cmp_lawful_beq :
    Std.LawfulBEqCmp Emitter.observationCmp := {
  compare_eq_iff_beq := by
    intro left right
    rcases left with ⟨leftHolder, leftValue⟩
    rcases right with ⟨rightHolder, rightValue⟩
    simp [Emitter.observationCmp, compareLex, compareOn]
}

attribute [instance] emitter_observation_cmp_lawful_beq

/-- The concrete comparator used at L1 satisfies every class required by the
    generic F1/F2 proofs. -/
theorem emitter_observation_comparator_lawful :
    Std.TransCmp Emitter.observationCmp /\
      Std.LawfulEqCmp Emitter.observationCmp /\
      Std.LawfulBEqCmp Emitter.observationCmp :=
  ⟨inferInstance, inferInstance, inferInstance⟩

end EmitterComparator

section F3

variable {State : Type uH} {Op : Type uV}

/-- F3: resuming from the prefix fold is the fold over concatenation. -/
theorem f3_resume_exact (step : State -> Op -> State) (initial : State) :
    Laws.F3ResumeExact step initial := by
  intro xs ys
  simp only [fold, foldFrom, List.foldl_append]

end F3

section F2b

variable {State : Type uH} {Op : Type uV}

/-- Every positioned operation lies strictly above the floor that positioned
    its trace. -/
theorem positioned_above (floor : Nat) (operations : List Op)
    {delivery : Positioned Op}
    (member : delivery ∈ positionTrace floor operations) :
    floor < delivery.position := by
  induction operations generalizing floor with
  | nil => simp [positionTrace] at member
  | cons operation operations inductionHypothesis =>
      simp only [positionTrace, List.mem_cons] at member
      rcases member with rfl | member
      · exact Nat.lt_succ_self floor
      · exact Nat.lt_trans (Nat.lt_succ_self floor)
          (inductionHypothesis (floor + 1) member)

/-- Every positioned operation lies inside the ceiling of the window its
    trace spans. -/
theorem positioned_within (floor : Nat) (operations : List Op)
    {delivery : Positioned Op}
    (member : delivery ∈ positionTrace floor operations) :
    delivery.position <= floor + operations.length := by
  induction operations generalizing floor with
  | nil => simp [positionTrace] at member
  | cons operation operations inductionHypothesis =>
      simp only [positionTrace, List.mem_cons] at member
      rcases member with rfl | member
      · simp only [List.length_cons]
        omega
      · have below := inductionHypothesis (floor + 1) member
        simp only [List.length_cons]
        omega

/-- One contiguous positioned trace cannot carry two different operations at
    the same journal position. -/
theorem positioned_unique (floor : Nat) (operations : List Op)
    {left right : Positioned Op}
    (leftMember : left ∈ positionTrace floor operations)
    (rightMember : right ∈ positionTrace floor operations)
    (samePosition : left.position = right.position) : left = right := by
  induction operations generalizing floor left right with
  | nil => simp [positionTrace] at leftMember
  | cons operation operations inductionHypothesis =>
      simp only [positionTrace, List.mem_cons] at leftMember rightMember
      rcases leftMember with rfl | leftMember
      · rcases rightMember with rfl | rightMember
        · rfl
        · have above := positioned_above (floor + 1) operations rightMember
          change floor + 1 = right.position at samePosition
          omega
      · rcases rightMember with rfl | rightMember
        · have above := positioned_above (floor + 1) operations leftMember
          change left.position = floor + 1 at samePosition
          omega
        · exact inductionHypothesis (floor + 1) leftMember rightMember samePosition

/-- Once a position contains the expected operation, consuming further raw
    arrivals that agree at that position preserves it. -/
theorem ingest_preserves_lookup (position : Nat)
    (operation : Op) (deliveries : List (Positioned Op))
    (buffer : ReplayBuffer Op)
    (matching : forall delivery, delivery ∈ deliveries ->
      delivery.position = position -> delivery.operation = operation)
    (present : buffer position = some operation) :
    (deliveries.foldl ingestDelivery buffer) position =
      some operation := by
  induction deliveries generalizing buffer with
  | nil => exact present
  | cons delivery deliveries inductionHypothesis =>
      simp only [List.foldl]
      apply inductionHypothesis
      · intro candidate member samePosition
        exact matching candidate (List.mem_cons_of_mem delivery member) samePosition
      · by_cases samePosition : position = delivery.position
        · have operationEqual := matching delivery (by simp) samePosition.symm
          simp [ingestDelivery, samePosition, operationEqual]
        · simp [ingestDelivery, samePosition, present]

/-- A raw in-window witness, together with agreement of all redeliveries at
    its position, determines the shipped buffer's lookup result. -/
theorem ingest_lookup_of_raw_support (position : Nat)
    (operation : Op) (deliveries : List (Positioned Op))
    (matching : forall delivery, delivery ∈ deliveries ->
      delivery.position = position -> delivery.operation = operation)
    (witness : exists delivery,
      delivery ∈ deliveries /\ delivery.position = position /\
        delivery.operation = operation) :
    (ingestSchedule deliveries) position = some operation := by
  rcases witness with ⟨witness, witnessMember, witnessPosition, witnessOperation⟩
  obtain ⟨before, after, rfl⟩ := List.append_of_mem witnessMember
  unfold ingestSchedule
  rw [List.foldl_append]
  simp only [List.foldl]
  apply ingest_preserves_lookup position operation after
    (ingestDelivery (List.foldl ingestDelivery emptyReplayBuffer before) witness)
  · intro candidate member samePosition
    apply matching candidate
    · simp only [List.mem_append, List.mem_cons]
      exact Or.inr (Or.inr member)
    · exact samePosition
  · subst position
    subst operation
    simp [ingestDelivery]

/-- The two premise halves force every positioned operation into the shipped
    buffer, independently of arrival order and multiplicity: coverage supplies
    an arrival at the expected position, and payload integrity pins every
    in-window arrival at that position to the expected operation. -/
theorem schedule_buffer_covers (floor : Nat) (operations : List Op)
    (deliveries : List (Positioned Op))
    (coverage : WindowCoverage floor operations deliveries)
    (integrity : PositionPayloadIntegrity floor operations deliveries)
    (expected : Positioned Op) (expectedMember : expected ∈ positionTrace floor operations) :
    ingestSchedule deliveries expected.position =
      some expected.operation := by
  have expectedLower := positioned_above floor operations expectedMember
  have expectedUpper := positioned_within floor operations expectedMember
  have matching : forall delivery, delivery ∈ deliveries ->
      delivery.position = expected.position ->
        delivery = expected := by
    intro delivery member samePosition
    have deliveryWindow : InWindow floor (floor + operations.length) delivery :=
      ⟨by simpa [samePosition] using expectedLower,
        by simpa [samePosition] using expectedUpper⟩
    have deliveryMember := integrity delivery member deliveryWindow
    exact positioned_unique floor operations
      deliveryMember expectedMember samePosition
  apply ingest_lookup_of_raw_support expected.position expected.operation deliveries
  · intro delivery member samePosition
    exact congrArg Positioned.operation (matching delivery member samePosition)
  · obtain ⟨delivery, member, samePosition⟩ := coverage expected expectedMember
    exact ⟨delivery, member, samePosition,
      congrArg Positioned.operation (matching delivery member samePosition)⟩

/-- Helper on the way to F2b, stated over an already-complete buffer: when
    every window position is present with its exact payload, the successor
    drain is the sequential fold. The complete-buffer hypothesis is this
    lemma's whole premise — it says nothing about raw schedules, which is why
    it stays private and off the roster; `f2b_guarded_exactly_once` is the
    headline result. -/
private theorem applySuccessors_of_completeBuffer (step : State -> Op -> State)
    (floor : Nat) (operations : List Op) (initial : State)
    (buffer : ReplayBuffer Op)
    (covered : forall delivery, delivery ∈ positionTrace floor operations ->
      buffer delivery.position = some delivery.operation) :
    applySuccessors step floor operations.length initial buffer =
      fold step initial operations := by
  induction operations generalizing floor initial with
  | nil => rfl
  | cons operation operations inductionHypothesis =>
      let head : Positioned Op := { position := floor + 1, operation }
      have headMember : head ∈ positionTrace floor (operation :: operations) := by
        simp [head, positionTrace]
      have headCovered := covered head headMember
      simp only [head] at headCovered
      simp only [List.length_cons, applySuccessors, fold, foldFrom, List.foldl]
      rw [headCovered]
      apply inductionHypothesis
      intro delivery member
      apply covered delivery
      exact List.mem_cons_of_mem head member

/-- The successor drain observes only positions in its finite window, so two
    buffers that agree there produce the same state. -/
theorem apply_successors_congr (step : State -> Op -> State)
    (floor count : Nat) (initial : State) (left right : ReplayBuffer Op)
    (agree : forall position, floor < position -> position <= floor + count ->
      left position = right position) :
    applySuccessors step floor count initial left =
      applySuccessors step floor count initial right := by
  induction count generalizing floor initial with
  | zero => rfl
  | succ count inductionHypothesis =>
      simp only [applySuccessors]
      have nextAgrees := agree (floor + 1) (by omega) (by omega)
      rw [nextAgrees]
      cases next : right (floor + 1) with
      | none => rfl
      | some operation =>
          apply inductionHypothesis
          intro position lower upper
          apply agree position <;> omega

/-- Ingesting every arrival agrees inside the finite window with first
    discarding arrivals outside it. -/
theorem ingest_window_agrees (floor ceiling : Nat)
    (deliveries : List (Positioned Op)) (left right : ReplayBuffer Op)
    (agree : forall position, floor < position -> position <= ceiling ->
      left position = right position) (position : Nat)
    (lower : floor < position) (upper : position <= ceiling) :
    (deliveries.foldl ingestDelivery left) position =
      (deliveries.foldl (fun buffer delivery =>
        if floor < delivery.position /\ delivery.position <= ceiling then
          ingestDelivery buffer delivery
        else buffer) right) position := by
  induction deliveries generalizing left right with
  | nil => exact agree position lower upper
  | cons delivery deliveries inductionHypothesis =>
      simp only [List.foldl]
      apply inductionHypothesis
      intro candidate candidateLower candidateUpper
      by_cases inWindow : floor < delivery.position /\ delivery.position <= ceiling
      · by_cases samePosition : candidate = delivery.position
        · simp [ingestDelivery, inWindow, samePosition]
        · simp [ingestDelivery, inWindow, samePosition,
            agree candidate candidateLower candidateUpper]
      · have differentPosition : candidate ≠ delivery.position := by
          intro samePosition
          apply inWindow
          simpa [samePosition] using And.intro candidateLower candidateUpper
        simp [ingestDelivery, inWindow, differentPosition,
          agree candidate candidateLower candidateUpper]

/-- A lower/upper position guard is observationally redundant: the successor
    drain already reads only the same finite window. This theorem documents
    why the shipped ingestion path stores arrivals without that guard. -/
theorem guard_is_redundant (step : State -> Op -> State)
    (floor count : Nat) (deliveries : List (Positioned Op)) (initial : State) :
    guardedApply step floor count deliveries initial =
      applySuccessors step floor count initial
        (deliveries.foldl (fun buffer delivery =>
          if floor < delivery.position /\ delivery.position <= floor + count then
            ingestDelivery buffer delivery
          else buffer) emptyReplayBuffer) := by
  unfold guardedApply ingestSchedule
  apply apply_successors_congr
  intro position lower upper
  exact ingest_window_agrees floor (floor + count) deliveries
    emptyReplayBuffer emptyReplayBuffer (fun _ _ _ => rfl) position lower upper

/-- F2b: under window coverage the raw-arrival buffer fold normalises every
    finite schedule, under position-payload integrity it normalises it to the
    contiguous positioned trace, and then the successor discipline gives its
    arbitrary step function exactly-once sequential meaning. -/
theorem f2b_guarded_exactly_once (step : State -> Op -> State) :
    Laws.F2bGuardedExactlyOnce step := by
  intro floor operations deliveries initial premise
  obtain ⟨coverage, integrity⟩ := premise
  apply applySuccessors_of_completeBuffer step floor operations initial
  intro delivery member
  exact schedule_buffer_covers floor operations deliveries
    coverage integrity delivery member

end F2b

section F4

variable {State : Type uH} {Op : Type uV}

/-- Folding concatenated traces is merging their commutative folds. -/
theorem commutative_fold_append (algebra : CommutativeAlgebra State)
    (contribution : Op -> State) (left right : List Op) :
    foldCommutative algebra contribution (left ++ right) =
      algebra.merge (foldCommutative algebra contribution left)
        (foldCommutative algebra contribution right) := by
  induction left with
  | nil =>
      simp only [List.nil_append, foldCommutative]
      exact (algebra.leftIdentity _).symm
  | cons operation operations inductionHypothesis =>
      simp only [List.cons_append, foldCommutative]
      rw [inductionHypothesis]
      exact (algebra.associative _ _ _).symm

/-- The contribution-form fold proved here is the ordinary step fold used by
    deployment when its step merges each operation's contribution. -/
theorem foldCommutative_eq_fold (algebra : CommutativeAlgebra State)
    (contribution : Op -> State) (trace : List Op) :
    foldCommutative algebra contribution trace =
      fold (fun state operation => algebra.merge state (contribution operation))
        algebra.empty trace := by
  have rightIdentity (state : State) :
      algebra.merge state algebra.empty = state := by
    rw [algebra.commutative, algebra.leftIdentity]
  have foldFromMerge (initial : State) (operations : List Op) :
      List.foldl (fun state operation =>
          algebra.merge state (contribution operation)) initial operations =
        algebra.merge initial (foldCommutative algebra contribution operations) := by
    induction operations generalizing initial with
    | nil =>
        exact (rightIdentity initial).symm
    | cons operation operations inductionHypothesis =>
        simp only [List.foldl_cons, foldCommutative]
        rw [inductionHypothesis]
        exact algebra.associative _ _ _
  unfold fold foldFrom
  rw [foldFromMerge, algebra.leftIdentity]

/-- A declared commutative fold forgets only schedule order. -/
theorem commutative_fold_permutation (algebra : CommutativeAlgebra State)
    (contribution : Op -> State) {left right : List Op}
    (permutation : left.Perm right) :
    foldCommutative algebra contribution left =
      foldCommutative algebra contribution right := by
  induction permutation with
  | nil => rfl
  | cons operation permutation inductionHypothesis =>
      simp only [foldCommutative]
      rw [inductionHypothesis]
  | swap left right tail =>
      simp only [foldCommutative]
      rw [← algebra.associative,
        algebra.commutative (contribution right) (contribution left),
        algebra.associative]
  | trans first second firstHypothesis secondHypothesis =>
      exact firstHypothesis.trans secondHypothesis

/-- Merging the independently folded partitions is folding their flattening. -/
theorem partition_folds_flatten (algebra : CommutativeAlgebra State)
    (contribution : Op -> State) (partitions : List (List Op)) :
    mergePartitionFolds algebra contribution partitions =
      foldCommutative algebra contribution partitions.flatten := by
  induction partitions with
  | nil => rfl
  | cons partition partitions inductionHypothesis =>
      simp only [mergePartitionFolds, List.flatten_cons]
      rw [inductionHypothesis]
      exact (commutative_fold_append algebra contribution partition
        partitions.flatten).symm

/-- F4: partition folds agree with every licensed interleaving. -/
theorem f4_partition_fold (algebra : CommutativeAlgebra State)
    (contribution : Op -> State) : Laws.F4PartitionFold algebra contribution := by
  intro partitions interleaved interleaves
  rw [partition_folds_flatten]
  exact (commutative_fold_permutation algebra contribution interleaves).symm

end F4

section F9

variable {Atom : Type uH} {cmp : Atom -> Atom -> Ordering}
variable [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]

theorem policy_set_inter_comm (left right : FiniteSet Atom cmp) :
    left ∩ right = right ∩ left := by
  apply Std.ExtTreeSet.ext_mem
  intro atom
  simp only [Std.ExtTreeSet.mem_inter_iff]
  exact and_comm

theorem policy_set_inter_assoc (left middle right : FiniteSet Atom cmp) :
    (left ∩ middle) ∩ right = left ∩ (middle ∩ right) := by
  apply Std.ExtTreeSet.ext_mem
  intro atom
  simp only [Std.ExtTreeSet.mem_inter_iff]
  exact and_assoc

theorem policy_set_inter_idem (set : FiniteSet Atom cmp) : set ∩ set = set := by
  apply Std.ExtTreeSet.ext_mem
  intro atom
  simp only [Std.ExtTreeSet.mem_inter_iff]
  constructor
  · exact And.left
  · exact fun member => ⟨member, member⟩

omit [Std.LawfulEqCmp cmp] in
theorem policy_le_refl (policy : Policy Atom cmp) : policy <= policy := by
  exact {
    capabilities := fun _ member => member
    contextAllowlist := fun _ member => member
    toolkits := fun _ member => member
    writ := fun _ member => member
    indexes := fun _ member => member
    resources := fun _ member => member
    capabilityClass := Nat.le_refl _
    effortClass := Nat.le_refl _
    budget := Nat.le_refl _
    spawnBound := Nat.le_refl _
  }

omit [Std.LawfulEqCmp cmp] in
theorem policy_le_trans {lower middle upper : Policy Atom cmp}
    (lowerMiddle : lower <= middle) (middleUpper : middle <= upper) :
    lower <= upper := by
  exact {
    capabilities := fun atom member =>
      middleUpper.capabilities atom (lowerMiddle.capabilities atom member)
    contextAllowlist := fun atom member =>
      middleUpper.contextAllowlist atom (lowerMiddle.contextAllowlist atom member)
    toolkits := fun atom member =>
      middleUpper.toolkits atom (lowerMiddle.toolkits atom member)
    writ := fun atom member =>
      middleUpper.writ atom (lowerMiddle.writ atom member)
    indexes := fun atom member =>
      middleUpper.indexes atom (lowerMiddle.indexes atom member)
    resources := fun atom member =>
      middleUpper.resources atom (lowerMiddle.resources atom member)
    capabilityClass := Nat.le_trans lowerMiddle.capabilityClass middleUpper.capabilityClass
    effortClass := Nat.le_trans lowerMiddle.effortClass middleUpper.effortClass
    budget := Nat.le_trans lowerMiddle.budget middleUpper.budget
    spawnBound := Nat.le_trans lowerMiddle.spawnBound middleUpper.spawnBound
  }

theorem policy_meet_comm (left right : Policy Atom cmp) :
    Policy.meet left right = Policy.meet right left := by
  apply Policy.ext
  · exact policy_set_inter_comm _ _
  · exact policy_set_inter_comm _ _
  · exact policy_set_inter_comm _ _
  · exact policy_set_inter_comm _ _
  · exact policy_set_inter_comm _ _
  · exact policy_set_inter_comm _ _
  · exact Nat.min_comm _ _
  · exact Nat.min_comm _ _
  · exact Nat.min_comm _ _
  · exact Nat.min_comm _ _

theorem policy_meet_assoc (left middle right : Policy Atom cmp) :
    Policy.meet (Policy.meet left middle) right =
      Policy.meet left (Policy.meet middle right) := by
  apply Policy.ext
  · exact policy_set_inter_assoc _ _ _
  · exact policy_set_inter_assoc _ _ _
  · exact policy_set_inter_assoc _ _ _
  · exact policy_set_inter_assoc _ _ _
  · exact policy_set_inter_assoc _ _ _
  · exact policy_set_inter_assoc _ _ _
  · exact Nat.min_assoc _ _ _
  · exact Nat.min_assoc _ _ _
  · exact Nat.min_assoc _ _ _
  · exact Nat.min_assoc _ _ _

theorem policy_meet_idem (policy : Policy Atom cmp) :
    Policy.meet policy policy = policy := by
  apply Policy.ext
  · exact policy_set_inter_idem _
  · exact policy_set_inter_idem _
  · exact policy_set_inter_idem _
  · exact policy_set_inter_idem _
  · exact policy_set_inter_idem _
  · exact policy_set_inter_idem _
  · exact Nat.min_self _
  · exact Nat.min_self _
  · exact Nat.min_self _
  · exact Nat.min_self _

omit [Std.LawfulEqCmp cmp] in
theorem policy_meet_le_left (left right : Policy Atom cmp) :
    Policy.meet left right <= left := by
  exact {
    capabilities := fun _ member => (Std.ExtTreeSet.mem_inter_iff.mp member).1
    contextAllowlist := fun _ member => (Std.ExtTreeSet.mem_inter_iff.mp member).1
    toolkits := fun _ member => (Std.ExtTreeSet.mem_inter_iff.mp member).1
    writ := fun _ member => (Std.ExtTreeSet.mem_inter_iff.mp member).1
    indexes := fun _ member => (Std.ExtTreeSet.mem_inter_iff.mp member).1
    resources := fun _ member => (Std.ExtTreeSet.mem_inter_iff.mp member).1
    capabilityClass := Nat.min_le_left _ _
    effortClass := Nat.min_le_left _ _
    budget := Nat.min_le_left _ _
    spawnBound := Nat.min_le_left _ _
  }

theorem policy_meet_le_right (left right : Policy Atom cmp) :
    Policy.meet left right <= right := by
  rw [policy_meet_comm]
  exact policy_meet_le_left right left

omit [Std.LawfulEqCmp cmp] in
theorem policy_le_meet {lower left right : Policy Atom cmp}
    (lowerLeft : lower <= left) (lowerRight : lower <= right) :
    lower <= Policy.meet left right := by
  exact {
    capabilities := fun atom member => Std.ExtTreeSet.mem_inter_iff.mpr
      ⟨lowerLeft.capabilities atom member, lowerRight.capabilities atom member⟩
    contextAllowlist := fun atom member => Std.ExtTreeSet.mem_inter_iff.mpr
      ⟨lowerLeft.contextAllowlist atom member, lowerRight.contextAllowlist atom member⟩
    toolkits := fun atom member => Std.ExtTreeSet.mem_inter_iff.mpr
      ⟨lowerLeft.toolkits atom member, lowerRight.toolkits atom member⟩
    writ := fun atom member => Std.ExtTreeSet.mem_inter_iff.mpr
      ⟨lowerLeft.writ atom member, lowerRight.writ atom member⟩
    indexes := fun atom member => Std.ExtTreeSet.mem_inter_iff.mpr
      ⟨lowerLeft.indexes atom member, lowerRight.indexes atom member⟩
    resources := fun atom member => Std.ExtTreeSet.mem_inter_iff.mpr
      ⟨lowerLeft.resources atom member, lowerRight.resources atom member⟩
    capabilityClass := Nat.le_min.mpr
      ⟨lowerLeft.capabilityClass, lowerRight.capabilityClass⟩
    effortClass := Nat.le_min.mpr ⟨lowerLeft.effortClass, lowerRight.effortClass⟩
    budget := Nat.le_min.mpr ⟨lowerLeft.budget, lowerRight.budget⟩
    spawnBound := Nat.le_min.mpr ⟨lowerLeft.spawnBound, lowerRight.spawnBound⟩
  }

/-- Meet monotonicity is the reusable induction step for nested delegation. -/
theorem policy_meet_monotone {leftLower leftUpper rightLower rightUpper :
    Policy Atom cmp} (leftLe : leftLower <= leftUpper)
    (rightLe : rightLower <= rightUpper) :
    Policy.meet leftLower rightLower <= Policy.meet leftUpper rightUpper := by
  apply policy_le_meet
  · exact policy_le_trans (policy_meet_le_left leftLower rightLower) leftLe
  · exact policy_le_trans (policy_meet_le_right leftLower rightLower) rightLe

/-- F9: the componentwise operation is a genuine meet-semilattice. -/
theorem f9_policy_meet_semilattice :
    Laws.F9PolicyMeetSemilattice (Atom := Atom) (cmp := cmp) :=
  ⟨policy_meet_comm, policy_meet_assoc, policy_meet_idem,
    fun left right => ⟨policy_meet_le_left left right,
      policy_meet_le_right left right⟩,
    fun _ _ _ => policy_le_meet⟩

/- F9: a path of meet-constructed policies cannot exceed the root grant. -/
omit [Std.LawfulEqCmp cmp] in
theorem f9_tree_attenuation :
    Laws.F9TreeAttenuation (Atom := Atom) (cmp := cmp) := by
  intro root descendant tree reachable
  induction reachable with
  | here root requested children =>
      exact policy_meet_le_left root requested
  | throughChild root requested before after child effective nested inductionHypothesis =>
      exact policy_le_trans inductionHypothesis (policy_meet_le_left root requested)

end F9

section F7

variable {Addr : Type uH} {Value : Type uV}

/-- Rendering consults each read's declared address and nothing else: two
    valuations that agree on the declared addresses render one segment
    list. -/
theorem render_reads_agree (program : ContextProgram Addr Value)
    {left right : Addr -> Value}
    (agree : forall addr, addr ∈ program.addresses -> left addr = right addr) :
    renderReads program left = renderReads program right := by
  unfold renderReads
  apply List.map_congr_left
  intro read member
  rw [agree read.addr (List.mem_map_of_mem member)]

/-- F7: assembly is a function of the program and the declared reads'
    values — the frame/congruence statement. A variant consulting any
    address off the declared read set is refutable, and is refuted in the
    committed controls. -/
theorem f7_assembly_reads_only_declared :
    Laws.F7AssemblyReadsOnlyDeclared (Addr := Addr) (Value := Value) := by
  intro program left right agree
  unfold assemble
  rw [render_reads_agree program agree]

/-- Rendering preserves each read's declared class, in program order. -/
theorem map_volatility_render_reads (program : ContextProgram Addr Value)
    (valuation : Addr -> Value) :
    (renderReads program valuation).map ContextSegment.volatility =
      program.reads.map ContextRead.volatility := by
  unfold renderReads
  rw [List.map_map]
  rfl

/-- The stable ordering commutes with the class projection: the classes of
    the ordered segments are the stable class sort of the segments'
    classes. -/
theorem map_volatility_order_by_volatility
    (segments : List (ContextSegment Addr)) :
    (orderByVolatility segments).map ContextSegment.volatility =
      stableClassOrder (segments.map ContextSegment.volatility) := by
  unfold orderByVolatility stableClassOrder
  rw [List.map_flatMap]
  congr 1
  funext volatility
  rw [List.filter_map]
  rfl

/-- F7: segment order is the stable class sort of the program's declared
    order — a function of the program alone. This half constrains the
    class projection; the within-class half below constrains equal-class
    order. -/
theorem f7_segment_order_stable :
    Laws.F7SegmentOrderStable (Addr := Addr) (Value := Value) := by
  intro program valuation
  unfold assemble
  rw [map_volatility_order_by_volatility, map_volatility_render_reads]

/-- Ordering by volatility leaves each class's subsequence untouched: the
    class filter absorbs the stable ordering, because exactly one class
    block survives the filter and that block is itself a filter of the
    input. -/
theorem order_by_volatility_filter_class
    (segments : List (ContextSegment Addr)) (volatility : Volatility) :
    (orderByVolatility segments).filter
        (fun segment => segment.volatility == volatility) =
      segments.filter (fun segment => segment.volatility == volatility) := by
  have distinctClassNil : forall (kept : Volatility), kept ≠ volatility ->
      (segments.filter fun segment =>
        (segment.volatility == volatility) && (segment.volatility == kept)) =
        [] := by
    intro kept distinct
    refine List.filter_eq_nil_iff.mpr fun segment _ both => distinct ?_
    simp only [Bool.and_eq_true] at both
    exact (beq_iff_eq.mp both.2).symm.trans (beq_iff_eq.mp both.1)
  have sameClassSelf :
      (segments.filter fun segment =>
        (segment.volatility == volatility) &&
          (segment.volatility == volatility)) =
        segments.filter fun segment => segment.volatility == volatility :=
    List.filter_congr fun segment _ => Bool.and_self _
  unfold orderByVolatility
  rw [List.filter_flatMap]
  simp only [List.filter_filter, Volatility.all, List.flatMap_cons,
    List.flatMap_nil, List.append_nil]
  cases volatility
  case static =>
    rw [sameClassSelf, distinctClassNil .policy (by decide),
      distinctClassNil .session (by decide), distinctClassNil .live (by decide),
      distinctClassNil .turn (by decide)]
    simp only [List.append_nil]
  case policy =>
    rw [sameClassSelf, distinctClassNil .static (by decide),
      distinctClassNil .session (by decide), distinctClassNil .live (by decide),
      distinctClassNil .turn (by decide)]
    simp only [List.append_nil, List.nil_append]
  case session =>
    rw [sameClassSelf, distinctClassNil .static (by decide),
      distinctClassNil .policy (by decide), distinctClassNil .live (by decide),
      distinctClassNil .turn (by decide)]
    simp only [List.append_nil, List.nil_append]
  case live =>
    rw [sameClassSelf, distinctClassNil .static (by decide),
      distinctClassNil .policy (by decide),
      distinctClassNil .session (by decide),
      distinctClassNil .turn (by decide)]
    simp only [List.append_nil, List.nil_append]
  case turn =>
    rw [sameClassSelf, distinctClassNil .static (by decide),
      distinctClassNil .policy (by decide),
      distinctClassNil .session (by decide),
      distinctClassNil .live (by decide)]
    simp only [List.nil_append]

/-- The class projection of one class's filtered segments is constant, so
    reversing the filtered segments cannot move that projection. -/
theorem reverse_map_volatility_filter_class
    (segments : List (ContextSegment Addr)) (volatility : Volatility) :
    ((segments.filter fun segment =>
        segment.volatility == volatility).reverse).map
        ContextSegment.volatility =
      (segments.filter fun segment =>
        segment.volatility == volatility).map ContextSegment.volatility := by
  rw [List.map_reverse]
  have allSame : forall clazz,
      clazz ∈ (segments.filter fun segment =>
        segment.volatility == volatility).map ContextSegment.volatility ->
      clazz = volatility := by
    intro clazz member
    obtain ⟨segment, memberFilter, rfl⟩ := List.mem_map.mp member
    exact beq_iff_eq.mp (List.mem_filter.mp memberFilter).2
  rw [List.eq_replicate_of_mem allSame, List.reverse_replicate]

/-- F7: within every volatility class, assembly preserves the program's
    declared relative order — the per-class subsequence of the assembled
    value is the program-order rendering's. With the class-projection
    half this pins the assembled byte layout completely. -/
theorem f7_within_class_order :
    Laws.F7WithinClassOrder (Addr := Addr) (Value := Value) := by
  intro program valuation volatility
  unfold assemble
  exact order_by_volatility_filter_class (renderReads program valuation)
    volatility

end F7

section F11

variable {Entry : Type uV}

/-- Dedup membership is exactly input membership. -/
theorem dedup_mem [BEq Entry] [LawfulBEq Entry]
    {entries : List Entry} {entry : Entry} :
    entry ∈ dedup entries <-> entry ∈ entries := by
  induction entries with
  | nil => simp [dedup]
  | cons head tail inductionHypothesis =>
      by_cases headMember : head ∈ tail
      · rw [show dedup (head :: tail) = dedup tail by
          simp [dedup, headMember]]
        rw [inductionHypothesis]
        simp only [List.mem_cons]
        constructor
        · exact Or.inr
        · rintro (rfl | member)
          · exact headMember
          · exact member
      · rw [show dedup (head :: tail) = head :: dedup tail by
          simp [dedup, headMember]]
        simp only [List.mem_cons, inductionHypothesis]

/-- Dedup produces a duplicate-free list. -/
theorem dedup_nodup [BEq Entry] [LawfulBEq Entry] (entries : List Entry) :
    (dedup entries).Nodup := by
  induction entries with
  | nil => simp [dedup]
  | cons head tail inductionHypothesis =>
      by_cases headMember : head ∈ tail
      · rw [show dedup (head :: tail) = dedup tail by
          simp [dedup, headMember]]
        exact inductionHypothesis
      · rw [show dedup (head :: tail) = head :: dedup tail by
          simp [dedup, headMember]]
        exact List.nodup_cons.mpr
          ⟨fun member => headMember (dedup_mem.mp member),
            inductionHypothesis⟩

/-- The declared order is total. -/
theorem by_score_then_identity_total (score identity : Entry -> Nat)
    (left right : Entry) :
    (byScoreThenIdentity score identity left right ||
      byScoreThenIdentity score identity right left) = true := by
  simp only [byScoreThenIdentity, Bool.or_eq_true, Bool.and_eq_true,
    decide_eq_true_eq]
  omega

/-- The declared order is transitive. -/
theorem by_score_then_identity_trans (score identity : Entry -> Nat)
    (left middle right : Entry)
    (leftMiddle : byScoreThenIdentity score identity left middle = true)
    (middleRight : byScoreThenIdentity score identity middle right = true) :
    byScoreThenIdentity score identity left right = true := by
  simp only [byScoreThenIdentity, Bool.or_eq_true, Bool.and_eq_true,
    decide_eq_true_eq] at leftMiddle middleRight ⊢
  omega

/-- Mutual order forces equal identity bytes: with the named distinctness
    premise this is antisymmetry — the hard step the identity tie-break
    exists to discharge. -/
theorem by_score_then_identity_antisymm (score identity : Entry -> Nat)
    (left right : Entry)
    (leftRight : byScoreThenIdentity score identity left right = true)
    (rightLeft : byScoreThenIdentity score identity right left = true) :
    identity left = identity right := by
  simp only [byScoreThenIdentity, Bool.or_eq_true, Bool.and_eq_true,
    decide_eq_true_eq] at leftRight rightLeft
  omega

/-- Two sorted, duplicate-free lists with the same members are one list —
    the canonical presentation a support determines. Antisymmetry is
    demanded only on the first list's members, which is exactly where the
    named distinctness premise lands. -/
theorem sorted_nodup_eq_of_same_mem (le : Entry -> Entry -> Bool) :
    forall (left right : List Entry),
      (forall a, a ∈ left -> forall b, b ∈ left ->
        le a b = true -> le b a = true -> a = b) ->
      left.Pairwise (le · · = true) -> right.Pairwise (le · · = true) ->
      left.Nodup -> right.Nodup ->
      (forall entry, entry ∈ left <-> entry ∈ right) ->
      left = right
  | [], [], _, _, _, _, _, _ => rfl
  | [], head :: tail, _, _, _, _, _, sameMem =>
      absurd ((sameMem head).mpr (List.mem_cons_self))
        (List.not_mem_nil)
  | leftHead :: leftTail, [], _, _, _, _, _, sameMem =>
      absurd ((sameMem leftHead).mp (List.mem_cons_self))
        (List.not_mem_nil)
  | leftHead :: leftTail, rightHead :: rightTail, antisymm, sortedLeft,
      sortedRight, nodupLeft, nodupRight, sameMem => by
    obtain ⟨leftHeadLe, sortedLeftTail⟩ := List.pairwise_cons.mp sortedLeft
    obtain ⟨rightHeadLe, sortedRightTail⟩ := List.pairwise_cons.mp sortedRight
    obtain ⟨leftHeadAbsent, nodupLeftTail⟩ := List.nodup_cons.mp nodupLeft
    obtain ⟨rightHeadAbsent, nodupRightTail⟩ := List.nodup_cons.mp nodupRight
    have headsEqual : leftHead = rightHead := by
      rcases List.mem_cons.mp ((sameMem leftHead).mp
          (List.mem_cons_self)) with equal | leftHeadInRightTail
      · exact equal
      rcases List.mem_cons.mp ((sameMem rightHead).mpr
          (List.mem_cons_self)) with equal | rightHeadInLeftTail
      · exact equal.symm
      exact antisymm leftHead (List.mem_cons_self)
        rightHead (List.mem_cons_of_mem leftHead rightHeadInLeftTail)
        (leftHeadLe rightHead rightHeadInLeftTail)
        (rightHeadLe leftHead leftHeadInRightTail)
    subst headsEqual
    have tailSameMem : forall entry, entry ∈ leftTail <-> entry ∈ rightTail := by
      intro entry
      constructor
      · intro member
        rcases List.mem_cons.mp ((sameMem entry).mp
            (List.mem_cons_of_mem leftHead member)) with equal | inTail
        · exact absurd (equal ▸ member) leftHeadAbsent
        · exact inTail
      · intro member
        rcases List.mem_cons.mp ((sameMem entry).mpr
            (List.mem_cons_of_mem leftHead member)) with equal | inTail
        · exact absurd (equal ▸ member) rightHeadAbsent
        · exact inTail
    rw [sorted_nodup_eq_of_same_mem le leftTail rightTail
      (fun a aMember b bMember =>
        antisymm a (List.mem_cons_of_mem leftHead aMember)
          b (List.mem_cons_of_mem leftHead bMember))
      sortedLeftTail sortedRightTail nodupLeftTail nodupRightTail tailSameMem]

/-- F11, list half: top-k is a function of the delivered support —
    permutation and duplication of the anchored entry list cannot move
    it. -/
theorem f11_topk_of_support [BEq Entry] [LawfulBEq Entry]
    (score identity : Entry -> Nat) :
    Laws.F11TopKOfSupport (Entry := Entry) score identity := by
  intro k left right distinct same
  have sameMember : forall entry : Entry, entry ∈ left <-> entry ∈ right := by
    intro entry
    rw [<- List.contains_iff_mem, <- List.contains_iff_mem, same entry]
  have leftPerm :=
    List.mergeSort_perm (dedup left) (byScoreThenIdentity score identity)
  have rightPerm :=
    List.mergeSort_perm (dedup right) (byScoreThenIdentity score identity)
  unfold topK
  apply congrArg (List.take k)
  apply sorted_nodup_eq_of_same_mem (byScoreThenIdentity score identity)
  · intro a aMember b bMember leftLe rightLe
    exact distinct a (dedup_mem.mp (leftPerm.mem_iff.mp aMember))
      b (dedup_mem.mp (leftPerm.mem_iff.mp bMember))
      (by_score_then_identity_antisymm score identity a b leftLe rightLe)
  · exact List.pairwise_mergeSort
      (by_score_then_identity_trans score identity)
      (by_score_then_identity_total score identity) (dedup left)
  · exact List.pairwise_mergeSort
      (by_score_then_identity_trans score identity)
      (by_score_then_identity_total score identity) (dedup right)
  · exact leftPerm.nodup_iff.mpr (dedup_nodup left)
  · exact rightPerm.nodup_iff.mpr (dedup_nodup right)
  · intro entry
    rw [leftPerm.mem_iff, rightPerm.mem_iff, dedup_mem, dedup_mem]
    exact sameMember entry

/-- F11, state half: the answering state at an anchor is the resumed
    fold — exactly F3, named at the query seam. -/
theorem f11_state_of_anchor {State : Type uH} {Op : Type uV}
    (step : State -> Op -> State) (initial : State)
    (prefixOps suffixOps : List Op) :
    foldFrom step (fold step initial prefixOps) suffixOps =
      fold step initial (prefixOps ++ suffixOps) :=
  f3_resume_exact step initial prefixOps suffixOps

/-- The support fold: appending deliveries from a checkpointed support is
    list concatenation. -/
theorem append_entry_fold_from (state entries : List Entry) :
    foldFrom appendEntry state entries = state ++ entries := by
  induction entries generalizing state with
  | nil => simp [foldFrom]
  | cons entry entries inductionHypothesis =>
      show List.foldl appendEntry state (entry :: entries) =
        state ++ entry :: entries
      rw [List.foldl_cons]
      have tail := inductionHypothesis (appendEntry state entry)
      unfold foldFrom at tail
      rw [tail]
      simp [appendEntry]

/-- Bounded mutual containment yields support equality: the decidable
    bridge the concrete rows discharge by computation. -/
theorem same_delivered_of_mutual_contains [BEq Entry] [LawfulBEq Entry]
    {left right : List Entry}
    (leftWithin : left.all right.contains = true)
    (rightWithin : right.all left.contains = true) :
    SameDeliveredSet left right := by
  intro value
  rw [List.all_eq_true] at leftWithin rightWithin
  cases leftContains : left.contains value with
  | true =>
      rw [leftWithin value (List.contains_iff_mem.mp leftContains)]
  | false =>
      cases rightContains : right.contains value with
      | true =>
          rw [rightWithin value (List.contains_iff_mem.mp rightContains)]
            at leftContains
          cases leftContains
      | false => rfl

/-- F11, composed: the rendered answer at an anchored, resumed support is
    invariant under re-anchoring by F3 and under permutation/duplication
    of the delivered support — each half separately falsifiable, and each
    refuted separately in the committed controls. -/
theorem f11_query_deterministic [BEq Entry] [LawfulBEq Entry]
    (score identity : Entry -> Nat) (render : List Entry -> String) :
    Laws.F11QueryDeterministic (Entry := Entry) score identity render := by
  intro k prefixLeft suffixLeft prefixRight suffixRight distinct same
  apply congrArg render
  show topK score identity k
      (foldFrom appendEntry (fold appendEntry [] prefixLeft) suffixLeft) =
    topK score identity k
      (foldFrom appendEntry (fold appendEntry [] prefixRight) suffixRight)
  rw [f11_state_of_anchor, f11_state_of_anchor]
  have foldIsSupport : forall entries : List Entry,
      fold appendEntry [] entries = entries := by
    intro entries
    have := append_entry_fold_from ([] : List Entry) entries
    simpa [fold] using this
  rw [foldIsSupport, foldIsSupport]
  exact f11_topk_of_support score identity k
    (prefixLeft ++ suffixLeft) (prefixRight ++ suffixRight) distinct same

end F11

section JoinSemilattice

variable {alpha : Type uH} {sup : alpha -> alpha -> alpha}

/-- Reflexivity of the derived order, from idempotence alone. -/
theorem le_refl (idem : forall a, sup a a = a) (a : alpha) : supLe sup a a :=
  idem a

/-- Antisymmetry of the derived order, from commutativity alone. -/
theorem le_antisymm (comm : forall a b, sup a b = sup b a) {a b : alpha}
    (leftRight : supLe sup a b) (rightLeft : supLe sup b a) : a = b := by
  unfold supLe at leftRight rightLeft
  calc a = sup b a := rightLeft.symm
    _ = sup a b := comm b a
    _ = b := leftRight

/-- Transitivity of the derived order, from associativity alone. -/
theorem le_trans
    (assoc : forall a b c, sup (sup a b) c = sup a (sup b c))
    {a b c : alpha} (ab : supLe sup a b) (bc : supLe sup b c) :
    supLe sup a c := by
  unfold supLe at ab bc ⊢
  calc sup a c = sup a (sup b c) := by rw [bc]
    _ = sup (sup a b) c := (assoc a b c).symm
    _ = sup b c := by rw [ab]
    _ = c := bc

/-- The join is an upper bound of its left argument. -/
theorem le_sup_left
    (assoc : forall a b c, sup (sup a b) c = sup a (sup b c))
    (idem : forall a, sup a a = a) (a b : alpha) :
    supLe sup a (sup a b) := by
  unfold supLe
  calc sup a (sup a b) = sup (sup a a) b := (assoc a a b).symm
    _ = sup a b := by rw [idem a]

/-- The join is an upper bound of its right argument. -/
theorem le_sup_right (comm : forall a b, sup a b = sup b a)
    (assoc : forall a b c, sup (sup a b) c = sup a (sup b c))
    (idem : forall a, sup a a = a) (a b : alpha) :
    supLe sup b (sup a b) := by
  unfold supLe
  calc sup b (sup a b) = sup b (sup b a) := by rw [comm a b]
    _ = sup (sup b b) a := (assoc b b a).symm
    _ = sup b a := by rw [idem b]
    _ = sup a b := comm b a

/-- Minimality: the join is below every common upper bound — from
    associativity alone. -/
theorem sup_le
    (assoc : forall a b c, sup (sup a b) c = sup a (sup b c))
    {a b c : alpha} (ac : supLe sup a c) (bc : supLe sup b c) :
    supLe sup (sup a b) c := by
  unfold supLe at ac bc ⊢
  calc sup (sup a b) c = sup a (sup b c) := assoc a b c
    _ = sup a c := by rw [bc]
    _ = c := ac

/-- Absorbing an observation only grows the local join: every absorb is an
    inflation, so a replica's current state is a lattice lower bound of
    every state it can reach. -/
theorem absorb_inflationary
    (assoc : forall a b c, sup (sup a b) c = sup a (sup b c))
    (idem : forall a, sup a a = a) (replica observed : alpha) :
    supLe sup replica (sup replica observed) :=
  le_sup_left assoc idem replica observed

/-- The whole join-semilattice package from the three ACI facts — the
    `SemilatticeSup.mk'` construction, transliterated. -/
theorem join_semilattice_of_aci (comm : forall a b, sup a b = sup b a)
    (assoc : forall a b c, sup (sup a b) c = sup a (sup b c))
    (idem : forall a, sup a a = a) : JoinSemilatticePackage sup :=
  ⟨le_refl idem,
    fun _ _ => le_antisymm comm,
    fun _ _ _ => le_trans assoc,
    le_sup_left assoc idem,
    le_sup_right comm assoc idem,
    fun _ _ _ => sup_le assoc⟩

end JoinSemilattice

section CellSemilattice

variable {Holder : Type uH} {Value : Type uV}
variable {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
variable [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]

/-- F1, semilattice half: the cell merge instantiates the general
    package. -/
theorem f1_cell_join_semilattice : Laws.F1CellJoinSemilattice (cmp := cmp) :=
  join_semilattice_of_aci cell_merge_comm cell_merge_assoc cell_merge_idem

/-- The replica lower bound at the cell carrier: a node's current cell is
    below every merge with observed evidence. -/
theorem cell_absorb_inflationary (replica observed : Cell Holder Value cmp) :
    supLe Cell.merge replica (Cell.merge replica observed) :=
  absorb_inflationary cell_merge_assoc cell_merge_idem replica observed

/-- The derived cell order is exactly observation-set inclusion — the
    bridge between the semilattice reading and the membership reading. -/
theorem cell_le_iff_subset {left right : Cell Holder Value cmp} :
    supLe Cell.merge left right <->
      forall observation, observation ∈ left -> observation ∈ right := by
  constructor
  · intro le observation member
    rw [← le]
    simp only [Cell.merge, Std.ExtTreeSet.mem_union_iff]
    exact Or.inl member
  · intro subset
    unfold supLe
    apply Std.ExtTreeSet.ext_mem
    intro observation
    simp only [Cell.merge, Std.ExtTreeSet.mem_union_iff]
    constructor
    · exact fun member => member.elim (subset observation) id
    · exact Or.inr

end CellSemilattice

section F12Directory

variable {Petname : Type uH} {Digest : Type uV}
variable {cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering}
variable [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]

theorem directory_merge_comm (left right : Directory Petname Digest cmp) :
    Directory.merge left right = Directory.merge right left := by
  apply Std.ExtTreeSet.ext_mem
  intro binding
  simp only [Directory.merge, Std.ExtTreeSet.mem_union_iff]
  exact or_comm

theorem directory_merge_assoc (left middle right : Directory Petname Digest cmp) :
    Directory.merge (Directory.merge left middle) right =
      Directory.merge left (Directory.merge middle right) := by
  apply Std.ExtTreeSet.ext_mem
  intro binding
  simp only [Directory.merge, Std.ExtTreeSet.mem_union_iff]
  exact or_assoc

theorem directory_merge_idem (directory : Directory Petname Digest cmp) :
    Directory.merge directory directory = directory := by
  apply Std.ExtTreeSet.ext_mem
  intro binding
  simp only [Directory.merge, Std.ExtTreeSet.mem_union_iff]
  constructor
  · exact fun member => member.elim id id
  · exact Or.inl

/-- F12: componentwise union supplies the directory's ACI join — the
    F1-for-maps algebra half. -/
theorem f12_directory_merge_aci : Laws.F12DirectoryMergeACI (cmp := cmp) :=
  ⟨directory_merge_comm, directory_merge_assoc, directory_merge_idem⟩

/-- F12: the binding set determines the directory. -/
theorem f12_directory_extensional :
    Laws.F12DirectoryExtensional (cmp := cmp) := by
  intro left right same
  apply Std.ExtTreeSet.ext_mem
  exact same

/-- F12: equal bind-event support yields one directory state, independent
    of arrival order and multiplicity. -/
theorem f12_directory_convergence [BEq (Binding Petname Digest)]
    [Std.LawfulBEqCmp cmp] :
    Laws.F12DirectoryConvergence (cmp := cmp) := by
  intro left right same
  apply Std.ExtTreeSet.ext_mem
  intro binding
  simp only [foldBindings, Std.ExtTreeSet.mem_ofList]
  rw [same binding]

omit [Std.LawfulEqCmp cmp] in
/-- The componentwise reading of the graph union: at every name, the
    bindings of a merged directory are the union of the two sides'
    bindings — merge really is componentwise union of the induced maps. -/
theorem directory_merge_bindings (left right : Directory Petname Digest cmp)
    (name : Petname) (digest : Digest) :
    Directory.BoundTo (Directory.merge left right) name digest <->
      Directory.BoundTo left name digest \/
        Directory.BoundTo right name digest := by
  simp only [Directory.BoundTo, Directory.merge, Std.ExtTreeSet.mem_union_iff]

/-- F12, semilattice half: the directory join instantiates the same
    general package as the cell. -/
theorem f12_directory_join_semilattice :
    Laws.F12DirectoryJoinSemilattice (cmp := cmp) :=
  join_semilattice_of_aci directory_merge_comm directory_merge_assoc
    directory_merge_idem

/-- The replica lower bound at the directory carrier. -/
theorem directory_absorb_inflationary
    (replica observed : Directory Petname Digest cmp) :
    supLe Directory.merge replica (Directory.merge replica observed) :=
  absorb_inflationary directory_merge_assoc directory_merge_idem
    replica observed

/-- Projection membership: a digest appears among a name's bound digests
    exactly when the directory binds the pair. -/
theorem bound_digests_mem [BEq Petname] [LawfulBEq Petname]
    {directory : Directory Petname Digest cmp} {name : Petname}
    {digest : Digest} :
    digest ∈ boundDigests directory name <->
      Directory.BoundTo directory name digest := by
  unfold boundDigests Directory.BoundTo
  constructor
  · intro member
    obtain ⟨binding, memberFilter, projection⟩ := List.mem_map.mp member
    obtain ⟨memberList, nameBeq⟩ := List.mem_filter.mp memberFilter
    have nameEq : binding.1 = name := beq_iff_eq.mp nameBeq
    have pairEq : (name, digest) = binding := by
      cases binding
      cases projection
      cases nameEq
      rfl
    rw [pairEq]
    exact Std.ExtTreeSet.mem_toList.mp memberList
  · intro member
    apply List.mem_map.mpr
    refine ⟨(name, digest),
      List.mem_filter.mpr ⟨Std.ExtTreeSet.mem_toList.mpr member, ?_⟩, rfl⟩
    exact beq_iff_eq.mpr rfl

/-- Candidate membership is exactly binding membership: the canonical
    listing forgets arrival order, multiplicity, and tree shape. -/
theorem candidates_mem [BEq Petname] [LawfulBEq Petname]
    [BEq Digest] [LawfulBEq Digest]
    {identity : Digest -> Nat} {directory : Directory Petname Digest cmp}
    {name : Petname} {digest : Digest} :
    digest ∈ candidates identity directory name <->
      Directory.BoundTo directory name digest := by
  unfold candidates
  rw [(List.mergeSort_perm _ (byIdentity identity)).mem_iff, dedup_mem,
    bound_digests_mem]

/-- Equal per-name bindings give one canonical candidate listing — the
    directory half of resolution's support determinism. Antisymmetry of
    the identity order is demanded only on the bound digests, which is
    where the named distinctness premise lands. -/
theorem candidates_of_same_bound [BEq Petname] [LawfulBEq Petname]
    [BEq Digest] [LawfulBEq Digest]
    {identity : Digest -> Nat} {dir dir' : Directory Petname Digest cmp}
    {name : Petname}
    (distinct : IdentityDistinct identity (boundDigests dir name))
    (same : forall digest, Directory.BoundTo dir name digest <->
      Directory.BoundTo dir' name digest) :
    candidates identity dir name = candidates identity dir' name := by
  have leftPerm := List.mergeSort_perm (dedup (boundDigests dir name))
    (byIdentity identity)
  have rightPerm := List.mergeSort_perm (dedup (boundDigests dir' name))
    (byIdentity identity)
  unfold candidates
  apply sorted_nodup_eq_of_same_mem (byIdentity identity)
  · intro a aMember b bMember ab ba
    exact distinct a (dedup_mem.mp (leftPerm.mem_iff.mp aMember))
      b (dedup_mem.mp (leftPerm.mem_iff.mp bMember))
      (by_score_then_identity_antisymm (fun _ => 0) identity a b ab ba)
  · exact List.pairwise_mergeSort
      (by_score_then_identity_trans (fun _ => 0) identity)
      (by_score_then_identity_total (fun _ => 0) identity) _
  · exact List.pairwise_mergeSort
      (by_score_then_identity_trans (fun _ => 0) identity)
      (by_score_then_identity_total (fun _ => 0) identity) _
  · exact leftPerm.nodup_iff.mpr (dedup_nodup _)
  · exact rightPerm.nodup_iff.mpr (dedup_nodup _)
  · intro digest
    rw [leftPerm.mem_iff, rightPerm.mem_iff, dedup_mem, dedup_mem,
      bound_digests_mem, bound_digests_mem]
    exact same digest

/-- A sorted, duplicate-free listing holding exactly the bound digests IS
    the canonical candidate listing. This is the decide-friendly route to
    ground candidate facts: the canonical sort itself is opaque to kernel
    reduction, while membership, sortedness, and duplicate-freedom of a
    literal listing all compute. -/
theorem candidates_eq_canonical [BEq Petname] [LawfulBEq Petname]
    [BEq Digest] [LawfulBEq Digest]
    {identity : Digest -> Nat} {dir : Directory Petname Digest cmp}
    {name : Petname} {listing : List Digest}
    (distinct : IdentityDistinct identity (boundDigests dir name))
    (sortedListing : listing.Pairwise
      (fun left right => byIdentity identity left right = true))
    (nodupListing : listing.Nodup)
    (sameMem : forall digest, digest ∈ listing <->
      Directory.BoundTo dir name digest) :
    candidates identity dir name = listing := by
  have leftPerm := List.mergeSort_perm (dedup (boundDigests dir name))
    (byIdentity identity)
  unfold candidates
  apply sorted_nodup_eq_of_same_mem (byIdentity identity)
  · intro a aMember b bMember ab ba
    exact distinct a (dedup_mem.mp (leftPerm.mem_iff.mp aMember))
      b (dedup_mem.mp (leftPerm.mem_iff.mp bMember))
      (by_score_then_identity_antisymm (fun _ => 0) identity a b ab ba)
  · exact List.pairwise_mergeSort
      (by_score_then_identity_trans (fun _ => 0) identity)
      (by_score_then_identity_total (fun _ => 0) identity) _
  · exact sortedListing
  · exact leftPerm.nodup_iff.mpr (dedup_nodup _)
  · exact nodupListing
  · intro digest
    rw [leftPerm.mem_iff, dedup_mem, bound_digests_mem]
    exact (sameMem digest).symm

end F12Directory

section F12Resolution

variable {Digest : Type uV}

/-- No greatest seal means no seal was observed. -/
theorem greatest_seal_none_iff {seals : List (Seal Digest)} :
    greatestSeal seals = none <-> seals = [] := by
  cases seals with
  | nil => simp [greatestSeal]
  | cons arrival rest =>
      simp only [greatestSeal]
      cases hs : greatestSeal rest with
      | none => simp
      | some best => by_cases lt : arrival.token < best.token <;> simp [lt]

/-- The greatest seal is an observed seal. -/
theorem greatest_seal_mem {seals : List (Seal Digest)} {top : Seal Digest}
    (h : greatestSeal seals = some top) : top ∈ seals := by
  induction seals generalizing top with
  | nil => simp [greatestSeal] at h
  | cons arrival rest inductionHypothesis =>
      cases hs : greatestSeal rest with
      | none =>
          simp only [greatestSeal, hs] at h
          obtain rfl := Option.some.inj h
          exact List.mem_cons_self
      | some best =>
          simp only [greatestSeal, hs] at h
          by_cases lt : arrival.token < best.token
          · rw [if_pos lt] at h
            obtain rfl := Option.some.inj h
            exact List.mem_cons_of_mem arrival (inductionHypothesis hs)
          · rw [if_neg lt] at h
            obtain rfl := Option.some.inj h
            exact List.mem_cons_self

/-- Every observed token is bounded by the greatest seal's token. -/
theorem greatest_seal_is_ub {seals : List (Seal Digest)} {top : Seal Digest}
    (h : greatestSeal seals = some top) :
    forall observed, observed ∈ seals -> observed.token <= top.token := by
  induction seals generalizing top with
  | nil => intro observed member; simp at member
  | cons arrival rest inductionHypothesis =>
      intro observed member
      rcases List.mem_cons.mp member with rfl | member
      · cases hs : greatestSeal rest with
        | none =>
            simp only [greatestSeal, hs] at h
            obtain rfl := Option.some.inj h
            exact Nat.le_refl _
        | some best =>
            simp only [greatestSeal, hs] at h
            by_cases lt : observed.token < best.token
            · rw [if_pos lt] at h
              obtain rfl := Option.some.inj h
              exact Nat.le_of_lt lt
            · rw [if_neg lt] at h
              obtain rfl := Option.some.inj h
              exact Nat.le_refl _
      · cases hs : greatestSeal rest with
        | none =>
            have empty := greatest_seal_none_iff.mp hs
            subst empty
            simp at member
        | some best =>
            have observedLe := inductionHypothesis hs observed member
            simp only [greatestSeal, hs] at h
            by_cases lt : arrival.token < best.token
            · rw [if_pos lt] at h
              obtain rfl := Option.some.inj h
              exact observedLe
            · rw [if_neg lt] at h
              obtain rfl := Option.some.inj h
              exact Nat.le_trans observedLe (Nat.le_of_not_lt lt)

/-- Under the well-fenced premise the greatest seal is a function of the
    observed seal support: arrival order and multiplicity cannot move it.
    Without the premise two seals at one token make the outcome
    schedule-dependent — the committed control demonstrates exactly
    that. -/
theorem greatest_seal_of_support [BEq (Seal Digest)] [LawfulBEq (Seal Digest)]
    {left right : List (Seal Digest)}
    (wf : SealsWellFenced left) (same : SameDeliveredSet left right) :
    greatestSeal left = greatestSeal right := by
  have memIff : forall observed : Seal Digest,
      observed ∈ left <-> observed ∈ right := by
    intro observed
    constructor
    · intro member
      exact List.contains_iff_mem.mp
        (by rw [← same observed]; exact List.contains_iff_mem.mpr member)
    · intro member
      exact List.contains_iff_mem.mp
        (by rw [same observed]; exact List.contains_iff_mem.mpr member)
  cases hl : greatestSeal left with
  | none =>
      have empty := greatest_seal_none_iff.mp hl
      subst empty
      cases hr : greatestSeal right with
      | none => rfl
      | some topRight =>
          have memberRight := greatest_seal_mem hr
          have absurdMember : topRight ∈ ([] : List (Seal Digest)) :=
            (memIff topRight).mpr memberRight
          simp at absurdMember
  | some topLeft =>
      cases hr : greatestSeal right with
      | none =>
          have empty := greatest_seal_none_iff.mp hr
          subst empty
          have absurdMember : topLeft ∈ ([] : List (Seal Digest)) :=
            (memIff topLeft).mp (greatest_seal_mem hl)
          simp at absurdMember
      | some topRight =>
          have memberLeft : topLeft ∈ left := greatest_seal_mem hl
          have memberRightInLeft : topRight ∈ left :=
            (memIff topRight).mpr (greatest_seal_mem hr)
          have leftLe : topLeft.token <= topRight.token :=
            greatest_seal_is_ub hr topLeft ((memIff topLeft).mp memberLeft)
          have rightLe : topRight.token <= topLeft.token :=
            greatest_seal_is_ub hl topRight memberRightInLeft
          exact congrArg some
            (wf topLeft memberLeft topRight memberRightInLeft
              (Nat.le_antisymm leftLe rightLe))

/-- A seal strictly below the greatest observed token cannot displace
    it. -/
theorem stale_seal_inert {stale top : Seal Digest} {seals : List (Seal Digest)}
    (h : greatestSeal seals = some top) (strict : stale.token < top.token) :
    greatestSeal (stale :: seals) = some top := by
  simp only [greatestSeal, h]
  rw [if_pos strict]

section ResolutionLaws

variable {Petname : Type uH}
variable {cmp : Binding Petname Digest -> Binding Petname Digest -> Ordering}
variable [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]
variable [BEq Petname] [LawfulBEq Petname] [BEq Digest] [LawfulBEq Digest]

omit [Std.LawfulEqCmp cmp] [LawfulBEq Petname] [LawfulBEq Digest] in
/-- Observing a stale-token rebind changes nothing: resolution over the
    seal history with the stale observation is resolution without it. Why
    a stale token can never land in the register in the first place is
    F5's I1/I2 — cited, never restated here. -/
theorem stale_token_rebind_inert {identity : Digest -> Nat}
    {directory : Directory Petname Digest cmp} {name : Petname}
    {stale top : Seal Digest} {seals : List (Seal Digest)}
    (h : greatestSeal seals = some top) (strict : stale.token < top.token) :
    resolve identity directory name (stale :: seals) =
      resolve identity directory name seals := by
  simp only [resolve, stale_seal_inert h strict, h]

/-- F12, support half: resolution is a function of the per-name binding
    support and the seal support. -/
theorem f12_resolution_of_support [BEq (Seal Digest)] [LawfulBEq (Seal Digest)]
    (identity : Digest -> Nat) :
    Laws.F12ResolutionOfSupport (cmp := cmp) identity := by
  intro dir dir' name seals seals' distinct dirSame wf sealSame
  unfold resolve
  rw [greatest_seal_of_support wf sealSame,
    candidates_of_same_bound distinct dirSame]

omit [Std.LawfulEqCmp cmp] [LawfulBEq Petname] [LawfulBEq Digest] in
/-- F12, arbitration half: with seals observed, the greatest observed
    token decides. -/
theorem f12_greatest_seal_wins (identity : Digest -> Nat) :
    Laws.F12GreatestSealWins (cmp := cmp) identity := by
  intro dir name seals _wf nonempty
  cases h : greatestSeal seals with
  | none => exact absurd (greatest_seal_none_iff.mp h) nonempty
  | some top =>
      refine ⟨top, greatest_seal_mem h, greatest_seal_is_ub h, ?_⟩
      simp only [resolve, h]

omit [Std.LawfulEqCmp cmp] [LawfulBEq Petname] [LawfulBEq Digest] in
/-- F12, verdict characterization: each of the four resolution rows holds
    exactly at its stated condition. This is computation accounting over
    the arrival schedule, deliberately premise-free — without
    `SealsWellFenced`, a tied top token resolves to the fold's first-kept
    pick, visibly schedule-dependent, and the drop-seals-well-fenced
    control exhibits it; the order-free meaning law is
    `f12_greatest_seal_wins` under the premise. -/
theorem f12_resolution_characterization (identity : Digest -> Nat) :
    Laws.F12ResolutionCharacterization (cmp := cmp) identity := by
  intro dir name seals
  refine ⟨?_, ?_, ?_, ?_⟩
  · constructor
    · intro h
      cases hg : greatestSeal seals with
      | some top =>
          simp only [resolve, hg] at h
          injection h
      | none =>
          refine ⟨greatest_seal_none_iff.mp hg, ?_⟩
          simp only [resolve, hg] at h
          split at h
          · assumption
          · injection h
          · injection h
    · rintro ⟨sealsEmpty, candidatesEmpty⟩
      subst sealsEmpty
      simp only [resolve, greatestSeal, candidatesEmpty]
  · intro digest
    constructor
    · intro h
      cases hg : greatestSeal seals with
      | some top =>
          simp only [resolve, hg] at h
          injection h
      | none =>
          refine ⟨greatest_seal_none_iff.mp hg, ?_⟩
          simp only [resolve, hg] at h
          split at h
          · injection h
          · rename_i single singleEq
            injection h with fieldEq
            rw [singleEq, fieldEq]
          · injection h
    · rintro ⟨sealsEmpty, candidatesSingleton⟩
      subst sealsEmpty
      simp only [resolve, greatestSeal, candidatesSingleton]
  · intro listing
    constructor
    · intro h
      cases hg : greatestSeal seals with
      | some top =>
          simp only [resolve, hg] at h
          injection h
      | none =>
          refine ⟨greatest_seal_none_iff.mp hg, ?_⟩
          simp only [resolve, hg] at h
          split at h
          · injection h
          · injection h
          · rename_i first second rest listingEq
            injection h with listEq
            refine ⟨?_, ?_⟩
            · rw [listingEq]
              exact listEq
            · rw [← listEq]
              simp only [List.length_cons]
              omega
    · rintro ⟨sealsEmpty, candidatesListing, twoOrMore⟩
      subst sealsEmpty
      simp only [resolve, greatestSeal, candidatesListing]
      cases listing with
      | nil => simp at twoOrMore
      | cons first rest =>
          cases rest with
          | nil => simp at twoOrMore
          | cons second rest => rfl
  · intro token digest
    constructor
    · intro h
      cases hg : greatestSeal seals with
      | none =>
          simp only [resolve, hg] at h
          split at h
          · injection h
          · injection h
          · injection h
      | some top =>
          simp only [resolve, hg] at h
          injection h with tokenEq digestEq
          exact ⟨top, rfl, tokenEq, digestEq⟩
    · rintro ⟨top, hg, tokenEq, digestEq⟩
      subst tokenEq
      subst digestEq
      simp only [resolve, hg]

end ResolutionLaws

end F12Resolution

section F10

variable {Holder : Type uH} {Value : Type uV}
variable {cmp : Observation Holder Value -> Observation Holder Value -> Ordering}
variable [Std.TransCmp cmp] [Std.LawfulEqCmp cmp]

/-- F10, stability: every production of the closed grammar reads its
    component upward, so componentwise growth preserves it. The evidence
    and cell cases go through the semilattice bridge — the derived order
    is membership inclusion. -/
theorem f10_stability : Laws.F10Stability (cmp := cmp) := by
  intro predicate before after grow now
  cases predicate with
  | evidenceAppears pattern =>
      intro observation member
      exact cell_le_iff_subset.mp grow.evidence observation
        (now observation member)
  | cellReaches cell threshold =>
      intro observation member
      exact cell_le_iff_subset.mp (grow.cells cell) observation
        (now observation member)
  | holeReaches hole target =>
      exact Nat.le_trans now (grow.holes hole)
  | outcomeLanded work =>
      exact grow.landed work now
  | headAdvancedPast position =>
      exact Nat.lt_of_lt_of_le now grow.head

omit [Std.LawfulEqCmp cmp] in
/-- The executable evaluation agrees with the denotation. -/
theorem holds_iff_holds_bool (predicate : TriggerPredicate Holder Value)
    (state : FabricState Holder Value cmp) :
    holds predicate state <-> holdsBool predicate state = true := by
  cases predicate with
  | evidenceAppears pattern =>
      show (forall observation, observation ∈ pattern ->
          observation ∈ state.evidence) <->
        (pattern.all fun observation =>
          state.evidence.contains observation) = true
      simp [List.all_eq_true]
  | cellReaches cell threshold =>
      show (forall observation, observation ∈ threshold ->
          observation ∈ state.cells cell) <->
        (threshold.all fun observation =>
          (state.cells cell).contains observation) = true
      simp [List.all_eq_true]
  | holeReaches hole target =>
      show target.rank <= (state.holes hole).rank <->
        decide (target.rank <= (state.holes hole).rank) = true
      simp
  | outcomeLanded work =>
      show work ∈ state.landed <-> state.landed.contains work = true
      exact Std.ExtTreeSet.mem_iff_contains
  | headAdvancedPast position =>
      show position < state.head <-> decide (position < state.head) = true
      simp

/-- Growth can only enable more hints: the enabled declaration set is
    monotone along the fabric order — the no-un-fire reading of
    stability at the trigger-set level. -/
theorem enabled_declarations_monotone
    (triggers : List (Trigger Holder Value))
    {before after : FabricState Holder Value cmp}
    (grow : FabricState.Le before after) :
    forall declaration,
      declaration ∈ enabledDeclarations triggers before ->
        declaration ∈ enabledDeclarations triggers after := by
  intro declaration member
  unfold enabledDeclarations at member ⊢
  obtain ⟨trigger, memberFilter, projection⟩ := List.mem_map.mp member
  obtain ⟨memberList, holdsBefore⟩ := List.mem_filter.mp memberFilter
  apply List.mem_map.mpr
  refine ⟨trigger, List.mem_filter.mpr ⟨memberList, ?_⟩, projection⟩
  exact (holds_iff_holds_bool trigger.predicate after).mp
    (f10_stability trigger.predicate before after grow
      ((holds_iff_holds_bool trigger.predicate before).mpr holdsBefore))

/-- F10, hints: equal delivered evidence support gives one enabled
    declaration set — the F2 convergence carried to the trigger seam. -/
theorem f10_hints_of_support [BEq (Observation Holder Value)]
    [Std.LawfulBEqCmp cmp] :
    Laws.F10HintsOfSupport (cmp := cmp) := by
  intro triggers left right cells holes landed head same
  rw [f2_trace_invariant left right same]

end F10

section C7

/-- An admitted work digest ranks strictly inside the ledger. -/
theorem admission_rank_lt_length {ledger : List ActionDeclaration}
    {work : Nat}
    (member : exists declaration,
      declaration ∈ ledger /\ declaration.work = work) :
    admissionRank ledger work < ledger.length := by
  induction ledger with
  | nil =>
      obtain ⟨declaration, memberNil, _⟩ := member
      simp at memberNil
  | cons head ledger inductionHypothesis =>
      simp only [admissionRank]
      by_cases hit : head.work == work
      · rw [if_pos hit]
        simp only [List.length_cons]
        omega
      · rw [if_neg hit]
        obtain ⟨declaration, memberCons, workEq⟩ := member
        rcases List.mem_cons.mp memberCons with rfl | memberTail
        · exact absurd (beq_iff_eq.mpr workEq) hit
        · have := inductionHypothesis ⟨declaration, memberTail, workEq⟩
          simp only [List.length_cons]
          omega

/-- Every pin of an admitted declaration is an admitted work digest. -/
theorem admitted_pins_have_admitted_works
    {ledger : List ActionDeclaration} (admission : Admission ledger)
    {child : ActionDeclaration} (member : child ∈ ledger)
    {pin : Nat} (pinned : pin ∈ child.pins) :
    exists prior, prior ∈ ledger /\ prior.work = pin := by
  induction admission with
  | empty => simp at member
  | admit rest declaration admission pinsAdmitted fresh inductionHypothesis =>
      rcases List.mem_cons.mp member with rfl | memberRest
      · obtain ⟨prior, priorMember, priorWork⟩ := pinsAdmitted pin pinned
        exact ⟨prior, List.mem_cons_of_mem _ priorMember, priorWork⟩
      · obtain ⟨prior, priorMember, priorWork⟩ :=
          inductionHypothesis memberRest
        exact ⟨prior, List.mem_cons_of_mem _ priorMember, priorWork⟩

/-- Pins descend strictly in admission rank: a declaration only ever
    pins digests admitted strictly earlier. This is the index embedding
    that carries well-foundedness. -/
theorem pin_rank_lt {ledger : List ActionDeclaration}
    (admission : Admission ledger) {parent child : ActionDeclaration}
    (pins : PinsWithin ledger parent child) :
    admissionRank ledger parent.work < admissionRank ledger child.work := by
  induction admission with
  | empty =>
      obtain ⟨childMember, _, _⟩ := pins
      simp at childMember
  | admit rest declaration admission pinsAdmitted fresh inductionHypothesis =>
      obtain ⟨childMember, parentMember, pinned⟩ := pins
      rcases List.mem_cons.mp childMember with rfl | childInRest
      · have parentInRest : parent ∈ rest := by
          rcases List.mem_cons.mp parentMember with rfl | parentInRest
          · obtain ⟨prior, priorMember, priorWork⟩ :=
              pinsAdmitted parent.work pinned
            exact absurd priorWork (fresh prior priorMember)
          · exact parentInRest
        have headHit : (child.work == child.work) = true :=
          beq_iff_eq.mpr rfl
        have headMiss : ¬ ((child.work == parent.work) = true) := by
          intro equal
          exact fresh parent parentInRest (beq_iff_eq.mp equal).symm
        simp only [admissionRank]
        rw [if_pos headHit, if_neg headMiss]
        exact admission_rank_lt_length ⟨parent, parentInRest, rfl⟩
      · have parentInRest : parent ∈ rest := by
          rcases List.mem_cons.mp parentMember with rfl | parentInRest
          · obtain ⟨prior, priorMember, priorWork⟩ :=
              admitted_pins_have_admitted_works admission childInRest pinned
            exact absurd priorWork (fresh prior priorMember)
          · exact parentInRest
        have parentMiss : ¬ ((declaration.work == parent.work) = true) := by
          intro equal
          exact fresh parent parentInRest (beq_iff_eq.mp equal).symm
        have childMiss : ¬ ((declaration.work == child.work) = true) := by
          intro equal
          exact fresh child childInRest (beq_iff_eq.mp equal).symm
        simp only [admissionRank]
        rw [if_neg parentMiss, if_neg childMiss]
        exact inductionHypothesis ⟨childInRest, parentInRest, pinned⟩

/-- C7: the pin relation of an admitted ledger is well-founded — the
    admission-rank embedding pulls `Nat`'s order back along the pins. -/
theorem c7_pin_well_founded : Laws.C7PinWellFounded := by
  intro ledger admission
  exact Subrelation.wf
    (fun {parent child} pins => pin_rank_lt admission pins)
    (InvImage.wf
      (fun (declaration : ActionDeclaration) =>
        admissionRank ledger declaration.work)
      Nat.lt_wfRel.wf)

/-- No admitted declaration pins itself: the rank embedding refutes the
    one-step cycle directly. -/
theorem c7_pin_irrefl {ledger : List ActionDeclaration}
    (admission : Admission ledger) (declaration : ActionDeclaration) :
    ¬ PinsWithin ledger declaration declaration :=
  fun pins => absurd (pin_rank_lt admission pins) (Nat.lt_irrefl _)

end C7

section Compaction

variable {State : Type uH} {Op : Type uV}

/-- Resuming a fold's anchor from the compaction state reconstructs the
    anchor state exactly: the compaction pair plus the retained prefix up
    to the anchor is the anchor. This is where `upTo <= floor` is
    load-bearing — past the floor there is no anchor left to
    reconstruct. -/
theorem compact_preserves_anchor_state (step : State -> Op -> State)
    (initial : State) (upTo floor : Nat) (trace : List Op)
    (below : upTo <= floor) :
    foldFrom step (fold step initial (trace.take upTo))
        ((trace.drop upTo).take (floor - upTo)) =
      fold step initial (trace.take floor) := by
  have splitTake : trace.take floor =
      trace.take upTo ++ (trace.drop upTo).take (floor - upTo) := by
    rw [← List.take_add, Nat.add_sub_cancel' below]
  rw [splitTake]
  exact f3_resume_exact step initial (trace.take upTo)
    ((trace.drop upTo).take (floor - upTo))

/-- F3's compaction corollary: at or below a deployed fold's anchor
    floor, compaction preserves the fold's resumed terminal state. -/
theorem compact_below_floor_preserves_resumption
    (step : State -> Op -> State) (initial : State) :
    Laws.F3CompactBelowFloor step initial := by
  intro upTo floor trace below
  rw [List.drop_drop, Nat.add_sub_cancel' below]
  calc foldFrom step (fold step initial (trace.take floor))
        (trace.drop floor)
      = fold step initial (trace.take floor ++ trace.drop floor) :=
        f3_resume_exact step initial (trace.take floor) (trace.drop floor)
    _ = fold step initial trace := by rw [List.take_append_drop]

/-- The horizon really is the minimum: it sits at or below every
    deployed anchor floor. -/
theorem minimum_floor_le {floor : Nat} {floors : List Nat} :
    forall anchor, anchor ∈ floor :: floors ->
      minimumFloor floor floors <= anchor := by
  induction floors generalizing floor with
  | nil =>
      intro anchor member
      rcases List.mem_cons.mp member with rfl | member
      · exact Nat.le_refl _
      · simp at member
  | cons head tail inductionHypothesis =>
      intro anchor member
      have unfoldMin : minimumFloor floor (head :: tail) =
          Nat.min head (minimumFloor floor tail) := rfl
      rcases List.mem_cons.mp member with rfl | member
      · rw [unfoldMin]
        exact Nat.le_trans (Nat.min_le_right _ _)
          (inductionHypothesis anchor List.mem_cons_self)
      · rcases List.mem_cons.mp member with rfl | member
        · rw [unfoldMin]
          exact Nat.min_le_left _ _
        · rw [unfoldMin]
          exact Nat.le_trans (Nat.min_le_right _ _)
            (inductionHypothesis anchor
              (List.mem_cons_of_mem _ member))

/-- Compaction at or below the horizon — the minimum anchor floor across
    every deployed fold — preserves every deployed fold's resumed
    terminal state. `Retention.horizon` serves this bound; compaction
    past it is refused, not warned about. -/
theorem compact_below_horizon_preserves_resumption
    (step : State -> Op -> State) (initial : State)
    (upTo floor : Nat) (floors : List Nat) (trace : List Op)
    (below : upTo <= minimumFloor floor floors) :
    forall anchor, anchor ∈ floor :: floors ->
      foldFrom step (fold step initial (trace.take anchor))
          ((trace.drop upTo).drop (anchor - upTo)) =
        fold step initial trace :=
  fun anchor member =>
    compact_below_floor_preserves_resumption step initial upTo anchor trace
      (Nat.le_trans below (minimum_floor_le anchor member))

end Compaction


end Fabric
