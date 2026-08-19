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

/--
Read one binder, role included. The role is the environment's answer, never an
annotation: a binder whose type reduces to a sort stands for a type, and every
other binder stands for a value — which in parameter position is the brand the
declaration is indexed by.
-/
private def fieldOf (binder : Expr) : MetaM Field := do
  let declaration <- binder.fvarId!.getDecl
  let binderType <- inferType binder
  let role :=
    if (<- whnf binderType).isSort then FieldRole.typeArgument else FieldRole.brand
  return {
    name := toString declaration.userName
    role := role
    typeExpr := <- typeExprOf 32 binderType
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

/--
Read one docstring. The text is transliterated into the interchange's ASCII
and is otherwise VERBATIM: never reflowed, retrimmed, or retyped. The edge
whitespace the environment hands over is meaning to a target printer — the
generated schema layer joins a derived sentence onto the docstring and
branches on whether the docstring already ended in a space — so a walk that
trims here would make that branch unreachable and the target's bytes wrong.
-/
private def docOf (decl : Decl) (name : Name) : MetaM DocSentence := do
  match <- findDocString? (<- getEnv) name with
  | none => throwError "projections walk: {name} has no docstring"
  | some raw =>
      match asciiDoc raw with
      | .error reason => throwError "projections walk: {name}: {reason}"
      | .ok plain =>
          return {
            target := name.toString
            plain := plain
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

/-- The universe level of a declaration type's final sort, walking through any
    leading binders. `Prop` is sort level zero; a data type is a positive sort. -/
private def declSortLevel : Expr -> MetaM (Option Level)
  | .forallE _ _ body _ => declSortLevel body
  | .sort level => return some level
  | _ => return none

/-- Whether the compiled environment holds a projectable declaration under the
    given name: an inductive or structure of sort `Type` (not a `Prop` proof
    predicate) carrying a docstring. This is the bar the manifest's own entries
    meet, so an eligible-in-namespace declaration the manifest omits is an
    orphan the gate must surface rather than a silence to accept.

    `isType`/`isProp` treat a `Prop`-codomain under binders as a type, so this
    reads the final sort's level directly: level zero is a proof predicate and
    has no row in a data-type register; a positive sort is vocabulary. -/
private def eligibleDecl (name : Name) : MetaM Bool := do
  let env <- getEnv
  match env.constants.find? name with
  | none => return false
  | some (.inductInfo info) => do
      match <- findDocString? env name with
      | none => return false
      | some _ => do
          let sortLevel <- declSortLevel info.type
          return (sortLevel.isSome && sortLevel.get! != Level.zero)
  | some _ => return false

/-- List declarations the compiled environment holds under `scope` that
    meet the projectable bar but are absent from the closed manifest. The
    names come from the environment's own constant table, so a declaration
    the kernel adds and the manifest misses shows up here by construction;
    the result is sorted by rendered name so the committed artifact cannot
    move under map reordering. -/
def orphanNames (scope : Name) (manifest : List Name) : MetaM (List String) := do
  let env <- getEnv
  -- env.constants is staged (map1 imported, map2 current); SMap.toList folds both.
  -- The namespace ring is a pure filter so the meta monad is entered only for names
  -- already inside the manifest's namespace; the full imported map is walked once.
  let ring := env.constants.toList.filterMap (fun (name, _) =>
    if scope.isPrefixOf name && name != scope && !manifest.contains name then
      some name
    else
      none)
  let orphans <- ring.eraseDups.filterM eligibleDecl
  return (orphans.map (fun name => name.toString)).mergeSort (fun a b => a < b)

end Projections
