/-
Canonicalization v1, per the ratified equivalence table (kickoff §4.3, R-10):
object fields sort by name (total and tie-free — duplicate names are inadmissible);
union and tuple order is semantic and untouched; everything else is syntactic.
Soundness/completeness/idempotence are OBLIGATIONS (Obligations.lean).

AMENDED 2026-08-25 (A-1, ratified under Q10): `SchemaCore.address` is a leaf and
canonicalizes to itself.

AMENDED 2026-08-25 (A-4, ratified under G4): `tupleRest` and `record` canonicalize
componentwise — RECURSE ONLY, no sorting. Tuple element order is semantic (kickoff
§4.3 already exempts `.tuple`, and the rest schema is a single position), and
`record` carries no field list at all, so there is nothing for R-10's key sort to
act on.

AMENDED 2026-08-25 (Q11, operator ruling): values get their own structural
canonicalizer `canonV` — `vobj` fields sort by key (R-10 mirrored), array/tuple element
order stays semantic, leaves are fixed. Total on all values; on conforming values it
agrees with the spec's schema-directed ordering, since canonical schemas are already
key-sorted (STORE-MODEL §5, Q11 record). `preimageE` now canonicalizes, extending
unconditional dedup (M12E) to entities.

AMENDED 2026-08-25 (A-6, ruled under Q13; STORE-MODEL §7): `canonS` RECURSES INTO
`.lit` payloads — `canonS (.lit v) = .lit (canonV v)`. Before A-6 the schema plane
passed literal payloads through while the value plane sorted the same bytes, so one
carrier had two canonical forms and the conformance bridge was unconditionally false
(F-23). The value-plane definitions therefore move ABOVE the schema-plane ones in this
file; `Value` is its own inductive family (Core.lean), so nothing becomes mutual.

AMENDED 2026-08-25 (F-26, ruled W3-10, ships with A-6): `dupFreeS` INSPECTS `.lit`
payloads — `dupFreeS (.lit v) = dupFreeV v`. Without this clause A-6 re-falsifies S1
one plane up: `canonS` at `.lit` would inherit the value plane's duplicate-key
involution while `dupFreeS (.lit _) = true` admitted it, so `ObligationCanonIdempotent`
would be false on schemas its own hypothesis accepts (R1 `A6_refalsifies_S1`, verified
over 15,310 schemas). The clause is exactly what keeps the conditional S1 obligation
true one plane down.
-/
import E2.Core

namespace E2

/-! ## Value plane (Q11). Defined first: A-6 makes the schema canonicalizer call
    `canonV` at `.lit`. -/

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

/-! ## Schema plane. -/

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
  | .tupleRest es rest => .tupleRest (canonList es) (canonS rest)
  | .record cod  => .record (canonS cod)
  | .prim p      => .prim p
  | .lit v       => .lit (canonV v)
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

/-! ## Duplicate-freedom (A-3, 2026-08-25). STORE-MODEL §5 clause 4 demands
    duplicate-free field-name lists; `WFS` implements the clause via `dupFreeS` (landed
    the same day, in the post-seat-wave serialization window). On duplicate keys the
    sort below is an INVOLUTION, not idempotent — kernel-checked falsification of the
    unconditional S1 obligations, recorded in STORE-MODEL §7.

    As with the canonicalizers, the value plane is defined first: F-26 makes `dupFreeS`
    call `dupFreeV` at `.lit`. -/

def vkeyAbsent (key : String) : ValueFields → Bool
  | .nil => true
  | .cons k _ rest => (!(key == k)) && vkeyAbsent key rest

def vfieldsDupFreeB : ValueFields → Bool
  | .nil => true
  | .cons k _ rest => vkeyAbsent k rest && vfieldsDupFreeB rest

mutual
def dupFreeV : Value → Bool
  | .vnull => true
  | .vbool _ => true
  | .vint _ => true
  | .vstr _ => true
  | .vaddr _ => true
  | .vobj fs => vfieldsDupFreeB fs && dupFreeVF fs
  | .varr vs => dupFreeVL vs
  termination_by structural x => x

def dupFreeVF : ValueFields → Bool
  | .nil => true
  | .cons _ v rest => dupFreeV v && dupFreeVF rest
  termination_by structural x => x

def dupFreeVL : ValueList → Bool
  | .nil => true
  | .cons hd tl => dupFreeV hd && dupFreeVL tl
  termination_by structural x => x
end

def keyAbsent (key : String) : FieldList → Bool
  | .nil => true
  | .cons k _ _ rest => (!(key == k)) && keyAbsent key rest

def fieldsDupFreeB : FieldList → Bool
  | .nil => true
  | .cons k _ _ rest => keyAbsent k rest && fieldsDupFreeB rest

mutual
def dupFreeS : SchemaCore → Bool
  | .prim _ => true
  | .lit v => dupFreeV v
  | .address => true
  | .object fs => fieldsDupFreeB fs && dupFreeF fs
  | .tuple es => dupFreeL es
  | .array e => dupFreeS e
  | .union _ ms => dupFreeL ms
  | .refine s _ => dupFreeS s
  | .ref _ => true
  | .var _ => true
  | .mu _ b => dupFreeS b
  | .tupleRest es rest => dupFreeL es && dupFreeS rest
  | .record cod => dupFreeS cod
  termination_by structural x => x

def dupFreeF : FieldList → Bool
  | .nil => true
  | .cons _ v _ rest => dupFreeS v && dupFreeF rest
  termination_by structural x => x

def dupFreeL : SchemaList → Bool
  | .nil => true
  | .cons hd tl => dupFreeS hd && dupFreeL tl
  termination_by structural x => x
end

/-- Adjacent-pair sortedness of a field list, decidably. -/
def fieldsSortedB : FieldList → Bool
  | .nil => true
  | .cons _ _ _ .nil => true
  | .cons k₁ _ _ (.cons k₂ v o rest) =>
      (!decide (k₂ < k₁)) && fieldsSortedB (.cons k₂ v o rest)

end E2
