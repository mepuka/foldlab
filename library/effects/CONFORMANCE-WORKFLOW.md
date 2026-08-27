# Conformance workflow — dual-lane verified development

Status: Pass-A workflow design, pending ratification, 2026-08-26
Claim posture: planning input only; no workflow rule, harness role, trust
statement, or metric is admitted by this document. Lane names and all new
terms below are working labels pending the grilling pass. The two harness
roles enter `TOOLS.md` only at ratification.

## 1. Purpose

This library's development doubles as the testbed for a second deliverable:
an AI-generated but conformance-verified programming workflow. Two model
harnesses work in separate lanes — one authors the Lean model, invariants,
and conformance vectors; one writes the TypeScript implementation against
them — with a human ratification point between the lanes and the Lean kernel
underneath both.

Effect is the deliberate entrance because the M0 contract already reified the
observable surface as data: operations, decisions, histories, and outcomes
are first-order values. Conformance-by-vectors works precisely because the
seam is data; arbitrary imperative TypeScript has no comparably cheap seam.

The claim ceiling is fixed up front: this workflow produces a kernel-checked
model plus a forced-agreement implementation. It never produces "verified
TypeScript." Gate vocabulary is unchanged — model theorems are G1/G2
material, differential agreement is G4-labeled sampled evidence, and no
metric below promotes a claim across a gate.

## 2. Trust architecture

The central design problem is **correlated error**: when one model harness
writes the conformance code and another writes the implementation, the
kernel guarantees the proofs but nothing guarantees the statements. A
mis-quantified invariant proves cleanly and constrains nothing, and two
harnesses drawing on similar priors can be wrong in the same direction.

Every trust anchor below exists to break that correlation:

| Anchor | What it secures | Who or what carries it |
| --- | --- | --- |
| Lean kernel | proofs of stated theorems | machine |
| Ratified statement schemas | quantifier structure of every invariant | human, once per schema |
| Sampled vector review | vectors mean what the contract means | human, per ratification point |
| Deterministic generation | manifests come from the model, not hands | generated-vectors law |
| Mutation kill-rate | vectors actually pin the semantics | machine, measured |
| Lane independence | no shared blind spots between lanes | workflow rule |

Both harnesses receive `TOOLS.md` rows with the estate's standard empty
trust contribution. The gates and the anchors above carry all trust; the
harnesses carry none.

## 3. The two lanes

**Conformance lane** (working label): extends the Lean model from the
ratified contract, instantiates statement schemas, proves obligations or
marks them pending with exact statements, maintains the anti-vacuity kit,
and generates the manifest by executing the model. It never edits the
TypeScript tree.

**Implementation lane** (working label): edits the TypeScript implementation
until the gate is green against the current ratified manifest. Failures
carry obligation IDs pointing at exact Lean statements. It never edits the
Lean tree and never edits the manifest.

**Coupling rule:** the versioned manifest is the only interface between the
lanes. A lane editing the other lane's tree, or either lane hand-editing a
manifest, is a named defect.

**Independence rule:** the lanes run in separate harness contexts. One
context playing both roles in a single conversation is a named defect — the
independence is part of the trust argument, not an operational convenience.

**Ratification point:** between conformance-lane output and
implementation-lane consumption, a human reviews statement-schema instances
(as diffs against ratified schemas), sampled vectors, and any mutation
survivors. Proofs are not reviewed by hand; the kernel and the axiom report
carry them.

## 4. Statement schemas — the auditable surface

A **statement schema** (working label) fixes an obligation family's
quantifier structure once, under grilling. Harness-authored work then only
*instantiates* schemas, and audit means reading a small diff against a known
shape — never parsing a novel quantifier structure. A statement that fits no
ratified schema is a stop condition, not a contribution.

The schema catalog is seeded from the existing obligation ledger. The ledger
row already carries the three ingredients:

| Ledger column | Becomes |
| --- | --- |
| Obligation | the statement schema and its Lean instances |
| Evidence target | the proof plus the vector families exercising it |
| Negative/falsification case | the mutation that must be killed (section 6) |

The standard invariant form is boolean reflection — one executable checker,
one iff that makes it the judgment, so both lanes share semantics through an
executable artifact:

```lean
def checkNoLiveDelegation (t : DecisionTrace) : Bool :=
  t.all (fun d => d ≠ Decision.liveDelegate)

theorem checkNoLiveDelegation_iff (t : DecisionTrace) :
    checkNoLiveDelegation t = true ↔ NoLiveDelegation t := ...
```

Every schema instance ships an **anti-vacuity kit**:

```lean
-- positive witness: the property holds somewhere real
#guard checkNoLiveDelegation exampleReplayTrace
-- falsification witness: the property fails somewhere real
#guard !(checkNoLiveDelegation exampleRecordTrace)
-- (record mode delegates live; if this guard fails, the statement is vacuous)
```

A proved theorem whose kit is missing or whose falsification witness cannot
be produced is treated as unproved for ledger purposes. This is the specific
defense against the harness-authored-specification failure mode: proved but
meaningless.

## 5. The manifest — the inter-lane contract

The manifest is a versioned, byte-deterministic case file generated by
executing the Lean model (the generated-vectors law applied to this
library). Handwritten scenarios may be canonical *inputs*; expected outputs
are always produced by the model. A provisional row shape:

```json
{
  "family": "RPL-003",
  "case": "repeat-identical-002",
  "model": "effects-model@<version>",
  "input": { "state": "...", "request": "..." },
  "expect": { "decisions": ["consume", "substitute"], "outcome": "..." }
}
```

The Lean side proves the per-row theorems (`model(row.input) = row.expect`,
the machine's vector-theorem pattern); the TypeScript suite runs the same
rows verbatim. Exact format, canonical ordering, and versioning are M1/Pass-B
work. One name binds all surfaces: ledger ID = Lean theorem name = manifest
family = TypeScript test name, so a red test is one grep from its statement.

## 6. Mutation runs — the honesty metric

Row counts do not measure coverage; kill rates do. The **mutation catalog**
(working label) is derived from the obligation ledger's falsification
column — each declared mutation operationalizes a known failure mode:

| Ledger falsification case | Mutation |
| --- | --- |
| skip, duplicate, or reuse one occurrence | reducer variant that does not advance the cursor |
| missing entry falls back to live adapter | reducer variant that emits live delegation on exhaustion |
| deduplication shortens history | record variant that drops repeat-content occurrences |
| comparator drops mismatch decisions | normalizer variant that filters rejections |

Two directions, both cheap:

1. **Model mutation:** regenerate the manifest from a mutated model; the
   regenerated bytes must differ from the ratified manifest. This proves the
   vectors are sensitive to the semantics they claim to pin.
2. **Implementation mutation:** run the ratified manifest against a mutated
   TypeScript reducer; the suite must go red. This proves the suite can
   discriminate.

A surviving mutant is a coverage hole: it becomes a conformance-lane task
(new vectors) before any milestone exit, never a waiver. The kill rate per
obligation family is recorded on the ledger surface and quoted as evidence,
never as proof.

## 7. Ledger and ratchet

A conformance ledger surface (form pending grilling; the house
generated-ledger pattern is the reference) records per obligation: schema
status, instance status, proof status with axiom report, vector rows green,
mutation kill rate, and the highest gate stamp. The ratchet: a green row
never regresses except through a declared model-version bump. "Model updated
to verified" means exactly this surface updating — existing gate stamps plus
the metric, no new claim vocabulary.

## 8. One loop iteration

```text
ratified contract
      |
      v
[conformance lane]  extend model, instantiate schemas, prove or mark pending,
      |             maintain anti-vacuity kits, execute model -> manifest v(n)
      v
[human ratification]  review schema-instance diffs, sampled vectors,
      |               mutation survivors; statements only, never proofs
      v
[implementation lane]  edit TypeScript until gate green vs manifest v(n);
      |                failures carry obligation IDs
      v
[ledger update]  gate stamps, kill rates, green rows; ratchet holds
      |
      v
next slice — or a contract-level surprise from either lane hits the
existing stop conditions and returns to grilling
```

## 9. Stop conditions

Stop and return to grilling if:

- a statement appears that fits no ratified schema;
- a lane edits the other lane's tree, or any hand edits a manifest;
- one harness context plays both lanes in a single conversation;
- an anti-vacuity kit is missing, or a falsification witness cannot be
  produced for a stated invariant;
- a mutation survivor is waived instead of covered;
- a kill rate or vector count is quoted as proof, or any surface says
  "verified TypeScript";
- a pending proof is treated as proved on any ledger or claim surface; or
- manifest regeneration is not byte-identical from declared sources.

## 10. Grilling agenda

1. Schema catalog: the first instances, seeded from `CAS-001..003`,
   `RPL-001..005`, `SES-001`, `CMP-001..002`, `CTX-001..002`, `BRG-001`.
2. The mutation catalog derivation and the two mutation directions.
3. Manifest format, canonical ordering, and version binding to the model.
4. The ledger surface form and where it lives.
5. Lane role definitions and the exact `TOOLS.md` rows.
6. Where the ratification point sits operationally (session cadence, what
   the human sees, what a rejection returns to the conformance lane).
7. Whether the anti-vacuity kit is enforced by the gate (a `#guard` audit
   task) or by review alone.
