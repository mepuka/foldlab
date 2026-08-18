/-
The one metaprogramming site in the projections package.

The committed manifest chooses WHICH declarations are carried. Everything the
AST says ABOUT those declarations is rebuilt from the live Lean environment.
-/
import Lean
import Projections.Ast

namespace Projections

open Lean Meta

private def localName (identifier : FVarId) : MetaM String := do
  return toString (<- identifier.getUserName)

/-- Translate Lean's internal expression into the closed, universe-free type AST. -/
private def typeExprOf : Nat -> Expr -> MetaM TypeExpr
  | 0, _ => throwError "projections walk: a type expression exceeds the depth bound"
  | fuel + 1, expression => do
      match expression with
      | .const name _ => return .named name.toString
      | .fvar identifier => return .variable (<- localName identifier)
      | .bvar index => return .bound index
      | .sort _ => return .sort
      | .lit (.natVal value) => return .literal (toString value)
      | .lit (.strVal value) => return .literal (repr value).pretty
      | .app .. =>
          let function <- typeExprOf fuel expression.getAppFn
          let arguments <- expression.getAppArgs.toList.mapM (typeExprOf fuel)
          return .application function arguments
      | .forallE _ domain codomain _ =>
          return .arrow (<- typeExprOf fuel domain) (<- typeExprOf fuel codomain)
      | .mdata _ body => typeExprOf fuel body
      | other =>
          throwError "projections walk: unsupported type expression: {other}"

private def fieldOf (binder : Expr) : MetaM Field := do
  let declaration <- binder.fvarId!.getDecl
  return {
    name := toString declaration.userName
    typeExpr := <- typeExprOf 32 (<- inferType binder)
  }

private def constructorOf (numParams : Nat) (name : Name) : MetaM Constructor := do
  let info <- getConstInfoCtor name
  forallTelescopeReducing info.type fun binders _ => do
    let fields <- (binders.toList.drop numParams).mapM fieldOf
    return { name := name.toString, fields := fields }

/-- Read one inductive or structure declaration through `ConstantInfo.inductInfo`. -/
private def declarationOf (name : Name) : MetaM Decl := do
  let constant <- getConstInfo name
  let info <-
    match constant with
    | .inductInfo info => pure info
    | _ => throwError "projections walk: {name} is not an inductive declaration"
  let parameters <- forallTelescopeReducing info.type fun binders _ =>
    (binders.toList.take info.numParams).mapM fieldOf
  let constructors <- info.ctors.mapM (constructorOf info.numParams)
  if isStructure (<- getEnv) name then
    match constructors with
    | [constructor] => return .structureDecl name.toString parameters constructor
    | _ => throwError "projections walk: structure {name} does not have exactly one constructor"
  else
    return .inductiveDecl name.toString parameters constructors

private def docOf (decl : Decl) (name : Name) : MetaM DocSentence := do
  match <- findDocString? (<- getEnv) name with
  | none => throwError "projections walk: {name} has no docstring"
  | some plain =>
      return {
        target := name.toString
        plain := plain.trimAscii.toString
        algebraic := decl.algebraic
      }

/-- Walk a closed declaration list into the reusable projection AST. -/
def walk (names : List Name) : MetaM ProjectionAst := do
  if names.isEmpty then
    throwError "projections walk: the manifest is empty"
  for name in names do
    if (names.filter fun other => other == name).length != 1 then
      throwError "projections walk: the manifest names {name} more than once"
  let declarations <- names.mapM declarationOf
  let docs <- (names.zip declarations).mapM fun entry => docOf entry.2 entry.1
  return { declarations := declarations, docs := docs, refusals := [] }

end Projections
