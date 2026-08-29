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

/-! ## The general declaration's denotation — a named obligation

`El (.decl id p ps) = Empty`: a general declaration denotes NO Lean
values yet, and that is a statement, not a placeholder. The three
admitted general rows (`Date`, `URL`, `Option`) are admitted AS
CONTENT — the store can hold, address, re-emit, and hand back such a
schema — but Lean has no carrier for their instances, so claiming one
would be a lie and `Empty` is the truth. Every value-plane law about
the code then holds vacuously rather than falsely: `encode` on this arm
is `Empty.elim`, and the codec's own arms never fire.

The design call this parks, stated so the next slice does not
rediscover it: the obvious shape — a typeclass associating an admitted
id with its carrier, the way `Described` associates a code with a type
— does NOT fit. `El` is a function on first-order DATA and consumes a
runtime `DeclarationId.General`; typeclass resolution runs at
elaboration and cannot see a value. The denotation therefore wants a
CARRIER TABLE, `DeclarationId.General → DeclPayload → List Ast → Type`,
defined by cases on the closed registry — a small function, but one
that puts inhabited types under the arm and so drags the value-plane
codec (`Cas/Schema/Codec/`) and its mutual law block
(`Codec/Laws/Mutual.lean`) in with it. That is its own increment. Named
obligation:

    declEl : the carrier table for the admitted general rows, with
             `El (.decl id p ps) = declEl id p ps` and the codec arms
             that follow from it.

## The union's denotation — the same honest route, staged

`El (.union ms m) = Empty`: increment C1 is CARRIAGE only, by the
ratified design, and `Empty` is what carriage without denotation
truthfully says. A union is store content — mintable, addressable,
re-emittable, and materializable into a live Effect validator through
`fromRepresentation` — while Lean holds no values of it, so every
value-plane law about the code holds vacuously rather than falsely.

The design call this parks, so the next slice does not rediscover it:
a general union's denotation is a dependent sum with TRY-ORDER
semantics, and for `anyOf` with overlapping members the decode side is
not extensional — two members can both accept a value, and which one
the sum records is a function of the order, not of the value. Effect's
own answer is the sentinel insight (`SchemaAST.ts:2574`): make the
union DISCRIMINATED — every member a struct carrying the same
literal-tagged field — and decoding becomes deterministic tag
dispatch, at which point the exactness laws are tractable. That is
also exactly the shape `deriving Described` emits for an inductive, so
the denotation and the deriving growth are ONE slice. Named
obligation:

    unionEl : the discriminated-union denotation — `El` of a union of
              tag-carrying structs as the tagged sum, with the value
              codec dispatching on the tag, joined with deriving for
              inductives. General-union denotation stays a named
              obligation until a consumer demands it.
-/

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
  | .decl _ _ _ => Empty
  | .union _ _ => Empty

/-- Field components, right-nested: `(first, rest)`. -/
def ElFields : List (String × Bool × Ast) → Type
  | [] => Unit
  | (_, opt, a) :: fs => (cond opt (Option (El a)) (El a)) × ElFields fs

end

end Cas.Schema
