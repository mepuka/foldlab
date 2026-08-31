# Effect Core v1 — lane routing

Status: **PRE-GRADE / PROPOSED**, 2026-08-31

This file governs only `.staging/effect-core-v1/`. It is an operating router,
not a semantic specification and not a claim record. Root `AGENTS.md`,
`library/cas/AGENTS.md`, and `library/effects/AGENTS.md` remain authoritative
for estate conduct, the store language, and the Effect host respectively.

## Read order

For any Effect Core v1 task, read only this sequence before following a more
specific link:

1. root `AGENTS.md`;
2. this file;
3. `README.md` for packet status and file roles;
4. `PLAN.md` for scope and slice order;
5. `EXISTING-TYPES.md` before naming or changing a carrier;
6. `EXHIBITS-REVIEW.md` before relying on either staged Lean exhibit;
7. `COUNTEREXAMPLES.md` before weakening, repairing, or closing a statement;
8. `TYPE-CLOSURE.md` before freezing or approving cutover for a type;
9. `ORGANIZATION.md` before adding a document, generator, ledger, or gate;
10. the one contract/proof/checklist document that owns the current task; and
11. the generated status and obligation manifests once those exist.

Do not preload every packet document. The manifest and current slice must make
the required read set finite and explicit.

## File authority

| File | Owns | Must not own |
| --- | --- | --- |
| `PLAN.md` | scope, premises, slice order, literature roles, claim route | carrier fields or theorem bodies |
| `EXISTING-TYPES.md` | annotations and reuse/bridge decisions for declarations already present | a duplicate declaration or proof |
| `ALGEBRA.md` | proposed carriers, syntax, operations, and semantic faces | public Effect surface closure |
| `CLASSIFICATION.md` | denotational abstract domains and transfer obligations | source-tooling verdicts |
| `CONTRACT-PACKET.md` | quantified clauses and breaker falsifiers | implementation choices that weaken a clause |
| `PROOF-DAG.md` | declaration dependencies, theorem signatures, and proof routes | proof scripts or external-tool trust |
| `REIFICATION-CHECKLIST.md` | pinned public-surface census and total structural disposition | Semantic Model meaning |
| `EXHIBITS-REVIEW.md` | applicability of the two staged Lean exhibits, refusal ownership, and nondeterminism ruling | promoted declarations or a global determinism theorem |
| `COUNTEREXAMPLES.md` | stable counterexample IDs, attacked statements, witnesses, evidence states, and register completeness | proof bodies, negative-fixture semantics, or replacement-design sufficiency |
| `TYPE-CLOSURE.md` | per-type proof graph and mechanical full-cutover predicate | theorem bodies or source census facts |
| `ORGANIZATION.md` | ownership, generated facts, gates, resume protocol, promotion shape | semantic definitions |
| `WORKSHOP-RESULTS.md` | exact local probe commands and observations | promoted claims or frozen declarations |
| `workshop/` and `*.lean` exhibits | disposable falsification/proof experiments | canonical library code or authoritative definitions |

If two files appear to own the same fact, stop and repair the ownership table;
do not copy the fact into both.

## Current production boundary

- The packet is pre-grade and may be revised through review.
- Scratch probes may be created under this directory and must be reported in
  `WORKSHOP-RESULTS.md` if they influence a decision.
- No declaration moves into `formal/` or `library/` until the relevant slice
  has been grilled and its public signature has been frozen.
- No generated path proposed by `ORGANIZATION.md` is created merely because it
  is named there. Generation begins only after its schema and consumer are
  accepted.
- The pinned CAS carrier and canonical `PProg` identity are not replaced.

## Existing-type rule

Before introducing a proposed type, operation, theorem family, or target
carrier:

1. look it up in `EXISTING-TYPES.md`;
2. record the exact existing declaration or public symbol, if any;
3. choose one annotation disposition: reuse, restrict, bridge, embed,
   separate-calculus, target-only, or proposed-new;
4. name the declaration that owns meaning and the declaration that owns bytes;
5. state why reuse alone is insufficient when choosing `proposed-new`; and
6. add a falsifier that would expose accidental duplication or semantic drift.

An unannotated relevant declaration is a gate failure. A comment saying “new
version” is not an annotation.

## Role separation

- The **breaker** owns quantified clauses, adversarial examples, and the
  frozen statement. The breaker does not implement the checker it attacks.
- The **implementer** works only against a reviewed contract and records exact
  diagnostics when a statement is unimplementable as written.
- The **reviewer** checks Effect-source fidelity, existing-carrier reuse,
  proof adequacy, and claim scope independently.
- The **surface hoover** inventories source declarations but makes no
  denotational judgment.
- The **Lean model** owns meaning; the generated TypeScript and Effect runtime
  are separately related targets.

One person or agent may occupy different roles in different slices, but not
breaker and implementer for the same falsifier battery.

## Incoming agent-report intake

An incoming message or `.staging/agent-reports/` file is evidence, never packet
authority. The coordinating lane processes it in this order:

1. record the report path, author/role, revision or file sizes classified, and
   commands the author says were run;
2. compare every recommendation with the operator-set decisions in `README.md`
   and the owning packet document; a contradictory recommendation is retained
   as evidence history, not silently adopted;
3. route each finding to exactly one owner in the file-authority table;
4. independently rerun every command before changing an evidence state to
   `VERIFIED-KERNEL` or `VERIFIED-TOOL`;
5. give every contradiction that can change a statement one stable ID in
   `COUNTEREXAMPLES.md`, while linking rather than copying the proof source;
6. amend the owning theorem/contract/type row with the exact premise, carrier
   restriction, quotient, or target change forced by the witness;
7. update cross-document status projections only after the owner is correct;
   and
8. report unresolved conflicts explicitly. Elaboration of a scratch value is
   never accepted as a semantic law, and an obsolete lane status is not treated
   as current merely because its report is detailed.

Two agents do not edit the same authority file concurrently. The coordinator
may add a reconciliation section to an incoming report-derived document, but
must preserve the original evidence and distinguish it from the binding packet
reading.

## Resume protocol

A fresh session does not recover this lane from chat history. It recovers from
repository content in this order:

1. verify the packet manifest and source pins;
2. read the current-slice row and its prerequisites;
3. read the frozen declaration digest for that slice;
4. read open obligation and red-control rows;
5. run the narrow status/check command named by the slice; and
6. continue only if the working tree changes are attributable and the nearest
   AGENTS files agree with the spec ledger.

If a manifest is absent, the lane is still in its current pre-grade bootstrap
state; use `README.md` and `PLAN.md`, and do not invent a completed status.

## Effect language-service rule

The TS7 path is `@effect/tsgo` with plugin name
`@effect/language-service`. It is required source-hygiene and coverage
evidence. It never defines `ProgramWF`, `Denotation`, a classifier fact, or a
handler law. Every diagnostic run must prove exact file-set coverage; an empty
diagnostic array without coverage is a failed harness.

## Claim and handoff rule

Every handoff reports:

- current slice and packet digest;
- changed files;
- exact checks run and their results;
- public names added or changed;
- theorem axioms when Lean proofs are involved;
- unresolved obligations and planted red controls; and
- whether any result is only a finite probe.

Never use “fully reified,” “preserves,” “equivalent,” or “complete” without the
closed universe, observation, theorem or gate, and remaining foreign boundary
named in the same statement.
