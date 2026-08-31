import Cas
import Cas.Schema.Deriving
import Cas.Backend.EmitAst
import Gate

/-!
# The word-wire emitter — `lake exe emitword`

The registry of the word's wire records: the receipt
(`Cas.Lang.WordWire.LogEntry`) and the history document
(`Cas.Lang.WordWire.History`) become GENERATED Effect Schema mirrors,
on `emitwire`'s exact pattern — `deriving Described` supplies the
canonical codes, the registry below lowers them with structural
sharing, and `--check` is the byte-identity gate wired into
`check:cas`. The host's word log persists rows in this spelling and
`cas history --json` answers this document, so neither surface ever
carries an ad-hoc shape: the record is registered here or it does not
ride the wire.
-/

open Cas.Schema Cas.Backend Cas.Backend.Ts

deriving instance Described for Cas.Lang.WordWire.LogEntry
deriving instance Described for Cas.Lang.WordWire.History

namespace EmitWordMain

/-- The registry: emission order is sharing order — the history
document factors through the receipt's name. -/
def registry : List (String × String × Ast) := [
  ("wordLogEntrySchema",
    "One receipt: the persisted record of one admission — seq is the mark (zero-based word index), at is epoch milliseconds on the admitting host's clock.",
    Described.code (α := Cas.Lang.WordWire.LogEntry)),
  ("wordHistorySchema",
    "The history document: the word's suffix from a mark, in admission order, with the next mark.",
    Described.code (α := Cas.Lang.WordWire.History))
]

def decls : List Decl := Id.run do
  let mut env : List (String × Ast) := []
  let mut out : List Decl := []
  for (name, doc, code) in registry do
    out := out ++ [.const { doc := [doc], name, value := constructorExpr env code }]
    env := env ++ [(name, code)]
  return out

/-- The mirror's emitted header. The module declared no version before
this one, so its `schemaVersion` opens at 1. -/
def emitted : Gate.Emitted where
  schemaVersion := 1
  emitter := "emitword"
  module := "library/cas/tools/EmitWord.lean"

def wordModule : Ts.Module where
  header := [
    "GENERATED — do not edit. The canonical Effect Schema mirrors of the",
    "word's wire records — the receipt and the history document — lowered",
    "from the Lean codes in `library/cas/Cas/Lang/WordWire.lean`",
    "(`Described.code` of the wire structures) by `lake exe emitword`;",
    "regeneration is byte-identity-gated (`--check`, wired into",
    "`check:cas`). The word log persists rows in this spelling and",
    "`cas history --json` answers this document."
  ] ++ emitted.headerLines
  imports := [
    .named ["Schema"] "effect"
  ]
  decls := decls

def rendered : String := Render.module house0 wordModule

/-- Where the mirror module lives in the effects package — the
registry's own knowledge of its artifact, so no caller has to carry
the path. A positional argument overrides it. -/
def defaultTarget : System.FilePath :=
  "../effects/src/cas/generated/WordLogSchema.ts"

def fixtures (target : Option System.FilePath) : IO (List Gate.Fixture) :=
  return [⟨target.getD defaultTarget, rendered, s!"{registry.length} mirrors"⟩]

end EmitWordMain

def main := Gate.mainAt "lake exe emitword" EmitWordMain.fixtures
