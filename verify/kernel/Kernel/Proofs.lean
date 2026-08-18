/- Proofs of the kernel-algebra laws. Statements live in
   `Kernel/Laws.lean`; objects live in `Kernel/Definitions.lean`. -/
import Kernel.Laws

namespace Kernel

/-! ## Sentence identity -/

section Encoding

/-- Every kind decodes from its own rank: the closed universe is
    faithfully enumerated. -/
theorem rank_to_kind_rank : forall kind : DeclKind,
    rankToKind kind.rank = some kind := by
  intro kind
  cases kind <;> rfl

/-- Every hole stage decodes from its own rank. -/
theorem rank_to_stage_rank : forall stage : HoleStage,
    rankToStage stage.rank = some stage := by
  intro stage
  cases stage <;> rfl

/-- The framing round-trips: every encoded sentence decodes back to
    itself, so the encoding is a name, not a lossy summary. -/
theorem act_decode_encode : forall act : Act,
    decodeAct (encodeAct act) = some act := by
  intro act
  cases act with
  | declare kind value writ =>
      simp [encodeAct, decodeAct, rank_to_kind_rank]
  | resolve kind target =>
      simp [encodeAct, decodeAct, rank_to_kind_rank]
  | emit lane body => rfl
  | join cell contribution => rfl
  | fold declared partition anchor query => rfl
  | decide register token outcome => rfl
  | trigger predicate declaration =>
      cases predicate with
      | evidenceAppears lane pattern => rfl
      | cellReaches cell threshold => rfl
      | holeReaches hole target =>
          simp [encodeAct, decodeAct, encodePred, decodePred,
            rank_to_stage_rank]
      | outcomeLanded register => rfl
      | headAdvancedPast partition position => rfl
  | spawn parent request => rfl

/-- Sentence identity: the canonical framing is injective. One
    sentence, one name — the model half of content addressing at the
    sentence seam, which is what ties a sentence to its `declare`. -/
theorem sentence_encoding_injective : Laws.KSentenceEncodingInjective := by
  intro left right sameBytes
  have decoded := congrArg decodeAct sameBytes
  rw [act_decode_encode, act_decode_encode] at decoded
  exact Option.some.inj decoded

end Encoding

/-! ## Reference membership -/

section Membership

/-- The executable membership check agrees with list membership. -/
theorem ref_member_iff (kind : DeclKind) (id : Nat) (refs : List Ref) :
    refMember kind id refs = true <-> (kind, id) ∈ refs := by
  induction refs with
  | nil => simp [refMember]
  | cons head rest inductionHypothesis =>
      obtain ⟨k, i⟩ := head
      simp only [refMember, Bool.or_eq_true, Bool.and_eq_true,
        decide_eq_true_eq, List.mem_cons, inductionHypothesis,
        Prod.mk.injEq]
      constructor
      · rintro (⟨hk, hi⟩ | memRest)
        · exact Or.inl ⟨hk.symm, hi.symm⟩
        · exact Or.inr memRest
      · rintro (⟨hk, hi⟩ | memRest)
        · exact Or.inl ⟨hk.symm, hi.symm⟩
        · exact Or.inr memRest

/-- The contrapositive reading used by the door proofs. -/
theorem ref_member_eq_false_of_not_mem {kind : DeclKind} {id : Nat}
    {refs : List Ref} (notMem : (kind, id) ∉ refs) :
    refMember kind id refs = false := by
  cases found : refMember kind id refs with
  | false => rfl
  | true => exact absurd ((ref_member_iff kind id refs).mp found) notMem

/-- Reference membership is monotone under list inclusion. -/
theorem ref_member_monotone {kind : DeclKind} {id : Nat}
    {smaller larger : List Ref}
    (included : forall ref, ref ∈ smaller -> ref ∈ larger)
    (present : refMember kind id smaller = true) :
    refMember kind id larger = true := by
  apply (ref_member_iff kind id larger).mpr
  exact included (kind, id) ((ref_member_iff kind id smaller).mp present)

/-- The canonical repair door is an extension of its source door in
    both membership orders. -/
theorem door_le_repairing (door : Door) (candidate : CandidateAct) :
    Door.Le door (repairingDoor door candidate) := by
  constructor
  · intro ref mem
    exact List.mem_append.mpr (Or.inr mem)
  · intro ref mem
    exact List.mem_append.mpr (Or.inr mem)

end Membership

/-! ## The taught table -/

section Taught

/-- The table row for a reason carries that reason. -/
theorem taught_reason : forall reason : RefusalReason,
    (taught reason).reason = reason := by
  intro reason
  cases reason <;> rfl

/-- Every table row teaches: no empty law, no empty repair. -/
theorem taught_teaches : forall reason : RefusalReason,
    (taught reason).law ≠ "" /\ (taught reason).repair ≠ "" := by
  intro reason
  cases reason <;> exact ⟨by decide, by decide⟩

end Taught

/-! ## The admission door -/

section Door

/-- A clean sweep means every atom is individually clean. -/
theorem arg_sweep_none {door : Door} :
    forall args : List RawArg, argSweep door args = none ->
      forall arg, arg ∈ args -> argRefusal door arg = none := by
  intro args
  induction args with
  | nil =>
      intro _ arg mem
      simp at mem
  | cons head rest inductionHypothesis =>
      intro sweepNone arg mem
      cases found : argRefusal door head with
      | some reason =>
          simp [argSweep, found] at sweepNone
      | none =>
          simp only [argSweep, found] at sweepNone
          rcases List.mem_cons.mp mem with rfl | memRest
          · exact found
          · exact inductionHypothesis sweepNone arg memRest

/-- An individually clean atom stays clean when the catalog grows. -/
theorem arg_refusal_none_monotone {smaller larger : Door}
    (growth : Door.Le smaller larger) (arg : RawArg)
    (clean : argRefusal smaller arg = none) :
    argRefusal larger arg = none := by
  cases arg with
  | digestRef kind id =>
      have present : refMember kind id smaller.catalog = true := by
        simpa [argRefusal] using clean
      have grown := ref_member_monotone growth.catalog present
      simp [argRefusal, grown]
  | literal value => rfl
  | hole name => simp [argRefusal] at clean
  | clockNow => simp [argRefusal] at clean
  | randomSeed => simp [argRefusal] at clean
  | secretBytes bytes => simp [argRefusal] at clean
  | mintedId token => simp [argRefusal] at clean
  | functionValue code => simp [argRefusal] at clean

/-- A clean left-to-right sweep stays clean when the catalog grows. -/
theorem arg_sweep_none_monotone {smaller larger : Door}
    (growth : Door.Le smaller larger) :
    forall args : List RawArg, argSweep smaller args = none ->
      argSweep larger args = none := by
  intro args
  induction args with
  | nil => intro _; rfl
  | cons head rest inductionHypothesis =>
      intro clean
      cases found : argRefusal smaller head with
      | some reason => simp [argSweep, found] at clean
      | none =>
          simp only [argSweep, found] at clean
          have grownHead := arg_refusal_none_monotone growth head found
          simp [argSweep, grownHead, inductionHypothesis clean]

/-- A payload inside the smaller pinned universe remains inside the
    larger pinned universe. -/
theorem inside_universe_true_monotone {smaller larger : Door}
    (growth : Door.Le smaller larger) :
    forall args : List RawArg, insideUniverse smaller args = true ->
      insideUniverse larger args = true := by
  intro args
  induction args with
  | nil => intro _; rfl
  | cons head rest inductionHypothesis =>
      intro inside
      cases head with
      | digestRef kind id =>
          simp only [insideUniverse, Bool.and_eq_true] at inside ⊢
          exact
            ⟨ref_member_monotone growth.pinned inside.1,
              inductionHypothesis inside.2⟩
      | literal value => exact inductionHypothesis inside
      | hole name => exact inductionHypothesis inside
      | clockNow => exact inductionHypothesis inside
      | randomSeed => exact inductionHypothesis inside
      | secretBytes bytes => exact inductionHypothesis inside
      | mintedId token => exact inductionHypothesis inside
      | functionValue code => exact inductionHypothesis inside

/-- An unlawful atom in the payload blocks a clean sweep. -/
theorem sweep_blocks {door : Door} {args : List RawArg} {arg : RawArg}
    {reason : RefusalReason} (mem : arg ∈ args)
    (offending : argRefusal door arg = some reason) :
    argSweep door args ≠ none := by
  intro sweepNone
  have clean := arg_sweep_none args sweepNone arg mem
  rw [offending] at clean
  simp at clean

/-- A candidate whose payload carries an atom the sweep refuses has no
    admitted translation, whatever else the candidate looks like. -/
theorem sweep_refuses {door : Door} {candidate : CandidateAct}
    {arg : RawArg} {reason : RefusalReason}
    (mem : arg ∈ actArgs candidate)
    (offending : argRefusal door arg = some reason) :
    forall act, admit door candidate ≠ .admitted act := by
  intro act h
  cases candidate with
  | declare kind payload writ =>
      simp only [actArgs] at mem
      cases swept : argSweep door payload with
      | some found => simp [admit, swept] at h
      | none => exact absurd swept (sweep_blocks mem offending)
  | resolveDigest kind target anchor =>
      simp only [actArgs] at mem
      simp at mem
  | trustBytes kind target asserted =>
      simp only [actArgs] at mem
      simp at mem
  | emit lane body =>
      simp only [actArgs] at mem
      cases swept : argSweep door body with
      | some found => simp [admit, swept] at h
      | none => exact absurd swept (sweep_blocks mem offending)
  | join cell contribution strategy =>
      simp only [actArgs] at mem
      cases strategy with
      | lastWriterWins => simp [admit] at h
      | declaredAlgebra algebra =>
          cases swept : argSweep door contribution with
          | some found => simp [admit, swept] at h
          | none => exact absurd swept (sweep_blocks mem offending)
  | readLatest subject =>
      simp only [actArgs] at mem
      simp at mem
  | fold declared anchor query =>
      simp only [actArgs] at mem
      cases anchor with
      | none => simp [admit] at h
      | some anchor =>
          by_cases sameFold : anchor.foldId = declared
          · cases swept : argSweep door query with
            | some found => simp [admit, sameFold, swept] at h
            | none => exact absurd swept (sweep_blocks mem offending)
          · simp [admit, sameFold] at h
  | decide register token outcome =>
      simp only [actArgs] at mem
      cases token with
      | none => simp [admit] at h
      | some claim =>
          by_cases sameRegister : claim.register = register
          · cases swept : argSweep door outcome with
            | some found => simp [admit, sameRegister, swept] at h
            | none => exact absurd swept (sweep_blocks mem offending)
          · simp [admit, sameRegister] at h
  | trigger predicate declaration =>
      simp only [actArgs] at mem
      simp at mem
  | spawn parent request =>
      simp only [actArgs] at mem
      simp at mem
  | updateInPlace target payload => simp [admit] at h

/-- A larger door preserves every admission and its translated act. -/
theorem admit_monotone : Laws.KAdmitMonotone := by
  intro smaller larger growth candidate act admitted
  cases candidate with
  | declare kind payload writ =>
      simp only [admit] at admitted ⊢
      cases swept : argSweep smaller payload with
      | some reason => simp [swept] at admitted
      | none =>
          rw [swept] at admitted
          have grownSweep := arg_sweep_none_monotone growth payload swept
          rw [grownSweep]
          cases universeFound : insideUniverse smaller payload with
          | false => simp [universeFound] at admitted
          | true =>
              have grownUniverse :=
                inside_universe_true_monotone growth payload universeFound
              rw [grownUniverse]
              cases present : refMember DeclKind.policy writ smaller.catalog with
              | false => simp [universeFound, present] at admitted
              | true =>
                  have grownPresent := ref_member_monotone growth.catalog present
                  rw [grownPresent]
                  simpa [universeFound, present] using admitted
  | resolveDigest kind target anchor =>
      cases anchor with
      | none =>
          simp only [admit] at admitted ⊢
          cases present : refMember kind target smaller.catalog with
          | false => simp [present] at admitted
          | true =>
              have grownPresent := ref_member_monotone growth.catalog present
              rw [grownPresent]
              simpa [present] using admitted
      | some anchor => simp [admit] at admitted
  | trustBytes kind target asserted => simp [admit] at admitted
  | emit lane body =>
      simp only [admit] at admitted ⊢
      cases swept : argSweep smaller body with
      | some reason => simp [swept] at admitted
      | none =>
          rw [swept] at admitted
          have grownSweep := arg_sweep_none_monotone growth body swept
          rw [grownSweep]
          cases present : refMember DeclKind.lane lane smaller.catalog with
          | false => simp [present] at admitted
          | true =>
              have grownPresent := ref_member_monotone growth.catalog present
              rw [grownPresent]
              simpa [present] using admitted
  | join cell contribution strategy =>
      cases strategy with
      | lastWriterWins => simp [admit] at admitted
      | declaredAlgebra algebra =>
          simp only [admit] at admitted ⊢
          cases swept : argSweep smaller contribution with
          | some reason => simp [swept] at admitted
          | none =>
              rw [swept] at admitted
              have grownSweep :=
                arg_sweep_none_monotone growth contribution swept
              rw [grownSweep]
              cases cellPresent :
                  refMember DeclKind.resource cell smaller.catalog with
              | false => simp [cellPresent] at admitted
              | true =>
                  have grownCell :=
                    ref_member_monotone growth.catalog cellPresent
                  rw [grownCell]
                  cases algebraPresent :
                      refMember DeclKind.algebra algebra smaller.catalog with
                  | false => simp [algebraPresent] at admitted
                  | true =>
                      have grownAlgebra :=
                        ref_member_monotone growth.catalog algebraPresent
                      rw [grownAlgebra]
                      simpa [cellPresent, algebraPresent] using admitted
  | readLatest subject => simp [admit] at admitted
  | fold declared anchor query =>
      cases anchor with
      | none => simp [admit] at admitted
      | some anchor =>
          simp only [admit] at admitted ⊢
          by_cases sameFold : anchor.foldId = declared
          · rw [if_pos sameFold] at admitted ⊢
            cases swept : argSweep smaller query with
            | some reason => simp [swept] at admitted
            | none =>
                rw [swept] at admitted
                have grownSweep := arg_sweep_none_monotone growth query swept
                rw [grownSweep]
                cases present :
                    refMember DeclKind.index declared smaller.catalog with
                | false => simp [present] at admitted
                | true =>
                    have grownPresent :=
                      ref_member_monotone growth.catalog present
                    rw [grownPresent]
                    simpa [present] using admitted
          · simp [sameFold] at admitted
  | decide register token outcome =>
      cases token with
      | none => simp [admit] at admitted
      | some claim =>
          simp only [admit] at admitted ⊢
          by_cases sameRegister : claim.register = register
          · rw [if_pos sameRegister] at admitted ⊢
            cases swept : argSweep smaller outcome with
            | some reason => simp [swept] at admitted
            | none =>
                rw [swept] at admitted
                have grownSweep := arg_sweep_none_monotone growth outcome swept
                rw [grownSweep]
                cases present :
                    refMember DeclKind.program register smaller.catalog with
                | false => simp [present] at admitted
                | true =>
                    have grownPresent :=
                      ref_member_monotone growth.catalog present
                    rw [grownPresent]
                    simpa [present] using admitted
          · simp [sameRegister] at admitted
  | trigger predicate declaration =>
      simp only [admit] at admitted ⊢
      cases refused : predicateRefusal predicate with
      | some reason => simp [refused] at admitted
      | none =>
          simp only [refused] at admitted ⊢
          cases translated : translatePredicate predicate with
          | none => simp [translated] at admitted
          | some result =>
              simp only [translated] at admitted ⊢
              cases present :
                  refMember DeclKind.program declaration smaller.catalog with
              | false => simp [present] at admitted
              | true =>
                  have grownPresent := ref_member_monotone growth.catalog present
                  rw [grownPresent]
                  simpa [present] using admitted
  | spawn parent request =>
      simp only [admit] at admitted ⊢
      cases parentPresent :
          refMember DeclKind.policy parent smaller.catalog with
      | false => simp [parentPresent] at admitted
      | true =>
          have grownParent := ref_member_monotone growth.catalog parentPresent
          rw [grownParent]
          cases requestPresent :
              refMember DeclKind.policy request smaller.catalog with
          | false => simp [requestPresent] at admitted
          | true =>
              have grownRequest :=
                ref_member_monotone growth.catalog requestPresent
              rw [grownRequest]
              simpa [parentPresent, requestPresent] using admitted
  | updateInPlace target payload => simp [admit] at admitted

/-- Every intrinsic raw atom earns a refusal independently of door
    membership. -/
theorem intrinsic_arg_refusal (door : Door) {arg : RawArg}
    (fault : arg.Intrinsic) :
    exists reason, argRefusal door arg = some reason := by
  cases arg <;> simp [RawArg.Intrinsic, argRefusal] at fault ⊢

/-- An intrinsic candidate fault rules out an admitted translation at
    any door, without claiming which refusal reason wins the sweep. -/
theorem intrinsic_fault_no_admission {candidate : CandidateAct}
    (fault : IntrinsicFault candidate) (door : Door) :
    forall act, admit door candidate ≠ .admitted act := by
  cases fault with
  | payload candidate arg mem intrinsic =>
      obtain ⟨reason, refused⟩ := intrinsic_arg_refusal door intrinsic
      exact sweep_refuses mem refused
  | anchored kind target anchor =>
      intro act h
      simp [admit] at h
  | trusting kind target asserted =>
      intro act h
      simp [admit] at h
  | lastWriter cell contribution =>
      intro act h
      simp [admit] at h
  | latest subject =>
      intro act h
      simp [admit] at h
  | anchorless declared query =>
      intro act h
      simp [admit] at h
  | crossAnchor declared anchor query differentFold =>
      intro act h
      simp [admit, differentFold] at h
  | unfenced register outcome =>
      intro act h
      simp [admit] at h
  | crossToken register claim outcome differentRegister =>
      intro act h
      simp [admit, differentRegister] at h
  | refusedPredicate predicate declaration reason refused =>
      intro act h
      simp [admit, refused] at h
  | mutation target payload =>
      intro act h
      simp [admit] at h

/-- Candidate-intrinsic faults keep the verdict refused under every
    door growth. The existential leaves the surfaced reason honest. -/
theorem intrinsic_fault_refused_everywhere :
    Laws.KIntrinsicFaultRefusedEverywhere := by
  intro candidate fault door
  cases result : admit door candidate with
  | admitted act =>
      exact False.elim (intrinsic_fault_no_admission fault door act result)
  | refused refusal => exact ⟨refusal, rfl⟩

/-- Every digest atom contributes its tagged reference to `argRefs`. -/
theorem digest_mem_arg_refs {kind : DeclKind} {id : Nat} :
    forall {args : List RawArg}, RawArg.digestRef kind id ∈ args ->
      (kind, id) ∈ argRefs args := by
  intro args mem
  induction args with
  | nil => simp at mem
  | cons head rest inductionHypothesis =>
      rcases List.mem_cons.mp mem with rfl | tailMem
      · simp [argRefs]
      · cases head <;> simp [argRefs, inductionHypothesis tailMem]

/-- Every payload reference is included in the candidate's finite
    catalog support. -/
theorem required_catalog_contains_arg_ref {candidate : CandidateAct}
    {kind : DeclKind} {id : Nat}
    (mem : RawArg.digestRef kind id ∈ actArgs candidate) :
    (kind, id) ∈ requiredCatalog candidate := by
  have refMem := digest_mem_arg_refs mem
  cases candidate with
  | declare declaredKind payload writ =>
      exact List.mem_cons_of_mem _ refMem
  | resolveDigest declaredKind target anchor => simp [actArgs] at mem
  | trustBytes declaredKind target asserted => simp [actArgs] at mem
  | emit lane body => exact List.mem_cons_of_mem _ refMem
  | join cell contribution strategy =>
      cases strategy with
      | lastWriterWins => exact List.mem_cons_of_mem _ refMem
      | declaredAlgebra algebra =>
          exact List.mem_cons_of_mem _ (List.mem_cons_of_mem _ refMem)
  | readLatest subject => simp [actArgs] at mem
  | fold declared anchor query => exact List.mem_cons_of_mem _ refMem
  | decide register token outcome => exact List.mem_cons_of_mem _ refMem
  | trigger predicate declaration => simp [actArgs] at mem
  | spawn parent request => simp [actArgs] at mem
  | updateInPlace target payload => exact refMem

/-- Absence of an intrinsic candidate fault means every payload atom
    is intrinsically clean. -/
theorem payload_intrinsic_free {candidate : CandidateAct}
    (clean : ¬ IntrinsicFault candidate) :
    forall arg, arg ∈ actArgs candidate -> ¬ arg.Intrinsic := by
  intro arg mem intrinsic
  exact clean (.payload candidate arg mem intrinsic)

/-- A supported, intrinsically clean payload has a clean sweep. -/
theorem arg_sweep_none_of_supported {door : Door} :
    forall args : List RawArg,
      (forall kind id, RawArg.digestRef kind id ∈ args ->
        (kind, id) ∈ door.catalog) ->
      (forall arg, arg ∈ args -> ¬ arg.Intrinsic) ->
      argSweep door args = none := by
  intro args
  induction args with
  | nil => intro _ _; rfl
  | cons head rest inductionHypothesis =>
      intro supported clean
      have restSupported : forall kind id,
          RawArg.digestRef kind id ∈ rest ->
          (kind, id) ∈ door.catalog := by
        intro kind id mem
        exact supported kind id (List.mem_cons_of_mem head mem)
      have restClean : forall arg, arg ∈ rest -> ¬ arg.Intrinsic := by
        intro arg mem
        exact clean arg (List.mem_cons_of_mem head mem)
      have restSweep := inductionHypothesis restSupported restClean
      cases head with
      | digestRef kind id =>
          have present : refMember kind id door.catalog = true :=
            (ref_member_iff kind id door.catalog).mpr
              (supported kind id (by simp))
          simp [argSweep, argRefusal, present, restSweep]
      | literal value => simp [argSweep, argRefusal, restSweep]
      | hole name =>
          exact False.elim (clean (.hole name) (by simp) (by trivial))
      | clockNow =>
          exact False.elim (clean .clockNow (by simp) (by trivial))
      | randomSeed =>
          exact False.elim (clean .randomSeed (by simp) (by trivial))
      | secretBytes bytes =>
          exact False.elim (clean (.secretBytes bytes) (by simp) (by trivial))
      | mintedId token =>
          exact False.elim (clean (.mintedId token) (by simp) (by trivial))
      | functionValue code =>
          exact False.elim (clean (.functionValue code) (by simp) (by trivial))

/-- The canonical repair door supports every payload reference. -/
theorem repairing_arg_sweep_none (door : Door) (candidate : CandidateAct)
    (clean : ¬ IntrinsicFault candidate) :
    argSweep (repairingDoor door candidate) (actArgs candidate) = none := by
  apply arg_sweep_none_of_supported
  · intro kind id mem
    exact List.mem_append.mpr
      (Or.inl (required_catalog_contains_arg_ref mem))
  · exact payload_intrinsic_free clean

/-- A pinned universe containing `argRefs` contains every digest atom
    in the payload. -/
theorem inside_universe_true_of_supported {door : Door} :
    forall args : List RawArg,
      (forall kind id, RawArg.digestRef kind id ∈ args ->
        (kind, id) ∈ door.pinned) ->
      insideUniverse door args = true := by
  intro args
  induction args with
  | nil => intro _; rfl
  | cons head rest inductionHypothesis =>
      intro supported
      have restSupported : forall kind id,
          RawArg.digestRef kind id ∈ rest ->
          (kind, id) ∈ door.pinned := by
        intro kind id mem
        exact supported kind id (List.mem_cons_of_mem head mem)
      have restInside := inductionHypothesis restSupported
      cases head with
      | digestRef kind id =>
          have present : refMember kind id door.pinned = true :=
            (ref_member_iff kind id door.pinned).mpr
              (supported kind id (by simp))
          simp [insideUniverse, present, restInside]
      | literal value => exact restInside
      | hole name => exact restInside
      | clockNow => exact restInside
      | randomSeed => exact restInside
      | secretBytes bytes => exact restInside
      | mintedId token => exact restInside
      | functionValue code => exact restInside

/-- A declaration's finite repair door pins all of its payload
    references. -/
theorem repairing_inside_universe (door : Door) (kind : DeclKind)
    (payload : List RawArg) (writ : Nat) :
    insideUniverse (repairingDoor door (.declare kind payload writ))
      payload = true := by
  apply inside_universe_true_of_supported
  intro refKind id mem
  apply List.mem_append.mpr
  apply Or.inl
  exact digest_mem_arg_refs mem

/-- A predicate with no intrinsic refusal has a closed-grammar
    translation. -/
theorem translate_predicate_some_of_no_refusal
    {predicate : CandidatePredicate}
    (clean : predicateRefusal predicate = none) :
    exists translated, translatePredicate predicate = some translated := by
  cases predicate <;>
    simp [predicateRefusal, translatePredicate] at clean ⊢
  case holeReaches hole stage =>
    cases ranked : rankToStage stage <;>
      simp [ranked] at clean ⊢

/-- Every intrinsically clean candidate admits after adding its finite
    catalog and pinned-universe support. -/
theorem intrinsically_clean_admitted_by_growth (door : Door)
    (candidate : CandidateAct) (clean : ¬ IntrinsicFault candidate) :
    exists act,
      admit (repairingDoor door candidate) candidate = .admitted act := by
  cases candidate with
  | declare kind payload writ =>
      have sweep :
          argSweep (repairingDoor door (.declare kind payload writ)) payload =
            none := by
        simpa [actArgs] using
          repairing_arg_sweep_none door (.declare kind payload writ) clean
      have inside := repairing_inside_universe door kind payload writ
      have writPresent :
          refMember DeclKind.policy writ
            (repairingDoor door (.declare kind payload writ)).catalog = true := by
        apply (ref_member_iff DeclKind.policy writ _).mpr
        simp [repairingDoor, requiredCatalog]
      refine ⟨.declare kind ⟨canonicalBytes payload⟩ ⟨writ⟩, ?_⟩
      simp [admit, sweep, inside, writPresent]
  | resolveDigest kind target anchor =>
      cases anchor with
      | none =>
          have present :
              refMember kind target
                (repairingDoor door (.resolveDigest kind target none)).catalog =
                  true := by
            apply (ref_member_iff kind target _).mpr
            simp [repairingDoor, requiredCatalog]
          refine ⟨.resolve kind ⟨target⟩, ?_⟩
          simp [admit, present]
      | some anchor => exact (clean (.anchored kind target anchor)).elim
  | trustBytes kind target asserted =>
      exact (clean (.trusting kind target asserted)).elim
  | emit lane body =>
      have sweep :
          argSweep (repairingDoor door (.emit lane body)) body = none := by
        simpa [actArgs] using
          repairing_arg_sweep_none door (.emit lane body) clean
      have present :
          refMember DeclKind.lane lane
            (repairingDoor door (.emit lane body)).catalog = true := by
        apply (ref_member_iff DeclKind.lane lane _).mpr
        simp [repairingDoor, requiredCatalog]
      refine ⟨.emit ⟨lane⟩ ⟨canonicalBytes body⟩, ?_⟩
      simp [admit, sweep, present]
  | join cell contribution strategy =>
      cases strategy with
      | lastWriterWins => exact (clean (.lastWriter cell contribution)).elim
      | declaredAlgebra algebra =>
          have sweep :
              argSweep
                  (repairingDoor door
                    (.join cell contribution (.declaredAlgebra algebra)))
                  contribution = none := by
            simpa [actArgs] using
              repairing_arg_sweep_none door
                (.join cell contribution (.declaredAlgebra algebra)) clean
          have cellPresent :
              refMember DeclKind.resource cell
                (repairingDoor door
                  (.join cell contribution (.declaredAlgebra algebra))).catalog =
                    true := by
            apply (ref_member_iff DeclKind.resource cell _).mpr
            simp [repairingDoor, requiredCatalog]
          have algebraPresent :
              refMember DeclKind.algebra algebra
                (repairingDoor door
                  (.join cell contribution (.declaredAlgebra algebra))).catalog =
                    true := by
            apply (ref_member_iff DeclKind.algebra algebra _).mpr
            simp [repairingDoor, requiredCatalog]
          refine ⟨.join ⟨cell⟩ ⟨canonicalBytes contribution⟩, ?_⟩
          simp [admit, sweep, cellPresent, algebraPresent]
  | readLatest subject => exact (clean (.latest subject)).elim
  | fold declared anchor query =>
      cases anchor with
      | none => exact (clean (.anchorless declared query)).elim
      | some anchor =>
          by_cases sameFold : anchor.foldId = declared
          · have sweep :
                argSweep
                    (repairingDoor door (.fold declared (some anchor) query))
                    query = none := by
              simpa [actArgs] using
                repairing_arg_sweep_none door
                  (.fold declared (some anchor) query) clean
            have present :
                refMember DeclKind.index declared
                  (repairingDoor door
                    (.fold declared (some anchor) query)).catalog = true := by
              apply (ref_member_iff DeclKind.index declared _).mpr
              simp [repairingDoor, requiredCatalog]
            refine
              ⟨.fold ⟨declared⟩ ⟨⟨anchor.lane⟩, anchor.shard⟩
                ⟨⟨anchor.floor⟩, ⟨anchor.state⟩, ⟨anchor.head⟩⟩
                ⟨canonicalBytes query⟩, ?_⟩
            simp [admit, sameFold, sweep, present]
          · exact (clean (.crossAnchor declared anchor query sameFold)).elim
  | decide register token outcome =>
      cases token with
      | none => exact (clean (.unfenced register outcome)).elim
      | some claim =>
          by_cases sameRegister : claim.register = register
          · have sweep :
                argSweep
                    (repairingDoor door (.decide register (some claim) outcome))
                    outcome = none := by
              simpa [actArgs] using
                repairing_arg_sweep_none door
                  (.decide register (some claim) outcome) clean
            have present :
                refMember DeclKind.program register
                  (repairingDoor door
                    (.decide register (some claim) outcome)).catalog = true := by
              apply (ref_member_iff DeclKind.program register _).mpr
              simp [repairingDoor, requiredCatalog]
            refine
              ⟨.decide ⟨register⟩ ⟨claim.value⟩
                ⟨canonicalBytes outcome⟩, ?_⟩
            simp [admit, sameRegister, sweep, present]
          · exact (clean (.crossToken register claim outcome sameRegister)).elim
  | trigger predicate declaration =>
      cases refused : predicateRefusal predicate with
      | some reason =>
          exact (clean (.refusedPredicate predicate declaration reason refused)).elim
      | none =>
          obtain ⟨translated, translatedEq⟩ :=
            translate_predicate_some_of_no_refusal refused
          have present :
              refMember DeclKind.program declaration
                (repairingDoor door (.trigger predicate declaration)).catalog =
                  true := by
            apply (ref_member_iff DeclKind.program declaration _).mpr
            simp [repairingDoor, requiredCatalog]
          refine ⟨.trigger translated ⟨declaration⟩, ?_⟩
          simp [admit, refused, translatedEq, present]
  | spawn parent request =>
      have parentPresent :
          refMember DeclKind.policy parent
            (repairingDoor door (.spawn parent request)).catalog = true := by
        apply (ref_member_iff DeclKind.policy parent _).mpr
        simp [repairingDoor, requiredCatalog]
      have requestPresent :
          refMember DeclKind.policy request
            (repairingDoor door (.spawn parent request)).catalog = true := by
        apply (ref_member_iff DeclKind.policy request _).mpr
        simp [repairingDoor, requiredCatalog]
      refine ⟨.spawn ⟨parent⟩ ⟨request⟩, ?_⟩
      simp [admit, parentPresent, requestPresent]
  | updateInPlace target payload => exact (clean (.mutation target payload)).elim

/-- Every genuinely door-relative refusal is repairable by the
    canonical finite extension when no intrinsic fault remains. -/
theorem relative_refusal_repairable_by_growth :
    Laws.KRelativeRefusalRepairableByGrowth := by
  intro door candidate _ clean
  obtain ⟨act, admitted⟩ :=
    intrinsically_clean_admitted_by_growth door candidate clean
  exact ⟨repairingDoor door candidate, act,
    door_le_repairing door candidate, admitted⟩

/-- The admission half of the estate-of-safety candidate: whatever
    spells a closure-row shape, the door refuses — no unlawful
    candidate has an admitted translation. -/
theorem admission_refuses_unlawful : Laws.KAdmissionRefusesUnlawful := by
  intro door candidate unlawful
  cases unlawful with
  | clockAtom act mem => exact sweep_refuses mem rfl
  | seedAtom act mem => exact sweep_refuses mem rfl
  | secretAtom act bytes mem => exact sweep_refuses mem rfl
  | mintedAtom act token mem => exact sweep_refuses mem rfl
  | functionAtom act code mem => exact sweep_refuses mem rfl
  | holeAtom act name mem => exact sweep_refuses mem rfl
  | danglingRef act kind id mem notMem =>
      exact sweep_refuses (reason := .forwardReference) mem
        (by simp [argRefusal, ref_member_eq_false_of_not_mem notMem])
  | offWrit kind payload writ sweepNone universeFalse =>
      intro act h
      simp [admit, sweepNone, universeFalse] at h
  | anchored kind target anchor =>
      intro act h
      simp [admit] at h
  | trusting kind target asserted =>
      intro act h
      simp [admit] at h
  | lastWriter cell contribution =>
      intro act h
      simp [admit] at h
  | latest subject =>
      intro act h
      simp [admit] at h
  | anchorless declared query =>
      intro act h
      simp [admit] at h
  | crossAnchor declared anchor query differentFold =>
      intro act h
      simp [admit, differentFold] at h
  | unfenced register outcome =>
      intro act h
      simp [admit] at h
  | crossToken register claim outcome differentRegister =>
      intro act h
      simp [admit, differentRegister] at h
  | absenceProduction predicate declaration reason refusedProduction =>
      intro act h
      simp [admit, refusedProduction] at h
  | mutation target payload =>
      intro act h
      simp [admit] at h

/-- Every refusal the door utters is its taught table row. -/
theorem admit_refusals_taught {door : Door} {candidate : CandidateAct}
    {refusal : Refusal}
    (h : admit door candidate = .refused refusal) :
    refusal = taught refusal.reason := by
  cases candidate <;> simp only [admit] at h <;> (repeat' split at h) <;>
    first
      | (injection h with h'; subst h'; rw [taught_reason])
      | injection h

/-- Refusal parity: the door never refuses without teaching, and every
    taught row is nonempty on both the law and the repair. -/
theorem refusal_parity : Laws.KRefusalParity :=
  ⟨fun _ _ _ h => admit_refusals_taught h, taught_teaches⟩

end Door

/-! ## The planted ground programs, each refused with its named law -/

section Planted

/-- Closure row: a wall clock in a fold's query refuses at the door. -/
theorem closure_clock_read_refused :
    admit Planted.door Planted.clockFold =
      .refused (taught .clockRead) := rfl

/-- Closure row: an absence trigger refuses at the door. -/
theorem closure_absence_trigger_refused :
    admit Planted.door Planted.absenceTrigger =
      .refused (taught .absenceTrigger) := rfl

/-- Closure row: a tokenless register commit refuses at the door. -/
theorem closure_unfenced_decide_refused :
    admit Planted.door Planted.unfencedDecide =
      .refused (taught .unfencedDecide) := rfl

/-- Closure row: a last-writer-wins merge refuses at the door. -/
theorem closure_last_writer_refused :
    admit Planted.door Planted.lastWriterJoin =
      .refused (taught .lastWriterWins) := rfl

/-- Closure row: a read trusting asserted bytes refuses at the door. -/
theorem closure_unverified_read_refused :
    admit Planted.door Planted.trustingRead =
      .refused (taught .unverifiedRead) := rfl

/-- Closure row: a cross-register token refuses at the door. -/
theorem closure_cross_register_token_refused :
    admit Planted.door Planted.crossRegisterDecide =
      .refused (taught .crossSortIdentifier) := rfl

/-- Closure row: a minted identifier refuses at the door. -/
theorem closure_minted_identifier_refused :
    admit Planted.door Planted.mintedDeclare =
      .refused (taught .mintedIdentifier) := rfl

/-- Closure row: an unanchored latest read refuses at the door. -/
theorem closure_ambient_query_refused :
    admit Planted.door Planted.latestRead =
      .refused (taught .ambientQueryInput) := rfl

/-- Closure row: a reference to a never-admitted digest refuses at the
    door — the shape every cycle reduces to at its first admission. -/
theorem closure_forward_reference_refused :
    admit Planted.door Planted.forwardDeclare =
      .refused (taught .forwardReference) := rfl

/-- Closure row: a secret in an evidence body refuses at the door. -/
theorem closure_secret_carrier_refused :
    admit Planted.door Planted.secretEmit =
      .refused (taught .secretCarrier) := rfl

/-- Closure row: a not-present-anywhere claim refuses at the door. -/
theorem closure_absence_claim_refused :
    admit Planted.door Planted.absenceClaimTrigger =
      .refused (taught .absenceClaim) := rfl

/-- Closure row: an in-place mutation refuses at the door. -/
theorem closure_past_mutation_refused :
    admit Planted.door Planted.pastMutation =
      .refused (taught .pastMutation) := rfl

/-- Closure row: an admitted referent outside the writ's pinned
    universe refuses at the door. -/
theorem closure_off_writ_referent_refused :
    admit Planted.door Planted.offWritDeclare =
      .refused (taught .offWritReferent) := rfl

/-- Closure row: a function value offered as data refuses at the
    door. -/
theorem closure_function_value_refused :
    admit Planted.door Planted.functionDeclare =
      .refused (taught .closureIntrospection) := rfl

/-- Signature discipline: an anchor on a resolve refuses at the door. -/
theorem anchored_resolve_refused :
    admit Planted.door Planted.anchoredResolve =
      .refused (taught .anchoredResolve) := rfl

/-- Render totality: an unfilled hole in a single sentence refuses at
    the door. -/
theorem unfilled_hole_refused :
    admit Planted.door Planted.holeyEmit =
      .refused (taught .unfilledHole) := rfl

/-- The door admits the lawful twin — the door-that-refuses-everything
    is refuted by this row. -/
theorem door_admits_lawful :
    admit Planted.door Planted.lawfulDeclare =
      .admitted Planted.lawfulDeclareAct := rfl

end Planted

/-! ## The program pin order -/

section Programs

/-- An admitted node name ranks strictly inside the program. -/
theorem node_rank_lt_length {nodes : List ProgramNode} {name : Nat}
    (member : exists node, node ∈ nodes /\ node.name = name) :
    nodeRank nodes name < nodes.length := by
  induction nodes with
  | nil =>
      obtain ⟨node, memberNil, _⟩ := member
      simp at memberNil
  | cons head nodes inductionHypothesis =>
      simp only [nodeRank]
      by_cases hit : head.name == name
      · rw [if_pos hit]
        simp only [List.length_cons]
        omega
      · rw [if_neg hit]
        obtain ⟨node, memberCons, nameEq⟩ := member
        rcases List.mem_cons.mp memberCons with rfl | memberTail
        · exact absurd (beq_iff_eq.mpr nameEq) hit
        · have := inductionHypothesis ⟨node, memberTail, nameEq⟩
          simp only [List.length_cons]
          omega

/-- Every use of an admitted node names an admitted node. -/
theorem admitted_uses_have_admitted_nodes
    {nodes : List ProgramNode} (admission : ProgramAdmission nodes)
    {child : ProgramNode} (member : child ∈ nodes)
    {use : Nat} (used : use ∈ child.uses) :
    exists prior, prior ∈ nodes /\ prior.name = use := by
  induction admission with
  | empty => simp at member
  | admit rest node admission usesAdmitted fresh inductionHypothesis =>
      rcases List.mem_cons.mp member with rfl | memberRest
      · obtain ⟨prior, priorMember, priorName⟩ := usesAdmitted use used
        exact ⟨prior, List.mem_cons_of_mem _ priorMember, priorName⟩
      · obtain ⟨prior, priorMember, priorName⟩ :=
          inductionHypothesis memberRest
        exact ⟨prior, List.mem_cons_of_mem _ priorMember, priorName⟩

/-- Uses descend strictly in admission rank: a node only ever consumes
    nodes admitted strictly earlier. This is the index embedding that
    carries well-foundedness. -/
theorem node_pin_rank_lt {nodes : List ProgramNode}
    (admission : ProgramAdmission nodes) {parent child : ProgramNode}
    (pins : NodePins nodes parent child) :
    nodeRank nodes parent.name < nodeRank nodes child.name := by
  induction admission with
  | empty =>
      obtain ⟨childMember, _, _⟩ := pins
      simp at childMember
  | admit rest node admission usesAdmitted fresh inductionHypothesis =>
      obtain ⟨childMember, parentMember, pinned⟩ := pins
      rcases List.mem_cons.mp childMember with rfl | childInRest
      · have parentInRest : parent ∈ rest := by
          rcases List.mem_cons.mp parentMember with rfl | parentInRest
          · obtain ⟨prior, priorMember, priorName⟩ :=
              usesAdmitted parent.name pinned
            exact absurd priorName (fresh prior priorMember)
          · exact parentInRest
        have headHit : (child.name == child.name) = true :=
          beq_iff_eq.mpr rfl
        have headMiss : ¬ ((child.name == parent.name) = true) := by
          intro equal
          exact fresh parent parentInRest (beq_iff_eq.mp equal).symm
        simp only [nodeRank]
        rw [if_pos headHit, if_neg headMiss]
        exact node_rank_lt_length ⟨parent, parentInRest, rfl⟩
      · have parentInRest : parent ∈ rest := by
          rcases List.mem_cons.mp parentMember with rfl | parentInRest
          · obtain ⟨prior, priorMember, priorName⟩ :=
              admitted_uses_have_admitted_nodes admission childInRest
                pinned
            exact absurd priorName (fresh prior priorMember)
          · exact parentInRest
        have parentMiss : ¬ ((node.name == parent.name) = true) := by
          intro equal
          exact fresh parent parentInRest (beq_iff_eq.mp equal).symm
        have childMiss : ¬ ((node.name == child.name) = true) := by
          intro equal
          exact fresh child childInRest (beq_iff_eq.mp equal).symm
        simp only [nodeRank]
        rw [if_neg parentMiss, if_neg childMiss]
        exact inductionHypothesis ⟨childInRest, parentInRest, pinned⟩

/-- The program pin order is well-founded: the admission-rank embedding
    pulls the numeral order back along the uses, so an admitted
    program's dependency graph is a DAG by construction. -/
theorem program_pin_well_founded : Laws.KProgramPinWellFounded := by
  intro nodes admission
  exact Subrelation.wf
    (fun {parent child} pins => node_pin_rank_lt admission pins)
    (InvImage.wf
      (fun (node : ProgramNode) => nodeRank nodes node.name)
      Nat.lt_wfRel.wf)

/-- No admitted node consumes itself: the rank embedding refutes the
    one-step cycle directly. -/
theorem program_pin_irrefl {nodes : List ProgramNode}
    (admission : ProgramAdmission nodes) (node : ProgramNode) :
    ¬ NodePins nodes node node :=
  fun pins => absurd (node_pin_rank_lt admission pins) (Nat.lt_irrefl _)

end Programs

/-! ## Filling -/

section Fill

/-- Filling twice is filling once at the left-biased union, one
    argument at a time. -/
theorem fill_arg_union (left right : Valuation) (arg : RawArg) :
    fillArg right (fillArg left arg) =
      fillArg (Valuation.union left right) arg := by
  cases arg with
  | hole name =>
      cases found : left name with
      | some value => simp [fillArg, Valuation.union, found]
      | none => simp [fillArg, Valuation.union, found]
  | digestRef kind id => rfl
  | literal value => rfl
  | clockNow => rfl
  | randomSeed => rfl
  | secretBytes bytes => rfl
  | mintedId token => rfl
  | functionValue code => rfl

/-- Disjoint fills commute, one argument at a time. -/
theorem fill_arg_disjoint_comm {left right : Valuation}
    (disjoint : Valuation.Disjoint left right) (arg : RawArg) :
    fillArg right (fillArg left arg) =
      fillArg left (fillArg right arg) := by
  cases arg with
  | hole name =>
      rcases disjoint name with leftNone | rightNone
      · cases foundRight : right name with
        | some value => simp [fillArg, leftNone, foundRight]
        | none => simp [fillArg, leftNone, foundRight]
      · cases foundLeft : left name with
        | some value => simp [fillArg, rightNone, foundLeft]
        | none => simp [fillArg, rightNone, foundLeft]
  | digestRef kind id => rfl
  | literal value => rfl
  | clockNow => rfl
  | randomSeed => rfl
  | secretBytes bytes => rfl
  | mintedId token => rfl
  | functionValue code => rfl

/-- The empty valuation fills nothing, one argument at a time. -/
theorem fill_arg_empty (arg : RawArg) :
    fillArg Valuation.empty arg = arg := by
  cases arg <;> rfl

/-- Filling twice is filling once at the union, across a node. -/
theorem fill_node_union (left right : Valuation) (node : ProgramNode) :
    fillNode right (fillNode left node) =
      fillNode (Valuation.union left right) node := by
  cases node with
  | mk name generator args uses =>
      simp only [fillNode, List.map_map]
      congr 1
      induction args with
      | nil => rfl
      | cons head tail inductionHypothesis =>
          simp only [List.map_cons, Function.comp_apply,
            fill_arg_union, inductionHypothesis]

/-- Disjoint fills commute across a node. -/
theorem fill_node_disjoint_comm {left right : Valuation}
    (disjoint : Valuation.Disjoint left right) (node : ProgramNode) :
    fillNode right (fillNode left node) =
      fillNode left (fillNode right node) := by
  cases node with
  | mk name generator args uses =>
      simp only [fillNode, List.map_map]
      congr 1
      induction args with
      | nil => rfl
      | cons head tail inductionHypothesis =>
          simp only [List.map_cons, Function.comp_apply,
            fill_arg_disjoint_comm disjoint, inductionHypothesis]

/-- The empty valuation fills nothing across a node. -/
theorem fill_node_empty (node : ProgramNode) :
    fillNode Valuation.empty node = node := by
  cases node with
  | mk name generator args uses =>
      simp only [fillNode]
      congr 1
      induction args with
      | nil => rfl
      | cons head tail inductionHypothesis =>
          simp only [List.map_cons, fill_arg_empty, inductionHypothesis]

/-- Filling is a monoid action under left-biased union: fill twice is
    fill once at the union, and the empty valuation is the unit. -/
theorem fill_monoid_action : Laws.KFillMonoidAction := by
  constructor
  · intro left right nodes
    induction nodes with
    | nil => rfl
    | cons head tail inductionHypothesis =>
        simp only [fillProgram, List.map_cons, List.map_map] at *
        simp only [fill_node_union, inductionHypothesis]
  · intro nodes
    induction nodes with
    | nil => rfl
    | cons head tail inductionHypothesis =>
        simp only [fillProgram, List.map_cons] at *
        simp only [fill_node_empty, inductionHypothesis]

/-- Disjoint fills commute across a whole program: fill order is free,
    only the fill set matters. -/
theorem fill_commutative : Laws.KFillCommutative := by
  intro left right disjoint nodes
  induction nodes with
  | nil => rfl
  | cons head tail inductionHypothesis =>
      simp only [fillProgram, List.map_cons, List.map_map] at *
      simp only [fill_node_disjoint_comm disjoint, inductionHypothesis]

end Fill

/-! ## The abstract world -/

section Semantics

/-- Under an idempotent merge, a world sits at or below itself. -/
theorem world_le_refl_of_idem {Evidence : Type}
    {merge : Evidence -> Evidence -> Evidence}
    (idem : forall a : Evidence, merge a a = a) (world : World Evidence) :
    World.Le merge world world :=
  { evidence := idem world.evidence
    catalog := fun _ mem => mem
    landed := fun _ mem => mem
    head := Nat.le_refl _ }

/-- Absorbing a contribution never moves the carrier down: the derived
    order's inflationary reading, from associativity and idempotence
    alone. -/
theorem evidence_absorb {Evidence : Type}
    {merge : Evidence -> Evidence -> Evidence}
    (assoc : forall a b c : Evidence,
      merge (merge a b) c = merge a (merge b c))
    (idem : forall a : Evidence, merge a a = a) (a b : Evidence) :
    supLe merge a (merge a b) := by
  unfold supLe
  rw [<- assoc, idem]

/-- Every kernel sentence's meaning grows the world: the kernel has no
    forgetting act. The evidence hypotheses are the fabric cell's own
    algebra at the instantiation seam; the landed-set dedup is the
    register invariant package at its own wall, cited never restated. -/
theorem interp_inflationary : Laws.KInterpInflationary := by
  intro Evidence merge contribution assoc idem act world
  cases act with
  | declare kind value writ =>
      exact { evidence := idem world.evidence
              catalog := fun _ mem => List.mem_cons_of_mem _ mem
              landed := fun _ mem => mem
              head := Nat.le_refl _ }
  | resolve kind target => exact world_le_refl_of_idem idem world
  | emit lane body =>
      exact { evidence := evidence_absorb assoc idem _ _
              catalog := fun _ mem => mem
              landed := fun _ mem => mem
              head := Nat.le_succ _ }
  | join cell contribution' =>
      exact { evidence := evidence_absorb assoc idem _ _
              catalog := fun _ mem => mem
              landed := fun _ mem => mem
              head := Nat.le_refl _ }
  | fold declared partition anchor query =>
      exact world_le_refl_of_idem idem world
  | decide register token outcome =>
      by_cases landedAlready : register.id ∈ world.landed
      · simp only [interp, if_pos landedAlready]
        exact world_le_refl_of_idem idem world
      · simp only [interp, if_neg landedAlready]
        exact { evidence := idem world.evidence
                catalog := fun _ mem => mem
                landed := fun _ mem => List.mem_cons_of_mem _ mem
                head := Nat.le_refl _ }
  | trigger predicate declaration => exact world_le_refl_of_idem idem world
  | spawn parent request => exact world_le_refl_of_idem idem world

/-- The demonstration carrier's associativity: the abstract hypotheses
    are inhabitable inside the package. -/
theorem ground_max_assoc : forall a b c : Nat,
    Nat.max (Nat.max a b) c = Nat.max a (Nat.max b c) := by
  intro a b c
  exact Nat.max_assoc a b c

/-- The demonstration carrier's idempotence. -/
theorem ground_max_idem : forall a : Nat, Nat.max a a = a := by
  intro a
  exact Nat.max_self a

/-- The inflationary reading at the demonstration carrier: the
    instantiation obligation's shape, discharged at a ground
    instance. -/
theorem ground_interp_inflationary (act : Act) (world : World Nat) :
    World.Le Nat.max world (interp Nat.max Value.bytes act world) :=
  interp_inflationary Nat.max Value.bytes ground_max_assoc
    ground_max_idem act world

end Semantics

section Provision

/-- The provision environment reads newest-first: each fold step
    shadows everything older, so the built valuation at a hole is the
    chain's first match — the overlay-chain lookup as a theorem. -/
theorem provision_newest_wins : Laws.KProvisionNewestWins := by
  intro events hole
  induction events with
  | nil => rfl
  | cons event rest ih =>
      by_cases hit : hole == event.1
      · simp [provisionFold, Valuation.override, firstProvision,
          List.find?, hit]
      · simpa [provisionFold, Valuation.override, firstProvision,
          List.find?, hit] using ih

/-- Folding an appended provision chain is the left-biased union of
    the folds: the newer half wins exactly where both bind. -/
theorem provision_append_union : Laws.KProvisionAppendUnion := by
  intro left right
  induction left with
  | nil =>
      funext hole
      simp only [List.nil_append, provisionFold, Valuation.union,
        Valuation.empty]
  | cons event rest ih =>
      simp only [List.cons_append, provisionFold, ih]
      funext hole
      by_cases hit : hole == event.1
      · simp only [Valuation.override, Valuation.union, if_pos hit]
      · simp only [Valuation.override, Valuation.union, if_neg hit]

/-- Disjoint provision chains commute: when neither side binds a hole
    the other binds, arrival order cannot move the environment. The
    committed control shows the premise is load-bearing — outside it,
    two orders of an overlapping chain visibly disagree. -/
theorem provision_disjoint_comm (left right : List (Nat × Nat))
    (disjoint : Valuation.Disjoint (provisionFold left)
      (provisionFold right)) :
    provisionFold (left ++ right) = provisionFold (right ++ left) := by
  rw [provision_append_union left right, provision_append_union right left]
  funext hole
  rcases disjoint hole with noneLeft | noneRight
  · cases h : provisionFold right hole <;>
      simp [Valuation.union, noneLeft, h]
  · cases h : provisionFold left hole <;>
      simp [Valuation.union, noneRight, h]

/-- Re-providing the same binding is inert: the semantic half of
    content-keyed memoization — one digest, one build, and a rebuild
    changes nothing. -/
theorem provision_override_idem (valuation : Valuation)
    (hole value : Nat) :
    ((valuation.override hole value).override hole value) =
      valuation.override hole value := by
  funext name
  by_cases hit : name == hole <;> simp [Valuation.override, hit]

/-- Filling one argument removes exactly its covered requirement. -/
theorem requires_arg_fill (valuation : Valuation) (arg : RawArg) :
    argRequires (fillArg valuation arg) =
      (argRequires arg).filter
        (fun hole => (valuation hole).isNone) := by
  cases arg
  case hole name =>
    cases h : valuation name <;>
      simp [fillArg, argRequires, h, List.filter, Option.isNone]
  all_goals rfl

/-- Filling an argument list removes exactly the covered
    requirements. -/
theorem requires_list_fill (valuation : Valuation)
    (args : List RawArg) :
    (args.map (fillArg valuation)).flatMap argRequires =
      (args.flatMap argRequires).filter
        (fun hole => (valuation hole).isNone) := by
  induction args with
  | nil => rfl
  | cons arg rest ih =>
      simp only [List.map_cons, List.flatMap_cons, List.filter_append]
      rw [requires_arg_fill, ih]

/-- The requirement set of a filled program is the unfilled
    remainder: providing shrinks requirements by exactly the covered
    set, and a fully provided program is closed — R equals never. -/
theorem requires_of_fill : Laws.KRequiresExclude := by
  intro valuation nodes
  induction nodes with
  | nil => rfl
  | cons node rest ih =>
      simp only [fillProgram, List.map_cons, requiresOf,
        List.flatMap_cons, List.filter_append] at ih ⊢
      rw [fillNode, requires_list_fill]
      exact congrArg _ ih

/-- One step of the greatest-position read: the head fact either
    misses the hole, opens the binding, or contests it on strict
    position order. Definitional — the foldr's cons equation named. -/
theorem greatest_at_cons (fact : Nat × Nat × Nat)
    (facts : List (Nat × Nat × Nat)) (hole : Nat) :
    greatestAt (fact :: facts) hole =
      if hole == fact.2.1 then
        match greatestAt facts hole with
        | none => some (fact.1, fact.2.2)
        | some prior =>
            if prior.1 < fact.1 then some (fact.1, fact.2.2)
            else some prior
      else greatestAt facts hole := rfl

/-- Positions assigned by `positionedOf` are bounded by the chain
    length, so a fresh head fact at length-plus-one strictly beats
    every binding the tail can produce. -/
theorem greatest_at_le_length (events : List (Nat × Nat)) (hole : Nat) :
    forall best, greatestAt (positionedOf events) hole = some best ->
      best.1 <= events.length := by
  induction events with
  | nil => intro best found; simp [positionedOf, greatestAt] at found
  | cons event rest ih =>
      intro best found
      simp only [positionedOf] at found
      rw [greatest_at_cons] at found
      dsimp only [] at found
      by_cases hit : hole == event.1
      · rw [if_pos hit] at found
        cases prior : greatestAt (positionedOf rest) hole with
        | none =>
            rw [prior] at found
            dsimp only [] at found
            cases found
            simp
        | some priorBest =>
            rw [prior] at found
            dsimp only [] at found
            have priorLe := ih priorBest prior
            by_cases newer : priorBest.1 < rest.length + 1
            · rw [if_pos newer] at found
              cases found
              simp
            · rw [if_neg newer] at found
              cases found
              simp only [List.length_cons]
              omega
      · rw [if_neg hit] at found
        have priorLe := ih best found
        simp only [List.length_cons]
        omega

/-- The correspondence: the order-carrying fold IS the positioned
    derived read. The overlay chain is the greatest-position rule at
    implicit positions; making positions explicit turns provision
    into a set of facts plus an order-free read, and this theorem is
    the collapse that says nothing was lost. -/
theorem provision_positioned_correspondence :
    Laws.KProvisionPositionedCorrespondence := by
  intro events hole
  induction events with
  | nil => rfl
  | cons event rest ih =>
      simp only [positionedOf]
      rw [greatest_at_cons]
      dsimp only []
      by_cases hit : hole == event.1
      · rw [if_pos hit]
        cases prior : greatestAt (positionedOf rest) hole with
        | none =>
            dsimp only []
            simp [provisionFold, Valuation.override, hit]
        | some priorBest =>
            dsimp only []
            have priorLe := greatest_at_le_length rest hole priorBest prior
            have newer : priorBest.1 < rest.length + 1 := by omega
            rw [if_pos newer]
            simp [provisionFold, Valuation.override, hit]
      · rw [if_neg hit]
        simpa [provisionFold, Valuation.override, hit] using ih

end Provision

end Kernel
