# Q1 kernel tool-schema confusion evaluation

This directory contains the preregistered DEV-787 harness and its generated
evidence. It derives three tool-schema arms from
`verify/kernel/projections/tools.schema.json`, asks the locally authenticated
model aliases to populate a fixed eight-task battery, and scores every returned
call without a model judge.

## Run

From this directory:

```bash
bun install --frozen-lockfile
bun run test
bun run typecheck
bun run generate
bun run run
```

`bun run generate` does not call a model. It writes the three derived schemas,
their exact prompts, and the fixed battery under `generated/`.

`bun run run` performs the preregistered 30 model generations, writes normalized
provider responses to `results/runs.ndjson`, scores 240 calls, emits
`results/observations.csv` and `results/by-arm.csv`, and regenerates
`RESULTS.md`. The provider CLI must already be authenticated; the harness never
reads or stores a credential.

`bun run report` regenerates the tables and report from the committed raw run
records without calling a model.

## Evidence map

- `PREREGISTRATION.md` fixes the arms, battery, sample, measures, and decision
  rule before population.
- `DECISIONS.md` records choices the issue did not settle.
- `generated/` contains the exact derived schemas, prompts, and battery.
- `results/runs.ndjson` contains structured model responses and version/cost
  metadata.
- `results/observations.csv` contains one mechanical score per call.
- `results/by-arm.csv` contains model-specific and combined Wilson intervals.
- `RESULTS.md` is the measured-tier findings report.

The harness is deliberately outside every runtime package and changes no Plait
surface or verification claim.
