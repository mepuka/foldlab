# model-guided-development — lane index

Status: staged lane, pre-grade throughout. Operationalized 2026-08-30 on
the operator's order: the plan runs as agent procedure over tracked
files, because the CAS APIs are not yet solid enough to host the coded
kernel. Nothing here is ratified; the grill list is below.

| File | What it is |
|---|---|
| [SOURCE-STUDY.md](SOURCE-STUDY.md) | Strategy + source study (pinned sources, receipt in `.reference/provenance/receipts/model-guided-development-sources.json`) |
| [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) | The coded-kernel plan (MGS-001…013, laws, milestones, evaluation design) — future work, gated on ratification |
| [LOOP.md](LOOP.md) | **Operational now** — the scout run as a ten-step agent procedure |
| [BANK.md](BANK.md) | **Operational now** — outcome-bank + benchmark data law |
| [ANNOTATE.md](ANNOTATE.md) | **Operational now** — the `gpt-5.6-luna` harness law, canonical script embedded |
| [runs.md](runs.md) | Run ledger (append-only; the measurement apparatus for the adoption decision) |
| [bank/](bank/) | Nine family entries + counterexample and pattern ledgers, seeded from the 2026-08-30 surveys |
| [bench/](bench/) | Blinded evaluation bank: 36 mined candidate cases; packets/answers stay local |
| `annotate/` (local) | Harness materialization + outputs + receipts (regenerable from ANNOTATE.md) |
| sources/, extracted/ (local) | Pinned study sources from the source study |

Skill entry point: `model-scout` (`.agents/skills/model-scout/`).

## Standing after the 2026-08-30 go-ahead

The operator assented to the stand-up report's owed list; executed the
same day:

1. Vocabulary grill — done, verdicts in [GRILL.md](GRILL.md): nine
   family names confirmed as literal registry reuse; `constructors` →
   `templates` executed lane-wide (family files at version 2);
   `checker-accepted` now names its checker inline; minting manifest
   for promotion recorded. SOURCE-STUDY and IMPLEMENTATION-PLAN
   ratification were NOT covered and remain owed.
2. TOOLS.md scout-annotator ROLE EXTENSION row — landed in the working
   tree (`docs/lab-core/TOOLS.md`, beside the codex admission); the
   operator's commit is the ratifying act.
3. AGENTS.md skill-routing row for `model-scout` — landed in the
   working tree; same ratifying act.
4. Bench controls topped up to 7 of 8 (BC-37/38/39; PDD-13 examined
   and refused — no breaker pass has adjudicated it). **One control
   still owed.**
5. CX-007 — FIXED 2026-08-30 on the operator's follow-up order ("if
   it's obviously a bug then fix it"): `CasStoreShape.putOutcome`
   mirrors the model's `Cas.PutOutcome` (`put` stays as its address
   projection), `runProgram` appends on `fresh` only, law tests replace
   the divergence-asserting test, and the CLI re-run answers
   `history 0 admitted`. Effects suite 416/416 green, typecheck clean;
   commit owed. The review's naming ruling (emission word vs admission
   word) remains open for the operator.
