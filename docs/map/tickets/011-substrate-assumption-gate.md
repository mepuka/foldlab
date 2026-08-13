---
id: 011
title: The substrate assumption gate and the certified envelope
type: wayfinder:build
status: closed
assignee:
blocked-by: []
---

## Question

The proofs stand on four JetStream properties (atomic
create-if-absent, revision CAS, linearizable reads, terminal values
never deleted) that are source-verified, not proved — and they hold
for the single embedded server configuration only. Two moves close
the gap:

1. **Executable assumptions.** A conformance law suite (`go/`,
   embedded NATS, house style: one law per test) that exercises each
   assumed property directly against the pinned substrate — CAS races
   that must lose exactly one way, reads that must observe completed
   writes, delete attempts on terminal keys that must fail. The suite
   is the assumption made falsifiable at every pin bump: an upgrade
   that breaks an assumption turns a gate red instead of silently
   invalidating theorems.
2. **The certified envelope.** The daemon learns the configuration
   envelope the proofs cover, and `Acquire` REFUSES configurations
   outside it (clustered JetStream, replicated KV buckets, in-memory
   storage) with a typed lifecycle error naming the uncovered
   assumption. Absence of proof is refusal, never admission on faith —
   the ingress law applied to the daemon's own deployment. Widening
   the envelope later is a deliberate act: prove the assumption in the
   new configuration, then admit it.

Gate: every standing assumption in VERIFICATION.md §3 has a named
test; an out-of-envelope Acquire refuses with the assumption named;
VERIFICATION.md updates from "source-verified" to "executable gate".
