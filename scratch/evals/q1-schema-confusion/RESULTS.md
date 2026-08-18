# Q1 kernel tool-schema confusion findings

Status: **MEASURED** — fixed local evaluation, not a durable model-independent claim.

The evaluation is inconclusive under the preregistered rule: no arm separates from both others on the confusion rate with non-overlapping intervals. The run completed 60 independent generations and scored 480 calls against base SHA-256 `8d9cb4b106c86f60f6e74ae60ff20ee57a3f0354e91227480f8562e6ea3bd7d4`.

**Preregistered action on this branch (`inconclusive`).** No naming change is made. The compound convention in `verify/kernel/projections/tools.schema.json` stands on the survey's non-experimental grounds — the nearest-neighbour practice the survey cites — and NOT on this evaluation, which did not separate the arms at this power. Q1 stays open, and any future quote of these numbers carries that sentence.

## Combined result

| Model | Arm | Calls | Valid call | Omission | Misplacement | Confusion (union) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| all | compound | 160 | 160/160 (100.0%; 95% CI 97.7%–100.0%) | 0/160 (0.0%; 95% CI 0.0%–2.3%) | 0/160 (0.0%; 95% CI 0.0%–2.3%) | 0/160 (0.0%; 95% CI 0.0%–2.3%) |
| all | bare | 160 | 160/160 (100.0%; 95% CI 97.7%–100.0%) | 0/160 (0.0%; 95% CI 0.0%–2.3%) | 0/160 (0.0%; 95% CI 0.0%–2.3%) | 0/160 (0.0%; 95% CI 0.0%–2.3%) |
| all | nested | 160 | 152/160 (95.0%; 95% CI 90.4%–97.4%) | 8/160 (5.0%; 95% CI 2.6%–9.6%) | 0/160 (0.0%; 95% CI 0.0%–2.3%) | 8/160 (5.0%; 95% CI 2.6%–9.6%) |

## Result by model version

| Model | Arm | Calls | Valid call | Omission | Misplacement | Confusion (union) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| claude-haiku-4-5 | compound | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) |
| claude-haiku-4-5 | bare | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) |
| claude-haiku-4-5 | nested | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) |
| claude-sonnet-5 | compound | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) |
| claude-sonnet-5 | bare | 80 | 80/80 (100.0%; 95% CI 95.4%–100.0%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) |
| claude-sonnet-5 | nested | 80 | 72/80 (90.0%; 95% CI 81.5%–94.8%) | 8/80 (10.0%; 95% CI 5.1%–18.5%) | 0/80 (0.0%; 95% CI 0.0%–4.6%) | 8/80 (10.0%; 95% CI 5.1%–18.5%) |

## What the comparison actually rests on

8 of 480 calls met the confusion definition, drawn from 1 of 60 independent generations. **8 of the 8 confused calls come from the single generation `claude-sonnet-5/nested/sample3`.** The independent unit here is the generation, not the call, so this is one event and not 8: any arm difference the tables show rests on it. 1 of 60 generations returned an empty call list — `claude-sonnet-5/nested/sample3` — and an empty generation scores every row of its battery as an omission by definition.

8 of 8 battery rows produced any confused call; the other 0 scored zero in all three arms and carry no information about the comparison. The rates quoted above use the full denominator. The discriminating rows are:

| Task | Arm | Calls | Confused |
| --- | --- | ---: | ---: |
| `declare` | compound | 20 | 0 |
| `declare` | bare | 20 | 0 |
| `declare` | nested | 20 | 1 |
| `resolve` | compound | 20 | 0 |
| `resolve` | bare | 20 | 0 |
| `resolve` | nested | 20 | 1 |
| `emit` | compound | 20 | 0 |
| `emit` | bare | 20 | 0 |
| `emit` | nested | 20 | 1 |
| `join` | compound | 20 | 0 |
| `join` | bare | 20 | 0 |
| `join` | nested | 20 | 1 |
| `fold` | compound | 20 | 0 |
| `fold` | bare | 20 | 0 |
| `fold` | nested | 20 | 1 |
| `decide` | compound | 20 | 0 |
| `decide` | bare | 20 | 0 |
| `decide` | nested | 20 | 1 |
| `trigger` | compound | 20 | 0 |
| `trigger` | bare | 20 | 0 |
| `trigger` | nested | 20 | 1 |
| `spawn` | compound | 20 | 0 |
| `spawn` | bare | 20 | 0 |
| `spawn` | nested | 20 | 1 |

Any effect size read off the aggregate is diluted by the 0 constant rows; the table above is what the comparison actually rests on.

## Are the measures independent?

Omission and misplacement disagreed on 8 of 480 scored calls and coincided on 0, so they discriminate separately here. `field_confusion` is their union by definition and is never independent evidence beside them.

## Population

- `haiku` resolved to `claude-haiku-4-5`.
- `sonnet` resolved to `claude-sonnet-5`.

Reasoning effort: `low` on every generation. The sample has 10 independent generations per model/arm cell, with 8 calls produced inside each generation. The call-level Wilson intervals do not adjust for that within-generation correlation. The provider path exposed no seed or temperature control. Total provider-reported cost was USD 2.0815.

## Base projection against the generated corpus

| Ledger entry | Base slot | Generated corpus field | Cross-walk |
| --- | --- | --- | --- |
| `declare.writ` | `writ_digest` | `writ` : Digest(policy) | name |
| `resolve.digest` | `digest` | `target` | position |
| `emit.lane` | `lane_digest` | `lane` : Digest(lane) | name |
| `join.cell` | `cell_digest` | `cell` : Digest(resource) | name |
| `fold.reduction` | `reduction_digest` | — (no generated counterpart) | unresolved |
| `fold.lane` | `lane_digest` | — (no generated counterpart) | unresolved |
| `decide.register` | `register_digest` | `register` : Digest(program) | name |
| `trigger.declaration` | `declaration_digest` | `declaration` : Digest(program) | name |
| `trigger.lane` | `lane_digest` | — (no generated counterpart) | unresolved |
| `trigger.cell` | `cell_digest` | — (no generated counterpart) | unresolved |
| `trigger.register` | `register_digest` | — (no generated counterpart) | unresolved |
| `spawn.parent_writ` | `parent_writ_digest` | `parent` : Digest(policy) | position |
| `spawn.request_writ` | `request_writ_digest` | `request` : Digest(policy) | position |

5 of 13 slots in the base projection have no counterpart in the generated builder table: `fold.reduction`, `fold.lane`, `trigger.lane`, `trigger.cell`, `trigger.register`. These are slots the hand-derived sketch carries and the grammar it owes does not name. They are planted and scored like any other slot, and the divergence is a finding about the sketch rather than about naming.

## Bounds

This measures two model aliases at the canonical versions above, at the reasoning effort stated, on 8 synthetic kernel tasks and three derived schema projections. It does not measure production agents, long-horizon sessions, provider-native tool selection, other prompts, or later model versions. The 480-call design has only 60 independent generations; it can expose a large effect and cannot resolve a small one. Structured output constrained only the outer response envelope, while the projected kernel tool schemas were validated after generation.

One confound is stated rather than engineered away: the ledger keys are derived from the base projection's own slot names, so the `bare` arm's property names resemble the referent names in every prompt more closely than the other two arms' do. That similarity is a property of this design and any `bare` advantage must be read with it.

The base projection is `verify/kernel/projections/tools.schema.json`, which declares itself `EXPLORATORY, hand-derived` in its own `$comment`. This evaluation therefore measures naming behaviour on a surface the estate does not yet generate; the cross-walk table above bounds how far that surface has drifted from the grammar it owes.

## Reproduce

From `scratch/evals/q1-schema-confusion`:

`bun install --frozen-lockfile`

`bun run check:generated && bun run check:generated-control`

`bun run test`

`bun run report` regenerates every table above from the committed raw records without spending a model call. `bun run run` spends the population again.
