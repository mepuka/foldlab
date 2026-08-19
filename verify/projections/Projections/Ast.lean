/-
The language-neutral projection AST.

Lean's `Expr` stays behind `Projections.Walk`: it is an elaborator data
structure, not an interchange. This file carries only the declaration shape
that a target printer needs. In particular, `TypeExpr.sort` deliberately
forgets universe levels. A projection may care that a parameter is a type,
but it must not inherit Lean's internal universe representation.

Three rules a target printer must not re-invent are stated here, once, beside
the data they act on: the binder role (`brand` or `type`), the name-erasure
rule of the reference grammar, and the ASCII alphabet a docstring is carried
in. Each mirrors a rule an existing generator already applies, so a printer
built on this AST reaches the same bytes instead of a near miss.
-/
import Lean

namespace Projections

open Lean

/-- A universe-free type expression in the projection interchange. -/
inductive TypeExpr where
  | named (name : String)
  | variable (name : String)
  | bound (index : Nat)
  | application (function : TypeExpr) (arguments : List TypeExpr)
  | arrow (domain codomain : TypeExpr)
  | sort
  | literal (value : String)
deriving Repr, BEq, ToJson

/--
Whether a binder stands for a type or for a value the declaration is indexed
by. A value binder in parameter position is a BRAND: it is what makes a
cross-space comparison fail to elaborate rather than fail at runtime, and it
is what selects the branded aliases a target emits.
-/
inductive FieldRole where
  | brand
  | typeArgument
deriving Repr, BEq, ToJson

/-- The wire spelling of a binder role, at parity with `Unity.Shape.ShapeRole.wire`. -/
def FieldRole.wire : FieldRole -> String
  | .brand => "brand"
  | .typeArgument => "type"

/-- One named binder, used for declaration parameters and constructor fields. -/
structure Field where
  name : String
  role : FieldRole
  typeExpr : TypeExpr
deriving Repr, BEq, ToJson

/-- One constructor and its non-parameter fields, in declaration order. -/
structure Constructor where
  name : String
  fields : List Field
deriving Repr, BEq, ToJson

/-- An inductive declaration or a one-constructor structure declaration. -/
inductive Decl where
  | inductiveDecl
      (name : String) (parameters : List Field) (constructors : List Constructor)
  | structureDecl
      (name : String) (parameters : List Field) (constructor : Constructor)
deriving Repr, BEq, ToJson

/-- A KM-18 documentation statement: both concretizations travel together. -/
structure DocSentence where
  target : String
  plain : String
  algebraic : String
deriving Repr, BEq, ToJson

/-- A taught refusal row, ready for model-specific producers to populate. -/
structure RefusalRow where
  reason : String
  law : String
  repair : String
  applicability : Option String
  plain : String
  algebraic : String
deriving Repr, BEq, ToJson

/-- The reusable interchange consumed by every projection printer. -/
structure ProjectionAst where
  declarations : List Decl
  docs : List DocSentence
  refusals : List RefusalRow
deriving Repr, BEq, ToJson

/-! ## The name-erasure rule

The reference grammar a target consumes writes a type by its last name
component: a digest branded by a kind constructor reads `Digest(policy)`, not
`Kernel.Digest(Kernel.DeclKind.policy)`. Erasure is lossy, so the AST keeps
the qualified name and the rule is applied at rendering time by whichever
printer speaks that grammar.
-/

/-- The last dotted component of a qualified name. -/
def eraseName (name : String) : String :=
  (name.splitOn ".").getLastD name

/-- Erase every constant head in a type expression to its last name component. -/
def TypeExpr.erase : TypeExpr -> TypeExpr
  | .named name => .named (eraseName name)
  | .variable name => .variable name
  | .bound index => .bound index
  | .application function arguments =>
      .application function.erase (arguments.map TypeExpr.erase)
  | .arrow domain codomain => .arrow domain.erase codomain.erase
  | .sort => .sort
  | .literal value => .literal value

/-! ## The ASCII rule for prose

The interchange is ASCII by rule and the kernel's prose is not: its docstrings
use the typographic em dash. The transliteration happens at one named table,
and a code point the table does not name is REPORTED with its number rather
than mangled — a future docstring reaching for a non-breaking space reddens
the walk instead of emitting a silent replacement.
-/

/-- The named transliterations from the model's prose into ASCII. -/
def transliterations : List (Nat × String) :=
  [ (0x2014, "--") ]

/-- Transliterate one character, or report it. -/
def asciiChar (character : Char) : Except String String :=
  let point := character.toNat
  if point == 0x0a || (point >= 0x20 && point <= 0x7e) then
    .ok (String.singleton character)
  else
    match transliterations.find? (fun entry => entry.1 == point) with
    | some entry => .ok entry.2
    | none =>
        .error s!"a docstring carries code point {point}, which has no ASCII transliteration"

/-- Transliterate a docstring into ASCII, or report the first character that
    has no entry. -/
def asciiDoc (text : String) : Except String String :=
  text.toList.foldl
    (fun accumulated character =>
      match accumulated, asciiChar character with
      | .error reason, _ => .error reason
      | _, .error reason => .error reason
      | .ok prefixText, .ok piece => .ok (prefixText ++ piece))
    (.ok "")

/-! ## Rendering the algebraic register

`TypeExpr.erase` followed by `TypeExpr.render` is the reference grammar
character for character: `Head(arg,arg)` with no space after the separator,
`Type` for a sort. The list separators OUTSIDE a type — between a
declaration's parameters, and between a constructor's fields — belong to the
prose page's own layout and are written `, `.
-/

def TypeExpr.render : TypeExpr -> String
  | .named name => name
  | .variable name => name
  | .bound index => s!"_{index}"
  | .application function arguments =>
      TypeExpr.render function ++ "(" ++
        String.intercalate "," (arguments.map TypeExpr.render) ++ ")"
  | .arrow domain codomain =>
      "(" ++ TypeExpr.render domain ++ " -> " ++ TypeExpr.render codomain ++ ")"
  | .sort => "Type"
  | .literal value => value

/-- One binder in the reference grammar: its name and its erased type. -/
def Field.reference (field : Field) : String :=
  field.name ++ " : " ++ field.typeExpr.erase.render

/-- One parameter in the reference grammar, carrying the role that decides
    whether a target brands it. -/
def Field.parameter (field : Field) : String :=
  field.role.wire ++ " " ++ field.reference

def Constructor.render (constructor : Constructor) : String :=
  if constructor.fields.isEmpty then
    constructor.name
  else
    constructor.name ++ "(" ++
      String.intercalate ", " (constructor.fields.map Field.reference) ++ ")"

def Decl.name : Decl -> String
  | .inductiveDecl name _ _ => name
  | .structureDecl name _ _ => name

def Decl.parameters : Decl -> List Field
  | .inductiveDecl _ parameters _ => parameters
  | .structureDecl _ parameters _ => parameters

def Decl.constructors : Decl -> List Constructor
  | .inductiveDecl _ _ constructors => constructors
  | .structureDecl _ _ constructor => [constructor]

def Decl.form : Decl -> String
  | .inductiveDecl .. => "inductive"
  | .structureDecl .. => "structure"

private def parameterText (parameters : List Field) : String :=
  if parameters.isEmpty then ""
  else "(" ++ String.intercalate ", " (parameters.map Field.parameter) ++ ")"

/-- The algebraic register for a declaration, derived from its one AST row. -/
def Decl.algebraic : Decl -> String
  | .inductiveDecl name parameters constructors =>
      name ++ parameterText parameters ++ " ::= " ++
        String.intercalate " | " (constructors.map Constructor.render)
  | .structureDecl name parameters constructor =>
      name ++ parameterText parameters ++ " ::= { " ++
        String.intercalate ", " (constructor.fields.map Field.reference) ++ " }"

end Projections
