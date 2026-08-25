/-
  STAGING PROBE -- NOT AN ESTATE ARTIFACT. No claim gate (G0-G6) attaches to
  this file. It is a measurement, run 2026-08-25 on Lean 4.33.1 (arm64-apple-
  darwin24.6.0, commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6), no Mathlib,
  no Lake project, to answer one question for
  `rocq-itrees-modeling-survey.md` s3: what does an interaction-tree carrier
  actually cost in Lean 4 under the estate's axiom allowlist?

  Reproduce:  lean rocq-itrees-lean-probe.lean
  Measured:   407 lines, ~0.6s wall, and the axiom reports printed inline:
              every entry inside {propext, Classical.choice, Quot.sound},
              and most of them axiom-free.

  Part 1  the itree carrier: Approx/trunc tower, corec, observe, bind, spin,
          iter, translate, interp, typed-failure throw, and gfp coinduction.
  Part 2  the eqit/eutt/euttge family, transcribed from Eq/Eqit.v:90-151.
  Part 3  the entity store's `mu` binder -- shown to need no coinduction.

  The technique is prior art from the Rocq InteractionTrees development
  (Xia et al., POPL 2020; coq-itree 5.2.1 in annex/coq). Nothing is ported;
  the definitions below are restated in Lean and the Rocq original is cited.
-/
set_option linter.unusedVariables false
set_option autoImplicit false

structure Sig where
  Op : Type
  Ans : Op → Type

inductive ITreeF (S : Sig) (R : Type) (X : Type) : Type where
  | ret (r : R)
  | tau (t : X)
  | vis (e : S.Op) (k : S.Ans e → X)

namespace ITreeF
def map {S : Sig} {R X Y : Type} (f : X → Y) : ITreeF S R X → ITreeF S R Y
  | .ret r   => .ret r
  | .tau t   => .tau (f t)
  | .vis e k => .vis e (fun a => f (k a))
end ITreeF

namespace M
variable {S : Sig} {R : Type}

def Approx (S : Sig) (R : Type) : Nat → Type
  | 0   => PUnit
  | n+1 => ITreeF S R (Approx S R n)

def trunc (S : Sig) (R : Type) : (n : Nat) → Approx S R (n+1) → Approx S R n
  | 0,   _ => PUnit.unit
  | _+1, x => ITreeF.map (trunc S R _) x

structure ITree (S : Sig) (R : Type) where
  approx : (n : Nat) → Approx S R n
  coh    : ∀ n, trunc S R n (approx (n+1)) = approx n

/-- Head shape of a node: what `observe` must decide. -/
inductive Head (S : Sig) (R : Type) : Type where
  | ret (r : R) | tau | vis (e : S.Op)

def headF {X : Type} : ITreeF S R X → Head S R
  | .ret r   => .ret r
  | .tau _   => .tau
  | .vis e _ => .vis e

theorem headF_map {X Y : Type} (f : X → Y) (x : ITreeF S R X) :
    headF (ITreeF.map f x) = headF x := by cases x <;> rfl

def head (t : ITree S R) : Head S R := headF (t.approx 1)

/-- The head constructor is the same at every approximation level. -/
theorem head_stable (t : ITree S R) : ∀ n, headF (t.approx (n+1)) = head t := by
  intro n
  induction n with
  | zero => rfl
  | succ n ih =>
    rw [← ih, ← t.coh (n+1)]
    exact (headF_map _ _).symm

/-- Child extractors, given the head. -/
def tauChild {X : Type} : (x : ITreeF S R X) → headF x = .tau → X
  | .tau t, _ => t

def visChild {X : Type} (e : S.Op) : (x : ITreeF S R X) → headF x = .vis e → S.Ans e → X
  | .vis e' k, h => fun a => k (by cases h; exact a)

theorem tauChild_map {X Y : Type} (f : X → Y) (x : ITreeF S R X) (h : headF x = .tau) :
    tauChild (ITreeF.map f x) (by rw [headF_map]; exact h) = f (tauChild x h) := by
  cases x with
  | tau t => rfl
  | ret r => cases h
  | vis e k => cases h

/-- `observe`, the one-step forcing: the hard direction of the M-type. -/
theorem tauChild_congr {X : Type} (x y : ITreeF S R X)
    (hx : headF x = .tau) (hy : headF y = .tau) (e : x = y) :
    tauChild x hx = tauChild y hy := by subst e; rfl

def observeTau (t : ITree S R) (h : head t = .tau) : ITree S R where
  approx n := tauChild (t.approx (n+1)) (by rw [head_stable]; exact h)
  coh n := by
    rw [← tauChild_map (trunc S R n) (t.approx (n+2)) (by rw [head_stable]; exact h)]
    exact tauChild_congr _ _ _ _ (t.coh (n+1))

/-- The `vis` case: continuation extraction.  In Coq this is exactly where the
    library needs UIP (the `eqit_inv_Vis` inversion lemma).  In Lean the
    transport is definitional -- `cases h` below -- because `Eq` is a `Prop`
    and the kernel has proof irrelevance. -/
theorem visChild_map {X Y : Type} (f : X → Y) (e : S.Op) (x : ITreeF S R X)
    (h : headF x = .vis e) (a : S.Ans e) :
    visChild e (ITreeF.map f x) (by rw [headF_map]; exact h) a = f (visChild e x h a) := by
  cases x with
  | vis e' k => cases h; rfl
  | ret r => cases h
  | tau t => cases h

theorem visChild_congr {X : Type} (e : S.Op) (x y : ITreeF S R X)
    (hx : headF x = .vis e) (hy : headF y = .vis e) (q : x = y) (a : S.Ans e) :
    visChild e x hx a = visChild e y hy a := by subst q; rfl

def observeVis (t : ITree S R) (e : S.Op) (h : head t = .vis e) (a : S.Ans e) : ITree S R where
  approx n := visChild e (t.approx (n+1)) (by rw [head_stable]; exact h) a
  coh n := by
    rw [← visChild_map (trunc S R n) e (t.approx (n+2)) (by rw [head_stable]; exact h) a]
    exact visChild_congr e _ _ _ _ (t.coh (n+1)) a

/-- `observe` assembled: one-step forcing of the final coalgebra. -/
def observe (t : ITree S R) : ITreeF S R (ITree S R) :=
  match hh : head t with
  | .ret r  => .ret r
  | .tau    => .tau (observeTau t hh)
  | .vis e  => .vis e (fun a => observeVis t e hh a)


/- ===== corec, spin, and bind over the M-type ===== -/

def corecApprox {X : Type} (step : X → ITreeF S R X) : (n : Nat) → X → Approx S R n
  | 0,   _ => PUnit.unit
  | n+1, x => ITreeF.map (corecApprox step n) (step x)

theorem corecCoh {X : Type} (step : X → ITreeF S R X) :
    ∀ n (x : X), trunc S R n (corecApprox step (n+1) x) = corecApprox step n x := by
  intro n
  induction n with
  | zero => intro x; rfl
  | succ n ih =>
    intro x
    show ITreeF.map _ (ITreeF.map _ (step x)) = ITreeF.map _ (step x)
    cases step x with
    | ret r   => rfl
    | tau t   => exact congrArg ITreeF.tau (ih t)
    | vis e k => exact congrArg (ITreeF.vis e) (funext fun a => ih (k a))

def corec {X : Type} (step : X → ITreeF S R X) (x : X) : ITree S R :=
  { approx := fun n => corecApprox step n x, coh := fun n => corecCoh step n x }

def ret' (r : R) : ITree S R := corec (X := PUnit) (fun _ => .ret r) PUnit.unit

/-- Divergence is a total, well-defined inhabitant. -/
def spin : ITree S R := corec (X := PUnit) (fun _ => .tau PUnit.unit) PUnit.unit

/-- Monadic bind, by corecursion on a sum-typed state. -/
def bind {R' : Type} (t₀ : ITree S R) (k : R → ITree S R') : ITree S R' :=
  corec (X := ITree S R ⊕ ITree S R')
    (fun st =>
      match st with
      | .inl t =>
        match observe t with
        | .ret r    => ITreeF.map .inr (observe (k r))
        | .tau t'   => .tau (.inl t')
        | .vis e c  => .vis e (fun a => .inl (c a))
      | .inr u => ITreeF.map .inr (observe u))
    (.inl t₀)

/- ===== Coinductive PREDICATES: greatest fixpoints via impredicative Prop ===== -/

/-- Knaster-Tarski greatest fixpoint: "there is a post-fixpoint containing x".
    Lean's `Prop` is impredicative, so this is definable directly. -/
def gfp {α : Type} (F : (α → Prop) → (α → Prop)) (x : α) : Prop :=
  ∃ Rel : α → Prop, (∀ y, Rel y → F Rel y) ∧ Rel x

/-- The coinduction principle, for free. -/
theorem gfp_coind {α : Type} (F : (α → Prop) → (α → Prop))
    (Rel : α → Prop) (h : ∀ y, Rel y → F Rel y) : ∀ x, Rel x → gfp F x :=
  fun x hx => ⟨Rel, h, hx⟩

/-- Unfolding needs monotonicity of F -- the standard side condition. -/
theorem gfp_unfold {α : Type} (F : (α → Prop) → (α → Prop))
    (mono : ∀ (P Q : α → Prop), (∀ y, P y → Q y) → ∀ y, F P y → F Q y)
    (x : α) (h : gfp F x) : F (gfp F) x := by
  obtain ⟨Rel, hpost, hx⟩ := h
  exact mono Rel (gfp F) (fun y hy => ⟨Rel, hpost, hy⟩) x (hpost x hx)

/-- Strong bisimulation (`eq_itree`) as one instance. -/
def eqitF (sim : ITree S R × ITree S R → Prop) (p : ITree S R × ITree S R) : Prop :=
  match observe p.1, observe p.2 with
  | .ret r1, .ret r2 => r1 = r2
  | .tau t1, .tau t2 => sim (t1, t2)
  | .vis e1 k1, .vis e2 k2 => ∃ q : e1 = e2, ∀ a, sim (k1 a, k2 (q ▸ a))
  | _, _ => False

def eqit (t u : ITree S R) : Prop := gfp eqitF (t, u)

theorem eqit_refl_of (Rel : ITree S R × ITree S R → Prop)
    (h : ∀ p, Rel p → eqitF Rel p) (t u : ITree S R) (hp : Rel (t, u)) : eqit t u :=
  gfp_coind eqitF Rel h (t, u) hp


/- ===== iter, translate, interp -- the higher-order transform layer ===== -/

def map' {R' : Type} (f : R → R') (t : ITree S R) : ITree S R' :=
  bind t (fun r => ret' (f r))

/-- `iter`: the general-recursion combinator.  The `.tau` on the re-entry
    branch is the productivity guard -- exactly the `Tau` in the Coq
    `ITree.iter` (`Core/ITreeDefinition.v:192`). -/
def iter {I : Type} (step : I → ITree S (I ⊕ R)) (i₀ : I) : ITree S R :=
  corec (X := ITree S (I ⊕ R))
    (fun t =>
      match observe t with
      | .ret (.inl i) => .tau (step i)
      | .ret (.inr r) => .ret r
      | .tau t'       => .tau t'
      | .vis e k      => .vis e k)
    (step i₀)

/-- `translate`: a pure event morphism lifts to a tree morphism.
    Requires the answer types to agree -- a *container morphism*. -/
structure SigMor (S S' : Sig) where
  op  : S.Op → S'.Op
  ans : (e : S.Op) → S'.Ans (op e) → S.Ans e

def translate {S S' : Sig} {R : Type} (h : SigMor S S') (t₀ : ITree S R) : ITree S' R :=
  corec (X := ITree S R)
    (fun t =>
      match observe t with
      | .ret r   => .ret r
      | .tau t'  => .tau t'
      | .vis e k => .vis (h.op e) (fun a => k (h.ans e a)))
    t₀

/-- `interp`: the workhorse.  A handler sending each event code to a
    computation in the target, lifted to a monad morphism on trees.
    This is the combinator the dormant Lean ITree spike reported as blocked
    by universe polymorphism; under the container presentation it is not. -/
def interp {S S' : Sig} {R : Type}
    (h : (e : S.Op) → ITree S' (S.Ans e)) (t₀ : ITree S R) : ITree S' R :=
  iter (I := ITree S R)
    (fun t =>
      match observe t with
      | .ret r   => ret' (.inr r)
      | .tau t'  => ret' (.inl t')
      | .vis e k => map' (fun a => .inl (k a)) (h e))
    t₀

/-- Typed failure as an event, and interpretation into `Except`.
    This is the shape an effectful codec (decode/encode with typed failure)
    would take. -/
def failSig (Err : Type) : Sig := { Op := Err, Ans := fun _ => Empty }

def throw {Err R : Type} (err : Err) : ITree (failSig Err) R :=
  corec (X := PUnit) (fun _ => .vis err (fun a => a.elim)) PUnit.unit

#print axioms iter
#print axioms translate
#print axioms interp
#print axioms throw
#print axioms observe
#print axioms corec
#print axioms bind
#print axioms spin
#print axioms gfp_coind
#print axioms gfp_unfold
#print axioms eqit

/- ============================================================
   PART 2 -- Probe E: does `eutt`'s two-boolean definition transcribe?
   ============================================================ -/
/- ===== Probe E: does `eutt`'s two-boolean definition transcribe?
   Mirrors `ITree/Eq/Eqit.v:90-151` at the annex pin: one inductive relation
   transformer with two booleans permitting a Tau-strip on each side, taken
   as a greatest fixpoint. -/

/-- `eqitF b1 b2 sim` -- the inner INDUCTIVE stratum. `sim` occurs only
    positively, so Lean accepts the family. -/
inductive EqitF (b1 b2 : Bool) (sim : ITree S R → ITree S R → Prop) :
    ITreeF S R (ITree S R) → ITreeF S R (ITree S R) → Prop where
  | eqRet  (r : R) : EqitF b1 b2 sim (.ret r) (.ret r)
  | eqTau  {t1 t2 : ITree S R} (h : sim t1 t2) : EqitF b1 b2 sim (.tau t1) (.tau t2)
  | eqVis  (e : S.Op) {k1 k2 : S.Ans e → ITree S R}
           (h : ∀ a, sim (k1 a) (k2 a)) : EqitF b1 b2 sim (.vis e k1) (.vis e k2)
  | eqTauL {t1 : ITree S R} {o2 : ITreeF S R (ITree S R)}
           (chk : b1 = true) (h : EqitF b1 b2 sim (observe t1) o2) :
           EqitF b1 b2 sim (.tau t1) o2
  | eqTauR {o1 : ITreeF S R (ITree S R)} {t2 : ITree S R}
           (chk : b2 = true) (h : EqitF b1 b2 sim o1 (observe t2)) :
           EqitF b1 b2 sim o1 (.tau t2)

def eqitG (b1 b2 : Bool) (sim : ITree S R × ITree S R → Prop)
    (p : ITree S R × ITree S R) : Prop :=
  EqitF b1 b2 (fun x y => sim (x, y)) (observe p.1) (observe p.2)

/-- The whole family, as in `Eqit.v:147-151`. -/
def eqitB (b1 b2 : Bool) (t u : ITree S R) : Prop := gfp (eqitG b1 b2) (t, u)
def eqItree (t u : ITree S R) : Prop := eqitB false false t u   -- strong  (Eqit.v:147)
def eutt    (t u : ITree S R) : Prop := eqitB true  true  t u   -- weak    (Eqit.v:149)
def euttge  (t u : ITree S R) : Prop := eqitB true  false t u   -- one-sided (Eqit.v:151)

/-- Monotonicity of the inner inductive -- the side condition `gfp_unfold` needs. -/
theorem EqitF_mono (b1 b2 : Bool) (P Q : ITree S R → ITree S R → Prop)
    (hpq : ∀ x y, P x y → Q x y) :
    ∀ o1 o2, EqitF b1 b2 P o1 o2 → EqitF b1 b2 Q o1 o2 := by
  intro o1 o2 h
  induction h with
  | eqRet r => exact .eqRet r
  | eqTau h => exact .eqTau (hpq _ _ h)
  | eqVis e h => exact .eqVis e (fun a => hpq _ _ (h a))
  | eqTauL chk _ ih => exact .eqTauL chk ih
  | eqTauR chk _ ih => exact .eqTauR chk ih

theorem eqitG_mono (b1 b2 : Bool) : ∀ (P Q : ITree S R × ITree S R → Prop),
    (∀ y, P y → Q y) → ∀ y, eqitG b1 b2 P y → eqitG b1 b2 Q y := by
  intro P Q h y hy
  exact EqitF_mono b1 b2 _ _ (fun x z hxz => h (x, z) hxz) _ _ hy

/-- The coinduction principle, specialised. -/
theorem eutt_coind (Rel : ITree S R × ITree S R → Prop)
    (h : ∀ p, Rel p → eqitG true true Rel p) (t u : ITree S R) (hp : Rel (t, u)) : eutt t u :=
  gfp_coind (eqitG true true) Rel h (t, u) hp

/-- And the unfolding direction, from monotonicity. -/
theorem eutt_unfold (t u : ITree S R) (h : eutt t u) :
    eqitG true true (fun p => eutt p.1 p.2) (t, u) := by
  have := gfp_unfold (eqitG true true) (eqitG_mono true true) (t, u) h
  exact eqitG_mono true true _ _ (fun y hy => by
    exact (show gfp (eqitG true true) y → eutt y.1 y.2 from fun q => q) hy) _ this

#print axioms eutt
#print axioms eutt_coind
#print axioms eutt_unfold
#print axioms EqitF_mono
end M

/- ============================================================
   PART 3 -- Probe D: does the entity store's `mu` binder over a FINITE
   schema carrier need coinduction?  Sketch after
   `.staging/e2/entity-store-kickoff.md` s4.2/s5.  Answer: no.
   Recursion is well-founded on (fuel, sizeOf value) lexicographically:
   the mu-unfold charges the fuel component, the structural descent
   charges the value component.  Total, decidable, executable.
   ============================================================ -/


inductive Value where
  | null | bool (b : Bool) | int (n : Int) | str (s : String)
  | arr (vs : List Value)
  deriving Inhabited

inductive Prim | null | bool | int | str
  deriving DecidableEq

inductive SchemaCore where
  | prim  (p : Prim)
  | array (elem : SchemaCore)
  | var   (i : Nat)                                   -- de Bruijn
  | mu    (discriminator : String) (body : SchemaCore)
  deriving Inhabited

/-- Substitution for the mu-unfold. -/
def subst (s : SchemaCore) (d : Nat) (u : SchemaCore) : SchemaCore :=
  match s with
  | .prim p    => .prim p
  | .array e   => .array (subst e d u)
  | .var i     => if i = d then u else .var i
  | .mu n b    => .mu n (subst b (d+1) u)

/-- Conformance.  Recursion is on the VALUE, not the schema: the mu-unfold
    step does not consume value structure, so it is charged to a second
    component, and guardedness of the body is what makes that terminate.
    Here we simply give the unfold a fuel budget equal to the schema size,
    which is the finite, decidable form. -/
def size : SchemaCore → Nat
  | .prim _  => 1
  | .array e => size e + 1
  | .var _   => 1
  | .mu _ b  => size b + 1

def Conforms : Nat → SchemaCore → Value → Bool
  | _,     .prim .null, .null    => true
  | _,     .prim .bool, .bool _  => true
  | _,     .prim .int,  .int _   => true
  | _,     .prim .str,  .str _   => true
  | fuel,  .array e,    .arr vs  => vs.attach.all (fun ⟨v, _⟩ => Conforms fuel e v)
  | 0,     .mu _ _,     _        => false
  | fuel+1, .mu n b,    v        => Conforms fuel (subst b 0 (.mu n b)) v
  | _,     .var _,      _        => false
  | _,     _,           _        => false
termination_by fuel _ v => (fuel, sizeOf v)
decreasing_by
  · exact Prod.Lex.right _ (by
      have h := List.sizeOf_lt_of_mem (by assumption)
      simp +arith; omega)
  · exact Prod.Lex.left _ _ (by omega)

#print axioms Conforms

/-- A recursive schema: mu X. array X  (nested lists of any depth). -/
def nested : SchemaCore := .mu "nested" (.array (.var 0))

-- decidable, executable, total: no coinduction anywhere.
#eval Conforms 8 nested (.arr [.arr [], .arr [.arr []]])
#eval Conforms 8 (.prim .int) (.int 3)
#eval Conforms 8 (.prim .int) .null
