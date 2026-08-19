/-
The kernel's TypeScript surfaces, as generator functions into `Unity.Ts`.

Three sources answer, and none of them is a person retyping a table:

  * the conformance corpus this package already emits — the kind and stage
    registries with their ranks, the taught refusals with their law, repair and
    applicability, and the corpus's own digest, which is what a generated
    surface carries instead of a location;
  * the projection AST of `verify/projections`, walked over the same closed
    manifest the corpus is minted from — the declaration shapes, and in
    particular the binder ROLE, which is what selects the sorts that become
    branded aliases;
  * the reviewed refusal roster, read as data — the runtime spellings in their
    persisted order and the standing meaning each carries, which is prose under
    review and lives nowhere a model could compute it.

The roster is the one input that is neither derived nor model-computed, and it
is read rather than transcribed. The wall on it is the parity wall itself: the
committed surface was rendered from the runtime's own copy of the same reviewed
data, so if the two copies part company the emitted bytes stop matching.

Everything below is a total function of those three. No path, no clock, no
environment beyond the walk the caller hands over.
-/
import Unity.Emit
import Unity.Sha
import Unity.Ts
import Projections.Ast

namespace Unity.TsKernel

open Unity.Ts

/-! ## Reading the corpus -/

/-- One taught refusal, as the corpus states it. -/
structure Refusal where
  reason : String
  law : String
  repair : String
  applicability : String

/-- The tables a target reads out of one corpus. -/
structure Tables where
  digest : String
  format : Nat
  source : String
  generator : String
  kinds : List (String × Nat)
  stages : List (String × Nat)
  refusals : List Refusal

/-- The parsed records of one group, in file order. -/
def recordsOf (group : String) (lines : List String) : List Canon.Value :=
  lines.filterMap fun line =>
    match Canon.parse line with
    | .ok value => if Canon.stringAt value "record" == some group then some value else none
    | .error _ => none

/-- A named-and-ranked row. -/
def rankedRow (value : Canon.Value) : Except String (String × Nat) :=
  match Canon.stringAt value "name", Canon.natAt value "rank" with
  | some name, some rank => .ok (name, rank)
  | _, _ => .error "ts: a ranked corpus row is missing its name or its rank"

/-- One taught refusal row. -/
def refusalRow (value : Canon.Value) : Except String Refusal :=
  match Canon.stringAt value "reason", Canon.stringAt value "law",
      Canon.stringAt value "repair", Canon.stringAt value "applicability" with
  | some reason, some law, some repair, some applicability =>
      .ok { reason := reason, law := law, repair := repair, applicability := applicability }
  | _, _, _, _ => .error "ts: a refusal corpus row is missing a field"

/-- The corpus's own bytes: one record per line, a final newline. This is the
    byte sequence the digest names. -/
def corpusBytes (lines : List String) : String :=
  String.intercalate "\n" lines ++ "\n"

/-- Read the tables a TypeScript target needs out of the corpus lines. -/
def readTables (lines : List String) : Except String Tables := do
  let header <-
    match lines with
    | [] => .error "ts: the corpus is empty"
    | first :: _ =>
        match Canon.parse first with
        | .ok value => .ok value
        | .error reason => .error s!"ts: the corpus header does not parse: {reason}"
  let format <-
    match Canon.natAt header "format" with
    | some format => .ok format
    | none => .error "ts: the corpus header declares no format"
  let source <-
    match Canon.stringAt header "source" with
    | some source => .ok source
    | none => .error "ts: the corpus header names no source"
  let emitter <-
    match Canon.stringAt header "generator" with
    | some emitter => .ok emitter
    | none => .error "ts: the corpus header names no generator"
  let kinds <- (recordsOf "kind" lines).mapM rankedRow
  let stages <- (recordsOf "stage" lines).mapM rankedRow
  let refusals <- (recordsOf "refusal" lines).mapM refusalRow
  if kinds.isEmpty then .error "ts: the corpus declares no declaration kinds"
  else if stages.isEmpty then .error "ts: the corpus declares no hole stages"
  else if refusals.isEmpty then .error "ts: the corpus declares no taught refusals"
  else
    .ok { digest := Sha.digestOf (corpusBytes lines), format := format
        , source := source, generator := emitter
        , kinds := kinds, stages := stages, refusals := refusals }

/-! ## Reading the reviewed roster -/

/-- The reviewed refusal roster: the runtime spellings in their persisted
    order, and the standing meaning of each model-emitted reason. Every meaning
    is ratified, so nothing here says how one is introduced — a sentence is
    rendered as itself. -/
structure Roster where
  runtimeKinds : List (String × String)
  modelReasons : List (String × String)

/-- One roster row, keyed by the field its record names. -/
def rosterRow (nameKey : String) (value : Canon.Value) : Except String (String × String) :=
  match Canon.stringAt value nameKey, Canon.stringAt value "meaning" with
  | some name, some meaning => .ok (name, meaning)
  | _, _ => .error s!"ts: a roster row is missing its {nameKey} or its meaning"

/-- Read the roster from its committed lines. -/
def readRoster (lines : List String) : Except String Roster := do
  let rows := lines.filter (fun line => !line.isEmpty)
  let runtimeKinds <- (recordsOf "runtime-kind" rows).mapM (rosterRow "kind")
  let modelReasons <- (recordsOf "model-reason" rows).mapM (rosterRow "reason")
  if runtimeKinds.isEmpty then .error "ts: the roster names no runtime refusal kinds"
  else if modelReasons.isEmpty then .error "ts: the roster names no model refusal reasons"
  else
    let names := runtimeKinds.map (·.1)
    if names.any (fun name => (names.filter (fun other => other == name)).length != 1) then
      .error "ts: the roster names a runtime refusal kind twice"
    else
      let reasons := modelReasons.map (·.1)
      if reasons.any (fun name => (reasons.filter (fun other => other == name)).length != 1) then
        .error "ts: the roster names a model refusal reason twice"
      else
        .ok { runtimeKinds := runtimeKinds, modelReasons := modelReasons }

/-- The standing meaning of one model-emitted reason. Both directions refuse
    rather than default: a reason the roster does not cover would render an
    unexplained kind, and a roster row naming no reason is a meaning for a kind
    that no longer exists. -/
def reasonMeanings (roster : Roster) (refusals : List Refusal)
    : Except String (List (String × String)) := do
  for refusal in refusals do
    if (roster.modelReasons.find? (fun row => row.1 == refusal.reason)).isNone then
      throw s!"ts: corpus refusal reason {refusal.reason} carries no reviewed meaning"
  for row in roster.modelReasons do
    if (refusals.find? (fun refusal => refusal.reason == row.1)).isNone then
      throw s!"ts: the roster names {row.1}, which the corpus does not emit"
  refusals.mapM fun refusal =>
    match roster.modelReasons.find? (fun row => row.1 == refusal.reason) with
    | some row => .ok (refusal.reason, row.2)
    | none => .error s!"ts: no meaning for {refusal.reason}"

/-! ## The branded sorts, read out of the projection AST

A structure indexed by at least one brand parameter and carrying exactly one
field is a branded scalar, and that field's type is its carrier. A
brand-indexed structure of any other shape has no single value a brand could
ride on, so it is REPORTED rather than invented. The role is the walk's answer
about a binder, never an annotation, which is what makes this selection a
reading of the model rather than a list. -/

/-- A structure the sort system indexes by a brand, with its carrier field. -/
structure BrandedSort where
  name : String
  params : List String
  carrier : String

/-- A brand-indexed structure with no single carrier field to brand. -/
structure UnbrandedSort where
  name : String
  params : List String

/-- The branded and the reported sorts of one projection AST. -/
def sortsOf (ast : Projections.ProjectionAst)
    : List BrandedSort × List UnbrandedSort :=
  ast.declarations.foldl
    (fun (found : List BrandedSort × List UnbrandedSort) declaration =>
      let brands := (declaration.parameters.filter (fun field => field.role == .brand)).map
        (fun field => field.name)
      match declaration with
      | .structureDecl name _ constructor =>
          if brands.isEmpty then found
          else
            let shortName := Projections.eraseName name
            match constructor.fields with
            | [only] =>
                (found.1 ++ [{ name := shortName, params := brands
                             , carrier := only.typeExpr.erase.render }], found.2)
            | _ => (found.1, found.2 ++ [{ name := shortName, params := brands }])
      | .inductiveDecl .. => found)
    ([], [])

/-- The target's carrier for a model scalar. A carrier this map does not name
    is a finding, never a guess. -/
def carrierOf (sort : BrandedSort) : Except String TsType :=
  if sort.carrier == "Nat" then .ok (.keyword "number")
  else if sort.carrier == "String" then .ok (.keyword "string")
  else .error s!"ts: sort {sort.name} carries unmapped model type {sort.carrier}"

/-- The first letter raised. -/
def capitalize (value : String) : String :=
  match value.toList with
  | [] => ""
  | first :: rest => String.ofList (first.toUpper :: rest)

/-- A brand parameter named after a record class the corpus enumerates is
    constrained to that closed union, so a misspelled kind stops compiling.
    Every other brand domain is open, and an open domain gets the widest honest
    constraint. -/
def brandConstraint (parameter : String) : TsType :=
  if parameter == "kind" then .reference "KernelDeclKind" []
  else if parameter == "stage" then .reference "KernelHoleStage" []
  else .keyword "string"

/-- The brand tag of a sort: one template literal type whose substitutions are
    the sort's own brand parameters. -/
def brandTag (sort : BrandedSort) : TsType :=
  let head := "~foldlab/plait/kernel/" ++ sort.name ++ "/"
  let rec spans : List String -> List (TsType × String)
    | [] => []
    | [only] => [(TsType.reference (capitalize only) [], "")]
    | first :: rest => (TsType.reference (capitalize first) [], "/") :: spans rest
  .template head (spans sort.params)

/-! ## Doc comments the surfaces carry -/

/-- One ratified meaning as a doc comment: the sentence greedy-wrapped, and
    nothing above it. The taste pass ruled on these sentences, so a line
    introducing one as unratified would now be false. -/
def meaningDoc (meaning : String) : Doc :=
  { layout := .block
  , blocks := [.wrapped meaningWrap meaning.trimAscii.toString] }

/-! ## The kernel tables surface -/

/-- The module header of the kernel tables surface. -/
def tablesHeader (tables : Tables) : List String :=
  [ "Plane: kernel — the language: corpus, door, programs, and wire grammar."
  , ""
  , "GENERATED FILE - DO NOT EDIT."
  , ""
  , "Corpus:  " ++ tables.digest
  , "Format:  interchange format " ++ toString tables.format
  , ""
  , "That digest is this module's whole provenance, and it is a digest rather"
  , "than a location because a plait item refers only to digests: a path names"
  , "wherever a reader happens to be standing, which is the ambient reference the"
  , "algebra refuses. It is SHA-256 over the corpus's canonical bytes."
  , ""
  , "The kernel model's closed tables, projected into the runtime's type layer:"
  , "the declaration-kind and hole-stage registries with their ranks, the taught"
  , "refusals with the law each defends and the repair each teaches, and the"
  , "compile-time brands of the sort system. The existing runtime refusal"
  , "projection is also generated here; a spelling the corpus does not carry is"
  , "marked staged debt, and the ticket owning it stays in the reviewed roster."
  , ""
  , "Every refusal row carries its kind's standing MEANING as a doc comment: one"
  , "to two sentences saying what fact the kind names and what that implies,"
  , "distinct from the law and repair a refusal teaches at the moment it fires."
  , "The operator's taste pass ratified those sentences, so each one stands as"
  , "written and nothing is rendered above it."
  , ""
  , "These are safety-side names and texts, never runtime guarantees. A model"
  , "theorem stays in the model; what crosses the seam is the vocabulary the"
  , "door harness then checks the runtime against, verdict for verdict."
  , ""
  , "Brand identities are string literals, not unique symbols, because that is"
  , "how the estate's pinned Effect release spells a type identity."
  , ""
  , "@module" ]

/-- One runtime spelling's ancestry: corpus-backed when the model emits the
    reason, staged debt otherwise. -/
def runtimeSource (tables : Tables) (kind : String) : String :=
  if (tables.refusals.find? (fun refusal => refusal.reason == kind)).isSome then
    "kernel-corpus"
  else "staged-debt"

/-- The provenance record every generated surface carries. -/
def provenance (tables : Tables) : TsExpr :=
  .asConst (.object .block
    [ (none, .name "corpus", .str tables.digest)
    , (none, .name "format", .bigint tables.format) ])

/-- The literal-array constant of a closed vocabulary. -/
def literalRoster (names : List String) : TsExpr :=
  .asConst (.array .block (names.map fun name => (none, TsExpr.str name)))

/-- The `(typeof NAME)[number]` alias body. -/
def rosterMember (name : String) : TsType :=
  .indexed (.parens (.query (.reference name []))) (.keyword "number")

/-- The kernel tables surface. -/
def tablesModule (tables : Tables) (roster : Roster) (ast : Projections.ProjectionAst)
    : Except String TsModule := do
  let (branded, reported) := sortsOf ast
  let meanings <- reasonMeanings roster tables.refusals
  let meaningOf := fun (reason : String) =>
    match meanings.find? (fun row => row.1 == reason) with
    | some row => row.2
    | none => ""
  let brandedRows <- branded.mapM fun sort => do
    let carrier <- carrierOf sort
    let parameters :=
      sort.params.map (fun parameter =>
        ({ name := capitalize parameter, constraint := some (brandConstraint parameter)
         , fallback := none } : TypeParameter)) ++
      [{ name := "Carrier", constraint := none, fallback := some carrier }]
    .ok (TsStmt.typeAlias
      (some (Doc.line s!"The branded {sort.name} sort, indexed by {String.intercalate " and " sort.params}."))
      ("Kernel" ++ sort.name) parameters .block
      (.intersection [.reference "Carrier" [], .reference "KernelBrand" [brandTag sort]]))
  let digestSort := branded.find? (fun sort => sort.name == "Digest")
  let digestAliases <-
    match digestSort with
    | none => Except.ok ([] : List TsStmt)
    | some sort => do
        let carrier <- carrierOf sort
        Except.ok
          (TsStmt.comment (Doc.rows
            [ "The per-kind digest aliases. The declaration kinds are the one brand"
            , "domain the model closes, so they enumerate; a register and a partition"
            , "are open, so their brands stay parameters." ]) ::
            tables.kinds.map (fun kind =>
              TsStmt.typeAlias
                (some (Doc.line s!"A content address branded to the {kind.1} declaration kind."))
                (capitalize kind.1 ++ "Digest")
                [{ name := "Carrier", constraint := none, fallback := some carrier }]
                .inline
                (.reference ("Kernel" ++ sort.name) [.literal kind.1, .reference "Carrier" []])) ++
            [TsStmt.blank])
  let reportedRows :=
    if reported.isEmpty then ([] : List TsStmt)
    else
      [ TsStmt.constant
          (some (Doc.rows
            [ "Brand-indexed sorts with no single carrier field, so no scalar alias is"
            , "generated for them. They are reported rather than invented: a structure"
            , "with several fields has no one value a brand could ride on." ]))
          "KERNEL_UNBRANDED_INDEXED_SORTS"
          (.asConst (.array .block (reported.map fun sort =>
            (none, TsExpr.object .inline
              [ (none, .name "name", .str sort.name)
              , (none, .name "params", .array .inline
                  (sort.params.map fun parameter => (none, TsExpr.str parameter))) ]))))
      , TsStmt.blank ]
  Except.ok
    { statements :=
        [ .comment (Doc.rows (tablesHeader tables))
        , .blank
        , .constant
            (some (Doc.rows
              [ "What these tables came from, carried as data for a consumer to assert: the"
              , "identity of the corpus, and the interchange format it was read at. A"
              , "consumer that wants to know whether it holds these tables' source hashes"
              , "the bytes it has and compares - which is a check, where a path would have"
              , "been a hope." ]))
            "KERNEL_TABLE_PROVENANCE" (provenance tables)
        , .blank
        , .constant (some (Doc.line "The closed universe of declaration kinds, in rank order."))
            "KERNEL_DECL_KINDS" (literalRoster (tables.kinds.map (·.1)))
        , .blank
        , .typeAlias (some (Doc.line "One declaration kind of the closed universe."))
            "KernelDeclKind" [] .inline (rosterMember "KERNEL_DECL_KINDS")
        , .blank
        , .constant (some (Doc.line "The numeric rank of each declaration kind."))
            "KERNEL_DECL_KIND_RANK"
            (.satisfies
              (.asConst (.object .block (tables.kinds.map fun kind =>
                (none, PropertyKey.name kind.1, TsExpr.nat kind.2))))
              (.mapped .inline "Kind" (.reference "KernelDeclKind" []) (.keyword "number")))
        , .blank
        , .constant (some (Doc.line "The epistemic stages of a hole, in rising rank order."))
            "KERNEL_HOLE_STAGES" (literalRoster (tables.stages.map (·.1)))
        , .blank
        , .typeAlias (some (Doc.line "One epistemic stage of a hole."))
            "KernelHoleStage" [] .inline (rosterMember "KERNEL_HOLE_STAGES")
        , .blank
        , .constant (some (Doc.line "The numeric rank of each hole stage."))
            "KERNEL_HOLE_STAGE_RANK"
            (.satisfies
              (.asConst (.object .block (tables.stages.map fun stage =>
                (none, PropertyKey.name stage.1, TsExpr.nat stage.2))))
              (.mapped .inline "Stage" (.reference "KernelHoleStage" []) (.keyword "number")))
        , .blank
        , .typeAlias
            (some (Doc.rows
              [ "How a taught repair may be applied: machine-applicable exactly when the"
              , "lawful rewrite is a function of the refused candidate alone, advisory when"
              , "the repair needs something the candidate does not carry." ]))
            "KernelApplicability" [] .inline
            (.union .inline [.literal "machine-applicable", .literal "advisory"])
        , .blank
        , .constant (some (Doc.line "The wire spelling of every refusal reason, in the model's order."))
            "KERNEL_REFUSAL_REASONS" (literalRoster (tables.refusals.map (·.reason)))
        , .blank
        , .typeAlias (some (Doc.line "One refusal reason the kernel door can carry."))
            "KernelRefusalReason" [] .inline (rosterMember "KERNEL_REFUSAL_REASONS")
        , .blank
        , .interfaceDecl
            (some (Doc.line "One taught refusal: the law it defends and the legal next move."))
            "KernelRefusalRow" .inline [] false
            [ { readOnly := true, optional := false, key := .name "reason"
              , type := .reference "KernelRefusalReason" [] }
            , { readOnly := true, optional := false, key := .name "law"
              , type := .keyword "string" }
            , { readOnly := true, optional := false, key := .name "repair"
              , type := .keyword "string" }
            , { readOnly := true, optional := false, key := .name "applicability"
              , type := .reference "KernelApplicability" [] } ]
        , .blank
        , .constant
            (some (Doc.line "The taught-refusal table. A reason without its law and repair cannot exist."))
            "KERNEL_REFUSALS"
            (.satisfies
              (.asConst (.array .block (tables.refusals.map fun refusal =>
                (some (meaningDoc (meaningOf refusal.reason)),
                  TsExpr.object .block
                    [ (none, .name "reason", .str refusal.reason)
                    , (none, .name "law", .str refusal.law)
                    , (none, .name "repair", .str refusal.repair)
                    , (none, .name "applicability", .str refusal.applicability) ]))))
              (.reference "ReadonlyArray" [.reference "KernelRefusalRow" []]))
        , .blank
        , .constant
            (some (Doc.line "The taught refusal each reason carries, keyed by its wire spelling."))
            "KERNEL_REFUSAL_BY_REASON"
            (.satisfies
              (.asConst (.object .block
                ((tables.refusals.zipIdx).map fun entry =>
                  (none, PropertyKey.quoted entry.1.reason,
                    TsExpr.element (.ident "KERNEL_REFUSALS") entry.2))))
              (.mapped .inline "Reason" (.reference "KernelRefusalReason" [])
                (.reference "KernelRefusalRow" [])))
        , .blank
        , .constant
            (some (Doc.line
              "The existing runtime structural-refusal spellings, generated from the projection manifest."))
            "KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS"
            (literalRoster (roster.runtimeKinds.map (·.1)))
        , .blank
        , .typeAlias (some (Doc.line "One structural-refusal kind the runtime can mint."))
            "KernelRuntimeStructuralRefusalKind" [] .block
            (rosterMember "KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS")
        , .blank
        , .interfaceDecl
            (some (Doc.line "How one runtime spelling traces to the generated kernel vocabulary."))
            "KernelRuntimeStructuralRefusalRow" .inline [] false
            [ { readOnly := true, optional := false, key := .name "kind"
              , type := .reference "KernelRuntimeStructuralRefusalKind" [] }
            , { readOnly := true, optional := false, key := .name "source"
              , type := .union .inline [.literal "kernel-corpus", .literal "staged-debt"] } ]
        , .blank
        , .constant
            (some (Doc.rows
              [ "The runtime projection with derivation ancestry on every row. A spelling the"
              , "corpus does not carry is marked staged debt, never a silent twin. Which"
              , "ticket owns closing that debt is a tracking fact and stays in the reviewed"
              , "roster, where a reviewer reads it; it is not part of the language." ]))
            "KERNEL_RUNTIME_STRUCTURAL_REFUSALS"
            (.satisfies
              (.asConst (.array .block (roster.runtimeKinds.map fun row =>
                (some (meaningDoc row.2),
                  TsExpr.object .block
                    [ (none, .name "kind", .str row.1)
                    , (none, .name "source", .str (runtimeSource tables row.1)) ]))))
              (.reference "ReadonlyArray" [.reference "KernelRuntimeStructuralRefusalRow" []]))
        , .blank
        , .interfaceDecl
            (some (Doc.rows
              [ "The compile-time brand carrier. The property never exists at runtime; it"
              , "exists so two sorts with the same representation refuse to unify." ]))
            "KernelBrand" .inline
            [{ name := "Tag", constraint := some (.keyword "string"), fallback := none }] false
            [ { readOnly := true, optional := false
              , key := .quoted "~foldlab/plait/kernel/Brand"
              , type := .reference "Tag" [] } ]
        , .blank
        , .constant
            (some (Doc.rows
              [ "The sorts this module brands, and the parameters that index each. The"
              , "carrier is the model's own scalar; a call site migrating a real runtime"
              , "value substitutes its carrier through the alias's second parameter." ]))
            "KERNEL_BRANDED_SORTS"
            (.asConst (.array .block (branded.map fun sort =>
              (none, TsExpr.object .inline
                [ (none, .name "name", .str sort.name)
                , (none, .name "params", .array .inline
                    (sort.params.map fun parameter => (none, TsExpr.str parameter)))
                , (none, .name "carrier", .str sort.carrier) ]))))
        , .blank ] ++
        reportedRows ++
        (brandedRows.flatMap fun row => [row, TsStmt.blank]) ++
        digestAliases }

/-! ## The truth-plane refusal vocabulary -/

/-- The module header of the refusal vocabulary. -/
def vocabularyHeader (tables : Tables) : List String :=
  [ "Plane: truth — the vocabulary every sentence speaks."
  , ""
  , "GENERATED FILE - DO NOT EDIT."
  , ""
  , "Corpus:  " ++ tables.digest
  , "Format:  interchange format " ++ toString tables.format
  , ""
  , "The structural refusal kinds this package can mint, emitted into the plane"
  , "that speaks them. The truth plane is the deepest and imports only itself, so"
  , "the vocabulary lands here rather than being imported up from the kernel"
  , "plane; the kernel table carries the same rows with their derivation ancestry"
  , "in `KERNEL_RUNTIME_STRUCTURAL_REFUSALS`, where a spelling the model corpus"
  , "does not yet carry is marked staged debt."
  , ""
  , "Each kind carries its standing MEANING as a doc comment: one to two sentences"
  , "saying what fact the kind names and what that implies, which is a different"
  , "act from the law and repair a refusal teaches when it fires. The operator's"
  , "taste pass ratified those sentences, so each one stands as written and"
  , "nothing is rendered above it."
  , ""
  , "@module" ]

/-- The truth-plane refusal vocabulary. The same reviewed projection the kernel
    table records ancestry for, emitted a second time as the module the minting
    sites actually speak — two emissions of one projection, not two
    vocabularies. -/
def vocabularyModule (tables : Tables) (roster : Roster) : TsModule :=
  { statements :=
      [ .comment (Doc.rows (vocabularyHeader tables))
      , .importNamed false ["Schema"] "effect"
      , .blank
      , .constant
          (some (Doc.rows
            [ "What this vocabulary came from, carried as data for a consumer to assert:"
            , "the identity of the corpus, and the interchange format it was read at. The"
            , "corpus is named by its digest and never by a location - a plait item refers"
            , "only to digests, so a consumer checks by hashing rather than by looking." ]))
          "REFUSAL_KIND_PROVENANCE" (provenance tables)
      , .blank
      , .constant
          (some (Doc.line "Every structural refusal kind the package can mint, in its persisted order."))
          "STRUCTURAL_REFUSAL_KINDS"
          (.asConst (.array .block (roster.runtimeKinds.map fun row =>
            (some (meaningDoc row.2), TsExpr.str row.1))))
      , .blank
      , .constant
          (some (Doc.rows
            [ "Every structural refusal kind the package can mint."
            , ""
            , "Deliberately unannotated: an `identifier` would replace the admitted"
            , "literals in a failed decode's reported expectation with this schema's name." ]))
          "StructuralRefusalKind"
          (.call (.field (.ident "Schema") "Literals") .inline [.ident "STRUCTURAL_REFUSAL_KINDS"])
      , .blank
      , .typeAlias
          (some (Doc.rows
            [ "One structural refusal kind, named here so a consumer re-exports this"
            , "declaration instead of restating the type as one of its own. A consumer-side"
            , "`typeof StructuralRefusalKind.Type` reads as derivation and is not: it is the"
            , "consumer's own declaration, and no checker can read its ancestry back." ]))
          "StructuralRefusalKind" [] .inline
          (.query (.qualified ["StructuralRefusalKind", "Type"] []))
      , .blank ] }

/-! ## The program-builder surface

The builder is read out of the `Act` record of the model's mini-AST — the eight
generators, their field names, their field order, and each field's own model
type reference. Four things it needs are NOT in the corpus, and each is carried
below as a reviewed table with its own docstring rather than smuggled in as if
the model had said it (the `JsonSchemaManifest` J1/J2 precedent): how a model
type reference becomes an accepted argument shape, the argument-reference
grammar the freeze fixed, the brand key the handle rides on, and two authored
sentences. Everything else here is transcription. -/

/-- How one field of a generator meets the declaration form. -/
inductive FieldForm where
  | kind
  | digest (kind : String)
  | digestOf (field : String)
  | value
  | absent
deriving Repr, BEq

/-- One field of one generator: its name, the model's own type reference
    verbatim, and the argument shape that reference resolves to. -/
structure BuilderField where
  name : String
  model : String
  form : FieldForm

/-- One generator's surface: its name, its fields in the model's declaration
    order, and the field whose declaration kind brands the handle it returns. -/
structure BuilderGenerator where
  name : String
  fields : List BuilderField
  kindField : Option String

/-- One model type reference. The grammar is small enough to state in a line
    and is stated once: `name`, or `name(arg, ...)` — no nesting, because the
    mini-AST writes none. -/
def parseReference (text : String) (site : String)
    : Except String (String × List String) :=
  match text.splitOn "(" with
  | [name] => .ok (name, [])
  | [name, rest] =>
      if rest.endsWith ")" then .ok (name, ((rest.dropEnd 1).toString.splitOn ","))
      else .error s!"ts: {site} does not parse as a type reference: {text}"
  | _ => .error s!"ts: {site} does not parse as a type reference: {text}"

/-- **Reviewed table.** The one judgement in this surface: a model type
    reference becomes an accepted argument shape. It is total over the
    references `Act` uses today and refuses anything else, so a new field type
    stops the emission here rather than arriving as a silently widened
    argument.

    * `DeclKind` — the field IS a declaration kind. The surface takes the kind
      name, because that is what brands the handle the constructor hands back,
      and the declaration carries no reference for it: a kind is a tag, not a
      thing an argument reference can point at.
    * `Value` — an arbitrary model value: any reference at all, a hole
      included.
    * `Digest(k)` where `k` names a declaration kind — the grammar pins the
      brand at the declaration site, so only a digest of that kind, or a handle
      producing one, is accepted.
    * `Digest(f)` where `f` names an earlier field — the grammar binds the
      brand to that field, so the accepted brand is whatever the caller passed
      there.
    * anything else whose arguments are all earlier fields — a model structure
      the argument grammar has no form for: a token, a lane partition, an
      anchor fact, a trigger predicate. The field exists in the sentence and
      the DECLARATION does not carry it, so the surface offers nothing rather
      than accepting something that would not survive the write. -/
def fieldForm (model : String) (bound : List String) (kinds : List String)
    (site : String) : Except String FieldForm := do
  let (name, arguments) <- parseReference model site
  if name == "DeclKind" then .ok .kind
  else if name == "Value" then .ok .value
  else if name == "Digest" then
    match arguments with
    | [argument] =>
        if kinds.contains argument then .ok (.digest argument)
        else if bound.contains argument then .ok (.digestOf argument)
        else .error s!"ts: {site}: brand argument {argument} names no kind and no earlier field"
    | _ => .error s!"ts: {site}: Digest takes one brand argument, got {arguments.length}"
  else if arguments.all (fun argument => bound.contains argument) then .ok .absent
  else .error s!"ts: {site}: no argument rule for the model reference {model}"

/-- One declared field of one constructor. -/
def actField (value : Canon.Value) : Except String (String × String) :=
  match Canon.stringAt value "name", Canon.stringAt value "type" with
  | some name, some model => .ok (name, model)
  | _, _ => .error "ts: an Act field is missing its name or its type"

/-- The constructors of the `Act` record, in the model's declaration order. -/
def actConstructors (lines : List String)
    : Except String (List (String × List (String × String))) := do
  let act <-
    match (recordsOf "type" lines).find? (fun value =>
        Canon.stringAt value "name" == some "Act") with
    | some act => .ok act
    | none => .error "ts: the corpus declares no Act type"
  let constructors <-
    match (Canon.member act "constructors").bind Canon.asItems with
    | some constructors => .ok constructors
    | none => .error "ts: the Act record carries no constructor list"
  constructors.mapM fun constructor => do
    let name <-
      match Canon.stringAt constructor "name" with
      | some name => .ok name
      | none => .error "ts: an Act constructor is missing its name"
    let fields <-
      match (Canon.member constructor "fields").bind Canon.asItems with
      | some fields => .ok fields
      | none => .error s!"ts: Act constructor {name} carries no field list"
    let read <- fields.mapM actField
    .ok (name, read)

/-- The eight generators, resolved. The brand field is found by reading the
    forms rather than by knowing a name, and a second declaration-kind field is
    refused: the handle's brand would have no single field to come from. -/
def builderGenerators (lines : List String) (kinds : List String)
    : Except String (List BuilderGenerator) := do
  let constructors <- actConstructors lines
  constructors.mapM fun constructor => do
    let step := fun (state : List BuilderField × List String × Option String)
        (field : String × String) => do
      let (built, bound, kindField) := state
      let site := s!"Act.{constructor.1}.{field.1}"
      let form <- fieldForm field.2 bound kinds site
      let kindField <-
        if form == .kind then
          match kindField with
          | some _ =>
              Except.error
                s!"ts: {site}: a second declaration-kind field; the handle's brand would be ambiguous"
          | none => Except.ok (some field.1)
        else Except.ok kindField
      Except.ok (built ++ [{ name := field.1, model := field.2, form := form }],
        bound ++ [field.1], kindField)
    let (fields, _, kindField) <-
      constructor.2.foldlM step (([], [], none) : List BuilderField × List String × Option String)
    .ok { name := constructor.1, fields := fields, kindField := kindField }

/-! ### The doc-comment policy this surface writes under

One line when the whole comment fits the budget at its indent, and otherwise a
block that keeps the model's own line breaks and greedy-wraps each of them.
Which of the two a site gets is decided HERE and handed to the printer as
layout, per the printer's own rule. -/

/-- A description doc comment at an indent: the one-line form when the text
    carries no break of its own and the whole comment fits, the wrapped block
    otherwise. A `*/` inside the text is escaped, because a comment that closed
    itself early would silently truncate the surface. -/
def describe (indent : String) (text : String) : Doc :=
  let safe := text.replace "*/" "*\\/"
  match safe.splitOn "\n" with
  | [only] =>
      if indent.length + 4 + only.trimAsciiEnd.toString.length + 3 <= descriptionWrap.column then
        Doc.line only.trimAsciiEnd.toString
      else { layout := .block, blocks := [.wrapped descriptionWrap only] }
  | rows => { layout := .block, blocks := rows.map (DocBlock.wrapped descriptionWrap) }

/-! ### The reviewed constants -/

/-- **Reviewed.** The property a handle's brand rides on. It never exists at
    runtime; it exists so a handle of one sort refuses to unify with another. -/
def handleBrandKey : String := "~foldlab/plait/kernel/handle"

/-- **Reviewed.** Where the runtime commits this surface, and the command that
    reproduces it. Both are LOCATIONS rather than digests, which is the law-10
    residual U8 filed against this file: they are transcribed here exactly as
    the retiring renderer wrote them, so that parity is measurable over the
    whole file before the header is cleaned. -/
def builderCorpusPath : String := "packages/plait/fixtures/kernel-conformance.ndjson"

/-- **Reviewed.** See `builderCorpusPath`. -/
def builderCommand : String := "bun run generate:kernel-builder"

/-- The section rule the surfaces write, carried as one string rather than
    derived: it is seventy-five dashes behind the line-comment marker, and a
    printer that computed it from a width would be claiming a width test that
    never ran. -/
def sectionRule : String := "---------------------------------------------------------------------------"

/-- The module header. -/
def builderHeader (tables : Tables) : List String :=
  [ "Plane: kernel — the language: corpus, door, programs, and wire grammar."
  , ""
  , "GENERATED FILE - DO NOT EDIT."
  , ""
  , "Corpus:  " ++ builderCorpusPath
  , "Command: " ++ builderCommand
  , "Source:  " ++ tables.source ++ ", emitted by " ++ quote tables.generator
  , "         at interchange format " ++ toString tables.format ++ "."
  , ""
  , "The program builder's surface: one constructor per kernel generator, with"
  , "the generator's own field names, in the generator's own declaration order,"
  , "accepting the sorts the generator's own grammar names. Every one of those"
  , "facts is read out of the Act record of the model's mini-AST, and the prose"
  , "below each field is the docstring the model attaches to that field's type."
  , ""
  , "Two things this file is not."
  , ""
  , "It is not an executor. A constructor here contributes a node to a"
  , "declaration; nothing in this module runs, schedules, retries, or replays,"
  , "and no constructor takes a clock, a seed, a secret, or a function value -"
  , "not because they are checked away, but because the grammar names no field"
  , "for them and this file is that grammar's transcription."
  , ""
  , "It is not a runtime check of the brands it carries. TypeScript erases, so"
  , "a brand here separates two sorts at compile time and nothing more. The"
  , "emitter's own consistency law, checked over every committed vector, is"
  , "what stands behind the values."
  , ""
  , "@module" ]

/-- **Reviewed table.** The argument-reference grammar. It is the freeze's
    rather than the corpus's — the model names no reference forms — so it is
    stated here as tree, once, and stands beside the transcription instead of
    being smuggled in as data the model did not emit. -/
def argumentGrammar : List TsStmt :=
  [ .banner
      [ sectionRule
      , "The argument-reference grammar. Three forms and no fourth: a reference to"
      , "something outside the declaration is a digest, a reference to something"
      , "inside it is a local name, and a bare identity label is a literal. There is"
      , "no closure form, because a function value has no canonical bytes and so no"
      , "identity to reference it by."
      , sectionRule ]
  , .blank
  , .interfaceDecl
      (some (Doc.line "A reference to a declaration outside this one, branded by its kind."))
      "KernelDigestRef" .inline
      [{ name := "Kind", constraint := some (.reference "KernelDeclKind" []), fallback := none }]
      false
      [ { readOnly := true, optional := false, key := .name "arg", type := .literal "digest" }
      , { readOnly := true, optional := false, key := .name "kind"
        , type := .reference "Kind" [] }
      , { readOnly := true, optional := false, key := .name "id"
        , type := .keyword "bigint" } ]
  , .blank
  , .interfaceDecl (some (Doc.line "A bare identity label.")) "KernelLiteralArg" .inline [] false
      [ { readOnly := true, optional := false, key := .name "arg", type := .literal "literal" }
      , { readOnly := true, optional := false, key := .name "value"
        , type := .keyword "bigint" } ]
  , .blank
  , .interfaceDecl
      (some (Doc.rows
        [ "A reference to a hole of this declaration: a declared parameter, not a"
        , "wildcard. A hole reads inside the declaration as a local does, and it is a"
        , "form of its own because it means something else - a requirement, not a"
        , "consumption, so it puts no edge in the edge list." ]))
      "KernelHoleRef" .inline [] false
      [ { readOnly := true, optional := false, key := .name "arg", type := .literal "hole" }
      , { readOnly := true, optional := false, key := .name "name"
        , type := .keyword "bigint" } ]
  , .blank
  , .interfaceDecl
      (some (Doc.rows
        [ "A reference to an earlier node of this declaration - the value a `$`"
        , "constructor hands back. The brand carries the generator that produced it"
        , "and the declaration kind it names, so a handle cannot be spent where a"
        , "different sort is required." ]))
      "KernelHandle" .block
      [ { name := "Generator", constraint := some (.reference "KernelGenerator" [])
        , fallback := none }
      , { name := "Kind"
        , constraint := some (.union .inline [.reference "KernelDeclKind" [], .keyword "null"])
        , fallback := none } ]
      false
      [ { readOnly := true, optional := false, key := .name "arg", type := .literal "local" }
      , { readOnly := true, optional := false, key := .name "name"
        , type := .keyword "bigint" }
      , { readOnly := true, optional := false, key := .quoted handleBrandKey
        , type := .operator "readonly"
            (.tuple [.reference "Generator" [], .reference "Kind" []]) } ]
  , .blank
  , .typeAlias (some (Doc.line "Any handle, whatever it produced.")) "KernelAnyHandle" [] .inline
      (.reference "KernelHandle"
        [ .reference "KernelGenerator" []
        , .union .inline [.reference "KernelDeclKind" [], .keyword "null"] ])
  , .blank
  , .typeAlias
      (some (Doc.rows
        [ "What a field branded to one declaration kind accepts: a digest of that"
        , "kind, or a handle that produced one. Not a hole: the surface cannot check"
        , "that a hole's schema is a declaration of this kind, and admitting it here"
        , "would be a claim the type system does not make." ]))
      "KernelDigestArg"
      [{ name := "Kind", constraint := some (.reference "KernelDeclKind" []), fallback := none }]
      .block
      (.union .block
        [ .reference "KernelDigestRef" [.reference "Kind" []]
        , .reference "KernelHandle" [.reference "KernelGenerator" [], .reference "Kind" []] ])
  , .blank
  , .typeAlias
      (some (Doc.line "What an arbitrary model value accepts: any reference at all."))
      "KernelValueArg" [] .block
      (.union .block
        [ .reference "KernelDigestRef" [.reference "KernelDeclKind" []]
        , .reference "KernelAnyHandle" []
        , .reference "KernelLiteralArg" []
        , .reference "KernelHoleRef" [] ])
  , .blank
  , .typeAlias
      (some (Doc.rows
        [ "How one field of a generator meets the declaration form. `absent` is the"
        , "one that is easy to misread: the field is real and the declaration carries"
        , "no reference for it, so the surface offers nothing rather than accepting"
        , "an argument that would not survive the write." ]))
      "KernelFieldForm" [] .block
      (.union .block
        [ .record .inline [(true, false, .name "form", .literal "kind")]
        , .record .inline
            [ (true, false, .name "form", .literal "digest")
            , (true, false, .name "kind", .reference "KernelDeclKind" []) ]
        , .record .inline
            [ (true, false, .name "form", .literal "digestOf")
            , (true, false, .name "field", .keyword "string") ]
        , .record .inline [(true, false, .name "form", .literal "value")]
        , .record .inline [(true, false, .name "form", .literal "absent")] ])
  , .blank
  , .interfaceDecl (some (Doc.line "One field of one generator, as the emitter reads it."))
      "KernelBuilderField" .inline [] false
      [ { readOnly := true, optional := false, key := .name "name"
        , type := .keyword "string" }
      , { doc := some (Doc.line "The model's own type reference for this field, verbatim.")
        , readOnly := true, optional := false, key := .name "model"
        , type := .keyword "string" }
      , { readOnly := true, optional := false, key := .name "form"
        , type := .reference "KernelFieldForm" [] } ] ]

/-- The first letter of a generator or field name raised, which is how the
    surface spells the type parameter a kind field contributes. -/
def argsName (generator : String) : String := "Kernel" ++ capitalize generator ++ "Args"

/-- The form of one field, as the emitted table states it. -/
def formLiteral : FieldForm -> TsExpr
  | .kind => .object .inline [(none, .name "form", .str "kind")]
  | .digest kind =>
      .object .inline [(none, .name "form", .str "digest"), (none, .name "kind", .str kind)]
  | .digestOf field =>
      .object .inline [(none, .name "form", .str "digestOf"), (none, .name "field", .str field)]
  | .value => .object .inline [(none, .name "form", .str "value")]
  | .absent => .object .inline [(none, .name "form", .str "absent")]

/-- The member one field contributes to its generator's argument record, and
    nothing at all when the declaration form carries no reference for it.

    The kind field is required and every wired field is optional. That is not a
    convenience: a node may leave a slot unwired and the emitted vectors do, so
    an optional member is the honest spelling of a slot the declaration can
    leave empty — which is a different thing from a hole, the slot a
    declaration NAMES. -/
def argumentMember (field : BuilderField) (kindField : Option String)
    : Except String (Option (Bool × TsType)) :=
  match field.form with
  | .kind => .ok (some (false, .reference (capitalize field.name) []))
  | .digest kind => .ok (some (true, .reference "KernelDigestArg" [.literal kind]))
  | .digestOf brand =>
      if kindField == some brand then
        .ok (some (true, .reference "KernelDigestArg" [.reference (capitalize brand) []]))
      else
        .error s!"ts: Act argument {field.name} brands on {brand}, which is not a kind field"
  | .value => .ok (some (true, .reference "KernelValueArg" []))
  | .absent => .ok none

/-- The type parameters a generator's argument record and constructor carry:
    one, named after the kind field, when the constructor has a kind field. -/
def kindParameters : Option String -> List TypeParameter
  | none => []
  | some field =>
      [{ name := capitalize field, constraint := some (.reference "KernelDeclKind" [])
       , fallback := none }]

/-- One generator's argument record. -/
def argumentRecord (generator : BuilderGenerator) (docs : List (String × String))
    : Except String TsStmt := do
  let absent := generator.fields.filter (fun field => field.form == .absent)
  let listed := String.intercalate ", "
    (generator.fields.map fun field => field.name ++ " : " ++ field.model)
  let unoffered :=
    if absent.isEmpty then ""
    else
      " The declaration form carries no reference for " ++
        String.intercalate " or " (absent.map fun field => "`" ++ field.name ++ "`") ++
        ", so " ++ (if absent.length == 1 then "it is" else "they are") ++
        " not offered here."
  let members <- generator.fields.filterMapM fun field => do
    match (<- argumentMember field generator.kindField) with
    | none => Except.ok none
    | some (required, type) =>
        let (head, _) <- parseReference field.model s!"Act.{generator.name}.{field.name}"
        let opening := "`" ++ field.name ++ " : " ++ field.model ++ "`."
        let text :=
          match docs.find? (fun row => row.1 == head) with
          | some row => opening ++ " " ++ row.2
          | none => opening
        Except.ok (some
          ({ doc := some (describe "  " text), readOnly := true, optional := required
           , key := .name field.name, type := type } : Member))
  .ok (TsStmt.interfaceDecl
    (some (describe ""
      ("The arguments `" ++ generator.name ++
        "` takes, in the model's declaration order: " ++ listed ++ "." ++ unoffered)))
    (argsName generator.name) .inline (kindParameters generator.kindField) true members)

/-- **Reviewed sentence.** What one `$` constructor does, said once for all
    eight. The model's `Act` docstring says what the generators MEAN; this says
    what calling one does to the declaration being built, which is a fact about
    this surface and not about the language. -/
def constructorSentence (generator : String) : String :=
  "Contributes one `" ++ generator ++
    "` node and hands back its local name. Nothing is executed and nothing is published."

/-- **Reviewed prose.** The two paragraphs that stand under the model's own
    `Act` docstring in the constructor surface: what the three reference
    helpers are, and what `Holes` means. Both are facts about this surface. -/
def dollarProse : List String :=
  [ "Three reference helpers stand beside the eight generators. They are the"
  , "argument grammar, not the act grammar, which is why they carry no"
  , "generator name: `digest` reaches outside the declaration, `hole` names one"
  , "of the declaration's own parameters, and `literal` writes an identity"
  , "label directly."
  , ""
  , "`Holes` is the set of parameter names the program declared. A hole that"
  , "was never declared is a type error at the call, not a validation failure"
  , "later: the surface has no wildcard." ]

/-- The constructor surface. The model's `Act` docstring rides through as its
    own rows rather than being re-wrapped: it is prose the model wrote at a
    width the model chose. -/
def dollarInterface (generators : List BuilderGenerator) (docs : List (String × String))
    : TsStmt :=
  let actRows :=
    match docs.find? (fun row => row.1 == "Act") with
    | some row => (row.2.splitOn "\n").map (fun line => line.trimAsciiEnd.toString) ++ [""]
    | none => []
  let helpers : List Member :=
    [ { doc := some (Doc.line "A reference to a declaration outside this one, branded by its kind.")
      , readOnly := true, optional := false, key := .name "digest"
      , type := .function [("Kind", .reference "KernelDeclKind" [])] .block
          [("kind", .reference "Kind" []), ("id", .keyword "bigint")]
          (.reference "KernelDigestRef" [.reference "Kind" []]) }
    , { doc := some (Doc.line "A reference to one of this declaration's declared parameters.")
      , readOnly := true, optional := false, key := .name "hole"
      , type := .function [] .inline [("name", .reference "Holes" [])]
          (.reference "KernelHoleRef" []) }
    , { doc := some (Doc.line "A bare identity label.")
      , readOnly := true, optional := false, key := .name "literal"
      , type := .function [] .inline [("value", .keyword "bigint")]
          (.reference "KernelLiteralArg" []) } ]
  let constructors := generators.map fun generator =>
    ({ doc := some (describe "  " (constructorSentence generator.name))
     , readOnly := true, optional := false, key := .name generator.name
     , type := .function
         (match generator.kindField with
          | none => []
          | some field => [(capitalize field, .reference "KernelDeclKind" [])])
         .block
         [("args", .reference (argsName generator.name)
            (match generator.kindField with
             | none => []
             | some field => [.reference (capitalize field) []]))]
         (.reference "KernelHandle"
           [ .literal generator.name
           , match generator.kindField with
             | none => .keyword "null"
             | some field => .reference (capitalize field) [] ]) } : Member)
  .interfaceDecl
    (some (Doc.rows
      ([ "The builder's constructor surface, handed to a program body as `$`.", "" ] ++
        actRows ++ dollarProse)))
    "KernelDollar" .inline
    [{ name := "Holes", constraint := some (.keyword "bigint"), fallback := none }]
    true
    (helpers ++ constructors)

/-- The program-builder surface. -/
def builderModule (tables : Tables) (lines : List String) : Except String TsModule := do
  let generators <- builderGenerators lines (tables.kinds.map (·.1))
  let docs := (recordsOf "doc" lines).filterMap fun value =>
    match Canon.stringAt value "name", Canon.stringAt value "doc" with
    | some name, some text => some (name, text)
    | _, _ => none
  let records <- generators.mapM fun generator => argumentRecord generator docs
  Except.ok
    { statements :=
        [ .comment (Doc.rows (builderHeader tables))
        , .importNamed true ["KernelDeclKind"] "./KernelTables.generated.js"
        , .blank
        , .constant
            (some (Doc.line "Where this surface came from, carried as data for a consumer to assert."))
            "KERNEL_BUILDER_PROVENANCE"
            (.asConst (.object .block
              [ (none, .name "command", .str builderCommand)
              , (none, .name "corpus", .str builderCorpusPath)
              , (none, .name "format", .bigint tables.format)
              , (none, .name "generator", .str tables.generator)
              , (none, .name "source", .str tables.source) ]))
        , .blank
        , .constant (some (Doc.line "The generator vocabulary, in the model's own declaration order."))
            "KERNEL_GENERATORS" (literalRoster (generators.map (·.name)))
        , .blank
        , .typeAlias (some (Doc.line "One kernel generator.")) "KernelGenerator" [] .inline
            (rosterMember "KERNEL_GENERATORS")
        , .blank ] ++
        argumentGrammar ++
        [ .blank
        , .constant
            (some (Doc.rows
              [ "Each generator's fields, in the model's declaration order. The emitter"
              , "walks this table rather than knowing any field name of its own, so a"
              , "renamed field moves the emitter with it." ]))
            "KERNEL_GENERATOR_FIELDS"
            (.satisfies
              (.asConst (.object .block (generators.map fun generator =>
                (none, PropertyKey.name generator.name,
                  TsExpr.array .block (generator.fields.map fun field =>
                    (none, TsExpr.object .inline
                      [ (none, .name "name", .str field.name)
                      , (none, .name "model", .str field.model)
                      , (none, .name "form", formLiteral field.form) ]))))))
              (.mapped .block "Generator" (.reference "KernelGenerator" [])
                (.reference "ReadonlyArray" [.reference "KernelBuilderField" []])))
        , .blank
        , .constant
            (some (Doc.rows
              [ "The field whose declaration kind brands each generator's handle, where the"
              , "constructor names one. A generator that names no kind produces a handle"
              , "branded `null`, and such a handle is spendable only where a value is"
              , "wanted - which is the whole of the compile-time separation." ]))
            "KERNEL_GENERATOR_KIND_FIELD"
            (.satisfies
              (.asConst (.object .block (generators.map fun generator =>
                (none, PropertyKey.name generator.name,
                  match generator.kindField with
                  | none => TsExpr.ident "null"
                  | some field => TsExpr.str field))))
              (.mapped .inline "Generator" (.reference "KernelGenerator" [])
                (.union .inline [.keyword "string", .keyword "null"])))
        , .blank
        , .banner
            [ sectionRule
            , "One argument record per generator. Member order is the model's field order."
            , sectionRule ]
        , .blank ] ++
        (records.flatMap fun record => [record, TsStmt.blank]) ++
        [ dollarInterface generators docs
        , .blank
        , .typeAlias
            (some (Doc.line "Any argument a generator field can take, before the field narrows it."))
            "KernelBuilderArg" [] .block
            (.union .block
              [ .reference "KernelDeclKind" []
              , .reference "KernelDigestRef" [.reference "KernelDeclKind" []]
              , .reference "KernelAnyHandle" []
              , .reference "KernelLiteralArg" []
              , .reference "KernelHoleRef" [] ])
        , .blank
        , .typeAlias
            (some (Doc.line "The wired arguments of one node, keyed by the model's field names."))
            "KernelBuilderArgs" [] .inline
            (.index "field" (.keyword "string") (.reference "KernelBuilderArg" []))
        , .blank ] }

/-! ## The emission door

One name per surface, so a caller names a target rather than a location. -/

/-- The surfaces this module emits, and the register of their digests. -/
inductive Target where
  | kernelTables
  | kernelBuilder
  | refusalKinds
  | surfaceDigests
deriving Repr, BEq

/-- The wire spelling of a target. -/
def Target.wire : Target -> String
  | .kernelTables => "kernel-tables"
  | .kernelBuilder => "kernel-builder"
  | .refusalKinds => "refusal-kinds"
  | .surfaceDigests => "surface-digests"

/-- The target a caller named. -/
def Target.ofWire (text : String) : Except String Target :=
  if text == "kernel-tables" then .ok .kernelTables
  else if text == "kernel-builder" then .ok .kernelBuilder
  else if text == "refusal-kinds" then .ok .refusalKinds
  else if text == "surface-digests" then .ok .surfaceDigests
  else .error s!"ts: unsupported target {text}"

/-- The digest register: what each emitted surface hashes to, and what corpus
    it was projected from. Surfaces are named by TARGET rather than by
    location, so the register carries no path; a consumer that wants to know
    whether the file it holds is this emission hashes its bytes and compares.

    The register exists so a checker with no Lean toolchain can still hold the
    surfaces to the model's emission: this side states the digests and proves
    them fresh, and the other side hashes what it has. -/
def digestRegister (tables : Tables) (surfaces : List (String × String)) : String :=
  String.intercalate "\n"
    (Canon.render (.obj [("record", .str "corpus"), ("digest", .str tables.digest)]) ::
      surfaces.map fun surface =>
        Canon.render (.obj
          [ ("record", .str "surface")
          , ("target", .str surface.1)
          , ("digest", .str (Sha.digestOf surface.2)) ])) ++ "\n"

/-- Emit one surface's bytes. -/
def emit (target : Target) (corpus rosterLines : List String)
    (ast : Projections.ProjectionAst) : Except String String := do
  let tables <- readTables corpus
  let roster <- readRoster rosterLines
  match target with
  | .kernelTables => return Ts.render (<- tablesModule tables roster ast)
  | .kernelBuilder => return Ts.render (<- builderModule tables corpus)
  | .refusalKinds =>
      -- The vocabulary's meanings are reviewed rather than model-emitted, so
      -- the reason ledger is still reconciled here: an unexplained kind on
      -- either surface is one finding, not two.
      let _ <- reasonMeanings roster tables.refusals
      return Ts.render (vocabularyModule tables roster)
  | .surfaceDigests =>
      let renderedTables := Ts.render (<- tablesModule tables roster ast)
      let renderedVocabulary := Ts.render (vocabularyModule tables roster)
      let renderedBuilder := Ts.render (<- builderModule tables corpus)
      return digestRegister tables
        [ (Target.kernelTables.wire, renderedTables)
        , (Target.kernelBuilder.wire, renderedBuilder)
        , (Target.refusalKinds.wire, renderedVocabulary) ]

end Unity.TsKernel
