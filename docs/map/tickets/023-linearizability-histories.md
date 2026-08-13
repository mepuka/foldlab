---
id: 023
title: Linearizability histories — overlapping-invocation evidence
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

Every schedule in the R4 corpus issues one blocking request and
extracts state before the next action: client histories never
overlap, so the corpus provides zero linearizability evidence in the
Herlihy–Wing sense — final-state agreement is not history
linearizability (external-review advisory recorded in GitHub issue #33 A5). This
is a new obligation class, not a refutation: nothing claims
linearizability today, and the mutex-protected daemon core is
plausibly linearizable — plausibly is the word this ticket exists to
retire.

Smallest test (audit's specification, to be grilled): two clients at
one daemon with overlapping create and publish of an initially
unresolved digest; record the full invocation/response event history;
search for a legal sequentialization preserving real-time precedence
and complete results; a result-flip control that leaves final state
unchanged MUST be caught (it is invisible to state comparison and
visible to history checking — the exact blind spot this closes). A
cross-daemon version must first establish that the receiving daemon
has mirrored the fact.

Grill before build: history-recording seam (client-side timestamps
suffice for single-daemon real-time order; what anchors cross-daemon
time); the sequentialization searcher (exhaustive at tiny histories
vs an off-the-shelf checker — cite and pin whatever is used);
relationship to ticket 022 (certificates validate transitions,
histories validate concurrency — the two compose into the full
conformance story); which claims in VERIFICATION.md gain a
linearizability line and at what stated bounds.

## Pre-registered prediction (2026-08-13)

The single-daemon overlapping-history test PASSES (the serialized
request path makes it near-certain) — its value is the harness, the
result-flip control, and the retirement of "plausibly." The
cross-daemon version under replication lag is where a genuine
surprise could live: union resolution means two daemons can both
lawfully answer, and whether their answers always admit one
real-time-respecting sequentialization is NOT obvious. If it fails,
that is a finding about the ratified resolution semantics, reported
before any fix. FALSIFIABILITY: the result-flip control must be
caught in every configuration; a history checker that cannot fail
proves nothing.
