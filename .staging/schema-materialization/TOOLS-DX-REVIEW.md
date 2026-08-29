# tools/ — DX review and tightening plan

2026-08-29, coordinator review of `library/cas/tools/` (8 exes, 1355
lines). Implementation queued behind the in-flight verdicts agent,
which owns the directory today.

## What already works and must not be lost

Outputs computed by executing the model, never hand-written; byte
gates uniform in intent; every error names its fix ("run `lake exe
X`"); registries as plain data; one doc header per tool stating its
law. The review below is about the 80% of each file that is the same
file.

## Findings

**F1 — Eight hand-rolled copies of one skeleton.** Every tool
re-implements: read-or-"missing — run X", `unless actual == expected`,
`wrote/ok` printlns, and the `main` arg match. `Vectors.lean`,
`Schemas.lean`, `EmitWire.lean`, `EmitPrograms.lean`, `EmitMcp.lean`,
`EmitLift.lean`, `Surface.lean`, `Verdicts.lean` differ only in how
they produce `List (path × content)`.

**F2 — Inconsistent invocation.** Four tools take no path (fixed
outDir); three REQUIRE a positional path the caller must know
(`../effects/src/cas/generated/...` lives only in mise.toml). A fresh
session cannot run `lake exe emitwire` without excavating the task
file.

**F3 — First-failure-only checking.** `--check` throws on the first
diff; a red gate with three stale fixtures takes three runs to see.
No hint of WHERE bytes differ.

**F4 — Prose-only output.** Agents and CI parse `ok foo.json (5
schemas)` strings. No structured mode, no stable verdict vocabulary
across tools (the AXLE lesson: a tool's output is a typed thing).

**F5 — Registries live in tool roots, outside `lake build`.** A new
row in `tools/Schemas.lean` elaborates only when the exe builds; and
other consumers (pin tests, the verdicts corpus) cannot import a
registry without importing an exe root.

**F6 — No discoverability.** Seven exe names; the tool table exists
only in the backend-materialize skill and mise.toml. Nothing answers
`--help` beyond a usage line; nothing lists the suite.

## Proposals

**P1 — One driver module: `tools/Gate.lean`.**
```
structure Fixture where path : FilePath; content : String; label : String
def Gate.main (regen : String) (fixtures : IO (List Fixture))
    (args : List String) : IO Unit
```
handling emit / `--check` (collect ALL diffs, report each with the
first differing byte offset and line, then fail once) / `--json` /
usage. Each tool body becomes its registry → `List Fixture` plus one
`def main := Gate.main "lake exe schemas" fixtures`. Kills F1, F3, F4
in one slice; output format becomes uniform by construction.

**P2 — Default paths in the tool, override optional.** The three
path-taking tools learn their canonical target (the registry knows
where its artifact lives); the positional arg becomes an override.
mise entries shrink to `lake exe emitwire --check`. Kills F2.

**P3 — `--json` on the shared driver**: one line per fixture,
`{tool, fixture, verdict: wrote|ok|missing|differs, bytes, hint}` —
the stable verdict vocabulary, same words as the prose lines. Kills
F4 for every tool at once.

**P4 — Registries move into the library** (`Cas/Vectors/Registry`
already models it): `Cas/Schema/Fixtures.lean` for the schema rows,
an emit-target constant beside each registry. Tool roots import and
drive; `lake build` elaborates every row; the pin tests and verdicts
corpus import rows instead of duplicating names. Kills F5.

**P5 — `lake exe cas` umbrella** (optional, after P1): subcommands
`gen [tool…]`, `check [tool…]`, `list` (the AXLE Table-1 view: every
tool, its artifact, its gate). Existing exes stay; the umbrella is
sugar over the same Gate calls, usable in worktrees where mise tasks
reference paths that don't exist. Kills F6.

**P6 — Small fixes in passing**: `Surface.lean` computes the full
document before parsing args (a typo'd flag pays the whole import);
usage strings should show the real arg order.

## Sequencing

P1+P6 first (pure refactor, byte-identical artifacts — the gates
themselves prove it), then P2 (mise diff), then P3, then P4 (moves
code under the build), P5 last if wanted. All after the verdicts
agent lands. Each step leaves every existing invocation working.
