import Cas.Schema.Ast

/-!
# The denotation — a code is a type

`El` interprets each code as the Lean type of its values: the
universe's decoding function. Structs denote right-nested products
(one component per field, optional fields under `Option`), references
denote addresses, literals denote the singleton. Every described tree
type in the estate is meant to arrive as `El` of a code — never as a
new hand-written inductive (the three-trees discipline).
-/

namespace Cas.Schema

/-- A typed store reference that RETAINS the kind it expects — the
Lean face of the runtime's branded roots. Erasing the tag would make
every reference code denote one type and lose the refinement. -/
structure StoreRef (tag : UInt8) where
  addr : Addr32

mutual

/-- The type a code denotes. -/
def El : Ast → Type
  | .null => Unit
  | .bool => Bool
  | .int => SafeInt
  | .str => String
  | .lit _ => Unit
  | .arr a => List (El a)
  | .struct fs => ElFields fs
  | .ref t => StoreRef t

/-- Field components, right-nested: `(first, rest)`. -/
def ElFields : List (String × Bool × Ast) → Type
  | [] => Unit
  | (_, opt, a) :: fs => (cond opt (Option (El a)) (El a)) × ElFields fs

end

end Cas.Schema
