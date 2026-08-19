/-
The Go projection of the kernel conformance corpus, as a `GoAst` VALUE.

`go/cmd/kmgen` writes the same file with a `strings.Builder`: 719 lines
of `fmt.Fprintf` and `WriteString` over raw Go source text, finished
with one `format.Source` pass. The bytes are right and the grammar is a
string. This module states the same emission as a typed tree, and
`Unity/GoPrinter.lean` prints it. Nothing here decides layout and
nothing there decides content.

WHERE THE ROWS COME FROM. Every corpus-derived value is read from the
model, through the same functions `Unity/Emit.lean` renders the
interchange with: the kind and stage tables through the model's own
rank and decode functions, the taught refusals through `Kernel.taught`,
the sentence vectors through `Kernel.encodeAct`, the admission
verdicts by RUNNING `Kernel.admit` at `Kernel.Planted.door`, the
program vectors through `Program.declarationBytes`, the type roster
through the manifest, and the docstrings by reading back the rows
`kernel_manifest` minted from the Lean environment. So the two
generators are not two readings of one file: `cmd/kmgen` reads the
committed NDJSON artifact and this module reads the model that emits
it, and the parity wall compares two independent derivations of one
truth.

WHAT IS NOT DERIVED, stated because a wall that hides it is a wall that
lies. The generator's own PROSE — the banner, the section rules, and
every doc comment — is authored text with no derivation on either side:
`cmd/kmgen` holds it as Go string literals and this module holds it as
Lean string literals. Byte parity over that 36.8% of the file is a
transcription check, not an independent derivation. The load-bearing
half of the claim is the 63.2% that is corpus data, plus 100% of the
layout, which neither side transcribes.
-/
import Unity.Emit
import Unity.GoPrinter

namespace Unity.GoTables

open Unity.GoAst

/-! ## Reading the model

The corpus rows, in the shapes the Go emission wants them. Each one
runs the model's own function; none is a table retyped here. -/

/-- The wire name of a declaration kind, at the emitter's own spelling
    table — the one place a kind is spelled for the interchange. -/
def kindName (kind : Kernel.DeclKind) : String := Emit.kindName kind

/-- The kind rows: name and the model's rank, enumerated through the
    model's decode function so a kind without a rank cannot appear. -/
def kinds : List (String × Nat) :=
  (List.range 12).filterMap fun rank =>
    (Kernel.rankToKind rank).map fun kind =>
      (kindName kind, Kernel.DeclKind.rank kind)

/-- The stage rows, enumerated the same way. -/
def stages : List (String × Nat) :=
  (List.range 5).filterMap fun rank =>
    (Kernel.rankToStage rank).map fun stage =>
      (Emit.stageName stage, Kernel.HoleStage.rank stage)

/-- One taught refusal, every field read out of the model's tables. -/
structure RefusalRow where
  reason : String
  law : String
  repair : String
  applicability : String

/-- The taught refusals in the model's declaration order. -/
def refusals : List RefusalRow :=
  Emit.reasons.map fun reason =>
    let taught := Kernel.taught reason
    { reason := reason.wire
    , law := taught.law
    , repair := taught.repair
    , applicability := reason.applicability.wire }

/-- The closed type roster, at the manifest. -/
def typeNames : List String := Emit.kernelTypes

/-- The docstring rows, read back out of the bytes `kernel_manifest`
    minted from the Lean environment. Reading them back rather than
    re-deriving them keeps this module out of the environment: the
    prose has ONE reader in this package and it is `Unity/Reflect`. -/
def docs : List (String × String) :=
  Emit.docRows.filterMap fun row =>
    match Canon.parse row with
    | .error _ => none
    | .ok value =>
        match Canon.stringAt value "name", Canon.stringAt value "doc" with
        | some name, some doc => some (name, doc)
        | _, _ => none

/-- The sentence encoding vectors, framed by the model's encoder. -/
def encodings : List (String × List Nat) :=
  Emit.vectors.map fun entry => (entry.1, Kernel.encodeAct entry.2)

/-- The door's verdict on one planted candidate. -/
inductive Verdict where
  | refused (reason : String)
  | admitted (encoded : List Nat)

/-- The admission rows, computed by RUNNING the door, so a door that
    changed its mind moves these bytes. -/
def admissions : List (String × Verdict) :=
  Emit.planted.map fun entry =>
    match Kernel.admit Kernel.Planted.door entry.2 with
    | .refused refusal => (entry.1, .refused refusal.reason.wire)
    | .admitted act => (entry.1, .admitted (Kernel.encodeAct act))

/-- The program vectors and the canonical bytes each serializes to. -/
def programs : List (String × String) :=
  Program.vectors.map fun entry =>
    (entry.1, Program.declarationBytes entry.2)

/-- The interchange header, read back from the emitter's own bytes so
    the provenance constants are the corpus's and not a second copy. -/
def headerValue : Option Canon.Value :=
  match Canon.parse Emit.header with
  | .ok value => some value
  | .error _ => none

/-- A string the header binds. -/
def headerString (key : String) : String :=
  (headerValue.bind fun value => Canon.stringAt value key).getD ""

/-- A natural the header binds. -/
def headerNat (key : String) : Nat :=
  (headerValue.bind fun value => Canon.natAt value key).getD 0

/-- The artifact path the banner names. This is `go/kmconform`'s own
    `ConformanceCorpusPath`, which is a Go-side constant and not a
    corpus value; the gate pins it against that constant's source. -/
def corpusPath : String :=
  "../../packages/plait/fixtures/kernel-conformance.ndjson"

/-! ## Spelling values

`quote` is the one place a corpus value becomes Go source. A value the
escape table cannot name renders as the REPORT rather than as a
guessed escape, and the same condition stands in `emissionFailures`, so
the generator refuses before it prints and a bypass could only produce
a file that does not compile. -/

/-- A corpus value as a Go interpreted string literal. -/
def quote (value : String) : String :=
  match goQuote value with
  | .ok literal => literal
  | .error reason => reason

/-! ## Tree constructors

Short names for the shapes the emission repeats, so the declarations
below read as Go and not as a constructor soup. -/

/-- An identifier expression. -/
def name (text : String) : Expr := .ident text

/-- A string literal from a corpus value. -/
def text (value : String) : Expr := .lit .stringLit (quote value)

/-- A string literal already at its Go spelling. -/
def literal (spelling : String) : Expr := .lit .stringLit spelling

/-- An integer literal. -/
def number (value : Nat) : Expr := .lit .intLit (toString value)

/-- A call of a named function. -/
def apply (callee : String) (arguments : List Expr) : Expr :=
  .call (.ident callee) arguments

/-- A selection from a named value. -/
def field (receiver : String) (selected : String) : Expr :=
  .selector (.ident receiver) selected

/-- A field of a struct or a signature. -/
def binder (names : List String) (typeExpr : Expr) : Field :=
  .field names typeExpr

/-- An anonymous field, which is how a result is written. -/
def anonymous (typeExpr : Expr) : Field := .field [] typeExpr

/-- A comment group from its lines, each carried without its marker. -/
def remark (lines : List String) : CommentGroup :=
  { lines := lines.map fun line => { text := line } }

/-- A declaration with a doc comment. -/
def documented (lines : List String) (declaration : Decl) : TopLevel :=
  .declaration (some (remark lines)) declaration

/-- A declaration with no doc comment. -/
def bare (declaration : Decl) : TopLevel := .declaration none declaration

/-- A `[]uint64` literal. -/
def uint64List (values : List Nat) : Expr :=
  .composite (some (.array .slice (.ident "uint64"))) .inline
    (values.map fun value => .positional (number value))

/-- A `[]string` literal, one entry per line. -/
def stringColumn (values : List String) : Expr :=
  .composite (some (.array .slice (.ident "string"))) .perLine
    (values.map fun value => .positional (text value))

/-! ## The emission

The twelve groups `cmd/kmgen`'s `writeSource` writes, in its order. -/

/-- The banner. -/
def banner : CommentGroup :=
  remark
    [ " Code generated by cmd/kmgen from " ++ corpusPath ++ ". DO NOT EDIT."
    , ""
    , " Every table below is the model's, read out of the conformance corpus and"
    , " written into Go mechanically. Edit the model, re-emit the corpus, re-run"
    , " the generator; editing this file forks the model instead."
    , ""
    , " What these tables are, and are not: they carry the MODEL'S VERDICTS. They"
    , " do not promote the model's theorems into guarantees about any running"
    , " system. A conforming consumer refuses the same candidates for the same"
    , " reasons and encodes the same acts the same way, and nothing more than that"
    , " should be read into a green conformance run." ]

/-- The import and the provenance constants. -/
def provenance : List TopLevel :=
  [ bare (.genDecl .importTok [.importSpec "\"fmt\""])
  , documented
      [ " The provenance of the tables in this file. Display data: no behaviour"
      , " branches on it." ]
      (.genDecl .constTok
        [ .valueSpec ["Source"] none [text (headerString "source")]
        , .valueSpec ["Generator"] none [text (headerString "generator")]
        , .valueSpec ["CorpusFormat"] none [number (headerNat "format")] ]) ]

/-- The declaration-kind group. -/
def declKindGroup : List TopLevel :=
  [ documented
      [ " DeclKind is the closed universe of declaration kinds. The numeric value"
      , " is the model's rank, so it is wire-stable within a format." ]
      (.genDecl .typeTok [.typeSpec "DeclKind" (name "uint8")])
  , bare (.genDecl .constTok (kinds.map fun row =>
      .valueSpec ["Kind" ++ exportedIdent row.1] (some (name "DeclKind"))
        [number row.2]))
  , bare (.genDecl .varTok
      [ .valueSpec ["declKindNames"] none
          [ .composite (some (.array .ellipsis (.ident "string"))) .perLine
              (kinds.map fun row => .positional (text row.1)) ] ])
  , bare (.funcDecl
      { receiver := some (binder ["k"] (name "DeclKind"))
      , name := "String"
      , signature := { parameters := [], results := [anonymous (name "string")] }
      , body :=
          [ .ifStmt (.binary .ge (apply "int" [name "k"])
              (apply "len" [name "declKindNames"]))
              [ .ret [.call (field "fmt" "Sprintf")
                  [literal "\"DeclKind(%d)\"", apply "uint8" [name "k"]]] ]
          , .ret [.index (name "declKindNames") (name "k")] ] })
  , documented
      [ " DeclKindFromRank is the decode half of the rank. An out-of-range rank is"
      , " refused, never saturated: a decoder that clamps turns a wire defect into a"
      , " plausible wrong answer." ]
      (.funcDecl
        { receiver := none
        , name := "DeclKindFromRank"
        , signature :=
            { parameters := [binder ["rank"] (name "uint8")]
            , results := [anonymous (name "DeclKind"), anonymous (name "bool")] }
        , body :=
            [ .ifStmt (.binary .ge (apply "int" [name "rank"])
                (apply "len" [name "declKindNames"]))
                [ .ret [number 0, name "false"] ]
            , .ret [apply "DeclKind" [name "rank"], name "true"] ] })
  , documented
      [ " DeclKindByName resolves a wire name. Unknown names are refused." ]
      (.funcDecl
        { receiver := none
        , name := "DeclKindByName"
        , signature :=
            { parameters := [binder ["name"] (name "string")]
            , results := [anonymous (name "DeclKind"), anonymous (name "bool")] }
        , body :=
            [ .rangeStmt "rank" (some "known") .define (name "declKindNames")
                [ .ifStmt (.binary .eq (name "known") (name "name"))
                    [ .ret [apply "DeclKind" [name "rank"], name "true"] ] ]
            , .ret [number 0, name "false"] ] }) ]

/-- The hole-stage group. -/
def holeStageGroup : List TopLevel :=
  [ documented
      [ " HoleStage is the epistemic stage of a hole, in rising rank order." ]
      (.genDecl .typeTok [.typeSpec "HoleStage" (name "uint8")])
  , bare (.genDecl .constTok (stages.map fun row =>
      .valueSpec ["Stage" ++ exportedIdent row.1] (some (name "HoleStage"))
        [number row.2]))
  , bare (.genDecl .varTok
      [ .valueSpec ["holeStageNames"] none
          [ .composite (some (.array .ellipsis (.ident "string"))) .perLine
              (stages.map fun row => .positional (text row.1)) ] ])
  , bare (.funcDecl
      { receiver := some (binder ["s"] (name "HoleStage"))
      , name := "String"
      , signature := { parameters := [], results := [anonymous (name "string")] }
      , body :=
          [ .ifStmt (.binary .ge (apply "int" [name "s"])
              (apply "len" [name "holeStageNames"]))
              [ .ret [.call (field "fmt" "Sprintf")
                  [literal "\"HoleStage(%d)\"", apply "uint8" [name "s"]]] ]
          , .ret [.index (name "holeStageNames") (name "s")] ] })
  , documented
      [ " Reached reports whether s is at least target. A hole production observes"
      , " rank only in the reached-at-least direction." ]
      (.funcDecl
        { receiver := some (binder ["s"] (name "HoleStage"))
        , name := "Reached"
        , signature :=
            { parameters := [binder ["target"] (name "HoleStage")]
            , results := [anonymous (name "bool")] }
        , body := [.ret [.binary .ge (name "s") (name "target")]] })
  , documented
      [ " HoleStageFromRank refuses an out-of-range rank rather than saturating." ]
      (.funcDecl
        { receiver := none
        , name := "HoleStageFromRank"
        , signature :=
            { parameters := [binder ["rank"] (name "uint8")]
            , results := [anonymous (name "HoleStage"), anonymous (name "bool")] }
        , body :=
            [ .ifStmt (.binary .ge (apply "int" [name "rank"])
                (apply "len" [name "holeStageNames"]))
                [ .ret [number 0, name "false"] ]
            , .ret [apply "HoleStage" [name "rank"], name "true"] ] }) ]

/-- The applicability group. `cmd/kmgen`'s `writeApplicability` takes
    no corpus argument: the two spellings are the generator's own
    template text on both sides. -/
def applicabilityGroup : List TopLevel :=
  [ documented
      [ " Applicability marks whether a taught repair is a function of the refused"
      , " candidate alone. The machine-applicable half is what tells an agent it may"
      , " apply the repair without asking, so the mark has to survive to the caller"
      , " or the taught table is only prose." ]
      (.genDecl .typeTok [.typeSpec "Applicability" (name "uint8")])
  , bare (.genDecl .constTok
      [ .valueSpec ["MachineApplicable"] (some (name "Applicability"))
          [name "iota"]
      , .valueSpec ["Advisory"] none [] ])
  , bare (.funcDecl
      { receiver := some (binder ["a"] (name "Applicability"))
      , name := "String"
      , signature := { parameters := [], results := [anonymous (name "string")] }
      , body :=
          [ .ifStmt (.binary .eq (name "a") (name "MachineApplicable"))
              [.ret [literal "\"machine-applicable\""]]
          , .ret [literal "\"advisory\""] ] }) ]

/-- The Go identifier for an applicability mark. -/
def applicabilityIdent (mark : String) : String :=
  if mark == "machine-applicable" then "MachineApplicable" else "Advisory"

/-- The refusal group. -/
def refusalGroup : List TopLevel :=
  [ documented
      [ " RefusalReason indexes the taught table. The numeric value is this table's"
      , " position, which is the model's RefusalReason declaration order; compare by"
      , " Wire when crossing a version boundary." ]
      (.genDecl .typeTok [.typeSpec "RefusalReason" (name "uint8")])
  , bare (.genDecl .constTok
      ((refusals.zipIdx).map fun entry =>
        .valueSpec ["Reason" ++ exportedIdent entry.1.reason]
          (some (name "RefusalReason")) [number entry.2]))
  , documented
      [ " Refusal is one row of the taught table: the reason, the law it defends, the"
      , " taught repair, and how the repair may be applied. The door never refuses"
      , " without teaching the legal next move, so no field here is optional." ]
      (.genDecl .typeTok
        [ .typeSpec "Refusal" (.structType .perLine
            [ binder ["Reason"] (name "RefusalReason")
            , binder ["Wire"] (name "string")
            , binder ["Law"] (name "string")
            , binder ["Repair"] (name "string")
            , binder ["Applicability"] (name "Applicability") ]) ])
  , documented
      [ " RefusalTable is the taught table in the model's declaration order." ]
      (.genDecl .varTok
        [ .valueSpec ["RefusalTable"] none
            [ .composite (some (.array .ellipsis (.ident "Refusal"))) .perLine
                ((refusals.zipIdx).map fun entry =>
                  .positional (.composite none .perLine
                    [ .keyed "Reason" (number entry.2)
                    , .keyed "Wire" (text entry.1.reason)
                    , .keyed "Law" (text entry.1.law)
                    , .keyed "Repair" (text entry.1.repair)
                    , .keyed "Applicability"
                        (name (applicabilityIdent entry.1.applicability)) ])) ] ])
  , documented
      [ " Taught returns the row a reason carries. Total by construction: a reason"
      , " without its law and its repair cannot exist in this table." ]
      (.funcDecl
        { receiver := none
        , name := "Taught"
        , signature :=
            { parameters := [binder ["r"] (name "RefusalReason")]
            , results := [anonymous (name "Refusal")] }
        , body := [.ret [.index (name "RefusalTable") (name "r")]] })
  , documented
      [ " RefusalByWire resolves a wire reason. Unknown reasons are refused, never"
      , " defaulted to a neighbouring row." ]
      (.funcDecl
        { receiver := none
        , name := "RefusalByWire"
        , signature :=
            { parameters := [binder ["wire"] (name "string")]
            , results := [anonymous (name "RefusalReason"), anonymous (name "bool")] }
        , body :=
            [ .rangeStmt "index" none .define (name "RefusalTable")
                [ .ifStmt (.binary .eq
                    (.selector (.index (name "RefusalTable") (name "index")) "Wire")
                    (name "wire"))
                    [.ret [apply "RefusalReason" [name "index"], name "true"]] ]
            , .ret [number 0, name "false"] ] })
  , documented
      [ " RefusalError carries a taught refusal as a Go error, so the model's taught"
      , " table becomes this package's caller-facing diagnostic vocabulary rather"
      , " than a lookup a caller has to remember to perform." ]
      (.genDecl .typeTok
        [ .typeSpec "RefusalError"
            (.structType .inline [binder ["Refusal"] (name "Refusal")]) ])
  , bare (.funcDecl
      { receiver := some (binder ["e"] (name "RefusalError"))
      , name := "Error"
      , signature := { parameters := [], results := [anonymous (name "string")] }
      , body :=
          [ .ret
              [ .binary .add
                  (.binary .add
                    (.binary .add
                      (.binary .add
                        (.selector (field "e" "Refusal") "Wire")
                        (literal "\": \""))
                      (.selector (field "e" "Refusal") "Law"))
                    (literal "\" [repair: \""))
                  (.binary .add
                    (.selector (field "e" "Refusal") "Repair")
                    (literal "\"]\"")) ] ] })
  , documented
      [ " Refuse mints the error for a reason." ]
      (.funcDecl
        { receiver := none
        , name := "Refuse"
        , signature :=
            { parameters := [binder ["r"] (name "RefusalReason")]
            , results := [anonymous (name "error")] }
        , body :=
            [ .ret [.composite (some (name "RefusalError")) .inline
                [.positional (apply "Taught" [name "r"])]] ] })
  , documented
      [ " MachineApplicableRepairs is the codemod catalog: the repairs that are a"
      , " function of the refused candidate alone." ]
      (.funcDecl
        { receiver := none
        , name := "MachineApplicableRepairs"
        , signature :=
            { parameters := []
            , results := [anonymous (.array .slice (.ident "Refusal"))] }
        , body :=
            [ .assign .define [name "catalog"]
                [ apply "make"
                    [ .array .slice (.ident "Refusal")
                    , number 0
                    , apply "len" [name "RefusalTable"] ] ]
            , .rangeStmt "_" (some "row") .define (name "RefusalTable")
                [ .ifStmt (.binary .eq (field "row" "Applicability")
                    (name "MachineApplicable"))
                    [ .assign .assign [name "catalog"]
                        [apply "append" [name "catalog", name "row"]] ] ]
            , .ret [name "catalog"] ] }) ]

/-- The brand-type group: one defined type per kind, each carrying the
    `//foldlab:brand` directive `go/brandlint` reads. The directive is
    a comment to `go/ast` and a declaration to the estate, so it is
    produced from the corpus row rather than written beside it. -/
def brandGroup : List TopLevel :=
  [ .section (remark
      [ " ---- Brand types ----"
      , ""
      , " The model brands a digest by the kind of declaration it names, and the"
      , " comparison of two differently branded digests HAS NO TYPE: the Lean"
      , " elaborator refuses it, so there is nothing to write. Go's nearest"
      , " equivalent is one defined type per kind, which makes the cross-kind"
      , " comparison a compile error."
      , ""
      , " What the defined type does NOT buy, stated plainly rather than left for a"
      , " reader to discover:"
      , ""
      , "   - an untyped constant adopts any brand, so `d == 3` compiles;"
      , "   - an explicit conversion crosses any brand, silently and always;"
      , "   - a value-level brand (the register that issued a token) has no type to"
      , "     become, because Go has no dependent types, so it rides as data and the"
      , "     elaborator's refusal becomes the run-time check below."
      , ""
      , " The first two are closed mechanically by foldlab/brandlint, which reads the"
      , " //foldlab:brand directives on these declarations. The third is not closed"
      , " at all: a caller who drops the returned error gets nothing." ]) ] ++
  (kinds.map fun row =>
    documented ["foldlab:brand " ++ row.1]
      (.genDecl .typeTok
        [.typeSpec (exportedIdent row.1 ++ "Digest") (name "uint64")])) ++
  (kinds.zipIdx.map fun entry =>
    let branded := exportedIdent entry.1.1 ++ "Digest"
    let constructor : Decl :=
      .funcDecl
        { receiver := none
        , name := "New" ++ branded
        , signature :=
            { parameters := [binder ["id"] (name "uint64")]
            , results := [anonymous (name branded)] }
        , body := [.ret [apply branded [name "id"]]] }
    if entry.2 == 0 then
      documented
        [ " The constructor discipline: a digest is minted from a resolved identifier"
        , " through a named function, never conjured from an integer at a call site."
        , " Nothing mints a name." ]
        constructor
    else bare constructor) ++
  [ documented
      [ " BrandTypeNames lists the brands this package declares, so a lint that"
      , " runs over a CONSUMER of this package can be told the brand set without"
      , " re-deriving it from the corpus." ]
      (.genDecl .varTok
        [ .valueSpec ["BrandTypeNames"] none
            [stringColumn (kinds.map fun row => exportedIdent row.1 ++ "Digest")] ]) ]

/-- The value-level brand group. `cmd/kmgen`'s `writeValueLevelBrands`
    takes no corpus argument either: this whole group, the refusal
    reason it names included, is template text on both sides. -/
def valueBrandGroup : List TopLevel :=
  [ .section (remark
      [ " ---- Value-level brands ----"
      , ""
      , " In the model a token's register and a position's partition are part of the"
      , " TYPE, so a cross-register spend and a cross-partition compare fail to"
      , " elaborate. Go cannot index a type by a value, so the brand rides as"
      , " unexported data and the refusal moves from compile time to run time. That"
      , " is a real loss and not a workaround that recovers the property." ])
  , documented
      [ " Token is a lease, meaningful only at the register that issued it." ]
      (.genDecl .typeTok
        [ .typeSpec "Token" (.structType .perLine
            [ binder ["register"] (name "ProgramDigest")
            , binder ["value"] (name "uint64") ]) ])
  , documented
      [ " NewToken pins the issuing register at construction, so a token with no"
      , " register cannot be built." ]
      (.funcDecl
        { receiver := none
        , name := "NewToken"
        , signature :=
            { parameters :=
                [ binder ["register"] (name "ProgramDigest")
                , binder ["value"] (name "uint64") ]
            , results := [anonymous (name "Token")] }
        , body :=
            [ .ret [.composite (some (name "Token")) .inline
                [ .keyed "register" (name "register")
                , .keyed "value" (name "value") ]] ] })
  , documented
      [ " Register reports which register issued the token." ]
      (.funcDecl
        { receiver := some (binder ["t"] (name "Token"))
        , name := "Register"
        , signature := { parameters := [], results := [anonymous (name "ProgramDigest")] }
        , body := [.ret [field "t" "register"]] })
  , documented
      [ " Spend refuses a token presented at a register that did not issue it. In"
      , " the model this refusal is a type error; here it is an error value, and a"
      , " caller who discards it has the guarantee of neither." ]
      (.funcDecl
        { receiver := some (binder ["t"] (name "Token"))
        , name := "Spend"
        , signature :=
            { parameters := [binder ["register"] (name "ProgramDigest")]
            , results := [anonymous (name "uint64"), anonymous (name "error")] }
        , body :=
            [ .ifStmt (.binary .ne (field "t" "register") (name "register"))
                [ .ret [number 0, apply "Refuse" [name "ReasonCrossSortIdentifier"]] ]
            , .ret [field "t" "value", name "nil"] ] })
  , documented
      [ " LanePartition is the venue-local shard of an evidence stream." ]
      (.genDecl .typeTok
        [ .typeSpec "LanePartition" (.structType .perLine
            [ binder ["Lane"] (name "LaneDigest")
            , binder ["Shard"] (name "uint64") ]) ])
  , documented
      [ " Position is a journal position, meaningful only within its partition." ]
      (.genDecl .typeTok
        [ .typeSpec "Position" (.structType .perLine
            [ binder ["partition"] (name "LanePartition")
            , binder ["value"] (name "uint64") ]) ])
  , documented
      [ " NewPosition pins the partition at construction." ]
      (.funcDecl
        { receiver := none
        , name := "NewPosition"
        , signature :=
            { parameters :=
                [ binder ["partition"] (name "LanePartition")
                , binder ["value"] (name "uint64") ]
            , results := [anonymous (name "Position")] }
        , body :=
            [ .ret [.composite (some (name "Position")) .inline
                [ .keyed "partition" (name "partition")
                , .keyed "value" (name "value") ]] ] })
  , documented
      [ " Partition reports the partition a position is denominated in." ]
      (.funcDecl
        { receiver := some (binder ["p"] (name "Position"))
        , name := "Partition"
        , signature := { parameters := [], results := [anonymous (name "LanePartition")] }
        , body := [.ret [field "p" "partition"]] })
  , documented
      [ " Compare refuses two positions denominated in different partitions — the"
      , " proven-but-vacuous comparison the model gives no syntax for." ]
      (.funcDecl
        { receiver := some (binder ["p"] (name "Position"))
        , name := "Compare"
        , signature :=
            { parameters := [binder ["other"] (name "Position")]
            , results := [anonymous (name "int"), anonymous (name "error")] }
        , body :=
            [ .ifStmt (.binary .ne (field "p" "partition")
                (.selector (name "other") "partition"))
                [ .ret [number 0, apply "Refuse" [name "ReasonCrossSortIdentifier"]] ]
            , .switchStmt
                [ .clause [.binary .lt (field "p" "value")
                    (.selector (name "other") "value")]
                    [.ret [.unary .neg (number 1), name "nil"]]
                , .clause [.binary .gt (field "p" "value")
                    (.selector (name "other") "value")]
                    [.ret [number 1, name "nil"]]
                , .clause [] [.ret [number 0, name "nil"]] ] ] }) ]

/-- The type roster. -/
def typeNameGroup : List TopLevel :=
  [ documented
      [ " TypeNames is the closed type list in the model's declaration order." ]
      (.genDecl .varTok
        [.valueSpec ["TypeNames"] none [stringColumn typeNames]]) ]

/-- The docstring group. -/
def docGroup : List TopLevel :=
  [ .section (remark
      [ " ---- Docstrings ----"
      , ""
      , " The model's own prose, extracted from its environment and carried here"
      , " verbatim. It is the text a generated schema annotation publishes as a"
      , " parameter description, which is how a sentence written once in the model"
      , " reaches an agent with no human in the path — and why a hand-edited copy is"
      , " a wrong answer rather than a typo." ])
  , documented
      [ " DocEntry is one type's docstring." ]
      (.genDecl .typeTok
        [ .typeSpec "DocEntry" (.structType .perLine
            [ binder ["Name"] (name "string")
            , binder ["Doc"] (name "string") ]) ])
  , documented
      [ " DocTable is the doc group in type declaration order." ]
      (.genDecl .varTok
        [ .valueSpec ["DocTable"] none
            [ .composite (some (.array .slice (.ident "DocEntry"))) .perLine
                (docs.map fun row =>
                  .positional (.composite none .inline
                    [ .keyed "Name" (text row.1)
                    , .keyed "Doc" (text row.2) ])) ] ])
  , documented
      [ " DocFor resolves a type's docstring. A type without one is reported as"
      , " absent rather than as an empty string, so a caller cannot render a blank"
      , " description and believe it is the model's." ]
      (.funcDecl
        { receiver := none
        , name := "DocFor"
        , signature :=
            { parameters := [binder ["name"] (name "string")]
            , results := [anonymous (name "string"), anonymous (name "bool")] }
        , body :=
            [ .rangeStmt "_" (some "entry") .define (name "DocTable")
                [ .ifStmt (.binary .eq (field "entry" "Name") (name "name"))
                    [.ret [field "entry" "Doc", name "true"]] ]
            , .ret [literal "\"\"", name "false"] ] }) ]

/-- The conformance-vector groups. -/
def vectorGroup : List TopLevel :=
  [ .section (remark
      [ " ---- Conformance vectors ----"
      , ""
      , " The model's own outputs. A consumer tests its door against them verdict for"
      , " verdict. They check an implementation against the model's verdicts; they do"
      , " not promote the model's theorems into runtime guarantees." ])
  , documented
      [ " EncodingVector is one canonical sentence framing." ]
      (.genDecl .typeTok
        [ .typeSpec "EncodingVector" (.structType .perLine
            [ binder ["Name"] (name "string")
            , binder ["Act"] (.array .slice (.ident "uint64")) ]) ])
  , documented
      [ " EncodingVectors is the encoding group in corpus order."
      , ""
      , " The wire number domain is the unbounded non-negative integers and the"
      , " parser reads it at arbitrary precision. This table is a checked-width"
      , " convenience: kmgen REFUSES to emit a vector that does not fit a uint64"
      , " rather than truncating one, so a corpus that outgrows the width fails"
      , " generation loudly instead of shipping a rounded act." ]
      (.genDecl .varTok
        [ .valueSpec ["EncodingVectors"] none
            [ .composite (some (.array .slice (.ident "EncodingVector"))) .perLine
                (encodings.map fun row =>
                  .positional (.composite none .inline
                    [ .keyed "Name" (text row.1)
                    , .keyed "Act" (uint64List row.2) ])) ] ])
  , documented
      [ " EncodingVectorByName resolves a vector. Unknown names are refused." ]
      (.funcDecl
        { receiver := none
        , name := "EncodingVectorByName"
        , signature :=
            { parameters := [binder ["name"] (name "string")]
            , results := [anonymous (name "EncodingVector"), anonymous (name "bool")] }
        , body :=
            [ .rangeStmt "_" (some "vector") .define (name "EncodingVectors")
                [ .ifStmt (.binary .eq (field "vector" "Name") (name "name"))
                    [.ret [name "vector", name "true"]] ]
            , .ret [.composite (some (name "EncodingVector")) .inline [],
                name "false"] ] })
  , documented
      [ " AdmissionVector is one planted candidate and the door's verdict. The"
      , " admitted row is what stops the suite from being satisfied by a door that"
      , " refuses everything." ]
      (.genDecl .typeTok
        [ .typeSpec "AdmissionVector" (.structType .perLine
            [ binder ["Name"] (name "string")
            , binder ["Admitted"] (name "bool")
            , binder ["Reason"] (name "string")
            , binder ["Encoded"] (.array .slice (.ident "uint64")) ]) ])
  , documented
      [ " AdmissionVectors is the admission group in the kernel gate's control order." ]
      (.genDecl .varTok
        [ .valueSpec ["AdmissionVectors"] none
            [ .composite (some (.array .slice (.ident "AdmissionVector"))) .perLine
                (admissions.map fun row =>
                  .positional (.composite none .inline
                    (match row.2 with
                     | .admitted encoded =>
                         [ .keyed "Name" (text row.1)
                         , .keyed "Admitted" (name "true")
                         , .keyed "Encoded" (uint64List encoded) ]
                     | .refused reason =>
                         [ .keyed "Name" (text row.1)
                         , .keyed "Reason" (text reason) ]))) ] ]) ]

/-- The program-vector group. -/
def programGroup : List TopLevel :=
  [ .section (remark
      [ " ---- Program vectors ----"
      , ""
      , " The ninth corpus group: the DAG builder's committed declarations, each with"
      , " the canonical bytes it serializes to."
      , ""
      , " WHY BYTES AND NOT THE DECLARATION. The declaration already has a Go form —"
      , " kmconform.ProgramDeclaration, hand-written and conformance-walled — and"
      , " emitting a second Go spelling of the same grammar here would be two"
      , " spellings of one thing, which is the exact defect generation exists to"
      , " prevent. What a consumer actually needs from a table is the model's answer"
      , " to compare its own construction against, and that answer is a byte string."
      , " It is the same reasoning that puts canonical examples on the TypeScript"
      , " surface as strings rather than as values."
      , ""
      , " These are DECLARATIONS, never execution records. Nothing here runs." ])
  , documented
      [ " ProgramVector is one committed program declaration, named, with the"
      , " canonical serialization the corpus carries for it." ]
      (.genDecl .typeTok
        [ .typeSpec "ProgramVector" (.structType .perLine
            [ binder ["Name"] (name "string")
            , binder ["Bytes"] (name "string") ]) ])
  , documented
      [ " ProgramVectorTable is the program group in corpus order." ]
      (.genDecl .varTok
        [ .valueSpec ["ProgramVectorTable"] none
            [ .composite (some (.array .slice (.ident "ProgramVector"))) .perLine
                (programs.map fun row =>
                  .positional (.composite none .inline
                    [ .keyed "Name" (text row.1)
                    , .keyed "Bytes" (text row.2) ])) ] ])
  , documented
      [ " ProgramVectorNames is the committed vector names in corpus order." ]
      (.genDecl .varTok
        [ .valueSpec ["ProgramVectorNames"] none
            [stringColumn (programs.map fun row => row.1)] ])
  , documented
      [ " ProgramVectorByName resolves a vector. Unknown names are refused." ]
      (.funcDecl
        { receiver := none
        , name := "ProgramVectorByName"
        , signature :=
            { parameters := [binder ["name"] (name "string")]
            , results := [anonymous (name "ProgramVector"), anonymous (name "bool")] }
        , body :=
            [ .rangeStmt "_" (some "vector") .define (name "ProgramVectorTable")
                [ .ifStmt (.binary .eq (field "vector" "Name") (name "name"))
                    [.ret [name "vector", name "true"]] ]
            , .ret [.composite (some (name "ProgramVector")) .inline [],
                name "false"] ] }) ]

/-- The whole file, as one `GoAst` value. -/
def tables : File :=
  { banner := banner
  , packageName := "kmconform"
  , body :=
      provenance ++ declKindGroup ++ holeStageGroup ++ applicabilityGroup ++
        refusalGroup ++ brandGroup ++ valueBrandGroup ++ typeNameGroup ++
        docGroup ++ vectorGroup ++ programGroup }

/-- The emission's bytes. -/
def emission : String := GoPrinter.render tables

/-! ## Emit-time checks

The generator refuses what its own consumer would refuse. `cmd/kmgen`
runs `kmconform.CheckBothWays` before it writes a byte, and then its
own `checkIdentifiers`, because a generator more tolerant than its
consumer bakes the defect into compiled code. The Lean side inherits
both: `Unity.Emit.emitFailures` is the corpus validator, and the rows
below are the identifier and alphabet checks the Go spelling adds. -/

/-- The Go identifiers this emission mints, each with the corpus row it
    was minted from. -/
def mintedIdentifiers : List (String × String) :=
  (kinds.flatMap fun row =>
    [ ("Kind" ++ exportedIdent row.1, "kind " ++ row.1)
    , (exportedIdent row.1 ++ "Digest", "kind " ++ row.1) ]) ++
  (stages.map fun row => ("Stage" ++ exportedIdent row.1, "stage " ++ row.1)) ++
  (refusals.map fun row =>
    ("Reason" ++ exportedIdent row.reason, "refusal " ++ row.reason))

/-- Identifiers two corpus rows would both mint, and identifiers a
    corpus name renders empty. `clock-read` and `clock_read` both
    render `ClockRead`, and the generator owns the check because the
    alternative is a compile error inside a generated file, which
    reports the symptom at the wrong layer. The identifiers are
    CLAIMED in order, exactly as `cmd/kmgen`'s `checkIdentifiers`
    claims them, so a second claim on one name is a failure whether or
    not the two rows describe themselves the same way. -/
def identifierFailures : List String :=
  (mintedIdentifiers.filterMap fun entry =>
    if entry.1 == "" then
      some s!"gotables: {entry.2} renders as an empty Go identifier"
    else none) ++
  (mintedIdentifiers.zipIdx.filterMap fun entry =>
    match (mintedIdentifiers.take entry.2).find?
        (fun earlier => earlier.1 == entry.1.1) with
    | some earlier =>
        some s!"gotables: the identifier {entry.1.1} would be minted from both {earlier.2} and {entry.1.2}; the corpus names collide once rendered as Go"
    | none => none)

/-- Every corpus value the emission quotes. -/
def quotedValues : List String :=
  (kinds.map (·.1)) ++ (stages.map (·.1)) ++
  (refusals.flatMap fun row => [row.reason, row.law, row.repair]) ++
  typeNames ++ (docs.flatMap fun row => [row.1, row.2]) ++
  (encodings.map (·.1)) ++ (admissions.flatMap fun row =>
    match row.2 with
    | .refused reason => [row.1, reason]
    | .admitted _ => [row.1]) ++
  (programs.flatMap fun row => [row.1, row.2]) ++
  [headerString "source", headerString "generator"]

/-- Corpus values the Go escape table cannot name. -/
def alphabetFailures : List String :=
  quotedValues.filterMap fun value =>
    match goQuote value with
    | .ok _ => none
    | .error reason => some reason

/-- The docstring rows the reader could not take apart. A row that
    fails to parse would otherwise silently shorten the table. -/
def docFailures : List String :=
  if docs.length == Emit.docRows.length then []
  else
    [s!"gotables: the corpus carries {Emit.docRows.length} docstring rows but the emission read {docs.length}"]

/-- The header fields the provenance constants are read from. -/
def headerFailures : List String :=
  (if headerString "source" == "" then
    ["gotables: the corpus header names no source"] else []) ++
  (if headerString "generator" == "" then
    ["gotables: the corpus header names no generator"] else [])

/-- Every reason the generator would refuse to print. The corpus
    validator comes FIRST, in the same words the emitter states it, so
    a corpus the interchange refuses can never reach compiled Go. -/
def emissionFailures : List String :=
  Emit.emitFailures ++ docFailures ++ headerFailures ++
    identifierFailures ++ alphabetFailures

end Unity.GoTables
