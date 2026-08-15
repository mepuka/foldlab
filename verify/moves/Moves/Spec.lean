/-
Frozen DEV-673 specification. The issue body is the authority for every
obligation below. Changes require a Rev re-pin in `run.sh`.
-/
import Moves.Model

namespace Moves

universe uH uA uV

section FrozenLaws

variable {HoleId : Type uH} {Holder : Type uA} {Value : Type uV}
variable {valueCmp : Value → Value → Ordering}
variable {candidateCmp : Candidate Value Holder → Candidate Value Holder → Ordering}
variable [FiniteCarrier HoleId] [DecidableEq HoleId]
variable [DecidableEq Holder] [DecidableEq Value]
variable [Std.TransCmp valueCmp] [Std.LawfulEqCmp valueCmp]
variable [Std.TransCmp candidateCmp] [Std.LawfulEqCmp candidateCmp]

local notation "State" => EpistemicState HoleId Holder Value candidateCmp
local notation "Mv" => Move HoleId Holder Value candidateCmp

/-- Wire-fragment bags: no decide moves (decide enters only via the fence at close). -/
def FillDisputeOnly (l : List Mv) : Prop := ∀ m ∈ l, ∀ h v, m ≠ Move.decide h v

/-- The complete enumeration of lawful refusal under D85. Fills never refuse. -/
def D85Refusal (s : State) : Mv → Prop
  | .fill _ _ _     => False
  | .dispute h cs _ => (∃ v, s.holes h = .decided v) ∨ priorCandidates s h ∪ cs = ∅
  | .decide h v     =>
      match s.holes h with
      | .disputed cs => ¬ ValueAppears cs v
      | _            => True

-- L1 STRONG NO-LOSS — no disjunct, no escape hatch.
def SpecL1 : Prop := ∀ (intents : List Mv) (h : HoleId) (v : Value) (actor : Holder),
    (.fill h v actor : Mv) ∈ intents →
      ((v, actor) : Candidate Value Holder) ∈
        (runRepairK initial intents).1.evidence h

-- L2 MEANING CONFLUENCE over the wire fragment.
def SpecL2 : Prop := ∀ {l₁ l₂ : List Mv}, l₁.Perm l₂ → FillDisputeOnly l₁ →
    MeaningEq (runRepairK initial l₁).1 (runRepairK initial l₂).1

-- L3 EVIDENCE CONFLUENCE over the wire fragment.
def SpecL3 : Prop := ∀ {l₁ l₂ : List Mv}, l₁.Perm l₂ → FillDisputeOnly l₁ →
    ∀ h : HoleId,
      (runRepairK initial l₁).1.evidence h =
        (runRepairK initial l₂).1.evidence h

-- L4 SCHEDULE-FREE CLOSE: any sound fence chooses identically across permutations.
def SpecL4 : Prop := ∀ (f : FenceRule Holder Value candidateCmp)
    {l₁ l₂ : List Mv}, l₁.Perm l₂ → FillDisputeOnly l₁ → ∀ (h : HoleId)
    (cs₁ cs₂) (_h₁ : (runRepairK initial l₁).1.holes h = .disputed cs₁)
    (_h₂ : (runRepairK initial l₂).1.holes h = .disputed cs₂)
    (hne₁ : cs₁ ≠ ∅) (hne₂ : cs₂ ≠ ∅),
    f.choose cs₁ hne₁ = f.choose cs₂ hne₂

-- L5 REFUSAL CHARACTERIZED, per step, as an iff.
def SpecL5 : Prop := ∀ (s : State) (m : Mv),
    (repairK s m).2 = false ↔ D85Refusal s m

-- L6 OBSERVATION ALIGNMENT (D79 becomes a theorem).
def SpecL6 : Prop := ∀ (s : State) (l : List Mv),
    (runRepairK s l).2.map Prod.fst = l

-- L7 AGREEMENT, both directions (the runner is pinned to the calculus).
def SpecL7 : Prop := ∀ (s s' : State) (m : Mv),
    repairK s m = (s', true) ↔ repair s m = some s'

-- L8 SAFETY SURVIVES TOTALIZATION.
def SpecL8WF : Prop := ∀ l : List Mv, WF (runRepairK initial l).1

def SpecL8Stable : Prop := ∀ (s : State) (m : Mv) (h : HoleId) (v : Value),
    s.holes h = .decided v → (repairK s m).1.holes h = .decided v

end FrozenLaws

namespace SpecCarrier

abbrev HoleId := Fin 2
abbrev Holder := Fin 3
abbrev Value := Nat
abbrev Candidate := Moves.Candidate Value Holder

instance candidateOrd : Ord Candidate := lexOrd

theorem candidateCmp_lawful :
    Std.LawfulEqCmp (compare : Candidate → Candidate → Ordering) := by
  infer_instance

instance holeCarrier : FiniteCarrier HoleId where
  elems := [0, 1]
  complete := by
    rintro ⟨n, hn⟩
    cases n with
    | zero => simp
    | succ n =>
      cases n with
      | zero => simp
      | succ n => omega

abbrev CSet := Finset Candidate compare
abbrev State := EpistemicState HoleId Holder Value compare
abbrev Mv := Move HoleId Holder Value compare

def h0 : HoleId := 0
def a : Holder := 0
def b : Holder := 1
def x : Holder := 2

def specBag : List Mv :=
  [.fill h0 10 a, .fill h0 20 b, .fill h0 30 x]

/-- The pre-D85 repair semantics, frozen verbatim as the canonical mutant. -/
def legacyRepair (s : State) : Mv → Option State
  | .fill h v actor =>
      match s.holes h with
      | .filled w =>
          if w = v then some s
          else step s (.dispute h (canonicalRepairCandidates s h v actor) actor)
      | _ => step s (.fill h v actor)
  | m => step s m

def legacyRepairK (s : State) (m : Mv) : State × Bool :=
  match legacyRepair s m with
  | some s' => (s', true)
  | none => (s, false)

def legacyRunRepairK : State → List Mv → State × List (Mv × Bool)
  | s, [] => (s, [])
  | s, i :: is =>
      let outcome := legacyRepairK s i
      let tail := legacyRunRepairK outcome.1 is
      (tail.1, (i, outcome.2) :: tail.2)

def refuseAll (s : State) (_m : Mv) : State × Bool := (s, false)

end SpecCarrier

-- M1 the old semantics is killed by L1 (the three-fill bag loses value 30).
def SpecM1 : Prop := ∃ (intents : List SpecCarrier.Mv) (h : SpecCarrier.HoleId)
    (v : SpecCarrier.Value) (actor : SpecCarrier.Holder),
    (.fill h v actor : SpecCarrier.Mv) ∈ intents ∧
    ((v, actor) : SpecCarrier.Candidate) ∉
      (SpecCarrier.legacyRunRepairK initial intents).1.evidence h

-- M2 the old semantics is killed by L2 (kernel-checked non-confluence, from the review probes).
def SpecM2 : Prop := ∃ (l₁ l₂ : List SpecCarrier.Mv),
    l₁.Perm l₂ ∧ FillDisputeOnly l₁ ∧
    ¬ MeaningEq (SpecCarrier.legacyRunRepairK initial l₁).1
      (SpecCarrier.legacyRunRepairK initial l₂).1

-- M3 refuse-everything is killed by L5.
def SpecM3 : Prop := ∃ (s : SpecCarrier.State) (m : SpecCarrier.Mv),
    ¬ ((SpecCarrier.refuseAll s m).2 = false ↔ D85Refusal s m)

-- W1 the three-fill bag under D85: all admitted; the third pair is journaled.
def SpecW1 : Prop :=
    (runRepairK (initial : SpecCarrier.State) SpecCarrier.specBag).2.map Prod.snd =
      [true, true, true] ∧
    ((30, SpecCarrier.x) : SpecCarrier.Candidate) ∈
      (runRepairK initial SpecCarrier.specBag).1.evidence SpecCarrier.h0

-- W2 MOVES-5 closed: a confirming refill records the second holder.
def SpecW2 : Prop :=
    ((10, SpecCarrier.b) : SpecCarrier.Candidate) ∈
      (runRepairK (initial : SpecCarrier.State)
        [.fill SpecCarrier.h0 10 SpecCarrier.a,
          .fill SpecCarrier.h0 10 SpecCarrier.b]).1.evidence SpecCarrier.h0

end Moves
