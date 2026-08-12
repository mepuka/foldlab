# The primitive ladder

The mathematics this ladder instantiates is [../SPEC.md](../SPEC.md) — the
normative formal specification (axioms, theorems, proof obligations PO-1…25,
open problems OP-1…5). Read it first; each rung below discharges a fragment
of it, and Appendix A maps rungs to sections.

A trustless, durable, distributed workflow engine for agent coordination, built
as a ladder of law-governed primitives. Each rung is one hill-climbing exercise:
the coordinator authors the spec and the law suite (the fitness function); an
implementing agent climbs until `bun run typecheck && bun test packages/kernel`
is green. Integrity always derives from content (canonical bytes, digests,
chains) — never from broker ACLs. Auth is deliberately absent at founding.

| Rung | Name | One line | Status |
| --- | --- | --- | --- |
| P0 | [Decider](P0-decider.md) | pure decide/evolve fold with identity-grade canonical codecs; byte equality is the only equality judgment | **CLIMBED** `0672565` |
| P1 | [Chained Fact Log](P1-chain.md) | content-addressed hash-chained append-only sequence; verify = recomputation; bridge law: replay over verified entries ≡ P0 replay over raw events | **CLIMBED** `3855ad3` |
| P2a | [Go conformance gate](P2a-go-encoder.md) | the canonical encoder, digests, and chain identity in Go, byte-for-byte against the frozen cross-language fixture — the whole cross-language wall climbed before any NATS code | **CLIMBED** `643d54a` |
| P2b | [Durable Journal](P2b-journal.md) | NATS JetStream binding (Go): create-only CAS appends, digest-compared uncertain-outcome resolution, deny-flag append-only, cursor never advances past an unverified entry | **CLIMBING** |
| P3 | [The Journal Engine](P3-engine.md) | a user's ordinary Effect workflow becomes durable by running on an engine whose entire memory is a P1 chain — Effect's own `WorkflowEngine` contract implemented over our substrate, with `layerMemory` as the differential oracle | **CLIMBING** |
| P3b | [The Live Plane](P3b-live-plane.md) | the engine on the real Go/NATS journal via the journald sidecar; standards conformance moved into the gate; operation-count performance laws; interpreter agreement quantified over a program space | **CLIMBED** (verified by coordinator; commit owed by climber) |
| P4 | [Exactly-Once Effector](P4-effector.md) | leases for liveness, fencing for safety, create-only outcome commitment — Go half + the live-plane TS half: exactly-once EFFECTS under racing engines, the claim every P3b review disclaimed | **CLIMBING** (with P5) |
| P5 | [The Determinism Frontier](P5-determinism.md) | record/replay of nondeterminism through Effect's service seam: immutable observed time, recorded race winners, deadline-recovering sleep, durable gates across process generations — specified at the edge, deliberately not pre-solved | **CLIMBING** (with P4) |
| P6 | Process Composition | sagas as composed deciders (pipe/par) under the Kahn-lens acceptance laws: category laws, pipe denotation, parallel isolation, schedule independence | spec owed |
| P7 | Federated Origins | per-origin chains, causal-frontier merge, half-open lifecycle frontiers, CALM-gated scale-out; any node verifies any origin by recomputation | spec owed |

Design provenance: three-lens workshop (event-sourcing / distributed-theory /
process-dataflow) with adversarial judging, 2026-08-11. The winning seed is the
Decider; the losing designs' best machinery is grafted into the P0 catalog and
the P1/P5 acceptance criteria rather than discarded. P3 was re-scoped upward on
the operator's call for ambition: rather than invent a workflow API, implement
the `WorkflowEngine` contract that `effect/unstable/workflow` already defines at
the pin — which makes the user-facing API ergonomic on arrival and hands the
suite a free oracle (`layerMemory`) to test differentially against.

Every rung's spec is adversarially reviewed before an implementing agent sees
it: a reviewer builds a throwaway reference implementation, runs the law suite,
and reports which laws are unimplementable, gameable, or true-by-construction.
That pass has caught 6–8 real defects per rung so far.

Prior art honored (measured locally, not re-derived): tailtalk (fold as the only
meaning-maker; obligation table mapped 1:1 to property tests; cursor law proved
by control arm; byte-identical retry), Cotal (create-only CAS; canonical
encoding; half-open lifecycle intervals; retention by outcome), multica
("already terminal = success" paired with retries).
