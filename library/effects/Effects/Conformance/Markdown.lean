/-!
# Typed Markdown for the human surfaces

The conformance workflow's human-facing outputs — the ledger, briefings, and
manifest family headers — are gate surfaces: byte-compared, and required to
render well-formed Markdown for every admitted input. This module is the
owned typed emitter behind them (route (b), ruled 2026-08-26; pattern source
credited in `research/lean4-markdown-prior-art.md`).

Design rules:

- **Escaping is the default path.** Inline text is escaped by the declared
  policy below; there is no raw-text constructor. Code spans and fenced
  blocks pick delimiters that cannot collide with their content up to the
  documented limits.
- **Tables are arity-checked**: headers are `Vector String n` and rows are
  `Vector Cell n`, so a row with a missing column does not elaborate.
- **`ToMarkdown` is the projection typeclass**: every human surface is
  `render ∘ ToMarkdown.blocks` over typed values; no surface is assembled by
  ad-hoc string concatenation.

Escape policy (deterministic, conservative): the characters
`\` `` ` `` `*` `_` `~` `|` `[` `]` `<` `>` `#` are backslash-escaped
everywhere in inline text, and newlines in inline context become spaces.
CommonMark honors backslash escapes of ASCII punctuation in all inline
positions, so over-escaping is rendering-safe; the policy trades minimality
for the guarantee that table geometry and emphasis can never be activated by
sentence prose. Escape-soundness as a `Reflected` law is a candidate for a
later slice.
-/

namespace Effects.Conformance.Markdown

/-- Inline content. There is deliberately no raw-text constructor: `text`,
`bold`, `italic`, and table cells all pass through the escape policy at
render time. `code` uses delimiter selection instead of escaping. -/
inductive Inline where
  | text (s : String)
  | bold (s : String)
  | italic (s : String)
  | code (s : String)
  | link (label : String) (url : String)

/-- One table cell: escaped inline content. -/
structure Cell where
  content : List Inline

/-- An arity-checked table: a row with the wrong number of columns does not
elaborate. -/
structure Table (n : Nat) where
  headers : Vector String n
  rows : List (Vector Cell n)

/-- Block-level content. Bullets are inline lists (flat; nesting arrives if a
surface ever needs it). -/
inductive Block where
  | h1 (s : String)
  | h2 (s : String)
  | h3 (s : String)
  | p (items : List Inline)
  | ul (items : List (List Inline))
  | pre (lang : Option String) (content : String)
  | rule
  | table (t : Table n)

/-- The projection typeclass: every human surface is `render ∘ blocks` over
typed values. -/
class ToMarkdown (α : Type) where
  blocks : α → List Block

/-- Backslash-escape the declared character set; newlines become spaces. -/
def escape (s : String) : String :=
  String.join <| s.toList.map fun c =>
    if c = '\n' then " "
    else if c ∈ ['\\', '`', '*', '_', '~', '|', '[', ']', '<', '>', '#'] then
      String.singleton '\\' ++ String.singleton c
    else String.singleton c

/-- Render a code span. Content containing a single backtick gets
double-backtick delimiters; content containing a double backtick run is
outside the documented limit and renders with the double form regardless. -/
def renderCode (s : String) : String :=
  if s.toList.contains '`' then "`` " ++ s ++ " ``" else "`" ++ s ++ "`"

def renderInline : Inline → String
  | .text s => escape s
  | .bold s => "**" ++ escape s ++ "**"
  | .italic s => "*" ++ escape s ++ "*"
  | .code s => renderCode s
  | .link label url => "[" ++ escape label ++ "](" ++ url ++ ")"

def renderInlines (items : List Inline) : String :=
  String.join (items.map renderInline)

def renderCell (c : Cell) : String :=
  renderInlines c.content

def renderHeaderRow {n : Nat} (headers : Vector String n) : String :=
  let cells := headers.toList.map escape
  "| " ++ String.intercalate " | " cells ++ " |\n| "
    ++ String.intercalate " | " (headers.toList.map fun _ => "---") ++ " |"

def renderRow {n : Nat} (row : Vector Cell n) : String :=
  "| " ++ String.intercalate " | " (row.toList.map renderCell) ++ " |"

def renderTable {n : Nat} (t : Table n) : String :=
  String.intercalate "\n" (renderHeaderRow t.headers :: t.rows.map renderRow)

/-- Pick a fence that cannot collide with the content: four backticks when
the content itself contains a triple-backtick run, three otherwise. -/
def fenceFor (content : String) : String :=
  if (content.splitOn "```").length > 1 then "````" else "```"

def renderBlock : Block → String
  | .h1 s => "# " ++ escape s
  | .h2 s => "## " ++ escape s
  | .h3 s => "### " ++ escape s
  | .p items => renderInlines items
  | .ul items => String.intercalate "\n" (items.map fun i => "- " ++ renderInlines i)
  | .pre lang content =>
    let fence := fenceFor content
    fence ++ (match lang with | some l => l | none => "") ++ "\n" ++ content ++ "\n" ++ fence
  | .rule => "---"
  | .table t => renderTable t

/-- Render a document: blocks joined by blank lines, trailing newline. -/
def render (bs : List Block) : String :=
  String.intercalate "\n\n" (bs.map renderBlock) ++ "\n"

/-- Render any `ToMarkdown` value. -/
def renderOf {α : Type} [ToMarkdown α] (a : α) : String :=
  render (ToMarkdown.blocks a)

#guard escape "cursor | trace" == "cursor \\| trace"
#guard escape "never `live`" == "never \\`live\\`"
#guard renderInline (.text "a*b") == "a\\*b"
#guard renderCode "reduce s q" == "`reduce s q`"
#guard render [.h2 "RPL-003", .p [.text "exactly one"]] == "## RPL-003\n\nexactly one\n"

end Effects.Conformance.Markdown
