# The join: a scheme hole typed by the authored digest

Issue: DEV-667 (slice stage 5, parent DEV-664)

## Why now

Slice stage 3. The scheme→type link is shipped code — the bootstrap
already types every hole by catalog digest and scheme validation
resolves them — but the digests have only ever come from the same code
that consumes them, and no real session has exercised the resolution.
This stage makes the two lanes touch for the first time: the stage-2
authored digest becomes the declared type of a real session's hole.

## Scope

1. Create a task-acceptance protocol value identical to the bootstrap
   scheme except `build_report` is typed by the stage-2 digest. Keep
   the literal `decision` hole so the D84 caveat stays satisfied —
   fixing D84 is draft 03, not this issue.
2. Negative control first: attempt `protocol.create` with a
   fabricated digest at the same position; commit the typed
   type-resolution refusal.
3. Open a session on the new protocol with the three seats bound to
   real principals; run the real fills, including one staged
   cross-seat conflict (dispute + fence at close, as in stage 1);
   operator fills `decision`; close with outcome `completed`.
4. Commit the protocol value, session journal, final state digest,
   and replay command in a dated record or `proto/wire/fixtures/`.

## Acceptance (mechanical)

- `protocol.create` accepted with the authored digest visible in the
  committed protocol value; the bogus-digest control refuses with the
  type-resolution refusal.
- Replaying the committed journal through `protocol.session.state`
  reproduces the committed final state digest; outcome `completed`.
- The record renders the trace for the operator: hole × event table
  or sequence diagram generated from the journal — every move, the
  refusal, the dispute's `(value, seat)` pairs, the fence.

## Out of scope

The seat-side codegen differential (stage 4). D84 (draft 03). Note
the daemon already type-checks every fill against the hole's
cataloged type (`proto/go/protod/value_check.go`) — this stage's
fills must conform or they refuse; an accidental conformance refusal
goes in the record as evidence, not as failure.

## Pointers

`proto/ts/src/protocol.ts`; `proto/ts/examples/task49-session.ts`;
`proto/wire/CONTRACT.md` §flb.protocol.v0 (validation: hole-seat
inclusion, type resolution; the D84 caveat); the stage-1 committed
record; `SLICE.md` seams S4/S6.
