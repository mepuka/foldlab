/- Concrete theorem instances named by the generated conformance vectors.
The corpus assembly in `Fabric/Emit.lean` passes these terms into the row
constructors, so every emitted verdict is licensed by the theorem its row
names. -/
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

/-- The stale-replay row satisfies both premise halves: the stale entry at
    position 9 sits outside the window, so integrity never speaks about it. -/
theorem emitter_stale_schedule_premise :
    Laws.F2bSerialSuccessorPremise 10 [2, 3]
      Emitter.staleReplayDeliveries := by
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

theorem emitter_f2b_stale_replay :
    guardedApply Nat.add 10 2 Emitter.staleReplayDeliveries 0 =
      fold Nat.add 0 [2, 3] := by
  simpa [guardedApply] using f2b_guarded_exactly_once Nat.add 10 [2, 3]
    Emitter.staleReplayDeliveries 0 emitter_stale_schedule_premise

/-- The duplicate-current row satisfies both premise halves: redelivery at
    position 11 repeats exactly its positioned payload. -/
theorem emitter_duplicate_schedule_premise :
    Laws.F2bSerialSuccessorPremise 10 [2, 3]
      Emitter.duplicatedPositionedDeliveries := by
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

theorem emitter_f2b_duplication :
    guardedApply Nat.add 10 2 Emitter.duplicatedPositionedDeliveries 0 =
      fold Nat.add 0 [2, 3] := by
  simpa [guardedApply] using f2b_guarded_exactly_once Nat.add 10 [2, 3]
    Emitter.duplicatedPositionedDeliveries 0 emitter_duplicate_schedule_premise

/-- The bounded-reordering row satisfies both premise halves. -/
theorem emitter_reordered_schedule_premise :
    Laws.F2bSerialSuccessorPremise 4 [2, 3] Emitter.reorderedDeliveries := by
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

theorem emitter_f2b_reordering :
    guardedApply Emitter.appendStep 4 2 Emitter.reorderedDeliveries [] =
      fold Emitter.appendStep [] [2, 3] := by
  simpa [guardedApply] using f2b_guarded_exactly_once Emitter.appendStep 4 [2, 3]
    Emitter.reorderedDeliveries [] emitter_reordered_schedule_premise

/-- The ahead-of-ceiling row satisfies both premise halves: position 13 is
    beyond the ceiling, so it is out of window — buffered, never applied. -/
theorem emitter_ahead_schedule_premise :
    Laws.F2bSerialSuccessorPremise 10 [2, 3]
      Emitter.aheadOfCeilingDeliveries := by
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

theorem emitter_ahead_of_ceiling :
    guardedApply Nat.add 10 2 Emitter.aheadOfCeilingDeliveries 0 =
      fold Nat.add 0 [2, 3] := by
  simpa [guardedApply] using f2b_guarded_exactly_once Nat.add 10 [2, 3]
    Emitter.aheadOfCeilingDeliveries 0 emitter_ahead_schedule_premise

/-- The multi-gap row satisfies both premise halves: distant positions arrive
    first, so the buffer transiently holds more than one gap before the
    window fills. -/
theorem emitter_multi_gap_schedule_premise :
    Laws.F2bSerialSuccessorPremise 10 [2, 3, 4, 5]
      Emitter.multiGapDeliveries := by
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

theorem emitter_multi_gap_window :
    guardedApply Emitter.appendStep 10 4 Emitter.multiGapDeliveries [] =
      fold Emitter.appendStep [] [2, 3, 4, 5] := by
  simpa [guardedApply] using f2b_guarded_exactly_once Emitter.appendStep 10
    [2, 3, 4, 5] Emitter.multiGapDeliveries []
    emitter_multi_gap_schedule_premise

/-- The redeliver-everything-twice row satisfies both premise halves: every
    redelivery repeats its positioned payload, in a shuffled order. -/
theorem emitter_redeliver_twice_schedule_premise :
    Laws.F2bSerialSuccessorPremise 10 [2, 3, 4]
      Emitter.redeliverTwiceShuffledDeliveries := by
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

theorem emitter_redeliver_twice_shuffled :
    guardedApply Emitter.appendStep 10 3
        Emitter.redeliverTwiceShuffledDeliveries [] =
      fold Emitter.appendStep [] [2, 3, 4] := by
  simpa [guardedApply] using f2b_guarded_exactly_once Emitter.appendStep 10
    [2, 3, 4] Emitter.redeliverTwiceShuffledDeliveries []
    emitter_redeliver_twice_schedule_premise

/-- The checkpoint row is an exact F3 instance. -/
theorem emitter_f3_resume :
    foldFrom Nat.add (fold Nat.add 0 [1, 2]) [3, 4] =
      fold Nat.add 0 ([1, 2] ++ [3, 4]) :=
  f3_resume_exact Nat.add 0 [1, 2] [3, 4]

/-- The kill-9 suffix schedule — reordered and duplicated above the
    checkpoint floor — satisfies both premise halves. -/
theorem emitter_resume_suffix_premise :
    Laws.F2bSerialSuccessorPremise 2 [3, 4] Emitter.resumeSuffixDeliveries := by
  simp only [Laws.F2bSerialSuccessorPremise, WindowCoverage,
    PositionPayloadIntegrity, InWindow]
  decide

/-- The composed resume-then-redeliver row (the kill-9 shape): F2b gives the
    duplicated, reordered suffix schedule its sequential meaning from the
    checkpoint, and F3 stitches the checkpoint to the uninterrupted fold. -/
theorem emitter_resume_then_redeliver :
    guardedApply Emitter.appendStep 2 2 Emitter.resumeSuffixDeliveries
        (fold Emitter.appendStep [] [1, 2]) =
      fold Emitter.appendStep [] ([1, 2] ++ [3, 4]) := by
  have suffix := f2b_guarded_exactly_once Emitter.appendStep 2 [3, 4]
    Emitter.resumeSuffixDeliveries (fold Emitter.appendStep [] [1, 2])
    emitter_resume_suffix_premise
  calc guardedApply Emitter.appendStep 2 2 Emitter.resumeSuffixDeliveries
        (fold Emitter.appendStep [] [1, 2])
      = fold Emitter.appendStep (fold Emitter.appendStep [] [1, 2]) [3, 4] := by
        simpa [guardedApply] using suffix
    _ = fold Emitter.appendStep [] ([1, 2] ++ [3, 4]) :=
        f3_resume_exact Emitter.appendStep [] [1, 2] [3, 4]

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

/-- The request-clamping row exercises all ten policy components. -/
theorem finite_subset_bool_iff (left right : FiniteSet Nat compare) :
    Corpus.finiteSubsetBool left right = true <->
      forall atom, atom ∈ left -> atom ∈ right := by
  simp [Corpus.finiteSubsetBool]

/-- The executable policy order used in F9 verdicts is exactly `Policy.Le`. -/
theorem policyLeBool_iff (left right : Mutants.GroundPolicy) :
    Corpus.policyLeBool left right = true <-> left <= right := by
  constructor
  · intro ordered
    simp only [Corpus.policyLeBool, Bool.and_eq_true, decide_eq_true_eq] at ordered
    rcases ordered with ⟨⟨⟨⟨⟨⟨⟨⟨⟨capabilities, contextAllowlist⟩, toolkits⟩,
      writ⟩, indexes⟩, resources⟩, capabilityClass⟩, effortClass⟩, budget⟩,
      spawnBound⟩
    exact {
      capabilities := (by simpa [Corpus.finiteSubsetBool] using capabilities)
      contextAllowlist := (by simpa [Corpus.finiteSubsetBool] using contextAllowlist)
      toolkits := (by simpa [Corpus.finiteSubsetBool] using toolkits)
      writ := (by simpa [Corpus.finiteSubsetBool] using writ)
      indexes := (by simpa [Corpus.finiteSubsetBool] using indexes)
      resources := (by simpa [Corpus.finiteSubsetBool] using resources)
      capabilityClass
      effortClass
      budget
      spawnBound
    }
  · intro ordered
    simp only [Corpus.policyLeBool, Bool.and_eq_true, decide_eq_true_eq]
    refine ⟨⟨⟨⟨⟨⟨⟨⟨⟨?_, ?_⟩, ?_⟩, ?_⟩, ?_⟩, ?_⟩, ordered.capabilityClass⟩,
      ordered.effortClass⟩, ordered.budget⟩, ordered.spawnBound⟩
    · simpa [Corpus.finiteSubsetBool] using ordered.capabilities
    · simpa [Corpus.finiteSubsetBool] using ordered.contextAllowlist
    · simpa [Corpus.finiteSubsetBool] using ordered.toolkits
    · simpa [Corpus.finiteSubsetBool] using ordered.writ
    · simpa [Corpus.finiteSubsetBool] using ordered.indexes
    · simpa [Corpus.finiteSubsetBool] using ordered.resources

theorem emitter_f9_clamp :
    Corpus.policyLeBool
          (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest)
          Mutants.rootPolicy = true /\
      Policy.meet Mutants.rootPolicy Mutants.escalatingRequest <=
        Mutants.rootPolicy := by
  have ordered := policy_meet_le_left Mutants.rootPolicy Mutants.escalatingRequest
  exact ⟨(policyLeBool_iff _ _).mpr ordered, ordered⟩

/-- The clamp row's request escalates: its verdict reports the executable
    order refusing `escalatingRequest <= rootPolicy`, licensed here rather
    than emitted as an unchecked literal. -/
theorem emitter_f9_request_escalates :
    Corpus.policyLeBool Mutants.escalatingRequest Mutants.rootPolicy = false := by
  cases ordered : Corpus.policyLeBool Mutants.escalatingRequest Mutants.rootPolicy with
  | false => rfl
  | true =>
      have escalated := (policyLeBool_iff _ _).mp ordered
      exact absurd escalated.budget (by decide)

/-- The tree row constructs the actual two-level action tree and witnesses the
    descendant relation consumed by F9. -/
theorem emitter_f9_tree :
    DescendantEffective Mutants.rootPolicy Corpus.delegationTree
        Corpus.descendantPolicy /\
      Corpus.policyLeBool Corpus.descendantPolicy Mutants.rootPolicy = true /\
      Corpus.descendantPolicy <= Mutants.rootPolicy := by
  have reachable : DescendantEffective Mutants.rootPolicy Corpus.delegationTree
      Corpus.descendantPolicy := by
    apply DescendantEffective.throughChild Mutants.rootPolicy
      Mutants.escalatingRequest [] []
      (.node Corpus.attenuatedChildRequest []) Corpus.descendantPolicy
    exact DescendantEffective.here
      (Policy.meet Mutants.rootPolicy Mutants.escalatingRequest)
      Corpus.attenuatedChildRequest []
  have ordered := f9_tree_attenuation Mutants.rootPolicy
    Corpus.descendantPolicy Corpus.delegationTree reachable
  exact ⟨reachable, (policyLeBool_iff _ _).mpr ordered, ordered⟩

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

/-- The two-valuations row agrees on every declared address; the drift
    lives entirely off the read set. -/
theorem emitter_f7_agreement_premise :
    forall addr, addr ∈ Emitter.contextProgram.addresses ->
      Emitter.valuationOne addr = Emitter.valuationTwo addr := by
  decide

/-- The two-valuations row is an exact F7 congruence instance: one
    assembled value despite the off-read-set drift. -/
theorem emitter_f7_declared_reads :
    assemble Emitter.contextProgram Emitter.valuationOne =
      assemble Emitter.contextProgram Emitter.valuationTwo :=
  f7_assembly_reads_only_declared Emitter.contextProgram
    Emitter.valuationOne Emitter.valuationTwo emitter_f7_agreement_premise

/-- The declared-out-of-order row is an exact F7 stability instance: the
    assembled class order is the stable class sort of the declaration. -/
theorem emitter_f7_segment_order :
    (assemble Emitter.contextProgram Emitter.valuationOne).map
        ContextSegment.volatility =
      stableClassOrder (Emitter.contextProgram.reads.map
        ContextRead.volatility) :=
  f7_segment_order_stable Emitter.contextProgram Emitter.valuationOne

/-- The two-orders row satisfies both F11 premises: the ground identities
    are distinct, and the two arrival orders carry one support. -/
theorem emitter_f11_support_premise :
    IdentityDistinct id Emitter.queryArrivalOne /\
      SameDeliveredSet Emitter.queryArrivalOne Emitter.queryArrivalTwo :=
  ⟨by unfold IdentityDistinct; decide,
    same_delivered_of_mutual_contains (by decide) (by decide)⟩

/-- The two-orders row is an exact F11 list-half instance: one top-k
    across permutation and duplication of the delivered support. -/
theorem emitter_f11_topk_support :
    topK Emitter.groundScore id Emitter.groundWidth
        Emitter.queryArrivalOne =
      topK Emitter.groundScore id Emitter.groundWidth
        Emitter.queryArrivalTwo :=
  f11_topk_of_support Emitter.groundScore id Emitter.groundWidth
    Emitter.queryArrivalOne Emitter.queryArrivalTwo
    emitter_f11_support_premise.1 emitter_f11_support_premise.2

/-- The re-anchored row satisfies both composed premises over the full
    delivered supports of its two anchor splits. -/
theorem emitter_f11_reanchored_premise :
    IdentityDistinct id (Emitter.queryPrefixOne ++ Emitter.querySuffixOne) /\
      SameDeliveredSet (Emitter.queryPrefixOne ++ Emitter.querySuffixOne)
        (Emitter.queryPrefixTwo ++ Emitter.querySuffixTwo) :=
  ⟨by unfold IdentityDistinct; decide,
    same_delivered_of_mutual_contains (by decide) (by decide)⟩

/-- The re-anchored row is an exact composed F11 instance: the rendered
    answer is one value across two anchor splits and two delivery
    schedules of one support. -/
theorem emitter_f11_reanchored :
    Corpus.renderEntries ((topKAlgebra Emitter.groundScore id).answer
        (foldFrom appendEntry (fold appendEntry [] Emitter.queryPrefixOne)
          Emitter.querySuffixOne) Emitter.groundWidth) =
      Corpus.renderEntries ((topKAlgebra Emitter.groundScore id).answer
        (foldFrom appendEntry (fold appendEntry [] Emitter.queryPrefixTwo)
          Emitter.querySuffixTwo) Emitter.groundWidth) :=
  f11_query_deterministic Emitter.groundScore id Corpus.renderEntries
    Emitter.groundWidth Emitter.queryPrefixOne Emitter.querySuffixOne
    Emitter.queryPrefixTwo Emitter.querySuffixTwo
    emitter_f11_reanchored_premise.1 emitter_f11_reanchored_premise.2

/-- Admission is the constructor's closure: every ambient input form is
    refused with F11 named at the row, and the declared-seed form — the
    seed inside declaration data — is admitted. -/
theorem emitter_query_seed_admission :
    admitQueryInput .ambientSeed = none /\
      admitQueryInput .ambientClock = none /\
      admitQueryInput .ambientSchedule = none /\
      admitQueryInput (.declaredSeed 7) = some (.declaredSeed 7) :=
  ⟨rfl, rfl, rfl, rfl⟩

/-- The absent row is an exact characterization instance: never-bound
    name, no seals, the absence refusal. -/
theorem emitter_f12_absent :
    resolve id Emitter.groundDirectory Emitter.absentPetname
      ([] : List (Seal Nat)) = .absent :=
  (f12_resolution_characterization id Emitter.groundDirectory
    Emitter.absentPetname []).1.mpr ⟨rfl, absent_name_candidates⟩

/-- The singleton row is an exact characterization instance: one binding,
    no seals, the bound digest. -/
theorem emitter_f12_singleton :
    resolve id Emitter.groundDirectory Emitter.singletonPetname
      ([] : List (Seal Nat)) = .bound 300 :=
  ((f12_resolution_characterization id Emitter.groundDirectory
    Emitter.singletonPetname []).2.1 300).mpr ⟨rfl, singleton_name_candidates⟩

/-- The ambiguous row's premises: its two bind orders carry one support,
    and the contested name's bound digests are identity-distinct. -/
theorem emitter_f12_bind_support_premise :
    SameDeliveredSet Emitter.bindOrderOne Emitter.bindOrderTwo /\
      IdentityDistinct id
        (boundDigests Emitter.groundDirectory Emitter.groundPetname) :=
  ⟨same_delivered_of_mutual_contains (by decide) (by decide),
    by unfold IdentityDistinct; decide⟩

/-- The ambiguous row: both bind orders refuse with one canonical
    candidate listing. -/
theorem emitter_f12_ambiguous_across_orders :
    resolve id (foldBindings Emitter.bindingCmp Emitter.bindOrderOne)
        Emitter.groundPetname [] = .ambiguous [100, 200] /\
      resolve id (foldBindings Emitter.bindingCmp Emitter.bindOrderTwo)
        Emitter.groundPetname [] = .ambiguous [100, 200] :=
  ambiguity_refusal_survives_bind_orders

/-- The greatest-seal row's premises: the seal support is well fenced and
    its two arrival orders carry one support. -/
theorem emitter_f12_seal_premise :
    SealsWellFenced Emitter.sealOrderOne /\
      SameDeliveredSet Emitter.sealOrderOne Emitter.sealOrderTwo :=
  ⟨by unfold SealsWellFenced; decide,
    same_delivered_of_mutual_contains (by decide) (by decide)⟩

/-- The greatest-seal row: the token-9 seal decides across both arrival
    orders — one half an exact characterization instance, the other half
    carried across the schedules by resolution-of-support. -/
theorem emitter_f12_greatest_seal :
    resolve id Emitter.groundDirectory Emitter.groundPetname
        Emitter.sealOrderOne = .sealedAt 9 200 /\
      resolve id Emitter.groundDirectory Emitter.groundPetname
        Emitter.sealOrderTwo = .sealedAt 9 200 := by
  have first : resolve id Emitter.groundDirectory Emitter.groundPetname
      Emitter.sealOrderOne = .sealedAt 9 200 :=
    ((f12_resolution_characterization id Emitter.groundDirectory
      Emitter.groundPetname Emitter.sealOrderOne).2.2.2 9 200).mpr
      ⟨{ token := 9, holder := 1, digest := 200 }, by decide, rfl, rfl⟩
  refine ⟨first, ?_⟩
  rw [← f12_resolution_of_support id Emitter.groundDirectory
    Emitter.groundDirectory Emitter.groundPetname
    Emitter.sealOrderOne Emitter.sealOrderTwo
    emitter_f12_bind_support_premise.2 (fun _ => Iff.rfl)
    emitter_f12_seal_premise.1 emitter_f12_seal_premise.2]
  exact first

/-- The growth row's premise: the grown state sits componentwise above
    the small state in the fabric order. -/
theorem emitter_f10_growth_premise :
    FabricState.Le Emitter.smallState Emitter.grownState := by
  refine ⟨?_, ?_, ?_, ?_, ?_⟩
  · unfold supLe
    decide
  · intro cell
    unfold supLe
    unfold Emitter.smallState Emitter.grownState
    by_cases target : cell == 5 <;> simp [target] <;> decide
  · intro hole
    unfold Emitter.smallState Emitter.grownState
    by_cases target : hole == 0 <;> simp [target, HoleStage.rank]
  · intro outcome member
    simp only [Emitter.smallState] at member
    rw [Std.ExtTreeSet.mem_ofList] at member
    simp at member
  · decide

/-- The growth row: no enabled firing un-fires — every hint enabled at
    the small state stays enabled at the grown state, through stability
    at the trigger-set level. -/
theorem emitter_f10_no_unfire :
    forall declaration,
      declaration ∈ enabledDeclarations Emitter.groundTriggers
        Emitter.smallState ->
      declaration ∈ enabledDeclarations Emitter.groundTriggers
        Emitter.grownState :=
  enabled_declarations_monotone Emitter.groundTriggers
    emitter_f10_growth_premise

/-- The hint row's premise: its two delivery orders carry one evidence
    support. -/
theorem emitter_f10_hint_support_premise :
    SameDeliveredSet Emitter.hintOrderOne Emitter.hintOrderTwo :=
  same_delivered_of_mutual_contains (by decide) (by decide)

/-- The hint row: duplicate-and-permute delivery of one support fires one
    hint set — an exact hints-of-support instance. -/
theorem emitter_f10_hints :
    enabledDeclarations Emitter.groundTriggers
        (Emitter.hintStateOf Emitter.hintOrderOne) =
      enabledDeclarations Emitter.groundTriggers
        (Emitter.hintStateOf Emitter.hintOrderTwo) :=
  f10_hints_of_support Emitter.groundTriggers
    Emitter.hintOrderOne Emitter.hintOrderTwo
    Emitter.grownState.cells Emitter.grownState.holes
    Emitter.grownState.landed Emitter.grownState.head
    emitter_f10_hint_support_premise

/-- The stale-rebind row: observing the stale token changes nothing, and
    the landed history resolves at its greatest token. -/
theorem emitter_f12_stale_rebind :
    resolve id Emitter.groundDirectory Emitter.groundPetname
        (Emitter.staleSeal :: Emitter.landedSeals) =
      resolve id Emitter.groundDirectory Emitter.groundPetname
        Emitter.landedSeals /\
      resolve id Emitter.groundDirectory Emitter.groundPetname
        Emitter.landedSeals = .sealedAt 9 200 := by
  constructor
  · exact stale_token_rebind_inert
      (top := { token := 9, holder := 1, digest := 200 })
      (by decide) (by decide)
  · exact ((f12_resolution_characterization id Emitter.groundDirectory
      Emitter.groundPetname Emitter.landedSeals).2.2.2 9 200).mpr
      ⟨{ token := 9, holder := 1, digest := 200 }, by decide, rfl, rfl⟩

end Fabric
