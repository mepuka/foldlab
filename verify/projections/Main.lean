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
  if targetValue != "prose" && targetValue != "refusal-probe" && targetValue != "orphans" then
    throw s!"projections: unsupported target {targetValue}"
  return { target := targetValue, names := namesValue }

private def parseName (text : String) : Except String Name := do
  let pieces := text.splitOn "."
  if pieces.isEmpty || pieces.any String.isEmpty then
    throw s!"projections: invalid declaration name {text}"
  return pieces.foldl (fun accumulated piece => Name.str accumulated piece) Name.anonymous

/-- The module set that owns the manifest's declarations, declared as a
    directive line in the same file that names the declarations. A future
    package swaps manifests rather than editing this executable: the walk is
    parameterized by the environment the manifest names, not by a hard-coded
    module list here. -/
private def parseModules (rows : List String) : Except String (List Name) := do
  let directives := rows.filter (fun row => row.startsWith "# modules:")
  match directives with
  | [] =>
      throw "projections: the manifest declares no module list; add a '# modules: <one.module>, <two.module>' directive"
  | line :: _ =>
      let body := (line.drop "# modules:".length).trimAscii.toString
      let modules := body.splitOn "," |>.map (fun name => name.trimAscii.toString)
        |>.filter (fun name => !name.isEmpty)
      if modules.isEmpty then
        throw s!"projections: the module directive names no modules: {line}"
      match modules.mapM parseName with
      | .error reason => throw reason
      | .ok modules => return modules

/-- Read the manifest: a `# modules:` directive carrying the environment to
    walk, then a declaration list. Refused when the module directive is absent,
    because a walk with no named environment is meaningless. -/
private def readManifest (path : FilePath) : IO (List Name × List Name) := do
  let contents <- IO.FS.readFile path
  let rows := contents.splitOn "\n" |>.map (fun row => row.trimAscii.toString)
  let moduleResult := parseModules rows
  let modules <- match moduleResult with
    | .error reason => throw <| IO.userError reason
    | .ok modules => pure modules
  let nameResult := rows.filter (fun row => !row.isEmpty && !row.startsWith "#") |>.mapM parseName
  let names <- match nameResult with
    | .error reason => throw <| IO.userError reason
    | .ok names => pure names
  return (modules, names)

/-- Load the manifest-named environment exactly as the gate's source hygiene
    names it: this is the ONE loader call, and it loads the environment rather
    than walking it — the walk happens in `Projections.Walk`. The module set
    comes from the manifest directive, never from a name hard-coded here. -/
private def loadModules (modules : List Name) : IO Environment := do
  initSearchPath (<- findSysroot)
  Lake.importModulesUsingCache
    (modules.toArray.map (fun module => { module := module })) {} 0

private def runWalk (modules : List Name) (names : List Name) : IO ProjectionAst := do
  let environment <- loadModules modules
  let context : Core.Context := {
    fileName := "<projections>"
    fileMap := FileMap.ofString ""
  }
  let state : Core.State := { env := environment }
  let (ast, _, _) <- (Projections.walk names).toIO context state
  return ast

/-- Report names the manifest-named namespace `scope` holds that the manifest
    omits. -/
private def runOrphans (modules : List Name) (scope : Name) (names : List Name)
    : IO (List String) := do
  let environment <- loadModules modules
  let context : Core.Context := {
    fileName := "<projections>"
    fileMap := FileMap.ofString ""
  }
  let state : Core.State := { env := environment }
  let (orphans, _, _) <- (Projections.orphanNames scope names).toIO context state
  return orphans

/-- The namespace the manifest draws from: the shared prefix of its names,
    refused when it is not one namespace. -/
private def manifestNamespace (names : List Name) : Except String Name := do
  let prefixes := names.map (fun name => name.getPrefix)
  match prefixes with
  | [] => throw "projections: the manifest has no names; cannot derive a scan namespace"
  | first :: rest =>
      if rest.any (fun pfx => pfx != first) then
        throw "projections: the manifest spans multiple namespaces; cannot pick one scan root"
      else if first == Name.anonymous then
        throw "projections: the manifest names are top-level; there is no namespace to scan"
      else return first

end Projections.Cli

def main (arguments : List String) : IO UInt32 := do
  let config <-
    match Projections.Cli.parseArgs arguments with
    | .ok config => pure config
    | .error reason => throw <| IO.userError reason
  let (modules, names) <- Projections.Cli.readManifest config.names
  match config.target with
  | "prose" =>
      let ast <- Projections.Cli.runWalk modules names
      IO.print (Projections.Prose.renderString ast)
  | "refusal-probe" =>
      let ast <- Projections.Cli.runWalk modules names
      IO.print (Projections.Prose.renderString (Projections.Probe.withSampleRefusals ast))
  | "orphans" =>
      let scope <-
        match Projections.Cli.manifestNamespace names with
        | .error reason => throw <| IO.userError reason
        | .ok scope => pure scope
      let orphans <- Projections.Cli.runOrphans modules scope names
      let rendered := String.intercalate "\n" orphans
      let header :=
        "# Projection orphans\n\n" ++
        "Declarations the compiled environment holds in the manifest's namespace that the\n" ++
        "manifest does not list. Regenerated by `lake exe projections --target=orphans`.\n\n" ++
        s!"Count: {orphans.length}\n\n"
      IO.print (header ++ rendered ++ "\n")
  | target => throw <| IO.userError s!"projections: unsupported target {target}"
  return 0
