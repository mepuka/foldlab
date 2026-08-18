# Q1: field-name/value confusion in kernel tool schemas

**What this is.** The in-house evaluation the projection survey owes. The
survey found no published answer to Q1 — whether a field named `schema`, one
named `schema_digest`, or a nested `{type,value}` reference measurably changes
how reliably our models populate our tools — and adopted the compound spelling
as convention pending this measurement
(`docs/research/2026-08-18-kernel-language-projection-survey.md` §8 Q1).

**What it is not.** It is not a corpus emitter and it projects no public
surface. It reads `verify/kernel/projections/tools.schema.json` and the
generated kernel builder table; it writes nothing outside this directory.

## Read in this order

1. `PREREGISTRATION.md` — the contract, committed before the population. The
   decision rule and the action each of its branches fixes live here.
2. `RESULTS.md` — the measured findings, regenerated from committed raw records.
3. `DECISIONS.md` — one entry per decision the ticket did not fix.

## How to regenerate it

This directory is its own install island, like `proto/ts`. It is not a
workspace member; install it where it lives.

```bash
cd scratch/evals/q1-schema-confusion
bun install --frozen-lockfile

bun run generate      # committed artifacts under generated/, from the base projection
bun run report        # every table in RESULTS.md, from committed raw records, no model calls
bun run run           # spends the model population again and rewrites results/
```

`generate` and `report` are free and deterministic. Only `run` costs money.

## Which wall proves it

`bun run gates` from the repository root carries five rows for this directory —
typecheck, Effect rules, tests, and these two:

```bash
bun run check:generated          # generated/ is the byte-identical regeneration of its source
bun run check:generated-control  # that check, proved able to fail
```

`check:generated` renders the artifacts twice (so a non-deterministic emitter is
its own named failure), compares against the committed bytes, and refuses an
artifact that is missing, drifted, or committed-but-no-longer-generated.
`check:generated-control` replays those three refusals against the committed
trace in `negative-controls/generated-check.trace.txt`; re-record it with
`bun src/main.ts check-control --write` when the renderer legitimately changes.

## The shape of the thing

`src/Corpus.ts` reads the generated kernel builder table as the authority for
what sort a digest slot carries. `src/Battery.ts` derives the candidate ledger
and the task battery from the base projection and cross-walks each slot to that
corpus. `src/Projection.ts` transforms the base into the three arms.
`src/Generated.ts` renders every committed artifact. `src/ModelRunner.ts`
spawns the provider CLI. `src/Scoring.ts` scores mechanically — Ajv plus exact
scalar comparison, no judge. `src/Report.ts` writes `RESULTS.md`.
