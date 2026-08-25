/-
Canonicalization v1, per the ratified equivalence table (kickoff §4.3, R-10):
object fields sort by name (total and tie-free — duplicate names are inadmissible);
union and tuple order is semantic and untouched; everything else is syntactic.
Soundness/completeness/idempotence are OBLIGATIONS (Obligations.lean).

AMENDED 2026-08-25 (A-1, ratified under Q10): `SchemaCore.address` is a leaf and
canonicalizes to itself. Values remain outside schema canonicalization.
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

/-- Adjacent-pair sortedness of a field list, decidably. -/
def fieldsSortedB : FieldList → Bool
  | .nil => true
  | .cons _ _ _ .nil => true
  | .cons k₁ _ _ (.cons k₂ v o rest) =>
      (!decide (k₂ < k₁)) && fieldsSortedB (.cons k₂ v o rest)

end E2
