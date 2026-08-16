# The daemon absorbs: D85 on the wire

Issue: DEV-674 (slice stage 3, parent DEV-664)

## Why now

D85 (ratified 2026-08-15) makes the model's fill-on-disputed an
absorb into the candidate set and fill-on-decided an evidence
append. The daemon (`proto/go/protod/protocol_session.go`) currently
refuses both. For the wall's wire-image fragment to inherit the
confluence package, the daemon's fill path must match the model —
except where a divergence is deliberately declared.

## Scope

1. Fill on a `disputed` hole: append the `(value, seat)` candidate
   to the dispute (journal event + fold update), replacing the
   refusal at `protocol_session.go:289-295`. Idempotent redelivery
   of an existing pair collapses (extensional set semantics, as the
   model's D2 already states).
2. Fill on a `decided`/sealed hole: append to the hole's evidence
   record with a receipt reply; meaning untouched; close outcome
   unaffected.
3. Same-value confirming refill: journal the confirming seat's pair
   (the daemon-side MOVES-5 closure), keeping the idempotent-reply
   behavior for byte-identical redelivery.
4. **Kept refusal (deliberate divergence):** the no-self-revision
   rule — a seat's conflicting fill on its own filled hole still
   refuses ("correction is a new round"). This becomes a NAMED
   constructor in the DEV-670 wall's Divergence enum, not prose.
5. Update the contract (`proto/wire/CONTRACT.md` §fill semantics)
   and the hand-written contract tests for the new paths; fixture
   discipline per AGENTS.md (no hand-authored model verdicts — these
   are contract-prose tests, claiming nothing about the model).

## Acceptance (mechanical)

- `go test -count=1 ./protod/...` green; new contract tests cover:
  absorb on disputed (candidate set grows, order-independent
  digest), evidence append on decided (meaning digest unchanged),
  confirming refill journaled, self-revision still refused.
- The two-permutation digest-equality assertion (the strongest line
  of the old fixture) extended to a three-fill bag: all orderings of
  the same fill set produce the same final state digest.
- CONTRACT.md updated; D-entry recorded in proto/DECISIONS.md
  referencing D85.

## Out of scope

The wall (next stage — it tests this). Fence/close changes. Model
changes (previous stage).

## Pointers

`scratch/dispatch/14-d85-confluence-package.md` (the model side);
`proto/go/protod/protocol_session.go:263-315`;
`docs/research/2026-08-15-dev671-review.md` R2 (why absorb).
