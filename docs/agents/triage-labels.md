# Triage labels

Two registers, two vocabularies. GitHub labels on `mepuka/foldlab` govern the
findings register. The Multica board carries dispatch state and priority as
native fields — status `todo | in_progress | in_review | done | cancelled`,
priority `none | low | medium | high | urgent` — never as labels. No GitHub
label sets board state, and no board label records a finding. The tracker
contract is [`issue-tracker.md`](issue-tracker.md).

## The findings register

| Label               | Meaning                                                  | When it applies                                                                                             |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `finding`           | A reported defect with committed evidence                  | Every register entry that reports a defect. Findings come before fixes: the red evidence stays until the operator rules a disposition. |
| `priority-1`        | Fix first — exploitable now or high-severity               | The defect is live or its blast radius reaches a claimed rung.                                              |
| `priority-2`        | Medium — fix in normal cycle                               | The default for a real defect with no live exposure.                                                        |
| `priority-3`        | Low — opportunistic                                        | Real, recorded, and worth fixing when the surrounding work is already open.                                 |
| `proof-mechanics`   | Verification-gate / model-checking finding                 | The defect is in the verification machinery — a gate that cannot fail, a missing negative control, an unrunnable prover — rather than in product code. |
| `needs-disposition` | Awaiting an operator decision before fix                   | The repair needs a ruling. No fix branch starts while this is on.                                           |
| `fix-in-flight`     | Repair actively in progress                                | A branch is open against the finding.                                                                       |
| `fix-ready`         | Repair applied and certified on a branch; PR-able          | The gates the finding names are green on the branch.                                                        |
| `enhancement`       | New feature or request                                     | A register entry that is not a reported defect.                                                             |
| `bug`               | Something isn't working                                    | Superseded by `finding`. Entries `#1`–`#11` carry it; do not apply it to new entries.                       |

An entry carries `finding`, one `priority-<n>`, and at most one disposition
label — `needs-disposition`, `fix-in-flight`, or `fix-ready`. Priority and
disposition are orthogonal: priority says when it gets fixed, disposition says
where the repair stands. `proof-mechanics` is additive and rides alongside.

GitHub's remaining stock labels (`documentation`, `duplicate`,
`good first issue`, `help wanted`, `invalid`, `question`, `wontfix`) are unused
here.

## The board

Board labels are workspace-wide, applied by id with
`multica issue label add <issue> <label-id>` and enumerated by
`multica label list`. The vocabulary:

| Label                                 | Meaning                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| `ready-for-agent`                     | The body meets the dispatch contract, which is what the label asserts |
| `ready-for-human`                     | Requires human implementation                                         |
| `needs-triage`                        | Awaiting evaluation; entry state                                      |
| `needs-info`                          | Waiting on the reporter for more information                          |
| `needs-ruling`                        | Blocked on an operator ruling; the decision record must move first     |
| `probe`                               | A measurement issue: the deliverable is a recorded fact               |
| `wontfix`                             | Will not be actioned                                                  |
| `machine:mba`, `machine:pc`, `machine:cross` | Which machine the work runs on                                 |
| `wayfinder:map`                       | The canonical wayfinder decision map                                  |

Apply labels as described. Do not extend either vocabulary: a missing label is
a `needs-ruling` finding, not a string to invent.
