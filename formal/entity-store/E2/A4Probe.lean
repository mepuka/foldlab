/-
A-4 smoke module — the two values the amendment exists to accept.

Not a gate and not a claim-bearing artifact: `E2/Gates.lean` stays coordinator-only, so
the A-4 receipts live here. Each `example` below is kernel-checked on every build; a
regression in the `tupleRest`/`record` conformance rules fails the build.

The motivating receipts are scout report A (`.staging/scouts/2026-08-25-mapping/`,
`A-expressibility.md` §4/§5, probes in `p03_arrays_objects.lean`):

  - `flat_rejected` — Effect's `TupleWithRest([String, Number], Boolean)` accepts the
    FLAT value `["a", 1, true, false]`, and the only pre-A-4 spelling,
    `.tuple [str, int, .array bool]`, provably REJECTS it (it accepts the nested
    `["a", 1, [true, false]]` instead). The workaround was wrong at the VALUE plane,
    not merely lossy at the identity plane — which is why A-4 is a constructor and not
    an admission rule.
  - `object_exact_width` — `ConformsF` has no rule admitting a value field the schema
    does not name, so `.object` cannot express an index signature at any width.

Both facts are re-proved here against the amended carrier, so the receipts are not
merely cited: the old spelling still rejects the flat value (`nested_still_rejects`),
and the new constructor accepts it (`tupleRest_accepts_flat`).
-/
import E2.Model
import E2.Decode

namespace E2.A4Probe

open E2

/-! ## Smoke 1 — `tupleRest` accepts the flat value the nested spelling rejected.

`TupleWithRest([String, Number], Boolean)`: two positional elements, then a
homogeneous Boolean tail. -/

def tupleRestSchema : SchemaCore :=
  .tupleRest (.cons (.prim .str) (.cons (.prim .int) .nil)) (.prim .bool)

/-- The value Effect accepts and report A's `flat_rejected` proved unreachable before
    A-4: `["a", 1, true, false]` — tail elements FLAT, not nested in a sub-array. -/
def flatValue : Value :=
  .varr (.cons (.vstr "a")
        (.cons (.vint 1)
        (.cons (.vbool true)
        (.cons (.vbool false) .nil))))

/-- SMOKE 1. The flat value now conforms: the prefix `["a", 1]` conforms elementwise to
    the positional elements, and the suffix `[true, false]` conforms-all to the rest
    schema. -/
example (env : ConformsEnv) : Conforms env tupleRestSchema flatValue := by
  exact Conforms.tupleRest
    (.cons (Conforms.prim_str _) (.cons (Conforms.prim_int _) .nil))
    (.cons (Conforms.prim_bool _) (.cons (Conforms.prim_bool _) .nil))

/-- The pre-A-4 spelling report A measured — the rest schema nested as a trailing
    `.array` element. -/
def nestedSpelling : SchemaCore :=
  .tuple (.cons (.prim .str) (.cons (.prim .int) (.cons (.array (.prim .bool)) .nil)))

/-- `flat_rejected`, re-proved against the amended carrier: the old spelling still
    rejects the flat value. This is what makes SMOKE 1 a gain and not a restatement —
    the two schemas accept genuinely different value sets. -/
theorem nested_still_rejects (env : ConformsEnv) :
    ¬ Conforms env nestedSpelling flatValue := by
  intro h
  unfold nestedSpelling flatValue at h
  cases h with
  | tup hl =>
    cases hl with
    | cons _ hl2 =>
      cases hl2 with
      | cons _ hl3 =>
        cases hl3 with
        | cons ha _ => cases ha

/-! ## Smoke 2 — `record` accepts an object with two differently-named keys.

`Record(String, Number)` — a string-keyed index signature. `object_exact_width` showed
`.object` cannot do this: a `FieldList` names its keys, so it fixes the width and the
names. `record` names neither. -/

def recordSchema : SchemaCore := .record (.prim .int)

/-- Two keys, differently named, neither mentioned by the schema. -/
def recordValue : Value :=
  .vobj (.cons "alpha" (.vint 1) (.cons "beta" (.vint 2) .nil))

/-- SMOKE 2. Every field's value conforms to the codomain; the keys are unconstrained
    by `Conforms` (duplicate-freedom stays a boundary admission, per A-3's record). -/
example (env : ConformsEnv) : Conforms env recordSchema recordValue := by
  exact Conforms.record (.cons (Conforms.prim_int _) (.cons (Conforms.prim_int _) .nil))

/-! ## Codec smoke — both new tags round-trip, and the amendment is additive.

M4a is proved unconditionally over the extended carrier, so these are instances, not
new obligations; they are here to catch a tag collision or a frame mistake by
computation rather than by proof. -/

example : decodeSchema (encSchema tupleRestSchema) = some tupleRestSchema :=
  M4a_schema tupleRestSchema

example : decodeSchema (encSchema recordSchema) = some recordSchema :=
  M4a_schema recordSchema

/-- Additivity: the pre-A-4 encoding of the nested spelling is byte-for-byte what it
    was before the amendment. `versionByte` stays 0x01 precisely because 0x3B/0x3C were
    previously in the reject set, so no old encoding changes meaning. -/
example : encSchema nestedSpelling = [0x33, 0x03, 0x30, 0x03, 0x30, 0x02, 0x34, 0x30, 0x01] := by
  simp [nestedSpelling, encSchema, encSchemaList, encNat, encPrim, SchemaList.length]

/-- The pinned tags, exhibited: `tupleRest` opens with 0x3B (then the element-count
    frame, the elements, and the rest schema), `record` with 0x3C. -/
example : encSchema tupleRestSchema = [0x3B, 0x02, 0x30, 0x03, 0x30, 0x02, 0x30, 0x01] := by
  simp [tupleRestSchema, encSchema, encSchemaList, encNat, encPrim, SchemaList.length]

example : encSchema recordSchema = [0x3C, 0x30, 0x02] := rfl

#print axioms nested_still_rejects

end E2.A4Probe
