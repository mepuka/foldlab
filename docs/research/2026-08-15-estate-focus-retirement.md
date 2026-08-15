# The estate-focus retirement: what left, where it lives, and why

2026-08-15, operator-ratified (rulings F1–F2 in the
[estate-focus grill record](../design/2026-08-15-estate-focus-grill-record.md)),
executed on `chore/estate-focus`. Every path below left the working
tree in one commit and is INTACT at the annotated tag
`archive/pre-estate-focus`, whose commit passed the full gate battery
plus the four runnable model gates the same day. Nothing was deleted
from history. A lane returns by restoring its directory from the tag
with its tests, never by re-typing code.

The rule that drew the line: the focus stack — `proto/`,
`verify/{moves,ir,catalog,pipeline,implication}/` — keeps exactly what
it imports or referees, verified by import walk before the cut:
`protod` imports `foldlab/canonical` and `foldlab/journal` only;
`go/journal` imports `foldlab/canonical` plus NATS and stdlib;
`packages/core/src/jcs.ts` imports nothing; the JCS differential wall
spawns `go run ./cmd/jcsprobe`.

## Archived: Go

- `go/stream/` — the value/transform hot path; one half of the value,
  transform, and KV-combine walls.
- `go/effector/` (+ `watch.go`) — the A6 register; its R3 + R4 claim
  moves to the ledger's archived record. `protod` imports nothing from
  it and does its own fencing at session close.
- `go/substrate/`, `go/daemon/` (contract stub), `go/gauntlet/`,
  `go/crashstorm/`, `go/transfleet/`.
- `go/cmd/` except `jcsprobe`: `climb`, `climbverify`, `gauntlet`,
  `gauntletverify`, `journald`, `lineartrace`, `realrun`, `realverify`,
  `schemawallprobe`, `streamfix`, `transpose`, `transposeverify`,
  `wasmwall`.

## Archived: TypeScript

- `packages/client/`, `packages/server/`, `packages/codegen/`,
  `packages/ai/` — whole packages.
- `packages/core/` slimmed to the RFC 8785 seam: archived
  `src/{algebra,entity,fold,foldArbitrary,foldBindings,foldCache,
  foldLaws,kvSemilattice,schema,stream,streamBindings,xform}.ts`, their
  tests, `examples/tour.ts`, `fixtures/fold-pin.json`, and
  `FINDING-SCHEMA-BOM-001.md` — an OPEN finding whose red
  reproduction (`schema.wall.test.ts` under
  `FOLDLAB_RUN_SCHEMA_BOM_FINDING=1`) archives with its subject;
  whoever revives the Schema surface owes that finding a disposition
  first.
- `examples/rosetta/` and the root workspace's `examples/*` entry.
- `scripts/{build-wasm,test-wasm,bench-go,bench-compare,
  wasm-wall-divergence}.ts`, `bench/`.

## Archived: fixtures, evidence bundles, gates

- `fixtures/stream-wall.json` (the frozen preimage of the archived
  chain walls — the frozen-fixture law now names
  `golden-conformance.json` and `jcs-rfc8785.json`) and
  `fixtures/wasm-wall-known-divergence.json` (finding #27's allowlist,
  archived with the wall it classifies).
- `artifacts/` — the gauntlet run bundles (g1-*, final-*, r1/r2
  receipts, transposition) and calibration corpus receipts; evidence
  for the archived verifier lanes.
- `verify/replay/` — workflow replay soundness (Lean + TLC). Archived
  because its consumer (the workflow lane, tickets 008/020) is frozen;
  its ledger entry remains as the floor that lane must stand on if
  revived.

## Kept, and why

- `proto/` whole — the running twin and the protocol.
- `verify/moves`, `verify/ir` — the two Lean models the focus is
  about; `verify/catalog`, `verify/pipeline`, `verify/implication` —
  the gates guarding the catalog/ingress and refusal semantics the
  type system stands on.
- `go/canonical`, `go/journal`, `go/cmd/jcsprobe` — the substrate the
  import walk proved load-bearing.
- `packages/core` (jcs only) with the JCS differential wall and both
  frozen oracles.
- `docs/` untouched: frozen documents stay frozen, dated research and
  design records stay where their citations point. `docs/LAWS.md` was
  re-indexed: seven law families whose statements and enforcers
  archived whole are recorded there as reserved prose entries, not
  checker rows.
- `repos/effect/` — the vendored Effect pin, read-only reference.

## What changed to keep the gates honest

`scripts/gates.ts` stages are unchanged in shape (the battery still
runs root typecheck/tests, workspace tests, `go` and `proto` gates);
`package.json` lost the dev/bench/wasm scripts and the `examples/*`
workspace; root `tsconfig.json` no longer includes `bench` and
`examples`; `.github/workflows/negative-controls.yml` lost the wasm
and gauntlet-verifier steps and kept the R4 controls, the laws index,
and the package-test policy; `lean-gates.yml` (added the same day)
runs the two pure-Lean model gates per push. The post-cut tree passed
`bun run gates`, `verify/moves/run.sh`, `verify/ir/run.sh`,
`verify/implication/run.sh`, and `verify/pipeline/run.sh` on the
recording machine — the run outputs are in the purge commit's message.

## The ledger consequence

`VERIFICATION.md` rows for the effector, the KV meaning fold, the
chain-wall half of the journal row, and workflow replay are marked
**Archived** with their sections banner-noted in place — the claims
are no longer asserted by this checkout and remain checkable at the
tag. A claim whose evidence is not in the tree is not made; a claim
whose evidence is at a named tag is history, stated as such.
