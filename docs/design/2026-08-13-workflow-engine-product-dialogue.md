# WorkflowEngine product dialogue — answering issue #13

Author: expressive-power team (Opus), 2026-08-13, isolated worktree. Answers
GitHub issue #13 (mepuka/foldlab) in the dossier's voice. **Ground rule (strict):
how the Effect team *actually* discusses Cluster/durable execution is cited from
the vendored rc.108 source and its docs; SHIPPED-UNSTABLE caveats are verified at
the pin, never from memory.** External references (Effect team talks, durable-
execution comparisons) are **labelled `[EXTERNAL]`** and never substitute for a
pin check. rc.108 citations are `file:line` into `repos/effect/`. Labels: SHIPPED
/ SHIPPED-UNSTABLE / RATIFIED-UNBUILT / ASPIRATIONAL. No machinery before
ratification. Structural module interfaces are owned by the architecture team
(worktree-agent-aa1734538d7359e7f) and referenced, not duplicated, here.

**The grounding first (it disciplines the rest).** This repo's own session today
is the empirical floor. It ran a project coordinator, a Mac proof fleet, a
bug-breaker, and two codex lanes **in parallel**, and work was **duplicated three
times** until a claim-first protocol was improvised on issue #12. That is not an
anecdote — it is the exact failure the effector prevents by construction (Part 3).
Every product claim below is disciplined by that test: *if the design cannot
express this morning's coordination failure, it is not grounded.* It can.

---

## Part 1 — the seven product questions

### Q1 — Positioning vs ClusterWorkflowEngine: the smallest deployable story

**How the Effect team frames Cluster (pinned + external).** At the pin,
`ClusterWorkflowEngine` "runs durable workflows on top of cluster sharding and
message storage" (`unstable/cluster/ClusterWorkflowEngine.ts:1-6`); `Sharding`
"runs shard ownership and message routing ... connects to runner communication,
storage, health checks, configuration" (`cluster/Sharding.ts:1-10`).
`[EXTERNAL]` the Effect team positions Cluster as "a distributed runtime ... a
major step toward **production-grade** systems in TypeScript ▸ Durable workflows
across **multiple nodes** ... **at scale**" (@EffectTS_, X,
https://x.com/EffectTS_/status/1922246618285318472).

**The crucial pin finding — they already have a single-process story, and it is
exactly where the gap is.** `SingleRunner` is the Effect team's own
"single-process cluster layer for durable entities and workflows ... no-op runner
communication, no-op runner health checks, SQL-backed message storage ... meant
for local, embedded, or small single-node setups ... **It still requires a SQL
client because mailbox messages and replies are stored in SQL**"
(`cluster/SingleRunner.ts:1-11`). So the segment their footprint excludes is
**not** "single node" — `SingleRunner` covers that. It is **single node with zero
external infrastructure**: the SQL dependency is the gap. That is a sharper,
more honest wedge than "they don't do solo."

**The smallest deployable story (the paragraph).** *Import the foldlab workflow
layer, provide it once at the top of your app, and your existing
`WorkflowEngine.execute` / `Activity.make` code is durable over an embedded,
file-backed journal — no Postgres, no shard mesh, no runner discovery, no SQL
client. One process, one binary. Kill a worker mid-step and restart: the run
resumes to a byte-exact state. Hand an auditor the exported journal and they
recompute what happened without trusting you. You did not deploy a cluster; you
provided a Layer, and inherited a proof.* Target personas: solo developer, edge
function, local-first app, **agent sandbox** (an LLM agent running durable
multi-step tasks in one process). **Honest edge:** "durable over embedded NATS"
rides the single-embedded-file-backed R1 substrate assumption (VERIFICATION.md
assumption 3); the moment you want multiple nodes you are back in `Sharding`
territory — foldlab replaces **commitment, not placement** (workflow-replay
design, Part C). **Label: RATIFIED-UNBUILT** (the `JournalMessageStorage` slice,
Q7).

### Q2 — Adoption-friction map (REMOVE / INHERIT / WORSE)

The `WORSE` column is the credibility of the other two; it is filled honestly.

| difficulty (source) | verdict | why |
|---|---|---|
| Operational burden — SQL + shard mesh + runner pools (`Sharding.ts:1-10`; `[EXTERNAL]` render.com/zenml durable-exec surveys) | **REMOVE** | one process, embedded file-backed journal, no external DB; even `SingleRunner` "still requires a SQL client" (`SingleRunner.ts:9-10`) — we don't |
| Unstable-surface churn (whole `effect/unstable/*` namespace) | **INHERIT** | we build on `WorkflowEngine`/`Activity`/`Workflow.Result` (SHIPPED-UNSTABLE); ADR-0006 fences a rename to the adapter layer, never a digest — but we are also pre-1.0 ourselves |
| Determinism discipline on authors | **INHERIT now, REMOVE later** | today the discipline is the same, only teachable (Q4); it becomes *by construction* when the workflow is DSL-authored (Part 2A) |
| Serialization requirements (Schemas for payload/success/error, `Activity.ts:3-5`) | **INHERIT + a stricter cell (WORSE)** | Effect already requires success/error schemas; foldlab additionally requires **canonical RFC 8785 bytes** — a result with `-0`, `NaN`, or duplicate keys is *refused* (`jcs.ts:16-27`). Narrower admissible set = WORSE for the author, but the refusal teaches and identity is then guaranteed |
| Testing durable code | **REMOVE / UPGRADE** | replay-from-journal makes a run a deterministic fixture; the G1 counterfactual re-folds a cone (dossier P5) |
| Versioning in-flight workflows | **INHERIT (cleaner law) + a rigidity cell (WORSE)** | content addressing gives a cleaner model (Q5) but forbids silent hot-patching: a patched workflow is a *different* digest, so you must express migration as a typed fact — WORSE for "just patch it," the honest cost of the guarantee |

The three honest **WORSE** cells: canonical-bytes strictness, no-silent-hot-patch
rigidity, and inherited unstable-surface churn atop our own pre-consumer status.

### Q3 — Where proof is the product

Cluster's exactly-once is a framework promise: `MessageStorage` "tracks duplicate
requests" (`cluster/MessageStorage.ts:5-7`) — dedup/idempotency, conditioned on
the storage doing its job. Ours is a **fence theorem** (effector R3 Apalache
inductive invariant + R4 lockstep, VERIFICATION.md) plus the **G1 crash gauntlet**
where a third party recomputes exactly-once from the bundle alone
(`docs/gauntlet/G1-crash-storm.md`). The distinguishing product claim is not "it
won't double-charge" — Temporal/DBOS/Inngest all promise that (`[EXTERNAL]`
zenml/render surveys). It is: **an auditor who trusts neither vendor recomputes
that it didn't.** Buyer: compliance over regulated decisions (credit, clinical,
moderation), **agentic accountability** ("why did the agent do X"), and any
adversarial/multi-party setting where "trust our storage" is not an answer. Raw
durability is a commodity; **recomputable proof is the wedge** — audit-grade
replay ("show me the exact bytes and fence that produced this decision") over raw
durability. **Label: G1 kernel SHIPPED; the audit-grade-replay product
RATIFIED-UNBUILT.**

### Q4 — The determinism precondition as a teaching surface

**Honest answer, including the part we cannot do.** For an *arbitrary*
`Activity.make({ execute })`, `execute` is an opaque `Effect<A, E, R>`, and
whether it is deterministic-in-the-digest is **undecidable in general** — so a
blanket "registration refuses non-deterministic activities" is **ASPIRATIONAL**
and, in the strong form, impossible. What is real, today:

- **Refuse at the result boundary (SHIPPED seam).** An activity whose success
  value is not canonically encodable is refused with the offending path
  (`jcs.ts` `NonCanonicalValue`) — "the engine refuses what it cannot *journal*,"
  which is weaker than "cannot *replay*" but real and teaching.
- **The strong form lands under a DSL (Part 2A).** When the activity is authored
  in a closed grammar whose semantics are deterministic-or-journaled by
  construction, "refuses what it cannot replay" becomes a **certifier verdict**
  (the `certify` admission), not a runtime lint. The category-first slogan is true
  *exactly* for DSL-authored workflows, and honestly overclaimed for arbitrary
  Effect. State the undecidability boundary plainly rather than promising the
  strong form for hand-written activities.

### Q5 — Versioning in-flight workflows

**How Effect frames identity (pinned).** A `Workflow` "has a stable tag ... and an
idempotency key used to derive execution ids" (`workflow/Workflow.ts:1-6`) — an
*assigned* identity; replay determinism already pins a run to its definition.

**The foldlab law and whether it survives.** Workflow identity *is* its
structural digest; changed code is a genuinely *new* fact; replay of an in-flight
run stays pinned to the digest that started it — which is *correct*: it replays
what actually ran. To adopt a fix, the migration is a **typed migration plan
recorded as a journal fact**: an effector-homed *decision* "at anchor k, run R
under digest D_old adopts a continuation under D_new," so the old cone stays
recomputable under D_old, the new cone under D_new, and the seam is a named,
committed adoption (the decisions sort; CONTEXT.md "merge fact"). **Does the law
survive real migration?** Yes for correctness (the in-flight history stays
honest), with two honest costs: (1) migration is a *decision* — single-homed
behind the effector, not federatable (two parties can disagree on whether to
migrate); (2) a migration that must atomically move *many* runs hits the cross-key
boundary (Q6). And the rigidity is real: foldlab makes you **branch, not mutate** —
a stateful in-place hot-swap of a running fiber's behavior is *not expressible*
(the Q2 WORSE cell). **Label: the digest-identity law is the SHIPPED principle;
typed-migration-plan-as-fact is RATIFIED-UNBUILT.**

### Q6 — The cross-key atomicity boundary

**Which product scenario hits it first.** A saga / multi-entity update: an agent
workflow that must commit a decision *atomically across two independently-owned
registers* — a ledger transfer between two accounts, a coordinated update of two
entities, or (Part 3) two coordinators atomically claiming disjoint lanes plus a
shared resource. **Is ticket 012 the answer?** Only as substrate: 012 gives the
*journal* its own crash-recovery model gate — it makes each single journal sound.
It does **not** by itself provide cross-*register* linearization; that is a
saga/2PC concern. So 012 is necessary, not sufficient. **What the engine must
REFUSE rather than silently weaken:** a single activity that attempts to commit
across two effector keys must be **refused with a typed refusal naming both keys**
("cross-register atomicity is not provided; express this as a saga with
compensations, or collapse to one register"). The anti-pattern to forbid is
letting a workflow write two registers and *claim* exactly-once across both — the
fence proof is per-key. Note the pin: `Workflow` already ships "compensation and
cleanup helpers" (`Workflow.ts:6-8`), so a saga-of-single-key-decisions with
compensations is the idiomatic escape — but it is *eventually* atomic, and
foldlab proves each step's commitment, **not** the saga's all-or-nothing. **Label:
the refusal is a DESIGN OBLIGATION (RATIFIED-UNBUILT); 012 is substrate.**

### Q7 — The minimal demo that makes the Effect team care

**The sharpest path, grounded at the pin: do not build a new engine at all.**
Because `ClusterWorkflowEngine.layer` requires only `Sharding | MessageStorage`
(`ClusterWorkflowEngine.ts:790`) and `SingleRunner` already provides
single-process `Sharding` with no-op runner comms/health — needing only that its
`MessageStorage` be swapped from SQL (`SingleRunner.ts:1-11`) — the minimal demo
is:

> Run one of Effect's own `WorkflowEngine` examples **unchanged**, under
> `SingleRunner`'s topology, with `SqlMessageStorage` replaced by a foldlab
> `JournalMessageStorage`. Their engine, their examples, their single-runner
> wiring — untouched. Kill the process mid-run; restart; show byte-exact resume;
> then run the G1 verifier on the exported bundle.

The delta shown: **ops footprint** — their `SingleRunner` needs a SQL client;
ours needs one embedded daemon, zero external infra — and **proof inheritance** —
the same run yields a recomputable bundle. **What is missing to build exactly that
and nothing more:** one thing — `JournalMessageStorage: Layer<MessageStorage,
never, ProtoClient>` (the recommended first slice, workflow-replay design §C).
`saveReply` commits a `Done` fact (effector-guarded); `repliesFor` returns
committed results (replay, not re-run); `saveRequest` appends evidence;
`unprocessedMessages` = journal entries with no committed reply. No new engine, no
new workflow types — the Effect team sees *their* durable-execution stack running
on a proof, changed by one Layer. **Label: RATIFIED-UNBUILT.**

---

## Part 2 — the higher-order question and the coordinator's grill

### A. When the authors are LLMs through MCP

**The precondition holds by construction.** A workflow authored *in* a closed DSL
(`flb.workflow.v0`, a grammar under ticket 015's discipline) is
deterministic-or-journaled **by the DSL's semantics**, so Q4's undecidable
runtime check becomes a **decidable admissibility check** — `certify` admits a
value in the grammar or refuses it. "Refuses what it cannot replay" is then a
**certifier verdict**, which is the strong form Q4 could not give for arbitrary
Effect. This is the resolution of Q4, not a restatement.

**Does the correspondence survive higher order?** Yes, and it is already the fold
algebra. ADR-0010 makes algebras **data with digests** (`algebra.ts` — an
`AlgebraSpec` is a value; its `Declaration` has a digest, `:148-159`). "Algebras
producing algebras" is `product` / `mapped` over declared algebras, and the
composite carries a digest **iff** its parts do (compositionality of proof,
capstone §1.2 — digest propagation). A DSL program that is a value in a cataloged
grammar therefore *is* a journal fact with a digest, one level up. **Label: the
fold-algebra composition is SHIPPED; `flb.workflow.v0` as a cataloged grammar is
ASPIRATIONAL (ticket 015).**

**Does the concierge extend from types to workflow construction?** This is the
sharpest higher-order claim, and yes — if `flb.workflow.v0` is a grammar (slots:
sequence, activity, durable-clock, deferred, branch), the concierge's
`fill`/`unfill`/`frontier` applies unchanged: an agent assembles a durable
workflow **slot-by-slot, every fill certified (C4: every advertised fill
accepted), dead-ends impossible (C3: empty frontier ⟺ createable)** — the C4
no-dead-ends law **lifted from types to programs**. An agent building a workflow
never advertises a step that would yield an unrunnable or unreplayable workflow.
The machinery is SHIPPED over `flb.type.v0` (`proto/`, dossier P7); its
application to workflows is ASPIRATIONAL. **The honest edge, and it is sharp:**
the concierge's guarantees (frontier as tree-automaton successor set, C4/C3 via
emptiness decidability) require the grammar to be a **regular tree language**
(language-ontology frontier, closure law). A workflow DSL with unbounded loops or
general recursion is **not** regular, so the frontier/emptiness decidability that
powers C4 would **not** hold for arbitrary control flow. Therefore the concierge
lifts to workflows only for a **bounded/structured fragment** — which bounds what
workflows can be authored this way. Whether the useful workflow fragment stays
regular is an **open design question**, flagged, not assumed.

### B. The coordinator's five grill questions

**B1 — where does the writ live?** Workflow *definitions* are types (Part 2A), so
registering a definition rides `type.create`'s narrow writ — daemon-authoritative,
certifier-gated — and an agent **cannot register what the certifier will not
admit**. Workflow *execution* (an activity commit) rides the effector
claim/commit *request* (also narrow-writ: request, never implement CAS in TS,
ticket 002 / ADR-0003 / ADR-0006). Both halves sit inside the narrow writ;
neither authority protocol is implemented in TypeScript. **Label: writ discipline
SHIPPED (`proto/`); the workflow binding RATIFIED-UNBUILT.**

**B2 — MessageStorage conformance at rc.108 (verified gap).** The repo carries
`packages/effect/test/cluster/MessageStorage.test.ts`, but it is
**memory-driver-specific** (`describe("memory", …)`, `:24-25`), not a
driver-parameterized TCK — there is **no shared conformance suite** a third-party
`MessageStorage` author runs against their driver to certify it (the reusable
pieces are message/reply builders, `:123-216`, not a suite). So: **our
lockstep-harness pattern is a candidate MessageStorage conformance suite**, and a
driver-parameterized TCK any implementation must pass is a plausible **adoption
wedge** — but this is a claim about a verified gap plus a proposal, **not a thing
we have built**. **Label: gap verified at pin; TCK ASPIRATIONAL.**

**B3 — the deletion test on the adapter.** If `JournalMessageStorage` vanished,
each consumer that wanted the proof would have to re-implement the journal-read /
verify-on-read + effector claim/commit request-response mapping itself — i.e.,
reinvent the daemon protocol per app (violating the narrow-writ discipline), or
fall back to `SqlMessageStorage` (losing recomputability, gaining a SQL
dependency). The adapter is the **single lawful mapping** from `MessageStorage`
semantics to the effector/journal, consumed by the *stock* engine; its absence
makes real complexity (the daemon protocol) reappear in every consumer. It passes
the deletion test. (Structural depth is the architecture team's to map; referenced
here, not duplicated.)

**B4 — does replay reuse the fold cache?** Yes — this is the convergence. An
anchor is `(key, head, state digest)` (CONTEXT.md), a compaction point. Resume
from the last anchor is `getFoldCache(fold, anchor.head)` (`foldCache.ts:70`) —
a hit is *provably* the state at that head (invalidation-free, dossier P1) — then
fold only the delta events since the anchor. So resume is **O(events since the
last anchored head)**, not O(whole history): the invalidation-free cache is the
workflow resume accelerator. **Label: primitives SHIPPED (`foldCache`,
compaction, anchors); the replay wiring RATIFIED-UNBUILT (020).** Honest edge: it
is O(delta) only if anchors/compaction are taken; with no anchor since genesis,
resume is O(history), same as a cold replay — anchoring is a policy choice.

**B5 — failure taxonomy: which teaches?** The principled split is **absorb what
the engine can resolve; surface what only the author can fix.** `ErrFenced` /
lost-race is *not* author-facing — a fenced author has nothing to do but retry,
and the engine owns retry, so it is absorbed as **`Suspended`-with-cause** (the
workflow suspends, the fresher fence-holder proceeds, `Workflow` already models
"failure suspension," `Workflow.ts:6-8`; `execute` carries a
`suspendedRetrySchedule`, `WorkflowEngine.ts:77-93`). What is **surfaced as a
typed teaching refusal** is the class only the author can repair: a non-canonical
activity result (`jcs` refusal), a cross-key atomicity attempt (Q6), an
inadmissible workflow definition (certifier refusal, B1). Fencing is safety-by-
fence-not-clock and belongs to the engine; admissibility belongs to the author.
This is exactly the D2 story in Part 3: the superseded approver is not shown an
error — the lease simply steals.

---

## Part 3 — grounding: user stories from now (today's session as the case study)

Named personas, present tense. **Honest framing up front:** these are
*retrospective* mappings — the session did **not** run on the engine (which is
RATIFIED-UNBUILT). The claim is "the engine would have prevented this *by
construction*," grounded in the effector proof (R3/R4, G1), not "we ran it."

### C1 — A2A coordination: today's lane collisions ARE the missing-fencing story

This morning, Coordinator **Cass** dispatched lanes; Fleet-lane **Faye** and
Codex-lane **Cody** executed in parallel; **work was duplicated three times**
until a claim-first protocol was improvised on issue #12. On the engine:

- Each lane is a durable workflow. A lane **claim is an effector
  `Claim(fence, owner, lease)`** keyed on the work-unit digest. When Faye and Cody
  both reach for the same ticket, the effector's CAS admits **one** claim; the
  loser gets `Absent`/`Suspended` — a typed refusal naming the current owner. The
  duplication that happened three times today **cannot happen**: the second claim
  is refused, not silently duplicated.
- The claim-first protocol improvised on issue #12 **is** the effector's `Claim` —
  except it is a **proven fence**, not an improvised convention. The convention
  becomes an inherited theorem.
- A stop-order (Cass reassigns a lane) is a **steal**: a higher fence supersedes
  the current claim (no commit below the highest fence). Faye's stolen in-flight
  commit is refused if its fence is now stale; Cody proceeds under the higher
  fence. Safety by fence, not by "please stop" messages that race.
- The triage board is a durable workflow whose state is a **fold of child lane
  anchors** (entity composition, `entity.ts` EC4): recomputable, so "who did what
  when" is a **journal query**, not a Slack scrollback. Each lane is one workflow
  = one register (the ratified default), so no cross-key atomicity is invoked.

The operator's test — *if the design cannot express today's coordination failure,
it is not grounded* — is met: the three duplications are three lost CAS races the
effector refuses by construction, and it is **already proven** (R3/R4, G1). **The
missing-fencing story is not hypothetical; it happened today.**

### C2 — Human-agent: an approval gate is a human holding a claim

Approver **Ada** must sign off on an agent's action. The agent's workflow suspends
on a `DurableDeferred` awaiting Ada's decision — **a human holding a `Claim`**. If
Ada is unresponsive, the lease **expires and the claim is stolen** by an
escalation path taking a **higher fence** — which is **exactly the D2
steal-by-fence-not-clock semantics**: the escalation does not fire on a wall-clock
timeout that could double-fire; it fires by taking a higher fence, so **exactly
one** of {Ada approves, escalation proceeds} commits terminally (the effector's
unique-terminal-outcome). Ada approving with a now-stale fence is **refused** (she
was superseded, per B5 — absorbed, not surfaced as her error); the escalation's
decision is the committed one. **It is already proven** (effector R3/R4). Honest
edge: *when* to escalate (the lease duration) is **liveness** and unproven; the
**safety** — exactly one of approve/escalate commits — is inherited.

### C3 — LLM non-determinism: the two-fold split as the discipline

The chain **remembers byte-exactly** what a model emitted (the identity fold: the
exact bytes a model produced are a fact with a head); **meaning forgives** (the
meaning fold: two runs producing semantically-equal results converge in state
though differ in head). A retried stochastic call is a **new fact, never an
overwrite**: sampling twice is two events, two heads — you never mutate the first
(append-only + content address). And the concierge turns sampling into **certified
construction**: sample freely, admit only what proves (`certify` refuses the
inadmissible; free-form model output is narrowed to a certified value). Three
stories:

1. **Deterministic replay of a multi-turn agent session for debugging.** The
   journal replays the exact bytes the model emitted each turn (the
   nondeterministic-effect-journals-its-output rule, workflow-replay Part 1.4), so
   you debug the *real* run, not a re-sampled approximation.
2. **Regression-testing agent behavior against journaled histories.** A journaled
   session is a fixture; a new agent version replays against it; divergence is a
   diff of heads/states (the G1 counterfactual generalized).
3. **"Audit answers why the agent did X with bytes, not logs."** The certificate
   (schema digest, program digest, input anchor, span head) is recomputable; an
   auditor re-derives the decision from the bytes, not from a trust-us log
   (dossier P3; ADR-0005).

**Honest edge (the capstone's Part 4 cap, specialized):** replaying the bytes
proves what the model *emitted*, never that re-calling *would agree* — the model
is nondeterministic; you replay the record, you do not reproduce the sampling.
Recomputability of what was built, never fidelity to what the model *would* do.

---

## Appendix: pinned-vs-external citation ledger

**Pinned (rc.108, `repos/effect/packages/effect/src/`):**
`ClusterWorkflowEngine.ts:1-6` (rides sharding + message storage), `:790` (layer
requires `Sharding | MessageStorage`); `Sharding.ts:1-10` (ownership, routing,
health checks); `SingleRunner.ts:1-11` (single-process layer — **still requires
SQL**); `MessageStorage.ts:1-9` (pluggable backend, "tracks duplicate requests",
noop/memory for local/test); `test/cluster/MessageStorage.test.ts:24-25`
(memory-only, **not a TCK**); `Activity.ts:1-9` (wraps an effect so the engine can
store/replay its result); `Workflow.ts:1-9` (identity = stable tag + idempotency
key; compensation/cleanup/suspension); `WorkflowEngine.ts:77-93` (execute +
suspendedRetrySchedule), `:146` (activityExecute), `Workflow.ts:482`
(`Result = Complete | Suspended`). foldlab: `algebra.ts:148-159` (declared
algebra digest); `foldCache.ts:70` (cache hit = state at head); `entity.ts` (EC4
composition); `jcs.ts:16-27` (canonical refusals). Effector R3/R4 + G1 gauntlet,
VERIFICATION.md and `docs/gauntlet/G1-crash-storm.md`. ADR-0003/0005/0006, tickets
002/012/015/020.

**`[EXTERNAL]` (labelled, not pin-verified):** @EffectTS_ positioning of Cluster
as production-grade multi-node at scale
(https://x.com/EffectTS_/status/1922246618285318472); durable-execution
operational-burden framing (Temporal cluster / Cloud, DBOS Postgres-library,
Inngest/Trigger managed) from comparison surveys
(https://render.com/articles/durable-workflow-platforms-ai-agents-llm-workloads,
https://www.zenml.io/blog/temporal-alternatives). External items inform framing
only; every foldlab and Effect-mechanic claim is pinned above.
