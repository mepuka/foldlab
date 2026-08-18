/-
Deriving the interchange from the Lean environment.

Two record groups of the kernel conformance corpus state facts that
live in declarations rather than in values: the mini-AST of the sort
system, and the docstring of each type in the closed list. Format 1
carried them as a hand-written table checked against the environment
afterwards. Format 2 does not carry them at all — this module asks the
environment what the declarations are, at elaboration time, and mints
the rows from the answer. The manifest of names stays data, because
which types the interchange carries is a decision; the shapes and the
prose are not decisions, so they are read.

The consequence is the point of the exercise: there is no second copy
to drift. A renamed field, a reordered constructor, a re-worded
docstring moves the emitted bytes on the next build, and the committed
corpus stops being a fresh regeneration until it is regenerated.

Nothing here writes to either model. `getConstInfo` and
`findDocString?` are reads; the manifest command mints definitions
inside the package that invokes it.
-/
import Lean
import Kernel.Definitions
import Unity.Shape

namespace Unity.Reflect

open Lean Meta Elab Command

/-! ## Reading a declaration -/

/-- The last component of a name, which is how the corpus spells
    declarations and constructors. -/
def shortName (name : Name) : String := name.getString!

/-- The full name of a kernel declaration from its corpus spelling. -/
def kernelName (short : String) : Name := `Kernel ++ Name.mkSimple short

/-- Render a field's type in the corpus reference grammar: a bare short
    name for an unapplied type, `Head(arg,...)` for an applied one.
    Arguments render the same way, so a digest branded by a kind
    constructor reads `Digest(program)` and a position in a
    neighbouring field's partition reads `Position(partition)`. The
    fuel bounds the nesting; the sort system's field types are shallow
    and the bound is reported rather than silently truncated. -/
def renderRef : Nat -> Expr -> MetaM String
  | 0, _ => throwError "reflect: a field type nests deeper than the reader reads"
  | fuel + 1, expression => do
      let arguments := expression.getAppArgs
      let head <-
        match expression.getAppFn with
        | .const name _ => pure (shortName name)
        | .fvar identifier => pure (toString (<- identifier.getUserName))
        | .sort _ => pure "Type"
        | other =>
            throwError "reflect: a field type is not a constant application: {other}"
      if arguments.isEmpty then
        return head
      else
        let rendered <- arguments.toList.mapM (renderRef fuel)
        return head ++ "(" ++ String.intercalate "," rendered ++ ")"

/-- The environment's own account of one kernel type's shape. -/
def shapeOf (short : String) : MetaM Shape.TypeShape := do
  let name := kernelName short
  let info <- getConstInfoInduct name
  let environment <- getEnv
  let form :=
    if isStructure environment name then Shape.ShapeForm.structureForm
    else Shape.ShapeForm.inductiveForm
  let params <- forallTelescopeReducing info.type fun binders _ => do
    (binders.toList.take info.numParams).mapM fun binder => do
      let declaration <- binder.fvarId!.getDecl
      let role :=
        if (<- whnf (<- inferType binder)).isSort then Shape.ShapeRole.typeArgument
        else Shape.ShapeRole.brand
      return ({ name := toString declaration.userName, role := role } : Shape.ShapeParam)
  let ctors <- info.ctors.mapM fun ctorName => do
    let ctorInfo <- getConstInfoCtor ctorName
    forallTelescopeReducing ctorInfo.type fun binders _ => do
      let fields <- (binders.toList.drop info.numParams).mapM fun binder => do
        let declaration <- binder.fvarId!.getDecl
        let ref <- renderRef 8 (<- inferType binder)
        return ({ name := toString declaration.userName, ref := ref } : Shape.ShapeField)
      return ({ name := shortName ctorName, fields := fields } : Shape.ShapeCtor)
  return { name := short, form := form, params := params, ctors := ctors }

/-- The constructor short names of a kernel type, in declaration
    order. -/
def ctorNames (short : String) : MetaM (List String) := do
  let info <- getConstInfoInduct (kernelName short)
  return info.ctors.map shortName

/-- The source line a kernel type is declared on. -/
def declarationLine (short : String) : MetaM Nat := do
  let name := kernelName short
  match <- findDeclarationRanges? name with
  | some ranges => return ranges.range.pos.line
  | none => throwError "reflect: {name} has no declaration position"

/-- The environment's docstring for a kernel type, transliterated into
    the interchange's ASCII and otherwise raw: the text is never
    reflowed, retrimmed, or retyped. -/
def docOf (short : String) : MetaM String := do
  let name := kernelName short
  match <- findDocString? (<- getEnv) name with
  | none => throwError "reflect: {name} carries no docstring"
  | some text =>
      match Shape.asciiDoc text with
      | .ok ascii => return ascii
      | .error reason => throwError "reflect: {name}: {reason}"

/-! ## The manifest command

The manifest is the pin: a committed closed list of names, in the
declaration order of `Kernel/Definitions.lean`. Everything else about
those types is read from the environment. The command mints three
definitions at the invoking namespace — the manifest itself, the
mini-AST rows, and the docstring rows — and refuses a manifest whose
names repeat or whose declaration order does not ascend, because a
shuffled manifest would emit a shuffled corpus that still passed every
per-row check.
-/

/-- Mint the environment-derived rows at a committed manifest.

    `kernel_manifest manifest typeRows docRows from DeclKind Digest ...`
    defines the three named lists: the manifest as written, one
    mini-AST row per name, and one docstring row per name. -/
elab "kernel_manifest" manifestId:ident typeId:ident docId:ident "from"
    names:ident+ : command => do
  let shorts := (names.map fun name => name.getId.toString).toList
  for short in shorts do
    if (shorts.filter fun other => other == short).length != 1 then
      throwError "reflect: the manifest names {short} more than once"
  let lines <- liftTermElabM
    (shorts.mapM fun short => (declarationLine short : TermElabM Nat))
  unless (lines.zip (lines.drop 1)).all (fun pair => pair.1 < pair.2) do
    throwError "reflect: the manifest is not in declaration order\n  names: {shorts}\n  lines: {lines}"
  let rows <- liftTermElabM (shorts.mapM fun short => do
    return Shape.typeRow (<- (shapeOf short : TermElabM Shape.TypeShape)))
  let docs <- liftTermElabM (shorts.mapM fun short => do
    return Shape.docRow short (<- (docOf short : TermElabM String)))
  elabCommand (<- `(def $manifestId : List String := $(quote shorts)))
  elabCommand (<- `(def $typeId : List String := $(quote rows)))
  elabCommand (<- `(def $docId : List String := $(quote docs)))

end Unity.Reflect
