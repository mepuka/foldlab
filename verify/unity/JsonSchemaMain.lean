/- The tool-schema emitter's entry point.

   One input the caller does not supply: the walk. The declaration shapes come
   from the compiled kernel environment over the same closed manifest the
   conformance corpus is minted from, so the tools the schema offers and the
   sentences the corpus carries cannot name two different languages.

   A refused emission writes its reason to standard error and exits nonzero.
   Every refusal this printer can raise is a statement about the reviewed
   manifest -- a naming row that reaches no model field, a model field no row
   names, a carrier with no fragment, a ceiling on an identity coordinate, a
   citation no paragraph makes -- and a schema that fails one of those is a
   schema that would lie to a client about what the door accepts. -/
import Kernel.Definitions
import Lake.Load.Lean.Elab
import Projections
import Unity.Emit
import Unity.JsonSchema

open Lean
open System

namespace Unity.JsonSchemaCli

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
def readAst : IO Projections.ProjectionAst := do
  let environment <- loadKernel
  let context : Core.Context := {
    fileName := "<unity-json-schema>"
    fileMap := FileMap.ofString ""
  }
  let state : Core.State := { env := environment }
  let (ast, _, _) <- (Projections.walk manifestNames).toIO context state
  return ast

end Unity.JsonSchemaCli

def main (arguments : List String) : IO UInt32 := do
  if !arguments.isEmpty then
    let err <- IO.getStderr
    err.putStrLn "usage: jsonschema"
    return 2
  let ast <- Unity.JsonSchemaCli.readAst
  match Unity.JsonSchema.render ast with
  | .ok text =>
      IO.print text
      return 0
  | .error reason =>
      let err <- IO.getStderr
      err.putStrLn reason
      err.putStrLn "jsonschema: refusing to print a schema that fails its own checks"
      return 1
