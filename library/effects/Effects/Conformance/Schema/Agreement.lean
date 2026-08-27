import Effects.Conformance.Ledger

namespace Effects.Conformance

/-- SCHEMA AGREEMENT (added at the remote Pass A). Sentence template:
"On <domain>, <computation A> and <computation B> agree at <observation>
— <domain gloss>." Kit template: a positive witness where both
computations produce the observed value, and a falsification witness — a
mutated computation that satisfies the hypothesis yet observably
diverges. -/
structure Agreement (X R O : Type) where
  id : String
  sentence : String
  hyp : X → Prop
  observe : R → O
  f : X → R
  g : X → R
  law : ∀ x, hyp x → observe (f x) = observe (g x)
  posX : X
  pos_hyp : hyp posX
  negF : X → R
  negX : X
  neg_hyp : hyp negX
  neg_diverges : observe (negF negX) ≠ observe (g negX)

def Agreement.entry {X R O : Type} (b : Agreement X R O) : LedgerEntry :=
  { id := b.id, family := "AGREEMENT", sentence := b.sentence }

end Effects.Conformance
