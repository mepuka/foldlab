# PDD-10 — Self-codec exactness over the grown universe

CATEGORIES algebraic-laws, contracts, inductive-data,
           specification-design
BRANCH     agent/opus-cc-mac/pdd-10
STATUS     QUEUED behind PDD-3's landing — the theorem's subject is
           the decoder PDD-3 extends; dispatch on the standing
           approval once PDD-3 merges.

Owed-ledger item 4 of THE-ALGEBRA (L153, L168, §3.10): the
revision-1 decoder lacks the exactness law the value plane carries
with no premise — `ofRepresentationJson v = some a →
a.toRepresentationJson = v` (or the honest normalized form). A
domain-widening decoder passes every stated law of the module while
silently discarding a check and readdressing the schema. "The same
code from any spelling lands at the same address" is ASSERTED;
this ticket makes it a theorem, over the universe as grown by PDD-3
(reference and susp arms included — their exact-literal spellings
are part of the statement). Falsifier: the domain-widening arm —
exhibit a spelling the decoder accepts that the encoder can never
produce, and the claim dies.

Fences: new theorem module; decoder read-only; no byte moves; no
merge-branch files. Packet first at
library/cas/contracts/PDD-10.contract.md.
