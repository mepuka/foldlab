# Model-guided verified development — strategy and source study

Status: **STAGED PROPOSAL — pre-grade, not ratified**

Mode: conception

Source receipt: [`model-guided-development-sources.json`](../../.reference/provenance/receipts/model-guided-development-sources.json)

The working names in this note (`model scout`, `ScoutRequest`, `outcome bank`,
and related labels) are provisional. This note does not admit a tool, install a
dependency, promote a claim, or alter the current breaker/implementer process.

## Decision

Build one **model scout** between the approved development contract and the
breaker. Its job is to spend a small, fixed budget before implementation or
expensive proof work and return:

- the likely obligation families;
- small candidate invariants and helper lemmas;
- concrete counterexamples and negative cases;
- clauses, fields, and transitions the specification does not constrain;
- the smallest checker-accepted candidate subset;
- unresolved proof obligations ranked by expected value; and
- exact scope, cost, tool, model, and cache receipts.

The scout does not say “verified.” It says what was refuted, what survived a
named scope, what a named checker accepted, and what still needs a Foldlab Lean
theorem. The cheap model is a search heuristic. Deterministic checkers and Lean
remain the referees.

The first implementation should be deliberately small:

1. Reuse Foldlab's existing obligation shapes and `fast-check` admission.
2. Add a serializable work packet, outcome bank, candidate selector, and run
   ledger.
3. Use cheap models to instantiate and rank atomic candidates.
4. Check candidates with existing executable and Lean-native bounded lanes.
5. Add Alloy only after the local loop is measured.
6. Add Dafny only for algorithmic/loop-heavy slices where it earns its semantic
   bridge cost.

This directly implements the already recorded direction in
[`SPECS.md`](../../docs/SPECS.md): “code → context-aware spec + invariant
generation,” while preserving the proof floor and the breaker/implementer split
in [`PROOF-DRIVEN-DEVELOPMENT.md`](../operational-structure/PROOF-DRIVEN-DEVELOPMENT.md).

## Operating strategy

### 1. Turn the brief into an obligation graph

Before asking a model for proof text, freeze a small graph whose nodes are
questions the development must answer:

- What values or states are admitted?
- What must hold initially?
- What must every operation preserve?
- What is forbidden on failure, interruption, retry, or replay?
- What must be exact, distinct, canonical, or invertible?
- Which observations connect the model to the implementation?
- Which assumptions and bounds are being used?

Each node carries one target judgment, its dependencies, its known positive and
negative examples, and the evidence needed to close it. A “prove everything”
request is therefore decomposed before any proof search begins.

### 2. Generate ingredients, not polished proofs

The default cheap-model output is a list of **atomic** candidates, one predicate
or lemma per item. Sources are used as a portfolio:

1. deterministic templates from the outcome bank;
2. nearby proved Foldlab examples;
3. a cheap model with exact project context;
4. a second model or prompt only when diversity is low; and
5. an expensive planner only after the cheap loop stalls.

This follows the strongest program-verification result in the source set.
Loopy solved 293 of 469 positive loop tasks from complete GPT-4 proposals, but
383 after unioning atomic candidates and using Houdini to select a valid subset.
With the same total 15-response budget split into eight generations and seven
repair attempts, it reached 398. The practical lesson is not “use 15 calls”; it
is “models are better at producing useful ingredients than a complete invariant,
and selection should precede more generation.”

### 3. Check usefulness against the real target

A candidate can be true and still useless. For every candidate `I`, check the
actual obligations separately:

```text
initialization:  Init(s)                  => I(s)
preservation:    I(s) and Step(s,a,s')    => I(s')
target utility:  I(s) and Exit(s)         => Goal(s)
```

For protocols, replace `Exit` with the relevant trace or observation judgment.
For codecs, use round-trip, exactness, rejection, and distinctness obligations.
For handlers, use the relevant agreement or homomorphism judgment.

The current Quokka v4 preprint is useful here: it asks the base verifier whether
the proposed invariant actually helps prove the target, rather than only testing
whether the invariant is valid. Foldlab should copy that question, not its C
toolchain.

### 4. Select with counterexamples

Use an ICE/Houdini-style protocol:

- a **positive state** must be included by any valid invariant;
- a **negative state** must be excluded; and
- an **implication pair** `(s, s')` means accepting `s` requires accepting its
  successor `s'`.

Then repeatedly check the conjunction of remaining candidates and eliminate
the clauses blamed by the checker. This is cheap, deterministic candidate
selection. The LLM proposes and ranks; it never decides truth.

The result records why each candidate was selected, refuted, redundant,
unsupported, or left inconclusive. Failed candidates and their counterexamples
remain in the bank so later runs do not rediscover the same dead end.

### 5. Start with eight as a plateau probe

For the first pilot, use this starting policy:

```text
bank templates                 deterministic, always first
cheap-model generations        4
counterexample-informed round  4
local repair rounds            up to 3
large-planner calls            0 by default; at most 1 on a high-value stall
```

Stop early when two successive generations add no new normalized candidate, a
minimal counterexample already decides the question, or the budget is exhausted.
Loopy and Quokka both observed diminishing returns around eight generations in
their workloads. Eight is therefore a calibration starting point, not a house
constant. Foldlab's measurements should move it.

### 6. Retrieve exact project context

The scout supplies only material available in the pinned snapshot:

1. the exact target and local hypotheses;
2. referenced definitions and their dependency closure;
3. imports, namespaces, notation, and instances;
4. accessible declarations matching the target's type/head symbols;
5. nearby compiling proofs and same-file context; and
6. the latest structured checker error during repair.

Use program analysis to remove inaccessible declarations before learned or
embedding ranking. LeanDojo reduced an average premise set from roughly 128,000
to 33,000 this way, then used learned retrieval; retrieval improved its Lean 4
test result from 44.5% to 48.6% on the random split and from 16.2% to 19.9% on a
novel-premise split. Foldlab should combine accessibility filtering and ranking,
not treat them as alternatives.

Start with the top 12 retrieved declarations in a proof prompt, plus direct
dependencies that are not optional. Log recall after the fact: did the accepted
proof use a retrieved declaration, and at what rank?

### 7. Repair the failed fragment

Once a proof or annotation attempt has useful structure:

1. parse it into declarations and proof blocks;
2. locate the earliest failing block;
3. preserve all already checked blocks;
4. try deterministic local automation;
5. ask the model only for the remaining subgoal;
6. reassemble; and
7. freshly recheck the whole artifact.

Do not regenerate the entire proof because one subgoal failed. Apollo's
experiments and the Dafny annotation study both strongly favor targeted repair.
In the Dafny study, a multimodel direct strategy reached 57.3% at five attempts;
verifier-guided repair reached 94.5% at five and 98.2% within eight. Generated
annotations initially grew 63.2% beyond the manual versions, so a final
verification-preserving minimization pass reduced the overhead to 10.6%.

For Foldlab, minimization must retain all named obligations, falsifiers, axiom
reports, and provenance. It may remove redundant proof or annotation material,
never the reason the artifact exists.

### 8. Attack specification adequacy separately

A proof can be correct while the property is weak, vacuous, or aimed at the
wrong behavior. Before proof promotion:

- find at least one ordinary witness for the base model;
- reach every modeled operation or explain why it is unreachable;
- run each declared falsifier and observe a failure;
- negate or perturb each assumption and property clause;
- perturb referenced fields, transitions, and failure paths; and
- run positive and negative semantic examples.

The CAV 2001 paper supplies the right mental model: after a successful model
check, change observable parts of the model and ask whether the property still
holds. A change that does not matter exposes an uncovered region or redundant
structure. This is a specification-sensitivity audit, not a new proof tier.

The 2026 Dafny annotation preprint gives a development-facing example. Four
generated specifications were not logically equivalent to the expert versions;
negative tests exposed them, and a subsequent repair produced correct solutions.
Foldlab's existing rule—one falsification equation per law—fits this directly.

### 9. Escalate by obligation shape

| Work shape | First lane | Escalation | Final authority |
|---|---|---|---|
| Executable TypeScript behavior | seeded `fast-check`, replayable shrinking | Lean model or targeted solver model | named Lean theorem plus implementation evidence |
| Small owned finite carrier | Lean enumeration with `decide_cbv` | larger bounded model if needed | named Lean theorem and axiom report |
| Identity, ownership, graphs, reachability, canonical structure | Alloy 6 bounded witnesses/counterexamples | larger scopes or Lean relation | named Lean theorem |
| Loop or array algorithm | bank + direct target-under-candidate checking | Dafny VC/repair experiment | Foldlab Lean theorem or explicitly separate Dafny claim |
| State machine, retry, replay, async protocol | owned transition model, then Quint simulation | Apalache inductiveness/TLC finite exhaustion | Foldlab Lean trace/transition theorem |
| Proof body after declarations freeze | short tactic/subgoal generation | local repair, then one planner call | fresh Lean check and axiom report |

This router should be internal. Callers ask for an objective and a budget, not a
solver. `unknown`, timeout, unsupported feature, or translation refusal are
ordinary results.

## Concrete model roles

### Cheap candidate model

Give it the carrier, operations, assumptions, target, accessible local facts,
known counterexamples, and applicable bank entries. Require schema-only output:

```json
{
  "candidates": [
    {
      "family": "preservation",
      "predicate": {"op": "..."},
      "whyUseful": "one sentence",
      "expectedFalsifier": "mutation-id",
      "dependencies": ["declaration-id"]
    }
  ]
}
```

It should propose small clauses, distinguish assumptions from conclusions, and
tag missing information. It should not write a monolithic proof or silently
strengthen the specification.

### Cheap ranking model

Rank only after deterministic filtering for syntax, accessibility, duplicates,
and applicability. Features include:

- target-shape match;
- dependency proximity;
- historical success for the obligation family;
- novelty relative to already tried candidates;
- predicted checker cost; and
- whether the candidate separates known positive and negative examples.

iRank improved GPT-4's verified-at-10 from 51.6% in raw model order to 81.4–81.9%
with learned ranking. Semantic deduplication reached 86.7%, but required
quadratically many solver comparisons. Foldlab should therefore use cheap
structural normalization first and make semantic equivalence checks conditional
on their measured value.

### Planner model

Use the larger model only when a high-value unresolved node has survived the
cheap loop. It may propose a dependency DAG or split one obligation into smaller
ones. The breaker must accept any new declarations before proof work resumes.

### Repair model

Give it exactly one failed block, its typed goal, local hypotheses, accessible
facts, and compact structured diagnostics. Preserve the rest of the artifact.
The process-verified RL paper supports retaining earliest-error and successful
prefix data; its direct result concerns training, so Foldlab should first log
this data and use it for retrieval/ranking before considering model training.

## Outcome bank

The bank is not a prompt collection. It is a versioned record of obligation
shapes, constructors, counterexamples, checker outcomes, and costs.

Each entry contains:

```text
stable id and version
carrier and required observables
applicability guard
candidate constructor or grammar
positive, negative, and implication examples
expected falsifiers and mutations
compatible checkers/refuters
witness decoder and replay form
claim ceiling
provenance
historical accepted/refuted/irrelevant outcomes
latency, tokens, checker calls, and review cost
```

Seed it from Foldlab's existing families rather than inventing a parallel
vocabulary:

- `WF-PRESERVE`
- `TRACE-EXCLUDES`
- `EXACT-STEP`
- `FAIL-CLOSED`
- `DISTINCTNESS`
- `HOMOMORPHISM`
- `CODEC`
- `REJECTION-CLAUSE`
- `AGREEMENT`

Add candidate constructors under these broader work shapes:

1. **Admission and well-formedness** — range membership, discriminators,
   dangling references, raw-to-WF boundaries.
2. **Identity and canonicalization** — round-trip, exact decode, idempotence,
   canonical bytes, kind/address agreement.
3. **Relational structure** — uniqueness, functionality, injection, acyclicity,
   reachability, root closure, ownership, no orphans.
4. **State transitions** — initialization, preservation, frame conditions,
   conservation, monotonicity, enabledness, deadlock, exclusive cases.
5. **Trace and protocol** — prefix closure, correlation, causal order,
   at-most/exactly once, retry idempotence, crash/replay behavior.
6. **Algebra and composition** — identity, associativity, idempotence,
   commutation, projection/lift laws, refinement, handler agreement.
7. **Non-vacuity and adequacy** — witnesses, reachable actions, satisfiable
   assumptions, mutant-killing examples, coverage gaps.
8. **Resources** — decreases, queue and collection bounds, overflow/truncation,
   cancellation, bounded progress.

Every retained counterexample becomes a regression fixture, a negative example,
or a Lean existential theorem. It must not disappear into a model transcript.

## The original three sources in the plan

### Alloy

The linked API documentation demonstrates programmatic parsing, command
execution, solution inspection/enumeration, evaluation, serialization, and
unsat-core access. It is Alloy 4.2 documentation from 2011, while the current
stable release is Alloy 6.2.0.

Use Alloy as the bounded relational scout:

1. search for an ordinary witness to rule out an inconsistent base model;
2. check each proposed assertion in explicit scopes;
3. retain concrete counterexamples and enumerate nearby examples;
4. mutate facts, fields, and transitions for coverage; and
5. hand survivors to the next lane with the exact scope and options.

Do not bind the first implementation to the stale Java classes. Target the
pinned Alloy 6.2.0 JAR as a process adapter, prefer stable XML solution output,
and isolate the translation to and from the scout's data model.

### CAV 2001 coverage

Use the paper after a model or proof succeeds. Its central question is: which
parts of the model were actually necessary for that success? Foldlab's adapted
version perturbs:

- assumptions and property clauses;
- observable fields;
- operation/transition cases;
- failure and interruption paths; and
- positive and negative fixtures.

The report should show a coverage matrix from each mutation to the findings it
changes. An unchanged result is a review target: the clause may be redundant,
the model may be overconstrained, or the specification may be blind there.

### Dafny JavaScript

The manual states that Dafny can translate all input `.dfy` files into one
JavaScript file, run with Node through `dafny build --target:js` or `dafny run`.
For Foldlab this is useful only in a selected algorithmic lane:

1. generate Dafny annotations from an already frozen contract;
2. use verifier feedback to select and repair invariants;
3. compile an accepted Dafny program to JavaScript;
4. run it beside the TypeScript implementation as a differential reference; and
5. preserve the Dafny-to-Foldlab correspondence as an explicit open obligation.

A Dafny success is not silently a Foldlab Lean theorem. The generated JavaScript
is an executable reference, not a verified TypeScript implementation.

## Empirical findings translated into heuristics

| Finding | Foldlab heuristic |
|---|---|
| Loopy: 293 complete proposals became 383 selected portfolios; repair reached 398 | Generate atomic clauses, union across diverse attempts, select before sampling more, repair after plateau. |
| iRank: verified-at-10 rose from 51.6% to about 81–82% | Rank candidates before expensive checks; include ranking cost in the result. |
| Dafny annotation preprint: 57.3% direct versus 94.5% repair@5 and 98.2% within eight | Guess, check, repair, then minimize. Retain negative specification tests. |
| LLMVerify: informed context materially outperformed almost-empty prompts on two Rocq projects | Supply exact local context and dependencies; build a real retriever rather than oracle dependencies. |
| LeanDojo: accessible-premise filtering plus learned retrieval improved proof results | Filter by project semantics first, rank second, test on novel-premise holdouts. |
| Apollo: local fragment repair used far fewer samples/tokens than repeated full-proof generation | Keep checked structure, isolate the failing block, invoke automation and the LLM locally, recheck globally. |
| ICLR 2026: combined outcome+tactic reward improved most training settings | Store successful prefixes, first failures, and error classes as future ranking/training data; retain final outcome. |
| NeurIPS workshop compression: preliminary 75% fewer passes, 23% less wall time | Experiment with conservative state dedup/pruning after the basic loop works; never merge pretty-printed states by appearance. |

## Better external banks

Use external corpora to calibrate components, not to declare Foldlab ready:

| Bank | What it tests | Use |
|---|---|---|
| Loopy / LoopInvGen programs | conjunctive invariant generation and Houdini selection | reproduce the candidate-selector baseline |
| iRank data | ranking and candidate order | compare deterministic, cheap-model, and learned ranking |
| TESTDAFNY110 | annotations, test oracles, iterative repair | optional Dafny adapter and specification-adequacy tests |
| SV-COMP / Quokka | whether a candidate accelerates a real verifier | direct target-under-candidate scoring and best-of-N calibration |
| LeanDojo | project-aware retrieval and novel premises | retrieval recall and proof-loop experiments |
| hs-to-coq and Verdi | mature verification-project context | same-file/dependency-context ablations |
| miniF2F / ProofNet | proof-search mechanics | tactic loop, repair, and state management only |

The decisive bank must be Foldlab-owned. Seed it with historical, blinded cases
from admission, canonicalization, Merkle, replay/session, transport, parser, and
effect-handler work. Include both defects and successful slices so the scout is
penalized for inventing work where none is needed.

## Public API and app shape

Expose work and evidence, not orchestration details:

```ts
interface ModelScout {
  run(request: ScoutRequest, signal?: AbortSignal): ScoutRun
  resume(run: RunId, additionalBudget: Budget, signal?: AbortSignal): ScoutRun
  replay(run: RunId): AsyncIterable<ScoutEvent>
}

interface ScoutRequest {
  snapshot: ContentRef
  objectives: ObligationRef[]
  policy: PolicyRef
  budget: {
    wallMs: number
    tokens: number
    verifierCalls: number
    cost?: number
    parallelism: number
  }
  seed?: string
}
```

Provider names, prompt text, solver command lines, and beam widths belong in
versioned internal policies and capability adapters. The common currency is a
typed, append-only finding:

```ts
type FindingStatus =
  | "proposed"
  | "refuted"
  | "sampled-survivor"
  | "bounded-survivor"
  | "checker-accepted"
  | "lean-theorem"
  | "inconclusive"
  | "unsupported"

interface FindingPacket {
  id: FindingId
  kind: FindingKind
  statement: TypedPayload
  scope: Scope
  parents: FindingId[]
  normalizedKey: string
  status: FindingStatus
  evidence: EvidenceReceipt[]
  nextObligations: ObligationRef[]
  provenance: Provenance
  cost: CostReceipt
}
```

The app should show five things, in this order:

1. **Proof frontier** — closed, refuted, and unresolved obligations.
2. **Counterexamples** — minimal replayable states/traces and the candidates
   they killed.
3. **Specification coverage** — which clauses, fields, and transitions changed
   under mutation.
4. **Selected invariants** — why each survived and which target it helps.
5. **Cost and provenance** — time, tokens, checker calls, cache hits, bounds,
   pins, and final fresh-check receipt.

One deep `scout` operation is preferable to exposing many granular LLM and
solver tools to agents. Internally, candidate sources, teachers/checkers,
selectors, reducers, retrievers, planners, and proof backends remain replaceable.

## Pilot and decision rule

Construct a first held-out Foldlab bank of 24 work packets:

- 8 historical specification defects, with the answer hidden from the scout;
- 8 invariant or proof failures;
- 8 successful slices that should not attract unnecessary machinery;
- balanced across relational, algorithmic, and transition/trace shapes.

Run paired, fixed-budget variants:

1. current breaker packet and proof loop;
2. bank templates plus direct candidate validation;
3. plus portfolio union and Houdini selection;
4. plus project-aware retrieval;
5. plus local repair; and
6. plus persistent workers/caching as a separate systems ablation.

Primary measure: total human-plus-machine time to the first ratified, freshly
checked artifact. Also record:

- time to first decisive counterexample;
- mutations killed and uncovered model regions;
- obligations discharged before implementation;
- model calls, tokens, verifier calls, CPU/GPU time, and monetary cost;
- median and p90 elapsed time;
- proof and specification churn after implementation;
- escaped defects; and
- stale-cache or evidence-promotion errors.

Adopt the scout as a default only if the held-out pilot shows at least a 20%
median cycle-time reduction **and** no loss in mutation/negative-test adequacy or
escaped-defect rate. Keep any individual component that wins its ablation even
if the full system misses that threshold. Stop using the scout on a work shape
when its modeling overhead exceeds saved proof/implementation time on three
consecutive prospective slices.

These are rollout decisions, not empirical claims.

## Source-by-source notes

### Most actionable

- [Loopy v1](./sources/kamath-et-al-2023-loopy-v1.pdf): strongest direct support
  for atomic candidates, portfolio union, Houdini selection, and repair after a
  sampling plateau.
- [iRank](./sources/chakraborty-et-al-2023-irank.pdf): strongest direct support
  for ranking candidate invariants before expensive verifier calls.
- [Dafny annotation generation v1](./sources/faria-et-al-2026-dafny-annotations-v1.pdf):
  closest complete development loop—generate, verify, repair, minimize, and use
  positive/negative test oracles—with a small usability study.
- [LeanDojo v2](./sources/yang-et-al-2023-leandojo.pdf): project-aware premise
  accessibility, retrieval, tactic interaction, and novel-premise evaluation.
- [Apollo v5](./sources/ospanov-farnia-yousefzadeh-2025-apollo-v5.pdf): localize
  and repair only failed proof fragments.

### Supporting

- [LLMVerify](./sources/bayazit-li-si-2025-llmverify.pdf): exact project context
  matters, but its dependency list is extracted from the original proof and is
  therefore an oracle rather than a ready retriever.
- [Process-verified RL](./sources/kim-yun-2026-process-verified-rl.pdf): keep
  tactic-local/earliest-error data; the measured effect is training-time.
- [Quokka v4](./sources/wei-et-al-2026-quokka-v4.pdf): directly score whether an
  invariant helps the target and calibrate best-of-N; this is a current preprint.
- [Proof-state compression metadata](https://mlanthology.org/neuripsw/2024/rahim2024neuripsw-probabilistic/):
  preliminary lead for later pruning/dedup experiments.

### Original request

- [Dafny latest manual snapshot](./sources/dafny-reference-latest.html), pinned
  implementation candidate `v4.11.0` at
  `fcb2042d6d043a2634f0854338c08feeaaaf4ae2`.
- [CAV 2001 publisher PDF](./sources/chockler-kupferman-kurshan-vardi-2001-coverage.pdf),
  DOI `10.1007/3-540-44585-4_7`. The user-supplied HUJI host returned a recorded
  security error page, so the DOI-resolved publisher copy is the local source.
- [Alloy 4.2 API mirror](./sources/alloy-api-2011/alloytools.org/documentation/alloy-api/index.html),
  used as historical API evidence; implementation candidate Alloy `v6.2.0` at
  `59ba2033993449d483d54acad0e11a7bbf20354f`.

## Recommendation

Proceed with the local, backend-light scout first. The highest-return first
slice is not an Alloy or Dafny integration; it is the work packet, outcome bank,
candidate portfolio, deterministic selector, counterexample ledger, and paired
benchmark. That slice tells us whether external solvers will save time and gives
them a stable interface when they arrive.
