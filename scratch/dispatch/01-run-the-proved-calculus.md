# Run the proved calculus: the first real protocol session

## Why now

Ruling from the 2026-08-15 alignment grill: the move calculus is proved
(`verify/moves`, seventeen results) and the runtime shipped (task 49),
but no real protocol session has ever run — the prior dogfood produced
artifacts out-of-band instead of through the meaning scheduler, which
is the failure this issue exists to end. Proved-but-never-run is
un-consumed machinery by the estate's own definition. The rule this
issue enforces: a report without a session journal is a failed run.

## Scope

Run one real task acceptance — a small genuine task, not a fixture —
end to end through the protod session runtime, using the
task-acceptance scheme (the one whose close semantics D84 supports):

1. `protocol.create` the task-acceptance protocol value (or reuse the
   bootstrap one) against a running protod.
2. `protocol.session.open` with the three seats bound to real
   principals (operator, coordinator, builder).
3. Fill `spec` (coordinator), `authorization` (operator),
   `build_report` (builder), `review` (coordinator) with the real
   artifacts of the chosen task.
4. Exercise the calculus's heart once for real: stage one conflicting
   cross-seat fill so the runtime synthesizes a recorded dispute with
   pair-attributed candidates, then let close fence it by the declared
   seat order. The proofs are about dispute and fence; a session that
   never disputes exercises only the easy half.
5. Operator fills `decision`; operator closes. Outcome must be
   `completed`.
6. Commit the resulting session journal (subjects + events) and the
   final state digest into `proto/wire/fixtures/` or a dated
   `docs/research/` record, with the replay command beside it.

## Acceptance (mechanical)

- A committed artifact holds the session's events and final state
  digest.
- Replaying the journal through `protocol.session.state`
  (verify-on-read) reproduces the same digest — the command and its
  output are part of the closing report.
- The dispute appears in the journal with both `(value, seat)`
  candidates, and the close records its fenced resolution.
- The close outcome is `completed`, exercising the D84 rule on a real
  session for the first time.

## Out of scope

Fixing D84 (that is issue 03) — but the closing report MUST state
whether the run confirms the deferral is tolerable or makes it due.
Any non-task-acceptance protocol scheme (blocked on 03).

## Pointers

`proto/wire/CONTRACT.md` §flb.protocol.v0 (including the D84 caveat);
`proto/DECISIONS.md` D79–D84; `proto/ts/examples/bootstrap-protocol-v0.ts`,
`task49-session.ts`; `docs/design/2026-08-15-estate-focus-grill-record.md`
(the alignment-grill addendum).
