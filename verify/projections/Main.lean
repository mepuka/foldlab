import Kernel.Definitions
import Lake.Load.Lean.Elab
import Projections

open Lean
open System

namespace Projections.Cli

structure Config where
  target : String
  names : FilePath

private def parseArgs (arguments : List String) : Except String Config := do
  let mut target : Option String := none
  let mut names : Option FilePath := none
  for argument in arguments do
    if argument.startsWith "--target=" then
      if target.isSome then throw "projections: --target was supplied more than once"
      target := some (argument.drop "--target=".length).toString
    else if argument.startsWith "--names=" then
      if names.isSome then throw "projections: --names was supplied more than once"
      names := some (argument.drop "--names=".length).toString
    else
      throw s!"projections: unknown argument {argument}"
  let targetValue <-
    match target with
    | some value => pure value
    | none => throw "projections: missing --target=<target>"
  let namesValue <-
    match names with
    | some value => pure value
    | none => throw "projections: missing --names=<manifest>"
  if targetValue != "prose" then
    throw s!"projections: unsupported target {targetValue}; expected prose"
  return { target := targetValue, names := namesValue }

private def parseName (text : String) : Except String Name := do
  let pieces := text.splitOn "."
  if pieces.isEmpty || pieces.any String.isEmpty then
    throw s!"projections: invalid declaration name {text}"
  return pieces.foldl (fun accumulated piece => Name.str accumulated piece) Name.anonymous

private def readManifest (path : FilePath) : IO (List Name) := do
  let contents <- IO.FS.readFile path
  let rows := contents.splitOn "\n" |>.map (fun row => row.trimAscii.toString) |>.filter fun row =>
    !row.isEmpty && !row.startsWith "#"
  match rows.mapM parseName with
  | .error reason => throw <| IO.userError reason
  | .ok names => return names

private def runWalk (names : List Name) : IO ProjectionAst := do
  initSearchPath (<- findSysroot)
  let environment <- Lake.importModulesUsingCache
    #[{ module := `Kernel.Definitions }, { module := `Projections.Probe }] {} 0
  let context : Core.Context := {
    fileName := "<projections>"
    fileMap := FileMap.ofString ""
  }
  let state : Core.State := { env := environment }
  let (ast, _, _) <- (walk names).toIO context state
  return ast

end Projections.Cli

def main (arguments : List String) : IO UInt32 := do
  let config <-
    match Projections.Cli.parseArgs arguments with
    | .ok config => pure config
    | .error reason => throw <| IO.userError reason
  let names <- Projections.Cli.readManifest config.names
  let ast <- Projections.Cli.runWalk names
  IO.print (Projections.Prose.renderString ast)
  return 0
