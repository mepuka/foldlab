/-
`estore-vectors` — the golden-vector emitter (ruling CV-1, candidate C-2).

WHAT THIS CLOSES. The differential harness was self-referential: exactly one committed
address existed estate-wide (`harness/12-wfs-closed.script:39`) and no transcript was ever
committed, so a codec or digest change moved BOTH runners identically and the harness
stayed green. A format drift was therefore invisible to the one gate that was supposed to
see it. This module emits the corpus that makes format drift a failing diff, and
`Shell/Harness.lean`'s `--record`/`--compare` emits the transcript half.

WHERE THE NUMBERS COME FROM. Every byte below is the PROVEN FUNCTIONS' OWN OUTPUT, called
directly — `E2.preimageS`, `E2.preimageE`, `E2.canonS`, `E2.canonV`,
`E2.schemaAdmissionClause`, `E2.valueAdmissionClause`, and `Shell.H` (the estate's
kernel-KAT'd `Sha3.Impl.sha3_512`). Nothing here is a hand-written row: the conformance
bundle's avoid-list forbids one (CONTEXT.md, "Conformance bundle"). What IS hand-written
is the FIXTURE LIST — the carriers themselves — and the arm labels that say which encoder
arm each carrier exercises. Those are inputs and prose; the vectors are outputs.

WHAT IS AUDITED RATHER THAN PROVED. That the fixture list names every arm of
`E2/Encode.lean` is a REVIEWED CLAIM, not a theorem — the same posture `canonicalSpellingB`
carries in `E2/Model.lean`. What the emitter does check mechanically, failing the run
otherwise, is narrower and worth having: every positive fixture is admissible, and the
rejection fixtures' CALLED clause names cover the admission-clause census exactly.

This tool follows the `estore-encode` precedent (STORE-SHELL §6: fixture tooling may sit
outside the shell's own constraints) except in one respect — it does NOT sit outside the
gates. It is an executable root of this package and it joins the G-S module coverage like
every other root (the F-43(a) lesson). It uses no IO primitive that was not already
whitelisted.
-/
import Shell.Carrier
import Shell.Render
import Shell.Verbs

namespace Shell

open E2 System

/-! ## Layout helpers -/

/-- Right-pad with spaces. Total; a longer string is returned unchanged. -/
def padTo (n : Nat) (s : String) : String :=
  s ++ String.ofList (List.replicate (n - s.length) ' ')

/-- One `key value` line of a vector record. The key column is fixed-width so a reader —
    and a `grep` — sees columns rather than ragged text. -/
def vecField (key val : String) : String := padTo 10 key ++ val

/-! ## The fixture list

Fixtures are written as SOURCE TEXT in the harness script language and parsed through
`Shell/Carrier.lean`, so every `fixture` column below replays verbatim as a script step.
That is the point of the column: a vector nobody can replay is a number, not a fixture. -/

/-- The plane a vector's carrier lives on. An entity vector carries the SOURCE of the
    schema vector it is typed by, so the emitter derives the cited schema address by
    calling `preimageS` rather than by copying a digest across rows. -/
inductive VecPlane
  | schemaCarrier
  | entityCarrier (schemaVecId : String) (schemaSrc : String)

structure GoldenVector where
  vecId : String
  /-- The encoder arm this carrier exercises, named as it is spelled in `E2/Encode.lean`. -/
  vecArm : String
  /-- The discriminator byte(s) that arm emits. -/
  vecTag : String
  vecPlane : VecPlane
  vecSrc : String

/-- The one address every cross-referencing fixture points at: the address of `(prim int)`,
    which is vector `S-03`. Derived, never transcribed — `ref` and `vaddr` fixtures splice
    THIS in, so the corpus has no digest literal a reviewer must take on faith. -/
def anchorHex : String := hexOfAddr (H (preimageS (.prim .int)))

/-- A 128-character payload: exactly the first length that pushes `E2.encNat` off its
    single-byte arm (`encNat 128 = [0x80, 0x01]`). A TS reimplementation of the frame that
    gets LEB128's continuation bit wrong passes every shorter vector and fails this one. -/
def longPayload : String := String.ofList (List.replicate 128 'x')

/-- Table 1: one ADMISSIBLE carrier per encoder arm of `E2/Encode.lean`.

    22 tag values are in play — 7 on the value plane (0x10–0x16), 2 on the check plane
    (0x20–0x21), 13 on the schema plane (0x30–0x3C) — plus the sub-byte variants that ride
    inside a tag (`Prim`, `UMode`, field optionality, `filter`'s abort flag) and the two
    arms of each frame (`encNat`, `encInt`). -/
def positiveVectors : List GoldenVector :=
  [ ⟨"S-01", "SchemaCore.prim / Prim.null", "0x30 0x00", .schemaCarrier, "(prim null)"⟩
  , ⟨"S-02", "SchemaCore.prim / Prim.bool", "0x30 0x01", .schemaCarrier, "(prim bool)"⟩
  , ⟨"S-03", "SchemaCore.prim / Prim.int", "0x30 0x02", .schemaCarrier, "(prim int)"⟩
  , ⟨"S-04", "SchemaCore.prim / Prim.str", "0x30 0x03", .schemaCarrier, "(prim str)"⟩
  , ⟨"S-05", "SchemaCore.lit / Value.vstr", "0x31 0x13", .schemaCarrier, "(lit (s \"gold\"))"⟩
  , ⟨"S-06", "SchemaCore.lit / Value.vbool", "0x31 0x11", .schemaCarrier, "(lit true)"⟩
  , ⟨"S-07", "SchemaCore.lit / encInt .negSucc", "0x31 0x12", .schemaCarrier, "(lit (i -7))"⟩
  , ⟨"S-08", "SchemaCore.object / FieldList req+opt", "0x32", .schemaCarrier,
      "(object (f \"a\" req (prim int)) (f \"b\" opt (prim str)))"⟩
  , ⟨"S-09", "SchemaCore.tuple", "0x33", .schemaCarrier, "(tuple (prim int) (prim str))"⟩
  , ⟨"S-10", "SchemaCore.array", "0x34", .schemaCarrier, "(array (prim bool))"⟩
  , ⟨"S-11", "SchemaCore.union / UMode.anyOf", "0x35 0x00", .schemaCarrier,
      "(union anyOf (prim int) (prim str))"⟩
  , ⟨"S-12", "SchemaCore.union / UMode.oneOf", "0x35 0x01", .schemaCarrier,
      "(union oneOf (prim bool) address)"⟩
  , ⟨"S-13", "SchemaCore.refine / Check.filter", "0x36 0x20", .schemaCarrier,
      "(refine (prim str) (filter \"minLength\" (i 3) true))"⟩
  , ⟨"S-14", "Check.filterGroup / filter abort=false", "0x36 0x21", .schemaCarrier,
      "(refine (prim int) (group (filter \"gt\" (i 0) false) (filter \"lt\" (i 10) true)))"⟩
  , ⟨"S-15", "SchemaCore.ref", "0x37", .schemaCarrier, "(ref " ++ anchorHex ++ ")"⟩
  , ⟨"S-16", "SchemaCore.var (bound, under mu)", "0x39 0x38", .schemaCarrier,
      "(mu \"d\" (object (f \"next\" opt (var 0))))"⟩
  , ⟨"S-17", "SchemaCore.mu", "0x39", .schemaCarrier,
      "(mu \"list\" (union oneOf (lit (s \"nil\")) \
       (object (f \"head\" req (prim int)) (f \"tail\" req (var 0)))))"⟩
  , ⟨"S-18", "SchemaCore.address", "0x3a", .schemaCarrier, "address"⟩
  , ⟨"S-19", "SchemaCore.tupleRest", "0x3b", .schemaCarrier,
      "(tuple-rest (prim bool) (prim str) (prim int))"⟩
  , ⟨"S-20", "SchemaCore.record", "0x3c", .schemaCarrier, "(record (prim str))"⟩
  , ⟨"S-21", "encNat multi-byte frame (schema plane)", "0x31 0x13", .schemaCarrier,
      "(lit (s \"" ++ longPayload ++ "\"))"⟩
  , ⟨"E-01", "Value.vnull", "0x10", .entityCarrier "S-01" "(prim null)", "null"⟩
  , ⟨"E-02", "Value.vbool true", "0x11 0x01", .entityCarrier "S-02" "(prim bool)", "true"⟩
  , ⟨"E-03", "Value.vbool false", "0x11 0x00", .entityCarrier "S-02" "(prim bool)", "false"⟩
  , ⟨"E-04", "Value.vint / encInt .ofNat", "0x12 0x00", .entityCarrier "S-03" "(prim int)", "(i 7)"⟩
  , ⟨"E-05", "Value.vint zero", "0x12 0x00", .entityCarrier "S-03" "(prim int)", "(i 0)"⟩
  , ⟨"E-06", "Value.vint / encInt .negSucc", "0x12 0x01", .entityCarrier "S-03" "(prim int)",
      "(i -7)"⟩
  , ⟨"E-07", "Value.vstr", "0x13", .entityCarrier "S-04" "(prim str)", "(s \"gold\")"⟩
  , ⟨"E-08", "Value.varr", "0x14", .entityCarrier "S-10" "(array (prim bool))",
      "(arr true false)"⟩
  , ⟨"E-09", "Value.vobj", "0x15",
      .entityCarrier "S-08" "(object (f \"a\" req (prim int)) (f \"b\" opt (prim str)))",
      "(obj (\"a\" (i 1)) (\"b\" (s \"two\")))"⟩
  , ⟨"E-10", "Value.vaddr", "0x16", .entityCarrier "S-18" "address",
      "(vaddr " ++ anchorHex ++ ")"⟩
  , ⟨"E-11", "encNat multi-byte frame (value plane)", "0x13", .entityCarrier "S-04" "(prim str)",
      "(s \"" ++ longPayload ++ "\")"⟩
  ]

/-- Table 2: one carrier per admission clause. The clause each one trips is NOT written
    here — it is obtained by calling `E2.schemaAdmissionClause` / `E2.valueAdmissionClause`
    on the carrier the PUT boundary would decode. -/
structure RejectionVector where
  rejId : String
  /-- `true` when the carrier is a VALUE (the entity plane's admission), `false` for a
      schema. -/
  rejOnValuePlane : Bool
  rejSrc : String

def rejectionVectors : List RejectionVector :=
  [ ⟨"R-01", false, "(var 0)"⟩
  , ⟨"R-02", false, "(mu \"d\" (var 0))"⟩
  , ⟨"R-03", false, "(object (f \"a\" req (prim int)) (f \"a\" req (prim str)))"⟩
  , ⟨"R-04", false, "(union anyOf (prim int))"⟩
  , ⟨"R-05", false, "(lit null)"⟩
  , ⟨"R-06", true, "(obj (\"k\" (i 1)) (\"k\" (i 2)))"⟩
  ]

/-- The admission-clause census, transcribed from `E2.schemaAdmissionClause` and
    `E2.valueAdmissionClause` in `formal/entity-store/E2/Admission.lean`. It is a COVERAGE
    ASSERTION, not a vector row: the emitter fails unless the clauses its calls return
    cover this list exactly, so a clause added to the core without a rejection carrier
    breaks the emitter rather than passing unnoticed. -/
def admissionClauseCensus : List String :=
  ["closed", "guarded", "dup-key", "spelling", "lit-narrow", "dup-key-value"]

/-! ## Continuity witnesses

`harness/12-wfs-closed.script:39` places `(var 0)`'s pre-image under its own digest. Until
this corpus landed, that filename was the ONLY committed address in the whole estate — and
that is precisely why the differential could not see a codec change: with nothing else
pinned, `encSchema`, `preimageS`, `canonS`, `versionByte` and `H` could all move together
and both harness runners would agree on the new answer.

A continuity witness is a carrier whose address is ALREADY committed somewhere else, carried
here so the new corpus and the old committed byte string are the same claim rather than two
independent ones. `(var 0)` is inadmissible at the PUT boundary — it IS rejection vector
R-01's `closed` carrier — so it is kept out of the positive table's admissibility rule and
given its own section, with its verdict printed rather than hidden. -/

structure ContinuityWitness where
  cwVector : GoldenVector
  /-- The committed site whose bytes this vector must reproduce. -/
  cwSite : String
  /-- The address as it stands committed at that site. The emitter FAILS unless its own
      computation agrees, so this transcription cannot rot silently. -/
  cwCommitted : String

def continuityWitnesses : List ContinuityWitness :=
  [ ⟨⟨"C-01", "SchemaCore.var (free — the `closed` rejection carrier)", "0x38",
       .schemaCarrier, "(var 0)"⟩,
     "harness/12-wfs-closed.script:39",
     "6669f686ad57eac1e08dcf6d5c8d9e4022247adea8b0e784c8f5f9654db0f4ca08c87cb55b3db4c88bc9eb61874ede6f0ef2c128d09bdb687a1b229a7e56afcd"⟩ ]

/-! The same pin as a compiled-evaluation guard — the estate's `#guard` idiom, cf.
    `Shell/Hash.lean`. The emitter checks it too, but a `#guard` fails the BUILD, so a
    codec change is caught before anyone thinks to regenerate. -/

#guard hexOfBytes (preimageS (.var 0)) == "01003800"
#guard hexOfAddr (H (preimageS (.var 0))) ==
  "6669f686ad57eac1e08dcf6d5c8d9e4022247adea8b0e784c8f5f9654db0f4ca08c87cb55b3db4c88bc9eb61874ede6f0ef2c128d09bdb687a1b229a7e56afcd"

/-! ## Rendering -/

/-- What one positive vector resolves to, once the fixture is parsed and the core's own
    functions are called on it. -/
structure VecResult where
  resAdmission : String
  resPreimage : String
  resAddress : String
  /-- `some (vecId, addressHex)` for an entity vector: the schema vector it cites. -/
  resSchemaCite : Option (String × String)

private def admissionText : Option String → String
  | none => "ok"
  | some c => "REJECTED:" ++ c

/-- Resolve one positive vector by calling the core. Everything returned here is output of
    `E2.preimageS` / `E2.preimageE` / `E2.canonS` / `E2.canonV` / the admission verdicts /
    `Shell.H` — there is no other source of a number in this file. -/
def resolveVector (v : GoldenVector) : Except String VecResult :=
  match v.vecPlane with
  | .schemaCarrier => do
      let s ← parseSchema AddrEnv.empty v.vecSrc
      let pre := preimageS s
      .ok ⟨admissionText (schemaAdmissionClause (canonS s)), hexOfBytes pre,
           hexOfAddr (H pre), none⟩
  | .entityCarrier sid ssrc => do
      let s ← parseSchema AddrEnv.empty ssrc
      let sAddr := H (preimageS s)
      let val ← parseValue AddrEnv.empty v.vecSrc
      let pre := preimageE sAddr val
      .ok ⟨admissionText (valueAdmissionClause (canonV val)), hexOfBytes pre,
           hexOfAddr (H pre), some (sid, hexOfAddr sAddr)⟩

private def carrierWord : VecPlane → String
  | .schemaCarrier => "schema"
  | .entityCarrier _ _ => "entity"

private def vectorRecord (v : GoldenVector) (r : VecResult) : List String :=
  [ vecField "vector" v.vecId
  , vecField "arm" v.vecArm
  , vecField "tag" v.vecTag
  , vecField "carrier" (carrierWord v.vecPlane) ] ++
  (match r.resSchemaCite with
   | none => []
   | some (sid, sHex) => [vecField "schema" (sid ++ " " ++ sHex)]) ++
  [ vecField "fixture" v.vecSrc
  , vecField "admission" r.resAdmission
  , vecField "preimage" r.resPreimage
  , vecField "address" r.resAddress ]

private def armIndexLine (v : GoldenVector) : String :=
  "; " ++ padTo 40 v.vecArm ++ padTo 12 v.vecTag ++ v.vecId

private def positiveHeader (vs : List GoldenVector) : List String :=
  [ "; GENERATED by `lake exe estore-vectors <vectors-dir>` \
     (experiments/entity-store-shell/Shell/Vectors.lean) — DO NOT EDIT."
  , ";"
  , "; Golden vectors, table 1 of the CV-1 conformance bundle (docs/entity-store/RULINGS.md"
  , "; entry CV-1; docs/entity-store/CONTEXT.md entry \"Conformance bundle\"). POSITIVE"
  , "; vectors: one ADMISSIBLE carrier per encoder arm of formal/entity-store/E2/Encode.lean."
  , ";"
  , "; Every number below is the proven functions' own output, called directly:"
  , ";"
  , ";   schema vector   preimage = E2.preimageS s          address = H (E2.preimageS s)"
  , ";   entity vector   preimage = E2.preimageE sAddr v    address = H (E2.preimageE sAddr v)"
  , ";                   sAddr    = H (E2.preimageS s) of the cited schema vector"
  , ";   admission       E2.schemaAdmissionClause (E2.canonS s)   [schema plane]"
  , ";                   E2.valueAdmissionClause  (E2.canonV v)   [value plane]"
  , ";   H               Shell.H = Sha3.Impl.sha3_512, the estate's kernel-KAT'd digest"
  , ";"
  , "; `preimageS`/`preimageE` CANONICALIZE, so a vector's bytes are the bytes of the"
  , "; carrier's canonical form — which is exactly what the PUT boundary decodes. Hex is"
  , "; lowercase, two digits per byte, no separators (the store's own spelling)."
  , ";"
  , "; The `fixture` column is harness-script source (Shell/Carrier.lean), so every row"
  , "; replays verbatim: `(schema-put <fixture>)`, `(entity-put <schema-addr> <fixture>)`."
  , ";"
  , "; COVERAGE IS AUDITED, NOT PROVED. That the arm index below names every arm of"
  , "; E2/Encode.lean is a reviewed claim, not a theorem. What IS mechanical: the emitter"
  , "; fails unless every fixture here is admissible (`admission ok`)."
  , ";"
  , "; --- arm index (encoder arm -> tag -> vector id) ---" ] ++
  vs.map armIndexLine ++
  [ "; --- end arm index ---", "" ]

/-- The continuity section's own header: what these rows are for, and why they sit outside
    the positive table's admissibility rule. -/
private def continuityHeader : List String :=
  [ "; --- continuity witnesses ---"
  , ";"
  , "; Carriers whose address is ALREADY committed elsewhere in the estate. They make this"
  , "; corpus and the older committed byte string ONE claim instead of two: if a codec,"
  , "; canonicalization or digest change moved the address, this section and the cited site"
  , "; would disagree and the emitter would fail."
  , ";"
  , "; These carriers are NOT admissible — the `admission` column says which clause rejects"
  , "; each one — so they are deliberately excluded from the positive table's rule that"
  , "; every fixture be admissible. The `witness` column names the committed site."
  , ";" ]

/-- Table 1's file, or the first fixture that failed to parse or was inadmissible. -/
def renderPositiveFile : Except String String := do
  let rec go : List GoldenVector → Except String (List String)
    | [] => .ok []
    | v :: rest => do
        let r ← resolveVector v
        if r.resAdmission != "ok" then
          .error s!"positive vector {v.vecId} is not admissible: {r.resAdmission}"
        else do
          let tl ← go rest
          .ok (vectorRecord v r ++ [""] ++ tl)
  let rec goCont : List ContinuityWitness → Except String (List String)
    | [] => .ok []
    | w :: rest => do
        let r ← resolveVector w.cwVector
        if r.resAddress != w.cwCommitted then
          .error s!"continuity witness {w.cwVector.vecId} DOES NOT MATCH {w.cwSite}: \
committed {w.cwCommitted}, computed {r.resAddress}"
        else do
          let tl ← goCont rest
          .ok (vectorRecord w.cwVector r ++
                [vecField "witness" (w.cwSite ++ " (address matches)"), ""] ++ tl)
  let body ← go positiveVectors
  let cont ← goCont continuityWitnesses
  .ok (String.intercalate "\n"
        (positiveHeader positiveVectors ++ body ++ continuityHeader ++ cont) ++ "\n")

/-! ### Table 2 -/

/-- The clause a rejection carrier trips, obtained by calling the core's admission
    verdict on the carrier the PUT boundary decodes. Public rather than `private` so
    `Shell/VectorTheorems.lean` can state the `clause` column as a theorem about THIS
    function rather than about a copy of it. -/
def rejectionClause (r : RejectionVector) : Except String String :=
  if r.rejOnValuePlane then do
    let v ← parseValue AddrEnv.empty r.rejSrc
    match valueAdmissionClause (canonV v) with
    | some c => .ok c
    | none => .error s!"rejection vector {r.rejId} was ADMITTED — it states nothing"
  else do
    let s ← parseSchema AddrEnv.empty r.rejSrc
    match schemaAdmissionClause (canonS s) with
    | some c => .ok c
    | none => .error s!"rejection vector {r.rejId} was ADMITTED — it states nothing"

private def rejectionRecord (r : RejectionVector) (clause : String) : List String :=
  [ vecField "vector" r.rejId
  , vecField "plane" (if r.rejOnValuePlane then "value" else "schema")
  , vecField "fixture" r.rejSrc
  , vecField "clause" clause
  , "" ]

private def rejectionHeader (rows : List (RejectionVector × String)) : List String :=
  [ "; GENERATED by `lake exe estore-vectors <vectors-dir>` \
     (experiments/entity-store-shell/Shell/Vectors.lean) — DO NOT EDIT."
  , ";"
  , "; Golden vectors, table 2 of the CV-1 conformance bundle (docs/entity-store/RULINGS.md"
  , "; entry CV-1). REJECTION vectors: one carrier per admission clause."
  , ";"
  , "; The `clause` column is NOT written by hand. It is the return value of"
  , ";"
  , ";   E2.schemaAdmissionClause (E2.canonS s)   [schema plane]"
  , ";   E2.valueAdmissionClause  (E2.canonV v)   [value plane]"
  , ";"
  , "; called on the carrier the PUT boundary decodes — the same surface"
  , "; Shell/Boundary.lean calls, so a clause renamed in the core moves this file."
  , ";"
  , "; The emitter fails unless these clauses cover the census in Shell/Vectors.lean"
  , "; exactly: a clause added to the core without a carrier here breaks the build."
  , "; Coverage completeness beyond that census is audited, not proved."
  , ";"
  , "; --- clause index (clause -> vector id) ---" ] ++
  rows.map (fun (r, c) => "; " ++ padTo 20 c ++ r.rejId) ++
  [ "; --- end clause index ---", "" ]

/-- Table 2's file, or the first fixture that failed to parse or was admitted. -/
def renderRejectionFile : Except String String := do
  let rec go : List RejectionVector → Except String (List (RejectionVector × String))
    | [] => .ok []
    | r :: rest => do
        let c ← rejectionClause r
        let tl ← go rest
        .ok ((r, c) :: tl)
  let rows ← go rejectionVectors
  let seen := rows.map Prod.snd
  let missing := admissionClauseCensus.filter (fun c => !seen.contains c)
  let stray := seen.filter (fun c => !admissionClauseCensus.contains c)
  if !missing.isEmpty then
    .error s!"admission clauses with no rejection carrier: {missing}"
  else if !stray.isEmpty then
    .error s!"rejection carriers naming clauses outside the census: {stray}"
  else
    .ok (String.intercalate "\n"
          (rejectionHeader rows ++ rows.flatMap (fun (r, c) => rejectionRecord r c)) ++ "\n")

/-! ## The tool -/

/-- The corpus file names, fixed here so the emitter and any consumer name the same two
    files. -/
def positiveFileName : String := "positive.vectors"

def rejectionFileName : String := "rejection.vectors"

private def writeGenerated (p : FilePath) (text : String) : IO Unit := do
  IO.FS.writeBinFile p text.toUTF8

private def vectorsUsage : String :=
  "usage: estore-vectors <vectors-dir>"

/-- Emit tables 1 and 2 into `dir`. Deterministic by construction: a fixed fixture list in
    a fixed order, total pure functions over it, no clock, no environment, no host path in
    the output. Re-running overwrites with identical bytes. -/
def runVectors (argv : List String) : IO UInt32 := do
  match argv with
  | dir :: [] => do
    match renderPositiveFile, renderRejectionFile with
    | .error e, _ => do IO.eprintln s!"estore-vectors: {e}"; pure 2
    | _, .error e => do IO.eprintln s!"estore-vectors: {e}"; pure 2
    | .ok pos, .ok rej => do
        let d : FilePath := ⟨dir⟩
        let posPath := d / positiveFileName
        let rejPath := d / rejectionFileName
        IO.FS.createDirAll d
        writeGenerated posPath pos
        writeGenerated rejPath rej
        let np := positiveVectors.length
        let nr := rejectionVectors.length
        IO.println s!"estore-vectors: {np} positive vectors -> {posPath}"
        IO.println s!"estore-vectors: {nr} rejection vectors -> {rejPath}"
        pure 0
  | _ => do IO.eprintln vectorsUsage; pure 2

end Shell
