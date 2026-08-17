# Cure round 3 — the round-3 residuals (no new rulings required)

Status: dispatchable; commits on `agent/codex/kernel-hygiene-gates`;
repair cites `docs/research/2026-08-17-review-closure-cure.md`
(round 3). Every item below implements law already ratified (rulings
5–7, the regeneration precept, W1/W2); none opens a decision.

- **Z1 (major) — kill the stale-cached-pass hazard everywhere it
  exists.** Round 2 measured Go's test cache reporting `ok (cached)`
  over a mutated cross-module fixture and armed `-count=1` for
  `cmd/wirefix` only. Arm the same defense on every gate stage whose
  tests read cross-module fixtures — the three packages the round-3
  report names, the closure law's own corpus check among them.
  Demonstrate each armed stage red by one-byte fixture mutation,
  restore byte-identically, transcripts kept.
- **Z2 (minor) — the walker's type switch gains a default.**
  `requireIntegralNumbers` refuses any numeric outside its
  float64/map/slice cases (refusal, never panic) so a Go-constructed
  `float32` term cannot carry a non-integral number into identity
  bytes. In-process probe committed.
- **Z3 (minor) — the TS raw digest utilities align with the
  certifier.** `structureDigest`/`sessionStateDigest` must not mint
  a v0 identity for a term the certifier refuses: apply the mirror's
  `requireIntegralNumbers` sweep before minting, or scope precisely
  per certifier semantics if state digests are value-side — read the
  round-3 evidence, record the exact choice in DECISIONS, and add
  the row to GRAMMAR-SITES.md's number table.
- **Z4 (minor) — verify/ir prose states both conjuncts.** The
  closure law is integrality AND magnitude (|n| ≤ 2^53−1); say where
  the magnitude half lives (the wire bound, outside the Int
  abstraction) — prose only, `verify/ir/run.sh` green before and
  after.

Acceptance: full battery + verify gates green at tip; Z1 mutation
probes red-then-restored per stage; Z2/Z3 probes committed; no new
citation to an uncommitted path; working-tree isolation held
(explicit-path staging only). Then the round-4 re-review closes the
disposition table across all rounds and issues the final verdict.
