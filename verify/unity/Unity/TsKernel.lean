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
          "KERNEL_UNBRANDED_INDEXED_SORTS" none
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
            "KERNEL_TABLE_PROVENANCE" none (provenance tables)
        , .blank
        , .constant (some (Doc.line "The closed universe of declaration kinds, in rank order."))
            "KERNEL_DECL_KINDS" none (literalRoster (tables.kinds.map (·.1)))
        , .blank
        , .typeAlias (some (Doc.line "One declaration kind of the closed universe."))
            "KernelDeclKind" [] .inline (rosterMember "KERNEL_DECL_KINDS")
        , .blank
        , .constant (some (Doc.line "The numeric rank of each declaration kind."))
            "KERNEL_DECL_KIND_RANK" none
            (.satisfies
              (.asConst (.object .block (tables.kinds.map fun kind =>
                (none, PropertyKey.name kind.1, TsExpr.nat kind.2))))
              (.mapped .inline "Kind" (.reference "KernelDeclKind" []) (.keyword "number")))
        , .blank
        , .constant (some (Doc.line "The epistemic stages of a hole, in rising rank order."))
            "KERNEL_HOLE_STAGES" none (literalRoster (tables.stages.map (·.1)))
        , .blank
        , .typeAlias (some (Doc.line "One epistemic stage of a hole."))
            "KernelHoleStage" [] .inline (rosterMember "KERNEL_HOLE_STAGES")
        , .blank
        , .constant (some (Doc.line "The numeric rank of each hole stage."))
            "KERNEL_HOLE_STAGE_RANK" none
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
            "KERNEL_REFUSAL_REASONS" none (literalRoster (tables.refusals.map (·.reason)))
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
            "KERNEL_REFUSALS" none
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
            "KERNEL_REFUSAL_BY_REASON" none
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
            "KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS" none
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
            "KERNEL_RUNTIME_STRUCTURAL_REFUSALS" none
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
            "KERNEL_BRANDED_SORTS" none
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
          "REFUSAL_KIND_PROVENANCE" none (provenance tables)
      , .blank
      , .constant
          (some (Doc.line "Every structural refusal kind the package can mint, in its persisted order."))
          "STRUCTURAL_REFUSAL_KINDS" none
          (.asConst (.array .block (roster.runtimeKinds.map fun row =>
            (some (meaningDoc row.2), TsExpr.str row.1))))
      , .blank
      , .constant
          (some (Doc.rows
            [ "Every structural refusal kind the package can mint."
            , ""
            , "Deliberately unannotated: an `identifier` would replace the admitted"
            , "literals in a failed decode's reported expectation with this schema's name." ]))
          "StructuralRefusalKind" none
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
            "KERNEL_BUILDER_PROVENANCE" none
            (.asConst (.object .block
              [ (none, .name "command", .str builderCommand)
              , (none, .name "corpus", .str builderCorpusPath)
              , (none, .name "format", .bigint tables.format)
              , (none, .name "generator", .str tables.generator)
              , (none, .name "source", .str tables.source) ]))
        , .blank
        , .constant (some (Doc.line "The generator vocabulary, in the model's own declaration order."))
            "KERNEL_GENERATORS" none (literalRoster (generators.map (·.name)))
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
            "KERNEL_GENERATOR_FIELDS" none
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
            "KERNEL_GENERATOR_KIND_FIELD" none
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

/-! ## The Effect-schema surface

The interchange and the model's own type vocabulary as Effect schemas. The
corpus answers almost everything: the record groups supply every example, the
`type` records supply every shape, the `doc` records supply every sentence, and
a docstring's first sentence supplies every title.

One judgement is not in the corpus and is carried below as a reviewed table
with its own docstring — the idiom map, `resolution`, saying how a model type
reference becomes an Effect schema. Two constants are not in the corpus either:
where the runtime commits this surface and the command that reproduces it,
which are LOCATIONS and the same law-10 residual the builder header carries.
They are transcribed exactly as the retiring renderer wrote them, so parity is
measurable over the whole file before the header is cleaned.

The recursion rule is mechanical rather than named. A field whose type
references the type being declared makes that type SUSPENDED: its schema is
written `Schema.suspend`, and because a suspended schema needs a type to be
annotated with, the value type is written out in full ahead of the schema
instead of being read back off it. Nothing here knows which type that is; the
corpus's own declaration order decides. -/

/-- **Reviewed.** Where the runtime commits this surface. A LOCATION, carried
    for the same reason `builderCorpusPath` is: the retiring renderer wrote it
    into the header, and moving it would move the bytes parity is measured
    over. -/
def schemasCorpusPath : String := "packages/plait/fixtures/kernel-conformance.ndjson"

/-- **Reviewed.** See `schemasCorpusPath`. -/
def schemasCommand : String := "bun run generate:kernel-schemas"

/-- The column the schema surface wraps at. -/
def schemaWidth : Nat := 96

/-! ### The model's type vocabulary, read out of the corpus -/

/-- One field of one constructor: its name and the model's own type reference. -/
structure SchemaField where
  name : String
  model : String

/-- One constructor of a mini-AST type. -/
structure SchemaConstructor where
  name : String
  fields : List SchemaField

/-- One type of the model's emitted vocabulary, as the corpus states it. -/
structure SchemaType where
  name : String
  form : String
  params : List String
  constructors : List SchemaConstructor

/-- One declared field. -/
def schemaField (value : Canon.Value) : Except String SchemaField :=
  match Canon.stringAt value "name", Canon.stringAt value "type" with
  | some name, some model => .ok { name := name, model := model }
  | _, _ => .error "ts: a type field is missing its name or its type"

/-- One declared constructor, with its fields in declaration order. -/
def schemaConstructor (value : Canon.Value) : Except String SchemaConstructor := do
  let name <-
    match Canon.stringAt value "name" with
    | some name => .ok name
    | none => .error "ts: a type constructor is missing its name"
  let fields <-
    match (Canon.member value "fields").bind Canon.asItems with
    | some fields => .ok fields
    | none => .error s!"ts: constructor {name} carries no field list"
  let read <- fields.mapM schemaField
  .ok { name := name, fields := read }

/-- One `type` record. -/
def schemaTypeRow (value : Canon.Value) : Except String SchemaType := do
  let name <-
    match Canon.stringAt value "name" with
    | some name => .ok name
    | none => .error "ts: a type record is missing its name"
  let form <-
    match Canon.stringAt value "form" with
    | some form => .ok form
    | none => .error s!"ts: type {name} declares no form"
  let params <-
    match (Canon.member value "params").bind Canon.asItems with
    | some items =>
        items.mapM fun item =>
          match Canon.stringAt item "name" with
          | some parameter => Except.ok parameter
          | none => Except.error s!"ts: a parameter of {name} is missing its name"
    | none => .error s!"ts: type {name} carries no parameter list"
  let constructors <-
    match (Canon.member value "constructors").bind Canon.asItems with
    | some items => items.mapM schemaConstructor
    | none => .error s!"ts: type {name} carries no constructor list"
  .ok { name := name, form := form, params := params, constructors := constructors }

/-- The closed type list, in the model's declaration order. -/
def schemaTypes (lines : List String) : Except String (List SchemaType) := do
  let types <- (recordsOf "type" lines).mapM schemaTypeRow
  if types.isEmpty then .error "ts: the corpus declares no types" else .ok types

/-- The docstring the model attaches to each name. -/
def docTable (lines : List String) : List (String × String) :=
  (recordsOf "doc" lines).filterMap fun value =>
    match Canon.stringAt value "name", Canon.stringAt value "doc" with
    | some name, some text => some (name, text)
    | _, _ => none

/-! ### The prose the surface writes -/

/-- The first sentence of a docstring, which becomes the schema's title: text
    up to the first sentence break or the first newline, whichever comes first.
    The rule is mechanical so that a docstring edit moves the title with it. -/
def firstSentence (doc : String) : String :=
  let sentences := doc.splitOn ". "
  let paragraphs := doc.splitOn "\n"
  let breaks :=
    (if sentences.length > 1 then [(sentences.headD "").length] else []) ++
    (if paragraphs.length > 1 then [(paragraphs.headD "").length] else [])
  match breaks with
  | [] => doc
  | first :: rest =>
      let cut := rest.foldl (fun least value => if value < least then value else least) first
      if (doc.drop cut).startsWith "." then (doc.take (cut + 1)).toString
      else (doc.take cut).toString

/-- Whether a name is written as a bare object key on this target. -/
def identifierLike (name : String) : Bool :=
  match name.toList with
  | [] => false
  | first :: rest =>
      (first.isAlpha || first == '_' || first == '$') &&
        rest.all fun character =>
          character.isAlphanum || character == '_' || character == '$'

/-- An object key: bare where the target admits it, quoted otherwise. -/
def schemaKey (name : String) : PropertyKey :=
  if identifierLike name then .name name else .quoted name

/-- A doc comment carrying a model text. One line when the whole comment fits
    the budget at its indent and the text carries no break of its own, and
    otherwise a block that keeps the model's own line breaks and splits each of
    them at the pinned column. A `*/` inside the text is escaped, because a
    comment that closed itself early would truncate the surface. -/
def schemaDoc (indent : String) (text : String) : Doc :=
  let safe := text.replace "*/" "*\\/"
  let rows := safe.splitOn "\n"
  if rows.length == 1 && indent.length + 4 + safe.length + 3 <= schemaWidth then
    Doc.line safe
  else
    { layout := .block, blocks := rows.map (DocBlock.wrapped descriptionWrap) }

/-- A string literal spread across source lines, so a long description reads as
    a paragraph in the generated file instead of as one runaway line. The
    concatenation is the original text, character for character: the split
    keeps each run's separator, which is what makes the runs add back up. -/
def stringExpression (text : String) (indent : Nat) : TsExpr :=
  .concat
    ((Ts.splitRuns (fun run => (quote run).length + indent <= schemaWidth) text).map
      TsExpr.str)

/-! ### Corpus values as TypeScript literals -/

/-- A run of spaces. -/
def spaces (width : Nat) : String := String.ofList (List.replicate width ' ')

/-- One expression as the text a width test measures: the flat rendering where
    the site writes it flat, and the broken rendering where it does not. -/
def renderedText (indent : Nat) (expression : TsExpr) : String :=
  String.intercalate "\n" (Ts.exprLines (spaces indent) expression)

mutual

/-- One corpus value as the TypeScript literal that denotes it. Every number is
    a `bigint`: the interchange's integers are unbounded, and the corpus carries
    a vector past the range a double holds exactly, so a numeric literal here
    would put a rounded identity into a generated file.

    The container rule is the one the retiring renderer measured: the elements
    are written at the inner indent FIRST, and the container is written flat
    only if that flat rendering still fits. A container whose element broke
    therefore breaks too, without a second test. -/
def literalExpr (indent : Nat) : Canon.Value -> TsExpr
  | .null => .ident "null"
  | .bool true => .ident "true"
  | .bool false => .ident "false"
  | .num value => .bigint value
  | .str value => .str value
  | .arr [] => .array .inline []
  | .arr items =>
      let elements := literalItems (indent + 2) items
      let flat := "[" ++ String.intercalate ", "
        (elements.map (renderedText (indent + 2))) ++ "]"
      .array (if flat.length + indent <= schemaWidth then .inline else .block)
        (elements.map fun element => (none, element))
  | .obj [] => .object .inline []
  | .obj members =>
      let properties := literalMembers (indent + 2) members
      let written := properties.map fun property =>
        keyText property.1 ++ ": " ++ renderedText (indent + 2) property.2
      let flat := "{ " ++ String.intercalate ", " written ++ " }"
      .object (if flat.length + indent <= schemaWidth then .inline else .block)
        (properties.map fun property => (none, property.1, property.2))

/-- The elements of an array literal. -/
def literalItems (indent : Nat) : List Canon.Value -> List TsExpr
  | [] => []
  | item :: rest => literalExpr indent item :: literalItems indent rest

/-- The members of an object literal, keys untouched. -/
def literalMembers (indent : Nat) : List (String × Canon.Value) -> List (PropertyKey × TsExpr)
  | [] => []
  | member :: rest =>
      (schemaKey member.1, literalExpr indent member.2) :: literalMembers indent rest

end

/-- One corpus record as the literal a generated example carries. The value is
    canonicalized first, so the members are written in the one order the
    interchange admits rather than in the order a reader happened to see. -/
def exampleLiteral (indent : Nat) (value : Canon.Value) : TsExpr :=
  literalExpr indent (Canon.canonicalize value)

/-! ### The idiom map -/

/-- One resolved field: the schema expression it becomes, and the TypeScript
    value that schema decodes to. -/
structure Resolution where
  schema : TsExpr
  valueType : TsType

/-- What the resolver needs to know about the closed type list as a whole: the
    declaration index of each name, and which names are referenced at or before
    their own declaration and therefore carry a written-out value type. -/
structure SchemaContext where
  order : List (String × Nat)
  suspended : List String
  usesRef : Bool

/-- The schema module's name for a model type. -/
def schemaNameOf (name : String) : String := "Kernel" ++ name

/-- The schema module's name for a model type's value. -/
def valueNameOf (name : String) : String := "Kernel" ++ name ++ "Value"

/-- A reference to an already-declared type: its schema, and the value type a
    consumer names. A suspended type's value is the written-out alias, because
    reading it back off a suspended schema is what the suspension prevents. -/
def referenceOf (context : SchemaContext) (name : String) : Resolution :=
  { schema := .ident (schemaNameOf name)
  , valueType :=
      if context.suspended.contains name then .reference (valueNameOf name) []
      else .query (.qualified [schemaNameOf name, "Type"] []) }

/-- A call on the `Schema` module. -/
def schemaCall (name : String) (arguments : List TsExpr) : TsExpr :=
  .call (.field (.ident "Schema") name) .inline arguments

/-- **Reviewed table.** The idiom map: how one model type reference becomes an
    Effect schema and the value it decodes to. It is total over the references
    the corpus uses today and refuses anything else, so a new field type stops
    the emission here rather than arriving as a silently widened shape.

    * `Nat` is the interchange's one numeric shape and carries `bigint`;
      `String` is the target's own string; `Ref` is the kind-tagged reference
      the model spells as an abbreviation and this surface expands.
    * `List` is `Schema.Array`, `Option` is `Schema.UndefinedOr`. Both take one
      argument, and a second would be a reference this map has no shape for.
    * A declared type resolves to its own schema — except where it references
      ITSELF, which is the model's one recursion: that reference becomes
      `Schema.suspend` at the written-out value type, because a suspended
      schema has no type to read back. A forward reference is refused rather
      than suspended: the model writes none, and admitting one would emit a
      schema that is not yet bound.
    * Brand arguments are dropped. The target erases, so one schema describes
      every brand of a shape, and the compile-time separation is generated on
      the tables surface where the branded aliases live. -/
def resolution : Nat -> String -> SchemaContext -> Nat -> String -> Except String Resolution
  | 0, _, _, _, site =>
      .error s!"ts: {site}: the reference nests deeper than the argument grammar admits"
  | nesting + 1, reference, context, position, site => do
  let (name, arguments) <- parseReference reference site
  if name == "Nat" then
    .ok { schema := .ident "KernelNat", valueType := .keyword "bigint" }
  else if name == "String" then
    .ok { schema := .field (.ident "Schema") "String", valueType := .keyword "string" }
  else if name == "Ref" then
    .ok { schema := .ident "KernelRef"
        , valueType := .query (.qualified ["KernelRef", "Type"] []) }
  else if name == "List" || name == "Option" then
    match arguments with
    | [argument] => do
        let inner <- resolution nesting argument context position site
        if name == "List" then
          .ok { schema := schemaCall "Array" [inner.schema]
              , valueType := .reference "ReadonlyArray" [inner.valueType] }
        else
          .ok { schema := schemaCall "UndefinedOr" [inner.schema]
              , valueType := .union .inline [inner.valueType, .keyword "undefined"] }
    | _ => .error s!"ts: {site}: {name} takes one argument"
  else
    match context.order.find? (fun row => row.1 == name) with
    | none => .error s!"ts: {site}: {name} is neither a leaf nor a declared type"
    | some row =>
        let target := referenceOf context name
        if row.2 > position then
          .error s!"ts: {site}: {name} is declared after the type that references it"
        else if row.2 == position then
          .ok { schema :=
                  schemaCall "suspend"
                    [.arrow [] (some (.qualified ["Schema", "Codec"] [target.valueType]))
                      target.schema]
              , valueType := target.valueType }
        else .ok target

/-- How deep a model type reference may nest. The grammar writes one container
    around one leaf and nothing deeper, so the walk is given exactly that much
    room: a reference that needed more is refused by name rather than silently
    truncated to the part that fitted. -/
def referenceNesting : Nat := 2

/-- One field's reference, resolved at the grammar's own depth. -/
def resolveField (reference : String) (context : SchemaContext) (position : Nat)
    (site : String) : Except String Resolution :=
  resolution referenceNesting reference context position site

/-! ### The shapes -/

/-- One rendered mini-AST type: its schema expression and its value type. -/
structure RenderedSchema where
  schema : TsExpr
  valueType : TsType

/-- The resolved fields of one constructor. -/
def resolvedFields (type : SchemaType) (constructor : SchemaConstructor)
    (context : SchemaContext) (position : Nat)
    : Except String (List (String × Resolution)) :=
  constructor.fields.mapM fun field => do
    let resolved <-
      resolveField field.model context position s!"{type.name}.{constructor.name}.{field.name}"
    Except.ok (field.name, resolved)

/-- A struct expression, written flat where the whole declaration line still
    fits and broken otherwise. The prefix is the declaration head and the
    `.annotate({` that follows, because both share the line with it. -/
def structExpression (members : List (String × TsExpr)) (indent prefixWidth : Nat) : TsExpr :=
  let properties := members.map fun member => (none, schemaKey member.1, member.2)
  let flat := TsExpr.apply (.field (.ident "Schema") "Struct") [] (.object .inline properties)
  if members.isEmpty then flat
  else if (Ts.inlineExpr flat).length + indent + prefixWidth <= schemaWidth then flat
  else .apply (.field (.ident "Schema") "Struct") [] (.object .block properties)

/-- One constructor of a sum. `TaggedStruct` rather than a `Struct` with a
    literal `_tag` member: the two build the same tree, and the estate's own
    language service asks for this spelling. -/
def taggedStructExpression (tag : String) (members : List (String × TsExpr)) (indent : Nat)
    : TsExpr :=
  let properties := members.map fun member => (none, schemaKey member.1, member.2)
  let flat := TsExpr.apply (.field (.ident "Schema") "TaggedStruct") [.str tag]
    (.object .inline properties)
  if members.isEmpty then flat
  else if (Ts.inlineExpr flat).length + indent <= schemaWidth then flat
  else .apply (.field (.ident "Schema") "TaggedStruct") [.str tag] (.object .block properties)

/-- The record type one shape decodes to, flat where it fits. -/
def objectTypeExpression (members : List (String × TsType)) (indent : Nat) : TsType :=
  let written := members.map fun member => (true, false, PropertyKey.name member.1, member.2)
  let flat := TsType.record .inline written
  if members.isEmpty then flat
  else if (Ts.typeText flat).length + indent <= schemaWidth then flat
  else .record .block written

/-- One mini-AST type as a schema and a value type. A structure is a struct; a
    sum whose constructors are all nullary is a closed set of names and becomes
    a union of literals, because the wire never carries anything else and a
    literal union is what a caller switches on; every other sum is a union of
    tagged structs. -/
def renderSchemaType (type : SchemaType) (context : SchemaContext) (position prefixWidth : Nat)
    : Except String RenderedSchema := do
  if type.form == "structure" then
    match type.constructors with
    | [constructor] => do
        let fields <- resolvedFields type constructor context position
        Except.ok
          { schema :=
              structExpression (fields.map fun field => (field.1, field.2.schema)) 0 prefixWidth
          , valueType :=
              objectTypeExpression (fields.map fun field => (field.1, field.2.valueType)) 0 }
    | _ =>
        Except.error
          s!"ts: structure {type.name} carries {type.constructors.length} constructors"
  else if type.constructors.all (fun constructor => constructor.fields.isEmpty) then
    let names := type.constructors.map (·.name)
    let flat := TsExpr.apply (.field (.ident "Schema") "Literals") []
      (.array .inline (names.map fun name => (none, TsExpr.str name)))
    Except.ok
      { schema :=
          if (Ts.inlineExpr flat).length + prefixWidth <= schemaWidth then flat
          else .apply (.field (.ident "Schema") "Literals") []
            (.array .block (names.map fun name => (none, TsExpr.str name)))
      , valueType :=
          match names with
          | [only] => .literal only
          | _ => .union .block (names.map fun name => TsType.literal name) }
  else do
    let members <- type.constructors.mapM fun constructor => do
      let fields <- resolvedFields type constructor context position
      Except.ok
        ( taggedStructExpression constructor.name
            (fields.map fun field => (field.1, field.2.schema)) 2
        , objectTypeExpression
            (("_tag", TsType.literal constructor.name) ::
              fields.map fun field => (field.1, field.2.valueType)) 2 )
    Except.ok
      { schema :=
          .apply (.field (.ident "Schema") "Union") []
            (.array .block (members.map fun member => (none, member.1)))
      , valueType := .union .block (members.map (·.2)) }

/-- The declaration order of the closed type list, plus the one fact no single
    record carries: which types are referenced at or before their own
    declaration. A field whose type references the type being declared is the
    whole of the rule, and it is read off the records rather than named. -/
def schemaContext (types : List SchemaType) : Except String SchemaContext := do
  let order := types.zipIdx.map fun entry => (entry.1.name, entry.2)
  let mut suspended : List String := []
  let mut usesRef := false
  for entry in types.zipIdx do
    let type := entry.1
    let position := entry.2
    for constructor in type.constructors do
      for field in constructor.fields do
        let site := s!"{type.name}.{field.name}"
        let (head, arguments) <- parseReference field.model site
        let heads <-
          if head == "List" || head == "Option" then
            match arguments with
            | [argument] => do
                let (inner, _) <- parseReference argument site
                Except.ok [inner]
            | _ => Except.error s!"ts: {site}: {head} takes one argument"
          else Except.ok [head]
        for name in heads do
          if name == "Ref" then usesRef := true
          match order.find? (fun row => row.1 == name) with
          | some row => if row.2 >= position && !suspended.contains name then
              suspended := suspended ++ [name]
          | none => pure ()
  .ok { order := order, suspended := suspended, usesRef := usesRef }

/-! ### The record schemas -/

/-- A record group's schema, and the corpus records that exemplify it. -/
structure RecordBinding where
  name : String
  gloss : String
  examples : List Canon.Value

/-- Which corpus records exemplify which record schema. One example per shape,
    except where the whole set IS the reference — the encoding vectors, the
    canonical-form vectors and the run vectors are named, closed sets, and a
    reader who sees three of them has to go looking for the rest. The last two
    groups arrived under the add-only rule, so a corpus emitted before they
    exist is still a corpus this generator can read. -/
def recordBindings (lines : List String) : Except String (List RecordBinding) := do
  let group := fun (name : String) => recordsOf name lines
  let firstOf := fun (rows : List Canon.Value) (named : String) =>
    match rows with
    | [] => Except.error s!"ts: the corpus carries no {named} record"
    | row :: _ => Except.ok [row]
  let admissions := group "admission"
  let refused := admissions.filter fun row => Canon.stringAt row "verdict" == some "refused"
  let admitted := admissions.filter fun row => Canon.stringAt row "verdict" == some "admitted"
  let header <-
    match lines with
    | [] => Except.error "ts: the corpus is empty"
    | first :: _ =>
        match Canon.parse first with
        | .ok value => Except.ok value
        | .error reason => Except.error s!"ts: the corpus header does not parse: {reason}"
  let kinds <- firstOf (group "kind") "kind"
  let stages <- firstOf (group "stage") "stage"
  let refusals <- firstOf (group "refusal") "refusal"
  let types <- firstOf (group "type") "type"
  let refusedRow <- firstOf refused "refused admission"
  let admittedRow <- firstOf admitted "admitted admission"
  let docs <- firstOf (group "doc") "doc"
  let programs := group "program"
  let runs := group "run"
  let programRows <-
    if programs.isEmpty then Except.ok ([] : List RecordBinding)
    else do
      let row <- firstOf programs "program"
      Except.ok
        [{ name := "KernelProgramRecord"
         , gloss := "One program declaration and the bytes that are its identity"
         , examples := row }]
  let runRows :=
    if runs.isEmpty then ([] : List RecordBinding)
    else
      [{ name := "KernelRunRecord"
       , gloss := "One execution of a committed program, and the outcome's own bytes"
       , examples := runs }]
  Except.ok
    ([ { name := "KernelHeaderRecord"
       , gloss := "The provenance line, with the counts it pins", examples := [header] }
     , { name := "KernelKindRecord"
       , gloss := "One declaration kind of the closed universe", examples := kinds }
     , { name := "KernelStageRecord"
       , gloss := "One epistemic stage of a hole", examples := stages }
     , { name := "KernelRefusalRecord"
       , gloss := "One taught refusal: the law it defends, the repair it teaches"
       , examples := refusals }
     , { name := "KernelTypeRecord"
       , gloss := "One type of the model's emitted vocabulary", examples := types }
     , { name := "KernelEncodingRecord"
       , gloss := "One sentence in its canonical framing", examples := group "encoding" }
     , { name := "KernelAdmissionRefusedRecord"
       , gloss := "A planted candidate the door refused", examples := refusedRow }
     , { name := "KernelAdmissionAdmittedRecord"
       , gloss := "The lawful twin the door admitted", examples := admittedRow }
     , { name := "KernelDocRecord"
       , gloss := "One type's docstring, read out of the model's environment"
       , examples := docs }
     , { name := "KernelCanonRecord"
       , gloss := "One canonical-form vector: a value and the bytes it must produce"
       , examples := group "canon" } ] ++ programRows ++ runRows)

/-- The two example annotations every exemplified schema carries: the records as
    canonical byte strings, beside the same records as values. The byte strings
    exist because a JSON Schema export drops the whole `examples` key when any
    example holds an unbounded integer, and nearly every record here holds one. -/
def exampleAnnotations (examples : List Canon.Value)
    : List (Option Doc × PropertyKey × TsExpr) :=
  [ (none, .name "canonicalExamples",
      .array .block (examples.map fun sample => (none, TsExpr.str (Canon.render sample))))
  , (none, .name "examples",
      .array .block (examples.map fun sample => (none, exampleLiteral 4 sample))) ]

/-! ### The module header -/

/-- The module header of the schema surface. -/
def schemasHeader (tables : Tables) : List String :=
  [ "Plane: kernel — the language: corpus, door, programs, and wire grammar."
  , ""
  , "GENERATED FILE - DO NOT EDIT."
  , ""
  , "Corpus:  " ++ schemasCorpusPath
  , "Command: " ++ schemasCommand
  , "Source:  " ++ tables.source ++ ", emitted by " ++ quote tables.generator
  , "         at interchange format " ++ toString tables.format ++ "."
  , ""
  , "The interchange as schemas, in two halves."
  , ""
  , "The record schemas re-export the hand-written grammar of the file with the"
  , "examples the corpus supplies. The grammar itself cannot be generated from"
  , "the file it reads, so it stays hand-written next door; what is generated is"
  , "every example, taken from a real record rather than invented."
  , ""
  , "The mini-AST schemas are the model's own type vocabulary. Their shape comes"
  , "from the type records, their description from the docstring the model"
  , "carries, their title from that docstring's first sentence. A sentence"
  , "written once in the model reaches an agent's tool description with no human"
  , "in the path, and a drifted description is a failing check rather than a"
  , "rotting comment."
  , ""
  , "Numbers are bigint everywhere. The interchange's integers are unbounded and"
  , "an encoded sentence already exceeds what a JavaScript number holds exactly."
  , ""
  , "Brand arguments are dropped here. TypeScript erases, so one schema describes"
  , "every brand of a shape; the compile-time separation is generated into"
  , "KernelTables.generated.ts, where the branded aliases live."
  , ""
  , "These are safety-side shapes and texts, never runtime guarantees. A model"
  , "theorem stays in the model."
  , ""
  , "@module" ]

/-- **Reviewed prose.** The annotation key's own doc comment: a measured gap
    written down where the key is declared. -/
def canonicalExamplesDoc : List String :=
  [ "The annotation key carrying each schema's examples as canonical byte"
  , "strings, beside the `examples` key carrying them as values."
  , ""
  , "It exists because of a measured gap. A JSON Schema export describes the"
  , "encoded view, JSON has no unbounded integer, and Effect drops the whole"
  , "`examples` key - silently, not partially - when any example holds a"
  , "bigint. Nearly every record here holds one, so the examples that matter"
  , "most would never reach a reader of the export. The canonical bytes are"
  , "strings, they survive the export, and they are the exact bytes the"
  , "interchange carries, so nothing is approximated to make them fit."
  , ""
  , "Read them with:"
  , "`Schema.toJsonSchemaDocument(schema, { includeAnnotationKey: (key) =>`"
  , "`key === KERNEL_CANONICAL_EXAMPLES_KEY })`." ]

/-! ### The door's verdict vocabulary -/

/-- **Reviewed expansions.** The door's verdict vocabulary, derived from the
    `AdmitResult`, `Door` and `CandidateAct` records rather than written out
    beside them. Two expansions the records do not state are named here, in the
    shape of the `KernelRef` precedent:

    1. **The framing rides with the admission.** The model separates the two;
       the runtime door computes both in one pass and returns them together, so
       the admitted arm gains `encoded`.
    2. **The refusal is flattened, and the discriminant is `verdict`.** The
       model spells the sum with a nested refusal; the runtime spells the taught
       row inline, so every host exposes identical reason/law/repair fields at
       one level. That row is the tables surface's, not this file's: the two
       disagree on applicability, which the tables spell at the wire and the
       schemas spell in camel.

    Nothing else is invented: the arm names, the admitted arm's field name and
    the type it carries all come from the record, and a record whose shape stops
    matching refuses here rather than being rendered around. -/
def doorVocabulary (types : List SchemaType) : Except String (List TsStmt) := do
  let recordFor := fun (name : String) =>
    match types.find? (fun type => type.name == name) with
    | some type => Except.ok type
    | none =>
        Except.error s!"ts: the door vocabulary needs a {name} type record and the corpus has none"
  let admitResult <- recordFor "AdmitResult"
  let _ <- recordFor "Door"
  let _ <- recordFor "CandidateAct"
  if admitResult.constructors.length != 2 then
    .error s!"ts: AdmitResult carries {admitResult.constructors.length} constructors, not two"
  let arm := fun (name : String) =>
    match admitResult.constructors.find? (fun constructor => constructor.name == name) with
    | some constructor => Except.ok constructor
    | none => Except.error s!"ts: AdmitResult carries no {name} constructor"
  let admitted <- arm "admitted"
  let refused <- arm "refused"
  let soleField := fun (constructor : SchemaConstructor) (expected : String) =>
    match constructor.fields with
    | [field] =>
        if field.model == expected then Except.ok field
        else
          Except.error
            s!"ts: AdmitResult.{constructor.name}.{field.name} carries {field.model}, not {expected}"
    | fields =>
        Except.error
          s!"ts: AdmitResult.{constructor.name} carries {fields.length} fields, not one"
  let admittedField <- soleField admitted "Act"
  let _ <- soleField refused "Refusal"
  Except.ok
    [ .banner
        [ sectionRule
        , "The door's verdict vocabulary, from the AdmitResult, Door and CandidateAct"
        , "records. The runtime enrichments are named where they are added."
        , sectionRule ]
    , .blank
    , .typeAlias
        (some (schemaDoc ""
          ("The result of admission. Success carries both the intrinsic sentence and its" ++
            " canonical model encoding; refusal carries the complete generated teaching row," ++
            " flattened so every host exposes identical reason/law/repair fields.")))
        "KernelVerdict" [] .block
        (.union .block
          [ .record .block
              [ (true, false, .name "verdict", .literal admitted.name)
              , (true, false, .name admittedField.name,
                  .reference (valueNameOf admittedField.model) [])
              , (true, false, .name "encoded",
                  .reference "ReadonlyArray" [.keyword "bigint"]) ]
          , .parens (.intersection
              [ .record .inline [(true, false, .name "verdict", .literal refused.name)]
              , .reference "KernelRefusalRow" [] ]) ])
    , .blank
    , .interfaceDecl
        (some (schemaDoc ""
          ("A context-bound view of the single admission function. Exported under this name" ++
            " because the Door record's own schema already holds KernelDoor; the door module" ++
            " re-exports it as KernelDoor, which is the name a host reads.")))
        "KernelDoorInterface" .inline [] false
        [ { readOnly := true, optional := false, key := .name "admit"
          , type := .function [] .inline [("candidate", .reference (valueNameOf "CandidateAct") [])]
              (.reference "KernelVerdict" []) } ]
    , .blank
    , .typeAlias
        (some (schemaDoc ""
          ("The one host-facing judgment function. The arrow is this generator's composition" ++
            " of three records: the Door record is the context it judges under, the" ++
            " CandidateAct record is what it judges, and the AdmitResult record is what it" ++
            " returns.")))
        "KernelAdmit" [] .inline
        (.function [] .block
          [ ("context", .reference (valueNameOf "Door") [])
          , ("candidate", .reference (valueNameOf "CandidateAct") []) ]
          (.reference "KernelVerdict" [])) ]

/-! ### The surface -/

/-- The Effect-schema surface. -/
def schemasModule (tables : Tables) (lines : List String) : Except String TsModule := do
  let types <- schemaTypes lines
  let context <- schemaContext types
  let docs := docTable lines
  let bindings <- recordBindings lines
  let docOf := fun (name : String) =>
    (docs.find? (fun row => row.1 == name)).map (·.2)
  let declarationHead := fun (name : String) =>
    if context.suspended.contains name then
      "export const " ++ schemaNameOf name ++ ": Schema.Codec<" ++ valueNameOf name ++ "> ="
    else "export const " ++ schemaNameOf name ++ " ="
  let rendered <- types.zipIdx.mapM fun entry => do
    let body <-
      renderSchemaType entry.1 context entry.2
        ((declarationHead entry.1.name).length + 1 + ".annotate({".length)
    Except.ok (entry.1, entry.2, body)
  let aliasDoc := fun (name : String) =>
    schemaDoc ""
      (if context.suspended.contains name then
        "The value " ++ name ++ " carries. Written out because " ++ name ++ " refers to" ++
          " itself, and a suspended schema needs a type to be annotated with."
      else
        "The value " ++ name ++ " carries, named here so a consumer re-exports this declaration" ++
          " instead of restating the type as one of its own.")
  let suspendedAliases := rendered.flatMap fun entry =>
    if context.suspended.contains entry.1.name then
      [ TsStmt.typeAlias (some (aliasDoc entry.1.name)) (valueNameOf entry.1.name) [] .block
          entry.2.2.valueType
      , TsStmt.blank ]
    else []
  let refExpansion : List TsStmt :=
    if !context.usesRef then []
    else
      [ .constant
          (some (Doc.rows
            [ "A kind-tagged reference: the one lawful way a heterogeneous collection of"
            , "digests is carried. The model spells it as an abbreviation rather than a"
            , "declaration, so it has no type record of its own and is expanded here." ]))
          "KernelRef" none
          (.apply
            (.field
              (.apply (.field (.ident "Schema") "Struct") []
                (.object .block
                  [ (none, .name "id", .ident "KernelNat")
                  , (none, .name "kind", .ident "KernelDeclKind") ]))
              "annotate")
            []
            (.object .block
              [ (none, .name "identifier", .str "KernelRef")
              , (none, .name "title", .str "A kind-tagged reference.")
              , (none, .name "description",
                  .offset (stringExpression
                    ("The pair of a declaration kind and an identifier. It appears wherever a" ++
                      " collection holds digests of several kinds at once, so that the kind" ++
                      " travels with the identifier instead of being inferred from context.")
                    4)) ]))
      , .blank
      , .typeAlias
          (some (Doc.rows
            [ "The value KernelRef carries, named here so a consumer re-exports this"
            , "declaration instead of restating the type as one of its own." ]))
          "KernelRefValue" [] .inline (.query (.qualified ["KernelRef", "Type"] []))
      , .blank ]
  let declKind := rendered.find? fun entry =>
    entry.1.name == "DeclKind"
  let typeStatements := rendered.flatMap fun entry =>
    let type := entry.1
    let body := entry.2.2
    let doc := docOf type.name
    let brands :=
      if type.params.isEmpty then ""
      else
        "Branded in the model by " ++ String.intercalate " and " type.params ++
          "; the brand is erased here and carried by the generated aliases instead."
    let separator :=
      match doc with
      | none => ""
      | some text => if text.endsWith " " || brands == "" then "" else " "
    let description := (doc.getD "") ++ separator ++ brands
    let annotations :=
      [ (none, PropertyKey.name "identifier", TsExpr.str (schemaNameOf type.name)) ] ++
      (match doc with
       | none => []
       | some text => [(none, PropertyKey.name "title", TsExpr.str (firstSentence text))]) ++
      (if description == "" then []
       else [(none, PropertyKey.name "description", TsExpr.offset (stringExpression description 4))])
    (match doc with
     | none => []
     | some text => [TsStmt.comment (schemaDoc "" text)]) ++
    [ .constant none (schemaNameOf type.name)
        (if context.suspended.contains type.name then
          some (.qualified ["Schema", "Codec"] [.reference (valueNameOf type.name) []])
         else none)
        (.apply (.field body.schema "annotate") [] (.object .block annotations))
    , .blank ] ++
    (if context.suspended.contains type.name then []
     else
       [ .comment (aliasDoc type.name)
       , .typeAlias none (valueNameOf type.name) [] .inline
           (.query (.qualified [schemaNameOf type.name, "Type"] []))
       , .blank ]) ++
    (match declKind with
     | some found => if found.1.name == type.name then refExpansion else []
     | none => [])
  let recordStatements := bindings.flatMap fun binding =>
    [ TsStmt.comment (schemaDoc ""
        (binding.gloss ++ ". Examples are real records from the corpus."))
    , TsStmt.constant none binding.name none
        (.apply (.field (.field (.ident "Grammar") binding.name) "annotate") []
          (.object .block (exampleAnnotations binding.examples)))
    , TsStmt.blank ]
  let admissionExamples := (bindings.filter fun binding =>
    binding.name == "KernelAdmissionRefusedRecord" ||
      binding.name == "KernelAdmissionAdmittedRecord").flatMap (·.examples)
  let vocabulary <- doorVocabulary types
  Except.ok
    { statements :=
        [ .comment (Doc.rows (schemasHeader tables))
        , .importNamed false ["Schema"] "effect"
        , .blank
        , .importNamespace "Grammar" "./KernelCorpusSchemas.js"
        , .importNamed true ["KernelRefusalRow"] "./KernelTables.generated.js"
        , .blank
        , .constant
            (some (Doc.line "Where these schemas came from, carried as data for a consumer to assert."))
            "KERNEL_SCHEMA_PROVENANCE" none
            (.asConst (.object .block
              [ (none, .name "command", .str schemasCommand)
              , (none, .name "corpus", .str schemasCorpusPath)
              , (none, .name "format", .bigint tables.format)
              , (none, .name "generator", .str tables.generator)
              , (none, .name "source", .str tables.source) ]))
        , .blank
        , .constant
            (some (Doc.rows
              [ "An unbounded non-negative integer, the interchange's one numeric shape."
              , "Re-exported so a generated schema and the grammar it extends cannot drift"
              , "onto two different carriers." ]))
            "KernelNat" none (.field (.ident "Grammar") "KernelNat")
        , .blank
        , .constant (some (Doc.rows canonicalExamplesDoc))
            "KERNEL_CANONICAL_EXAMPLES_KEY" none (.str "canonicalExamples")
        , .blank
        , .banner
            [ sectionRule
            , "The interchange records, annotated with the corpus's own examples."
            , sectionRule ]
        , .blank ] ++
        recordStatements ++
        [ .comment
            (Doc.line "One admission verdict, refused or admitted, with both shapes exemplified.")
        , .constant none "KernelAdmissionRecord" none
            (.apply
              (.field
                (.apply (.field (.ident "Schema") "Union") []
                  (.array .block
                    [ (none, .ident "KernelAdmissionRefusedRecord")
                    , (none, .ident "KernelAdmissionAdmittedRecord") ]))
                "annotate")
              []
              (.object .block
                ([ (none, PropertyKey.name "identifier", TsExpr.str "KernelAdmissionRecord")
                 , (none, PropertyKey.name "title", TsExpr.str "Admission record")
                 , (none, PropertyKey.name "description",
                     TsExpr.str
                       "One door verdict for one planted candidate. The verdict selects the shape.") ] ++
                  exampleAnnotations admissionExamples)))
        , .blank
        , .comment (Doc.line "Every interchange record schema, keyed by its record group.")
        , .constant none "KERNEL_RECORD_SCHEMA" none
            (.asConst (.object .block
              ([ (none, PropertyKey.name "kind", TsExpr.ident "KernelKindRecord")
               , (none, PropertyKey.name "stage", TsExpr.ident "KernelStageRecord")
               , (none, PropertyKey.name "refusal", TsExpr.ident "KernelRefusalRecord")
               , (none, PropertyKey.name "type", TsExpr.ident "KernelTypeRecord")
               , (none, PropertyKey.name "encoding", TsExpr.ident "KernelEncodingRecord")
               , (none, PropertyKey.name "admission", TsExpr.ident "KernelAdmissionRecord")
               , (none, PropertyKey.name "doc", TsExpr.ident "KernelDocRecord")
               , (none, PropertyKey.name "canon", TsExpr.ident "KernelCanonRecord") ] ++
                (if (bindings.find? fun binding => binding.name == "KernelProgramRecord").isSome then
                  [(none, PropertyKey.name "program", TsExpr.ident "KernelProgramRecord")]
                 else []) ++
                (if (bindings.find? fun binding => binding.name == "KernelRunRecord").isSome then
                  [(none, PropertyKey.name "run", TsExpr.ident "KernelRunRecord")]
                 else []))))
        , .blank
        , .banner
            [ sectionRule
            , "The model's type vocabulary. Shapes from the type records, prose from the"
            , "doc records; the closed list, in the model's declaration order."
            , sectionRule ]
        , .blank ] ++
        suspendedAliases ++
        typeStatements ++
        [ .comment (Doc.line "Every mini-AST schema, keyed by the model's short name for the type.")
        , .constant none "KERNEL_TYPE_SCHEMA" none
            (.asConst (.object .block (types.map fun type =>
              (none, schemaKey type.name, TsExpr.ident (schemaNameOf type.name)))))
        , .blank
        , .comment (Doc.rows
            [ "A sentence in its canonical framing: the generator tag, then that"
            , "generator's arguments. The examples are the model's own vectors, so an"
            , "example can never drift from what the door admits."
            , ""
            , "This, and not the act schema, is what the encoding vectors exemplify: a"
            , "vector is the encoding of an act, not an act." ])
        , .constant none "KernelActEncoding" none
            (.apply
              (.field
                (.call (.field (.ident "Schema") "Array") .inline [.ident "KernelNat"])
                "annotate")
              []
              (.object .block
                ([ (none, PropertyKey.name "identifier", TsExpr.str "KernelActEncoding")
                 , (none, PropertyKey.name "title", TsExpr.str "An encoded sentence.")
                 , (none, PropertyKey.name "description",
                     TsExpr.offset (stringExpression
                       ("The output of the model's encoder as an array of unbounded integers." ++
                         " Element zero is the generator tag and the arity is fixed per tag, so" ++
                         " a decoder can dispatch on length and tag alone.") 4)) ] ++
                  exampleAnnotations
                    ((recordsOf "encoding" lines).filterMap fun row => Canon.member row "act"))))
        , .blank ] ++
        vocabulary }

/-! ## The emission door

One name per surface, so a caller names a target rather than a location. -/

/-- The surfaces this module emits, and the register of their digests. -/
inductive Target where
  | kernelTables
  | kernelBuilder
  | refusalKinds
  | surfaceDigests
  | kernelSchemas
deriving Repr, BEq

/-- The wire spelling of a target. -/
def Target.wire : Target -> String
  | .kernelTables => "kernel-tables"
  | .kernelBuilder => "kernel-builder"
  | .refusalKinds => "refusal-kinds"
  | .surfaceDigests => "surface-digests"
  | .kernelSchemas => "kernel-schemas"

/-- The target a caller named. -/
def Target.ofWire (text : String) : Except String Target :=
  if text == "kernel-tables" then .ok .kernelTables
  else if text == "kernel-builder" then .ok .kernelBuilder
  else if text == "refusal-kinds" then .ok .refusalKinds
  else if text == "surface-digests" then .ok .surfaceDigests
  else if text == "kernel-schemas" then .ok .kernelSchemas
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
  | .kernelSchemas => return Ts.render (<- schemasModule tables corpus)
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
      let renderedSchemas := Ts.render (<- schemasModule tables corpus)
      return digestRegister tables
        [ (Target.kernelTables.wire, renderedTables)
        , (Target.kernelBuilder.wire, renderedBuilder)
        , (Target.refusalKinds.wire, renderedVocabulary)
        , (Target.kernelSchemas.wire, renderedSchemas) ]

end Unity.TsKernel
