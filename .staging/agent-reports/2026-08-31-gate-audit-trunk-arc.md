# Gate audit — the last five commits, and the dev lane's start command

Host: macOS coordinator. Audited at `56a938fe`, working tree clean at
the start of the run.

## Verdict

`mise run check` is RED at `HEAD`, at exactly one task: `check:workbench`
halts on `bun run typecheck`. The other nine gates are green here.

Four of the five audited commits have never been through CI: they are
unpushed. The one that was pushed, `9bbcb901`, failed.

CI itself has not reached most of the chain in at least fifteen
consecutive runs. `check:extract` dies on every host, and everything
after it in `check:ci` has never executed there.

## Measured at HEAD

| Gate | Verdict |
|---|---|
| `mise run gen` + `git diff --exit-code` | clean — no derived file drifts |
| `check:fips202` | GREEN |
| `check:entity-store` | GREEN |
| `check:extract` | GREEN (this host only — see F1) |
| `check:generate` | GREEN |
| `check:machine` | GREEN |
| `check:cas` | GREEN |
| `check:effects:ts` | GREEN |
| `check:effects:research` | GREEN |
| `check:ledger` | GREEN |
| `check:workbench` | RED at `typecheck` |

Each was run with `mise run --force`, one at a time, so no failure
masks a later task.

## F1 — `check:ci` has been dead past `check:extract` since at least 2026-08-29

`check:extract` reads `.staging/e2/src-cache/`, which `.gitignore:14`
excludes by name. The directory is 1.1 MB, present on this host, and
carried by no lockfile and no bootstrap. On a fresh clone
`experiments/entity-store-extract/src/contract.ts:99` raises
`src-cache-absent` after trying four paths.

`library/cas/tools/EnvLedger.lean:138` declares:

```
("check:extract", "portable", "reads the vendored pinned Effect sources; committed bun lockfile"),
```

The sources are not vendored. Because the row says `portable`,
`check:extract` stays in `check:ci`, and `check:ci` runs it third.

The gates after it in `check:ci` — `check:generate`, `check:machine`,
`check:cas:surface`, `check:cas:obligations`, `check:cas`,
`check:effects:ts`, `check:effects:research`, `check:ledger`,
`check:workbench` — have therefore never executed in CI.
`.github/workflows/check.yml` states "The gate is not thinned — every PR
runs the complete portable chain once." That is not what happens.

Evidence: runs `33345228717` (all three OSes), `33337998558`,
`33286752669`. Every `check` job ends at the same error. The fifteen
runs `gh run list` shows are all failures.

Residence is declared and never inferred, by design, so nothing in the
ledger can catch a false row. This one has to be ruled on:

1. Bootstrap the cache in CI from a pinned source, keeping the
   `portable` row true; or
2. mark `check:extract` `host-local` and drop it from `check:ci`,
   accepting a named hole in the chain.

Option 2 changes what the estate claims CI proves, so it is the
operator's call, not this audit's.

## F2 — four commits have no CI record

`origin/main` is `9bbcb901`. Unpushed: `d9cf99ee`, `011d455b`,
`24dead16`, `56a938fe`. For those four, "the gates were followed" can
only mean locally.

`9bbcb901` is the only one CI saw, and both jobs failed — `effects-ts`
on a lint error at `src/cas/CanonicalSchema.ts:605` ("Unnecessary return
statement"), `check` on F1.

## F3 — HEAD is red by method, and the red is undeclared

`56a938fe` lands the S3b battery before its implementer, which
`.agents/skills/implement/CONTRACT.md` requires: the packet is committed
by the breaker before any implementation commit touches the code under
contract, and a packet first committed alongside the implementation is a
process defect. Landing it red on `main` follows the method.

What is missing is the declaration. `.github/workflows/check.yml` states
one known-red gate and names it; this second one is stated nowhere, so a
reader of the workflow's own skip-list cannot tell a method-red apart
from a break.

## F4 — the workflow's KNOWN RED note is stale

The note says `check:effects:ts` is red on
`effect(multipleEffectProvide)` at `bin/cli/commands.ts:766`, and that
"effects-ts and check go green when that lands." It landed in
`011d455b`. `check:effects:ts` is GREEN on this host at `HEAD`. CI
cannot confirm it, because F1 stops the chain before it.

## F5 — `56a938fe`'s claim is accurate and incomplete

Claimed: "8 files red at collection on the missing contract modules; 94
existing tests stay green; lint and build green." Measured at `HEAD`:
`lint` green, `build` green, `vitest` reports `Test Files 8 failed | 11
passed (19)` and `Tests 94 passed (94)`. Every number holds.

`typecheck` is red and is not mentioned. It runs second in
`check:workbench`, before `test` and `build`, so the gate never reaches
vitest at all. A reader of the message would expect the described run;
the gate produces 26 `tsc` errors and stops.

## The dev lane

`mise run dev` starts the workbench dev server and opens the trunk dev
fixture viewer. It runs the frozen install first, then the package's own
`dev:fixture` script, so the route is spelled once.

Verified: frozen install 59 ms, Vite ready in 381 ms,
`http://localhost:5173/dev/index.html` returns 200 with title
`trunk dev fixture viewer`, `http://localhost:5173/` returns 200 with
title `foldlab workbench`.

The task carries no `sources` or `outputs`, so it is never skipped as
fresh, and it is unreachable from `check` and `check:ci`, so
`gen:env-ledger` files it under `excludedGates`. `envledger --check`
passes at 53 tasks.

Changed: `mise.toml` (the task), `library/cas/tools/EnvLedger.lean` (its
residence row), `experiments/workbench/package.json` (`dev:fixture`),
`library/cas/meta/out/environment.META.json` (regenerated),
`.github/workflows/check.yml` (the exclusion enumeration),
`experiments/workbench/README.md`.

`mise run gen` after the change leaves exactly those six files modified
and produces no further drift.
