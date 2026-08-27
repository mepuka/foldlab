import Effects.Conformance.Manifest

/-- Write the per-family conformance manifests. The directory defaults to
the committed surface beside this package; the gate regenerates and
byte-compares it. -/
def main (args : List String) : IO Unit := do
  let dir := args.headD "conformance/manifest"
  IO.FS.createDirAll dir
  for (name, content) in Effects.Conformance.Manifest.files do
    IO.FS.writeFile (System.FilePath.mk dir / name) content
