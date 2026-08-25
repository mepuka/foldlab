# Dispatch brief — worktree 5: the ledger extractor

Operational dispatch instrument, coordinator-issued 2026-08-25. Branch from the tip of
`main`. Governing specification: PROCEDURE.md §8 (the mechanical ledger) and §5 (the
monotonicity invariant it serves) — read PROCEDURE.md whole before writing anything.

## Mission

Hand-maintained proved-lists drift; the ledger is extracted, not written. Build the
extractor that turns the build outputs of BOTH sides into the committed
`docs/entity-store/LEDGER.md`, plus the drift check that keeps it honest. New
directory `experiments/entity-store-ledger/`; TypeScript on bun, zero dependencies,
no network — the proven `entity-store-generate` pattern.

## Extraction sources (pinned)

Cached builds may not replay info messages, so extraction NEVER parses `lake build`
output. After verifying both packages build green, the sources are fresh
re-elaborations and a harness run, each fully deterministic:

1. **Model side** — `~/.elan/bin/lake env lean E2/Gates.lean` with cwd
   `formal/entity-store`: the gate line (`e2 opaque/unsafe gate ok (N constants
   scanned)`) and every `'E2.<name>' depends on axioms: [...]` / `does not depend on
   any axioms` line from the central report block.
2. **Live-build side** — `~/.elan/bin/lake env lean Shell/Gate.lean` with cwd
   `experiments/entity-store-shell`: the `shell gates ok` line (G-S1/G-S2/G-S4
   content), and the G-S3 whitelist enumeration.
3. **Harness** — `~/.elan/bin/lake exe harness harness <tmp-workdir>` with cwd
   `experiments/entity-store-shell` (tmp-workdir under the system temp dir, removed
   after): the per-script `PASS`/`FAIL` lines with transcript line counts, and the
   final summary line.

Parse STRICTLY: within a report block, a line matching none of the expected shapes is
an ERROR that fails extraction — a parser that silently skips is how drift hides.

## Output: `docs/entity-store/LEDGER.md`

Generated text, byte-deterministic: banner on line 1 naming the generator and DO NOT
EDIT; LF endings; trailing newline; no timestamps, no host paths, no git SHAs.
Sections:

1. **Model** — the gate constant count; a table `theorem | axioms` in the order the
   gate block prints (Gates.lean's own order — stable in git).
2. **Live build** — the shell gate line verbatim; the IO whitelist as an enumerated
   list; a table `script | status | transcript lines` sorted by script filename; the
   harness summary line.
3. **Extraction basis** — the three commands above, verbatim, so a reader can
   reproduce the ledger by hand.

You are licensed to write exactly ONE file outside your directory:
`docs/entity-store/LEDGER.md`, and only ever by running your own tool. Note: the
coordinator regenerates it at merge if `main` has advanced past your branch point;
your committed copy must be the honest output for YOUR branch state.

## Scripts and tests

`package.json` scripts: `gen` (extract and write LEDGER.md), `check` (verify both
packages build green, regenerate to a temp path, byte-compare against the committed
LEDGER.md, nonzero exit on any difference — extra or missing content included).

`bun test`: determinism (two runs, byte-identical); drift detection (a mutated copy
fails the byte-compare); strict-parse behavior (a fixture log with an unexpected line
shape fails extraction — commit small captured fixture logs for these unit tests, and
mark them as fixtures in the README). The end-to-end path runs the real commands.

Out of scope, explicitly: the consecutive-ledger monotonicity diff (git-history-based;
later), any change to Gates.lean or Shell/Gate.lean (if a report format is
inconvenient to parse, that is a FINDING for the coordinator, not an edit), and any
mise wiring (coordinator's, at merge).

## Law of the worktree

Touch nothing outside `experiments/entity-store-ledger/` except the single licensed
output file. Zero new dependencies. No network at build, run, or test time. `lake`
via `~/.elan/bin/lake`; both packages build in YOUR worktree checkout (your own
`.lake`). A design question this brief does not settle is a STOP-and-report finding.
Never push (the pre-push hook will refuse you regardless). Declarative commit titles.

## Report

Branch + diff summary; the committed LEDGER.md content; `bun test` output; a `check`
run transcript; findings — especially any report-format inconveniences you did NOT
fix (see out-of-scope) and anything that smelled like a design decision.
