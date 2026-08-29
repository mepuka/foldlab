import Cas.Schema.Discriminated

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

## The union's denotation — discriminated first (stage 2)

`El (.union ms m) = cond (discriminatedB ms) (ElMembers ms) Empty`: the
denotation is REAL exactly where decoding is deterministic, and `Empty`
everywhere else.

This is the staged answer `UNION-DESIGN.md` ratified, and the split is
not a convenience — it is what keeps every unconditional law of stage 1
TRUE over the grown carrier. A general union's denotation is a
dependent sum with TRY-ORDER semantics: for overlapping members two
members can both accept a value, and which one the sum records is a
function of the member order, not of the value, so the round trip is
false. Under DISCRIMINATION — every member a struct whose first field
is a required string-literal `_tag`, all tags distinct
(`Cas/Schema/Discriminated.lean`) — the tags are pairwise disjoint
evidence and the round trip is a theorem
(`decodeMembers_encodeMembers`). A non-discriminated union keeps
carriage without denotation: it is store content — mintable,
addressable, re-emittable, materializable into a live Effect validator
through `fromRepresentation` — while Lean holds no values of it, so its
value-plane laws hold vacuously rather than falsely, exactly as in
stage 1.

Discrimination stays OUT of `Ast.WF` on purpose: `WF` is the store's
admission discipline and stage 1 already admits every union. `El`'s
guard is a denotation precondition, and moving it into `WF` would
retire content the store already carries.

The general union's denotation therefore remains a named obligation:

    generalUnionEl : the try-order denotation for undiscriminated
                     unions, with whatever weaker-than-exactness law
                     its consumer can live with. Owed only when a
                     consumer demands it.
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
  | .union ms _ => cond (discriminatedB ms) (ElMembers ms) Empty

/-- Field components, right-nested: `(first, rest)`. -/
def ElFields : List (String × Bool × Ast) → Type
  | [] => Unit
  | (_, opt, a) :: fs => (cond opt (Option (El a)) (El a)) × ElFields fs

/-- Member components, right-nested: the iterated sum, with the LAST
member carried bare rather than wrapped against a dead `Empty`
summand. The empty list is unreachable under `Ast.WF` — the type
function is total anyway, and answers `Empty`, which is the same thing
the guard answers. -/
def ElMembers : List Ast → Type
  | [] => Empty
  | [a] => El a
  | a :: b :: rest => El a ⊕ ElMembers (b :: rest)

end

/-- The undiscriminated union denotes nothing — stage 1's statement,
kept as a theorem so the vacuity every unconditional law leans on is
citable rather than incidental. -/
theorem El_union_undiscriminated {ms : List Ast} {m : UnionMode}
    (h : discriminatedB ms = false) : El (.union ms m) = Empty := by
  simp only [El, h, cond_false]

/-- The discriminated union denotes the member sum. -/
theorem El_union_discriminated {ms : List Ast} {m : UnionMode}
    (h : discriminatedB ms = true) : El (.union ms m) = ElMembers ms := by
  simp only [El, h, cond_true]

/-- A union VALUE is itself the evidence that its code is discriminated
— the undiscriminated arm is `Empty`, so holding one is impossible.
This is what lets the value-plane laws take discrimination as a
hypothesis without carrying it in `Ast.WF`. -/
theorem discriminatedB_of_el {ms : List Ast} {m : UnionMode}
    (x : El (.union ms m)) : discriminatedB ms = true := by
  cases hb : discriminatedB ms with
  | true => rfl
  | false => exact Empty.elim (El_union_undiscriminated (m := m) hb ▸ x)

end Cas.Schema
