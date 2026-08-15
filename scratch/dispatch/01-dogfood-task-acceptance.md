# Dogfood with teeth: run the estate's task acceptance through flb.protocol.v0

## Why now

This was task 49's stated acceptance criterion (grill record G6) and it
has never actually happened: the prior dogfood attempt produced prose
and no protocol session. The rule this issue enforces: a report without
a session journal is a failed run.

## Scope

Run one real task acceptance — a small genuine task, not a fixture —
end to end through the protod session runtime:

1. `protocol.create` the task-acceptance protocol value (or reuse the
   bootstrap one) against a running protod.
2. `protocol.session.open` with the three seats bound to real
   principals (operator, coordinator, builder).
3. Fill `spec` (coordinator), `authorization` (operator),
   `build_report` (builder), `review` (coordinator) with the real
   artifacts of the chosen task.
4. Operator fills `decision`; operator closes. Outcome must be
   `completed`.
5. Commit the resulting session journal (subjects + events) and the
   final state digest into `proto/wire/fixtures/` or a dated
   `docs/research/` record, with the replay command beside it.

## Acceptance (mechanical)

- A committed artifact holds the session's events and final state
  digest.
- Replaying the journal through `protocol.session.state`
  (verify-on-read) reproduces the same digest — the command and its
  output are part of the closing report.
- The close outcome is `completed`, exercising the D84 rule on a real
  session for the first time.

## Out of scope

Fixing D84 (the hardcoded `decision` hole) — but the closing report
MUST state whether the run confirms the deferral is tolerable or makes
it due.

## Pointers

`proto/wire/CONTRACT.md` §flb.protocol.v0 (including the D84 caveat);
`proto/DECISIONS.md` D79–D84; `proto/ts/examples/bootstrap-protocol-v0.ts`,
`task49-session.ts`.
