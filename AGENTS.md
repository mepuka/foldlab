# foldlab agent contract

This file is the single source of truth for repository agent instructions.
Compatibility files such as `CLAUDE.md` only point here.

## Read first

- `CONTEXT.md` — canonical domain language and invariants (seam-level
  only; module vocabulary lives in each module's own `CONTEXT.md`)
- `README.md` — repository layout and runnable claims
- `NEXT.md` — current design state and ratified direction
- `docs/adr/` — architectural decisions
- `docs/gauntlet/` — frozen specs, laws, and verification results.
  Disambiguation: inside that directory "climb" names an optimization
  run by a climber agent, not a rung of the verification ladder.

## Scoped contracts

Module directories carry their own `AGENTS.md` (enforceable laws) and
`CONTEXT.md` (module-local vocabulary hidden behind the seam). Read the
scoped files before editing inside: `go/` (substrate), `go/daemon/`
(contract only — the code lives in `proto/` until graduation),
`packages/core/`, `packages/client/`, `proto/` (the tracer bullet, with
its own gates and `DECISIONS.md`), `verify/` (model gates). Performance
work must also follow `bench/BENCH.md`.

## Working precepts

How this repository is worked. Each line is law, not narration.

- **Three tiers.** A coordinator judges, grills, and owns specs;
  research fleets scout and return dossiers; executors loop against
  coordinator-owned specs and stop at gates. An executor never edits
  the spec it builds against.
- **Concepts are ratified before machinery exists.** Grill one decision
  at a time, recommended option first. No build starts on an ungrilled
  decision — un-ratified machinery gets deleted later at higher cost
  than the grilling would have been.
- **Findings before fixes.** A widened-domain or fuzz failure is
  REPORTED with a minimized counterexample and STOPPED on. The red test
  stays red as evidence until the operator ratifies a disposition;
  repairing first destroys the finding.
- **Walls need independent oracles.** Both-sides-agree is not
  verification: two implementations sharing a bug agree, which is how
  `-0` survived until RFC 8785's Appendix B was made the referee. Name
  an oracle outside both sides, or the wall proves only consensus.
- **A prover that cannot fail proves nothing.** Every gate ships its
  negative controls, each refuted on exactly the law it dropped, traces
  committed (`verify/AGENTS.md`).
- **Claims are sized to their evidence.** A rung is claimed only with
  its gate met and its bounds stated, and it is recorded in
  `VERIFICATION.md` — a claim absent from that ledger is not made.
- **Every task keeps a DECISIONS log**: one entry per decision the spec
  did not fix — decided / alternatives / why / load-bearing flag.
  Numbering rule in `proto/DECISIONS.md`.
- **The primary checkout stays on `main`.** All work happens in
  worktrees.
- **`scratch/` is the executor handoff queue**, gitignored by design. A
  spec that must survive belongs in `docs/` or a ticket instead.
- **The public surface is lawful** (ADR-0010): a function enters a
  library only with the law that licenses it, and ships with the
  generated law tests.

## Effect v4

The workspace catalog pins the whole Effect family exactly to
`4.0.0-rc.108`. The authoritative source is the official release tag at
https://github.com/Effect-TS/effect/tree/effect%404.0.0-rc.108, which resolves
to commit
https://github.com/Effect-TS/effect/commit/bef7bf38ae4b73d5511043f707aed083de5da7cc.

Do not use npm's unqualified `latest` tag for Effect; it currently tracks
Effect v3. Confirm APIs against the pinned declarations in
`node_modules/effect/dist/*.d.ts` and the pinned source above rather than
memory. Schema is `effect/Schema`; do not add deprecated `@effect/schema`.

The pinned release is VENDORED at `repos/effect/` (git subtree, squashed
from the tag's commit above; update via `git subtree pull` at the new tag
when the pin moves). Treat it as read-only reference material: inspect
`repos/effect/` for idiomatic usage, tests, module structure, and API
design, and prefer examples from that source over generated guesses or
web search. `repos/effect/LLMS.md` and `repos/effect/ai-docs/` are the
in-repo orientation docs (upstream copy:
https://github.com/Effect-TS/effect/blob/main/LLMS.md). It is outside
every gate: `bunfig.toml` scopes test discovery to `packages/`, and
nothing may import from `repos/`.

## Non-negotiable rules

- `fixtures/stream-wall.json` is frozen. A digest mismatch means the change is
  wrong unless fixture regeneration was explicitly requested with a stated
  reason.
- Cross-language equivalence is proven by digest-equality walls, never by
  trusting a port.
- Keep the Go module stdlib-only unless a task explicitly requires otherwise.
- Add no TypeScript runtime dependency unless the task justifies it.
- Preserve user changes and avoid unrelated cleanup.

## Required gates

All must pass before completion:

```text
bun run typecheck
bun test
cd go && gofmt -l .
cd go && go vet ./...
cd go && go test ./...
```

`gofmt -l .` must print nothing. The optional wasm wall is
`bun run build:wasm && bun test`.
