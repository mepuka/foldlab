import Effects.Conformance.Manifest
import Effects.Conformance.ManifestReplay

/-- Write the per-family conformance manifests — the CAS families plus the
replay families, all bound to the declared model version. -/
def main (args : List String) : IO Unit := do
  let dir := args.headD "conformance/manifest"
  IO.FS.createDirAll dir
  let files :=
    Effects.Conformance.Manifest.files ++ Effects.Conformance.Manifest.replayFiles
  for (name, content) in files do
    IO.FS.writeFile (System.FilePath.mk dir / name) content
