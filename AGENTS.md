# foldlab agent contract

This file is the single source of truth for repository agent instructions.
Compatibility files such as `CLAUDE.md` only point here.

## Read first

- `CONTEXT.md` — canonical domain language and invariants
- `README.md` — repository layout and runnable claims
- `NEXT.md` — current design state and ratified direction
- `docs/adr/` — architectural decisions
- `docs/gauntlet/` — frozen specs, laws, and verification results

Read the relevant scoped docs before editing. Performance work must also follow
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
