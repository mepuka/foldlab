import Moves.Model

namespace Moves

/-! Concrete finite carriers keep every negative control executable and its
trace visible. Holders A, B, and X are distinct seats. -/

abbrev CHole := Fin 1
abbrev CHolder := Fin 3
abbrev CValue := Nat
abbrev CCandidate := Candidate CValue CHolder
private instance candidateOrd : Ord CCandidate := lexOrd
abbrev CSet := Finset CCandidate compare
abbrev CState := EpistemicState CHole CHolder CValue compare
abbrev CMove := Move CHole CHolder CValue compare

private instance : FiniteCarrier CHole where
  elems := [0]
  complete := by
    rintro ⟨n, hn⟩
    cases n with
    | zero => simp
    | succ n => simp at hn

private def h : CHole := 0
private def a : CHolder := 0
private def b : CHolder := 1
private def x : CHolder := 2

/-! ## Nondeterministic clobber: convergence fails -/

def clobber_step (s : CState) : CMove → Option CState
  | .fill hole value actor =>
      match s.holes hole with
      | .open | .filled _ => some (put s hole (.filled value) {(value, actor)})
      | .disputed _ | .decided _ => none
  | m => step s m

def clobberTrace : CState → List CMove → Option CState
  | s, [] => some s
  | s, m :: ms => (clobber_step s m).bind fun s' => clobberTrace s' ms

/-- The same conflicting fills in opposite orders expose last-writer-wins. -/
theorem clobber_diverges :
    ∃ (left right : List CMove) (s₁ s₂ : CState),
      left = [.fill h 10 a, .fill h 20 b] ∧
      right = [.fill h 20 b, .fill h 10 a] ∧
      clobberTrace initial left = some s₁ ∧
      clobberTrace initial right = some s₂ ∧
      s₁.holes h = .filled 20 ∧ s₂.holes h = .filled 10 ∧ s₁ ≠ s₂ := by
  let left : List CMove := [.fill h 10 a, .fill h 20 b]
  let right : List CMove := [.fill h 20 b, .fill h 10 a]
  let s₁ := put (put (initial : CState) h (.filled 10) {(10, a)})
    h (.filled 20) {(20, b)}
  let s₂ := put (put (initial : CState) h (.filled 20) {(20, b)})
    h (.filled 10) {(10, a)}
  refine ⟨left, right, s₁, s₂, rfl, rfl, rfl, rfl, rfl, rfl, ?_⟩
  intro heq
  have := congrArg (fun s : CState => s.holes h) heq
  simp [s₁, s₂, put] at this

/-! ## Deterministic LWW: convergence holds, no-loss fails -/

/-- A deterministic LWW register: canonical-smaller value wins every clash. -/
def lww_step (s : CState) : CMove → Option CState
  | .fill hole value actor =>
      match s.holes hole with
      | .open => some (put s hole (.filled value) {(value, actor)})
      | .filled old =>
          if value < old then some (put s hole (.filled value) {(value, actor)}) else some s
      | .disputed _ | .decided _ => none
  | m => step s m

def lwwTrace : CState → List CMove → Option CState
  | s, [] => some s
  | s, m :: ms => (lww_step s m).bind fun s' => lwwTrace s' ms

private def lwwTerminal : CState :=
  put (initial : CState) h (.filled 10) {(10, a)}

/-- Deterministic LWW passes convergence for every interleaving of the
standard conflicting pair. -/
theorem lww_converges :
    ∀ order : List CMove,
      order.Perm [.fill h 10 a, .fill h 20 b] →
      lwwTrace initial order = some lwwTerminal := by
  intro order hperm
  rcases perm_pair hperm with rfl | rfl <;>
    simp [lwwTrace, lww_step, lwwTerminal, initial, put_put_same]

/-- Yet the losing fill is absent from both terminal meaning and candidates:
convergence alone does not establish E2 claim 2. -/
theorem lww_loses :
    ∃ trace : List CMove,
      trace = [.fill h 20 b, .fill h 10 a] ∧
      (.fill h 20 b : CMove) ∈ trace ∧
      lwwTrace initial trace = some lwwTerminal ∧
      ¬ TerminalCarries lwwTerminal h 20 := by
  refine ⟨[.fill h 20 b, .fill h 10 a], rfl, by simp, ?_, ?_⟩
  · simp [lwwTrace, lww_step, lwwTerminal, initial, put_put_same]
  simp [TerminalCarries, lwwTerminal, put]

/-! ## Refusal-continuation vacuity control -/

private def threeFillWorkload : List CMove :=
  [.fill h 10 a, .fill h 20 b, .fill h 30 x]

private theorem perm_triple {T : Type} {p q r : T} {order : List T}
    (hperm : order.Perm [p, q, r]) :
    order = [p, q, r] ∨ order = [p, r, q] ∨
    order = [q, p, r] ∨ order = [q, r, p] ∨
    order = [r, p, q] ∨ order = [r, q, p] := by
  have hlen : order.length = 3 := hperm.length_eq
  cases order with
  | nil => simp at hlen
  | cons first rest =>
    cases rest with
    | nil => simp at hlen
    | cons second tail =>
      cases tail with
      | nil => simp at hlen
      | cons third remainder =>
        cases remainder with
        | cons fourth remainder => simp at hlen
        | nil =>
          have hfirst : first = p ∨ first = q ∨ first = r := by
            have hmem : first ∈ [p, q, r] := hperm.mem_iff.mp List.mem_cons_self
            simpa using hmem
          rcases hfirst with hp | hq | hr
          · subst first
            have htail : [second, third].Perm [q, r] := hperm.cons_inv
            rcases perm_pair htail with hqr | hrq
            · exact Or.inl (by simp [hqr])
            · exact Or.inr (Or.inl (by simp [hrq]))
          · subst first
            have hreorder : [p, q, r].Perm [q, p, r] := .swap q p [r]
            have htail : [second, third].Perm [p, r] :=
              (hperm.trans hreorder).cons_inv
            rcases perm_pair htail with hpr | hrp
            · exact Or.inr (Or.inr (Or.inl (by simp [hpr])))
            · exact Or.inr (Or.inr (Or.inr (Or.inl (by simp [hrp]))))
          · subst first
            have hswapTail : [p, q, r].Perm [p, r, q] :=
              List.Perm.cons p (.swap r q [])
            have hswapHead : [p, r, q].Perm [r, p, q] := .swap r p [q]
            have htail : [second, third].Perm [p, q] :=
              (hperm.trans (hswapTail.trans hswapHead)).cons_inv
            rcases perm_pair htail with hpq | hqp
            · exact Or.inr (Or.inr (Or.inr (Or.inr (Or.inl (by simp [hpq])))))
            · exact Or.inr (Or.inr (Or.inr (Or.inr (Or.inr (by simp [hqp])))))

private theorem three_distinct_fills_abort (v w u : CValue) (left middle right : CHolder)
    (hne : v ≠ w) :
    runRepair (initial : CState)
      [.fill h v left, .fill h w middle, .fill h u right] = none := by
  rcases run_conflicting_pair (candidateCmp := compare) h v w left middle hne with
    ⟨disputed, candidates, hpair, hh, _⟩
  change runRepair (initial : CState)
    ([.fill h v left, .fill h w middle] ++ [.fill h u right]) = none
  rw [runRepair_append, hpair]
  simp [runRepair, repair, step, hh]

/-- The partial relation has no terminal for any schedule of this bag, so its
complete-run claims are vacuous. The total runner consumes the same workload,
exposes the refusal, and `no_lossK` still accounts for both admitted fills in
the terminal state. -/
theorem refusal_vacuity_exposed :
    (¬ ∃ terminal : CState, Runs threeFillWorkload terminal) ∧
    (runRepairK (initial : CState) threeFillWorkload).2 =
      [(.fill h 10 a, true), (.fill h 20 b, true), (.fill h 30 x, false)] ∧
    TerminalCarries (runRepairK (initial : CState) threeFillWorkload).1 h 10 ∧
    TerminalCarries (runRepairK (initial : CState) threeFillWorkload).1 h 20 := by
  let firstCandidates : CSet := {(10, a)}
  let first : CState := put initial h (.filled 10) firstCandidates
  let repairedCandidates : CSet := firstCandidates ∪ (firstCandidates ∪ {(20, b)})
  let disputed : CState := put first h (.disputed repairedCandidates) repairedCandidates
  have hfirst : repair (initial : CState) (.fill h 10 a) = some first := by
    rfl
  have hnonempty : repairedCandidates ≠ ∅ := by
    exact finset_union_ne_empty_left (singletonCandidate_ne_empty 10 a)
  have hsecond : repair first (.fill h 20 b) = some disputed := by
    simp [repair, step, first, disputed, firstCandidates, repairedCandidates,
      initial, canonicalRepairCandidates, priorCandidates]
    exact hnonempty
  have hthird : repair disputed (.fill h 30 x) = none := by
    simp [repair, step, disputed]
  constructor
  · rintro ⟨terminal, hrun⟩
    cases hrun with
    | schedule order hperm hexec =>
      rcases perm_triple hperm with rfl | rfl | rfl | rfl | rfl | rfl <;>
        first
        | rw [three_distinct_fills_abort 10 20 30 a b x (by decide)] at hexec
        | rw [three_distinct_fills_abort 10 30 20 a x b (by decide)] at hexec
        | rw [three_distinct_fills_abort 20 10 30 b a x (by decide)] at hexec
        | rw [three_distinct_fills_abort 20 30 10 b x a (by decide)] at hexec
        | rw [three_distinct_fills_abort 30 10 20 x a b (by decide)] at hexec
        | rw [three_distinct_fills_abort 30 20 10 x b a (by decide)] at hexec
      all_goals contradiction
  · constructor
    · simp [threeFillWorkload, runRepairK, repairK, hfirst, hsecond, hthird]
    · constructor
      · apply no_lossK_admitted threeFillWorkload h 10 a
        simp [threeFillWorkload, runRepairK, repairK, hfirst, hsecond, hthird]
      · apply no_lossK_admitted threeFillWorkload h 20 b
        simp [threeFillWorkload, runRepairK, repairK, hfirst, hsecond, hthird]

/-! ## Filled is transient -/

/-- A lawful explicit trace witnesses `filled 10 → disputed`. -/
theorem filled_unstable :
    ∃ (filled disputed : CState) (trace : List CMove) (cs : CSet),
      trace = [.dispute h ({(10, a), (20, b)} : CSet) b] ∧
      filled.holes h = .filled 10 ∧
      stepTrace filled trace = some disputed ∧
      disputed.holes h = .disputed cs := by
  let filled := put (initial : CState) h (.filled 10) {(10, a)}
  let cs : CSet := ({(10, a)} : CSet) ∪ ({(10, a), (20, b)} : CSet)
  let disputed := put filled h (.disputed cs) cs
  refine ⟨filled, disputed, [.dispute h ({(10, a), (20, b)} : CSet) b], cs,
    rfl, rfl, ?_, rfl⟩
  rfl

/-! ## Candidate injection: min is manipulable, plurality resists this attack -/

private def honestSupport : CSet := {(10, a), (10, b)}
private def lowInjection : CSet := {(0, x)}
private def attackedCandidates : CSet :=
  ((∅ : CSet) ∪ honestSupport) ∪ lowInjection

private theorem attackedCandidates_ne_empty : attackedCandidates ≠ ∅ := by
  apply finset_union_ne_empty_left
  apply finset_union_ne_empty_right
  exact Std.ExtTreeSet.insert_ne_empty

private theorem attackedCandidate_value {candidate : CCandidate}
    (hmem : candidate ∈ attackedCandidates) :
    candidate.1 = 0 ∨ candidate.1 = 10 := by
  simp [attackedCandidates, honestSupport, lowInjection] at hmem
  rcases hmem with (htenA | htenB) | hzero
  · right
    exact (congrArg Prod.fst htenA).symm
  · right
    exact (congrArg Prod.fst htenB).symm
  · left
    exact (congrArg Prod.fst hzero).symm

private theorem attackedCandidates_toList_perm :
    attackedCandidates.toList.Perm [(0, x), (10, a), (10, b)] := by
  have hnodup : attackedCandidates.toList.Nodup := by
    exact (Std.ExtTreeSet.distinct_toList (t := attackedCandidates)).imp (by
      intro left right hcmp heq
      subst right
      exact hcmp (by simp))
  apply (List.perm_ext_iff_of_nodup hnodup (by simp [a, b, x])).2
  intro candidate
  rw [Std.ExtTreeSet.mem_toList]
  rw [show candidate ∈ attackedCandidates ↔
      (((10, a) = candidate ∨ (10, b) = candidate) ∨ (0, x) = candidate) by
    simp [attackedCandidates, honestSupport, lowInjection]]
  simp only [List.mem_cons, List.not_mem_nil, or_false]
  constructor
  · rintro ((htenA | htenB) | hzero)
    · exact Or.inr (Or.inl htenA.symm)
    · exact Or.inr (Or.inr htenB.symm)
    · exact Or.inl hzero.symm
  · rintro (hzero | htenA | htenB)
    · exact Or.inr hzero.symm
    · exact Or.inl (Or.inl htenA.symm)
    · exact Or.inl (Or.inr htenB.symm)

private theorem attackedSupport_zero : supportCount attackedCandidates 0 = 1 := by
  unfold supportCount
  calc
    _ = [(0, x), (10, a), (10, b)].countP
        (fun candidate => decide (candidate.1 = 0)) :=
      attackedCandidates_toList_perm.countP_eq _
    _ = 1 := by simp

private theorem attackedSupport_ten : supportCount attackedCandidates 10 = 2 := by
  unfold supportCount
  calc
    _ = [(0, x), (10, a), (10, b)].countP
        (fun candidate => decide (candidate.1 = 10)) :=
      attackedCandidates_toList_perm.countP_eq _
    _ = 2 := by simp

private theorem minBetter_attacked_zero {left right : CCandidate}
    (hleft : left ∈ attackedCandidates) (hright : right ∈ attackedCandidates)
    (hzero : left.1 = 0 ∨ right.1 = 0) :
    (minBetter (valueCmp := compare) left right).1 = 0 := by
  have hzeroTen : compare (0 : Nat) 10 = .lt := by decide
  have htenZero : compare (10 : Nat) 0 = .gt := by decide
  rcases attackedCandidate_value hleft with hl | hl <;>
    rcases attackedCandidate_value hright with hr | hr <;>
    simp [minBetter, hl, hr, hzeroTen, htenZero] at hzero ⊢

private theorem minFold_keeps_zero :
    ∀ (xs : List CCandidate) (acc : CCandidate),
      acc ∈ attackedCandidates → acc.1 = 0 →
      (∀ candidate ∈ xs, candidate ∈ attackedCandidates) →
      (xs.foldl (minBetter (valueCmp := compare)) acc).1 = 0 := by
  intro xs
  induction xs with
  | nil => simp
  | cons candidate rest ih =>
    intro acc hacc hzero hall
    simp only [List.foldl]
    have hc : candidate ∈ attackedCandidates := hall candidate List.mem_cons_self
    have hnext : minBetter (valueCmp := compare) acc candidate ∈ attackedCandidates := by
      rcases minBetter_eq_left_or_right (valueCmp := compare) acc candidate with
        hleft | hright
      · simpa [hleft] using hacc
      · simpa [hright] using hc
    apply ih (minBetter (valueCmp := compare) acc candidate) hnext
    · exact minBetter_attacked_zero hacc hc (Or.inl hzero)
    · intro item hitem
      exact hall item (List.mem_cons_of_mem _ hitem)

private theorem minFold_finds_zero :
    ∀ (xs : List CCandidate) (acc : CCandidate),
      acc ∈ attackedCandidates →
      (∀ candidate ∈ xs, candidate ∈ attackedCandidates) →
      (0, x) ∈ xs →
      (xs.foldl (minBetter (valueCmp := compare)) acc).1 = 0 := by
  intro xs
  induction xs with
  | nil => simp
  | cons candidate rest ih =>
    intro acc hacc hall htarget
    simp only [List.foldl]
    have hc : candidate ∈ attackedCandidates := hall candidate List.mem_cons_self
    have hnext : minBetter (valueCmp := compare) acc candidate ∈ attackedCandidates := by
      rcases minBetter_eq_left_or_right (valueCmp := compare) acc candidate with
        hleft | hright
      · simpa [hleft] using hacc
      · simpa [hright] using hc
    rcases List.mem_cons.mp htarget with heq | htail
    · subst candidate
      apply minFold_keeps_zero rest (minBetter (valueCmp := compare) acc (0, x))
        hnext (minBetter_attacked_zero hacc hc (Or.inr rfl))
      intro item hitem
      exact hall item (List.mem_cons_of_mem _ hitem)
    · apply ih (minBetter (valueCmp := compare) acc candidate) hnext
      · intro item hitem
        exact hall item (List.mem_cons_of_mem _ hitem)
      · exact htail

private theorem minAttacked :
    (minFenceRule (valueCmp := compare) (candidateCmp := compare)).choose
      attackedCandidates attackedCandidates_ne_empty = 0 := by
  apply minFold_finds_zero attackedCandidates.toList
    (attackedCandidates.min attackedCandidates_ne_empty)
  · exact Std.ExtTreeSet.min_mem
  · intro candidate hmem
    exact Std.ExtTreeSet.mem_toList.mp hmem
  · apply Std.ExtTreeSet.mem_toList.mpr
    simp [attackedCandidates, lowInjection]

private theorem pluralityBetter_attacked_ten {left right : CCandidate}
    (hleft : left ∈ attackedCandidates) (hright : right ∈ attackedCandidates)
    (hten : left.1 = 10 ∨ right.1 = 10) :
    (pluralityBetter (valueCmp := compare) attackedCandidates left right).1 = 10 := by
  rcases attackedCandidate_value hleft with hl | hl <;>
    rcases attackedCandidate_value hright with hr | hr <;>
    simp [pluralityBetter, attackedSupport_zero, attackedSupport_ten, hl, hr] at hten ⊢

private theorem pluralityFold_keeps_ten :
    ∀ (xs : List CCandidate) (acc : CCandidate),
      acc ∈ attackedCandidates → acc.1 = 10 →
      (∀ candidate ∈ xs, candidate ∈ attackedCandidates) →
      (xs.foldl (pluralityBetter (valueCmp := compare) attackedCandidates) acc).1 = 10 := by
  intro xs
  induction xs with
  | nil => simp
  | cons candidate rest ih =>
    intro acc hacc hten hall
    simp only [List.foldl]
    have hc : candidate ∈ attackedCandidates := hall candidate List.mem_cons_self
    have hnext : pluralityBetter (valueCmp := compare) attackedCandidates acc candidate ∈
        attackedCandidates := by
      rcases pluralityBetter_eq_left_or_right (valueCmp := compare)
          attackedCandidates acc candidate with hleft | hright
      · simpa [hleft] using hacc
      · simpa [hright] using hc
    apply ih (pluralityBetter (valueCmp := compare) attackedCandidates acc candidate)
      hnext
    · exact pluralityBetter_attacked_ten hacc hc (Or.inl hten)
    · intro item hitem
      exact hall item (List.mem_cons_of_mem _ hitem)

private theorem pluralityFold_finds_ten :
    ∀ (xs : List CCandidate) (acc : CCandidate),
      acc ∈ attackedCandidates →
      (∀ candidate ∈ xs, candidate ∈ attackedCandidates) →
      (10, a) ∈ xs →
      (xs.foldl (pluralityBetter (valueCmp := compare) attackedCandidates) acc).1 = 10 := by
  intro xs
  induction xs with
  | nil => simp
  | cons candidate rest ih =>
    intro acc hacc hall htarget
    simp only [List.foldl]
    have hc : candidate ∈ attackedCandidates := hall candidate List.mem_cons_self
    have hnext : pluralityBetter (valueCmp := compare) attackedCandidates acc candidate ∈
        attackedCandidates := by
      rcases pluralityBetter_eq_left_or_right (valueCmp := compare)
          attackedCandidates acc candidate with hleft | hright
      · simpa [hleft] using hacc
      · simpa [hright] using hc
    rcases List.mem_cons.mp htarget with heq | htail
    · subst candidate
      apply pluralityFold_keeps_ten rest
        (pluralityBetter (valueCmp := compare) attackedCandidates acc (10, a))
        hnext (pluralityBetter_attacked_ten hacc hc (Or.inr rfl))
      intro item hitem
      exact hall item (List.mem_cons_of_mem _ hitem)
    · apply ih
        (pluralityBetter (valueCmp := compare) attackedCandidates acc candidate) hnext
      · intro item hitem
        exact hall item (List.mem_cons_of_mem _ hitem)
      · exact htail

private theorem pluralityAttacked :
    (pluralityFenceRule (valueCmp := compare) (candidateCmp := compare)).choose
      attackedCandidates attackedCandidates_ne_empty = 10 := by
  apply pluralityFold_finds_ten attackedCandidates.toList
    (attackedCandidates.min attackedCandidates_ne_empty)
  · exact Std.ExtTreeSet.min_mem
  · intro candidate hmem
    exact Std.ExtTreeSet.mem_toList.mp hmem
  · apply Std.ExtTreeSet.mem_toList.mpr
    simp [attackedCandidates, honestSupport]

private def attackedState : CState :=
  put (put (initial : CState) h (.disputed ((∅ : CSet) ∪ honestSupport))
      ((∅ : CSet) ∪ honestSupport))
    h (.disputed attackedCandidates) attackedCandidates

/-- X proposes no fill at all, injects only `(0,X)` through dispute, and min
selects it. The same canonical pair-set gives plurality value 10 because that
value has two distinct holders while the injection has one. -/
theorem fence_manipulable :
    ∃ (tracePrefix : List CMove) (cs : CSet) (hne : cs ≠ ∅),
      tracePrefix = [.dispute h honestSupport a, .dispute h lowInjection x] ∧
      (∀ move ∈ tracePrefix, ∀ actor, move ≠ (.fill h 0 actor : CMove)) ∧
      stepTrace initial tracePrefix = some attackedState ∧
      attackedState.holes h = .disputed cs ∧
      (minFenceRule (valueCmp := compare) (candidateCmp := compare)).choose cs hne = 0 ∧
      (pluralityFenceRule (valueCmp := compare) (candidateCmp := compare)).choose cs hne = 10 ∧
      step attackedState (.decide h 0) =
        some (put attackedState h (.decided 0) cs) ∧
      step attackedState (.decide h 10) =
        some (put attackedState h (.decided 10) cs) := by
  refine ⟨[.dispute h honestSupport a, .dispute h lowInjection x],
    attackedCandidates, attackedCandidates_ne_empty, rfl, ?_, ?_, rfl, ?_, ?_, ?_, ?_⟩
  · intro move hmem actor
    simp at hmem
    rcases hmem with rfl | rfl <;> simp
  · rfl
  · exact minAttacked
  · exact pluralityAttacked
  · rfl
  · rfl

end Moves
