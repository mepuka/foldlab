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

0. **The lockstep obligation (read first).** The daemon has TWO fill
   sites: the serve path that admits
   (`protocol_session.go:263-298`) and the replay fold that
   validates-and-folds stored events (`applyProtocolEvent`,
   `protocol_session.go:470-501`). The replay validator today
   REFUSES exactly the events this issue journals: a confirming
   refill fails the disjunction at `:491` (`equal` is an error
   there), and a fill event on a disputed/decided hole errors
   "stored fill targets a stable hole state" (`:497-498`). An absorb
   event appended by a new serve path but rejected by the old replay
   validator bricks the session on reopen. Every semantics change in
   this issue therefore lands in BOTH switch statements in the same
   commit, and every new path carries a reopen-equivalence test
   (below).
1. Fill on a `disputed` hole: append the `(value, seat)` candidate
   through `canonicalCandidates` (journal event + fold update),
   replacing the refusal at `protocol_session.go:289-295` and the
   replay error at `:497-498`. Extensional set semantics per the
   model's D2: a pair already present produces no fold change.
2. Fill on a `decided`/sealed hole: append to the hole's evidence
   record with a receipt reply; meaning digest untouched; close
   outcome unaffected; replay folds it identically.
3. Same-value confirming refill: journal the confirming seat's pair
   (the daemon-side MOVES-5 closure). **Pair-newness rule, fixed
   here so the executor is not blocked:** a fill is admitted-and-
   journaled exactly when its `(value, seat)` pair is NEW to the
   hole's evidence; a pair already present replies OK idempotently
   with head unchanged (the existing `HeadUnchanged` contract).
   This keeps the journal minimal, the fold extensional, and
   byte-identical redelivery collapsing — an at-least-once transport
   cannot grow the journal without new information. Load-bearing;
   record the D-entry.
4. **The single-candidate guards fall.** `len(Candidates) != 1` at
   `:278` and `:491` assumes a filled hole carries exactly one
   pair; after item 3 a filled hole's evidence may carry many
   same-value pairs. The clash path must build the dispute from ALL
   evidence pairs plus the offender — the model's
   `canonicalRepairCandidates = evidence ∪ {(value, actor)}` —
   and no fill outcome may remain a bare `return nil` (the silent
   no-reply branches at `:269-271` and `:278-280`): every fill
   request ends in a reply or a refusal.
5. **Kept refusal (deliberate divergence), predicate fixed:**
   no-self-revision refuses a fill iff the submitting seat already
   contributed an evidence pair for the hole's filled value AND the
   submitted value differs (for lawful states all filled-hole
   evidence shares one value, so "appears among the evidence seats"
   is equivalent). Today's `Candidates[0].Seat == seat` at
   `:281-287` is the single-pair special case of this predicate.
   Note it is evidence-dependent — which is precisely why it is a
   NAMED constructor in DEV-670's Divergence enum and not a model
   refusal: the model's refusals are functions of the move and the
   meaning fold alone.
6. Update the contract (`proto/wire/CONTRACT.md` §fill semantics)
   and the hand-written contract tests for the new paths; fixture
   discipline per AGENTS.md (no hand-authored model verdicts — these
   are contract-prose tests, claiming nothing about the model).

## Acceptance (mechanical)

- `bun run gates` green (includes `gofmt -l` empty, `go vet`,
  `go test ./...` for proto/go); new contract tests run under
  `-count=1`, each named for its path:
  - absorb-on-disputed: candidate set grows; redelivering an
    existing pair leaves head AND digest unchanged;
  - evidence-append-on-decided: `final_state_digest` of meaning
    unchanged across the append; close outcome byte-identical;
  - confirming-refill-journaled: the second seat's pair is present
    in the state read; redelivery by the first seat leaves head
    unchanged (pair-newness rule exercised in both directions);
  - self-revision-refused: including the multi-pair evidence case
    (seat confirms, then attempts a different value — refused);
  - three-fill digest equality: ALL six orderings of the same
    three-seat fill set on one hole produce the same
    `final_state_digest` (extends the two-permutation assertion at
    `protocol_moves_test.go:188-190`, which is retained).
- Reopen equivalence: every new-path contract test re-replays the
  journal (fresh `replayProtocolSession` from the stored bytes) and
  asserts the replayed fold's digest equals the served fold's —
  the mechanical form of the lockstep obligation. A journaled
  absorb/confirm event that errors on replay is a test failure, not
  a skip.
- No-nil discipline: a test drives each formerly-nil branch and
  asserts a reply or refusal arrives.
- CONTRACT.md updated; D-entries recorded in proto/DECISIONS.md
  (task-local numbers) for the pair-newness rule and the
  self-revision predicate, each referencing D85.

## Out of scope

The wall (next stage — it tests this). Fence/close changes. Model
changes (previous stage). The TS client (`proto/ts`) — reply shapes
are unchanged; only new lawful outcomes appear.

## Pointers

`scratch/dispatch/14-d85-confluence-package.md` (the model side);
`proto/go/protod/protocol_session.go:263-315` (serve path) and
`:444-501` (replay fold — the lockstep half);
`docs/research/2026-08-15-dev671-review.md` R2 (why absorb);
`docs/research/2026-08-15-ts-kernel-conformance-wall.md` (S7 — the
TS kernel wall this stage's semantics must eventually agree with
through DEV-670's mapping).
