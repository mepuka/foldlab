import Effects.Conformance.ManifestRemote
import Effects.Conformance.Mutant

/-!
Declared mutant. Quarantined: the model never imports this tree.
-/

namespace Effects.Mutants.RMT003RetryUnchangedBytes

open Effects.Remote Effects.Conformance Effects.Conformance.Manifest

/-- A client that re-issues an upload for content already
integrity-rejected — the terminal-integrity memory ignored. -/
def mutantStep : RStep := fun s i =>
  match s.phase, i with
  | .idle, .request (.upload key bytes) =>
      if s.rejected[key]? == some bytes then
        { result := .commanded
          state := { s with phase := .uploading key bytes }
          commands := [.upload key bytes]
          decisions := [.issued (.upload key bytes)] }
      else Effects.Remote.step rmtParams s i
  | _, _ => Effects.Remote.step rmtParams s i

def mutant : Mutant RStep where
  id := "RMT003_RetryUnchangedBytes"
  attacks := "RMT-003"
  represents := "Killing this mutant demonstrates the vectors notice a client that retries an upload with unchanged, already-rejected content — an integrity failure must be terminal for those bytes."
  mutant := mutantStep

end Effects.Mutants.RMT003RetryUnchangedBytes
