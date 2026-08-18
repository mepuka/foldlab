/-
The kernel conformance emitter: schema v1 of `kernel-conformance.ndjson`.

Every row is COMPUTED by running the kernel model's own definitions —
`DeclKind.rank` and `rankToKind` for the kind table, `HoleStage.rank`
and `rankToStage` for the stage table, `RefusalReason.wire`,
`Kernel.taught` and `RefusalReason.applicability` for the taught
refusals, `encodeAct` for the sentence vectors, and `Kernel.admit` at
`Kernel.Planted.door` for the admission verdicts. No law text, no
repair text, and no verdict is retyped here; a hand-copied table would
drift the moment the model moved, which is the failure this file
exists to make impossible.

Two families of row cannot be computed from a Lean value at runtime,
because a compiled executable carries no environment: the constructor
NAMES of the kind and stage tables, and the mini-AST of the sort
system. Those are written once below and checked against the real
environment by `Unity/Shapes.lean`, which reads the emitted artifact
back and compares it to what `getConstInfo` says the declarations
actually are. The table lives in exactly one place; the checker never
gets a second copy to disagree with.

This module lives beside the bridge and reads only the kernel model.
It changes neither upstream tree, and it promotes nothing: the rows
report what the model decides, and a conformance vector is a check on
an implementation, never a guarantee about one.
-/
import Kernel.Definitions

namespace Unity.Emit

/-! ## Canonical JSON, at the frozen key order

The interchange freeze fixes the key order per record, so this writer
preserves the order it is given rather than sorting. The grammar is
deliberately narrow: ASCII strings, non-negative integers, arrays, and
objects. There is no floating-point path because no row carries one.
-/

/-- One hexadecimal digit, lowercase. -/
def hexDigit (digit : Nat) : Char :=
  if digit < 10 then Char.ofNat ('0'.toNat + digit)
  else Char.ofNat ('a'.toNat + digit - 10)

/-- JSON escaping for one character. The emitted corpus is ASCII by
    check, but the escaper cannot produce invalid JSON if a taught text
    later grows a quote or a control character. -/
def escapeChar (character : Char) : String :=
  if character == '"' then "\\\""
  else if character == '\\' then "\\\\"
  else if character == '\n' then "\\n"
  else if character == '\r' then "\\r"
  else if character == '\t' then "\\t"
  else if character.toNat < 0x20 then
    "\\u00" ++ String.singleton (hexDigit (character.toNat / 16)) ++
      String.singleton (hexDigit (character.toNat % 16))
  else String.singleton character

/-- A JSON string literal. -/
def jsonString (value : String) : String :=
  "\"" ++ String.join (value.toList.map escapeChar) ++ "\""

/-- A JSON integer. The corpus has no negative and no fractional
    numbers, so decimal rendering is canonical. -/
def jsonNat (value : Nat) : String := toString value

/-- A JSON array, compact. -/
def jsonArray (values : List String) : String :=
  "[" ++ String.intercalate "," values ++ "]"

/-- A JSON object at the given key order, compact. -/
def jsonObject (fields : List (String × String)) : String :=
  "{" ++ String.intercalate ","
    (fields.map fun field => jsonString field.1 ++ ":" ++ field.2) ++ "}"

/-! ## The kind and stage tables

Ranks come from the model's own rank functions, and the row set is
enumerated through the model's decode functions, so a kind or stage
added without a rank cannot appear as a row. -/

/-- The name of a declaration kind. The spelling is checked against the
    constructor names in the environment by the shape checker. -/
def kindName : Kernel.DeclKind -> String
  | .schema => "schema"
  | .program => "program"
  | .policy => "policy"
  | .capability => "capability"
  | .lane => "lane"
  | .algebra => "algebra"
  | .index => "index"
  | .resource => "resource"
  | .ontology => "ontology"
  | .schedule => "schedule"
  | .template => "template"
  | .language => "language"

/-- The name of a hole stage, at the model's spelling. -/
def stageName : Kernel.HoleStage -> String
  | .opened => "opened"
  | .filled => "filled"
  | .disputed => "disputed"
  | .decided => "decided"
  | .sealed => "sealed"

/-- One kind row. Shared with the shape checker so the artifact and the
    check cannot render differently. -/
def kindRow (name : String) (rank : Nat) : String :=
  jsonObject
    [ ("record", jsonString "kind")
    , ("name", jsonString name)
    , ("rank", jsonNat rank) ]

/-- One stage row. -/
def stageRow (name : String) (rank : Nat) : String :=
  jsonObject
    [ ("record", jsonString "stage")
    , ("name", jsonString name)
    , ("rank", jsonNat rank) ]

/-- The ranks of the closed kind universe, enumerated through the
    model's decode function: each rank names the kind whose own rank
    function must return it. -/
def kindRows : List String :=
  (List.range 12).filterMap fun rank =>
    (Kernel.rankToKind rank).map fun kind =>
      kindRow (kindName kind) (Kernel.DeclKind.rank kind)

/-- The stage ranks, enumerated the same way. -/
def stageRows : List String :=
  (List.range 5).filterMap fun rank =>
    (Kernel.rankToStage rank).map fun stage =>
      stageRow (stageName stage) (Kernel.HoleStage.rank stage)

/-! ## The taught refusals

Reason, law, repair, and applicability all come from the model's
tables. The declaration order below is the one the freeze names; the
shape checker pins it against the environment's constructor order. -/

/-- The refusal reasons in declaration order. -/
def reasons : List Kernel.RefusalReason :=
  [ .clockRead, .absenceTrigger, .unfencedDecide, .lastWriterWins
  , .unverifiedRead, .crossSortIdentifier, .mintedIdentifier
  , .ambientQueryInput, .forwardReference, .secretCarrier
  , .absenceClaim, .pastMutation, .offWritReferent
  , .closureIntrospection, .anchoredResolve, .unfilledHole ]

/-- One refusal row, every field read out of the model's tables. -/
def refusalRow (reason : Kernel.RefusalReason) : String :=
  let refusal := Kernel.taught reason
  jsonObject
    [ ("record", jsonString "refusal")
    , ("reason", jsonString reason.wire)
    , ("law", jsonString refusal.law)
    , ("repair", jsonString refusal.repair)
    , ("applicability", jsonString reason.applicability.wire) ]

/-- The sixteen taught refusals. -/
def refusalRows : List String := reasons.map refusalRow

/-! ## The mini-AST

The sort system's shape as data: the closed list of kernel types in
`Kernel/Definitions.lean` declaration order, each with its parameters
and its constructors' fields. A parameter is a BRAND when it is a
value the type is indexed by — the register of a token, the partition
of a position, the kind of a digest — which is the discipline that
makes a cross-space comparison fail to elaborate rather than fail at
runtime.

Field types are written in a small reference grammar: a bare name for
an unapplied type, `Head(arg,...)` for an applied one, where each
argument is its own short name (`Digest(program)` for a digest branded
by the program kind, `Position(partition)` for a position in the
partition a neighbouring field names). The checker renders the real
declarations into the same grammar and demands byte equality, so this
table is a transcription that cannot survive being wrong. -/

/-- Whether a type parameter is a brand or a type argument. -/
inductive ShapeRole where
  | brand
  | typeArgument
deriving Repr, DecidableEq

/-- The wire spelling of a parameter role. -/
def ShapeRole.wire : ShapeRole -> String
  | .brand => "brand"
  | .typeArgument => "type"

/-- Whether a declaration is an inductive or a structure. -/
inductive ShapeForm where
  | inductiveForm
  | structureForm
deriving Repr, DecidableEq

/-- The wire spelling of a declaration form. -/
def ShapeForm.wire : ShapeForm -> String
  | .inductiveForm => "inductive"
  | .structureForm => "structure"

/-- One constructor field: its name and its type in the reference
    grammar. -/
structure ShapeField where
  name : String
  ref : String
deriving Repr, DecidableEq

/-- One constructor: its short name and its fields in order. -/
structure ShapeCtor where
  name : String
  fields : List ShapeField
deriving Repr, DecidableEq

/-- One type parameter: its binder name and its role. -/
structure ShapeParam where
  name : String
  role : ShapeRole
deriving Repr, DecidableEq

/-- The shape of one kernel type. -/
structure TypeShape where
  name : String
  form : ShapeForm
  params : List ShapeParam
  ctors : List ShapeCtor
deriving Repr, DecidableEq

/-- A brand parameter. -/
def brand (name : String) : ShapeParam := { name := name, role := .brand }

/-- A constructor field. -/
def field (name ref : String) : ShapeField := { name := name, ref := ref }

/-- A constructor with fields. -/
def ctor (name : String) (fields : List ShapeField) : ShapeCtor :=
  { name := name, fields := fields }

/-- A closed enumeration's constructors, all of them field-free. -/
def enumeration (names : List String) : List ShapeCtor :=
  names.map fun name => ctor name []

/-- An inductive type shape. -/
def inductiveShape (name : String) (params : List ShapeParam)
    (ctors : List ShapeCtor) : TypeShape :=
  { name := name, form := .inductiveForm, params := params, ctors := ctors }

/-- A structure shape: one constructor, `mk`, carrying the fields. -/
def structureShape (name : String) (params : List ShapeParam)
    (fields : List ShapeField) : TypeShape :=
  { name := name, form := .structureForm, params := params
    ctors := [ctor "mk" fields] }

/-- The closed mini-AST: every kernel type the interchange carries, in
    `Kernel/Definitions.lean` declaration order. -/
def typeShapes : List TypeShape :=
  [ inductiveShape "DeclKind" []
      (enumeration
        [ "schema", "program", "policy", "capability", "lane", "algebra"
        , "index", "resource", "ontology", "schedule", "template"
        , "language" ])
  , structureShape "Digest" [brand "kind"] [field "id" "Nat"]
  , structureShape "Value" [] [field "bytes" "Nat"]
  , structureShape "StateLabel" [] [field "value" "Nat"]
  , structureShape "Petname" [] [field "text" "String"]
  , structureShape "Token" [brand "register"] [field "value" "Nat"]
  , structureShape "LanePartition" []
      [field "lane" "Digest(lane)", field "shard" "Nat"]
  , structureShape "Position" [brand "partition"] [field "value" "Nat"]
  , structureShape "AnchorFact" [brand "declared", brand "partition"]
      [ field "floor" "Position(partition)"
      , field "state" "StateLabel"
      , field "head" "Position(partition)" ]
  , inductiveShape "HoleStage" []
      (enumeration ["opened", "filled", "disputed", "decided", "sealed"])
  , inductiveShape "KTriggerPredicate" []
      [ ctor "evidenceAppears"
          [field "lane" "Digest(lane)", field "pattern" "Value"]
      , ctor "cellReaches"
          [field "cell" "Digest(resource)", field "threshold" "Value"]
      , ctor "holeReaches"
          [field "hole" "Nat", field "target" "HoleStage"]
      , ctor "outcomeLanded" [field "register" "Digest(program)"]
      , ctor "headAdvancedPast"
          [ field "partition" "LanePartition"
          , field "position" "Position(partition)" ] ]
  , inductiveShape "Act" []
      [ ctor "declare"
          [ field "kind" "DeclKind", field "value" "Value"
          , field "writ" "Digest(policy)" ]
      , ctor "resolve"
          [field "kind" "DeclKind", field "target" "Digest(kind)"]
      , ctor "emit" [field "lane" "Digest(lane)", field "body" "Value"]
      , ctor "join"
          [field "cell" "Digest(resource)", field "contribution" "Value"]
      , ctor "fold"
          [ field "declared" "Digest(index)"
          , field "partition" "LanePartition"
          , field "anchor" "AnchorFact(declared,partition)"
          , field "query" "Value" ]
      , ctor "decide"
          [ field "register" "Digest(program)"
          , field "token" "Token(register)"
          , field "outcome" "Value" ]
      , ctor "trigger"
          [ field "predicate" "KTriggerPredicate"
          , field "declaration" "Digest(program)" ]
      , ctor "spawn"
          [field "parent" "Digest(policy)", field "request" "Digest(policy)"] ]
  , inductiveShape "RawArg" []
      [ ctor "digestRef" [field "kind" "DeclKind", field "id" "Nat"]
      , ctor "literal" [field "value" "Nat"]
      , ctor "hole" [field "name" "Nat"]
      , ctor "clockNow" []
      , ctor "randomSeed" []
      , ctor "secretBytes" [field "bytes" "Nat"]
      , ctor "mintedId" [field "token" "Nat"]
      , ctor "functionValue" [field "code" "Nat"] ]
  , structureShape "CandidateAnchor" []
      [ field "foldId" "Nat", field "lane" "Nat", field "shard" "Nat"
      , field "floor" "Nat", field "state" "Nat", field "head" "Nat" ]
  , structureShape "TokenClaim" []
      [field "register" "Nat", field "value" "Nat"]
  , inductiveShape "MergeStrategy" []
      [ ctor "declaredAlgebra" [field "algebra" "Nat"]
      , ctor "lastWriterWins" [] ]
  , inductiveShape "CandidatePredicate" []
      [ ctor "evidenceAppears" [field "lane" "Nat", field "pattern" "Nat"]
      , ctor "cellReaches" [field "cell" "Nat", field "threshold" "Nat"]
      , ctor "holeReaches" [field "hole" "Nat", field "stage" "Nat"]
      , ctor "outcomeLanded" [field "register" "Nat"]
      , ctor "headAdvancedPast"
          [field "lane" "Nat", field "shard" "Nat", field "position" "Nat"]
      , ctor "onAbsence" [field "subject" "Nat"]
      , ctor "negation" [field "inner" "CandidatePredicate"]
      , ctor "deadline" [field "tick" "Nat"]
      , ctor "absentEverywhere" [field "cell" "Nat"] ]
  , inductiveShape "CandidateAct" []
      [ ctor "declare"
          [ field "kind" "DeclKind", field "payload" "List(RawArg)"
          , field "writ" "Nat" ]
      , ctor "resolveDigest"
          [ field "kind" "DeclKind", field "target" "Nat"
          , field "anchor" "Option(Nat)" ]
      , ctor "trustBytes"
          [ field "kind" "DeclKind", field "target" "Nat"
          , field "asserted" "Nat" ]
      , ctor "emit" [field "lane" "Nat", field "body" "List(RawArg)"]
      , ctor "join"
          [ field "cell" "Nat", field "contribution" "List(RawArg)"
          , field "strategy" "MergeStrategy" ]
      , ctor "readLatest" [field "subject" "Nat"]
      , ctor "fold"
          [ field "declared" "Nat", field "anchor" "Option(CandidateAnchor)"
          , field "query" "List(RawArg)" ]
      , ctor "decide"
          [ field "register" "Nat", field "token" "Option(TokenClaim)"
          , field "outcome" "List(RawArg)" ]
      , ctor "trigger"
          [field "predicate" "CandidatePredicate", field "declaration" "Nat"]
      , ctor "spawn" [field "parent" "Nat", field "request" "Nat"]
      , ctor "updateInPlace"
          [field "target" "Nat", field "payload" "List(RawArg)"] ]
  , inductiveShape "RefusalReason" []
      (enumeration
        [ "clockRead", "absenceTrigger", "unfencedDecide", "lastWriterWins"
        , "unverifiedRead", "crossSortIdentifier", "mintedIdentifier"
        , "ambientQueryInput", "forwardReference", "secretCarrier"
        , "absenceClaim", "pastMutation", "offWritReferent"
        , "closureIntrospection", "anchoredResolve", "unfilledHole" ])
  , structureShape "Refusal" []
      [ field "reason" "RefusalReason", field "law" "String"
      , field "repair" "String" ]
  , inductiveShape "Applicability" []
      (enumeration ["machineApplicable", "advisory"])
  , structureShape "Door" []
      [field "catalog" "List(Ref)", field "pinned" "List(Ref)"]
  ]

/-- One type row. The checker renders environment-derived shapes
    through this same function, so a difference in the artifact is a
    difference in the declarations, never in the formatting. -/
def typeRow (shape : TypeShape) : String :=
  jsonObject
    [ ("record", jsonString "type")
    , ("name", jsonString shape.name)
    , ("form", jsonString shape.form.wire)
    , ("params", jsonArray (shape.params.map fun param =>
        jsonObject
          [ ("name", jsonString param.name)
          , ("role", jsonString param.role.wire) ]))
    , ("constructors", jsonArray (shape.ctors.map fun constructor =>
        jsonObject
          [ ("name", jsonString constructor.name)
          , ("fields", jsonArray (constructor.fields.map fun field =>
              jsonObject
                [ ("name", jsonString field.name)
                , ("type", jsonString field.ref) ])) ])) ]

/-- The mini-AST rows. -/
def typeRows : List String := typeShapes.map typeRow

/-! ## Sentence encoding vectors

One ground sentence per generator, and one per production of the
closed trigger grammar, because the trigger framing carries a
production tag of its own. The declare vector is the kernel's planted
lawful sentence, so the vector set and the admission set name the same
act at the seam where an implementation has to agree with both. The
identifiers mirror `Kernel.Planted.door`'s catalog: the vectors read
as sentences that door would recognise. -/

/-- The encoding vectors, in emission order. -/
def vectors : List (String × Kernel.Act) :=
  [ ("lawful-declare", Kernel.Planted.lawfulDeclareAct)
  , ("resolve-schema", .resolve .schema ⟨8⟩)
  , ("emit-lane", .emit ⟨1⟩ ⟨42⟩)
  , ("join-cell", .join ⟨6⟩ ⟨42⟩)
  , ("fold-at-anchor",
      .fold ⟨2⟩ ⟨⟨1⟩, 0⟩ ⟨⟨4⟩, ⟨11⟩, ⟨6⟩⟩ ⟨13⟩)
  , ("decide-fenced", .decide ⟨3⟩ ⟨7⟩ ⟨42⟩)
  , ("trigger-evidence-appears",
      .trigger (.evidenceAppears ⟨1⟩ ⟨17⟩) ⟨3⟩)
  , ("trigger-cell-reaches", .trigger (.cellReaches ⟨6⟩ ⟨23⟩) ⟨3⟩)
  , ("trigger-hole-reaches", .trigger (.holeReaches 0 .decided) ⟨3⟩)
  , ("trigger-outcome-landed", .trigger (.outcomeLanded ⟨3⟩) ⟨3⟩)
  , ("trigger-head-advanced-past",
      .trigger (.headAdvancedPast ⟨⟨1⟩, 0⟩ ⟨6⟩) ⟨3⟩)
  , ("spawn-under-writ", .spawn ⟨4⟩ ⟨5⟩)
  ]

/-- One encoding row: the vector's name and the model's framing of it. -/
def encodingRow (entry : String × Kernel.Act) : String :=
  jsonObject
    [ ("record", jsonString "encoding")
    , ("name", jsonString entry.1)
    , ("act", jsonArray ((Kernel.encodeAct entry.2).map jsonNat)) ]

/-- The encoding rows. -/
def encodingRows : List String := vectors.map encodingRow

/-- Whether a vector survives the round trip. The comparison is at the
    encoding rather than at the sentence because `Act` carries branded
    indices and has no decidable equality; the kernel's encoding
    injectivity law is what turns equal encodings back into equal
    sentences, and the kernel's own admit control compares the same
    way. -/
def roundTrips (act : Kernel.Act) : Bool :=
  let encoded := Kernel.encodeAct act
  (Kernel.decodeAct encoded).map Kernel.encodeAct == some encoded

/-! ## Admission verdicts

The seventeen planted candidates of `Kernel.Planted`, in the order the
kernel gate exercises them: the sixteen unlawful rows the door must
refuse, then the lawful twin it must admit. The verdicts are computed
by running the door, so a door that changed its mind changes the
artifact and reddens the regeneration check. -/

/-- The planted candidates by their `Kernel.Planted` definition name. -/
def planted : List (String × Kernel.CandidateAct) :=
  [ ("clockFold", Kernel.Planted.clockFold)
  , ("absenceTrigger", Kernel.Planted.absenceTrigger)
  , ("unfencedDecide", Kernel.Planted.unfencedDecide)
  , ("lastWriterJoin", Kernel.Planted.lastWriterJoin)
  , ("trustingRead", Kernel.Planted.trustingRead)
  , ("crossRegisterDecide", Kernel.Planted.crossRegisterDecide)
  , ("mintedDeclare", Kernel.Planted.mintedDeclare)
  , ("latestRead", Kernel.Planted.latestRead)
  , ("forwardDeclare", Kernel.Planted.forwardDeclare)
  , ("secretEmit", Kernel.Planted.secretEmit)
  , ("absenceClaimTrigger", Kernel.Planted.absenceClaimTrigger)
  , ("pastMutation", Kernel.Planted.pastMutation)
  , ("offWritDeclare", Kernel.Planted.offWritDeclare)
  , ("functionDeclare", Kernel.Planted.functionDeclare)
  , ("anchoredResolve", Kernel.Planted.anchoredResolve)
  , ("holeyEmit", Kernel.Planted.holeyEmit)
  , ("lawfulDeclare", Kernel.Planted.lawfulDeclare)
  ]

/-- One admission row: the door's verdict on the named candidate. -/
def admissionRow (entry : String × Kernel.CandidateAct) : String :=
  match Kernel.admit Kernel.Planted.door entry.2 with
  | .refused refusal =>
      jsonObject
        [ ("record", jsonString "admission")
        , ("name", jsonString entry.1)
        , ("verdict", jsonString "refused")
        , ("reason", jsonString refusal.reason.wire) ]
  | .admitted act =>
      jsonObject
        [ ("record", jsonString "admission")
        , ("name", jsonString entry.1)
        , ("verdict", jsonString "admitted")
        , ("encoded", jsonArray ((Kernel.encodeAct act).map jsonNat)) ]

/-- The admission rows. -/
def admissionRows : List String := planted.map admissionRow

/-- Whether the door refused a candidate. -/
def wasRefused (entry : String × Kernel.CandidateAct) : Bool :=
  match Kernel.admit Kernel.Planted.door entry.2 with
  | .refused _ => true
  | .admitted _ => false

/-! ## The document -/

/-- The counts the header declares, in header key order. The emitter
    re-derives every one of them from the rendered document before
    printing: a declared count is a claim about the file, so it is
    checked against the file rather than against the list it was
    written from. -/
def counts : List (String × Nat) :=
  [ ("kind", kindRows.length)
  , ("stage", stageRows.length)
  , ("refusal", refusalRows.length)
  , ("type", typeRows.length)
  , ("encoding", encodingRows.length)
  , ("admission", admissionRows.length) ]

/-- The header. -/
def header : String :=
  jsonObject
    [ ("record", jsonString "header")
    , ("format", jsonNat 1)
    , ("generator", jsonString "verify/unity emit")
    , ("source", jsonString "verify/kernel")
    , ("counts", jsonObject
        (counts.map fun entry => (entry.1, jsonNat entry.2))) ]

/-- The whole artifact, one line per record, in the frozen order. -/
def document : List String :=
  header :: kindRows ++ stageRows ++ refusalRows ++ typeRows ++
    encodingRows ++ admissionRows

/-! ## Emit-time checks

The emitter refuses to print a corpus that fails its own checks. Each
check answers a way the document could be wrong while still looking
well formed. -/

/-- How many lines of the document carry a given record tag. -/
def taggedCount (tag : String) : Nat :=
  (document.filter fun line =>
    line.startsWith ("{" ++ jsonString "record" ++ ":" ++ jsonString tag ++ ",")).length

/-- Header counts that do not match the rendered document, and a
    document whose length the header does not account for — a record
    group the header forgot to name would otherwise ride along
    uncounted. -/
def countFailures : List String :=
  let declared := counts.foldl (fun total entry => total + entry.2) 0
  counts.filterMap (fun entry =>
    let rendered := taggedCount entry.1
    if entry.2 == rendered then none
    else some s!"emit: the header declares {entry.2} {entry.1} rows but the document carries {rendered}") ++
  (if document.length == declared + 1 then [] else
    [s!"emit: the header accounts for {declared} rows beside its own, but the document has {document.length} lines"])

/-- Vectors whose framing does not decode back to itself. -/
def roundTripFailures : List String :=
  (vectors.filter fun entry => !roundTrips entry.2).map fun entry =>
    s!"emit: encoding vector {entry.1} does not decode back to its own framing"

/-- The planted set must refuse sixteen and admit exactly one; the
    admitted one must be the lawful twin. -/
def verdictFailures : List String :=
  let refused := (planted.filter wasRefused).length
  let admitted := planted.length - refused
  let admittedNames := (planted.filter fun entry => !wasRefused entry).map (·.1)
  (if refused == 16 then [] else
    [s!"emit: expected sixteen refused planted candidates, the door refused {refused}"]) ++
  (if admitted == 1 then [] else
    [s!"emit: expected one admitted planted candidate, the door admitted {admitted}"]) ++
  (if admittedNames == ["lawfulDeclare"] then [] else
    [s!"emit: the admitted candidate set is {admittedNames}, not the lawful twin"])

/-- The freeze is ASCII: no line may carry a control character or a
    byte above the printable range. -/
def asciiFailures : List String :=
  (document.filter fun line =>
    !line.all fun character =>
      character.toNat >= 0x20 && character.toNat <= 0x7e).map fun line =>
    s!"emit: a record carries a character outside printable ASCII: {line}"

/-- Every reason the emitter would refuse to print. -/
def emitFailures : List String :=
  countFailures ++ roundTripFailures ++ verdictFailures ++ asciiFailures

end Unity.Emit
