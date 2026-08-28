import Cas.IR.Word
import Cas.Codec.Hex
import Cas.Schema.Codec

/-!
# Conformance vectors — the registered replay surface, described

A conformance vector is a store word with a name: a replayable
admission history another runtime replays binding by binding,
recomputing every address and re-running admission. The type is the
registration mechanism (the `GrammarSpec` pattern from
predictable-machines/lean4-tree-sitter): a vector is a first-class
value, the emitter iterates ONE registry, and the emitted `index.json`
manifest is the tracking surface.

The vector file format is itself a DESCRIBED tree (the three-trees
discipline): `vectorAst` and `indexAst` are canonical schema codes,
the serialized document is `Schema.encode` of the vector's `El` image,
and validation is a derived law, never a hand-rolled recognizer —
`Schema.decode vectorAst` accepts a vector document because the
generic forward theorem says so (`decode_json`), and accepts nothing
outside the encoder's image because the generic exactness theorem says
so (`json_exact`). The committed rendering is the canonical manifest
form (`Json.render`: sorted keys, fixed layout, trailing newline), so
regeneration is byte-identical by construction and the fixtures carry
a byte-identity gate (`lake exe vectors --check`).

Store-word obligations run at emission time through the interpreter,
never the kernel: the word must pass `Word.wf` (the executable
admission scan) and be non-empty before a byte is written — the same
build-time-assert discipline as the SHA-256 known-answer vectors.
Kernel `decide` over a digest is never asked for; the `decide` uses
below settle only field-name orderings.

Nothing here re-derives an encoding: addresses arrive inside the word
(computed by whatever produced it — the grammar's `flatten` under
`sha256Addr`, or a program run), payloads and addresses serialize
through the proved lowercase-hex codec.
-/

namespace Cas.Vectors

/-- The vector format version — bump on any change to the described
codes below. -/
def formatVersion : Nat := 1

/-- The digest scheme name the fixtures declare. -/
def digestScheme : String := "sha256-scheme0"

/-! ## Safe integers, totalized

The described image carries `SafeInt`s. Byte-plane scalars are safe by
their width; counts clamp AT the bound — unreachable for any honest
registry (the house `Payload.ofBytes` move). -/

def safeOfUInt8 (b : UInt8) : Schema.SafeInt :=
  ⟨Int.ofNat b.toNat, by
    show b.toNat ≤ Schema.maxSafeNat
    have h := b.toNat_lt
    simp only [Schema.maxSafeNat]
    omega⟩

def safeClamp (n : Nat) : Schema.SafeInt :=
  ⟨Int.ofNat (min n Schema.maxSafeNat),
    show min n Schema.maxSafeNat ≤ Schema.maxSafeNat from Nat.min_le_right ..⟩

def safeOne : Schema.SafeInt := ⟨1, by decide⟩

/-! ## The codes — the vector format as canonical schema

Field lists are in strict sorted name order (`Ast.WF`), so the code
order IS the canonical order and the encoder emits sorted objects by
construction. The format-version and digest-scheme fields are literal
codes: the schema itself pins their values. -/

/-- One typed reference: the expected kind tag and the hex address. -/
def refAst : Schema.Ast :=
  .struct [("expectedTag", false, .int), ("id", false, .str)]

/-- One node: scalar header fields, hex payload, ordered references. -/
def nodeAst : Schema.Ast :=
  .struct [("payload", false, .str), ("refs", false, .arr refAst),
           ("tag", false, .int), ("version", false, .int)]

/-- One binding: the address and the node it binds. -/
def bindingAst : Schema.Ast :=
  .struct [("address", false, .str), ("node", false, nodeAst)]

/-- The vector document: metadata plus the word in admission order. -/
def vectorAst : Schema.Ast :=
  .struct [("description", false, .str),
           ("digest", false, .lit (.str digestScheme)),
           ("name", false, .str),
           ("schemaVersion", false, .lit (.int safeOne)),
           ("word", false, .arr bindingAst)]

/-- One index row: where a fixture lives and what its word binds. -/
def indexEntryAst : Schema.Ast :=
  .struct [("bindings", false, .int), ("description", false, .str),
           ("file", false, .str), ("name", false, .str),
           ("root", false, .str)]

/-- The index manifest: the tracking surface over a registry. -/
def indexAst : Schema.Ast :=
  .struct [("digest", false, .lit (.str digestScheme)),
           ("schemaVersion", false, .lit (.int safeOne)),
           ("vectors", false, .arr indexEntryAst)]

/-- The vector code is canonical: every struct strictly sorted. -/
theorem vectorAst_wf : vectorAst.WF := by
  simp only [vectorAst, bindingAst, nodeAst, refAst,
    Schema.Ast.WF, Schema.WFFields, and_true]
  decide

/-- The index code is canonical. -/
theorem indexAst_wf : indexAst.WF := by
  simp only [indexAst, indexEntryAst,
    Schema.Ast.WF, Schema.WFFields, and_true]
  decide

/-! ## The registered type and its described image -/

/-- A registered conformance vector: a named, replayable store word.
`name` is the fixture file stem (kebab-case); `description` says what
the word exercises, for the index. -/
structure ConformanceVector where
  name : String
  description : String
  word : Word

/-- One typed reference, described. -/
def describeRef (r : Ref) : Schema.El refAst :=
  (safeOfUInt8 r.expectedTag, hexS r.addr.val, ())

/-- One node, described. -/
def describeNode (n : Node) : Schema.El nodeAst :=
  (hexS n.payload, n.refs.map describeRef,
    safeOfUInt8 n.tag, safeOfUInt8 n.version, ())

/-- One binding, described. -/
def describeBinding (p : Addr32 × Node) : Schema.El bindingAst :=
  (hexS p.1.val, describeNode p.2, ())

namespace ConformanceVector

/-- The vector's image in the universe: `El` of the vector code. The
literal fields carry no data — the code pins their values. -/
def described (v : ConformanceVector) : Schema.El vectorAst :=
  (v.description, (), v.name, (), v.word.map describeBinding, ())

/-- The vector document value — the GENERIC codec applied to the
described image; no hand-rolled projection exists. -/
def json (v : ConformanceVector) : Json.Value :=
  Schema.encode vectorAst v.described

/-- The committed fixture text: the canonical manifest rendering. -/
def document (v : ConformanceVector) : String :=
  Json.document v.json

/-- The fixture file name. -/
def fileName (v : ConformanceVector) : String := v.name ++ ".json"

/-- The word's root address, hex: the last binding — the admission
order's final (top) node. Empty words are refused by the emitter's
gate before this is ever rendered. -/
def rootHex (v : ConformanceVector) : String :=
  match v.word.getLast? with
  | some p => hexS p.1.val
  | none => ""

/-- One index row, described. -/
def describedIndexEntry (v : ConformanceVector) : Schema.El indexEntryAst :=
  (safeClamp v.word.length, v.description, v.fileName, v.name, v.rootHex, ())

end ConformanceVector

/-- The index image over a registry. -/
def describedIndex (registry : List ConformanceVector) : Schema.El indexAst :=
  ((), (), registry.map ConformanceVector.describedIndexEntry, ())

/-- The index manifest value — the generic codec again. -/
def indexJson (registry : List ConformanceVector) : Json.Value :=
  Schema.encode indexAst (describedIndex registry)

/-- The committed index text. -/
def indexDocument (registry : List ConformanceVector) : String :=
  Json.document (indexJson registry)

/-! ## Derived validation — the deriving-to-prove-validation payoff

The vector format's validator is the proved generic decoder. Nothing
below is proved here: both laws are instances of the universe's
one-time theorems at the vector code. -/

/-- The derived validator: a JSON value is a well-formed vector
document exactly when the generic decoder accepts it at the vector
code. -/
def validates (value : Json.Value) : Bool :=
  (Schema.decode vectorAst value).isSome

/-- Forward, derived: every emitted vector document decodes back to
its described image (the generic forward theorem at `vectorAst`). -/
theorem decode_json (v : ConformanceVector) :
    Schema.decode vectorAst v.json = some v.described :=
  Schema.decode_encode vectorAst vectorAst_wf v.described

/-- Every emitted vector document validates. -/
theorem validates_json (v : ConformanceVector) : validates v.json = true := by
  simp only [validates, decode_json, Option.isSome_some]

/-- Exactness, derived: the format admits ONE document per described
image — anything decoding to a vector's image IS its document (the
generic exactness theorem at `vectorAst`). -/
theorem json_exact {value : Json.Value} {v : ConformanceVector}
    (h : Schema.decode vectorAst value = some v.described) :
    value = v.json :=
  Schema.decode_exact h

/-- The index manifest decodes back to its described image. -/
theorem decode_index (registry : List ConformanceVector) :
    Schema.decode indexAst (indexJson registry)
      = some (describedIndex registry) :=
  Schema.decode_encode indexAst indexAst_wf (describedIndex registry)

end Cas.Vectors
