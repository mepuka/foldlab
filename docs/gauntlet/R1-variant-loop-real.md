# R1 — The Variant Loop, Real (receipts rung)

COORDINATOR-OWNED. Status: SPEC RATIFIED, VERIFIER FROZEN
(`go/gauntlet/real.go` + `cmd/realverify`, RL1–RL7 mechanical, self-
tested) — DISPATCH UNBLOCKED. The first rung whose effects cost real
money. Wire details pinned by the verifier: journal facts are receipt
payloads `{"digest","input_tokens","model","output_tokens","result",
"stop"}` on the standard chain; `plan.ndjson` rows are
`{"inputs","question","step","template","variant","work"}` with
`work = H({"inputs","model","template"})` recomputed by the verifier,
step-0 inputs = `[H({"question","seed"})]`, step-s inputs = the
parent's recorded result digest; prices are integer micro-USD per
token (haiku: 1 in / 5 out); every receipt must be demanded by the
plan (no journal padding).

## The claim under test

Evaluating K variants of an L-step inference pipeline over Q questions
against a REAL model API, the content-addressed engine re-executes only
each edit's dependency cone — and the run exports a bundle proving,
from records alone: how many inference calls a naive evaluator would
have made, how many were physically made, that no recorded fact was
ever re-purchased, and what both numbers cost in provider-receipt
dollars. This is the experiment that separates "novel" from "useful":
measured spend elimination with receipts, on a workload nobody
pre-arranged to reconverge.

Why this is immune to the D_byte finding
(2026-08-12-jetstream-guarantees / nondeterminism model): reuse here is
WITHIN-system — a fact recorded once is reused by digest and never
re-requested — so provider nondeterminism never gets a vote. No
semantic acceptors are needed for this rung's claims.

## Workload (pinned shape, climber picks content within it)

A pipeline of L >= 4 chained steps per question (e.g., extract → plan →
solve → check), K >= 6 variants that edit one or two step templates
each (at least two variants editing a LATE step — high salvage — and at
least one editing an EARLY step — deep cone, the contrast case), over
Q >= 20 questions. Logical steps = K x L x Q >= 480.

Work digest of a step = H over: model id, step template digest, and the
digests of the upstream outputs it consumes (the sp-address
discipline). Same template + same inputs ⇒ same digest ⇒ one physical
call, fleet-wide, enforced by the effector; the journal records the
fact; the trie/cone structure is what the reuse measurement exposes.

## Receipts (the new wire discipline)

Every PHYSICAL call journals a receipt fact before its output is
consumed: `{digest, model, input_tokens, output_tokens, stop_reason,
at}` — token counts as reported by the provider response. Spend is
computed from receipts at pinned per-model prices recorded in the
manifest. The ledger line (as in G1/RG-A) still evidences physical
execution; the receipt makes it *priced* evidence. Fabricating a bundle
now requires fabricating a bill.

## Laws (RL1–RL7, to be frozen in the verifier)

- RL1 chain + canonical bytes, as always.
- RL2 economy: physical calls == distinct work digests; no digest has
  two receipts; every reused step resolves to an earlier recorded fact.
- RL3 receipts: every physical call has exactly one receipt; spend =
  Σ receipts at manifest prices; spend <= the manifest hard cap.
- RL4 the headline, recomputed: naive calls (K x L x Q), physical
  calls, reuse factor, naive dollars vs actual dollars — all derived by
  the verifier from the record, never taken from the manifest.
- RL5 crash-resume: at least one hard kill mid-run; on resume, zero new
  receipts for digests already committed (recovery re-reads, never
  re-buys). The kill and resume are storm facts as in G1.
- RL6 caps in code: max physical calls, max output tokens per call, and
  max spend are enforced by the harness BEFORE each call; the bundle
  records the caps; the verifier checks no receipt exceeds them.
- RL7 honesty boundary: the verifier proves record consistency and
  spend arithmetic. It does NOT verify output quality or semantics —
  stated in the bundle README, no exceptions.

## Floors

Reuse factor >= 2.5x (naive/physical, verifier-computed); >= 480
logical steps; >= 1 crash-resume with zero re-spend; total spend <=
the operator cap. Model: claude-haiku-4-5 (dated snapshot recorded in
manifest). Default operator cap: $5.00.

## Security protocol (standing, non-negotiable)

The API key is provisioned by the OPERATOR in the climber's shell
environment only (`ANTHROPIC_API_KEY`) — never pasted in chat, never
committed, never printed, never echoed into logs or bundles. Requests
go to api.anthropic.com only. The harness must fail closed: missing
key = clean refusal, cap reached = clean stop with the bundle exported
as-is and marked partial. Receipts contain token counts and model ids,
never request headers.

## Non-goals

Output quality benchmarking (RL7); semantic acceptors and cross-run
reuse (a later rung — needs the acceptor design); speculation (R7 /
RG-C); provider comparisons (the nondeterminism lab owns that).
