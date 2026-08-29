import Cas.Schema.SelfCodec
import Cas.Schema.PayloadInj
import Cas.Values.Canonicalize

/-!
# The ingestion door — foreign spelling in, canonical code out

The acquisition loop applied to the schema plane: a foreign JSON value
(a hoovered carrier, a model-minted schema — any spelling) is
NORMALIZED by the key-sorting method (`canonValue`), strictly DECODED,
and GATED by the runtime well-formedness check (`Ast.wf`, the boolean
twin of `Ast.WF`). The door is total and every refusal is named; the
foreign spelling dies at the boundary and only substance survives.

The door speaks REVISION 1 — Effect's native persistent
`SchemaRepresentation` document, wrapped in the schema-node envelope.
That is the form the live plane emits (`Ast.envelope`,
`CanonicalSchema.payloadOf`), so `ingest` can ingest what the plane
actually writes. `ingestLegacy` keeps the retired revision-0 tagged
spelling readable for already-addressed nodes; it is a
read-compatibility arm, not the door.

Population through this door is coordination-free by construction:
`ingest` is pure, the answered code is canonical, and admission is
content-addressed — the same code from any spelling lands at the same
address, and duplicates are inert.

What is proved:

- `Ast.wf_iff` — the boolean gate decides exactly `Ast.WF`;
- `ingest_wf` — the door answers only well-formed codes;
- `ingest_envelope` — the canonical image is fixed: a well-formed
  code's own revision-1 envelope ingests to exactly that code's
  revision-1 normal form, and to the code itself when the code is
  `RepNormal` (`ingest_envelope'`). The normalizer is a no-op on the
  envelope because `envelope_canonical` says it is already canonically
  spelled — the exactness law needs no canonicality hypothesis;
- `ingestLegacy_wf` / `ingestLegacy_toJson` — the same two laws for
  the revision-0 arm, unchanged in substance;
- `ingestBytes_wf` / `ingestBytes_payload` — the same two laws for the
  BYTES door (below), which is `Cas.Json.parse` composed with this one.

The declaration allowlist (increment C-decl) is enforced here and
nowhere else on the failure path: `Ast.ofEnvelope` refuses a
`Declaration` whose id is no row of `Cas.Schema.DeclarationId`, and
`refusalOf` names that refusal `unknownDeclaration` instead of letting
it read as a shape failure. The gate `Ast.wf` grew the row's own
discipline with it — payload shape and type-parameter count, read off
the registry — so `ingest_wf` and `ingest_envelope` hold over the grown
carrier with their statements unchanged.

The union code (increment C1) is gated the same way and needs no new
refusal. Its ONE discipline is nonemptiness — the empty union is
`Never`, which is not admitted — so an empty `types` array decodes as a
shape and is refused `illFormed` by the gate, exactly as an unsorted
struct is. A `mode` outside the table is not a union spelling at all
and dies in the decoder as `notASchema`. Member ORDER is never tested,
because order is the identity: there is no canonical arrangement to
demand and nothing on this path sorts.

The enum code (increment C4) is gated the same way and needs no new
refusal either. Its discipline is nonemptiness and pairwise-distinct
member NAMES, both `illFormed` at the gate; a member value outside the
two rows Effect can persist — string and number — is not an enum
spelling at all and dies in the decoder as `notASchema`. Member VALUES
are deliberately unconstrained, because TypeScript aliases are content
the source language spells, and order is again never tested.

The tuple code (increment C2) adds no refusal either, and adds no `wf`
clause worth the name: its elements are nonempty by construction and its
rest is at most one type by construction, so the two disciplines the
admission map asks for are STRUCTURAL. A `rest` of length two or more,
and the empty tuple, therefore die in the decoder as `notASchema` — they
are shapes the carrier cannot spell, which is the same reading `Never`
gets.
-/

namespace Cas.Schema

open Cas.Json

/-- LAW SM-14: these five names are the refusal taxonomy, so an empty
union refuses `illFormed` and an unknown mode `notASchema`.

Why an ingested value was refused. -/
inductive IngestRefusal where
  /-- The normalized value is not a spelling of any code. -/
  | notASchema
  /-- A code, but it breaks the canonical-fields discipline. -/
  | illFormed
  /-- A schema-node envelope, but not revision 1. -/
  | wrongRevision
  /-- A revision-1 document carrying a non-empty `references` table.
  Refused rather than admitted: the table is unreachable from the Lean
  side today (no `Suspend`, no `Reference` constructor), so a code
  answered from one could not be re-emitted by the projection. -/
  | nonEmptyReferences
  /-- A `Declaration` whose `representation.id` is no row of the
  declaration registry (`Cas.Schema.DeclarationId`). The allowlist is
  the only safe admission rule for Effect's open extension point
  (PLAN P4), so an unknown id is refused BY NAME rather than carried as
  opaque content — the carrier has no spelling for it. Admitting one is
  a registry change, not a decoder change. -/
  | unknownDeclaration
  deriving DecidableEq, Repr

/-- Boolean twin of the strict-order clause: every later field name is
above this one — the `Pairwise` shape verbatim, so the agreement proof
needs no transitivity. -/
def pairwiseNames : List (String × Bool × Ast) → Bool
  | [] => true
  | f :: fs => fs.all (fun g => decide (f.1 < g.1)) && pairwiseNames fs

/-- Boolean twin of the enum's distinct-names clause — the `Pairwise`
shape verbatim, like `pairwiseNames`. It asks for DISTINCTNESS and not
for order: an enum's members are never sorted, because their order is
their identity. -/
def distinctEnumNames : List (String × EnumValue) → Bool
  | [] => true
  | m :: ms => ms.all (fun n => decide (m.1 ≠ n.1)) && distinctEnumNames ms

mutual

/-- Boolean twin of `Ast.WF` — the runtime gate of the ingestion
door. -/
def Ast.wf : Ast → Bool
  | .arr a => a.wf
  | .struct fs => pairwiseNames fs && wfFields fs
  | .decl id p ps =>
    id.payloadWf p && decide (ps.length = id.arity) && wfParams ps
  | .union ms _ => !ms.isEmpty && wfMembers ms
  | .enum ms => !ms.isEmpty && distinctEnumNames ms
  | .tuple e es r => wfElement e && wfElements es && wfRest r
  | _ => true

def wfFields : List (String × Bool × Ast) → Bool
  | [] => true
  | (_, _, a) :: fs => a.wf && wfFields fs

/-- Boolean twin of `WFParams`. -/
def wfParams : List Ast → Bool
  | [] => true
  | a :: as => a.wf && wfParams as

/-- Boolean twin of `WFMembers`. Order is not tested — there is
nothing to test, order is the identity. -/
def wfMembers : List Ast → Bool
  | [] => true
  | a :: as => a.wf && wfMembers as

/-- Boolean twin of `WFElement`. The optionality bit is not tested —
there is nothing to test, it is carried. -/
def wfElement : Bool × Ast → Bool
  | (_, a) => a.wf

/-- Boolean twin of `WFElements`. -/
def wfElements : List (Bool × Ast) → Bool
  | [] => true
  | e :: es => wfElement e && wfElements es

/-- Boolean twin of `WFRest`. -/
def wfRest : Option Ast → Bool
  | none => true
  | some a => a.wf

end

theorem pairwiseNames_iff : ∀ fs, pairwiseNames fs = true ↔
    List.Pairwise (fun a b : String × Bool × Ast => a.1 < b.1) fs
  | [] => by simp [pairwiseNames]
  | f :: fs => by
    simp [pairwiseNames, List.pairwise_cons, List.all_eq_true,
      pairwiseNames_iff fs]

theorem distinctEnumNames_iff : ∀ ms, distinctEnumNames ms = true ↔
    List.Pairwise (fun a b : String × EnumValue => a.1 ≠ b.1) ms
  | [] => by simp [distinctEnumNames]
  | m :: ms => by
    simp [distinctEnumNames, List.pairwise_cons, List.all_eq_true,
      distinctEnumNames_iff ms]

mutual

/-- The gate decides exactly the canonical-fields discipline. -/
theorem Ast.wf_iff : ∀ (a : Ast), a.wf = true ↔ a.WF
  | .null => by simp [Ast.wf, Ast.WF]
  | .bool => by simp [Ast.wf, Ast.WF]
  | .int => by simp [Ast.wf, Ast.WF]
  | .str => by simp [Ast.wf, Ast.WF]
  | .lit _ => by simp [Ast.wf, Ast.WF]
  | .ref _ => by simp [Ast.wf, Ast.WF]
  | .arr a => by simp [Ast.wf, Ast.WF, Ast.wf_iff a]
  | .struct fs => by
    simp [Ast.wf, Ast.WF, pairwiseNames_iff fs, wfFields_iff fs]
  | .decl id p ps => by
    simp [Ast.wf, Ast.WF, DeclarationId.General.payloadWf_iff id p,
      wfParams_iff ps, and_assoc]
  | .union ms _ => by
    simp [Ast.wf, Ast.WF, wfMembers_iff ms]
  | .enum ms => by
    simp [Ast.wf, Ast.WF, distinctEnumNames_iff ms]
  | .tuple e es r => by
    simp [Ast.wf, Ast.WF, wfElement_iff e, wfElements_iff es, wfRest_iff r,
      and_assoc]

theorem wfMembers_iff : ∀ ms, wfMembers ms = true ↔ WFMembers ms
  | [] => by simp [wfMembers, WFMembers]
  | a :: as => by
    simp [wfMembers, WFMembers, Ast.wf_iff a, wfMembers_iff as]

theorem wfElement_iff : ∀ e, wfElement e = true ↔ WFElement e
  | (_, a) => by simp [wfElement, WFElement, Ast.wf_iff a]

theorem wfElements_iff : ∀ es, wfElements es = true ↔ WFElements es
  | [] => by simp [wfElements, WFElements]
  | e :: es => by
    simp [wfElements, WFElements, wfElement_iff e, wfElements_iff es]

theorem wfRest_iff : ∀ r, wfRest r = true ↔ WFRest r
  | none => by simp [wfRest, WFRest]
  | some a => by simp [wfRest, WFRest, Ast.wf_iff a]

theorem wfFields_iff : ∀ fs, wfFields fs = true ↔ WFFields fs
  | [] => by simp [wfFields, WFFields]
  | (_, _, a) :: fs => by
    simp [wfFields, WFFields, Ast.wf_iff a, wfFields_iff fs]

theorem wfParams_iff : ∀ ps, wfParams ps = true ↔ WFParams ps
  | [] => by simp [wfParams, WFParams]
  | a :: as => by
    simp [wfParams, WFParams, Ast.wf_iff a, wfParams_iff as]

end

/-! ## The door — revision 1 -/

/-- One `Declaration` node, tested against the registry: is its
`representation.id` no row at all? -/
private def unknownDeclarationHere : List (String × Json.Value) → Bool
  | [("_tag", .str "Declaration"), ("checks", _),
     ("representation", .obj [("id", .str w), ("payload", _)]),
     ("typeParameters", _)] => (DeclarationId.ofWire w).isNone
  | _ => false

mutual

/-- Does the representation carry a declaration the registry does not
admit? A structural search over the normalized value — it decides
nothing (`Ast.ofEnvelope` alone decides admission); it only tells the
refusal apart from a shape failure. -/
private def unknownDeclarationIn : Json.Value → Bool
  | .obj fields => unknownDeclarationHere fields || unknownDeclarationFields fields
  | .arr xs => unknownDeclarationItems xs
  | _ => false

private def unknownDeclarationFields : List (String × Json.Value) → Bool
  | [] => false
  | (_, v) :: rest => unknownDeclarationIn v || unknownDeclarationFields rest

private def unknownDeclarationItems : List Json.Value → Bool
  | [] => false
  | v :: rest => unknownDeclarationIn v || unknownDeclarationItems rest

end

/-- The refusal namer: a pure diagnostic on the failure path, walking
the envelope's shell and — for the declaration allowlist — the
representation it wraps. It never decides admission; that is
`Ast.ofEnvelope`'s job alone, so there is exactly one decoder behind
the door and the refusal name cannot disagree with it. -/
private def refusalOf : Json.Value → IngestRefusal
  | .obj [("revision", .nat r), ("value", d)] =>
    if r = schemaRevision then
      match d with
      | .obj [("references", .obj refs), ("representation", rep)] =>
        if !refs.isEmpty then .nonEmptyReferences
        else if unknownDeclarationIn rep then .unknownDeclaration
        else .notASchema
      | _ => .notASchema
    else .wrongRevision
  | _ => .notASchema

/-- THE door: normalize the spelling, strictly decode the revision-1
envelope, gate on the canonical-fields discipline. -/
def ingest (v : Json.Value) : Except IngestRefusal Ast :=
  match Ast.ofEnvelope (canonValue v) with
  | some a => if a.wf then .ok a else .error .illFormed
  | none => .error (refusalOf (canonValue v))

/-- Soundness: the door answers only well-formed codes. -/
theorem ingest_wf {v : Json.Value} {a : Ast}
    (h : ingest v = .ok a) : a.WF := by
  unfold ingest at h
  split at h
  · split at h
    · cases h
      next hw => exact (Ast.wf_iff _).mp hw
    · cases h
  · cases h

/-- Exactness on the canonical image: a well-formed code's own
revision-1 envelope ingests to that code's revision-1 normal form. The
normalizer is a no-op here — `envelope_canonical` says the envelope is
already canonically spelled — so no canonicality hypothesis is
needed. -/
theorem ingest_envelope {a : Ast} (ha : a.WF) :
    ingest a.envelope = .ok a.repNorm := by
  unfold ingest
  rw [canonValue_of_canonical _ (envelope_canonical a), ofEnvelope_envelope a]
  simp [(Ast.wf_iff _).mpr (Ast.repNorm_wf a ha)]

/-- Exactness on the nose, for the codes the revision-1 projection
distinguishes: the door is the identity on the canonical image, so the
quotient it computes agrees with the projection's round trip. -/
theorem ingest_envelope' {a : Ast} (ha : a.WF) (hn : a.RepNormal) :
    ingest a.envelope = .ok a := by
  rw [ingest_envelope ha, hn]

/-! ## The legacy arm — revision 0

The retired tagged projection (`Ast.toJson`), kept readable so
already-addressed revision-0 schema nodes can still be decoded. It is
NOT the door: it takes the bare tagged value, has no envelope, and
mints nothing new. -/

/-- The revision-0 read-compatibility arm: normalize the spelling,
decode the retired tagged projection, gate on the same discipline. -/
def ingestLegacy (v : Json.Value) : Except IngestRefusal Ast :=
  match Ast.ofJson (canonValue v) with
  | none => .error .notASchema
  | some a => if a.wf then .ok a else .error .illFormed

/-- Soundness of the legacy arm: it too answers only well-formed
codes. -/
theorem ingestLegacy_wf {v : Json.Value} {a : Ast}
    (h : ingestLegacy v = .ok a) : a.WF := by
  unfold ingestLegacy at h
  split at h
  · cases h
  · split at h
    · cases h
      next hw => exact (Ast.wf_iff _).mp hw
    · cases h

/-- The legacy arm's canonical image is fixed: a well-formed code's own
revision-0 spelling ingests to exactly itself. Revision 0 keeps a null
literal as a literal, so no normal form intervenes. -/
theorem ingestLegacy_toJson {a : Ast} (ha : a.WF) :
    ingestLegacy a.toJson = .ok a := by
  unfold ingestLegacy
  rw [canonValue_of_canonical _ (toJson_canonical a ha), ofJson_toJson]
  simp [(Ast.wf_iff a).mpr ha]

/-! ## The declaration allowlist at the door — worked, at elaboration

The two facts the theorems above state in general, run on the general
declaration code so the door's behaviour is visible in the source:
an admitted declaration goes in and comes back with the same payload
bytes, and an id outside the registry is refused BY NAME. -/

/-- `Schema.Option(Schema.String)` as a code — an admitted arity-1
declaration over an admitted element. -/
private def optionOfString : Ast := .decl .option .null [.str]

-- An admitted declaration ingests to itself: same canonical bytes out.
#guard (match ingest optionOfString.envelope with
        | .ok a => a.payload == optionOfString.payload
        | .error _ => false)

-- An id outside the registry is refused by name, not silently carried.
#guard (match ingest (.obj [("revision", .nat schemaRevision),
          ("value", .obj [("references", .obj []),
            ("representation", .obj [
              ("_tag", .str "Declaration"), ("checks", .arr []),
              ("representation", .obj [
                ("id", .str "vendor/x/Widget"), ("payload", .null)]),
              ("typeParameters", .arr [])])])]) with
        | .error .unknownDeclaration => true
        | _ => false)

-- An admitted id with a payload its row does not admit is a different
-- refusal: the allowlist passed, the row's own discipline did not.
#guard (match ingest (Ast.decl .date (.str "not a null payload") []).envelope with
        | .error .illFormed => true
        | _ => false)

/-! ## Order is identity at the door — worked, at elaboration

The ratified identity calls for the union code (C1), run through the
door so the carrier's behaviour is visible in the source rather than
only stated in a docstring. -/

/-- Two unions over the same members in different orders. -/
private def zebraFirst : Ast :=
  .union [.lit (.str "zebra"), .lit (.str "alpha")] .oneOf

private def alphaFirst : Ast :=
  .union [.lit (.str "alpha"), .lit (.str "zebra")] .oneOf

-- ORDER IS IDENTITY: reordering the members is a DIFFERENT code with
-- DIFFERENT payload bytes. Nothing sorts on the way in or out.
#guard zebraFirst.payload != alphaFirst.payload

-- Both survive the door as themselves, in the order they were written.
#guard (match ingest zebraFirst.envelope, ingest alphaFirst.envelope with
        | .ok a, .ok b => a.payload == zebraFirst.payload &&
            b.payload == alphaFirst.payload
        | _, _ => false)

-- THE MODE IS DATA: the same members under the two modes are two
-- codes, and both are admitted immediately (open ruling 2, resolved as
-- proposed — carriage is faithful, validation semantics are staged).
#guard (Ast.union [.str, .bool] .anyOf).payload !=
  (Ast.union [.str, .bool] .oneOf).payload

#guard (match ingest (Ast.union [.str, .bool] .anyOf).envelope,
              ingest (Ast.union [.str, .bool] .oneOf).envelope with
        | .ok _, .ok _ => true
        | _, _ => false)

-- NO FLATTENING: a nested union is not its flattening.
#guard (Ast.union [.str, .union [.bool, .int] .anyOf] .anyOf).payload !=
  (Ast.union [.str, .bool, .int] .anyOf).payload

-- THE EMPTY UNION IS REFUSED at the gate — it is `Never`, and `Never`
-- is not admitted. The decoder reads its shape; the discipline is what
-- turns it away.
#guard (match ingest (Ast.union [] .anyOf).envelope with
        | .error .illFormed => true
        | _ => false)

-- A mode that is no row of the table is not a union at all: the
-- spelling dies in the decoder, so the value is not a schema.
#guard (match ingest (.obj [("revision", .nat schemaRevision),
          ("value", .obj [("references", .obj []),
            ("representation", .obj [
              ("_tag", .str "Union"), ("checks", .arr []),
              ("mode", .str "allOf"),
              ("types", .arr [(Ast.str).toRepresentationJson])])])]) with
        | .error .notASchema => true
        | _ => false)

/-! ## The enum at the door — worked, at elaboration

The C4 calls, run through the door so the carrier's behaviour is in the
source and not only in a docstring. -/

private def direction : Ast :=
  .enum [("Up", .str "Up"), ("Down", .str "Down")]

private def directionReversed : Ast :=
  .enum [("Down", .str "Down"), ("Up", .str "Up")]

-- ORDER IS IDENTITY: reordering the members is a DIFFERENT code with
-- DIFFERENT payload bytes. Effect reads `Object.keys` order, which is
-- source order, and nothing on this path sorts.
#guard direction.payload != directionReversed.payload

-- Both survive the door as themselves, in the order they were written.
#guard (match ingest direction.envelope, ingest directionReversed.envelope with
        | .ok a, .ok b => a.payload == direction.payload &&
            b.payload == directionReversed.payload
        | _, _ => false)

-- A numeric enum, including the alias TypeScript admits: two members at
-- one value, which `WF` deliberately does NOT refuse — the name is the
-- identity, the value is not.
#guard (match ingest (Ast.enum [("A", .int ⟨1, by decide⟩),
          ("B", .int ⟨1, by decide⟩)]).envelope with
        | .ok _ => true
        | .error _ => false)

-- THE EMPTY ENUM IS REFUSED at the gate — like the empty union, it
-- admits nothing, which is `Never`, which is not admitted.
#guard (match ingest (Ast.enum []).envelope with
        | .error .illFormed => true
        | _ => false)

-- REPEATED NAMES are refused: the name is the member's identity, so two
-- members cannot share one.
#guard (match ingest (Ast.enum [("A", .str "x"), ("A", .str "y")]).envelope with
        | .error .illFormed => true
        | _ => false)

-- A member value outside the two admitted rows — a BOOLEAN, which
-- Effect's `Enum` cannot persist — is not an enum spelling at all and
-- dies in the decoder.
#guard (match ingest (.obj [("revision", .nat schemaRevision),
          ("value", .obj [("references", .obj []),
            ("representation", .obj [
              ("_tag", .str "Enum"), ("checks", .arr []),
              ("enums", .arr [.arr [.str "A",
                .obj [("type", .str "boolean"), ("value", .bool true)]]])])])]) with
        | .error .notASchema => true
        | _ => false)

/-! ## The tuple at the door — worked, at elaboration

The C2 calls, run through the door. The two that matter are the ones the
carrier makes structural rather than clausal: a tuple cannot spell the
plain array's representation, and a `rest` of length two has no spelling
at all. -/

private def pair : Ast := .tuple (false, .str) [(false, .int)] none

private def pairSwapped : Ast := .tuple (false, .int) [(false, .str)] none

private def headAndTail : Ast := .tuple (false, .str) [] (some .int)

-- POSITION IS IDENTITY: swapping two elements is a DIFFERENT code with
-- DIFFERENT payload bytes.
#guard pair.payload != pairSwapped.payload

-- Both survive the door as themselves, positions intact.
#guard (match ingest pair.envelope, ingest pairSwapped.envelope with
        | .ok a, .ok b => a.payload == pair.payload &&
            b.payload == pairSwapped.payload
        | _, _ => false)

-- The OPTIONALITY BIT IS DATA: the same element types under different
-- optionality are two codes, and both are admitted.
#guard (Ast.tuple (false, .str) [(false, .int)] none).payload !=
  (Ast.tuple (false, .str) [(true, .int)] none).payload

#guard (match ingest (Ast.tuple (false, .str) [(true, .int)] none).envelope with
        | .ok _ => true
        | .error _ => false)

-- A tuple with a rest type — `Schema.TupleWithRest` — round-trips too.
#guard (match ingest headAndTail.envelope with
        | .ok a => a.payload == headAndTail.payload
        | .error _ => false)

-- THE PLAIN ARRAY KEEPS ITS OWN SPELLING. `.arr` is `{elements:[],
-- rest:[t]}`, and no tuple code can spell that, because `Ast.tuple`
-- takes a first element. So there is no second collapse to normalize
-- away, and the array's bytes are unchanged by this increment.
#guard (match ingest (Ast.arr .str).envelope with
        | .ok a => a.payload == (Ast.arr .str).payload
        | .error _ => false)

-- A `rest` OF LENGTH TWO has no spelling on this side — the carrier
-- holds an `Option` — so the deferred trailing-rest semantics are
-- refused in the DECODER, by shape, and not by a clause that could
-- drift.
#guard (match ingest (.obj [("revision", .nat schemaRevision),
          ("value", .obj [("references", .obj []),
            ("representation", .obj [
              ("_tag", .str "Arrays"), ("checks", .arr []),
              ("elements", .arr [.obj [("isOptional", .bool false),
                ("type", (Ast.str).toRepresentationJson)]]),
              ("rest", .arr [(Ast.int).toRepresentationJson,
                (Ast.bool).toRepresentationJson])])])]) with
        | .error .notASchema => true
        | _ => false)

-- THE EMPTY TUPLE — `{elements:[], rest:[]}` — is still not admitted.
-- It was not admitted before this increment either; nothing is retired.
#guard (match ingest (.obj [("revision", .nat schemaRevision),
          ("value", .obj [("references", .obj []),
            ("representation", .obj [
              ("_tag", .str "Arrays"), ("checks", .arr []),
              ("elements", .arr []), ("rest", .arr [])])])]) with
        | .error .notASchema => true
        | _ => false)

/-! ## The bytes-in door

`ingest` takes a VALUE. Everything that arrives from outside — a stored
payload, a hoovered carrier, a model's answer — arrives as BYTES, and
until the parser slice there was no first step: the loop's read half
started one stage in. `ingestBytes` is that step, and it is the whole
of it: parse, un-collapse, ingest.

## Why the collapse has to be undone here

`Cas.Json.parse` answers a NUMBER-NORMAL value — every nonnegative
number spelled `Value.nat`, because that is the only reading a decimal
run has (`Json.parse_sound`). The revision-1 representation spells one
of its numbers `Value.int`: the literal under the key `"value"`. So the
parsed value is not the representation's own spelling, and the strict
decoder would refuse it.

`deNumNorm` (`Cas.Schema.PayloadInj`) is exactly that reading, already
proved to invert the collapse on the representation image of a
well-formed code (`deNumNorm_numNorm_envelope`). It is a SCHEMA-plane
fact — the key decides the constructor — which is why it belongs on
this side of the door and not in the parser.

## The refusal

Bytes that are no canonical rendering at all are refused `notASchema`:
the value plane could not spell them, so they are not a spelling of any
code. The taxonomy is closed and mirrored on the TypeScript side
(`CanonicalSchema.ts`); this door adds no name to it. -/

/-- THE BYTES-IN DOOR: the canonical payload bytes of a revision-1
schema node, read back to the code. Parse strictly, undo the number
collapse the way the representation spells numbers, then run the
existing door. -/
def ingestBytes (s : String) : Except IngestRefusal Ast :=
  match Json.parse s with
  | some v => ingest (deNumNorm v)
  | none => .error .notASchema

/-- Soundness: the bytes door, like the value door, answers only
well-formed codes. -/
theorem ingestBytes_wf {s : String} {a : Ast} (h : ingestBytes s = .ok a) : a.WF := by
  unfold ingestBytes at h
  split at h
  · exact ingest_wf h
  · cases h

/-- EXACTNESS on the canonical image, end to end: a well-formed code's
own payload BYTES ingest to exactly that code's revision-1 normal form.
The R15 read loop, closed at its first step. -/
theorem ingestBytes_payload {a : Ast} (ha : a.WF) :
    ingestBytes a.payload = .ok a.repNorm := by
  unfold ingestBytes Ast.payload
  rw [Json.parse_render (envelope_canonical a)]
  show ingest (deNumNorm (Json.Value.numNorm a.envelope)) = _
  rw [deNumNorm_numNorm_envelope ha]
  exact ingest_envelope ha

/-- Exactness on the nose, for the codes the revision-1 projection
distinguishes. -/
theorem ingestBytes_payload' {a : Ast} (ha : a.WF) (hn : a.RepNormal) :
    ingestBytes a.payload = .ok a := by
  rw [ingestBytes_payload ha, hn]

/-! ### The bytes door, worked at elaboration -/

-- The loop: a code's payload bytes go out and the code comes back.
#guard (match ingestBytes optionOfString.payload with
        | .ok a => a.payload == optionOfString.payload
        | .error _ => false)

#guard (match ingestBytes (Ast.lit (.int ⟨-7, by decide⟩)).payload with
        | .ok a => a.payload == (Ast.lit (.int ⟨-7, by decide⟩)).payload
        | .error _ => false)

-- A NONNEGATIVE number literal is the arm the collapse would break:
-- the parser answers `Value.nat 7` where the representation spells
-- `Value.int 7`, and `deNumNorm` is what puts it back.
#guard (match ingestBytes (Ast.lit (.int ⟨7, by decide⟩)).payload with
        | .ok a => a.payload == (Ast.lit (.int ⟨7, by decide⟩)).payload
        | .error _ => false)

-- The enum through the BYTES door, including the number member the
-- collapse would otherwise break.
#guard (match ingestBytes (Ast.enum [("A", .int ⟨1, by decide⟩),
          ("B", .str "b")]).payload with
        | .ok a => a.payload ==
            (Ast.enum [("A", .int ⟨1, by decide⟩), ("B", .str "b")]).payload
        | .error _ => false)

-- Bytes that are no canonical rendering die at the parser, by name.
#guard (match ingestBytes "{\"revision\": 1}" with
        | .error .notASchema => true
        | _ => false)

#guard (match ingestBytes "not json at all" with
        | .error .notASchema => true
        | _ => false)

-- A canonical rendering that is not a schema node is refused by the
-- door proper, not by the parser — same name, different reader.
#guard (match ingestBytes "[]" with
        | .error .notASchema => true
        | _ => false)

end Cas.Schema
