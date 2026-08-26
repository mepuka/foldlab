/-
Obligation ledger, unison-fragment style: named Props, statements only, deliberately
nothing frozen and nothing proved here except what is cheap congruence or decidable —
each proved item says so. The agent-drive rules (kickoff §10) make these the work queue:
one obligation per proof seat, statement pinned, gate adjudicates.
-/
import E2.Core
import E2.Encode
import E2.Canon

namespace E2

/-! ## Identity assembly (kickoff §5, L6): version and kind in the pre-image. -/

def versionByte : UInt8 := 0x01
def kindSchema  : UInt8 := 0x00
def kindEntity  : UInt8 := 0x01

def preimageS (s : SchemaCore) : List UInt8 :=
  versionByte :: kindSchema :: encSchema (canonS s)

/-- Entity pre-image: the kind separator for entities is the schema's own address.
    Q11 (2026-08-25): the value is canonicalized — dedup is a theorem for entities too
    (M12E), never a property of the hash. -/
def preimageE (schemaAddr : Address) (v : Value) : List UInt8 :=
  versionByte :: kindEntity :: (encAddress schemaAddr ++ encValue (canonV v))

def addressS (H : List UInt8 → Address) (s : SchemaCore) : Address :=
  H (preimageS s)

/-! ## Proved now (cheap, real) -/

/-- Direction A of schema identity: pure congruence, no cryptographic assumption
    (E1 T11 shape). -/
theorem directionA (H : List UInt8 → Address) (s₁ s₂ : SchemaCore)
    (h : canonS s₁ = canonS s₂) : addressS H s₁ = addressS H s₂ := by
  simp [addressS, preimageS, h]

/-- K1 kind separation at the pre-image layer: a schema pre-image never equals an entity
    pre-image — the kind byte differs. Address-level disjointness is this plus collision
    resistance, stated conditionally elsewhere. -/
theorem kind_separation (s : SchemaCore) (a : Address) (v : Value) :
    preimageS s ≠ preimageE a v := by
  intro h
  simp [preimageS, preimageE, versionByte, kindSchema, kindEntity] at h

/-! ## Stated only — the ledger (gate G1 targets; wording per kickoff §5) -/

/-- F/S: framed schema encoding is injective. The load-bearing layer-(b) obligation. -/
def ObligationEncodeSchemaInjective : Prop :=
  ∀ s₁ s₂ : SchemaCore, encSchema s₁ = encSchema s₂ → s₁ = s₂

/-- F/V: framed value encoding is injective. -/
def ObligationEncodeValueInjective : Prop :=
  ∀ v₁ v₂ : Value, encValue v₁ = encValue v₂ → v₁ = v₂

/-- S1 — AMENDED 2026-08-25: the unconditional form was FALSIFIED by kernel-checked
    counterexample (scenario scout, probe3: a duplicate-key run reverses under
    `insertField`, making canon an involution there; STORE-MODEL §7 A-3 record).
    Idempotence is claimed only on duplicate-free schemas — exactly the §5 clause-4
    admission `WFS` now enforces (A-3, implemented 2026-08-25).

    RESTATED 2026-08-25 (W3-19, finding F-48) — the note above STAYS: that falsification
    was real and is recorded, never erased (Q10 discipline). What changed is the equation
    it falsified. F-48 located the involution in a single comparison, and W3-19 flipped
    it: `insertField` is now a STABLE insertion sort, so `canonS` is idempotent on ALL
    schemas, duplicate keys included. The `dupFreeS` hypothesis is therefore dropped and
    S1 returns to unconditional form. Ruled to land only after the boundary
    well-formedness check went live (merge af13824); `dupFreeS` keeps its independent
    §5 clause-4 duty. -/
def ObligationCanonIdempotent : Prop :=
  ∀ s : SchemaCore, canonS (canonS s) = canonS s

/-- S2 (half): canonical object fields are sorted by key. -/
def ObligationCanonSorts : Prop :=
  ∀ fs : FieldList, fieldsSortedB (canonFields fs) = true

/-- S1 value twin (Q11) — AMENDED 2026-08-25 with the schema half: unconditional form
    falsified the same way on duplicate-key `vobj` runs; conditional on duplicate-free
    values. (A JS object cannot carry duplicate keys, so the excluded values have no
    host counterpart — the boundary rejects them; STORE-MODEL §7 A-3 record.)

    RESTATED 2026-08-25 (W3-19, finding F-48), in step with the schema half — the note
    above STAYS, including its parenthetical, which W3-9 had already refuted by
    model-internal construction (F-28: duplicate-key values are reachable via `.record`
    and `.lit`, so this obligation was vacuous exactly where F-12 bit). `insertVField`
    carries the identical tie mechanism and takes the identical flip
    (plane-inheritance, CONTEXT.md), so `canonV` is a stable, idempotent sort on ALL
    values and the `dupFreeV` hypothesis is dropped. The restatement is not merely a
    weakening removal here: it makes the twin say something on the carriers F-28 showed
    were reachable all along. -/
def ObligationCanonVIdempotent : Prop :=
  ∀ v : Value, canonV (canonV v) = canonV v

/-- A2 / Direction B: conditional on digest injectivity, equal addresses give equal
    canonical forms. The hypothesis is a premise, never an axiom (E1 T12 shape). -/
def ObligationDirectionB : Prop :=
  ∀ H : List UInt8 → Address, Function.Injective H →
    ∀ s₁ s₂ : SchemaCore, addressS H s₁ = addressS H s₂ → canonS s₁ = canonS s₂

/-- D2 scoped injectivity and D3 source-derivability (spine thesis 2) are stated at the
    admission layer, which this scratch project does not yet carry; recorded here so the
    ledger is complete. -/
def ObligationD2D3Pending : Prop := True

end E2
