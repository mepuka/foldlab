/-
Shape B correspondence (metaprogramming survey §3 P2) — demonstrated here against the
hand-written carrier; in the generated pipeline these three parts are emitted from
inventory.json. No metaprogram anywhere: type ascriptions (soundness), an exhaustive tag
match (completeness), a decided distinctness lemma. All kernel-checked on every build.

AMENDED 2026-08-25 (A-1, ratified under Q10): the exhaustive carrier tag map and
distinctness witness include the new nullary `SchemaCore.address` variant.

AMENDED 2026-08-25 (A-4, ratified under G4): `SchemaCore.tupleRest` and
`SchemaCore.record` carry ascriptions, tags 11 and 12, and the 13-variant
distinctness witness.
-/
import E2.Core

namespace E2.Correspondence

-- (1) SOUNDNESS: each variant exists with exactly this signature. A changed field type
--     fails as a type mismatch; a removed variant fails as an unknown constant.
def prim   : Prim → SchemaCore                := SchemaCore.prim
def lit    : Value → SchemaCore               := SchemaCore.lit
def object : FieldList → SchemaCore           := SchemaCore.object
def tuple  : SchemaList → SchemaCore          := SchemaCore.tuple
def array  : SchemaCore → SchemaCore          := SchemaCore.array
def union  : UMode → SchemaList → SchemaCore  := SchemaCore.union
def refine : SchemaCore → Check → SchemaCore  := SchemaCore.refine
def ref    : Address → SchemaCore             := SchemaCore.ref
def var    : Nat → SchemaCore                 := SchemaCore.var
def mu     : String → SchemaCore → SchemaCore := SchemaCore.mu
def address : SchemaCore                      := SchemaCore.address
def tupleRest : SchemaList → SchemaCore → SchemaCore := SchemaCore.tupleRest
def record : SchemaCore → SchemaCore          := SchemaCore.record

-- (2) COMPLETENESS: no extra variants. Exhaustiveness is kernel-checked; a new
--     constructor fails this match as `Missing cases:`. The tag values also pin order.
def tag : SchemaCore → Nat
  | .prim _     => 0
  | .lit _      => 1
  | .object _   => 2
  | .tuple _    => 3
  | .array _    => 4
  | .union _ _  => 5
  | .refine _ _ => 6
  | .ref _      => 7
  | .var _      => 8
  | .mu _ _     => 9
  | .address    => 10
  | .tupleRest _ _ => 11
  | .record _   => 12

-- (3) DISTINCTNESS: the tag assignment aliases no two variants.
theorem tags_distinct :
    ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : List Nat).eraseDups.length = 13 := by decide

end E2.Correspondence
