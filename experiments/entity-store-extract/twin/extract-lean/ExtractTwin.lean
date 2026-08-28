/-
E2 extractor twin — the second Stage-1 instrument (TOOLS.md pending row).

Instrument: lean4-tree-sitter (predictable-machines/lean4-tree-sitter,
rev 3a57f55e1401484251cfe80e26583d9ed94c82c8, v0.2.4) over the vendored
tree-sitter core v0.24.7 and tree-sitter-typescript grammar
75b3874edb2dc714fb1fd77a32013d0f8699989f — the C FFI seam.

Contract: re-derive `experiments/entity-store-extract/inventory.json`
from the same pinned bytes, byte-identical EXCEPT the two fields that
name the instrument (`extractor.instrument`, `extractor.instrumentVersion`)
— a twin that copied those would be impersonating the other instrument.
The cross-instrument harness enforces exactly that comparison.

Known parse defect, held honestly: the pinned grammar cannot parse the
`<in E>` variance annotation on `Filter` / `FilterGroup` (two 1-byte
ERROR nodes). Neither class extends `Base`, so neither is in the walk;
this program refuses to emit if any ERROR/MISSING node intersects a
byte range it actually read (see `assertErrorsDisjoint`).

Pin verification note: the git-blob SHA-1 pre-check lives in the TS
extractor and in the cross-instrument harness (as an Effect Schema);
this twin trusts the harness to have verified the bytes it is handed.
-/
import TreeSitter.Index

open TreeSitter.FFI TreeSitter.Extract

-- ═══════════════════ JSON (JSON.stringify(x, null, 2) replica) ═══════════════════

inductive J where
  | str (s : String)
  | int (i : Int)
  | bool (b : Bool)
  | arr (xs : Array J)
  | obj (fields : Array (String × J))

private def hexDigits : Array Char := "0123456789abcdef".toList.toArray

/-- JS `JSON.stringify` string escaping: `"`, `\`, \b \t \n \f \r named;
    other control chars as `\u00xx` lowercase; everything else literal. -/
def jsEscape (s : String) : String := Id.run do
  let mut out := ""
  for c in s.toList do
    out := out ++ (
      if c == '"' then "\\\""
      else if c == '\\' then "\\\\"
      else if c == '\n' then "\\n"
      else if c == '\r' then "\\r"
      else if c == '\t' then "\\t"
      else if c.toNat == 0x08 then "\\b"
      else if c.toNat == 0x0C then "\\f"
      else if c.toNat < 0x20 then
        let n := c.toNat
        "\\u00" ++ String.ofList [hexDigits[n / 16]!, hexDigits[n % 16]!]
      else String.ofList [c])
  return out

private def indent (depth : Nat) : String := String.ofList (List.replicate (depth * 2) ' ')

partial def J.render (j : J) (depth : Nat) : String :=
  match j with
  | .str s => "\"" ++ jsEscape s ++ "\""
  | .int i => toString i
  | .bool b => if b then "true" else "false"
  | .arr xs =>
    if xs.isEmpty then "[]"
    else
      "[\n"
        ++ String.intercalate ",\n"
            (xs.toList.map fun x => indent (depth + 1) ++ x.render (depth + 1))
        ++ "\n" ++ indent depth ++ "]"
  | .obj fields =>
    if fields.isEmpty then "{}"
    else
      "{\n"
        ++ String.intercalate ",\n"
            (fields.toList.map fun (k, v) =>
              indent (depth + 1) ++ "\"" ++ jsEscape k ++ "\": " ++ v.render (depth + 1))
        ++ "\n" ++ indent depth ++ "}"

-- ═══════════════════ pins and name tables (extract.ts mirror) ═══════════════════

def pinCommit : String := "0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07"
def pinPackage : String := "effect@4.0.0-rc.111"
def pinAstBlob : String := "e99d7f473b4ecc0e6ba919ddbc98bb0dace8fe40"
def pinRepBlob : String := "6282ab9cbf5c7a50b79580065881b5a6c5799aae"

def inventorySchemaVersion : Nat := 1

/-- Twin identity: the two fields the harness exempts from byte-identity. -/
def instrumentName : String := "lean4-tree-sitter"
def instrumentVersion : String := "0.2.4+3a57f55e1401484251cfe80e26583d9ed94c82c8"

/-- Insertion-order irrelevant (used as a membership set). -/
def closureBearingNames : Array String :=
  #["Annotations", "DeclarationRun", "Encoding", "Checks", "Check",
    "Filter", "FilterGroup", "Link", "Transformation", "Middleware", "Getter"]

/-- JS `[...set].sort()` result, fixed. -/
def closureBearingSorted : Array String :=
  #["Annotations", "Check", "Checks", "DeclarationRun", "Encoding",
    "Filter", "FilterGroup", "Getter", "Link", "Middleware", "Transformation"]

def derivedCacheFields : Array String :=
  #["TemplateLiteral.encodedParts", "TemplateLiteral.literals", "TemplateLiteral.suffixLengths"]

-- ═══════════════════ word-boundary matching (JS \bname\b replica) ═══════════════════

private def isWordChar (c : Char) : Bool :=
  ('a' ≤ c && c ≤ 'z') || ('A' ≤ c && c ≤ 'Z') || ('0' ≤ c && c ≤ '9') || c == '_'

/-- `new RegExp("\\b" ++ word ++ "\\b").test hay` for a word made of word chars. -/
def containsWord (hay word : String) : Bool := Id.run do
  let h := hay.toList.toArray
  let w := word.toList.toArray
  if w.size == 0 || h.size < w.size then return false
  for i in List.range (h.size - w.size + 1) do
    let mut all := true
    for j in List.range w.size do
      if h[i + j]! != w[j]! then all := false
    if all then
      let beforeOk := i == 0 || !isWordChar h[i - 1]!
      let afterOk := i + w.size == h.size || !isWordChar h[i + w.size]!
      if beforeOk && afterOk then return true
  return false

def referencesClosureName (typeText : String) : Bool :=
  closureBearingNames.any (containsWord typeText)

-- ═══════════════════ tree helpers ═══════════════════

def allChildren (n : TSNode) : IO (Array TSNode) := do
  let c ← n.childCount
  let mut out := #[]
  for i in List.range c.toNat do
    out := out.push (← n.child i.toUInt32)
  return out

def namedChildrenOf (n : TSNode) : IO (Array TSNode) := do
  let c ← n.namedChildCount
  let mut out := #[]
  for i in List.range c.toNat do
    out := out.push (← n.namedChild i.toUInt32)
  return out

def textOf (src : String) (n : TSNode) : IO String := do
  return extractText src (← n.startByte) (← n.endByte)

def line1 (n : TSNode) : IO Nat := do
  return (← n.startRow).toNat + 1

def rangeOf (n : TSNode) : IO (Nat × Nat) := do
  return ((← n.startByte).toNat, (← n.endByte).toNat)

/-- Field lookup returning none for the null node. -/
def fieldOf (n : TSNode) (name : String) : IO (Option TSNode) := do
  let f ← n.childByFieldName name
  if ← f.isNull then return none else return some f

partial def subtreeHasType (n : TSNode) (ty : String) : IO Bool := do
  if (← n.type) == ty then return true
  for c in ← allChildren n do
    if ← subtreeHasType c ty then return true
  return false

partial def collectErrors (n : TSNode) (acc : Array (Nat × Nat)) : IO (Array (Nat × Nat)) := do
  let ty ← n.type
  let r ← rangeOf n
  let mut acc := if ty == "ERROR" || ty == "MISSING" then acc.push r else acc
  for c in ← allChildren n do
    acc ← collectErrors c acc
  return acc

/-- The inner type node of a `type_annotation` (`: T` → `T`). -/
def annotationType (annot : TSNode) : IO (Option TSNode) := do
  if (← annot.namedChildCount) == 0 then return none
  return some (← annot.namedChild 0)

-- ═══════════════════ inventory model (extract.ts mirror) ═══════════════════

structure FieldEntry where
  name : String
  typeText : String
  kind : String     -- "data" | "closure" | "closure-bearing" | "derived-cache"
  kindBy : String   -- "syntax" | "name-table"
  declLine : Nat
  optional : Bool

structure CtorParam where
  name : String
  typeText : String
  optional : Bool
  hasDefault : Bool

structure VariantEntry where
  variant : String
  tagLiteral : String
  unionIndex : Int
  declLine : Nat
  tagDeclLine : Nat
  fields : Array FieldEntry
  ctorParams : Array CtorParam

-- ═══════════════════ enumerations ═══════════════════

/-- Top-level statements as (outer, decl): `export_statement` unwrapped. -/
def topStatements (root : TSNode) : IO (Array (TSNode × TSNode)) := do
  let mut out := #[]
  for c in ← namedChildrenOf root do
    if (← c.type) == "export_statement" then
      match ← fieldOf c "declaration" with
      | some d => out := out.push (c, d)
      | none => out := out.push (c, c)
    else
      out := out.push (c, c)
  return out

/-- TS `refName`: identifier of a type reference, qualified names by their right part. -/
partial def refName (src : String) (n : TSNode) : IO (Option String) := do
  match ← n.type with
  | "type_identifier" => return some (← textOf src n)
  | "nested_type_identifier" =>
    match ← fieldOf n "name" with
    | some nm => return some (← textOf src nm)
    | none => return none
  | "generic_type" =>
    match ← fieldOf n "name" with
    | some nm => refName src nm
    | none => return none
  | _ => return none

partial def flattenUnion (n : TSNode) : IO (Array TSNode) := do
  if (← n.type) == "union_type" then
    let mut out := #[]
    for k in ← namedChildrenOf n do
      out := out ++ (← flattenUnion k)
    return out
  else
    return #[n]

/-- A / D: a top-level `export type <name> = A | B | ...` union alias. -/
def enumUnionAliasNamed (src : String) (root : TSNode) (aliasName : String)
    (use : TSNode → IO Unit) : IO (Array String) := do
  for (outer, decl) in ← topStatements root do
    if (← decl.type) == "type_alias_declaration" then
      match ← fieldOf decl "name" with
      | some nm =>
        if (← textOf src nm) == aliasName then
          use outer
          match ← fieldOf decl "value" with
          | some value =>
            if (← value.type) != "union_type" then
              throw (IO.userError s!"cross-check: {aliasName} alias is not a union type")
            let mut out := #[]
            for m in ← flattenUnion value do
              match ← refName src m with
              | some n => out := out.push n
              | none => throw (IO.userError s!"cross-check: {aliasName} union member is not a type reference")
            return out
          | none => throw (IO.userError s!"cross-check: {aliasName} alias has no value")
      | none => pure ()
  throw (IO.userError s!"cross-check: type alias {aliasName} not found")

/-- B: every `makeGuard("Tag")` call site, pre-order. -/
partial def enumGuardTags (src : String) (n : TSNode) (use : TSNode → IO Unit) :
    IO (Array String) := do
  let mut out := #[]
  if (← n.type) == "call_expression" then
    match ← fieldOf n "function" with
    | some f =>
      if (← f.type) == "identifier" && (← textOf src f) == "makeGuard" then
        match ← fieldOf n "arguments" with
        | some args =>
          if (← args.namedChildCount) == 1 then
            let a ← args.namedChild 0
            if (← a.type) == "string" && (← a.namedChildCount) == 1 then
              let frag ← a.namedChild 0
              use n
              out := out.push (← textOf src frag)
        | none => pure ()
    | none => pure ()
  for c in ← allChildren n do
    out := out ++ (← enumGuardTags src c use)
  return out

/-- Does this class extend the bare identifier `Base`? -/
def extendsBase (src : String) (cls : TSNode) : IO Bool := do
  for c in ← allChildren cls do
    if (← c.type) == "class_heritage" then
      for h in ← allChildren c do
        if (← h.type) == "extends_clause" then
          if (← h.namedChildCount) ≥ 1 then
            let e ← h.namedChild 0
            if (← e.type) == "identifier" && (← textOf src e) == "Base" then
              return true
  return false

/-- Shared member walk: fields (PropertyDeclaration mirror) and ctor params. -/
def classMembers (src : String) (className : String) (body : TSNode)
    (forBase : Bool) : IO (Array FieldEntry × Array CtorParam × Option (String × Nat)) := do
  let mut fields := #[]
  let mut ctorParams := #[]
  let mut tag : Option (String × Nat) := none
  for m in ← namedChildrenOf body do
    let mty ← m.type
    if mty == "public_field_definition" then
      match ← fieldOf m "name" with
      | some nameNode =>
        if (← nameNode.type) == "property_identifier" then
          let name ← textOf src nameNode
          let annot ← fieldOf m "type"
          if name == "_tag" && !forBase then
            match ← fieldOf m "value" with
            | some v =>
              if (← v.type) == "string" && (← v.namedChildCount) == 1 then
                tag := some (← textOf src (← v.namedChild 0), ← line1 m)
            | none => pure ()
          else
            let tyNode ← match annot with
              | some a => annotationType a
              | none => pure none
            let typeText ← match tyNode with
              | some t => textOf src t
              | none => pure "<inferred>"
            let mut kind := "data"
            let mut kindBy := "syntax"
            if forBase then
              if referencesClosureName typeText then
                kind := "closure-bearing"; kindBy := "name-table"
            else
              let isFn ← match tyNode with
                | some t => subtreeHasType t "function_type"
                | none => pure false
              if isFn then
                kind := "closure"
              else if derivedCacheFields.contains s!"{className}.{name}" then
                kind := "derived-cache"; kindBy := "name-table"
              else if referencesClosureName typeText then
                kind := "closure-bearing"; kindBy := "name-table"
            let hasQuestion ← (← allChildren m).anyM (fun c => do pure ((← c.type) == "?"))
            let optional :=
              if forBase then containsWord typeText "undefined"
              else hasQuestion || containsWord typeText "undefined"
            fields := fields.push {
              name, typeText, kind, kindBy
              declLine := ← line1 m
              optional
            }
      | none => pure ()
    else if mty == "method_definition" && !forBase then
      match ← fieldOf m "name" with
      | some nameNode =>
        if (← textOf src nameNode) == "constructor" then
          match ← fieldOf m "parameters" with
          | some params =>
            for p in ← namedChildrenOf params do
              let pty ← p.type
              if pty == "required_parameter" || pty == "optional_parameter" then
                match ← fieldOf p "pattern" with
                | some pat =>
                  if (← pat.type) == "identifier" then
                    let tyNode ← match ← fieldOf p "type" with
                      | some a => annotationType a
                      | none => pure none
                    let typeText ← match tyNode with
                      | some t => textOf src t
                      | none => pure "<inferred>"
                    ctorParams := ctorParams.push {
                      name := ← textOf src pat
                      typeText
                      optional := pty == "optional_parameter"
                      hasDefault := (← fieldOf p "value").isSome
                    }
                | none => pure ()
          | none => pure ()
      | none => pure ()
  return (fields, ctorParams, tag)

/-- C: exported classes `extends Base` with a readonly `_tag` string literal. -/
def enumClasses (src : String) (root : TSNode) (use : TSNode → IO Unit) :
    IO (Array VariantEntry) := do
  let mut out := #[]
  for (outer, decl) in ← topStatements root do
    let dty ← decl.type
    if dty == "class_declaration" || dty == "abstract_class_declaration" then
      if ← extendsBase src decl then
        use outer
        let className ← match ← fieldOf decl "name" with
          | some nm => textOf src nm
          | none => throw (IO.userError "cross-check: Base-extending class without a name")
        match ← fieldOf decl "body" with
        | some body =>
          let (fields, ctorParams, tag) ← classMembers src className body (forBase := false)
          match tag with
          | some (tagLiteral, tagDeclLine) =>
            out := out.push {
              variant := className, tagLiteral
              unionIndex := -1
              declLine := ← line1 outer
              tagDeclLine, fields, ctorParams
            }
          | none =>
            throw (IO.userError s!"cross-check: class {className} extends Base without a string-literal _tag")
        | none => pure ()
  return out

/-- Base fields from `abstract class Base`. -/
def enumBaseFields (src : String) (root : TSNode) (use : TSNode → IO Unit) :
    IO (Array FieldEntry) := do
  for (outer, decl) in ← topStatements root do
    let dty ← decl.type
    if dty == "class_declaration" || dty == "abstract_class_declaration" then
      match ← fieldOf decl "name" with
      | some nm =>
        if (← textOf src nm) == "Base" then
          use outer
          match ← fieldOf decl "body" with
          | some body =>
            let (fields, _, _) ← classMembers src "Base" body (forBase := true)
            return fields
          | none => pure ()
      | none => pure ()
  throw (IO.userError "cross-check: abstract class Base not found")

/-- E: the `RepresentationUnion` runtime array. -/
partial def enumRuntimeArray (src : String) (n : TSNode) (use : TSNode → IO Unit) :
    IO (Option (Array String)) := do
  if (← n.type) == "variable_declarator" then
    match ← fieldOf n "name" with
    | some nm =>
      if (← nm.type) == "identifier" && (← textOf src nm) == "RepresentationUnion" then
        match ← fieldOf n "value" with
        | some value =>
          if (← value.type) == "call_expression" then
            match ← fieldOf value "arguments" with
            | some args =>
              if (← args.namedChildCount) ≥ 1 then
                let arr ← args.namedChild 0
                if (← arr.type) == "array" then
                  use n
                  let mut out := #[]
                  for e in ← namedChildrenOf arr do
                    let ety ← e.type
                    if ety == "call_expression" then
                      let ok ← do
                        match ← fieldOf e "function" with
                        | some f => pure ((← f.type) == "identifier" && (← textOf src f) == "makeKeywordSchema")
                        | none => pure false
                      if ok then
                        match ← fieldOf e "arguments" with
                        | some eargs =>
                          if (← eargs.namedChildCount) ≥ 1 then
                            let s ← eargs.namedChild 0
                            if (← s.type) == "string" && (← s.namedChildCount) == 1 then
                              out := out.push (← textOf src (← s.namedChild 0))
                            else
                              throw (IO.userError "cross-check: unrecognized RepresentationUnion element")
                        | none =>
                          throw (IO.userError "cross-check: unrecognized RepresentationUnion element")
                      else
                        throw (IO.userError "cross-check: unrecognized RepresentationUnion element")
                    else if ety == "identifier" then
                      let name ← textOf src e
                      if name.endsWith "Schema" then
                        out := out.push (name.dropEnd "Schema".length).toString
                      else
                        throw (IO.userError "cross-check: unrecognized RepresentationUnion element")
                    else
                      throw (IO.userError "cross-check: unrecognized RepresentationUnion element")
                  return some out
            | none => pure ()
        | none => pure ()
    | none => pure ()
  for c in ← allChildren n do
    if let some r ← enumRuntimeArray src c use then
      return some r
  return none

-- ═══════════════════ cross-checks (census §7 item 6) ═══════════════════

def setEq (a b : Array String) : Bool :=
  a.size == (a.toList.eraseDups).length &&
  b.size == (b.toList.eraseDups).length &&
  a.size == b.size &&
  String.intercalate " " (a.qsort (· < ·)).toList == String.intercalate " " (b.qsort (· < ·)).toList

-- ═══════════════════ emit ═══════════════════

def fieldJ (f : FieldEntry) : J :=
  .obj #[
    ("name", .str f.name),
    ("typeText", .str f.typeText),
    ("kind", .str f.kind),
    ("kindBy", .str f.kindBy),
    ("declLine", .int f.declLine),
    ("optional", .bool f.optional)]

def ctorParamJ (p : CtorParam) : J :=
  .obj #[
    ("name", .str p.name),
    ("typeText", .str p.typeText),
    ("optional", .bool p.optional),
    ("hasDefault", .bool p.hasDefault)]

def variantJ (v : VariantEntry) : J :=
  .obj #[
    ("variant", .str v.variant),
    ("tagLiteral", .str v.tagLiteral),
    ("unionIndex", .int v.unionIndex),
    ("declLine", .int v.declLine),
    ("tagDeclLine", .int v.tagDeclLine),
    ("fields", .arr (v.fields.map fieldJ)),
    ("ctorParams", .arr (v.ctorParams.map ctorParamJ))]

-- ═══════════════════ main ═══════════════════

def assertErrorsDisjoint (file : String) (errors consumed : Array (Nat × Nat)) : IO Unit := do
  for (es, ee) in errors do
    for (cs, ce) in consumed do
      if es < ce && cs < ee then
        throw (IO.userError
          s!"{file}: ERROR node [{es},{ee}) intersects a consumed range [{cs},{ce}) — refusing to emit")

def main (args : List String) : IO UInt32 := do
  let srcDir := args.head? |>.getD "../../e2/src-cache"
  let outPath := args[1]? |>.getD "inventory.treesitter.json"
  let astText ← IO.FS.readFile s!"{srcDir}/SchemaAST.ts"
  let repText ← IO.FS.readFile s!"{srcDir}/SchemaRepresentation.ts"

  let astTree ← parseSource treeSitterTypescript astText
  let repTree ← parseSource treeSitterTypescript repText
  let astRoot ← astTree.rootNode
  let repRoot ← repTree.rootNode

  let astConsumed ← IO.mkRef (#[] : Array (Nat × Nat))
  let repConsumed ← IO.mkRef (#[] : Array (Nat × Nat))
  let useAst : TSNode → IO Unit := fun n => do astConsumed.modify (·.push (← rangeOf n))
  let useRep : TSNode → IO Unit := fun n => do repConsumed.modify (·.push (← rangeOf n))

  let union ← enumUnionAliasNamed astText astRoot "AST" useAst
  let guards ← enumGuardTags astText astRoot useAst
  let variants ← enumClasses astText astRoot useAst
  let baseFields ← enumBaseFields astText astRoot useAst
  let repUnion ← enumUnionAliasNamed repText repRoot "Representation" useRep
  let runtimeArr ← match ← enumRuntimeArray repText repRoot useRep with
    | some r => pure r
    | none => throw (IO.userError "cross-check: RepresentationUnion array not found")

  -- parse-defect containment: no ERROR/MISSING node may touch a consumed range
  let astErrors ← collectErrors astRoot #[]
  let repErrors ← collectErrors repRoot #[]
  assertErrorsDisjoint "SchemaAST.ts" astErrors (← astConsumed.get)
  assertErrorsDisjoint "SchemaRepresentation.ts" repErrors (← repConsumed.get)

  -- unionIndex fill + sort by variant name
  let variants := variants.map fun v =>
    { v with unionIndex := (union.findIdx? (· == v.variant)).map Int.ofNat |>.getD (-1) }
  let variants := variants.qsort (fun a b => a.variant < b.variant)

  -- cross-checks
  let classNames := variants.map (·.variant)
  let classTags := variants.map (·.tagLiteral)
  let mut failures : Array String := #[]
  if union.size != 21 then
    failures := failures.push s!"AST union alias has {union.size} members, expected 21"
  if !setEq union classNames then
    failures := failures.push "union alias ≠ Base-extending classes"
  if !setEq guards classTags then
    failures := failures.push "makeGuard tags ≠ class _tag literals"
  let expectedRep := union.push "Reference"
  if !setEq repUnion expectedRep then
    failures := failures.push "Representation union ≠ AST union + Reference"
  if !setEq runtimeArr repUnion then
    failures := failures.push "RepresentationUnion runtime array ≠ Representation type union"
  if !failures.isEmpty then
    IO.eprintln "CROSS-CHECK FAILURES:"
    for f in failures do IO.eprintln s!"  - {f}"
    return 1

  let inventory : J := .obj #[
    ("schemaVersion", .int inventorySchemaVersion),
    ("source", .obj #[
      ("repository", .str "Effect-TS/effect"),
      ("commit", .str pinCommit),
      ("package", .str pinPackage),
      ("files", .arr #[
        .obj #[
          ("path", .str "packages/effect/src/SchemaAST.ts"),
          ("gitBlobSha1", .str pinAstBlob)],
        .obj #[
          ("path", .str "packages/effect/src/SchemaRepresentation.ts"),
          ("gitBlobSha1", .str pinRepBlob)]])]),
    ("extractor", .obj #[
      ("name", .str "e2-extract"),
      ("instrument", .str instrumentName),
      ("instrumentVersion", .str instrumentVersion),
      ("mode", .str "syntax-only"),
      ("nameTables", .obj #[
        ("closureBearing", .arr (closureBearingSorted.map J.str)),
        ("derivedCache", .arr (derivedCacheFields.map J.str))])]),
    ("counts", .obj #[
      ("variants", .int variants.size),
      ("unionAlias", .int union.size),
      ("guardTags", .int guards.size),
      ("representationUnion", .int repUnion.size),
      ("runtimeArray", .int runtimeArr.size)]),
    ("baseFields", .arr (baseFields.map fieldJ)),
    ("variants", .arr (variants.map variantJ))]

  IO.FS.writeFile outPath (inventory.render 0 ++ "\n")
  IO.println
    (s!"inventory written: {variants.size} variants; enumerations " ++
     s!"{union.size}/{guards.size}/{repUnion.size}/{runtimeArr.size} agree")
  return 0
