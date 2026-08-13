# Effector-backed workflow replay: a foldlab `WorkflowEngine` for Effect v4

Author: expressive-power team (Opus), 2026-08-13, isolated worktree. A **design
doc — prose and type signatures only, no machinery.** Builds directly on the
dossier's §3 (the ticket-020 sharpening). Every Effect API is confirmed against
the pinned vendored source `repos/effect/packages/effect/src/*` at
`effect@4.0.0-rc.108`; citations are `file:line`. Labels: **SHIPPED** (walled or
tested today), **SHIPPED-UNSTABLE** (present at the pin under `effect/unstable/`,
API may move), **RATIFIED-UNBUILT** (decided, no build), **ASPIRATIONAL**.
Consumer-gated to tickets **008** (the workflow abstraction) and **020** (the
Effect surface) per the no-machinery-before-consumer precept.

## The seam-location finding (read first — everything depends on it)

rc.108 **does** ship a durable-execution seam, and it lives inside the core
`effect` package under `effect/unstable/` — not in separate `@effect/workflow`
or `@effect/cluster` packages at this pin (the vendored monorepo has
`packages/{ai,atom,effect,opentelemetry,platform,sql,tools,vitest}` and no
`workflow`/`cluster` package). Three subsystems:

- `effect/unstable/workflow/` — `Workflow`, `Activity`, `WorkflowEngine`,
  `DurableDeferred`, `DurableQueue`, `WorkflowProxy`.
- `effect/unstable/cluster/` — `ClusterWorkflowEngine` (the concrete engine),
  `MessageStorage` / `SqlMessageStorage` (the persistence backend), `Sharding`,
  `Runner*`.
- `effect/unstable/eventlog/` — `EventJournal`, `EventLog`, `Event`,
  `SqlEventJournal` (an append-only journal subsystem, *separate* from Workflow).

**Label: SHIPPED-UNSTABLE.** The `unstable/` path is the design's honest caveat:
these are real, importable, and typed at rc.108, but the namespace advertises
that signatures may change. The design targets this seam and must re-confirm on
any pin bump.

**The persistence/replay interface is the `WorkflowEngine` service.** It is a
`Context.Service` (`unstable/workflow/WorkflowEngine.ts:37`; `Context.Service` at
`Context.ts:201`). Its replay decision point is `activityExecute`:

```ts
// unstable/workflow/WorkflowEngine.ts:146
readonly activityExecute: <Success extends Schema.Constraint, Error extends Schema.Constraint, R>(
  activity: Activity.Activity<Success, Error, R>,
  attempt: number
) => Effect.Effect<
  Workflow.Result<Success["Type"], Error["Type"]>,
  never,
  Success["DecodingServices"] | Error["DecodingServices"] | R | WorkflowInstance
>
```

where the return type is the whole game (`unstable/workflow/Workflow.ts:482`):

```ts
export type Result<A, E> = Complete<A, E> | Suspended
```

`Complete` carries the committed exit; `Suspended` means not-yet-decided. That
disjunction is where foldlab's proven register plugs in.

---

## Part 1 — Model-backed Effect workflow replay

### 1.1 The seam foldlab implements

The engine's public surface (all `unstable/workflow/WorkflowEngine.ts`):
`register` (`:43`), `execute({ executionId, payload })` (`:77`), `poll` (`:105`),
`resume` (`:138`), `activityExecute(activity, attempt)` (`:146`),
`deferredResult` (`:165`) / `deferredDone` (`:180`). An `Activity` is the
persisted unit — `Activity.make({ name, success?, error?, execute })`
(`unstable/workflow/Activity.ts:123`), carrying a retry `attempt` and idempotency
keys. The reference implementation is `ClusterWorkflowEngine.layer`, whose type
states its dependencies exactly:

```ts
// unstable/cluster/ClusterWorkflowEngine.ts:790
export const layer: Layer.Layer<
  WorkflowEngine.WorkflowEngine,
  never,
  Sharding.Sharding | MessageStorage
> = ClockEntityLayer.pipe(
  Layer.provideMerge(Layer.effect(WorkflowEngine.WorkflowEngine)(make))
)
```

**foldlab provides an alternative implementation of the same service** — a
`Layer` yielding `WorkflowEngine` whose persistence backend is the effector +
journal over NATS subjects (ADR-0003), not `Sharding + MessageStorage`. The call
sites (`execute`, `activityExecute`) are untouched; only the Layer changes. This
is RATIFIED-UNBUILT (tickets 008/020).

### 1.2 The mapping: the register IS the activity's persistence

The effector's register (`README.md`, VERIFICATION.md) and the engine's
`Workflow.Result` are the same three-state machine:

| effector `Register` | `Workflow.Result` | `activityExecute` behavior |
|---|---|---|
| `Done(fence, result)` | `Complete<A,E>` | **not re-executed** — the committed result is returned |
| `Claim(fence, owner, lease)` | `Suspended` | in flight; the workflow suspends and retries |
| `Absent` | `Suspended` (typed refusal underneath) | never run; senders own retry |

So replay is exactly the dossier's spine applied to durable execution: **a fold
over the journal in which any step whose `Done(fence, result)` is already present
returns that result rather than re-executing its effect.** The foldlab
`activityExecute` requests the effector's single-key `claim → run → commit`
protocol keyed on the activity's work digest; on `Done` it returns `Complete`
without running the body. This is the effector's proven protocol (VERIFICATION.md
effector R3+R4) serving as the engine's activity store.

### 1.3 Why this is stronger than Temporal / Effect-Cluster

Temporal and `ClusterWorkflowEngine` (backed by `MessageStorage`) give
exactly-once and deterministic replay as **framework promises** — you trust that
the framework's storage recorded each step once and replays it faithfully; there
is no artifact a third party can independently check. In foldlab, determinism and
exactly-once are **recomputable facts**: the run exports a bundle a verifier with
*only the bundle* re-derives. This is not a slogan — it is the G1 crash-storm
gauntlet, PASSED and ratified 2026-08-12 (`docs/gauntlet/G1-crash-storm.md:120`).
Under an adversary killing workers and restarting the server over real
out-of-process file-backed NATS JetStream, a frozen verifier proves by
recomputation:

- **GV3 unique commitment** + **GV4 fencing**: registers are in bijection with
  journal digests, results agree, and **no two owners share a `(digest, fence)`**
  — exactly-once commitment cross-checked from physical ledger evidence
  (`G1-crash-storm.md:83-90`).
- **GV6 replay**: the folded state's digest equals `manifest.state_digest` —
  **byte-exact** journal replay reproduces final state (`:94-95`).
- **GV7 counterfactual**: substituting one result re-folds its cone to the
  claimed alternative state (`:96-99`).

The headline that held under real violence: at-least-once effects (duplicates
exist and are honestly counted, GV5), exactly-once commitment (500 registers,
zero double commits), portable proof (`:120-134`). **Label: the G1 evidence is
SHIPPED; the foldlab engine that would ride on it is RATIFIED-UNBUILT.**

### 1.4 The honest precondition: deterministic-in-the-digest

The exactly-once + byte-exact-replay claim has a precondition, stated on the
gauntlet page itself: **activities must be deterministic in the digest.** G1's
workload is built so "effects are deterministic in the digest so the verifier can
recompute them; physical executions are distinguished by ledger nonces, not by
result bytes" (`G1-crash-storm.md:36-38`). A genuinely nondeterministic effect —
an LLM call, a random draw, a clock read, a third-party API — is *not*
recomputable, so it cannot be replayed by re-execution. The design rule (ADR-0005;
the map's provider-config-hashed rule): **such an effect journals its output as a
fact.** The result bytes go into the record; replay reads them back rather than
re-calling. The activity's identity then commits the inputs *and* the
provider/config that produced the output (a config-hashed key), so a replay that
would have called a different model is a *different* activity, not a silent
substitution. Concretely, on the rc.108 seam this is exactly what `Complete<A,E>`
already stores — the effect's *result*, decoded via the activity's success
`Schema` — so nondeterministic activities are first-class, provided their result
is journaled and their key commits their provenance.

**Edge:** recomputability of a journaled nondeterministic result proves *what was
recorded*, never *that re-calling would agree* — the dossier's semantic-gap edge,
here specialized: replay fidelity for nondeterministic activities is a
record-consistency claim, not a reproducibility claim.

---

## Part 2 — Effect runtime hooking

The non-invasive hook points at rc.108, each with the guarantee it carries. The
design goal: **the developer writes ordinary Effect, and providing one Layer
makes every committed step a journal fact.**

**H1 — `Layer` / `Context` dependency injection (the PRIMARY seam).** A service
is a `Context.Service` (`Context.ts:201`) or `Context.Reference`
(`Context.ts:1312`); a `Layer` provides it. Swapping
`ClusterWorkflowEngine.layer` for `Foldlab.WorkflowEngineLayer` changes the
persistence backing with zero changes to `execute`/`activityExecute` call sites.
**Guarantee: substitution without invasion** — the whole design rests here.

**H2 — the durable-execution seam (Part 1).** `WorkflowEngine.activityExecute`
(`WorkflowEngine.ts:146`) + `Activity.make` (`Activity.ts:123`). **Guarantee:
exactly-once + byte-exact replay** (G1). Precise scope: the commit happens at the
*activity* boundary — an `Activity` is what becomes a `Done(fence, result)`
journal fact. Plain `Effect` code between activities is *not* committed; only
activities are. State this plainly so "every committed step" is not misread as
"every effect."

**H3 — `Tracer.Tracer` (provenance for free).** `Tracer.Tracer` is a
`Context.Reference<Tracer>` (`Tracer.ts:631`); a Layer supplies it via
`Layer.succeed(Tracer.Tracer, foldlabTracer)`. The tracer's `span(...)`
(`Tracer.ts:28-45`) returns a `Span` (`:371`) whose `spanId`/`traceId` foldlab
sets to the segment's **chain head**, and `Tracer.externalSpan({ spanId, traceId })`
(`:113`) is the injection point for a recomputed id. **Guarantee: recomputable
span identity** — the auditor re-derives the id from the work it names (dossier
P3). This composes with H1: one Layer, both the engine and the tracer.

**H4 — `Scope` / finalizers.** `Scope` (`Scope.ts:45`) with
`Scope.addFinalizer(scope, finalizer)` (`:375`) and `addFinalizerExit` (`:341`).
**Guarantee: lease and claim cleanup on interruption** — a `Claim(fence, owner,
lease)` acquired by an activity releases (or is left to lease-expire) when the
fiber is interrupted, tied to the scope's lifetime rather than manual `ensuring`.
Honest note: this is *safety* housekeeping; lease *liveness* (does a stuck claim
ever free) is unproven (§Part 3 edges).

**H5 — `Effect.withSpan`.** `Effect.withSpan` (`Effect.ts:8276`),
`withSpanScoped` (`:8317`). The user's ordinary `Effect.withSpan("name")(effect)`
becomes, under the FoldlabTracer (H3), a named journal segment whose id is a
chain head. **Guarantee: naming, not commitment** — `withSpan` marks a segment
but does not itself write a `Done`; commitment is H2's activity boundary.

### The one-Layer developer surface (signatures, rc.108-confirmed)

```ts
// Proposed public surface (RATIFIED-UNBUILT, tickets 008/020). Types confirmed:
// WorkflowEngine (WorkflowEngine.ts:37), Tracer.Tracer Reference (Tracer.ts:631),
// Layer.Layer (Layer.ts), Context.Service (Context.ts:201).

// The activity a developer writes is stock Effect — no foldlab types leak in:
import { Activity, Workflow, WorkflowEngine } from "effect/unstable/workflow"

// Providing THIS one Layer swaps the persistence backing to the effector+journal
// and installs the recomputable-id tracer. Mirrors ClusterWorkflowEngine.layer's
// shape (:790) but requires the foldlab resource stack instead of Sharding+Storage.
export const WorkflowEngineLayer: Layer.Layer<
  WorkflowEngine.WorkflowEngine,     // provides the same service the app already uses
  never,
  ProtoClient                        // requires only the narrow-writ daemon client
>

// Provenance-for-free, shipped as its own Layer so it composes independently:
export const FoldlabTracer: Layer.Layer<never, never, ProtoClient>
```

The developer's code is unchanged Effect: `WorkflowEngine.execute(myWorkflow, {
executionId, payload })`, activities via `Activity.make`. foldlab is entirely in
the provided Layer.

---

## Part 3 — Clean effector-based Layer composition (the spine)

### 3.1 The composition

Four Layers, bottom to top, wired with `Layer.provideMerge` (`Layer.ts:1550`;
`provide` `:1432`, `merge` `:1299` — the same idiom `ClusterWorkflowEngine.layer`
uses at `:794`):

```ts
// Bottom: the ONE impure resource — a connection to the daemon over NATS
// subjects (ADR-0003: data, never FFI). Scoped, so the socket closes with H4.
export const ProtoClientLayer: Layer.Layer<ProtoClient, ConnectError, Scope.Scope>

// The evidence sort: read + verify-on-read. Lock-free (presence is monotone,
// §CALM), refolds locally. Requests journal reads; the daemon owns the shape.
export const JournalLayer: Layer.Layer<Journal, never, ProtoClient>

// The decision sort: REQUESTS claim/commit; surfaces typed refusals as data.
// Single-homed behind the daemon's proven CAS — no fencing logic in TS.
export const EffectorLayer: Layer.Layer<Effector, never, ProtoClient>

// Top: the durable-execution seam of Part 1/2, built on Journal ⊗ Effector.
export const WorkflowRuntimeLayer: Layer.Layer<
  WorkflowEngine.WorkflowEngine,
  never,
  Journal | Effector
>

// ProtoClient ⊳ (Journal ⊗ Effector) ⊳ WorkflowRuntime
export const WorkflowEngineLayer: Layer.Layer<WorkflowEngine.WorkflowEngine, ConnectError, Scope.Scope> =
  WorkflowRuntimeLayer.pipe(
    Layer.provideMerge(Layer.merge(JournalLayer, EffectorLayer)),
    Layer.provideMerge(ProtoClientLayer)
  )
```

`Layer.merge(JournalLayer, EffectorLayer)` is the `⊗` (both provided from one
`ProtoClient`); each `Layer.provideMerge` is a `⊳` (lower layer satisfies the
upper's requirement *and* stays in the output environment). The result requires
only `Scope` and can fail only with `ConnectError` — every authority guarantee is
internal.

### 3.2 Hard constraints (this is the design's correctness — grill here)

**C-A (ADR-0003): the boundary is data over NATS subjects, not FFI.** Every Layer
above carries canonical frames and requests on subjects; none links Go. The TS
`Effector` Layer *sends* a claim/commit request and *receives* a fact or a typed
refusal; it never calls into a register implementation.

**C-B (ticket 002, ADR-0006): the narrow writ.** The TS Layers **request**
authority operations; they do **not** implement CAS, fencing, or journal shape in
TypeScript. That logic is the daemon's proven authority (the Go effector +
journal). `EffectorLayer` is a request/response adapter; `JournalLayer` reads and
*verifies* (recomputes heads on read) but never *decides* ordering.

**C-C (the payoff): the proof boundary, and where the obligation does NOT
reappear.** The effector's fencing safety (VERIFICATION.md effector R3 Apalache
inductive invariant + R4 15,378-schedule lockstep) and the journal's
verify-on-read (walled; G1 GV1/GV2/GV6) are **inherited by everything on
`WorkflowRuntime`.** Concretely: a workflow author calls `Activity.make(...)` and
`WorkflowEngine.execute(...)` and writes **no fencing, no CAS, no linearization**.
The activity's exactly-once commitment reduces to the single-key effector protocol
proven once — it is *not* re-established per workflow. This is the
compositionality-of-proof spine made operational: **the exactly-once obligation
is discharged at the effector and inherited, not re-discharged per consumer.**
That is precisely the property mint lacked and G1 demonstrated end-to-end.

### 3.3 The open design question (flagged, not answered)

**Does a workflow composing two effector-homed decisions need its own
linearization?** The effector's proof is for a **single key** (one register). A
workflow with one decision inherits it cleanly. A workflow that must commit two
decisions *atomically* — two registers, both-or-neither — is a **multi-key
transaction the single-key proof does not cover.** Two candidate resolutions:

- **(a) One workflow, one register (recommended default).** The workflow's
  `executionId` keys a single register; its internal steps are activities whose
  results are journaled facts *under that one workflow register*. Cross-step
  atomicity collapses to the single-key case, and the inheritance in C-C holds
  with no new proof. This is the design's recommended shape and matches how G1's
  chained workflow already works (one chain, per-step registers advanced in
  order, position-CAS on the journal).
- **(b) Genuine cross-register atomicity.** If two *independently homed*
  decisions must be all-or-nothing (distinct owners, distinct keys), that is a
  saga or two-phase commit whose linearization the current effector proof does
  **not** provide. **Out of scope; needs its own model gate** before any
  exactly-once claim across keys. Flag for the coordinator: this is the boundary
  where the inherited proof stops.

### 3.4 Honest edges

- **Safety only — no liveness.** No progress claim exists anywhere: leases,
  retries, and progress under contention are untested formally (VERIFICATION.md
  standing assumption 4). H4's scope-tied lease release is safety housekeeping;
  "a stuck claim eventually frees" is unproven. And G1's storm is
  **choreographed** — a single fixed schedule family, floors shaped to minimum
  (`G1-crash-storm.md:136-144`); it demonstrates the laws under an
  adversarially-timed but fixed storm shape, not under arbitrary schedules.
- **The TS Layer's correctness reduces to the daemon's.** The Layers add **no
  independent guarantee** — they inherit the effector/journal proofs and
  contribute only a faithful request/response mapping. That mapping is itself a
  trusted surface, tested at R0/R1 by the proto W1–W10 conformance (verify-on-
  read, canonical-or-refused, create-before-publish), *not* by a model check. A
  bug in the TS adapter is a new failure mode outside the daemon's proof; the
  design does not claim otherwise.
- **Replay determinism precondition (Part 1.4).** Everything above assumes
  activities are deterministic-in-the-digest or journal their nondeterministic
  outputs as facts. An activity that is neither is unreplayable, and the engine's
  exactly-once still holds (the *commit* is once) while byte-exact *replay by
  re-execution* does not — only replay-from-journaled-result does.
- **Seam is SHIPPED-UNSTABLE.** `effect/unstable/workflow` and
  `effect/unstable/cluster` may change signatures at a pin bump; the design must
  re-confirm `WorkflowEngine`/`Activity`/`Workflow.Result` on any move.

---

## Appendix: rc.108 citation ledger

`repos/effect/packages/effect/src/`:

- **Durable-execution seam (SHIPPED-UNSTABLE):**
  `WorkflowEngine` = `Context.Service` — `unstable/workflow/WorkflowEngine.ts:37`;
  `register` `:43`, `execute` `:77`, `poll` `:105`, `resume` `:138`,
  `activityExecute` `:146`, `deferredResult` `:165`, `deferredDone` `:180`.
  `Activity` iface `unstable/workflow/Activity.ts:36`, `Activity.make` `:123`.
  `Workflow.Result = Complete | Suspended` — `unstable/workflow/Workflow.ts:482`.
  `ClusterWorkflowEngine.layer: Layer<WorkflowEngine, never, Sharding | MessageStorage>`
  — `unstable/cluster/ClusterWorkflowEngine.ts:790`.
  `EventJournal` = `Context.Service` (entries/write/writeFromRemote/changes),
  `EventJournalError` `Data.TaggedError`, `EntryId = Uint8Array & Brand` —
  `unstable/eventlog/EventJournal.ts:40, 121, 205`.
- **Hook points:** `Context.Service` `Context.ts:201`, `Context.Reference`
  `:1312`. `Tracer.Tracer: Context.Reference<Tracer>` `Tracer.ts:631`;
  `Tracer` iface `:28`; `Span` `:371`; `externalSpan` `:113`. `Scope`
  `Scope.ts:45`; `addFinalizer` `:375`; `addFinalizerExit` `:341`.
  `Effect.withSpan` `Effect.ts:8276`; `withSpanScoped` `:8317`.
- **Composition:** `Layer.provideMerge` `Layer.ts:1550`; `provide` `:1432`;
  `merge` `:1299`. `Data.TaggedError` `Data.ts:761`. `Stream.runFold`
  `Stream.ts:10482`.
- **foldlab evidence:** effector R3+R4 and catalog R2+R3+R4, VERIFICATION.md;
  G1 crash-storm PASSED, `docs/gauntlet/G1-crash-storm.md` (GV3/GV4 `:83-90`,
  GV6 `:94`, GV7 `:96`, precondition `:36-38`, result `:120`, storm caveat
  `:136`). ADR-0003 (boundary is data), ADR-0005 (journal load-bearing),
  ADR-0006 (derivation over porting), ticket 002 (narrow writ).

---

# The wider map (Parts A–D): the full cluster/workflow correspondence

Extension, 2026-08-13, same discipline. The operator asked the map widened:
model concrete use cases, map the *other* workflow and cluster mechanics onto the
effector/journal, and draw the seam map — where the inherited proof extends
across a boundary and where it stops. Module inventory confirmed against
`repos/effect/packages/effect/src/unstable/{workflow,cluster,eventlog}` at
rc.108. Provisional ruling from last burst treated as ratified for this doc's
scope: **one workflow = one register** (single-key inheritance); genuine
cross-register atomicity needs its own gate (Part D interop seam 3).

## Part A — Use-case catalog (agent-first)

The primary consumer is an agent (NEXT.md precept 6). Each case names the flow,
the foldlab guarantee it leans on, and its label.

**A1 — Durable multi-step agent task, every step a citable fact.** An agent runs
a plan as a `Workflow` of `Activity` steps; each committed step is a
`Done(fence, result)` journal fact addressable by digest. Leans on:
**exactly-once + recomputable replay.** Label: RATIFIED-UNBUILT (kernel SHIPPED —
G1 proves the chained-effect replay).

**A2 — Zero-instrumentation provenance.** The agent writes ordinary
`Effect.withSpan`; under `FoldlabTracer` the span id *is* the segment chain head,
so lineage is a query over the journal, no tracing code. Leans on:
**provenance-for-free** (dossier P3). Label: RATIFIED-UNBUILT (ticket 020).

**A3 — Kill-9-resilient pipeline that resumes byte-exact.** A long agent pipeline
survives worker kills and server restarts and resumes to a byte-exact final
state. Leans on: **recomputable replay.** Label: kernel SHIPPED (G1 GV6, ratified
2026-08-12); the workflow wrapper RATIFIED-UNBUILT.

**A4 — Cross-runtime agent tool.** An agent authors a type/program once and runs
it in-process (TS), on the daemon (Go), or in wasm, with digest-equal results —
the tool's behavior is a recomputable fact independent of where it ran. Leans on:
**cross-language equivalence** (dossier P4). Label: substrate SHIPPED (walls); the
agent-facing surface RATIFIED-UNBUILT.

**A5 — Third-party auditable agent run.** An auditor holding only the exported
run bundle recomputes the entire history, every commitment, and a counterfactual
— the G1 verifier generalized to agent traffic. Leans on: **recomputable replay +
exactly-once + provenance.** Label: the verifier pattern SHIPPED for the G1
workload; agent-traffic instance RATIFIED-UNBUILT.

**A6 — Human-in-the-loop approval as a durable promise.** An agent workflow
suspends awaiting a human decision, modeled as a `DurableDeferred` that resolves
**once, terminally** (Part B) — an absence until decided, a single committed
outcome after. Leans on: **exactly-once terminal outcome + absence-as-typed-
refusal.** Label: RATIFIED-UNBUILT.

**A7 — INTEGRATION: OTLP/Langfuse export from the journal (ticket 006).** No
separate tracing system: the journal *is* the trace, and OTLP/Langfuse export is
a projection/derivation over it (ADR-0005; dossier P3). An existing observability
stack consumes recomputable spans. Leans on: **provenance-for-free.** Label:
RATIFIED-UNBUILT (ticket 006).

**A8 — INTEGRATION: the MCP agent surface driving a workflow.** The agent's tool
calls (create type, publish, read) *are* workflow activities; the concierge's C4
fluency (every advertised move accepted — dossier P7) composes with the
workflow's exactly-once commitment, so an agent authors and runs in one lawful
surface. Leans on: **exactly-once + teaching refusals.** Label: MCP surface
SHIPPED in `proto/`; the workflow binding RATIFIED-UNBUILT.

## Part B — The other workflow mechanics → effector/journal

**Activity** (`workflow/Activity.ts:36,123`) → **effector `Done(fence,result)`**
at the exactly-once boundary (Part 1). Clean substitution; **inherits** effector
R3/R4. Established above.

**DurableClock** (`workflow/DurableClock.ts:28`, `make({name, duration})` `:42`,
with a `DurableDeferred<Void>` wake signal) → **time as a journaled fact.** A
sleep schedules its wake through the `WorkflowEngine` and awaits the durable
deferred (`:5-7`); foldlab commits the *wake time* as a fact, so replay reads it
rather than re-reading the wall clock. This is the deterministic-in-the-digest
precondition (Part 1.4) made concrete: a clock read — otherwise the canonical
nondeterministic effect — becomes a committed value. **Clean substitution;
inherits** journal verify-on-read for the wake fact. Honest edge: only the
*recorded* wake is safety; whether the timer *fires on time* is **liveness** and
unproven.

**DurableDeferred** (`workflow/DurableDeferred.ts:38`, `token` `:412`; engine
`deferredDone` sets an `Exit` `WorkflowEngine.ts:180`) → **effector `Claim→Done`.
Grill of the correspondence:** a `DurableDeferred` is Absent until `deferredDone`
sets a terminal `Exit` **exactly once**, after which all waiters observe that
`Exit` — which is precisely the effector's *unique-terminal-outcome* safety
property. So the **shape matches**: single terminal resolution, resolves once.
**The delta, stated honestly:** the `DurableDeferred` is keyed by an *assigned*
token (workflow name / execution id / deferred name, `:314-345`) and carries **no
fence**; its once-ness is enforced by the engine's storage. The effector keys by
*content* and protects the terminal write with a **proven monotone fence** (no
commit below the highest linearized fence, R3). So this is a **substitution that
upgrades**: the same terminal-uniqueness shape, but foldlab replaces
storage-enforced once-ness with fence-*proven* once-ness against stale writers,
and an assigned token with a recomputable key. The fence dimension is *added*, not
merely matched — say so rather than claiming a 1:1 map.

**DurableQueue** (`workflow/DurableQueue.ts:46`, backed by
`persistence/PersistedQueue`) → **≈ a journal, loosely.** A workflow offers a
payload to a named queue; a persisted worker takes and runs it. It is an
append-and-consume *work buffer*, not an identity log. **Does not map cleanly:**
foldlab's journal is a hash-chained, verify-on-read *identity* structure; a
`DurableQueue` has no recomputable identity for its items and no chain head. A
foldlab analog would be a journal of offer-facts consumed by effector-guarded
workers, but that rebuilds the primitive rather than substituting for it — flag
as *not a clean inheritance*.

## Part C — Cluster mechanics → foldlab substrate

**Singleton vs the effector Register — the crown jewel, and they are DIFFERENT.**
`Singleton.make(name, run, options)` (`cluster/Singleton.ts:46`) runs `run` on
**the runner that currently owns the singleton's shard**; double-registration in
the same shard group is a **defect** (`:34`); the fiber is interrupted and the
registration removed on teardown (`:5-7`). This is an **availability/placement**
guarantee — *at most one live instance now* — enforced by **shard ownership
(lease-based)**, not a machine-checked safety invariant; under a partition or
rebalance the ownership assumption is exactly the classic single-writer problem.
The effector Register is a **commitment/safety** guarantee — *exactly one terminal
result forever* — protected by a **proven monotone fence** (R3 inductive
invariant, R4 lockstep). Verdict: **not the same, not weaker — different axes.**
Singleton answers "who runs it now"; the effector answers "whose result counts,
forever." The effector supplies precisely the safety a Singleton's placement
*assumes*. Consequence for the claim: foldlab **replaces Singleton's commitment
half, not its placement half** — you cannot drop the effector in for Singleton and
get process placement, and you cannot trust Singleton's convention for
commit-safety.

**cluster Entity vs foldlab Entity — same word, different concept.** A cluster
`Entity` (`cluster/Entity.ts:71`) is an addressable stateful actor — an
`RpcGroup` protocol addressed by `EntityAddress{shardId, entityType, entityId}`
(`cluster/EntityAddress.ts:24`), placed on a shard, one live handler per id. A
foldlab entity is the **quotient of event traffic by a correlation key**,
identified by a **recomputable chain head + state digest**, both folds maintained,
backing-independent (`packages/core/src/entity.ts:29-135`). The delta: cluster
Entity identity is an **assigned** string id plus shard placement, and its state
is opaque live memory; foldlab entity identity is a **recomputable** head over its
exact history, and its state is a fold anyone can re-derive and audit. They are
**complementary, not substitutes**: a cluster Entity's handler could fold its
inbox into a foldlab entity to gain recomputable state and provenance — routing
from one, identity from the other.

**MessageStorage as THE pluggable persistence seam — the cleanest integration.**
`MessageStorage` is a `Context.Service` (`cluster/MessageStorage.ts:48`) with
`saveRequest` `:52`, `saveReply` `:66`, `repliesFor` `:85`, `unprocessedMessages`
`:135`, and stock drivers `layerNoop` `:1048` / `layerMemory` `:1056` /
`SqlMessageStorage`. Because `ClusterWorkflowEngine.layer` *requires*
`MessageStorage` (`ClusterWorkflowEngine.ts:790`), a foldlab **`JournalMessageStorage`**
Layer swaps the entire persistence substrate under the unchanged engine:

```ts
// Proposed (RATIFIED-UNBUILT). saveReply commits a Done fact (effector-guarded);
// repliesFor reads committed results (a persisted reply is returned, not re-run);
// saveRequest appends the request as evidence; unprocessedMessages = journal
// entries with no committed reply. Mirrors the driver shape of layerMemory (:1056).
export const JournalMessageStorage: Layer.Layer<MessageStorage, never, ProtoClient>
```

**Substitution that upgrades:** `SqlMessageStorage`'s exactly-once is a
storage/idempotency promise; `JournalMessageStorage`'s is a **recomputable fact**
(verify-on-read + effector fence). And the upgrade flows up to the whole workflow
engine through one service swap — no engine reimplementation. This is the highest-
leverage seam in the cluster stack.

**Sharding/ShardId vs shard-by-correlation-key — aligned in principle, different
layer.** cluster `Sharding` assigns shards to runners and rebalances (topology).
foldlab's "shard by correlation key, fuse inside" (NEXT.md Go notes) partitions
by the same key principle but for **in-process fold locality**, not distributed
placement. Same partitioning idea, different layer (distributed ownership vs
data-locality). **Mostly orthogonal/complementary:** foldlab's correlation-key
quotient is its identity primitive regardless of whether a cluster Sharding sits
underneath; foldlab could run *on* Sharding (a shard = a set of keys) without
either owning the other.

**Snowflake vs digests — a DIVERGENCE, name it.** `Snowflake` is a branded
`bigint` from timestamp + machineId + sequence (`cluster/Snowflake.ts:47,73-75`):
**assigned, temporal, machine-local, roughly sortable, non-recomputable** — the id
encodes *when and where* it was minted, and machineId is what prevents collision.
A foldlab digest is a **recomputable content address** — the id encodes *what it
is*, and equal content yields an equal id anywhere, forever. These are opposite id
philosophies (mint-time-and-place vs recompute-from-content); you **cannot
substitute a digest for a Snowflake** because their jobs differ (cheap monotone
ordering vs content equality). Where cluster uses Snowflake for message ordering,
foldlab uses chain position + head. This id divergence is the root of every other
divergence below.

**Runners / RunnerHealth — orthogonal.** These are physical process topology and
liveness tracking. foldlab is silent on topology (ADR-0003: the boundary is data;
the daemon owns the runtime). foldlab neither models nor replaces runner
topology; it assumes a daemon and speaks data to it. State the orthogonality
plainly so nobody claims foldlab "handles clustering."

**ClusterCron — inherits Singleton's split.** `ClusterCron.make({ cron, ... })`
(`cluster/ClusterCron.ts:43`) turns a `Cron` schedule into a Layer coordinating
one recurring job, built on a **Singleton** for initial scheduling plus persisted
entity messages, skipping stale runs (`:4-38`). So it inherits the same
placement/commitment split: a foldlab scheduled job would journal each **fire as a
`Done` fact** (commitment, effector-guarded, clean) while the **which-runner-
fires** decision stays placement (Singleton/topology, orthogonal).

## Part D — The seam map

Three seam kinds. For each mechanic: what is upgraded, and whether the guarantee
is **inherited** (discharged once at the effector/journal, not re-proven above) or
**re-proven / handed off**.

### D.1 Substitution seams — foldlab replaces a stock component *with a proof/recomputability upgrade*

| stock | foldlab | upgrade | inherited? |
|---|---|---|---|
| `MessageStorage` (`:48`) | `JournalMessageStorage` | exactly-once: storage promise → recomputable fact | **inherited** (effector R3/R4 + journal walls); engine unchanged |
| `Activity` (`:36`) | effector `Done(fence,result)` | step commit: framework promise → proven fence | **inherited** (Part 1; G1) |
| Singleton's *commitment half* (`:46`) | effector Register | terminal-uniqueness: lease convention → proven fence | **inherited** — but *only* the commitment half (placement is not replaced) |
| cluster `Entity` *state* (`:71`) | foldlab entity fold (`entity.ts`) | state: opaque live memory → recomputable + provenance-bearing | **inherited** (fold laws, dossier §1) |
| `DurableClock` (`:28`) | journaled wake fact | clock read: nondeterministic → committed fact | **inherited** (safety of the recorded wake only) |
| `DurableDeferred` (`:38`) | effector `Claim→Done` | once-ness: storage-enforced → fence-proven (+ recomputable key) | **inherited**, fence dimension *added* |

The pattern: every substitution discharges its obligation **at the effector or
journal and inherits upward** — the workflow author re-proves nothing. This is the
compositionality-of-proof payoff operationalized across the cluster stack.

### D.2 Divergence seams — fundamentally different; the integrator must CHOOSE foldlab's model

- **Ids: Snowflake (assigned/temporal) vs digest (recomputable content
  address).** Not a substitution — opposite philosophies (Part C). Choosing
  foldlab means choosing content-addressed identity everywhere an id appears.
- **Journal ownership: daemon-owned (ADR-0003/0009 — data over NATS, authority /
  read-only replica, verify-on-read) vs Effect-native `EventJournal`/`EventLog`
  (in-process, timestamp entry ids `EventLog.ts:603`, encrypted remote sync via
  `EventLogRemote.ts`).** Both are append-only event logs, but identity and trust
  differ (recompute-from-bytes vs timestamp id + encryption/remote-auth). You
  choose *where authority lives* and *what identity means*.
- **Placement vs commitment: Singleton (who runs now, lease-based) vs effector
  (whose result counts, proven).** The integrator must decide which question they
  are answering; foldlab answers only the second.
- **Safety-only vs liveness.** Cluster is engineered for liveness — rebalancing,
  `RunnerHealth`, retries, singleton placement. foldlab proves *safety* and is
  *silent* on liveness (VERIFICATION.md assumption 4; G1's storm is choreographed,
  `:136`). An integrator who needs progress guarantees supplies them *on top*
  (cluster's machinery); foldlab will not provide them.

### D.3 Interop seams — foldlab and other systems COEXIST

- **`EventJournal` / `EventLogRemote` as a bridge.** foldlab can be the
  authority-of-record while an Effect-native `EventLog` is a local-first
  cache/UI/projection synced via `EventLogRemote` (`eventlog/EventLogRemote.ts`) —
  with the identity caveat that entry ids differ (D.2), so the bridge maps between
  a foldlab head and an `EntryId`, it does not unify them.
- **OTLP/Langfuse export (ticket 006).** The journal *is* the trace; export is a
  projection, so foldlab coexists with any existing observability backend (A7).
- **The cross-key atomicity boundary (ratified default: one workflow = one
  register).** Inside a single workflow register, over deterministic-or-journaled
  activities, the proof is inherited (D.1). Two *independently homed* decisions
  that must be all-or-nothing exceed the single-key proof and **hand off to a saga
  / 2PC / another coordination system.** That hand-off is an interop seam: foldlab
  proves each register's commitment; the cross-register transaction is the other
  system's job, and its atomicity is *not* a foldlab guarantee.

### The compositionality frontier (the map an integrator navigates)

**The inherited proof EXTENDS** down one path and one path only: *inside a single
workflow register, over activities that are deterministic-in-the-digest or journal
their outputs as facts, on a daemon-owned verify-on-read journal, backed by the
effector's proven fence.* Along that path an integrator gets exactly-once,
byte-exact replay, and recomputable provenance **for free** — discharged once,
inherited everywhere above.

**The inherited proof STOPS at four boundaries**, each of which returns the
integrator to unproven territory they must own: (1) **cross-register atomicity**
(→ saga/2PC, D.3); (2) **liveness** — progress, lease reclamation, fair
scheduling (→ cluster machinery, D.2); (3) **placement** — which process runs a
job (→ Singleton/Sharding, orthogonal, Part C); (4) **reproducibility of a
genuinely nondeterministic effect** — replay returns the *journaled* result, never
a guarantee that re-calling would agree (Part 1.4; the semantic-gap edge). Cross
any of the four and the guarantee is *record-consistency*, not *reproducibility* —
and the doc says so rather than letting "verifiable" leak across the line.
