import Cas.Core.Node
import Cas.Values.Json
import Cas.Schema.Declarations
import Cas.Schema.Union

/-!
# The codes — the canonical schema, Lean side

The root schema language as data. Identity is structural everywhere:
no code's meaning lives in a function (the carrier-adequacy law), so
every code is comparable, encodable, and — through the node envelope —
content-addressable.

This is increment 1 of the universe: the closed, non-recursive
fragment mirroring the TypeScript v0 constructor set exactly
(`Null/Boolean/Integer/String/Literal/Array/Struct/Ref`). Increment 2
adds recursion as NAMED definition environments (the shape tree-sitter
grammars and JSON Schema `$defs` actually have), with conformance as
an inductive predicate and a fueled sound-and-complete checker — the
admission pattern, applied to schemas.

`WF` is the canonical-fields discipline (no duplicate field names —
what makes the encode/decode round trip total on the encode side);
strict sortedness, which byte-level canonicality adds on top, arrives
with the rendering theorem.
-/

namespace Cas.Schema

/-- The safe-integer bound: the one number range whose decimal
rendering is language-neutral (CAS-004). -/
def maxSafeNat : Nat := 9007199254740991

/-- A safe integer. -/
abbrev SafeInt := { i : Int // i.natAbs ≤ maxSafeNat }

/-- A literal a schema can pin. -/
inductive LitVal where
  | null
  | bool (b : Bool)
  | int (i : SafeInt)
  | str (s : String)
  deriving DecidableEq

/-- The codes. A struct field is `(name, optional, code)`. -/
inductive Ast where
  | null
  | bool
  | int
  | str
  | lit (v : LitVal)
  | arr (item : Ast)
  | struct (fields : List (String × Bool × Ast))
  | ref (tag : UInt8)
  /-- The general declaration code (increment C-decl): Effect's opaque
  `Declaration` as content — a registry id, a first-order payload, and
  the type parameters, exactly the persisted shape
  (`SchemaRepresentation.ts:144-153`).

  `id` ranges over `DeclarationId.General`, so an unadmitted
  declaration has no spelling here at all: admission is by
  construction, and the door names what it refuses. Row zero of the
  registry, `foldlab/cas/ref`, is NOT general — it keeps its dedicated
  code `.ref`, which is what keeps the revision-1 projection injective.
  Whether `.ref` should later become sugar for this code is an operator
  ruling, recorded and not taken. -/
  | decl (id : DeclarationId.General) (payload : DeclPayload)
      (typeParameters : List Ast)

mutual

/-- Canonical-fields well-formedness: every struct's fields are in
STRICT sorted name order — so the only admissible spelling of a struct
is the canonical one, and the Lean identity agrees with the sorted
canonical-JSON identity on the TypeScript side by construction. Strict
order subsumes no-duplicates, which is what the round trip needs.

On a declaration this is the registry's own discipline read off the
row: the payload is one the id admits and the type parameters are as
many as the id takes. WHICH ids exist is not asked here — that is
settled by the carrier (`DeclarationId.General`); this clause asks only
whether the row's contract is honoured. -/
def Ast.WF : Ast → Prop
  | .arr a => a.WF
  | .struct fs => List.Pairwise (fun a b => a.1 < b.1) fs ∧ WFFields fs
  | .decl id p ps => id.PayloadWF p ∧ ps.length = id.arity ∧ WFParams ps
  | _ => True

def WFFields : List (String × Bool × Ast) → Prop
  | [] => True
  | (_, _, a) :: fs => a.WF ∧ WFFields fs

/-- A declaration's type parameters are codes, each well-formed. -/
def WFParams : List Ast → Prop
  | [] => True
  | a :: as => a.WF ∧ WFParams as

end

/-- Strictly sorted field names never repeat. -/
theorem sorted_names_nodup {fs : List (String × Bool × Ast)}
    (h : List.Pairwise (fun a b => a.1 < b.1) fs) :
    (fs.map (fun f => f.1)).Nodup := by
  induction h with
  | nil => simp
  | cons hhead _ ih =>
    simp only [List.map_cons, List.nodup_cons]
    refine ⟨?_, ih⟩
    intro hmem
    rcases List.mem_map.mp hmem with ⟨f, hf, heq⟩
    have hlt := hhead f hf
    rw [heq] at hlt
    exact absurd hlt (String.lt_irrefl _)

end Cas.Schema
