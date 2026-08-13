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
