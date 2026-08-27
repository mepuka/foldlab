import Effects.Conformance.Ledger

namespace Effects.Conformance

/-- SCHEMA CODEC. Sentence template: "Canonicalization is idempotent,
canonical values round-trip, and the encoding is injective on canonical
forms — <domain gloss>." Kit template: a value exercising the round trip,
and bytes the decoder rejects, proving the decoder is not constantly
accepting. -/
structure Codec (α Bytes : Type) where
  id : String
  sentence : String
  canon : α → α
  encode : α → Bytes
  decode : Bytes → Option α
  law_canon_idem : ∀ x, canon (canon x) = canon x
  law_roundtrip : ∀ x, decode (encode (canon x)) = some (canon x)
  law_inj : ∀ x y, canon x = x → canon y = y → encode x = encode y → x = y
  posVal : α
  negBytes : Bytes
  neg_rejects : decode negBytes = none

def Codec.entry {α Bytes : Type} (b : Codec α Bytes) : LedgerEntry :=
  { id := b.id, family := "CODEC", sentence := b.sentence }

end Effects.Conformance
