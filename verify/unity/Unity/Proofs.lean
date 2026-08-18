/- Proofs of the unity laws. Statements live in `Unity/Laws.lean`;
   translations live in `Unity/Definitions.lean`. Every theorem here
   either discharges a kernel hypothesis with a fabric theorem at
   fabric's ground carriers or transports a law through a named
   translation; nothing is re-proved that fabric already proves. -/
import Unity.Laws
import Kernel
import Fabric

namespace Unity

/-! ## Alignment -/

section Alignment

/-- Stage erasure preserves rank: the five stages number identically
    on both sides of the translation. -/
theorem stage_erasure_rank_agrees : Laws.UStageErasureRankAgrees := by
  intro stage
  cases stage <;> rfl

/-- The two derived join orders are one proposition at any shared
    carrier: both say joining adds nothing. -/
theorem derived_orders_agree : Laws.UDerivedOrdersAgree :=
  fun _ _ _ _ => Iff.rfl

/-- The ledger image is literally the mapped program — named once so
    membership reasoning can rewrite instead of unfolding. -/
theorem ledger_of_eq_map (nodes : List Kernel.ProgramNode) :
    Unity.ledgerOf nodes = nodes.map Unity.ledgerEntry := rfl

end Alignment

/-! ## Transport — programs to ledgers -/

section Transport

/-- Admission transports: an admitted program erases to an admitted
    ledger. Uses-admitted becomes pins-admitted through the map;
    freshness of names becomes freshness of work digests. -/
theorem admission_transports : Laws.UAdmissionTransports := by
  intro nodes admission
  induction admission with
  | empty => exact Fabric.Admission.empty
  | admit rest node admission usesAdmitted fresh ih =>
      refine Fabric.Admission.admit _ _ ih ?_ ?_
      · intro pin pinMem
        obtain ⟨prior, priorMem, priorName⟩ := usesAdmitted pin pinMem
        exact ⟨Unity.ledgerEntry prior,
          List.mem_map.mpr ⟨prior, priorMem, rfl⟩, priorName⟩
      · intro prior priorMem
        obtain ⟨orig, origMem, rfl⟩ := List.mem_map.mp priorMem
        exact fun eq => fresh orig origMem eq

/-- Pins transport: a consumption edge erases to a pin edge. The
    relation half of the erasure — membership maps forward and the
    used name is the pinned work digest on the nose. -/
theorem pins_transport : Laws.UPinsTransport := by
  intro nodes parent child pins
  obtain ⟨childMem, parentMem, used⟩ := pins
  exact ⟨List.mem_map.mpr ⟨child, childMem, rfl⟩,
    List.mem_map.mpr ⟨parent, parentMem, rfl⟩, used⟩

/-- The kernel's program pin law as an instance of fabric's C7: erase
    the program to its ledger, transport admission and pins, and pull
    fabric's well-foundedness back along the erasure. No kernel-side
    rank argument appears — the derivation is the unity claim. -/
theorem program_wf_from_c7 : Laws.UProgramWfFromC7 := by
  intro nodes admission
  exact Subrelation.wf
    (fun {parent child} pins => pins_transport nodes parent child pins)
    (InvImage.wf Unity.ledgerEntry
      (Fabric.c7_pin_well_founded (Unity.ledgerOf nodes)
        (admission_transports nodes admission)))

/-- Admission rank is invariant under the erasure: the two rank
    functions compute one numeral, so the two embeddings that carry
    well-foundedness are one embedding. -/
theorem rank_agrees : Laws.URankAgrees := by
  intro nodes name
  induction nodes with
  | nil => rfl
  | cons head rest ih =>
      simp only [ledger_of_eq_map, List.map_cons] at ih ⊢
      by_cases hit : head.name == name
      · simp [Fabric.admissionRank, Kernel.nodeRank, Unity.ledgerEntry,
          hit, List.length_map]
      · simp only [Fabric.admissionRank, Kernel.nodeRank,
          Unity.ledgerEntry, hit]
        exact ih

/-- The planted two-node program is admitted on the kernel side. -/
theorem ground_program_admitted :
    Kernel.ProgramAdmission Unity.Planted.groundProgram := by
  refine Kernel.ProgramAdmission.admit [Unity.Planted.nodeOne]
    Unity.Planted.nodeTwo ?_ ?_ ?_
  · refine Kernel.ProgramAdmission.admit [] Unity.Planted.nodeOne
      Kernel.ProgramAdmission.empty ?_ ?_
    · intro use used
      simp [Unity.Planted.nodeOne] at used
    · intro prior priorMem
      simp at priorMem
  · intro use used
    simp only [Unity.Planted.nodeTwo, List.mem_singleton] at used
    exact ⟨Unity.Planted.nodeOne, by simp,
      by simp [Unity.Planted.nodeOne, used]⟩
  · intro prior priorMem
    simp only [List.mem_singleton] at priorMem
    subst priorMem
    simp [Unity.Planted.nodeOne, Unity.Planted.nodeTwo]

/-- The erased ground ledger is admitted on the fabric side — the
    transport applied at a committed vector, so U3 is inhabited. -/
theorem ground_ledger_admitted :
    Fabric.Admission (Unity.ledgerOf Unity.Planted.groundProgram) :=
  admission_transports Unity.Planted.groundProgram
    ground_program_admitted

/-- The pin relation and its image are inhabited at the planted
    program: the committed refutation of every uses-dropping
    translation, whose transported statements would be vacuously true
    of an empty relation. -/
theorem ground_pin_inhabited : Laws.UGroundPinInhabited := by
  have kernelPin : Kernel.NodePins Unity.Planted.groundProgram
      Unity.Planted.nodeOne Unity.Planted.nodeTwo :=
    ⟨by simp [Unity.Planted.groundProgram],
      by simp [Unity.Planted.groundProgram],
      by simp [Unity.Planted.nodeOne, Unity.Planted.nodeTwo]⟩
  exact ⟨kernelPin,
    pins_transport Unity.Planted.groundProgram
      Unity.Planted.nodeOne Unity.Planted.nodeTwo kernelPin⟩

end Transport

/-! ## Discharge — the semantic law at the ground cell -/

section Discharge

/-- The kernel's growth law at fabric's shipped ground cell: the two
    abstract hypotheses are fabric's own cell-merge associativity and
    idempotence, applied — not restated, not re-proved, and not
    demonstrated at a numeral. -/
theorem interp_inflationary_at_cell : Laws.UInterpInflationaryAtCell := by
  intro holder act world
  exact Kernel.interp_inflationary Fabric.Cell.merge
    (Unity.contributionAt holder)
    (fun a b c => Fabric.cell_merge_assoc a b c)
    (fun a => Fabric.cell_merge_idem a) act world

/-- Strict growth at a fresh observation: the emitted observation is
    in the evidence cell afterward, and the cell moved. Membership is
    the fabric reading of the kernel's derived order, so this law is
    unstatable at any carrier without members. -/
theorem evidence_strictly_grows : Laws.UEvidenceStrictlyGrows := by
  intro holder lane body world absent
  have memberAfter : (holder, body.bytes) ∈
      Fabric.Cell.merge world.evidence
        (Unity.contributionAt holder body) := by
    simp only [Fabric.Cell.merge, Std.ExtTreeSet.mem_union_iff]
    right
    simp [Unity.contributionAt, Fabric.Cell.singleton]
  exact ⟨memberAfter, fun same => absent (same ▸ memberAfter)⟩

end Discharge

/-! ## The greatest-wins seam -/

section GreatestWins

/-- Positions assigned by the kernel's positioner are bounded by the
    chain length: the head carries the length itself, the tail sits
    strictly below. -/
theorem positioned_token_le (events : List (Nat × Nat)) :
    forall fact, fact ∈ Kernel.positionedOf events ->
      fact.1 <= events.length := by
  induction events with
  | nil =>
      intro fact factMem
      simp [Kernel.positionedOf] at factMem
  | cons event rest ih =>
      intro fact factMem
      simp only [Kernel.positionedOf, List.mem_cons] at factMem
      rcases factMem with rfl | tailMem
      · simp
      · have := ih fact tailMem
        simp only [List.length_cons]
        omega

/-- Distinct facts in a positioned chain never share a position: the
    head's position strictly exceeds every tail position, so equality
    of positions forces equality of facts. -/
theorem positioned_token_determines (events : List (Nat × Nat)) :
    forall left right, left ∈ Kernel.positionedOf events ->
      right ∈ Kernel.positionedOf events -> left.1 = right.1 ->
        left = right := by
  induction events with
  | nil =>
      intro left right leftMem
      simp [Kernel.positionedOf] at leftMem
  | cons event rest ih =>
      intro left right leftMem rightMem tokenEq
      simp only [Kernel.positionedOf, List.mem_cons] at leftMem rightMem
      rcases leftMem with rfl | leftTail
      · rcases rightMem with rfl | rightTail
        · rfl
        · exfalso
          have rightLe := positioned_token_le rest right rightTail
          have headToken : (rest.length + 1, event.1, event.2).1 =
            rest.length + 1 := rfl
          omega
      · rcases rightMem with rfl | rightTail
        · exfalso
          have leftLe := positioned_token_le rest left leftTail
          have headToken : (rest.length + 1, event.1, event.2).1 =
            rest.length + 1 := rfl
          omega
        · exact ih left right leftTail rightTail tokenEq

/-- Record tokens inherit the position bound through filter and map. -/
theorem records_token_le (events : List (Nat × Nat)) (hole : Nat) :
    forall record,
      record ∈ Unity.recordsAt (Kernel.positionedOf events) hole ->
        record.token <= events.length := by
  intro record recordMem
  obtain ⟨fact, factMem, rfl⟩ := List.mem_map.mp recordMem
  exact positioned_token_le events fact (List.mem_filter.mp factMem).1

/-- Fabric's well-fenced premise holds by construction over the record
    image of any positioned chain: positions are distinct, so tokens
    are distinct, so no token names two records. Fabric assumes this
    of its fencing histories and discharges it by citation; the
    kernel's positioner proves it. -/
theorem well_fenced_by_construction : Laws.UWellFencedByConstruction := by
  intro events hole left leftMem right rightMem tokenEq
  obtain ⟨leftFact, leftFactMem, rfl⟩ := List.mem_map.mp leftMem
  obtain ⟨rightFact, rightFactMem, rfl⟩ := List.mem_map.mp rightMem
  exact congrArg Unity.recordOf
    (positioned_token_determines events leftFact rightFact
      (List.mem_filter.mp leftFactMem).1
      (List.mem_filter.mp rightFactMem).1 tokenEq)

/-- Fabric's greatest-token arbitration over the record image reads
    the newest binding: the head record's token is the chain length
    plus one, every tail token is bounded by the length, so the head
    wins exactly when it binds the hole — the kernel's overlay-chain
    lookup, computed by fabric's arbitrator. -/
theorem greatest_read_is_arbitrated :
    Laws.UGreatestReadIsArbitratedRead := by
  intro events hole
  induction events with
  | nil => rfl
  | cons event rest ih =>
      by_cases hit : hole == event.1
      · have recEq : Unity.recordsAt
            (Kernel.positionedOf (event :: rest)) hole =
            Unity.recordOf (rest.length + 1, event.1, event.2) ::
              Unity.recordsAt (Kernel.positionedOf rest) hole := by
          simp [Unity.recordsAt, Kernel.positionedOf, hit]
        rw [recEq]
        cases found : Fabric.greatestSeal
            (Unity.recordsAt (Kernel.positionedOf rest) hole) with
        | none =>
            simp [Fabric.greatestSeal, found, Unity.recordOf,
              Kernel.firstProvision, hit]
        | some best =>
            have bestLe := records_token_le rest hole best
              (Fabric.greatest_seal_mem found)
            have notLt : ¬ rest.length + 1 < best.token := by omega
            simp [Fabric.greatestSeal, found, notLt, Unity.recordOf,
              Kernel.firstProvision, hit]
      · have recEq : Unity.recordsAt
            (Kernel.positionedOf (event :: rest)) hole =
            Unity.recordsAt (Kernel.positionedOf rest) hole := by
          simp [Unity.recordsAt, Kernel.positionedOf, hit]
        rw [recEq, ih]
        simp [Kernel.firstProvision, hit]

/-- The two greatest reads agree: fabric's greatest-token arbitration
    and the kernel's greatest-position read compute one binding over
    one positioned fact set — the correspondence closed through the
    kernel's own newest-wins and positioned-read laws. -/
theorem greatest_reads_agree : Laws.UGreatestReadsAgree := by
  intro events hole
  rw [greatest_read_is_arbitrated events hole,
    ← Kernel.provision_newest_wins events hole,
    Kernel.provision_positioned_correspondence events hole]

/-- The committed tie divergence: on two facts at one token the kernel
    fold keeps the later arrival (99) and fabric's arbitrator keeps
    the earlier (10). The unrestricted correspondence is false — which
    is exactly why U11 quantifies over positioned chains, where the
    tie cannot arise, and why this refutation is rostered rather than
    narrated. -/
theorem greatest_tie_diverges : Laws.UGreatestTieDiverges := by
  exact ⟨rfl, rfl⟩

end GreatestWins

end Unity
