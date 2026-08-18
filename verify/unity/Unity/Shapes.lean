/-
The shape checker: the machine-verified half of the kernel conformance
corpus.

`Unity/Emit.lean` writes the mini-AST of the kernel sort system as
data, because a compiled emitter carries no environment and cannot ask
what a declaration actually looks like. This module can ask. It reads
the emitted artifact back, and for every record whose truth lives in
the environment rather than in a Lean value it rebuilds the record
from `getConstInfo` and demands the emitted bytes match:

  * every mini-AST row — form, parameters and their brand roles,
    constructor names, field names, field types — against the real
    declaration, rendered through the emitter's own row function so a
    difference is never a difference of formatting;
  * the mini-AST row order against the declaration order in the
    source, so the frozen list cannot be shuffled;
  * the kind and stage tables against the constructor names of
    `DeclKind` and `HoleStage`, in declaration order, with the rank
    equal to the position — the one fact a name table could get wrong
    silently;
  * the refusal rows against the constructor names of
    `RefusalReason`, in declaration order, under the wire spelling
    rule that a camel-cased reason is its hyphenated name;
  * the admission rows against `Kernel.Planted`, so no verdict can be
    reported for a candidate that does not exist.

A checker that cannot fail proves nothing: `must-not-compile/` carries
a planted wrong row that this module must refuse, beside its correct
twin that must elaborate.
-/
import Lean
import Unity.Emit

namespace Unity.Shapes

open Lean Meta Elab Command

/-! ## Reading the environment -/

/-- The last component of a name, which is how the corpus spells
    declarations and constructors. -/
def shortName (name : Name) : String := name.getString!

/-- Render a field's type in the corpus reference grammar: a bare
    short name for an unapplied type, `Head(arg,...)` for an applied
    one. Arguments are rendered the same way, so a digest branded by a
    kind constructor reads `Digest(program)` and a position in a
    neighbouring field's partition reads `Position(partition)`. The
    fuel bounds the nesting; the sort system's field types are shallow
    and the bound is reported rather than silently truncated. -/
def renderRef : Nat -> Expr -> MetaM String
  | 0, _ => throwError "shape check: a field type nests deeper than the checker reads"
  | fuel + 1, expression => do
      let arguments := expression.getAppArgs
      let head <-
        match expression.getAppFn with
        | .const name _ => pure (shortName name)
        | .fvar identifier => pure (toString (<- identifier.getUserName))
        | .sort _ => pure "Type"
        | other =>
            throwError "shape check: a field type is not a constant application: {other}"
      if arguments.isEmpty then
        return head
      else
        let rendered <- arguments.toList.mapM (renderRef fuel)
        return head ++ "(" ++ String.intercalate "," rendered ++ ")"

/-- The environment's own account of one kernel type's shape. -/
def shapeOfConstant (short : String) : MetaM Emit.TypeShape := do
  let name := `Kernel ++ Name.mkSimple short
  let info <- getConstInfoInduct name
  let environment <- getEnv
  let form :=
    if isStructure environment name then Emit.ShapeForm.structureForm
    else Emit.ShapeForm.inductiveForm
  let params <- forallTelescopeReducing info.type fun binders _ => do
    (binders.toList.take info.numParams).mapM fun binder => do
      let declaration <- binder.fvarId!.getDecl
      let role :=
        if (<- whnf (<- inferType binder)).isSort then Emit.ShapeRole.typeArgument
        else Emit.ShapeRole.brand
      return ({ name := toString declaration.userName, role := role } : Emit.ShapeParam)
  let ctors <- info.ctors.mapM fun ctorName => do
    let ctorInfo <- getConstInfoCtor ctorName
    forallTelescopeReducing ctorInfo.type fun binders _ => do
      let fields <- (binders.toList.drop info.numParams).mapM fun binder => do
        let declaration <- binder.fvarId!.getDecl
        let ref <- renderRef 8 (<- inferType binder)
        return ({ name := toString declaration.userName, ref := ref } : Emit.ShapeField)
      return ({ name := shortName ctorName, fields := fields } : Emit.ShapeCtor)
  return { name := short, form := form, params := params, ctors := ctors }

/-- The constructor short names of a kernel type, in declaration
    order. -/
def ctorNames (short : String) : MetaM (List String) := do
  let info <- getConstInfoInduct (`Kernel ++ Name.mkSimple short)
  return info.ctors.map shortName

/-- The source line a kernel type is declared on. -/
def declarationLine (short : String) : MetaM Nat := do
  let name := `Kernel ++ Name.mkSimple short
  match <- findDeclarationRanges? name with
  | some ranges => return ranges.range.pos.line
  | none => throwError "shape check: {name} has no declaration position"

/-! ## Reading the artifact -/

/-- The opening bytes of a record with the given tag. -/
def rowPrefix (tag : String) : String :=
  "{" ++ Emit.jsonString "record" ++ ":" ++ Emit.jsonString tag ++ ","

/-- The opening bytes of a record whose second key is the given one,
    up to the start of its string value. -/
def keyPrefix (tag key : String) : String :=
  rowPrefix tag ++ Emit.jsonString key ++ ":\""

/-- The string value that follows an opening, up to the closing
    quote. -/
def valueAfter (opening line : String) : Option String :=
  if line.startsWith opening then
    match (line.drop opening.length).toString.splitOn "\"" with
    | value :: _ => some value
    | [] => none
  else none

/-- The rows of the document carrying one record tag. -/
def rowsTagged (tag : String) (lines : List String) : List String :=
  lines.filter fun line => line.startsWith (rowPrefix tag)

/-- The wire spelling rule: a camel-cased constructor name is its
    hyphenated lowercase name. -/
def hyphenated (camel : String) : String :=
  String.join (camel.toList.map fun character =>
    if character.isUpper then "-" ++ String.singleton character.toLower
    else String.singleton character)

/-- Report a list mismatch with both sides in full. -/
def refuseList (what : String) (emitted expected : List String) : MetaM Unit :=
  throwError "shape check: {what} disagrees with the environment\n  emitted:     {emitted}\n  environment: {expected}"

/-! ## The checks -/

/-- One mini-AST row against the declaration it claims to describe. -/
def checkTypeRow (line : String) : MetaM Unit := do
  match valueAfter (keyPrefix "type" "name") line with
  | none => throwError "shape check: not a mini-AST row: {line}"
  | some short =>
      let expected := Emit.typeRow (<- shapeOfConstant short)
      if line != expected then
        throwError "shape check: mini-AST row disagrees with the environment\n  type: {short}\n  emitted:     {line}\n  environment: {expected}"

/-- The mini-AST rows must follow the declaration order of the source
    they describe. -/
def checkTypeOrder (names : List String) : MetaM Unit := do
  let lines <- names.mapM declarationLine
  let ordered := (lines.zip (lines.drop 1)).all fun pair => pair.1 < pair.2
  unless ordered do
    throwError "shape check: the mini-AST rows are not in declaration order\n  rows:  {names}\n  lines: {lines}"

/-- A rank table against the constructors it names: same names, same
    order, rank equal to position. -/
def checkRankTable (what : String) (typeName : String)
    (row : String -> Nat -> String) (emitted : List String) : MetaM Unit := do
  let expected := (<- ctorNames typeName).mapIdx fun rank name => row name rank
  if emitted != expected then
    refuseList what emitted expected

/-- The refusal rows against the reason constructors: same order, wire
    spelling by the hyphenation rule. -/
def checkRefusalRows (emitted : List String) : MetaM Unit := do
  let reasons := (<- ctorNames "RefusalReason").map hyphenated
  let spelled := emitted.filterMap (valueAfter (keyPrefix "refusal" "reason"))
  if spelled != reasons then
    refuseList "the taught refusal table" spelled reasons

/-- Every admission row names a candidate that exists. -/
def checkAdmissionRows (emitted : List String) : MetaM Unit := do
  let environment <- getEnv
  for line in emitted do
    match valueAfter (keyPrefix "admission" "name") line with
    | none => throwError "shape check: not an admission row: {line}"
    | some candidate =>
        let name := `Kernel.Planted ++ Name.mkSimple candidate
        unless environment.contains name do
          throwError "shape check: the admission row names {name}, which is not declared"

/-- The whole artifact, checked against the environment. -/
def checkDocument (path : String) : MetaM Unit := do
  let text <- IO.FS.readFile path
  let lines := (text.splitOn "\n").filter fun line => line != ""
  match lines with
  | [] => throwError "shape check: {path} is empty"
  | first :: _ =>
      unless first.startsWith (rowPrefix "header") do
        throwError "shape check: {path} does not open with a header record"
  checkRankTable "the declaration kind table" "DeclKind" Emit.kindRow
    (rowsTagged "kind" lines)
  checkRankTable "the hole stage table" "HoleStage" Emit.stageRow
    (rowsTagged "stage" lines)
  checkRefusalRows (rowsTagged "refusal" lines)
  let typeRows := rowsTagged "type" lines
  for line in typeRows do
    checkTypeRow line
  checkTypeOrder (typeRows.filterMap (valueAfter (keyPrefix "type" "name")))
  checkAdmissionRows (rowsTagged "admission" lines)
  logInfo s!"shape check: {typeRows.length} mini-AST rows, the kind, stage and refusal tables, and {(rowsTagged "admission" lines).length} admission rows agree with the environment"

/-! ## The commands -/

/-- Check a whole emitted artifact against the environment. -/
elab "#kernelConformance" path:str : command =>
  liftTermElabM (checkDocument path.getString)

/-- Check one mini-AST row. The control arm plants a wrong row here;
    its witness twin plants the right one. -/
elab "#kernelTypeRow" row:str : command =>
  liftTermElabM (checkTypeRow row.getString)

end Unity.Shapes
