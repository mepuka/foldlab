/-
Cost as an inhabitant of the semantic domain — Lean 4 probe.

Companion to `.staging/e2/cost-semantics-survey.md`. Built on bare Lean 4 v4.33.1:
no Mathlib, no imports beyond the prelude, no `sorry`, no new axioms.

What this measures: whether calf's *discipline* — cost as an effect in the
semantics, plus a phase distinction that makes behavioural specifications
cost-oblivious by construction — can be realized in Lean 4 within the estate's
axiom allowlist [propext, Classical.choice, Quot.sound].

The finding the probe is built to test: calf postulates the extensional phase as
an abstract proposition `¶E` together with the axiom `step/¶E : #(step c e = e)`.
Lean cannot postulate that without leaving the allowlist. But the *counting
model* of calf (Niu et al. 2022, §5.1) is concrete: `F(A) = C × A`, and the
extensional phase is the quotient that forgets the first component. In Lean that
quotient is `Quot`, and `Quot.sound` IS in the allowlist. So the phase
distinction is available as a theorem rather than an axiom.
-/

namespace CostProbe

/-! ## 1. The cost structure

calf is parameterized by an ordered cost monoid (`isCostMonoid(C, 0, +, ≤)`,
Niu et al. 2022, Fig. 3). Here it is a bundled structure so the whole
development is generic in it — sequential cost (ℕ, +), parallel work/span
pairs, allocation counts, and byte counts are all instances. -/

structure CostMonoid where
  C : Type
  zero : C
  add : C → C → C
  le : C → C → Prop
  add_zero_left : ∀ c, add zero c = c
  add_zero_right : ∀ c, add c zero = c
  add_assoc : ∀ a b c, add (add a b) c = add a (add b c)
  le_refl : ∀ c, le c c
  le_trans : ∀ a b c, le a b → le b c → le a c
  add_mono : ∀ a a' b b', le a a' → le b b' → le (add a b) (add a' b')

variable {M : CostMonoid} {A B : Type}

/-! ## 2. The computation type: `F A` in the counting model

CBPV's free computation type, interpreted as the free algebra of the writer
monad `C × −`. "A value is; a computation does." -/

structure Cmp (M : CostMonoid) (A : Type) where
  cost : M.C
  val : A

def ret (M : CostMonoid) (a : A) : Cmp M A := ⟨M.zero, a⟩

def step (M : CostMonoid) (c : M.C) (e : Cmp M A) : Cmp M A :=
  ⟨M.add c e.cost, e.val⟩

def bind (M : CostMonoid) (e : Cmp M A) (f : A → Cmp M B) : Cmp M B :=
  ⟨M.add e.cost (f e.val).cost, (f e.val).val⟩

/-! ### 2.1 The `step` equations (calf Fig. 3: step0, step+, bindstep)

These are calf *axioms*. Here they are theorems about the counting model. -/

theorem step_zero (e : Cmp M A) : step M M.zero e = e := by
  simp [step, M.add_zero_left]

theorem step_add (c₁ c₂ : M.C) (e : Cmp M A) :
    step M c₁ (step M c₂ e) = step M (M.add c₁ c₂) e := by
  simp [step, M.add_assoc]

theorem bind_step (c : M.C) (e : Cmp M A) (f : A → Cmp M B) :
    bind M (step M c e) f = step M c (bind M e f) := by
  simp [bind, step, M.add_assoc]

/-! ### 2.2 The monad laws (which hold on the nose, not up to anything) -/

theorem bind_ret_left (a : A) (f : A → Cmp M B) :
    bind M (ret M a) f = f a := by
  simp [bind, ret, M.add_zero_left]

theorem bind_ret_right (e : Cmp M A) :
    bind M e (fun a => ret M a) = e := by
  simp [bind, ret, M.add_zero_right]

theorem bind_assoc {C' : Type} (e : Cmp M A) (f : A → Cmp M B) (g : B → Cmp M C') :
    bind M (bind M e f) g = bind M e (fun a => bind M (f a) g) := by
  simp [bind, M.add_assoc]

/-! ## 3. The phase distinction, as a quotient

calf's open/extensional modality is `#A ≔ ¶E → A`, forced by the postulated
axiom `step/¶E : #(step c e = e)`. In the counting model the extensional phase
is the quotient of `C × A` that forgets `C`. -/

/-- The behavioural relation: two computations are behaviourally equal when
their values agree, whatever they cost. -/
def BehRel (M : CostMonoid) (A : Type) (e e' : Cmp M A) : Prop := e.val = e'.val

/-- The behavioural (extensional) phase. -/
def Beh (M : CostMonoid) (A : Type) : Type := Quot (BehRel M A)

/-- The unit of the extensional modality, calf's `η#`. -/
def beh (e : Cmp M A) : Beh M A := Quot.mk _ e

/-- calf's axiom `step/¶E` — here derived, using only `Quot.sound`. -/
theorem beh_step (c : M.C) (e : Cmp M A) : beh (step M c e) = beh e :=
  Quot.sound rfl

theorem beh_bind_ret (a : A) (f : A → Cmp M B) :
    beh (bind M (ret M a) f) = beh (f a) := by
  rw [bind_ret_left]

/-- The behavioural phase is exactly the value type: cost, and nothing else,
has been erased. -/
def behVal : Beh M A → A := Quot.lift (fun e => e.val) (fun _ _ h => h)

theorem behVal_beh (e : Cmp M A) : behVal (beh e) = e.val := rfl

theorem beh_behVal (b : Beh M A) : beh (ret M (behVal b)) = b := by
  induction b using Quot.ind with
  | _ e => exact Quot.sound rfl

/-! ### 3.1 Noninterference

calf Theorem 2.4 (`Calf.Noninterference.oblivious`): for any `f : F(A) → #B`,
`f (step c e) = f e`. Here the same statement, for any function whose domain is
the behavioural phase. -/

theorem noninterference (f : Beh M A → B) (c : M.C) (e : Cmp M A) :
    f (beh (step M c e)) = f (beh e) := by
  rw [beh_step]

/-- The load-bearing half: a function out of the behavioural phase can only be
*defined* by discharging a proof that it does not observe cost. `Quot.lift`
makes cost-obliviousness a definitional obligation, not a later theorem — this
is the Lean analogue of calf's type-level enforcement. -/
def behLift (f : Cmp M A → B) (h : ∀ e e', BehRel M A e e' → f e = f e') :
    Beh M A → B := Quot.lift f h

theorem behLift_oblivious (f : Cmp M A → B)
    (h : ∀ e e', BehRel M A e e' → f e = f e') (c : M.C) (e : Cmp M A) :
    behLift f h (beh (step M c e)) = behLift f h (beh e) :=
  noninterference (behLift f h) c e

/-! ## 4. The cost refinement (calf §3, Fig. 4)

`isBounded(A; e; c)` and its four syntax-directed rules: Return, Step, Bind,
Relax. In calf these are proved lemmas; the same here. -/

def isBounded (M : CostMonoid) (e : Cmp M A) (c : M.C) : Prop := M.le e.cost c

theorem bound_ret (a : A) : isBounded M (ret M a) M.zero := M.le_refl _

theorem bound_step (c d : M.C) (e : Cmp M A) (h : isBounded M e c) :
    isBounded M (step M d e) (M.add d c) :=
  M.add_mono d d e.cost c (M.le_refl d) h

theorem bound_bind (c : M.C) (d : A → M.C) (e : Cmp M A) (f : A → Cmp M B)
    (he : isBounded M e c) (hf : ∀ a, isBounded M (f a) (d a)) :
    isBounded M (bind M e f) (M.add c (d e.val)) :=
  M.add_mono e.cost c (f e.val).cost (d e.val) he (hf e.val)

theorem bound_relax (c c' : M.C) (e : Cmp M A)
    (h : isBounded M e c) (hle : M.le c c') : isBounded M e c' :=
  M.le_trans _ _ _ h hle

/-! ## 5. Instance: sequential ℕ cost -/

@[reducible] def natCost : CostMonoid where
  C := Nat
  zero := 0
  add := fun a b => a + b
  le := fun a b => a ≤ b
  add_zero_left := Nat.zero_add
  add_zero_right := Nat.add_zero
  add_assoc := Nat.add_assoc
  le_refl := Nat.le_refl
  le_trans := fun _ _ _ h₁ h₂ => Nat.le_trans h₁ h₂
  add_mono := fun _ _ _ _ h₁ h₂ => Nat.add_le_add h₁ h₂

/-! ## 6. Worked example — a structural traversal over a content-addressed
carrier, with behaviour and cost proved separately about the same program.

This is the entity store's shape: a finite inductive carrier, a total
structural fold that charges per constructor visited. -/

inductive Tree where
  | leaf : Nat → Tree
  | node : Tree → Tree → Tree

def Tree.size : Tree → Nat
  | .leaf _ => 1
  | .node l r => 1 + l.size + r.size

/-- The behavioural specification: cost-free, an ordinary Lean function. -/
def Tree.total : Tree → Nat
  | .leaf n => n
  | .node l r => l.total + r.total

/-- The cost-instrumented program: one step charged per constructor. -/
def Tree.walk : Tree → Cmp natCost Nat
  | .leaf n => step natCost 1 (ret natCost n)
  | .node l r =>
      step natCost 1 (bind natCost l.walk (fun a =>
        bind natCost r.walk (fun b => ret natCost (a + b))))

/-- Behaviour, in the behavioural phase: the instrumented program agrees with
the cost-free specification. Cost is erased; this is a `Beh` equation. -/
theorem walk_behavior (t : Tree) : beh (t.walk) = beh (ret natCost t.total) := by
  induction t with
  | leaf n => exact Quot.sound rfl
  | node l r ihl ihr =>
      apply Quot.sound
      have hl : (Tree.walk l).val = l.total := congrArg behVal ihl
      have hr : (Tree.walk r).val = r.total := congrArg behVal ihr
      show (Tree.walk (.node l r)).val = _
      simp [Tree.walk, Tree.total, step, bind, ret, hl, hr]

/-- Cost, in the intensional phase: exact, not merely bounded. -/
theorem walk_cost (t : Tree) : (t.walk).cost = t.size := by
  induction t with
  | leaf n => rfl
  | node l r ihl ihr =>
      show natCost.add 1 _ = _
      simp [Tree.size, bind, ret, natCost] at *
      omega

/-- The property the estate actually needs: an existing cost-free theorem
transports to the instrumented program with **no cost hypothesis added**. This is
the measured form of "instrumenting the model must not make the model's other
theorems conditional". -/
theorem walk_transport (P : Nat → Prop) (t : Tree) (h : P t.total) :
    P (behVal (beh t.walk)) := by
  rw [walk_behavior]; exact h

/-- The `isBounded` refinement, derived from the exact cost. -/
theorem walk_bounded (t : Tree) : isBounded natCost t.walk t.size := by
  show natCost.le _ _
  rw [walk_cost]
  exact natCost.le_refl _

/-! ## 7. The T7 argument, made measured

The runtime scoping document lists T7's risk as "instrumentation changes the
runtime path". A denoted cost effect has the two properties a bolted-on hook
cannot be given, and both are theorems here.

(a) NON-PERTURBATION. Instrumenting a program does not change what it computes:
    `beh_step` above, calf's `step/¶E`. Corollary: re-choosing the cost model
    leaves every behavioural theorem standing. -/

/-- A second instrumentation of the same traversal, charging two per node. -/
def Tree.walk2 : Tree → Cmp natCost Nat
  | .leaf n => step natCost 2 (ret natCost n)
  | .node l r =>
      step natCost 2 (bind natCost l.walk2 (fun a =>
        bind natCost r.walk2 (fun b => ret natCost (a + b))))

/-- Changing the cost model moves no behavioural theorem. -/
theorem walk_walk2_behaviour (t : Tree) : beh (t.walk) = beh (t.walk2) := by
  induction t with
  | leaf n => exact Quot.sound rfl
  | node l r ihl ihr =>
      apply Quot.sound
      have hl : (Tree.walk l).val = (Tree.walk2 l).val := congrArg behVal ihl
      have hr : (Tree.walk r).val = (Tree.walk2 r).val := congrArg behVal ihr
      show (Tree.walk (.node l r)).val = (Tree.walk2 (.node l r)).val
      simp [Tree.walk, Tree.walk2, step, bind, ret, hl, hr]

/-- ...while the cost theorems do differ: the quantity is real. -/
theorem walk2_cost (t : Tree) : (t.walk2).cost = 2 * t.size := by
  induction t with
  | leaf n => rfl
  | node l r ihl ihr =>
      show natCost.add 2 _ = _
      simp [Tree.size, bind, ret, natCost] at *
      omega

/-! (b) NON-DEGENERACY. Cost is still informative: `step` is not silently the
identity (calf Theorem 5.6). Without this, non-perturbation would be bought by
making the instrumentation vacuous. -/

theorem step_nondegenerate (e : Cmp natCost Nat) : step natCost 1 e ≠ e := by
  intro h
  have hc : (step natCost 1 e).cost = e.cost := congrArg Cmp.cost h
  simp [step, natCost] at hc

/-! ## 8. Axiom audit -/

#print axioms beh_step
#print axioms noninterference
#print axioms walk_behavior
#print axioms walk_cost
#print axioms walk_bounded
#print axioms bound_bind
#print axioms walk_walk2_behaviour
#print axioms step_nondegenerate
#print axioms walk_transport

end CostProbe
