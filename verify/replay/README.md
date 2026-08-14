# verify/replay — replay soundness (ground-truth increment 3)

The theorem the workflow engine must stand on, proved BEFORE tickets
008/020 build it
([workflow authoring & emission design](../../docs/design/2026-08-14-workflow-authoring-and-emission.md)
§5.1; roadmap in the
[architecture audit](../../docs/research/2026-08-14-architecture-audit.md)
§5). Gate: `./run.sh`.

## The theorem, in two instruments

**Lean** (`lean/`, 4.33.0, core only, no `sorry`) — the unbounded half.
Model: a static workflow DAG in topological numbering (labels-as-identity,
the ratified v0 position) with bodies as FUNCTIONS (determinism held by
type); the Done-set as a store; execution = any interleaving of
first-commit-wins, ready-guarded commits. The proven register laws are
what license those step axioms (first-wins = create-if-absent + fencing;
duplicate commits absorbed since deterministic bodies over committed
inputs re-derive byte-identical results; crashed attempts touch nothing —
steals and retries change WHO commits, never WHAT).

| theorem | statement |
| --- | --- |
| `exec_coherent` | Every committed value is the denotation — the inductive heart. |
| `determinacy` | Any two executions agree on everything both committed. |
| `schedule_irrelevance` | Any two COMPLETE schedules are pointwise equal: the committed linearization is a decision about order, never about values. |
| `replay_sound` | From ANY reachable store — mid-run, post-crash, complete — fold-over-Done reproduces the denotation at every node. Replay is execution. |
| `faithless_diverges` | Drop the ready guard and two schedules of a two-node workflow commit different values at the same node (`some 0` vs `some 1`) — the guard is load-bearing, not hygiene. |

**TLC** (`Replay.tla`) — the bounded protocol half: two workers racing
claim / lease-expiry-steal (fence bump) / fence-checked commit over the
DAG `1 → 3 ← 2`, crashes modeled as stealable claims. `SpecEval` (every
committed value equals the denotation) holds through every interleaving
— 376 states, depth 13 — and the faithless variant (commit against
absent inputs read as defaults) is refuted with the trace committed
(`Replay.faithless.cex.txt`), the TLA twin of the Lean counterexample.

## What this licenses, and what it does not

Licensed: the §5.1 design claim — for certified static workflows with
deterministic bindings, the committed linearization can never move
values, and replay from the journal is exact. Not licensed: dynamic
control flow (choices must enter as committed facts first — the design's
staging), non-deterministic bodies (excluded by type on purpose), and
code-model correspondence with the real effector/engine (the R4-style
obligation once 008/020 build).

## Run record

TLC 2026.08.11.125311 (rev 0894c34), jar sha256
`ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`,
Temurin 21.0.2 via `mise x java@21`, 1 worker, Windows 11. Clean: 376
generated / 181 distinct, depth 13, < 1 s. Lean: `lake build`, 5 jobs.
Recorded 2026-08-14, this session.
