# Author one real type through the wire

Issue: DEV-666 (slice stage 4, parent DEV-664)

## Why now

Slice stage 2. The authoring loop — root hole, `type.fill`, frontier,
close — is stated in the contract and modeled in `verify/ir`, but no
real type has ever been produced through it for a genuine need: every
type in today's catalog was created by code in one shot
(`bootstrapTaskAcceptance`). Stage 3 needs a digest that was actually
authored hole by hole. The ruling this issue serves: every increment
ends in an artifact the operator can see — here, a type being born
one frontier step at a time.

## Scope

1. Author `task.build_report.v1`: a small struct the task-acceptance
   lane genuinely needs — e.g. `summary: string`,
   `artifact_digest: brand("Digest", string)`, `gate_command: string`,
   `gate_pass: bool`. Final field list is the author's call; keep it
   small and real.
2. Start from `{"k":"hole"}` at the root and drive the loop against a
   running protod: one `type.fill` per step, recording the wire
   request, the reply, and the frontier after every fill, until the
   frontier is empty.
3. Close, normalize, catalog; record the digest.
4. Commit a dated `docs/research/` record holding the full fill
   transcript (step → path filled → subtree → frontier after) and the
   digest, with the replay command beside it.

## Acceptance (mechanical)

- A committed replay script re-runs the exact fill sequence against
  protod and exits nonzero unless the terminal digest equals the
  committed one.
- The record shows the frontier after every fill, in the contract's
  deterministic depth-first order, ending empty — the step-by-step
  visualization of the type being authored.
- A negative control in the house tradition: one deliberately
  ill-formed fill (unknown `"k"`, or a fill addressed at a non-hole
  path) shown refusing, with its typed refusal in the transcript.

## Out of scope

Retyping any protocol hole with the digest (stage 3). The authoring
theorems (draft 02 — the parallel proof lane). Referee engine items
(drafts 05/06).

## Pointers

`proto/wire/CONTRACT.md` §type.fill/frontier; `proto/SPEC.md`
§authoring grammar; `verify/ir/IR/Syntax.lean` (`PTy`, `close` — the
model this loop exercises); `proto/ts/src/protocol.ts`
(`bootstrapTaskAcceptance`, the one-shot path this replaces);
`SLICE.md` seams S3/S5.
