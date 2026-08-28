import Cas.Schema.Deriving.Util
import Lean.Elab.Deriving.Basic
import Lean.Elab.Deriving.Util

/-!
# `deriving Described`

An opt-in deriving handler for non-recursive structures. It uses Lean's
own deriving utilities for parameters, instance binders, names, and
registration, while emitting ordinary definitions and proofs for the
kernel to check.
-/

namespace Cas.Schema.Deriving

open Lean
open Lean.Elab
open Lean.Elab.Command
open Lean.Meta

private def jsonFieldName (field : Name) : String :=
  field.eraseMacroScopes.getString!

private def canonicalFields (indName : Name) : CoreM (Array Name) := do
  let fields := getStructureFieldsFlattened (← getEnv) indName
    (includeSubobjectFields := false)
  return fields.qsort fun a b => jsonFieldName a < jsonFieldName b

private def mkGetter (targetType : Term) (field : Name) : TermElabM Term := do
  let xName ← mkFreshUserName `x
  let x := mkIdent xName
  `(fun ($x:ident : $targetType) => $x.$(mkIdent field))

private def mkFieldSpec (targetType : Term) (field : Name) : TermElabM Term := do
  let name := Syntax.mkStrLit (jsonFieldName field)
  let getter ← mkGetter targetType field
  `(Cas.Schema.Deriving.fieldSpec (ρ := $targetType)
    $name $getter)

private def mkFieldSpecs (targetType : Term)
    (fields : Array Name) : TermElabM (Array Term) :=
  fields.mapM (mkFieldSpec targetType)

private def mkToEl (targetType : Term) (fields : Array Name) : TermElabM Term := do
  let xName ← mkFreshUserName `x
  let x := mkIdent xName
  let mut body ← `(())
  for field in fields.reverse do
    let getter ← mkGetter targetType field
    body ← `(Prod.mk
      (Cas.Schema.Deriving.fieldToEl (ρ := $targetType)
        $getter $x)
      $body)
  `(fun $x:ident => $body)

private def mkTupleProjection (root : Term) (idx : Nat) : TermElabM Term := do
  let mut value := root
  for _ in *...idx do
    value ← `(($value).2)
  `(($value).1)

private def mkOfEl (targetType : Term) (fields : Array Name) : TermElabM Term := do
  let xName ← mkFreshUserName `x
  let x := mkIdent xName
  let mut values := #[]
  for h : i in *...fields.size do
    let projection ← mkTupleProjection x i
    let getter ← mkGetter targetType fields[i]
    values := values.push (←
      `(Cas.Schema.Deriving.fieldOfEl (ρ := $targetType)
        $getter $projection))
  let names := fields.map mkIdent
  let body ← `({ $[$names:ident := $values],* })
  `(fun $x:ident => $body)

private def mkWF (targetType : Term) (fields : Array Name) : TermElabM Term := do
  let mut fieldsWF ← `(True.intro)
  for field in fields.reverse do
    let getter ← mkGetter targetType field
    let head ← `(Cas.Schema.Deriving.fieldWF (ρ := $targetType)
      $getter)
    fieldsWF ← `(And.intro $head $fieldsWF)
  `(And.intro (by
      simp [Cas.Schema.Deriving.fieldSpec]) $fieldsWF)

open Lean.Elab.Deriving
open TSyntax.Compat in
private def mkDescribedInstance (declName : Name) : TermElabM Command := do
  let indVal ← getConstInfoInduct declName
  if indVal.isRec || indVal.isNested || indVal.all.length != 1 then
    throwError "`deriving Described` supports only non-recursive, non-mutual structures; `{.ofConstName declName}` is recursive, nested, or mutual"
  unless isStructure (← getEnv) declName do
    throwError "`deriving Described` supports structures; `{.ofConstName declName}` is an inductive type whose constructor alternatives are not representable by the current schema `Ast`"

  let argNames ← mkInductArgNames indVal
  let binders ← mkImplicitBinders argNames
  let binders := binders ++
    (← mkInstImplicitBinders ``Cas.Schema.Described indVal argNames)
  let targetType ← mkInductiveApp indVal argNames
  let instName ← mkInstName ``Cas.Schema.Described declName
  let fields ← canonicalFields declName
  let specs ← mkFieldSpecs targetType fields
  let code ← `(Cas.Schema.Ast.struct [$[$specs],*])
  let wf ← mkWF targetType fields
  let toEl ← mkToEl targetType fields
  let ofEl ← mkOfEl targetType fields
  let ofElToEl ← `(by
    intro x
    cases x
    simp [Cas.Schema.Deriving.fieldToEl,
      Cas.Schema.Deriving.fieldOfEl,
      Cas.Schema.Deriving.FieldDescription.ofEl_toEl])
  let toElOfEl ← `(by
    intro x
    simp only [Cas.Schema.Deriving.fieldToEl,
      Cas.Schema.Deriving.fieldOfEl,
      Cas.Schema.Deriving.FieldDescription.toEl_ofEl]
    change Cas.Schema.Deriving.rebuildFields [$[$specs],*] x = x
    exact Cas.Schema.Deriving.rebuildFields_eq _ x)

  `(instance $(mkIdent instName):ident $binders:implicitBinder* :
      Cas.Schema.Described $targetType where
    code := $code
    wf := $wf
    toEl := $toEl
    ofEl := $ofEl
    ofEl_toEl := $ofElToEl
    toEl_ofEl := $toElOfEl)

open Lean.Elab.Deriving in
private def mkDescribedInstanceHandler
    (declNames : Array Name) : CommandElabM Bool := do
  if declNames.isEmpty then
    return false
  for declName in declNames do
    withoutExposeFromCtors declName do
      let cmd ← liftTermElabM <| mkDescribedInstance declName
      elabCommand cmd
  return true

initialize
  Lean.Elab.registerDerivingHandler ``Cas.Schema.Described
    mkDescribedInstanceHandler

end Cas.Schema.Deriving
