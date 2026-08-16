# The online oracle: unbounded differential, nightly

Issue: DEV-672 (oracle lane — blocked on DEV-670 / slice stage 2)

## Why now

The corpus (previous stage) is a frozen, exhaustive sample of the
wire-image fragment; the oracle explores beyond it with CPU-hours
instead of authoring hours — Cedar's DRT rung, where 21 of their 25
bugs were found. The spike already measured the mechanics: `serve`
mode runs at ~79k req/s, and the corpus replayed through `serve` is
byte-identical to `emit` — the fixture is a memoized prefix of the
oracle, so the two cannot drift.

## Scope

1. `oracle serve` (from the wall's `Main.lean`): persistent
   JSON-lines process over stdin/stdout.
2. A differential harness driving the daemon's isolated pure fold and
   the oracle side by side, reusing the shape of
   `go/canonical/differential_fuzz_test.go` (swap the `bun` probe for
   the oracle binary). Generation is **type-directed** — hole set →
   seats → moves plausible against the current state, with a
   deliberate minority of refusals — because naive random generation
   is documented useless (Cedar §4.1).
3. Nightly job: a large run count with a fresh seed; any divergence
   is minimized and committed into the corpus fixture as a permanent
   regression (Cedar's corpus discipline).
4. The release gate, adopted: no moves-lane claim ships while the
   model, proofs, corpus, or differential runs are stale.

## Acceptance (mechanical)

- The nightly harness runs ≥1,000,000 cases against `serve`; a
  planted daemon mutation is caught within one run (gate-teeth).
- A divergence produces a minimized committed regression case, by
  automation or by a documented one-command procedure.
- The corpus-replay-through-serve byte-identity check runs in CI.

## Out of scope

FFI/cgo embedding — rejected on review evidence (unstable FFI, the
unverified Lean compiler entering the production path for no gain
over a subprocess). Trace validation of real session journals (a
separate, later, ratifiable rung).

## Pointers

`docs/research/2026-08-15-lean-oracle-spike.md`;
`scratch/spike-lean-oracle/`;
`docs/research/2026-08-15-sota-ranked-recommendation.md` (rung 2);
`docs/research/2026-08-15-proof-to-artifact-reference.md`
(cedar-spec corpus pipeline mechanics).
