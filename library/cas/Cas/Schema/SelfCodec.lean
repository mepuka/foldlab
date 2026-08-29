import Cas.Schema.Ast
import Cas.Values.Json

/-!
# Self-description — a code is a value

The named third increment of the schema plane: the codes' own JSON
projection, the schema-node envelope, and the canonical payload — the
Lean twin of the TypeScript side's `CanonicalSchema.payloadOf`.
Revision 1 stores Effect's native persistent `SchemaRepresentation`
document. Revision 0's tagged projection remains below as the strict
compatibility decoder for already-addressed schema nodes.
This is the cross-runtime pin surface: the same code must yield the
same payload bytes in both runtimes, and `lake exe schemas --check`
holds the committed fixtures to it.

The projection is total and structural; the byte-level rendering
theorem binding it to `encode` and the store envelope remains the
increment's open obligation (pending, per the facade's increment
list) — nothing here claims it.
-/

namespace Cas.Schema

/-- The `.schema` sort's wire kind tag (grammar-grill ruling 3; the
Lean carrier of the TypeScript `SchemaKindTag`). -/
def schemaKindTag : UInt8 := 0x53

/-- The schema-node envelope revision (TS `CanonicalSchema.Revision`). -/
def schemaRevision : Nat := 1

/-- The retired tagged-projection revision, retained for read compatibility. -/
def legacySchemaRevision : Nat := 0

/-- A pinned literal as a JSON value. -/
def LitVal.toJson : LitVal → Json.Value
  | .null => .null
  | .bool b => .bool b
  | .int i => .int i.val
  | .str s => .str s

mutual

/-- The retired revision-0 tagged JSON projection of a code (`_tag`
discriminated; struct fields as a name-keyed record of `{optional, schema}`).
Key order here is immaterial: the canonical rendering sorts at render time. -/
def Ast.toJson : Ast → Json.Value
  | .null => .obj [("_tag", .str "Null")]
  | .bool => .obj [("_tag", .str "Boolean")]
  | .int => .obj [("_tag", .str "Integer")]
  | .str => .obj [("_tag", .str "String")]
  | .lit v => .obj [("_tag", .str "Literal"), ("value", v.toJson)]
  | .arr a => .obj [("_tag", .str "Array"), ("item", a.toJson)]
  | .struct fs => .obj [("_tag", .str "Struct"), ("fields", .obj (fieldsToJson fs))]
  | .ref t => .obj [("_tag", .str "Ref"), ("tag", .nat t.toNat)]
  | .decl id p ps => .obj [
      ("_tag", .str "Decl"),
      ("id", .str id.wire),
      ("payload", p.toJson),
      ("typeParameters", .arr (paramsToJson ps))]

/-- One record entry per struct field: `name ↦ {optional, schema}`. -/
def fieldsToJson : List (String × Bool × Ast) → List (String × Json.Value)
  | [] => []
  | (name, opt, a) :: fs =>
    (name, .obj [("optional", .bool opt), ("schema", a.toJson)]) :: fieldsToJson fs

/-- A declaration's type parameters, in order. -/
def paramsToJson : List Ast → List Json.Value
  | [] => []
  | a :: as => a.toJson :: paramsToJson as

end

/-! ## Effect Schema's persistent representation

The project-owned `Ast` remains the denotation (I-004). This projection
is the exact native Effect v4 `SchemaRepresentation.toJson` image of the
generated Effect Schema for the supported closed fragment. TypeScript
therefore consumes Effect's AST and representation directly; it does not
define a second schema-code algebra.
-/

private def keywordRepresentation (tag : String) : Json.Value :=
  .obj [("_tag", .str tag), ("checks", .arr [])]

private def intCheck : Json.Value :=
  .obj [
    ("_tag", .str "Filter"),
    ("aborted", .bool false),
    ("annotations", .obj [
      ("arbitrary", .obj [
        ("constraint", .obj [("integer", .bool true)])]),
      ("expected", .str "an integer")]),
    ("representation", .obj [
      ("id", .str "effect/schema/isInt"),
      ("payload", .null)])]

mutual

/-- Effect's native persistent representation of one schema code. -/
def Ast.toRepresentationJson : Ast → Json.Value
  | .null => keywordRepresentation "Null"
  | .bool => keywordRepresentation "Boolean"
  | .int => .obj [
      ("_tag", .str "Number"),
      ("checks", .arr [intCheck])]
  | .str => keywordRepresentation "String"
  | .lit .null => keywordRepresentation "Null"
  | .lit (.bool b) => .obj [
      ("_tag", .str "Literal"),
      ("checks", .arr []),
      ("literal", .obj [("type", .str "boolean"), ("value", .bool b)])]
  | .lit (.int i) => .obj [
      ("_tag", .str "Literal"),
      ("checks", .arr []),
      ("literal", .obj [("type", .str "number"), ("value", .int i.val)])]
  | .lit (.str s) => .obj [
      ("_tag", .str "Literal"),
      ("checks", .arr []),
      ("literal", .obj [("type", .str "string"), ("value", .str s)])]
  | .arr a => .obj [
      ("_tag", .str "Arrays"),
      ("checks", .arr []),
      ("elements", .arr []),
      ("rest", .arr [a.toRepresentationJson])]
  | .struct fs => .obj [
      ("_tag", .str "Objects"),
      ("checks", .arr []),
      ("indexSignatures", .arr []),
      ("propertySignatures", .arr (fieldsToRepresentationJson fs))]
  | .ref tag => .obj [
      ("_tag", .str "Declaration"),
      ("checks", .arr []),
      ("representation", .obj [
        ("id", .str "foldlab/cas/ref"),
        ("payload", .nat tag.toNat)]),
      ("typeParameters", .arr [])]
  | .decl id p ps => .obj [
      ("_tag", .str "Declaration"),
      ("checks", .arr []),
      ("representation", .obj [
        ("id", .str id.wire),
        ("payload", p.toJson)]),
      ("typeParameters", .arr (paramsToRepresentationJson ps))]

/-- Effect property-signature representations, preserving canonical field order. -/
def fieldsToRepresentationJson : List (String × Bool × Ast) → List Json.Value
  | [] => []
  | (name, opt, a) :: fs =>
    .obj [
      ("isMutable", .bool false),
      ("isOptional", .bool opt),
      ("name", .obj [("type", .str "string"), ("value", .str name)]),
      ("type", a.toRepresentationJson)] :: fieldsToRepresentationJson fs

/-- A declaration's type-parameter representations, in order. -/
def paramsToRepresentationJson : List Ast → List Json.Value
  | [] => []
  | a :: as => a.toRepresentationJson :: paramsToRepresentationJson as

end

/-- Effect's single-root persistent representation document. -/
def Ast.representationDocument (a : Ast) : Json.Value :=
  .obj [
    ("references", .obj []),
    ("representation", a.toRepresentationJson)]

/-- The retired revision-0 envelope, retained as a decoder pin. -/
def Ast.legacyEnvelope (a : Ast) : Json.Value :=
  .obj [("revision", .nat legacySchemaRevision), ("value", a.toJson)]

/-- The revision-1 schema-node envelope. -/
def Ast.envelope (a : Ast) : Json.Value :=
  .obj [("revision", .nat schemaRevision), ("value", a.representationDocument)]

/-- THE canonical payload: the compact canonical rendering of the
envelope — byte-for-byte the TypeScript `CanonicalSchema.payloadOf`. -/
def Ast.payload (a : Ast) : String :=
  Json.renderCompact a.envelope

/-- The payload's UTF-8 bytes — what the schema node carries and what
its content identity is computed over. -/
def Ast.payloadBytes (a : Ast) : ByteArray :=
  a.payload.toUTF8

end Cas.Schema

namespace Cas.Schema

/-! ## The revision-0 projection's laws — canonical spelling, decode, round trip

The self-codec inherits the plane's discipline: under `WF` the
retired tagged projection is canonically spelled
(`toJson_canonical`, `legacyEnvelope_canonical`,
`legacyEnvelope_renderPlain`), and `ofJson` is its strict decoder
with the round trip proved (`ofJson_toJson`), making the projection
injective (`toJson_inj`): one code per projection value. Every law
below is about revision 0. The live revision-1 representation
(`toRepresentationJson`/`envelope`/`payload`) has no canonicality
theorem, no decoder, and no round trip yet — it is held by the
cross-runtime byte pin alone, and its laws are the named open
obligation of this module. -/

open Cas.Json

/-- A pinned literal's image is scalar, hence canonical. -/
theorem LitVal.toJson_canonical (v : LitVal) : v.toJson.Canonical := by
  cases v <;> trivial

/-- The field record preserves the struct's key list verbatim. -/
theorem fieldsToJson_keys (fs : List (String × Bool × Ast)) :
    (fieldsToJson fs).map (·.1) = fs.map (fun f => f.1) := by
  induction fs with
  | nil => rfl
  | cons f rest ih =>
    obtain ⟨n, opt, a⟩ := f
    simp [fieldsToJson, ih]

mutual

/-- Under a well-formed code the projection is canonically spelled:
`_tag` leads every discriminated object, the fields record inherits
the struct's strict order, and `optional < schema` holds inside every
field entry. -/
theorem toJson_canonical : ∀ (a : Ast), a.WF → a.toJson.Canonical
  | .null, _ => by
    exact ⟨List.pairwise_singleton _ _, trivial, trivial⟩
  | .bool, _ => by
    exact ⟨List.pairwise_singleton _ _, trivial, trivial⟩
  | .int, _ => by
    exact ⟨List.pairwise_singleton _ _, trivial, trivial⟩
  | .str, _ => by
    exact ⟨List.pairwise_singleton _ _, trivial, trivial⟩
  | .lit v, _ => by
    refine ⟨?_, trivial, LitVal.toJson_canonical v, trivial⟩
    refine List.Pairwise.cons (fun b hb => ?_) (List.pairwise_singleton _ _)
    simp only [List.mem_singleton] at hb
    subst hb
    show ("_tag" : String) < "value"
    decide
  | .arr a, ha => by
    refine ⟨?_, trivial, toJson_canonical a ha, trivial⟩
    refine List.Pairwise.cons (fun b hb => ?_) (List.pairwise_singleton _ _)
    simp only [List.mem_singleton] at hb
    subst hb
    show ("_tag" : String) < "item"
    decide
  | .struct fs, ⟨hsorted, hwf⟩ => by
    refine ⟨?_, trivial, ⟨?_, fieldsToJson_canonical fs hwf⟩, trivial⟩
    · refine List.Pairwise.cons (fun b hb => ?_) (List.pairwise_singleton _ _)
      simp only [List.mem_singleton] at hb
      subst hb
      show ("_tag" : String) < "fields"
      decide
    · refine (List.pairwise_map).mp ?_
      rw [fieldsToJson_keys fs]
      exact (List.pairwise_map).mpr hsorted
  | .ref t, _ => by
    refine ⟨?_, trivial, trivial, trivial⟩
    refine List.Pairwise.cons (fun b hb => ?_) (List.pairwise_singleton _ _)
    simp only [List.mem_singleton] at hb
    subst hb
    show ("_tag" : String) < "tag"
    decide
  | .decl _ p ps, ⟨_, _, hps⟩ => by
    refine ⟨List.pairwise_map.mp
        (by decide :
          List.Pairwise (· < ·) ["_tag", "id", "payload", "typeParameters"]),
      trivial, trivial, DeclPayload.toJson_canonical p,
      paramsToJson_canonical ps hps, trivial⟩

theorem paramsToJson_canonical :
    ∀ (ps : List Ast), WFParams ps → CanonicalItems (paramsToJson ps)
  | [], _ => trivial
  | a :: as, ⟨ha, has⟩ =>
    ⟨toJson_canonical a ha, paramsToJson_canonical as has⟩

theorem fieldsToJson_canonical :
    ∀ (fs : List (String × Bool × Ast)), WFFields fs →
      CanonicalFields (fieldsToJson fs)
  | [], _ => trivial
  | (n, opt, a) :: fs, ⟨ha, hwf⟩ => by
    refine ⟨⟨?_, trivial, toJson_canonical a ha, trivial⟩,
      fieldsToJson_canonical fs hwf⟩
    refine List.Pairwise.cons (fun b hb => ?_) (List.pairwise_singleton _ _)
    simp only [List.mem_singleton] at hb
    subst hb
    show ("optional" : String) < "schema"
    decide

end

/-- The retired envelope of a well-formed code is canonical
(`"revision" < "value"`). -/
theorem legacyEnvelope_canonical {a : Ast} (ha : a.WF) :
    a.legacyEnvelope.Canonical := by
  refine ⟨?_, trivial, toJson_canonical a ha, trivial⟩
  refine List.Pairwise.cons (fun b hb => ?_) (List.pairwise_singleton _ _)
  simp only [List.mem_singleton] at hb
  subst hb
  show ("revision" : String) < "value"
  decide

/-- The revision-0 byte binding retained for compatibility auditing. -/
theorem legacyEnvelope_renderPlain {a : Ast} (ha : a.WF) :
    Json.renderCompact a.legacyEnvelope = Json.renderPlain a.legacyEnvelope :=
  Json.renderCompact_eq_renderPlain _ (legacyEnvelope_canonical ha)

/-! ## The strict decoder and the round trip -/

def LitVal.ofJson : Json.Value → Option LitVal
  | .null => some .null
  | .bool b => some (.bool b)
  | .int i =>
    if h : i.natAbs ≤ maxSafeNat then some (.int ⟨i, h⟩) else none
  | .str s => some (.str s)
  | _ => none

theorem LitVal.ofJson_toJson (v : LitVal) : LitVal.ofJson v.toJson = some v := by
  cases v with
  | int i =>
    simp only [LitVal.toJson, LitVal.ofJson, dif_pos i.property]
  | _ => rfl

mutual

/-- The strict decoder of the projection: exactly the spellings
`toJson` emits, nothing else. -/
def Ast.ofJson : Json.Value → Option Ast
  | .obj [("_tag", .str "Null")] => some .null
  | .obj [("_tag", .str "Boolean")] => some .bool
  | .obj [("_tag", .str "Integer")] => some .int
  | .obj [("_tag", .str "String")] => some .str
  | .obj [("_tag", .str "Literal"), ("value", v)] =>
    (LitVal.ofJson v).map .lit
  | .obj [("_tag", .str "Array"), ("item", v)] =>
    (Ast.ofJson v).map .arr
  | .obj [("_tag", .str "Struct"), ("fields", .obj kvs)] =>
    (ofJsonFields kvs).map .struct
  | .obj [("_tag", .str "Ref"), ("tag", .nat t)] =>
    if _h : t < 256 then some (.ref (UInt8.ofNat t)) else none
  | .obj [("_tag", .str "Decl"), ("id", .str w), ("payload", p),
      ("typeParameters", .arr tps)] =>
    match DeclarationId.General.ofWire w with
    | none => none
    | some g =>
      (DeclPayload.ofJson p).bind fun pay =>
      (ofJsonParams tps).map fun ps => .decl g pay ps
  | _ => none

def ofJsonFields :
    List (String × Json.Value) → Option (List (String × Bool × Ast))
  | [] => some []
  | (n, .obj [("optional", .bool opt), ("schema", v)]) :: rest =>
    (Ast.ofJson v).bind fun a =>
    (ofJsonFields rest).map fun fs => (n, opt, a) :: fs
  | _ => none

def ofJsonParams : List Json.Value → Option (List Ast)
  | [] => some []
  | v :: vs =>
    (Ast.ofJson v).bind fun a =>
    (ofJsonParams vs).map fun as => a :: as

end

mutual

/-- The round trip: the decoder answers every projection. With
`Option.some.inj` this makes the projection injective — one code per
payload value. -/
theorem ofJson_toJson : ∀ (a : Ast), Ast.ofJson a.toJson = some a
  | .null | .bool | .int | .str => rfl
  | .lit v => by
    simp only [Ast.toJson, Ast.ofJson, LitVal.ofJson_toJson v, Option.map_some]
  | .arr a => by
    simp only [Ast.toJson, Ast.ofJson, ofJson_toJson a, Option.map_some]
  | .struct fs => by
    simp only [Ast.toJson, Ast.ofJson, ofJsonFields_fieldsToJson fs,
      Option.map_some]
  | .ref t => by
    simp only [Ast.toJson, Ast.ofJson]
    rw [dif_pos (UInt8.toNat_lt_size t)]
    simp
  | .decl g p ps => by
    simp only [Ast.toJson, Ast.ofJson, DeclarationId.General.ofWire_wire g,
      DeclPayload.ofJson_toJson p, ofJsonParams_paramsToJson ps,
      Option.bind_some, Option.map_some]

theorem ofJsonFields_fieldsToJson :
    ∀ (fs : List (String × Bool × Ast)),
      ofJsonFields (fieldsToJson fs) = some fs
  | [] => rfl
  | (n, opt, a) :: fs => by
    simp only [fieldsToJson, ofJsonFields, ofJson_toJson a,
      ofJsonFields_fieldsToJson fs, Option.bind_some, Option.map_some]

theorem ofJsonParams_paramsToJson :
    ∀ (ps : List Ast), ofJsonParams (paramsToJson ps) = some ps
  | [] => rfl
  | a :: as => by
    simp only [paramsToJson, ofJsonParams, ofJson_toJson a,
      ofJsonParams_paramsToJson as, Option.bind_some, Option.map_some]

end

/-- One code per projection value. -/
theorem toJson_inj {a b : Ast} (h : a.toJson = b.toJson) : a = b := by
  have ha := ofJson_toJson a
  rw [h, ofJson_toJson b] at ha
  injection ha with ha
  exact ha.symm

end Cas.Schema

namespace Cas.Schema

/-! ## The revision-1 representation's laws — canonicality, decoder, round trip

The live revision's discipline, discharging the named open obligations
of this module. Three statements, in dependency order:

- `toRepresentationJson_canonical` / `representationDocument_canonical` /
  `envelope_canonical` — the representation is canonically spelled BY
  CONSTRUCTION, unconditionally: every emitted object's keys are already
  in strict codepoint order, and revision 1 carries a struct's property
  signatures as an ARRAY, so field-name order is not a canonicality
  premise (unlike revision 0, where the struct record's keys are the
  field names and `WF` is needed). `payload_renderPlain` is the byte
  consequence: the canonical payload hides no sort.
- `Ast.ofRepresentationJson` — the strict decoder: exactly the spellings
  `Ast.toRepresentationJson` emits, nothing else.
- `ofRepresentationJson_toRepresentationJson` — the round trip, stated
  MODULO the literal-null collapse.

### The literal-null collapse (register R13)

`Ast.toRepresentationJson` sends both `.null` and `.lit .null` to the
`Null` keyword — Effect's representation has no null literal. So the
revision-1 projection is NOT injective on `Ast`, and no decoder can
answer `some a` for every `a`. `Ast.repNorm` is that collapse as a
function on codes (the only two-to-one identification the projection
makes), `Ast.RepNormal` names its fixed points, and the laws are stated
against them: the round trip answers `a.repNorm`, injectivity holds up
to `repNorm`, and on `RepNormal` codes — every code the decoder can
ever produce — both hold on the nose.

### The general declaration code adds no second collapse

Increment C-decl grows `Ast.decl` (a registry id, a first-order
payload, the type parameters) and `declOfRepresentation` — the
registry-driven dispatch every persisted `Declaration` goes through.
It introduces NO new identification: `Ast.repNorm_decl` shows the
normal form rewrites only the type parameters, and
`decl_wire_ne_casRef` shows why nothing more is owed — the general code
cannot spell row zero (`foldlab/cas/ref`), which keeps the dedicated
code `.ref` the unique spelling of its own representation. -/

open Cas.Json

/-! ### Canonicality -/

/-- The `isInt` check is canonically spelled: `_tag < aborted <
annotations < representation`, and `arbitrary < expected` inside. -/
private theorem intCheck_canonical : intCheck.Canonical := by
  unfold intCheck
  repeat' first | exact True.intro | decide | apply And.intro

/-- Every keyword representation is canonically spelled (`_tag < checks`). -/
private theorem keywordRepresentation_canonical (tag : String) :
    (keywordRepresentation tag).Canonical :=
  ⟨List.pairwise_map.mp (by decide : List.Pairwise (· < ·) ["_tag", "checks"]),
    trivial, trivial, trivial⟩

mutual

/-- The representation is canonically spelled by construction — no
well-formedness premise: revision 1 keys every object with a fixed,
alphabetically ordered key set, and carries a struct's fields as an
array rather than as a record, so no field name ever becomes a key. -/
theorem toRepresentationJson_canonical :
    ∀ (a : Ast), a.toRepresentationJson.Canonical
  | .null => keywordRepresentation_canonical _
  | .bool => keywordRepresentation_canonical _
  | .str => keywordRepresentation_canonical _
  | .lit .null => keywordRepresentation_canonical _
  | .int =>
    ⟨List.pairwise_map.mp (by decide : List.Pairwise (· < ·) ["_tag", "checks"]),
      trivial, ⟨intCheck_canonical, trivial⟩, trivial⟩
  | .lit (.bool _) | .lit (.int _) | .lit (.str _) =>
    ⟨List.pairwise_map.mp
        (by decide : List.Pairwise (· < ·) ["_tag", "checks", "literal"]),
      trivial, trivial,
      ⟨List.pairwise_map.mp (by decide : List.Pairwise (· < ·) ["type", "value"]),
        trivial, trivial, trivial⟩,
      trivial⟩
  | .arr a =>
    ⟨List.pairwise_map.mp
        (by decide :
          List.Pairwise (· < ·) ["_tag", "checks", "elements", "rest"]),
      trivial, trivial, trivial,
      ⟨toRepresentationJson_canonical a, trivial⟩, trivial⟩
  | .struct fs =>
    ⟨List.pairwise_map.mp
        (by decide :
          List.Pairwise (· < ·)
            ["_tag", "checks", "indexSignatures", "propertySignatures"]),
      trivial, trivial, trivial, fieldsToRepresentationJson_canonical fs, trivial⟩
  | .ref _ =>
    ⟨List.pairwise_map.mp
        (by decide :
          List.Pairwise (· < ·)
            ["_tag", "checks", "representation", "typeParameters"]),
      trivial, trivial,
      ⟨List.pairwise_map.mp (by decide : List.Pairwise (· < ·) ["id", "payload"]),
        trivial, trivial, trivial⟩,
      trivial, trivial⟩
  | .decl _ p ps =>
    ⟨List.pairwise_map.mp
        (by decide :
          List.Pairwise (· < ·)
            ["_tag", "checks", "representation", "typeParameters"]),
      trivial, trivial,
      ⟨List.pairwise_map.mp (by decide : List.Pairwise (· < ·) ["id", "payload"]),
        trivial, DeclPayload.toJson_canonical p, trivial⟩,
      paramsToRepresentationJson_canonical ps, trivial⟩

/-- A declaration's type-parameter representations are canonically
spelled — like every other representation, by construction. -/
theorem paramsToRepresentationJson_canonical :
    ∀ (ps : List Ast), CanonicalItems (paramsToRepresentationJson ps)
  | [] => trivial
  | a :: as =>
    ⟨toRepresentationJson_canonical a, paramsToRepresentationJson_canonical as⟩

/-- Every emitted property signature is canonically spelled
(`isMutable < isOptional < name < type`, and `type < value` inside the
name). -/
theorem fieldsToRepresentationJson_canonical :
    ∀ (fs : List (String × Bool × Ast)),
      CanonicalItems (fieldsToRepresentationJson fs)
  | [] => trivial
  | (_, _, a) :: fs =>
    ⟨⟨List.pairwise_map.mp
        (by decide :
          List.Pairwise (· < ·) ["isMutable", "isOptional", "name", "type"]),
      trivial, trivial,
      ⟨List.pairwise_map.mp (by decide : List.Pairwise (· < ·) ["type", "value"]),
        trivial, trivial, trivial⟩,
      toRepresentationJson_canonical a, trivial⟩,
      fieldsToRepresentationJson_canonical fs⟩

end

/-- The single-root document is canonically spelled
(`references < representation`). -/
theorem representationDocument_canonical (a : Ast) :
    a.representationDocument.Canonical :=
  ⟨List.pairwise_map.mp
      (by decide : List.Pairwise (· < ·) ["references", "representation"]),
    ⟨List.Pairwise.nil, trivial⟩, toRepresentationJson_canonical a, trivial⟩

/-- The revision-1 envelope is canonically spelled (`revision < value`). -/
theorem envelope_canonical (a : Ast) : a.envelope.Canonical :=
  ⟨List.pairwise_map.mp
      (by decide : List.Pairwise (· < ·) ["revision", "value"]),
    trivial, representationDocument_canonical a, trivial⟩

/-- THE byte consequence: the canonical payload performs no reordering —
the payload bytes are the structural fold of the envelope as spelled. -/
theorem payload_renderPlain (a : Ast) :
    a.payload = Json.renderPlain a.envelope :=
  Json.renderCompact_eq_renderPlain _ (envelope_canonical a)

/-! ### The literal-null collapse, as a function -/

mutual

/-- The revision-1 normal form: `.lit .null` rewritten to `.null`, the
one identification `toRepresentationJson` makes (register R13). -/
def Ast.repNorm : Ast → Ast
  | .lit .null => .null
  | .arr a => .arr a.repNorm
  | .struct fs => .struct (repNormFields fs)
  | .decl id p ps => .decl id p (repNormParams ps)
  | a => a

def repNormFields :
    List (String × Bool × Ast) → List (String × Bool × Ast)
  | [] => []
  | (n, o, a) :: fs => (n, o, a.repNorm) :: repNormFields fs

/-- The general declaration code adds NO collapse of its own: this arm
rewrites the type parameters and nothing else, so the id and the
payload survive verbatim. That is by construction, not by luck —
`DeclarationId.General` excludes the registry rows that already have a
dedicated code, so no representation ever has two spellings
(`DeclarationId.General.row_not_dedicated`). The literal-null
identification stays the only two-to-one map the revision-1 projection
makes. -/
def repNormParams : List Ast → List Ast
  | [] => []
  | a :: as => a.repNorm :: repNormParams as

end

/-- A code the revision-1 projection identifies with nothing else:
its own normal form. -/
def Ast.RepNormal (a : Ast) : Prop := a.repNorm = a

mutual

/-- The normal form is a normal form. -/
theorem Ast.repNorm_idem : ∀ (a : Ast), a.repNorm.repNorm = a.repNorm
  | .null | .bool | .int | .str | .ref _ => rfl
  | .lit .null => rfl
  | .lit (.bool _) | .lit (.int _) | .lit (.str _) => rfl
  | .arr a => by
    simp only [Ast.repNorm, Ast.repNorm_idem a]
  | .struct fs => by
    simp only [Ast.repNorm, repNormFields_idem fs]
  | .decl _ _ ps => by
    simp only [Ast.repNorm, repNormParams_idem ps]

theorem repNormFields_idem :
    ∀ (fs : List (String × Bool × Ast)),
      repNormFields (repNormFields fs) = repNormFields fs
  | [] => rfl
  | (n, o, a) :: fs => by
    simp only [repNormFields, Ast.repNorm_idem a, repNormFields_idem fs]

theorem repNormParams_idem :
    ∀ (ps : List Ast), repNormParams (repNormParams ps) = repNormParams ps
  | [] => rfl
  | a :: as => by
    simp only [repNormParams, Ast.repNorm_idem a, repNormParams_idem as]

end

/-- Every normal form is `RepNormal`. -/
theorem Ast.repNorm_repNormal (a : Ast) : a.repNorm.RepNormal :=
  Ast.repNorm_idem a

/-- THE no-new-collapse statement for increment C-decl: on a general
declaration the normal form rewrites the type parameters and NOTHING
else — the id and the payload survive verbatim. So the general code
identifies no two declarations that differ in id or payload, and the
literal-null identification (register R13) remains the only two-to-one
map the revision-1 projection makes. -/
theorem Ast.repNorm_decl (g : DeclarationId.General) (p : DeclPayload)
    (ps : List Ast) :
    (Ast.decl g p ps).repNorm = .decl g p (repNormParams ps) := rfl

/-- Why there is no new collapse to make: the general code never
spells row zero, so no general declaration projects onto the dedicated
code's representation. This is `DeclarationId.General.row_not_dedicated`
read at the wire. -/
theorem decl_wire_ne_casRef (g : DeclarationId.General) :
    g.wire ≠ DeclarationId.casRef.wire := by
  cases g <;> decide

mutual

/-- Normalization is invisible to the projection: the collapse is
exactly what the encoder already performs. -/
theorem toRepresentationJson_repNorm :
    ∀ (a : Ast), a.repNorm.toRepresentationJson = a.toRepresentationJson
  | .null | .bool | .int | .str | .ref _ => rfl
  | .lit .null => rfl
  | .lit (.bool _) | .lit (.int _) | .lit (.str _) => rfl
  | .arr a => by
    simp only [Ast.repNorm, Ast.toRepresentationJson,
      toRepresentationJson_repNorm a]
  | .struct fs => by
    simp only [Ast.repNorm, Ast.toRepresentationJson,
      fieldsToRepresentationJson_repNorm fs]
  | .decl _ _ ps => by
    simp only [Ast.repNorm, Ast.toRepresentationJson,
      paramsToRepresentationJson_repNorm ps]

theorem fieldsToRepresentationJson_repNorm :
    ∀ (fs : List (String × Bool × Ast)),
      fieldsToRepresentationJson (repNormFields fs) =
        fieldsToRepresentationJson fs
  | [] => rfl
  | (n, o, a) :: fs => by
    simp only [repNormFields, fieldsToRepresentationJson,
      toRepresentationJson_repNorm a, fieldsToRepresentationJson_repNorm fs]

theorem paramsToRepresentationJson_repNorm :
    ∀ (ps : List Ast),
      paramsToRepresentationJson (repNormParams ps) =
        paramsToRepresentationJson ps
  | [] => rfl
  | a :: as => by
    simp only [repNormParams, paramsToRepresentationJson,
      toRepresentationJson_repNorm a, paramsToRepresentationJson_repNorm as]

end

/-- Normalization preserves a declaration's arity — it rewrites the
type parameters in place. -/
theorem repNormParams_length :
    ∀ (ps : List Ast), (repNormParams ps).length = ps.length
  | [] => rfl
  | a :: as => by
    simp only [repNormParams, List.length_cons, repNormParams_length as]

mutual

/-- Well-formedness survives normalization: the collapse rewrites leaves
only, so no struct's field names move. -/
theorem Ast.repNorm_wf : ∀ (a : Ast), a.WF → a.repNorm.WF
  | .null, h | .bool, h | .int, h | .str, h | .ref _, h => h
  | .lit .null, _ => trivial
  | .lit (.bool _), h | .lit (.int _), h | .lit (.str _), h => h
  | .arr a, h => Ast.repNorm_wf a h
  | .struct fs, ⟨hsorted, hwf⟩ => by
    refine ⟨?_, repNormFields_wf fs hwf⟩
    have hkeys : (repNormFields fs).map (fun f => f.1) = fs.map (fun f => f.1) :=
      repNormFields_keys fs
    exact List.pairwise_map.mp (hkeys ▸ List.pairwise_map.mpr hsorted)
  | .decl _ _ ps, ⟨hp, harity, hps⟩ =>
    ⟨hp, (repNormParams_length ps).trans harity, repNormParams_wf ps hps⟩

theorem repNormFields_wf :
    ∀ (fs : List (String × Bool × Ast)), WFFields fs → WFFields (repNormFields fs)
  | [], _ => trivial
  | (_, _, a) :: fs, ⟨ha, hfs⟩ => ⟨Ast.repNorm_wf a ha, repNormFields_wf fs hfs⟩

theorem repNormParams_wf :
    ∀ (ps : List Ast), WFParams ps → WFParams (repNormParams ps)
  | [], _ => trivial
  | a :: as, ⟨ha, has⟩ => ⟨Ast.repNorm_wf a ha, repNormParams_wf as has⟩

theorem repNormFields_keys :
    ∀ (fs : List (String × Bool × Ast)),
      (repNormFields fs).map (fun f => f.1) = fs.map (fun f => f.1)
  | [] => rfl
  | (n, o, a) :: fs => by
    simp only [repNormFields, List.map_cons, repNormFields_keys fs]

end

/-! ### The strict decoder -/

/-- The one admitted check spelling: Effect's `effect/schema/isInt`,
exactly as `intCheck` emits it. -/
private def isIntCheck : Json.Value → Bool
  | .obj [
      ("_tag", .str "Filter"),
      ("aborted", .bool false),
      ("annotations", .obj [
        ("arbitrary", .obj [
          ("constraint", .obj [("integer", .bool true)])]),
        ("expected", .str "an integer")]),
      ("representation", .obj [
        ("id", .str "effect/schema/isInt"),
        ("payload", .null)])] => true
  | _ => false

/-- The typed-literal payload: Effect's `{type, value}` pair. There is
no null spelling — a null literal is the `Null` keyword (register R13). -/
private def litOfRepresentationJson : Json.Value → Option LitVal
  | .obj [("type", .str "boolean"), ("value", .bool b)] => some (.bool b)
  | .obj [("type", .str "number"), ("value", .int i)] =>
    if h : i.natAbs ≤ maxSafeNat then some (.int ⟨i, h⟩) else none
  | .obj [("type", .str "string"), ("value", .str s)] => some (.str s)
  | _ => none

/-- The general declaration code, from its decoded parts. -/
private def generalDeclOf (g : DeclarationId.General) (p : Json.Value)
    (ps : List Ast) : Option Ast :=
  (DeclPayload.ofJson p).map fun pay => .decl g pay ps

/-- THE declaration gate: a persisted `{id, payload}` and its decoded
type parameters, dispatched through the registry.

Row zero answers the DEDICATED code (`.ref`); every general row answers
the general code (`.decl`); an id that is no row at all is refused —
which is exactly the allowlist P4 requires, and the refusal the door
names `IngestRefusal.unknownDeclaration`. The match is exhaustive over
`DeclarationId`, so a new registry row cannot be added without
dispositioning it here. -/
def declOfRepresentation (w : String) (p : Json.Value) (ps : List Ast) :
    Option Ast :=
  match DeclarationId.ofWire w with
  | none => none
  | some .casRef =>
    match p, ps with
    | .nat tag, [] => if _h : tag < 256 then some (.ref (UInt8.ofNat tag)) else none
    | _, _ => none
  | some .effectDate => generalDeclOf .date p ps
  | some .effectUrl => generalDeclOf .url p ps
  | some .effectOption => generalDeclOf .option p ps

mutual

/-- The strict decoder of the revision-1 representation: exactly the
spellings `Ast.toRepresentationJson` emits, key order and all, nothing
else. Every foreign spelling dies here; normalization is the caller's
job (`Cas.Schema.ingest`). -/
def Ast.ofRepresentationJson : Json.Value → Option Ast
  | .obj [("_tag", .str "Null"), ("checks", .arr [])] => some .null
  | .obj [("_tag", .str "Boolean"), ("checks", .arr [])] => some .bool
  | .obj [("_tag", .str "String"), ("checks", .arr [])] => some .str
  | .obj [("_tag", .str "Number"), ("checks", .arr [c])] =>
    if isIntCheck c then some .int else none
  | .obj [("_tag", .str "Literal"), ("checks", .arr []), ("literal", l)] =>
    (litOfRepresentationJson l).map .lit
  | .obj [("_tag", .str "Arrays"), ("checks", .arr []), ("elements", .arr []),
      ("rest", .arr [item])] =>
    (Ast.ofRepresentationJson item).map .arr
  | .obj [("_tag", .str "Objects"), ("checks", .arr []),
      ("indexSignatures", .arr []), ("propertySignatures", .arr ps)] =>
    (ofRepresentationProperties ps).map .struct
  | .obj [("_tag", .str "Declaration"), ("checks", .arr []),
      ("representation", .obj [("id", .str w), ("payload", p)]),
      ("typeParameters", .arr tps)] =>
    (ofRepresentationParams tps).bind fun ps => declOfRepresentation w p ps
  | _ => none

/-- The property-signature list decoder, preserving order verbatim. -/
private def ofRepresentationProperties :
    List Json.Value → Option (List (String × Bool × Ast))
  | [] => some []
  | .obj [("isMutable", .bool false), ("isOptional", .bool opt),
      ("name", .obj [("type", .str "string"), ("value", .str n)]),
      ("type", t)] :: rest =>
    (Ast.ofRepresentationJson t).bind fun a =>
    (ofRepresentationProperties rest).map fun fs => (n, opt, a) :: fs
  | _ => none

/-- The type-parameter list decoder, preserving order verbatim. -/
def ofRepresentationParams : List Json.Value → Option (List Ast)
  | [] => some []
  | v :: vs =>
    (Ast.ofRepresentationJson v).bind fun a =>
    (ofRepresentationParams vs).map fun as => a :: as

end

/-- The document decoder: a single-root document with an EMPTY
references table. A non-empty table is refused — revision 1's
`references` is unreachable from the Lean side today (no `Suspend`, no
`Reference` constructor), so admitting one would answer a code the
projection cannot re-emit. -/
def Ast.ofRepresentationDocument : Json.Value → Option Ast
  | .obj [("references", .obj []), ("representation", r)] =>
    Ast.ofRepresentationJson r
  | _ => none

/-- The envelope decoder: revision 1 only. Revision 0 has its own door
(`ingestLegacy`); every other revision is refused. -/
def Ast.ofEnvelope : Json.Value → Option Ast
  | .obj [("revision", .nat r), ("value", d)] =>
    if r = schemaRevision then Ast.ofRepresentationDocument d else none
  | _ => none

/-! ### The round trip -/

mutual

/-- The round trip, modulo the literal-null collapse: the decoder
answers every projection with the projected code's normal form. On
`RepNormal` codes — which is every code the decoder itself produces —
it answers the code on the nose (`ofRepresentationJson_toRepresentationJson'`). -/
theorem ofRepresentationJson_toRepresentationJson :
    ∀ (a : Ast),
      Ast.ofRepresentationJson a.toRepresentationJson = some a.repNorm
  | .null | .bool | .int | .str => rfl
  | .lit .null => rfl
  | .lit (.bool _) | .lit (.str _) => rfl
  | .lit (.int i) => by
    simp only [Ast.toRepresentationJson, Ast.ofRepresentationJson,
      litOfRepresentationJson, dif_pos i.property, Option.map_some,
      Ast.repNorm]
  | .arr a => by
    simp only [Ast.toRepresentationJson, Ast.ofRepresentationJson,
      ofRepresentationJson_toRepresentationJson a, Option.map_some, Ast.repNorm]
  | .struct fs => by
    simp only [Ast.toRepresentationJson, Ast.ofRepresentationJson,
      ofRepresentationProperties_fieldsToRepresentationJson fs,
      Option.map_some, Ast.repNorm]
  | .ref t => by
    simp only [Ast.toRepresentationJson, Ast.ofRepresentationJson,
      ofRepresentationParams, Option.bind_some, declOfRepresentation,
      DeclarationId.ofWire]
    rw [dif_pos (UInt8.toNat_lt_size t)]
    simp [Ast.repNorm]
  | .decl g p ps => by
    cases g <;>
      simp only [Ast.toRepresentationJson, Ast.ofRepresentationJson,
        DeclarationId.General.wire, DeclarationId.General.row,
        DeclarationId.wire,
        ofRepresentationParams_paramsToRepresentationJson ps,
        Option.bind_some, declOfRepresentation, DeclarationId.ofWire,
        generalDeclOf, DeclPayload.ofJson_toJson p, Option.map_some,
        Ast.repNorm]

theorem ofRepresentationParams_paramsToRepresentationJson :
    ∀ (ps : List Ast),
      ofRepresentationParams (paramsToRepresentationJson ps) =
        some (repNormParams ps)
  | [] => rfl
  | a :: as => by
    simp only [paramsToRepresentationJson, ofRepresentationParams,
      ofRepresentationJson_toRepresentationJson a,
      ofRepresentationParams_paramsToRepresentationJson as,
      Option.bind_some, Option.map_some, repNormParams]

theorem ofRepresentationProperties_fieldsToRepresentationJson :
    ∀ (fs : List (String × Bool × Ast)),
      ofRepresentationProperties (fieldsToRepresentationJson fs) =
        some (repNormFields fs)
  | [] => rfl
  | (n, opt, a) :: fs => by
    simp only [fieldsToRepresentationJson, ofRepresentationProperties,
      ofRepresentationJson_toRepresentationJson a,
      ofRepresentationProperties_fieldsToRepresentationJson fs,
      Option.bind_some, Option.map_some, repNormFields]

end

/-- The round trip on normal codes: exactly the code back. -/
theorem ofRepresentationJson_toRepresentationJson' {a : Ast}
    (ha : a.RepNormal) : Ast.ofRepresentationJson a.toRepresentationJson = some a := by
  rw [ofRepresentationJson_toRepresentationJson a, ha]

/-- The document round trip. -/
theorem ofRepresentationDocument_representationDocument (a : Ast) :
    Ast.ofRepresentationDocument a.representationDocument = some a.repNorm :=
  ofRepresentationJson_toRepresentationJson a

/-- The envelope round trip. -/
theorem ofEnvelope_envelope (a : Ast) :
    Ast.ofEnvelope a.envelope = some a.repNorm := by
  show (if schemaRevision = schemaRevision then
      Ast.ofRepresentationDocument a.representationDocument else none) = _
  rw [if_pos rfl]
  exact ofRepresentationDocument_representationDocument a

/-- The envelope round trip on normal codes. -/
theorem ofEnvelope_envelope' {a : Ast} (ha : a.RepNormal) :
    Ast.ofEnvelope a.envelope = some a := by
  rw [ofEnvelope_envelope a, ha]

/-! ### Injectivity -/

/-- One normal code per representation value: the projection is
injective up to the literal-null collapse, and that collapse is the
only identification it makes. -/
theorem toRepresentationJson_inj {a b : Ast}
    (h : a.toRepresentationJson = b.toRepresentationJson) :
    a.repNorm = b.repNorm := by
  have ha := ofRepresentationJson_toRepresentationJson a
  rw [h, ofRepresentationJson_toRepresentationJson b] at ha
  injection ha with ha
  exact ha.symm

/-- On normal codes the projection is injective outright. -/
theorem toRepresentationJson_inj' {a b : Ast}
    (ha : a.RepNormal) (hb : b.RepNormal)
    (h : a.toRepresentationJson = b.toRepresentationJson) : a = b := by
  have := toRepresentationJson_inj h
  rwa [ha, hb] at this

/-- One normal code per envelope value. -/
theorem envelope_inj {a b : Ast} (h : a.envelope = b.envelope) :
    a.repNorm = b.repNorm := by
  have ha := ofEnvelope_envelope a
  rw [h, ofEnvelope_envelope b] at ha
  injection ha with ha
  exact ha.symm

/-! ### Named open obligation — decoder soundness for `RepNormal`

`Ast.ofRepresentationJson` has no `.lit .null` arm — the only `.lit`
it can answer comes from `litOfRepresentationJson`, which has no null
spelling — so its image is contained in `RepNormal`:

    ofRepresentationJson_repNormal :
      ∀ {v : Json.Value} {a : Ast},
        Ast.ofRepresentationJson v = some a → a.RepNormal

With that and `ofRepresentationJson_toRepresentationJson'`, `RepNormal`
is exactly the subset the revision-1 projection is a bijection onto.
It is NOT proved here. Lean 4.33 generates no functional-induction
principle for a mutually recursive definition (`fun_induction` reports
"No functional induction theorem ... or function is mutually
recursive"), so the proof wants either a hand-written mutual recursion
mirroring all nine decoder arms or a restructuring of the decoder into
a non-mutual shape — a Slice-C-sized change to a frozen statement, not
a proof edit. Nothing in this module or in `Cas.Schema.ingest` depends
on it: the exactness laws take `RepNormal` as an explicit hypothesis
(`ingest_envelope'`, `ofEnvelope_envelope'`) and hold unconditionally
in their `repNorm` form. -/

end Cas.Schema
