# PDD-11 — Skills as materialized context

CATEGORIES specification-design, abstraction-modules, contracts
BRANCH     agent/opus-cc-mac/pdd-11
STATUS     QUEUED — dispatches as pipeline capacity frees, after
           PDD-10.

The rule of context (product register, "The rule of context"): the
estate materializes context for any agent in any register; skills
are the first case. The mechanical sections of skills — emitter
tables, gate lists, tool rows — are projections of ledgers the
estate already emits, and hand-maintaining them is the drift class
the estate refuses everywhere else (evidence: backend-materialize
was seven emitters stale until 2026-08-30's hand fix).

## The work

1. One emitter (grown by arm on an existing tool, not a new
   carrier — envledger is the natural seat, ruling named in the
   packet if it must be its own exe): render the MECHANICAL
   sections of designated skills from ENVIRONMENT.json and the
   surface/obligation/law ledgers — the backend-materialize emitter
   table is the first target; a GENERATED-SECTION marker pair
   delimits what the emitter owns inside a hand-authored skill
   file, mirroring the generated-file header discipline.
2. Byte gate: the generated sections join `check:cas` — a stale
   skill is a red gate, not a doc bug.
3. The contract: the emitted table equals the ledger's rows —
   stated and proved at the ledger (the emitters' own row counts),
   with the falsifier: exhibit an emitter present in
   ENVIRONMENT.json and absent from the rendered table.

Explicitly NOT: generating prose sections of skills; skill
authoring stays human/coordinator work. Only the mechanical
projections move.

Fences: no new sorts; `Cas/Backend/Mcp.lean` untouched; the
generated-section device must not touch skills' prose bytes outside
its markers. Packet first at
library/cas/contracts/PDD-11.contract.md.
