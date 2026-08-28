import Cas.Schema.Foreign

/-!
# The TypeScript fragment, L2 — and the printer, L3

The closed expression/declaration fragment the backend emits, grown
only with a real consumer (EFFECTS-BACKEND R6). First consumer: the
generated canonical-schema mirrors (slice 1) — module header, star
imports, doc-commented exported consts, and the expression forms
constructor calls need.

Rendering is fixed-layout under a `Style` value (the ratified
Substance/Denotation/Style split): no width-adaptive grouping, ever —
stable bytes and stable diffs are the point. `house0` transcribes the
effects package's existing look; it is the first inhabitant, not a
default to drift from.
-/

namespace Cas.Backend.Ts

/-- Declared, digestable aesthetic values. Fixed layout; these are the
knobs the house look actually uses. -/
structure Style where
  indent : Nat := 2
  quote : Char := '"'

/-- The effects package's look, transcribed. -/
def house0 : Style := {}

/-- Expressions: exactly what constructor-call emission needs. -/
inductive Expr where
  /-- A (possibly dotted) reference: `CanonicalSchema.struct`, `refAst`. -/
  | ident (name : String)
  | str (value : String)
  | int (value : Int)
  | bool (value : Bool)
  | jsNull
  | call (fn : Expr) (args : List Expr)
  | object (fields : List (String × Expr))
  deriving Inhabited

/-- One exported `const` with its doc comment. -/
structure ConstDecl where
  doc : List String
  name : String
  value : Expr

/-- A star import: `import * as name from "path"`. -/
structure ImportAll where
  name : String
  path : String

/-- A generated module: header doc block, imports, declarations. -/
structure Module where
  header : List String
  imports : List ImportAll
  decls : List ConstDecl

namespace Render

def indentOf (style : Style) (depth : Nat) : String :=
  String.ofList (List.replicate (style.indent * depth) ' ')

def quoted (style : Style) (s : String) : String :=
  String.singleton style.quote ++ s ++ String.singleton style.quote

mutual

/-- Inline expression rendering — everything on one line except an
object in call-argument position, which breaks (the house look for
constructor calls). -/
def expr (style : Style) (depth : Nat) : Expr → String
  | .ident name => name
  | .str value => quoted style value
  | .int value => toString value
  | .bool value => if value then "true" else "false"
  | .jsNull => "null"
  | .call fn args => expr style depth fn ++ "(" ++
      String.intercalate ", " (exprs style depth args) ++ ")"
  | .object fields =>
    if fields.isEmpty then "{}"
    else
      "{\n" ++
        String.intercalate "\n"
          (objectFields style (depth + 1) fields) ++
        "\n" ++ indentOf style depth ++ "}"

def exprs (style : Style) (depth : Nat) : List Expr → List String
  | [] => []
  | e :: rest => expr style depth e :: exprs style depth rest

def objectFields (style : Style) (depth : Nat) :
    List (String × Expr) → List String
  | [] => []
  | (name, value) :: rest =>
    (indentOf style depth ++ name ++ ": " ++ expr style depth value ++ ",") ::
      objectFields style depth rest

end

def docBlock (lines : List String) : String :=
  match lines with
  | [] => ""
  | [one] => "/** " ++ one ++ " */\n"
  | first :: rest =>
    "/** " ++ first ++ "\n" ++
      String.intercalate "\n" (rest.map (" * " ++ ·)) ++ " */\n"

def constDecl (style : Style) (d : ConstDecl) : String :=
  docBlock d.doc ++ "export const " ++ d.name ++ " = " ++
    expr style 0 d.value ++ "\n"

def importAll (style : Style) (i : ImportAll) : String :=
  "import * as " ++ i.name ++ " from " ++ quoted style i.path ++ "\n"

/-- The whole module, house layout: header block, imports, one blank
line between declarations. -/
def module (style : Style) (m : Module) : String :=
  "/**\n" ++ String.intercalate "\n" (m.header.map (" * " ++ ·)) ++
    "\n */\n" ++
    String.join (m.imports.map (importAll style)) ++ "\n" ++
    String.intercalate "\n" (m.decls.map (constDecl style))

end Render

end Cas.Backend.Ts
