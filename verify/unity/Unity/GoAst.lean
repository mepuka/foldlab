/-
`GoAst`: the Go target grammar, at the census of the one file the
estate generates.

This is not a model of `go/ast`. It is the CLOSED vocabulary the
committed emission `go/kmconform/tables_generated.go` actually spells,
measured with `go/parser` over that file: thirty distinct `go/ast`
node types and no more. A kind outside the census is UNREPRESENTABLE
here — there is no `MapType`, no `InterfaceType`, no `FuncLit`, no
`ParenExpr`, no type parameter list, no `Bad*` — because a target
grammar that can spell what the target does not contain has stopped
being a measurement and become a guess.

The discriminators are closed the same way. `GenDecl.Tok` is the four
tokens the file carries, `BasicLit.Kind` the two, `BinaryExpr.Op` the
six, `UnaryExpr.Op` the one, `AssignStmt.Tok` the two, and an array
length is either absent (`[]T`) or the ellipsis (`[...]T`) — never a
constant, because the file never writes `[N]T`.

Every constructor below names the `go/ast` node it stands for, so the
census and this file can be read against each other line by line.
Nothing here prints: layout is `Unity/GoPrinter.lean`'s single fold,
and the values are `Unity/GoTables.lean`'s.

TWO layout facts are DECLARED rather than derived, and the reason is
the same for both: `go/printer` reads them off SOURCE POSITIONS, which
a generated tree does not have. Whether a braced list is written on one
line or one element per line is such a fact (`CompositeLit`,
`StructType`), so it rides on the node as `BraceLayout`. Everything
else `go/printer` decides — the blank lines between declarations, the
type column of a const group, whether a function body collapses onto
its signature line — is a function of the tree and is DERIVED by the
printer rather than declared here.
-/

namespace Unity.GoAst

/-! ## The closed discriminators -/

/-- `go/token`: the declaration tokens `GenDecl.Tok` takes. The census
    measures `type` 25, `var` 10, `const` 5, `import` 1. -/
inductive DeclToken where
  | importTok
  | constTok
  | varTok
  | typeTok
deriving Repr, DecidableEq

/-- The keyword a declaration token is spelled with. -/
def DeclToken.keyword : DeclToken -> String
  | .importTok => "import"
  | .constTok => "const"
  | .varTok => "var"
  | .typeTok => "type"

/-- `go/token`: the literal kinds `BasicLit.Kind` takes. The census
    measures `STRING` 214 and `INT` 128, every string interpreted and
    none raw, so there is no backquoted spelling to represent. -/
inductive LitKind where
  | intLit
  | stringLit
deriving Repr, DecidableEq

/-- `go/token`: the binary operators `BinaryExpr.Op` takes. The census
    measures `==` 7, `+` 5, `>=` 5, `!=` 2, `<` 1, `>` 1. -/
inductive BinaryOp where
  | eq
  | ne
  | lt
  | gt
  | ge
  | add
deriving Repr, DecidableEq

/-- The spelling of a binary operator. -/
def BinaryOp.spelling : BinaryOp -> String
  | .eq => "=="
  | .ne => "!="
  | .lt => "<"
  | .gt => ">"
  | .ge => ">="
  | .add => "+"

/-- `go/token`: the unary operators `UnaryExpr.Op` takes. The census
    measures one, the negation in `return -1, nil`. -/
inductive UnaryOp where
  | neg
deriving Repr, DecidableEq

/-- The spelling of a unary operator. -/
def UnaryOp.spelling : UnaryOp -> String
  | .neg => "-"

/-- `go/token`: the assignment tokens `AssignStmt.Tok` takes. The
    census measures `:=` 1 and `=` 1. -/
inductive AssignToken where
  | define
  | assign
deriving Repr, DecidableEq

/-- The spelling of an assignment token. -/
def AssignToken.spelling : AssignToken -> String
  | .define => ":="
  | .assign => "="

/-- The length position of a `go/ast.ArrayType`. The census measures
    `[]T` 25 times and `[...]T` 3 times and `[N]T` never, so the only
    inhabitant of the length position is `go/ast.Ellipsis`. -/
inductive ArrayLength where
  | slice
  | ellipsis
deriving Repr, DecidableEq

/-- Whether a braced list is written on one line or one element per
    line. DECLARED, not derived: `go/printer` reads this off the source
    positions of the opening and closing brace, and a generated tree
    carries no positions. -/
inductive BraceLayout where
  | inline
  | perLine
deriving Repr, DecidableEq

/-! ## Expressions and types

`go/ast` gives types and expressions one syntactic category and so
does this grammar: `ArrayType` and `StructType` stand beside `CallExpr`
in one inductive, exactly as they do in `go/ast.Expr`. -/

mutual

/-- A Go expression or type, at the census. -/
inductive Expr where
  /-- `go/ast.Ident` (738). -/
  | ident (name : String)
  /-- `go/ast.BasicLit` (342). The text is the SOURCE spelling: an
      interpreted string literal arrives already quoted. -/
  | lit (kind : LitKind) (text : String)
  /-- `go/ast.SelectorExpr` (24): `receiver.field`. -/
  | selector (receiver : Expr) (field : String)
  /-- `go/ast.IndexExpr` (4): `collection[subscript]`, array indexing
      and never instantiation — the census carries no generics. -/
  | index (collection : Expr) (subscript : Expr)
  /-- `go/ast.CallExpr` (34). No call in the census is variadic, so
      there is no ellipsis position here. -/
  | call (callee : Expr) (arguments : List Expr)
  /-- `go/ast.BinaryExpr` (21). -/
  | binary (op : BinaryOp) (left : Expr) (right : Expr)
  /-- `go/ast.UnaryExpr` (1). -/
  | unary (op : UnaryOp) (operand : Expr)
  /-- `go/ast.ArrayType` (28), whose length position carries
      `go/ast.Ellipsis` (3) or nothing. -/
  | array (length : ArrayLength) (element : Expr)
  /-- `go/ast.StructType` (9) over its `go/ast.FieldList`. -/
  | structType (layout : BraceLayout) (fields : List Field)
  /-- `go/ast.CompositeLit` (102). The element type is absent for the
      elided form an element of a typed list is written in. -/
  | composite (elementType : Option Expr) (layout : BraceLayout)
      (elements : List Element)
deriving Repr

/-- One element of a composite literal: a bare value, or the
    `go/ast.KeyValueExpr` (200) that names a field. -/
inductive Element where
  | positional (value : Expr)
  | keyed (key : String) (value : Expr)
deriving Repr

/-- `go/ast.Field` (101), inside a `go/ast.FieldList` (84). An empty
    name list is `go/ast`'s anonymous field, which is how a function
    result and an embedded type are written. -/
inductive Field where
  | field (names : List String) (typeExpr : Expr)
deriving Repr

end

/-- The type of a field. -/
def Field.typeOf : Field -> Expr
  | .field _ typeExpr => typeExpr

/-- The names a field binds. -/
def Field.namesOf : Field -> List String
  | .field names _ => names

/-! ## Statements

Seven statement forms, which is the whole census: no `for`, no `go`,
no `defer`, no `select`, no type switch, no label, no branch, no send.
`go/ast.BlockStmt` (53) is not a constructor of its own — every block
position in the census is a statement list, so it rides as the
`List Stmt` each form carries. -/

mutual

/-- A Go statement, at the census. -/
inductive Stmt where
  /-- `go/ast.ReturnStmt` (47). -/
  | ret (results : List Expr)
  /-- `go/ast.AssignStmt` (2). -/
  | assign (tok : AssignToken) (targets : List Expr) (values : List Expr)
  /-- `go/ast.IfStmt` (13) over its `go/ast.BlockStmt`. No census `if`
      carries an initializer or an else arm. -/
  | ifStmt (condition : Expr) (body : List Stmt)
  /-- `go/ast.RangeStmt` (6) over its `go/ast.BlockStmt`. The value
      binder is absent in the index-only form. -/
  | rangeStmt (key : String) (value : Option String) (tok : AssignToken)
      (subject : Expr) (body : List Stmt)
  /-- `go/ast.SwitchStmt` (1) over its `go/ast.BlockStmt`. The census's
      one switch is tagless, with no initializer. -/
  | switchStmt (clauses : List Clause)
deriving Repr

/-- `go/ast.CaseClause` (3). An empty guard list is `default`. -/
inductive Clause where
  | clause (guards : List Expr) (body : List Stmt)
deriving Repr

end

/-! ## Declarations -/

/-- `go/ast.FuncType` (33): the parameter and result field lists. -/
structure Signature where
  parameters : List Field
  results : List Field
deriving Repr

/-- One spec of a `go/ast.GenDecl`. -/
inductive Spec where
  /-- `go/ast.ImportSpec` (1). The path is the SOURCE spelling, quoted. -/
  | importSpec (path : String)
  /-- `go/ast.TypeSpec` (25). -/
  | typeSpec (name : String) (typeExpr : Expr)
  /-- `go/ast.ValueSpec` (48). -/
  | valueSpec (names : List String) (typeExpr : Option Expr)
      (values : List Expr)
deriving Repr

/-- `go/ast.FuncDecl` (33), of which nine carry a receiver. -/
structure FuncDecl where
  receiver : Option Field
  name : String
  signature : Signature
  body : List Stmt
deriving Repr

/-- A top-level declaration: `go/ast.GenDecl` (41) or
    `go/ast.FuncDecl` (33). -/
inductive Decl where
  | genDecl (tok : DeclToken) (specs : List Spec)
  | funcDecl (declaration : FuncDecl)
deriving Repr

/-- The sort `go/printer` compares two neighbouring declarations by
    when it decides whether a blank line separates them: the token of
    a `GenDecl`, or `func`. -/
inductive DeclSort where
  | genSort (tok : DeclToken)
  | funcSort
deriving Repr, DecidableEq

/-- The sort of a declaration. -/
def Decl.sort : Decl -> DeclSort
  | .genDecl tok _ => .genSort tok
  | .funcDecl _ => .funcSort

/-! ## Comments

`go/ast.Comment` (88) inside `go/ast.CommentGroup` (52). Every comment
in the census is a `//` line and none appears inside a function body,
which removes the hardest placement case in `go/printer` from the
target. A comment's text is what follows the `//`, so the directive
`//foldlab:brand schema` — a comment to `go/ast` and a declaration to
`go/brandlint` — carries no leading space and is not a formatting
accident. -/

/-- `go/ast.Comment`: one `//` line, carried without its marker. -/
structure Comment where
  text : String
deriving Repr

/-- `go/ast.CommentGroup`: consecutive comment lines. -/
structure CommentGroup where
  lines : List Comment
deriving Repr

/-- A top-level item: a floating comment group (the census measures
    six, the banner and the five section rules), or a declaration with
    the doc comment attached to it. -/
inductive TopLevel where
  | section (comment : CommentGroup)
  | declaration (doc : Option CommentGroup) (declaration : Decl)
deriving Repr

/-- `go/ast.File` (1). -/
structure File where
  banner : CommentGroup
  packageName : String
  body : List TopLevel
deriving Repr

/-! ## Spelling a wire name as a Go identifier

The one naming rule the emission applies to corpus data: a wire name
becomes an exported Go identifier by splitting on the three separators
and upper-casing each part. `clock-read` becomes `ClockRead`. The rule
is total over names built from those parts, and a name it renders
empty is a GENERATION FAILURE reported by the producer rather than a
mangled identifier written to disk. -/

/-- Whether a character separates the parts of a wire name. -/
def isSeparator (character : Char) : Bool :=
  character == '-' || character == '_' || character == ' '

/-- Upper-case the first character of a part and keep the rest. -/
def capitalize (part : String) : String :=
  match part.toList with
  | [] => ""
  | head :: rest => String.singleton head.toUpper ++ String.ofList rest

/-- Split a character list at every separator, KEEPING the empty parts
    a run of separators leaves behind. The tabwriter needs them: a
    line's leading empty cells are its indentation. -/
def splitParts (separator : Char -> Bool) : List Char -> List String
  | [] => [""]
  | character :: rest =>
      let parts := splitParts separator rest
      if separator character then "" :: parts
      else
        match parts with
        | [] => [String.singleton character]
        | head :: tail => (String.singleton character ++ head) :: tail

/-- Split a string at every separator. -/
def splitOn (separator : Char -> Bool) (text : String) : List String :=
  splitParts separator text.toList

/-- A wire name as an exported Go identifier. -/
def exportedIdent (wire : String) : String :=
  String.join ((splitOn isSeparator wire).map capitalize)

/-! ## Spelling a value as a Go interpreted string literal

`strconv.Quote` over the alphabet the corpus is written in. The
interchange is printable ASCII plus the line feed a docstring carries,
so exactly four bytes need an escape and everything else passes
through. A code point outside that alphabet is REPORTED rather than
escaped by some rule nobody measured: the corpus's own ASCII wall says
it cannot happen, and a quoter that quietly invented a `\u` spelling
would be the second place that rule lives. -/

/-- The Go escape one character needs, or the reason it has none. -/
def goEscape (character : Char) : Except String String :=
  let point := character.toNat
  if character == '"' then .ok "\\\""
  else if character == '\\' then .ok "\\\\"
  else if point == 0x0a then .ok "\\n"
  else if point == 0x09 then .ok "\\t"
  else if point >= 0x20 && point <= 0x7e then .ok (String.singleton character)
  else
    .error s!"goast: a corpus value carries code point {point}, which the emission has no Go escape for"

/-- Fold the escapes of a character list. -/
def goEscapes : List Char -> Except String String
  | [] => .ok ""
  | character :: rest =>
      match goEscape character, goEscapes rest with
      | .ok piece, .ok tail => .ok (piece ++ tail)
      | .error reason, _ => .error reason
      | _, .error reason => .error reason

/-- A value as a Go interpreted string literal, quotes included. -/
def goQuote (value : String) : Except String String :=
  match goEscapes value.toList with
  | .ok body => .ok ("\"" ++ body ++ "\"")
  | .error reason => .error reason

end Unity.GoAst
