# Issue tracker

Work for this repository is tracked on the **Multica board** — workspace
`Dev`, project `foldlab` — reached through the `multica` CLI. Skills that
cut, publish, or read issues (`to-spec`, `to-tickets`, `implement`,
`review-spec`) target the board. GitHub Issues on `mepuka/foldlab` are the
findings register and nothing else; GitHub pull requests carry code and
review. The label vocabulary for both is
[`triage-labels.md`](triage-labels.md).

## Identifiers

- Board issues are keyed `DEV-<n>` and are quoted verbatim in prose,
  commits, and reports.
- Projects are per initiative: `plait`, `foldlab`, `fleet`, `tailtalk`.
  Every issue carries a project — `--project` is required at creation, and a
  null project is never a valid board state.
- Findings-register entries are keyed `#<n>` in GitHub's own number space,
  which is shared with pull requests. `DEV-<n>` never names a GitHub issue
  and `#<n>` never names a board issue.
- A seat's branch is `agent/<name>/<issue>`.

## The two registers

Plain-English intent, decisions, blockers, and — for a blocked or failed run
only — the pasted failing evidence go on the board issue. Code, diffs, file
paths, line numbers, commits, anchored review findings, and the full check
output of a completed run go on the GitHub pull request. Link the two; do not
copy one register into the other.

The findings register is the third surface and is not dispatchable: it
records defects with committed evidence, worked by the operator, and carries
no dispatch contract. Everything dispatchable stays on the board.

Agent seats reach the GitHub API through the `executor-cf` MCP `execute`
tool, not the host `gh` CLI (ruled 2026-08-17; see `AGENTS.md`). Plain git
transport is unchanged.

## The issue template

Cutting and dispatching are themselves gated: before a ticket is created
or assigned it must pass the [dispatch gate](dispatch-gate.md) — the lane
test, the three ratification questions, and the vertical-slice standard.
A body that cannot answer the ratification questions is not dispatchable.

A ticket body is:

```markdown
## Parent

`DEV-<n>` the spec or map this ticket was cut from. Omit if there is none.

## What to build

The end-to-end behaviour this ticket makes work, from the user's perspective —
not a layer-by-layer implementation list.

## Evidence of done

Named, runnable checks — `mise run check`, `bun test packages/<x>` — never prose.
Verify each is runnable before the ticket is dispatched.

## Seams under test

The interfaces this change is measured at. A code-writing ticket that names
none invites a stop. A read-only or measurement ticket states `None`, which is
an answered field.

## Limits

What this ticket must not touch, and the work deliberately left alone.

## Build against

The commit this ticket is measured against.

## Blocked by

`DEV-<n>` for each blocking ticket, or "none".
```

A review ticket has no build goal and no runnable check. It states what to
review, the authorities to review against, and the verdict form instead.

File paths and code snippets go stale; keep them out of ticket bodies. The
exception is a prototype snippet that encodes a decision more precisely than
prose can — inline the decision-rich part and say where it came from.

## Blocking edges

Child issues are measured: `multica issue create --parent <id> [--stage <n>]`
groups sub-issues into ordered barrier groups, and `multica issue children`
lists them. Native blocking links are not measured — no verb creates one — so
a blocking edge is carried as a `Blocked by: DEV-<n>` line in the ticket body.
That is the convention; a ticket with no blockers states `none`.

## Publishing

```sh
multica issue create --title "<title>" --project <project-id> --description-stdin < ticket.md
multica issue label add <issue> <label-id>
```

Publish in dependency order, blockers first, so each ticket's edges name real
`DEV-<n>` identifiers. On Windows publish with `--description-file` — stdin
piping mangles non-ASCII bytes there. The description path must sit inside the
current working directory unless `--allow-external-file` is passed. Structured
reads take `--output json`.

## Dispatch

Assignment is dispatch. Assigning an issue to an agent enqueues exactly one
run. A status change alone starts none, and adding a wake-up mention on top of
an assignment dispatches twice. A skill that cuts tickets does not assign them;
the operator decides when a ticket is dispatched.

The issue body is the whole contract. It states one concrete goal, observable
evidence of done, the limits and untouched work, and the commit to build
against, and it names the interface where a build change will be measured.
Every named check is verified runnable before dispatch. A contract that cannot
be executed without guessing is a stop, not a run.

Status and priority are board-native fields, not labels. Status is one of
`todo`, `in_progress`, `in_review`, `done`, `cancelled`; priority is one of
`none`, `low`, `medium`, `high`, `urgent`. `in_review` closes a run. Merging —
and with it `done` — is the human's act; a dispatching agent reviews and
reports, never merges.

Seats run concurrently. One seat carries at least two runs and typically four,
so a dispatch names its own build-against commit rather than assuming the
state of a shared checkout.

## Reports

Report a blocked or failed run on the issue with:

```text
Expected:  <behavior, with path:line or the command that should succeed>
Actual:    <behavior, with the failing command>
Repro:     <one command, and the pin it runs against>
Evidence:  <pull request, CI run, attachment, or pasted failing output>
```

Close with the result first, omitting empty fields:

```text
Result:    <what is now true>
Changed:   <pull request and other moved artifacts>
Verified:  <checks actually run and their outcome>
Caveats:   <unresolved risk or deliberately untouched work>
```

A run closes with a report in the issue thread. Anything not in the thread did
not happen.

## Provisioning

Changes to this document and to [`triage-labels.md`](triage-labels.md) are
operator-ruled. An agent that finds either wrong reports the gap and changes
nothing.
