---
id: 009
title: The verification ladder
type: wayfinder:build
status: open
assignee:
blocked-by: []
---

## The ladder (ratified 2026-08-12)

Every contract sits on a rung and can climb; a rung is CLAIMED only
with its gate met. The effector's model gate is the template and the
existence proof (.reference/playground-mech: spec → TLC → Apalache
inductive invariant → lockstep trace replay with negative controls —
"a prover that cannot fail proves nothing").

- **R0 Fixture walls** — frozen bytes, digest equality.
- **R1 Property tests + fuzzing** — algebraic laws exercised beyond
  the fixture (ADR-0007 divergence probes live here).
- **R2 Bounded model check** — TLC exhaustive at small caps; the spec
  must include a deliberately broken variant TLC catches (negative
  control at the model level).
- **R3 Inductive invariant** — Apalache, unbounded: a theorem.
- **R4 Lockstep conformance** — the proof chained to the real binary
  by trace replay against embedded NATS, with corrupted-schedule
  negative controls.
- **R5 Mechanized proof** — Lean/Coq for the algebraic core; real but
  unhurried.

Design principle that keeps proofs small (named 2026-08-12): the
evidence/decisions/absence sort confines concurrency-sensitive truth to
two kernels (effector: R3/R4 done; journal CAS-append: small).
Everything else is pure functions over values — the cheap kind of
verification.

## Positions and next climbs, in order

1. **Catalog + ingress state machine** (registry IDs `catalog-model:W1`–`catalog-model:W5`; source-local W1–W5 remain frozen) — **R2 + R3 + R4 claimed** (C4: the original hypothesis under-covered IndInv at catalog Gen(2); repaired to Gen(3) with an argued data cutoff, and re-proved 2026-08-19 — nine verdicts as required, obligation 2 returning NoError at the exact natural maximum. Windows arm; the macOS arm is owed)
   (2026-08-13, `verify/catalog/`): R2 remains TLC 2.19 clean to
   closure at the gate caps (2 daemons / 3 values / 2 creators:
   12,707,989 distinct
   states, depth 24) and cap2 (18,295); invariants Convergence,
   NoAdmissionOnFaith (+ AdmissionSeesResolution),
   LagIsAbsenceNeverWrongData, ResolutionMonotonicity. FOUR negative
   controls, each refuted on exactly its dropped law, counterexample
   traces committed. Bounded claim per the gate: certified at the
   stated caps only. Architectural insight surfaced by the model:
   presence is monotone (a stale positive resolve-check can never
   become wrong — monotonicity is the theorem licensing atomic
   ingress); absence is anti-monotone, hence create needs the CAS.
   R3: Apalache 0.61.0 proved base, consecution, state safety, and
   action safety from arbitrary `IndInv` states with unbounded trace
   length and data-journal depth at fixed domains (2 daemons / 3 values /
   2 creators). The CAS-freshness clause is load-bearing: removing it
   produces a duplicate authority fact; blind ingress separately
   violates admission safety. Both controls failed as required. Evidence
   and commands: `verify/catalog/README.md`; hill climb:
   `verify/catalog/CLIMB.md`. **R4 against the coarsened wire refinement
   (CreateAtomic); the split-CAS branch's conformance is ticket 012's
   obligation.** TLC closed the bridge at 281,269 distinct wire states and
   refuted its faithless control at depth 2. The executable gate then caught
   the tagged daemon sabotage and all 131/131 corrupted schedules before an
   honest zero-divergence replay of 131 schedules / 3,079 steps. Coverage:
   1,077 raw states (0.008474984% of the R2 closure), 3/3 coarse disjuncts,
   and 5/5 semantic branches. Replica transport remains outside this claim;
   `MirrorAdvance` is the documented re-create-and-project substitute.
2. **Concierge algebra** (bullet two) — R1 inside its build: property
   tests for `unfill ∘ fill = identity`, frontier-empty ⇔ catalogable,
   and NO DEAD ENDS (every hole admits ≥1 legal fill), by induction on
   the grammar.
3. **Replica prefix property** (ADR-0009) — a mirror serves only
   prefixes of the origin, so verify-on-read at a replica ≡ at origin.
   Climbs when multi-daemon graduates.
4. **Grammar/fold** (ticket 004) — R1 + walls (canonicalization is a
   function; round-trip laws) until full SchemaAST coverage
   stabilizes; R5 candidate for the algebraic core.
5. **Wire contract refusal coverage** — not a model but a GATE: every
   refusal kind enumerated by `contract.describe` must be witnessed by
   a test; mechanical, lands with the tracer.

## The hardening program (tickets cut 2026-08-12)

The critical-gap closers, each provable with the structures already in
hand: ticket 010 (catalog R4 lockstep against protod — the
model-to-binary bridge), 011 (executable substrate assumptions + the
certified envelope: out-of-envelope configs refuse at Acquire), 012
(the journal's own model gate, then composed into the catalog model as
a refinement), 013 (effector evidence ported public into
verify/effector/ + the N-owner generalization attempt). The claims
ledger these serve is [VERIFICATION.md](../../../VERIFICATION.md).

## Effector status (for the record)

R3/R4 CLAIMED, but the evidence sits in `.reference/`, an untracked
predecessor repository absent from this checkout: Apalache inductive
invariant (unbounded fences/depth, identity-free), TLC exhaustive at caps 2/3/4
matching Go and TS checkers exactly, 15,378 lockstep schedules on
embedded NATS with 828/828 corrupted-schedule negative controls caught.
Porting those specs into foldlab-owned `verify/` (out of .reference) is
part of climb 1's cleanup.
