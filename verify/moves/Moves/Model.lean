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

/-- Observable equality: journal provenance may differ while meaning agrees. -/
def MeaningEq (s t : State) : Prop := s.holes = t.holes

theorem meaningEq_refl (s : State) : MeaningEq s s := rfl

def priorCandidates (s : State) (h : HoleId) : CSet :=
  match s.holes h with
  | .open | .decided _ => ∅
  | .filled _ => s.evidence h
  | .disputed cs => cs

/-- The ratified move step. Empty resulting disputes are refused so admitted
steps preserve the required nonempty-dispute invariant. -/
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
          let merged := priorCandidates s h ∪ cs
          if merged = ∅ then none else some (put s h (.disputed merged) merged)
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

/-- Total primitive execution. The observation list is aligned with the input
trace and records every admission and refusal without aborting later moves. -/
def runK : State → List Mv → State × List (Mv × Bool)
  | s, [] => (s, [])
  | s, m :: ms =>
      let outcome := stepK s m
      let tail := runK outcome.1 ms
      (tail.1, (m, outcome.2) :: tail.2)

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

/-- The fill-else-dispute composite. The clash repair includes every journaled
proposal already known at the hole plus the refused fill. -/
def repair (s : State) : Mv → Option State
  | .fill h v actor =>
      match s.holes h with
      | .filled w =>
          if w = v then some s
          else step s (.dispute h (canonicalRepairCandidates s h v actor) actor)
      | _ => step s (.fill h v actor)
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

theorem run_conflicting_pair (h : HoleId) (v w : Value) (a b : Holder)
    (hne : v ≠ w) :
    ∃ (terminal : State) (cs : CSet),
      runRepair initial [.fill h v a, .fill h w b] = some terminal ∧
      terminal.holes h = .disputed cs ∧ candidatesContain cs v w := by
  let first : CSet := {(v, a)}
  let offered : CSet := first ∪ ({(w, b)} : CSet)
  let merged : CSet := first ∪ offered
  have hfirst : first ≠ ∅ := singletonCandidate_ne_empty v a
  have hm : merged ≠ ∅ := finset_union_ne_empty_left hfirst
  let filled : State := put initial h (.filled v) first
  let terminal : State := put filled h (.disputed merged) merged
  refine ⟨terminal, merged, ?_, by simp [terminal], ?_⟩
  · simp [runRepair, repair, step, initial, canonicalRepairCandidates,
      priorCandidates, put, hne, hm, first, offered, merged, filled, terminal]
    exact hm
  · constructor
    · apply valueAppears_iff.mpr
      refine ⟨a, ?_⟩
      change (v, a) ∈ first ∪ (first ∪ ({(w, b)} : CSet))
      exact Std.ExtTreeSet.mem_union_of_left (by
        simpa [first] using candidate_mem_singleton (candidateCmp := candidateCmp) v a)
    · apply valueAppears_iff.mpr
      refine ⟨b, ?_⟩
      change (w, b) ∈ first ∪ (first ∪ ({(w, b)} : CSet))
      exact Std.ExtTreeSet.mem_union_of_right
        (Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton w b))

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
    cases hs : s.holes h with
    | decided old => simp [step, hs] at hstep
    | «open» =>
      let merged : CSet := ∅ ∪ cs
      simp only [step, hs, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · change (if merged = ∅ then none else some (put s h (.disputed merged) merged)) =
          some s' at hstep
        rw [if_pos hempty] at hstep
        contradiction
      · change (if merged = ∅ then none else some (put s h (.disputed merged) merged)) =
          some s' at hstep
        rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        exact wf_put_disputed hwf h merged hempty
    | filled old =>
      let merged : CSet := s.evidence h ∪ cs
      simp only [step, hs, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · change (if merged = ∅ then none else some (put s h (.disputed merged) merged)) =
          some s' at hstep
        rw [if_pos hempty] at hstep
        contradiction
      · change (if merged = ∅ then none else some (put s h (.disputed merged) merged)) =
          some s' at hstep
        rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        exact wf_put_disputed hwf h merged hempty
    | disputed old =>
      let merged : CSet := old ∪ cs
      simp only [step, hs, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · change (if merged = ∅ then none else some (put s h (.disputed merged) merged)) =
          some s' at hstep
        rw [if_pos hempty] at hstep
        contradiction
      · change (if merged = ∅ then none else some (put s h (.disputed merged) merged)) =
          some s' at hstep
        rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        exact wf_put_disputed hwf h merged hempty
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
    | «open» | disputed _ | decided _ =>
      simp only [repair, hs] at hrepair
      exact step_preserves_wf hwf hrepair
    | filled w =>
      by_cases heq : w = v
      · simp [repair, hs, heq] at hrepair
        subst s'
        exact hwf
      · simp [repair, hs, heq] at hrepair
        exact step_preserves_wf hwf hrepair
  | dispute h cs actor =>
    simp only [repair] at hrepair
    exact step_preserves_wf hwf hrepair
  | decide h v =>
    simp only [repair] at hrepair
    exact step_preserves_wf hwf hrepair

/-- Total repaired steps preserve well-formedness whether they admit or
refuse. -/
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
    cases hs : s.holes h with
    | decided old => simp [step, hs] at hstep
    | «open» =>
      let merged : CSet := ∅ ∪ cs
      simp only [step, hs, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · rw [if_pos hempty] at hstep
        contradiction
      · rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        by_cases htarget : target = h
        · subst target
          have hopen := hwf h
          simp only [hs] at hopen
          rw [hopen] at hmem
          exact absurd hmem Std.ExtTreeSet.not_mem_empty
        · simpa [put, htarget] using hmem
    | filled old =>
      let merged : CSet := s.evidence h ∪ cs
      simp only [step, hs, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · rw [if_pos hempty] at hstep
        contradiction
      · rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        by_cases htarget : target = h
        · subst target
          simpa [put] using (Std.ExtTreeSet.mem_union_of_left hmem :
            candidate ∈ s.evidence h ∪ cs)
        · simpa [put, htarget] using hmem
    | disputed old =>
      let merged : CSet := old ∪ cs
      simp only [step, hs, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · rw [if_pos hempty] at hstep
        contradiction
      · rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        by_cases htarget : target = h
        · subst target
          have hdisputed := hwf h
          simp only [hs] at hdisputed
          rw [hdisputed.2] at hmem
          simpa [put] using (Std.ExtTreeSet.mem_union_of_left hmem :
            candidate ∈ old ∪ cs)
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
    | «open» | disputed _ | decided _ =>
      simp only [repair, hs] at hrepair
      exact step_preserves_evidence hwf hrepair
    | filled w =>
      by_cases heq : w = v
      · simp [repair, hs, heq] at hrepair
        subst s'
        exact fun _ _ hm => hm
      · simp [repair, hs, heq] at hrepair
        exact step_preserves_evidence hwf hrepair
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

theorem repair_records_fill {s s' : State} (hwf : WF s)
    (h : HoleId) (v : Value) (actor : Holder)
    (hrepair : repair s (.fill h v actor) = some s') : Recorded s' h v := by
  cases hs : s.holes h with
  | «open» =>
    simp [repair, hs, step] at hrepair
    subst s'
    unfold Recorded
    simp only [put_evidence_same]
    change ValueAppears ({(v, actor)} : CSet) v
    apply valueAppears_iff.mpr
    exact ⟨actor, candidate_mem_singleton v actor⟩
  | filled w =>
    by_cases heq : w = v
    · simp [repair, hs, heq] at hrepair
      subst s'
      have hfilled := hwf h
      simp only [hs] at hfilled
      let candidate := (s.evidence h).min hfilled.1
      have hmem : candidate ∈ s.evidence h := Std.ExtTreeSet.min_mem
      rcases candidate with ⟨value, holder⟩
      have hv : value = v := (hfilled.2 (value, holder) hmem).trans heq
      subst value
      exact valueAppears_iff.mpr ⟨holder, hmem⟩
    · simp only [repair, hs, if_neg heq] at hrepair
      cases hstep : step s (.dispute h (canonicalRepairCandidates s h v actor) actor) with
      | none => simp [hstep] at hrepair
      | some repaired =>
        rw [hstep] at hrepair
        injection hrepair with heqState
        subst repaired
        cases hs' : s.holes h with
        | «open» => simp [hs] at hs'
        | filled old =>
          simp only [step, hs, priorCandidates] at hstep
          let merged : CSet := s.evidence h ∪ canonicalRepairCandidates s h v actor
          have hnonempty : merged ≠ ∅ := by
            apply finset_union_ne_empty_right
            apply finset_union_ne_empty_right
            exact singletonCandidate_ne_empty v actor
          rw [if_neg hnonempty] at hstep
          injection hstep with heqState
          subst s'
          unfold Recorded
          simp only [put_evidence_same]
          change ValueAppears merged v
          apply valueAppears_iff.mpr
          refine ⟨actor, ?_⟩
          exact Std.ExtTreeSet.mem_union_of_right
            (Std.ExtTreeSet.mem_union_of_right (candidate_mem_singleton v actor))
        | disputed cs => simp [hs] at hs'
        | decided old => simp [hs] at hs'
  | disputed cs => simp [repair, hs, step] at hrepair
  | decided old => simp [repair, hs, step] at hrepair

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
        rcases valueAppears_iff.mp (repair_records_fill hwf h v actor hri) with
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
            rcases valueAppears_iff.mp (repair_records_fill hwf h v actor hrepair) with
              ⟨recordHolder, hrecord⟩
            apply valueAppears_iff.mpr
            exact ⟨recordHolder, runRepairK_preserves_evidence rest next
              (repair_preserves_wf hwf hrepair) h (v, recordHolder) hrecord⟩
          · exact ih next (repair_preserves_wf hwf hrepair) h v actor htail

/-- Every input move receives at least one aligned admitted/refused
observation. This remains occurrence-safe for the no-loss theorem because any
admitted occurrence is handled separately by `runRepairK_fills_recorded`. -/
theorem runRepairK_observes :
    ∀ (is : List Mv) (start : State) (m : Mv), m ∈ is →
      (m, true) ∈ (runRepairK start is).2 ∨
        (m, false) ∈ (runRepairK start is).2 := by
  intro is
  induction is with
  | nil => simp
  | cons i rest ih =>
      intro start m hmem
      rcases List.mem_cons.mp hmem with rfl | htail
      · cases hresult : repairK start m with
        | mk next admitted =>
          cases admitted with
          | false =>
              right
              simp [runRepairK, hresult]
          | true =>
              left
              simp [runRepairK, hresult]
      · rcases ih (repairK start i).1 m htail with hadmitted | hrefused
        · left
          change (m, true) ∈
            (i, (repairK start i).2) :: (runRepairK (repairK start i).1 rest).2
          exact List.mem_cons_of_mem _ hadmitted
        · right
          change (m, false) ∈
            (i, (repairK start i).2) :: (runRepairK (repairK start i).1 rest).2
          exact List.mem_cons_of_mem _ hrefused

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

/-- Every fill observed as admitted by the total runner survives in terminal
meaning or retained decision evidence. -/
theorem no_lossK_admitted (intents : List Mv) :
    ∀ h v actor,
      ((.fill h v actor, true) : Mv × Bool) ∈ (runRepairK initial intents).2 →
        TerminalCarries (runRepairK initial intents).1 h v := by
  intro h v actor hmem
  exact wf_recorded_terminal (runRepairK_preserves_wf intents initial initial_wf)
    (runRepairK_fills_recorded intents initial initial_wf h v actor hmem)

/-- **Total no loss:** every fill in every arbitrary finite intent bag is
accounted for by an explicit refusal observation or by terminal meaning / kept
decision evidence. Unlike `no_loss`, the statement has no complete-admitted-run
premise and therefore applies to traces containing refusals. -/
theorem no_lossK (intents : List Mv) :
    ∀ h v actor, (.fill h v actor : Mv) ∈ intents →
      ((.fill h v actor, false) : Mv × Bool) ∈ (runRepairK initial intents).2 ∨
        TerminalCarries (runRepairK initial intents).1 h v := by
  intro h v actor hmem
  rcases runRepairK_observes intents initial (.fill h v actor) hmem with
    hadmitted | hrefused
  · exact Or.inr (no_lossK_admitted intents h v actor hadmitted)
  · exact Or.inl hrefused

/-! ## Repairable clashes: frame, diamond, and confluence -/

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

def thenRepair (s : State) (m₁ m₂ : Mv) : Option State :=
  (repair s m₁).bind fun s' => repair s' m₂

def repairFillLocal (hs : HState) (ev : CSet) (v : Value) (actor : Holder) :
    Option (HState × CSet) :=
  match hs with
  | .open => some (.filled v, {(v, actor)})
  | .filled w =>
      if w = v then some (.filled w, ev)
      else
        let merged := ev ∪ (ev ∪ {(v, actor)})
        if merged = ∅ then none else some (.disputed merged, merged)
  | .disputed _ | .decided _ => none

theorem repair_fill_eq_local (s : State) (h : HoleId) (v : Value) (actor : Holder) :
    repair s (.fill h v actor) =
      (repairFillLocal (s.holes h) (s.evidence h) v actor).map
        (fun result => put s h result.1 result.2) := by
  cases hs : s.holes h with
  | «open» =>
    simp [repair, repairFillLocal, step, hs, canonicalRepairCandidates, priorCandidates]
  | disputed cs =>
    simp [repair, repairFillLocal, step, hs, canonicalRepairCandidates, priorCandidates]
  | decided chosen =>
    simp [repair, repairFillLocal, step, hs, canonicalRepairCandidates, priorCandidates]
  | filled w =>
    by_cases heq : w = v
    · simp [repair, repairFillLocal, step, hs, heq, canonicalRepairCandidates,
        priorCandidates]
      simpa [hs, heq] using (put_current s h).symm
    · simp [repair, repairFillLocal, step, hs, heq, canonicalRepairCandidates,
        priorCandidates]
      split <;> rfl

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

/-- A refused conflicting fill has an admitted canonical dispute repair that
retains both the old and new values with holder attribution. -/
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
  have hmerged : merged ≠ ∅ := finset_union_ne_empty_left hfilled.1
  have hwv : w ≠ v := Ne.symm hne
  let repaired : State := put s h (.disputed merged) merged
  refine ⟨repaired, merged, ?_, by simp [repaired], ?_⟩
  · simp [repair, hstate, hwv, step, priorCandidates, offered, merged,
      canonicalRepairCandidates, hmerged, repaired]
    exact hmerged
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
  let left : CSet := {(v, a)}
  let right : CSet := {(w, b)}
  have hleft : left ∪ (left ∪ right) = left ∪ right := by
    rw [← finset_union_assoc, finset_union_idem]
  have hright : right ∪ (right ∪ left) = left ∪ right := by
    rw [← finset_union_assoc, finset_union_idem, finset_union_comm]
  have hneLeft : left ∪ (left ∪ right) ≠ ∅ :=
    finset_union_ne_empty_left (singletonCandidate_ne_empty v a)
  have hneRight : right ∪ (right ∪ left) ≠ ∅ :=
    finset_union_ne_empty_left (singletonCandidate_ne_empty w b)
  have hneLeft' :
      ({(v, a)} : CSet) ∪ (({(v, a)} : CSet) ∪ ({(w, b)} : CSet)) ≠ ∅ := by
    simpa [left, right] using hneLeft
  have hneRight' :
      ({(w, b)} : CSet) ∪ (({(w, b)} : CSet) ∪ ({(v, a)} : CSet)) ≠ ∅ := by
    simpa [left, right] using hneRight
  have hsets :
      ({(v, a)} : CSet) ∪ (({(v, a)} : CSet) ∪ ({(w, b)} : CSet)) =
        ({(w, b)} : CSet) ∪ (({(w, b)} : CSet) ∪ ({(v, a)} : CSet)) := by
    calc
      _ = left ∪ right := by simpa [left, right] using hleft
      _ = right ∪ (right ∪ left) := hright.symm
      _ = _ := by simp [left, right]
  simp [runRepair, repair, step, initial, canonicalRepairCandidates,
    priorCandidates, put_put_same, hne, Ne.symm hne, hneLeft', hneRight', hsets]
  split <;> split <;> simp_all [hsets]

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
      simp only [repair, step, hstart, priorCandidates]
      simp [hmerge, next]
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
      simp only [repair, step, initial, priorCandidates]
      simp [hfirst, first, initial]
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
    cases hk : s.holes k with
    | decided old => simp [step, hk] at hstep
    | «open» =>
      let merged : CSet := ∅ ∪ cs
      simp only [step, hk, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · rw [if_pos hempty] at hstep
        contradiction
      · rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        simp [put, Ne.symm hne]
    | filled old =>
      let merged : CSet := s.evidence k ∪ cs
      simp only [step, hk, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · rw [if_pos hempty] at hstep
        contradiction
      · rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
        simp [put, Ne.symm hne]
    | disputed old =>
      let merged : CSet := old ∪ cs
      simp only [step, hk, priorCandidates] at hstep
      by_cases hempty : merged = ∅
      · rw [if_pos hempty] at hstep
        contradiction
      · rw [if_neg hempty] at hstep
        injection hstep with heq
        subst s'
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
            exact Or.inr hfilled
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
