/-
Seat module — M9, WF2 over stored bytes (STORE-MODEL §3/§6). The statement is pinned in
`E2/Resolve.lean`; this module supplies the proof only:

  theorem M9_wf2 : ObligationM9_wf2

Helper lemmas live here (the canonicalization-preserves-references lemma is expected —
see the dispatch brief). This module may import `E2.Faithful`. End with `#print axioms`.
Edit no other module; a statement that resists proof is a STOP-and-report.
-/
import E2.Resolve
import E2.Faithful

namespace E2

end E2
