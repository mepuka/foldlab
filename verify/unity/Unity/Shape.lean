/-
The mini-AST: how the kernel's sort system is written down in the
interchange, and how a type's docstring becomes a record.

Nothing here reads the Lean environment — this file is the vocabulary
and the rendering, so that the deriving side (`Unity/Reflect.lean`,
which asks the environment what the declarations actually are) and the
checking side (`Unity/Shapes.lean`, which asks it again over the
committed bytes) render through one function and can never disagree
about formatting.

A parameter is a BRAND when it is a value the type is indexed by — the
register of a token, the partition of a position, the kind of a digest
— which is the discipline that makes a cross-space comparison fail to
elaborate rather than fail at runtime. Field types are written in a
small reference grammar: a bare name for an unapplied type, and
`Head(arg,...)` for an applied one, where each argument is its own
short name.
-/
import Unity.Canon

namespace Unity.Shape

/-! ## The vocabulary -/

/-- Whether a type parameter is a brand or a type argument. -/
inductive ShapeRole where
  | brand
  | typeArgument
deriving Repr, DecidableEq

/-- The wire spelling of a parameter role. -/
def ShapeRole.wire : ShapeRole -> String
  | .brand => "brand"
  | .typeArgument => "type"

/-- Whether a declaration is an inductive or a structure. -/
inductive ShapeForm where
  | inductiveForm
  | structureForm
deriving Repr, DecidableEq

/-- The wire spelling of a declaration form. -/
def ShapeForm.wire : ShapeForm -> String
  | .inductiveForm => "inductive"
  | .structureForm => "structure"

/-- One constructor field: its name and its type in the reference
    grammar. -/
structure ShapeField where
  name : String
  ref : String
deriving Repr, DecidableEq

/-- One constructor: its short name and its fields in order. -/
structure ShapeCtor where
  name : String
  fields : List ShapeField
deriving Repr, DecidableEq

/-- One type parameter: its binder name and its role. -/
structure ShapeParam where
  name : String
  role : ShapeRole
deriving Repr, DecidableEq

/-- The shape of one kernel type. -/
structure TypeShape where
  name : String
  form : ShapeForm
  params : List ShapeParam
  ctors : List ShapeCtor
deriving Repr, DecidableEq

/-! ## Rendering -/

/-- One mini-AST record as a canonical value. -/
def typeValue (shape : TypeShape) : Canon.Value :=
  .obj
    [ ("record", .str "type")
    , ("name", .str shape.name)
    , ("form", .str shape.form.wire)
    , ("params", .arr (shape.params.map fun param =>
        .obj
          [ ("name", .str param.name)
          , ("role", .str param.role.wire) ]))
    , ("constructors", .arr (shape.ctors.map fun constructor =>
        .obj
          [ ("name", .str constructor.name)
          , ("fields", .arr (constructor.fields.map fun field =>
              .obj
                [ ("name", .str field.name)
                , ("type", .str field.ref) ])) ])) ]

/-- One mini-AST record at the canonical byte form. -/
def typeRow (shape : TypeShape) : String := Canon.render (typeValue shape)

/-- One docstring record as a canonical value. The target key exists so
    that a later docstring group over something other than a type —
    a generator, a refusal reason — is an added value of one key, not
    a new record grammar. -/
def docValue (name doc : String) : Canon.Value :=
  .obj
    [ ("record", .str "doc")
    , ("target", .str "type")
    , ("name", .str name)
    , ("doc", .str doc) ]

/-- One docstring record at the canonical byte form. -/
def docRow (name doc : String) : String := Canon.render (docValue name doc)

/-! ## The ASCII rule for prose

The interchange is ASCII by rule, and the kernel's prose is not: its
docstrings use the typographic em dash. The upstream model is read-only
to this package, so the transliteration happens here, at one named
table, and anything the table does not name is refused rather than
mangled. A future docstring reaching for a non-breaking space reddens
the gate with the code point in the message, which is the outcome a
silent replacement would deny.
-/

/-- The named transliterations from the kernel's prose into ASCII. -/
def transliterations : List (Nat × String) :=
  [ (0x2014, "--") ]

/-- Transliterate one character, or report it. -/
def asciiChar (character : Char) : Except String String :=
  let point := character.toNat
  if point == 0x0a || (point >= 0x20 && point <= 0x7e) then
    .ok (String.singleton character)
  else
    match transliterations.find? (fun entry => entry.1 == point) with
    | some entry => .ok entry.2
    | none =>
        .error s!"shape: a docstring carries code point {point}, which has no ASCII transliteration"

/-- Transliterate a docstring into ASCII, or report the first character
    that has no entry. -/
def asciiDoc (text : String) : Except String String :=
  text.toList.foldl
    (fun accumulated character =>
      match accumulated, asciiChar character with
      | .error reason, _ => .error reason
      | _, .error reason => .error reason
      | .ok prefixText, .ok piece => .ok (prefixText ++ piece))
    (.ok "")

end Unity.Shape
