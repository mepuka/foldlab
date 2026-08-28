import Cas.Schema.Deriving
import Cas.Schema.SelfCodec

/-!
# `cas_struct` — the kind-authoring notation

One declaration, three artifacts:

```
cas_struct Sample where
  label : String
  count : SafeInt
```

elaborates to the native structure, its `Described` instance (the
canonical schema code plus the carrier equivalence, via the deriving
handler), and the raw-schema surface:

- `Sample.schemaCode : Ast` — the code the structure is described by;
- `Sample.rawSchema : String` — the canonical schema-node payload
  (`SelfCodec`), the byte form the cross-runtime pin compares.

The notation is deliberately the FORWARD-LOOKING seam: literal pins,
kind tags, unions, and named recursion land here as the universe
grows, without touching call sites. Like `Cas.Schema.Deriving`, this
module keeps compiler metaprogramming an opt-in import — tools and
examples import it; the runtime facade does not.
-/

namespace Cas.Schema.Notation

open Lean

/-- One field: `name : type`. -/
syntax casSchemaField := ident " : " term

/-- The kind-authoring notation. A doc comment, when given, lands on
the generated structure. -/
syntax (docComment)? "cas_struct " ident " where "
  withPosition((colGe casSchemaField ppLine)*) : command

macro_rules
  | `($[$doc:docComment]? cas_struct $name:ident where $fields:casSchemaField*) => do
    let mut binders : Array (TSyntax ``Lean.Parser.Command.structExplicitBinder) := #[]
    for f in fields do
      match f with
      | `(casSchemaField| $fname:ident : $ftype:term) =>
        binders := binders.push
          (← `(Lean.Parser.Command.structExplicitBinder| ($fname:ident : $ftype)))
      | _ => Macro.throwUnsupported
    let codeId := mkIdentFrom name (name.getId ++ `schemaCode)
    let rawId := mkIdentFrom name (name.getId ++ `rawSchema)
    let structCmd ← `($[$doc:docComment]? structure $name where
      $[$binders:structExplicitBinder]*
      deriving Cas.Schema.Described)
    let codeCmd ← `(def $codeId : Cas.Schema.Ast :=
      Cas.Schema.Described.code (α := $name))
    let rawCmd ← `(def $rawId : String := Cas.Schema.Ast.payload $codeId)
    return mkNullNode #[structCmd, codeCmd, rawCmd]

end Cas.Schema.Notation
