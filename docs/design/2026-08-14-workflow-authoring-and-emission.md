# Workflow authoring and emission: the intent↔model mapping, and the builder design

Design doc — prose and type signatures only, no machinery. From
operator-directed dialogue, 2026-08-14, following the
[architecture audit](../research/2026-08-14-architecture-audit.md) and the
ground-truth increments (`verify/ir/`, `verify/pipeline/`). Consumer-gated
to tickets 003 (concierge), 008 (workflow abstraction), 015 (foundry),
016 (ontology explorer), 020 (Effect surface), and to the
[effector-backed replay design](2026-08-13-effector-backed-workflow-replay.md),
which this document extends in the *authoring* direction. Everything here
is ASPIRATIONAL unless labeled otherwise; the operator grills before any
build.

## 0. The ratified intent↔model mapping

The operator's stated intent, corrected against the formal model and
accepted 2026-08-14. Three sharpenings were applied to the operator's
original phrasing, each the site of a theorem:

1. **Linearization-invariance is per-fold, not per-DAG.** The set of
   topological orders of a DAG is a Mazurkiewicz trace — an equivalence
   class of linearizations differing by swaps of independent steps. The
   chain head distinguishes members of the class (why-two-folds,
   demonstrated); a meaning fold may collapse orders only where its
   algebra proves commutativity (`algebra.ts` law claims; `CombineKV` is
   a monoid, NOT a semilattice — LWW order is semantics). Where steps do
   not commute, the chosen linearization is a *decision* — stored like
   `MergeFact` stores its pick list, single-homed like every decision.
2. **The program is codata; the trace is a DAG; the register is the
   boundary.** A live Effect program branches, loops, forks — it is not a
   DAG. What is a DAG is the trace of one execution: committed activities
   with causal edges. Replay is sound only if the glue between committed
   steps is deterministic — an assumption to state and enforce by type,
   never assumed from "it's continuations."
3. **The foundation is the IR + canonical bytes, not TypeScript.** TS
   types are erased, structural, compiler-relative; they cannot travel or
   federate. `flb.type.v0` is the canonical type system; TS is one
   codegen projection of it (round-trip walled). "Representable in
   TypeScript" everywhere reads "expressible in the IR, cataloged by
   digest."

The corrected intent, one paragraph, ratified:

> Multi-agent proposals arrive as data over NATS; the certifier admits
> payloads whose types resolve in the catalog DAG; every effectful step
> of an Effect workflow commits through the register, turning codata into
> a trace-DAG of content-addressed facts; the committed linearization is
> a decision, the trace is evidence, and replay is a fold over `Done`
> facts — sound whenever step-glue is deterministic and order-collapse is
> licensed by proved commutativity. The concierge and codegen are the
> interfaces by which humans and agents mint node types into the catalog
> at whatever rung of the abstraction tower they work.

Boundary conditions carried from the estate's own results: well-typed ≠
well-meant (the completeness gap; conformance checkable, intent forever
approximate — the refutation loop exists because of this), and
into-the-IR conversion is the partial direction (Δ/Σ asymmetry: deriving
representations out is free; accepting foreign ones in is corpus-bounded
L-ACCEPT).

## 1. The three layers

The builder question ("how do I create nodes that capture intent at every
abstraction level?") and the emission question ("how does execution
produce well-formed flows per abstraction level?") dissolve once the
workflow is split into the three layers the estate already has machinery
for:

| layer | what it is | its substrate | its identity |
| --- | --- | --- | --- |
| **Definition** | the workflow as a TERM: a DAG of nodes, each node an interface `(input type ref, output type ref)`, edges typed by digest agreement | a grammar (`flb.workflow.v0`, future) whose leaves are catalog refs — certified, cataloged, content-addressed like any type | digest of the definition term |
| **Execution** | one run: activities committing through the register, frames appended to a per-run journal | register (decisions: exactly-once per work digest) + journal (evidence: typed frames citing their input digests) | the run journal's chain head |
| **Observation** | views of a run at chosen abstraction levels | declared folds over the run journal, cached by `(fold digest, head)` | the fold digest |

Nothing in this table is new machinery-shape: layer 1 is the concierge's
fill/frontier loop pointed at a second grammar; layer 2 is the
effector-backed replay design already ratified; layer 3 is the fold
algebra's long-missing production consumer.

## 2. The three operator questions, answered in the model

### 2.1 "How do I break down node creation to capture intent at all abstraction levels?"

**Authoring a workflow is the same certify/refuse/frontier loop, one
level up.** A workflow definition is a typed tree with holes: an unbound
node is a hole whose frontier is "which interfaces can legally sit here,
given the edge types already committed around it" — computed from the
catalog exactly as the type frontier is computed from the grammar. Intent
capture decomposes into the two moves the MCP surface already serves:

1. **Interface first**: pick or mint the node's input/output types via
   concierge + codegen. This is where abstraction level lives — a node's
   type can be a plain object low in the catalog DAG or an
   ontology-level type high in it; `ref` edges are the level crossings.
   The catalog DAG *is* the abstraction tower.
2. **Binding second**: attach the implementation (an Effect) to the
   interface. The binding is CODE and is never certified; the interface
   is DATA and always is. The fiber theorem draws this line for us:
   evidence can certify structure, never intent — so the definition
   layer holds everything checkable, and the binding holds exactly the
   part that isn't.

"Attach an activity to a transition" resolves into the sort split:
**node executions are decisions** (register: claim → run → commit, keyed
by work digest = digest of (definition digest, node id, input value
digests)), **edge crossings are evidence** (a frame in the run journal:
the committed output, typed by the edge's type digest, citing its input
frames). Transitions are not a third thing to model; they are the
journal appends.

### 2.2 "At each step I should get a well-formed flow of data per abstraction level"

**Abstraction levels at runtime are not different data flows; they are
different declared folds over ONE journal.** Every committed step emits
one frame `{type: <digest>, payload, inputs: [<frame digests>]}` to the
run journal. The identity fold gives the run's head; each observation
level is a meaning fold: the raw level folds every frame; an
ontology-level view folds frames through the type DAG's ref structure,
collapsing what its level does not distinguish. One history, many
meanings, each meaning a declared fold with claimed laws, cached and
replayable by `(fold digest, head)` — the two-folds thesis doing its
job. This is the fold algebra's production consumer, and the "stream
idea" is exactly right: a run journal IS a stream; observers subscribe
to folds, not to raw frames.

Load-bearing gap, stated: today ingress checks identity resolution only
— payload conformance is a stated non-goal. Typed flows at abstraction
levels are *claimed* until the codegen-derived value-conformance codec
exists at frame emission. That codec is already the estate's named
engineering program (learning-limits §9, "what narrows the gap"); this
design makes it load-bearing rather than optional.

### 2.3 "Start on the Effect side and determine how execution becomes linearized discrete messages on the other side of the CAS"

**Inversion: do not linearize on the Effect side. The journal CAS is the
linearizer.** Concurrent fibers race their frames to the run journal;
the expected-sequence CAS serializes them; the chain (seq, prev, head)
IS the committed linearization — and it is automatically a topological
order of the trace DAG, because a node cannot commit before its input
frames exist (compute-before-consume, the W4 shape one level up). The
DAG structure survives inside the frames (each cites its input digests),
so both folds remain available: the chain gives the committed order, the
citations give the causal DAG, and the collapse from "all topological
orders" to "this committed one" is a decision the journal made for you —
no coordination logic in Effect at all. The Effect side's whole
obligation is: commit through the register, emit the frame, cite the
inputs.

## 3. The Effect-side type sketch (signatures only)

```ts
// Layer 1 — the definition is DATA. An flb term, certified and cataloged.
// NodeId and PortName are definition-local names; every type is a digest.
interface WorkflowDefV0 {
  nodes: Record<NodeId, { input: Digest; output: Digest }>
  edges: ReadonlyArray<{ from: NodeId; to: NodeId }>   // legal iff output(from) = input(to)
}
// certifyWorkflow: bytes -> certificate | Refusal  (the same seam shape as certify)

// Layer 2 — bindings are CODE, keyed by the definition digest. The I/O
// types are DERIVED from the catalog via codegen (Effect Schema target),
// so activity signatures inherit correctness from the round-trip wall —
// the builder cannot drift from the definition.
type Bindings<R> = {
  [n: NodeId]: (input: DerivedType<Input<n>>) =>
    Effect.Effect<DerivedType<Output<n>>, ActivityError, R>
}

// Execution: for each ready node — register.claim(workDigest) → run body →
// register.commit(workDigest, resultDigest) → ingress frame {type, payload,
// inputs} to the run journal. Replay: any workDigest already Done returns
// the committed result without running the body (the ratified mapping,
// effector-backed replay design §1.2).

// Layer 3 — observation: declared folds over the run journal.
// view(level) = Fold<Frame, StateAtLevel> with claimed AlgebraLaws;
// cache key (foldDigest, head).
```

Determinism by construction, staged: **static DAGs first.** A static
definition has no data-dependent control flow, so glue determinism is
trivial and the replay theorem's hypothesis holds by construction.
Conditional/dynamic flow enters later as DATA (union-typed edges,
decision nodes whose choice commits as a fact), never as opaque code —
each extension re-grilled against the determinism hypothesis.

## 4. The grammar resolution and the naming amendment (operator dialogue, 2026-08-14)

### 4.1 Workflows are values of one cataloged type, plus a certify walk

Settled by walking the authoring session rather than by taxonomy:

- `flb.type.v0` stays at 13 kinds — no `workflow` kind, no parallel
  grammar (SPEC's no-parallel-competitor law; the APG steal: graph
  structure as a predicate on product shape, never new kinds).
- `WorkflowDefV0` is an ordinary struct type IN the catalog
  (self-hosting, like `contract.describe`). A workflow definition is a
  VALUE conforming to it: agents free-generate candidates (guarantee at
  admission, not sampling — no format tax), and a dedicated
  `certifyWorkflow(bytes) → certificate | Refusal` seam adds the laws
  conformance cannot express — the grammar has no dependent types, and
  `check` is proved denotationally invisible (`verify/ir`), so
  enforcement lives in the walk, never in declared metadata:
  - **every edge joins equal port types** — a two-path relational law,
    scope `(nodes/A/output, nodes/B/input)`, refused with both digests
    and an adapter/matching type as `example`. The relational-refusal
    formalization (2026-08-14-implication-refusals-formalized.md) meets
    its first real consumer here.
  - **edges form a DAG** — `walkRefGraph`'s check one level up.
  - **every port digest resolves at the current catalog head** — W4 one
    level up (create types before publishing workflows); absence-sorted,
    repealed by catalog growth; `resolver_mono` is already the proof
    that growth never invalidates a certified workflow.
- The human's skill is invariant across levels: submit a candidate, read
  the (Law, Path) refusal, follow the example — refusal-as-curriculum
  applied to orchestration. No workflow language to learn.

### 4.2 Naming is out of the core (operator amendment, ratified in dialogue)

The operator declines global names entirely. Re-sorted under the three
sorts:

- **Definitions are evidence.** Content-addressed, federated by union,
  deduped by digest, no coordination.
- **A binding set — "here are the names WE chose, take it or leave it" —
  is also evidence**: a name→digest map, itself a canonical value with a
  digest. Publishing claims authority over nothing. ADR-0004 completed:
  **names never enter certified artifacts; certified terms carry digests
  only**; names are authoring-surface sugar and reply-surface
  annotation. This is the anti-Dragon posture made concrete: federation
  instead of the central model.
- **The only decision left is local adoption**: "resolve names against
  binding set `dig_B`" — pinnable, journaled, recomputable ("authored
  against bindings `dig_B` at head `h`"), switchable. No effector
  involvement remains in the naming story (§the earlier "names are
  decisions" framing is superseded by this section).

MCP session shape: human utters a name → agent resolves through the
active pinned binding set → certified term carries digests only →
replies decorate digests back to names. Two agents with different
binding sets that mean the same workflow produce byte-identical
certified terms.

Wrinkles, recorded honestly:

1. **Alpha-renaming.** Node ids are definition-local labels inside the
   canonical bytes, so structurally identical workflows with different
   labels get different digests. v0 position: labels are
   identity-bearing. Alpha-invariant identity would need a canonical
   DAG relabeling, which is graph-isomorphism-hard in general — a
   theoretical commitment, not a cleanup; deferred with that note.
2. **Similarity is not equality.** Content addressing gives sameness
   only. v0 metric: overlap of content-addressed pieces (shared port
   digests, shared certified subgraphs) — cheap digest-set
   intersection, catches alpha-variants. Ranked search is later work.

## 5. Obligations this design creates (roadmap deltas)

1. **The replay-soundness theorem** (ground-truth increment 3):
   **PROVED** — `verify/replay/` (Lean: `exec_coherent`, `determinacy`,
   `schedule_irrelevance`, `replay_sound`, `faithless_diverges`; TLC:
   the worker/steal/fence protocol clean, the unguarded variant
   refuted). Ledgered in VERIFICATION.md. The pre-build license half of
   the 008/020 gate; the other half is the token law (§6, decision 6).
2. **`flb.workflow.v0` — RESOLVED in §4.1** (dialogue-ratified):
   values of one cataloged type plus a dedicated certify walk; no new
   grammar kinds. Remaining sub-decision: where certified definitions
   live — a third catalog entry kind (schemeBridge precedent) or a
   dedicated journal. Naming resolved in §4.2: out of the core; binding
   sets are published evidence; adoption is the only (local) decision.
3. **The value-conformance codec at frame emission** — promoted from
   named-future-work to load-bearing for layer 3.
4. **Work-digest scheme** for activity commits (definition digest +
   node id + input digests): one paragraph of identity law, walled like
   every other scheme.
5. The three-layer split itself is the grill target: the load-bearing
   claim is that NO new substrate is needed — concierge, register,
   journal, folds, codegen cover all three layers. A counterexample to
   that claim is a finding about this design.
6. **The token law** (§6, decision 6; joins the 008/020 gate): fencing
   tokens are never client-fabricable. Harden the journald seam to
   daemon-held claim tokens, with a conformance test proving a stale or
   foreign token cannot commit, BEFORE any workflow runner exists.
7. **The binding-manifest pin** (§6, decision 5): every run journal
   opens with its binding-manifest digest; cross-manifest resume
   refuses by default with a journaled operator override.

## 6. The Effect-bridge grill record (operator session, 2026-08-14 — ratified)

The operator's proposal — "attach Go bindings to Effects: wrap the
effect, emit it into the daemon through the CAS, write as much plain
Effect code as possible" — was grilled decision-by-decision. All six
resolutions accepted; this section is the committed record and
supersedes §3 where it is sharper.

1. **Commit points are explicit, chosen, typed.** The wrapper is a
   combinator, never an ambient runtime. Auto-committing at effect or
   yield granularity is rejected: it would put fiber scheduling, clock
   reads, and `Effect.all` interleaving into the deterministic-glue
   hypothesis (the exact failure `faithless_diverges` exhibits) and
   fight the R2 economics of coarse replay cuts. Plain Effect lives
   INSIDE activity bodies; between activities there is no hand-written
   logic at all.
2. **Effect `Workflow`/`Activity` is the starting surface, two-tiered.**
   Activities are the bindings; foldlab's `WorkflowEngine` Layer is the
   persistence (the ratified replay-design mapping). But Effect, like
   Temporal, DEMANDS glue determinism and cannot check it — so
   certified workflows get DERIVED bodies (codegen from the certified
   DAG definition; pure wiring nobody writes; the hypothesis discharged
   by the generator, the contract.describe trick), while hand-written
   workflow bodies remain legal at an explicitly UNCLAIMED tier —
   Temporal-grade promises, graduable by extracting their DAG into a
   certified definition.
3. **Bodies are at-least-once; the obligation is classified, not
   assumed.** Exactly-once is a property of COMMITS (proved), never of
   execution: claim → run → crash-before-commit → steal → re-run is the
   lease mechanism working. Every binding therefore declares its effect
   class — `pure` (compute; at-least-once free), `internal` (writes
   only through register/journal/catalog; at-least-once free by
   absorption and digest dedup), `external` (touches the world; the
   binding receives the work digest as idempotency key and owns its
   dedup — the slot Activity.make already carries). The class is data:
   auditable, foldable, and a future certifier hook — soundness claims
   travel with the declared classes.
4. **Failures split exactly as the daemon's error-vs-refusal law.** The
   committed value is an Exit: success or TYPED error, both schema'd
   and IR-expressible, both replayed as facts (a committed rejection
   stays rejected). Defects and interruptions never commit — they are
   crashed attempts, i.e. lease churn. Retries of typed errors are new
   work units (attempt index in the work digest — Effect-native, the
   `attempt` parameter of `activityExecute`), and retry policy is
   deterministic data in the derived glue, never engine magic.
5. **Facts are body-free; provenance is pinned; cross-version resume
   refuses.** Work digests exclude code identity — a committed result
   is never recomputed or reinterpreted (rejecting the alternative,
   body-versioned digests, which would silently re-execute committed
   work — including external effects — on deploy). Instead every run
   journal opens by recording its binding-manifest digest (the
   naming-binding-set shape, one layer down); resuming under a
   different manifest is refused by default, override is an explicit
   journaled decision. The refusal-sort precedent verbatim: archived
   values keep the meaning that was true when they were emitted;
   provenance is recorded, not asserted.
6. **The token law, non-negotiable:** fencing tokens are never
   client-fabricable. The journald seam previously reconstructed
   `Claim{Fence, Owner}` from client wire fields while `Commit` checked
   only the fence (audit defect #1) — any observer of a fence number
   could close another worker's claim. **DONE and merged** (`c87526167`,
   task 46): claim authority is now a daemon-minted single-use token
   scoped by `(name, digest)`; legacy fence/owner fields refuse as
   malformed; a foreign or stale-after-steal token cannot commit,
   conformance-tested. protod absorption of the register
   (`workflow.claim`/`workflow.commit` request kinds per W9) is a
   separate future grill. Operator's words, kept: "the law is the law —
   we do it right or not at all." **Adjacent gate item surfaced by
   review (2026-08-14), not yet closed:** the same bug class lives in
   the raw `journal.AppendEntry` path — it validates a client-supplied
   `prev` at read time, not write time, so a forged `prev` through
   journald's `appendEntry` verb bricks a journal permanently. journald
   is currently a conformance/gauntlet harness (not a production wire
   surface) and protod's own session path computes `prev` itself, so it
   is not a live product exploit — but any workflow runner emitting
   frames MUST use the safe `Append` (daemon-computed `prev`), never a
   client-supplied entry. Recorded in the architecture audit's review
   addendum.

**The earned answer to the original question:** yes — as much plain
Effect as wanted, because every place the model needs an invariant the
code is either generated (glue), classified (effects), committed
(outcomes), or refused (cross-manifest resume, fabricated tokens);
expressiveness lives exactly in the gaps the theorems do not need to
see.
