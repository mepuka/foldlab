import Cas.Lang.Lang

/-!
# handlers-semantics — the review's exhibits, kernel-checked

Companion to `.staging/algebraic-review/handlers-semantics.md` (algebraic
model review, 2026-08-30). REVIEW ARTIFACT, pre-grade: nothing here is
proposed for `library/cas` as written — the sections are the review's
evidence that each named missing law is provable and each named falsifier
fires.

Checked at main `7dac14d8`, Lean `leanprover/lean4:v4.33.1`, by
`lake env lean` from `library/cas` against the committed build. Zero
errors, zero `sorry`, zero `native_decide`.

- §1–§6: laws the report marks STATE-NEW. Each closes in a handful of
  lines from theorems already on main, which is the report's claim that
  the gap is a statement gap and not a proof gap.
- §7: the `replayHandler` falsifiers (witness A duplicate-starve,
  witness B load-after-consume) with the reference-side exhibit that
  makes witness B a disagreement rather than a curiosity.
- §8: the degenerate address function, exhibiting that `H` is
  unconstrained across `Handler.lean` / `Interp.lean` / `Tower.lean`.
-/

namespace Review
open Cas Cas.Lang

universe v
variable {S T U : Sig} {M : Type → Type v} {A B : Type}

/-! ## 1. Handler.sum respects the injections (stated nowhere) -/

theorem interpret_sum_inl [Monad M] (h : Handler S M) (g : Handler T M)
    (p : Prog S A) : interpret (h.sum g) p.inl = interpret h p := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    show (h.sum g).handle (Sum.inl op) >>= _ = _
    exact bind_congr fun r => ih r

theorem interpret_sum_inr [Monad M] (h : Handler S M) (g : Handler T M)
    (p : Prog T A) : interpret (h.sum g) p.inr = interpret g p := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    show (h.sum g).handle (Sum.inr op) >>= _ = _
    exact bind_congr fun r => ih r

/-! ## 2. The op-then-continue law -/

theorem op_bind (op : S.Op) (k : S.Ans op → Prog S A) :
    (Prog.op op).bind k = .vis op k := rfl

/-! ## 3. Handler extensionality and uniqueness -/

theorem handler_ext {h g : Handler S M} (e : ∀ op, h.handle op = g.handle op) :
    h = g := by
  cases h; cases g; exact congrArg Handler.mk (funext e)

theorem handler_eq_of_interpret_eq [Monad M] [LawfulMonad M] {h g : Handler S M}
    (e : ∀ (op : S.Op), interpret h (Prog.op op) = interpret g (Prog.op op)) :
    h = g :=
  handler_ext fun op => by
    have := e op
    rwa [interpret_op h op, interpret_op g op] at this

/-! ## 4. "A semantics IS a handler" — every monad morphism out of `Prog`
arises from a handler. R3/R10's headline claim; stated nowhere. -/

theorem interpret_of_morphism [Monad M] [LawfulMonad M]
    (φ : {A : Type} → Prog S A → M A)
    (hp : ∀ {A : Type} (a : A), φ (Prog.pure a) = pure a)
    (hb : ∀ {A B : Type} (p : Prog S A) (f : A → Prog S B),
      φ (p.bind f) = φ p >>= fun a => φ (f a))
    (p : Prog S A) :
    φ p = interpret (M := M) ⟨fun op => φ (Prog.op op)⟩ p := by
  induction p with
  | pure a => exact hp a
  | vis op k ih =>
    have hv : φ (Prog.vis op k) = φ (Prog.op op) >>= fun r => φ (k r) := by
      rw [← op_bind op k]; exact hb (Prog.op op) k
    rw [hv]
    exact bind_congr fun r => ih r

/-! ## 5. The tower's category laws: `through` associative, `idHandler`
its unit. Immediate from `interpret_through`/`interpret_id`; stated nowhere. -/

theorem through_assoc [Monad M] [LawfulMonad M]
    (t : Handler S (Prog T)) (u : Handler T (Prog U)) (h : Handler U M) :
    (t.through u).through h = t.through (u.through h) :=
  handler_ext fun op => by
    show interpret h (interpret u (t.handle op)) = interpret (u.through h) (t.handle op)
    exact interpret_through u h (t.handle op)

theorem through_id_right (t : Handler S (Prog T)) :
    t.through (idHandler (S := T)) = t :=
  handler_ext fun op => interpret_id (t.handle op)

theorem through_id_left [Monad M] [LawfulMonad M] (h : Handler S M) :
    (idHandler (S := S)).through h = h :=
  handler_ext fun op => by
    show interpret h (Prog.vis op Prog.pure) = h.handle op
    show h.handle op >>= (fun r => (pure r : M _)) = h.handle op
    simp

/-! ## 6. `Prog.handleLlm` is outside the handler algebra it instantiates.
Neither the lift-identity nor the morphism law is stated. -/

theorem handleLlm_liftCas (oracle : String → String) (p : Prog CasSig A) :
    Prog.handleLlm oracle (liftCas p) = p := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    show Prog.vis op _ = Prog.vis op k
    exact congrArg (Prog.vis op) (funext fun r => ih r)

theorem handleLlm_bind (oracle : String → String)
    (p : Prog AgentSig A) (f : A → Prog AgentSig B) :
    Prog.handleLlm oracle (p.bind f)
      = (Prog.handleLlm oracle p).bind fun a => Prog.handleLlm oracle (f a) := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    cases op with
    | inl e =>
      show Prog.vis e _ = Prog.bind (Prog.vis e _) _
      exact congrArg (Prog.vis e) (funext fun r => ih r)
    | inr e => cases e with
      | infer q => exact ih (oracle q)

/-! ## 7. FALSIFIERS — `replayHandler` is not the co-direction of recording.

Witness A: the second put DUPLICATES, so the reference records ONE binding
while replay pops one per put and starves. -/

theorem replay_starves_on_duplicate (n : Node) (a : Addr32) :
    interpret replayHandler
        (Prog.vis (CasE.put n) fun _ =>
          Prog.vis (CasE.put n) fun _ => (Prog.pure () : Prog CasSig Unit))
        [Binding.mk a n]
      = .error (.failed "replay: word exhausted") := by
  have h1 : replayHandler.handle (CasE.put n) [Binding.mk a n] = .ok (a, []) := by
    simp [replayHandler]
  have h2 : replayHandler.handle (CasE.put n) ([] : Word)
      = .error (.failed "replay: word exhausted") := rfl
  rw [interpret_vis_state replayHandler (CasE.put n) _ [Binding.mk a n], h1]
  show interpret replayHandler
      (Prog.vis (CasE.put n) fun _ => (Prog.pure () : Prog CasSig Unit)) ([] : Word) = _
  rw [interpret_vis_state replayHandler (CasE.put n) _ ([] : Word), h2]

/-- Witness B (the sharper one): a `load` of an address the recording
BOUND. The reference resolves it out of the accumulated word; replay has
already consumed that binding, so it refuses. -/
theorem replay_refuses_a_load_the_reference_admits (n : Node) (a : Addr32) :
    interpret replayHandler
        (Prog.vis (CasE.put n) fun ans =>
          Prog.vis (CasE.load ans) fun _ => (Prog.pure () : Prog CasSig Unit))
        [Binding.mk a n]
      = .error (.noObject a) := by
  have h1 : replayHandler.handle (CasE.put n) [Binding.mk a n] = .ok (a, []) := by
    simp [replayHandler]
  have h2 : replayHandler.handle (CasE.load a) ([] : Word) = .error (.noObject a) := rfl
  rw [interpret_vis_state replayHandler (CasE.put n) _ [Binding.mk a n], h1]
  show interpret replayHandler
      (Prog.vis (CasE.load a) fun _ => (Prog.pure () : Prog CasSig Unit)) ([] : Word) = _
  rw [interpret_vis_state replayHandler (CasE.load a) _ ([] : Word), h2]

/-- The reference side of witness B: the same program, from the empty
word, succeeds and leaves the one-binding word replay was handed. -/
theorem reference_admits_witness_B (H : Bytes → Addr32) (n : Node) (hwf : n.WF)
    (hrefs : n.refs = []) :
    interpretRef H
        (Prog.vis (CasE.put n) fun ans =>
          Prog.vis (CasE.load ans) fun _ => (Prog.pure () : Prog CasSig Unit))
        []
      = .ok ((), [Binding.mk (addr H ⟨n, hwf⟩) n]) := by
  have hput : (referenceHandler H).handle (CasE.put n) []
      = .ok (addr H ⟨n, hwf⟩, [Binding.mk (addr H ⟨n, hwf⟩) n]) := by
    simp only [referenceHandler, dif_pos hwf, Cas.put, Cas.checkRefs, hrefs,
      Word.toStore, Word.find]
    rfl
  have hload : (referenceHandler H).handle (CasE.load (addr H ⟨n, hwf⟩))
      [Binding.mk (addr H ⟨n, hwf⟩) n]
      = .ok (n, [Binding.mk (addr H ⟨n, hwf⟩) n]) := by
    simp [referenceHandler, Word.find]
  rw [interpretRef, interpret_vis_state (referenceHandler H) (CasE.put n) _ ([] : Word),
    hput]
  show interpret (referenceHandler H)
      (Prog.vis (CasE.load (addr H ⟨n, hwf⟩)) fun _ => (Prog.pure () : Prog CasSig Unit))
      [Binding.mk (addr H ⟨n, hwf⟩) n] = _
  rw [interpret_vis_state (referenceHandler H) (CasE.load (addr H ⟨n, hwf⟩)) _ _, hload]
  rfl

/-! ## 8. `H` is unconstrained: a constant address function satisfies
every law in Handler/Interp/Tower. -/

def degenerateH : Bytes → Addr32 := fun _ => ⟨List.replicate 32 0, by simp⟩

example : Word.wf (run degenerateH 10 (Prog.pure ()) []).2 = true :=
  run_preserves_wf degenerateH 10 _ rfl

end Review
