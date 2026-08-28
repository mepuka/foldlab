import Cas.Lang.Tower

/-!
# Representation — what may be equated, and at which stratum

The stable effects API to reason over (EFFECTS-BACKEND R14). Effectful
computation has FOUR literal representations in Lean, and each carries
its own equality:

1. **First-order content** — signatures' operations, nodes, words,
   schema codes, and (at F3) defunctionalized program tables. Equality
   is `DecidableEq` — structural, hashable, addressable. THIS is the
   metaprogrammatic stratum: what generators, gates, and the store
   reason over. Canonical spelling makes structural equality coincide
   with byte equality (the rendering theorems).
2. **`Prog S A`** — the higher-order proof carrier: pure data whose
   continuations are functions. Equality is propositional and needs
   `funext`; invisible to hashing, ideal for induction. The theorems
   below make it SAFE to treat as pure: it is a lawful monad, and it
   is initial — agreement under every interpretation IS equality.
3. **Handler images** — `interpret h p` in a target monad. Semantic
   values; equated only by theorem (`SemEq`, `ObsEq`), never identity.
   Per R5, cross-host agreement is observed at the word.
4. **Host `IO`** — the admitted seams. No equational theory at all;
   reasoning stops at the trust statement.

"What we can equate to pure": strata 1 and 2 are pure by construction —
1 decidably, 2 propositionally. The monad laws (`LawfulMonad`) license
every metaprogrammatic rewrite a normalizer needs; `interpret_id` and
`eq_of_forall_interpret` license replacing "same under all semantics"
by plain equality. Stratum 3 equations are certificates; stratum 4 has
none.
-/

namespace Cas.Lang

/-! ## `Prog` is a lawful monad — the equational core of the API -/

theorem Prog.bind_pure_right (p : Prog S A) : p.bind .pure = p := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    simp only [Prog.bind]
    exact congrArg (Prog.vis op) (funext fun a => ih a)

theorem Prog.bind_assoc' (p : Prog S A) (f : A → Prog S B) (g : B → Prog S C) :
    (p.bind f).bind g = p.bind fun a => (f a).bind g := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    simp only [Prog.bind]
    exact congrArg (Prog.vis op) (funext fun a => ih a)

instance : LawfulMonad (Prog S) :=
  LawfulMonad.mk'
    (id_map := fun p => Prog.bind_pure_right p)
    (pure_bind := fun _ _ => rfl)
    (bind_assoc := fun p f g => Prog.bind_assoc' p f g)

/-! ## Initiality — syntax is the universal semantics -/

/-- The syntactic identity handler: every operation means itself. -/
def idHandler : Handler S (Prog S) where
  handle op := .vis op .pure

/-- Interpreting through the identity handler is the identity — the
syntax interprets itself faithfully. -/
theorem interpret_id (p : Prog S A) : interpret idHandler p = p := by
  induction p with
  | pure a => rfl
  | vis op k ih =>
    show Prog.bind (.vis op .pure) _ = _
    simp only [Prog.bind]
    exact congrArg (Prog.vis op) (funext fun a => ih a)

/-- Initiality: programs agreeing under EVERY lawful interpretation
are equal. This is the license to treat `Prog` as pure data in proofs:
"same meaning everywhere" collapses to structural identity, so no
finer program equality exists to account for. -/
theorem eq_of_forall_interpret {p q : Prog S A}
    (h : ∀ (M : Type → Type) [Monad M] [LawfulMonad M]
      (hd : Handler S M), interpret hd p = interpret hd q) : p = q := by
  have := h (Prog S) idHandler
  rwa [interpret_id, interpret_id] at this

/-! ## The semantic equalities — stratum 3, always by theorem -/

/-- Equality under one chosen semantics. -/
def SemEq [Monad M] (h : Handler S M) (p q : Prog S A) : Prop :=
  interpret h p = interpret h q

/-- Structural equality is semantic equality everywhere — the trivial
direction, stated so rewriting may cross the boundary. -/
theorem SemEq.of_eq [Monad M] (h : Handler S M) {p q : Prog S A}
    (hpq : p = q) : SemEq h p q := by rw [SemEq, hpq]

/-- Observational equality for the store language: the same outcome
and the same WORD from every starting word — the estate's chosen
observation (R5), the equality the cross-host run gate decides
per-program. -/
def ObsEq (H : Bytes → Addr32) (p q : Prog CasSig A) : Prop :=
  ∀ w, interpretRef H p w = interpretRef H q w

theorem ObsEq.of_eq (H : Bytes → Addr32) {p q : Prog CasSig A}
    (hpq : p = q) : ObsEq H p q := fun w => by rw [hpq]

end Cas.Lang
