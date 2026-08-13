---
label: wayfinder:map
created: 2026-08-12
---

# Map: the schema-centric system

## Destination

Real traffic (the R2 climb journal; R1's as fallback) flows through
cataloged schemas into a node that is *derived* — an effectful wrapper
interpreting the schemas' effector-committed bindings over NATS, no
hand-wired transport — through entity folds to spans (span id = chain
head) with
certificates on every span, exported as OTLP into a real backend.
**Arrived when:** a stranger recomputes every span id, every
certificate, and every schema digest from the exported bundle in Go,
with no TypeScript anywhere.

## Notes

- Domain: foldlab — verifiable computation over streams. Ubiquitous
  language in [CONTEXT.md](../../CONTEXT.md); committed decisions in
  `docs/adr/`; theory in `.reference/core-concepts.md`.
- Every session: `bun run typecheck && bun test` and the Go gate stay
  green (`AGENTS.md`). Effect v4 pinned beta — confirm exports against
  `node_modules/effect/dist/*.d.ts`; consult the `effect` skill.
- Grilling tickets always run /grilling + /domain-modeling.
- Standing preferences: walls before features (byte-identical fixtures,
  frozen verifiers); derivation over porting (ADR-0006); boundary is
  data, not FFI (ADR-0003); evidence federates, decisions go through
  the effector (ticket 002 resolution; ADR-0009); a wall certifies only
  its corpus (ADR-0007).
- The R2 gauntlet effort runs BESIDE this map (own spec, own verifier,
  `docs/gauntlet/R2-verified-climb.md`); only its journal crosses into
  this map, as the ingestion fixture.
- Provider-agnostic, decided 2026-08-12: providers enter the system in
  exactly two places — as injected Layers behind service requirements
  (the pin's `LanguageModel`; SDK surfaces are derived adapters,
  ratified decision 5) and as facts in the record (model id in the
  work-digest preimage; receipts at pinned prices). A workflow step
  commits to (service requirement + opaque canonical config bytes);
  the abstraction hashes provider config, never interprets it.
  Experiments (the gauntlet lane) pin providers; the system abstracts
  them.

## Decisions so far

<!-- one line per closed ticket: gist + link -->

- [The ownership question](tickets/002-the-ownership-question.md) —
  evidence federates (per-daemon catalogs with union resolve; folds
  follow journals), decisions single-home behind the effector (named
  bindings, adoptions), absence is typed refusal; narrow client writ
  (read / publish-to-ingress / request); the type catalog is a
  hash-chained journal and the daemon recomputes every digest it
  commits; journal roles ratified as ADR-0009; ticket 004 joins the
  critical path.
- [The foldlab-owned canonical schema encoding](tickets/004-the-foldlab-owned-canonical-schema-encoding.md) —
  identity is SHA-256 over the owned canonical structure walk, never the
  vendor AST; normalization is named, total, terminating, confluent, and
  idempotent; declared checks and brands bear identity; recursion is excluded
  from v0 with the SCC-based successor pre-ratified; Go and Effect enter
  through explicit bridge records.
- [OTLP backend selection](tickets/006-otlp-backend-selection.md) —
  Langfuse (runner-up Phoenix): dual-emit for certificate visibility,
  public per-trace share links, API read-back for the stranger's
  verification path.
- [NATS server as an abstraction](tickets/001-nats-server-as-an-abstraction.md) —
  the server is two values (Go-only process + subject-addressed
  resource plane); topology evidence favors a Go-owned daemon
  embedding the server, configured by TS-authored catalog data
  (journald is the proven pattern); catalog replication = JetStream
  mirrors (origin seq numbers, resync-on-gap — lag is absence, never
  wrong data); the authority-vs-replica journal split went to the
  ownership ticket (resolved: ADR-0009).

## Not yet specified

- Entity/span semantics over the fixture: correlation keys from
  annotations, spans as segments between anchors, trace id = root
  anchor — sharpens after the ownership question and certificate shape.
- The certified OTLP bridge and its verifier wall (the tracing
  dossier's first artifact) — after backend selection + certificate.
- The Go no-TS verifier program (the destination's acceptance test) —
  after the foldlab-owned schema encoding.
- The thin MCP/agent surface driving the demo — rebuilt as a derived
  adapter over the daemon's request surface (the mint-era surface was
  deleted in the rollback; its census defects died with it, its lessons
  carry: typed refusals for unencodable input, honest destructiveness
  annotations) — after the wrapper exists.
- Higher-order schema authoring (what composing/deriving schemas feels
  like as a surface) — after the wrapper prototype teaches us.
- Multi-daemon spread: catalog journals mirrored between local daemons
  (leaf nodes / JetStream mirrors), a type created anywhere resolving
  everywhere by union resolution — semantics ratified (002 resolution;
  ADR-0009); implementation graduates once the single-daemon
  abstraction has proven itself in the wrapper prototype.

## Out of scope

- R2 execution — its own effort in the gauntlet lane; only the journal
  crosses (see Notes).
- Wasm verification at type-creation time (running the Go twin via
  wasmwall when a type is cataloged) — this map's pipelines compose
  existing walled primitives; returns as its own effort when a new
  transform kind needs a generated Go twin.
- Effectful transforms via user-injected Layers — nothing on the
  ingestion/tracing path needs an effectful getter.
- Schema-aware codecs (delta/dict/columnar) — optimization; not on the
  acceptance path.
- Any node kind beyond the journal-ingesting collector — one derived
  node proves the thesis; a node framework is not the destination.
