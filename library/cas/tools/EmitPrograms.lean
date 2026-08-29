import Cas.Vectors.Registry
import Cas.Backend.EmitProg
import Gate

/-!
# The program emitter — `lake exe emitprograms`

Slice 2 of the TypeScript backend, the language's hello world: every
registered grammar term lowered to a straight-line Effect program that
re-performs the term's puts against a REAL store, computing addresses
through the host's own digest. The VectorPrograms suite runs each
program and asserts its answered addresses equal the vector fixture's
word, binding for binding — the cross-host run gate (EFFECTS-BACKEND
R5): same program, both hosts, identical words or red.
-/

open Cas.Schema Cas.Backend Cas.Backend.Ts Cas.Vectors.Registry Cas.Grammar

namespace EmitProgramsMain

def hexHelper : String :=
  "const hex = (s: string): Uint8Array =>\n" ++
  "  Uint8Array.from({ length: s.length / 2 }, (_, i) =>\n" ++
  "    Number.parseInt(s.slice(i * 2, i * 2 + 2), 16))"

abbrev Row := String × String × String × ((t : Ty) × Tree t)

/-- (program name, vector fixture name, doc, term) — the vector
registry's order. -/
def pureRows : List Row := [
  ("valueSingle", "value-single",
    "One opaque value node — the smallest program.", ⟨_, helloValue⟩),
  ("blobTwoLeaves", "blob-two-leaves",
    "A two-leaf blob: chunks, leaves, parent, manifest.", ⟨_, blobTwoLeaves⟩),
  ("fileReadme", "file-readme",
    "A named file over a one-chunk blob.", ⟨_, fileReadme⟩),
  ("journalTwoEntries", "journal-two-entries",
    "A journal: genesis and two entries over saved files.", ⟨_, journalTwo⟩),
  ("sharedChunk", "shared-chunk",
    "Two leaves over one shared chunk — the duplicate put replays as a dedup.",
    ⟨_, blobSharedChunk⟩),
  ("gitPinCommit", "git-pin-commit",
    "The lean4-tree-sitter pin commit as a git node — a provenance pin as store content.",
    ⟨_, gitPinCommit⟩)
]

/-- The schema program needs the payload-bound witness, so it joins
the registry in `IO` (the vector tool's own pattern). -/
def schemaRow : IO Row := do
  if small : (Cas.Grammar.utf8 vectorDocumentCode.payload).length < 4294967296 then
    return ("schemaVectorDocument", "schema-vector-document",
      "The vector format's own canonical schema as a schema node.",
      ⟨_, .schema ⟨Cas.Grammar.utf8 vectorDocumentCode.payload, small⟩⟩)
  else
    throw (IO.userError "schema program: payload exceeds the node byte bound")

/-- The emitter is partial on `PProg` (puts only, earlier-answer
operands only — `Cas.Backend.progProgram`). Every registered term
lowers inside that domain, so a `none` here is a defect in the walk and
is named as one rather than silently skipped. -/
def progDecl (name doc : String) (tree : (t : Ty) × Tree t) : IO Decl := do
  match treeProgram [doc] name tree.2 with
  | some d => return .prog d
  | none => throw (IO.userError
      s!"program {name}: the lowered table is outside the recognized surface")

def moduleDecls (rows : List Row) : IO (List Decl) := do
  let progs ← rows.mapM fun (name, _, doc, tree) => progDecl name doc tree
  return .raw hexHelper :: progs ++
    [.const {
      doc := ["Every generated program beside its vector fixture's name."]
      name := "programs"
      value := .arr (rows.map fun (name, fixture, _, _) =>
        .object [("name", .str fixture), ("run", .ident name)])
    }]

def programsModule (rows : List Row) : IO Ts.Module := do
  return {
    header := [
      "GENERATED — do not edit. Straight-line Effect programs lowered",
      "from the registered grammar terms (`Cas/Vectors/Registry.lean`)",
      "by `lake exe emitprograms`; regeneration is byte-identity-gated",
      "(`--check`, wired into `check:cas`). Each program re-performs its",
      "term's puts against a live store — addresses computed by the",
      "host's own digest — and the VectorPrograms suite asserts the",
      "answers equal the Lean-computed word, binding for binding: the",
      "cross-host run gate."
    ]
    imports := [
      .named ["Effect"] "effect",
      .types ["CasStoreShape"] "../../src/cas/Store.ts"
    ]
    decls := ← moduleDecls rows }

def rendered (rows : List Row) : IO String := do
  return Render.module house0 (← programsModule rows)

/-! ## The round-trip document (P3)

The second artifact: the lift document the recognizer must answer for
each generated program, in the harness's own canonical JSON, in
declaration order. It is emitted from the SAME `PProg` the TypeScript
was printed from, so the two fixtures cannot drift apart, and the
harness's side of the gate is a byte comparison against
`canonJson(liftSource(VectorPrograms.ts))`.

The Lean half of the round trip runs HERE, before the bytes are written:
every document is decoded back through `Cas.Lift.decodeLiftBytes` and
compared to the table it came from. `decodeLiftBytes_encodeLiftBytes`
proves that in general; this runs it on the registered programs, so a
regression in either direction is a red gate and not a stale theorem. -/

/-- The `PProg → document → PProg` leg, executed on one row. Answers the
document's canonical bytes. -/
def liftDocumentOf (name : String) (tree : (t : Ty) × Tree t) :
    IO Cas.Json.Value := do
  let lifted := treeLifted name tree.2
  let some doc := Cas.Lift.encodeLift lifted
    | throw (IO.userError
        s!"lift document {name}: the table is outside the decoder's domain")
  let bytes := Cas.Json.renderCompact doc
  match Cas.Lift.decodeLiftBytes bytes with
  | .error _ => throw (IO.userError
      s!"lift document {name}: its own bytes did not decode back")
  | .ok back =>
    if back = lifted then return doc
    else throw (IO.userError
      s!"lift document {name}: decoded back to a different program")

def liftsDocument (rows : List Row) : IO String := do
  let docs ← rows.mapM fun (name, _, _, tree) => liftDocumentOf name tree
  return Cas.Json.renderCompact (.arr docs) ++ "\n"

/-- Where the generated programs live in the effects package — the
registry's own knowledge of its artifact. A positional argument
overrides it; the lift documents follow it to the sibling path. -/
def defaultTarget : System.FilePath :=
  "../effects/test/generated/VectorPrograms.ts"

/-- The lift documents' path, derived from the programs' own. -/
def liftsTargetOf (programs : System.FilePath) : System.FilePath :=
  match programs.parent with
  | some dir => dir / "VectorProgramLifts.json"
  | none => "VectorProgramLifts.json"

def fixtures (target : Option System.FilePath) : IO (List Gate.Fixture) := do
  let rows := pureRows ++ [← schemaRow]
  let programs := target.getD defaultTarget
  let text ← rendered rows
  let lifts ← liftsDocument rows
  return [
    ⟨programs, text, s!"{rows.length} programs"⟩,
    ⟨liftsTargetOf programs, lifts,
      s!"{rows.length} lift documents (round-tripped)"⟩]

end EmitProgramsMain

def main := Gate.mainAt "lake exe emitprograms" EmitProgramsMain.fixtures
