---
id: 022
title: The oracle referee — transition certificates against the TLA relation
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

R4's lockstep evidence proves protod agrees with the hand-restated Go
oracle over the sampled corpus. Nothing independently establishes that
the oracle still denotes the checked TLA relation — the producer's
restated semantics referee their own conformance (external review,
FINDING-ORACLE-001; the eXtreme-Modelling caveat recorded at R4's
birth, matured into an obligation). The existing controls each mutate
a different seam (TLA bridge, daemon identity, comparator); none
mutates this one.

Proposed shape (audit's, to be grilled): a small transition
certificate per sampled step — spec digest, bounds, pre-state,
action, post-state, observations, journal heads — validated against
the authoritative TLA relation (via TLC on a per-step module, or a
separately reviewed checker; NEVER generated from the same transition
code it judges). Corrupt each certificate field independently as the
control set. A certificate validates the transcript's
transition/observation consistency; proving the transcript came from
a real daemon additionally needs the existing harness's authenticated
capture.

Grill before build: certificate granularity (per step vs per
schedule); the checker's trusted base (TLC invocation cost per step
vs a reviewed standalone checker); where certificates live (beside
_runlogs, content-addressed?); whether the same mechanism upgrades
the effector's lockstep evidence for free (the estate-of-safety
through-line candidate).

## Pre-registered prediction (2026-08-13 — write outcomes against
this, whatever they are)

If the oracle and the TLA relation have EVER drifted, the first full
certificate sweep over the existing 131-schedule corpus will catch at
least one disagreement; if it comes back clean, the claim upgrade is
"oracle validated against the relation over the corpus," never
"oracle proven equivalent." FALSIFIABILITY: the certificate checker
must itself carry controls (a corrupted pre-state, action, and
post-state must each be caught); a checker that cannot fail proves
nothing. If per-step TLC cost makes the sweep infeasible at corpus
scale, that is a finding about the method, recorded honestly — not a
license to sample silently.
