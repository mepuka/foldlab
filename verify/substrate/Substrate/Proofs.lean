/- The proofs. Every law stated one file up is discharged here, and this
   file mints no objects: a definition appearing beside a proof is how a
   model quietly grows a second vocabulary. -/
import Substrate.Laws

namespace Substrate

open Substrate

/-! ## CL-1 — carriage invariance -/

/-- The fold discards carriage: what a mint site produces is the fold of
    its groups, whatever else the site holds. -/
theorem mint_is_fold_of_groups (site : MintSite) :
    mint site = foldSession site.groups := rfl

/-- Two mints over the same three groups fold to one session value. -/
theorem carriage_invariance : Laws.SCarriageInvariance := by
  intro left right same
  simp only [mint_is_fold_of_groups, same]

/-- Posture, transport, and lane position are not inputs. -/
theorem posture_not_an_input : Laws.SPostureNotAnInput := by
  intro _groups _leftPosture _rightPosture _leftTransport _rightTransport
    _leftPosition _rightPosition
  rfl

/-- Equal groups give equal canonical bytes, for every encoding. -/
theorem carriage_invariant_bytes : Laws.SCarriageInvariantBytes := by
  intro _Bytes encode left right same
  exact congrArg encode (carriage_invariance left right same)

/-- Hence one digest, for every naming of those bytes. -/
theorem one_digest_per_groups : Laws.SOneDigestPerGroups := by
  intro _Bytes _Name encode digest left right same
  exact congrArg digest (carriage_invariant_bytes _Bytes encode left right same)

/-- The fold is faithful: one session value comes of one triple. -/
theorem fold_faithful : Laws.SFoldFaithful := by
  intro left right folded
  simpa [foldSession] using folded

/-- A mutated group field moves the canonical bytes under any injective
    canonical encoding. -/
theorem mutated_group_moves_bytes : Laws.SMutatedGroupMovesBytes := by
  intro _Bytes encode injective left right different equal
  exact different (fold_faithful (injective equal))

/-! ## CL-4 — lifecycle machine soundness -/

/-- The alphabet is the transcribed eleven, split seven to four, each
    symbol spelled once. -/
theorem alphabet_transcribed : Laws.LAlphabetTranscribed := by
  refine ⟨rfl, rfl, rfl, ?_⟩
  decide

/-- The machine is total over the eleven-symbol alphabet. -/
theorem machine_total : Laws.LMachineTotal := by
  intro state event
  cases state <;> cases event <;> rfl

/-- A reading holds the state it is read in. -/
theorem readings_hold_state : Laws.LReadingsHoldState := by
  intro state event placed
  cases event <;> cases state <;>
    first
      | rfl
      | exact absurd placed (by decide)

/-- A transition lands in the state its own event names, everywhere but
    at the terminal. -/
theorem transition_names_its_state : Laws.LTransitionNamesItsState := by
  intro state event landing away named
  cases event <;>
    simp only [Event.target, Option.some.injEq, reduceCtorEq] at named <;>
    subst named <;>
    cases state <;>
    first | rfl | exact absurd rfl away

/-- The terminal state absorbs every symbol. -/
theorem terminal_absorbing : Laws.LTerminalAbsorbing := by
  intro event
  cases event <;> rfl

/-- The terminal absorbing state is reachable from establishment. -/
theorem terminal_reachable : Laws.LTerminalReachable := rfl

/-- Drain and close are distinct paths to the shared terminal. -/
theorem drain_close_distinct : Laws.LDrainCloseDistinct :=
  ⟨rfl, by decide, rfl, by decide⟩

/-! ## CL-5 — incarnation chain integrity

The chain half reuses the kernel's own pin well-foundedness idiom: a
landing order given inductively, a rank embedding, and the numeral order
pulled back along it. -/

/-- A landed incarnation name ranks strictly inside the chain. -/
theorem chain_rank_lt_length {chain : List Incarnation} {name : Nat}
    (member : exists entry, entry ∈ chain /\ entry.name = name) :
    chainRank chain name < chain.length := by
  induction chain with
  | nil =>
      obtain ⟨entry, memberNil, _⟩ := member
      simp at memberNil
  | cons head rest inductionHypothesis =>
      simp only [chainRank]
      by_cases hit : head.name == name
      · rw [if_pos hit]
        simp only [List.length_cons]
        omega
      · rw [if_neg hit]
        obtain ⟨entry, memberCons, nameEq⟩ := member
        rcases List.mem_cons.mp memberCons with rfl | memberTail
        · exact absurd (beq_iff_eq.mpr nameEq) hit
        · have := inductionHypothesis ⟨entry, memberTail, nameEq⟩
          simp only [List.length_cons]
          omega

/-- Every predecessor a landed incarnation names is itself landed. -/
theorem landed_predecessors_are_landed {chain : List Incarnation}
    (admission : ChainAdmission chain) {successor : Incarnation}
    (member : successor ∈ chain) {name : Nat}
    (named : successor.predecessor = some name) :
    exists earlier, earlier ∈ chain /\ earlier.name = name := by
  induction admission with
  | empty => simp at member
  | land prior entry admission predecessorLanded firstOverStore fresh
      inductionHypothesis =>
      rcases List.mem_cons.mp member with rfl | memberPrior
      · obtain ⟨earlier, earlierMember, earlierName, _⟩ :=
          predecessorLanded name named
        exact ⟨earlier, List.mem_cons_of_mem _ earlierMember, earlierName⟩
      · obtain ⟨earlier, earlierMember, earlierName⟩ :=
          inductionHypothesis memberPrior
        exact ⟨earlier, List.mem_cons_of_mem _ earlierMember, earlierName⟩

/-- Predecessors descend strictly in landing rank: a successor names only
    incarnations landed strictly earlier. This is the index embedding
    that carries well-foundedness. -/
theorem chain_pin_rank_lt {chain : List Incarnation}
    (admission : ChainAdmission chain)
    {predecessor successor : Incarnation}
    (pins : ChainPins chain predecessor successor) :
    chainRank chain predecessor.name < chainRank chain successor.name := by
  induction admission with
  | empty =>
      obtain ⟨successorMember, _, _⟩ := pins
      simp at successorMember
  | land prior entry admission predecessorLanded firstOverStore fresh
      inductionHypothesis =>
      obtain ⟨successorMember, predecessorMember, named⟩ := pins
      rcases List.mem_cons.mp successorMember with rfl | successorInPrior
      · have predecessorInPrior : predecessor ∈ prior := by
          rcases List.mem_cons.mp predecessorMember with rfl | inPrior
          · obtain ⟨earlier, earlierMember, earlierName, _⟩ :=
              predecessorLanded predecessor.name named
            exact absurd earlierName (fresh earlier earlierMember)
          · exact inPrior
        have headHit : (successor.name == successor.name) = true :=
          beq_iff_eq.mpr rfl
        have headMiss : ¬ ((successor.name == predecessor.name) = true) := by
          intro equal
          exact fresh predecessor predecessorInPrior (beq_iff_eq.mp equal).symm
        simp only [chainRank]
        rw [if_pos headHit, if_neg headMiss]
        exact chain_rank_lt_length ⟨predecessor, predecessorInPrior, rfl⟩
      · have predecessorInPrior : predecessor ∈ prior := by
          rcases List.mem_cons.mp predecessorMember with rfl | inPrior
          · obtain ⟨earlier, earlierMember, earlierName⟩ :=
              landed_predecessors_are_landed admission successorInPrior named
            exact absurd earlierName (fresh earlier earlierMember)
          · exact inPrior
        have predecessorMiss : ¬ ((entry.name == predecessor.name) = true) := by
          intro equal
          exact fresh predecessor predecessorInPrior (beq_iff_eq.mp equal).symm
        have successorMiss : ¬ ((entry.name == successor.name) = true) := by
          intro equal
          exact fresh successor successorInPrior (beq_iff_eq.mp equal).symm
        simp only [chainRank]
        rw [if_neg predecessorMiss, if_neg successorMiss]
        exact inductionHypothesis ⟨successorInPrior, predecessorInPrior, named⟩

/-- The incarnation chain is acyclic: the landing-rank embedding pulls the
    numeral order back along the predecessor relation. -/
theorem chain_pin_well_founded : Laws.RChainPinWellFounded := by
  intro chain admission
  exact Subrelation.wf
    (fun {predecessor successor} pins => chain_pin_rank_lt admission pins)
    (InvImage.wf
      (fun (entry : Incarnation) => chainRank chain entry.name)
      Nat.lt_wfRel.wf)

/-- No incarnation names itself as its predecessor. -/
theorem chain_no_self_predecessor : Laws.RNoSelfPredecessor := by
  intro chain admission entry pins
  exact absurd (chain_pin_rank_lt admission pins) (Nat.lt_irrefl _)

/-! ### The register obligations -/

/-- A binding lookup, one binding at a time. -/
theorem bindings_cons (head : Store × Nat) (rest : List (Store × Nat))
    (store : Store) :
    bindingsAt (head :: rest) store =
      if head.1 = store then head.2 :: bindingsAt rest store
      else bindingsAt rest store := by
  by_cases hit : head.1 = store <;> simp [bindingsAt, hit]

/-- Dropping a store directory's bindings, one binding at a time. -/
theorem without_cons (head : Store × Nat) (rest : List (Store × Nat))
    (store : Store) :
    withoutStore (head :: rest) store =
      if head.1 = store then withoutStore rest store
      else head :: withoutStore rest store := by
  by_cases hit : head.1 = store <;> simp [withoutStore, hit]

/-- Nothing stands current for a store directory whose bindings were just
    dropped. -/
theorem bindings_without_self (bindings : List (Store × Nat))
    (store : Store) :
    bindingsAt (withoutStore bindings store) store = [] := by
  induction bindings with
  | nil => rfl
  | cons head rest inductionHypothesis =>
      by_cases hit : head.1 = store
      · rw [without_cons, if_pos hit]
        exact inductionHypothesis
      · rw [without_cons, if_neg hit, bindings_cons, if_neg hit]
        exact inductionHypothesis

/-- Dropping one store directory's bindings leaves every other store
    directory's exactly as they were. -/
theorem bindings_without_other (bindings : List (Store × Nat))
    {store other : Store} (apart : other ≠ store) :
    bindingsAt (withoutStore bindings store) other =
      bindingsAt bindings other := by
  induction bindings with
  | nil => rfl
  | cons head rest inductionHypothesis =>
      by_cases hit : head.1 = store
      · have miss : ¬ (head.1 = other) := fun equal =>
          apart (equal.symm.trans hit)
        rw [without_cons, if_pos hit, bindings_cons, if_neg miss]
        exact inductionHypothesis
      · rw [without_cons, if_neg hit, bindings_cons, bindings_cons]
        by_cases atOther : head.1 = other
        · rw [if_pos atOther, if_pos atOther, inductionHypothesis]
        · rw [if_neg atOther, if_neg atOther]
          exact inductionHypothesis

/-- Binding lookups distribute over appended binding lists. -/
theorem bindings_append (left right : List (Store × Nat)) (store : Store) :
    bindingsAt (left ++ right) store =
      bindingsAt left store ++ bindingsAt right store := by
  simp [bindingsAt, List.filterMap_append]

/-- The register at its beginning satisfies the invariant. -/
theorem register_base : Laws.RRegisterBase := by
  refine ⟨ChainAdmission.empty, ?_⟩
  intro store
  simp [currentsAt, bindingsAt, initialRegister]

/-- A landing admitted by the guard names a predecessor already landed
    over the same store directory. -/
theorem admitted_predecessor_landed {register : Register}
    {entry : Incarnation} {fence : Fence}
    (admitted : landAdmitted register entry fence = true)
    (name : Nat) (named : entry.predecessor = some name) :
    exists earlier, earlier ∈ register.chain /\ earlier.name = name /\
      earlier.store = entry.store := by
  simp only [landAdmitted, named, Bool.and_eq_true, List.any_eq_true] at admitted
  obtain ⟨_, earlier, earlierMember, matched⟩ := admitted
  simp only [beq_iff_eq] at matched
  exact ⟨earlier, earlierMember, matched.1, matched.2⟩

/-- A landing admitted by the guard and naming no predecessor is the
    first over its store directory. -/
theorem admitted_first_over_store {register : Register}
    {entry : Incarnation} {fence : Fence}
    (admitted : landAdmitted register entry fence = true)
    (unnamed : entry.predecessor = none)
    (earlier : Incarnation) (member : earlier ∈ register.chain) :
    earlier.store ≠ entry.store := by
  simp only [landAdmitted, unnamed, Bool.and_eq_true, List.all_eq_true] at admitted
  have := admitted.2 earlier member
  simpa using this

/-- A landing admitted by the guard carries a fresh name. -/
theorem admitted_fresh {register : Register} {entry : Incarnation}
    {fence : Fence} (admitted : landAdmitted register entry fence = true)
    (earlier : Incarnation) (member : earlier ∈ register.chain) :
    earlier.name ≠ entry.name := by
  simp only [landAdmitted, Bool.and_eq_true, List.all_eq_true] at admitted
  have := admitted.1.2 earlier member
  simpa using this

/-- A landing binds its own name as the store directory's only current
    incarnation: the incumbent's binding is dropped in the same act. -/
theorem bindings_landed (bindings : List (Store × Nat)) (store : Store)
    (name : Nat) :
    bindingsAt (withoutStore bindings store ++ [(store, name)]) store =
      [name] := by
  rw [bindings_append, bindings_without_self, bindings_cons, if_pos rfl]
  rfl

/-- A landing at one store directory leaves every other store's current
    binding exactly as it was. -/
theorem bindings_landed_other (bindings : List (Store × Nat))
    {store other : Store} (name : Nat) (apart : other ≠ store) :
    bindingsAt (withoutStore bindings store ++ [(store, name)]) other =
      bindingsAt bindings other := by
  rw [bindings_append, bindings_without_other bindings apart, bindings_cons,
    if_neg (Ne.symm apart)]
  simp [bindingsAt]

/-- Every lawful act carries the invariant forward. -/
theorem register_consecution : Laws.RRegisterConsecution := by
  intro register act next invariant stepped
  obtain ⟨chained, single⟩ := invariant
  cases act with
  | land entry fence =>
      by_cases admitted : landAdmitted register entry fence = true
      · simp only [stepRegister, admitted, if_pos] at stepped
        obtain rfl := Option.some.inj stepped
        refine ⟨ChainAdmission.land register.chain entry chained ?_ ?_ ?_, ?_⟩
        · intro name named
          exact admitted_predecessor_landed admitted name named
        · intro unnamed earlier member
          exact admitted_first_over_store admitted unnamed earlier member
        · intro earlier member
          exact admitted_fresh admitted earlier member
        · intro store
          show (bindingsAt (withoutStore register.current entry.store ++
            [(entry.store, entry.name)]) store).length ≤ 1
          by_cases atEntry : store = entry.store
          · subst atEntry
            rw [bindings_landed]
            simp
          · rw [bindings_landed_other register.current entry.name atEntry]
            exact single store
      · simp [stepRegister, admitted] at stepped
  | retire store =>
      simp only [stepRegister] at stepped
      obtain rfl := Option.some.inj stepped
      refine ⟨chained, ?_⟩
      intro other
      show (bindingsAt (withoutStore register.current store) other).length ≤ 1
      by_cases atStore : other = store
      · subst atStore
        rw [bindings_without_self]
        simp
      · rw [bindings_without_other register.current atStore]
        exact single other

/-- The invariant implies exactly what the commission asks. -/
theorem register_safety : Laws.RRegisterSafety := by
  intro register invariant
  exact ⟨invariant.2, invariant.1⟩

end Substrate
