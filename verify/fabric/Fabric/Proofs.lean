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

/-- F1: extensional equality turns equal verified sets into equal replicas. -/
theorem f1_same_verified_set_converges :
    Laws.F1SameVerifiedSetConverges (cmp := cmp) := by
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

end F2

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

/-- F2b: the position floor turns finite at-least-once delivery into the
    arbitrary step function's exactly-once sequential fold. -/
theorem f2b_guarded_exactly_once (step : State -> Op -> State) :
    Laws.F2bGuardedExactlyOnce step := by
  intro floor operations deliveries initial schedule
  induction operations generalizing floor initial with
  | nil => rfl
  | cons operation operations inductionHypothesis =>
      simp only [AtLeastOnceSchedule] at schedule
      rcases schedule with ⟨atNextPosition, tailCovered⟩
      simp only [List.length_cons, guardedApply, atNextPosition, fold, foldFrom,
        List.foldl]
      exact inductionHypothesis (floor := floor + 1)
        (initial := step initial operation) tailCovered

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
