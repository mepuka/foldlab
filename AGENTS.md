# foldlab agent contract

This file is the single source of truth for repository agent instructions.
Compatibility files such as `CLAUDE.md` only point here.

## Read first

- `CONTEXT.md` — canonical domain language and invariants (seam-level
  only; module vocabulary lives in each module's own `CONTEXT.md`)
- `README.md` — repository layout and runnable claims
- `NEXT.md` — current design state and ratified direction
- `docs/adr/` — architectural decisions
- `docs/gauntlet/` — frozen specs, laws, and verification results

## Scoped contracts

Module directories carry their own `AGENTS.md` (enforceable laws) and
`CONTEXT.md` (module-local vocabulary hidden behind the seam). Read the
scoped files before editing inside: `go/` (substrate), `go/daemon/`,
`packages/core/`, `packages/client/`. Performance work must also follow
`bench/BENCH.md`.

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
