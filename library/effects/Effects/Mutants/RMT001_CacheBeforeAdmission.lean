import Effects.Conformance.ManifestRemote
import Effects.Conformance.Mutant

/-!
Declared mutant. Quarantined: the model never imports this tree.
-/

namespace Effects.Mutants.RMT001CacheBeforeAdmission

open Effects.Remote Effects.Conformance Effects.Conformance.Manifest

/-- A client that caches whatever the wire returned for the in-flight
key, verification be damned. -/
def mutantStep : RStep := fun s i =>
  match s.phase, i with
  | .loading key, .fromWire (.ok _ bytes) =>
      { result := .delivered key bytes
        state := { s with phase := .idle, cache := s.cache.insert key }
        commands := []
        decisions := [.cached key] }
  | _, _ => Effects.Remote.step rmtParams s i

def mutant : Mutant RStep where
  id := "RMT001_CacheBeforeAdmission"
  attacks := "RMT-001"
  represents := "Killing this mutant demonstrates the vectors notice a client that caches and returns un-verified wire bytes — a wire-supplied digest treated as an identity instead of a routing hint."
  mutant := mutantStep

end Effects.Mutants.RMT001CacheBeforeAdmission
