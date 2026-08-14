/-
The projection walls, mechanized: W-COHERENCE and W-SCOPE.

Model of the union-member-uniqueness law and its refusal constructor
(proto/go/protod/walk.go:165-177), per
docs/research/2026-08-14-implication-refusals-formalized.md §4-§5.

Abstractions, stated so they can be argued with:

- A union member is abstracted to its canonical-byte RANK (`Member :=
  Nat`): two members are byte-equal after normalization iff their ranks
  are equal, and `sort.Slice` by `bytes.Compare` is sorting ranks. In
  the verified counterexample, rank 0 is `{"k":"bool"}` and rank 1 is
  `{"k":"string"}` (bool < string in canonical bytes).
- A refusal report is `(path, got)` with `path` an index that — by the
  coordinate law (Definition 2 of the note: the walk runs on the
  SUBMITTED term, catalog.go:138) — must address the submitted sequence.
- `shipped` mirrors walk.go: sort a local copy, scan for the first
  adjacent duplicate, report THAT index and THAT (normalized) value.
- `fixed` is the repaired rule: least submitted index `j` having an
  equal earlier member; report `j` and the submitted member at `j`.

Theorems:
- `shipped_incoherent` / `shipped_escapes_scope` — the defect verified
  by execution against the real daemon this session, as Lean theorems
  over the model: witness `[1,1,0]` (= submitted [string,string,bool]).
- `fixed_coherent` / `fixed_in_scope` — the repaired rule satisfies
  both walls for ALL submissions, unboundedly.
- `deferred_blame` — the disjunctive semantics of a two-path scope: a
  candidate agreeing with the refused term at BOTH scope coordinates
  still violates; any repair must move at least one of them.

Not proved here (bounded-checked by TLC instead, see ../Implication.tla
invariant `WDecision`): the two rules refuse exactly the same
submissions — the fix changes the report, never the decision.
-/

namespace Implication.Projection

/-- Canonical-byte rank of a normalized union member. -/
abbrev Member := Nat

/-- A refusal report: `path` indexes the SUBMITTED member list. -/
structure Report where
  path : Nat
  got  : Member
deriving Repr, DecidableEq

/-! ## The shipped constructor (walk.go:165-177) -/

/-- Insertion into a sorted list — the model of the local sorted copy. -/
def insertSorted (x : Member) : List Member → List Member
  | []      => [x]
  | y :: ys => if x ≤ y then x :: y :: ys else y :: insertSorted x ys

/-- The local sorted copy (`sort.Slice`, walk.go:167-169). Validation
only; the submitted list is never rewritten — which is exactly why an
index into THIS list is in the wrong coordinate system. -/
def sortedCopy : List Member → List Member
  | []      => []
  | x :: xs => insertSorted x (sortedCopy xs)

/-- First adjacent duplicate: 0-based index of the LATER element and its
value (the loop at walk.go:170-176). -/
def firstAdjDupAux : Nat → List Member → Option (Nat × Member)
  | _, []           => none
  | _, [_]          => none
  | i, x :: y :: r  =>
      if x = y then some (i + 1, y) else firstAdjDupAux (i + 1) (y :: r)

def firstAdjDup (l : List Member) : Option (Nat × Member) :=
  firstAdjDupAux 0 l

/-- The shipped rule: detect in the sorted copy, report the sorted index
as if it were a submitted index. -/
def shipped (t : List Member) : Option Report :=
  (firstAdjDup (sortedCopy t)).map fun p => ⟨p.1, p.2⟩

/-! ## The fixed constructor -/

/-- Does any earlier submitted position hold an equal member? -/
def dupBefore (t : List Member) (j : Nat) : Bool :=
  (List.range j).any fun i => decide (t[i]? = t[j]?)

/-- The fixed rule: least submitted index with an equal earlier member;
report that index and the SUBMITTED member there. -/
def fixed (t : List Member) : Option Report :=
  match (List.range t.length).find? (fun j => dupBefore t j) with
  | some j =>
      match t[j]? with
      | some v => some ⟨j, v⟩
      | none   => none
  | none => none

/-! ## The walls -/

/-- **W-COHERENCE fails on the shipped rule** — the §5 counterexample as
a theorem. Submitted `[1,1,0]` ([string,string,bool]): the report says
`path = 2, got = 1`, but the submitted member at index 2 is `0`. `Path`
and `Got` contradict each other. -/
theorem shipped_incoherent :
    ∃ (t : List Member) (r : Report),
      shipped t = some r ∧ t[r.path]? ≠ some r.got := by
  refine ⟨[1, 1, 0], ⟨2, 1⟩, rfl, ?_⟩
  decide

/-- **W-SCOPE fails on the shipped rule**: the reported path is not even
a member of the violation's scope — no earlier submitted member equals
the one at the reported path. The true scope of `[1,1,0]` is `{0,1}`;
the report names `2`. -/
theorem shipped_escapes_scope :
    ∃ (t : List Member) (r : Report),
      shipped t = some r ∧ ∀ i, i < r.path → t[i]? ≠ t[r.path]? := by
  refine ⟨[1, 1, 0], ⟨2, 1⟩, rfl, ?_⟩
  intro i hi
  match i, hi with
  | 0, _ => decide
  | 1, _ => decide

/-- **W-COHERENCE holds for the fixed rule, for every submission**: the
reported path addresses the submitted term and `got` is exactly the
member that arrived there. -/
theorem fixed_coherent {t : List Member} {r : Report}
    (h : fixed t = some r) : t[r.path]? = some r.got := by
  unfold fixed at h
  split at h
  next j hfind =>
    split at h
    next v hget =>
      injection h with h
      subst h
      exact hget
    next => exact absurd h (by simp)
  next => exact absurd h (by simp)

/-- **W-SCOPE holds for the fixed rule, for every submission**: the
reported path is the later coordinate of a genuine duplicate pair in
submitted coordinates. -/
theorem fixed_in_scope {t : List Member} {r : Report}
    (h : fixed t = some r) :
    ∃ i, i < r.path ∧ t[i]? = t[r.path]? := by
  unfold fixed at h
  split at h
  next j hfind =>
    have hp : dupBefore t j = true := List.find?_some hfind
    split at h
    next v hget =>
      injection h with h
      subst h
      simp only [dupBefore, List.any_eq_true, List.mem_range,
        decide_eq_true_eq] at hp
      exact hp
    next => exact absurd h (by simp)
  next => exact absurd h (by simp)

/-- **Deferred blame** — the disjunctive semantics that survives from
ICE: if the refused term has equal members at scope coordinates `i` and
`j`, then ANY candidate agreeing with it at both coordinates still has
equal members there. A repair must change position `i` or position `j`;
a single-path report hides that disjunction. -/
theorem deferred_blame (t t' : List Member) (i j : Nat)
    (hdup : t[i]? = t[j]?)
    (hi : t'[i]? = t[i]?) (hj : t'[j]? = t[j]?) :
    t'[i]? = t'[j]? := by
  rw [hi, hj, hdup]

end Implication.Projection
