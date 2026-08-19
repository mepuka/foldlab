/-
The MCP tool-schema projection: one direct printer over the projection AST.

There is no target AST here and that is the ruling, not an omission. JSON is
pure data with no idiom to model -- no statement order, no import frame, no
alignment pass, nothing a target grammar would be for. The two other printers
in this package embed their target because TypeScript and Go have opinions
about how a value is spelled; JSON has none, so this file goes straight from
`Projections.ProjectionAst` to bytes, the way the prose printer does.

## What is derived and what is reviewed

DERIVED from the walked environment, and stated nowhere else:

  * the tool set and its order -- the constructors of `Act`, in declaration
    order, one flat tool each;
  * every property and its order -- each constructor's fields in declaration
    order, with a flattened field expanded in place, and `kernel_trigger`'s
    optional slots following in the trigger grammar's own constructor order;
  * which properties are required -- a field of the tool's own constructor is
    required, a slot of the flattened trigger grammar is optional;
  * every enum's members and their order -- the named declaration's
    constructors, in declaration order, kebab-cased by one rule;
  * every carrier -- looked up on the erased head of the field's model sort,
    resolved through the structures a flattened path walks.

REVIEWED, in `Unity.JsonSchemaManifest`, because the model carries no source:

  * the wire spelling of each property, and the naming rule it follows;
  * the JSON fragment each model sort travels as;
  * the trigger correspondence;
  * every paragraph of prose, and the laws it cites.

## The three determinism rules, stated once

**Key order.** One order per node shape, and the sketch this projection
succeeds could not arbitrate it -- it wrote six different per-property orders.
A property schema is `type`, `enum`, `pattern`, `minimum`, `description`: the
discriminator, then the constraints that narrow it from most closed to least,
then the human sentence. Nothing is sorted; every order is authored and pinned.

**Layout.** One layout for every node of a shape. An object always expands,
one key per line, two spaces per level. An array of scalars is written on one
line; an array of objects expands. The sketch wrote twelve property objects on
one line and twenty-four expanded, which is the defect a printer cannot
reproduce and should not try to.

**Alphabet and escaping.** Every string is folded through the interchange's
ASCII table before it is escaped, so an em dash reaches the wire as `--` and a
code point the table does not name reddens the emission instead of arriving
mangled. What survives the fold is a newline or a printable ASCII character,
so the escape rule closes over exactly three cases -- quotation mark,
backslash, newline -- and the closure is a fact about the alphabet rather than
an assumption about the corpus.
-/
import Projections.Ast
import Unity.Sha
import Unity.JsonSchemaManifest

namespace Unity.JsonSchema

open Projections
open Unity.JsonSchemaManifest

/-! ## The alphabet, and the escape rule it closes -/

/-- Escape one character of the ASCII-folded alphabet. The fold has already
    refused everything outside a newline and printable ASCII, so three cases
    close the rule. -/
def escapeChar (character : Char) : Except String String :=
  if character == '"' then .ok "\\\""
  else if character == '\\' then .ok "\\\\"
  else if character == '\n' then .ok "\\n"
  else if character.toNat >= 0x20 && character.toNat <= 0x7e then
    .ok (String.singleton character)
  else
    .error s!"json-schema: code point {character.toNat} survived the ASCII fold"

/-- A JSON string literal, quotation marks included: fold to ASCII, then
    escape. Property names and prose go through the same door. -/
def quoted (text : String) : Except String String := do
  let folded <- asciiDoc text
  let body <- folded.toList.foldlM
    (fun accumulated character => do return accumulated ++ (<- escapeChar character)) ""
  return "\"" ++ body ++ "\""

/-- Two spaces per level. -/
def indent (depth : Nat) : String :=
  String.ofList (List.replicate (depth * 2) ' ')

private def comma (more : Bool) : String := if more then "," else ""

/-! ## Reading the projection AST -/

/-- The erased head of a type expression: `Digest DeclKind.policy` reads
    `Digest`, which is the key the carrier map is written against. -/
private def headName : TypeExpr -> Except String String
  | .named name => .ok (eraseName name)
  | .application function _ => headName function
  | other => .error s!"json-schema: a model field has no named sort head: {repr other}"

private def findDecl (ast : ProjectionAst) (erased : String) : Except String Decl :=
  match ast.declarations.find? (fun decl => eraseName decl.name == erased) with
  | some decl => .ok decl
  | none =>
      .error s!"json-schema: the projection AST carries no declaration named {erased}; \
the manifest names a model row the walked environment does not hold"

private def findCtor (decl : Decl) (short : String) : Except String Constructor :=
  match decl.constructors.find? (fun ctor => eraseName ctor.name == short) with
  | some ctor => .ok ctor
  | none =>
      .error s!"json-schema: {eraseName decl.name} has no constructor named {short}"

private def pickField (fields : List Field) (name : String) : Except String Field :=
  match fields.find? (fun field => field.name == name) with
  | some field => .ok field
  | none => .error s!"json-schema: no model field named {name} at this step of a naming path"

/-- The fields of a one-constructor declaration, which is what a flattened
    path steps through. -/
private def soleFields (ast : ProjectionAst) (erased : String) : Except String (List Field) := do
  let decl <- findDecl ast erased
  match decl.constructors with
  | [ctor] => return ctor.fields
  | _ =>
      .error s!"json-schema: a naming path steps through {erased}, which is not a \
one-constructor declaration"

/-- Resolve a dotted naming path to the erased head of the sort it lands on. -/
private def resolveFrom (ast : ProjectionAst) (fields : List Field)
    : List String -> Except String String
  | [] => .error "json-schema: a naming row carries an empty model path"
  | [final] => do headName (<- pickField fields final).typeExpr
  | step :: rest => do
      let field <- pickField fields step
      let head <- headName field.typeExpr
      resolveFrom ast (<- soleFields ast head) rest

/-- Kebab-case one constructor name. The rule the wire spellings follow, and
    the one place it is written down: a lower-camel name, one hyphen before
    each capital. Anything else reddens rather than producing a spelling
    nobody chose -- two capitals in a row would silently mint a double
    hyphen, and an underscore or a leading capital is not a name this rule
    has an answer for. -/
def kebab (name : String) : Except String String := do
  match name.toList with
  | [] => .error "json-schema: an empty constructor name cannot be kebab-cased"
  | leading :: rest =>
      if !(leading.isLower && leading.isAlpha) then
        .error s!"json-schema: {name} does not begin with a lower-case letter, so the \
kebab rule has no spelling for it"
      else
        let step := fun (state : String × Bool) (character : Char) =>
          if character.isUpper then
            if state.2 then
              .error s!"json-schema: {name} carries two capitals in a row, which the kebab \
rule would spell with a double hyphen"
            else
              .ok (state.1 ++ "-" ++ String.singleton character.toLower, true)
          else if character.isAlphanum then
            .ok (state.1 ++ String.singleton character, false)
          else
            .error s!"json-schema: {name} carries a character the kebab rule has no \
spelling for: {character.toNat}"
        let folded <- rest.foldlM step (String.singleton leading, false)
        return folded.1

/-- The members of an enum carrier: the named declaration's constructors, in
    declaration order, kebab-cased. -/
def enumMembers (ast : ProjectionAst) (declaration : String) : Except String (List String) := do
  let decl <- findDecl ast declaration
  decl.constructors.mapM (fun ctor => kebab (eraseName ctor.name))

/-! ## Reconciling the manifest against the environment -/

/-- The carrier a naming row's value travels as. -/
def carrierOf (ast : ProjectionAst) (row : PropertyRow) : Except String Carrier :=
  match row.source with
  | .enumerationOf declaration => do
      let _ <- findDecl ast declaration
      return .enumeration declaration
  | .field declaration constructorName path => do
      let decl <- findDecl ast declaration
      let ctor <- findCtor decl constructorName
      let head <- resolveFrom ast ctor.fields path
      match carriers.find? (fun entry => entry.1 == head) with
      | some entry => return entry.2
      | none =>
          .error s!"json-schema: the carrier map has no row for the model sort {head}, \
reached by {row.tool}.{row.wireName}"

/-- The naming rule is checked, not decorative: a row claiming `identity`
    whose wire name is not the model field's name is a manifest defect, and a
    manifest defect that nothing checks is a comment. -/
def checkRule (ast : ProjectionAst) (row : PropertyRow) : Except String Unit := do
  let named := s!"{row.tool}.{row.wireName}"
  match row.source, row.rule with
  | .enumerationOf _, .derived => return ()
  | .enumerationOf _, _ =>
      .error s!"json-schema: {named} has no model field, so its rule must be derived"
  | .field .., .derived =>
      .error s!"json-schema: {named} names a model field, so its rule cannot be derived"
  | .field declaration constructorName path, rule => do
      let final <-
        match path.getLast? with
        | some final => pure final
        | none => .error s!"json-schema: {named} carries an empty model path"
      match rule with
      | .identity =>
          if path.length == 1 && row.wireName == final then return ()
          else .error s!"json-schema: {named} claims the identity rule but is not its model \
field's own name"
      | .digestSuffix =>
          if path.length == 1 && row.wireName == final ++ "_digest" then return ()
          else .error s!"json-schema: {named} claims the digest-suffix rule but is not \
{final}_digest"
      | .rename =>
          if path.length == 1 && row.wireName != final && row.wireName != final ++ "_digest" then
            return ()
          else
            .error s!"json-schema: {named} claims a rename but the digest-suffix or identity \
rule already spells it"
      | .flatten =>
          if path.length >= 2 then return ()
          else do
            let decl <- findDecl ast declaration
            let ctor <- findCtor decl constructorName
            let head <- resolveFrom ast ctor.fields path
            let source <- findDecl ast head
            if source.constructors.length > 1 then return ()
            else
              .error s!"json-schema: {named} claims a flatten but walks no structure and \
carries no sum"
      | .derived => return ()

/-- One emitted wire property. -/
structure Property where
  wireName : String
  carrier : Carrier
  optional : Bool
  description : Option String
deriving BEq

private def propertyOf (ast : ProjectionAst) (row : PropertyRow) : Except String Property := do
  let _ <- checkRule ast row
  return { wireName := row.wireName
         , carrier := <- carrierOf ast row
         , optional := row.optional
         , description := row.description }

/-- Append a property, enforcing the slot-sharing rule: two naming rows may
    reach one wire slot, and when they do they must agree about what the slot
    carries. A disagreement is refused rather than resolved by row order. -/
private def merge (seen : List Property) (candidate : Property) : Except String (List Property) :=
  match seen.find? (fun existing => existing.wireName == candidate.wireName) with
  | none => .ok (seen ++ [candidate])
  | some existing =>
      if existing == candidate then .ok seen
      else
        .error s!"json-schema: two naming rows reach the wire slot {candidate.wireName} and \
disagree about what it carries"

/-- The rows sourced at one field of one constructor, in manifest order. -/
private def rowsAt (tool declaration constructorName fieldName : String) : List PropertyRow :=
  properties.filter fun row =>
    row.tool == tool &&
      match row.source with
      | .field rowDecl rowCtor path =>
          rowDecl == declaration && rowCtor == constructorName && path.head? == some fieldName
      | .enumerationOf _ => false

/-- Every field of a constructor, expanded into wire properties in the model's
    own declaration order. A field no row names is refused: this is the
    environment side of the manifest, and it is what a name register with only
    a committed side cannot check. -/
private def expand (ast : ProjectionAst) (tool declaration constructorName : String)
    (fields : List Field) (seen : List Property) : Except String (List Property) :=
  fields.foldlM
    (fun accumulated field => do
      let rows := rowsAt tool declaration constructorName field.name
      if rows.isEmpty then
        .error s!"json-schema: {declaration}.{constructorName}.{field.name} reaches no naming \
row, so {tool} would silently drop a model field"
      else
        rows.foldlM (fun inner row => do merge inner (<- propertyOf ast row)) accumulated)
    seen

/-- The optional slots of `kernel_trigger`: the closed trigger grammar's own
    constructors, in declaration order, each expanded in field order. -/
private def triggerSlots (ast : ProjectionAst) (seen : List Property)
    : Except String (List Property) := do
  let decl <- findDecl ast "KTriggerPredicate"
  decl.constructors.foldlM
    (fun accumulated ctor =>
      expand ast "kernel_trigger" "KTriggerPredicate" (eraseName ctor.name) ctor.fields accumulated)
    seen

/-- The trigger correspondence, reconciled: each reviewed production must be
    the kebab-cased name of a real constructor of the closed grammar, and its
    slot list must be exactly the wire slots that constructor's fields reach,
    in order. The correspondence lives only in prose on the wire, so it is
    walled here or it is walled nowhere. -/
def checkTriggers (ast : ProjectionAst) : Except String Unit := do
  let decl <- findDecl ast "KTriggerPredicate"
  if decl.constructors.length != triggers.length then
    .error s!"json-schema: the trigger correspondence carries {triggers.length} productions \
and the model carries {decl.constructors.length}"
  else
    (decl.constructors.zip triggers).forM fun entry => do
      let (ctor, row) := entry
      let short := eraseName ctor.name
      if short != row.constructorName then
        .error s!"json-schema: the trigger correspondence names {row.constructorName} where the \
model declares {short}"
      else do
        let production <- kebab short
        if production != row.production then
          .error s!"json-schema: the production {row.production} is not the kebab spelling of \
{short}"
        else do
          let slots <- expand ast "kernel_trigger" "KTriggerPredicate" short ctor.fields []
          let names := slots.map (fun slot => slot.wireName)
          if names != row.slots then
            .error s!"json-schema: {row.production} occupies {names} and the correspondence \
claims {row.slots}"
          else return ()

/-- Every snake-cased token in reviewed prose must be a law the citation set
    carries, a tool the tool table declares, or a wire property the naming map
    spells. A citation nobody declared, or a property name that drifted out of
    the map, reddens here. -/
private def snakeTokens (text : String) : List String :=
  let pieces := (text.toList.map fun character =>
    if character.isAlphanum || character == '_' then character else ' ')
  (String.ofList pieces).splitOn " " |>.filter fun token =>
    !token.isEmpty && token.any (fun character => character == '_')

def checkVocabulary : Except String Unit :=
  let known :=
    citations.map (fun row => row.law) ++
      tools.map (fun row => row.wireName) ++
      properties.map (fun row => row.wireName) ++
      ["refusal_result", "digest_format", "input_schema"]
  let prose :=
    headerComment :: digestComment :: refusalComment ::
      tools.map (fun row => row.description) ++
      properties.filterMap (fun row => row.description)
  prose.forM fun paragraph =>
    (snakeTokens paragraph).forM fun token =>
      if known.contains token then .ok ()
      else
        .error s!"json-schema: reviewed prose names {token}, which is neither a cited law nor \
a tool nor a wire property"

/-- Every declared citation must actually be cited by the tools that claim it.
    A law nobody cites is a row that outlived its paragraph. -/
def checkCitations : Except String Unit :=
  citations.forM fun row =>
    row.citedBy.forM fun toolName =>
      match tools.find? (fun tool => tool.wireName == toolName) with
      | none =>
          .error s!"json-schema: the citation {row.law} names {toolName}, which is not a tool"
      | some tool =>
          if (snakeTokens tool.description).contains row.law then .ok ()
          else
            .error s!"json-schema: {toolName} is recorded as citing {row.law} and its reviewed \
paragraph does not"

/-- Every naming row is validated whether or not the walk reaches it, and
    every row must live at the tool its own model constructor projects. A row
    filed under the wrong tool is unreachable, and an unreachable row is a
    convention nobody enforces sitting in a file everybody trusts. -/
def checkRowHomes (ast : ProjectionAst) : Except String Unit :=
  properties.forM fun row => do
    let _ <- checkRule ast row
    let _ <- carrierOf ast row
    let expected :=
      match row.source with
      | .enumerationOf _ => row.tool
      | .field declaration constructorName _ =>
          if declaration == "Act" then toolPrefix ++ constructorName
          else if declaration == "KTriggerPredicate" then toolPrefix ++ "trigger"
          else "refusal_result"
    if row.tool == expected then return ()
    else
      .error s!"json-schema: the naming row for {row.wireName} is filed under {row.tool} and \
its model constructor projects {expected}, so nothing would ever read it"

/-! ## The emission -/

private def carrierType : Carrier -> String
  | .opaqueString => "string"
  | .digestString => "string"
  | .exactInteger _ => "integer"
  | .enumeration _ => "string"

/-- The A4 wall. `IntegerDomain.ceiling` exists so that a re-narrowed identity
    domain is REFUSED with the ruling named, instead of quietly shipping a
    schema that cannot spell a corpus-legal value. -/
private def checkDomain (row : Property) (domain : IntegerDomain) : Except String Unit :=
  match domain.ceiling with
  | none => return ()
  | some ceiling =>
      .error s!"json-schema: the carrier map puts a ceiling of {ceiling} on {row.wireName}; \
estate integers are exact and unbounded, an identity coordinate is an arbitrary-precision \
non-negative integer, and the conformance corpus carries a gated witness above the retired \
double-safe range"

private def scalarArray (values : List String) : Except String String := do
  let quotedValues <- values.mapM quoted
  return "[" ++ String.intercalate ", " quotedValues ++ "]"

/-- Append a comma to the last line of a block. A block never carries its own
    separator, so nesting cannot double one or lose one. -/
private def punctuate : List String -> List String
  | [] => []
  | [final] => [final ++ ","]
  | line :: rest => line :: punctuate rest

/-- Lay sibling blocks out inside one object or array: every block but the
    last is comma-terminated. -/
private def siblings : List (List String) -> List String
  | [] => []
  | [final] => final
  | block :: rest => punctuate block ++ siblings rest

/-- One property schema, always expanded, keys in the one pinned order:
    `type`, `enum`, `pattern`, `minimum`, `description`. -/
private def propertyLines (ast : ProjectionAst) (depth : Nat) (property : Property)
    : Except String (List String) := do
  let name <- quoted property.wireName
  let typeRow := indent (depth + 1) ++ "\"type\": \"" ++ carrierType property.carrier ++ "\""
  let constraint <-
    match property.carrier with
    | .enumeration declaration => do
        let members <- enumMembers ast declaration
        let rendered <- scalarArray members
        pure [indent (depth + 1) ++ "\"enum\": " ++ rendered]
    | .digestString => do
        let rendered <- quoted digestPattern
        pure [indent (depth + 1) ++ "\"pattern\": " ++ rendered]
    | .exactInteger domain => do
        let _ <- checkDomain property domain
        pure [indent (depth + 1) ++ s!"\"minimum\": {domain.minimum}"]
    | .opaqueString => pure []
  let prose <-
    match property.description with
    | some description => do
        let rendered <- quoted description
        pure [indent (depth + 1) ++ "\"description\": " ++ rendered]
    | none => pure []
  let body := siblings ((typeRow :: constraint ++ prose).map fun row => [row])
  return [indent depth ++ name ++ ": {"] ++ body ++ [indent depth ++ "}"]

/-- An object schema: `type`, `additionalProperties`, `required`, `properties`,
    in that order and no other. -/
private def objectSchema (ast : ProjectionAst) (depth : Nat) (rows : List Property)
    : Except String (List String) := do
  let required <-
    scalarArray ((rows.filter (fun row => !row.optional)).map (fun row => row.wireName))
  let bodies <- rows.mapM (fun row => propertyLines ast (depth + 1) row)
  let propertyBlock :=
    [indent depth ++ "\"properties\": {"] ++ siblings bodies ++ [indent depth ++ "}"]
  return siblings
    [ [indent depth ++ "\"type\": \"object\""]
    , [indent depth ++ "\"additionalProperties\": false"]
    , [indent depth ++ "\"required\": " ++ required]
    , propertyBlock ]

/-! ## The tool list, in the model's own order -/

/-- One tool: the reviewed row for an `Act` constructor, checked against the
    tool-name rule. -/
private def toolRow (constructorName : String) : Except String ToolRow :=
  match tools.find? (fun row => row.constructorName == constructorName) with
  | none =>
      .error s!"json-schema: the model declares the generator {constructorName} and the tool \
table carries no row for it"
  | some row =>
      if row.wireName == toolPrefix ++ constructorName then .ok row
      else
        .error s!"json-schema: {row.wireName} is not the tool-name rule's spelling of \
{constructorName}"

private def toolLines (ast : ProjectionAst) (depth : Nat) (ctor : Constructor)
    : Except String (List String) := do
  let constructorName := eraseName ctor.name
  let row <- toolRow constructorName
  let mandatory <- expand ast row.wireName "Act" constructorName ctor.fields []
  let rows <-
    if row.wireName == "kernel_trigger" then triggerSlots ast mandatory else pure mandatory
  let schema <- objectSchema ast (depth + 2) rows
  return [indent depth ++ "{"] ++
    siblings
      [ [indent (depth + 1) ++ "\"name\": " ++ (<- quoted row.wireName)]
      , [indent (depth + 1) ++ "\"description\": " ++ (<- quoted row.description)]
      , [indent (depth + 1) ++ "\"input_schema\": {"] ++ schema ++ [indent (depth + 1) ++ "}"] ] ++
    [indent depth ++ "}"]

/-! ## Provenance

Two digests and nothing else. A rendered surface that must say where it came
from says a digest, never a location: the projection AST this emission read,
and the canonical form of the reviewed manifest it read it against.
-/

/-- The reviewed manifest in one deterministic text, so that a changed row
    moves the emitted provenance even when it does not move a schema byte. -/
def conventionText : String :=
  String.intercalate "\n"
    ([ toolPrefix, digestPattern, headerComment, digestComment, refusalComment ] ++
      tools.map (fun row => s!"tool {row.constructorName} {row.wireName} {row.description}") ++
      properties.map (fun row =>
        s!"property {row.tool} {row.wireName} {repr row.source} {row.rule.wire} \
{row.optional} {row.description}") ++
      carriers.map (fun entry => s!"carrier {entry.1} {repr entry.2}") ++
      triggers.map (fun row =>
        s!"trigger {row.production} {row.constructorName} {row.slots}") ++
      citations.map (fun row =>
        s!"citation {row.law} {row.status.wire} {row.citedBy}")) ++ "\n"

/-- The projection AST in one deterministic text. -/
def modelText (ast : ProjectionAst) : String :=
  (Lean.toJson ast).compress

/-! ## The whole file -/

/-- Print the tool schema. Every refusal names what it refused and why; a
    surface that cannot say what it is never reaches the tree. -/
def render (ast : ProjectionAst) : Except String String := do
  let _ <- checkVocabulary
  let _ <- checkCitations
  let _ <- checkRowHomes ast
  let _ <- checkTriggers ast
  let act <- findDecl ast "Act"
  let toolBlocks <- act.constructors.mapM (fun ctor => toolLines ast 2 ctor)
  let refusal <- findDecl ast "Refusal"
  let refusalCtor <- findCtor refusal "mk"
  let carried <- expand ast "refusal_result" "Refusal" "mk" refusalCtor.fields []
  let derivedRows :=
    properties.filter fun row =>
      row.tool == "refusal_result" &&
        match row.source with
        | .enumerationOf _ => true
        | .field .. => false
  let refusalRows <- derivedRows.foldlM (fun seen row => do merge seen (<- propertyOf ast row)) carried
  let refusalSchema <- objectSchema ast 2 refusalRows
  let provenance :=
    headerComment ++ " Model " ++ Sha.digestOf (modelText ast) ++
      "; convention " ++ Sha.digestOf conventionText ++ "."
  let body := siblings
    [ [indent 1 ++ "\"$comment\": " ++ (<- quoted provenance)]
    , [indent 1 ++ "\"digest_format\": {"] ++
        siblings
          [ [indent 2 ++ "\"$comment\": " ++ (<- quoted digestComment)]
          , [indent 2 ++ "\"type\": \"string\""]
          , [indent 2 ++ "\"pattern\": " ++ (<- quoted digestPattern)] ] ++
        [indent 1 ++ "}"]
    , [indent 1 ++ "\"tools\": ["] ++ siblings toolBlocks ++ [indent 1 ++ "]"]
    , [indent 1 ++ "\"refusal_result\": {"] ++
        siblings
          [ [indent 2 ++ "\"$comment\": " ++ (<- quoted refusalComment)]
          , refusalSchema ] ++
        [indent 1 ++ "}"] ]
  return String.intercalate "\n" (["{"] ++ body ++ ["}"]) ++ "\n"

end Unity.JsonSchema
