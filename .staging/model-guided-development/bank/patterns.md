# Pattern ledger

Append-only. Selected invariant shapes and process lessons that survived
their checks — the reusable half of the outcome history
([../BANK.md](../BANK.md)). `kind: shape` = an invariant/lemma form to
instantiate; `kind: lesson` = a scouting check to run against any
candidate set. Seeded 2026-08-30 from the survey and mining passes.

| id | kind | family | pattern | provenance |
|---|---|---|---|---|
| PT-001 | shape | WF-PRESERVE | The preservation ladder: prove `step_preserves_wf` once, lift through each language layer (`run`, worded, rooted, defunctionalized) as a fold of the step lemma | `Cas/Lang/{Interp:119,163, Worded:144,197, Roots:94, Defun:368}.lean` |
| PT-002 | shape | REJECTION-CLAUSE | The two-sided refusal pair: mint `_error_condemns` (soundness) and `_complete` (completeness) together, never one alone | `Cas/Core/Admission.lean:108,137,152,156` |
| PT-003 | shape | AGREEMENT | The pinned known-disagreement: an expected divergence is a tracked red assertion an accidental fix must explicitly retire | `test/{MaterializeDifferential,SchemaVerdicts}.test.ts` (ruling-queue 13/19) |
| PT-004 | shape | FAIL-CLOSED | The mutation-kill gate: a deliberately wrong implementation must disagree with ratified vectors on ≥1 row (`assertFamilyRed`) | `library/effects/test/conformance/harness.ts:171-193` + `test/blob/mutants/` |
| PT-005 | lesson | (all) | Discharge the LAW, not the falsifier: a check that tests a difference where the law demands a direction confirms nothing (both PDD-4 BREAKs were this one disease) | attack `c9e9bc17`, fix `d5d89188` |
| PT-006 | lesson | REJECTION-CLAUSE | Say what the door decides: constructibility ≠ productivity; scope every completeness claim to the judgment the door actually computes | PDD-3, commit `f8a2da76` |
| PT-007 | shape | (all) | The attack packet: adversarial breaker files + RESULTS.md with STANDS/STANDS-AMENDED/BREAK verdicts and kernel-proved counterexamples (canonBad) — spec-adequacy made executable | `library/cas/contracts/attacks/PDD-*/` |
| PT-008 | lesson | AGREEMENT | Independent legs must not share a private data copy: agreement over a duplicated index is agreement by accident (R11 split-brain) | fix `6b9a7e17` |
