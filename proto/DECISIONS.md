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

## Ratified amendment implementation (2026-08-12)

### D30. Ref helper: `ref(digest, target = Schema.Unknown)`
Decided: the TS authoring helper returns a non-parametric
`Schema.declare` whose required `identifier` is the digest. Its
optional target is captured only by the Declaration's runtime predicate;
it does not become a type parameter or AST child. Codegen passes the
resolved compiled target, while a bare authoring ref defaults to
`Schema.Unknown`. Alternatives: an always-permissive
`ref(digest)` (loses resolved runtime validation); a parametric
Declaration carrying the target AST (the identifier would no longer be
the node's only canonicalizable substance). Why: this implements
amendment 1 literally while preserving the prior effect-schema target's
runtime validation when a catalog resolver is available.
**Load-bearing? maybe** — the AST identity shape is ratified; whether a
bare ref should validate anything is an authoring-DX choice.

### D31. Opaque compiles to `Schema.Unknown`
Decided: the effect-schema target for `{"k":"opaque"}` is
`Schema.Unknown`; refolding `Schema.Unknown` yields the opaque node.
Alternatives: `Schema.Any` (weakens the TypeScript side to `any`);
`Schema.Json` (a Declaration with its own representation and not an
honest inverse of the first-class node). Why: the transport boundary
already limits values to JSON, while `unknown` is the safe,
permissive TypeScript face and round-trips without another convention.
**Load-bearing? no.**

## Stateless type concierge (2026-08-12)

### D32. Concierge entry is idempotent root fill, not a planning verb
Decided: start with `type.fill` over root hole → root hole. There is no
`type.plan` and a hole is not advertised as a legal choice because it
would make no progress. Alternatives: a dedicated session/planning
request; client-only initial frontier. Why: the writ already has a
request verb and the fill operation can truthfully describe the bare
partial without creating server state. **Load-bearing? maybe** — the
wire remains stateless either way, but agents now rely on this entry
recipe.

### D33. Paths are string arrays over grammar child edges
Decided: root `[]`; list/brand `of`; check `base`; struct
`fields/<name>`; union `of/<canonical decimal index>`. Frontier order
is depth-first, with struct names in UTF-16 order and union positions
left in partial order. Alternatives: JSON Pointer; opaque hole ids;
integer union path components. Why: this is JSON-native, directly
mirrors the grammar, and makes C2's same-path inverse explicit without
inventing identity for holes. **Load-bearing? yes** — paths are wire
law and transcript data.

### D34. Frontier legal choices carry accepted minimal examples
Decided: each entry is `{path, legal:[{kind,example}], refs}`. Every
final grammar kind is offered because every type-node position accepts
every kind; compound examples contain a child hole, struct is empty,
and literal uses null. Ref is offered only when an existing digest can
make its example truthful. Alternatives: kind names only; a separate
kind-to-template table; context-specific rules. Why: an agent can take
the advertised value literally and C4 can test every choice as data.
**Load-bearing? yes** — this is the no-dead-end guarantee.

### D35. Frontier ref catalogs are sorted and capped at 16
Decided: advertise the lexicographically first 16 resolvable digests;
omit ref entirely when none exists. Alternatives: every digest;
recent-first; pagination. Why: replies stay bounded and deterministic
without pretending an unknown digest is fillable. **Load-bearing? no**
— pagination can replace the cap without changing fill semantics.

### D36. Partial unions preserve position; final unions normalize
Decided: the partial walk validates union members in submitted order
and permits duplicate holes; `type.create` alone recursively sorts
complete members by canonical UTF-8 bytes and refuses duplicates.
Alternatives: normalize after every step (moves paths); assign hole
ids (would let authoring placeholders bear identity). Why: C2 needs a
stable same-path inverse while catalog identity still needs the
ratified order-insensitive normal form. **Load-bearing? yes.**

### D37. Concierge fixtures are public request/reply pairs
Decided: `concierge.json` contains canonical fill/unfill requests and
their fact or refusal replies. Go replays them through a live NATS
daemon; TS independently re-canonicalizes both sides. Alternatives:
partial values only; duplicating cases in the old type fixture. Why:
the new seam includes frontier teaching and refusals, not just grammar
bytes. **Load-bearing? no.**

## Task 06 — fold algebra (2026-08-13)

### D38. Minimal algebra grammar: seven primitives plus product and mapped
Decided: v1 declares u32-modular `sum`, u32-modular `count`, nullable
finite-number `max`, nullable finite-number `min`, `any`, `all`, and
`setUnion` over unique Unicode strings sorted by UTF-16 code units;
the combinators are variadic `product` and `mapped`. `max`/`min` use
`null` as identity so every carrier has a real empty value. Alternatives:
sentinel infinities (outside JSON/JCS and misleading in fixtures); one
generic numeric monoid with parameters (would erase the distinct count
claim); JS `Set` state (no canonical JSON value). Why: this is the
smallest grammar that exercises closed additive, idempotent, Boolean,
unordered, product, and homomorphic folds. u32 wrapping keeps sum/count
closed and genuinely associative instead of pretending IEEE-754 addition
is a monoid. **Load-bearing? yes** — these spec objects
are digest preimages and a later Go twin must implement them exactly.

### D39. Step grammar is total over StreamEvent
Decided: declared v1 steps are `constOne`, `payloadLength`,
`sequenceNumber`, `payloadNonEmpty`, `streamSet`, and
`payloadNumber(path)`, plus derived `product` and `mapped` steps. A
payload-number path is an array of JSON object member names into a
strict-UTF-8 payload; malformed JSON, a missing/non-object path, a
non-number, non-finite number, or negative zero maps to `null` (the
max/min identity). Alternatives: throw or add an error carrier (would
make Fold partial); default to zero (would invent data); omit the path
step (would leave the ratified declared-field-path question unfixed).
Why: every declared step remains a total generator map while absence is
represented honestly. **Load-bearing? yes** — step specs enter fold
identity and define the future port's behavior.

### D40. The first homomorphism registry has one nontrivial member
Decided: v1 declares only `isPositiveFromMax : max(number|null) → any`,
mapping `null` to false and a number to `number > 0`. Alternatives:
product projections (useful but require a wider indexed hom grammar);
identity homomorphisms (too trivial to exercise the law); numeric sign
over sum (not a homomorphism). Why: `positive(max(a,b))` equals
`positive(a) || positive(b)`, so the registry starts with one honest,
nontrivial view and no speculative entries. **Load-bearing? yes** — the
hom spec and behavior are digested and law-tested.

### D41. Identity preimages commit declarations, never function bytes
Decided: every algebra, step, and hom spec is RFC 8785 encoded and
SHA-256 digested. A fold digest is SHA-256 over the RFC 8785 bytes of
`{v:"foldlab.fold.v1", algebra:<full algebra spec>,
stepDigest:<declared step digest>}`. Product and mapped specs recursively
carry their declared children. Anonymous behavior remains fully usable
but has no digest; cache access returns `IdentityUnavailable`. Alternatives:
hash `Function#toString` (not canonical); hash only child digests (less
inspectable); assign an identity to anonymous behavior (unverifiable).
Why: this follows ticket 014 literally: the monoid spec bytes and step
program digest are the identity preimage. **Load-bearing? yes** — every
cache key and future cross-language pin depends on this layout.

### D42. Fold fixtures live beside core and are a pin, not yet a wall
Decided: `packages/core/fixtures/fold-pin.json` records state plus fold
digest for all seven primitives over the event corpus already frozen by
`fixtures/stream-wall.json`; the provenance names TypeScript as the sole
generator and explicitly says "not a wall." Alternative: extend the Go
stream fixture now (would falsely imply a Go fold-algebra twin); mix pins
into the law test (would blur examples and identity evidence). Why: the
future Go twin gets one stable target without upgrading today's evidence
claim. **Load-bearing? no** — organization can move; provenance honesty
cannot.

### D43. The pinned Effect API derives fast-check arbitraries through Schema
At `effect@4.0.0-rc.108`, the exact API is
`Schema.toArbitrary(schema)(FastCheck)`; `effect/testing/FastCheck`
re-exports `fast-check`, and the pinned Effect package depends on
`fast-check@^4.9.0`. Task 06 adds exact `fast-check@4.9.0` as a core
devDependency. Decided: algebra values carry a small generator
declaration; a testing adapter interprets primitive declarations as
Effect Schemas and calls `Schema.toArbitrary`, while product generators
compose recursively. Declared StreamEvent inputs are likewise
Schema-derived. Generator descriptions do not enter algebra or fold
identity. Alternative: handwritten arbitrary values beside every test
(declarations and inputs could drift); import Effect into the pure algebra
(violates the ratified seam). Why: tests derive inputs from declared
structure while runtime algebra stays plain. Fast-check assertions leave
`endOnFailure:false`, and a negative control proves shrinking reaches the
minimized counterexample. **Load-bearing? no** — generator tuning may
change without moving runtime identity.

## Task 09 — JCS differential fuzz lane (2026-08-13)

### D44. Three minimized findings were reported before repair
The initial probes stopped on: `-0` (both implementations refused, while RFC
8785 Appendix B says `0`); `"\ud800"` (core TS refused while Go repaired it to
U+FFFD and accepted); and `{"":0,"":1}` (both parsers accepted the duplicate
name and kept the last value). These were reported as findings before any
canonicalizer change. The resumed task deliberately repairs them: negative
zero serializes to `0`, lone surrogates refuse, and duplicate names refuse
after escape decoding. Alternative: preserve the narrower pre-Task-09 domain;
rejected because it contradicts the RFC vector and leaves ambiguous inputs in
the identity preimage. **Load-bearing? yes** — all three change which byte
streams may name values.

### D45. Constrained decode is a public seam with one shared finite bound
Decided: both decoders require valid UTF-8, valid Unicode scalar strings,
unique object names after unescaping, finite IEEE-754 binary64 numbers,
exactly one JSON value, and at most 256 nested arrays/objects. TypeScript uses
a small recursive parser so duplicate names cannot disappear through
`JSON.parse`; Go combines a token walk (for duplicate detection) with raw
string-escape validation before `encoding/json` can repair invalid Unicode.
Alternative: scan only for duplicate-looking source text around the stock
parsers; rejected because `"a"` and `"\u0061"` are the same name and string
syntax is context-sensitive. The shared depth limit keeps adversarial input
from becoming an unbounded call-stack claim. **Load-bearing? yes** — decode
acceptance is part of canonical identity.

### D46. Differential probes are persistent and bidirectional
Decided: Bun's fast-check lane holds one `go run ./cmd/jcsprobe` process, and
Go's deterministic/native-fuzz lanes hold one Bun `jcs-probe.ts` process.
Every generated candidate and every fast-check shrink therefore executes both
real implementations; neither side compares against a port of the other.
Replies carry only acceptance plus canonical bytes, so error-message wording
does not become wire law. Alternatives: spawn once per candidate (too slow to
shrink usefully); precompute expected output (not differential); share one
implementation (would erase the wall). **Load-bearing? no** — process and
protocol organization can change while the byte comparison remains.

### D47. Bounded seeds and corpus are explicit
The normal Bun gate runs 160 generated JSON values at seed `0x09c50001` and
160 arbitrary byte streams at `0x09c50002`, with fast-check 4.9.0 shrinking
enabled (`endOnFailure: false`). The Go gate runs 160 deterministic cases from
PCG seeds `0x09c50003`/`0x09c50004`; its native fuzz target always replays 26
sharp corpus entries. The corpus covers ±(2^53) neighbors, `-0`, 1e21 and
1e-7/1e-6 boundaries, long mantissas, control characters, surrogate pairs,
lone escapes, duplicate/escape-equivalent keys, invalid UTF-8, trailing
values, and depths 128/257. RFC 8785 Appendix B's 26 published bit patterns
live separately in `fixtures/jcs-rfc8785.json` as the independent oracle.
Alternative: one undifferentiated random-byte generator; rejected because it
mostly generates trivial refusals and does not guarantee the known sharp
classes. **Load-bearing? no** — corpus growth strengthens the claim without
moving runtime identity.

### D48. Long fuzzing changes budget, not semantics
Decided: `FOLDLAB_JCS_FUZZ_RUNS` raises the Bun run count while retaining the
recorded seeds; Go uses its native `-fuzz`/`-fuzztime` controls and automatic
corpus minimization. Both commands are in the root README. A mismatch stops
immediately: fast-check reports minimized bytes, seed, path, and shrink count;
Go records its minimized fuzz input and the failure prints hex and base64.
Neither harness rewrites fixtures or patches implementations. Alternative:
an always-on unbounded CI fuzz job; rejected because the requested normal gate
is deterministic and bounded. **Load-bearing? no** — execution budget is an
operational choice.
