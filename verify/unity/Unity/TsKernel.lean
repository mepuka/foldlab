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
  let kinds <- (recordsOf "kind" lines).mapM rankedRow
  let stages <- (recordsOf "stage" lines).mapM rankedRow
  let refusals <- (recordsOf "refusal" lines).mapM refusalRow
  if kinds.isEmpty then .error "ts: the corpus declares no declaration kinds"
  else if stages.isEmpty then .error "ts: the corpus declares no hole stages"
  else if refusals.isEmpty then .error "ts: the corpus declares no taught refusals"
  else
    .ok { digest := Sha.digestOf (corpusBytes lines), format := format
        , kinds := kinds, stages := stages, refusals := refusals }

/-! ## Reading the reviewed roster -/

/-- The reviewed refusal roster: the marker every unratified meaning is
    rendered behind, the runtime spellings in their persisted order, and the
    standing meaning of each model-emitted reason. -/
structure Roster where
  marker : String
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
  let marker <-
    match recordsOf "marker" rows with
    | [value] =>
        match Canon.stringAt value "text" with
        | some text => .ok text
        | none => .error "ts: the roster's marker row carries no text"
    | _ => .error "ts: the roster must carry exactly one marker row"
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
        .ok { marker := marker, runtimeKinds := runtimeKinds, modelReasons := modelReasons }

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

/-- One drafted meaning as a doc comment: the marker on its own line, then the
    sentence greedy-wrapped. The marker is reproduced verbatim because a
    meaning without it reads as ratified prose. -/
def meaningDoc (marker meaning : String) : Doc :=
  { layout := .block
  , blocks := [.verbatim [marker], .wrapped meaningWrap meaning.trimAscii.toString] }

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
  , "The meanings are drafts until the operator's taste pass rules, which is what"
  , "the marker line above each of them says."
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
              (.mapped "Kind" (.reference "KernelDeclKind" []) (.keyword "number")))
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
              (.mapped "Stage" (.reference "KernelHoleStage" []) (.keyword "number")))
        , .blank
        , .typeAlias
            (some (Doc.rows
              [ "How a taught repair may be applied: machine-applicable exactly when the"
              , "lawful rewrite is a function of the refused candidate alone, advisory when"
              , "the repair needs something the candidate does not carry." ]))
            "KernelApplicability" [] .inline
            (.union [.literal "machine-applicable", .literal "advisory"])
        , .blank
        , .constant (some (Doc.line "The wire spelling of every refusal reason, in the model's order."))
            "KERNEL_REFUSAL_REASONS" (literalRoster (tables.refusals.map (·.reason)))
        , .blank
        , .typeAlias (some (Doc.line "One refusal reason the kernel door can carry."))
            "KernelRefusalReason" [] .inline (rosterMember "KERNEL_REFUSAL_REASONS")
        , .blank
        , .interfaceDecl
            (some (Doc.line "One taught refusal: the law it defends and the legal next move."))
            "KernelRefusalRow" []
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
                (some (meaningDoc roster.marker (meaningOf refusal.reason)),
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
              (.mapped "Reason" (.reference "KernelRefusalReason" [])
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
            "KernelRuntimeStructuralRefusalRow" []
            [ { readOnly := true, optional := false, key := .name "kind"
              , type := .reference "KernelRuntimeStructuralRefusalKind" [] }
            , { readOnly := true, optional := false, key := .name "source"
              , type := .union [.literal "kernel-corpus", .literal "staged-debt"] } ]
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
                (some (meaningDoc roster.marker row.2),
                  TsExpr.object .block
                    [ (none, .name "kind", .str row.1)
                    , (none, .name "source", .str (runtimeSource tables row.1)) ]))))
              (.reference "ReadonlyArray" [.reference "KernelRuntimeStructuralRefusalRow" []]))
        , .blank
        , .interfaceDecl
            (some (Doc.rows
              [ "The compile-time brand carrier. The property never exists at runtime; it"
              , "exists so two sorts with the same representation refuse to unify." ]))
            "KernelBrand"
            [{ name := "Tag", constraint := some (.keyword "string"), fallback := none }]
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
  , "act from the law and repair a refusal teaches when it fires. The meanings are"
  , "drafts until the operator's taste pass rules, which is what the marker line"
  , "above each of them says."
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
            (some (meaningDoc roster.marker row.2), TsExpr.str row.1))))
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

/-! ## The emission door

One name per surface, so a caller names a target rather than a location. -/

/-- The surfaces this module emits. -/
inductive Target where
  | kernelTables
  | refusalKinds
deriving Repr, BEq

/-- The wire spelling of a target. -/
def Target.wire : Target -> String
  | .kernelTables => "kernel-tables"
  | .refusalKinds => "refusal-kinds"

/-- The target a caller named. -/
def Target.ofWire (text : String) : Except String Target :=
  if text == "kernel-tables" then .ok .kernelTables
  else if text == "refusal-kinds" then .ok .refusalKinds
  else .error s!"ts: unsupported target {text}"

/-- Emit one surface's bytes. -/
def emit (target : Target) (corpus rosterLines : List String)
    (ast : Projections.ProjectionAst) : Except String String := do
  let tables <- readTables corpus
  let roster <- readRoster rosterLines
  match target with
  | .kernelTables => return Ts.render (<- tablesModule tables roster ast)
  | .refusalKinds =>
      -- The vocabulary's meanings are reviewed rather than model-emitted, so
      -- the reason ledger is still reconciled here: an unexplained kind on
      -- either surface is one finding, not two.
      let _ <- reasonMeanings roster tables.refusals
      return Ts.render (vocabularyModule tables roster)

end Unity.TsKernel
