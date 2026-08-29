import Cas.Core.Node

/-!
# Sorts — the grammar's nonterminals

Each sort names one node form and carries its wire kind tag. All the
data sorts are ratified core (grammar grill ruling 2, 2026-08-28) —
registry rows in `REGISTRY.md` at the library root; tags 8, 9, and 10
remain the profile's blob kinds (PROFILE-CAS-HTTP-0). `.schema`
(ruling 3) is the schema sort, tag 0x53, opaque-payload v0. 0x47 is
the `.git` sort — git objects as content, their payloads the
loose-object preimages so the git SHA-1 is derivable. Leaf and parent
share one sort (and one tag) because references type-check at tag
granularity.

`.step` (0x0E) and `.cont` (0x0F) are the PROGRAM sorts, ratified
2026-08-29 off `REGISTRY.md` rows 14 and 15 — reserved since the
defunctionalization landed, spelled until now as bare `UInt8` defs
outside this inductive. A `step` is one code point of a
defunctionalized table; a `cont` is the table itself, its edges the
step nodes in order. Both are written by `Cas/Lang/Defun.lean`
(`encodeLine`, `tableNode`), and `decodeProg`'s round trip is why the
rows are sorts rather than literals: a program recovered from its own
content runs identically, so the tag is a contract, not a convention.

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
  | step
  | cont
  | schema
  | git
  deriving DecidableEq, Repr

/-- The wire kind tag of each sort. All rows are ratified core
(registry rows in `REGISTRY.md`); 8/9/10 are the profile's blob
kinds, 0x53 is the schema sort, 0x0E/0x0F the program sorts. -/
def Ty.wireTag : Ty → UInt8
  | .value => 1
  | .chunk => 8
  | .tree => 9
  | .manifest => 10
  | .file => 11
  | .entry => 12
  | .context => 13
  | .step => 14
  | .cont => 15
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
  | 14 => some .step
  | 15 => some .cont
  | 0x53 => some .schema
  | 0x47 => some .git
  | _ => none

theorem Ty.ofTag_wireTag (t : Ty) : Ty.ofTag t.wireTag = some t := by
  cases t <;> rfl

end Cas.Grammar
