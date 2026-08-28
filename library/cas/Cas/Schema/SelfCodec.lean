import Cas.Schema.Ast
import Cas.Values.Json

/-!
# Self-description — a code is a value

The named third increment of the schema plane: the codes' own JSON
projection, the schema-node envelope, and the canonical payload — the
Lean twin of the TypeScript side's `CanonicalSchema.payloadOf`
(`{"revision":0,"value":<ast>}` under the canonical compact rendering).
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
def schemaRevision : Nat := 0

/-- A pinned literal as a JSON value. -/
def LitVal.toJson : LitVal → Json.Value
  | .null => .null
  | .bool b => .bool b
  | .int i => .int i.val
  | .str s => .str s

mutual

/-- The tagged JSON projection of a code — field-for-field the encoded
form of the TypeScript `AstSchema` union (`_tag` discriminated; struct
fields as a name-keyed record of `{optional, schema}`). Key order here
is immaterial: the canonical rendering sorts at render time. -/
def Ast.toJson : Ast → Json.Value
  | .null => .obj [("_tag", .str "Null")]
  | .bool => .obj [("_tag", .str "Boolean")]
  | .int => .obj [("_tag", .str "Integer")]
  | .str => .obj [("_tag", .str "String")]
  | .lit v => .obj [("_tag", .str "Literal"), ("value", v.toJson)]
  | .arr a => .obj [("_tag", .str "Array"), ("item", a.toJson)]
  | .struct fs => .obj [("_tag", .str "Struct"), ("fields", .obj (fieldsToJson fs))]
  | .ref t => .obj [("_tag", .str "Ref"), ("tag", .nat t.toNat)]

/-- One record entry per struct field: `name ↦ {optional, schema}`. -/
def fieldsToJson : List (String × Bool × Ast) → List (String × Json.Value)
  | [] => []
  | (name, opt, a) :: fs =>
    (name, .obj [("optional", .bool opt), ("schema", a.toJson)]) :: fieldsToJson fs

end

/-- The schema-node envelope as a JSON value. -/
def Ast.envelope (a : Ast) : Json.Value :=
  .obj [("revision", .nat schemaRevision), ("value", a.toJson)]

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

/-! ## The projection's laws — canonical spelling, decode, round trip

The self-codec inherits the plane's discipline: under `WF` the
projection is canonically spelled (so `payload` hides no sort —
`payload_renderPlain`), and `ofJson` is its strict decoder with the
round trip proved, making the projection injective: one code per
payload value. -/

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

/-- The envelope of a well-formed code is canonical
(`"revision" < "value"`). -/
theorem envelope_canonical {a : Ast} (ha : a.WF) : a.envelope.Canonical := by
  refine ⟨?_, trivial, toJson_canonical a ha, trivial⟩
  refine List.Pairwise.cons (fun b hb => ?_) (List.pairwise_singleton _ _)
  simp only [List.mem_singleton] at hb
  subst hb
  show ("revision" : String) < "value"
  decide

/-- The byte binding for schema payloads: no reordering stands between
a well-formed code and its canonical bytes. -/
theorem payload_renderPlain {a : Ast} (ha : a.WF) :
    a.payload = Json.renderPlain a.envelope :=
  Json.renderCompact_eq_renderPlain _ (envelope_canonical ha)

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
  | _ => none

def ofJsonFields :
    List (String × Json.Value) → Option (List (String × Bool × Ast))
  | [] => some []
  | (n, .obj [("optional", .bool opt), ("schema", v)]) :: rest =>
    (Ast.ofJson v).bind fun a =>
    (ofJsonFields rest).map fun fs => (n, opt, a) :: fs
  | _ => none

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

theorem ofJsonFields_fieldsToJson :
    ∀ (fs : List (String × Bool × Ast)),
      ofJsonFields (fieldsToJson fs) = some fs
  | [] => rfl
  | (n, opt, a) :: fs => by
    simp only [fieldsToJson, ofJsonFields, ofJson_toJson a,
      ofJsonFields_fieldsToJson fs, Option.bind_some, Option.map_some]

end

/-- One code per projection value. -/
theorem toJson_inj {a b : Ast} (h : a.toJson = b.toJson) : a = b := by
  have ha := ofJson_toJson a
  rw [h, ofJson_toJson b] at ha
  injection ha with ha
  exact ha.symm

end Cas.Schema
