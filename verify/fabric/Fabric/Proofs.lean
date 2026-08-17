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

end Fabric
