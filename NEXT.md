# NEXT — the session brief

State as of 2026-08-12 (post mint-rollback), so the next session starts
mid-stride. Theory background:
[.reference/core-concepts.md](.reference/core-concepts.md). Proof heritage:
`.reference/playground-mech/`. Ubiquitous language: [CONTEXT.md](CONTEXT.md).
Committed decisions: `docs/adr/`. Live planning: `docs/map/`. Agent
operating contract: [AGENTS.md](AGENTS.md).

## Where the repo stands

Monorepo: `packages/core/src/` (stream, xform, schema, entity,
streamBindings), the narrow-writ client scaffold in `packages/client/`,
HTTP demo in `packages/server/`; `packages/{codegen,ai}` reserved.
`go/` and `fixtures/` at root. Older `src/...` paths below read through
that mapping.

Every wall below is a passing test, not an intention (`bun test` 33 pass
+ 1 wasm skip without `dist/`, `tsc` clean, Go gate green):

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
- **NATS substrate (ported 2026-08-12)**: `go/{canonical,journal,effector,
  cmd/journald}` — the playground kernel's Go substrate now lives HERE
  under foldlab's gates: RFC 8785 canonical JSON (frozen
  `fixtures/golden-conformance.json`), the hash-chained CAS-append
  verify-on-read journal over JetStream, the single-key fenced effector
  over JetStream KV (the audited A6 protocol), and journald with its
  black-box conformance test — all passing on embedded NATS. Protocol
  mapping: [docs/research/2026-08-12-nats-agent-protocol.md](docs/research/2026-08-12-nats-agent-protocol.md).
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

## Rolled back: the mint concept (2026-08-12)

mint() — type-creation as a committed operation, with its registry,
handles, and the fence vocabulary — is rolled back, decided in
conversation: it never had a consumer (nothing called mint() except its
own test), had no API plan, and its vocabulary tower (mint / fence /
handle / binding / claim-vs-fact / lane) obscured the actual design
question, which is the TS/Go seam. Deleted: `packages/core/src/mint.ts`,
its test, the agent surface built on it (`packages/core/mcp/`), and the
stale `.mcp.json` — all recoverable from git history. The mint-era design
sections that used to live in this file went with it; what survives is
restated below, clean.

The schema-identity machinery went in a second pass the same day
(operator decision: greenfield): `schemaIdentity.ts`, the adversarial
battery, `fixtures/schema-wall.json`, and the identity wall test are
deleted. Rationale: nothing consumed the digest but its own tests; the
battery encoded semantic decisions (checks move identity,
brands/getters/defaults don't) the operator never made from first
principles; and the digest preimage was a TS library internal of the
pinned rc — unusable by the Go daemon the ownership model just made the
verifier. Schema identity restarts greenfield in map ticket 004, every
semantic
decision grilled with the operator; the wiped battery remains in git
history as evidence of what the rc representation did.

What mint was reaching for stays available as a law, not a mechanism: a
transform must pass its digest law before anything depends on it — the
walls, applied at a different moment. Any registry-like need must be
pulled in by a real consumer (the wrapper prototype, map ticket 003),
never built ahead of one.

## Ratified: the seam decision (2026-08-12)

The Go daemon owns the runtime. It is the deep module — embedded NATS
server, journal, effector, and the hot-path algebra behind one small
interface, which is data on subjects (ADR-0003: canonical frames and
facts; never FFI). TypeScript is the authoring adapter at that seam:
the Schema face types what crosses, builds programs, and holds a client
connection; it is never a runtime dependency. The wall (TS ≡ Go digest
equality) is not a seam — nothing calls across it; it is the proof that
licenses moving computation to either side. Wasm is not a third side:
the same Go source deployed into the JS process through one data entry
point, with the wall proving the move changed nothing.

## Ratified: the ownership model (2026-08-12)

Ticket 002 resolved in full — the resolution text is in
[docs/map/tickets/002-the-ownership-question.md](docs/map/tickets/002-the-ownership-question.md),
the journal-roles split is ADR-0009. The sort that organizes it:

- **Evidence** — anything recomputable from bytes (facts, folds, anchors,
  catalogs) is never owned, federates freely, and can only converge or
  be absent.
- **Decisions** — anything two parties could legitimately disagree on
  (named pointers, fork adoptions, committed merge orders) are
  single-homed per digest behind the effector.
- **Absence** — a digest not yet here (lag, never-created, refused) is a
  typed refusal; senders own retry. Never admission on faith.

The six decisions: (1) the TS client's writ is NARROW — read anything,
publish canonical frames to ingress subjects, request everything else;
authority protocols are implemented once, in Go. (2) The type catalog is
a hash-chained journal, daemon-written; the daemon never accepts an
asserted identity — every digest it commits, it recomputes from
submitted bytes. (3) Ingress refuses what doesn't resolve. (4) Journal
roles per ADR-0009: authority imports nothing; replica is a verified
JetStream mirror, locally read-only; subject addressing routes writes to
the authority. (5) Catalogs are per-daemon authorities with union
resolution — creation works offline, same-shape races converge by
content addressing; named bindings go through the effector. (6) Nobody
owns entity folds — folds follow journals; adoption of contested results
is the effector's job.

Consequence: the foldlab-owned canonical schema encoding (map ticket
004) joins the critical path — the daemon must recompute schema digests
from bytes alone. Interim: identity is a digest over the submitted
canonical bytes.

## Standing principles (ADR-backed; nothing aspirational here)

1. **Boundary is data, not FFI** (ADR-0003): programs are data — the
   same program value runs over wasm, NATS request/reply, and CLI stdin;
   TS DX is a veneer that builds programs.
2. **Derivation over porting** (ADR-0006): SDK and AI surfaces are
   derived adapters off cataloged schemas, never hand-written ports;
   beta-rename risk is confined to the adapter layer.
3. **The journal is load-bearing for LLM traffic** (ADR-0005): records
   are events, lineage is a query.
4. **Schema identity: laws ratified, build pending** (ticket 004,
   grilled 2026-08-12): identity = SHA-256 over RFC 8785 bytes of a
   foldlab-owned structure from an exhaustive fold of the pinned
   SchemaAST; both sides enter; declared checks and brands move
   identity; annotations are claims except a Declaration's required
   identifier; anonymous checks and identifier-less declarations
   refuse. Align with Effect's semantics, never their bytes. Interim
   catalog identity: digest over submitted canonical bytes.
5. **AGENT FIRST** (ratified constraint): the primary producer and
   consumer of the system is an agent, and the primary interface is the
   daemon's request surface — agents create types, resolve digests, and
   query lineage as tool calls. Human views are projections of the
   agent surface, never the source of it.

Everything further out — the certificate (ticket 005, gated behind 004
and 008), the correlation thesis (trace graph ≡ type system), effectful
transforms via user-injected Layers, schema-aware codecs — lives in the
map's tickets and out-of-scope list, each behind its gate. Aspiration
stays out of this file until the ownership model's details (tickets
003, 004, 008) are handled.

## The surface census (2026-08-12)

Every interface through which the lab touches the world is enumerated in
[docs/research/2026-08-12-surface-census.md](docs/research/2026-08-12-surface-census.md):
34 surfaces, each owing four things (derivation source, law, digest story,
domain statement) under six proposed kinds — source, derived, **ported**,
read, ingress, projection. What it found: the TS core is the standing
*ported* surface ADR-0006 exists to eliminate; the certificate is the
keystone five unbuilt surfaces wait on; the journal has no module and
there is no ingestion surface at all; determinism in the core is currently
total, which is an asset with a deadline. (The census's two live MCP
defects were deleted along with that surface in the mint rollback; the
rebuilt request surface owes the same lessons — typed refusals for
unencodable input, honest destructiveness annotations.)

## Owed by the in-flight Go perf landing (verification 2026-08-12)

The rewrite is verified real (geomean -32%, allocs collapsed) and
behavior-faithful — findings and obligations in
[docs/research/2026-08-12-go-perf-verification.md](docs/research/2026-08-12-go-perf-verification.md):
(1) pin `MapValueUpper` to ASCII-only on BOTH sides + non-ASCII law tests
(closes the pre-existing TS≠Go Unicode drift the ASCII fixture never saw);
(2) stated aliasing comment on zero-copy `GunzipEvents` payloads;
(3) the `FilterKeyPrefix` dead disjunct. ADR-0007 is the general rule: a
wall certifies only its corpus — every pinned transform owes a domain
statement and a divergence probe.

## Backlog, ordered (tight: the ratified path and its obligations, only)

1. The wrapper prototype (map ticket 003, unblocked): the Go daemon
   (embedded NATS + journal + effector + catalog) behind the narrow-writ
   interface, with the TS authoring adapter as its first consumer.
2. The foldlab-owned canonical schema encoding (map ticket 004, critical
   path): the daemon must recompute schema digests from bytes alone.
3. The workflow abstraction (map ticket 008) — the one remaining
   ungrilled decision on the path: program as digestable catalog data;
   run as durable journaled fact.
4. Derived-node conformance test on embedded NATS: the collector's first
   real backing is NATS KV through the Go twin — anchors as
   revision-CAS'd KV entries. (KV `Watch` live plane is DONE:
   `go/effector/watch.go` + WL1–WL4.)

Anything not listed here (lowering, codecs, entity census, effectful
getters) waits behind the map's gates.

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
