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

/-- S1: canonicalization is idempotent. -/
def ObligationCanonIdempotent : Prop :=
  ∀ s : SchemaCore, canonS (canonS s) = canonS s

/-- S2 (half): canonical object fields are sorted by key. -/
def ObligationCanonSorts : Prop :=
  ∀ fs : FieldList, fieldsSortedB (canonFields fs) = true

/-- S1 value twin (Q11): value canonicalization is idempotent. -/
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
