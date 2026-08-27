import Effects.Conformance.Manifest
import Effects.Conformance.ManifestReplay

/-- Write the per-family conformance manifests. The default surface is the
committed one at the declared model version; `--proposed` writes the
review surface at the proposed version (the ratification-point emission),
which never lands in the committed manifest directory until the operator
ratifies the version transition. -/
def main (args : List String) : IO Unit := do
  let proposed := args.contains "--proposed"
  let dir := (args.filter (· != "--proposed")).headD "conformance/manifest"
  IO.FS.createDirAll dir
  let files :=
    if proposed then Effects.Conformance.Manifest.proposedFiles
    else Effects.Conformance.Manifest.files
  for (name, content) in files do
    IO.FS.writeFile (System.FilePath.mk dir / name) content
