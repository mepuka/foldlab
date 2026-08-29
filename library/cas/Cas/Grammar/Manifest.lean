import Cas.Grammar.Tree
import Cas.Codec.Hex
import Cas.Values.Json
import Cas.Values.Markdown

/-!
# The grammar manifest — the sort table as data

The interchange document of the data grammar, in the R11 shape the
lift lane established (`Cas/Lift/Manifest.lean`): one described
manifest, both surfaces generated. `lake exe emitgrammar` renders the
JSON the front ends consume and `REGISTRY.md`, the human registry, from
this one value; neither is hand-maintained and both are byte-gated.

The rows do not TRANSCRIBE a layout. Every form carries a WITNESS —
a `Tree` term whose elaboration IS the shape the row states — and the
guards below read the tag, the payload width, and the reference
discipline off `Tree.node` (the `Cas.Backend.Admission` pattern). A
change to an encoder in `Cas/Grammar/Tree.lean` therefore moves this
manifest's bytes or turns the build red; it cannot silently part from
it.

Two rows carry no form on purpose and the guards say so out loud:
`context` is a ratified tag the grammar has no constructor for, and
14/15 (`step`/`cont`) are RESERVED code points spelled outside `Ty` by
`Cas/Lang/Defun.lean`. Both exceptions are pinned, so landing a
`Tree.context` constructor — or ratifying a reserved tag into `Ty` —
turns this file red and names the site that must follow.
-/

namespace Cas.Grammar

open Cas.Values.Markdown

/-! ## Prose

Free prose is typed inline content, not a string: the registry's
paragraphs carry code spans, and the estate's Markdown emitter escapes
everything that is not one. The JSON projection flattens the same
value to plain text. -/

/-- A prose fragment: typed inline content, rendered by the house
Markdown emitter and flattened for JSON. -/
abbrev Prose := List Inline

def Inline.plain : Inline → String
  | .text s => s
  | .bold s => s
  | .code s => s

def Prose.plain (p : Prose) : String := String.join (p.map Inline.plain)

/-! ## Field encodings

The four widths and the two variable forms the node codec actually
writes (`Cas/Codec/Nat32.lean`, `Cas/Codec/Bytes.lean`). Nothing else
appears in an encoder, so nothing else appears here. -/

/-- How one field is written into a payload or into the node envelope. -/
inductive FieldEnc where
  /-- One bare byte. -/
  | u8
  /-- Four bytes, big-endian (`Cas.nat32`). -/
  | beU32
  /-- Eight bytes, big-endian, written as two 32-bit halves
  (`Cas.nat64`). -/
  | beU64
  /-- A framed byte string (`Cas.frame`): a big-endian 32-bit byte
  length, then that many bytes. -/
  | framed
  /-- Uninterpreted bytes running to the end of the payload. -/
  | opaque
  deriving DecidableEq, Repr

def FieldEnc.wire : FieldEnc → String
  | .u8 => "u8"
  | .beU32 => "be-u32"
  | .beU64 => "be-u64"
  | .framed => "framed-u32"
  | .opaque => "opaque"

/-- The fixed width of an encoding, when it has one. -/
def FieldEnc.bytes : FieldEnc → Option Nat
  | .u8 => some 1
  | .beU32 => some 4
  | .beU64 => some 8
  | .framed => none
  | .opaque => none

/-- The smallest number of bytes an encoding can occupy: its width when
fixed, its length prefix when framed, nothing when opaque. -/
def FieldEnc.minBytes : FieldEnc → Nat
  | .u8 => 1
  | .beU32 => 4
  | .beU64 => 8
  | .framed => 4
  | .opaque => 0

def FieldEnc.meaning : FieldEnc → String
  | .u8 => "one byte"
  | .beU32 => "a 32-bit natural, big-endian, four bytes"
  | .beU64 => "a 64-bit natural, big-endian, eight bytes (two 32-bit halves)"
  | .framed => "a 32-bit big-endian byte length, then that many bytes"
  | .opaque => "uninterpreted bytes, running to the end of the payload"

/-- Every encoding, in width order. -/
def FieldEnc.all : List FieldEnc := [.u8, .beU32, .beU64, .framed, .opaque]

theorem FieldEnc.all_complete (e : FieldEnc) : e ∈ FieldEnc.all := by
  cases e <;> decide

-- The wire spellings collide with nothing.
#guard decide ((FieldEnc.all.map FieldEnc.wire).Nodup)

-- The stated widths ARE the encoders' widths, not a transcription.
#guard (Cas.nat32 0).length == FieldEnc.beU32.minBytes
#guard (Cas.nat64 0).length == FieldEnc.beU64.minBytes
#guard (Cas.frame [1, 2, 3]).length == FieldEnc.framed.minBytes + 3

/-! ## The row shape -/

/-- The registry name of a sort — the one spelling every surface uses
for it. -/
def Ty.sortName : Ty → String
  | .value => "value"
  | .chunk => "chunk"
  | .tree => "tree"
  | .manifest => "manifest"
  | .file => "file"
  | .entry => "entry"
  | .context => "context"
  | .schema => "schema"
  | .git => "git"

/-- One payload field: its name, how it is written, what it means. -/
structure Field where
  name : String
  enc : FieldEnc
  meaning : String

/-- One reference slot: its name, the sort the reference is expected to
have (references type-check at tag granularity), what it means. -/
structure Slot where
  name : String
  expects : Ty
  meaning : String

/-- One node form of a sort. A sort with two forms (a blob `tree` is a
leaf or an interior node; an `entry` is the genesis or a linked entry)
has two rows here and ONE wire tag: the forms are told apart by their
payload, never by the tag.

`witness` is a term whose elaboration IS this form's shape. The fields
and slots below are checked against it; they are not a second spelling
of the encoder. -/
structure Form where
  name : String
  witness : Σ t : Ty, Tree t
  fields : List Field
  slots : List Slot
  meaning : String

/-- The node a form's witness elaborates to. The address function is
irrelevant to everything the guards read (tag, payload, expected tags),
so a constant one is enough. -/
private def noAddr : Addr32 := ⟨List.replicate 32 0, by simp⟩

private def noH : Bytes → Addr32 := fun _ => noAddr

def Form.node (f : Form) : Node := f.witness.2.node noH

/-- The form's payload width, when every field is fixed-width. -/
def Form.payloadBytes (f : Form) : Option Nat :=
  f.fields.foldr
    (fun d acc => match d.enc.bytes, acc with
      | some n, some m => some (n + m)
      | _, _ => none)
    (some 0)

/-- The smallest payload the form can write. -/
def Form.payloadMinBytes (f : Form) : Nat :=
  (f.fields.map (·.enc.minBytes)).sum

/-- A registry row's identity: a grammar sort, or a reserved tag that
is not (yet) a `Ty` constructor. -/
inductive RowId where
  | sort (t : Ty)
  | reserved (tag : UInt8)
  deriving DecidableEq, Repr

def RowId.wireTag : RowId → UInt8
  | .sort t => t.wireTag
  | .reserved tag => tag

/-- A row's standing in the registry. -/
inductive Status where
  /-- Ratified core (grammar grill ruling 2, 2026-08-28). -/
  | core
  /-- Ratified at opaque-payload revision 1 (the schema sort). -/
  | revision1
  /-- A registry row that is not a `Ty` constructor. -/
  | reserved
  deriving DecidableEq, Repr

def Status.wire : Status → String
  | .core => "RATIFIED core"
  | .revision1 => "RATIFIED (opaque-payload revision 1)"
  | .reserved => "RESERVED"

def Status.isReserved : Status → Bool
  | .reserved => true
  | _ => false

def Status.all : List Status := [.core, .revision1, .reserved]

theorem Status.all_complete (s : Status) : s ∈ Status.all := by
  cases s <;> decide

#guard decide ((Status.all.map Status.wire).Nodup)

/-- One registry row: a tag, the sort it names, its standing, the node
forms that write it, a conformance vector that exhibits it, and the
row's prose. -/
structure Row where
  id : RowId
  name : String
  status : Status
  forms : List Form
  exemplar : Option String
  notes : Prose

/-- The node envelope every sort's payload sits inside: the canonical
pre-image `Cas.encodeNode` writes. Stated once, because it is the same
for every row. -/
structure Envelope where
  fields : List Field
  refRecordBytes : Nat
  meaning : Prose

/-- The manifest: the whole data grammar's wire surface, as data. -/
structure Manifest where
  manifestVersion : Nat
  grammar : String
  scheme : Nat
  title : String
  preamble : List Prose
  envelope : Envelope
  rows : List Row
  closing : List Prose

/-! ## v0 -/

private def wValue : Tree .value := .value (Payload.ofBytes [1, 2, 3])
private def wChunk : Tree .chunk := .chunk (Payload.ofBytes [1, 2, 3])
private def wLeaf : Tree .tree := .leaf 0 3 wChunk
private def wParent : Tree .tree := .parent wLeaf wLeaf
private def wManifest : Tree .manifest := .manifest 1 3 1 wLeaf
private def wFile : Tree .file :=
  .file (Name.utf8 "a.txt") (Name.utf8 "text/plain") wManifest
private def wGenesis : Tree .entry := .genesis
private def wEntry : Tree .entry := .entry (Payload.ofBytes [1]) wFile wGenesis
private def wSchema : Tree .schema := .schema (Payload.ofBytes [123, 125])
/-- A git loose-object preimage: `"blob 1\0" ++ "x"`. -/
private def wGit : Tree .git :=
  .git (Payload.ofBytes [98, 108, 111, 98, 32, 49, 0, 120])

def envelopeV0 : Envelope where
  fields := [
    { name := "version", enc := .u8,
      meaning := "the scheme-version byte — scheme 0 for every row here" },
    { name := "tag", enc := .u8,
      meaning := "the sort's wire kind tag: the row this manifest gives it" },
    { name := "payload", enc := .framed,
      meaning := "the sort's payload bytes, self-delimiting" },
    { name := "refCount", enc := .beU32,
      meaning := "how many typed references follow" },
    { name := "refs", enc := .opaque,
      meaning := "refCount reference records, in order" }
  ]
  refRecordBytes := 33
  meaning := [
    .text "Every node is written as ", .code "version ++ tag ++ frame(payload) ++ nat32(refCount) ++ refs",
    .text " and its content address is the digest of exactly those bytes. \
The version and tag bytes lead so that the separation theorems can \
quantify over them; the payload is framed rather than trailing, so the \
reference count is reachable without knowing a sort. Each reference \
record is one expected-tag byte followed by a 32-byte address."]

def manifestV0 : Manifest where
  manifestVersion := 0
  grammar := "cas-grammar"
  scheme := 0
  title := "Kind-tag registry — scheme 0"
  preamble := [
    [.text "GENERATED — projection of ", .code "Cas.Grammar.manifestV0",
     .text " by ", .code "lake exe emitgrammar", .text "; do not edit. \
The layouts below are read off the encoders in ",
     .code "Cas/Grammar/Tree.lean", .text " through a witness term per \
form, so this document cannot drift from them."],
    [.text "The wire kind tags of the grammar's sorts (",
     .code "Cas/Grammar/Sorts.lean", .text ", ", .code "Ty.wireTag",
     .text "/", .code "Ty.ofTag", .text "). Ratified by the grammar \
grill (2026-08-28, rulings 2 and 3; recorded in ",
     .code "library/effects/IMPLEMENTATION-PLAN.md", .text " §14). Tags \
8, 9, and 10 are also the blob kinds of PROFILE-CAS-HTTP-0. A tag names \
one node form family; references type-check at tag granularity, so a row \
here is a contract on every wire."]
  ]
  envelope := envelopeV0
  rows := [
    { id := .sort .value, name := "value", status := .core
      exemplar := some "value-single"
      forms := [
        { name := "value", witness := ⟨.value, wValue⟩
          fields := [
            { name := "payload", enc := .opaque,
              meaning := "the value's bytes; nothing in the grammar reads them" }]
          slots := []
          meaning := "An opaque value payload." }]
      notes := [.text "Opaque value payload. A leaf: no references." ] },
    { id := .sort .chunk, name := "chunk", status := .core
      exemplar := some "blob-two-leaves"
      forms := [
        { name := "chunk", witness := ⟨.chunk, wChunk⟩
          fields := [
            { name := "bytes", enc := .opaque,
              meaning := "the chunk's bytes" }]
          slots := []
          meaning := "Position-free chunk data." }]
      notes := [.text "Position-free chunk data (profile blob kind). \
The chunk carries no index: position lives in the ", .code "tree",
        .text " leaf that names it, which is what lets one chunk be \
shared by two leaves."] },
    { id := .sort .tree, name := "tree", status := .core
      exemplar := some "blob-two-leaves"
      forms := [
        { name := "leaf", witness := ⟨.tree, wLeaf⟩
          fields := [
            { name := "index", enc := .beU32,
              meaning := "the leaf's absolute chunk index within the blob" },
            { name := "length", enc := .beU32,
              meaning := "the declared byte length of the chunk" }]
          slots := [
            { name := "data", expects := .chunk,
              meaning := "the chunk this leaf positions" }]
          meaning := "A blob leaf: a positioned pointer at one chunk." },
        { name := "parent", witness := ⟨.tree, wParent⟩
          fields := []
          slots := [
            { name := "left", expects := .tree, meaning := "the earlier subtree" },
            { name := "right", expects := .tree, meaning := "the later subtree" }]
          meaning := "A blob interior node: two ordered subtrees, no payload." }]
      notes := [.text "Blob leaf and interior node share one sort and \
one tag — references type-check at tag granularity, so a ", .code "tree",
        .text " edge accepts either. The forms are told apart by the \
payload: eight bytes for a leaf, none for an interior node."] },
    { id := .sort .manifest, name := "manifest", status := .core
      exemplar := some "blob-two-leaves"
      forms := [
        { name := "manifest", witness := ⟨.manifest, wManifest⟩
          fields := [
            { name := "recipe", enc := .beU32,
              meaning := "the chunking recipe id (1 = fixed-size chunks)" },
            { name := "totalBytes", enc := .beU64,
              meaning := "the blob's total byte length" },
            { name := "leafCount", enc := .beU32,
              meaning := "how many leaves the tree carries" }]
          slots := [
            { name := "root", expects := .tree,
              meaning := "the blob tree this manifest heads" }]
          meaning := "The recipe-1 blob manifest." }]
      notes := [.text "Recipe-1 blob manifest (profile blob kind). \
Sixteen payload bytes in this order: recipe, total, leaf count — the \
total is the only 64-bit field in the grammar."] },
    { id := .sort .file, name := "file", status := .core
      exemplar := some "file-readme"
      forms := [
        { name := "file", witness := ⟨.file, wFile⟩
          fields := [
            { name := "name", enc := .framed,
              meaning := "the file name, UTF-8, under 2^16 bytes" },
            { name := "mediaType", enc := .framed,
              meaning := "the media type, UTF-8, under 2^16 bytes" }]
          slots := [
            { name := "content", expects := .manifest,
              meaning := "the blob manifest holding the file's bytes" }]
          meaning := "A named file over a blob manifest." }]
      notes := [.text "Named file over a blob manifest. Both payload \
fields are framed, so the payload is self-delimiting; each is bounded \
under 2^16 bytes so the framed pair stays inside one node payload \
bound."] },
    { id := .sort .entry, name := "entry", status := .core
      exemplar := some "journal-two-entries"
      forms := [
        { name := "genesis", witness := ⟨.entry, wGenesis⟩
          fields := []
          slots := []
          meaning := "The journal's first entry: no note, no edges." },
        { name := "entry", witness := ⟨.entry, wEntry⟩
          fields := [
            { name := "note", enc := .opaque,
              meaning := "the entry's note bytes, uninterpreted" }]
          slots := [
            { name := "item", expects := .file,
              meaning := "the file this entry records" },
            { name := "prev", expects := .entry,
              meaning := "the entry before it" }]
          meaning := "One journal entry over a file, linked to its predecessor." }]
      notes := [.text "Journal entry or genesis. The sort does not fix \
its reference list: the codec constrains a reference's expected tag, \
never the arity, and the agent language writes a three-edge entry \
(context, value, entry) over this same tag. A reader dispatches on what \
it finds, not on this row."] },
    { id := .sort .context, name := "context", status := .core
      exemplar := none
      forms := []
      notes := [.text "Context node: typed edges, no payload. A ratified \
tag with NO grammar form — ", .code "Cas/Grammar/Tree.lean",
        .text " has no ", .code "context", .text " constructor, so \
nothing in the grammar writes this sort's layout. It is elaborated at \
the node layer by consumers (", .code "CasExamples.AgentStep.contextNode",
        .text "): empty payload, one typed edge per folded item, the \
edge tags read off whatever was loaded. Giving ", .code "context",
        .text " a grammar form is its own slice."] },
    { id := .reserved 14, name := "step", status := .reserved
      exemplar := none
      forms := []
      notes := [.text "F3 defunctionalized code point. Spelled as the \
bare def ", .code "Cas.Lang.stepWireTag", .text ", outside ", .code "Ty",
        .text ", and pinned against this row by ", .code "#guard",
        .text " in ", .code "Cas/Lang/Defun.lean", .text "."] },
    { id := .reserved 15, name := "cont", status := .reserved
      exemplar := none
      forms := []
      notes := [.text "F3 continuation. Spelled as the bare def ",
        .code "Cas.Lang.contWireTag", .text ", outside ", .code "Ty",
        .text ", and pinned against this row by ", .code "#guard",
        .text " in ", .code "Cas/Lang/Defun.lean", .text "."] },
    { id := .sort .git, name := "git", status := .core
      exemplar := some "git-pin-commit"
      forms := [
        { name := "git", witness := ⟨.git, wGit⟩
          fields := [
            { name := "object", enc := .opaque,
              meaning := "the git loose-object preimage: the type word, a space, the decimal byte length, a NUL, then the object's content" }]
          slots := []
          meaning := "A git object as content." }]
      notes := [.text "The estate's VERSIONING primitive (drafted \
2026-08-29; awaiting ratification). A git object enters the store as \
content: the payload IS the loose-object preimage — ",
        .code "\"<type> <length>\\0\" ++ content",
        .text " — so ", .code "sha1(payload)",
        .text " is the object's git id while the node's own address is \
the digest of its canonical pre-image. One node, two identities, \
neither declared in a field and both derivable by any host from the \
bytes alone. That dual identity is what makes the sort a versioning \
primitive rather than an import format: a commit admitted this way \
carries its git-side name with it, so pinning a dependency by revision \
and pinning it by content address name the same bytes, and the estate \
can hold a version without leaving the store. The exemplar is the ",
        .code "git-pin-commit", .text " vector — the lean4-tree-sitter \
pin commit as one node, its payload's SHA-1 the commit id it names. \
References are empty in v0: git's internal SHA-1 edges (a commit's tree \
and parents, a tree's entries) stay inside the payload rather than \
becoming typed CAS edges, exactly as the schema sort's ", .code "$defs",
        .text " graph does. Promoting them is the named follow-up, and \
is what would turn a pinned object into a walkable history."] },
    { id := .sort .schema, name := "schema", status := .revision1
      exemplar := some "schema-vector-document"
      forms := [
        { name := "schema", witness := ⟨.schema, wSchema⟩
          fields := [
            { name := "bytes", enc := .opaque,
              meaning := "the schema's canonical bytes, opaque at this layer" }]
          slots := []
          meaning := "A canonical schema as content." }]
      notes := [.text "Payload = the canonical JSON envelope of \
Effect's persistent ", .code "SchemaRepresentation",
        .text " document; references remain empty. Revision 0's tagged \
projection is read-compatible. The cross-runtime byte pin is gated; the \
revision-1 byte theorem remains pending. Typed schema-to-schema edges (",
        .code "$defs", .text " as real CAS references) are the named \
follow-up."] }
  ]
  closing := [
    [.text "Rows 1 and 11–13 were previously marked \"illustrative\"; \
ruling 2 ratifies all seven data sorts into core. Consumer extension \
(profiles, the GrammarSpec registration pattern) is a named follow-up, \
not retrofitted here; a new tag enters only through the grill with a \
real consumer."],
    [.text "Rows 14 and 15 carry a reconciliation debt on purpose: they \
are used by ", .code "Cas/Lang/Defun.lean", .text " but are NOT ",
     .code "Ty", .text " constructors, because growing ", .code "Ty",
     .text " is F3's own slice (a measured five-file amplification). The \
debt is machine-visible rather than prose-only — ", .code "Defun.lean",
     .text " guards both literals against this table AND guards that ",
     .code "Ty.ofTag", .text " still refuses both tags, so ratifying \
either row into ", .code "Ty", .text " turns that build red and names \
the site that must follow."]
  ]

/-! ## The completeness guards

The house registry discipline, plus the witness checks that make the
stated layouts derived rather than transcribed. -/

/-- Every (tag, form) pair the manifest declares. -/
private def formsOf (m : Manifest) : List (UInt8 × Form) :=
  m.rows.flatMap fun r => r.forms.map fun f => (r.id.wireTag, f)

/-- The row ids, in registry order. -/
def Manifest.ids (m : Manifest) : List RowId := m.rows.map Row.id

/-- The table is complete: every sort of the grammar has a row. -/
theorem manifestV0_rows_complete (t : Ty) :
    RowId.sort t ∈ manifestV0.ids := by
  cases t <;> decide

-- A sort row's name is the sort's own spelling.
#guard manifestV0.rows.all fun r =>
  match r.id with
  | .sort t => r.name == t.sortName
  | .reserved _ => true

-- One row per tag, one row per name.
#guard decide ((manifestV0.ids.map RowId.wireTag).Nodup)
#guard decide ((manifestV0.rows.map Row.name).Nodup)

-- Rows agree with `ofTag`: a sort row round-trips its tag, and a
-- reserved row is exactly a tag `ofTag` still refuses (the Defun
-- guards' other half, restated where the table lives).
#guard manifestV0.rows.all fun r =>
  match r.id with
  | .sort t => decide (Ty.ofTag r.id.wireTag = some t)
  | .reserved tag => (Ty.ofTag tag).isNone

-- Reserved rows are exactly the rows with reserved status.
#guard manifestV0.rows.all fun r =>
  (match r.id with | .reserved _ => true | .sort _ => false) == r.status.isReserved

-- A row carries no form exactly when it is reserved or is `context` —
-- the two exceptions, named out loud. Landing a `Tree.context`
-- constructor, or ratifying 14/15 into `Ty`, turns this red.
#guard manifestV0.rows.all fun r =>
  r.forms.isEmpty == (decide (r.id = RowId.sort .context) || r.status.isReserved)

-- Each form's witness is a term of its own row's sort.
#guard manifestV0.rows.all fun r =>
  r.forms.all fun f => decide (RowId.sort f.witness.1 = r.id)

-- Elaboration stamps the row's tag.
#guard (formsOf manifestV0).all fun (tag, f) => f.node.tag == tag

-- The declared reference discipline IS the witness's, in order.
#guard (formsOf manifestV0).all fun (_, f) =>
  f.node.refs.map Ref.expectedTag == f.slots.map fun s => s.expects.wireTag

-- A fixed-width layout states the witness's exact payload size.
#guard (formsOf manifestV0).all fun (_, f) =>
  match f.payloadBytes with
  | some n => f.node.payload.length == n
  | none => true

-- A variable layout states a real lower bound.
#guard (formsOf manifestV0).all fun (_, f) =>
  decide (f.payloadMinBytes ≤ f.node.payload.length)

-- The envelope is the codec's, not a retelling: two lead bytes, a
-- framed payload, a 32-bit count, then fixed-width reference records.
#guard (Cas.encodeNode ⟨0, 1, [7, 7, 7], []⟩).length
  == 1 + 1 + (4 + 3) + 4
#guard (Cas.encodeRef ⟨0, noAddr⟩).length == envelopeV0.refRecordBytes
#guard (Cas.encodeNode ⟨0, 1, [], [⟨9, noAddr⟩, ⟨9, noAddr⟩]⟩).length
  == 1 + 1 + 4 + 4 + 2 * envelopeV0.refRecordBytes

/-! ## The machine projection -/

/-- Two uppercase hex digits with the `0x` prefix — how a tag is
spelled in the estate's prose (payload hex stays lowercase; a tag is a
registry row, not payload bytes). -/
def hexTag (t : UInt8) : String :=
  "0x" ++ String.ofList ((Cas.hexS [t]).toList.map Char.toUpper)

def Field.toValue (d : Field) : Cas.Json.Value :=
  .obj ([
    ("name", .str d.name),
    ("encoding", .str d.enc.wire),
    ("minBytes", .nat d.enc.minBytes),
    ("meaning", .str d.meaning)] ++
    (match d.enc.bytes with
      | some n => [("bytes", Cas.Json.Value.nat n)]
      | none => []))

def Slot.toValue (s : Slot) : Cas.Json.Value :=
  .obj [
    ("name", .str s.name),
    ("expects", .str s.expects.sortName),
    ("expectsTag", .nat s.expects.wireTag.toNat),
    ("expectsTagHex", .str (hexTag s.expects.wireTag)),
    ("meaning", .str s.meaning)]

def Form.toValue (f : Form) : Cas.Json.Value :=
  .obj ([
    ("name", .str f.name),
    ("meaning", .str f.meaning),
    ("payloadMinBytes", .nat f.payloadMinBytes),
    ("fields", .arr (f.fields.map Field.toValue)),
    ("refs", .arr (f.slots.map Slot.toValue))] ++
    (match f.payloadBytes with
      | some n => [("payloadBytes", Cas.Json.Value.nat n)]
      | none => []))

def Row.toValue (r : Row) : Cas.Json.Value :=
  .obj [
    ("name", .str r.name),
    ("tag", .nat r.id.wireTag.toNat),
    ("tagHex", .str (hexTag r.id.wireTag)),
    ("status", .str r.status.wire),
    ("reserved", .bool r.status.isReserved),
    ("exemplar", match r.exemplar with
      | some v => .str v
      | none => .null),
    ("forms", .arr (r.forms.map Form.toValue)),
    ("notes", .str r.notes.plain)]

def Envelope.toValue (e : Envelope) : Cas.Json.Value :=
  .obj [
    ("fields", .arr (e.fields.map Field.toValue)),
    ("refRecordBytes", .nat e.refRecordBytes),
    ("meaning", .str e.meaning.plain)]

/-- The manifest as a JSON value (keys sort at render, per the house
printer). -/
def Manifest.toValue (m : Manifest) : Cas.Json.Value :=
  .obj [
    ("manifestVersion", .nat m.manifestVersion),
    ("grammar", .str m.grammar),
    ("scheme", .nat m.scheme),
    ("title", .str m.title),
    ("preamble", .arr (m.preamble.map fun p => .str p.plain)),
    ("envelope", m.envelope.toValue),
    ("sorts", .arr (m.rows.map Row.toValue)),
    ("closing", .arr (m.closing.map fun p => .str p.plain))]

/-! ## The human projection

`REGISTRY.md` itself: the registry is this manifest's Markdown
rendering, generated beside the JSON and byte-gated like it. There is
no second human spelling of the sort table anywhere in the estate. -/

private def bytesCell : Option Nat → Cell
  | some n => ⟨[.text (toString n)]⟩
  | none => ⟨[.text "variable"]⟩

private def fieldTable (fields : List Field) : Block :=
  .table {
    headers := #v["field", "encoding", "bytes", "meaning"]
    rows := fields.map fun d =>
      #v[⟨[.code d.name]⟩, ⟨[.code d.enc.wire]⟩, bytesCell d.enc.bytes,
         ⟨[.text d.meaning]⟩] }

private def slotTable (slots : List Slot) : Block :=
  .table {
    headers := #v["reference", "expects", "tag", "meaning"]
    rows := slots.map fun s =>
      #v[⟨[.code s.name]⟩, ⟨[.code s.expects.sortName]⟩,
         ⟨[.code (hexTag s.expects.wireTag)]⟩, ⟨[.text s.meaning]⟩] }

private def formBlocks (row : Row) (f : Form) : List Block :=
  [.h3 s!"{row.name}.{f.name}",
   .p [.text f.meaning],
   .ul [
     [.text "payload: ",
      .text (match f.payloadBytes, f.payloadMinBytes with
        | some n, _ => s!"{n} bytes"
        | none, 0 => "variable"
        | none, m => s!"variable, at least {m} bytes")],
     [.text "references: ",
      .text (if f.slots.isEmpty then "none"
        else String.intercalate ", " (f.slots.map fun s => s.name))]]] ++
  (if f.fields.isEmpty then [] else [fieldTable f.fields]) ++
  (if f.slots.isEmpty then [] else [slotTable f.slots])

/-- The registry document — `REGISTRY.md`. -/
def Manifest.toMarkdown (m : Manifest) : String :=
  let formless := m.rows.filter (·.forms.isEmpty)
  render <|
    [.h1 m.title] ++
    m.preamble.map Block.p ++
    [.h2 "The node envelope",
     .p m.envelope.meaning,
     fieldTable m.envelope.fields,
     .h2 "The sorts",
     .table {
       headers := #v["Tag (dec)", "Tag (hex)", "Sort", "Status", "Exemplar", "Notes"]
       rows := m.rows.map fun r =>
         #v[⟨[.text (toString r.id.wireTag.toNat)]⟩,
            ⟨[.code (hexTag r.id.wireTag)]⟩,
            ⟨[.code r.name]⟩,
            ⟨[.text r.status.wire]⟩,
            ⟨[match r.exemplar with
               | some v => .code v
               | none => .text "—"]⟩,
            ⟨r.notes⟩] }] ++
    m.closing.map Block.p ++
    [.h2 "Payload layout and reference discipline",
     .p [.text "One section per node form, read off the encoders in ",
         .code "Cas/Grammar/Tree.lean", .text " through a witness term. \
Rows with no form: ",
         .text (if formless.isEmpty then "none"
           else String.intercalate ", " (formless.map Row.name)),
         .text " — see their notes above."]] ++
    (m.rows.flatMap fun r => r.forms.flatMap (formBlocks r))

/-- The rendered projections — the bytes of the generated artifacts. -/
def document : String := Cas.Json.document manifestV0.toValue
def registry : String := manifestV0.toMarkdown

end Cas.Grammar
