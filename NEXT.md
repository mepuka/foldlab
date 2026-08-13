# NEXT — the session brief

State as of 2026-08-13 (post tracer bullet — the end-to-end vertical
slice through every layer, in `proto/` — catalog model gate, fold
algebra, and the JCS differential lane), so the next session starts
mid-stride. Every claim with a rung and its bounds:
[VERIFICATION.md](VERIFICATION.md). Theory background:
`.reference/core-concepts.md`. Proof artifacts:
`.reference/playground-mech/` — `.reference/` is an untracked predecessor
repository, absent from this checkout. Ubiquitous language:
[CONTEXT.md](CONTEXT.md). Committed decisions: `docs/adr/`. Live
planning: `docs/map/`. Agent operating contract: [AGENTS.md](AGENTS.md).

## Where the repo stands

Monorepo: `packages/core/src/` (stream, xform, schema, entity,
streamBindings, jcs, and the fold algebra — algebra, fold, foldLaws,
foldCache, foldBindings, foldArbitrary), the narrow-writ client
scaffold in `packages/client/`, HTTP demo in `packages/server/`;
`packages/{codegen,ai}` reserved. `go/`, `fixtures/`, `proto/` (the
tracer bullet, own gates) and `verify/` (model gates) at root. Older
`src/...` paths below read through that mapping.

Every wall below — a differential test: two implementations, one input,
digests compared — is a passing test, not an intention (root `bun test`:
113 pass, 4 skip — the wasm wall, absent `dist/` — 0 fail across 13
files; `tsc` clean; Go gate green. `proto/` runs its own gates, listed
in `proto/AGENTS.md`; the model gates run from `verify/*/run.sh`):

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
  correlation key (one entity is ONE group of `Stream.groupByKey`, a
  single equivalence class), both folds maintained O(1) per event,
  backing-layer independent (EC2), composition = fold of child anchors
  (EC4: deterministic, order-committed, transitively history-sensitive).
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
- **Fold algebra (ticket 014, 2026-08-13)**: `packages/core/src/`
  {`algebra`, `fold`, `foldLaws`, `foldCache`, `foldBindings`} —
  algebras, steps and homomorphisms are DECLARED data, so a fold's
  identity is the digest over (algebra declaration, step digest) and a
  result keyed by (fold digest, head) is an immutable truth with no
  invalidation logic. Anonymous algebras and steps run and refuse
  identity. The deliverable is the wall FACTORY: every declared fold
  generates its own associativity, identity, third-homomorphism split,
  banana-split (`zip`) and homomorphism-commutation (`map`) suite —
  ADR-0010's first embodiment. Single-implementation pinned fixtures
  until the Go twin exists: ADR-0001 forbids claiming a cross-language
  wall before a second implementation.
- **JCS differential (2026-08-13)**: `packages/core/src/jcs.ts` ≡
  `go/canonical` under bidirectional fuzz — persistent probes on both
  sides, so every generated candidate and every fast-check shrink runs
  BOTH real implementations, never a port of one. Refereed by an
  INDEPENDENT oracle: RFC 8785 Appendix B's 26 rows, committed with
  provenance in `fixtures/jcs-rfc8785.json`. Constrained decode became
  a public seam (one value, valid UTF-8 and scalars, names unique after
  unescaping, finite binary64, 256-container depth): decode acceptance
  is part of identity.
- **Tracer daemon (`proto/`, 2026-08-13)**: laws W1–W10 witnessed
  black-box over NATS subjects — no asserted identity, canonical-or-
  refused, convergence by content address, create-before-publish,
  verify-on-read, replies that teach, refusals as data, the three-verb
  writ, scheme-tagged facts. Plus the stateless concierge (fill /
  unfill / frontier, laws C1–C5) — a typed-hole structure editor in the
  Hazelnut lineage: construction proceeds hole by hole, and every
  intermediate state is well-formed — and MCP tools derived from
  `contract.describe` at startup, so no hand-written tool list can
  drift. Its graduation map is in `proto/AGENTS.md`; the code has not
  moved yet.
- **Catalog + ingress model gate (`verify/catalog/`, 2026-08-13)**: the
  first claim here that is a machine-checked theorem rather than a
  digest equality. R2 TLC clean to closure at the gate caps
  (12,707,989 distinct states, depth 24); R4 lockstep conformance
  against the running daemon, zero divergences over 131 schedules on
  the named coarsened wire map, controls first. R3's inductive claim
  is HELD: the original hypothesis under-covered its own invariant
  (external review C4), the repaired bounds are committed, and the
  re-proof is running on two platforms — VERIFICATION.md carries the
  honest status. Negative controls refuted throughout (with the
  per-control specificity caveat recorded in the ledger). The insight the model
  surfaced: presence is monotone, which is what licenses lock-free
  ingress, while absence is anti-monotone, which is why create needs
  the CAS.

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
5. **The lawful surface** (ADR-0010): a public function enters a
   library only with the law that licenses it — a universal property's
   uniqueness clause, or a proved equation whose two sides it collapses
   — and ships with the generated law tests (fast-check property
   suites, derived rather than hand-written). Convenience with no
   licensing law is refused from the public surface.
6. **AGENT FIRST** (ratified constraint): the primary producer and
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

Landed since this list was last written: ticket 003's tracer bullet
(both bullets, in `proto/`), ticket 009's first climb (R2; R3 repaired
and in re-proof, claim held), ticket 010's R4 lockstep (claimed on the
named coarsened map), ticket 011's substrate assumption gate (the
envelope refuses what the proofs do not cover), ticket 014's fold
algebra, the JCS differential lane, and the 2026-08-13 external review
cycle: eleven filed findings fixed and closed same-day, the refusal
walls (one meaning-fold; unforgeable brands; cross-language identity
domains closed at a shared frozen vector), and the effector CERTIFIED
clean against its machine-checked theorem on the running binary
(docs/research/2026-08-13-effector-certified.md). Tickets 015 and 016
were cut; both gate on 004. Newer tickets 017-021 (journaled outcomes,
register store, NATS resolution, the Effect surface, JS-runtime
resolution) live in docs/map/tickets/; ticket 020's phase 1
(JournalMessageStorage — durable Effect workflows on the proven
journal, browser demo) is grilled, ratified, and specced. Design
dossiers — source-cited research write-ups, one per question — live in
docs/design/ (the WorkflowEngine correspondence and product dialogue
are the 020 anchors).

1. The foldlab-owned canonical schema encoding (map ticket 004,
   critical path): the daemon must recompute schema digests from bytes
   alone. Interim identity stays `bytes-sha256-v1` over submitted
   canonical bytes. Everything downstream waits here — the certificate
   (005), the grammar generator (ticket 015, "the grammar foundry"),
   the ontology explorer (016).
2. The workflow abstraction (map ticket 008) — the one remaining
   ungrilled decision on the path: program as digestable catalog data;
   run as durable journaled fact.
3. DONE — catalog R4 lockstep landed (ticket 010 closed): claimed
   against the coarsened wire refinement with both bridge halves
   machine-checked; the split-CAS branch's conformance is ticket 012's
   obligation, and the oracle-referee gap (no independent check that
   the Go oracle denotes the TLA relation) is a proposed follow-on.
4. Graduate `proto/` along its own no-redesign map (`proto/AGENTS.md`):
   go → `go/daemon` + `go/cmd`, ts/client → `packages/client`,
   ts/author → `packages/core`, ts/codegen → `packages/codegen`,
   ts/mcp → `packages/ai`, wire fixtures → `fixtures/`. Until this
   runs, `go/daemon/` is a contract with no code beneath it.
5. The hardening program: ticket 011 LANDED (the substrate assumption
   gate refuses out-of-envelope configurations); ticket 012 (the
   journal's own model gate, composed into the catalog model as a
   refinement — now also carrying the split-CAS conformance obligation
   and the D60 one-verifier law) and ticket 013 (the effector's proof
   artifacts into `verify/effector/`) remain open.
6. Derived-node conformance test on embedded NATS: the collector's first
   real backing is NATS KV through the Go twin — anchors as
   revision-CAS'd KV entries. (KV `Watch` live plane is DONE:
   `go/effector/watch.go` + WL1–WL4.)

Anything not listed here (lowering, codecs, entity census, effectful
getters, the fold algebra's consumer-gated `range`) waits behind the
map's gates.

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
