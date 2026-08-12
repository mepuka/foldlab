# The surface census: every way foldlab touches the world

Research memo, 2026-08-12. A census of every interface through which this
lab meets anything outside itself — code, wasm, MCP, HTTP, traces, exports,
fixtures, docs — so each can be pinned to the discipline instead of
accumulating unrefereed. Inventory and findings; the decisions it proposes
are listed at the end and are not taken here.

Verified against the working tree at the time of writing (gates green:
`tsc` clean, `bun test` 33 pass / 1 skip, gofmt/vet/`go test` clean).

---

## TL;DR

- **34 surfaces enumerated**: 22 standing, 15 decided-but-unbuilt, and 8
  that no prior document had named. §3–§5.
- **Two of them are ports, not derivations.** `src/stream.ts` and
  `src/xform.ts` are hand-written twins of the Go source, held honest by
  one frozen ASCII fixture. ADR-0006 says surfaces are derivation targets;
  the TS core is the standing exception, and the Unicode drift ADR-0007
  records is the bill for it. F1.
- **The keystone is unbuilt.** The `Certificate` is named by ratified
  decision 4 and CONTEXT.md, and at least five unbuilt surfaces (OTLP
  bridge, attestation export, `preview_spans`, Arrow/DuckDB, span ids)
  carry it. Nothing else should be built before it. F8.
- **The journal does not exist as code.** ADR-0005 makes it load-bearing;
  `src/` has no journal module, and there is no ingestion surface at all —
  events enter only by in-process construction or a gzip frame. F7, P8.
- **Determinism in the core is currently total** — no clock read, no
  random, in either language (verified by grep, §5 P2). Every surface on
  the unbuilt list introduces assigned identity or time. That boundary is
  worth an ADR while it is still free to declare.
- **The HTTP surface is orphaned**: three demo routes, no test, no law,
  projecting the pre-fence architecture. F2.
- **Booting the MCP server found two defects a static read could not, both
  now fixed.** The agent surface admitted sequence numbers its own
  canonical encoder refuses (`NaN`, `Infinity`, negatives, past 2^53 — a
  defect, not the typed refusal it promises), and all six tools advertised
  themselves as destructive including the pure reads. F10, F11. A third
  apparent defect was the test harness, not the product — F12, kept
  because the miss is the useful part.

---

## 1. The frame: what every surface owes

From ADR-0006 (surfaces are derivation targets) and ADR-0007 (a wall
certifies only its corpus), every surface owes **four** things:

1. **Derivation source** — the digest-anchored thing it is a fold of. A
   surface with no source is either the root or a port.
2. **Law / wall** — the passing test that certifies it. "It typechecks" is
   not a law.
3. **Digest story** — what identity crosses it, and what an auditor
   recomputes to check the crossing.
4. **Domain statement** — the input space over which its behavior is
   defined and cross-implementation identical (ADR-0007).

And one axis, non-negotiable per NEXT.md: **AGENT FIRST**. A surface is
either agent-facing (primary), machine-to-machine, or a human projection —
and a projection is derived from the agent surface, never the source of it.

## 2. Proposed kinds (vocabulary this census mints)

Six kinds, offered for CONTEXT.md. The kind determines which of the four
obligations bind hardest.

- **Source surface** — identity originates here; nothing upstream to
  derive from. Owes a domain statement above all (the canonical encoding,
  the Go package, the registry).
- **Derived surface** — a semantic fold off a digest-anchored source. Owes
  its derivation to be mechanical; cannot drift by construction
  (wasm, JSON Schema tool shapes, OTLP spans, DDL).
- **Ported surface** — a hand-written twin of a source surface, held
  honest only by a wall. The risk class ADR-0006 exists to eliminate.
  Owes a domain statement AND a divergence probe.
- **Read surface** — a frozen artifact others consume as contract
  (the fixture, the ontology graph, bench results). Owes provenance.
- **Ingress surface** — uncertified input entering the system (env, stdio,
  HTTP request, tool parameters, injected Layers). Owes **admissibility**,
  not a wall: what it refuses and how.
- **Projection surface** — a human view. Owes derivation from the agent
  surface (ADR-0006 applies to UIs).

---

## 3. Standing surfaces (code exists today)

| # | Surface | Kind | Derived from | Law today | Domain stated? |
|---|---|---|---|---|---|
| S1 | Canonical encoding `enc/seed/extend` (`go/stream/stream.go:17`, `src/stream.ts:22`) | Source | — (root) | `stream.wall.test.ts` + frozen fixture | **No** — u16 stream / u32 payload widths are limits, unstated |
| S2 | Seed namespace: `playground.stream.v1:`, `playground.merge.v1`, `playground.mergefact.v1`, `playground.fold.kv.v1` | Source | — | implied by the fixture | **No** — never enumerated; each string silently defines identity |
| S3 | Go package `foldlab/stream` | Source | — | `go test ./...` | partial (ADR-0007 debt) |
| S4 | TS core `src/stream.ts` | **Ported** | `go/stream/stream.go` (by hand) | `stream.wall.test.ts` | fixture corpus (ASCII) |
| S5 | TS transforms `src/xform.ts` | **Ported** | `go/stream/transform.go` (by hand) | `xform.wall.test.ts` | contested — see §6 F1 |
| S6 | `src/schema.ts` — `GzipEventFrame`, `WireEvent` | Derived | the Go wire frame | `schema.wall.test.ts` | round-trip only |
| S7 | `src/entity.ts` — collector, backing, anchors | Source | — (no Go twin) | `entity.test.ts` | no |
| S8 | `src/streamBindings.ts` — Effect Stream orchestration | Derived | `src/xform.ts` | `stream.bindings.test.ts` (rechunking never moves a head) | chunk sizes tested at three points |
| S9 | `src/mint.ts` — the fence, registry, handles | Source | — | `mint.test.ts` | probe corpus |
| S10 | `src/agentSurface.ts` — toolkit, 3-primitive catalog | Source (agent-facing) | — | `agentSurface.test.ts` | catalog is closed by construction |
| S11 | **MCP** stdio server, 6 tools (`src/mcpMain.ts`) | Derived | Effect Schema → JSON Schema via `McpServer` | none on the mounted server | no |
| S12 | **wasm** data boundary — one global `foldlabWasmWall`, base64 gzip in / JSON out | Derived | same Go source, `GOOS=js GOARCH=wasm` | `wasm.wall.test.ts` — **auto-skips** without `dist/` | ONE hardcoded pipeline |
| S13 | Go CLI `cmd/streamfix` (fixture writer, run once) | Source | — | the fixture it wrote | frozen |
| S14 | **HTTP** `src/server.ts` — `/health`, `/demo/merge`, `/demo/fork`, port 3123 | Projection | nothing — hand-written | **none** | no |
| S15 | `fixtures/stream-wall.json` | Read | `cmd/streamfix` | is the law | ASCII payloads only |
| S16 | Bench surfaces — `bench/stream.bench.ts`, `go/stream/bench_test.go`, `bench/results/*` | Read | — | protocol in `bench/BENCH.md` | deterministic corpora |
| S17 | Package surface — `package.json` scripts; `private: true` | Ingress | — | — | nothing is published |
| S18 | Repo-doc surface for agents — `CLAUDE.md`, `AGENTS.md`, `NEXT.md`, `CONTEXT.md`, `docs/adr`, `docs/research`, `README.md`, `SLICE-*.md` | Ingress (agent-facing) | — | none | n/a |
| S19 | Tool **descriptions** — the English an LLM actually reads (`agentSurface.ts:196`, `:207`, `:217`, `:229`, `:245`, `:250`) | Ingress (agent-facing) | hand-written | none | no |
| S20 | Typed refusal vocabulary — `MintRefused`, `UnknownDigest`, `MergeGap`, `MalformedPayload`, `SegmentGap`, `SegmentCycle`, wire shape `{law, detail}` | Source | — | exercised piecemeal in tests | no |
| S21 | Build/toolchain surface — bun, tsc, go, `GOOS=js GOARCH=wasm`, gitignored `dist/` | Ingress | — | the gates | n/a — but it is what makes the **derive** lane conditional |
| S22 | stdio itself — under MCP, stdout IS the protocol | Ingress | — | none | no (a stray print corrupts the session) |

Notes on three of these:

- **S11 (MCP) is the one surface already doing what ADR-0006 asks**: the
  tool shapes are derived from Effect Schema, never hand-written JSON
  Schema — confirmed live by booting the server and reading `tools/list`.
  What it lacks is a digest story about *itself*: the toolkit shape is not
  minted, so there is no digest an agent can pin the surface to. Two
  defects the boot exposed are F10 and F11. (Mounting: `.mcp.json` added
  by this census; previously the instructions lived only in a source
  comment, so an agent could not discover the surface from the repo.)
- **S12 (wasm) is not yet a general surface.** It takes no program — the
  pipeline is hardcoded (`wasmwall/main.go:48`). It is a wall fixture with
  a data boundary, and it becomes a surface when the program interpreter
  (ratified decision 2) lands.
- **S13's doc comment points at a stale path** (`../packages/mech/fixtures/`);
  the fixture actually lives at `fixtures/stream-wall.json`.

---

## 4. Decided but unbuilt

Each already has a decision or a design behind it; none has code.

| # | Surface | Decided in | Blocked on |
|---|---|---|---|
| U1 | **`Certificate`** as a minted schema `{schemaDigest, programDigest, inputAnchor, spanHead}` | ratified decision 4; CONTEXT.md | nothing — it is the keystone |
| U2 | Certified **OTLP bridge** + verifier wall (`src/otelBridge.ts`) | tracing memo §6 | U1, U14 |
| U3 | **Span id / Tracer** surface — digest-derived ids via `Tracer.make` (the pin types span ids as plain strings) | tracing memo §4 | U1 |
| U4 | **W3C propagation** — `traceparent` (16-byte trace / 8-byte span projections) + baggage | tracing memo §6 | U3 |
| U5 | **`gen_ai.*` attribute adapter** — derived, spec-version pinned (the pin still emits deprecated `gen_ai.system`) | ADR-0006; tracing memo §4 | U2 |
| U6 | MCP `preview_spans` tool | NEXT.md | U2 |
| U7 | **Program interpreter** — pipeline program as data, one encoding over wasm / NATS request-reply / CLI stdin | ADR-0003; ratified decision 2 | — |
| U8 | **NATS** — subject bindings, KV registry backing, agent protocol mapping | ratified decision 3; backlog 2 | protocol mapping page |
| U9 | **Arrow IPC writer** → DuckDB (Parquet is DuckDB's output, never ours) | NEXT.md | U1 |
| U10 | **Vercel AI SDK** adapter via `Schema.toStandardSchemaV1` | ADR-0006 | — |
| U11 | **Anthropic / JSON Schema** adapter via `effect/JsonSchema` | ADR-0006 | — |
| U12 | **`mintEffect`** + user-injected Layer surface (services satisfied by the user, verified against a pinned probe layer) | NEXT.md | conformance law |
| U13 | Registry persistence beyond memory | ratified decision 3 | U8 |
| U14 | **The journal** — load-bearing for domain and LLM traffic alike | ADR-0005 | see F7 |
| U15 | Go twin **codegen** (the derive lane) | NEXT.md; ADR-0006 | S21 toolchain |

---

## 5. Proposed — surfaces no prior document had named

| # | Surface | Why it is a surface | Standing state |
|---|---|---|---|
| P1 | **Clock / time** | A timestamp is not recomputable. It can never be *inside* a digest; it may only ride as pinned data. Certificates and spans both want times | absent — no clock read anywhere in `src/` or `go/` |
| P2 | **Assigned identity** (id generation) | In a lab whose thesis is "recomputed, not assigned," every assigned id is a fence boundary. `effect/unstable/ai/IdGenerator` is injectable; `OtlpTracer`'s id generation is **not**, and uses `Math.random` | **zero nondeterminism in the core today** — verified: no `Math.random`, `Date`, `time.`, or `rand.` in non-test source |
| P3 | **Config / environment** | `OTEL_EXPORTER_OTLP_*` is read by the pin's OTLP stack; port 3123 and the MCP `annotate` function are hardcoded | unfenced ingress |
| P4 | **Attestation export** | in-toto `agent-decision` predicate (#554) and C2PA are the interop targets for exporting a certificate outward | named in the tracing memo §5, no design |
| P5 | **Logs** ("span loggers") | ADR-0005 makes the journal the one lineage mechanism; a logger that carries lineage would be a second one. The boundary — what is a log vs what is a journal fact — is undecided | undecided |
| P6 | **Ingestion** | There is no way for outside events to enter: only in-process construction or a gzip frame. NATS, HTTP POST, and file/stdin readers are all absent | gap |
| P7 | **Versioning** | MCP protocol is pinned (`v2025_06_18`) and the server declares `0.1.0`, but the toolkit shape, the primitive catalog, and the refusal vocabulary have no version or digest. Minted schemas version themselves (a new shape is a new digest); the surfaces around them do not | gap |
| P8 | **IDE** | Named by the user; nothing exists. See §8 — open question, not an assumption |

---

## 6. Findings

**F1 — Two surfaces are ports, and they are the ones everything rests on.**
`src/stream.ts` and `src/xform.ts` are hand-written twins of the Go source.
ADR-0006 requires derivation; these predate it and are certified by one
frozen ASCII fixture. ADR-0007 records what that cost (the `MapValueUpper`
Unicode divergence, live and invisible for as long as the wall existed).
The in-flight Go work resolves that divergence by a route the verification
memo did not recommend: rather than narrowing both sides to ASCII, TS now
mirrors Go's *simple* rune case mapping, including the iota-subscript
expansions and `DecodeRune`'s one-byte replacement rule
(`src/xform.ts:107-127`, `go/stream/transform.go:65-80`). That is a wider
domain, honestly reached — but it is a second hand-written port of Unicode
semantics, which is exactly the shape ADR-0006 exists to stop. The domain
statement is owed either way.

**F2 — The HTTP surface is orphaned.** Three routes, no test, no law, and
it demonstrates the *pre-fence* architecture (merge/fork laws) with no
reference to the registry, the fence, or a digest an agent could resolve.
Under AGENT FIRST it can only be a projection, and it projects something
that is no longer the front of the lab.

**F3 — A skipping wall certifies nothing.** `test/wasm.wall.test.ts`
auto-skips without `dist/` — the observed run is "33 pass, 1 skip", and the
skip is the entire cross-runtime claim. The distinction between "green" and
"green minus the wasm wall" is currently invisible in the gate output.

**F4 — The seed namespace is a frozen, unenumerated surface.** Four
domain-separation constants plus caller-chosen seed names. Changing one
byte of any of them moves every digest downstream. Nothing lists them,
nothing tests that they are distinct, and no document says they are frozen.

**F5 — Determinism is currently total, and that is an asset with a
deadline.** Not one clock read or random draw exists in the non-test
source of either language. Every surface on the unbuilt list (U2, U3, U6,
U8) introduces one or both. The rule is cheapest to state now.

**F6 — The tool descriptions are the real agent interface, and they are
unfenced English.** Six hand-written strings decide whether an agent uses
the fence correctly. They are the one part of the agent surface with no
derivation, no law, and no digest.

**F7 — The journal does not exist.** ADR-0005 commits to it as the single
provenance mechanism; CONTEXT.md defines it; the tracing memo builds on it.
`src/` has no journal module — the nearest standing thing is the entity
collector's backing. U2, U6, and P4 all assume it.

**F8 — The certificate is the keystone and it is unbuilt.** U2, U6, U9,
P4, and every "certificate rides on the record" claim depend on it. The
tracing memo already recommends minting it before the bridge; this census
raises that from a recommendation to a dependency of five surfaces.

**F9 — Discoverability gaps.** No `.mcp.json` (S11); `cmd/streamfix`'s doc
comment named a path that does not exist (S13). Both small, both meaning an
agent reading the repo learns something false or nothing at all. Both
closed by this census.

**F10 — The agent surface admits what its own encoder refuses.** `WireEvent`
types `seq` as `Schema.Number` (`src/schema.ts:27`), so the derived tool
schema admits any JS number — the JSON Schema even carries an explicit
`"Infinity" | "-Infinity" | "NaN"` enum branch. But `checkedSeq`
(`src/stream.ts:59`) throws `RangeError` for anything that is not a safe
unsigned integer. Probed against the running surface, `seq` of `NaN`,
`Infinity`, `-1`, and `2^53` each produce a **defect** (`Die`), not the
typed refusal the module promises in its own header — "a law violation is a
tool result the agent can reason about, never a protocol error"
(`agentSurface.ts:9-11`). This is the ingress obligation (§2) failing
exactly where the adversarial matrix predicted: the Go domain (full u64) and
the TS domain (safe integers) differ, and the surface between them states
neither.

**CLOSED.** `seq` is now `Schema.Int` bounded to `[0, MAX_SAFE_INTEGER]`
with the domain stated on `WireEvent` (`src/schema.ts:24`). The domain
statement is executable, so the refusal happens at decode: probed over the
wire, `"NaN"`, `-1`, and `2^53` each return `-32602` naming the constraint
and the path `["events"][0]["seq"]`, and a valid `seq` still reaches the
handler. A surface must not admit what its own canonical encoder refuses.

**F11 — Every tool advertises itself as destructive.** All six carry the
effect defaults `readOnlyHint: false, destructiveHint: true,
idempotentHint: false, openWorldHint: true`. Four of them —
`resolve_digest`, `probe_transform`, `ontology`, `example_records` — are
pure reads over an in-memory registry. A client's permission UI reads these
annotations, so the surface told every agent that reading the ontology may
destroy something. In an AGENT FIRST lab the tool annotations are part of
the interface, not decoration.

**CLOSED.** The four reads now carry `readOnlyHint: true`; nothing is
destructive (minting is ADDITIVE and keyed by digest — the same declaration
mints to the same digest and leaves the registry in the same state, which is
also why everything is `idempotentHint: true`); the world is closed
(`src/agentSurface.ts:81`). Verified by reading `tools/list` off the running
server.

**F12 — NOT a finding: the tool-call "hang" was a harness artifact.**
Recorded because the miss is the useful part. Piping requests via
`printf | bun src/mcpMain.ts` produced responses for `initialize` and for
invalid parameters, but *nothing* for any valid `tools/call` — which reads
exactly like a broken dispatch path, and the committed baseline reproduced
it identically. It is the harness: closing stdin shuts the runtime down
before an async handler completes, so the synchronous validation path
answers and the asynchronous handler path does not. With a client that
holds the pipe open, the full chain works over the wire —
`example_records` → `mint_transform` → `probe_transform`, heads returned.
Same class as the no-sink `b.Loop()` row in the perf memo: measure the
harness before believing the result.

---

## 7. What this proposes (decisions NOT taken here)

1. **ADR candidate — the surface taxonomy.** Adopt the six kinds (§2) and
   the four obligations (§1) as a standing checklist: no surface lands
   without stating its source, law, digest story, and domain.
2. **ADR candidate — the determinism boundary.** No surface may introduce
   an assigned identifier or a clock read except as *injected data* that
   the digest commits to. Fences P1, P2, and pre-decides the `OtlpTracer`
   fork in the tracing memo §6.
3. **ADR candidate — HTTP surface disposition.** Either delete `server.ts`
   or rebuild it as a projection of the agent surface. Recommendation:
   rebuild later, delete the demo routes now — a surface with no law is a
   claim the lab does not make.
4. **Order of work implied by the census**: U1 (certificate) → U14
   (journal) → U2/U3 (bridge + span ids). Everything else queues behind.
5. **Debts still open**: enumerate and freeze the seed namespace (F4);
   make the wasm skip loud (F3); and give S11 a law — no test boots the
   MCP server and calls a tool, which is why F10 survived to be found by
   hand. The client written for F12 is the shape that test wants.
6. **Closed by this census**: `seq` bounded at the schema (F10), tool
   annotations corrected (F11), `.mcp.json` added and the `streamfix` doc
   path fixed (F9).

## 8. The IDE surface: a mount point, not a surface

Ratified 2026-08-12. Of the three readings — MCP-client mount, a
language-service that refuses unresolvable digests, or an editor that
authors mint calls — the answer is the first: **an IDE is an MCP client,
so the surface already exists and the work is discoverability, not
construction.** `.mcp.json` is therefore the whole deliverable, and the
census gains no new surface. The other two readings stay on the shelf with
their real prerequisites named: the language service wants registry
persistence (U13) before it can say anything across sessions, and the
codegen reading wants the program interpreter (U7).

The consequence worth stating: this makes the agent-first claim testable
today. An agent mounting foldlab gets the fence, and F10/F11 are what that
agent meets first.
