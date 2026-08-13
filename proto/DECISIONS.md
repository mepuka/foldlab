# proto/DECISIONS.md — every decision the spec did not fix

Format per entry: what was decided / alternatives / why /
**load-bearing?** yes | no | maybe (grill the yeses first).

## Wire and subjects

### D1. Subject scheme: `flb.req.<noun>.<verb>` + `flb.ing.<journal>`
Decided: three fixed request subjects (`flb.req.type.create`,
`flb.req.journal.read`, `flb.req.contract.describe`) and a wildcard
ingress prefix (`flb.ing.<journal>`). Alternatives: one request subject
with a `kind` field in the body; per-daemon subject prefixes.
Why: subject-per-kind gives NATS-native routing and lets the daemon
subscribe `flb.req.>` to answer unknown kinds with a typed refusal
instead of a client-side no-responder timeout. **Load-bearing? yes** —
the subject grammar is the federation surface; multi-daemon routing
will live or die on it.

### D2. Reads are a request kind, not JetStream consumption
Decided: `journal.read` is served by the daemon over request/reply;
clients never touch JetStream subjects or consumers. Alternatives:
direct JetStream fetch from the client (needs a JS-capable client lib
and exposes stream internals); NATS subscription tailing (spec
non-goal). Why: keeps the TS dependency to one core NATS client and
keeps journal shape private to the daemon (ADR-0009: the authority owns
its journals). Cost: reads poll and re-send from a cursor; live tailing
is future work. **Load-bearing? yes** — this decides what "READ" means
in the writ; if graduation wants JetStream mirrors for replicas, the
read verb grows a second face.

### D3. Unknown request subjects refuse; missing reply inboxes drop
Decided: `flb.req.>` catch-all answers unknown kinds with
`unknown-request`; a request with no reply inbox is dropped silently.
Alternatives: let unknown subjects time out (no responder); log-only.
Why: W8 — silence is the one thing a caller cannot reason about; but a
missing inbox has nowhere to send a refusal to. **Load-bearing? no.**

### D4. Substrate failure = no reply (timeout), never a fake refusal
Decided: if JetStream itself errors (store down mid-request), the
daemon drops the reply and the client times out into a local
`unreachable` refusal. Alternative: an `unavailable` refusal kind.
Why: a refusal is a LAW saying no; an internal error is not a law, and
dressing it as one would teach callers to "repair" against noise. The
journald sidecar chose the opposite (`unavailable` reason) — this is a
deliberate divergence. **Load-bearing? maybe** — revisit when a real
operator needs to distinguish "daemon sick" from "network gone".

### D5. Frame shape: `{"type","payload"}`, extra keys admitted as content
Decided: ingress requires a hex64 `type` claim; `payload` and any other
keys ride along into the canonical bytes. Alternatives: strict
two-key frames (refuse extras); envelope with metadata fields.
Why: the frame IS the event — the daemon's job at ingress is identity
resolution, not event-shape legislation (that is conformance, ratified
out of scope). **Load-bearing? maybe** — if certificates (ticket 005)
later ride ON frames, key collisions with domain content become a
migration hazard.

### D6. Publishing twice appends twice
Decided: no ingress-level dedup; identical frames admitted twice occupy
two positions (CAS msg-id dedup only guards racing appends at the same
position). Alternative: content-address dedup at ingress. Why: journals
are event logs; events legitimately repeat. Type creation converges
because the CATALOG is content-addressed — the asymmetry is the point.
**Load-bearing? no.**

### D7. Reads never create journals
Decided: reading a nonexistent journal refuses (`unknown-journal`);
only ingress brings a data journal into being. Alternative: open-on-read
(journal.Open creates streams). Why: "lag is absence" — a read must not
manufacture presence; also keeps read a pure verb. **Load-bearing? no.**

### D8. Read refusals: caller cursor failures are `bad-cursor`
Decided: journal.Read's ErrTampered under a caller-supplied cursor
surfaces as `bad-cursor` (the CLAIM failed), not as a
tampered-journal alarm; entries are never leaked alongside. Genuine
tamper and bad cursor are indistinguishable to the daemon here.
**Load-bearing? maybe** — a real operator wants tamper alarms
distinguished from caller error; that needs a daemon-side
genesis-anchored audit read, which exists in the substrate but has no
request kind yet.

## Identity and grammar

### D9. `struct.optional` must be sorted (UTF-16), unique, declared
Decided: the walk refuses unsorted/duplicated optional lists.
Alternatives: accept any order (identity would then depend on
declaration order — two same-shaped types with different digests);
canonicalize by sorting server-side (violates W2's "canonicalization is
RFC 8785 only" — the daemon must digest exactly what canonicalization
yields, and JCS does not sort arrays). Why: one shape, one digest.
**Load-bearing? yes** — this is a v0 GRAMMAR law invented here; ticket
004 must ratify or replace it, and the TS author fold already emits
sorted lists to comply.

### D10. Union member order moves identity
Decided: `union.of` is an ordered array; `[A,B] ≠ [B,A]`.
Alternative: canonical member ordering (sort by member digest). Why:
Effect unions are ordered (match order is semantic — anyOf tries in
order), and inventing an order-insensitive quotient now would prejudge
004. **Load-bearing? yes** — same-set unions with different digests is
exactly the kind of aliasing the catalog exists to prevent; 004 must
rule.

### D11. Check names are foldlab-owned, mapped from the pin by table
Decided: the author fold maps effect representation ids
(`effect/schema/isMinLength`) to owned names (`minLength`) via an
explicit table; unmapped or anonymous checks refuse (`beyond-v0`).
Alternatives: embed the effect id in the structure (identity would then
depend on the pin's strings — forbidden by 004's meta-principle);
accept any name unchecked on the Go side. Why: alignment of meaning,
independence of preimage. Note the asymmetry: the DAEMON accepts any
non-empty check name (args are declared metadata); only the AUTHOR FOLD
is table-restricted. **Load-bearing? yes** — the table is the real
check-vocabulary registry and currently lives in TS only.

### D12. `int` is a kind, not a check
Decided: `Schema.Int` (Number + isInt filter) folds to `{"k":"int"}`;
the isInt check is consumed by the kind and does not also appear as a
check node. Alternative: float + declared check "int". Why: the grammar
put int in the kind alphabet; double-encoding would create two digests
for one meaning. **Load-bearing? maybe** — 004's exhaustive fold must
pick one encoding and stick to it.

### D13. The `flb.ref` annotation is identity-bearing (the carve-out)
Decided: a compiled ref schema carries the target digest as annotation
`flb.ref`; the author fold checks it FIRST and emits
`{"k":"ref","digest"}` instead of folding the inlined target.
Alternatives: inline refs on derive (round-trip wall would break:
re-fold sees the target, digest moves); a wrapper class outside Schema
(loses composability). Why: without a marker, "ref" is unrepresentable
in Effect Schema and the round-trip wall cannot include ref types.
This contradicts the ratified "annotations never bear identity" with
one narrow, named exception — exactly the kind of decision this log
exists to surface. **Load-bearing? YES — grill this first.**

### D14. Brands wrap outermost-last; checks wrap inside brands
Decided: fold order is base → checks (declaration order) → brands
(declaration order, last brand outermost). Consequence: a v0 structure
with a check OUTSIDE a brand does not round-trip through the
effect-schema target (derives fine, re-folds to brand-outside-check).
The round-trip wall certifies its corpus (ADR-0007), which has no such
shape. Why: Effect attaches checks to the node and brands as
annotations — there is one physical order; inventing a normalization
now would prejudge 004. **Load-bearing? maybe** — 004 should either
normalize wrap order into the grammar or accept both as distinct types.

### D15. Literal numbers normalize by JCS
Decided: `{"k":"literal","value":10.0}` and `value:10` are one type
(JCS serializes both as `10`). No i64/f64 distinction inside literals.
**Load-bearing? no** (inherited from RFC 8785, worth stating).

## Catalog and journals

### D16. Journal names: `catalog` reserved; data journals client-named
Decided: the catalog journal is `catalog` (`J_catalog` stream);
ingress subjects name data journals freely within
`^[A-Za-z0-9_-]+$`. Alternatives: per-type journals keyed by digest;
one fixed `data` journal. Why: journal choice is a transport concern
the spec leaves open; client-named journals demonstrate
subject-addressing with zero extra machinery. **Load-bearing? maybe** —
federation will need journal ownership rules (which daemon is authority
for `flb.ing.foo`?); currently every daemon would happily own
everything it hears.

### D17. Catalog fact = `{digest, scheme, structure, submitter}`
Decided: the journal payload is the canonical bytes of exactly those
four fields; `structure` is stored as the canonical VALUE (not a
string). `submitter` is a free string from the request, defaulting "".
Alternatives: store submitted raw bytes; store canonical string
embedded. Why: ticket 002 resolution names {digest, encoding bytes,
submitter}; storing the value keeps the fact readable and re-derivable
(the wall recomputes digest from the structure field). Submitter is
unauthenticated by design — identity of AUTHORS is out of scope here.
**Load-bearing? maybe** — an unauthenticated submitter field will need
an owner once anything trusts it.

### D18. Resolve index: in-memory map, rebuilt by verified read at open
Decided: `digest → fact` map built from a verify-on-read pass over the
catalog at Acquire; updated in memory on create. Alternatives: KV
bucket; query-on-miss. Why: the catalog IS the journal (002); the index
is a pure fold over it, so rebuild-on-open is the only durable state
story needed. Proven by TestCatalogRebuildsFromStore. **Load-bearing?
no** (it is the obvious fold; size limits are far away).

### D19. Timeouts: client 15 s, Go conformance 20 s, harness ready 30 s
Windows CI is slow and nats-server shutdown can take seconds; refusals
are never expressed as timeouts (D4), so generous values only affect
genuinely-broken runs. **Load-bearing? no.**

## Contract and MCP

### D20. Contract shape: named requests + ingress + refusal, replies inline
Decided: `contract.describe` returns `{name, version, scheme, note,
requests:[{name, subject, note, body, reply}], ingress:{...},
refusal:...}` with every shape in flb.type.v0. Tool names come from
`requests[].name` / `ingress.name` (`type_create`, `journal_read`,
`contract_describe`, `publish`). Alternatives: self-catalog the
contract types and return refs (spec non-goal, deferred); JSON Schema
directly (would bypass the owned grammar). **Load-bearing? yes** — this
reply IS the derivation root for every MCP tool; its field names are
wire law the moment anyone else derives from it.

### D21. `flb.v0.opaque` brand for positions v0 cannot describe
Decided: a well-known brand marks "any JSON / any v0 structure"
positions in the contract (v0 has no recursion, so it cannot describe
its own grammar); the json-schema target renders it as `{}`
(permissive). Alternatives: a new `"k":"any"` kind (grows the ratified
grammar unilaterally — refused); describing `structure` as a closed
struct (would make MCP clients reject valid structures). Why: the
non-goal explicitly defers self-description; the brand is an honest
"beyond v0" marker inside v0. **Load-bearing? yes** — it is a
convention two codebases must share, and it leaks into every derived
tool schema.

### D22. MCP: effect/unstable/ai McpServer, tools via Tool.dynamic
Decided: use the pin's McpServer + Toolkit; each derived tool is
`Tool.dynamic(name, {parameters: <raw JSON Schema>})` — the documented
route for "MCP tools discovered at runtime". The MCP server is a
subprocess (`src/mcp-main.ts`) with a hand-built `Stdio` service over
process streams (the pin ships only a test layer; the platform layer
lives in @effect/platform-bun, which the spec's dependency budget
excludes). Verified workable at the pin: initialize / tools list /
tools call over NDJSON JSON-RPC pass against a live daemon.
Alternatives: hand-rolled JSON-RPC loop (fallback, not needed);
building Schema values via the effect-schema target and letting
McpServer derive JSON Schema (double derivation — the json-schema
target is the single source instead). **Load-bearing? maybe** —
unstable/ai may rename at any pin bump; the seam (toolsFromContract →
inputSchema) is pin-free and would survive a rewrite of the serving
layer.

### D23. Tool results carry daemon replies verbatim; refusals are not MCP errors
Decided: a tool call returns the daemon's fact or `{ok:false,refusal}`
as structured content; MCP protocol errors are reserved for transport
(bad params shape, unknown tool). Why: W8 across the MCP seam — an LLM
agent must SEE the refusal to self-repair from it. **Load-bearing?
yes** — this is the agent-facing half of "replies teach"; flip it and the
self-repair loop dies.

## TS side

### D24. NATS client: @nats-io/transport-node 3.4.0
Decided: the maintained v3 client family (`@nats-io/transport-node`,
which carries `@nats-io/nats-core`). Alternatives: legacy `nats@2.x`
(deprecated upstream in favor of the split packages); `nats.ws`
(wrong transport). Why: current upstream, plain TCP works under Bun,
core request/reply API only. One direct dependency as budgeted.
**Load-bearing? no** (the client surface used is 4 calls; swapping
libs is an afternoon).

### D25. Client surface is Promise-based; Effect is used for Schema
Decided: `ProtoClient` verbs are async functions returning
fact-or-refusal values; Effect appears in wire shapes
(Schema/decodeUnknownResult) and the MCP layer stack. Alternatives:
Effect-typed verbs (`Effect<Reply, never, ProtoClient>`) — richer, but
wraps a Promise-based NATS lib in ceremony the bullet does not spend
anywhere. Why: refusals-as-data is the law being proven; the effect
system is orthogonal to it here. Graduation to packages/client can
Effect-ify without touching the wire. **Load-bearing? maybe** — if
packages/client is meant to be Effect-native, this is a known rewrite,
not a drift.

### D26. TS canonicalization: JSON.stringify + UTF-16 key sort
Decided: ~30 lines in `src/jcs.ts`; scalar serialization delegates to
JSON.stringify (ES shortest-number form and minimal string escapes ARE
the JCS rules); objects sort keys by code unit. Numbers beyond float64
precision and non-finite refuse by throw inside canonicalize — wrapped
to refusal at every calling seam. Alternative: vendor a JCS lib (new
dep, against budget). Proven equal to go/canonical by the fixture wall.
**Load-bearing? no** — the wall carries the proof.

### D27. Go codegen target: comments carry what Go types cannot
Decided: unions/literals/refs/null render as `any` with a trailing
comment; optional fields are pointers with omitempty; verification is
re-parse via `gofmt -e` (spec: "verified by re-parse in the bullet").
**Load-bearing? no** — explicitly a sketch until the codec wall lands.

### D28. Fixture organization: three files by algebra
`types.json` (canonicalization+digest), `chains.json` (identity fold),
`frames.json` (ingress canonicalization). Generator refuses to
overwrite without `-force`. **Load-bearing? no.**

### D29. protod shutdown: stdin EOF or SIGINT
Decided: the binary serves until stdin closes (portable for Windows
test harnesses) or interrupt. Same pattern as journald's implicit
stdin lifetime, made explicit. **Load-bearing? no.**

## Pin findings (recorded for the next builder)

- At 4.0.0-rc.108, `ast.annotations` on a checked schema still carries
  `brands` and custom annotations DIRECTLY; `SchemaAST.resolve/
  resolveAt` resolve the LAST CHECK's annotations instead (inverse of
  the beta.107 quirk in root CLAUDE.md). The author fold reads
  `ast.annotations` directly.
- Filter metadata lives at `check.annotations.representation`
  (`{id, payload}`); payload field names differ per filter
  (`minLength`, `minimum`, `exclusiveMinimum`, `source/flags`).
- `Tool.dynamic` accepts raw JSON Schema parameters and skips
  validation — the handler receives `unknown`; the daemon remains the
  validator, which is exactly the bullet's trust model.
- Bun quirk: a script OUTSIDE a directory with node_modules will
  auto-install `effect@latest` (v3!) silently — run probes/tools from
  inside proto/ts or the pin is not what you think it is.
