# Conformance workflow — dual-lane verified development

Status: RATIFIED by grilling 2026-08-26 (operator, in-session; rulings
WGR-1 through WGR-7 plus two rider rules — instructional closure and plain
meaning; recommendations accepted throughout, with the staged option selected
for cycle-state modeling). This document owns the workflow's process
vocabulary; the library's domain vocabulary stays with the
[Effect Replay context](../../docs/effect-replay/CONTEXT.md).
Claim posture: workflow rules only; no model, theorem, or implementation
claim is admitted by this document.

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

The claim ceiling is fixed: this workflow produces a kernel-checked model
plus a forced-agreement implementation. It never produces "verified
TypeScript." Gate vocabulary is unchanged — model theorems are G1/G2
material, differential agreement is G4-labeled sampled evidence, and no
metric below promotes a claim across a gate.

## 2. Trust architecture

The central design problem is **correlated error**: when one model harness
writes the conformance code and another writes the implementation, the
kernel guarantees the proofs but nothing guarantees the statements. A
mis-quantified invariant proves cleanly and constrains nothing, and two
harnesses drawing on similar priors can be wrong in the same direction.

Every trust anchor exists to break that correlation:

| Anchor | What it secures | Who or what carries it |
| --- | --- | --- |
| Lean kernel | proofs of stated theorems | machine |
| Ratified statement schemas | quantifier structure of every invariant | human, once per schema |
| Ratified sentence templates | plain meaning of every invariant | human, once per schema |
| Sampled vector review | vectors mean what the contract means | human, per ratification point |
| Deterministic generation | manifests come from the model, not hands | generated-vectors law |
| Anti-vacuity kits | statements are non-trivial | compile-checked `#guard`s |
| Mutation kill-rate | vectors actually pin the semantics | machine, measured |
| Lane independence | no shared blind spots between lanes | workflow rule |

Both harnesses hold `TOOLS.md` rows with the estate's standard empty trust
contribution. The gates and the anchors above carry all trust; the harnesses
carry none.

## 3. The two lanes

**Conformance lane**: extends the Lean model from the ratified contract,
instantiates statement schemas with their sentences and anti-vacuity kits,
maintains the declared mutants, and generates the manifest by executing the
model. It never edits the TypeScript tree.

**Implementation lane**: edits the TypeScript implementation until the gate
is green against the **last ratified manifest**. Failures carry obligation
IDs pointing at exact Lean statements. It never edits the Lean tree and
never edits a manifest.

**Coupling rule:** the versioned manifest is the only interface between the
lanes. A lane editing the other lane's tree, or either lane hand-editing a
manifest, is a named defect.

**Ratified-manifests-only rule:** a generated-but-unratified manifest is
invisible to the implementation lane. While a new manifest version awaits
ratification, the implementation lane keeps working against the previous
ratified version — the pipeline never blocks on ratification.

**Independence rule:** the lanes run in separate harness contexts. One
context playing both roles in a single conversation is a named defect — the
independence is part of the trust argument, not an operational convenience.

## 4. Statement schemas — the ratified catalog

A **statement schema** fixes an obligation family's shape once, under
grilling. A schema bundle has three ratified parts: the **statement
template** (quantifier structure with named holes), the **sentence template**
(plain meaning with the same holes; section 5), and the **kit template**
(what a positive and a falsification witness look like for that shape;
section 10). Harness-authored work only *instantiates* bundles; audit means
reading a small diff against a known shape. A statement that fits no
ratified schema is a stop condition.

Realization (M1 refinement): each family is a Lean structure in
`Effects/Conformance.lean` whose fields are the template's holes, whose laws
are proof fields, and whose anti-vacuity kit is also fields. An obligation
instance is a term of the family structure — a term without its law or kit
does not elaborate, so proved-without-kit is unrepresentable for Lean-side
artifacts.

The catalog (WGR-2), seeded from the obligation ledger:

| Schema family | Statement shape | First instances |
| --- | --- | --- |
| WF-PRESERVE | `∀ s i, WF s → hyp → WF (step s i)` | reducer step well-formedness; record append |
| TRACE-EXCLUDES | `∀ s i, mode/flag s = m → d ∈ decisions (step s i) → d ≠ bad` | RPL-002; SES-001 (aborted session never appends) |
| EXACT-STEP | `∀ s q, hyp → measure (step s q) = measure s + δ` | RPL-003; record append length |
| FAIL-CLOSED | `∀ s q, ¬hyp → step s q rejects ∧ consumes nothing` | RPL-004; RPL-005's completion form |
| DISTINCTNESS | `∀ s q q', content q = content q' → occurrences distinct` | CMP-002 |
| HOMOMORPHISM | `interp (bind p k) = …` over both outcome cases | CMP-001; return/bind laws |
| CODEC | `decode ∘ encode = some` ∧ `encode` injective on canonical forms | CAS-001 |
| REJECTION-CLAUSE | `∀ raw, admit raw = error c ↔ Clause c raw` | CAS-002 node admission |

Cross-cutting: every checker carries the boolean-reflection iff
(`check x = true ↔ Prop x`) — one judgment, one decision surface, one iff.

Deliberate exclusions, ratified: **CTX-001/002 have no Lean schema** — they
are TypeScript-side obligations (typecheck, layer graph, tripwire fixtures),
and a Lean statement claiming them would fake coverage. **CAS-003 is a
review rule, not a schema** — "every address law carries its lattice level"
is checked by reading theorem signatures.

## 5. The plain-meaning rule

Auditability needs humans to read what is actually being tested and
conformed to, in the domain language of the codebase. The plain-language
layer therefore follows the same schema/instance discipline as the formal
layer:

- every schema family ratifies a **sentence template** with named holes;
- every instance fills the holes **in the minted domain vocabulary** — the
  Effect Replay context document is the glossary that makes those sentences
  precise;
- every declared mutant states **what killing it represents**, in the same
  register;
- sentences are **single-sourced** as fields of the typed artifact — the
  `sentence` field of a schema-bundle instance, the `represents` field of a
  mutant — and **projected** onto the ledger, briefings, and manifest family
  headers by the emitter, which reads typed instances and never parses
  comments. Docstrings carry the ratified *templates*; fields carry the
  *instances*. Hand-editing a projection is the derived-surface defect. The
  ratification diff shows sentence and statement together, so a statement
  that moved under an unmoved sentence is visible in one review.

```lean
/-- SCHEMA EXACT-STEP sentence: "When <hypothesis>, one reducer step changes
    <measure> by exactly <δ> — <domain gloss>."

    When the emitted request matches the entry at the cursor, one reducer
    step advances the cursor by exactly one — a matching request consumes
    exactly one occurrence: never zero, never two. -/
theorem RPL_003_exact_consumption ... := ...
```

Manifest rows stay data: the family header carries the obligation's
sentence; case ids stay readable; boundary cases may carry a one-line note.

## 6. The manifest — the inter-lane contract

Per-family JSON files, generated by executing the Lean model:

```text
library/effects/conformance/manifest/
  RPL-003.json
  RPL-004.json
  ...
```

```json
{
  "family": "RPL-003",
  "model": "effects-model@<version>",
  "meaning": "<projected obligation sentence>",
  "rows": [
    { "case": "repeat-identical-002",
      "input":  { "state": "...", "request": "..." },
      "expect": { "decisions": ["consume", "substitute"], "outcome": "..." } }
  ]
}
```

The five ratified rules (WGR-4):

1. **Lean writes it, through a canonical printer** — sorted keys, declared
   number handling, rows sorted by case id.
2. **Version binding is to the declared model version, not the commit.** Any
   semantics-affecting model change bumps `effects-model@x.y.z`;
   regeneration under an unchanged version must be byte-identical (the
   gate's ratchet check); a bump is a declared transformation, and old
   manifests are deleted — git history is the CAS that keeps them
   recoverable.
3. **Family digests live on the ledger** and nowhere else.
4. **Inputs are authored as Lean fixtures** (handwritten scenarios are
   canonical inputs; outputs are never written by hand). A scenario
   conceived on the TypeScript side is transcribed into a Lean fixture by
   the conformance lane.
5. **The TypeScript suite consumes rows verbatim**, decodes, and compares
   decision traces structurally under the declared normalization — never by
   re-serialization, so printer quirks cannot masquerade as agreement.

One name binds all surfaces: ledger ID = Lean theorem name = manifest
family = TypeScript test name. A red test is one grep from its statement.

## 7. Mutation runs — the honesty metric

Row counts do not measure coverage; kill rates do. Ratified form (WGR-3):

- **Declared mutants only** — no automated mutation tooling. One
  hand-declared mutant per obligation-ledger falsification case is the
  floor, named by the obligation it attacks
  (`Effects/Mutants/RPL003_SkipAdvance.lean`, `test/mutants/RPL-003-*.ts`),
  each carrying its plain-meaning header (what killing it represents).
- **Quarantine:** mutants are never proof-bearing and never imported by the
  real model; a gate grep asserts `Effects/` never imports
  `Effects/Mutants/`.
- **Two directions, both asserted by the gate:**

```text
direction 1 (vector sensitivity):    manifest(mutant model) ≠ manifest(model)
direction 2 (suite discrimination):  suite(TS mutant, ratified manifest) = RED
```

- **A survivor fails the task** — hard, never a warning — and becomes a
  conformance-lane vector task before any milestone exit. No waivers.
- Placement: `check:effects:mutation` runs inside the root check and at
  every ledger regeneration; the inner dev loop may run it targeted. Kill
  rate lands on the ledger per family and is quoted as evidence, never as
  proof.

## 8. Cycle state and harness alignment

Ratified model (WGR-1): **cycle state is a derived projection of the tree at
a commit.** Nothing about the cycle lives outside the repo. Ratification
events are committed documents (the M0 pattern, now a rule); everything else
is computed by gate tasks. The commit hash is the state identity.

**Plane boundary:** git is the CAS of the development plane; the library's
runtime CAS is a different plane. They share the discipline — canonical
bytes, content addressing, derived-never-hand-maintained — and no
implementation. Routing development state through the effects `CasStore` is
a named defect.

**Two generated surfaces**, each a deterministic function of
`(commit, lane)`:

- the **conformance ledger** (section 9) — committed, byte-compared, the
  ratchet's substrate; and
- the **briefing** — on-demand, never committed
  (`mise run brief:effects -- --lane=<lane>`): commit and version identity,
  the lane's next targets with statements and sentences excerpted from
  source, red rows, and the standing rules in scope. Everything in it is
  derived, so briefing drift is impossible by construction.

**Ratchet-driven targeting:** obligations sit in the dependency DAG the plan
already declares; `next()` is the least red obligation whose dependencies
are green, per lane. Each run tells the next step.

**Staged Lean lift:** phase 1 (M1) implements the ledger schema and the
transition-legality check as gate scripts. Phase 2 — only after the workflow
has survived real slices — lifts the transition system into a small Lean
model with the monotonicity theorem and conformance-checks the script
against it, entering through its own Pass A like any extension.

**Statelessness rule (the alignment guarantee):** a lane harness must be
fully resumable from `(commit, lane, briefing)` alone. Relying on
conversation memory for cycle state is a named defect — sessions are
stateless functions of the tree.

**Instructional closure (rider):** everything that shapes a lane —
`AGENTS.md`, context documents, lane role definitions, briefing inputs — is
versioned in-tree, so `(commit, lane)` determines the full harness input.
If anything load-bearing is ever found living outside the tree, it either
moves in-tree or is declared here as an explicit exception.

## 9. The conformance ledger

`library/effects/CONFORMANCE-LEDGER.md`, generated by the gen task,
byte-compared by the gate, transition-checked between commits (green never
regresses except through a declared model-version bump). Shape (WGR-5): a
narrow status table plus per-obligation sentence blocks:

```markdown
| ID      | Schema      | Proof   | Kit | Vectors   | Kill | Stamp |
| ------- | ----------- | ------- | --- | --------- | ---- | ----- |
| RPL-003 | EXACT-STEP  | proved  | ok  | 7/7 green | 2/2  | G1    |

## RPL-003 — exact consumption
<projected sentence>
Manifest: RPL-003.json · sha256 <digest> · <n> rows
```

Mechanical rules: `Proof: proved` is written only when kernel evidence
exists *and* the kit markers are found — proved-without-kit renders as
`pending` by construction; the axiom report gates the G1 stamp; family
digests live here and nowhere else. Wired into the root `gen`/`check` tasks
like every derived surface.

## 10. Anti-vacuity kits — gate-enforced

`#guard` fails at compile time, so enforcement is nearly free (WGR-7):

```lean
#guard checkExactConsumption exampleMatchingStep          -- positive witness
#guard !(checkExactConsumption exampleMismatchStep)       -- falsification witness
```

For Lean-side artifacts, presence is type-enforced (M1 refinement): kits are
fields of the schema-bundle structures, so an instance without its witnesses
does not elaborate and the ledger emitter needs no grep. The `#guard` and
naming-convention route remains for artifacts outside the structures — the
mirrored TypeScript mutants and any standalone checkers. Truth is the Lean
build itself in both routes. Review still reads kits at ratification — for
meaning, not existence. Each schema family's kit template (ratified with the
bundle) defines what its witnesses look like: a falsification witness for
WF-PRESERVE is an ill-formed raw state; for TRACE-EXCLUDES it is the
record-mode trace that does delegate; DISTINCTNESS is positive-only by shape
(its only falsification would deny the law itself).

## 11. The ratification point

Fires **per manifest version, not per commit** — whenever the conformance
lane emits a version carrying new or changed statements. The ratifier sees a
generated projection: schema-instance diffs (statement and sentence
together), sampled vectors, mutation survivors, and the ledger delta. Proofs
are not reviewed by hand; the kernel and the axiom report carry them. A
rejection returns named corrections to the conformance lane while the
implementation lane continues against the previous ratified version. In this
repository the ratifier is the operator and the cadence rides the milestone
rhythm.

## 12. One loop iteration

```text
ratified contract
      |
      v
[conformance lane]  extend model, instantiate schema bundles (statement +
      |             sentence + kit), maintain mutants, execute model
      |             -> manifest v(n)
      v
[ratification]  schema-instance diffs, sampled vectors, mutation survivors;
      |         statements and sentences only, never proofs
      v
[implementation lane]  brief from (commit, lane); edit TypeScript until gate
      |                green vs ratified manifest v(n)
      v
[ledger update]  gate stamps, kill rates, green rows; ratchet holds
      |
      v
next slice — or a contract-level surprise from either lane hits the stop
conditions and returns to grilling
```

## 13. Stop conditions

Stop and return to grilling if:

- a statement appears that fits no ratified schema;
- a lane edits the other lane's tree, or any hand edits a manifest;
- the implementation lane consumes an unratified manifest;
- one harness context plays both lanes in a single conversation;
- an anti-vacuity kit is missing, or a falsification witness cannot be
  produced for a stated invariant;
- a mutation survivor is waived instead of covered;
- a projected sentence is hand-edited, or a statement changes under an
  unchanged sentence without review;
- development state is routed through the library's runtime CAS, or a
  load-bearing harness input is found out-of-tree and left undeclared;
- a kill rate or vector count is quoted as proof, or any surface says
  "verified TypeScript";
- a pending proof is treated as proved on any ledger or claim surface; or
- manifest or ledger regeneration is not byte-identical from declared
  sources under an unchanged model version.

## 14. Ratification record (2026-08-26)

- **WGR-1** — cycle state as derived tree projection; git/runtime plane
  boundary; ledger + briefing surfaces; ratchet-driven `next()`; staged Lean
  lift (phase 1 scripts, phase 2 own Pass A); statelessness rule. Rider:
  instructional closure.
- **WGR-2** — the eight-family schema catalog with CTX-*/CAS-003 exclusions;
  instances name their schema; bundles carry statement, sentence, and kit
  templates.
- **WGR-3** — declared mutants only, one per falsification case as floor,
  quarantined and gate-grepped; both mutation directions asserted; survivor
  fails the task.
- **WGR-4** — per-family manifests under the five rules; model-version
  binding with byte-identical regeneration; ledger-carried digests.
- **WGR-5** — ledger shape as in section 9 with the mechanical
  proved-without-kit rule.
- **WGR-6** — lane roles landed in `TOOLS.md`; per-manifest-version
  ratification cadence; ratified-manifests-only consumption.
- **WGR-7** — gate-enforced kits via compile-checked `#guard`s plus
  convention grep; kit templates ratified per schema family.
- **Rider: plain meaning** — sentence templates per schema, mutant meanings,
  single-source sentences projected to ledger/briefing/manifest headers.
- **M1 refinement (2026-08-26, recorded at the M1 opening):** schema bundles
  are realized as Lean structures with laws and kits as fields
  (`Effects/Conformance.lean`), per the
  [`tree-sitter-plan-prior-art`](research/tree-sitter-plan-prior-art.md)
  note. This strengthens WGR-7 (kit presence type-enforced for Lean-side
  artifacts; grep route retained for TS-side) and the plain-meaning rule
  (sentence source is the typed `sentence`/`represents` field; docstrings
  carry templates) without changing either rule's substance.
- **M2 ratification (2026-08-27, manifest version `effects-model@0.1.0`):**
  the operator ratified the CAS-001 (CODEC) and CAS-002 (REJECTION-CLAUSE)
  statement-and-sentence pairs — including CAS-001's identity-canon reading
  (the carrier's declared equivalence is equality, so canonicality lives in
  decoder exactness) and CAS-002's fixed kit store with the `Unit` admitted
  carrier — the `effects-model@0.1.0` declaration with the
  append-to-`ratifiedManifestVersions` committed-document mechanic, and the
  five first vectors. Riders: the fixed kit-store semantics are re-examined
  when application-level Effect testing brings real contexts, which may be
  different things; vector growth is a declared next-cycle task under the
  unchanged version (row additions change no statement, so they do not
  re-fire ratification); family digests on the ledger are deferred to the
  implementation-lane consumption step, where a manifest consumer exists to
  digest for. The CAS node, content identifier, and node admission code
  labels left pending in the context document were filled at this
  ratification.
- **M3 ratification (2026-08-27, additive under `effects-model@0.1.0`):**
  the operator ratified the seven replay statement-and-sentence pairs —
  RPL-002 (TRACE-EXCLUDES: replay hermeticity as an empty live-delegation
  projection), RPL-003 (EXACT-STEP over the `MatchesAt` hypothesis),
  RPL-004 (FAIL-CLOSED over the same hypothesis, so the two partition the
  invoke step with no third behavior; rejection also aborts the session
  structurally — terminal-for-the-attempt is state, not prose), RPL-005
  (FAIL-CLOSED over completion, the carried terminal-so-far exhibited by a
  full output equation), SES-001 (TRACE-EXCLUDES with the status as the
  guarded mode — an aborted session's step emits nothing at all; the
  transport-seam half stays M4 TypeScript evidence), SES-002 (WF-PRESERVE
  with the trivial hypothesis — totality preserves well-formedness on
  every input; minted plan-first as a new section-7 row at the M3 slice),
  and CMP-002 (DISTINCTNESS with content as the entire input — a
  byte-identical invocation and outcome still keeps occurrences distinct;
  position is the occurrence identity). Version ruling: the seven replay
  families land additively under the unchanged `effects-model@0.1.0` — no
  pre-existing statement changed and the CAS families regenerate
  byte-identical, so rule 2's ratchet is satisfied without a bump; bumps
  stay reserved for semantics-affecting model changes (a store-side
  acyclicity clause, if ever adopted, is the first genuine 0.2.0).
  Ratification fired on the new statements, not on a version transition.
  Carrier-discharge ruling: RPL-001 is discharged by carrier construction
  — the agreement theorem `step_iff_reduce` plus reducer determinism —
  recorded in the generator's declared discharge list and rendered as
  `discharged`, which the transition check holds green; the registry route
  was rejected so that "instantiated" keeps meaning proved-with-kit.
  Taxonomy-fidelity ruling: the `violated` session outcome and the
  `outcomeInadmissible` mismatch category stand as ratified caller-visible
  taxonomy with no emitting reducer rule in this slice; their emitting
  rules arrive with their milestones through Pass A. The replay-term code
  labels left pending in the context document were filled at this
  ratification.
- **Bridge-evidence ruling (2026-08-27, at the accepted M3 delivery
  review):** the operator accepted the proposed flip mechanism for bridge
  rows — a declared evidence list in the generator naming the accepted
  differential suite, entered only at a delivery review, mirroring the
  carrier-discharge mechanic. BRG-001 flips to `evidenced — differential
  suite` on the strength of the accepted M3 delivery: the line-by-line
  correspondence review of the mirrored reducer passed rule-for-rule and
  all seven replay families are consumed structurally. `evidenced` is
  G4-labeled sampled agreement, never proof; the transition check holds
  it green. The tsSide rows (CTX-*) are not covered by this ruling and
  get their own mechanism decision when M4 delivers them.
- **CMP-001 ratification (2026-08-27, no manifest surface):** the
  operator ratified the CMP-001 statement-and-sentence pair —
  HOMOMORPHISM over the reified sequential program, interpreted through
  the reducer into Lean's built-in `EStateM` (its `Result` is the
  family's ratified shape: ok-with-state or error-with-state), with the
  bind law stated as a monad morphism so a nested program continues from
  exactly the state its prefix reached. Rulings carried: the fail
  channel is the three-case interpretation halt — the program's own
  typed failure, the session's typed rejection, and the absorbed
  totality case — mirroring the session boundary and never widening a
  wrapped method's error union (`replay_invoke_result` pins the
  reachable leaf results); the kit runs both branches through a leaf
  over a failure-recording fixture (the positive program recovers, the
  failing one re-raises); CMP-001 carries no manifest family on
  principle — reified programs hold meta-level continuations and
  nothing serializes a continuation — so its declared mutant is killed
  on the two-leaf witness run, the stated direction-1 analogue for a
  vectorless family; and the briefing consume list derives from the
  actual manifest surface, so an unvectored instantiated family never
  renders as consumable. Two context entries were minted at this
  ratification: reified program and interpretation halt.
