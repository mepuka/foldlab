/-
Seat module — NEG-2, the dangling-reference exhibit (STORE-MODEL §6, negative exhibits).
The statement is pinned in `E2/Resolve.lean`; this module supplies the proof only:

  theorem NEG2_dangling_unreachable : ObligationNEG2_dangling_unreachable

Helper lemmas live here. This module may import `E2.Faithful` and `E2.Closure`. End with
`#print axioms`. Edit no other module; a statement that resists proof is a
STOP-and-report.
-/
import E2.Resolve
import E2.Faithful
import E2.Closure

namespace E2

end E2
