import Cas.Backend.Mcp
import Cas.Backend.Ts
import Gate

/-!
# The MCP manifest emitter — `lake exe mcpspec`

Emits the versioned CAS tool manifest (`mcp/cas-tools.json`) — the
R11 interchange document any MCP host implements and any agent reads.
`--check` is the byte-identity gate.

Two projections of ONE value. `Cas.Backend.Mcp.tools` is the authority
on which tools exist, what each says about itself, and the canonical
schema codes its params and result take; this tool renders that value
twice, from the same list, in the same order:

- `mcp/cas-tools.json`, the language-neutral document a client of any
  runtime reads;
- `library/effects/src/cas/generated/McpToolCodes.ts`, the SAME rows as
  a typed TypeScript constant, so the Effect host's served table is
  imported rather than hand-transcribed.

The TypeScript half closes the mirror gap the host lane named: the
host's boot gate compares its served table against the emitted
manifest, and before this artifact the served side was a hand
transcription that only review kept honest. It is now generated from
the same list the JSON is, so the boot gate compares two projections
of one value and a disagreement means the two renderings here have
forked — not that a reviewer missed a keystroke.

The lowering is deliberately PARTIAL: it spells exactly the fragment of
the revision-0 tagged projection the emitted TypeScript type declares
(null, boolean, integer, string, array, struct), and a code outside it
renders nothing at all. A tool whose code left that fragment would fail
the guard below at elaboration rather than emit a module whose declared
type is a lie — widening the type is then a deliberate edit here, made
with the host's reader in view.
-/

namespace EmitMcpMain

open Cas.Schema Cas.Backend.Ts

def outPath : System.FilePath := "mcp" / "cas-tools.json"

/-! ## The TypeScript projection of a code

The revision-0 tagged form (`Cas.Schema.Ast.toJson`) as a TypeScript
literal — the same `_tag`/`fields` shape, spelled through the house
printer rather than by string concatenation, so the emitted bytes obey
the one layout law every other generated module obeys. -/

mutual

/-- One code as a TypeScript object literal, or `none` when the code
leaves the fragment the emitted type declares. -/
private def codeExpr : Ast → Option Expr
  | .null => some (.object [("_tag", .str "Null")])
  | .bool => some (.object [("_tag", .str "Boolean")])
  | .int => some (.object [("_tag", .str "Integer")])
  | .str => some (.object [("_tag", .str "String")])
  | .arr item =>
    (codeExpr item).map fun e =>
      .object [("_tag", .str "Array"), ("item", e)]
  | .struct fields =>
    (codeFields fields).map fun fs =>
      .object [("_tag", .str "Struct"), ("fields", .objectML fs)]
  | .lit _ | .ref _ | .decl _ _ _ | .union _ _ | .enum _ | .tuple _ _ _ =>
    none

/-- A struct's fields as record entries, in the code's order — the
same `{optional, schema}` entry `fieldsToJson` builds. -/
private def codeFields :
    List (String × Bool × Ast) → Option (List (String × Expr))
  | [] => some []
  | (name, opt, a) :: rest =>
    (codeExpr a).bind fun e =>
      (codeFields rest).map fun es =>
        (name, .object [("optional", .bool opt), ("schema", e)]) :: es

end

/-! ## The rows -/

/-- One manifest row as a TypeScript object literal: the name, what the
tool says about itself, and the two codes. -/
private def rowExpr (t : Cas.Backend.Mcp.McpTool) : Option Expr :=
  (codeExpr t.params).bind fun p =>
    (codeExpr t.result).map fun r =>
      .objectML [
        ("name", .str t.name),
        ("description", .str t.description),
        ("params", p),
        ("result", r)]

private def rowExprs : List Cas.Backend.Mcp.McpTool → Option (List Expr)
  | [] => some []
  | t :: rest =>
    (rowExpr t).bind fun e => (rowExprs rest).map fun es => e :: es

-- THE GUARD: every served code lies inside the fragment the emitted
-- TypeScript type declares. A row that leaves it fails here, at
-- elaboration, instead of emitting a module whose type is wrong.
#guard (rowExprs Cas.Backend.Mcp.tools).isSome

/-- The rows, in the manifest's order — which is part of what the
host's boot gate compares. The fallback is unreachable: the guard above
is what rules it out. -/
private def rows : List Expr := (rowExprs Cas.Backend.Mcp.tools).getD []

/-- The descriptions by tool name: how the host names one tool's
sentence without repeating it. -/
private def descriptionEntries : List (String × Expr) :=
  Cas.Backend.Mcp.tools.map fun t => (t.name, .str t.description)

/-! ## The module -/

/-- The declared types. A raw block: these are TypeScript type
declarations, not expressions, and the fragment the printer carries is
deliberately expression-only. -/
private def typeBlock : String :=
  "/** A canonical schema code in the revision-0 tagged projection —\n" ++
  " * exactly the fragment the served codes inhabit. It is a TYPE, not\n" ++
  " * a decoder: the host's boot gate compares codes through the\n" ++
  " * canonical printer and never reads one, so a manifest carrying a\n" ++
  " * code outside this union still compares exactly. */\n" ++
  "export type McpToolCode =\n" ++
  "  | { readonly _tag: \"Null\" | \"Boolean\" | \"Integer\" | \"String\" }\n" ++
  "  | { readonly _tag: \"Array\"; readonly item: McpToolCode }\n" ++
  "  | { readonly _tag: \"Struct\"; readonly fields: McpToolCodeFields }\n" ++
  "\n" ++
  "/** A struct code's fields: the name-keyed record `fieldsToJson`\n" ++
  " * builds, each entry an optionality flag beside the field's own\n" ++
  " * code. */\n" ++
  "export interface McpToolCodeFields {\n" ++
  "  readonly [name: string]: McpToolCodeField\n" ++
  "}\n" ++
  "\n" ++
  "/** One entry of that record. */\n" ++
  "export interface McpToolCodeField {\n" ++
  "  readonly optional: boolean\n" ++
  "  readonly schema: McpToolCode\n" ++
  "}\n" ++
  "\n" ++
  "/** One row of the tool table: a name, what the tool says about\n" ++
  " * itself, and the two canonical schema codes. */\n" ++
  "export interface McpToolRow {\n" ++
  "  readonly name: string\n" ++
  "  readonly description: string\n" ++
  "  readonly params: McpToolCode\n" ++
  "  readonly result: McpToolCode\n" ++
  "}"

private def module : Module where
  header := [
    "GENERATED — do not edit. THE MCP TOOL TABLE, as data: the rows",
    "`Cas.Backend.Mcp.tools` carries — name, self-description, and the",
    "canonical schema codes of params and result — emitted from",
    "`library/cas/Cas/Backend/Mcp.lean` by `lake exe mcpspec`;",
    "regeneration is byte-identity-gated (`--check`, wired into",
    "`check:cas`). `mcp/cas-tools.json` is the same rows'",
    "language-neutral rendering, from the same list in the same order.",
    "",
    "`bin/mcp/tools.ts` serves this table and `bin/mcp/manifest.ts`",
    "gates it at boot against the emitted JSON. That gate now compares",
    "two projections of ONE value, so it is trivially green and stays",
    "as defence in depth: a red one means the two renderings in",
    "`tools/EmitMcp.lean` have forked, never that a hand mirror drifted."
  ]
  imports := []
  decls := [
    .raw typeBlock,
    .const {
      name := "McpToolCodes",
      type := some "ReadonlyArray<McpToolRow>",
      doc := ["Every tool the estate serves, in the manifest's order —",
        "which is part of what the boot gate compares."],
      value := .arr rows },
    .const {
      name := "McpToolDescriptions",
      doc := ["What each tool says about itself, by tool name. A tool",
        "teaches by use, and the sentence is the estate's, not the",
        "host's."],
      value := .objectML descriptionEntries }
  ]

def rendered : String := Render.module house0 module

/-- Where the mirror module lives in the effects package — the lane's
own knowledge of its artifact, so no caller carries the path. -/
def mirrorTarget : System.FilePath :=
  "../effects/src/cas/generated/McpToolCodes.ts"

def fixtures : IO (List Gate.Fixture) :=
  let tools := s!"{Cas.Backend.Mcp.tools.length} tools"
  return [
    ⟨outPath, Cas.Backend.Mcp.document, tools⟩,
    ⟨mirrorTarget, rendered, s!"{tools}, the TypeScript tool table"⟩]

end EmitMcpMain

def main := Gate.main "lake exe mcpspec" EmitMcpMain.fixtures
