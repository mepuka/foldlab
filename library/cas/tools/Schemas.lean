import Cas
import Cas.Vectors.Schema
import Cas.Schema.Notation

/-!
# The schema emitter — `lake exe schemas`

Emits the registered canonical-schema payloads as committed byte
fixtures under `schemas/`, one file per code (the file's bytes ARE the
schema-node payload — the cross-runtime pin surface), plus the
`index.json` tracking manifest. `--check` is the byte-identity gate.

The registry rows are the described wire codes already in service
(the conformance-vector document and index), one notation-authored
sample covering every deriving-reachable constructor, and one
hand-composed literal pin covering the `Literal` spellings the
deriving handler does not reach. The TypeScript side asserts
`CanonicalSchema.payloadOf` over the same codes answers these bytes —
the canonical-schema pin the implementation plan holds open.
-/

open Cas.Schema Cas.Schema.Notation

namespace SchemasMain

/- Every constructor the deriving handler can reach, in one
notation-authored kind: null (Unit), bool, int, string, array,
optional field, and a tagged store reference. -/
cas_struct PinSample where
  count : SafeInt
  flag : Bool
  items : List String
  label : String
  note : Option String
  root : StoreRef 9
  unit : Unit

/-- The `Literal` spellings, hand-composed (sorted fields — `WF` by
construction): the deriving handler reaches literals only through
bespoke instances, so the pin carries them explicitly. -/
def literalPin : Ast := .struct [
  ("a", false, .lit .null),
  ("b", false, .lit (.bool true)),
  ("c", true, .lit (.int ⟨-7, by decide⟩)),
  ("d", false, .lit (.str "pinned"))
]

/-- The registry: every pinned code in one place. -/
def registry : List (String × Ast) := [
  ("vector-document", Described.code (α := Cas.Vectors.Wire.VectorDocument)),
  ("vector-index", Described.code (α := Cas.Vectors.Wire.VectorIndex)),
  ("pin-sample", PinSample.schemaCode),
  ("literal-pin", literalPin)
]

/-! ## Emission -/

def outDir : System.FilePath := "schemas"

def pathOf (name : String) : System.FilePath := outDir / (name ++ ".json")

def indexPath : System.FilePath := outDir / "index.json"

def addressesPath : System.FilePath := outDir / "addresses.json"

/-- The schema node a code stores as (kind tag 0x53, envelope payload,
no references) — the same node `CanonicalSchema.nodeOf` builds on the
TypeScript side. -/
def schemaNodeOf (ast : Ast) : Cas.Node :=
  ⟨Cas.Grammar.schemeVersion, Cas.Schema.schemaKindTag,
    ast.payloadBytes.toList, []⟩

/-- The code's content address under the production digest — the
identity the store answers when this schema is admitted. -/
def addressOf (ast : Ast) : String :=
  Cas.hexS (Cas.sha256Addr (Cas.encodeNode (schemaNodeOf ast))).val

/-- THE STORE ADDRESS FILE: every registered schema's content address,
persisted and byte-gated — identity held at the address, not only the
payload. The TypeScript pin suite admits each mirrored code through
the real store and must be answered these exact addresses. -/
def addressesDocument : String :=
  let rows := registry.map fun (name, ast) =>
    Cas.Json.Value.obj [
      ("name", .str name),
      ("address", .str (addressOf ast))]
  Cas.Json.render (.obj [
    ("digest", .str "sha256-scheme0"),
    ("kindTag", .nat Cas.Schema.schemaKindTag.toNat),
    ("schemas", .arr rows)
  ]) ++ "\n"

/-- The tracking manifest: one row per registered code. -/
def indexDocument : String :=
  let rows := registry.map fun (name, ast) =>
    Cas.Json.Value.obj [
      ("name", .str name),
      ("file", .str (name ++ ".json")),
      ("byteLength", .nat ast.payload.toUTF8.size)
    ]
  Cas.Json.render (.obj [
    ("revision", .nat schemaRevision),
    ("schemas", .arr rows)
  ]) ++ "\n"

def emit : IO Unit := do
  IO.FS.createDirAll outDir
  for (name, ast) in registry do
    IO.FS.writeFile (pathOf name) ast.payload
    IO.println s!"wrote {name}.json ({ast.payload.toUTF8.size} bytes)"
  IO.FS.writeFile indexPath indexDocument
  IO.FS.writeFile addressesPath addressesDocument
  IO.println s!"wrote index.json + addresses.json ({registry.length} schemas)"

def checkOne (name : String) (ast : Ast) : IO Unit := do
  let expected := ast.payload
  let actual ← try IO.FS.readFile (pathOf name)
    catch _ => throw (IO.userError s!"schema {name}: fixture missing — run `lake exe schemas`")
  unless actual == expected do
    throw (IO.userError s!"schema {name}: fixture differs from regeneration — run `lake exe schemas`")
  IO.println s!"ok {name}.json"

def check : IO Unit := do
  for (name, ast) in registry do checkOne name ast
  let actual ← try IO.FS.readFile indexPath
    catch _ => throw (IO.userError "index.json missing — run `lake exe schemas`")
  unless actual == indexDocument do
    throw (IO.userError "index.json differs from regeneration — run `lake exe schemas`")
  let actualAddrs ← try IO.FS.readFile addressesPath
    catch _ => throw (IO.userError "addresses.json missing — run `lake exe schemas`")
  unless actualAddrs == addressesDocument do
    throw (IO.userError "addresses.json differs from regeneration — run `lake exe schemas`")
  IO.println s!"ok index.json + addresses.json ({registry.length} schemas)"

end SchemasMain

def main (args : List String) : IO Unit :=
  match args with
  | [] => SchemasMain.emit
  | ["--check"] => SchemasMain.check
  | _ => throw (IO.userError "usage: lake exe schemas [--check]")
