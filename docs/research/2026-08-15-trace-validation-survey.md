# Trace validation against formal specs — primary-source survey

Sub-report of the operator-ordered independent review (Opus 5 agent,
2026-08-15). Every claim from a primary source the agent read in
full. Condensed; all numbers, quotes, and the bug ledger preserved.

## 1. The canonical methodology (Cirstea, Kuppe, Loillier, Merz — SEFM 2024)

https://arxiv.org/abs/2404.16075 ·
https://link.springer.com/chapter/10.1007/978-3-031-77382-2_8

Trace validation = **constrained model checking**: check the trace
behaviors intersect the spec behaviors. Traces record *updates*, not
full values; missing information is reconstructed by TLC's
nondeterminism (existential quantification over action parameters);
success = the checker finds one behavior of the trace's length;
**failure gives no counterexample** (a maximal matching prefix plus
debugger breakpoints instead). Tooling added to TLC: action
composition (`A ⋅ B`), DFS, trace-validation debugging — not a
turnkey flag; each project ships its own harness.
https://github.com/tracevalidation/trace_validation_tools

**All five case studies diverged.** Two-phase commit: counting *how
many* Prepared messages instead of *which RMs* → a resend
double-counts → premature commit. EWD 998: two atomicity mismatches,
one overly strict spec, one genuine bug (token passing continues
after termination). Raft ×2: grain-of-atomicity (term update fused
with append). Microsoft CCF: spec reverse-engineered, corrected by
trace validation, then model checking the corrected spec "revealed
serious violations of key safety properties."

**Limits, measured:** logging only variables or only event names
explodes the state space (16-RM 2PC: full info = 91 states; event
names only = timeout/557k states); **too-imprecise logs can produce
false accepts** ("the model checker may be able to infer suitable
values that do not correspond to the actual ones"); "the technique
does not provide formal correctness guarantees."

## 2. MongoDB — the flagship negative result

*eXtreme Modelling in Practice*, VLDB 2020 —
https://arxiv.org/abs/2006.00915 ; retrospective:
https://www.mongodb.com/company/blog/engineering/conformance-checking-at-mongodb-testing-our-code-matches-our-tla-specs

- Model-based **trace-checking**: "impractical for testing that the
  Server conformed to a highly abstract specification."
  **~10 weeks, two engineers, ~1 month on instrumentation alone
  (snapshotting a multithreaded program), zero successful
  validations, zero bugs found, project cancelled.** ~90% of the work
  was spec-specific — no reuse for the next spec. Grain-of-atomicity
  papered over in the mapping script ("Note, this is a lie").
- Model-based **test-case generation**: "highly successful" — Realm
  Sync's OT algorithm transcribed to TLA+ in ~2 weeks; TLC crashed
  with a StackOverflowError that was **an actual infinite-recursion
  bug in the production C++**; 4,913 generated unit tests, 100%
  branch coverage vs 21% handwritten / 92% AFL.
- Current direction (VLDB 2025, dist-txns): still generation — TLC
  state graph → minimal path cover → WiredTiger unit tests; "these
  conformance checks do not provide a formal proof of conformance."
  https://www.vldb.org/pvldb/vol18/p5045-schultz.pdf

## 3. Microsoft CCF — the successful industrial trace validation

*Smart Casual Verification of CCF*, NSDI 2025 —
https://arxiv.org/abs/2406.17455

- Consensus spec 1,134 lines; **15 log statements** in 63 kLoC of
  C++, compiled out of production; deterministic scenario driver
  with a single global clock; only space-invariant values logged
  (log lengths, not entries); ~400-line trace spec using action
  composition, finite stuttering, fault-action composition, and a
  multiset network.
- Effort: driver logging ~1 engineer-day; trace spec **~2
  engineer-months over 4 months** — dominated by diagnosing whether
  each discrepancy was spec bug, implementation bug, or both.
  Consistency spec: ~1 engineer-week, no instrumentation, done by
  domain experts.
- DFS took consistency validation from ~1 hour to under 1 second.
- **Six bugs found before production** (five safety, one liveness),
  incl. an election-quorum tally that could elect a leader without a
  majority in one configuration (found by 48h exhaustive model
  checking on 128 cores) and a truncation bug violating Leader
  Completeness (triggered by a 305-event trace). Q-learning-based
  action weighting for CI **failed**.

## 4. etcd — trace validation shipped in-repo

https://github.com/etcd-io/raft/tree/main/tla — `Traceetcdraft.tla`,
`validate.sh`; enabled with `go build -tags=with_tla` and a
`TraceLogger`; NDJSON; offline validation. README: run all instances
on one machine, one file, to preserve causality; zap sampling must be
disabled or traces silently drop. No published bug list.

## 5. AWS — the two poles

**CACM 2015 (Newcombe et al.)** — model checking at design level; 10
bugs across 6 specs (one DynamoDB trace 35 steps); engineers
productive in 2–3 weeks. **The load-bearing quote:** "How do we know
that the executable code correctly implements the verified design?
**The answer is that we don't.**" Compensation: invariants from the
specs become pervasive runtime assertions.
https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf

**ShardStore, SOSP 2021 (Bornholt et al.)** — the shipped
conformance answer: **executable reference models in the
implementation language** (Rust), living in the implementation repo,
doubling as test mocks so drift breaks the build. Sequential
crash-free conformance by property-based testing (tens of millions
of sequences per deployment); crashing via per-component
lost-mutation models; concurrency via Loom + Shuttle; panic-freedom
of deserializers by symbolic evaluation. **Validation artifacts =
8,872 lines ≈ 20% of implementation code** (vs 3–10× for proof).
**21 person-months** of expert time, then successful handover (18%
of harness lines last edited by non-experts). **16 issues prevented
from reaching production**; one known miss (a cache configured so
large in tests that the miss path was unreachable — caught in code
review, drove the coverage-metrics work). Their stated criterion:
"we would not have considered this work successful if future code
changes by engineers required kicking off new formal methods
engagements."
https://jamesbornholt.com/papers/shardstore-sosp21.pdf

## 6. Elastic, CockroachDB, Kafka — model checking only

Elastic: four models, no conformance machinery; strategy is
**structural** — isolate the safety core in `CoordinationState.java`
mirroring the spec line-for-line ("a direct one-to-one
correspondence"). CockroachDB: two `.tla` files (ParallelCommits,
StoreLiveness), design-level only. Kafka: zero `.tla` in-tree; specs
live in Jack Vanlightly's personal repos; "we are modelling its
design, not its implementation."

## 7. Mechanics summary

- Instrument at linearization points; all shipping efforts collapse
  distributed clocks (one machine / one file / one driver clock).
- The mapping problem has four failure modes with four remedies:
  grain-of-atomicity → action composition; invisible impl steps →
  stuttering; partial observability → TLC nondeterminism (at the
  cost of state-space growth and false-accept risk); unlogged faults
  → fault-action composition.
- Diagnosis is the real cost: a failed validation does not say which
  side is wrong.
- **The differentiator between CCF's success and MongoDB's failure
  is whether spec and code were co-designed.** Trace validation is
  cheap when the spec guided the implementation;
  expensive-to-impossible retrofitted onto a mature concurrent
  codebase against an abstract spec.

## Bug/divergence ledger

| Effort | Method | Result |
|---|---|---|
| SEFM 2PC / EWD998 / Raft×2 / CCF-spec | Trace validation | Divergences in all cases; 1 real EWD998 impl bug |
| CCF | Trace validation + MC in CI | **6 bugs** (5 safety, 1 liveness) |
| etcd raft | Trace validation, offline | Harness shipped; no published bugs |
| MongoDB Server | Trace checking | **0 bugs — failed, cancelled** |
| MongoDB Realm Sync | Test-case generation | 1 real C++ infinite-recursion bug; 100% branch coverage |
| AWS (CACM'15) | Model checking only | 10 bugs across 6 specs; conformance explicitly not attempted |
| AWS ShardStore | Same-language reference models + PBT/SMC | **16 issues prevented**; 1 known miss |
| Elastic / CockroachDB / Kafka | Model checking only | Design-level; no impl conformance |
