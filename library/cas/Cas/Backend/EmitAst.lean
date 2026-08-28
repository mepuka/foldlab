import Cas.Backend.Ts
import Cas.Schema.SelfCodec

/-!
# Lowering canonical schema codes to constructor expressions

`Ast → Ts.Expr` over the `CanonicalSchema` constructor surface, with
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
  | _, _ => false

def fieldsBeq :
    List (String × Bool × Ast) → List (String × Bool × Ast) → Bool
  | [], [] => true
  | (n, o, a) :: fs, (m, p, b) :: gs =>
    n == m && o == p && astBeq a b && fieldsBeq fs gs
  | _, _ => false

end

instance : BEq Ast := ⟨astBeq⟩

private def cs (name : String) : Expr := .ident ("CanonicalSchema." ++ name)

def litExpr : LitVal → Expr
  | .null => .jsNull
  | .bool b => .bool b
  | .int i => .int i.val
  | .str s => .str s

/-- Lower a code, replacing any subterm equal to an earlier named code
by its name. The name environment is consulted at every node except
the root of the code being emitted. -/
partial def constructorExpr (env : List (String × Ast)) : Ast → Expr :=
  go (atRoot := true)
where
  go (atRoot : Bool) (a : Ast) : Expr :=
    match (if atRoot then none else env.find? (fun e => astBeq e.2 a)) with
    | some (name, _) => .ident name
    | none =>
      match a with
      | .null => cs "nullAst"
      | .bool => cs "booleanAst"
      | .int => cs "integerAst"
      | .str => cs "stringAst"
      | .lit v => .call (cs "literal") [litExpr v]
      | .arr item => .call (cs "array") [go false item]
      | .struct fields =>
        .call (cs "struct")
          [.object (fields.map fun (name, opt, schema) =>
            (name,
              .call (cs (if opt then "optionalField" else "field"))
                [go false schema]))]
      | .ref tag => .call (cs "ref") [.int tag.toNat]

end Cas.Backend
