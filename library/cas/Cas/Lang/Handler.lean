import Cas.Lang.Interp

/-!
# Handlers — one syntax, every semantics an instance

The general account of effectful computation this language commits to
(EFFECTS-BACKEND R10): `Prog S` is SYNTAX — a free monad over the
signature, meaning nothing by itself. A semantics is a `Handler S M` —
one meaning per operation in a target monad — and `interpret` is the
monad morphism it induces. Every interface the estate has built is an
instance:

- the REFERENCE semantics (`referenceHandler`): the admission judgment
  in `StateT Word (Except Refusal)` — Lean's pure meaning, the
  semantic oracle every realization is claimed against;
- the production Effect adapter (slice 2's generated programs): the
  same operations handled into `Effect<_, CasError, R>` — fibers,
  interruption, and the error channel are the target monad's
  contribution, never the language's;
- replay: the degenerate handler whose answers come from a recorded
  word — the oracle-from-content direction;
- a transport (CLI, daemon, HTTP): handler COMPOSITION — a signature
  translation into a wire language whose handler lives across a
  process seam, and the seam's own effects (failure, cancellation,
  backpressure) are operations of their own signature, never smuggled.

Because `Prog` is finite (the HITrees-honest carrier, R1), `interpret`
lands in ANY monad by structural recursion — no iteration requirement
on the target. ITrees' `MonadIter` obligation returns exactly when F3
adds loops, and will be taken then, not smuggled now.

`interpret_bind` is the monad-morphism law, proved once for every
handler. The agreement of `interpretRef` (big-step) with the fueled
small-step `run` is F1's territory and stays a named obligation of the
F3 increment — stated here, not claimed.
-/

namespace Cas.Lang

/-- A semantics: one meaning per operation, in a target monad. -/
structure Handler (S : Sig) (M : Type → Type v) where
  handle : (op : S.Op) → M (S.Ans op)

/-- The monad morphism a handler induces. Total by structural
recursion — finite syntax interprets into any monad. -/
def interpret [Monad M] (h : Handler S M) : Prog S A → M A
  | .pure a => pure a
  | .vis op k => h.handle op >>= fun answer => interpret h (k answer)

/-- The monad-morphism law: interpretation respects `bind`, for every
handler into every (lawful) target. One proof, all semantics. -/
theorem interpret_bind [Monad M] [LawfulMonad M] (h : Handler S M)
    (p : Prog S A) (f : A → Prog S B) :
    interpret h (p.bind f) = interpret h p >>= fun a => interpret h (f a) := by
  induction p with
  | pure a => simp [interpret, Prog.bind]
  | vis op k ih =>
    simp only [interpret, Prog.bind, bind_assoc]
    exact bind_congr fun answer => ih answer

/-- Handlers compose across a signature sum: handle either side. -/
def Handler.sum (h : Handler S M) (g : Handler T M) : Handler (S ⊕ₛ T) M where
  handle
    | .inl op => h.handle op
    | .inr op => g.handle op

section Reference

variable (H : Bytes → Addr32)

/-- The reference target: the store word threaded, refusal terminal. -/
abbrev RefM := StateT Word (Except Refusal)

/-- THE reference semantics: the admission judgment, per operation —
the same clauses as `step`, packaged as a handler. Meaning lives here;
every other interface is an adapter claimed against it. -/
def referenceHandler : Handler CasSig (RefM) where
  handle
    | .put n => fun w =>
      if h : n.WF then
        match _root_.Cas.put H (Word.toStore w) ⟨n, h⟩ with
        | .error e => .error (.ofAdmission e)
        | .ok (.fresh a _) => .ok (a, w ++ [Binding.mk a n])
        | .ok (.duplicate a) => .ok (a, w)
        | .ok (.conflict a _) => .error (.collision a)
      else .error .notWellFormed
    | .load a => fun w =>
      match Word.find w a with
      | some n => .ok (n, w)
      | none => .error (.noObject a)
    | .fail reason => fun _ => .error (.failed reason)

/-- Big-step reference interpretation: a program's meaning over a
word — no fuel, total, the denotation `run` approximates step-wise. -/
def interpretRef (p : Prog CasSig A) (w : Word) :
    Except Refusal (A × Word) :=
  interpret (referenceHandler H) p w

end Reference

/-- Replay: the recorded word is the oracle. A put must answer the
next recorded binding for its exact node — recorded history handled as
a semantics, the co-direction of recording. -/
def replayHandler :
    Handler CasSig (StateT Word (Except Refusal)) where
  handle
    | .put n => fun w =>
      match w with
      | [] => .error (.failed "replay: word exhausted")
      | b :: rest =>
        if b.node == n then .ok (b.address, rest)
        else .error (.failed "replay: put differs from the recorded binding")
    | .load a => fun w =>
      match Word.find w a with
      | some n => .ok (n, w)
      | none => .error (.noObject a)
    | .fail reason => fun _ => .error (.failed reason)

end Cas.Lang
