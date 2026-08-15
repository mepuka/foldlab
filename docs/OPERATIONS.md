# Operations

How this repository is run now that `main` is public. The gates are the
policy; this file is only the wiring around them.

## Local gate entrypoints

Run the complete root and tracer-bullet battery from either host shell:

```text
bash scripts/gates.sh
pwsh -File scripts/gates.ps1
```

Both wrappers invoke the same `scripts/gates.ts` plan, so the Windows and Unix
commands cannot drift into separate transcriptions. `bun run gates` invokes
that same plan directly. Each entrypoint accepts `--self-test`; the control
first accepts a known-successful subprocess and then requires a planted exit
23 to be preserved; a second control requires a zero-exit formatting command
that prints a filename to be refused.

Every workspace package also exposes `bun run test` from its own directory.
The empty `ai`, `client`, and `codegen` promotion placeholders run the exact
empty-package policy rather than claiming laws they do not have; `core` and
`server` run their package-owned tests. `bun run test:packages` executes all
five scripts and is part of the repository gate.

## Branch protection on `main`

- Require the `gate battery` check (the one job in `gates.yml`) green
  before merge. It is the whole local battery, so "green here, red
  there" is a bug in one of the two.
- Require the branch to be up to date with `main` before merging — the
  differential lanes are cross-language, and a stale base can pass a
  gate the merge result would fail.
- No force-push, no branch deletion. History is evidence: counterexample
  traces, gauntlet bundles, and fixture digests are all cited by commit,
  and a rewritten commit unclaims a rung silently. Merge commits stay —
  the task-branch merge is where a lane's evidence joins the trunk.
- `model-gate.yml` is NOT required — it is a weekly canary on a rolling
  upstream jar, and a red canary is a finding to read, not a merge block.

## Pins are law — no dependency bots

Dependabot and Renovate are not enabled here and should not be. Every
version in this repository is pinned exactly (`effect@4.0.0-rc.108`, Go
1.26, `nats-server v2.14.4`, `nats.go v1.53.1`, bun 1.3.14, TLC's
recorded jar sha256), and a pin is not a floor — it is the toolchain a
claim was certified against. Bumping one re-opens every fixture wall and
every recorded state count behind it: the JCS corpus, `stream-wall.json`,
the wire fixtures, the R2 closure numbers. An automated PR that flips a
pin is asking a bot to make a verification decision.

Re-pinning is therefore deliberate. Move the pin by hand, re-run the
battery and the affected model gates, and record what moved and what it
cost — the same way `verify/catalog/run.sh` records the jar it actually
ran rather than trusting the tag.

## Daemon durability and memory posture

`protod` and `journald` require `--sync-mode crash-durable` or
`--sync-mode power-durable`. Crash-durable is the kill-9 envelope and does not
cover plug-pull loss; power-durable selects the pinned server's sync-always
path. The measured cost is in
[`docs/bench/2026-08-13-task-19-nats-hardening.md`](bench/2026-08-13-task-19-nats-hardening.md).

Both commands set the Go runtime memory limit to 512 MiB; `protod` exposes
`--memory-limit` for an explicit deployment override. Direct users of the
embedded `protod.Acquire` library own their process-wide limit. Broker logs go
to stderr. A line carrying `ipq_drops_total` means the JetStream API internal
queue already dropped requests: page on the increasing counter and reconcile
from journal authority; the counter is evidence, not recovery.
Per-stream internal queues can also drop under burst. Synchronous
acknowledgements mostly mitigate that pressure but do not turn the queue into a
lossless channel; reconcile from the journal rather than inferring recovery
from the absence of the API-queue counter.

## How work reaches `main`

Work is dispatched as an issue on the Multica board (workspace `Dev`,
project `foldlab`). An agent seat takes the issue, works on
`agent/<name>/<issue>`, pushes that branch, and opens a PR; the gates
run on the PR. A Rev seat posts findings on the PR, and a repair
mentions the seat that filed them. The coordinator reads the gate result
and the PR template, merges into `main`, and pushes. Nobody pushes to
`main` from an agent seat; the merge is the coordinator's act, and it is
the only place two lanes meet. The run closes with a report on the
dispatching thread, which is the durable record — a report that lives
only in a session transcript did not happen.

`scratch/` is tracked as of 2026-08-15, so a task brief is part of the
checkout an agent gets. `scratch/_archive/` stays ignored: retired
briefs are local history, not repository evidence.

## Releases

Tag at ladder milestones only: a tag says a rung is claimed, not that a
sprint ended. Artifacts are verifier bundles per the gauntlet tradition
— bundle plus the verifier that re-derives it, recomputable by a stranger.

## What a green CI actually certifies

The differential fuzz runs at bounded seeds and bounded run counts here,
so CI green certifies the corpus and those seeds — not all inputs
(ADR-0007). The long variants in README.md remain a deliberate human act.
