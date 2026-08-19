/- The TypeScript surface emitter's entry point.

   Three inputs, and the caller supplies exactly one of them: the reviewed
   refusal roster. The corpus comes from this package's own emitter, which the
   gate already proves byte-identical to the committed interchange, so the
   surfaces are projected from the model's emission rather than from whatever
   file happens to be on disk. The declaration shapes come from a walk of the
   compiled kernel environment over the emitter's own manifest, so the roster
   of walked names cannot drift from the roster the corpus carries.

   A refused emission writes its reason to standard error and exits nonzero: a
   surface that cannot say where it came from is never printed. -/
import Kernel.Definitions
import Lake.Load.Lean.Elab
import Projections
import Unity.TsKernel

open Lean
open System

namespace Unity.TsCli

structure Config where
  target : Unity.TsKernel.Target
  roster : FilePath

private def parseArgs (arguments : List String) : Except String Config := do
  let mut target : Option String := none
  let mut roster : Option FilePath := none
  for argument in arguments do
    if argument.startsWith "--target=" then
      if target.isSome then throw "ts: --target was supplied more than once"
      target := some (argument.drop "--target=".length).toString
    else if argument.startsWith "--meanings=" then
      if roster.isSome then throw "ts: --meanings was supplied more than once"
      roster := some (argument.drop "--meanings=".length).toString
    else
      throw s!"ts: unknown argument {argument}"
  let targetValue <-
    match target with
    | some value => Unity.TsKernel.Target.ofWire value
    | none => throw "ts: missing --target=<surface>"
  let rosterValue <-
    match roster with
    | some value => pure value
    | none => throw "ts: missing --meanings=<roster>"
  return { target := targetValue, roster := rosterValue }

/-- The manifest the corpus is minted from, as qualified declaration names.
    The list is the emitter's own, so the walk and the corpus cannot name two
    different sets of declarations. -/
def manifestNames : List Name :=
  Unity.Emit.kernelTypes.map fun short => `Kernel ++ Name.mkSimple short

/-- Load the kernel environment. This is the one loader call: it loads the
    environment, and the walk that reads it lives in the projection toolkit. -/
private def loadKernel : IO Environment := do
  initSearchPath (<- findSysroot)
  Lake.importModulesUsingCache #[{ module := `Kernel.Definitions }] {} 0

/-- The projection AST of the manifest, read out of the compiled environment. -/
private def readAst : IO Projections.ProjectionAst := do
  let environment <- loadKernel
  let context : Core.Context := {
    fileName := "<unity-ts>"
    fileMap := FileMap.ofString ""
  }
  let state : Core.State := { env := environment }
  let (ast, _, _) <- (Projections.walk manifestNames).toIO context state
  return ast

end Unity.TsCli

def main (arguments : List String) : IO UInt32 := do
  let config <-
    match Unity.TsCli.parseArgs arguments with
    | .ok config => pure config
    | .error reason => throw <| IO.userError reason
  let refusals := Unity.Emit.emitFailures
  if !refusals.isEmpty then
    let err <- IO.getStderr
    for refusal in refusals do
      err.putStrLn refusal
    err.putStrLn "ts: refusing to project a corpus that fails its own checks"
    return 1
  let rosterText <- IO.FS.readFile config.roster
  let rosterLines := (rosterText.splitOn "\n").map (fun row => row.trimAscii.toString)
  let ast <- Unity.TsCli.readAst
  match Unity.TsKernel.emit config.target Unity.Emit.document rosterLines ast with
  | .ok text =>
      IO.print text
      return 0
  | .error reason =>
      let err <- IO.getStderr
      err.putStrLn reason
      return 1
