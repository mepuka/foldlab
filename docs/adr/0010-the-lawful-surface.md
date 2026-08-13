# The lawful surface: a public function enters a library only with the law that licenses it

A public function in foldlab's libraries exists because a law writes
it: a universal property whose uniqueness clause manufactures the
function (FreeMonoid.lift → defineFold), or a proved equation whose two
sides the function collapses (banana-split → zip; homomorphism
commutation → map; convergence + refusals-as-data → the safe retry
combinator). Every such function ships with generated law tests — the
wall factory is part of the surface, not an afterthought — so
correctness is inherited from the licensing law rather than tested per
use. The upfront theory cost is accepted as policy: when a proof lands
or a paper is read, two standing questions run — what function does
the uniqueness clause write, and what API do the equation's two sides
collapse. Convenience functions with no licensing law are refused from
the public surface (application code may do as it likes). The rejected
alternative — accreting pragmatic one-off surface — is how un-lawed
structure builds up, and this repository's own history (the mint
rollback, the battery wipe) shows that un-lawed structure is deleted
later at higher cost than the law would have been. First embodiment:
the fold algebra (docs/map/tickets/014); intellectual grounding:
docs/research/2026-08-13-literature-resonances.md.
