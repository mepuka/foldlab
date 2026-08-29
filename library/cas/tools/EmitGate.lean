import Cas.Backend.Admission
import Gate

/-!
# The admission-table emitter — `lake exe emitgate`

R11 applied to the DOOR. The TypeScript admitted-subset gate used to be
a 330-line hand copy of `Ast.ofRepresentationJson` and `Ast.wf`, with
the check spelling, the safe-integer bound, the union modes, the
declaration columns and the refusal prose all retyped. This tool prints
`Cas.Backend.Admission`'s table into the effects package, where a small
interpreter walks it; `--check` is the byte-identity gate.
-/

namespace EmitGateMain

/-- Where the table lives in the effects package — the tool's own
knowledge of its artifact, so no caller carries the path. A positional
argument overrides it. -/
def defaultTarget : System.FilePath :=
  "../effects/src/cas/generated/SchemaAdmission.ts"

def fixtures (target : Option System.FilePath) : IO (List Gate.Fixture) :=
  return [⟨target.getD defaultTarget, Cas.Backend.Admission.rendered,
    s!"{Cas.Backend.Admission.nodes.length} nodes, \
{Cas.Backend.Admission.clauses.length} clauses"⟩]

end EmitGateMain

def main := Gate.mainAt "lake exe emitgate" EmitGateMain.fixtures
