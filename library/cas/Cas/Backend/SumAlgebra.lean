import Cas.Lang.Lang

/-!
# The sum algebra — signatures compose, and the injections are pinned

PDD-7. Contract packet: `library/cas/contracts/PDD-7.contract.md`.
Owed-ledger item 2 of `.staging/algebraic-review/THE-ALGEBRA.md`
(§2.1 L5/L7/L8, §2.3 L21–L26 and L30/L31, hole §3.2).

**Why this file is under `Cas/Backend/` when nothing in it is backend
code.** The declarations below live in `namespace Cas.Lang`, where
their subjects live; only the module PATH says `Backend`. PDD-7's
fence forbids editing any existing file, and Lake's target graph
leaves exactly one door: `[[lean_lib]] name = "Cas"` carries no
`globs`, so a new `Cas/Lang/Sum.lean` that no module imports would be
built by no target at all and `lake --wfail build` would be green
while never elaborating a line of it. `CasBackend` carries
`globs = ["Cas.Backend.+"]`, is in `defaultTargets`, and is in
`check:cas`'s explicit build list, so a module here is kernel-checked
with zero edits — and `Walk.libraryImports` (`tools/Walk.lean:45-56`)
names the backend leaves individually, so this one is outside the
surface, obligation and law ledgers and moves no bytes. This is
PDD-1's device (`Cas/Backend/Canon.lean`), which PDD-9's ticket names
as the device to use. Moving this module to `Cas.Lang.Sum` is a
one-line lakefile change and a ruling, not a side effect; the packet
records it as owed.

## What the file establishes

`Sig.sum`, `Prog.inl`/`Prog.inr` and `Handler.sum` shipped with zero
theorems between them, so R2's "signatures compose by sum" was two
definitions and an analogy. The gap is not academic: the estate's only
mechanical check on program meaning is the WORD, and the word cannot
see the defect these laws exclude. An injection that performs every
operation TWICE is word-identical to the real one on every store
program — a second `put` of the same node is `duplicate` and leaves
the word unchanged (`Handler.lean:85`), a second `load` is `Word.find`
again, and `fail` answers `Empty` so the doubled node is unreachable.
The statement is therefore the whole of the protection.

Two results carry that weight, and both are stronger than "the law
holds":

- `Handler.sum_unique` — any handler agreeing with `h` on the left
  operations and with `g` on the right IS `h.sum g`.
- `Prog.inl_unique` / `Prog.inr_unique` — any injection satisfying
  `interpret (h.sum g) (ι p) = interpret h p` at every lawful target
  monad and every handler pair IS `Prog.inl`.

So there is no wrong-but-passing implementation to find. The three
adversaries the review documents name are kept in the `Adversary`
section with their refutations, as record rather than as scratch.

The load-bearing detail in `Prog.inl_unique` is the quantification
over EVERY target monad. It is not generality for its own sake: it is
what puts an operation-COUNTING observation inside the law's reach,
and the operation count is precisely what the word gate cannot see.
The refutation of the doubling injection is carried out at a handler
into `StateT Nat Id` for exactly that reason.

Prior art, verified rather than trusted: the law rows of
`THE-ALGEBRA.md` §2.1/§2.3, `handlers-semantics.md` C.2 §3 (row 3.3 —
"`Prog.inl`/`Prog.inr` are `interpret` of the injection handlers" — is
the observation that makes `Prog.inl_unique` provable, and it is the
reviewer's, not this file's), and `prog-carrier.md` S1–S10 with the
adversaries of H-2/H-3. The exhibits file those documents cite
(`handlers-semantics-exhibits.lean`) does not exist in this history,
so every proof below is developed from the carriers.
-/

namespace Cas.Lang

universe u v

/-! ## Handler extensionality, as a private helper only

Handlers agreeing operation by operation are equal. This is
THE-ALGEBRA's **L16, and that row belongs to PDD-8**, which owns the
universal-property block and is running in parallel. This file needs
the fact as machinery and does not claim the row: the helper is
`private`, is deliberately NOT named `Handler.ext`, and will coexist
with PDD-8's public statement on merge. -/
private theorem handler_eq_of_handle {S : Sig} {M : Type → Type v}
    {h g : Handler S M} (hyp : ∀ op, h.handle op = g.handle op) : h = g := by
  cases h
  cases g
  exact congrArg Handler.mk (funext hyp)

/-! ## §2.1 — the carrier's monad-law stragglers

Three equations that every program in the estate already relies on and
none of which was stated. -/

/-- **L5.** The smart constructor and the raw constructor agree:
performing one operation and continuing is the `vis` node itself.
Every program written under R14a P2 ("programs are authored as smart
constructors composed by `bind`") is a `vis` tree only because of this
equation. -/
theorem Prog.op_bind {S : Sig} {B : Type u} (e : S.Op) (k : S.Ans e → Prog S B) :
    (Prog.op e).bind k = Prog.vis e k := rfl

/-- **L7.** Failure absorbs its continuation. `fail` answers `Empty`,
so the continuation is the empty function and `funext` closes it
vacuously. Every user of `require` assumes this. -/
theorem failWith_bind {A B : Type u} (reason : String) (f : A → Prog CasSig B) :
    (failWith reason).bind f = failWith reason := by
  show Prog.vis (S := CasSig) (A := B) (CasE.fail reason) _
    = Prog.vis (S := CasSig) (A := B) (CasE.fail reason) _
  exact congrArg _ (funext fun e => e.elim)

/-- **L8a.** A satisfied guard is no operation at all. -/
theorem require_true (reason : String) :
    require true reason = Prog.pure () := rfl

/-- **L8b.** A violated guard is exactly the refusal. -/
theorem require_false (reason : String) :
    require false reason = failWith reason := rfl

/-! ## §2.3 — the handler-sum projections -/

/-- **L21.** The summed handler answers a left operation with the left
handler's meaning. -/
theorem Handler.sum_handle_inl {S T : Sig} {M : Type → Type v}
    (h : Handler S M) (g : Handler T M) (op : S.Op) :
    (h.sum g).handle (Sum.inl op) = h.handle op := rfl

/-- **L22.** …and a right operation with the right handler's. This is
the row that kills an implementation which quietly discards `g`. -/
theorem Handler.sum_handle_inr {S T : Sig} {M : Type → Type v}
    (h : Handler S M) (g : Handler T M) (op : T.Op) :
    (h.sum g).handle (Sum.inr op) = g.handle op := rfl

/-- **ADQ-SUM.** L21 and L22 are CATEGORICAL: they do not merely hold
of `Handler.sum`, they DETERMINE it. Any handler on the sum signature
that agrees with `h` on the left operations and with `g` on the right
is `h.sum g` — so no wrong-but-passing composition exists, and the two
adversaries in the `Adversary` section below are refuted by a theorem
rather than by an example. -/
theorem Handler.sum_unique {S T : Sig} {M : Type → Type v}
    (h : Handler S M) (g : Handler T M) (k : Handler (S ⊕ₛ T) M)
    (hl : ∀ op, k.handle (Sum.inl op) = h.handle op)
    (hr : ∀ op, k.handle (Sum.inr op) = g.handle op) :
    k = h.sum g :=
  handler_eq_of_handle fun op =>
    match op with
    | .inl o => hl o
    | .inr o => hr o

/-! ## §2.3 — interpretation through a sum

The law every `liftCas` and `liftRootedCas` consumer assumes, stated
for EVERY target monad and every handler pair. Lawfulness of the
target is not needed: the induction closes by `bind_congr`, which asks
only for `Bind`. -/

/-- **L23.** Interpreting a left-injected program through a summed
handler is interpreting it through the left handler. -/
theorem interpret_inl {S T : Sig} {M : Type → Type v} [Monad M] {A : Type}
    (h : Handler S M) (g : Handler T M) (p : Prog S A) :
    interpret (h.sum g) (Prog.inl (T := T) p) = interpret h p := by
  induction p with
  | pure a => rfl
  | vis e k ih => exact bind_congr ih

/-- **L24.** …and the mirror on the right. -/
theorem interpret_inr {S T : Sig} {M : Type → Type v} [Monad M] {A : Type}
    (h : Handler S M) (g : Handler T M) (q : Prog T A) :
    interpret (h.sum g) (Prog.inr (S := S) q) = interpret g q := by
  induction q with
  | pure a => rfl
  | vis e k ih => exact bind_congr ih

/-! ## §2.3 — the injections are monad morphisms -/

/-- **L25**, unit half: `Prog.inl` preserves `pure`. -/
theorem Prog.inl_pure {S T : Sig} {A : Type u} (a : A) :
    Prog.inl (S := S) (T := T) (Prog.pure a) = Prog.pure a := rfl

/-- **L25**, multiplication half: `Prog.inl` preserves `bind`. Together
with `Prog.inl_pure` this is the monad-morphism square (CATALOG §7.2),
and it is what lets a proof push an injection through a program's
structure instead of re-doing the induction at every site. -/
theorem Prog.inl_bind {S T : Sig} {A B : Type u} (p : Prog S A) (f : A → Prog S B) :
    Prog.inl (T := T) (p.bind f)
      = (Prog.inl (T := T) p).bind (fun a => Prog.inl (T := T) (f a)) := by
  induction p with
  | pure a => rfl
  | vis e k ih =>
    exact congrArg (Prog.vis (S := S ⊕ₛ T) (A := B) (Sum.inl e)) (funext ih)

/-- **L25**, unit half on the right. -/
theorem Prog.inr_pure {S T : Sig} {A : Type u} (a : A) :
    Prog.inr (S := S) (T := T) (Prog.pure a) = Prog.pure a := rfl

/-- **L25**, multiplication half on the right. -/
theorem Prog.inr_bind {S T : Sig} {A B : Type u} (q : Prog T A) (f : A → Prog T B) :
    Prog.inr (S := S) (q.bind f)
      = (Prog.inr (S := S) q).bind (fun a => Prog.inr (S := S) (f a)) := by
  induction q with
  | pure a => rfl
  | vis e k ih =>
    exact congrArg (Prog.vis (S := S ⊕ₛ T) (A := B) (Sum.inr e)) (funext ih)

/-! ## §2.3 — the injections are injective

CATALOG §9.4's obligation: export the observation rather than
representation equality. This is what licenses a client to read
`p.inl = q.inl` back as `p = q`. -/

/-- **L26.** `Prog.inl` is injective. -/
theorem Prog.inl_injective {S T : Sig} {A : Type u} :
    ∀ (p q : Prog S A), Prog.inl (T := T) p = Prog.inl (T := T) q → p = q := by
  intro p
  induction p with
  | pure a =>
    intro q
    cases q with
    | pure b => intro hq; simpa [Prog.inl] using hq
    | vis e' k' => intro hq; simp [Prog.inl] at hq
  | vis e k ih =>
    intro q
    cases q with
    | pure b => intro hq; simp [Prog.inl] at hq
    | vis e' k' =>
      intro hq
      have hq' : Prog.vis (S := S ⊕ₛ T) (Sum.inl e) (fun r => Prog.inl (T := T) (k r))
               = Prog.vis (S := S ⊕ₛ T) (Sum.inl e') (fun r => Prog.inl (T := T) (k' r)) := hq
      injection hq' with he hk
      injection he with he'
      subst he'
      exact congrArg (Prog.vis e) (funext fun r => ih r (k' r) (congrFun (eq_of_heq hk) r))

/-- **L26**, mirror: `Prog.inr` is injective. -/
theorem Prog.inr_injective {S T : Sig} {A : Type u} :
    ∀ (p q : Prog T A), Prog.inr (S := S) p = Prog.inr (S := S) q → p = q := by
  intro p
  induction p with
  | pure a =>
    intro q
    cases q with
    | pure b => intro hq; simpa [Prog.inr] using hq
    | vis e' k' => intro hq; simp [Prog.inr] at hq
  | vis e k ih =>
    intro q
    cases q with
    | pure b => intro hq; simp [Prog.inr] at hq
    | vis e' k' =>
      intro hq
      have hq' : Prog.vis (S := S ⊕ₛ T) (Sum.inr e) (fun r => Prog.inr (S := S) (k r))
               = Prog.vis (S := S ⊕ₛ T) (Sum.inr e') (fun r => Prog.inr (S := S) (k' r)) := hq
      injection hq' with he hk
      injection he with he'
      subst he'
      exact congrArg (Prog.vis e) (funext fun r => ih r (k' r) (congrFun (eq_of_heq hk) r))

/-! ## The injection handlers — and why the injections are not primitive

`handlers-semantics.md` C.2 row 3.3 proposes stating that
`Prog.inl`/`Prog.inr` ARE interpretations, which "makes 3.1/3.2
corollaries of 2.2 and kills the hand-rolled recursions". The proposal
is taken here. Its real value is not consolidation: it is that
`interpret (inlHandler S T)` gives a HANDLER whose sum with
`inrHandler` is the identity handler, and that identity is the bridge
`Prog.inl_unique` crosses. -/

/-- The handler that means every `S` operation as itself, inside the
sum. A value of the shipped `Handler` — no new type. -/
def inlHandler (S T : Sig) : Handler S (Prog (S ⊕ₛ T)) where
  handle op := .vis (Sum.inl op) .pure

/-- The mirror on the right. -/
def inrHandler (S T : Sig) : Handler T (Prog (S ⊕ₛ T)) where
  handle op := .vis (Sum.inr op) .pure

/-- **INJ-H.** The hand-rolled left injection IS an interpretation. -/
theorem interpret_inlHandler {S T : Sig} {A : Type} (p : Prog S A) :
    interpret (inlHandler S T) p = Prog.inl p := by
  induction p with
  | pure a => rfl
  | vis e k ih =>
    show Prog.bind (Prog.vis (S := S ⊕ₛ T) (Sum.inl e) Prog.pure) _ = _
    simp only [Prog.bind]
    exact congrArg (Prog.vis (S := S ⊕ₛ T) (A := A) (Sum.inl e)) (funext ih)

/-- **INJ-H**, mirror. -/
theorem interpret_inrHandler {S T : Sig} {A : Type} (q : Prog T A) :
    interpret (inrHandler S T) q = Prog.inr q := by
  induction q with
  | pure a => rfl
  | vis e k ih =>
    show Prog.bind (Prog.vis (S := S ⊕ₛ T) (Sum.inr e) Prog.pure) _ = _
    simp only [Prog.bind]
    exact congrArg (Prog.vis (S := S ⊕ₛ T) (A := A) (Sum.inr e)) (funext ih)

/-- **SUM-ID.** The two injection handlers sum to the identity handler
on the sum signature. One `rfl` per summand — and the whole of
`Prog.inl_unique` rests on it. -/
theorem sum_inlHandler_inrHandler (S T : Sig) :
    (inlHandler S T).sum (inrHandler S T)
      = (idHandler : Handler (S ⊕ₛ T) (Prog (S ⊕ₛ T))) :=
  handler_eq_of_handle fun op =>
    match op with
    | .inl _ => rfl
    | .inr _ => rfl

/-! ## ADQ-INL — L23 is categorical

The adequacy obligation, discharged rather than argued (CONTRACT.md's
`adequacy` class; the shape PDD-2's `anchor_pins_wp` established).
There is no wrong-but-passing injection: satisfying L23 at every
lawful target and every handler pair FORCES `Prog.inl`, pointwise.

The proof is one instantiation. Take the target to be the sum's own
program type and the handler pair to be the injection handlers; their
sum is the identity handler (`sum_inlHandler_inrHandler`), so the left
side collapses by `interpret_id` to `ι p` and the right side is
`Prog.inl p` by `interpret_inlHandler`. -/

/-- **ADQ-INL.** Any injection satisfying L23 everywhere is `Prog.inl`. -/
theorem Prog.inl_unique {S T : Sig}
    (ι : {A : Type} → Prog S A → Prog (S ⊕ₛ T) A)
    (hι : ∀ (M : Type → Type) [Monad M] [LawfulMonad M]
            (h : Handler S M) (g : Handler T M) {A : Type} (p : Prog S A),
            interpret (h.sum g) (ι p) = interpret h p)
    {A : Type} (p : Prog S A) : ι p = Prog.inl p := by
  have key := hι (Prog (S ⊕ₛ T)) (inlHandler S T) (inrHandler S T) p
  rwa [sum_inlHandler_inrHandler, interpret_id, interpret_inlHandler] at key

/-- **ADQ-INL**, mirror: any injection satisfying L24 everywhere is
`Prog.inr`. -/
theorem Prog.inr_unique {S T : Sig}
    (ι : {A : Type} → Prog T A → Prog (S ⊕ₛ T) A)
    (hι : ∀ (M : Type → Type) [Monad M] [LawfulMonad M]
            (h : Handler S M) (g : Handler T M) {A : Type} (q : Prog T A),
            interpret (h.sum g) (ι q) = interpret g q)
    {A : Type} (q : Prog T A) : ι q = Prog.inr q := by
  have key := hι (Prog (S ⊕ₛ T)) (inlHandler S T) (inrHandler S T) q
  rwa [sum_inlHandler_inrHandler, interpret_id, interpret_inrHandler] at key

/-! ## §2.3 L30/L31 — `handleLlm` is an interpretation

`Prog.handleLlm` (`Interp.lean:184-187`) hand-rolls the `AgentSig`
split, bypassing `Handler.sum` entirely — one of the three open-coded
sum consumers `handlers-semantics.md` B.9 counts. L30 says the
hand-rolled recursion IS `interpret` of a handler, and the handler is a
VALUE of the existing `Handler` type: no new type is minted. -/

/-- L30's right-hand summand: the oracle, as a handler into store
programs. -/
def llmOracleHandler (oracle : String → String) : Handler LlmSig (Prog CasSig) where
  handle | .infer q => .pure (oracle q)

/-- **L30.** The hand-rolled `AgentSig` split is the interpretation of
`idHandler.sum (llmOracleHandler oracle)`. Stated at `A : Type`, which
is where `interpret` lives — `Handler`'s target is `Type → Type v`. -/
theorem handleLlm_eq_interpret (oracle : String → String) {A : Type}
    (p : Prog AgentSig A) :
    p.handleLlm oracle = interpret (idHandler.sum (llmOracleHandler oracle)) p := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    match op with
    | .inl e =>
      have hl : Prog.handleLlm oracle (Prog.vis (S := AgentSig) (Sum.inl e) k)
          = Prog.vis (S := CasSig) (A := A) e
              (fun r => Prog.handleLlm oracle (k r)) := rfl
      have hr : interpret (idHandler.sum (llmOracleHandler oracle))
              (Prog.vis (S := AgentSig) (Sum.inl e) k)
          = Prog.vis (S := CasSig) (A := A) e
              (fun r => interpret (idHandler.sum (llmOracleHandler oracle)) (k r)) := rfl
      rw [hl, hr]
      exact congrArg (Prog.vis (S := CasSig) (A := A) e) (funext ih)
    | .inr (.infer q) =>
      have hl : Prog.handleLlm oracle (Prog.vis (S := AgentSig) (Sum.inr (LlmE.infer q)) k)
          = Prog.handleLlm oracle (k (oracle q)) := rfl
      have hr : interpret (idHandler.sum (llmOracleHandler oracle))
              (Prog.vis (S := AgentSig) (Sum.inr (LlmE.infer q)) k)
          = interpret (idHandler.sum (llmOracleHandler oracle)) (k (oracle q)) := rfl
      rw [hl, hr]
      exact ih (oracle q)

/-- **L30** as THE-ALGEBRA states it: an equation between two
functions. -/
theorem handleLlm_eq_interpret_fun (oracle : String → String) (A : Type) :
    (Prog.handleLlm (A := A) oracle)
      = interpret (idHandler.sum (llmOracleHandler oracle)) :=
  funext fun p => handleLlm_eq_interpret oracle p

/-- **L31.** Lifting a store program into the agent language and
handling inference away returns the program itself, on the nose. The
law every `runAgent` client assumes. Proved by direct induction, so it
holds at every universe — unlike L30, which `interpret` pins to
`Type`. -/
theorem handleLlm_liftCas (oracle : String → String) {A : Type u} (p : Prog CasSig A) :
    (liftCas p).handleLlm oracle = p := by
  induction p with
  | pure a => rfl
  | vis e k ih => exact congrArg (Prog.vis e) (funext ih)

/-- **L31**, re-derived from this packet's own laws rather than by
induction: L30 turns `handleLlm` into an interpretation, L23 discards
the right summand, and `interpret_id` collapses the rest. Kept because
a law set whose members do not compose is a law set that was never
used — this is the mechanical check that they do. -/
theorem handleLlm_liftCas_via_laws (oracle : String → String) {A : Type}
    (p : Prog CasSig A) :
    (liftCas p).handleLlm oracle = p := by
  rw [handleLlm_eq_interpret oracle (liftCas p)]
  show interpret (idHandler.sum (llmOracleHandler oracle)) (Prog.inl p) = p
  rw [interpret_inl, interpret_id]

/-! ## The adversaries

Attack artifacts are record, never scratch (BREAKER.md). Each
adversary below is a wrong implementation that the estate's own gates
could not distinguish before this file existed; each is kept beside
the theorem that kills it, so a later hand cannot relax a law back
without a red build.

The observation the refutations rely on is deliberate. `CasSig`'s
handlers cannot be counted at the WORD — that is the whole content of
hole §3.2 — so the counting is done in a target monad where an
operation is visible: `StateT Nat Id`, a handler that increments. That
target is inside L23's quantifier and outside the word gate's reach,
which is exactly the asymmetry the law exists to supply. -/

namespace Adversary

/-- A one-operation signature whose answers carry nothing, so that the
only thing a handler for it can do is have an effect. -/
def TickSig : Sig := ⟨Unit, fun _ => Unit⟩

/-- The counting target: state is the operation count. -/
abbrev Counter := StateT Nat Id

/-- Each operation costs one. -/
def tickHandler : Handler TickSig Counter where
  handle _ := fun n => ((), n + 1)

/-- A second, distinguishable handler — each operation costs two. -/
def tickHandler2 : Handler TickSig Counter where
  handle _ := fun n => ((), n + 2)

/-- The one-operation program. -/
def tick : Prog TickSig Unit := .vis () .pure

/-! ### Adversary 1 — the arm-swapping sum

`handlers-semantics.md` B.9's own witness: with no law stated about
`Handler.sum`, an implementation that exchanges the arms when
`S = T` satisfies everything known about it. L21 kills it, and
`Handler.sum_unique` kills the whole family it belongs to. -/

/-- The sum with its arms exchanged. -/
def swapSum {S : Sig} {M : Type → Type v} (h g : Handler S M) : Handler (S ⊕ₛ S) M where
  handle
    | .inl op => g.handle op
    | .inr op => h.handle op

theorem swapSum_left_count :
    ((swapSum tickHandler tickHandler2).handle (Sum.inl ())) 0 = ((), 2) := rfl

theorem tickHandler_count : (tickHandler.handle ()) 0 = ((), 1) := rfl

/-- **Falsifier for L21.** The arm-swapping sum refutes the left
projection: the composed handler answers a LEFT operation with the
RIGHT handler's meaning, and at a counting target that difference is
visible. -/
theorem swapSum_not_sum_handle_inl :
    ¬ (∀ (S : Sig) (M : Type → Type) [Monad M] (h g : Handler S M) (op : S.Op),
         (swapSum h g).handle (Sum.inl op) = h.handle op) := by
  intro hyp
  have h1 := congrFun (hyp TickSig Counter tickHandler tickHandler2 ()) 0
  rw [swapSum_left_count, tickHandler_count] at h1
  have h2 : (2 : Nat) = 1 := congrArg Prod.snd h1
  omega

/-! ### Adversary 2 — the sum that discards its right handler

THE-ALGEBRA §3.2 ADVERSARY 1, verbatim in shape: a handler on
`AgentSig` built from a `CasSig` handler alone, answering every
`infer` with the empty string. It typechecks, it discards `g`, and
before this file it violated no stated law.

The point of the two positive theorems below is to show WHICH law does
the work: the adversary satisfies the L21 and L23 analogues exactly,
so every store-only program is interpreted correctly by it, and only
the right-hand projection (L22/L24) separates it from the truth. That
is why §3.2 says the word gate is blind by construction — a
`CasSig`-only program cannot tell the difference. -/

def badAgentSum {M : Type → Type v} [Monad M] (h : Handler CasSig M) :
    Handler AgentSig M where
  handle
    | .inl op => h.handle op
    | .inr (.infer _) => pure ""

/-- The adversary satisfies L21. -/
theorem badAgentSum_handle_inl {M : Type → Type v} [Monad M]
    (h : Handler CasSig M) (op : CasSig.Op) :
    (badAgentSum h).handle (Sum.inl op) = h.handle op := rfl

/-- The adversary satisfies L23 — every store-only program is
interpreted exactly right, which is the whole reason no run gate
catches it. -/
theorem badAgentSum_interpret_inl {M : Type → Type v} [Monad M]
    (h : Handler CasSig M) {A : Type} (p : Prog CasSig A) :
    interpret (badAgentSum h) (Prog.inl p) = interpret h p := by
  induction p with
  | pure a => rfl
  | vis e k ih => exact bind_congr ih

/-- A store handler that refuses everything — enough to instantiate
the adversary, since `CasE.fail` answers `Empty` and so needs a target
with an error branch. -/
def refuseCas : Handler CasSig (Except Unit) where
  handle
    | .put _ => .error ()
    | .load _ => .error ()
    | .fail _ => .error ()

/-- An oracle that is observably not the empty string. -/
def echoLlm : Handler LlmSig (Except Unit) where
  handle | .infer s => .ok (s ++ "!")

def askX : Prog LlmSig String := .vis (.infer "x") .pure

theorem badAgentSum_askX :
    interpret (badAgentSum refuseCas) (Prog.inr askX) = Except.ok "" := rfl

theorem echoLlm_askX : interpret echoLlm askX = Except.ok "x!" := rfl

/-- **Falsifier for L24.** The discarding sum refutes the right
projection. Together with `badAgentSum_interpret_inl` above this is the
adequacy statement in full: the adversary passes every left-hand law
and fails only here. -/
theorem badAgentSum_not_interpret_inr :
    ¬ (∀ (M : Type → Type) [Monad M] (h : Handler CasSig M) (g : Handler LlmSig M)
         (A : Type) (q : Prog LlmSig A),
         interpret (badAgentSum h) (Prog.inr q) = interpret g q) := by
  intro hyp
  have h1 := hyp (Except Unit) refuseCas echoLlm String askX
  rw [badAgentSum_askX, echoLlm_askX] at h1
  injection h1 with h2
  exact absurd h2 (by decide)

/-! ### Adversary 3 — the doubling injection

THE-ALGEBRA §3.2 ADVERSARY 2 and `prog-carrier.md` H-3, the ticket's
named canonical wrong-but-passing candidate: an injection that
performs every operation TWICE and keeps the first answer. On the
store language the doubling is invisible at the word, so the estate's
only mechanical check on program meaning cannot in principle see it.

What separates it is L23, at a handler that counts. -/

/-- Performs every operation twice, keeps the first answer. -/
def doubleInl {S T : Sig} {A : Type u} : Prog S A → Prog (S ⊕ₛ T) A
  | .pure a => .pure a
  | .vis e k => .vis (Sum.inl e) fun r => .vis (Sum.inl e) fun _ => doubleInl (k r)

theorem doubleInl_tick_count :
    (interpret (tickHandler.sum tickHandler) (doubleInl (T := TickSig) tick)) 0
      = ((), 2) := rfl

theorem inl_tick_count :
    (interpret (tickHandler.sum tickHandler) (Prog.inl (T := TickSig) tick)) 0
      = ((), 1) := rfl

/-- **Falsifier for L23**, fired by the adversary against itself: the
doubling injection does not satisfy the left interpretation law. The
witness is the operation COUNT — two where the real injection spends
one — which is exactly the observation the word gate cannot make. -/
theorem doubleInl_not_interpret_inl :
    ¬ (∀ (S T : Sig) (M : Type → Type) [Monad M] (h : Handler S M) (g : Handler T M)
         (A : Type) (p : Prog S A),
         interpret (h.sum g) (doubleInl (T := T) p) = interpret h p) := by
  intro hyp
  have h1 := congrFun
    (hyp TickSig TickSig Counter tickHandler tickHandler Unit tick) 0
  rw [doubleInl_tick_count] at h1
  rw [show interpret tickHandler tick = (interpret (tickHandler.sum tickHandler)
        (Prog.inl (T := TickSig) tick)) from
      (interpret_inl tickHandler tickHandler tick).symm, inl_tick_count] at h1
  have h2 : (2 : Nat) = 1 := congrArg Prod.snd h1
  omega

/-! #### What L25 contributes to killing it — nothing

THE-ALGEBRA §3.2 and `prog-carrier.md` H-3 both record the doubling
injection as "KILLED BY interpret_inl (L23) together with `inl` is a
monad morphism (L25); nothing weaker separates them."

The second half of that sentence is false, and the two theorems below
are the witness: `doubleInl` IS a monad morphism. It preserves `pure`
and it preserves `bind`, by the same induction the real injection
uses. So L25 excludes it from nothing, and L23 is not merely the first
conjunct of the separating pair — it is the whole of it, as
`Prog.inl_unique` independently shows by pinning `Prog.inl` from L23
alone.

This is recorded in the packet's break ledger. The finding does not
weaken anything: both laws are true and both are worth having. What
falls is the record's account of which law does the work. -/

/-- The adversary preserves `pure`. -/
theorem doubleInl_pure {S T : Sig} {A : Type u} (a : A) :
    doubleInl (S := S) (T := T) (Prog.pure a) = Prog.pure a := rfl

/-- The adversary preserves `bind`. With `doubleInl_pure`, the doubling
injection satisfies L25 in full — which is why L25 cannot be what
separates it from `Prog.inl`. -/
theorem doubleInl_bind {S T : Sig} {A B : Type u} (p : Prog S A) (f : A → Prog S B) :
    doubleInl (T := T) (p.bind f)
      = (doubleInl (T := T) p).bind (fun a => doubleInl (T := T) (f a)) := by
  induction p with
  | pure a => rfl
  | vis e k ih =>
    exact congrArg (Prog.vis (S := S ⊕ₛ T) (A := B) (Sum.inl e)) (funext fun r =>
      congrArg (Prog.vis (S := S ⊕ₛ T) (A := B) (Sum.inl e)) (funext fun _ => ih r))

/-- And it is injective, so L26 does not separate it either. Recorded
so the ledger entry is exhaustive about which of the stated laws the
adversary survives: L25, L26, and every law about `Handler.sum`. -/
theorem doubleInl_injective {S T : Sig} {A : Type u} :
    ∀ (p q : Prog S A), doubleInl (T := T) p = doubleInl (T := T) q → p = q := by
  intro p
  induction p with
  | pure a =>
    intro q hq
    cases q with
    | pure b => simpa [doubleInl] using hq
    | vis e' k' => simp [doubleInl] at hq
  | vis e k ih =>
    intro q hq
    cases q with
    | pure b => simp [doubleInl] at hq
    | vis e' k' =>
      have hq' : Prog.vis (S := S ⊕ₛ T) (Sum.inl e)
                   (fun r => Prog.vis (S := S ⊕ₛ T) (Sum.inl e)
                     (fun _ => doubleInl (T := T) (k r)))
               = Prog.vis (S := S ⊕ₛ T) (Sum.inl e')
                   (fun r => Prog.vis (S := S ⊕ₛ T) (Sum.inl e')
                     (fun _ => doubleInl (T := T) (k' r))) := hq
      injection hq' with he hk
      injection he with he'
      subst he'
      refine congrArg (Prog.vis e) (funext fun r => ih r (k' r) ?_)
      injection congrFun (eq_of_heq hk) r with _ h2
      exact congrFun h2 r

end Adversary

/-! ## Axiom census

Printed at build time so the claim is read off the run rather than
asserted in a document. `propext`, `funext` and `Quot.sound` are the
estate's clean three; anything else — in particular `sorryAx` or
`Classical.choice` — is a finding, and this file is where it would
show. -/

#print axioms Prog.op_bind
#print axioms failWith_bind
#print axioms Handler.sum_unique
#print axioms interpret_inl
#print axioms interpret_inr
#print axioms Prog.inl_bind
#print axioms Prog.inl_injective
#print axioms Prog.inl_unique
#print axioms Prog.inr_unique
#print axioms handleLlm_eq_interpret_fun
#print axioms handleLlm_liftCas
#print axioms handleLlm_liftCas_via_laws
#print axioms Adversary.doubleInl_not_interpret_inl
#print axioms Adversary.doubleInl_bind
#print axioms Adversary.badAgentSum_not_interpret_inr
#print axioms Adversary.swapSum_not_sum_handle_inl

end Cas.Lang
