/-
The language-neutral projection AST.

Lean's `Expr` stays behind `Projections.Walk`: it is an elaborator data
structure, not an interchange. This file carries only the declaration shape
that a target printer needs. In particular, `TypeExpr.sort` deliberately
forgets universe levels. A projection may care that a parameter is a type,
but it must not inherit Lean's internal universe representation.
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

/-- One named binder, used for declaration parameters and constructor fields. -/
structure Field where
  name : String
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

def TypeExpr.render : TypeExpr -> String
  | .named name => name
  | .variable name => name
  | .bound index => s!"_{index}"
  | .application function arguments =>
      TypeExpr.render function ++ "(" ++
        String.intercalate ", " (arguments.map TypeExpr.render) ++ ")"
  | .arrow domain codomain =>
      "(" ++ TypeExpr.render domain ++ " -> " ++ TypeExpr.render codomain ++ ")"
  | .sort => "Type"
  | .literal value => value

def Field.render (field : Field) : String :=
  field.name ++ " : " ++ field.typeExpr.render

def Constructor.render (constructor : Constructor) : String :=
  if constructor.fields.isEmpty then
    constructor.name
  else
    constructor.name ++ "(" ++
      String.intercalate ", " (constructor.fields.map Field.render) ++ ")"

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

/-- The algebraic register for a declaration, derived from its one AST row. -/
def Decl.algebraic : Decl -> String
  | .inductiveDecl name parameters constructors =>
      let parameterText :=
        if parameters.isEmpty then ""
        else "(" ++ String.intercalate ", " (parameters.map Field.render) ++ ")"
      name ++ parameterText ++ " ::= " ++
        String.intercalate " | " (constructors.map Constructor.render)
  | .structureDecl name parameters constructor =>
      let parameterText :=
        if parameters.isEmpty then ""
        else "(" ++ String.intercalate ", " (parameters.map Field.render) ++ ")"
      name ++ parameterText ++ " ::= { " ++
        String.intercalate ", " (constructor.fields.map Field.render) ++ " }"

end Projections
