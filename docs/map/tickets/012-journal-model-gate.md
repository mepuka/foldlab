---
id: 012
title: The journal model gate — CAS-append, verify-on-read, crash recovery
type: wayfinder:build
status: open
assignee:
blocked-by: [009]
---

## Question

The journal is the second concurrency kernel (the effector is the
first) and the only one without its own model: the catalog model
embeds its CAS abstractly, and the crash evidence is empirical (G1's
kill-9 fleets). Give it the same treatment the effector got — the
state space is tiny, which is the design's virtue.

Model, in the house style (transition table stated once; broken
variants as one-line EXTENDS): concurrent appenders racing CAS at the
tail; readers folding verify-on-read; crash-anywhere (an appender
dies between any two steps) and restart-from-storage. Invariants:
append linearizes exactly once or conflicts (no lost append, no
double append); the chain never forks at a sequence number; a
verify-on-read fold over any prefix reproduces the stored head or
reports tamper at the first bad position; recovery after any crash
point yields a journal indistinguishable from one where the crash
did not happen (or a clean conflict). Negative controls per invariant.
Target R2 → R3, then fold this model's guarantees into the catalog
model as a REFINEMENT (the catalog's abstract CAS is this journal) so
the two proofs compose instead of overlapping.

Gate: rungs claimed per ticket 009's rules, run records and
counterexample traces committed under verify/journal/.

## Pre-registered predictions (2026-08-13 — write outcomes against
these, whatever they are; evidence:
docs/research/2026-08-13-literature-resonances.md §D/§E)

1. PROPHECY: the catalog's abstract CAS resolves nondeterminism the
   concrete journal determines later — the refinement mapping should
   require prophecy variables (Abadi–Lamport), and the monotone
   theorem predicts WHERE: one per non-monotone check, none for
   monotone ones. Confirmation = the monotone/anti-monotone split
   appearing in the proof's own anatomy; failure = a finding about
   the theorem.
2. THE EPR TEST decides whether composition pays: state the journal's
   interface as the catalog sees it; if it fits EPR (∃*∀*, stratified
   sorts, no generative functions), composed obligations stay
   decidable (Taube et al.) and the boundary earns its cost.
3. THE LAMPORT METER: composition will reduce total proof effort
   (invariant conjuncts + counterexample-to-induction rounds + state
   counts) versus extending the monolithic model. Measure it. If
   composition LOSES, the honest record is "composed for modularity
   of claim, not proof economy" — a finding, not a failure.
4. Target theorem shape (GoJournal): every crash state equals the
   abstract log at some prefix — the same sentence verify-on-read
   enforces at runtime, aligning this model with the R4 harness.

Sequencing note (ratified in conversation, 2026-08-13): this climb
runs AFTER tickets 011 (executable substrate assumptions) and 010
(catalog R4) — those close proof-to-reality gaps; this one closes a
proof-to-proof gap, and R4's lockstep work will expose the journal's
exact observable interface before it gets modeled.
