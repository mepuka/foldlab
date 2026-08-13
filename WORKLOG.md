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
