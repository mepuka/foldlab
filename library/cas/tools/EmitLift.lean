import Cas.Lift.Manifest
import Gate

/-!
# The lift-manifest emitter — `lake exe emitlift`

Emits both projections of the effect-lift manifest (the R11
interchange document of the lift lane) from `Cas.Lift.manifestV0`:
the JSON the engines consume, through the house manifest printer, and
the human Markdown rendering (P4) beside it at the same path with the
`md` extension. `--check` is the byte-identity gate over both.
-/

namespace EmitLiftMain

/-- Where the manifest lives in the effects package — the lane's own
knowledge of its artifact. A positional argument overrides it, and the
Markdown projection follows the JSON's path either way. -/
def defaultTarget : System.FilePath :=
  "../effects/src/cas/generated/lift/manifest.json"

def fixtures (target : Option System.FilePath) : IO (List Gate.Fixture) :=
  let json := target.getD defaultTarget
  let rules := s!"{Cas.Lift.manifestV0.rules.length} rules"
  return [
    ⟨json, Cas.Lift.document, rules⟩,
    ⟨json.withExtension "md", Cas.Lift.markdown, s!"{rules}, Markdown"⟩]

end EmitLiftMain

def main := Gate.mainAt "lake exe emitlift" EmitLiftMain.fixtures
