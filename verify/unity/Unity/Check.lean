/-
The conformance checker: the independent guard on the COMMITTED bytes.

`Unity/Emit.lean` builds the corpus and prints it; this module reads
the committed file back and asks the Lean environment, from scratch,
whether the file still tells the truth. The two paths share the
manifest of names and the row RENDERING (so a disagreement is never a
disagreement of formatting) and share nothing else: the emitter's
mini-AST rows are baked at its own elaboration, and the rows this
checker compares them against are derived here, now, from
`getConstInfo` and `findDocString?`.

What is checked, in the order a failure is most usefully reported:

  * the both-ways law — every line reads back through this package's
    own reader and writes out to the same bytes, which is what makes
    "the file is in estate canonical form" a checked claim rather than
    a habit of the writer;
  * the header — its key set, the format number, the generator and
    source, and every declared count against the records actually
    present;
  * the group sequence — the frozen order, each group whole, nothing
    interleaved;
  * the kind and stage tables against the constructor names of
    `DeclKind` and `HoleStage`, in declaration order, with the rank
    equal to the position;
  * the refusal rows against the constructor names of `RefusalReason`,
    under the wire spelling rule that a camel-cased reason is its
    hyphenated name;
  * every mini-AST row — form, parameters and their brand roles,
    constructor names, field names, field types — against the real
    declaration, and the row order against the declaration order in the
    source;
  * every docstring row against `findDocString?`, so a reworded
    docstring cannot sit stale in the corpus;
  * the admission rows against `Kernel.Planted`, so no verdict can be
    reported for a candidate that does not exist;
  * every canon vector's `bytes` against the canonicalization of its
    own `value`, which is the corpus testing the writer that wrote it;
  * every program vector — that it reads back as a declaration, that
    its edge list is exactly the consumptions its arguments imply,
    that its `bytes` are that declaration's canonical form, that its
    erasure is a program the kernel admits, and that every generator
    it applies and every field name it binds is one the environment
    declares on `Kernel.Act`.

A checker that cannot fail proves nothing: `must-not-compile/` carries
a planted wrong row that this module must refuse, beside its correct
twin that must elaborate, and the gate mutates copies of the corpus and
demands each mutation fail for its own named reason.
-/
import Lean
import Unity.Emit

namespace Unity.Check

open Lean Meta Elab Command

/-! ## Reading the artifact -/

/-- One record of the corpus, as read back: its bytes, the value those
    bytes parse to, and the record tag it declares. -/
structure Row where
  line : String
  value : Canon.Value
  tag : String

/-- The records of a committed corpus. Reading is where the both-ways
    law is enforced, so every later check runs against a file already
    known to be in canonical form. -/
def readRows (path : String) : MetaM (List Row) := do
  let text <- IO.FS.readFile path
  let pieces := text.splitOn "\n"
  match pieces.reverse with
  | [] => throwError "conformance: {path} is empty"
  | last :: reversedBody =>
      unless last == "" do
        throwError "conformance: {path} does not end with a line feed"
      let body := reversedBody.reverse
      if body.isEmpty then
        throwError "conformance: {path} carries no records"
      body.mapM fun line => do
        match Canon.bothWays line with
        | .error reason => throwError "conformance: {reason}"
        | .ok _ =>
            match Canon.parse line with
            | .error reason => throwError "conformance: {reason}"
            | .ok value =>
                match Canon.stringAt value "record" with
                | none =>
                    throwError "conformance: a record does not declare its record tag: {line}"
                | some tag => return { line := line, value := value, tag := tag }

/-- The rows carrying one record tag, in file order. -/
def rowsTagged (tag : String) (rows : List Row) : List Row :=
  rows.filter fun row => row.tag == tag

/-- The text a record binds to a key, or a report naming the record. -/
def fieldString (row : Row) (key : String) : MetaM String := do
  match Canon.stringAt row.value key with
  | some text => return text
  | none =>
      throwError "conformance: a {row.tag} record binds no {key} field: {row.line}"

/-- The wire spelling rule: a camel-cased constructor name is its
    hyphenated lowercase name. -/
def hyphenated (camel : String) : String :=
  String.join (camel.toList.map fun character =>
    if character.isUpper then "-" ++ String.singleton character.toLower
    else String.singleton character)

/-! ## The checks -/

/-- The header: its key set, its constants, and every declared count
    against the records actually present. -/
def checkHeader (rows : List Row) : MetaM Unit := do
  match rows with
  | [] => throwError "conformance: the corpus carries no records"
  | header :: _ =>
      unless header.tag == "header" do
        throwError "conformance: the corpus does not open with a header record"
      let keys := (Canon.keysOf header.value).getD []
      unless keys == ["counts", "format", "generator", "record", "source"] do
        throwError "conformance: the header key set moved: {keys}"
      unless Canon.natAt header.value "format" == some 2 do
        throwError "conformance: the header does not declare format 2: {header.line}"
      unless Canon.stringAt header.value "generator" == some "verify/unity emit" do
        throwError "conformance: the header names the wrong generator: {header.line}"
      unless Canon.stringAt header.value "source" == some "verify/kernel" do
        throwError "conformance: the header names the wrong source: {header.line}"
      match Canon.member header.value "counts" with
      | none => throwError "conformance: the header binds no counts"
      | some counts =>
          let countKeys := (Canon.keysOf counts).getD []
          unless countKeys.length == Emit.groupOrder.length do
            throwError "conformance: the header counts name {countKeys}, not the frozen groups"
          for group in Emit.groupOrder do
            let present := (rowsTagged group rows).length
            match Canon.natAt counts group with
            | none => throwError "conformance: the header declares no {group} count"
            | some declared =>
                unless declared == present do
                  throwError "conformance: the header declares {declared} {group} records; the corpus carries {present}"

/-- The group sequence: the header, then each group whole and in the
    frozen order. -/
def checkGroupOrder (rows : List Row) : MetaM Unit := do
  let tags := rows.map (·.tag)
  let expected :=
    "header" :: List.foldr (· ++ ·) []
      (Emit.groupOrder.map fun group =>
        List.replicate (rowsTagged group rows).length group)
  unless tags == expected do
    throwError "conformance: the record groups are out of order or interleaved\n  corpus:   {tags}\n  expected: {expected}"

/-- A rank table against the constructors it names: same names, same
    order, rank equal to position. -/
def checkRankTable (what typeName : String) (row : String -> Nat -> String)
    (rows : List Row) : MetaM Unit := do
  let expected := (<- Reflect.ctorNames typeName).mapIdx fun rank name => row name rank
  let present := rows.map (·.line)
  unless present == expected do
    throwError "conformance: {what} disagrees with the environment\n  corpus:      {present}\n  environment: {expected}"

/-- The refusal rows against the reason constructors: same order, wire
    spelling by the hyphenation rule. -/
def checkRefusalRows (rows : List Row) : MetaM Unit := do
  let reasons := (<- Reflect.ctorNames "RefusalReason").map hyphenated
  let spelled <- rows.mapM (fieldString · "reason")
  unless spelled == reasons do
    throwError "conformance: the taught refusal table disagrees with the environment\n  corpus:      {spelled}\n  environment: {reasons}"

/-- One mini-AST row against the declaration it claims to describe. -/
def checkTypeRow (line : String) : MetaM Unit := do
  match Canon.parse line with
  | .error reason => throwError "conformance: {reason}"
  | .ok value =>
      match Canon.stringAt value "name" with
      | none => throwError "conformance: not a mini-AST row: {line}"
      | some short =>
          let expected := Shape.typeRow (<- Reflect.shapeOf short)
          unless line == expected do
            throwError "conformance: mini-AST row disagrees with the environment\n  type: {short}\n  corpus:      {line}\n  environment: {expected}"

/-- The mini-AST rows: the committed manifest's names in the committed
    order, each row rebuilt from the environment, and the manifest's
    order pinned to the declaration order of the source. -/
def checkTypeRows (rows : List Row) : MetaM Unit := do
  let names <- rows.mapM (fieldString · "name")
  unless names == Emit.kernelTypes do
    throwError "conformance: the mini-AST rows do not name the committed manifest\n  corpus:   {names}\n  manifest: {Emit.kernelTypes}"
  for row in rows do
    checkTypeRow row.line
  let lines <- names.mapM Reflect.declarationLine
  unless (lines.zip (lines.drop 1)).all (fun pair => pair.1 < pair.2) do
    throwError "conformance: the mini-AST rows are not in declaration order\n  rows:  {names}\n  lines: {lines}"

/-- The docstring rows: the same names in the same order, each row
    rebuilt from `findDocString?`. -/
def checkDocRows (rows : List Row) : MetaM Unit := do
  let names <- rows.mapM (fieldString · "name")
  unless names == Emit.kernelTypes do
    throwError "conformance: the docstring rows do not name the committed manifest\n  corpus:   {names}\n  manifest: {Emit.kernelTypes}"
  for row in rows do
    let short <- fieldString row "name"
    let expected := Shape.docRow short (<- Reflect.docOf short)
    unless row.line == expected do
      throwError "conformance: docstring row disagrees with the environment\n  type: {short}\n  corpus:      {row.line}\n  environment: {expected}"

/-- Every admission row names a candidate that exists. -/
def checkAdmissionRows (rows : List Row) : MetaM Unit := do
  let environment <- getEnv
  for row in rows do
    let candidate <- fieldString row "name"
    let name := `Kernel.Planted ++ Name.mkSimple candidate
    unless environment.contains name do
      throwError "conformance: the admission row names {name}, which is not declared"

/-- Every model-internal row names a candidate that exists AND carries
    its scope marking. The marking is what keeps these rows out of a
    host's conformance roster, so a row that lost it is a row that would
    silently become a claim about an implementation. -/
def checkModelInternalRows (rows : List Row) : MetaM Unit := do
  checkAdmissionRows rows
  unless rows.length == Emit.modelInternal.length do
    throwError "conformance: the corpus carries {rows.length} model-internal rows; the model publishes {Emit.modelInternal.length}"
  for row in rows do
    let scope <- fieldString row "scope"
    unless scope == "model-internal" do
      let name <- fieldString row "name"
      throwError "conformance: model-internal row {name} declares scope {scope}, not model-internal"

/-- Every canon vector: the committed names in the committed order, and
    each vector's `bytes` field equal to the canonicalization of its own
    `value` field. This is the corpus testing the writer that wrote
    it — a consumer that canonicalizes the value and does not get the
    bytes has a defect, located by name. -/
def checkCanonRows (rows : List Row) : MetaM Unit := do
  let names <- rows.mapM (fieldString · "name")
  let committed := Emit.canonVectors.map (·.1)
  unless names == committed do
    throwError "conformance: the canon vectors do not name the committed set\n  corpus:    {names}\n  committed: {committed}"
  for row in rows do
    let name <- fieldString row "name"
    let bytes <- fieldString row "bytes"
    match Canon.member row.value "value" with
    | none => throwError "conformance: canon vector {name} binds no value"
    | some value =>
        let canonical := Canon.render value
        unless canonical == bytes do
          throwError "conformance: canon vector {name} carries bytes that are not its value's canonical form\n  bytes:     {bytes}\n  canonical: {canonical}"

/-- Every program vector: the committed names in the committed order,
    the graph the arguments imply, the canonical bytes, the kernel's
    admission verdict on the erasure, and the generator and field
    spellings against the environment's own account of `Kernel.Act`.
    The spelling tables are checked before the rows, so a renamed
    constructor is reported as a renamed constructor rather than as a
    vector that suddenly names nothing. -/
def checkProgramRows (rows : List Row) : MetaM Unit := do
  let names <- rows.mapM (fieldString · "name")
  unless names == Program.vectorNames do
    throwError "conformance: the program vectors do not name the committed set\n  corpus:    {names}\n  committed: {Program.vectorNames}"
  let tagNames <- Reflect.ctorNames "GenTag"
  unless tagNames == Program.generatorNames do
    throwError "conformance: the generator spellings disagree with the environment\n  corpus:      {Program.generatorNames}\n  environment: {tagNames}"
  let actNames <- Reflect.ctorNames "Act"
  unless actNames == Program.generatorNames do
    throwError "conformance: the generator spellings do not name the act constructors\n  corpus:      {Program.generatorNames}\n  environment: {actNames}"
  let shape <- Reflect.shapeOf "Act"
  let declared := shape.ctors.map fun constructor =>
    (constructor.name, constructor.fields.map (·.name))
  for row in rows do
    let name <- fieldString row "name"
    match Canon.member row.value "declaration" with
    | none => throwError "conformance: program vector {name} binds no declaration"
    | some value =>
        match Program.readDeclaration value with
        | none =>
            throwError "conformance: program vector {name} is not a program declaration: {row.line}"
        | some declaration =>
            let implied := Program.consumptionEdges declaration
            unless declaration.edges == implied do
              throwError "conformance: program vector {name} carries edges that are not the consumptions its arguments imply\n  corpus:  {Canon.render (.arr (declaration.edges.map Program.edgeValue))}\n  implied: {Canon.render (.arr (implied.map Program.edgeValue))}"
            let bytes <- fieldString row "bytes"
            let canonical := Canon.render value
            unless canonical == bytes do
              throwError "conformance: program vector {name} carries bytes that are not its declaration's canonical form\n  bytes:     {bytes}\n  canonical: {canonical}"
            unless Program.admissible (Program.erase declaration) do
              throwError "conformance: program vector {name} erases to a program node admission refuses"
            unless Program.holesAscend declaration.holes do
              throwError "conformance: program vector {name} declares holes that do not ascend by name"
            for node in declaration.nodes do
              let spelling := Program.generatorName node.generator
              match declared.find? (fun entry => entry.1 == spelling) with
              | none =>
                  throwError "conformance: program vector {name} applies {spelling}, which the environment does not declare"
              | some entry =>
                  for argument in node.args do
                    unless entry.2.contains argument.name do
                      throwError "conformance: program vector {name} binds the field {argument.name} on {spelling}, which the environment does not declare"

/-- The whole committed corpus, checked against the environment. -/
def checkCorpus (path : String) : MetaM Unit := do
  let rows <- readRows path
  logInfo s!"conformance: {rows.length} lines survive read and rewrite byte-identically"
  checkHeader rows
  checkGroupOrder rows
  logInfo s!"conformance: the header declares {Emit.groupOrder.length} groups and every count matches the records present"
  checkRankTable "the declaration kind table" "DeclKind" Emit.kindRow
    (rowsTagged "kind" rows)
  checkRankTable "the hole stage table" "HoleStage" Emit.stageRow
    (rowsTagged "stage" rows)
  checkRefusalRows (rowsTagged "refusal" rows)
  checkAdmissionRows (rowsTagged "admission" rows)
  logInfo "conformance: the kind, stage, refusal and admission tables agree with the environment"
  let modelInternalRows := rowsTagged "model-admission" rows
  checkModelInternalRows modelInternalRows
  logInfo s!"conformance: {modelInternalRows.length} model-internal rows name real candidates and carry their scope marking"
  let typeRows := rowsTagged "type" rows
  checkTypeRows typeRows
  logInfo s!"conformance: {typeRows.length} mini-AST rows agree with the environment"
  let docRows := rowsTagged "doc" rows
  checkDocRows docRows
  logInfo s!"conformance: {docRows.length} docstring rows agree with the environment"
  let canonRows := rowsTagged "canon" rows
  checkCanonRows canonRows
  logInfo s!"conformance: {canonRows.length} canon vectors re-canonicalize to their own bytes"
  let programRows := rowsTagged "program" rows
  checkProgramRows programRows
  logInfo s!"conformance: {programRows.length} program vectors state their own graph, erase to admitted programs, and re-canonicalize to their own bytes"

/-! ## The commands -/

/-- Check a whole committed corpus against the environment. -/
elab "#kernelConformance" path:str : command =>
  liftTermElabM (checkCorpus path.getString)

/-- Check one mini-AST row. The control arm plants a wrong row here;
    its witness twin plants the right one. -/
elab "#kernelTypeRow" row:str : command =>
  liftTermElabM (checkTypeRow row.getString)

end Unity.Check
