import Cas
import Cas.Vectors.Schema
import Cas.Backend.EmitAst

/-!
# The wire-mirror emitter — `lake exe emitwire`

Slice 1 of the TypeScript backend (EFFECTS-BACKEND): the effects
package's hand-mirrored canonical-schema values become GENERATED. The
registry below lowers the same `Described` codes the schema fixtures
pin, with structural sharing, into one provenance-stamped module.
`--check` is the byte-identity gate.

The generator makes no domain choices: names, order, and doc lines are
registry data; the codes are `Described.code` of the wire structures;
the emitted expressions evaluate on the TypeScript side to ASTs whose
payload bytes the CanonicalSchemaPin suite already compares against
the Lean fixtures — generator correctness through independent
evaluation, never self-comparison.
-/

open Cas.Schema Cas.Backend Cas.Backend.Ts

namespace EmitWireMain

/-- The registry: emission order is sharing order — later codes factor
through earlier names. -/
def registry : List (String × String × Ast) := [
  ("refAst", "One typed reference: expected kind tag and hex address.",
    Described.code (α := Cas.Vectors.Wire.VectorRef)),
  ("nodeAst", "One node: scalar header fields, hex payload, ordered references.",
    Described.code (α := Cas.Vectors.Wire.VectorNode)),
  ("bindingAst", "One binding: the Lean-computed address and the node it binds.",
    Described.code (α := Cas.Vectors.Wire.VectorBinding)),
  ("vectorAst", "A registered conformance vector: metadata plus the store word.",
    Described.code (α := Cas.Vectors.Wire.VectorDocument)),
  ("indexEntryAst", "One index row: where a fixture lives and what its word binds.",
    Described.code (α := Cas.Vectors.Wire.IndexEntry)),
  ("indexAst", "The index.json manifest over the Lean vector registry.",
    Described.code (α := Cas.Vectors.Wire.VectorIndex))
]

def decls : List Decl := Id.run do
  let mut env : List (String × Ast) := []
  let mut out : List Decl := []
  for (name, doc, code) in registry do
    out := out ++ [.const { doc := [doc], name, value := constructorExpr env code }]
    env := env ++ [(name, code)]
  return out

def wireModule : Ts.Module where
  header := [
    "GENERATED — do not edit. The canonical-schema mirrors of the",
    "conformance-vector wire format, lowered from the Lean codes in",
    "`library/cas/Cas/Vectors/Schema.lean` (`Described.code` of the",
    "wire structures) by `lake exe emitwire`; regeneration is",
    "byte-identity-gated (`--check`, wired into `check:cas`). The",
    "CanonicalSchemaPin suite compares these values' payload bytes",
    "against the Lean-emitted fixtures — the drift tripwire, now",
    "derived on both sides."
  ]
  imports := [.all "CanonicalSchema" "../CanonicalSchema.ts"]
  decls := decls

def rendered : String := Render.module house0 wireModule

def emit (path : String) : IO Unit := do
  IO.FS.writeFile path rendered
  IO.println s!"wrote {path} ({rendered.toUTF8.size} bytes, {registry.length} mirrors)"

def check (path : String) : IO Unit := do
  let actual ← try IO.FS.readFile path
    catch _ => throw (IO.userError s!"{path} missing — run `lake exe emitwire`")
  unless actual == rendered do
    throw (IO.userError s!"{path} differs from regeneration — run `lake exe emitwire`")
  IO.println s!"ok {path} ({registry.length} mirrors)"

end EmitWireMain

def main (args : List String) : IO Unit :=
  match args with
  | [path] => EmitWireMain.emit path
  | ["--check", path] => EmitWireMain.check path
  | _ => throw (IO.userError "usage: lake exe emitwire [--check] <path>")
