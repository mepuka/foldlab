---
name: lean-assurance-review
description: Audit a Lean theorem or system claim across specification intent, formal model, proof trust, implementation/refinement, and external observations. Use after proofs compile or when someone claims code is verified; default to read-only review unless fixes are explicitly requested.
---

# Lean Assurance Review

Report the strongest supported claim and every broken link. Strength on one axis cannot compensate
for absence on another.

## Define the claimed chain

Inventory five axes:

1. source intent/requirements;
2. formal definitions, observables, assumptions, examples, and theorem statement;
3. proof acceptance and logical dependencies;
4. executable implementation, generator, serializer, FFI, or refinement relation;
5. tests, measurements, monitors, receipts, and deployment assumptions.

Read [trust taxonomy](references/trust-taxonomy.md) for the audit inventory and
[refinement and conformance](references/refinement-and-conformance.md) when external code or generated
artifacts are in scope.

## Try to refute each link

- intent/model: seek definition drift, missing cases, wrong units/equality/observables, uninhabited
  hypotheses, and stronger/weaker meanings;
- theorem: run witnesses, forbidden examples, counterexamples, minimal-hypothesis/vacuity probes,
  and compare to an independent reference where possible;
- proof: fresh saved-tree gate, holes, axioms, imports, unsafe/native/options, checker and certificate
  policy;
- implementation: deliberately wrong implementation against the relation, round trips,
  simulation/refinement direction, provenance/diff, serializer/ABI/FFI checks;
- deployment: identify fairness, delivery, configuration, calibration, distributions, hardware,
  timing, and monitoring assumptions.

Do not mutate the reviewed tree during a review. If fixes are requested, separate the finding from
later implementation and re-run the affected axes.

## Verdict

Classify findings as `spec-mismatch`, `model-mismatch`, `proof-debt`, `implementation-gap`,
`external-trust`, or `observational-gap`, with severity, evidence, corrected claim, and owner.

Read [report schema](references/report-schema.md). Emit an evidence bundle separating proved,
model-checked, tested, measured, monitored, assumed, and unknown facts. Complete only when each
in-scope link has evidence or an explicit gap and the headline claim is no stronger than the weakest
required link.
