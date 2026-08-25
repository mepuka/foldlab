/-
The canon bridge pins (coordinator, 2026-08-25, ruled in the PROCEDURE grill): the
canon-preservation lemmas the M17 amendment consumes. FROZEN statements — a statement
that resists proof or falls to a counterexample is a finding (F-number), never a silent
reword.

AMENDED 2026-08-25 (window B, ruling W3-7).

B1–B3 REMAIN, and route (i-a) is what makes them load-bearing. `Reachable.putS`'s
premise is now `WFS (canonS s)`; B1 ∧ B2 ∧ B3 is exactly the proof that the new premise
admits at least as many stores as the old one, so the amendment does not silently shrink
`Reachable` on the schema plane. They are the canon-preservation lemmas the amendment
consumes, and nothing more is claimed for them.

B4 (`ObligationCanonRespectsConforms`) is RETIRED by declared amendment, and removed
from this file. It bridged `Conforms env s v` to `Conforms env (canonS s) (canonV v)`,
and it was owed only because `Reachable.putE`'s premise sat on the RAW carrier while
M17's goal sat on the STORED one. Under (i-a) the premise moved to the stored form
(`Conforms env (canonS s) (canonV v)`), so the gap it spanned no longer exists and no
bridge is owed. B4 was RETIRED, NOT PROVED — that distinction is the whole record.

What the retirement does NOT close:

- F-23 (`canonS` and `canonV` disagreeing on `.lit` payloads) was closed at the EQUATION
  level by A-6 in window A: `canonS (.lit v) = .lit (canonV v)`, shipped with F-26's
  companion clause `dupFreeS (.lit v) = dupFreeV v`. Ruling Q13 is therefore CLOSED, not
  open — `canonS` does canonicalize `.lit` payloads. `litsCanonicalB` below is retained
  as the vocabulary that record names; with B4 gone nothing consumes it, and it stays
  live for F-29 / R-4 on its own merits.
- F-24 (the `refine` case forcing the check semantics itself to be `canonV`-invariant)
  stays LIVE on its own merits, as an admission criterion for the R-4 allowlist. It is
  the third of F-28's three value-plane routes — the `Check`-payload route — and it is
  precisely the route window B leaves OPEN. The other two are closed: the entity-value
  route by `Reachable.putE`'s `dupFreeV (canonV v)` premise (W3-9), the `.lit`-payload
  route by F-26's `dupFreeS` clause (W3-10).

M17′ (resolver coherence) is no longer owed-and-unstated: it is STATED as
`ObligationM17'_store_env` in `E2/Admission.lean`.
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
    multiplies them). The value-plane twin is `ObligationCanonVPreservesDupFree`
    (`E2/Model.lean`), stated in window B — `putE`'s `dupFreeV (canonV v)` premise needs
    it to transfer to and from the raw value the caller supplied. -/
def ObligationCanonPreservesDupFree : Prop :=
  ∀ s : SchemaCore, dupFreeS s = true → dupFreeS (canonS s) = true

/- B4 (`ObligationCanonRespectsConforms`) stood here and is RETIRED by declared
   amendment (RULINGS W3-7); see this module's header. Not proved, not falsified —
   no longer owed. -/

end E2
