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

## Multica runtime operations

### Correlate a task with its worker

Use the task UUID as the join key. Do not infer ownership from an issue status,
branch name, or the most recently created workspace directory.

```text
multica daemon status
multica issue runs <issue-key> --full-id --output json
multica issue run-messages <task-id> --issue <issue-key> --output json
multica daemon disk-usage --by-task --output json
multica daemon logs --help
multica daemon logs --lines <large-enough-tail>
```

Filter the daemon tail locally by the exact task id and incident window. The
daemon prints host-local timestamps, so translate a UTC evidence window first.
The useful records, in order, are `task received`, `task context`, `starting
agent`, the provider's `started` record with PID and working directory, the
server-side terminal-state record, and the provider's `finished` record. The
current CLI has a line-count filter but no time-range filter, so choose a tail
that reaches the incident and narrow the output after collection. Redact tokens,
authorization headers, and secrets before quoting it.

`starting agent` is authoritative for the physical working directory. A resumed
task can carry `reuse_workdir=true` and run in an earlier task's directory; in
that case `daemon disk-usage` reports the earlier directory id, not the resumed
task id. A cancelled task can also have zero `run-messages` because the daemon
discards its result after cancellation. Neither condition means the worker was
never launched.

On Windows, check whether the recorded provider PID or any related process still
exists. Use both views: `Get-Process` supplies start time and executable path,
while CIM supplies parent PID and command line.

```powershell
Get-Process -Id <provider-pid> -ErrorAction SilentlyContinue |
  Select-Object Id, ProcessName, StartTime, Path

Get-CimInstance Win32_Process |
  Where-Object {
    $_.ProcessId -eq <provider-pid> -or
    $_.ParentProcessId -eq <provider-pid> -or
    $_.CommandLine -like '*<task-id-or-workdir>*'
  } |
  Select-Object ProcessId, ParentProcessId, Name, CreationDate, CommandLine
```

Build the parent-child chain before drawing a conclusion. Match it against the
daemon PID, provider start time, provider command, and exact working directory;
process name alone is not attribution.

### Cancellation bound

Treat `cancel-task` as a request to stop and discard a task result, not as proof
that every process with the task's credentials and working directory is gone.
The daemon's `interrupting agent` and provider `finished` records confirm the
wrapper lifecycle only. Cancellation is complete operationally only after the
recorded PID and every correlated descendant or detached child are absent.

DEV-714 established this bound on Windows with Multica daemon 0.4.20. At
12:27:17Z the daemon launched `claude.cmd` PID 33712 for task `49d7ab3b` in the
reused `cd286145` working directory. It observed the server-side cancellation at
12:27:19Z and logged that wrapper as `aborted` at 12:27:29Z. The same execution
path nevertheless authored commit `3e824ed` at 12:32:46Z and opened PR #70 at
12:33:24Z; the independent task `ace25693` did not encounter that already-open
PR until 12:35:30Z. The post-abort PID is not present in the retained logs, so
the wrapper's abort proves that cancellation reached the launched wrapper while
the later writes locate the failure at Windows wrapper/process-tree containment.
The retained evidence does not distinguish a missing Job Object from another
child-detachment mechanism; it does rule out failure to signal the wrapper. No
DEV-708 provider process survived the later host inspection.

The CLI help's interruption wording and the daemon's log message express intent;
the observed behavior above is the operative guarantee until the runtime gains
a verified process-tree kill. A coordinator must therefore treat `cancelled` as
"result no longer tracked" until the process inspection is clean. Any branch,
issue, or GitHub write after the cancellation timestamp is untrusted until it is
reconciled deliberately.

### Safely stop a surviving worker

1. Record the full task UUID and cancellation timestamp, then use the correlation
   procedure above. Do not stop or restart the daemon: it owns unrelated tasks.
2. If a provider process or correlated child survives, report a finding with its
   PID, parent chain, command line, start time, and working directory. Stop and
   obtain coordinator authorization before terminating anything.
3. After authorization, re-read the process table to defeat PID reuse. Require
   the same executable, start time, command line, and task/workdir correlation.
4. Terminate only each verified surviving root and its descendants. On Windows,
   use `taskkill.exe /PID <verified-pid> /T /F`; never kill by process name or a
   workspace-wide match. If the original wrapper is already absent, use the
   exact verified orphan PID as the root.
5. Re-run both process inspections and require no correlated process. Then check
   the task's branch, issue comments, and pull requests for writes newer than the
   cancellation timestamp before allowing another run to reuse the branch or
   working directory.

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
