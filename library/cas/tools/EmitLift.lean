import Cas.Lift.Manifest

/-!
# The lift-manifest emitter — `lake exe emitlift`

Emits both projections of the effect-lift manifest (the R11
interchange document of the lift lane) from `Cas.Lift.manifestV0`:
the JSON the engines consume, through the house manifest printer, and
the human Markdown rendering (P4) beside it at the same path with the
`md` extension. `--check` is the byte-identity gate over both.
-/

def main (args : List String) : IO Unit := do
  match args with
  | [path] =>
    let md := (System.FilePath.mk path).withExtension "md"
    if let some parent := (System.FilePath.mk path).parent then
      IO.FS.createDirAll parent
    IO.FS.writeFile path Cas.Lift.document
    IO.FS.writeFile md Cas.Lift.markdown
    IO.println s!"wrote {path} ({Cas.Lift.document.toUTF8.size} bytes, {Cas.Lift.manifestV0.rules.length} rules) + {md}"
  | ["--check", path] =>
    let md := (System.FilePath.mk path).withExtension "md"
    let actual ← try IO.FS.readFile path
      catch _ => throw (IO.userError s!"{path} missing — run `lake exe emitlift {path}`")
    unless actual == Cas.Lift.document do
      throw (IO.userError s!"{path} differs from regeneration — run `lake exe emitlift {path}`")
    let actualMd ← try IO.FS.readFile md
      catch _ => throw (IO.userError s!"{md} missing — run `lake exe emitlift {path}`")
    unless actualMd == Cas.Lift.markdown do
      throw (IO.userError s!"{md} differs from regeneration — run `lake exe emitlift {path}`")
    IO.println s!"ok {path} + {md} ({Cas.Lift.manifestV0.rules.length} rules)"
  | _ => throw (IO.userError "usage: lake exe emitlift [--check] <path>")
