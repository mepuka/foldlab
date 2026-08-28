import Cas.Schema.Deriving

/-!
# Schema derivation — ordinary Lean structures on the schema plane

This example is also the acceptance test for `deriving Described`:
field order is canonicalized, optionality is inferred from `Option`,
parameters receive the required `Described` instances, and the generic
codec laws are inherited without per-structure serialization proofs.
-/

namespace CasExamples.SchemaDeriving

open Cas.Schema

structure Profile where
  displayName : String
  enabled : Bool
  nickname : Option String
  deriving Described

example : Described.code (α := Profile) =
    .struct [
      ("displayName", false, .str),
      ("enabled", false, .bool),
      ("nickname", true, .str)
    ] := by
  rfl

example (profile : Profile) :
    Described.decode (Described.encode profile) = some profile :=
  Described.decode_encode profile

example {left right : Profile}
    (h : Described.encode left = Described.encode right) : left = right :=
  Described.encode_inj h

structure Box (α : Type) where
  value : α
  deriving Described

example : Described (Box String) := inferInstance

example (box : Box String) :
    Described.decode (Described.encode box) = some box :=
  Described.decode_encode box

end CasExamples.SchemaDeriving
