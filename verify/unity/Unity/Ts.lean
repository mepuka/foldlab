/-
The TypeScript target grammar, embedded, and the one printer over it.

This file is the target's own vocabulary written down as data, at exactly the
node set the emitted surfaces use — measured with the TypeScript compiler over
the committed generated files rather than guessed from one of them. Nothing
here reads a corpus, walks an environment, or knows what a kernel is. A
generator upstream decides WHAT to say; this file decides how the target spells
it, and it decides that once.

## The measured spine, and which constructor carries each row

Forty-five structural kinds are reachable across the five generated surfaces.
Each is carried here; where the target spells one construct with several nodes,
one constructor carries the group, and the group is named. The schema surface
added no kind to that census — it added LAYOUTS, which is the axis a census of
kinds cannot measure and the axis every reopening of this file has been on.

  module frame   ImportDeclaration + ImportClause + NamedImports +
                 ImportSpecifier -> `TsStmt.importNamed`;
                 NamespaceImport -> `TsStmt.importNamespace`
  declarations   VariableStatement + VariableDeclarationList +
                 VariableDeclaration -> `TsStmt.constant` (the target writes
                 one exported declarator and no other form, with or without a
                 type annotation on it);
                 TypeAliasDeclaration -> `TsStmt.typeAlias`;
                 InterfaceDeclaration -> `TsStmt.interfaceDecl`
  members        PropertyAssignment -> an object property, beside or under its
                 key (`.offset` writes it under);
                 PropertySignature -> `Member.property`;
                 IndexSignature -> `Member.index`
  expressions    Identifier `.ident`, StringLiteral `.str`, BigIntLiteral
                 `.bigint`, NumericLiteral `.nat`, ObjectLiteralExpression
                 `.object`, ArrayLiteralExpression `.array`, CallExpression
                 `.call` and `.apply` (the same kind at its two renderings: the
                 arguments broken one per line, or the last one written flush
                 against the parentheses), PropertyAccessExpression `.field`,
                 ElementAccessExpression `.element`, BinaryExpression (with its
                 PlusToken) `.concat`, AsExpression `.asConst`,
                 SatisfiesExpression `.satisfies`, ArrowFunction `.arrow`,
                 Parameter -> a binder of `.arrow`
  types          TypeReference `.reference`, LiteralType `.literal`, UnionType
                 `.union`, IntersectionType `.intersection`, TypeLiteral
                 `.record`, MappedType `.mapped`, IndexedAccessType `.indexed`,
                 ParenthesizedType `.parens`, TupleType `.tuple`, TypeOperator
                 `.operator`, FunctionType `.function`, TypeQuery `.query`,
                 QualifiedName `.qualified`, TypeParameter -> `TypeParameter`,
                 and TemplateLiteralType + TemplateHead +
                 TemplateLiteralTypeSpan + TemplateTail -> `.template`

Two rules are worth stating because they are the ones a second printer would
re-invent and get subtly wrong.

LAYOUT IS DATA. The target admits several renderings of one construct — an
object on one line or one property per line, a type alias whose value follows
the equals sign or sits on the next line — and which one a site uses is a fact
about that site, not a width this printer may recompute. Some renderers choose
by measuring the flat rendering against a column budget and some break with no
test at all, so the choice belongs upstream: a container and an alias carry
their layout, the generator sets it, and `flatWidth` is here for a generator
that has to reproduce a width test. A printer that guessed from a budget would
agree with the surface by coincidence and part company the first time a name
grew.

WRAPPING HAPPENS IN ONE PLACE. A sentence rendered as a doc comment is
greedy-wrapped over single spaces at a pinned column, counting the indent and
the comment gutter. That is the only place this printer reflows anything: every
other string is reproduced as it was handed over — including its edge spaces,
which a downstream branch reads, and including the em dash, which this target
carries VERBATIM. The ASCII fold of the prose register is a rule of that
register and has no business here.
-/

namespace Unity.Ts

/-! ## Layout

The two renderings the target admits for a container or an alias value. -/

/-- Whether a construct is written on one line or broken across lines. -/
inductive Layout where
  | inline
  | block
deriving Repr, BEq

/-! ## Doc comments

Four policies are committed in the surfaces. Two are one-liners differing only
in whether the generator trimmed the text before handing it over, which is the
generator's act and not the printer's. The other two are greedy wraps at
different columns, and the one that governs a drafted meaning charges the
gutter against its budget. -/

/-- A wrap policy: its column, and whether each emitted row is right-trimmed. -/
structure WrapPolicy where
  column : Nat
  trimRows : Bool
deriving Repr, BEq

/-- The drafted-meaning wrap: greedy at eighty-eight columns, gutter charged. -/
def meaningWrap : WrapPolicy := { column := 88, trimRows := false }

/-- The description wrap: greedy at ninety-six columns, each row trimmed. -/
def descriptionWrap : WrapPolicy := { column := 96, trimRows := true }

/-- One run of a doc comment: rows reproduced as given, or one paragraph the
    printer wraps under a policy. -/
inductive DocBlock where
  | verbatim (rows : List String)
  | wrapped (policy : WrapPolicy) (text : String)
deriving Repr, BEq

/-- A doc comment: its layout and its runs. -/
structure Doc where
  layout : Layout
  blocks : List DocBlock
deriving Repr, BEq

/-- A one-line doc comment, reproduced exactly as handed over. -/
def Doc.line (text : String) : Doc :=
  { layout := .inline, blocks := [.verbatim [text]] }

/-- A doc comment whose rows are reproduced as given. -/
def Doc.rows (rows : List String) : Doc :=
  { layout := .block, blocks := [.verbatim rows] }

/-! ## The tree -/

/-- An object key: a bare identifier, a string literal, or the shorthand the
    target writes where the key and the value are the same identifier
    (ShorthandPropertyAssignment, which is a different node from the
    PropertyAssignment the other two make). -/
inductive PropertyKey where
  | name (text : String)
  | quoted (text : String)
  | shorthand (text : String)
deriving Repr, BEq

/-- Where an arrow's body starts: beside the arrow, or on the line under it at
    one step deeper. The target admits both and a site picks one, so the choice
    is data like every other layout here. -/
inductive BodyPlacement where
  | beside
  | below
deriving Repr, BEq

mutual

/-- A type expression. There is deliberately no escape hatch carrying raw text,
    because raw text is how a target grammar stops being a grammar. -/
inductive TsType where
  | keyword (name : String)
  | reference (name : String) (arguments : List TsType)
  | qualified (parts : List String) (arguments : List TsType)
  | literal (value : String)
  | query (target : TsType)
  | parens (inner : TsType)
  | indexed (object : TsType) (index : TsType)
  | union (layout : Layout) (members : List TsType)
  | intersection (members : List TsType)
  | tuple (items : List TsType)
  | operator (name : String) (inner : TsType)
  | record (layout : Layout) (members : List (Bool × Bool × PropertyKey × TsType))
  | index (key : String) (domain : TsType) (value : TsType)
  | mapped (layout : Layout) (binder : String) (domain : TsType) (value : TsType)
  | function (parameters : List (String × TsType)) (layout : Layout)
      (binders : List (String × TsType)) (result : TsType)
  | template (head : String) (spans : List (TsType × String))

/-- A value expression. Array and object elements carry an optional doc
    comment, because the emitted tables document their rows in place. -/
inductive TsExpr where
  | str (value : String)
  | nat (value : Nat)
  | bigint (value : Nat)
  | ident (name : String)
  | field (object : TsExpr) (name : String)
  | element (object : TsExpr) (index : Nat)
  | call (callee : TsExpr) (layout : Layout) (arguments : List TsExpr)
  | array (layout : Layout) (elements : List (Option Doc × TsExpr))
  | object (layout : Layout) (properties : List (Option Doc × PropertyKey × TsExpr))
  | concat (runs : List TsExpr)
  /-- An arrow function: its own type parameters, the layout its binders are
      written at, those binders each with the doc comment the site gives it,
      the result type, where the body starts, and the body. -/
  | arrow (parameters : List (String × TsType)) (layout : Layout)
      (binders : List (Option Doc × String × TsType)) (result : Option TsType)
      (placement : BodyPlacement) (body : TsBody)
  | asConst (inner : TsExpr)
  /-- The other AsExpression: an assertion to a named type rather than to
      `const`. -/
  | coerce (inner : TsExpr) (type : TsType)
  /-- A ParenthesizedExpression. The target writes one where an object literal
      would otherwise be read as a block, and nowhere else. -/
  | group (inner : TsExpr)
  | satisfies (inner : TsExpr) (type : TsType)
  /-- A call whose last argument is written flush against the parentheses:
      the argument's own opening brace closes the calling line and its closing
      brace carries the closing parenthesis. It is a CallExpression like
      `.call`, carried apart because the two renderings are different facts
      about a site and neither is derivable from a width. -/
  | apply (callee : TsExpr) (leading : List TsExpr) (final : TsExpr)
  /-- A value written on the lines after its key rather than beside it. Only a
      block object's property reads this; everywhere else it is its inner
      expression. -/
  | offset (inner : TsExpr)

/-- What an arrow returns to: one expression, or a Block of statements. The
    second is the target's other function body and the surfaces write exactly
    one of them, which is why it is carried at exactly the two statement forms
    that one body uses. -/
inductive TsBody where
  | value (expression : TsExpr)
  | statements (rows : List TsStatement)

/-- One statement of a function body. -/
inductive TsStatement where
  /-- An ExpressionStatement over a VoidExpression: the target's way of reading
      a binding it is required to take and required not to use. -/
  | discard (value : TsExpr)
  /-- A ReturnStatement. -/
  | returns (value : TsExpr)

end

/-- One type parameter: its name, its constraint, and its default. -/
structure TypeParameter where
  name : String
  constraint : Option TsType
  fallback : Option TsType

/-- One member of an interface: its own doc comment, whether it is read-only,
    whether it is optional, its key, and its type. A member documents itself
    because the emitted surfaces document a field where the field stands, not
    in a table above the interface. -/
structure Member where
  doc : Option Doc := none
  readOnly : Bool
  optional : Bool
  key : PropertyKey
  type : TsType

/-- One top-level statement of the emitted module. -/
inductive TsStmt where
  | comment (doc : Doc)
  | banner (rows : List String)
  | importNamed (typeOnly : Bool) (bindings : List String) (source : String)
  | importNamespace (binding : String) (source : String)
  | constant (doc : Option Doc) (name : String) (type : Option TsType) (value : TsExpr)
  | typeAlias (doc : Option Doc) (name : String) (parameters : List TypeParameter)
      (layout : Layout) (value : TsType)
  | interfaceDecl (doc : Option Doc) (name : String) (parameterLayout : Layout)
      (parameters : List TypeParameter) (spaced : Bool) (members : List Member)
  | blank

/-- A module: the statements it carries, in order. -/
structure TsModule where
  statements : List TsStmt

/-! ## String literals

The target's escaping, stated here rather than borrowed: the two mandatory
escapes, the five short control forms, a lowercase four-digit escape for every
other control character, and the character itself otherwise. A code point above
the printable range is written as itself — the surfaces carry the em dash and
nothing else outside ASCII, and an escaper that folded it would move six lines. -/

/-- One hexadecimal digit, lowercase. -/
def hexDigit (value : Nat) : Char :=
  if value < 10 then Char.ofNat ('0'.toNat + value)
  else Char.ofNat ('a'.toNat + value - 10)

/-- One character inside a string literal. -/
def escapeChar (character : Char) : String :=
  let point := character.toNat
  if point == 0x22 then "\\\""
  else if point == 0x5c then "\\\\"
  else if point == 0x08 then "\\b"
  else if point == 0x0c then "\\f"
  else if point == 0x0a then "\\n"
  else if point == 0x0d then "\\r"
  else if point == 0x09 then "\\t"
  else if point < 0x20 then
    "\\u00" ++ String.singleton (hexDigit (point / 16)) ++
      String.singleton (hexDigit (point % 16))
  else String.singleton character

/-- A string literal at the target's escaping. -/
def quote (value : String) : String :=
  "\"" ++ String.join (value.toList.map escapeChar) ++ "\""

/-! ## Printing the doc comments -/

/-- One comment row behind its gutter. An empty row carries no trailing space:
    a gutter with nothing after it is written bare. -/
def gutterRow (indent : String) (row : String) : String :=
  if row.isEmpty then indent ++ " *" else indent ++ " * " ++ row

/-- Greedy wrap over single spaces. The gutter width is charged against every
    row, which is what makes the break points a function of the indent. -/
def wrapWords (policy : WrapPolicy) (gutterWidth : Nat) (words : List String)
    : List String :=
  let step := fun (state : List String × String) (word : String) =>
    let (rows, current) := state
    if word.isEmpty then (rows, current)
    else if current.isEmpty then (rows, word)
    else if gutterWidth + current.length + 1 + word.length > policy.column then
      (rows ++ [current], word)
    else (rows, current ++ " " ++ word)
  let (rows, current) := words.foldl step (([], "") : List String × String)
  let all := rows ++ [current]
  if policy.trimRows then all.map (fun row => row.trimAsciiEnd.toString) else all

/-- Greedy split of a paragraph into runs, each run KEEPING the separator that
    followed it, so that concatenating the runs reproduces the paragraph
    character for character. `fits` is the rendered width test the site applies
    to a candidate run.

    This is not a doc-comment wrap and no `Doc` reaches it. It is here for the
    same reason `flatWidth` is: a generator that writes a long string as a
    concatenation of literals has to split it somewhere, the split is a value
    the tree then carries, and the runs must add back up — a wrap that dropped
    the separators would silently rewrite the string it was splitting. -/
def splitRuns (fits : String -> Bool) (text : String) : List String :=
  let step := fun (state : Nat × List String × String) (word : String) =>
    let (index, runs, current) := state
    let candidate := if index == 0 then word else current ++ " " ++ word
    if !current.isEmpty && !fits candidate then
      (index + 1, runs ++ [current ++ " "], word)
    else (index + 1, runs, candidate)
  let (_, runs, current) :=
    (text.splitOn " ").foldl step ((0, [], "") : Nat × List String × String)
  runs ++ [current]

/-- The rows one doc run contributes, before the gutter. -/
def blockRows (gutterWidth : Nat) : DocBlock -> List String
  | .verbatim rows => rows
  | .wrapped policy text => wrapWords policy gutterWidth (text.splitOn " ")

/-- One doc comment as lines at an indent. -/
def docLines (indent : String) (doc : Doc) : List String :=
  let rows := doc.blocks.flatMap (blockRows (indent.length + 3))
  match doc.layout, rows with
  | .inline, [row] => [indent ++ "/** " ++ row ++ " */"]
  | _, _ =>
      (indent ++ "/**") :: rows.map (gutterRow indent) ++ [indent ++ " */"]

/-- The lines an optional doc comment contributes. -/
def optionalDocLines (indent : String) : Option Doc -> List String
  | none => []
  | some doc => docLines indent doc

/-! ## Printing the tree -/

/-- The text of an object key. -/
def keyText : PropertyKey -> String
  | .name text => text
  | .quoted text => quote text
  | .shorthand text => text

/-- Prepend a prefix to the first line. -/
def prefixFirst (start : String) : List String -> List String
  | [] => [start]
  | first :: rest => (start ++ first) :: rest

/-- Append a suffix to the last line. -/
def appendLast (lines : List String) (suffix : String) : List String :=
  match lines.reverse with
  | [] => [suffix]
  | last :: rest => rest.reverse ++ [last ++ suffix]

/-- Two runs of lines written as one construct: the second run's first line
    continues the first run's last line. This is what lets a call whose callee
    is itself broken across lines keep its opening parenthesis where the target
    writes it — on the line the callee ended on. -/
def spliceLines (before after : List String) : List String :=
  match before.reverse with
  | [] => after
  | last :: rest => rest.reverse ++ prefixFirst last after

mutual

/-- A type expression as text. Types are written on one line throughout the
    emitted surfaces; where a value would not fit, the ALIAS breaks, never the
    type. -/
def typeText : TsType -> String
  | .keyword name => name
  | .reference name [] => name
  | .reference name arguments => name ++ "<" ++ typeList arguments ++ ">"
  | .qualified parts [] => String.intercalate "." parts
  | .qualified parts arguments =>
      String.intercalate "." parts ++ "<" ++ typeList arguments ++ ">"
  | .literal value => quote value
  | .query target => "typeof " ++ typeText target
  | .parens inner => "(" ++ typeText inner ++ ")"
  | .indexed object index => typeText object ++ "[" ++ typeText index ++ "]"
  | .union _ members => joinTypes " | " members
  | .intersection members => joinTypes " & " members
  | .tuple items => "[" ++ typeList items ++ "]"
  | .operator name inner => name ++ " " ++ typeText inner
  | .record _ [] => "{}"
  | .record _ members => "{ " ++ recordMembers members ++ " }"
  | .index key domain value =>
      "{ readonly [" ++ key ++ ": " ++ typeText domain ++ "]: " ++ typeText value ++ " }"
  | .mapped _ binder domain value =>
      "{ readonly [" ++ binder ++ " in " ++ typeText domain ++ "]: " ++
        typeText value ++ " }"
  | .function parameters _ binders result =>
      (if parameters.isEmpty then "" else "<" ++ functionParameterList parameters ++ ">") ++
        "(" ++ binderList binders ++ ") => " ++ typeText result
  | .template head spans => "`" ++ head ++ spanText spans ++ "`"

/-- Comma-separated type parameters of a function type. Every one the target
    writes carries a constraint, so a parameter is a name and its bound. -/
def functionParameterList : List (String × TsType) -> String
  | [] => ""
  | [only] => only.1 ++ " extends " ++ typeText only.2
  | first :: rest =>
      first.1 ++ " extends " ++ typeText first.2 ++ ", " ++ functionParameterList rest

/-- Comma-separated type arguments. -/
def typeList : List TsType -> String
  | [] => ""
  | [only] => typeText only
  | first :: rest => typeText first ++ ", " ++ typeList rest

/-- Members of a union or an intersection at their separator. -/
def joinTypes (separator : String) : List TsType -> String
  | [] => ""
  | [only] => typeText only
  | first :: rest => typeText first ++ separator ++ joinTypes separator rest

/-- Members of an inline record type, semicolon separated. -/
def recordMembers : List (Bool × Bool × PropertyKey × TsType) -> String
  | [] => ""
  | [only] => recordMember only
  | first :: rest => recordMember first ++ "; " ++ recordMembers rest

/-- One member of an inline record type. -/
def recordMember (member : Bool × Bool × PropertyKey × TsType) : String :=
  (if member.1 then "readonly " else "") ++ keyText member.2.2.1 ++
    (if member.2.1 then "?" else "") ++ ": " ++ typeText member.2.2.2

/-- Comma-separated binders of a function type. -/
def binderList : List (String × TsType) -> String
  | [] => ""
  | [only] => only.1 ++ ": " ++ typeText only.2
  | first :: rest => first.1 ++ ": " ++ typeText first.2 ++ ", " ++ binderList rest

/-- The substitutions of a template literal type and the text after each. -/
def spanText : List (TsType × String) -> String
  | [] => ""
  | span :: rest => "${" ++ typeText span.1 ++ "}" ++ span.2 ++ spanText rest

end

mutual

/-- One expression on one line: the flat rendering every width test measures,
    and the form the target uses inside an inline container. -/
def inlineExpr : TsExpr -> String
  | .str value => quote value
  | .nat value => toString value
  | .bigint value => toString value ++ "n"
  | .ident name => name
  | .field object name => inlineExpr object ++ "." ++ name
  | .element object index => inlineExpr object ++ "[" ++ toString index ++ "]"
  | .call callee _ arguments => inlineExpr callee ++ "(" ++ inlineList arguments ++ ")"
  | .array _ elements => "[" ++ inlineElements elements ++ "]"
  | .object _ [] => "{}"
  | .object _ properties => "{ " ++ inlineProperties properties ++ " }"
  | .concat runs => inlineRuns runs
  | .arrow parameters _ binders result _ body =>
      (if parameters.isEmpty then "" else "<" ++ functionParameterList parameters ++ ">") ++
        "(" ++ inlineBinders binders ++ ")" ++
        (match result with
         | none => ""
         | some type => ": " ++ typeText type) ++
        " => " ++ inlineBody body
  | .asConst inner => inlineExpr inner ++ " as const"
  | .coerce inner type => inlineExpr inner ++ " as " ++ typeText type
  | .group inner => "(" ++ inlineExpr inner ++ ")"
  | .satisfies inner type => inlineExpr inner ++ " satisfies " ++ typeText type
  | .apply callee [] final => inlineExpr callee ++ "(" ++ inlineExpr final ++ ")"
  | .apply callee leading final =>
      inlineExpr callee ++ "(" ++ inlineList leading ++ ", " ++ inlineExpr final ++ ")"
  | .offset inner => inlineExpr inner

/-- Comma-separated expressions. -/
def inlineList : List TsExpr -> String
  | [] => ""
  | [only] => inlineExpr only
  | first :: rest => inlineExpr first ++ ", " ++ inlineList rest

/-- The runs of a concatenation on one line. -/
def inlineRuns : List TsExpr -> String
  | [] => ""
  | [only] => inlineExpr only
  | first :: rest => inlineExpr first ++ " + " ++ inlineRuns rest

/-- Comma-separated array elements. An element's doc comment has no inline
    form: no generator gives an inline container a documented element. -/
def inlineElements : List (Option Doc × TsExpr) -> String
  | [] => ""
  | [only] => inlineExpr only.2
  | first :: rest => inlineExpr first.2 ++ ", " ++ inlineElements rest

/-- Comma-separated object properties. -/
def inlineProperties : List (Option Doc × PropertyKey × TsExpr) -> String
  | [] => ""
  | [(_, .shorthand name, _)] => name
  | [only] => keyText only.2.1 ++ ": " ++ inlineExpr only.2.2
  | (_, .shorthand name, _) :: rest => name ++ ", " ++ inlineProperties rest
  | first :: rest =>
      keyText first.2.1 ++ ": " ++ inlineExpr first.2.2 ++ ", " ++ inlineProperties rest

/-- Comma-separated arrow binders. A binder's doc comment has no inline form:
    no site documents a binder it also writes flat. -/
def inlineBinders : List (Option Doc × String × TsType) -> String
  | [] => ""
  | [only] => only.2.1 ++ ": " ++ typeText only.2.2
  | first :: rest =>
      first.2.1 ++ ": " ++ typeText first.2.2 ++ ", " ++ inlineBinders rest

/-- An arrow's body on one line. A Block has no inline form on this target's
    surfaces; it is written as its own braces so the function stays total. -/
def inlineBody : TsBody -> String
  | .value expression => inlineExpr expression
  | .statements rows => "{ " ++ inlineStatements rows ++ " }"

/-- Semicolon-separated statements, for the inline form no site writes. -/
def inlineStatements : List TsStatement -> String
  | [] => ""
  | [only] => inlineStatement only
  | first :: rest => inlineStatement first ++ "; " ++ inlineStatements rest

/-- One statement's text. -/
def inlineStatement : TsStatement -> String
  | .discard value => "void " ++ inlineExpr value
  | .returns value => "return " ++ inlineExpr value

end

/-- The flat width of an expression: what a width-testing renderer measures.
    The printer never consults it — a generator that has to reproduce such a
    test does, and then sets the layout it decided on. -/
def flatWidth (expression : TsExpr) : Nat := (inlineExpr expression).length

/-- The single member of a mapped type, without its braces: the one piece both
    the flat and the broken rendering share. -/
def mappedMember (binder : String) (domain : TsType) (value : TsType) : String :=
  "readonly [" ++ binder ++ " in " ++ typeText domain ++ "]: " ++ typeText value

/-- A function type's own type parameters, empty when it has none. -/
def functionParameters : List (String × TsType) -> String
  | [] => ""
  | parameters => "<" ++ functionParameterList parameters ++ ">"

/-- A type the target breaks across lines, as the text that closes the line
    introducing it and the lines that follow at `indent`. Every other type is
    written on one line, which is why this is an `Option` rather than a second
    total printer: the two block forms are the two the surfaces measure, and a
    type with no broken rendering says so instead of acquiring one. -/
def brokenType (indent : String) : TsType -> Option (String × List String)
  | .mapped .block binder domain value =>
      some ("{", [indent ++ "  " ++ mappedMember binder domain value, indent ++ "}"])
  | .function parameters .block binders result =>
      some (functionParameters parameters ++ "(",
        binders.map (fun binder =>
          indent ++ "  " ++ binder.1 ++ ": " ++ typeText binder.2 ++ ",") ++
          [indent ++ ") => " ++ typeText result])
  | _ => none

mutual

/-- One expression as lines. The first line carries no indent — the caller
    places it after whatever introduces the expression — and every later line
    is written at `indent` or deeper. -/
def exprLines (indent : String) : TsExpr -> List String
  | .array .block elements =>
      "[" :: elementLines (indent ++ "  ") elements ++ [indent ++ "]"]
  | .object .block properties =>
      "{" :: propertyLines (indent ++ "  ") properties ++ [indent ++ "}"]
  | .call callee .block arguments =>
      (inlineExpr callee ++ "(") :: argumentLines (indent ++ "  ") arguments ++
        [indent ++ ")"]
  | .concat runs => runLines indent runs
  | .apply callee leading final =>
      spliceLines
        (appendLast (exprLines indent callee)
          ("(" ++ String.join (leading.map fun argument => inlineExpr argument ++ ", ")))
        (appendLast (exprLines indent final) ")")
  | .field object name => appendLast (exprLines indent object) ("." ++ name)
  | .offset inner => exprLines indent inner
  | .group inner => prefixFirst "(" (appendLast (exprLines indent inner) ")")
  | .coerce inner type => appendLast (exprLines indent inner) (" as " ++ typeText type)
  | .arrow parameters layout binders result placement body =>
      let opening :=
        (if parameters.isEmpty then "" else "<" ++ functionParameterList parameters ++ ">") ++ "("
      let closing :=
        ")" ++ (match result with
                | none => ""
                | some type => ": " ++ typeText type) ++ " =>"
      let head :=
        match layout with
        | .inline => [opening ++ inlineBinders binders ++ closing]
        | .block =>
            opening :: binderLines (indent ++ "  ") binders ++ [indent ++ closing]
      (match placement with
       | .beside => spliceLines (appendLast head " ") (bodyLines indent body)
       | .below => head ++ prefixFirst (indent ++ "  ") (bodyLines (indent ++ "  ") body))
  | .asConst inner => appendLast (exprLines indent inner) " as const"
  | .satisfies inner type =>
      match brokenType indent type with
      | some (opening, rest) =>
          appendLast (exprLines indent inner) (" satisfies " ++ opening) ++ rest
      | none => appendLast (exprLines indent inner) (" satisfies " ++ typeText type)
  | other => [inlineExpr other]

/-- The lines of a block array's elements, each documented in place. -/
def elementLines (indent : String) : List (Option Doc × TsExpr) -> List String
  | [] => []
  | element :: rest =>
      optionalDocLines indent element.1 ++
        prefixFirst indent (appendLast (exprLines indent element.2) ",") ++
        elementLines indent rest

/-- The lines of a block object's properties, each documented in place. A
    property whose value is `offset` writes the key alone and the value on the
    lines below it, one step deeper. -/
def propertyLines (indent : String) : List (Option Doc × PropertyKey × TsExpr) -> List String
  | [] => []
  | (doc, .shorthand name, _) :: rest =>
      optionalDocLines indent doc ++ [indent ++ name ++ ","] ++ propertyLines indent rest
  | (doc, key, .offset inner) :: rest =>
      optionalDocLines indent doc ++
        (indent ++ keyText key ++ ":") ::
          prefixFirst (indent ++ "  ")
            (appendLast (exprLines (indent ++ "  ") inner) ",") ++
        propertyLines indent rest
  | (doc, key, value) :: rest =>
      optionalDocLines indent doc ++
        prefixFirst (indent ++ keyText key ++ ": ")
          (appendLast (exprLines indent value) ",") ++
        propertyLines indent rest

/-- The lines of a broken call's arguments. -/
def argumentLines (indent : String) : List TsExpr -> List String
  | [] => []
  | argument :: rest =>
      prefixFirst indent (appendLast (exprLines indent argument) ",") ++
        argumentLines indent rest

/-- The lines of an arrow's broken binders, each documented in place. -/
def binderLines (indent : String) : List (Option Doc × String × TsType) -> List String
  | [] => []
  | (doc, name, type) :: rest =>
      optionalDocLines indent doc ++
        [indent ++ name ++ ": " ++ typeText type ++ ","] ++
        binderLines indent rest

/-- An arrow's body as lines: the expression it returns, or its Block. -/
def bodyLines (indent : String) : TsBody -> List String
  | .value expression => exprLines indent expression
  | .statements rows =>
      "{" :: rows.map (fun row => indent ++ "  " ++ inlineStatement row) ++ [indent ++ "}"]

/-- A concatenation: the first run on the opening line, each later run behind
    its own continuation at the indent. -/
def runLines (indent : String) : List TsExpr -> List String
  | [] => [""]
  | [only] => [inlineExpr only]
  | first :: rest =>
      inlineExpr first :: (rest.map fun run => indent ++ "+ " ++ inlineExpr run)

end

/-- One type parameter as text. -/
def parameterText (parameter : TypeParameter) : String :=
  parameter.name ++
    (match parameter.constraint with
     | none => ""
     | some constraint => " extends " ++ typeText constraint) ++
    (match parameter.fallback with
     | none => ""
     | some fallback => " = " ++ typeText fallback)

/-- A type parameter list, empty when there are none. -/
def parametersText (parameters : List TypeParameter) : String :=
  if parameters.isEmpty then ""
  else "<" ++ String.intercalate ", " (parameters.map parameterText) ++ ">"

/-- One interface member as lines: its own doc comment, then the member. -/
def memberLines (member : Member) : List String :=
  let head := "  " ++ (if member.readOnly then "readonly " else "") ++
    keyText member.key ++ (if member.optional then "?" else "") ++ ": "
  optionalDocLines "  " member.doc ++
    (match brokenType "  " member.type with
     | some (opening, rest) => (head ++ opening) :: rest
     | none => [head ++ typeText member.type])

/-- The members of an interface, with a blank line between each pair when the
    site writes them apart. -/
def interfaceMembers (spaced : Bool) : List Member -> List String
  | [] => []
  | [only] => memberLines only
  | first :: rest =>
      memberLines first ++ (if spaced then [""] else []) ++ interfaceMembers spaced rest

/-- One member of a union written behind its own bar: on one line, or — where
    the member is a record the site writes broken — its brace opening the bar's
    line and one member per line under it, with no separators between them. -/
def unionMemberLines : TsType -> List String
  | .record .block members =>
      "  | {" :: members.map (fun member => "    " ++ recordMember member) ++ ["  }"]
  | member => ["  | " ++ typeText member]

/-- The value of a type alias broken onto its own lines: a union written one
    member per line behind its leading bar, anything else on one line. -/
def aliasValueLines : TsType -> List String
  | .union .block members => members.flatMap unionMemberLines
  | value => ["  " ++ typeText value]

/-- One statement as lines. -/
def statementLines : TsStmt -> List String
  | .comment doc => docLines "" doc
  | .banner rows => rows.map (fun row => "// " ++ row)
  | .importNamed typeOnly bindings source =>
      ["import " ++ (if typeOnly then "type " else "") ++ "{ " ++
        String.intercalate ", " bindings ++ " } from " ++ quote source]
  | .importNamespace binding source =>
      ["import * as " ++ binding ++ " from " ++ quote source]
  | .constant doc name type value =>
      let annotation :=
        match type with
        | none => ""
        | some declared => ": " ++ typeText declared
      optionalDocLines "" doc ++
        prefixFirst ("export const " ++ name ++ annotation ++ " = ") (exprLines "" value)
  | .typeAlias doc name parameters layout value =>
      let head := "export type " ++ name ++ parametersText parameters ++ " ="
      optionalDocLines "" doc ++
        (match layout with
         | .inline =>
             match brokenType "" value with
             | some (opening, rest) => (head ++ " " ++ opening) :: rest
             | none => [head ++ " " ++ typeText value]
         | .block => head :: aliasValueLines value)
  | .interfaceDecl doc name parameterLayout parameters spaced members =>
      optionalDocLines "" doc ++
        (match parameterLayout with
         | .inline => [("export interface " ++ name ++ parametersText parameters ++ " {")]
         | .block =>
             ("export interface " ++ name ++ "<") ::
               parameters.map (fun parameter => "  " ++ parameterText parameter ++ ",") ++
               ["> {"]) ++
        interfaceMembers spaced members ++ ["}"]
  | .blank => [""]

/-- The module's bytes. A blank statement is a line of its own, so a module
    that closes with one closes the file with a newline and a module that does
    not, does not — the trailing newline is a fact about the surface being
    emitted, never a constant of the printer. -/
def render (module : TsModule) : String :=
  String.intercalate "\n" (module.statements.flatMap statementLines)

end Unity.Ts
