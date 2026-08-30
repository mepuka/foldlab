import Cas
import Cas.Vectors.Schema
import Cas.Schema.Annotation
import Cas.Schema.Exchange
import Cas.Schema.Notation
import Cas.Backend.Ts
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
order-is-identity is held by the bytes — the DERIVED tagged union,
the generator's own pin for `deriving Described` over constructor
alternatives, the enum pin — both member value rows, orders a sort
would reorder, and the alias TypeScript admits — and the tuple pin,
which carries every shape the grown `Arrays` node reaches beside the
plain array whose bytes must not move, and the exchange kind
(`Cas.Schema.Exchange`) — the stored form of an R15 recording, whose
subject is a tagged union of addressed planes. The TypeScript side asserts
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

/-- The enum spellings, hand-composed (increment C4): both member value
rows, member orders a sort WOULD REORDER, and the alias TypeScript
admits — so order-is-identity and value-freedom are held by the
committed bytes and not only by a docstring.

- `direction` — a string enum spelled `Up` before `Down`. Any sort of
  the members changes these bytes and the fixture goes red;
- `level` — a numeric enum carrying a negative member and an ALIAS
  (`Warn` and `Warning` at one value), which `WF` admits because the
  NAME is the member's identity and the value is not;
- `mixed` — one row of each kind, on an optional field, so the enum
  rides both key positions. -/
def enumPin : Ast := .struct [
  ("direction", false, .enum [("Up", .str "Up"), ("Down", .str "Down")]),
  ("level", false, .enum [
    ("Debug", .int ⟨-1, by decide⟩),
    ("Warn", .int ⟨1, by decide⟩),
    ("Warning", .int ⟨1, by decide⟩)]),
  ("mixed", true, .enum [
    ("Name", .str "name"),
    ("Zero", .int ⟨0, by decide⟩)])
]

/-- The tuple spellings, hand-composed (increment C2, the Arrays
completion): every shape the grown `Arrays` node reaches, beside the
plain array whose bytes this increment must NOT move.

- `plain` — `Ast.arr`, unchanged: `{elements:[], rest:[t]}`. It is in
  the fixture so that the one collision this increment could have made
  is held by the bytes — a tuple cannot spell this, because `Ast.tuple`
  takes a first element;
- `pair` — a two-element tuple, positions in a written order a sort
  would reorder;
- `withOptional` — a trailing optional element, so the optionality bit
  rides the wire;
- `withRest` — `Schema.TupleWithRest`: one element and a rest type;
- `nested` — a tuple inside an array inside a tuple, on an optional
  field, so the code rides both key positions. -/
def tuplePin : Ast := .struct [
  ("nested", true,
    .tuple (false, .arr (.tuple (false, .str) [] none)) [(false, .null)] none),
  ("pair", false, .tuple (false, .str) [(false, .int)] none),
  ("plain", false, .arr .str),
  ("withOptional", false, .tuple (false, .int) [(true, .str)] none),
  ("withRest", false, .tuple (false, .str) [] (some .int))
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
  ("tagged-pin", TaggedPin.schemaCode),
  ("enum-pin", enumPin),
  ("tuple-pin", tuplePin),
  ("exchange", Exchange.schemaCode)
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

/-! ## The annotation plane, projected to the CLI (the naming seat)

`cas name` writes annotation nodes, and to do it the CLI must spell
three facts this plane owns: the working tag annotation nodes ride
(`pinAnnotationKindTag`), the name seat's key (`pinName.key`), and the
subject union's arm-to-tag table. Hand copies of those spellings in
TypeScript are drift channels — the CLI lane carried all three by hand
until this projection. The arms are READ OFF
`AnnotationSubject.schemaCode`, the deriving handler's own output, so a
widened union grows the emitted table on the next regeneration and the
byte gate says so until that regeneration has run. -/

/-- The subject arms, read off the code itself: each member of the
`oneOf` is a struct whose `_tag` literal names the arm and whose
`address` field is a reference at the plane's tag. A member of any
other shape is dropped by the match — and the totality guard below is
what makes a drop a build failure rather than a silent narrowing. -/
def subjectArms : List (String × UInt8) :=
  match AnnotationSubject.schemaCode with
  | .union members _ => members.filterMap fun member =>
      match member with
      | .struct [("_tag", _, .lit (.str arm)), ("address", _, .ref tag)] =>
          some (arm, tag)
      | _ => none
  | _ => []

-- Totality over the union: every member is an arm; none was dropped by
-- the shape match above.
#guard (match AnnotationSubject.schemaCode with
  | .union members _ => members.length
  | _ => 0) == subjectArms.length

-- The table is the five planes, at the library's own tag spellings —
-- read off the code and equal to the named constants, so the emitted
-- projection, the union, and the tag definitions cannot drift apart.
#guard subjectArms == [
  ("exchange", exchangeKindTag), ("git", gitKindTag),
  ("program", programKindTag), ("schema", schemaKindTag),
  ("system", systemKindTag)]

open Cas.Backend.Ts in
private def armExpr (arm : String × UInt8) : Expr :=
  .objectML [("arm", .str arm.1), ("tag", .int (Int.ofNat arm.2.toNat))]

private def armTypeBlock : String :=
  "/** One nameable plane: the subject union's arm name, and the wire\n" ++
  " * kind tag a reference through that arm expects at its target. */\n" ++
  "export interface AnnotationSubjectArm {\n" ++
  "  readonly arm: string\n" ++
  "  readonly tag: number\n" ++
  "}"

open Cas.Backend.Ts in
private def annotationPlaneModule : Module where
  header := [
    "GENERATED — do not edit. THE ANNOTATION PLANE, as data: the",
    "working tag annotation nodes ride and the everyday word for it,",
    "the revision they ride, the name seat's key, and the subject",
    "union's arm-to-tag table, emitted from",
    "`library/cas/Cas/Schema/Annotation.lean` by `lake exe schemas`;",
    "regeneration is byte-identity-gated (`--check`, wired into",
    "`check:cas`). The arm table is read off",
    "`AnnotationSubject.schemaCode` — the deriving handler's output —",
    "so it widens when the union does and never before.",
    "",
    "`bin/cli/naming.ts` is this file's consumer: `cas name` writes",
    "annotation nodes at `AnnotationKindTag` under `AnnotationNameKey`,",
    "and refuses subjects on planes this table does not carry.",
    "`bin/cli/render.ts` is the second: every everyday kind word the",
    "annotation plane owns is seeded from here, so no rendered surface",
    "spells one by hand. `src/cas/Annotations.ts` is the third: it",
    "builds the subject union's arms, and reads the system plane's",
    "working tag from here rather than spelling it."
  ]
  imports := []
  decls := [
    .raw armTypeBlock,
    .const {
      name := "AnnotationKindTag",
      doc := ["The working tag annotation nodes ride — the Lean pin's own",
        "choice (`pinAnnotationKindTag`). Working means the kind registry",
        "gives it no row: the annotation plane deliberately has no",
        "reserved tag, and this is the caller's spelling, pinned."],
      value := .int (Int.ofNat pinAnnotationKindTag.toNat) },
    .const {
      name := "AnnotationKindWord",
      doc := ["The everyday word for that kind — what `cas show` prints",
        "where a registry row would give a name, since this plane has",
        "none to give. Emitted rather than written in TypeScript: a",
        "rendered kind name enters the human register off the generated",
        "registry (decision 25)."],
      value := .str pinAnnotationKindWord },
    .const {
      name := "AnnotationRevision",
      doc := ["The revision annotation nodes ride, the Lean pin's own",
        "(`pinAnnotationRevision`) — the projection's revision is part",
        "of the wire, so its consumer reads it here."],
      value := .int (Int.ofNat pinAnnotationRevision) },
    .const {
      name := "AnnotationNameKey",
      doc := ["The name seat's annotation key, exactly as the Lean worked",
        "example pins it (`pinName`)."],
      value := .str pinName.key },
    .const {
      name := "SystemKindTag",
      doc := ["The service-topology plane's WORKING tag",
        "(`Cas.Schema.systemKindTag`), which the `system` arm below",
        "demands at its target. It is emitted HERE because this is the",
        "only generated surface in the effects package that names it:",
        "the kind registry has no row for a working tag, and the system",
        "lane generates layers rather than a node mirror. The day a",
        "system mirror lands, this constant moves beside it. Named",
        "rather than searched out of the arm table, so its consumer",
        "reads a constant the way it reads `KindTagsByName.cont`."],
      value := .int (Int.ofNat systemKindTag.toNat) },
    .const {
      name := "AnnotationSubjectArms",
      type := some "ReadonlyArray<AnnotationSubjectArm>",
      doc := ["The nameable planes, in the subject union's own member",
        "order: arm name and expected kind tag, read off the union's",
        "canonical code."],
      value := .arr (subjectArms.map armExpr) }
  ]

/-- The emitted projection, rendered in the effects package's style. -/
def annotationPlaneRendered : String :=
  Cas.Backend.Ts.Render.module Cas.Backend.Ts.house0 annotationPlaneModule

/-- Where the projection lands: the effects package's generated tree,
beside the grammar registry it complements. -/
def annotationPlaneTarget : System.FilePath :=
  "../effects/src/cas/generated/annotationPlane.ts"

/-- The registry rendered as the driver's fixtures: one payload file
per pinned code — the file's bytes ARE the schema-node payload — then
the tracking manifest, the store-address file, and the annotation-plane
projection the CLI's naming seat consumes. -/
def fixtures : IO (List Gate.Fixture) :=
  return registry.map (fun (name, ast) =>
      ({ path := pathOf name, content := ast.payload,
         label := "canonical payload" } : Gate.Fixture)) ++
    [⟨indexPath, indexDocument, s!"{registry.length} schemas"⟩,
     ⟨addressesPath, addressesDocument, s!"{registry.length} addresses"⟩,
     ⟨annotationPlaneTarget, annotationPlaneRendered,
       s!"{subjectArms.length} nameable planes, the annotation-plane projection"⟩]

end SchemasMain

def main := Gate.main "lake exe schemas" SchemasMain.fixtures
