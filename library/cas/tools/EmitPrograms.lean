import Cas.Vectors.Registry
import Cas.Backend.EmitProg
import Cas.Backend.ProgProse
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

abbrev Row := String × String × ((t : Ty) × Tree t)

/-- (program name, vector fixture name, term) — the vector registry's
order. There is no doc column: a program's description is its effect
envelope verbalized (`Cas/Backend/ProgProse.lean`), so the docstrings
below are computed from the same terms the statements are lowered
from, and the byte gate checks the description rather than
transcribing it. -/
def pureRows : List Row := [
  ("valueSingle", "value-single", ⟨_, helloValue⟩),
  ("blobTwoLeaves", "blob-two-leaves", ⟨_, blobTwoLeaves⟩),
  ("fileReadme", "file-readme", ⟨_, fileReadme⟩),
  ("journalTwoEntries", "journal-two-entries", ⟨_, journalTwo⟩),
  ("sharedChunk", "shared-chunk", ⟨_, blobSharedChunk⟩),
  ("gitPinCommit", "git-pin-commit", ⟨_, gitPinCommit⟩)
]

/-- The schema program needs the payload-bound witness, so it joins
the registry in `IO` (the vector tool's own pattern). -/
def schemaRow : IO Row := do
  if small : (Cas.Grammar.utf8 vectorDocumentCode.payload).length < 4294967296 then
    return ("schemaVectorDocument", "schema-vector-document",
      ⟨_, .schema ⟨Cas.Grammar.utf8 vectorDocumentCode.payload, small⟩⟩)
  else
    throw (IO.userError "schema program: payload exceeds the node byte bound")

def moduleDecls (rows : List Row) : List Decl :=
  .raw hexHelper ::
  (rows.map fun (name, _, tree) =>
    .prog (treeProgram tree.2.docLines name tree.2)) ++
  [.const {
    doc := ["Every generated program beside its vector fixture's name."]
    name := "programs"
    value := .arr (rows.map fun (name, fixture, _) =>
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

/-- Where the generated programs live in the effects package — the
registry's own knowledge of its artifact. A positional argument
overrides it. -/
def defaultTarget : System.FilePath :=
  "../effects/test/generated/VectorPrograms.ts"

def fixtures (target : Option System.FilePath) : IO (List Gate.Fixture) := do
  let text ← rendered
  return [⟨target.getD defaultTarget, text,
    s!"{pureRows.length + 1} programs"⟩]

end EmitProgramsMain

def main := Gate.mainAt "lake exe emitprograms" EmitProgramsMain.fixtures
