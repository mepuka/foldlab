---
label: wayfinder:map
created: 2026-08-12
---

# Map: the schema-centric system

## Destination

Real traffic (the R2 climb journal; R1's as fallback) flows through
minted schemas into a node that is *derived* — an effectful wrapper
interpreting the schema's law-gated bindings over NATS, no hand-wired
transport — through entity folds to spans (span id = chain head) with
certificates on every span, exported as OTLP into a real backend.
**Arrived when:** a stranger recomputes every span id, every
certificate, and every schema digest from the exported bundle in Go,
with no TypeScript anywhere.

## Notes

- Domain: foldlab — verifiable computation over streams. Ubiquitous
  language in [CONTEXT.md](../../CONTEXT.md); committed decisions in
  `docs/adr/`; theory in `.reference/core-concepts.md`.
- Every session: `bun run typecheck && bun test` and the Go gate stay
  green (CLAUDE.md). Effect v4 pinned beta — confirm exports against
  `node_modules/effect/dist/*.d.ts`; consult the `effect` skill.
- Grilling tickets always run /grilling + /domain-modeling.
- Standing preferences: walls before features (byte-identical fixtures,
  frozen verifiers); derivation over porting (ADR-0006); boundary is
  data, not FFI (ADR-0003); registry for truth, annotations for
  authoring (ADR-0004); a wall certifies only its corpus (ADR-0007).
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

- [OTLP backend selection](tickets/006-otlp-backend-selection.md) —
  Langfuse (runner-up Phoenix): dual-emit for certificate visibility,
  public per-trace share links, API read-back for the stranger's
  verification path.
- [NATS server as an abstraction](tickets/001-nats-server-as-an-abstraction.md) —
  the server is two values (Go-only process + subject-addressed
  resource plane); topology evidence favors a Go-owned daemon
  embedding the server, configured by TS-authored registry data
  (journald is the proven pattern); registry replication = JetStream
  mirrors (origin seq numbers, resync-on-gap — lag is absence, never
  wrong data); the authority-vs-replica journal split goes to the
  ownership ticket.

## Not yet specified

- Entity/span semantics over the fixture: correlation keys from
  annotations, spans as segments between anchors, trace id = root
  anchor — sharpens after the ownership question and certificate shape.
- The certified OTLP bridge and its verifier wall (the tracing
  dossier's first artifact) — after backend selection + certificate.
- The Go no-TS verifier program (the destination's acceptance test) —
  after the foldlab-owned schema encoding.
- The thin MCP/agent surface driving the demo, and the two live census
  defects (seq-number refusal defect; all tools marked destructive) —
  after the wrapper exists.
- Higher-order schema authoring (what composing/deriving schemas feels
  like as a surface) — after the wrapper prototype teaches us.
- Multi-daemon ontology spread: the registry stream mirrored between
  local daemons (leaf nodes / JetStream mirrors), a digest minted
  anywhere resolving everywhere, refusal-under-lag as the consistency
  story — graduates once the single-daemon abstraction has proven
  itself in the wrapper prototype.

## Out of scope

- R2 execution — its own effort in the gauntlet lane; only the journal
  crosses (see Notes).
- The wasm lane (mint-time Go-twin verification via wasmwall) — this
  map's pipelines compose existing walled primitives; returns as its
  own effort when a new transform kind needs the derive lane.
- `mintEffect` (effectful transforms via user-injected Layers) —
  nothing on the ingestion/tracing path needs an effectful getter.
- Schema-aware codecs (delta/dict/columnar) — optimization; not on the
  acceptance path.
- Any node kind beyond the journal-ingesting collector — one derived
  node proves the thesis; a node framework is not the destination.
