/-
Seat module — M15 faithfulness (L-faithful, STORE-MODEL §4/§6). Statements are pinned in
`E2/Resolve.lean`; this module supplies proofs only:

  theorem M15_fresh            : ObligationM15_fresh
  theorem M15_faithful_schema  : ObligationM15_faithful_schema
  theorem M15_faithful_entity  : ObligationM15_faithful_entity

Bonus (two-line M4a corollaries, discharging Obligations.lean's stated F/S and F/V):

  theorem encSchema_inj : ObligationEncodeSchemaInjective
  theorem encValue_inj  : ObligationEncodeValueInjective

Helper lemmas live here. End with `#print axioms` for each theorem. Edit no other
module; a statement that resists proof is a STOP-and-report.
-/
import E2.Resolve

namespace E2

end E2
