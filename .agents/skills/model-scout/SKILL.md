---
name: model-scout
description: Scout a slice before it is contracted or proved — spend a small fixed budget finding candidate invariants, counterexamples, and spec blind spots, banked for reuse. Use when the user says to scout something, asks for invariants/counterexamples/negative cases for a target, wants a draft spec probed for weakness before dispatch, or when curating the outcome bank or benchmark packets in .staging/model-guided-development/.
---

# Model scout

A scout run gathers proof-search intelligence for a target and banks it.
The procedure is [LOOP.md](../../../.staging/model-guided-development/LOOP.md);
the data law is [BANK.md](../../../.staging/model-guided-development/BANK.md);
the cheap-model harness is
[ANNOTATE.md](../../../.staging/model-guided-development/ANNOTATE.md).
Open LOOP.md and follow its ten steps; this page only fixes the fences
and the finish line.

Vocabulary here ("model scout", statuses, bank) is staged, pre-grade —
per the lane's own banners. Do not mint it elsewhere.

## Fences

- **Third role.** The scout is neither breaker nor implementer
  ([implement](../implement/SKILL.md)). Never write or edit a contract
  packet, a battery, production code, or a frozen statement. Output is
  intelligence only; the breaker disposes.
- **Checkers decide.** Models propose and rank; fast-check, Lean, and
  byte gates refute and accept. No finding outranks its evidence:
  sampled survival stays sampled (G4-shaped), and `lean-theorem` is
  written only when the lean lane holds the kernel-checked theorem.
  Never the word "verified" (C5).
- **Cheap first.** Candidate batches go through the annotate harness
  (`gpt-5.6-luna`, schema-constrained, receipted). At most one
  `gpt-5.6-sol` planning call per run, on a high-value stall, recorded.
- **Blinding.** Working a `bench/` packet: do not open
  `bench/candidates.md`, `bench/answers/`, or the packet's evidence
  trail; a peek marks the run `contaminated`.
- **No promotion.** Everything stays in the lane. TOOLS.md, SPECS.md
  category moves, and any `docs/` or `formal/` landing are operator
  acts.

## Done means

A run is finished only when all three hold (LOOP.md §10):

1. its row is appended to
   [runs.md](../../../.staging/model-guided-development/runs.md) with
   budget and counts filled;
2. every counterexample and selected pattern has a bank disposition —
   nothing left only in a transcript; and
3. the handoff note (selected candidates with reasons, replayable
   counterexamples, adequacy gaps, ranked unresolved obligations) is
   delivered to the requester.
