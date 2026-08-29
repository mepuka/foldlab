import Cas.Grammar.Manifest
import Cas.Lang.Defun
import Gate

/-!
# The grammar-manifest emitter — `lake exe emitgrammar`

Emits both projections of the grammar manifest (the R11 interchange
document of the data grammar) from `Cas.Grammar.manifestV0`: the JSON
the front ends consume, through the house manifest printer, and
`REGISTRY.md`, the human kind-tag registry, which is this manifest's
Markdown rendering and nothing else. `--check` is the byte-identity
gate over both.

The registry is regenerated IN PLACE rather than beside the JSON: the
grammar's human surface already has a home at the library root, and a
second Markdown spelling of the sort table is exactly what closing
ruling-queue item 26 was about.

This root is also where the grammar manifest and the `Lang` layer meet,
so the RESERVED rows are pinned here — the manifest cannot import
`Defun` (layer 3 sits above layer 2), but the tool that renders it can,
and `check:cas` builds it.
-/

namespace EmitGrammarMain

open Cas.Grammar

/-- The reserved rows carry the tags `Cas/Lang/Defun.lean` actually
writes. `Defun` guards those literals against the registry table; this
guards the table against `Defun`, closing the loop the layering forbids
stating in one module. -/
private def reservedTags : List UInt8 :=
  (manifestV0.rows.filter (·.status.isReserved)).map (·.id.wireTag)

#guard reservedTags == [Cas.Lang.stepWireTag, Cas.Lang.contWireTag]

/-- Where the manifest lives in the effects package — the lane's own
knowledge of its artifact. A positional argument overrides it; the
registry rendering is at the library root either way. -/
def defaultTarget : System.FilePath :=
  "../effects/src/cas/generated/grammar/manifest.json"

/-- The registry document, at the library root. -/
def registryTarget : System.FilePath := "REGISTRY.md"

def fixtures (target : Option System.FilePath) : IO (List Gate.Fixture) :=
  let json := target.getD defaultTarget
  let sorts := s!"{manifestV0.rows.length} sorts"
  return [
    ⟨json, Cas.Grammar.document, sorts⟩,
    ⟨registryTarget, Cas.Grammar.registry, s!"{sorts}, the kind-tag registry"⟩]

end EmitGrammarMain

def main := Gate.mainAt "lake exe emitgrammar" EmitGrammarMain.fixtures
