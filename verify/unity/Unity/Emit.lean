/-
The kernel conformance emitter: format 2 of `kernel-conformance.ndjson`.

Every row is COMPUTED. Three sources answer, and none of them is a
person retyping a table:

  * running the kernel model's own definitions — `DeclKind.rank` and
    `rankToKind` for the kind table, `HoleStage.rank` and `rankToStage`
    for the stage table, `RefusalReason.wire`, `Kernel.taught` and
    `RefusalReason.applicability` for the taught refusals, `encodeAct`
    for the sentence vectors, and `Kernel.admit` at
    `Kernel.Planted.door` for the admission verdicts;
  * reading the Lean environment at elaboration time — the mini-AST of
    the sort system and each type's docstring, minted by
    `kernel_manifest` from `getConstInfo` and `findDocString?` against
    the committed closed list of names below;
  * running this package's own canonicalizer over the ten canon
    vectors, so the corpus carries a self-test of the byte form it is
    written in.

What stays hand-written is exactly one thing: WHICH types the
interchange carries. That is a decision, so it is a committed list.
Everything the corpus says ABOUT those types is read, never retyped —
a renamed field, a reordered constructor or a reworded docstring moves
these bytes on the next build.

Format 2 differs from format 1 in the byte form (estate canonical
JSON, so keys appear sorted) and in two new record groups (`doc` and
`canon`). The record fields of the older groups are unchanged.

This module lives beside the bridge and reads only the kernel model.
It changes neither upstream tree, and it promotes nothing: the rows
report what the model decides, and a conformance vector is a check on
an implementation, never a guarantee about one.
-/
import Unity.Program
import Unity.Reflect

namespace Unity.Emit

/-! ## The kind and stage tables

Ranks come from the model's own rank functions, and the row set is
enumerated through the model's decode functions, so a kind or stage
added without a rank cannot appear as a row. The constructor SPELLINGS
below are the one thing a compiled emitter cannot ask about, because an
executable carries no environment; `Unity/Check.lean` asks the
environment on the gate's behalf and refuses a spelling that drifted.
-/

/-- The name of a declaration kind. The spelling table lives beside
    the program carrier, which also has to write kind names, so the
    interchange has one place a kind is spelled and not two. -/
def kindName : Kernel.DeclKind -> String := Program.kindName

/-- The name of a hole stage, at the model's spelling. -/
def stageName : Kernel.HoleStage -> String
  | .opened => "opened"
  | .filled => "filled"
  | .disputed => "disputed"
  | .decided => "decided"
  | .sealed => "sealed"

/-- One kind record as a canonical value. -/
def kindValue (name : String) (rank : Nat) : Canon.Value :=
  .obj
    [ ("record", .str "kind")
    , ("name", .str name)
    , ("rank", .num rank) ]

/-- One stage record as a canonical value. -/
def stageValue (name : String) (rank : Nat) : Canon.Value :=
  .obj
    [ ("record", .str "stage")
    , ("name", .str name)
    , ("rank", .num rank) ]

/-- One kind record at the canonical byte form. Shared with the checker
    so the artifact and the check can never differ by formatting. -/
def kindRow (name : String) (rank : Nat) : String :=
  Canon.render (kindValue name rank)

/-- One stage record at the canonical byte form. -/
def stageRow (name : String) (rank : Nat) : String :=
  Canon.render (stageValue name rank)

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
checker pins it against the environment's constructor order. -/

/-- The refusal reasons in declaration order. -/
def reasons : List Kernel.RefusalReason :=
  [ .clockRead, .absenceTrigger, .unfencedDecide, .lastWriterWins
  , .unverifiedRead, .crossSortIdentifier, .mintedIdentifier
  , .ambientQueryInput, .forwardReference, .secretCarrier
  , .absenceClaim, .pastMutation, .offWritReferent
  , .closureIntrospection, .anchoredResolve, .unfilledHole ]

/-- One refusal record, every field read out of the model's tables. -/
def refusalRow (reason : Kernel.RefusalReason) : String :=
  let refusal := Kernel.taught reason
  Canon.render (.obj
    [ ("record", .str "refusal")
    , ("reason", .str reason.wire)
    , ("law", .str refusal.law)
    , ("repair", .str refusal.repair)
    , ("applicability", .str reason.applicability.wire) ])

/-- The sixteen taught refusals. -/
def refusalRows : List String := reasons.map refusalRow

/-! ## The closed list of carried types

The manifest, and the only hand-written table left in the emitter: the
names of the kernel types the interchange carries, in
`Kernel/Definitions.lean` declaration order. `kernel_manifest` reads
each one out of the environment and mints three lists — the names, the
mini-AST rows, and the docstring rows. It refuses a repeated name and a
manifest whose declaration lines do not ascend, so a shuffled list
cannot emit a shuffled corpus that still passes every per-row check.
-/

kernel_manifest kernelTypes typeRows docRows from
  DeclKind Digest Value StateLabel Petname Token LanePartition Position
  AnchorFact HoleStage KTriggerPredicate Act RawArg CandidateAnchor
  TokenClaim MergeStrategy CandidatePredicate CandidateAct RefusalReason
  Refusal Applicability Door

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

/-- One encoding record: the vector's name and the model's framing. -/
def encodingRow (entry : String × Kernel.Act) : String :=
  Canon.render (.obj
    [ ("record", .str "encoding")
    , ("name", .str entry.1)
    , ("act", .arr ((Kernel.encodeAct entry.2).map Canon.Value.num)) ])

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

The planted candidates of `Kernel.Planted`, refused rows first and
admitted rows after. The refused block opens with the sixteen closure
rows in the order the kernel gate exercises them — that prefix stays
aligned with the taught-refusal table position for position, which a
consumer checks — and closes with the stage-rank edge, a lawful trigger
production carrying a rank the closed stage table cannot read. The
admitted block opens with the lawful twin and closes with a lawful
trigger whose every referent is catalogued — the first passing admission
to reach the trigger arm's referent check at all, since both planted
triggers refuse on their predicate production.

The verdicts are computed by running the door, so a door that changed
its mind changes the artifact and reddens the regeneration check.

This group is the HOST conformance roster: every row here is a verdict a
runtime door is expected to reproduce. Rows that document the model and
make no claim on a host go to `model-admission` below. -/

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
  , ("staleStageTrigger", Kernel.Planted.staleStageTrigger)
  , ("lawfulDeclare", Kernel.Planted.lawfulDeclare)
  , ("catalogedTrigger", Kernel.Planted.catalogedTrigger)
  ]

/-- One admission record: the door's verdict on the named candidate. -/
def admissionRow (entry : String × Kernel.CandidateAct) : String :=
  match Kernel.admit Kernel.Planted.door entry.2 with
  | .refused refusal =>
      Canon.render (.obj
        [ ("record", .str "admission")
        , ("name", .str entry.1)
        , ("verdict", .str "refused")
        , ("reason", .str refusal.reason.wire) ])
  | .admitted act =>
      Canon.render (.obj
        [ ("record", .str "admission")
        , ("name", .str entry.1)
        , ("verdict", .str "admitted")
        , ("encoded", .arr ((Kernel.encodeAct act).map Canon.Value.num)) ])

/-- The admission rows. -/
def admissionRows : List String := planted.map admissionRow

/-- Whether the door refused a candidate. -/
def wasRefused (entry : String × Kernel.CandidateAct) : Bool :=
  match Kernel.admit Kernel.Planted.door entry.2 with
  | .refused _ => true
  | .admitted _ => false

/-! ## Model-internal admissions

The tenth group. Rows here are admitted sentences the model publishes to
DOCUMENT itself, and they are marked so no host replays them: each
carries `scope = "model-internal"` under its own record tag, so a
consumer that walks record tags skips the whole group without having to
know what is in it.

What the group carries today is the aliasing pair. `canonicalBytes`
folds a payload into one identity, weighing a digest reference
`1 + kind.rank * 4096 + id` against a literal's `2 + value * 16`, so
`[ref lane 1]` and `[literal 1024]` both weigh 16386 and the two
DISTINCT lawful declarations become one encoded sentence. That quotient
is RULED INTENDED and model-internal (operator grill ruling A8, sitting
record DEV-772, 2026-08-19): a payload denotes its canonical value, so
two spellings of one value are one sentence HERE. Real injectivity is
the byte-level canonicalizer's obligation and is walled separately under
DEV-807, which is exactly why these rows must not become a host
conformance claim — a host that reproduced this collision would be
reproducing a model convenience, not the estate's byte identity. -/

/-- The model-internal candidates by their `Kernel.Planted` name. -/
def modelInternal : List (String × Kernel.CandidateAct) :=
  [ ("aliasRefDeclare", Kernel.Planted.aliasRefDeclare)
  , ("aliasLiteralDeclare", Kernel.Planted.aliasLiteralDeclare)
  ]

/-- One model-internal record. The scope field is written by the model,
    not annotated afterwards: the marking originates in emission, so a
    row cannot reach a consumer without it. -/
def modelInternalRow (entry : String × Kernel.CandidateAct) : String :=
  match Kernel.admit Kernel.Planted.door entry.2 with
  | .refused refusal =>
      Canon.render (.obj
        [ ("record", .str "model-admission")
        , ("scope", .str "model-internal")
        , ("name", .str entry.1)
        , ("verdict", .str "refused")
        , ("reason", .str refusal.reason.wire) ])
  | .admitted act =>
      Canon.render (.obj
        [ ("record", .str "model-admission")
        , ("scope", .str "model-internal")
        , ("name", .str entry.1)
        , ("verdict", .str "admitted")
        , ("encoded", .arr ((Kernel.encodeAct act).map Canon.Value.num)) ])

/-- The model-internal rows. -/
def modelInternalRows : List String := modelInternal.map modelInternalRow

/-- The encoded sentence a candidate admits to, if the door admits it. -/
def admittedEncoding (entry : String × Kernel.CandidateAct) :
    Option (List Nat) :=
  match Kernel.admit Kernel.Planted.door entry.2 with
  | .admitted act => some (Kernel.encodeAct act)
  | .refused _ => none

/-! ## The canon vectors

The corpus self-tests the byte form it is written in. Each vector
carries a value and that value's canonical serialization as a string,
so a consumer that canonicalizes the `value` field and does not get the
`bytes` field has a defect in its writer, located by name.

The vectors are chosen at the places a writer goes wrong: the two empty
containers, the empty string, zero, an integer past the double-safe
range, an object whose members are written out of order (the `bytes`
show `a` before `b`, which is the whole point), nesting on both sides,
the four two-character escapes, and a control character that has no
two-character escape. -/

/-- A string carrying a double quote, a backslash, a newline and a tab
    — the escapes a writer most often gets wrong. -/
def escapeSample : String := "a\"b\\c\nd\te"

/-- A string carrying the control character U+0001, which has no
    two-character escape and must render as a lowercase four-digit
    unicode escape. -/
def controlSample : String := String.singleton (Char.ofNat 0x01)

/-- The ten canon vectors, in emission order. The `key-order` vector is
    written here with its members out of order on purpose: what reaches
    the file is the canonicalization of what is written, so the record
    demonstrates the sort rather than describing it. -/
def canonVectors : List (String × Canon.Value) :=
  [ ("empty-object", .obj [])
  , ("empty-array", .arr [])
  , ("empty-string", .str "")
  , ("zero", .num 0)
  , ("big-integer", .num 9007199254740993)
  , ("key-order", .obj [("b", .num 1), ("a", .num 2)])
  , ("nested-object", .obj [("z", .obj [("y", .arr [.num 3, .num 4])])])
  , ("nested-array", .arr [.arr [], .arr [.obj []]])
  , ("string-escapes", .str escapeSample)
  , ("control-char", .str controlSample)
  ]

/-- One canon record: the value, and the value's own canonical bytes
    carried as a string. -/
def canonRow (entry : String × Canon.Value) : String :=
  Canon.render (.obj
    [ ("record", .str "canon")
    , ("name", .str entry.1)
    , ("value", entry.2)
    , ("bytes", .str (Canon.render entry.2)) ])

/-- The canon rows. -/
def canonRows : List String := canonVectors.map canonRow

/-! ## The program vectors

The ninth group: program declarations as data. Each record carries the
declaration value and that value's own canonical bytes, so a consumer
that parses the declaration and re-encodes it has a self-test with the
answer beside the question — the same discipline the canon group
applies to the byte form, applied one level up to the meta DAG
language.

The vectors themselves are committed in `Unity/Program.lean`, beside
the erasure and the laws about them, because they are model data the
proofs quantify over and not a rendering decision. What happens here
is rendering, and the emit-time checks below refuse a rendering whose
declaration would not survive the round trip.
-/

/-- One program record: the declaration, and the declaration's own
    canonical bytes carried as a string. -/
def programRow (entry : String × Program.Declaration) : String :=
  Canon.render (.obj
    [ ("record", .str "program")
    , ("name", .str entry.1)
    , ("declaration", Program.declarationValue entry.2)
    , ("bytes", .str (Program.declarationBytes entry.2)) ])

/-- The program rows. -/
def programRows : List String := Program.vectors.map programRow

/-! ## The document -/

/-- The record groups, in the order the freeze fixes them.

    `model-admission` is LAST, and the position is load-bearing rather
    than cosmetic. A consumer that does not know a group skips it, and
    the strict reading of the add-only rule — the one the Go reader
    enforces — is that an unrecognised group must be APPENDED after
    every known group, so that skipping it can never leave a known group
    stranded behind an unknown one. A tenth group written between
    `admission` and `doc` is refused by that reader; written after
    `program` it is skipped by every reader that does not want it. -/
def groupOrder : List String :=
  ["kind", "stage", "refusal", "type", "encoding", "admission", "doc",
    "canon", "program", "model-admission"]

/-- The counts the header declares. The emitter re-derives every one of
    them from the RENDERED document before printing: a declared count is
    a claim about the file, so it is checked against the file rather
    than against the list it was written from. -/
def counts : List (String × Nat) :=
  [ ("kind", kindRows.length)
  , ("stage", stageRows.length)
  , ("refusal", refusalRows.length)
  , ("type", typeRows.length)
  , ("encoding", encodingRows.length)
  , ("admission", admissionRows.length)
  , ("doc", docRows.length)
  , ("canon", canonRows.length)
  , ("program", programRows.length)
  , ("model-admission", modelInternalRows.length) ]

/-- The header. -/
def header : String :=
  Canon.render (.obj
    [ ("record", .str "header")
    , ("format", .num 2)
    , ("generator", .str "verify/unity emit")
    , ("source", .str "verify/kernel")
    , ("counts", .obj (counts.map fun entry => (entry.1, Canon.Value.num entry.2))) ])

/-- The whole artifact, one line per record, in the frozen order. -/
def document : List String :=
  header :: kindRows ++ stageRows ++ refusalRows ++ typeRows ++
    encodingRows ++ admissionRows ++ docRows ++ canonRows ++
    programRows ++ modelInternalRows

/-! ## Emit-time checks

The emitter refuses to print a corpus that fails its own checks. Each
check answers a way the document could be wrong while still looking
well formed. -/

/-- The record tag of a line, read back out of the rendered bytes. Every
    tag in this module is obtained this way rather than from the list a
    row came from, so a row that rendered under the wrong tag is
    counted where it actually landed. -/
def tagOf (line : String) : Option String :=
  match Canon.parse line with
  | .ok value => Canon.stringAt value "record"
  | .error _ => none

/-- The tags of the rendered document, in file order. -/
def tags : List String := document.filterMap tagOf

/-- Lines the emitter's own reader cannot parse into a tagged record. -/
def parseFailures : List String :=
  document.filterMap fun line =>
    if (tagOf line).isSome then none
    else some s!"emit: a rendered line is not a tagged canonical record: {line}"

/-- Header counts that do not match the rendered document, and a
    document whose length the header does not account for — a record
    group the header forgot to name would otherwise ride along
    uncounted. -/
def countFailures : List String :=
  let declared := counts.foldl (fun total entry => total + entry.2) 0
  counts.filterMap (fun entry =>
    let rendered := (tags.filter fun tag => tag == entry.1).length
    if entry.2 == rendered then none
    else some s!"emit: the header declares {entry.2} {entry.1} rows but the document carries {rendered}") ++
  (if document.length == declared + 1 then [] else
    [s!"emit: the header accounts for {declared} rows beside its own, but the document has {document.length} lines"])

/-- The tag sequence the freeze demands: the header, then each group
    whole and in order. -/
def expectedTags : List String :=
  "header" :: List.foldr (· ++ ·) []
    (groupOrder.map fun group =>
      List.replicate (tags.filter fun tag => tag == group).length group)

/-- A document whose groups interleave or appear out of order. -/
def orderFailures : List String :=
  if tags == expectedTags then []
  else [s!"emit: the record groups are out of order or interleaved: {tags}"]

/-- Vectors whose framing does not decode back to itself. -/
def roundTripFailures : List String :=
  (vectors.filter fun entry => !roundTrips entry.2).map fun entry =>
    s!"emit: encoding vector {entry.1} does not decode back to its own framing"

/-- The names the door must admit in the HOST roster, in emission order:
    the lawful twin and the fully catalogued trigger. Spelled out rather
    than counted, because a count agrees with a roster that swapped a
    refusal for an admission. -/
def admittedRoster : List String :=
  ["lawfulDeclare", "catalogedTrigger"]

/-- The planted set must refuse seventeen and admit exactly the roster
    above, and the refused rows must form a PREFIX of the emission —
    the shape every consumer of the admission group reads by, since the
    refused prefix is what aligns position for position with the taught
    refusal table. -/
def verdictFailures : List String :=
  let refusedNames := (planted.filter wasRefused).map (·.1)
  let admittedNames := (planted.filter fun entry => !wasRefused entry).map (·.1)
  (if refusedNames.length == 17 then [] else
    [s!"emit: expected seventeen refused planted candidates, the door refused {refusedNames.length}"]) ++
  (if admittedNames == admittedRoster then [] else
    [s!"emit: the admitted candidate set is {admittedNames}, not {admittedRoster}"]) ++
  (if planted.map (·.1) == refusedNames ++ admittedNames then [] else
    [s!"emit: the refused rows are not a prefix of the planted roster: {planted.map (·.1)}"])

/-- The model-internal group states one ruled fact, so the emitter
    refuses to print it unless the fact still holds: both rows admitted,
    and both admitting to ONE encoded sentence. That collision is the
    ruled model quotient (A8); if the fold ever separates them, this
    group is documenting something that stopped being true and the
    emitter says so rather than shipping a stale illustration. -/
def modelInternalFailures : List String :=
  match modelInternal with
  | [left, right] =>
      (if modelInternal.map (·.1) == ["aliasRefDeclare", "aliasLiteralDeclare"]
        then [] else
        [s!"emit: the model-internal roster is {modelInternal.map (·.1)}"]) ++
      (match admittedEncoding left, admittedEncoding right with
       | some leftEncoded, some rightEncoded =>
           if leftEncoded == rightEncoded then [] else
             [s!"emit: the aliasing pair no longer shares one encoded sentence: {leftEncoded} vs {rightEncoded}"]
       | _, _ => ["emit: a model-internal aliasing row is no longer admitted"])
  | _ => [s!"emit: the model-internal group carries {modelInternal.length} rows, not two"]

/-- The freeze is ASCII: no line may carry a control character or a
    byte above the printable range. -/
def asciiFailures : List String :=
  (document.filter fun line =>
    !line.all fun character =>
      character.toNat >= 0x20 && character.toNat <= 0x7e).map fun line =>
    s!"emit: a record carries a character outside printable ASCII: {line}"

/-- Every canon vector's `bytes` field must be its `value` field's own
    canonical serialization, read back out of the rendered record rather
    than trusted from the term that produced it. -/
def canonFailures : List String :=
  canonRows.filterMap fun line =>
    match Canon.parse line with
    | .error reason => some s!"emit: a canon record does not parse: {reason}"
    | .ok record =>
        match Canon.member record "value", Canon.stringAt record "bytes",
            Canon.stringAt record "name" with
        | some value, some bytes, some name =>
            if Canon.render value == bytes then none
            else some s!"emit: canon vector {name} carries bytes that are not its value's canonical form"
        | _, _, _ => some s!"emit: a canon record is missing a field: {line}"

/-- The both-ways law at emit time: every rendered line must read back
    and write out to the same bytes. -/
def bothWaysFailures : List String :=
  Canon.bothWaysFailures document

/-- Every program vector, checked the way a consumer will check it:
    the edges must be the consumptions the arguments imply, the
    erasure must be a program the kernel admits, the declared
    parameters must ascend, the rendered declaration must read back to
    the committed carrier, and the `bytes` field must be that
    declaration's own canonical form. The order is the order a reader
    wants: the graph first, then the identity of the bytes. -/
def programFailures : List String :=
  (Program.vectors.zip programRows).flatMap fun entry =>
    let name := entry.1.1
    let declaration := entry.1.2
    Program.wellFormedFailures name declaration ++
      (match Canon.parse entry.2 with
       | .error reason =>
           [s!"emit: a program record does not parse: {reason}"]
       | .ok record =>
           match Canon.member record "declaration",
               Canon.stringAt record "bytes" with
           | some value, some bytes =>
               (if Program.readDeclaration value == some declaration then []
                else
                  [s!"emit: program vector {name} does not read back to its own declaration"]) ++
               (if Canon.render value == bytes then [] else
                  [s!"emit: program vector {name} carries bytes that are not its declaration's canonical form"])
           | _, _ =>
               [s!"emit: a program record is missing a field: {entry.2}"])

/-- Every reason the emitter would refuse to print. -/
def emitFailures : List String :=
  parseFailures ++ bothWaysFailures ++ countFailures ++ orderFailures ++
    roundTripFailures ++ verdictFailures ++ modelInternalFailures ++
    asciiFailures ++ canonFailures ++ programFailures

end Unity.Emit
