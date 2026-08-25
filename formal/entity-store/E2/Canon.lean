/-
Canonicalization v1, per the ratified equivalence table (kickoff §4.3, R-10):
object fields sort by name (total and tie-free — duplicate names are inadmissible);
union and tuple order is semantic and untouched; everything else is syntactic.
Soundness/completeness/idempotence are OBLIGATIONS (Obligations.lean).

AMENDED 2026-08-25 (A-1, ratified under Q10): `SchemaCore.address` is a leaf and
canonicalizes to itself.

AMENDED 2026-08-25 (Q11, operator ruling): values get their own structural
canonicalizer `canonV` — `vobj` fields sort by key (R-10 mirrored), array/tuple element
order stays semantic, leaves are fixed. Total on all values; on conforming values it
agrees with the spec's schema-directed ordering, since canonical schemas are already
key-sorted (STORE-MODEL §5, Q11 record). `preimageE` now canonicalizes, extending
unconditional dedup (M12E) to entities.
-/
import E2.Core

namespace E2

/-- Insert an (already canonical) field into a sorted field list, by key. -/
def insertField (key : String) (val : SchemaCore) (opt : Bool) : FieldList → FieldList
  | .nil => .cons key val opt .nil
  | .cons k v o rest =>
      if key < k then
        .cons key val opt (.cons k v o rest)
      else
        .cons k v o (insertField key val opt rest)

mutual
def canonS : SchemaCore → SchemaCore
  | .object fs   => .object (canonFields fs)
  | .tuple es    => .tuple (canonList es)
  | .array e     => .array (canonS e)
  | .union m ms  => .union m (canonList ms)
  | .refine s c  => .refine (canonS s) c
  | .mu d body   => .mu d (canonS body)
  | .prim p      => .prim p
  | .lit v       => .lit v
  | .address     => .address
  | .ref a       => .ref a
  | .var i       => .var i
  termination_by structural x => x

def canonFields : FieldList → FieldList
  | .nil => .nil
  | .cons k v opt rest => insertField k (canonS v) opt (canonFields rest)
  termination_by structural x => x

def canonList : SchemaList → SchemaList
  | .nil => .nil
  | .cons hd tl => .cons (canonS hd) (canonList tl)
  termination_by structural x => x
end

/-- Insert an (already canonical) value field into a sorted field list, by key (Q11). -/
def insertVField (key : String) (val : Value) : ValueFields → ValueFields
  | .nil => .cons key val .nil
  | .cons k v rest =>
      if key < k then
        .cons key val (.cons k v rest)
      else
        .cons k v (insertVField key val rest)

mutual
def canonV : Value → Value
  | .vobj fs  => .vobj (canonVFields fs)
  | .varr vs  => .varr (canonVList vs)
  | .vnull    => .vnull
  | .vbool b  => .vbool b
  | .vint n   => .vint n
  | .vstr s   => .vstr s
  | .vaddr a  => .vaddr a
  termination_by structural x => x

def canonVFields : ValueFields → ValueFields
  | .nil => .nil
  | .cons k v rest => insertVField k (canonV v) (canonVFields rest)
  termination_by structural x => x

def canonVList : ValueList → ValueList
  | .nil => .nil
  | .cons hd tl => .cons (canonV hd) (canonVList tl)
  termination_by structural x => x
end

/-- Adjacent-pair sortedness of a field list, decidably. -/
def fieldsSortedB : FieldList → Bool
  | .nil => true
  | .cons _ _ _ .nil => true
  | .cons k₁ _ _ (.cons k₂ v o rest) =>
      (!decide (k₂ < k₁)) && fieldsSortedB (.cons k₂ v o rest)

end E2
