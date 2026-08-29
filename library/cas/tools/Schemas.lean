import Cas
import Cas.Vectors.Schema
import Cas.Schema.Annotation
import Cas.Schema.Notation
import Gate

/-!
# The schema emitter — `lake exe schemas`

Emits the registered canonical-schema payloads as committed byte
fixtures under `schemas/`, one file per code (the file's bytes ARE the
schema-node payload — the cross-runtime pin surface), plus the
`index.json` tracking manifest. `--check` is the byte-identity gate.

The registry rows are the described wire codes already in service
(the conformance-vector document and index), one notation-authored
sample covering every deriving-reachable constructor, one
hand-composed literal pin covering the `Literal` spellings the
deriving handler does not reach, the sidecar annotation kind
(`Cas.Schema.Annotation`, stipulation S2), the union pin — both
modes, a nested union, and members a sort would reorder, so
order-is-identity is held by the bytes — and the DERIVED tagged union,
the generator's own pin for `deriving Described` over constructor
alternatives. The TypeScript side asserts
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

/-- The union spellings, hand-composed (increment C1): both modes and a
nested union, with member lists a sort WOULD REORDER — so
order-is-identity is visible in the committed bytes, not only in a
docstring.

- `choice` — `anyOf` over three keywords, in a written order no
  canonical arrangement would produce;
- `exact` — `oneOf` over two string literals spelled `zebra` before
  `alpha`: any sort of the members changes these bytes, and the fixture
  goes red;
- `nested` — an `anyOf` whose second member is itself a `oneOf`, so the
  no-flattening rule is pinned too (this code is NOT
  `union [null, arr str, bool]`), on an optional field so the union
  rides both key positions. -/
def unionPin : Ast := .struct [
  ("choice", false, .union [.str, .bool, .int] .anyOf),
  ("exact", false, .union [.lit (.str "zebra"), .lit (.str "alpha")] .oneOf),
  ("nested", true, .union [.null, .union [.arr .str, .bool] .oneOf] .anyOf)
]

/-- The DERIVED tagged union (increment C1, stage 2), authored through
`cas_union`: the `Described` instance is what the deriving handler
generates, so these bytes are the GENERATOR's output and not a
hand-composed code — the fixture is the generator's own pin.

Three constructors at three arities (binary, nullary, and one carrying
an optional field), and the source order — `move`, `stop`, `say` — is
deliberately NOT the code's order. The handler sorts members by tag, so
the payload spells `move`, `say`, `stop`: the one spelling a generator
is allowed to pick, held by the bytes.

`TaggedPin.schemaDiscriminated`, emitted alongside the instance, is the
proof that this code is a discriminated union — which is what makes
`El` of it the member sum and its round trip a theorem. -/
cas_union TaggedPin where
  | move (dx : SafeInt) (dy : SafeInt)
  | stop
  | say (body : String) (note : Option String)

-- The generator's discrimination claim, checked at elaboration; the
-- theorem it is checking is `TaggedPin.schemaDiscriminated`, emitted
-- beside the instance.
#guard TaggedPin.schemaCode.discriminated

/-- The registry: every pinned code in one place. -/
def registry : List (String × Ast) := [
  ("vector-document", Described.code (α := Cas.Vectors.Wire.VectorDocument)),
  ("vector-index", Described.code (α := Cas.Vectors.Wire.VectorIndex)),
  ("pin-sample", PinSample.schemaCode),
  ("literal-pin", literalPin),
  ("annotation", Annotation.schemaCode),
  ("union-pin", unionPin),
  ("tagged-pin", TaggedPin.schemaCode)
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

/-- The registry rendered as the driver's fixtures: one payload file
per pinned code — the file's bytes ARE the schema-node payload — then
the tracking manifest and the store-address file. -/
def fixtures : IO (List Gate.Fixture) :=
  return registry.map (fun (name, ast) =>
      ({ path := pathOf name, content := ast.payload,
         label := "canonical payload" } : Gate.Fixture)) ++
    [⟨indexPath, indexDocument, s!"{registry.length} schemas"⟩,
     ⟨addressesPath, addressesDocument, s!"{registry.length} addresses"⟩]

end SchemasMain

def main := Gate.main "lake exe schemas" SchemasMain.fixtures
