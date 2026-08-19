/-
The TypeScript target grammar, embedded, and the one printer over it.

This file is the target's own vocabulary written down as data, at exactly the
node set the emitted surfaces use — measured with the TypeScript compiler over
the committed generated files rather than guessed from one of them. Nothing
here reads a corpus, walks an environment, or knows what a kernel is. A
generator upstream decides WHAT to say; this file decides how the target spells
it, and it decides that once.

## The measured spine, and which constructor carries each row

Forty-five structural kinds are reachable across the four generated surfaces.
Each is carried here; where the target spells one construct with several nodes,
one constructor carries the group, and the group is named.

  module frame   ImportDeclaration + ImportClause + NamedImports +
                 ImportSpecifier -> `TsStmt.importNamed`;
                 NamespaceImport -> `TsStmt.importNamespace`
  declarations   VariableStatement + VariableDeclarationList +
                 VariableDeclaration -> `TsStmt.constant` (the target writes
                 one exported declarator and no other form);
                 TypeAliasDeclaration -> `TsStmt.typeAlias`;
                 InterfaceDeclaration -> `TsStmt.interfaceDecl`
  members        PropertyAssignment -> an object property;
                 PropertySignature -> `Member.property`;
                 IndexSignature -> `Member.index`
  expressions    Identifier `.ident`, StringLiteral `.str`, BigIntLiteral
                 `.bigint`, NumericLiteral `.nat`, ObjectLiteralExpression
                 `.object`, ArrayLiteralExpression `.array`, CallExpression
                 `.call`, PropertyAccessExpression `.field`,
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

/-- An object key: a bare identifier, or a string literal. -/
inductive PropertyKey where
  | name (text : String)
  | quoted (text : String)
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
  | union (members : List TsType)
  | intersection (members : List TsType)
  | tuple (items : List TsType)
  | operator (name : String) (inner : TsType)
  | record (layout : Layout) (members : List (Bool × Bool × PropertyKey × TsType))
  | index (key : String) (domain : TsType) (value : TsType)
  | mapped (binder : String) (domain : TsType) (value : TsType)
  | function (binders : List (String × TsType)) (result : TsType)
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
  | arrow (binders : List (String × TsType)) (result : Option TsType) (body : TsExpr)
  | asConst (inner : TsExpr)
  | satisfies (inner : TsExpr) (type : TsType)

end

/-- One type parameter: its name, its constraint, and its default. -/
structure TypeParameter where
  name : String
  constraint : Option TsType
  fallback : Option TsType

/-- One member of an interface: whether it is read-only, whether it is
    optional, its key, and its type. -/
structure Member where
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
  | constant (doc : Option Doc) (name : String) (value : TsExpr)
  | typeAlias (doc : Option Doc) (name : String) (parameters : List TypeParameter)
      (layout : Layout) (value : TsType)
  | interfaceDecl (doc : Option Doc) (name : String) (parameters : List TypeParameter)
      (members : List Member)
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

/-- Prepend a prefix to the first line. -/
def prefixFirst (start : String) : List String -> List String
  | [] => [start]
  | first :: rest => (start ++ first) :: rest

/-- Append a suffix to the last line. -/
def appendLast (lines : List String) (suffix : String) : List String :=
  match lines.reverse with
  | [] => [suffix]
  | last :: rest => rest.reverse ++ [last ++ suffix]

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
  | .union members => joinTypes " | " members
  | .intersection members => joinTypes " & " members
  | .tuple items => "[" ++ typeList items ++ "]"
  | .operator name inner => name ++ " " ++ typeText inner
  | .record _ [] => "{}"
  | .record _ members => "{ " ++ recordMembers members ++ " }"
  | .index key domain value =>
      "{ readonly [" ++ key ++ ": " ++ typeText domain ++ "]: " ++ typeText value ++ " }"
  | .mapped binder domain value =>
      "{ readonly [" ++ binder ++ " in " ++ typeText domain ++ "]: " ++
        typeText value ++ " }"
  | .function binders result =>
      "(" ++ binderList binders ++ ") => " ++ typeText result
  | .template head spans => "`" ++ head ++ spanText spans ++ "`"

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
  | .arrow binders result body =>
      "(" ++ binderList binders ++ ")" ++
        (match result with
         | none => ""
         | some type => ": " ++ typeText type) ++
        " => " ++ inlineExpr body
  | .asConst inner => inlineExpr inner ++ " as const"
  | .satisfies inner type => inlineExpr inner ++ " satisfies " ++ typeText type

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
  | [only] => keyText only.2.1 ++ ": " ++ inlineExpr only.2.2
  | first :: rest =>
      keyText first.2.1 ++ ": " ++ inlineExpr first.2.2 ++ ", " ++ inlineProperties rest

end

/-- The flat width of an expression: what a width-testing renderer measures.
    The printer never consults it — a generator that has to reproduce such a
    test does, and then sets the layout it decided on. -/
def flatWidth (expression : TsExpr) : Nat := (inlineExpr expression).length

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
  | .asConst inner => appendLast (exprLines indent inner) " as const"
  | .satisfies inner type =>
      appendLast (exprLines indent inner) (" satisfies " ++ typeText type)
  | other => [inlineExpr other]

/-- The lines of a block array's elements, each documented in place. -/
def elementLines (indent : String) : List (Option Doc × TsExpr) -> List String
  | [] => []
  | element :: rest =>
      optionalDocLines indent element.1 ++
        prefixFirst indent (appendLast (exprLines indent element.2) ",") ++
        elementLines indent rest

/-- The lines of a block object's properties, each documented in place. -/
def propertyLines (indent : String) : List (Option Doc × PropertyKey × TsExpr) -> List String
  | [] => []
  | property :: rest =>
      optionalDocLines indent property.1 ++
        prefixFirst (indent ++ keyText property.2.1 ++ ": ")
          (appendLast (exprLines indent property.2.2) ",") ++
        propertyLines indent rest

/-- The lines of a broken call's arguments. -/
def argumentLines (indent : String) : List TsExpr -> List String
  | [] => []
  | argument :: rest =>
      prefixFirst indent (appendLast (exprLines indent argument) ",") ++
        argumentLines indent rest

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

/-- One interface member as a line. -/
def memberLine (member : Member) : String :=
  "  " ++ (if member.readOnly then "readonly " else "") ++
    keyText member.key ++ (if member.optional then "?" else "") ++
    ": " ++ typeText member.type

/-- One statement as lines. -/
def statementLines : TsStmt -> List String
  | .comment doc => docLines "" doc
  | .banner rows => rows.map (fun row => "// " ++ row)
  | .importNamed typeOnly bindings source =>
      ["import " ++ (if typeOnly then "type " else "") ++ "{ " ++
        String.intercalate ", " bindings ++ " } from " ++ quote source]
  | .importNamespace binding source =>
      ["import * as " ++ binding ++ " from " ++ quote source]
  | .constant doc name value =>
      optionalDocLines "" doc ++
        prefixFirst ("export const " ++ name ++ " = ") (exprLines "" value)
  | .typeAlias doc name parameters layout value =>
      let head := "export type " ++ name ++ parametersText parameters ++ " ="
      optionalDocLines "" doc ++
        (match layout with
         | .inline => [head ++ " " ++ typeText value]
         | .block => [head, "  " ++ typeText value])
  | .interfaceDecl doc name parameters members =>
      optionalDocLines "" doc ++
        ("export interface " ++ name ++ parametersText parameters ++ " {") ::
        members.map memberLine ++ ["}"]
  | .blank => [""]

/-- The module's bytes. A blank statement is a line of its own, so a module
    that closes with one closes the file with a newline and a module that does
    not, does not — the trailing newline is a fact about the surface being
    emitted, never a constant of the printer. -/
def render (module : TsModule) : String :=
  String.intercalate "\n" (module.statements.flatMap statementLines)

end Unity.Ts
