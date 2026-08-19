/-
`GoPrinter`: one deterministic total fold from `GoAst` to the bytes
`gofmt` writes.

The layout is not a preference. `go/kmconform/tables_generated.go` is a
`gofmt` FIXED POINT — `format.Source(src) == src` — so the printer's
whole obligation is to reproduce `gofmt` over the thirty node types of
the census, which is strictly smaller than reproducing `gofmt`.

The algorithm is measured, not guessed. `go/printer` in `RawFormat`
emits the node layout with `\t` cell separators and no alignment at
all; piping that text through `text/tabwriter` with `go/printer`'s own
five parameters —

    minwidth 0, tabwidth 8, padding 1, padchar ' ',
    mode DiscardEmptyColumns | TabIndent

— reproduces the committed bytes exactly. Both halves are here: `lines`
is the `RawFormat` half, `tabwrite` is the `tabwriter` half.

The elastic pass is NOT optional. It decides 155 of the file's 694
lines, so a printer that emits the node layout and stops is wrong on
22% of the file and right everywhere a naive reading would look.

Two measured simplifications, each stated because it is a claim about
bytes rather than a convenience:

  * `go/printer` emits `\v` for an alignment cell and `\t` for an
    indentation column, and its own trimmer folds `\v` into `\t` on the
    way out. `DiscardEmptyColumns` only discards a column whose cells
    are ALL empty AND all `\v`-terminated, so over an input whose cells
    are all `\t` the flag can never fire. Measured over the committed
    file: the `tabwriter` output with the flag and without it are the
    same bytes, and both are the committed file. This printer therefore
    emits one separator, `\t`, and its `tabwriter` computes
    `discardable` as `go`'s does and always finds it false.

  * `go/printer` emits `\f` where a column block must be broken, and
    the trimmer folds `\f` into `\n`. Measured over the committed file:
    the trimmed text — every `\f` already a `\n` — re-tabwrites to the
    committed bytes, because every block this file wants broken is
    already broken by a line with too few cells. The intermediate here
    carries `\n` and `\t` and nothing else.
-/
import Unity.GoAst

namespace Unity.GoPrinter

open Unity.GoAst

/-! ## Line assembly

A rendered fragment is a list of lines. Line 0 CONTINUES the caller's
line and carries no indentation of its own; every later line carries
its full indentation. `splice` is the only way two fragments meet, so
a multi-line node in tail position — which is the only position the
census puts one in — composes without a special case. -/

/-- The tab indentation of a nesting depth. -/
def indentOf (depth : Nat) : String :=
  String.ofList (List.replicate depth '\t')

/-- Continue the last line of the left fragment with the first line of
    the right one. -/
def splice : List String -> List String -> List String
  | [], right => right
  | [last], right =>
      match right with
      | [] => [last]
      | first :: rest => (last ++ first) :: rest
  | line :: rest, right => line :: splice rest right

/-- Continue a fragment with literal text. -/
def spliceText (lines : List String) (text : String) : List String :=
  splice lines [text]

/-- Whether a fragment is one line. -/
def isOneLine (lines : List String) : Bool := lines.length == 1

/-- The single line of a one-line fragment, or the whole fragment run
    together. Used only for measurement. -/
def flatten (lines : List String) : String := String.join lines

/-! ## Expressions

Every rule below is `go/printer`'s, at the shapes the census carries:
a call's arguments and a positional literal's elements are separated
by `, `; a binary operator is surrounded by blanks (every operator in
the census sits at a precedence below the cutoff `go/printer` computes
at depth one, so the blank is unconditional); a selector, an index and
an array type carry no spacing at all. -/

mutual

/-- The lines an expression spells. -/
def exprLines (depth : Nat) : Expr -> List String
  | .ident name => [name]
  | .lit _ text => [text]
  | .selector receiver field =>
      spliceText (exprLines depth receiver) ("." ++ field)
  | .index collection subscript =>
      spliceText
        (splice (spliceText (exprLines depth collection) "[")
          (exprLines depth subscript)) "]"
  | .call callee arguments =>
      spliceText
        (splice (spliceText (exprLines depth callee) "(")
          (exprSeries depth arguments)) ")"
  | .binary op left right =>
      splice (spliceText (exprLines depth left) (" " ++ op.spelling ++ " "))
        (exprLines depth right)
  | .unary op operand =>
      splice [op.spelling] (exprLines depth operand)
  | .array length element =>
      splice [match length with | .slice => "[]" | .ellipsis => "[...]"]
        (exprLines depth element)
  | .structType layout fields =>
      match layout with
      | .inline =>
          if fields.isEmpty then ["struct{}"]
          else spliceText (splice ["struct{ "] (fieldSeries fields)) " }"
      | .perLine =>
          ("struct {" :: fieldColumn (depth + 1) fields) ++ [indentOf depth ++ "}"]
  | .composite elementType layout elements =>
      let head :=
        match elementType with
        | none => [""]
        | some typeExpr => exprLines depth typeExpr
      match layout with
      | .inline =>
          spliceText
            (splice (spliceText head "{") (elementSeries depth elements)) "}"
      | .perLine =>
          (spliceText head "{" ++
            elementColumn (depth + 1) (1 < elements.length) elements) ++
            [indentOf depth ++ "}"]

/-- A comma-separated series of expressions on one line. -/
def exprSeries (depth : Nat) : List Expr -> List String
  | [] => [""]
  | [single] => exprLines depth single
  | head :: rest =>
      splice (spliceText (exprLines depth head) ", ") (exprSeries depth rest)

/-- One element of a composite literal. `cell` is set when the element
    stands in a one-element-per-line list of more than one element and
    is a key-value pair that fits on one line: exactly then
    `go/printer` writes the colon followed by an ALIGNMENT CELL rather
    than a blank, so consecutive entries align. -/
def elementLines (depth : Nat) (cell : Bool) : Element -> List String
  | .positional value => exprLines depth value
  | .keyed key value =>
      let rendered := exprLines depth value
      let separator := if cell && isOneLine rendered then "\t" else " "
      splice [key ++ ":" ++ separator] rendered

/-- A comma-separated series of elements on one line. -/
def elementSeries (depth : Nat) : List Element -> List String
  | [] => [""]
  | [single] => elementLines depth false single
  | head :: rest =>
      splice (spliceText (elementLines depth false head) ", ")
        (elementSeries depth rest)

/-- One element per line, each indented and comma-terminated. -/
def elementColumn (depth : Nat) (cell : Bool) : List Element -> List String
  | [] => []
  | head :: rest =>
      (spliceText (splice [indentOf depth] (elementLines depth cell head)) ",") ++
        elementColumn depth cell rest

/-- One field's names and type, on one line. -/
def fieldLines (separator : String) : Field -> List String
  | .field names typeExpr =>
      if names.isEmpty then exprLines 0 typeExpr
      else splice [String.intercalate ", " names ++ separator] (exprLines 0 typeExpr)

/-- A comma-separated series of fields on one line. -/
def fieldSeries : List Field -> List String
  | [] => [""]
  | [single] => fieldLines " " single
  | head :: rest =>
      splice (spliceText (fieldLines " " head) ", ") (fieldSeries rest)

/-- One field per line, each indented, the type in an alignment cell. -/
def fieldColumn (depth : Nat) : List Field -> List String
  | [] => []
  | head :: rest =>
      (splice [indentOf depth] (fieldLines "\t" head)) ++ fieldColumn depth rest

end

/-- The one-line spelling of an expression, for the places a signature
    or a header is measured. -/
def exprText (expression : Expr) : String := flatten (exprLines 0 expression)

/-! ## Statements

Statement lines carry their own indentation from the first line, which
is what makes a block a plain concatenation. `go/printer` puts every
statement of a block on its own line and indents by one; the case
clauses of a switch are indented by ZERO relative to the switch, which
is why the switch arm passes `depth` rather than `depth + 1`. -/

mutual

/-- The lines a statement spells, fully indented. -/
def stmtLines (depth : Nat) : Stmt -> List String
  | .ret results =>
      if results.isEmpty then [indentOf depth ++ "return"]
      else splice [indentOf depth ++ "return "] (exprSeries depth results)
  | .assign tok targets values =>
      splice
        (spliceText (splice [indentOf depth] (exprSeries depth targets))
          (" " ++ tok.spelling ++ " "))
        (exprSeries depth values)
  | .ifStmt condition body =>
      (spliceText (splice [indentOf depth ++ "if "] (exprLines depth condition))
        " {") ++ stmtSeries (depth + 1) body ++ [indentOf depth ++ "}"]
  | .rangeStmt key value tok subject body =>
      let binders := match value with
        | none => key
        | some second => key ++ ", " ++ second
      (spliceText
        (splice [indentOf depth ++ "for " ++ binders ++ " " ++ tok.spelling ++ " range "]
          (exprLines depth subject)) " {") ++
        stmtSeries (depth + 1) body ++ [indentOf depth ++ "}"]
  | .switchStmt clauses =>
      (indentOf depth ++ "switch {") :: clauseSeries depth clauses ++
        [indentOf depth ++ "}"]

/-- The lines a statement list spells. -/
def stmtSeries (depth : Nat) : List Stmt -> List String
  | [] => []
  | head :: rest => stmtLines depth head ++ stmtSeries depth rest

/-- The lines one case clause spells. -/
def clauseLines (depth : Nat) : Clause -> List String
  | .clause guards body =>
      let header :=
        if guards.isEmpty then [indentOf depth ++ "default:"]
        else spliceText (splice [indentOf depth ++ "case "] (exprSeries depth guards)) ":"
      header ++ stmtSeries (depth + 1) body

/-- The lines a clause list spells. -/
def clauseSeries (depth : Nat) : List Clause -> List String
  | [] => []
  | head :: rest => clauseLines depth head ++ clauseSeries depth rest

end

/-! ## The one-line function body

`go/printer` collapses a function body onto its signature line exactly
when the header and the body together fit in 100 bytes, where a
statement that does not spell on ONE cell-free line counts as
oversized and a body of more than five statements is oversized
outright. The rule is `go/printer`'s `funcBody` and `bodySize`, and it
is DERIVED here rather than declared, so a widened corpus name that
pushed a constructor past the limit would move the layout the way
`gofmt` moves it. -/

/-- `go/printer`'s `maxSize` for a one-line body. -/
def oneLineLimit : Nat := 100

/-- `go/printer`'s `nodeSize` over one statement: its byte length when
    it spells on a single line with no alignment cell, and one past the
    limit otherwise. -/
def statementSize (statement : Stmt) : Nat :=
  match stmtLines 0 statement with
  | [line] =>
      if line.toList.any (fun character => character == '\t') then oneLineLimit + 1
      else line.utf8ByteSize
  | _ => oneLineLimit + 1

/-- `go/printer`'s `bodySize`: the statements plus a semicolon and a
    blank between neighbours, or one past the limit for a body of more
    than five statements. -/
def bodySize (body : List Stmt) : Nat :=
  if 5 < body.length then oneLineLimit + 1
  else
    body.foldl (fun total statement => total + statementSize statement) 0 +
      2 * (body.length - 1)

/-! ## Declarations -/

/-- A function signature: the parameter list, then the results — bare
    when there is exactly one anonymous result, parenthesized
    otherwise. -/
def signatureText (signature : Signature) : String :=
  let parameters :=
    "(" ++ flatten (fieldSeries signature.parameters) ++ ")"
  match signature.results with
  | [] => parameters
  | [.field [] typeExpr] => parameters ++ " " ++ exprText typeExpr
  | results => parameters ++ " (" ++ flatten (fieldSeries results) ++ ")"

/-- The header of a function declaration: everything up to the body. -/
def funcHeader (declaration : FuncDecl) : String :=
  let receiver :=
    match declaration.receiver with
    | none => ""
    | some field => "(" ++ flatten (fieldLines " " field) ++ ") "
  "func " ++ receiver ++ declaration.name ++ signatureText declaration.signature

/-- The lines a function declaration spells. -/
def funcLines (declaration : FuncDecl) : List String :=
  let header := funcHeader declaration
  if header.utf8ByteSize + bodySize declaration.body ≤ oneLineLimit then
    let inner :=
      String.intercalate "; "
        (declaration.body.map fun statement => flatten (stmtLines 0 statement))
    if declaration.body.isEmpty then [header ++ "\t{}"]
    else [header ++ "\t{ " ++ inner ++ " }"]
  else
    (header ++ " {") :: stmtSeries 1 declaration.body ++ ["}"]

/-- `go/printer`'s `keepTypeColumn`: inside a run of consecutive value
    specs that all carry values, if ANY spec of the run names a type
    then every spec of the run prints the type column, empty where the
    spec has no type. Without it `const ( a int = 1; b = 2 )` would put
    `= 2` in the type column. -/
def keepTypeColumn (specs : List Spec) : List Bool :=
  let hasValues : Spec -> Bool
    | .valueSpec _ _ values => !values.isEmpty
    | _ => false
  let hasType : Spec -> Bool
    | .valueSpec _ typeExpr _ => typeExpr.isSome
    | _ => false
  let rec walk : List Spec -> List Spec -> List Bool
    | [], run => run.map fun _ => run.any hasType
    | spec :: rest, run =>
        if hasValues spec then walk rest (run ++ [spec])
        else (run.map fun _ => run.any hasType) ++ [false] ++ walk rest []
  walk specs []

/-- One spec of a single-spec declaration, where `go/printer` separates
    the parts with blanks rather than with alignment cells. -/
def specSolo (depth : Nat) : Spec -> List String
  | .importSpec path => [path]
  | .typeSpec name typeExpr => splice [name ++ " "] (exprLines depth typeExpr)
  | .valueSpec names typeExpr values =>
      let head := [String.intercalate ", " names]
      let withType :=
        match typeExpr with
        | none => head
        | some expression => splice (spliceText head " ") (exprLines depth expression)
      if values.isEmpty then withType
      else splice (spliceText withType " = ") (exprSeries depth values)

/-- One spec of a parenthesized group, where `go/printer` separates the
    parts with ALIGNMENT CELLS so that consecutive specs align. -/
def specGrouped (depth : Nat) (keepType : Bool) : Spec -> List String
  | .importSpec path => [indentOf depth ++ path]
  | .typeSpec name typeExpr =>
      splice [indentOf depth ++ name ++ "\t"] (exprLines depth typeExpr)
  | .valueSpec names typeExpr values =>
      let head := [indentOf depth ++ String.intercalate ", " names]
      let withType :=
        match typeExpr with
        | none => if keepType then spliceText head "\t" else head
        | some expression => splice (spliceText head "\t") (exprLines depth expression)
      if values.isEmpty then withType
      else splice (spliceText withType "\t= ") (exprSeries depth values)

/-- The specs of a parenthesized group, one per line. -/
def specColumn (depth : Nat) : List Spec -> List Bool -> List String
  | [], _ => []
  | spec :: rest, [] => specGrouped depth false spec ++ specColumn depth rest []
  | spec :: rest, keep :: keeps =>
      specGrouped depth keep spec ++ specColumn depth rest keeps

/-- The lines a declaration spells. A `GenDecl` is parenthesized
    exactly when it does not carry exactly one spec, which is
    `go/printer`'s own test once the source parentheses a generated
    tree does not have are gone. -/
def declLines : Decl -> List String
  | .funcDecl declaration => funcLines declaration
  | .genDecl tok specs =>
      match specs with
      | [single] => splice [tok.keyword ++ " "] (specSolo 0 single)
      | _ =>
          (tok.keyword ++ " (") :: specColumn 1 specs (keepTypeColumn specs) ++ [")"]

/-! ## The file

Blank lines between declarations are DERIVED, not declared.
`go/printer` separates two neighbours by a blank line when the
declaration token changed or when the second carries a doc comment,
and by nothing otherwise — which is exactly why the twelve brand
constructors sit shoulder to shoulder while the twelve brand types,
each carrying its `//foldlab:brand` directive, do not.

A floating section comment resets the comparison: the declaration
after it is always separated by a blank line, and so is the section
itself from whatever came before. -/

/-- The lines of a comment group. -/
def commentLines (group : CommentGroup) : List String :=
  group.lines.map fun line => "//" ++ line.text

/-- The body of a file: every top-level item with the blank lines
    `go/printer` puts between them. -/
def bodyLines : Option DeclSort -> List TopLevel -> List String
  | _, [] => []
  | _, .section comment :: rest =>
      "" :: commentLines comment ++ bodyLines none rest
  | previous, .declaration doc declaration :: rest =>
      let sort := declaration.sort
      let separated := previous != some sort || doc.isSome
      let leading := if separated then [""] else []
      let documentation := match doc with
        | none => []
        | some group => commentLines group
      leading ++ documentation ++ declLines declaration ++
        bodyLines (some sort) rest

/-- The `RawFormat` half: the file as cell-separated lines, before the
    elastic pass. -/
def lines (file : File) : List String :=
  commentLines file.banner ++ [""] ++ ["package " ++ file.packageName] ++
    bodyLines none file.body

/-! ## The elastic pass

`text/tabwriter` at `go/printer`'s five parameters. A line is a
sequence of cells separated by `\t`; the text after the last separator
is the line's TRAILING cell and never joins a column. A column block is
a maximal run of consecutive lines that all carry a cell in that
column, and every cell of a block is padded to the block's widest cell
plus the padding of one. Leading empty cells — the indentation columns
— are padded with tabs rather than the pad character, which is what
`TabIndent` means and what makes the emission's indentation a tab.

`DiscardEmptyColumns` is implemented as `go` implements it and, over an
input whose separators are all hard tabs, never fires: `discardable`
requires every cell of the block to be empty AND soft, and no cell here
is soft. -/

/-- `text/tabwriter`'s minwidth, at `go/printer`'s setting. -/
def minWidth : Nat := 0

/-- `text/tabwriter`'s tabwidth, at `go/printer`'s setting. -/
def tabWidth : Nat := 8

/-- `text/tabwriter`'s padding, at `go/printer`'s setting. -/
def padding : Nat := 1

/-- The larger of two naturals. -/
def larger (left right : Nat) : Nat := if left < right then right else left

/-- The cells of one line. The text after the last separator is the
    trailing cell. -/
def cellsOf (line : String) : List String :=
  GoAst.splitOn (fun character => character == '\t') line

/-- Whether a line carries a PADDED cell at this column: the trailing
    cell is not padded, so a cell exists here only if another follows. -/
def hasCell (column : Nat) (cells : List String) : Bool :=
  column + 1 < cells.length

/-- The width one cell contributes to its column. -/
def cellWidth (column : Nat) (cells : List String) : Nat :=
  (cells.getD column "").length

/-- Left to right: the running widest cell of the current block. -/
def runningWidest (column : Nat) : List (List String) -> Option Nat -> List (Option Nat)
  | [], _ => []
  | cells :: rest, carried =>
      if hasCell column cells then
        let width := larger minWidth (cellWidth column cells + padding)
        let best := match carried with
          | none => width
          | some previous => larger previous width
        some best :: runningWidest column rest (some best)
      else none :: runningWidest column rest none

/-- Right to left: hand every cell of a block the block's widest. -/
def settleWidest : List (Option Nat) -> Option Nat -> List (Option Nat)
  | [], _ => []
  | entry :: rest, carried =>
      match entry with
      | none => none :: settleWidest rest none
      | some width =>
          let best := match carried with
            | none => width
            | some following => larger following width
          some best :: settleWidest rest (some best)

/-- The width of one column for every line, absent where the line
    carries no padded cell there. -/
def columnWidths (column : Nat) (lines : List (List String)) : List (Option Nat) :=
  (settleWidest (runningWidest column lines none).reverse none).reverse

/-- Every line's own column widths, in column order. -/
def lineWidths : Nat -> List (List String) -> List (List Nat)
  | 0, lines => lines.map fun _ => []
  | count + 1, lines =>
      (lineWidths count lines |>.zip (columnWidths count lines)).map fun pair =>
        match pair.2 with
        | some width => pair.1 ++ [width]
        | none => pair.1

/-- The widest line, in cells. -/
def widestLine (lines : List (List String)) : Nat :=
  lines.foldl (fun best cells => larger best cells.length) 0

/-- Tab padding for a leading empty cell: the column width rounded up
    to a whole number of tab stops, written as that many tabs. -/
def tabPadding (width : Nat) : String :=
  String.ofList (List.replicate ((width + tabWidth - 1) / tabWidth) '\t')

/-- Space padding for a cell that carries text. -/
def spacePadding (width : Nat) (text : Nat) : String :=
  String.ofList (List.replicate (width - text) ' ')

/-- Write one line's cells at their settled widths. `useTabs` holds
    while the cells seen so far are all empty, which is exactly the
    indentation run. -/
def padCells (useTabs : Bool) : List String -> List Nat -> String
  | [], _ => ""
  | [trailing], _ => trailing
  | cell :: rest, [] => cell ++ padCells false rest []
  | cell :: rest, width :: widths =>
      let empty := cell.length == 0
      let filled :=
        if useTabs && empty then cell ++ tabPadding width
        else cell ++ spacePadding width cell.length
      filled ++ padCells (useTabs && empty) rest widths

/-- The elastic pass over a list of cell-separated lines. -/
def tabwrite (rawLines : List String) : String :=
  let cellLines := rawLines.map cellsOf
  let widths := lineWidths (widestLine cellLines) cellLines
  String.join ((cellLines.zip widths).map fun pair =>
    padCells true pair.1 pair.2 ++ "\n")

/-- The emission: the node layout, then the elastic pass. -/
def render (file : File) : String := tabwrite (lines file)

end Unity.GoPrinter
