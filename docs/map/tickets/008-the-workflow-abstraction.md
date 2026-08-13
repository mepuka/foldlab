---
id: 008
title: The workflow abstraction
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

Define the workflow abstraction, both faces at once:

- **Static — program as value.** A canonical, digestable encoding of a
  step DAG (the ratified "program encoding IS catalog data"): the
  combinator tree is the topology, the digest is the certificate's
  program digest, and the same program runs over the node's
  interpreter, wasm, or CLI. R2's pipeline specs are this, hand-rolled.
- **Dynamic — run as durable fact.** A run is one linearization,
  journaled; effects commit exactly-once behind the effector's fences;
  kill-anywhere, resume-free (what G1/R1 proved piecemeal, surfaced as
  user-facing semantics).

Constraints already decided in conversation (2026-08-12): nesting is
unbounded — a workflow step may itself be another durable workflow
(composition anchors upward, the collector's fold-of-child-anchors
one level up); and the abstraction is EFFECTFUL — how exactly (Effect
v4 program values? effect-per-step? services in the step signature)
is deliberately open, to be settled here, informed by the prototype.
Also decide its relationship to Effect Stream orchestration (the
program value IS the DAG; chunking is transport) on one side and the
node wrapper's interpreter on the other.
