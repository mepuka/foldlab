/-
The E2 move calculus as a small labeled transition system.

The final Task 48 shape incorporates the ratified D1-D3 amendments:

* `filled` contains meaning only (`Value`), never the journal actor;
* dispute candidates are holder-attributed `(Value × Holder)` pairs;
* there is no prioritized revision move: clashes refuse and repair through
  an evidence-preserving dispute.

`EpistemicState.holes` is the observable meaning fold. `evidence` is ghost
journal provenance used to state decision provenance and no-loss; it is not
part of the meaning digest. This is the two-fold separation made explicit.
-/
import Std.Data.ExtTreeSet.Lemmas

namespace Moves

universe uH uA uV u

/-- An explicit finite carrier for the fixed declared hole set. -/
class FiniteCarrier (α : Type uH) where
  elems : List α
  complete : ∀ x, x ∈ elems

abbrev Finset (α : Type u) (cmp : α → α → Ordering) :=
  Std.ExtTreeSet α cmp

abbrev Candidate (Value : Type uV) (Holder : Type uA) := Value × Holder

inductive HoleState (Holder : Type uA) (Value : Type uV)
    (candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering) where
  | open
  | filled (value : Value)
  | disputed (candidates : Finset (Candidate Value Holder) candidateCmp)
  | decided (value : Value)

@[ext] structure EpistemicState (HoleId : Type uH) (Holder : Type uA)
    (Value : Type uV)
    (candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering) where
  holes : HoleId → HoleState Holder Value candidateCmp
  /-- Ghost journal provenance. The meaning projection is `holes`. -/
  evidence : HoleId → Finset (Candidate Value Holder) candidateCmp

inductive Move (HoleId : Type uH) (Holder : Type uA) (Value : Type uV)
    (candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering) where
  | fill (hole : HoleId) (value : Value) (actor : Holder)
  | dispute (hole : HoleId)
      (candidates : Finset (Candidate Value Holder) candidateCmp) (actor : Holder)
  | decide (hole : HoleId) (value : Value)

abbrev Intent := Move

abbrev ValueAppears {Value : Type uV} {Holder : Type uA}
    {candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering}
    [DecidableEq Value] [Std.TransCmp candidateCmp]
    (cs : Finset (Candidate Value Holder) candidateCmp) (v : Value) : Prop :=
  cs.toList.any (fun candidate => decide (candidate.1 = v)) = true

/-- A lawful resolute fence is any function of the canonical pair-set that
returns a represented value. The rule may use any fixed declared criterion. -/
structure FenceRule (Holder : Type uA) (Value : Type uV)
    (candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering)
    [DecidableEq Value] [Std.TransCmp candidateCmp] where
  choose : (cs : Finset (Candidate Value Holder) candidateCmp) → cs ≠ ∅ → Value
  sound : ∀ (cs) (hne : cs ≠ ∅), ValueAppears cs (choose cs hne)

section Model

variable {HoleId : Type uH} {Holder : Type uA} {Value : Type uV}
variable {valueCmp : Value → Value → Ordering}
variable {candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering}
variable [FiniteCarrier HoleId] [DecidableEq HoleId]
variable [DecidableEq Holder] [DecidableEq Value]
variable [Std.TransCmp valueCmp] [Std.LawfulEqCmp valueCmp]
variable [Std.TransCmp candidateCmp] [Std.LawfulEqCmp candidateCmp]

local notation "State" => EpistemicState HoleId Holder Value candidateCmp
local notation "HState" => HoleState Holder Value candidateCmp
local notation "Mv" => Move HoleId Holder Value candidateCmp
local notation "Cand" => Candidate Value Holder
local notation "CSet" => Finset Cand candidateCmp

theorem valueAppears_iff {cs : CSet} {v : Value} :
    ValueAppears cs v ↔ ∃ actor, (v, actor) ∈ cs := by
  simp [ValueAppears, List.any_eq_true, Std.ExtTreeSet.mem_toList]

def initial : State where
  holes := fun _ => .open
  evidence := fun _ => ∅

def put (s : State) (h : HoleId) (hs : HState) (ev : CSet) : State where
  holes := fun k => if k = h then hs else s.holes k
  evidence := fun k => if k = h then ev else s.evidence k

@[simp] theorem put_holes_same (s : State) (h : HoleId) (hs : HState) (ev : CSet) :
    (put s h hs ev).holes h = hs := by
  simp [put]

@[simp] theorem put_evidence_same (s : State) (h : HoleId) (hs : HState) (ev : CSet) :
    (put s h hs ev).evidence h = ev := by
  simp [put]

@[simp] theorem put_holes_other (s : State) {h k : HoleId} (hne : k ≠ h)
    (hs : HState) (ev : CSet) : (put s h hs ev).holes k = s.holes k := by
  simp [put, hne]

@[simp] theorem put_evidence_other (s : State) {h k : HoleId} (hne : k ≠ h)
    (hs : HState) (ev : CSet) : (put s h hs ev).evidence k = s.evidence k := by
  simp [put, hne]

theorem put_comm (s : State) {h₁ h₂ : HoleId} (hne : h₁ ≠ h₂)
    (x₁ x₂ : HState) (e₁ e₂ : CSet) :
    put (put s h₁ x₁ e₁) h₂ x₂ e₂ = put (put s h₂ x₂ e₂) h₁ x₁ e₁ := by
  apply EpistemicState.ext
  · funext k
    simp only [put]
    by_cases hk₁ : k = h₁ <;> by_cases hk₂ : k = h₂ <;> simp_all
  · funext k
    simp only [put]
    by_cases hk₁ : k = h₁ <;> by_cases hk₂ : k = h₂ <;> simp_all

theorem put_put_same (s : State) (h : HoleId)
    (x₁ x₂ : HState) (e₁ e₂ : CSet) :
    put (put s h x₁ e₁) h x₂ e₂ = put s h x₂ e₂ := by
  apply EpistemicState.ext
  · funext k
    by_cases hkh : k = h <;> simp [put, hkh]
  · funext k
    by_cases hkh : k = h <;> simp [put, hkh]

theorem put_current (s : State) (h : HoleId) :
    put s h (s.holes h) (s.evidence h) = s := by
  apply EpistemicState.ext
  · funext k
    by_cases hkh : k = h <;> simp [put, hkh]
  · funext k
    by_cases hkh : k = h <;> simp [put, hkh]

/-- Observable equality: journal provenance may differ while meaning agrees. -/
def MeaningEq (s t : State) : Prop := s.holes = t.holes

theorem meaningEq_refl (s : State) : MeaningEq s s := rfl

def priorCandidates (s : State) (h : HoleId) : CSet :=
  match s.holes h with
  | .open | .decided _ => ∅
  | .filled _ => s.evidence h
  | .disputed cs => cs

/-- The ratified move step. An empty dispute offer is refused at every state:
a move that asserts nothing must change nothing, so refusal depends only on
the move and the meaning fold, never on arrival order or ghost evidence. A
nonempty offer keeps the merged set nonempty, preserving the required
nonempty-dispute invariant. -/
def step (s : State) : Mv → Option State
  | .fill h v actor =>
      match s.holes h with
      | .open => some (put s h (.filled v) {(v, actor)})
      | .filled w => if w = v then some s else none
      | .disputed _ | .decided _ => none
  | .dispute h cs _ =>
      match s.holes h with
      | .decided _ => none
      | _ =>
          if cs = ∅ then none
          else
            let merged := priorCandidates s h ∪ cs
            some (put s h (.disputed merged) merged)
  | .decide h v =>
      match s.holes h with
      | .disputed cs =>
          if ValueAppears cs v then some (put s h (.decided v) cs) else none
      | _ => none

/-- The total refusal-aware step. Admission uses `step` exactly; a refusal is
an observable `false` and leaves the state unchanged. -/
def stepK (s : State) (m : Mv) : State × Bool :=
  match step s m with
  | some s' => (s', true)
  | none => (s, false)

theorem stepK_agrees {s s' : State} {m : Mv} (hstep : step s m = some s') :
    stepK s m = (s', true) := by
  simp [stepK, hstep]

theorem stepK_refused {s : State} {m : Mv} (hstep : step s m = none) :
    stepK s m = (s, false) := by
  simp [stepK, hstep]

def stepTrace : State → List Mv → Option State
  | s, [] => some s
  | s, m :: ms => (step s m).bind fun s' => stepTrace s' ms

def thenStep (s : State) (m₁ m₂ : Mv) : Option State :=
  (step s m₁).bind fun s' => step s' m₂

/-! ## Candidate pair-sets are a join-semilattice -/

theorem finset_union_comm (a b : CSet) : a ∪ b = b ∪ a := by
  apply Std.ExtTreeSet.ext_mem
  intro candidate
  simp only [Std.ExtTreeSet.mem_union_iff]
  exact or_comm

theorem finset_union_assoc (a b c : CSet) : (a ∪ b) ∪ c = a ∪ (b ∪ c) := by
  apply Std.ExtTreeSet.ext_mem
  intro candidate
  simp only [Std.ExtTreeSet.mem_union_iff]
  exact or_assoc

theorem finset_union_idem (a : CSet) : a ∪ a = a := by
  apply Std.ExtTreeSet.ext_mem
  intro candidate
  simp only [Std.ExtTreeSet.mem_union_iff]
  constructor
  · exact fun h => h.elim id id
  · exact Or.inl

theorem finset_union_empty_left (a : CSet) : ∅ ∪ a = a := by
  apply Std.ExtTreeSet.ext_mem
  intro candidate
  simp only [Std.ExtTreeSet.mem_union_iff, Std.ExtTreeSet.not_mem_empty, false_or]

theorem finset_union_empty_right (a : CSet) : a ∪ ∅ = a := by
  rw [finset_union_comm, finset_union_empty_left]

theorem finset_union_ne_empty_right {a b : CSet} (hb : b ≠ ∅) : a ∪ b ≠ ∅ := by
  intro heq
  have : b = ∅ := by
    apply Std.ExtTreeSet.ext_mem
    intro candidate
    constructor
    · intro hm
      have hum : candidate ∈ a ∪ b := Std.ExtTreeSet.mem_union_of_right hm
      rw [heq] at hum
      exact absurd hum Std.ExtTreeSet.not_mem_empty
    · intro hm
      exact absurd hm Std.ExtTreeSet.not_mem_empty
  exact hb this

theorem finset_union_ne_empty_left {a b : CSet} (ha : a ≠ ∅) : a ∪ b ≠ ∅ := by
  rw [finset_union_comm]
  exact finset_union_ne_empty_right ha

theorem finset_union_left_comm (a b c : CSet) :
    a ∪ (b ∪ c) = b ∪ (a ∪ c) := by
  rw [← finset_union_assoc, finset_union_comm a b, finset_union_assoc]

/-- Pair-set union is commutative, associative, and idempotent. -/
theorem dispute_merge_semilattice (a b c : CSet) :
    a ∪ b = b ∪ a ∧ (a ∪ b) ∪ c = a ∪ (b ∪ c) ∧ a ∪ a = a :=
  ⟨finset_union_comm a b, finset_union_assoc a b c, finset_union_idem a⟩

/-! ## The step diamond -/

/-- Disjoint fills commute for every state, including ghost evidence. -/
theorem fill_comm (s : State) {h₁ h₂ : HoleId} (hne : h₁ ≠ h₂)
    (v₁ v₂ : Value) (a₁ a₂ : Holder) :
    thenStep s (.fill h₁ v₁ a₁) (.fill h₂ v₂ a₂) =
      thenStep s (.fill h₂ v₂ a₂) (.fill h₁ v₁ a₁) := by
  have hne' : h₂ ≠ h₁ := Ne.symm hne
  cases h₁s : s.holes h₁ <;> cases h₂s : s.holes h₂ <;>
    simp_all [thenStep, step, put_holes_other, put_comm]
  all_goals
    try (split <;> simp_all [thenStep, step, put_holes_other, put_comm] <;>
      try (split <;> simp_all [thenStep, step, put_holes_other, put_comm]))

/-- A different value cannot overwrite a filled hole. -/
theorem fill_conflict_refused (s : State) (h : HoleId) (v w : Value)
    (actor : Holder) (hstate : s.holes h = .filled w) (hne : v ≠ w) :
    step s (.fill h v actor) = none := by
  simp [step, hstate, Ne.symm hne]

/-! ## Clash repair and all interleavings -/

def canonicalRepairCandidates (s : State) (h : HoleId) (v : Value)
    (actor : Holder) : CSet := s.evidence h ∪ {(v, actor)}

theorem canonicalRepairCandidates_ne_empty (s : State) (h : HoleId)
    (v : Value) (actor : Holder) :
    canonicalRepairCandidates s h v actor ≠ ∅ :=
  finset_union_ne_empty_right Std.ExtTreeSet.insert_ne_empty

theorem offer_ne_empty (base : CSet) (v : Value) (actor : Holder) :
    base ∪ {(v, actor)} ≠ ∅ :=
  finset_union_ne_empty_right Std.ExtTreeSet.insert_ne_empty

/-- An empty offer is refused identically at every hole state. -/
theorem step_dispute_empty (s : State) (h : HoleId) (actor : Holder) :
    step s (.dispute h (∅ : CSet) actor) = none := by
  cases hs : s.holes h <;> simp [step, hs]

/-- A nonempty offer at an undecided hole always admits, merging with the
prior candidates. -/
theorem step_dispute_admitted (s : State) (h : HoleId) (cs : CSet)
    (actor : Holder) (hcs : cs ≠ ∅) (hdec : ∀ v, s.holes h ≠ .decided v) :
    step s (.dispute h cs actor) =
      some (put s h (.disputed (priorCandidates s h ∪ cs))
        (priorCandidates s h ∪ cs)) := by
  cases hs : s.holes h with
  | «open» | filled _ | disputed _ => simp [step, hs, hcs, priorCandidates]
  | decided w => exact absurd hs (hdec w)

/-- Inversion for an admitted dispute: the offer was nonempty, the hole was
undecided, and the result is the canonical merge. -/
theorem step_dispute_cases {s s' : State} {h : HoleId} {cs : CSet}
    {actor : Holder} (hstep : step s (.dispute h cs actor) = some s') :
    cs ≠ ∅ ∧ (∀ v, s.holes h ≠ .decided v) ∧
      s' = put s h (.disputed (priorCandidates s h ∪ cs))
        (priorCandidates s h ∪ cs) := by
  have hdec : ∀ v, s.holes h ≠ .decided v := by
    intro v hv
    simp [step, hv] at hstep
  have hcs : cs ≠ ∅ := by
    intro hempty
    subst hempty
    rw [step_dispute_empty] at hstep
    cases hstep
  rw [step_dispute_admitted s h cs actor hcs hdec] at hstep
  injection hstep with heq
  exact ⟨hcs, hdec, heq.symm⟩

/-- The fill-else-dispute composite under absorb semantics: fills are total.
A clash or a live dispute absorbs the fill into the canonical pair-set; a
same-value refill and a post-decision fill append the confirming pair to
ghost journal evidence without touching meaning. -/
def repair (s : State) : Mv → Option State
  | .fill h v actor =>
      match s.holes h with
      | .open => step s (.fill h v actor)
      | .filled w =>
          if w = v then some (put s h (.filled w) (s.evidence h ∪ {(v, actor)}))
          else step s (.dispute h (canonicalRepairCandidates s h v actor) actor)
      | .disputed cs => step s (.dispute h (cs ∪ {(v, actor)}) actor)
      | .decided w => some (put s h (.decided w) (s.evidence h ∪ {(v, actor)}))
  | m => step s m

/-- The total refusal-aware repair step, defined solely by the ratified
partial `repair` semantics. -/
def repairK (s : State) (m : Mv) : State × Bool :=
  match repair s m with
  | some s' => (s', true)
  | none => (s, false)

theorem repairK_agrees {s s' : State} {m : Mv}
    (hrepair : repair s m = some s') : repairK s m = (s', true) := by
  simp [repairK, hrepair]

theorem repairK_refused {s : State} {m : Mv} (hrepair : repair s m = none) :
    repairK s m = (s, false) := by
  simp [repairK, hrepair]

def runRepair : State → List Mv → Option State
  | s, [] => some s
  | s, i :: is => (repair s i).bind fun s' => runRepair s' is

theorem runRepair_append (s : State) (left right : List Mv) :
    runRepair s (left ++ right) =
      (runRepair s left).bind fun s' => runRepair s' right := by
  induction left generalizing s with
  | nil => rfl
  | cons i rest ih =>
      simp only [List.cons_append, runRepair]
      cases repair s i with
      | none => rfl
      | some next => simpa using ih next

/-- Total repaired execution. Unlike `runRepair`, it consumes arbitrary
finite traces and retains one admission/refusal observation per intent. -/
def runRepairK : State → List Mv → State × List (Mv × Bool)
  | s, [] => (s, [])
  | s, i :: is =>
      let outcome := repairK s i
      let tail := runRepairK outcome.1 is
      (tail.1, (i, outcome.2) :: tail.2)

/-- `Runs intents terminal` ranges over every permutation of the finite intent
bag and retains only admitted complete executions. -/
inductive Runs (intents : List Mv) (terminal : State) : Prop where
  | schedule (order : List Mv) (permutation : order.Perm intents)
      (execution : runRepair initial order = some terminal) : Runs intents terminal

def candidatesContain (cs : CSet) (v w : Value) : Prop :=
  ValueAppears cs v ∧ ValueAppears cs w

theorem singletonCandidate_ne_empty (v : Value) (actor : Holder) :
    ({(v, actor)} : CSet) ≠ ∅ := Std.ExtTreeSet.insert_ne_empty

theorem candidate_mem_singleton (v : Value) (actor : Holder) :
    (v, actor) ∈ ({(v, actor)} : CSet) := Std.ExtTreeSet.mem_insert_self

/-- The computed two-fill conflict run: fill, clash, canonical dispute. -/
theorem run_pair_of_conflict (h : HoleId) (v w : Value) (a b : Holder)
    (hne : v ≠ w) :
    runRepair (initial : State) [.fill h v a, .fill h w b] =
      some (put initial h
        (.disputed (({(v, a)} : CSet) ∪ (({(v, a)} : CSet) ∪ {(w, b)})))
        (({(v, a)} : CSet) ∪ (({(v, a)} : CSet) ∪ {(w, b)}))) := by
  let first : CSet := {(v, a)}
  let merged : CSet := first ∪ (first ∪ ({(w, b)} : CSet))
  let filledState : State := put initial h (.filled v) first
  have hstate : filledState.holes h = .filled v := by simp [filledState]
  have hfirst : repair (initial : State) (.fill h v a) = some filledState := by
    simp [repair, step, initial, filledState, first]
  have hsecond : repair filledState (.fill h w b) =
      some (put filledState h (.disputed merged) merged) := by
    simp only [repair, hstate, if_neg hne]
    rw [step_dispute_admitted filledState h _ b
      (canonicalRepairCandidates_ne_empty filledState h w b)
      (fun u hu => by simp [filledState] at hu)]
    have hsets : priorCandidates filledState h ∪
        canonicalRepairCandidates filledState h w b = merged := by
      simp [priorCandidates, hstate, canonicalRepairCandidates, filledState,
        merged, first]
    rw [hsets]
  simp only [runRepair, hfirst, Option.bind_some, hsecond]
  rw [put_put_same]

theorem run_conflicting_pair (h : HoleId) (v w : Value) (a b : Holder)
    (hne : v ≠ w) :
    ∃ (terminal : State) (cs : CSet),
      runRepair initial [.fill h v a, .fill h w b] = some terminal ∧
      terminal.holes h = .disputed cs ∧ candidatesContain cs v w := by
  refine ⟨_, ({(v, a)} : CSet) ∪ (({(v, a)} : CSet) ∪ {(w, b)}),
    run_pair_of_conflict h v w a b hne, put_holes_same _ _ _ _, ?_, ?_⟩
  · exact valueAppears_iff.mpr
      ⟨a, Std.ExtTreeSet.mem_union_of_left (candidate_mem_singleton v a)⟩
  · exact valueAppears_iff.mpr
      ⟨b, Std.ExtTreeSet.mem_union_of_right
        (Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton w b))⟩

theorem perm_pair {α : Type u} {x y : α} {order : List α}
    (h : order.Perm [x, y]) : order = [x, y] ∨ order = [y, x] := by
  have hlen : order.length = 2 := h.length_eq
  cases order with
  | nil => simp at hlen
  | cons a rest =>
    cases rest with
    | nil => simp at hlen
    | cons b tail =>
      cases tail with
      | cons c tail => simp at hlen
      | nil =>
        have ha : a = x ∨ a = y := by
          have hamem : a ∈ [x, y] := h.mem_iff.mp List.mem_cons_self
          simpa using hamem
        rcases ha with hax | hay
        · subst a
          left
          have hp : List.Perm [b] [y] := h.cons_inv
          have hb : b = y := by simpa using hp.eq_singleton
          simp [hb]
        · subst a
          right
          have hp : List.Perm [y, b] [y, x] := h.trans (.swap y x [])
          have hb : b = x := by simpa using hp.cons_inv.eq_singleton
          simp [hb]

/-- Every interleaving of two conflicting fills surfaces both values. -/
theorem conflict_surfaces (h : HoleId) (v w : Value) (a b : Holder)
    (hne : v ≠ w) (terminal : State)
    (hrun : Runs [.fill h v a, .fill h w b] terminal) :
    (∃ (cs : CSet), terminal.holes h = .disputed cs ∧ candidatesContain cs v w) ∨
      (∃ chosen, terminal.holes h = .decided chosen) := by
  cases hrun with
  | schedule order hp hexec =>
    rcases perm_pair hp with rfl | rfl
    · rcases run_conflicting_pair (candidateCmp := candidateCmp) h v w a b hne with
        ⟨t, cs, ht, hh, hc⟩
      rw [ht] at hexec
      injection hexec with heq
      subst heq
      exact Or.inl ⟨cs, hh, hc⟩
    · rcases run_conflicting_pair (candidateCmp := candidateCmp) h w v b a (Ne.symm hne) with
        ⟨t, cs, ht, hh, hc⟩
      rw [ht] at hexec
      injection hexec with heq
      subst heq
      exact Or.inl ⟨cs, hh, hc.2, hc.1⟩

/-! ## Well-formedness -/

def OnlyValue (cs : CSet) (v : Value) : Prop :=
  ∀ candidate ∈ cs, candidate.1 = v

/-- The domain is the fixed finite hole carrier. Evidence is empty for open
holes, records only the filled value, equals live dispute candidates, and
retains the candidate set resolved by a decision. -/
def WF (s : State) : Prop :=
  ∀ h,
    match s.holes h with
    | .open => s.evidence h = ∅
    | .filled v => s.evidence h ≠ ∅ ∧ OnlyValue (s.evidence h) v
    | .disputed cs => cs ≠ ∅ ∧ s.evidence h = cs
    | .decided v => ValueAppears (s.evidence h) v

theorem initial_wf : WF (initial : State) := by
  intro h
  simp [initial]

theorem wf_put_filled {s : State} (hwf : WF s) (h : HoleId)
    (v : Value) (actor : Holder) : WF (put s h (.filled v) {(v, actor)}) := by
  intro k
  by_cases hkh : k = h
  · subst k
    simp only [put_holes_same, put_evidence_same]
    constructor
    · exact singletonCandidate_ne_empty v actor
    · intro candidate hm
      have heq : (v, actor) = candidate := by simpa using hm
      exact (congrArg Prod.fst heq).symm
  · simpa [put, hkh] using hwf k

theorem wf_put_disputed {s : State} (hwf : WF s) (h : HoleId)
    (cs : CSet) (hne : cs ≠ ∅) : WF (put s h (.disputed cs) cs) := by
  intro k
  by_cases hkh : k = h
  · subst k
    simp [put, hne]
  · simpa [put, hkh] using hwf k

theorem wf_put_decided {s : State} (hwf : WF s) (h : HoleId)
    (v : Value) (cs : CSet) (hmem : ValueAppears cs v) :
    WF (put s h (.decided v) cs) := by
  intro k
  by_cases hkh : k = h
  · subst k
    simpa [put] using hmem
  · simpa [put, hkh] using hwf k

/-- Appending a confirming same-value pair keeps a filled hole well-formed. -/
theorem wf_put_filled_append {s : State} (hwf : WF s) (h : HoleId) {w : Value}
    (hs : s.holes h = .filled w) (v : Value) (actor : Holder) (heq : w = v) :
    WF (put s h (.filled w) (s.evidence h ∪ {(v, actor)})) := by
  intro k
  by_cases hkh : k = h
  · subst k
    simp only [put_holes_same, put_evidence_same]
    have hfilled := hwf h
    simp only [hs] at hfilled
    refine ⟨finset_union_ne_empty_left hfilled.1, ?_⟩
    intro candidate hmem
    simp only [Std.ExtTreeSet.mem_union_iff] at hmem
    rcases hmem with hold | hnew
    · exact hfilled.2 candidate hold
    · have hpair : (v, actor) = candidate := by simpa using hnew
      rw [← hpair]
      exact heq.symm
  · simpa [put, hkh] using hwf k

/-- Appending a ghost receipt keeps a decided hole well-formed. -/
theorem wf_put_decided_append {s : State} (hwf : WF s) (h : HoleId) {w : Value}
    (hs : s.holes h = .decided w) (v : Value) (actor : Holder) :
    WF (put s h (.decided w) (s.evidence h ∪ {(v, actor)})) := by
  intro k
  by_cases hkh : k = h
  · subst k
    simp only [put_holes_same, put_evidence_same]
    have hdec := hwf h
    simp only [hs] at hdec
    rcases valueAppears_iff.mp hdec with ⟨holder, hmem⟩
    exact valueAppears_iff.mpr ⟨holder, Std.ExtTreeSet.mem_union_of_left hmem⟩
  · simpa [put, hkh] using hwf k

/-- Every admitted primitive step preserves well-formedness. -/
theorem step_preserves_wf {s s' : State} {m : Mv}
    (hwf : WF s) (hstep : step s m = some s') : WF s' := by
  cases m with
  | fill h v actor =>
    cases hs : s.holes h with
    | «open» =>
      simp [step, hs] at hstep
      subst s'
      exact wf_put_filled hwf h v actor
    | filled w =>
      by_cases hwv : w = v
      · simp [step, hs, hwv] at hstep
        subst s'
        exact hwf
      · simp [step, hs, hwv] at hstep
    | disputed cs => simp [step, hs] at hstep
    | decided old => simp [step, hs] at hstep
  | dispute h cs actor =>
    obtain ⟨hcs, hdec, rfl⟩ := step_dispute_cases hstep
    exact wf_put_disputed hwf h _ (finset_union_ne_empty_right hcs)
  | decide h v =>
    cases hs : s.holes h with
    | «open» => simp [step, hs] at hstep
    | filled old => simp [step, hs] at hstep
    | decided old => simp [step, hs] at hstep
    | disputed cs =>
      simp only [step, hs] at hstep
      by_cases hmem : ValueAppears cs v
      · rw [if_pos hmem] at hstep
        injection hstep with heq
        subst s'
        exact wf_put_decided hwf h v cs hmem
      · rw [if_neg hmem] at hstep
        contradiction

/-! ## Repair preservation and no-loss -/

theorem repair_preserves_wf {s s' : State} {m : Mv}
    (hwf : WF s) (hrepair : repair s m = some s') : WF s' := by
  cases m with
  | fill h v actor =>
    cases hs : s.holes h with
    | «open» | disputed _ =>
      simp only [repair, hs] at hrepair
      exact step_preserves_wf hwf hrepair
    | filled w =>
      by_cases heq : w = v
      · subst heq
        simp [repair, hs] at hrepair
        subst s'
        exact wf_put_filled_append hwf h hs w actor rfl
      · simp only [repair, hs, if_neg heq] at hrepair
        exact step_preserves_wf hwf hrepair
    | decided w =>
      simp [repair, hs] at hrepair
      subst s'
      exact wf_put_decided_append hwf h hs v actor
  | dispute h cs actor =>
    simp only [repair] at hrepair
    exact step_preserves_wf hwf hrepair
  | decide h v =>
    simp only [repair] at hrepair
    exact step_preserves_wf hwf hrepair

/-- Total repaired steps preserve well-formedness on admission and on
refusal alike. -/
theorem repairK_preserves_wf {s : State} {m : Mv} (hwf : WF s) :
    WF (repairK s m).1 := by
  cases hrepair : repair s m with
  | none => simpa [repairK, hrepair] using hwf
  | some s' =>
      simpa [repairK, hrepair] using repair_preserves_wf hwf hrepair

/-- Every arbitrary finite repaired trace has a well-formed terminal state;
there is no admitted-only execution premise. -/
theorem runRepairK_preserves_wf :
    ∀ (is : List Mv) (start : State), WF start → WF (runRepairK start is).1 := by
  intro is
  induction is with
  | nil => simp [runRepairK]
  | cons i rest ih =>
      intro start hwf
      simpa [runRepairK] using ih (repairK start i).1 (repairK_preserves_wf hwf)

theorem runRepair_preserves_wf :
    ∀ (is : List Mv) (start terminal : State), WF start →
      runRepair start is = some terminal → WF terminal := by
  intro is
  induction is with
  | nil =>
    intro start terminal hwf hrun
    simp only [runRepair] at hrun
    injection hrun with heq
    subst terminal
    exact hwf
  | cons i rest ih =>
    intro start terminal hwf hrun
    simp only [runRepair] at hrun
    cases hri : repair start i with
    | none => simp [hri] at hrun
    | some next =>
      rw [hri] at hrun
      simp only [Option.bind_some] at hrun
      exact ih next terminal (repair_preserves_wf hwf hri) hrun

def Recorded (s : State) (h : HoleId) (v : Value) : Prop :=
  ValueAppears (s.evidence h) v

/-- The exact no-loss disjunction at a terminal hole. A decided hole keeps
the resolved candidate pair-set in ghost journal evidence. -/
def TerminalCarries (s : State) (h : HoleId) (v : Value) : Prop :=
  match s.holes h with
  | .open => False
  | .filled w => w = v
  | .disputed cs => ValueAppears cs v
  | .decided chosen => chosen = v ∨ ValueAppears (s.evidence h) v

theorem wf_recorded_terminal {s : State} (hwf : WF s) {h : HoleId} {v : Value}
    (hrecorded : Recorded s h v) : TerminalCarries s h v := by
  cases hs : s.holes h with
  | «open» =>
    have hev := hwf h
    simp only [hs] at hev
    simp [Recorded, hev, ValueAppears] at hrecorded
  | filled w =>
    have hfilled := hwf h
    simp only [hs] at hfilled
    rcases valueAppears_iff.mp hrecorded with ⟨actor, hmem⟩
    simpa [TerminalCarries, hs] using (hfilled.2 (v, actor) hmem).symm
  | disputed cs =>
    have hdisputed := hwf h
    simp only [hs] at hdisputed
    simpa [TerminalCarries, hs, Recorded, hdisputed.2] using hrecorded
  | decided chosen =>
    simpa [TerminalCarries, hs] using (Or.inr hrecorded :
      chosen = v ∨ ValueAppears (s.evidence h) v)

/-- Journal evidence sits inside the prior candidates at every undecided
hole: empty at open, the journal itself at filled, the live set at disputed. -/
theorem wf_evidence_subset_prior {s : State} (hwf : WF s) (h : HoleId)
    (hdec : ∀ v, s.holes h ≠ .decided v) :
    ∀ candidate ∈ s.evidence h, candidate ∈ priorCandidates s h := by
  intro candidate hmem
  cases hs : s.holes h with
  | «open» =>
    have hopen := hwf h
    simp only [hs] at hopen
    rw [hopen] at hmem
    exact absurd hmem Std.ExtTreeSet.not_mem_empty
  | filled w =>
    simpa [priorCandidates, hs] using hmem
  | disputed cs =>
    have hdisputed := hwf h
    simp only [hs] at hdisputed
    rw [hdisputed.2] at hmem
    simpa [priorCandidates, hs] using hmem
  | decided w => exact absurd hs (hdec w)

/-- Primitive steps never delete journal evidence from a well-formed state. -/
theorem step_preserves_evidence {s s' : State} {m : Mv}
    (hwf : WF s) (hstep : step s m = some s') :
    ∀ h candidate, candidate ∈ s.evidence h → candidate ∈ s'.evidence h := by
  intro target candidate hmem
  cases m with
  | fill h v actor =>
    cases hs : s.holes h with
    | «open» =>
      simp [step, hs] at hstep
      subst s'
      by_cases htarget : target = h
      · subst target
        have hopen := hwf h
        simp only [hs] at hopen
        rw [hopen] at hmem
        exact absurd hmem Std.ExtTreeSet.not_mem_empty
      · simpa [put, htarget] using hmem
    | filled w =>
      by_cases heq : w = v
      · simp [step, hs, heq] at hstep
        subst s'
        exact hmem
      · simp [step, hs, heq] at hstep
    | disputed cs => simp [step, hs] at hstep
    | decided old => simp [step, hs] at hstep
  | dispute h cs actor =>
    obtain ⟨hcs, hdec, rfl⟩ := step_dispute_cases hstep
    by_cases htarget : target = h
    · subst target
      simpa [put] using Std.ExtTreeSet.mem_union_of_left
        (wf_evidence_subset_prior hwf h hdec candidate hmem)
    · simpa [put, htarget] using hmem
  | decide h chosen =>
    cases hs : s.holes h with
    | «open» => simp [step, hs] at hstep
    | filled old => simp [step, hs] at hstep
    | decided old => simp [step, hs] at hstep
    | disputed cs =>
      simp only [step, hs] at hstep
      by_cases hchosen : ValueAppears cs chosen
      · rw [if_pos hchosen] at hstep
        injection hstep with heq
        subst s'
        by_cases htarget : target = h
        · subst target
          have hdisputed := hwf h
          simp only [hs] at hdisputed
          simpa [put, hdisputed.2] using hmem
        · simpa [put, htarget] using hmem
      · rw [if_neg hchosen] at hstep
        contradiction

theorem repair_preserves_evidence {s s' : State} {m : Mv}
    (hwf : WF s) (hrepair : repair s m = some s') :
    ∀ h candidate, candidate ∈ s.evidence h → candidate ∈ s'.evidence h := by
  cases m with
  | fill h v actor =>
    cases hs : s.holes h with
    | «open» | disputed _ =>
      simp only [repair, hs] at hrepair
      exact step_preserves_evidence hwf hrepair
    | filled w =>
      by_cases heq : w = v
      · subst heq
        simp [repair, hs] at hrepair
        subst s'
        intro target candidate hmem
        by_cases htarget : target = h
        · subst target
          simp only [put_evidence_same]
          exact Std.ExtTreeSet.mem_union_of_left hmem
        · simpa [put, htarget] using hmem
      · simp only [repair, hs, if_neg heq] at hrepair
        exact step_preserves_evidence hwf hrepair
    | decided w =>
      simp [repair, hs] at hrepair
      subst s'
      intro target candidate hmem
      by_cases htarget : target = h
      · subst target
        simp only [put_evidence_same]
        exact Std.ExtTreeSet.mem_union_of_left hmem
      · simpa [put, htarget] using hmem
  | dispute h cs actor =>
    simp only [repair] at hrepair
    exact step_preserves_evidence hwf hrepair
  | decide h v =>
    simp only [repair] at hrepair
    exact step_preserves_evidence hwf hrepair

/-- Total repaired steps never delete evidence: refusal is the identity
transition and admission inherits `repair_preserves_evidence`. -/
theorem repairK_preserves_evidence {s : State} {m : Mv} (hwf : WF s) :
    ∀ h candidate, candidate ∈ s.evidence h →
      candidate ∈ (repairK s m).1.evidence h := by
  intro h candidate hmem
  cases hrepair : repair s m with
  | none => simpa [repairK, hrepair] using hmem
  | some s' =>
      simpa [repairK, hrepair] using
        repair_preserves_evidence hwf hrepair h candidate hmem

theorem runRepairK_preserves_evidence :
    ∀ (is : List Mv) (start : State), WF start →
      ∀ h candidate, candidate ∈ start.evidence h →
        candidate ∈ (runRepairK start is).1.evidence h := by
  intro is
  induction is with
  | nil => simp [runRepairK]
  | cons i rest ih =>
      intro start hwf h candidate hmem
      simpa [runRepairK] using ih (repairK start i).1 (repairK_preserves_wf hwf)
        h candidate (repairK_preserves_evidence hwf h candidate hmem)

theorem runRepair_preserves_evidence :
    ∀ (is : List Mv) (start terminal : State), WF start →
      runRepair start is = some terminal →
      ∀ h candidate, candidate ∈ start.evidence h → candidate ∈ terminal.evidence h := by
  intro is
  induction is with
  | nil =>
    intro start terminal _ hrun h candidate hmem
    simp only [runRepair] at hrun
    injection hrun with heq
    subst terminal
    exact hmem
  | cons i rest ih =>
    intro start terminal hwf hrun h candidate hmem
    simp only [runRepair] at hrun
    cases hri : repair start i with
    | none => simp [hri] at hrun
    | some next =>
      rw [hri] at hrun
      simp only [Option.bind_some] at hrun
      exact ih next terminal (repair_preserves_wf hwf hri) hrun h candidate
        (repair_preserves_evidence hwf hri h candidate hmem)

/-- Fills are total: every hole state admits a repaired fill. -/
theorem repair_fill_total (s : State) (h : HoleId) (v : Value) (actor : Holder) :
    (repair s (.fill h v actor)).isSome := by
  cases hs : s.holes h with
  | «open» => simp [repair, hs, step]
  | filled w =>
    by_cases heq : w = v
    · simp [repair, hs, heq]
    · simp only [repair, hs, if_neg heq]
      rw [step_dispute_admitted s h _ actor
        (canonicalRepairCandidates_ne_empty s h v actor)
        (fun u hu => by simp [hs] at hu)]
      simp
  | disputed cs =>
    simp only [repair, hs]
    rw [step_dispute_admitted s h _ actor (offer_ne_empty cs v actor)
      (fun u hu => by simp [hs] at hu)]
    simp
  | decided w => simp [repair, hs]

/-- A repaired fill journals the offered pair, at every hole state. -/
theorem repair_fill_records_pair {s s' : State} {h : HoleId} {v : Value}
    {actor : Holder} (hrepair : repair s (.fill h v actor) = some s') :
    ((v, actor) : Cand) ∈ s'.evidence h := by
  cases hs : s.holes h with
  | «open» =>
    simp [repair, hs, step] at hrepair
    subst s'
    simpa [put] using candidate_mem_singleton v actor
  | filled w =>
    by_cases heq : w = v
    · simp [repair, hs, heq] at hrepair
      subst s'
      simpa [put] using
        Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton v actor)
    · simp only [repair, hs, if_neg heq] at hrepair
      rw [step_dispute_admitted s h _ actor
        (canonicalRepairCandidates_ne_empty s h v actor)
        (fun u hu => by simp [hs] at hu)] at hrepair
      injection hrepair with heqState
      subst s'
      simp only [put_evidence_same]
      exact Std.ExtTreeSet.mem_union_of_right
        (Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton v actor))
  | disputed cs =>
    simp only [repair, hs] at hrepair
    rw [step_dispute_admitted s h _ actor (offer_ne_empty cs v actor)
      (fun u hu => by simp [hs] at hu)] at hrepair
    injection hrepair with heqState
    subst s'
    simp only [put_evidence_same]
    exact Std.ExtTreeSet.mem_union_of_right
      (Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton v actor))
  | decided w =>
    simp [repair, hs] at hrepair
    subst s'
    simpa [put] using
      Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton v actor)

theorem repair_records_fill {s s' : State}
    (h : HoleId) (v : Value) (actor : Holder)
    (hrepair : repair s (.fill h v actor) = some s') : Recorded s' h v :=
  valueAppears_iff.mpr ⟨actor, repair_fill_records_pair hrepair⟩

theorem runRepair_fills_recorded :
    ∀ (is : List Mv) (start terminal : State), WF start →
      runRepair start is = some terminal →
      ∀ h v actor, (.fill h v actor : Mv) ∈ is → Recorded terminal h v := by
  intro is
  induction is with
  | nil => simp
  | cons i rest ih =>
    intro start terminal hwf hrun h v actor hmem
    simp only [runRepair] at hrun
    cases hri : repair start i with
    | none => simp [hri] at hrun
    | some next =>
      rw [hri] at hrun
      simp only [Option.bind_some] at hrun
      rcases List.mem_cons.mp hmem with heq | htail
      · subst i
        rcases valueAppears_iff.mp (repair_records_fill h v actor hri) with
          ⟨recordHolder, hrecord⟩
        apply valueAppears_iff.mpr
        exact ⟨recordHolder, runRepair_preserves_evidence rest next terminal
          (repair_preserves_wf hwf hri) hrun h (v, recordHolder) hrecord⟩
      · exact ih next terminal (repair_preserves_wf hwf hri) hrun h v actor htail

/-- Every fill observed as admitted in a total repaired trace remains in the
terminal evidence, even when other moves in the trace are refused. -/
theorem runRepairK_fills_recorded :
    ∀ (is : List Mv) (start : State), WF start →
      ∀ h v actor,
        ((.fill h v actor, true) : Mv × Bool) ∈ (runRepairK start is).2 →
          Recorded (runRepairK start is).1 h v := by
  intro is
  induction is with
  | nil => simp [runRepairK]
  | cons i rest ih =>
      intro start hwf h v actor hmem
      cases hrepair : repair start i with
      | none =>
          simp only [runRepairK, repairK, hrepair] at hmem ⊢
          exact ih start hwf h v actor (by simpa using hmem)
      | some next =>
          simp only [runRepairK, repairK, hrepair] at hmem ⊢
          rcases List.mem_cons.mp hmem with hhead | htail
          · have hi : i = .fill h v actor := by
              exact congrArg Prod.fst hhead.symm
            subst i
            rcases valueAppears_iff.mp (repair_records_fill h v actor hrepair) with
              ⟨recordHolder, hrecord⟩
            apply valueAppears_iff.mpr
            exact ⟨recordHolder, runRepairK_preserves_evidence rest next
              (repair_preserves_wf hwf hrepair) h (v, recordHolder) hrecord⟩
          · exact ih next (repair_preserves_wf hwf hrepair) h v actor htail

/-- **No loss:** every fill intent in every complete repaired interleaving is
represented in the terminal meaning or in the dispute evidence retained by a
decision. This is strictly stronger than convergence. -/
theorem no_loss (intents : List Mv) (terminal : State) (hrun : Runs intents terminal) :
    ∀ h v actor, (.fill h v actor : Mv) ∈ intents → TerminalCarries terminal h v := by
  cases hrun with
  | schedule order hp hexec =>
    intro h v actor hmem
    have hinOrder : (.fill h v actor : Mv) ∈ order := hp.mem_iff.mpr hmem
    have hrecord := runRepair_fills_recorded order initial terminal initial_wf hexec
      h v actor hinOrder
    exact wf_recorded_terminal (runRepair_preserves_wf order initial terminal initial_wf hexec)
      hrecord

/-- **Strong no loss:** every fill in an arbitrary finite intent bag lands its
exact holder-attributed pair in terminal journal evidence. No refusal
disjunct: fills are total and the journal is monotone. -/
theorem runRepairK_fill_pair :
    ∀ (is : List Mv) (start : State), WF start →
      ∀ h v actor, (.fill h v actor : Mv) ∈ is →
        ((v, actor) : Cand) ∈ (runRepairK start is).1.evidence h := by
  intro is
  induction is with
  | nil => simp
  | cons i rest ih =>
      intro start hwf h v actor hmem
      rcases List.mem_cons.mp hmem with rfl | htail
      · cases hrepair : repair start (.fill h v actor) with
        | none =>
            have htotal := repair_fill_total start h v actor
            rw [hrepair] at htotal
            simp at htotal
        | some next =>
            simp only [runRepairK, repairK, hrepair]
            exact runRepairK_preserves_evidence rest next
              (repair_preserves_wf hwf hrepair) h (v, actor)
              (repair_fill_records_pair hrepair)
      · simpa [runRepairK] using
          ih (repairK start i).1 (repairK_preserves_wf hwf) h v actor htail

/-! ## Repairable clashes: frame, diamond, and confluence -/

def thenRepair (s : State) (m₁ m₂ : Mv) : Option State :=
  (repair s m₁).bind fun s' => repair s' m₂

def repairFillLocal (hs : HState) (ev : CSet) (v : Value) (actor : Holder) :
    Option (HState × CSet) :=
  match hs with
  | .open => some (.filled v, {(v, actor)})
  | .filled w =>
      if w = v then some (.filled w, ev ∪ {(v, actor)})
      else
        let merged := ev ∪ (ev ∪ {(v, actor)})
        some (.disputed merged, merged)
  | .disputed cs =>
      let merged := cs ∪ (cs ∪ {(v, actor)})
      some (.disputed merged, merged)
  | .decided w => some (.decided w, ev ∪ {(v, actor)})

theorem repair_fill_eq_local (s : State) (h : HoleId) (v : Value) (actor : Holder) :
    repair s (.fill h v actor) =
      (repairFillLocal (s.holes h) (s.evidence h) v actor).map
        (fun result => put s h result.1 result.2) := by
  cases hs : s.holes h with
  | «open» =>
    simp [repair, repairFillLocal, step, hs, canonicalRepairCandidates, priorCandidates]
  | disputed cs =>
    rw [repair.eq_def]
    simp only [hs]
    rw [step_dispute_admitted s h _ actor (offer_ne_empty cs v actor)
      (fun w hw => by simp [hs] at hw)]
    simp [repairFillLocal, priorCandidates, hs]
  | decided chosen =>
    simp [repair, repairFillLocal, step, hs, canonicalRepairCandidates, priorCandidates]
  | filled w =>
    by_cases heq : w = v
    · simp [repair, repairFillLocal, hs, heq]
    · rw [repair.eq_def]
      simp only [hs, if_neg heq]
      rw [step_dispute_admitted s h _ actor
        (canonicalRepairCandidates_ne_empty s h v actor)
        (fun u hu => by simp [hs] at hu)]
      simp [repairFillLocal, priorCandidates, hs, heq, canonicalRepairCandidates]

/-- The independence/frame step: repaired fills on distinct named holes form
the same diamond as primitive fills. -/
theorem repair_fill_comm (s : State) {h₁ h₂ : HoleId} (hne : h₁ ≠ h₂)
    (v₁ v₂ : Value) (a₁ a₂ : Holder) :
    thenRepair s (.fill h₁ v₁ a₁) (.fill h₂ v₂ a₂) =
      thenRepair s (.fill h₂ v₂ a₂) (.fill h₁ v₁ a₁) := by
  have hne' : h₂ ≠ h₁ := Ne.symm hne
  rw [thenRepair, repair_fill_eq_local, thenRepair, repair_fill_eq_local]
  cases hlocal₁ : repairFillLocal (s.holes h₁) (s.evidence h₁) v₁ a₁ <;>
    cases hlocal₂ : repairFillLocal (s.holes h₂) (s.evidence h₂) v₂ a₂ <;>
    simp [hlocal₁, hlocal₂, repair_fill_eq_local, put_holes_other,
      put_evidence_other, hne, hne', put_comm]

/-- A conflicting fill's canonical dispute repair retains both the old and
new values with holder attribution. -/
theorem clash_repair_admissible {s : State} (hwf : WF s) (h : HoleId)
    (v w : Value) (actor : Holder) (hstate : s.holes h = .filled w)
    (hne : v ≠ w) :
    ∃ (repaired : State) (cs : CSet),
      repair s (.fill h v actor) = some repaired ∧
      repaired.holes h = .disputed cs ∧ candidatesContain cs w v := by
  let offered : CSet := canonicalRepairCandidates s h v actor
  let merged : CSet := s.evidence h ∪ offered
  have hfilled := hwf h
  simp only [hstate] at hfilled
  have hwv : w ≠ v := Ne.symm hne
  let repaired : State := put s h (.disputed merged) merged
  refine ⟨repaired, merged, ?_, by simp [repaired], ?_⟩
  · simp only [repair, hstate, if_neg hwv]
    rw [step_dispute_admitted s h _ actor
      (canonicalRepairCandidates_ne_empty s h v actor)
      (fun u hu => by simp [hstate] at hu)]
    have hsets : priorCandidates s h ∪ canonicalRepairCandidates s h v actor =
        merged := by
      simp [priorCandidates, hstate, merged, offered]
    rw [hsets]
  · constructor
    · let oldCandidate := (s.evidence h).min hfilled.1
      have holdmem : oldCandidate ∈ s.evidence h := Std.ExtTreeSet.min_mem
      have holdvalue : oldCandidate.1 = w := hfilled.2 oldCandidate holdmem
      rcases oldCandidate with ⟨oldValue, oldHolder⟩
      simp only at holdvalue
      subst oldValue
      apply valueAppears_iff.mpr
      refine ⟨oldHolder, ?_⟩
      exact Std.ExtTreeSet.mem_union_of_left holdmem
    · apply valueAppears_iff.mpr
      refine ⟨actor, ?_⟩
      exact Std.ExtTreeSet.mem_union_of_right
        (Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton v actor))

/-- **Repairable-clash confluence:** the two orders of the same conflicting
fills reach the identical evidence-carrying disputed state. Together with
`repair_fill_comm`, this is strong local confluence for the E2 fill kernel;
no termination or renaming argument is involved. -/
theorem clash_repair_confluence (h : HoleId) (v w : Value) (a b : Holder)
    (hne : v ≠ w) :
    runRepair (initial : State) [.fill h v a, .fill h w b] =
      runRepair (initial : State) [.fill h w b, .fill h v a] := by
  rw [run_pair_of_conflict h v w a b hne,
    run_pair_of_conflict h w v b a (Ne.symm hne)]
  have hsets :
      ({(v, a)} : CSet) ∪ (({(v, a)} : CSet) ∪ ({(w, b)} : CSet)) =
        ({(w, b)} : CSet) ∪ (({(w, b)} : CSet) ∪ ({(v, a)} : CSet)) := by
    apply Std.ExtTreeSet.ext_mem
    intro candidate
    simp only [Std.ExtTreeSet.mem_union_iff]
    constructor
    · rintro (hm | hm | hm)
      · exact Or.inr (Or.inr hm)
      · exact Or.inr (Or.inr hm)
      · exact Or.inl hm
    · rintro (hm | hm | hm)
      · exact Or.inr (Or.inr hm)
      · exact Or.inr (Or.inr hm)
      · exact Or.inl hm
  rw [hsets]

/-! ## Fence path independence for arbitrary pair-set rules -/

def AllDisputesAt (h : HoleId) (is : List Mv) : Prop :=
  ∀ i ∈ is, ∃ cs actor, i = .dispute h cs actor ∧ cs ≠ ∅

def disputeUnion : List Mv → CSet
  | [] => ∅
  | .dispute _ cs _ :: is => cs ∪ disputeUnion is
  | _ :: is => disputeUnion is

theorem disputeUnion_perm {xs ys : List Mv} (hp : xs.Perm ys) :
    disputeUnion xs = disputeUnion ys := by
  induction hp with
  | nil => rfl
  | cons x _ ih =>
    cases x <;> simp [disputeUnion, ih]
  | swap x y rest =>
    cases x <;> cases y <;> simp [disputeUnion, finset_union_left_comm]
  | trans _ _ ih₁ ih₂ => exact ih₁.trans ih₂

theorem runFromDisputed (h : HoleId) :
    ∀ (is : List Mv) (base : CSet) (start terminal : State), base ≠ ∅ →
      start.holes h = .disputed base → start.evidence h = base →
      AllDisputesAt h is →
      runRepair start is = some terminal →
      terminal.holes h = .disputed (base ∪ disputeUnion is) ∧
        terminal.evidence h = base ∪ disputeUnion is := by
  intro is
  induction is with
  | nil =>
    intro base start terminal hbase hstart hev _ hrun
    simp only [runRepair] at hrun
    injection hrun with heq
    subst terminal
    simpa [disputeUnion, finset_union_empty_right] using And.intro hstart hev
  | cons i rest ih =>
    intro base start terminal hbase hstart hev hall hrun
    rcases hall i List.mem_cons_self with ⟨cs, actor, rfl, hcs⟩
    have hrest : AllDisputesAt h rest := by
      intro j hj
      exact hall j (List.mem_cons_of_mem _ hj)
    have hmerge : base ∪ cs ≠ ∅ := finset_union_ne_empty_right hcs
    let next := put start h (.disputed (base ∪ cs)) (base ∪ cs)
    have hstep : repair start (.dispute h cs actor) = some next := by
      simp only [repair]
      rw [step_dispute_admitted start h cs actor hcs
        (fun u hu => by simp [hstart] at hu)]
      simp [priorCandidates, hstart, next]
    simp only [runRepair, hstep, Option.bind_some] at hrun
    rcases ih (base ∪ cs) next terminal hmerge (by simp [next]) (by simp [next])
      hrest hrun with ⟨hh, he⟩
    constructor
    · simpa [disputeUnion, finset_union_assoc] using hh
    · simpa [disputeUnion, finset_union_assoc] using he

theorem run_all_disputes (h : HoleId) (is : List Mv) (terminal : State)
    (hneIs : is ≠ []) (hall : AllDisputesAt h is)
    (hrun : runRepair initial is = some terminal) :
    terminal.holes h = .disputed (disputeUnion is) ∧
      terminal.evidence h = disputeUnion is ∧ disputeUnion is ≠ ∅ := by
  cases is with
  | nil => exact absurd rfl hneIs
  | cons i rest =>
    rcases hall i List.mem_cons_self with ⟨cs, actor, rfl, hcs⟩
    have hrest : AllDisputesAt h rest := by
      intro j hj
      exact hall j (List.mem_cons_of_mem _ hj)
    have hfirst : (∅ : CSet) ∪ cs ≠ ∅ := by
      rw [finset_union_empty_left]
      exact hcs
    let first : State := put initial h (.disputed ((∅ : CSet) ∪ cs)) ((∅ : CSet) ∪ cs)
    have hstep : repair initial (.dispute h cs actor) = some first := by
      simp only [repair]
      rw [step_dispute_admitted initial h cs actor hcs
        (fun u hu => by simp [initial] at hu)]
      simp [priorCandidates, initial, first]
    simp only [runRepair, hstep, Option.bind_some] at hrun
    rcases runFromDisputed h rest ((∅ : CSet) ∪ cs) first terminal hfirst
      (by simp [first]) (by simp [first]) hrest hrun with ⟨hh, he⟩
    have hdu : disputeUnion (.dispute h cs actor :: rest) =
        ((∅ : CSet) ∪ cs) ∪ disputeUnion rest := by
      simp [disputeUnion, finset_union_empty_left]
    refine ⟨?_, ?_, ?_⟩
    · simpa [hdu] using hh
    · simpa [hdu] using he
    · rw [hdu]
      exact finset_union_ne_empty_left hfirst

/-- Select the candidate with the least value under the protocol's declared
value order. Pair-set storage order is deliberately irrelevant. -/
def minBetter (left right : Cand) : Cand :=
  if valueCmp left.1 right.1 = .gt then right else left

theorem minBetter_eq_left_or_right (left right : Cand) :
    minBetter (valueCmp := valueCmp) left right = left ∨
      minBetter (valueCmp := valueCmp) left right = right := by
  unfold minBetter
  split <;> simp_all

theorem minFold_mem (cs : CSet) :
    ∀ (xs : List Cand) (acc : Cand), acc ∈ cs →
      (∀ candidate ∈ xs, candidate ∈ cs) →
      xs.foldl (minBetter (valueCmp := valueCmp)) acc ∈ cs := by
  intro xs
  induction xs with
  | nil => simp
  | cons candidate rest ih =>
    intro acc hacc hall
    simp only [List.foldl]
    have hc : candidate ∈ cs := hall candidate List.mem_cons_self
    have hnext : minBetter (valueCmp := valueCmp) acc candidate ∈ cs := by
      rcases minBetter_eq_left_or_right (valueCmp := valueCmp) acc candidate with
        hleft | hright
      · simpa [hleft] using hacc
      · simpa [hright] using hc
    apply ih (minBetter (valueCmp := valueCmp) acc candidate) hnext
    intro item hitem
    exact hall item (List.mem_cons_of_mem _ hitem)

def minCandidate (cs : CSet) (hne : cs ≠ ∅) : Cand :=
  cs.toList.foldl (minBetter (valueCmp := valueCmp)) (cs.min hne)

theorem minCandidate_mem (cs : CSet) (hne : cs ≠ ∅) :
    minCandidate (valueCmp := valueCmp) cs hne ∈ cs := by
  apply minFold_mem (valueCmp := valueCmp) cs cs.toList (cs.min hne)
  · exact Std.ExtTreeSet.min_mem
  · intro candidate hmem
    exact Std.ExtTreeSet.mem_toList.mp hmem

/-- Canonical-min is the fixed-value-order instance of the general rule. -/
def minFenceRule : FenceRule Holder Value candidateCmp where
  choose := fun cs hne => (minCandidate (valueCmp := valueCmp) cs hne).1
  sound := by
    intro cs hne
    apply valueAppears_iff.mpr
    exact ⟨(minCandidate (valueCmp := valueCmp) cs hne).2,
      minCandidate_mem (valueCmp := valueCmp) cs hne⟩

def supportCount (cs : CSet) (v : Value) : Nat :=
  cs.toList.countP (fun candidate => decide (candidate.1 = v))

/-- More support wins; canonical value order breaks equal-count ties. -/
def pluralityBetter (cs : CSet) (left right : Cand) : Cand :=
  if supportCount cs left.1 < supportCount cs right.1 then right
  else if supportCount cs right.1 < supportCount cs left.1 then left
  else if valueCmp left.1 right.1 = .gt then right else left

theorem pluralityBetter_eq_left_or_right (cs : CSet) (left right : Cand) :
    pluralityBetter (valueCmp := valueCmp) cs left right = left ∨
      pluralityBetter (valueCmp := valueCmp) cs left right = right := by
  unfold pluralityBetter
  by_cases hleft : supportCount cs left.1 < supportCount cs right.1
  · simp [hleft]
  · simp only [hleft, ↓reduceIte]
    by_cases hright : supportCount cs right.1 < supportCount cs left.1
    · simp [hright]
    · simp only [hright, ↓reduceIte]
      by_cases htie : valueCmp left.1 right.1 = .gt <;> simp [htie]

theorem pluralityFold_mem (cs : CSet) :
    ∀ (xs : List Cand) (acc : Cand), acc ∈ cs →
      (∀ candidate ∈ xs, candidate ∈ cs) →
      xs.foldl (pluralityBetter (valueCmp := valueCmp) cs) acc ∈ cs := by
  intro xs
  induction xs with
  | nil => simp
  | cons candidate rest ih =>
    intro acc hacc hall
    simp only [List.foldl]
    have hc : candidate ∈ cs := hall candidate List.mem_cons_self
    have hnext : pluralityBetter (valueCmp := valueCmp) cs acc candidate ∈ cs := by
      rcases pluralityBetter_eq_left_or_right (valueCmp := valueCmp) cs acc candidate with
        hleft | hright
      · simpa [hleft] using hacc
      · simpa [hright] using hc
    apply ih (pluralityBetter (valueCmp := valueCmp) cs acc candidate) hnext
    intro item hitem
    exact hall item (List.mem_cons_of_mem _ hitem)

def pluralityCandidate (cs : CSet) (hne : cs ≠ ∅) : Cand :=
  cs.toList.foldl (pluralityBetter (valueCmp := valueCmp) cs) (cs.min hne)

theorem pluralityCandidate_mem (cs : CSet) (hne : cs ≠ ∅) :
    pluralityCandidate (valueCmp := valueCmp) cs hne ∈ cs := by
  apply pluralityFold_mem (valueCmp := valueCmp) cs cs.toList (cs.min hne)
  · exact Std.ExtTreeSet.min_mem
  · intro candidate hmem
    exact Std.ExtTreeSet.mem_toList.mp hmem

def pluralityFenceRule : FenceRule Holder Value candidateCmp where
  choose := fun cs hne => (pluralityCandidate (valueCmp := valueCmp) cs hne).1
  sound := by
    intro cs hne
    apply valueAppears_iff.mpr
    exact ⟨(pluralityCandidate (valueCmp := valueCmp) cs hne).2,
      pluralityCandidate_mem (valueCmp := valueCmp) cs hne⟩

/-- **Fence path independence (general form):** candidate accumulation is
interleaving-independent, hence every sound rule that is solely a function of
the canonical pair-set makes the same decision under every interleaving. -/
theorem fence_deterministic (h : HoleId) (intents : List Mv)
    (hneIntents : intents ≠ []) (hall : AllDisputesAt h intents)
    (rule : FenceRule Holder Value candidateCmp) (s₁ s₂ : State)
    (r₁ : Runs intents s₁) (r₂ : Runs intents s₂) :
    ∃ cs, ∃ hne : cs ≠ ∅,
      s₁.holes h = .disputed cs ∧ s₂.holes h = .disputed cs ∧
      step s₁ (.decide h (rule.choose cs hne)) =
        some (put s₁ h (.decided (rule.choose cs hne)) cs) ∧
      step s₂ (.decide h (rule.choose cs hne)) =
        some (put s₂ h (.decided (rule.choose cs hne)) cs) := by
  cases r₁ with
  | schedule order₁ hp₁ he₁ =>
    cases r₂ with
    | schedule order₂ hp₂ he₂ =>
      have hall₁ : AllDisputesAt h order₁ := by
        intro i hi
        exact hall i (hp₁.mem_iff.mp hi)
      have hall₂ : AllDisputesAt h order₂ := by
        intro i hi
        exact hall i (hp₂.mem_iff.mp hi)
      have hne₁ : order₁ ≠ [] := by
        intro heq
        subst order₁
        exact hneIntents (List.eq_nil_of_length_eq_zero hp₁.length_eq.symm)
      have hne₂ : order₂ ≠ [] := by
        intro heq
        subst order₂
        exact hneIntents (List.eq_nil_of_length_eq_zero hp₂.length_eq.symm)
      rcases run_all_disputes h order₁ s₁ hne₁ hall₁ he₁ with ⟨hh₁, hev₁, hn₁⟩
      rcases run_all_disputes h order₂ s₂ hne₂ hall₂ he₂ with ⟨hh₂, hev₂, hn₂⟩
      have hu₁ : disputeUnion order₁ = disputeUnion intents := disputeUnion_perm hp₁
      have hu₂ : disputeUnion order₂ = disputeUnion intents := disputeUnion_perm hp₂
      let cs := disputeUnion intents
      have hne : cs ≠ ∅ := by simpa [cs, hu₁] using hn₁
      have hsound : ValueAppears cs (rule.choose cs hne) := rule.sound cs hne
      refine ⟨cs, hne, by simpa [cs, hu₁] using hh₁,
        by simpa [cs, hu₂] using hh₂, ?_, ?_⟩
      · simp only [step, cs, hu₁, hh₁, if_pos hsound]
      · simp only [step, cs, hu₂, hh₂, if_pos hsound]

theorem min_fence_deterministic (h : HoleId) (intents : List Mv)
    (hneIntents : intents ≠ []) (hall : AllDisputesAt h intents) (s₁ s₂ : State)
    (r₁ : Runs intents s₁) (r₂ : Runs intents s₂) :
    ∃ cs, ∃ hne : cs ≠ ∅,
      s₁.holes h = .disputed cs ∧ s₂.holes h = .disputed cs ∧
      step s₁ (.decide h ((minFenceRule (valueCmp := valueCmp)
        (candidateCmp := candidateCmp)).choose cs hne)) =
        some (put s₁ h (.decided ((minFenceRule (valueCmp := valueCmp)
          (candidateCmp := candidateCmp)).choose cs hne)) cs) ∧
      step s₂ (.decide h ((minFenceRule (valueCmp := valueCmp)
        (candidateCmp := candidateCmp)).choose cs hne)) =
        some (put s₂ h (.decided ((minFenceRule (valueCmp := valueCmp)
          (candidateCmp := candidateCmp)).choose cs hne)) cs) :=
  fence_deterministic h intents hneIntents hall
    (minFenceRule (valueCmp := valueCmp) (candidateCmp := candidateCmp)) s₁ s₂ r₁ r₂

theorem plurality_fence_deterministic (h : HoleId) (intents : List Mv)
    (hneIntents : intents ≠ []) (hall : AllDisputesAt h intents) (s₁ s₂ : State)
    (r₁ : Runs intents s₁) (r₂ : Runs intents s₂) :
    ∃ cs, ∃ hne : cs ≠ ∅,
      s₁.holes h = .disputed cs ∧ s₂.holes h = .disputed cs ∧
      step s₁ (.decide h ((pluralityFenceRule (valueCmp := valueCmp)
        (candidateCmp := candidateCmp)).choose cs hne)) =
        some (put s₁ h (.decided ((pluralityFenceRule (valueCmp := valueCmp)
          (candidateCmp := candidateCmp)).choose cs hne)) cs) ∧
      step s₂ (.decide h ((pluralityFenceRule (valueCmp := valueCmp)
        (candidateCmp := candidateCmp)).choose cs hne)) =
        some (put s₂ h (.decided ((pluralityFenceRule (valueCmp := valueCmp)
          (candidateCmp := candidateCmp)).choose cs hne)) cs) :=
  fence_deterministic h intents hneIntents hall
    (pluralityFenceRule (valueCmp := valueCmp) (candidateCmp := candidateCmp)) s₁ s₂ r₁ r₂

/-! ## Stability (the E2 consumer addendum) -/

def Move.hole : Mv → HoleId
  | .fill h _ _ | .dispute h _ _ | .decide h _ => h

theorem step_preserves_other {s s' : State} (m : Mv) {h : HoleId}
    (hne : m.hole ≠ h) (hstep : step s m = some s') :
    s'.holes h = s.holes h := by
  cases m with
  | fill k value actor =>
    simp only [Move.hole] at hne
    cases hk : s.holes k with
    | «open» =>
      simp [step, hk] at hstep
      subst s'
      simp [put, Ne.symm hne]
    | filled old =>
      by_cases heq : old = value
      · simp [step, hk, heq] at hstep
        subst s'
        rfl
      · simp [step, hk, heq] at hstep
    | disputed cs => simp [step, hk] at hstep
    | decided old => simp [step, hk] at hstep
  | dispute k cs actor =>
    simp only [Move.hole] at hne
    obtain ⟨hcs, hdec, rfl⟩ := step_dispute_cases hstep
    simp [put, Ne.symm hne]
  | decide k value =>
    simp only [Move.hole] at hne
    cases hk : s.holes k with
    | «open» => simp [step, hk] at hstep
    | filled old => simp [step, hk] at hstep
    | decided old => simp [step, hk] at hstep
    | disputed cs =>
      simp only [step, hk] at hstep
      by_cases hmem : ValueAppears cs value
      · rw [if_pos hmem] at hstep
        injection hstep with heq
        subst s'
        simp [put, Ne.symm hne]
      · rw [if_neg hmem] at hstep
        contradiction

/-- `decided` is a tombstone-like monotone encoding: no admitted later move
can revise it within the session. -/
theorem decided_stable {s s' : State} {h : HoleId} {v : Value} {m : Mv}
    (hdecided : s.holes h = .decided v) (hstep : step s m = some s') :
    s'.holes h = .decided v := by
  by_cases htarget : m.hole = h
  · cases m with
    | fill k value actor =>
      simp only [Move.hole] at htarget
      subst k
      simp [step, hdecided] at hstep
    | dispute k cs actor =>
      simp only [Move.hole] at htarget
      subst k
      simp [step, hdecided] at hstep
    | decide k value =>
      simp only [Move.hole] at htarget
      subst k
      simp [step, hdecided] at hstep
  · rw [step_preserves_other m htarget hstep, hdecided]

theorem repair_preserves_other {s s' : State} (m : Mv) {h : HoleId}
    (hne : m.hole ≠ h) (hrepair : repair s m = some s') :
    s'.holes h = s.holes h := by
  cases m with
  | fill k value actor =>
    simp only [Move.hole] at hne
    rw [repair_fill_eq_local] at hrepair
    cases hlocal : repairFillLocal (s.holes k) (s.evidence k) value actor with
    | none => simp [hlocal] at hrepair
    | some result =>
      simp [hlocal] at hrepair
      subst s'
      simp [put, Ne.symm hne]
  | dispute k cs actor =>
    simp only [repair] at hrepair
    exact step_preserves_other (.dispute k cs actor) hne hrepair
  | decide k value =>
    simp only [repair] at hrepair
    exact step_preserves_other (.decide k value) hne hrepair

/-- The ratified single-seat premise lives in moves, not meaning state: every
intent targeting the hole is the same value from the same holder. -/
def SeatConsistent (h : HoleId) (actor : Holder) (v : Value) (is : List Mv) : Prop :=
  ∀ i ∈ is, i.hole = h → i = .fill h v actor

theorem runRepair_single_seat (h : HoleId) (actor : Holder) (v : Value) :
    ∀ (is : List Mv) (start terminal : State),
      SeatConsistent h actor v is →
      (start.holes h = .open ∨ start.holes h = .filled v) →
      runRepair start is = some terminal →
      terminal.holes h = .open ∨ terminal.holes h = .filled v := by
  intro is
  induction is with
  | nil =>
    intro start terminal _ hinv hrun
    simp only [runRepair] at hrun
    injection hrun with heq
    subst terminal
    exact hinv
  | cons i rest ih =>
    intro start terminal hseat hinv hrun
    have hrest : SeatConsistent h actor v rest := by
      intro j hj hh
      exact hseat j (List.mem_cons_of_mem _ hj) hh
    simp only [runRepair] at hrun
    cases hri : repair start i with
    | none => simp [hri] at hrun
    | some next =>
      rw [hri] at hrun
      simp only [Option.bind_some] at hrun
      have hnext : next.holes h = .open ∨ next.holes h = .filled v := by
        by_cases hi : i.hole = h
        · have hieq := hseat i List.mem_cons_self hi
          subst i
          rcases hinv with hopen | hfilled
          · simp [repair, hopen, step] at hri
            subst next
            exact Or.inr (by simp [put])
          · simp [repair, hfilled] at hri
            subst next
            exact Or.inr (put_holes_same start h _ _)
        · rw [repair_preserves_other i hi hri]
          exact hinv
      exact ih next terminal hrest hnext hrun

/-- **Single-seat stability:** every interleaving of value-consistent fills by
the declared holder leaves the meaning open or filled with that value. -/
theorem single_seat_stable (h : HoleId) (actor : Holder) (v : Value)
    (intents : List Mv) (hseat : SeatConsistent h actor v intents)
    (terminal : State) (hrun : Runs intents terminal) :
    terminal.holes h = .open ∨ terminal.holes h = .filled v := by
  cases hrun with
  | schedule order hp hexec =>
    have hseatOrder : SeatConsistent h actor v order := by
      intro i hi hh
      exact hseat i (hp.mem_iff.mp hi) hh
    exact runRepair_single_seat h actor v order initial terminal hseatOrder
      (Or.inl rfl) hexec

/-! ## The wire diamond: fill and dispute moves commute unconditionally -/

/-- Wire moves: fills and disputes. Decide enters only through the fence at
close, so schedule-freedom is stated for this fragment. -/
def WireMove : Mv → Prop
  | .decide _ _ => False
  | _ => True

theorem wireMove_of_not_decide {m : Mv} (hm : ∀ h v, m ≠ .decide h v) :
    WireMove m := by
  cases m with
  | fill _ _ _ => trivial
  | dispute _ _ _ => trivial
  | decide h v => exact absurd rfl (hm h v)

def repairDisputeLocal (hs : HState) (ev : CSet) (cs : CSet) :
    Option (HState × CSet) :=
  match hs with
  | .decided _ => none
  | .open =>
      if cs = ∅ then none
      else some (.disputed ((∅ : CSet) ∪ cs), (∅ : CSet) ∪ cs)
  | .filled _ =>
      if cs = ∅ then none else some (.disputed (ev ∪ cs), ev ∪ cs)
  | .disputed old =>
      if cs = ∅ then none else some (.disputed (old ∪ cs), old ∪ cs)

theorem repair_dispute_eq_local (s : State) (h : HoleId) (cs : CSet)
    (actor : Holder) :
    repair s (.dispute h cs actor) =
      (repairDisputeLocal (s.holes h) (s.evidence h) cs).map
        (fun result => put s h result.1 result.2) := by
  cases hs : s.holes h with
  | decided w => simp [repair, step, hs, repairDisputeLocal]
  | «open» =>
    by_cases hcs : cs = ∅
    · subst hcs
      simp only [repair]
      rw [step_dispute_empty]
      simp [repairDisputeLocal, hs]
    · simp only [repair]
      rw [step_dispute_admitted s h cs actor hcs (fun u hu => by simp [hs] at hu)]
      simp [repairDisputeLocal, hs, hcs, priorCandidates]
  | filled w =>
    by_cases hcs : cs = ∅
    · subst hcs
      simp only [repair]
      rw [step_dispute_empty]
      simp [repairDisputeLocal, hs]
    · simp only [repair]
      rw [step_dispute_admitted s h cs actor hcs (fun u hu => by simp [hs] at hu)]
      simp [repairDisputeLocal, hs, hcs, priorCandidates]
  | disputed old =>
    by_cases hcs : cs = ∅
    · subst hcs
      simp only [repair]
      rw [step_dispute_empty]
      simp [repairDisputeLocal, hs]
    · simp only [repair]
      rw [step_dispute_admitted s h cs actor hcs (fun u hu => by simp [hs] at hu)]
      simp [repairDisputeLocal, hs, hcs, priorCandidates]

/-- One wire move's effect on a single hole's (meaning, journal) cell;
refusal is the identity. -/
def cellApply (m : Mv) (cell : HState × CSet) : HState × CSet :=
  match m with
  | .fill _ v actor =>
      match repairFillLocal cell.1 cell.2 v actor with
      | some result => result
      | none => cell
  | .dispute _ cs _ =>
      match repairDisputeLocal cell.1 cell.2 cs with
      | some result => result
      | none => cell
  | .decide _ _ => cell

/-- A total repaired wire step is exactly the local cell update at its hole. -/
theorem repairK_cell (s : State) {m : Mv} (hw : WireMove m) :
    (repairK s m).1 =
      put s m.hole (cellApply m (s.holes m.hole, s.evidence m.hole)).1
        (cellApply m (s.holes m.hole, s.evidence m.hole)).2 := by
  cases m with
  | decide h v => exact absurd hw (by simp [WireMove])
  | fill h v actor =>
    simp only [Move.hole]
    cases hlocal : repairFillLocal (s.holes h) (s.evidence h) v actor with
    | none =>
      have hrepair : repair s (.fill h v actor) = none := by
        rw [repair_fill_eq_local, hlocal]
        rfl
      simp only [repairK, hrepair, cellApply, hlocal]
      exact (put_current s h).symm
    | some result =>
      have hrepair : repair s (.fill h v actor) =
          some (put s h result.1 result.2) := by
        rw [repair_fill_eq_local, hlocal]
        rfl
      simp only [repairK, hrepair, cellApply, hlocal]
  | dispute h cs actor =>
    simp only [Move.hole]
    cases hlocal : repairDisputeLocal (s.holes h) (s.evidence h) cs with
    | none =>
      have hrepair : repair s (.dispute h cs actor) = none := by
        rw [repair_dispute_eq_local, hlocal]
        rfl
      simp only [repairK, hrepair, cellApply, hlocal]
      exact (put_current s h).symm
    | some result =>
      have hrepair : repair s (.dispute h cs actor) =
          some (put s h result.1 result.2) := by
        rw [repair_dispute_eq_local, hlocal]
        rfl
      simp only [repairK, hrepair, cellApply, hlocal]

theorem cellApply_dispute_empty (h : HoleId) (actor : Holder)
    (cell : HState × CSet) :
    cellApply (.dispute h (∅ : CSet) actor) cell = cell := by
  obtain ⟨hs, ev⟩ := cell
  cases hs <;> simp [cellApply, repairDisputeLocal]

/-- Pair-set equality by membership; the disjunction shuffle is decided by
`grind`. -/
local macro "cell_union_eq" : tactic =>
  `(tactic|
    (apply Std.ExtTreeSet.ext_mem
     intro mem_candidate
     simp only [Std.ExtTreeSet.mem_union_iff, Std.ExtTreeSet.not_mem_empty,
       false_or, or_false]
     grind))

/-- **The wire diamond:** two wire moves commute on a single cell, with no
well-formedness premise. Refusals are identities, admissions are joins, and
joins commute. -/
theorem cellApply_comm {m₁ m₂ : Mv} (hw₁ : WireMove m₁) (hw₂ : WireMove m₂)
    (cell : HState × CSet) :
    cellApply m₂ (cellApply m₁ cell) = cellApply m₁ (cellApply m₂ cell) := by
  obtain ⟨hs, ev⟩ := cell
  cases m₁ with
  | decide h v => exact absurd hw₁ (by simp [WireMove])
  | fill h₁ v₁ a₁ =>
    cases m₂ with
    | decide h v => exact absurd hw₂ (by simp [WireMove])
    | fill h₂ v₂ a₂ =>
      cases hs with
      | «open» =>
        by_cases h12 : v₁ = v₂
        · simp [cellApply, repairFillLocal, h12]
          all_goals cell_union_eq
        · have h21 : v₂ ≠ v₁ := Ne.symm h12
          simp [cellApply, repairFillLocal, h12, h21]
          all_goals cell_union_eq
      | filled w =>
        by_cases hv₁ : w = v₁ <;> by_cases hv₂ : w = v₂
        · have h12 : v₁ = v₂ := hv₁.symm.trans hv₂
          simp [cellApply, repairFillLocal, hv₁, h12]
          all_goals cell_union_eq
        · have h12 : ¬ v₁ = v₂ := fun heq => hv₂ (hv₁.trans heq)
          simp [cellApply, repairFillLocal, hv₁, hv₂, h12]
          all_goals cell_union_eq
        · have h21 : ¬ v₂ = v₁ := fun heq => hv₁ (hv₂.trans heq)
          simp [cellApply, repairFillLocal, hv₁, hv₂, h21]
          all_goals cell_union_eq
        · simp [cellApply, repairFillLocal, hv₁, hv₂]
          all_goals cell_union_eq
      | disputed d =>
        simp [cellApply, repairFillLocal]
        all_goals cell_union_eq
      | decided w =>
        simp [cellApply, repairFillLocal]
        all_goals cell_union_eq
    | dispute h₂ cs₂ a₂ =>
      by_cases hcs : cs₂ = ∅
      · subst hcs
        rw [cellApply_dispute_empty, cellApply_dispute_empty]
      · cases hs with
        | «open» =>
          simp [cellApply, repairFillLocal, repairDisputeLocal, hcs]
          all_goals cell_union_eq
        | filled w =>
          by_cases hwv : w = v₁ <;>
            simp [cellApply, repairFillLocal, repairDisputeLocal, hcs, hwv] <;>
            all_goals cell_union_eq
        | disputed d =>
          simp [cellApply, repairFillLocal, repairDisputeLocal, hcs]
          all_goals cell_union_eq
        | decided w =>
          simp [cellApply, repairFillLocal, repairDisputeLocal, hcs]
          all_goals cell_union_eq
  | dispute h₁ cs₁ a₁ =>
    cases m₂ with
    | decide h v => exact absurd hw₂ (by simp [WireMove])
    | fill h₂ v₂ a₂ =>
      by_cases hcs : cs₁ = ∅
      · subst hcs
        rw [cellApply_dispute_empty, cellApply_dispute_empty]
      · cases hs with
        | «open» =>
          simp [cellApply, repairFillLocal, repairDisputeLocal, hcs]
          all_goals cell_union_eq
        | filled w =>
          by_cases hwv : w = v₂ <;>
            simp [cellApply, repairFillLocal, repairDisputeLocal, hcs, hwv] <;>
            all_goals cell_union_eq
        | disputed d =>
          simp [cellApply, repairFillLocal, repairDisputeLocal, hcs]
          all_goals cell_union_eq
        | decided w =>
          simp [cellApply, repairFillLocal, repairDisputeLocal, hcs]
          all_goals cell_union_eq
    | dispute h₂ cs₂ a₂ =>
      by_cases hcs₁ : cs₁ = ∅
      · subst hcs₁
        rw [cellApply_dispute_empty, cellApply_dispute_empty]
      · by_cases hcs₂ : cs₂ = ∅
        · subst hcs₂
          rw [cellApply_dispute_empty, cellApply_dispute_empty]
        · cases hs with
          | «open» =>
            simp [cellApply, repairDisputeLocal, hcs₁, hcs₂]
            all_goals cell_union_eq
          | filled w =>
            simp [cellApply, repairDisputeLocal, hcs₁, hcs₂]
            all_goals cell_union_eq
          | disputed d =>
            simp [cellApply, repairDisputeLocal, hcs₁, hcs₂]
            all_goals cell_union_eq
          | decided w =>
            simp [cellApply, repairDisputeLocal, hcs₁, hcs₂]
            all_goals cell_union_eq

/-- Wire moves commute at the state level, same hole or different. -/
theorem repairK_comm (s : State) {m₁ m₂ : Mv} (hw₁ : WireMove m₁)
    (hw₂ : WireMove m₂) :
    (repairK (repairK s m₁).1 m₂).1 = (repairK (repairK s m₂).1 m₁).1 := by
  by_cases hh : m₁.hole = m₂.hole
  · rw [repairK_cell s hw₁, repairK_cell _ hw₂, repairK_cell s hw₂,
      repairK_cell _ hw₁, ← hh]
    have heta : ∀ p : HState × CSet, ((p.1, p.2) : HState × CSet) = p :=
      fun _ => rfl
    simp only [put_holes_same, put_evidence_same, put_put_same, heta]
    rw [cellApply_comm hw₁ hw₂]
  · have hne' : m₂.hole ≠ m₁.hole := Ne.symm hh
    rw [repairK_cell s hw₁, repairK_cell _ hw₂, repairK_cell s hw₂,
      repairK_cell _ hw₁,
      put_holes_other s hne', put_evidence_other s hne',
      put_holes_other s hh, put_evidence_other s hh,
      put_comm s hh]

/-- **Wire confluence:** the total runner's terminal state — meaning and
journal both — is invariant under permutation of any fill/dispute bag. -/
theorem runRepairK_perm {l₁ l₂ : List Mv} (hperm : l₁.Perm l₂) :
    (∀ m ∈ l₁, WireMove m) →
      ∀ s : State, (runRepairK s l₁).1 = (runRepairK s l₂).1 := by
  induction hperm with
  | nil => intro _ s; rfl
  | cons x hperm ih =>
    intro hw s
    simp only [runRepairK]
    exact ih (fun m hm => hw m (List.mem_cons_of_mem _ hm)) _
  | swap x y l =>
    intro hw s
    simp only [runRepairK]
    rw [repairK_comm s (hw y List.mem_cons_self)
      (hw x (List.mem_cons_of_mem _ List.mem_cons_self))]
  | trans h₁₂ h₂₃ ih₁ ih₂ =>
    intro hw s
    rw [ih₁ hw s, ih₂ (fun m hm => hw m (h₁₂.mem_iff.mpr hm)) s]

/-- Decisions survive totalization: no repaired move, admitted or refused,
revises a decided hole. -/
theorem repairK_decided_stable (s : State) (m : Mv) (h : HoleId) (v : Value)
    (hdec : s.holes h = .decided v) : (repairK s m).1.holes h = .decided v := by
  cases hrepair : repair s m with
  | none => simpa [repairK, hrepair] using hdec
  | some s' =>
    simp only [repairK, hrepair]
    cases m with
    | fill h' v' actor =>
      by_cases hh : h' = h
      · subst hh
        simp only [repair, hdec] at hrepair
        injection hrepair with heq
        subst s'
        exact put_holes_same s h' _ _
      · rw [repair_preserves_other _ (by simpa [Move.hole] using hh) hrepair, hdec]
    | dispute h' cs actor =>
      by_cases hh : h' = h
      · subst hh
        obtain ⟨hcs, hdec', rfl⟩ :=
          step_dispute_cases (show step s (.dispute h' cs actor) = some s' from hrepair)
        exact absurd hdec (hdec' v)
      · rw [repair_preserves_other _ (by simpa [Move.hole] using hh) hrepair, hdec]
    | decide h' v' =>
      by_cases hh : h' = h
      · subst hh
        simp [repair, step, hdec] at hrepair
      · rw [repair_preserves_other _ (by simpa [Move.hole] using hh) hrepair, hdec]

/-! ## Refusal characterization and observation alignment -/

/-- The total runner marks a move refused exactly when the calculus has no
transition for it. -/
theorem repairK_false_iff (s : State) (m : Mv) :
    (repairK s m).2 = false ↔ repair s m = none := by
  cases hrepair : repair s m with
  | none => simp [repairK, hrepair]
  | some s' => simp [repairK, hrepair]

/-- The total runner admits with result `s'` exactly when the calculus steps
to `s'`. -/
theorem repairK_iff_admitted (s s' : State) (m : Mv) :
    repairK s m = (s', true) ↔ repair s m = some s' := by
  cases hrepair : repair s m with
  | none => simp [repairK, hrepair]
  | some s'' => simp [repairK, hrepair, eq_comm]

theorem repair_fill_ne_none (s : State) (h : HoleId) (v : Value)
    (actor : Holder) : repair s (.fill h v actor) ≠ none := by
  intro hnone
  have htotal := repair_fill_total s h v actor
  rw [hnone] at htotal
  simp at htotal

theorem repair_dispute_none_iff (s : State) (h : HoleId) (cs : CSet)
    (actor : Holder) :
    repair s (.dispute h cs actor) = none ↔
      (∃ v, s.holes h = .decided v) ∨ cs = ∅ := by
  constructor
  · intro hnone
    by_cases hcs : cs = ∅
    · exact Or.inr hcs
    · cases hsh : s.holes h with
      | decided w => exact Or.inl ⟨w, rfl⟩
      | «open» =>
        simp only [repair] at hnone
        rw [step_dispute_admitted s h cs actor hcs
          (fun u hu => by simp [hsh] at hu)] at hnone
        cases hnone
      | filled w =>
        simp only [repair] at hnone
        rw [step_dispute_admitted s h cs actor hcs
          (fun u hu => by simp [hsh] at hu)] at hnone
        cases hnone
      | disputed old =>
        simp only [repair] at hnone
        rw [step_dispute_admitted s h cs actor hcs
          (fun u hu => by simp [hsh] at hu)] at hnone
        cases hnone
  · intro hd
    rcases hd with ⟨v, hv⟩ | hcs
    · simp [repair, step, hv]
    · subst hcs
      simp only [repair]
      exact step_dispute_empty s h actor

theorem repair_decide_none_iff (s : State) (h : HoleId) (v : Value) :
    repair s (.decide h v) = none ↔
      match s.holes h with
      | .disputed cs => ¬ ValueAppears cs v
      | _ => True := by
  show step s (.decide h v) = none ↔ _
  cases hsh : s.holes h with
  | disputed cs => by_cases hva : ValueAppears cs v <;> simp [step, hsh, hva]
  | «open» => simp [step, hsh]
  | filled w => simp [step, hsh]
  | decided w => simp [step, hsh]

/-- Observation alignment: the receipt list is the input list, one aligned
admitted/refused bit per intent, never aborting. -/
theorem runRepairK_alignment (s : State) (l : List Mv) :
    (runRepairK s l).2.map Prod.fst = l := by
  induction l generalizing s with
  | nil => rfl
  | cons m ms ih => simp [runRepairK, ih]

/-! ## IC4: no fair resolute fence -/

theorem twoCandidateValues {x v w : Value} {a b : Holder}
    (hmem : ValueAppears ({(v, a), (w, b)} : CSet) x) : x = v ∨ x = w := by
  rcases valueAppears_iff.mp hmem with ⟨actor, hpair⟩
  have hcases : (v, a) = (x, actor) ∨ (w, b) = (x, actor) := by
    simpa using hpair
  rcases hcases with hfirst | hsecond
  · left
    exact (congrArg Prod.fst hfirst).symm
  · right
    exact (congrArg Prod.fst hsecond).symm

/-- **IC4 impossibility:** once a total fence must select a represented value,
it cannot make a two-value conflict agree with both sides symmetrically. -/
theorem no_fair_resolute_fence (f : CSet → Value) (v w : Value) (a b : Holder)
    (hne : v ≠ w)
    (hresolute : ValueAppears ({(v, a), (w, b)} : CSet)
      (f ({(v, a), (w, b)} : CSet))) :
    ¬ (f ({(v, a), (w, b)} : CSet) = v ↔
      f ({(v, a), (w, b)} : CSet) = w) := by
  intro hfair
  rcases twoCandidateValues (candidateCmp := candidateCmp) hresolute with hv | hw
  · exact hne (hv.symm.trans (hfair.mp hv))
  · exact hne ((hfair.mpr hw).symm.trans hw)

end Model

end Moves
