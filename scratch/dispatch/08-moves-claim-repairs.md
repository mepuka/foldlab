# Moves claim repairs: dispositions for the 2026-08-15 audit findings

## Why now

The adversarial audit of `verify/moves/` returned SOUND-WITH-EDGES:
the proofs prove what their statements say; several statements say
less than the prose around them claims. The ledger was re-scoped the
same day (MOVES-1, MOVES-2 applied in `VERIFICATION.md`). The
remaining repairs each need an operator disposition BEFORE any edit —
findings before fixes.

## The dispositions to rule on

1. **MOVES-2, README**: reword the `no_fair_resolute_fence` sections —
   what is mechanized is "a resolute choice between two distinct
   candidates picks one of them," not IC4 neutrality. Prose-only.
2. **MOVES-3, docstring**: `clash_repair_confluence` claims strong
   local confluence; it proves a point instance from the initial
   state. Reword, or dispatch the missing diamonds (dispute/dispute,
   fill/dispute, decide; arbitrary reachable WF start) as a model
   increment.
3. **MOVES-4, model increment (optional)**: authenticate dispute
   attribution (candidates bound to their submitting actor) so
   plurality's manipulation resistance becomes a law instead of a
   scripted trace. This is the one increment with direct protocol
   value; it changes the step relation and therefore needs its own
   grill.
4. **MOVES-5, model increment (optional)**: journal same-value refills
   into evidence so plurality counts confirming holders. Contradicts
   nothing ratified; changes evidence semantics; needs its own grill.
5. **MOVES-1, standing scope note**: skip semantics (refused move
   leaves a journal record and the run continues) as a future model
   increment — or a permanent statement that admitted-runs scope is
   the model's contract and the vector wall carries refused-move
   coverage instead (the currently ratified floor, issue 02).
6. **Nits batch (MOVES-6..12)**: dead disjunct in `conflict_surfaces`,
   unused `FiniteCarrier` hypothesis, README's "counted twice by
   plurality" (false for fills today), control taxonomy (two of four
   are demonstrations, not falsification controls). One mechanical
   pass after 1–2 are ruled.

## Acceptance

Each disposition recorded (grill record or D-entries); prose repairs
land with `bash verify/moves/run.sh` green and no theorem statement
changed unless its increment was explicitly ratified; any ratified
model increment ships with its own negative control.

## Pointers

`docs/research/2026-08-15-model-audit-findings.md`;
`verify/moves/README.md`; `verify/moves/Moves/Model.lean`;
`VERIFICATION.md` §E2 move calculus.
