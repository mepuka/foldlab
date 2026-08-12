# NEXT — the session brief

State as of `edb48af` (2026-08-12), and the design ideas ratified in
conversation, so the next session starts mid-stride. Theory background:
[.reference/core-concepts.md](.reference/core-concepts.md). Proof heritage:
`.reference/playground-mech/`. Ubiquitous language: [CONTEXT.md](CONTEXT.md).
Committed decisions: `docs/adr/`. Agent operating contract:
[AGENTS.md](AGENTS.md).

## Where the repo stands

Every wall below is a passing test, not an intention (`bun test` 17/17,
`tsc` clean, Go gate green):

- **Value wall**: `src/stream.ts` ≡ `go/stream` byte-identically over the
  frozen fixture (chain heads, merge facts, fold digests, compaction, forks,
  gzip transport).
- **Schema boundary**: `GzipEventFrame` — the Go-emitted compressed wire
  frame as a Schema type; decode = ingestion from Go, chain head survives
  the crossing.
- **Transform wall**: `src/xform.ts` ≡ `go/stream/transform.go`; fused,
  associative, identity, pure; one digest (`xformPipelineHead`) witnesses
  batch TS, Effect Stream, and Go as ONE transform.
- **Stream bindings**: `src/streamBindings.ts` — the wall reaches through
  Effect `Stream`; rechunking at any size never moves a head (chunking is
  transport, so orchestration is provably free to vary).
- **Entity collector**: `src/entity.ts` — entities as quotients by
  correlation key, both folds maintained O(1) per event, backing-layer
  independent (EC2), composition = fold of child anchors (EC4:
  deterministic, order-committed, transitively history-sensitive).
- **Wasm wall**: `go/cmd/wasmwall` + `test/wasm.wall.test.ts` — the SAME Go
  source compiled GOOS=js GOARCH=wasm, loaded into Bun, reproduces
  `xformPipelineHead` byte-identically. Same Go source, three runtimes, one
  digest. Boundary is data: one entry point, base64 gzip frames in, JSON
  {head, kept, frames} out; errors return as data, nothing throws across.
  `bun run build:wasm` produces gitignored `dist/`; the test auto-skips
  without it. Module is ~3.7MB (fine in Bun; browser story wants
  TinyGo/wasm-opt later).

Division of labor, on purpose: **Schema** is the typed, annotated, public
face; **Effect Stream** is orchestration (and the program value IS the DAG —
the combinator tree is the topology, a run is one linearization, the journal
fact is that run committed); **Xform/Go** is the fused hot path; **digests**
referee every pair.

## The type-minting fence (build first)

Premise: all code will increasingly be written by agents, and the way to
force semantic coherence on a lossy token predictor is to make
**type-creation itself a committed operation**. An agent does not write a
type into the codebase as free text — it mints types, emitters, and
transforms by calling a function whose signature IS the schema being minted.
The tool call is the type. Three gates, in order:

1. **The compiler**: the mint call must typecheck — a fabricated shape is
   unrepresentable, not merely wrong.
2. **The registry**: every minted schema/transform gets a digest and lands
   in the ledger; downstream agents can only reference digests that
   resolve. An LLM can hallucinate prose; it cannot hallucinate a digest
   that resolves.
3. **The walls**: a minted transform must pass its digest law (TS ≡ Stream
   ≡ Go where a Go twin exists) before anything may depend on it.

This is "LLM proposes, ledger commits" applied to code itself. It converges
rather than decays: each mint narrows the space of expressible nonsense for
every later mint.

First artifact (~small, everything it needs is standing):

```
mint(schema, xform) ->
  verify digest law (apply to a probe corpus; batch head == stream head)
  anchor the pair (schema AST digest + transform digest) via the collector
  return the ONLY handle agents may compose with
```

Plus `registry.resolve(digest)` and a refusal path (typed error) for
unverified or unknown digests. Native codegen note: the Go twin of a minted
transform is a *derivation target* — generate the Go source from the same
declaration and let the wall verify the pair, instead of trusting a port.

## Agent = schema = NATS node (build second)

A v4 schema already carries an agent's interface (consumed Type / emitted
Encoded), behavior (effectful getters — services in `DecodingServices`,
i.e. the LLM call can BE a transformation), wire form, and identity (the
AST is fingerprintable). Custom **annotation classes** carry the rest:
NATS subject bindings, commitment-register (effector) bindings, correlation
keys, codec choice, and the semantic ones — above all the **commutativity
class** (does this event type commute under the fold), which is the
entity-boundary decider (SL1/SL2) as a type-level fact.

Discipline: **an annotation without a law is documentation; with a law it is
a contract.** Every annotation class ships with its checker (commutes → the
swap test; transport → conformance against embedded NATS, the effector
lane's harness pattern; codec → round-trip-preserves-head).

The node is then *derived*: subscriptions from consumed-side annotations,
publications from emitted-side, effector registers from commitment
annotations. Before code: a one-page mapping of the NATS agent protocol
onto the three wire shapes (registers / journal facts / ephemeral chatter);
anything the protocol leaves as chatter that we need as fact gets promoted
through the effector.

## Ratified decisions (2026-08-12, grilled and confirmed)

1. **Wasm does both jobs** — distribution (Go hot path in JS runtimes) and
   verification (mint() runs the Go twin in-process at mint time; the wasm
   module is the registry's executable half). Two lanes fall out: **compose**
   (existing primitives, no toolchain, instant verify) vs **derive** (new Go
   twin: codegen + go build + full wall). Lead the public story with wasm;
   the Go/NATS substrate story is co-equal.
2. **The boundary is data, not FFI.** One entry point taking a serialized
   pipeline program + canonical frames; never named-function marshalling.
   The program encoding IS registry data, so the wasm module is an
   interpreter of registry entries, and the same program runs over wasm,
   NATS request/reply, and CLI stdin. TS DX is a veneer that builds
   programs. (The wasm wall hardcodes the pinned pipeline; the program
   interpreter arrives with mint().)
3. **Bindings: registry for truth, annotations for authoring.** The schema
   digest is STRUCTURAL (type identity only — a type on two NATS subjects is
   one type). Every binding (NATS subject, effector register, correlation
   key, codec, commutativity class) is its own law-gated registry record
   `{schemaDigest, bindingClass, params, lawResult}` — committed only after
   its checker passes. Schema annotations carry the CLAIM; the registry
   carries the FACT. mint() extracts claims, runs laws, commits records,
   returns a handle `{structuralDigest, bindings}`.
4. **Provenance is one mechanism.** LLM traffic goes through the journal
   (the journal is load-bearing for conversation data, decided explicitly).
   Records are events; lineage is a query. The one new object is the
   **certificate** — a minted schema bundling {schema digest, program
   digest, input anchor, span head} — riding on every produced record and
   every AI tool result. Users never see correlation keys or stream
   mechanics; the entity handle presents the semantically-shaped view.
5. **AI bindings: effect-native + MCP are first-class.** Our pin ships
   `effect/unstable/ai` (Tool, Toolkit, LanguageModel, Chat, McpServer).
   The registry (mint/resolve/run) is exposed as an MCP server via effect's
   own McpServer. Vercel AI SDK (`Schema.toStandardSchemaV1`, live at the
   pin) and Anthropic SDK (`effect/JsonSchema`) surfaces are DERIVED
   adapters off the same minted schema — never hand-written ports, so they
   cannot drift. Beta-rename risk is confined to the adapter layer.

## Backlog, ordered

1. `mint()` + registry (the fence) with its law suite.
2. NATS-agent-protocol mapping page; then the derived-node conformance test
   on embedded NATS (Go side; the collector's first real backing is NATS KV
   through the Go twin).
3. Schema-chain → Xform lowering ("compiler"), digest equality as the
   compiler test; schema-aware codecs (delta/dict/columnar derived from the
   type; law: round trip preserves the head).
4. Entity census over real agent streams: correlation-keyed collector +
   anchors as the seen-this-tree-before index; spans = segments between
   anchors, span id = chain head (verifiable), trace id = root anchor.
5. Outcome-branching conformance for effectful schema getters (the §5.8
   oracle law lifted to the LLM-as-getter pattern).

## Go notes for the operator (from conversation)

Value semantics are the superpower (structs copy; canonical values work).
The stdlib is the codec library — `encoding/binary`, `compress/*`,
`hash/*`, and `io.Reader`/`io.Writer` composition are native transducers.
Benchmarks live next to laws (`go test -bench -benchmem`; watch allocations,
not cycles). Channels for orchestration, never per-event hot paths; shard
by correlation key, fuse inside, `sync.Pool` for buffers. gofmt is law.
And the abstraction strategy stands: Schema is the public face, Go is the
invisible hot path, the algebra lives in laws users benefit from without
ever seeing.
