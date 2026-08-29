import Cas.Backend.Ts
import Cas.Schema.SelfCodec

/-!
# Lowering canonical schema codes to Effect Schema expressions

`Ast → Ts.Expr` over Effect's native `Schema` constructor surface, with
structural sharing against an environment of already-emitted names: a
subterm equal to an earlier named code renders as that name — the
factored form a careful hand would write, derived mechanically.
-/

namespace Cas.Backend

open Cas.Schema Cas.Backend.Ts

/- Structural equality of codes (literals by value). -/
mutual

def astBeq : Ast → Ast → Bool
  | .null, .null | .bool, .bool | .int, .int | .str, .str => true
  | .lit a, .lit b => a == b
  | .arr a, .arr b => astBeq a b
  | .struct fs, .struct gs => fieldsBeq fs gs
  | .ref a, .ref b => a == b
  | .decl i p ps, .decl j q qs => i == j && p == q && paramsBeq ps qs
  | _, _ => false

def fieldsBeq :
    List (String × Bool × Ast) → List (String × Bool × Ast) → Bool
  | [], [] => true
  | (n, o, a) :: fs, (m, p, b) :: gs =>
    n == m && o == p && astBeq a b && fieldsBeq fs gs
  | _, _ => false

def paramsBeq : List Ast → List Ast → Bool
  | [], [] => true
  | a :: as, b :: bs => astBeq a b && paramsBeq as bs
  | _, _ => false

end

instance : BEq Ast := ⟨astBeq⟩

private def schema (name : String) : Expr := .ident ("Schema." ++ name)
private def canonicalSchema (name : String) : Expr :=
  .ident ("CanonicalSchema." ++ name)

def litExpr : LitVal → Expr
  | .null => .jsNull
  | .bool b => .bool b
  | .int i => .int i.val
  | .str s => .str s

mutual

/-- Lower one code node; the name environment is consulted at every
node except the root of the code being emitted. -/
private def constructorGo (env : List (String × Ast)) (atRoot : Bool)
    (a : Ast) : Expr :=
  match (if atRoot then none else env.find? (fun e => astBeq e.2 a)) with
  | some (name, _) => .ident name
  | none =>
    match a with
    | .null => schema "Null"
    | .bool => schema "Boolean"
    | .int => schema "Int"
    | .str => schema "String"
    | .lit .null => schema "Null"
    | .lit v => .call (schema "Literal") [litExpr v]
    | .arr item => .call (schema "Array") [constructorGo env false item]
    | .struct fields =>
      .call (schema "Struct") [.objectML (constructorFields env fields)]
    | .ref tag => .call (canonicalSchema "ref") [.int tag.toNat]
    -- A general declaration lowers to the built-in Effect's own
    -- `toCode` prints for that id — the point of speaking Effect's
    -- declaration ids verbatim (PLAN P3/P4).
    | .decl .date _ _ => schema "Date"
    | .decl .url _ _ => schema "URL"
    | .decl .option _ ps => .call (schema "Option") (constructorParams env ps)

private def constructorFields (env : List (String × Ast)) :
    List (String × Bool × Ast) → List (String × Expr)
  | [] => []
  | (name, opt, code) :: rest =>
    (name,
      if opt then .call (schema "optionalKey") [constructorGo env false code]
      else constructorGo env false code) :: constructorFields env rest

private def constructorParams (env : List (String × Ast)) :
    List Ast → List Expr
  | [] => []
  | code :: rest => constructorGo env false code :: constructorParams env rest

end

/-- Lower a code, replacing any subterm equal to an earlier named code
by its name. The name environment is consulted at every node except
the root of the code being emitted. -/
def constructorExpr (env : List (String × Ast)) : Ast → Expr :=
  constructorGo env (atRoot := true)

end Cas.Backend
