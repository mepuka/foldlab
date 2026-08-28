import Cas.Core.Node

/-!
# Sorts — the grammar's nonterminals

Each sort names one node form and carries its wire kind tag. Tags 8, 9,
and 10 are the profile's blob kinds (PROFILE-CAS-HTTP-0 §12); the
others are illustrative utility kinds pending registry passage; 0x53 is the
`.schema` sort (grammar-grill ruling 3) — canonical schemas as
content; 0x47 is the `.git` sort — git objects as content, their
payloads the loose-object preimages so the git SHA-1 is derivable. Leaf and parent share one sort (and one tag) because
references type-check at tag granularity.

`ofTag` is the partial inverse; `ofTag_wireTag` pins the round trip, so
a sort is recoverable from any node the grammar elaborated.
-/

namespace Cas.Grammar

/-- The scheme version byte every grammar node carries. -/
def schemeVersion : UInt8 := 0

/-- The sorts: one per node form. -/
inductive Ty where
  | value
  | chunk
  | tree
  | manifest
  | file
  | entry
  | context
  | schema
  | git
  deriving DecidableEq, Repr

/-- The wire kind tag of each sort. 8/9/10 are the profile's blob
kinds; the rest are illustrative. -/
def Ty.wireTag : Ty → UInt8
  | .value => 1
  | .chunk => 8
  | .tree => 9
  | .manifest => 10
  | .file => 11
  | .entry => 12
  | .context => 13
  | .schema => 0x53
  | .git => 0x47

/-- The partial inverse of `wireTag`. -/
def Ty.ofTag : UInt8 → Option Ty
  | 1 => some .value
  | 8 => some .chunk
  | 9 => some .tree
  | 10 => some .manifest
  | 11 => some .file
  | 12 => some .entry
  | 13 => some .context
  | 0x53 => some .schema
  | 0x47 => some .git
  | _ => none

theorem Ty.ofTag_wireTag (t : Ty) : Ty.ofTag t.wireTag = some t := by
  cases t <;> rfl

end Cas.Grammar
