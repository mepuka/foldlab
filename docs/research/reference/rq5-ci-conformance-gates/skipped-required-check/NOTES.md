# The skipped-but-required check

Primary source, quoted verbatim from GitHub's own documentation source
(`github/docs`, `content/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks.md`,
retrieved 2026-08-16 via the GitHub contents API), section
**"Handling skipped but required checks"**:

| Cause | Result |
| --- | --- |
| A workflow is skipped by path filtering, branch filtering, or a commit message | Associated checks stay in a "Pending" state and block merging |
| A job is skipped by a conditional | The job reports "Success" |
| A job depends on a failed job | The dependent job is skipped and may not block merging |

and, from the section **"Required check needs to succeed against the
latest commit SHA"**:

> Successful check statuses are `success`, `skipped`, and `neutral`.

## Why this is the sharpest CI anti-pattern for D-e

The two rows behave in *opposite* directions, and the dangerous one is
the quiet one:

* Path/branch filtering fails **safe** — the check hangs Pending and the
  merge is blocked. Annoying, visible, fixed within the hour.
* A job-level `if:` fails **open** — the job reports **Success**, and the
  branch-protection rule that requires it is satisfied by a job that never
  ran. Nothing in the UI says the proof was not checked; the green tick is
  the same green tick.

D-e obligation 5 makes one command's exit status the truth-value of a
ledger row. If that command runs in a job carrying an `if:` — a nightly
tier, an `if: github.event_name == 'schedule'`, a
`if: needs.changed.outputs.lean == 'true'` path optimisation — then on
every pull request where the condition is false the ledger row reports
`proved` on the strength of a job that did not execute.

This estate already has jobs of exactly that shape:
`.github/workflows/negative-controls.yml` gates its `bridge` and
`windows-r4` jobs on
`if: ${{ github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}`.
They are correct as a scheduled tier. They would be silently vacuous the
day someone adds either name to the required-checks list.

## The shape to use instead

`example-workflow.yml.sample` in this directory is an own-authored
illustration, not an installed workflow. It shows the two halves:

* the **required** job carries no `if:` and no `paths:` filter, so it
  cannot be skipped into a green tick;
* the expensive tier is a *separate*, non-required job, and the required
  job's last step asserts that the expensive tier either ran or was
  legitimately not needed — the assertion, not the scheduler, is what
  decides.
