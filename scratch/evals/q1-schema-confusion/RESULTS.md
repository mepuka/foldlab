# Q1 kernel tool-schema confusion findings

Status: **MEASURED** — fixed local evaluation, not a durable model-independent claim.

The evaluation is inconclusive under the preregistered rule; the observed differences do not separate all three call-level Wilson intervals. The run completed 30 independent generations and scored 240 calls against base SHA-256 `8d9cb4b106c86f60f6e74ae60ff20ee57a3f0354e91227480f8562e6ea3bd7d4`.

## Combined result

| Model | Arm | Calls | Valid call | Field confusion | Digest in wrong slot |
| --- | --- | ---: | ---: | ---: | ---: |
| all | compound | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 7/80 (8.8%; 95% CI 4.3%–17.0%) | 7/80 (8.8%; 95% CI 4.3%–17.0%) |
| all | bare | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 3/80 (3.8%; 95% CI 1.3%–10.4%) | 3/80 (3.8%; 95% CI 1.3%–10.4%) |
| all | nested | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 7/80 (8.8%; 95% CI 4.3%–17.0%) | 7/80 (8.8%; 95% CI 4.3%–17.0%) |

## Result by model version

| Model | Arm | Calls | Valid call | Field confusion | Digest in wrong slot |
| --- | --- | ---: | ---: | ---: | ---: |
| claude-haiku-4-5 | compound | 40 | 40/40 (100.0%; 95% CI 91.2%–100.0%) | 6/40 (15.0%; 95% CI 7.1%–29.1%) | 6/40 (15.0%; 95% CI 7.1%–29.1%) |
| claude-haiku-4-5 | bare | 40 | 40/40 (100.0%; 95% CI 91.2%–100.0%) | 3/40 (7.5%; 95% CI 2.6%–19.9%) | 3/40 (7.5%; 95% CI 2.6%–19.9%) |
| claude-haiku-4-5 | nested | 40 | 40/40 (100.0%; 95% CI 91.2%–100.0%) | 3/40 (7.5%; 95% CI 2.6%–19.9%) | 3/40 (7.5%; 95% CI 2.6%–19.9%) |
| claude-sonnet-5 | compound | 40 | 40/40 (100.0%; 95% CI 91.2%–100.0%) | 1/40 (2.5%; 95% CI 0.4%–12.9%) | 1/40 (2.5%; 95% CI 0.4%–12.9%) |
| claude-sonnet-5 | bare | 40 | 40/40 (100.0%; 95% CI 91.2%–100.0%) | 0/40 (0.0%; 95% CI 0.0%–8.8%) | 0/40 (0.0%; 95% CI 0.0%–8.8%) |
| claude-sonnet-5 | nested | 40 | 40/40 (100.0%; 95% CI 91.2%–100.0%) | 4/40 (10.0%; 95% CI 4.0%–23.1%) | 4/40 (10.0%; 95% CI 4.0%–23.1%) |

## Population

- `haiku` resolved to `claude-haiku-4-5`.
- `sonnet` resolved to `claude-sonnet-5`.

The sample has 5 independent generations per model/arm cell, with 8 calls produced inside each generation. The call-level Wilson intervals do not adjust for that within-generation correlation. The provider path exposed no seed or temperature control. Total provider-reported cost was USD 1.9323.

## Diagnostics

17 returned calls met the field-confusion definition (16 on `trigger-head-position`, 1 on `declare-schema`); 17 of those remained syntactically valid against the projected tool schema. The concentration on `trigger-head-position` means the aggregate arm rates primarily measure behavior on one synthetic task, not a broad cross-tool effect.

The machine-readable tables retain missing rows, duplicate rows, wrong tools, schema-invalid arguments, and omitted expected fields. `results/runs.ndjson` preserves every structured model response and the full provider model-usage map; `results/observations.csv` carries every scored call; `results/by-arm.csv` carries these summaries.

## Bounds

This measures two model aliases at the canonical versions above on eight synthetic kernel tasks and three derived schema projections. It does not measure production agents, long-horizon sessions, provider-native tool selection, other prompts, or later model versions. The 240-call design has only 30 independent generations; it can expose a large effect and cannot resolve a small one. Structured output constrained only the outer response envelope, while the projected kernel tool schemas were validated after generation.

## Reproduce

From `scratch/evals/q1-schema-confusion`:

`bun install --frozen-lockfile`

`bun run test && bun run typecheck`

`bun run generate`

`bun run run`
