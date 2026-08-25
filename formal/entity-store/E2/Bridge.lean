/-
The canon bridge pins (coordinator, 2026-08-25, ruled in the PROCEDURE grill): the
M17-feeding statements that `canonS`/`canonV` respect the admission judgments and
conformance. FROZEN statements — refutation targets for wave 2 and proof targets for a
later seat; a statement that resists proof or falls to a counterexample is a finding
(F-number), never a silent reword.

Two cracks surfaced AT PIN TIME and are priced into the statements:
- F-23: `canonS` passes `.lit` payloads through while `canonV` sorts the same bytes on
  the value plane, so the unconditional conformance bridge is FALSE (probe receipt in
  FINDINGS). The bridge below conditions on `litsCanonicalB`. Ruling Q13 (whether
  `canonS` should canonicalize `lit` payloads, making the condition vacuous) is OPEN.
- F-24: the `refine` case forces the check semantics itself to be `canonV`-invariant —
  an admission criterion for the R-4 allowlist, recorded for that session. The
  resolver is fixed to `none` here (ref-free fragment first, as with M18); the
  resolver-coherent extension is owed with M17'.
-/
import E2.Core
import E2.Encode
import E2.Canon
import E2.Obligations
import E2.Model

namespace E2

/-! ## Vocabulary: every `.lit` payload is value-canonical. -/

mutual
def litsCanonicalB : SchemaCore → Bool
  | .lit v => canonV v == v
  | .prim _ => true
  | .address => true
  | .object fs => litsCanonicalF fs
  | .tuple es => litsCanonicalL es
  | .array e => litsCanonicalB e
  | .union _ ms => litsCanonicalL ms
  | .refine s _ => litsCanonicalB s
  | .ref _ => true
  | .var _ => true
  | .mu _ b => litsCanonicalB b
  | .tupleRest es rest => litsCanonicalL es && litsCanonicalB rest
  | .record cod => litsCanonicalB cod
  termination_by structural x => x

def litsCanonicalF : FieldList → Bool
  | .nil => true
  | .cons _ v _ rest => litsCanonicalB v && litsCanonicalF rest
  termination_by structural x => x

def litsCanonicalL : SchemaList → Bool
  | .nil => true
  | .cons hd tl => litsCanonicalB hd && litsCanonicalL tl
  termination_by structural x => x
end

/-! ## The pinned bridge statements. -/

/-- B1: canonicalization preserves closedness. -/
def ObligationCanonPreservesClosed : Prop :=
  ∀ (k : Nat) (s : SchemaCore), closedB k s = true → closedB k (canonS s) = true

/-- B2: canonicalization preserves guardedness (field reordering cannot reach the
    guard spine — the spine stops at value-consuming constructors). -/
def ObligationCanonPreservesGuarded : Prop :=
  ∀ s : SchemaCore, guardedB s = true → guardedB (canonS s) = true

/-- B3: canonicalization preserves duplicate-freedom (sorting permutes keys, never
    multiplies them). -/
def ObligationCanonPreservesDupFree : Prop :=
  ∀ s : SchemaCore, dupFreeS s = true → dupFreeS (canonS s) = true

/-- B4: canonicalization respects conformance — conditioned per F-23 (lit payloads
    value-canonical) and F-24 (check semantics canonV-invariant), ref-free fragment
    first. -/
def ObligationCanonRespectsConforms : Prop :=
  ∀ (env : ConformsEnv),
    (∀ c w, env.checkSem c w ↔ env.checkSem c (canonV w)) →
    (∀ a, env.res a = none) →
    ∀ (s : SchemaCore) (v : Value),
      litsCanonicalB s = true →
      Conforms env s v → Conforms env (canonS s) (canonV v)

end E2
