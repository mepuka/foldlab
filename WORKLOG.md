# WORKLOG — expressive-power team

Mission: map the novel expressive power foldlab unlocks; recommend the ONE
Effect-community deliverable; state the honest edge. Deliverable:
`docs/research/2026-08-13-expressive-power-dossier.md`. Prose + type signatures
only, no machinery.

Worktree root: /Users/pooks/Dev/foldlab/.claude/worktrees/agent-a09df0cf34f2ff0a3

## Burst log

### Burst 1 — orientation (in progress)
- Read: README, CONTEXT, VERIFICATION, AGENTS, NEXT.
- Absorbed: three-sort ontology (evidence/decision/absence); the two folds
  (head/state); declared algebra + declared right (ADR-0010 rights-follow-proofs);
  fold identity = digest over (algebra declaration, step digest), result keyed
  by (fold digest, head) = invalidation-free truth; schema identity commits
  shape only (ADR-0006/0008); certificate = derivation claim; journal
  load-bearing for LLM traffic (ADR-0005); mint rollback = the anti-cheat
  (machinery with no consumer but its own test was deleted).
- Seam: Go daemon owns runtime; TS is authoring adapter (Schema face); wall
  (TS≡Go digest equality) licenses moving computation, is not itself a seam.
- Next: ADR-0010/0006/0005/0001, research frontier + resonances, map + tickets,
  then source surfaces + Effect rc.108 confirmation.

### Burst 2 — surfaces + Effect grounding (done)
- Read ADR-0010/0006/0005/0001; both research frontier docs (resonances,
  language-ontology); source: algebra.ts, fold.ts, foldCache.ts, foldLaws.ts,
  schema.ts, stream.ts, foldBindings.ts, entity.ts.
- KEY confirmations vs rc.108 vendored source (repos/effect/packages/effect/src):
  - Stream.runFold(self, initial: LazyArg<Z>, f:(acc,a)=>Z): Effect<Z,E,R>
    (Stream.ts:10482) and runFoldEffect (Stream.ts:10534) — the effectful sink.
    foldBindings.runFold is a direct wrapper. THIS is the deliverable's spine.
  - Data.TaggedError (Data.ts:761) — used across stream.ts for typed refusals.
  - Schema idioms in-repo (schema.ts): `import {Effect, Schema, SchemaGetter,
    SchemaIssue} from "effect"`; Schema.Struct, Schema.Int.check(Schema.isBetween),
    Schema.decodeTo, SchemaGetter.{decodeBase64,transformOrFail,transform},
    Schema.decodeEffect/encodeEffect. All pass repo typecheck = rc.108-valid.
- Power-map primitives now concrete:
  - foldCache: key = `${fold.digest}:${head}`, entries immutable, emptyFoldCache
    has NO invalidation state. Refusal IdentityUnavailable when anonymous.
    Consumer today: its own test only (mint-rollback risk — flag under edge).
  - fold identity = sha256 over {v:foldlab.fold.v1, algebra:spec, stepDigest}.
    Anonymous algebra/step => no digest => refuses caching/cataloging.
  - foldLaws.makeFoldLawSuite = the wall FACTORY (ADR-0010 embodiment):
    monoid identity/assoc, banana-split zip, third-hom split (parallel replay
    license), homomorphism preservation + map commutation.
  - stream.ts: Head=hex string; two folds head(identity)/stateDigest(meaning);
    "chain remembers what fold forgives"; MergeGap/MalformedPayload/SegmentGap
    as Data.TaggedError typed refusals; applyMerge/replay return Effect.
  - entity.ts: Collector over Backing seam; compose = fold of child anchors.
- Dispatched 2 Explore agents: map+tickets(004/005/008/014/015/016/019/020),
  proto(SPEC W1-W10/C1-C5, mcp.ts, client.ts, codegen.ts). Awaiting.
- Leaning recommendation: "Verifiable Effect Streams" — every Stream run
  committed as a recomputable (fold digest, head) fact; runFold/runFoldEffect
  is the idiomatic hook; foldCache gives invalidation-free memo; the third-hom
  law licenses parallel/incremental replay. One-line why: it turns an Effect
  Stream run from an ephemeral effect into a citable, cacheable, auditable fact
  with ZERO new coherence machinery — nothing in Effect gives this today.

### Burst 3 — map/tickets + dossier authored (done)
- Two Explore agents returned: proto (W1-W10 confirmed; NO C1-C5 in SPEC.md —
  did NOT cite them; mcp.ts derives tools from contract.describe via toJsonSchema;
  codegen toEffectSchema/toJsonSchema/toGoSource are semantic folds; client
  three-verb writ; Refusal is a data struct not a tagged error) and map/tickets
  (004 critical-path RATIFIED build-pending; 005/008 ASPIRATIONAL; 014 fold
  algebra RATIFIED-UNBUILT consumer=020 metrics; 015/016 RATIFIED-UNBUILT;
  019 register store; 020 THE EFFECT SURFACE = Layers-first FoldlabTracer/
  Logger/Metric + replay/counterfactual test magic, RATIFIED-UNBUILT).
- Confirmed rc.108: Tracer.Tracer = Context.Reference<Tracer> (Tracer.ts:631),
  Tracer.externalSpan (:113), Span iface (:371); Metric.counter/gauge/summary
  (Metric.ts:2091/2177/2426); Schema.decodeUnknownResult (:1760); effect/
  unstable/ai present, Tool.dynamic (unstable/ai/Tool.ts:1326).
- WROTE docs/research/2026-08-13-expressive-power-dossier.md:
  §1 power map (P1 invalidation-free cache, P2 proved-split parallel replay,
  P3 provenance-as-fold, P4 cross-runtime digest equivalence, P5 deterministic
  replay+counterfactual, P6 schema-as-derivation-source, P7 teaching refusals,
  P8 lawful combinator) each with law/why-Effect-can't/status/consumer.
  §2 ranked A/B/C/D framings; RECOMMENDED D "provenance for free" delivered as
  the FoldlabTracer + verifiable-fold Layer ("your Effect runtime, made
  recomputable"), built on the A engine (runFold/foldCache), sold with the C
  guarantee (ADR-0010). Surface signatures rc.108-confirmed; smallest demo =
  two runCommitted runs, recomputable head + cache hit, no daemon.
  §3 honest edge led by THE central risk: fold algebra has no non-test consumer
  (mint-rollback shape) — 020 is what retires it. Plus semantic gap, byte-coarse
  identity + recursion hole, GAD distortion, coNP basis, absence-has-no-proof,
  determinism deadline, safety-only, pre-graduation transport.
  Appendix: rc.108 signature ledger with file:line citations.
- Committed + pushed after each burst.

### Burst 4 — coordinator re-steer: compositionality of proof (done)
- Re-steer: make compositionality of proof the SPINE; harden P1/P2 with the
  free-monoid fundamental theorem in ONE statement; place three-sort ontology
  with CALM; label theorems by rung reached (arguments toward R5, not claims);
  fold concierge C1-C5 into P7; frame recommendation AS sharpening of 020;
  grill the homomorphism zero-replay view (paper vs rc.108 surface).
- Hunted + cited C1-C5 EXACTLY (proto/wire/CONTRACT.md :70/:71/:84/:81/:168;
  conformance_test.go :503/:528/:554 = C1/C3/C4; mcp.test.ts:177-216 full
  authoring session from frontier data alone). C4 = every advertised example
  accepted = no-lie-in-the-offer; C3 = empty frontier <=> create accepts =
  termination correspondence. Frontier is DERIVED (grammar->tree automaton),
  so fluency is inherited not hand-maintained.
- REWROTE dossier around the spine:
  §1 Thesis: inheritance + closure defs; §1.1 free-monoid fundamental theorem
  (fold = unique monoid hom ĝ:X*->M; P1 coherence-free = uniqueness, P2
  splittable = homomorphism, TWO faces of ONE property; chain-remembers =
  ker(ĝ)); rung = universal property is the ARGUMENT toward R5 (mathlib
  FreeMonoid.lift, resonances C1), R1 per-instance walls = shipped evidence.
  §1.2 digest propagation = executable proof composition (product/zip/map
  table; digest present <=> every sub-proof present; else typed refusal names
  broken sub-part). GRILL: by-construction inheritance (unmechanized meta-thm)
  + re-wallable instances; NOT machine-checked composition.
  §1.3 zero-replay derived view GRILL: law SHIPPED+walled (map commutation),
  derivation reachable by hand (getFoldCache + hom.map, O(1)), BUT ergonomic
  fold.map(hom).fold path REPLAYS; the zero-replay combinator/consumer is
  RATIFIED-UNBUILT (020's derived-view surface). Split verdict stated.
  §1.4 CALM places coordination cost: evidence monotone->lock-free ingress,
  absence anti-monotone->CAS; catalog split R2+R3 SHIPPED, CALM = external
  ancestor (argument), placement corollary = resonances C3 aspirational.
  §1.5 concierge = proof-carrying interactive fluency (C1-C5).
  §2 power map reweighted (each: inherits? composes?), concierge folded into P7.
  §3 recommendation reframed AS sharpening of 020, cast in inheritance frame
  (builder inherits recomputable span id for free from fold law).
  §4 edge: added meta-theorem-unproved + zero-replay-consumer-unbuilt edges.
  Appendix: added C1-C5 + rung labels for free-monoid/CALM.
- Answered coordinator's 3 questions in-line via the rewrite. Committing.

### Burst 5 — effector-backed workflow replay design doc (done)
- Retask: docs/design/2026-08-13-effector-backed-workflow-replay.md, 3 parts.
- SEAM-LOCATION FINDING (Part 1 start): rc.108 HAS durable execution, under
  effect/unstable/ (NOT separate @effect/workflow packages at this pin — the
  vendored monorepo has no workflow/cluster package; they live in core effect
  under unstable/). Subsystems: unstable/workflow (Workflow, Activity,
  WorkflowEngine, DurableDeferred), unstable/cluster (ClusterWorkflowEngine
  backed by Sharding+MessageStorage), unstable/eventlog (EventJournal).
  Label: SHIPPED-UNSTABLE. Persistence seam = WorkflowEngine Context.Service;
  replay point = activityExecute(activity, attempt): Effect<Workflow.Result>,
  Result = Complete | Suspended.
- Key confirmations: WorkflowEngine.ts:37 (Context.Service) /:146 activityExecute;
  Workflow.ts:482 Result=Complete|Suspended; Activity.ts:123 make;
  ClusterWorkflowEngine.ts:790 layer<WorkflowEngine,never,Sharding|MessageStorage>;
  EventJournal.ts:40; Layer.provideMerge Layer.ts:1550 (/provide:1432/merge:1299);
  Effect.withSpan Effect.ts:8276; Scope.addFinalizer Scope.ts:375;
  Context.Service Context.ts:201 / Context.Reference :1312; Tracer.Tracer :631.
- Part 1: effector Register (Done|Claim|Absent) ⟷ Workflow.Result (Complete|
  Suspended); Done(fence,result)->Complete = activity NOT re-executed. Grounded
  exactly-once + byte-exact replay in G1 crash-storm (PASSED 2026-08-12; GV3/GV4
  fencing :83-90, GV6 replay :94, GV7 counterfactual :96). Distinguishing claim
  vs Temporal/Cluster: determinism+exactly-once are RECOMPUTABLE FACTS (verifier
  needs only the bundle), not framework promises. Honest precondition:
  deterministic-in-the-digest (G1 :36-38); nondeterministic effects journal
  their outputs as facts (results-in-the-record; config-hashed key).
- Part 2: hook points H1 Layer/Context DI (primary) / H2 WorkflowEngine+Activity
  (exactly-once, commit at ACTIVITY boundary not every withSpan) / H3 Tracer.Tracer
  (recomputable span id) / H4 Scope finalizers (lease cleanup, safety only) /
  H5 Effect.withSpan (naming not commitment). One-Layer surface: WorkflowEngineLayer
  Layer<WorkflowEngine, never, ProtoClient>; dev writes stock Effect.
- Part 3: composition ProtoClient ⊳ (Journal ⊗ Effector) ⊳ WorkflowRuntime via
  Layer.provideMerge (mirrors ClusterWorkflowEngine idiom). Hard constraints:
  C-A ADR-0003 data-not-FFI; C-B narrow writ (TS requests, never implements CAS);
  C-C the payoff = effector R3/R4 + journal verify-on-read INHERITED, exactly-once
  does NOT reappear per-workflow. OPEN QUESTION flagged: a workflow composing TWO
  effector-homed decisions -> single-key proof doesn't cover cross-key atomicity;
  recommend (a) one-workflow-one-register default, flag (b) saga/2PC as out of
  scope needing its own gate. Edges: safety-only (no liveness; G1 storm
  choreographed); TS Layer correctness REDUCES to daemon's (R0/R1 adapter surface,
  no independent guarantee); replay determinism precondition.
- Committing + pushing.

### Burst 6 — wider map: full cluster/workflow correspondence (Parts A-D, done)
- Retask: widen the workflow-replay map. Extended the design doc with Parts A-D.
- Read REAL mechanics (per coordinator's confirmed inventory): Singleton
  (:46 make; :34 double-register=defect; run on shard-owning runner),
  Entity (:71; EntityAddress{shardId,entityType,entityId}), Snowflake
  (:47 timestamp+machineId+sequence bigint), MessageStorage (:48 Context.Service
  saveRequest/saveReply/repliesFor/unprocessedMessages; layerNoop:1048/
  layerMemory:1056/Sql), DurableClock (:28 make+DurableDeferred<Void> wake),
  DurableDeferred (:38; token :412; deferredDone sets Exit once), DurableQueue
  (:46 PersistedQueue-backed), EventLogRemote (remote replica sync),
  EventLog (:603 makeEntryIdUnsafe timestamp ids), ClusterCron (:43 built on
  Singleton), Runners/RunnerHealth (topology).
- SHARPEST CORRESPONDENCES FOUND:
  - Singleton != effector: DIFFERENT AXES. Singleton = lease-based PLACEMENT
    (who runs now); effector = proven COMMITMENT (whose result counts forever,
    fenced R3/R4). foldlab replaces the commitment half, NOT placement. This
    bounds how much of the cluster stack foldlab can claim.
  - cluster Entity != foldlab Entity: assigned actor address + opaque live state
    vs recomputable chain-head identity + auditable fold state. Complementary.
  - MessageStorage = THE cleanest seam: JournalMessageStorage:Layer<MessageStorage,
    never,ProtoClient> swaps persistence under unchanged ClusterWorkflowEngine
    (which REQUIRES MessageStorage) -> exactly-once upgrade flows up via one swap.
  - Snowflake vs digest = DIVERGENCE (mint-time-and-place vs recompute-from-
    content); NOT substitutable; root of all other divergences.
  - DurableDeferred ~ effector Claim->Done: same terminal-uniqueness SHAPE, but
    assigned token + storage-once vs recomputable key + fence-proven once. Fence
    dimension ADDED not matched.
- MECHANIC THAT DOES NOT MAP CLEANLY: DurableQueue (work buffer, no recomputable
  identity/chain head) — flagged as not a clean inheritance.
- Part A: 8 agent-first use cases (A1 durable task, A2 zero-instrument provenance,
  A3 kill-9 byte-exact, A4 cross-runtime tool, A5 third-party auditable run,
  A6 human-in-loop=DurableDeferred, A7 OTLP/Langfuse integration, A8 MCP-drives-
  workflow integration), each with guarantee-leaned-on + label.
- Part D SEAM MAP: D.1 substitution (table, all inherited; MessageStorage/
  Activity/Singleton-commitment-half/Entity-state/DurableClock/DurableDeferred);
  D.2 divergence (ids, journal ownership, placement-vs-commitment, safety-vs-
  liveness); D.3 interop (EventLogRemote bridge, OTLP export, cross-key handoff
  to saga/2PC on the ratified one-workflow-one-register default). Closed with the
  compositionality frontier: proof EXTENDS inside one register over det-or-
  journaled activities on a daemon journal; STOPS at 4 boundaries (cross-register
  atomicity, liveness, placement, nondeterministic-effect reproducibility).
- Housekeeping done: cross-linked Part-1 replay mapping into dossier P5.
- Committing + pushing.

### Burst 7 — record two dispositions (closure, done)
- Coordinator verified both crown-jewel correspondences in source and ratified
  the "foldlab is NOT a clustering replacement" cap as the map's keystone.
- Recorded disposition 1: EventJournal/EventLogRemote bridge = NOTED SEAM, not a
  spike. Identity mismatch (EventLog.ts:603 msecs EntryId vs hash-chained head) =
  Snowflake-vs-digest divergence at journal level; a bridge maps not unifies;
  consumer-gated (no-machinery-before-consumer). Written into D.3.
- Recorded disposition 2: JournalMessageStorage = RECOMMENDED FIRST CONCRETE SLICE
  for ticket 020 (recommendation to operator, did NOT edit ticket 020). Lowest-
  risk/highest-leverage: one service swap via Effect DI (engine already requires
  MessageStorage), narrow-writ-respecting (requires ProtoClient, requests daemon),
  first real cross-process consumer of the effector/fold substrate = retires the
  missing-consumer risk. Honest caveat recorded: foldlab-persistence-under-stock-
  placement (still requires Sharding) — correct because foldlab replaces
  commitment not placement.
- Design arc complete (dossier -> workflow-replay design -> wider map -> closure).
- Committing + pushing. DONE.

### Burst 8 — the theoretical capstone: docs/design/2026-08-13-the-unified-fold.md (done)
- Retask: theory capstone unifying everything as ONE catamorphism. 4 parts.
- Noted: .reference/core-concepts.md does NOT exist at this pin; grounded Part 1
  in README "Why foldlab"/"theory in brief" + CONTEXT.md + source I'd read.
- Part 1 THE UNIFICATION: catamorphism = unique fold out of initial algebra
  (Bird-Meertens). Three faces = one structure:
  Face A ADT = initial algebra of polynomial functor (algebra.ts AlgebraSpec
  :52-65 IS the grammar; product :245-284); structural digest = AST fold
  (CONTEXT/004, ASPIRATIONAL; interim bytes-sha256-v1 SHIPPED).
  Face B Merkle = SAME catamorphism into canonicalize-then-SHA256 algebra;
  head = headFrom/extend left fold (stream.ts:112-116), structural digest folds
  tree into same hashing algebra (jcs:108). SHIPPED.
  Face C free monoid = event stream; time-fold = unique monoid hom (fold.ts:60-88);
  uniqueness=>invalidation-free cache, hom=>parallel replay. R1 shipped, universal
  property=argument toward R5.
  UNIFICATION: head(identity) + state(meaning) = two catamorphisms over ONE shape
  (X*) at two algebras; "chain remembers what fold forgives" = head INJECTIVE
  (collision resistance) vs meaning-hom LOSSY = ker(ĝ); Freyd/Rutten μF->νF
  minimization-map kernel (resonances 3). Honest edge: 004 semantic laws
  ASPIRATIONAL, recursion hole, meta-theorem argument-not-mechanized.
- Part 2 byte-guaranteed codegen: type=cataloged value by structural digest;
  certifier=one lawful fold (certify(bytes)->Certificate|Refusal, ESOP 2012
  translation-validation); codegen=semantic fold (toEffectSchema/toJsonSchema/
  toGoSource SHIPPED in proto, GBNF/FSM ASPIRATIONAL 015); byte-guaranteed via
  constrained decode (jcs:341) + canonical bytes served by digest, grounded in
  number-determinism dossier (45.8% latitude closed by RFC8785+constrained
  decode+JCS wall). Edges: Gold (teaching loop load-bearing), GAD NeurIPS 2024
  (validity syntactic), semantic gap.
- Part 3 four use cases: multiagent comm (content-address ontology, union
  resolution, teaching refusals, byte-guarantee=>can't emit invalid); local DSLs
  + generated translation (homomorphism, GF parse∘linearize=id, ASPIRATIONAL 015);
  streaming (xform.ts fusion SHIPPED); aggregation (free-monoid fold = through-
  line to Part 1, foldCache/foldLaws SHIPPED, consumer-gated 020).
- Part 4 frontier (one para): proof EXTENDS wherever a derived artifact is a
  catamorphism over digest-anchored input (inherits committed identity, can't
  drift, parse∘linearize walls); STOPS at the semantic gap (induced grammar
  meaning intent is irreducible) — recomputability of what was built, never
  fidelity to intent. The honest cap, like commitment-not-placement.
- Appendix: full grounding ledger (repo instances + labels + literature).
- Committing + pushing. Capstone done.

### Burst 9 — issue #13 product dialogue (done)
- Read issue #13 (body Q1-7 + follow-up A/B/C). Wrote
  docs/design/2026-08-13-workflow-engine-product-dialogue.md.
- PINNED Effect-team grounding (strict ground rule): ClusterWorkflowEngine rides
  Sharding+MessageStorage (:1-6/:790); Sharding = ownership+routing+health checks;
  SINGLERUNNER = their OWN single-process layer BUT "still requires a SQL client"
  (:1-11) => the wedge is the SQL dependency, not single-node (sharpens Q1/Q7);
  MessageStorage = pluggable backend "tracks duplicate requests" (dedup exactly-
  once), noop/memory for local/test; MessageStorage.test.ts = memory-only NOT a
  TCK (B2 verified gap); Activity stores/replays result; Workflow identity =
  tag+idempotency-key (Q5). EXTERNAL (labelled): EffectTS_ X post (Cluster =
  production-grade multi-node at scale); durable-exec surveys (render/zenml).
- SHARPEST answers: Q7 minimal demo = reuse STOCK ClusterWorkflowEngine +
  SingleRunner + swap SqlMessageStorage->JournalMessageStorage (build ONE thing,
  their engine/examples unchanged). Q3 wedge = auditor-who-trusts-neither
  recomputes exactly-once (proof is the product). Part 2A = concierge lifts to
  workflow construction (C4 no-dead-ends on PROGRAMS) BUT only for a REGULAR
  fragment (loops/recursion break decidability) - flagged open.
- HONEST 'we can't'/'worse' answers: Q4 arbitrary-effect determinism is
  UNDECIDABLE (strong form impossible; only refuse non-canonical RESULTS today +
  certifier verdict under a DSL); Q2 three WORSE cells (canonical-bytes
  strictness, no-silent-hot-patch rigidity, inherited unstable churn); Q5 branch-
  not-mutate rigidity; B2 TCK is a proposal not a thing we built.
- Part 3 grounding (today's session): C1 lane collisions = 3 lost CAS races the
  effector refuses by construction (issue #12 claim-first protocol = proven
  Claim); C2 approval gate = human holding a Claim, lease-expiry escalation =
  D2 steal-by-fence-not-clock (already proven); C3 two-fold split as LLM-nondet
  discipline (chain remembers bytes, meaning forgives, retry=new fact, concierge
  = certified construction). Honest edge: retrospective mapping, engine unbuilt.
- Coordinated: referenced architecture team's deep-module map (B3 deletion test),
  did not duplicate module interfaces.
- Committing + pushing. Awaiting coordinator synthesis pointer to #13.
