import Cas
import Cas.Vectors.Registry
import Cas.Backend.EmitProg

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
      ⟨_, .schema vectorDocumentCode
        (Cas.Schema.Described.wf (α := Cas.Vectors.Wire.VectorDocument)) small⟩)
  else
    throw (IO.userError "schema program: payload exceeds the node byte bound")

def moduleDecls (rows : List Row) : List Decl :=
  .raw hexHelper ::
  (rows.map fun (name, _, doc, tree) =>
    .prog (treeProgram [doc] name tree.2)) ++
  [.const {
    doc := ["Every generated program beside its vector fixture's name."]
    name := "programs"
    value := .arr (rows.map fun (name, fixture, _, _) =>
      .object [("name", .str fixture), ("run", .ident name)])
  }]

def programsModule (rows : List Row) : Ts.Module where
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
  decls := moduleDecls rows

def rendered : IO String := do
  let rows := pureRows ++ [← schemaRow]
  return Render.module house0 (programsModule rows)

def emit (path : String) : IO Unit := do
  let text ← rendered
  IO.FS.writeFile path text
  IO.println s!"wrote {path} ({text.toUTF8.size} bytes, {pureRows.length + 1} programs)"

def check (path : String) : IO Unit := do
  let expected ← rendered
  let actual ← try IO.FS.readFile path
    catch _ => throw (IO.userError s!"{path} missing — run `lake exe emitprograms`")
  unless actual == expected do
    throw (IO.userError s!"{path} differs from regeneration — run `lake exe emitprograms`")
  IO.println s!"ok {path} ({pureRows.length + 1} programs)"

end EmitProgramsMain

def main (args : List String) : IO Unit :=
  match args with
  | [path] => EmitProgramsMain.emit path
  | ["--check", path] => EmitProgramsMain.check path
  | _ => throw (IO.userError "usage: lake exe emitprograms [--check] <path>")
