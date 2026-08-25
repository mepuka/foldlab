/-
E2 scratch lab — staged, pre-grade. Carrier per entity-store-kickoff.md §5/§11/§12,
rulings R-10/R-11/R-12 ratified 2026-08-25. Statements only where marked; nothing frozen.

Shape: mutual-monomorphic per the metaprogramming survey §4 (deriving DecidableEq works,
`induction` works). No derived Repr/Ord/ToJson/FromJson/ToExpr anywhere (partial→opaque
trap). BEq recovered from DecidableEq in one line.
-/

namespace E2

/-- 64-byte digest placeholder. The length invariant is an obligation, not yet a field. -/
structure Address where
  bytes : List UInt8
deriving DecidableEq

inductive Prim
  | null | bool | int | str
deriving DecidableEq

/-- Union decode mode — census: `SchemaAST.ts:2916`; order is semantic under `anyOf`. -/
inductive UMode
  | anyOf | oneOf
deriving DecidableEq

/- v1 value universe (kickoff §4.5): no float, no undefined, no identity.
    R-11: integer literals only; bigint folds into `Int` here (unbounded). -/
mutual
inductive Value
  | vnull
  | vbool (b : Bool)
  | vint  (n : Int)
  | vstr  (s : String)
  | varr  (vs : ValueList)
  | vobj  (fs : ValueFields)
inductive ValueList
  | nil
  | cons (hd : Value) (tl : ValueList)
inductive ValueFields
  | nil
  | cons (key : String) (val : Value) (rest : ValueFields)
end

deriving instance DecidableEq for Value, ValueList, ValueFields

/- Checks per census §2b / kickoff §11 change 1: the serializable identity is
    `{id, payload}` (the library's own `representation` annotation shape); the closure
    never enters the carrier. Admission restricts `id` to a pinned allowlist (R-4, open). -/
mutual
inductive Check
  | filter (id : String) (payload : Value) (aborted : Bool)
  | filterGroup (checks : CheckList)
inductive CheckList
  | nil
  | cons (hd : Check) (tl : CheckList)
end

deriving instance DecidableEq for Check, CheckList

/- The carrier. v1 working set per kickoff §5 as corrected by §11; the exact admitted
    enumeration freezes at grilling (R-2). `encoding`/`encodingChecks`/`constructorDefault`
    are rejected at admission and so have no constructors here (§11 change 2).
    `mu` carries the mandatory discriminator (§4.2); checks on `mu` are inadmissible
    (mirrors `SchemaAST.ts:3155-3157`) — an admission rule, not a type-level exclusion. -/
mutual
inductive SchemaCore
  | prim   (p : Prim)
  | lit    (v : Value)
  | object (fields : FieldList)
  | tuple  (elems : SchemaList)
  | array  (elem : SchemaCore)
  | union  (mode : UMode) (members : SchemaList)
  | refine (s : SchemaCore) (c : Check)
  | ref    (a : Address)
  | var    (i : Nat)
  | mu     (discriminator : String) (body : SchemaCore)
inductive FieldList
  | nil
  | cons (key : String) (val : SchemaCore) (optional : Bool) (rest : FieldList)
inductive SchemaList
  | nil
  | cons (hd : SchemaCore) (tl : SchemaList)
end

deriving instance DecidableEq for SchemaCore, FieldList, SchemaList

instance : BEq Value      := instBEqOfDecidableEq
instance : BEq SchemaCore := instBEqOfDecidableEq
instance : BEq FieldList  := instBEqOfDecidableEq
instance : BEq SchemaList := instBEqOfDecidableEq

end E2
