/- Concrete theorem instances named by the generated conformance vectors. -/
import Fabric.Corpus

namespace Fabric

/-- The F1 row instantiates the generic proof at the emitter comparator. -/
theorem emitter_f1_cell_merge_aci :
    Laws.F1CellMergeACI (Holder := Nat) (Value := Nat)
      (cmp := Corpus.observationCmp) :=
  f1_cell_merge_aci

/-- The named duplication row is an instance of F2. -/
theorem emitter_f2_duplication :
    Corpus.cellOf Emitter.duplicatedEvidence =
      Corpus.cellOf Emitter.exactEvidence := by
  exact f2_duplication (cmp := Corpus.observationCmp) (1, 10) [(2, 20)]

/-- The named permutation row is an instance of F2. -/
theorem emitter_f2_permutation :
    Corpus.cellOf Emitter.permutedEvidence =
      Corpus.cellOf Emitter.sequentialEvidence := by
  apply f2_permutation (cmp := Corpus.observationCmp)
  decide

/-- The stale-replay row is accepted by the guarded schedule consumer. -/
theorem emitter_f2b_stale_replay :
    guardedApply Nat.add 10 2 Emitter.staleReplayDeliveries 0 =
      fold Nat.add 0 [2, 3] := by
  exact f2b_guarded_exactly_once Nat.add 10 [2, 3]
    Emitter.staleReplayDeliveries 0 (by rfl)

/-- The duplicate-current row is accepted by the guarded schedule consumer. -/
theorem emitter_f2b_duplication :
    guardedApply Nat.add 10 2 Emitter.duplicatedPositionedDeliveries 0 =
      fold Nat.add 0 [2, 3] := by
  exact f2b_guarded_exactly_once Nat.add 10 [2, 3]
    Emitter.duplicatedPositionedDeliveries 0 (by rfl)

/-- The bounded-reordering row is accepted by the guarded schedule consumer. -/
theorem emitter_f2b_reordering :
    guardedApply Nat.add 4 2 Emitter.reorderedDeliveries 0 =
      fold Nat.add 0 [2, 3] := by
  exact f2b_guarded_exactly_once Nat.add 4 [2, 3]
    Emitter.reorderedDeliveries 0 (by rfl)

/-- The checkpoint row is an exact F3 instance. -/
theorem emitter_f3_resume :
    foldFrom Nat.add (fold Nat.add 0 [1, 2]) [3, 4] =
      fold Nat.add 0 ([1, 2] ++ [3, 4]) :=
  f3_resume_exact Nat.add 0 [1, 2] [3, 4]

/-- The partition/interleaving row is an exact F4 instance. -/
theorem emitter_f4_partition :
    mergePartitionFolds Corpus.natSum id [[1, 3], [2, 4]] =
      foldCommutative Corpus.natSum id [1, 2, 3, 4] := by
  apply f4_partition_fold Corpus.natSum id
  simp only [Interleaves, List.flatten_cons, List.flatten_nil, List.append_nil]
  exact List.Perm.cons 1 (List.Perm.swap 2 3 [4]).symm

/-- The refused intruder is demonstrably non-commuting at its named row. -/
theorem emitter_intruder_refused :
    Corpus.admitAci (.orderedSubtract 7) = none /\
      fold Corpus.orderedSubtractStep 10 [7, 3] ≠
        fold Corpus.orderedSubtractStep 10 [3, 7] := by
  decide

/-- The request-clamping row exercises all eight policy components. -/
theorem emitter_f9_clamp :
    Policy.meet Mutants.rootPolicy Mutants.escalatingRequest <=
      Mutants.rootPolicy :=
  policy_meet_le_left _ _

/-- The tree row constructs the actual two-level action tree and witnesses the
    descendant relation consumed by F9. -/
theorem emitter_f9_tree :
    DescendantEffective Mutants.rootPolicy Corpus.delegationTree
        Corpus.descendantPolicy /\
      Corpus.descendantPolicy <= Mutants.rootPolicy := by
  have reachable : DescendantEffective Mutants.rootPolicy Corpus.delegationTree
      Corpus.descendantPolicy := by
    apply DescendantEffective.throughChild Mutants.rootPolicy
      Mutants.escalatingRequest [] []
      (.node Mutants.escalatingRequest []) Corpus.descendantPolicy
    exact DescendantEffective.here
      (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest)
      Mutants.escalatingRequest []
  exact ⟨reachable, f9_tree_attenuation Mutants.rootPolicy
    Corpus.descendantPolicy Corpus.delegationTree reachable⟩

/-- The canonical string boundary escapes quotes, reverse solidi, and controls. -/
theorem emitter_string_escaping :
    Canonical.string "a\"b\\c\n" = "\"a\\\"b\\\\c\\n\"" := by
  decide

/-- Canonical object construction cannot emit duplicate member names. -/
theorem emitter_duplicate_key_collapse :
    Canonical.object
        [{ key := "a", value := "1" }, { key := "a", value := "2" }] =
      "{\"a\":1}" := by
  decide

end Fabric
