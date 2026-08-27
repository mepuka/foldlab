import Effects.Conformance.Manifest
import Effects.Conformance.ManifestReplay
import Effects.Conformance.ManifestRemote
import Effects.Conformance.ManifestMerkle

/-- Write the per-family conformance manifests — the CAS, replay,
remote, and Merkle families, all bound to the declared model
version. -/
def main (args : List String) : IO Unit := do
  let dir := args.headD "conformance/manifest"
  IO.FS.createDirAll dir
  let files :=
    Effects.Conformance.Manifest.files
      ++ Effects.Conformance.Manifest.replayFiles
      ++ Effects.Conformance.Manifest.remoteFiles
      ++ Effects.Conformance.Manifest.merkleFiles
  for (name, content) in files do
    IO.FS.writeFile (System.FilePath.mk dir / name) content
