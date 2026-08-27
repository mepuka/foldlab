import Effects.Conformance.Ledger

namespace Effects.Conformance

/-- Generic two-case outcome envelope used by the HOMOMORPHISM family shape:
success of `A` or typed failure of `E`. A working label for the family
statement only — the M3 model carrier may refine it. -/
inductive Outcome (E A : Type) where
  | ok (a : A)
  | fail (e : E)

/-- SCHEMA HOMOMORPHISM. Sentence template: "Interpretation respects return
and sequential bind across both outcome cases — <domain gloss>." Kit
template: one program interpreting to success and one to typed failure, so
both outcome cases are inhabited and the bind law is not vacuous on either
branch. -/
structure Homomorphism (Prog : Type → Type) (State E : Type) where
  id : String
  sentence : String
  pureP : ∀ {α : Type}, α → Prog α
  bindP : ∀ {α β : Type}, Prog α → (α → Prog β) → Prog β
  interp : ∀ {α : Type}, Prog α → State → Outcome E α × State
  law_pure : ∀ {α : Type} (a : α) (s : State), interp (pureP a) s = (Outcome.ok a, s)
  law_bind : ∀ {α β : Type} (p : Prog α) (k : α → Prog β) (s : State),
    interp (bindP p k) s =
      match interp p s with
      | (Outcome.ok a, s') => interp (k a) s'
      | (Outcome.fail e, s') => (Outcome.fail e, s')
  posState : State
  posOk : Prog Unit
  pos_ok : ∃ s', interp posOk posState = (Outcome.ok (), s')
  posFail : Prog Unit
  pos_fail : ∃ e s', interp posFail posState = (Outcome.fail e, s')

def Homomorphism.entry {Prog : Type → Type} {State E : Type}
    (b : Homomorphism Prog State E) : LedgerEntry :=
  { id := b.id, family := "HOMOMORPHISM", sentence := b.sentence }

end Effects.Conformance
