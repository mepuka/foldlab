# playground

Bun-workspaces monorepo on Effect v4 (`4.0.0-beta.107`, pinned exact). Packages
live under `packages/*`. `bun run typecheck` must stay green; it carries Effect
Language Service diagnostics via the `@effect/tsgo` patch (`prepare` script —
TS7's native tsc is patched in place, and ELS findings appear in `tsc --noEmit`
output).

## The primitive ladder — goal-loop protocol

This repo builds a trustless, durable, distributed workflow engine for agent
coordination, as a ladder of primitives P0, P1, P2… Each primitive lives in
`docs/primitives/Pn-<name>.md` (the spec: definition + numbered laws) with its
law suite in `packages/kernel/test/` (the fitness function). The build method is
goal-driven hill climbing:

- **The spec and the law tests are authored by the coordinator and are the
  fitness function. An implementing agent MUST NOT modify the specs
  `docs/primitives/P*-<name>.md` (the `P*-attempts.md` climb logs are the
  agent's own and MUST be appended to), `packages/kernel/test/`,
  `packages/kernel/scripts/`,
  any `*_test.go` under `go/`, `go/go.mod`, or the coordinator-owned
  `packages/kernel/src/decider.ts`** — if a law seems wrong or
  unimplementable, STOP and report why instead of editing it; a law defect is
  a finding, not an obstacle. Fixture files under `packages/kernel/fixtures/`
  are generated ONCE (by the coordinator, or by the agent when a spec's ruled
  handoff says so), then frozen; regeneration requires a stated reason in the
  attempts log.
- Go code (NATS-server-side work, from P2 up) lives under `go/`, module
  `playground/kernel`, stdlib-only unless a spec rules a dependency in. The Go
  gate is `cd go && test -z "$(gofmt -l .)" && go vet ./... && go test ./...`
  (gofmt-emptiness is the law — `gofmt -l` exits 0 even when it lists files);
  it joins the TS gate, never replaces it.
- Implementation goes in `packages/kernel/src/` (and later `go/` for
  NATS-server-side code). TypeScript is Effect v4 native — check exports against
  `packages/kernel/node_modules/effect/dist/*.d.ts` before using an API; the
  shared source clone may be newer than the pin.
- Verification is mechanical: `bun run typecheck && bun test packages/kernel`
  green = the rung is climbed. ELS warnings are visible in typecheck output;
  errors fail it.
- Every attempt appends one line to `docs/primitives/Pn-attempts.md`:
  `attempt N: <what changed> -> <tests passing>/<total>`. Never delete prior
  lines — the climb history is data.
- No new runtime dependencies without the coordinator ruling it; `fast-check`
  (dev, law tests only) and `effect` are the founding set.

`.reference/Cotal` is a read-only shallow clone of https://github.com/Cotal-AI/Cotal
(the pub/sub standard for AI agents) kept for study; it is not part of the
workspace.

<!-- effect-solutions:start -->
## Effect Best Practices

**IMPORTANT:** Always consult the Effect v4 guides and real source before
writing Effect code.

1. The `effect-solutions` CLI does NOT run on this machine (no win32-x64
   binary). Read the same guides in the repo instead:
   https://github.com/kitlangton/effect-solutions (`packages/website/docs`).
   Topics: quick-start, project-setup, tsconfig, basics, services-and-layers,
   data-modeling, error-handling, config, testing, cli.
2. Search `~/.local/share/effect-solutions/effect` (`C:\Users\kokok\.local\share\effect-solutions\effect`)
   for real implementations — it is a shallow clone of the Effect v4 source at
   the current tip.
3. This repo pins `effect@4.0.0-beta.107` exactly. The source clone tracks tip
   and may be NEWER than the pin — before using an API from the clone, confirm
   the export exists in `node_modules/effect/dist/*.d.ts`. v4 betas rename
   things between releases (e.g. `Schema.TaggedErrorClass` → `Schema.TaggedError`
   at beta.104).

v4 orientation, verified for this pin: platform is folded into core
(`effect/FileSystem`, `effect/Path` — there is no `@effect/platform`); HTTP is
`effect/unstable/http`; CLI is `effect/unstable/cli`; runtime layers come from
`@effect/platform-bun` / `@effect/platform-node`.

Never guess at Effect patterns — check the guide or the source first.
<!-- effect-solutions:end -->
