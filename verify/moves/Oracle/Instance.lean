/-
The ground instantiation: the abstract calculus at concrete wire carriers.
Everything the theorems assume is discharged here, by proof, not by fiat.
Promoted from `scratch/spike-lean-oracle` (whose model copy predates D85);
this package imports the canonical `Moves` library, so the emitted corpus
is authored by the same definitions the kernel-checked laws cover.
-/
import Moves

namespace Oracle
open Moves

abbrev Val := Nat
abbrev Actor := String

/-- Lexicographic value-then-holder comparator on candidate pairs. -/
abbrev candCmp : Candidate Val Actor → Candidate Val Actor → Ordering :=
  compareLex (compareOn (·.1)) (compareOn (·.2))

abbrev valCmp : Val → Val → Ordering := compare

/-- `Std` supplies transitivity for `compareLex`; equality-lawfulness is ours. -/
instance : Std.LawfulEqCmp candCmp where
  eq_of_compare {a b} h := by
    cases a; cases b
    simp only [candCmp, compareLex, compareOn, Ordering.then] at h
    split at h <;> simp_all

/-- Three declared holes; completeness is proved, not asserted. -/
inductive Hole | h0 | h1 | h2
  deriving DecidableEq, Repr, Inhabited

instance : FiniteCarrier Hole where
  elems := [.h0, .h1, .h2]
  complete := by intro x; cases x <;> simp

abbrev St := EpistemicState Hole Actor Val candCmp
abbrev Mv := Move Hole Actor Val candCmp
abbrev CSet := Finset (Candidate Val Actor) candCmp

def holes : List Hole := FiniteCarrier.elems

def Hole.name : Hole → String
  | .h0 => "h0" | .h1 => "h1" | .h2 => "h2"

def Hole.ofName? : String → Option Hole
  | "h0" => some .h0 | "h1" => some .h1 | "h2" => some .h2
  | _ => none

end Oracle
