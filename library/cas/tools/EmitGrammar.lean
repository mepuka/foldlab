import Cas.Grammar.Manifest
import Cas.Lang.Defun
import Cas.Backend.Ts
import Gate

/-!
# The grammar-manifest emitter — `lake exe emitgrammar`

Emits three projections of the grammar manifest (the R11 interchange
document of the data grammar) from `Cas.Grammar.manifestV0`: the JSON
the front ends consume, through the house manifest printer;
`REGISTRY.md`, the human kind-tag registry, which is this manifest's
Markdown rendering and nothing else; and `kindTags.ts`, the TypeScript
door's refusal set, which is the same table's tag column. `--check` is
the byte-identity gate over all three.

The registry is regenerated IN PLACE rather than beside the JSON: the
grammar's human surface already has a home at the library root, and a
second Markdown spelling of the sort table is exactly what closing
ruling-queue item 26 was about. The TypeScript projection rides beside
the JSON, so a re-pointed target moves the pair together.

This root is also where the grammar manifest and the `Lang` layer meet,
so the RESERVED rows are pinned here — the manifest cannot import
`Defun` (layer 3 sits above layer 2), but the tool that renders it can,
and `check:cas` builds it.
-/

namespace EmitGrammarMain

open Cas.Grammar
open Cas.Backend.Ts

/-- The reserved rows carry the tags `Cas/Lang/Defun.lean` actually
writes. `Defun` guards those literals against the registry table; this
guards the table against `Defun`, closing the loop the layering forbids
stating in one module. -/
private def reservedTags : List UInt8 :=
  (manifestV0.rows.filter (·.status.isReserved)).map (·.id.wireTag)

#guard reservedTags == [Cas.Lang.stepWireTag, Cas.Lang.contWireTag]

/-! ## The TypeScript door

`Cas.value` mints caller-defined projections, and a projection at a tag
the registry already gives a row would hand that row's plane a second
public interpretation. The refusal set is therefore not a hand list in
TypeScript: it is this column. A row ratified in Lean widens the door on
the next regeneration, and the byte gate says so when it has not been
run. -/

/-- Every tag the registry gives a row — ratified sorts and reserved
code points alike. This IS the door's refusal set. -/
private def doorTags : List UInt8 := manifestV0.ids.map RowId.wireTag

-- Every row reaches the door; nothing is dropped between the table and
-- the emitted column.
#guard doorTags.length == manifestV0.rows.length

-- The six tags the substrate audit found undefended (B-A): `value`,
-- `file`, `entry`, `context`, `step`, `cont`. A door that stops
-- refusing any of them is the aliasing hole reopening.
#guard [1, 11, 12, 13, 14, 15].all (doorTags.contains ·)

private def tagOf (r : Row) : Expr := .int (Int.ofNat r.id.wireTag.toNat)

private def rowExpr (r : Row) : Expr :=
  .objectML [("name", .str r.name), ("tag", tagOf r),
    ("reserved", .bool r.status.isReserved)]

/-- The row type the generated table is read at. A raw block: these are
TypeScript declarations, not expressions, and the fragment the printer
carries is deliberately expression-only. -/
private def typeBlock : String :=
  "/** One registry row's tag surface: the sort's registry name, its\n" ++
  " * wire kind tag, and whether the row is RESERVED — a code point the\n" ++
  " * registry holds outside `Ty` — rather than a ratified sort. Both\n" ++
  " * kinds of row are refused identically at the door. */\n" ++
  "export interface KindTagRow {\n" ++
  "  readonly name: string\n" ++
  "  readonly tag: number\n" ++
  "  readonly reserved: boolean\n" ++
  "}"

private def decls : List Decl := [
  .raw typeBlock,
  .const {
    name := "KindTagRows",
    type := some "ReadonlyArray<KindTagRow>",
    doc := ["Every registry row, in registry order — the table",
      "`REGISTRY.md` renders for humans, as data."],
    value := .arr (manifestV0.rows.map rowExpr) },
  .const {
    name := "KindTagsByName",
    doc := ["The registry's wire tags by sort name: how a consumer names",
      "one row without repeating its number."],
    value := .objectML (manifestV0.rows.map fun r => (r.name, tagOf r)) },
  .const {
    name := "GrammarKindTags",
    type := some "ReadonlyArray<number>",
    doc := ["THE door's refusal set: every tag the registry gives a row,",
      "in registry order. `Cas.value` refuses each of these, so a",
      "caller-defined projection can never give a registry row a second",
      "public interpretation."],
    value := .arr (manifestV0.rows.map tagOf) }
]

private def module : Module where
  header := [
    "GENERATED — do not edit. THE KIND-TAG REGISTRY, as data: every wire",
    "tag `Cas.Grammar.manifestV0` gives a row, emitted from",
    "`library/cas/Cas/Grammar/Manifest.lean` by `lake exe emitgrammar`;",
    "regeneration is byte-identity-gated (`--check`, wired into",
    "`check:cas`). `REGISTRY.md` is the same table's human rendering and",
    "`manifest.json` its machine one.",
    "",
    "`src/internal/kindTags.ts` is the door's projection of this file.",
    "`Cas.value` refuses every tag listed here, which is what stops a",
    "caller-defined projection from aliasing a kind plane the library",
    "already reads. A RESERVED row is a code point the registry holds",
    "outside `Ty` (`Cas/Lang/Defun.lean` writes 14 and 15); it is",
    "refused exactly like a ratified sort, because a tag with a second",
    "public interpretation is the same hole either way."
  ]
  imports := []
  decls := decls

def rendered : String := Render.module house0 module

/-! ## The fixtures -/

/-- Where the manifest lives in the effects package — the lane's own
knowledge of its artifact. A positional argument overrides it; the
registry rendering is at the library root either way. -/
def defaultTarget : System.FilePath :=
  "../effects/src/cas/generated/grammar/manifest.json"

/-- The registry document, at the library root. -/
def registryTarget : System.FilePath := "REGISTRY.md"

/-- The TypeScript door registry, beside the JSON: one generated
directory, so re-pointing the target moves both machine projections. -/
def tagsTargetFor (json : System.FilePath) : System.FilePath :=
  match json.parent with
  | some dir => dir.join "kindTags.ts"
  | none => "kindTags.ts"

def fixtures (target : Option System.FilePath) : IO (List Gate.Fixture) :=
  let json := target.getD defaultTarget
  let sorts := s!"{manifestV0.rows.length} sorts"
  return [
    ⟨json, Cas.Grammar.document, sorts⟩,
    ⟨registryTarget, Cas.Grammar.registry, s!"{sorts}, the kind-tag registry"⟩,
    ⟨tagsTargetFor json, rendered,
      s!"{doorTags.length} kind tags, the TypeScript door's refusal set"⟩]

end EmitGrammarMain

def main := Gate.mainAt "lake exe emitgrammar" EmitGrammarMain.fixtures
