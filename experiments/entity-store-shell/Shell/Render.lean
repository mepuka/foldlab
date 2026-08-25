/-
Deterministic rendering of the E2 carriers.

The carriers have `DecidableEq`/`BEq` but no `Repr` — by design (the `partial`→opaque
trap). Rendering therefore lives here, on the shell side of the boundary, and never
enters `formal/`. The syntax rendered is exactly the syntax `Shell/Script.lean` parses,
so `resolve` output is re-readable as a fixture; that round-trip is itself a differential
observable.

Determinism (STORE-SHELL §3): these are total pure functions of the carrier. Identical
carriers render to identical bytes, always.
-/
import E2
import Shell.Hex

namespace Shell

open E2

/-! ## String literals -/

private def escapeChar (c : Char) : List Char :=
  if c = '\\' then ['\\', '\\']
  else if c = '"' then ['\\', '"']
  else if c = '\n' then ['\\', 'n']
  else if c = '\t' then ['\\', 't']
  else if c = '\r' then ['\\', 'r']
  else [c]

/-- A double-quoted, escaped string literal. -/
def renderStr (s : String) : String :=
  "\"" ++ String.ofList (s.toList.flatMap escapeChar) ++ "\""

def renderInt (n : Int) : String := toString n

def renderAddr (a : Address) : String := hexOfAddr a

/-! ## Values -/

private def renderPrim : Prim → String
  | .null => "null" | .bool => "bool" | .int => "int" | .str => "str"

private def renderUMode : UMode → String
  | .anyOf => "anyOf" | .oneOf => "oneOf"

mutual
def renderValue : Value → String
  | .vnull    => "null"
  | .vbool b  => if b then "true" else "false"
  | .vint n   => "(i " ++ renderInt n ++ ")"
  | .vstr s   => "(s " ++ renderStr s ++ ")"
  | .varr vs  => "(arr" ++ renderValueList vs ++ ")"
  | .vobj fs  => "(obj" ++ renderValueFields fs ++ ")"
  | .vaddr a  => "(vaddr " ++ renderAddr a ++ ")"
  termination_by structural x => x

def renderValueList : ValueList → String
  | .nil => ""
  | .cons hd tl => " " ++ renderValue hd ++ renderValueList tl
  termination_by structural x => x

def renderValueFields : ValueFields → String
  | .nil => ""
  | .cons k v rest => " (" ++ renderStr k ++ " " ++ renderValue v ++ ")" ++ renderValueFields rest
  termination_by structural x => x
end

/-! ## Checks -/

mutual
def renderCheck : Check → String
  | .filter id payload aborted =>
      "(filter " ++ renderStr id ++ " " ++ renderValue payload ++
        (if aborted then " true" else " false") ++ ")"
  | .filterGroup cs => "(group" ++ renderCheckList cs ++ ")"
  termination_by structural x => x

def renderCheckList : CheckList → String
  | .nil => ""
  | .cons hd tl => " " ++ renderCheck hd ++ renderCheckList tl
  termination_by structural x => x
end

/-! ## Schemas -/

mutual
def renderSchema : SchemaCore → String
  | .prim p       => "(prim " ++ renderPrim p ++ ")"
  | .lit v        => "(lit " ++ renderValue v ++ ")"
  | .object fs    => "(object" ++ renderFieldList fs ++ ")"
  | .tuple es     => "(tuple" ++ renderSchemaList es ++ ")"
  | .array e      => "(array " ++ renderSchema e ++ ")"
  | .union m ms   => "(union " ++ renderUMode m ++ renderSchemaList ms ++ ")"
  | .refine s c   => "(refine " ++ renderSchema s ++ " " ++ renderCheck c ++ ")"
  | .ref a        => "(ref " ++ renderAddr a ++ ")"
  | .var i        => "(var " ++ toString i ++ ")"
  | .mu d b       => "(mu " ++ renderStr d ++ " " ++ renderSchema b ++ ")"
  | .address      => "address"
  | .tupleRest es rest => "(tuple-rest " ++ renderSchema rest ++ renderSchemaList es ++ ")"
  | .record cod   => "(record " ++ renderSchema cod ++ ")"
  termination_by structural x => x

def renderFieldList : FieldList → String
  | .nil => ""
  | .cons k v opt rest =>
      " (f " ++ renderStr k ++ (if opt then " opt " else " req ") ++ renderSchema v ++ ")"
        ++ renderFieldList rest
  termination_by structural x => x

def renderSchemaList : SchemaList → String
  | .nil => ""
  | .cons hd tl => " " ++ renderSchema hd ++ renderSchemaList tl
  termination_by structural x => x
end

/-- An address list, rendered for the `refs` verb: space-separated hex, in list order. -/
def renderAddrList (as : List Address) : String :=
  String.intercalate " " (as.map renderAddr)

end Shell
