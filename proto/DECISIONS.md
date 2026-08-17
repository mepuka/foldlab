# proto/DECISIONS.md — every decision the spec did not fix

Format per entry: what was decided / alternatives / why /
**load-bearing?** yes | no | maybe (grill the yeses first).

Scope, stated: this began as the tracer bullet's log and is now the
repository's decision log — entries from D38 on cover `packages/core`,
`go/canonical`, and the verification lane as well as `proto/`.

## Numbering rule (added 2026-08-13, after the D44–D48 collision)

D-numbers are repository-wide and assigned AT MERGE, never on a branch.
Two branches that both start numbering at the next free ID is exactly
how D44–D48 got double-assigned once; the renumbering parenthetical
under Task 09 is what that costs. So:

1. A branch writes entries under its own `## Task NN` heading with
   task-local placeholders (`D55`, `D56`, …). Whoever merges reads the
   last `### D` heading in this file, assigns the next free numbers,
   and records the renumbering in a parenthetical under the task
   heading.
2. One number, one decision, forever. Numbers are never reused, and
   never renumbered after merge — every outside reference would rot.
3. A decision a later ratification overrides KEEPS its number and gains
   a `SUPERSEDED BY` line naming what replaced it. Nothing is deleted:
   this file is history, not a spec.
4. A disposition of an earlier finding is a sub-entry titled
   `### D<n> disposition`, so it sorts with the decision it settles and
   consumes no number of its own.
5. D-numbers, map tickets (`docs/map/tickets/NNN`), ADRs
   (`docs/adr/NNNN`), and task numbers (`scratch/`) are four
   independent sequences that collide constantly at the same small
   integers. Always cite with the prefix — "D46", "ticket 014",
   "ADR-0010", "Task 09" — never as a bare number.

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
SUPERSEDED BY: `proto/SPEC.md` ratified amendment 2 — order never moves
identity in unordered collections; union members sort by canonical
bytes before digesting.
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
SUPERSEDED BY: `proto/SPEC.md` ratified amendment 1 — refs are
Declarations whose required identifier IS the digest. No `flb.ref`
string exists in code.
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
SUPERSEDED BY: `proto/SPEC.md` ratified amendment 3 — `{"k":"opaque"}`
is a first-class grammar node. No `flb.v0.opaque` string exists in
code, and its mid-name version position was never repeated.
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
SUPERSEDED IN PART BY: Issues #52–#54 — daemon refusals and non-read facts remain
verbatim, while `journal_read` exposes the `ProtoClient.read` verified fact
rather than forwarding the daemon's unverified head claim.
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
**SUPERSEDED BY Issue 31's strict structure JCS closure below.**

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

## Issue 44 — service-lifetime finding (2026-08-13)

### D?? FINDING: the explicit service-mode name is not ratified

Decided: preserve D29 as the default and stop before adding a public flag.
The real binary exits cleanly immediately after its ready line when stdin is
already EOF; that behavior is now process-tested as D29's negative control.
The missing capability is a second, explicit foreground service lifetime that
ignores stdin EOF and stops on context cancellation or an operating-system
interrupt. Recommendation for the required grill: name it `--serve` and state
explicitly that it does not daemonize. Alternatives: `--detach` (short, but
conventionally promises fork/reparent/stdio behavior this process will not
provide); `--no-stdin-shutdown` (mechanically precise, user-intent opaque);
silently change the default (breaks the Windows harness shutdown contract).
Why: D29 ratifies only the default, the branch-only DX dossier proposes
`--detach` or `--no-stdin-shutdown`, and issue #44 proposes `--detach` or
`--serve`; no authority selects among them. **Load-bearing? yes** — the chosen
name is a public CLI contract and determines what service managers may infer.

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

## Task 07 — property-test retrofit (2026-08-13)

### D44. Inventory and classification before retrofit
Inventory completed before test edits. The hand-rolled/randomized or
non-fixture law suites eligible for fast-check are:

1. `packages/core/test/stream.property.test.ts`: canonical-frame
   inversion and transform fusion each use a 10,000-case xorshift loop.
2. `packages/core/test/entity.test.ts`: EC1–EC4 run the laws over one
   hand-built mixed history.
3. `packages/core/test/fold.cache.test.ts`: cache-hit equality runs over
   one hand-built history.
4. `packages/core/test/fold.bindings.test.ts`: rechunk invariance uses a
   hand-built history and three manually enumerated chunk sizes.
5. `proto/ts/test/concierge.test.ts`: C1–C5 use constant requests,
   hand-built partial/subtree matrices, and manually generated reachable
   partials.

`packages/core/test/fold.laws.test.ts` is already fast-check-based from
Task 06 and needs no retrofit. Excluded deliberately: every `*.wall.test.ts`,
`schema.wall.test.ts`, `stream.bindings.test.ts` (its inputs and expected
heads are the frozen Go pin), `fold.fixture.test.ts`, proto round-trip and
wire fixture walls, and the fixed malformed-input/exhaustive byte or rune
enumerations in `stream.property.test.ts`. Alternatives: convert every loop
or table mechanically (would replace exhaustive/frozen evidence with
sampling); limit the inventory to code containing a PRNG (would leave EC,
cache, rechunk, and C1–C5 without shrinking). **Load-bearing? no** — this is
test organization, but the evidence-strength classification is binding for
this task.

### D45. Baseline domains and recorded seeds
Decided: each retrofit first uses the exact old domain, with all old fixed
cases retained as fast-check `examples` where sampling could miss one.
Recorded seeds: stream frame inversion `0x5eed1234`; transform fusion
`0x00c0ffee`; entity EC1–EC4 `0x07ec0001` through `0x07ec0004`; cache
`0x07ca0001`; rechunk `0x07fb0001`; concierge C1–C5 `0x07c10001` through
`0x07c50001`. `endOnFailure:false` remains explicit so counterexamples
shrink. Effect Schema `Schema.toArbitrary(schema)(FastCheck)` derives
StreamEvent-shaped carriers; grammar-aware partial-type generation remains
hand-declared because flb.type.v0 partials have no Effect Schema declaration
and recursive hole placement is the property under test. Alternatives:
unrecorded default seeds; one global arbitrary divorced from each law's old
domain. **Load-bearing? no** — seeds may move only with a stated reason and
captured replay path.

### D46. Widening found a hole-bearing union that Go codegen accepts
The exact pre-retrofit domains passed first, followed by the widened
stream, entity, cache, rechunk, and concierge C1–C4 domains. Concierge
C5 then failed at seed `0x07c50001` after six cases and shrank once
(`path: "5:1"`) to:

```json
{"partial":{"k":"union","of":[{"k":"hole"}]},"path":["of","0"]}
```

`toEffectSchema` and `toJsonSchema` both return `underivable` at
`structure/of/0/k`; `toGoSource` instead returns success and emits
`type Hole any // union`. This violates C5's existing statement that
holes never bear identity or enter derived artifacts. Decided: preserve
the shrunk case in the widened property and stop without changing
codegen, as Task 07 requires for a widened-domain finding. No fixture or
Go source was changed. Replay with
`cd proto/ts && bun test test/concierge.test.ts`. **Load-bearing? yes** —
the disposition must decide whether Go union derivation propagates an
`underivable` child or whether the C5/codegen contract is intentionally
narrower than stated before implementation resumes.

### D46 disposition (2026-08-13, operator-ratified)
Fix plus generalized law. `toGoSource` must refuse hole-bearing
structures (`underivable` at the hole's path, the same refusal shape as
the other targets) — sketch status licenses imprecision about legal
inputs, never admission of illegal ones. The wall factory gains the
generalized law this finding exposes: CROSS-TARGET DERIVABILITY
CONSISTENCY — for any structure, every derivation target agrees
(all derive, or all refuse at the same path), generated as a property
over all current and future targets. The shrunk counterexample becomes
a permanent regression case; the red C5 property stays red until the
fix lands. Execution: scratch/codex/14-d46-fix.md.

## Task 14 — D46 fix and cross-target law (2026-08-13)

### D47. A sketch target still validates every child before sketching
Decided: Go unions remain represented as `any // union`, but
`toGoType` first visits every union member in index order and propagates
the first `underivable` refusal. Alternatives: teach the sketch a full
sum representation (outside the bullet's promise); pre-scan the whole
tree separately (duplicates each target's recursive walk). Why: sketch
status licenses an imprecise representation only after the input has
been shown derivable. The permanent D46 regression asserts that all
three public targets return byte-shape-identical refusals at
`structure/of/0/k`. The unchanged concierge C5 file hash is
`8fa874a427b7e4d0b28c666476da9351e5357c1c`; its red property went green
with only this production change. No Go-side source or fixture changed.
**Load-bearing? yes** — every future sketch target must recursively
validate children it does not represent precisely.

### D48. The generalized law found target-dependent struct traversal
The new target-list law, CROSS-TARGET DERIVABILITY CONSISTENCY, covers
all current node forms, resolvable refs, nested and multiple holes, and
quantifies every pair of targets from one list. At seed `0x14d46001` it
failed after 113 cases and shrank once (`path: "112:1"`) to:

```json
{"k":"struct","fields":{"β":{"k":"hole"},"a":{"k":"hole"}},"optional":[]}
```

Effect Schema derivation walks insertion order and refuses at
`structure/fields/β/k`; JSON Schema and Go sort field names and refuse
at `structure/fields/a/k`. All agree that derivation refuses, but not at
the same path, violating the newly ratified law. Decided: preserve the
red generalized property and stop without normalizing traversal until
this finding is dispositioned, following Task 07's widened-domain rule.
Replay with `cd proto/ts && bun test test/codegen.test.ts`.
**Load-bearing? yes** — refusal paths cannot depend on a JavaScript
object's construction history if they are cross-target evidence.

### D48 disposition (2026-08-13, operator-ratified)
Canonical-order traversal. Every derivation target walks object fields
in THE canonical key order — RFC 8785's UTF-16 code-unit sort, the
same order identity's bytes use — so "first refusal path" is
well-defined and construction history never leaks into evidence. One
ordering law for identity and evidence. The Effect Schema target
changes to match; the fix must verify the sorting targets use UTF-16
code-unit order, not locale sort. Expected on the shrunk case: all
targets refuse at structure/fields/a/k. The red generalized property
stays red until the fix lands, unchanged. Future enhancement, separate
ratification (wire-shape change): refusals carrying the complete set
of underivable paths. Execution: scratch/codex/15-d48-canonical-traversal.md.

## Task 15 — canonical traversal in every derivation target (2026-08-13)

### D49. One field-name traversal orders every derivation target
Decided: Effect Schema, JSON Schema, and Go struct derivation all call
`fieldNamesInIdentityOrder`, which uses JavaScript's default string sort:
RFC 8785 UTF-16 code-unit order. Alternatives: change only the Effect
Schema loop and leave duplicated target-local sorts (permits future drift);
use `localeCompare` (locale-dependent and not identity order); collect every
failure path (the separately ratified future wire-shape change from D48).
Why: the same operation now defines output order and the first refusal path
for every target, and future targets have one traversal seam to join. The
unchanged cross-target property passes; permanent probes pin the exact D48
`β`/`a` counterexample and the ordering `a < β < U+10FFFF`, using the
surrogate pair from `fixtures/golden-conformance.json`'s string-escape
corpus. No fixture changed. **Load-bearing? yes** — a new target that walks
fields elsewhere can reintroduce construction history into evidence.

## Task 09 — JCS differential fuzz lane (2026-08-13)

(Entries renumbered D50–D54 at merge: the task-09 branch diverged
early and reused D44–D48, which the retrofit lane had already
assigned. Content unchanged.)

### D50. Three minimized findings were reported before repair
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

### D51. Constrained decode is a public seam with one shared finite bound
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

### D52. Differential probes are persistent and bidirectional
Decided: Bun's fast-check lane holds one `go run ./cmd/jcsprobe` process, and
Go's deterministic/native-fuzz lanes hold one Bun `jcs-probe.ts` process.
Every generated candidate and every fast-check shrink therefore executes both
real implementations; neither side compares against a port of the other.
Replies carry only acceptance plus canonical bytes, so error-message wording
does not become wire law. Alternatives: spawn once per candidate (too slow to
shrink usefully); precompute expected output (not differential); share one
implementation (would erase the wall). **Load-bearing? no** — process and
protocol organization can change while the byte comparison remains.

### D53. Bounded seeds and corpus are explicit
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

### D54. Long fuzzing changes budget, not semantics
Decided: `FOLDLAB_JCS_FUZZ_RUNS` raises the Bun run count while retaining the
recorded seeds; Go uses its native `-fuzz`/`-fuzztime` controls and automatic
corpus minimization. Both commands are in the root README. A mismatch stops
immediately: fast-check reports minimized bytes, seed, path, and shrink count;
Go records its minimized fuzz input and the failure prints hex and base64.
Neither harness rewrites fixtures or patches implementations. Alternative:
an always-on unbounded CI fuzz job; rejected because the requested normal gate
is deterministic and bounded. **Load-bearing? no** — execution budget is an
operational choice.

## Task 16 — substrate assumption gate and certified envelope (2026-08-13)

### D55. Cross-cutting substrate laws live in `go/substrate`
Decided: the four JetStream assumptions get a test-only package at
`go/substrate/assumptions_test.go`, below both journal and effector rather than
being folded into either module's own law table. The common harness always
starts one embedded, file-backed, non-clustered server; the create race has 32
contenders, stale CAS is retried 16 times, and the read-after-ack hammer runs 8
writers for 64 acknowledged writes each. Alternatives: duplicate the laws in
`journal` and `effector`; place all four in `effector` even though three are raw
KV properties; use an unbounded stress duration. Why: one pin-bump gate should
name each external assumption once, and fixed bounds keep the normal gate
deterministic while exercising genuine concurrency. **Load-bearing? no** — the
package seam is organizational and the bounds may grow without changing the
law.

### D56. Finding: administrative delete and purge erase `Done` undetectably
The first terminal-immutability law run against pinned nats-server v2.14.4 and
nats.go v1.53.1 failed for both KV `Delete` and `Purge`. Minimized repro: open
the current effector bucket, claim and commit one digest, perform the
administrative operation with `LastRevision(doneRevision)`, then call
`Lookup` and `Claim`. Both operations succeed; the next KV read is
`ErrKeyNotFound` (not `ErrKeyDeleted`), effector `Lookup` returns `Unclaimed`
without error, and a replacement claim succeeds at fence 1. Exact replay:
`cd go && go test ./substrate -run '^TestTerminalImmutability$' -count=1 -v`.
Decided: preserve the red executable repro and stop Task 16 before implementing
the certified-envelope change or any production workaround, as the ticket's
findings-before-fixes rule requires. Alternatives deliberately not taken:
treat absence of destructive methods on `Effector` as immutability; make the
test accept `ErrKeyNotFound`; patch `Claim` around the erased key. Why: all
three would conceal that a principal with KV administration can reopen a
terminal decision. **Load-bearing? yes** — this falsifies one of the four
substrate assumptions beneath the effector safety claim and requires operator
disposition before implementation may resume.

### D56 disposition
Operator-ratified layered enforcement. The terminal law flips from the red
admin repro to the boundary the current proof can honestly require:
application credentials cannot publish to register-bucket subjects, while a
privileged admin `Delete`/`Purge` remains in the same test as a successful
negative control that proves the underlying substrate still permits erasure.
For embedded `DontListen` use, the trusted-base clause is executable: the gate
recursively parses production `go/effector`, the `go/daemon` graduation target,
and `proto/go/protod`, and fails on KV or stream delete/purge call sites.
Alternatives: make the admin repro green by calling erasure "detected" (false
today); change the register protocol inside Task 16 (would patch around the
finding); claim NATS permissions distinguish KV Put from Delete/Purge (they
cannot, because both publish to the same `$KV.<bucket>.<key>` subject). Why:
applications use the daemon writ and need no direct register access, so denying
the whole register subject family is an enforceable capability boundary; admin
resurrection detection belongs to
[ticket 017](../docs/map/tickets/017-done-outlives-the-register.md).
**Load-bearing? yes** — unique terminal outcome is conditional on this boundary
until ticket 017 adds independent evidence.

### D57. Lifecycle refusal is one typed error with stable assumption names
Decided: `Acquire` accepts three explicit zero-safe configuration facts on its
existing `Options` interface (`JetStreamClustered`, `KVReplicas`,
`MemoryStorage`) and refuses before server startup with `*LifecycleError`.
The error unwraps to `ErrOutsideCertifiedEnvelope` and carries both the exact
configuration and an `Assumption`: clustered JetStream and R>1 KV map to
`linearizable-reads`; memory storage maps to `terminal-immutability`.
`KVReplicas` zero means the existing/default R1 shape and one is explicit R1;
only values above one are this ticket's refusal. Alternatives: expose raw
`server.Options`/`KeyValueConfig` (a shallow pass-through interface); return
untyped strings; start the server and inspect it after resources exist. Why:
the daemon remains a deep lifecycle module, callers can branch on a stable law
name, and unsupported configuration acquires nothing. **Load-bearing? yes** —
the refusal is what prevents a proof from silently escaping its envelope.

### D58. External clients are one restricted application credential class

SUPERSEDED BY: GitHub issue #56's private-account decision and Task 19's
per-acquisition listener credential below. The public writ and ephemeral
internal credential remain in force; applications neither share the global
account nor connect anonymously.

Decided: protod's anonymous client connection maps through `NoAuthUser` to an
`application` user allowed to publish only `flb.req.>` / `flb.ing.>` and
subscribe only to `_INBOX.>`; the daemon's in-process connection authenticates
as `protod-internal` with a fresh random 256-bit password generated on every
`Acquire`. Alternatives: static internal credentials (public source makes them
application credentials too); let applications use JetStream/KV directly and
attempt header-level deletion denial (NATS permissions are subject-based, so
that cannot distinguish CAS writes from tombstones); remove the real loopback
listener (breaks the tracer seam). Why: the permission shape is exactly the
three-verb writ and denies every direct `$KV.E_>` and `$JS.API.>` route without
adding a second client surface. Existing black-box conformance still connects
without credentials and passes. **Load-bearing? yes** — this is the enforced
half of the terminal-immutability disposition.

## Task 17 — catalog R4 lockstep conformance (2026-08-13)

Harness-local decisions D1–D11 live in `verify/catalog/R4-DECISIONS.md`
(the task's decisions-encountered log). This entry records the one
repo-wide decision at merge.

### D59. R4 is claimed against a coarsened, TLC-bridged wire refinement map

Decided: the public conformance claim for the catalog is "R4 against the
coarsened wire refinement (CreateAtomic); the split-CAS branch's
conformance is ticket 012's obligation." `CatalogWire.tla` defines
CreateAtomic and TLC checks (`AtomicRefinement`) that every atomic step
is an uninterrupted legal Begin;Finish pair or the resolving Begin's
stutter, so the split model's R3 safety transfers to the map actually
drivable at the wire. The proved split actions in `Catalog.tla` are
retained untouched (they cover the future multi-handler deployment);
R4-FINDING-001 and its regression test remain red evidence. Alternatives:
a test-only interposition seam in protod (the seam-enabled build is not
the shipped binary); building multi-handler concurrency to satisfy a
harness (inverted priorities); silently treating the fresh wire check as
the earlier Begin snapshot (a false replay). Why: the shipped wire
request really is atomic; the claim must name the map it was earned
against. Details and sub-decisions: R4-DECISIONS D9–D11.
**Load-bearing? yes** — every consumer of the R4 claim inherits exactly
this map and no more.

## Issues #52–#54 — client-read and MCP verification integrity (2026-08-13)

### D??. Every caller cursor is admitted through stored journal evidence

Decided: `Journal.Read` accepts genesis only as
`{seq:-1, head:GENESIS}` and accepts every non-genesis cursor only when the
stored entry at that exact position passes the same position, canonical-byte,
and digest verifier used by tail adoption and suffix reads. This subsumes the
narrow #34 candidate's safety outcome: an unissued observation cannot enter
the writer cursor, while a genuine stored cursor still supports empty-tail and
resume reads. Alternatives: reject every empty suffix in the client (also
rejects honest tail reads); remember cursors only inside one client process
(cannot verify persisted cursors); port #34's separation alone (prevents writer
poisoning but still lets the daemon and client call fabricated evidence
verified). Why: the journal is the authority that can inspect the claimed
anchor, and the public client must receive a refusal before it can rename
caller input. **Load-bearing? yes** — W6 requires every returned verified
cursor to have stored evidence.

### D??. Read verification binds chain evidence to the requested journal

Decided: after decoding a read fact and before folding entries,
`ProtoClient.read` requires the returned journal to match
`^[A-Za-z0-9_-]+$` and equal the exact requested journal. Either mismatch is a
local `verify-failed` refusal at `journal`. Alternatives: rely on the daemon's
request validation (does not constrain a substituted reply); treat a
well-linked chain as journal-independent proof (the exploit); classify the
reply as merely malformed (loses the fact that its shape decoded but its claim
failed). Why: chain linkage proves history bytes, not the authority name to
which those bytes are attributed. **Load-bearing? yes** — without this bind a
valid chain for B is accepted as a verified read of A.

### D??. MCP classifies the contract's journal subject as the READ verb

Decided: contract derivation marks the request whose subject is
`flb.req.journal.read` as `read`; valid tool arguments decode through an Effect
Schema and dispatch to `ProtoClient.read`. The MCP result retains the existing
flat `{ok:true,...}` convention but replaces raw `seq`/`head` claims with the
client's `verified` cursor. Invalid tool arguments retain the generic request
path so the daemon remains the source of its typed malformed refusal.
Alternatives: keep `Schema.Unknown` request dispatch (bypasses W6); duplicate
the chain fold in MCP (a second verifier that can drift); hand-author a tool
outside `contract.describe` (breaks the derived-surface law). Why: MCP composes
the three-verb writ and must add no weaker fourth face. **Load-bearing? yes** —
agents otherwise consume the one read path that skips the repository's
headline verification guarantee.

### D??. A request timeout reports observation, not an invented remote cause

Decided: the existing local `unreachable` kind remains for compatibility, but
its law now states only that no reply arrived before the client deadline and
explicitly says that evidence does not distinguish network failure from a
reachable daemon's silence. Alternatives: add `remote-silent` (the client has
no independent witness); probe another subject and infer daemon intent (a
different request does not explain this one); keep saying absence is purely a
local condition (the false #52 label). Why: refusal text must not assert a
cause the boundary cannot observe. **Load-bearing? maybe** — a future
transport acknowledgement or daemon operation id could license a distinct
remote-silence fact.

### D??. Corrupted read replies use a transport-real, verifier-independent control

Decided: `proto/go/internal/readreplyserver` serves caller-selected replies
over a real NATS connection for the TypeScript negative controls, while the
honest controls continue to spawn real protod. The responder contains no chain
or journal validation logic. Alternatives: mock `ProtoClient.request` (tests
an implementation detail); sabotage the production daemon (adds a forbidden
runtime path); assert only honest daemon output (a verifier that cannot fail).
Why: valid-other-journal and invalid-journal substitutions must reach the
public `ProtoClient.read` seam without sharing its oracle. **Load-bearing? no**
— the harness may move while the two corrupted-reply controls remain.

## Task 23 — cross-language identity-domain closure (2026-08-13)

Entries prepared in go/canonical/probes/FINDING.md (the task's evidence
home) with placeholders; numbered D60-D62 at merge per the header rule.

### D60. Every stored journal head is verified before cursor adoption

Decided: `Open`, verified `Read`, and conflict recovery use one stored-entry
verification path before changing a journal cursor. A losing append still
returns `ErrConflict` once, but may heal its handle only by adopting a tail
whose position and canonical wire-byte digest verify. Alternatives: leave
resync to callers; adopt the broker tail without verification; give each path
its own verifier. Why: the writer must not inherit a weaker tamper-evidence law
than the reader, and one verifier prevents the law from drifting between
resume and recovery. **Load-bearing? yes.**

### D61. Chain-entry identity refuses invalid Unicode in both runtimes

Decided: chain-entry identity never substitutes a replacement scalar or mints
an identity outside the canonical Unicode and safe-unsigned sequence domains.
The Go `EntryDigest` and
`BuildChain` APIs return typed errors and every caller propagates or handles
them; the TypeScript chain-entry identity lane refuses lone surrogates and
invalid runtime numbers as data; a shared refusal vector proves both domains
agree, including the accepted `2^53-1` edge. Alternatives: panic; return a
sentinel digest; add a checked twin while retaining the unsafe export; fix only
one runtime. Why: all four alternatives leave either an untyped failure, an
identity collision, or a cross-language domain mismatch. **Load-bearing? yes.**

### D62. Merge replay refuses duplicate source sequence coordinates

Decided: each source supplied to `ApplyMerge` / `applyMerge` must contain at
most one event for each sequence coordinate. Both runtimes refuse duplicates
before resolving picks with a typed `MergeDuplicateSequence` carrying the
source, sequence, and both event indexes; one frozen vector licenses the shared
boundary. Unique sparse coordinates remain valid. Alternatives: first-write-
wins; last-write-wins; require all sources to be dense; validate only events
referenced by the merge fact. Why: either winner policy makes an identity
coordinate ambiguous, a density rule rejects lawful sparse sources, and
pick-only validation lets an invalid supplied source change admissibility with
an unrelated fact. **Load-bearing? yes.**
## Task 22 — the TS refusal-domain wall (2026-08-13)

The batch's original four applications consolidated to the parallel
review team's fixes at merge time (C1 045616863; A1/A2 f1434c991;
J1/S1 243caeb54; M1 re-homed to task 23, D62). What this lane owns is
recorded here.

### D63. packages/core names total-by-refusal as its boundary law

Decided: the package's CONTEXT.md states the walled-boundary law: the
canonical encoder and applyKV refuse excluded inputs as data; the four
algebra gates withhold identity from unbranded values; fold-cache
storage and fold handles reject structural costumes; kvStep reports
exclusion as `undefined`, which the entity collector deliberately
FORGIVES as a meaning no-op while the identity fold commits the bytes.
Stated non-claims: the genuine-declaration re-hosting residual (pinned
as a KNOWN GAP test, reaching the digest-keyed cache) and no
package-wide error-channel migration. Adversarial generators target
each boundary and assert typed refusal, never mere no-crash.
Alternatives: leave the law implicit in tests; claim refusal
everywhere (falsified by the ratified forgive-on-meaning design). Why:
a boundary law that names its residuals is the only one a consumer
can rely on. This explicitly supersedes the short-lived universal “Total by
refusal” wording: the forgive-on-meaning path, documented range errors, and
pinned re-hosting gap make that universal statement false. **Load-bearing?
yes.**

### D64. Fold and cache identity require brand-admitted declarations

Decided: foldIdentity derives only when BOTH the algebra's and step's
declarations pass `hasAdmittedDeclaration` (the module-private brand
check); fold handles register in a module-private WeakSet and the
fold cache accepts only admitted folds, so a structural costume can
neither mint a fold identity nor poison the digest-keyed cache. The
brand check authenticates module-minted declaration DATA and
deliberately certifies nothing about carrier behavior — the
re-hosting residual remains pinned, not silently claimed closed.
Alternatives: trust `declaration !== undefined` (the A2 defect shape
at the cache seam); brand the Algebra/Step value itself (deferred
with the review team's KNOWN GAP reasoning — no cross-process
consumer builds on the brand yet). Why: every certification path
admits via the same check, including the cache. **Load-bearing? yes.**

## Task 24 — gate self-enforcement (2026-08-13)

### D65. Response branches carry directed reply-only mutants; gates assert their own canaries

Decided: every public response branch of the R4 harness (created,
converged, admitted, refused) has a build-tagged mutant that changes
ONLY the reply shape, and the ordered gate must catch each before any
honest count; the comparator decodes replies strictly (a missing or
mistyped field is a divergence, never a default). run-r4 executes the
coverage-assertion test itself, and run.sh compares the cap2 canary's
generated/distinct/depth numbers against the recorded values instead
of only the clean verdict — evidence shrinkage now fails the
advertised command. Alternatives: trust the repository test gate to
catch shrinkage (the advertised standalone command then lies);
mutate state instead of replies (already covered; misses the
reply-only class the audit proved survivable). Why: a comparator that
defaults a missing field to the expected value is a prover that
cannot fail on that field. **Load-bearing? yes.**

## Issue 40 — contract-derived MCP tool annotations (2026-08-13)

### D66. Optimistic MCP annotations are a closed law-backed allow-list

Decided: `contract_describe` and `journal_read` advertise read-only and
non-destructive; `type_create` (W3) and `type_fill`/`type_unfill` (C1)
advertise non-destructive and idempotent because repeated calls converge
without an additional state effect. `publish`, and any future request name
not explicitly licensed by a module law, advertise the conservative mutation
class: destructive and non-idempotent. Read-only tools do not also claim
idempotence: the MCP hint is defined for non-read-only tools, and a journal
read's result can truthfully change as appends arrive. `openWorldHint` remains
the pinned framework default because issue 40 did not ratify that independent
dimension. Alternatives: infer optimism from request versus publish alone
(would misclassify future mutations); mirror Effect's framework defaults
(reported every tool as destructive); mark every pure handler read-only
(confuses absence of local state with absence of daemon mutation). Why: only
semantic laws license optimistic safety hints, while the closed fallback keeps
new contract growth safe until it is classified. **Load-bearing? yes** — MCP
clients use these hints when choosing and approving tool calls.

## Issue 41 companions — MCP repair namespace and path provenance (2026-08-13)

### D??. NATS subject-to-MCP tool mapping rides in tool metadata

Decided: every contract-derived MCP tool carries its NATS subject as
`_meta["foldlab.dev/nats-subject"]`. The mapping comes from the same
`contract.describe` entry as the tool name and input schema, and rc.108's
`Tool.Meta` passes it structurally through `tools/list`. Daemon replies remain
verbatim under D23. Alternatives: parse the subject suffix or prose tool
description (not a structural contract); rewrite every `next[].subject` into an
MCP name (violates D23 and creates an MCP refusal dialect); change the daemon to
speak MCP names (leaks an adapter namespace into the wire contract). Why: W7's
repair hint can now be resolved mechanically without changing the authority
that uttered it. **Load-bearing? yes** — this is the cross-namespace repair
bridge.

### D??. FINDING: fill refusal paths name the reconstructed partial, not the request body

Decided: preserve and stop on `FINDING-MCP-PATH-001`. A digest submitted at
`subtree/fields/currency/digest` is publicly reported by MCP at
`partial/fields/currency/digest`, because the daemon walks the reconstructed
partial after replacement and has discarded request-field provenance. The MCP
reply equals the direct client reply, so adapter translation would violate D23;
the frozen concierge fixture pins the existing reconstructed-partial path, so a
daemon repair requires an explicit wire/fixture ratification. Alternatives and
the opt-in red command are recorded in `ts/FINDING-MCP-PATH-001.md`. Why: silently
choosing either path dialect would redefine public evidence semantics.
**Load-bearing? yes** — mechanical self-repair depends on knowing which submitted
field a refusal path addresses.

### D??. FINDING: empty-catalog fill overwrites unknown-ref resolver hints

Decided: preserve and stop on `FINDING-MCP-EMPTY-CATALOG-001`. The lower-level
unknown-ref refusal constructs create/retry/catalog-read hints, but `teachFill`
and `teachUnfill` replace them with a retry that carries the unchanged bad body
plus `contract.describe`; replay through MCP returns the same refusal. The
frozen `fill-unknown-ref-refusal` concierge vector pins this reply and issue 41
does not authorize regeneration. Alternatives and the opt-in red command are
recorded in `ts/FINDING-MCP-EMPTY-CATALOG-001.md`; the populated-catalog repair
on its separate central branch is intentionally out of scope here. Why: fixing
before ratifying the empty-catalog teaching promise would destroy the pinned
counterexample and risk claiming that a daemon can synthesize an unknown
referenced structure. **Load-bearing? yes** — this is the remaining W7 repair
loop when no catalog candidate exists.
## GitHub issue 49 — constrained payload-number decode

### D??. Declared payload readers share the canonical admission boundary

Decided: `steps.payloadNumber` decodes event payload bytes through the existing
`decodeJson` constrained decoder before walking its declared field path. An
excluded payload produces the step's existing `null` meaning-no-op; the
identity fold still commits the original bytes. Alternatives: retain
`JSON.parse` as a looser payload language (would admit duplicate members and
over-depth values that the package's identity boundary refuses); canonicalize
before reading (unnecessary—the step reads meaning while identity separately
commits the event bytes); add a second parser local to the step (two policies
can drift). Why: this was the sole `JSON.parse` on a digest-producing source
path and contradicted the module's already-ratified constrained-decode
boundary. The regression pins duplicate-member and depth-300 refusals, a valid
numeric control, and the resulting fold state. **Load-bearing? yes** — parser
admission decides which payload meanings may affect a declared fold state.

## GitHub issue 50 — backing-independent entity anchor order

### D??. Collectors impose UTF-16 identity order at the backing seam

Decided: `Collector.anchors()` copies and sorts every backing's key enumeration
by explicit UTF-16 code-unit order before constructing anchor values. A
`Backing.keys()` implementation may return storage, insertion, byte, or other
order; that order is not semantic. Alternatives: require every backing to sort
correctly (makes an unverified storage detail move parent commitments); keep the
in-memory bare `.sort()` as the implicit authority (does not constrain other
backings); choose UTF-8 byte order (diverges from the package's RFC 8785
identity order). Why: EC2 says the backing is a seam, and EC4 commits the anchor
sequence into a parent head. The regression uses U+1F600 and U+FFFD, whose
UTF-16 and UTF-8 orders disagree, and proves both anchors and the composed head
remain equal. **Load-bearing? yes** — ordering moves the parent chain head.

## Task 25 — JournalMessageStorage (stopped on FINDING-WRIT-001, 2026-08-13)

### D??. The tracer-bullet home is `proto/ts/src/cluster/`

Decided: the first Effect durable-messaging proof slice belongs beside the
existing tracer client, with a directory-local context naming the law that it
may only compose `ProtoClient`'s narrow writ. Promotion to a product package is
deferred until the MCP-after phase proves a lasting consumer. Alternatives:
`packages/client` (premature graduation); a new `packages/workflow` (a product
surface before the proof slice exists); `proto/demo` (would make the demo own
the adapter). Why: this is tracer-bullet proof work and the existing client is
the only lawful boundary it may depend on. **Load-bearing? no** — the module can
move at graduation without changing its contract.

### D??. FINDING: the pinned `MessageStorage` contract exceeds the narrow writ

Decided: stop before implementing `JournalMessageStorage`. At rc.108 the
service has sixteen operations, not the four summarized in the design notes,
and stock cluster code actively supplies `withTransaction` around persisted
RPC handlers. The SQL reference uses a real transaction; protod has no
transaction context, atomic batch, conditional append, or begin/commit/abort
request. Alternatives deliberately not taken: implement `withTransaction` as
identity; buffer only journal writes in TypeScript; silently add a daemon
request; claim conformance only from examples that leave the transaction
annotation false. Why: each alternative either weakens the upstream semantic,
fails to include arbitrary effects in the atomic boundary, violates the
narrow writ, or sizes the claim to a path that never exercises the missing
operation. Evidence and the minimized counterexample are in
`ts/src/cluster/FINDING-WRIT-001.md`. **Load-bearing? yes** — "the writ suffices
for durable execution" is false for the full pinned seam until the operator
ratifies a narrower domain or a new daemon capability.

The contract-suite semantics source and demo transport decisions were not
reached. Findings-before-fixes forbids deciding or building later stages after
the step-2 stop condition.

## GitHub issue 41 — executable `unknown-ref` repair

### D??. Concierge repair selects the first bounded catalog candidate

Decided: when one concierge step introduces an unresolved ref and the catalog
already contains a resolvable digest, the refusal re-holes that ref node and
puts an immediately executable `type.fill` request using the first digest from
the same sorted, 16-item candidate set used by the frontier at `next[0]`.
`example` carries the same ref. If the candidate set is empty, the existing
wire-frozen retry/describe fallback remains because inventing a replacement
would assert identity; the generic concierge teacher currently masks the
internal create/read advice in that case, a separate residual rather than a
claim of this repair. Alternatives: always echo the failed request (the
reported infinite repair loop even when candidates exist); require an extra
unfill/frontier/fill sequence; return every catalog digest; select insertion
order. Why: W7 requires self-repair without source reading, while bounded
sorted selection is deterministic and already licensed by the frontier seam.
The regression executes the advertised request against a real daemon and
requires acceptance. **Load-bearing? no** — this chooses one truthful example
from an already bounded advertised set; it does not change identity, admission,
or candidate membership.
## GitHub #51 — core generator strength and encoder depth (2026-08-13)

### D??. Proof strings use valid Unicode scalars and replay histories carry u32 edges

Decided: the generated fold and entity laws draw strings from the full valid
Unicode-scalar domain, weighted with U+D7FF, U+E000, U+FFFD, and a
supplementary scalar; unpaired surrogates remain rejection inputs rather than
lawful values. Stream-event sequences remain mostly small for shrinking but
also draw u32 edges, and history generators include an event-driven
`0xffffffff + 1` branch used by every replay law. Deterministic coverage
canaries prove those cases are actually drawn, and a wrap-dropping fold is
refused by the banana-split law. Alternatives: keep Effect Schema's current
ASCII-default arbitrary; put the edge cases only in fixtures; make all draws
large. Why: the first two leave declared Unicode and modular behavior outside
the generated proof, while the last destroys useful shrinking. **Load-bearing?
yes** — the generated laws license replay and federation rights.

### D??. Canonical encoding and constrained decoding share the 256-container bound

Decided: `encodeJsonValue` refuses the 257th array or object container with
`NonCanonicalValue`, matching constrained decode's existing bound, before
recursive descent can exhaust the host stack. `putFoldCache` therefore keeps
its documented total-return contract even for a 20,000-container hostile
state. Alternatives: raise/remove the decoder bound; document a thrown
`RangeError`; catch only inside the cache. Why: admission is part of identity,
the cache is not the only digest-minting caller, and a host-dependent stack
limit cannot define canonical data. **Load-bearing? yes** — encoder acceptance
defines which values can mint digest-bearing bytes.

### D??. A chain head has one lowercase hexadecimal spelling

Decided: callers may extend or replay only a 64-character lowercase hex head,
which is the spelling every SHA-256 producer in the package emits. Uppercase is
refused instead of normalized. Alternatives: accept both cases; lowercase at
every map lookup. Why: accepting two strings for the same 32 bytes lets chaining
succeed while content-addressed maps miss, splitting byte identity from key
identity. Refusal keeps one representation and exposes a caller defect at the
first boundary. **Load-bearing? yes** — heads are storage and replay keys.

Advisory audit: `packages/core/examples/tour.ts` runs the Effect-typed fold at
the caller boundary and hands its admitted value to the pure `stateDigest`; it
does not put Effect inside the digest-minting implementation. No second pure
fold or hidden `runSync` was introduced to cosmetically separate those calls.

## Task 28 — frontier legality per hole (stopped on FINDING-FRONTIER-001, 2026-08-13)

### D??. FINDING: every representable concierge hole currently expects the same nonterminal

Decided: stop before writing the requested red regression or changing
`buildFrontier`. The closed implemented partial grammar permits `{"k":"hole"}`
only where `T` occurs; struct field names are JSON object keys and never values
visited by `walkNode`, so the ticket's record-field-name hole cannot be
represented. Root, list-child, struct-field-value, union-member, brand-child,
and check-base holes all expect `T`, and the current wire law explicitly
advertises every final v0 kind at those positions. Alternatives deliberately
not taken: assert a false distinction between two `T` holes; invent a typed
metadata-hole grammar in this task; reinterpret “admitted by the certifier” as
the stronger prefix/closed-completion property without a ratified certifier or
enumerable domain. Why: each would either make the regression encode a false
law or violate Task 28's “no new grammar machinery” boundary. The minimized
grammar/path proof and disposition choices are in
`go/protod/FINDING-FRONTIER-001.md`. **Load-bearing? yes** — per-hole derivation
cannot be specified, tested, or implemented until the hole sorts and legality
predicate agree across the coordinator-owned spec, wire contract, and ticket
003 amendment.
## Task ?? — codegen certified identity and check corpus (#42/#43, 2026-08-13)

### D??. Permanent Go artifacts re-derive a supplied digest before emission

Decided: `toGoSource` retains its current `(structure, typeName, digest)`
compatibility seam, derives the structure first, then recomputes the
`bytes-sha256-v1` digest and returns a typed `digest-mismatch` refusal if the
pair disagrees. The generated banner uses only the recomputed value. Invalid
structures keep their earlier `underivable` precedence, so the cross-target
refusal-path law does not move. Alternatives: accept a `Certified` value (not
yet present on this mainline architecture); remove the digest argument and
silently recompute (loses evidence that a caller supplied a false pairing);
keep stamping the caller value (the defect). Why: recompute-and-refuse is the
smallest existing seam that enforces the repository's no-asserted-identity law
without anticipating the promoted codegen service. **Load-bearing? yes** — a
permanent artifact must not carry an identity that its own structure does not
have.

### D??. Check-table coverage is fixed semantic rows, not self-roundtrip

Decided: all seven current owned check names are pinned in a test-local corpus
with (1) the exact canonical check node expected from authoring, (2) one
accepted and one refused boundary value executed by the derived Effect Schema,
and (3) the exact JSON Schema constraint. A maxLength `max`→`min` args-key
mutant proves the fixed canonical-row oracle fails independently of both hand-
kept tables. Alternatives: add rows to frozen `proto/wire/fixtures` (forbidden
without regeneration authority); rely on derive→re-fold (a symmetric bug
cancels); claim the planned Go-daemon L-ACCEPT differential (not built here).
Why: the fixed rows cover the six previously absent kinds without overstating
the proof. The claim remains corpus-sized: these examples do not ratify or
replace L-ACCEPT. **Load-bearing? yes** — this is the independent evidence that
prevents two agreeing tables from silently renaming identity-bearing args.

## Issue 45 — record-width acceptance finding (2026-08-13)

### D??. FINDING: four public faces assign three semantics to one extra key

Decided: preserve the minimized `contract.describe`-derived witness as an
opt-in red equality law and stop before changing any language. JSON Schema's
`additionalProperties:false` normatively refuses the extra key (bounded keyword
observation; no independent validator is licensed), generated Effect and Go
accept then drop it through executed decoders, and live protod admits and
preserves it in verified canonical journal bytes under D5. Alternatives
deliberately not taken: open only the JSON Schema; make ingress strict; declare
Effect/Go's loss equivalent to protod's preserved content. Why: each local patch
would silently choose a record language while leaving another public face or
frame identity divergent. The ratification choices are closed-refuse,
open-ignore, and open-with-declared-rest; the last is recommended because it
alone preserves D5's content constraint, but it is a load-bearing owned-grammar
and identity-scheme change not ratified by D5 itself. Evidence, bounds, and
reproduction are in `ts/FINDING-ACCEPTANCE-WIDTH-001.md`. **Load-bearing? yes**
— this choice fixes the denotation of every struct for the certifier, all
derivation targets, L-ACCEPT, and the future inferrer's S-boundary.

## Issue 55 — total codegen and injective Go names (2026-08-13)

### D??. Go identifiers use readable and encoded disjoint ranges

Decided: ordinary lower-camel JSON field names retain their exported Go
spellings and already-exported type names remain unchanged; every other name
uses `X_` followed by one fixed-width hexadecimal group per UTF-16 code unit.
The `X_` range is reserved, so readable names that would enter it are encoded
too. Alternatives: replace invalid characters with `_` (not injective and can
emit Go's blank identifier); refuse non-ASCII, punctuation, or empty field
names (would make the Go target refuse structures the other targets derive,
breaking the standing cross-target law); encode every name (injective but
needlessly breaks existing readable consumer names). Why: the Go target must
preserve every grammar-legal field distinctly even before the future codec
wall exists, while JSON tags retain the original wire names. **Load-bearing?
no** — D27 keeps this target a sketch, and identifier spelling is outside
structural identity.

### D??. Derivation-only metadata failures share one local refusal

Decided: pattern regular expressions and struct `optional` metadata are read
once by shared codegen guards before target-specific lowering; malformed data
returns the same `underivable` refusal and path from all three targets. On the
required `9d26415` base, live protod already refuses a non-array `optional` at
`structure/optional`, so issue #55's claim that this shape is daemon-admitted
is stale; the raw codegen guard remains because its public input is untrusted
JSON. Alternatives: rely only on daemon admission (cached/direct callers can
still throw); catch exceptions independently in each target (paths and laws
can drift); widen the daemon grammar (unlicensed). Why: derivation failures are
data and cross-target consistency includes refusal paths. **Load-bearing? no**
— this enforces existing laws without changing the owned grammar.

## GitHub issue #56 — application inbox isolation (2026-08-13)

### D??. One private NATS account per application connection

Decided: the daemon remains in the global JetStream-enabled account, while its
custom embedded-server authenticator registers every anonymous application
connection in a fresh account named from the server-issued connection ID. The
application account service-imports only `flb.req.>` and `flb.ing.>` from the
daemon account; NATS maps each service reply back into the importing account,
so `_INBOX.>` retains ordinary request/reply without being global. Publish and
subscribe permissions still enforce exactly the three-verb writ, including a
direct forged-reply refusal. Alternatives: retain one application account and
grant `_INBOX.>` globally (the confirmed breach); expose a client-chosen inbox
prefix and treat secrecy as authorization (another client can guess or copy
it); issue a new static user/password before every connection (an auth-surface
redesign, and credentials alone do not isolate a shared account); route
JetStream directly into application accounts (widens the writ). Why: NATS
accounts are the pinned server's subject-namespace isolation boundary and
service imports preserve its native response mapping. The two-client
black-box control drives both a public request reply and real internal
JetStream traffic. **Load-bearing? yes** — user permissions are shared by a
credential, while confidentiality is per connection; without distinct account
namespaces, `_INBOX.>` authorizes every application's and the daemon's replies.

## GitHub issue #57 — strict reply/client/transcript conformance (2026-08-13)

### D??. One adversarial reply corpus binds the two public decoders

Decided: Effect Schema decoding uses recursive excess-property refusal and the
same declared coordinate bounds as the Go `catalogr4` decoder; every row in
`wire/reply-conformance.json` must receive the same accept/refuse verdict from
both. The Go decoder is the independent oracle for this corpus, not another
port of the TypeScript Schema. Alternatives: keep permissive TypeScript decode
(silently repairs evidence); write two unrelated corpora (cannot compare the
same value); claim exhaustive language equivalence (larger than the evidence).
Why: the public client may adopt only the wire value that arrived, including
the daemon-only `local:false` trust coordinate. **Load-bearing? yes** — reply
admission determines which facts can become client state.

### D??. Caller errors are local, teachable, and never retried implicitly

Decided: the client validates journal names and the negotiated NATS payload
bound before publishing, and every local refusal carries a non-empty `next`
action that preserves the caller's choice to retry. The central fallback is
contract inspection; verb-aware callers replace it with a directed repair.
Malformed reply hints are supplied by the verb-specific caller. Alternatives:
let NATS token errors become `unreachable`; retry automatically; emit empty
hints. Why: input errors are not network facts, and an automated retry would
invent authority. The author/codegen refusals use the contract-inspection
fallback until a more specific local action exists. **Load-bearing? yes** —
refusal kind and repair direction are public data.

### D??. MCP derivation refuses non-injective tool names

Decided: contract-derived request and ingress kinds must map injectively to MCP
tool names; any collision makes derivation return one local malformed-reply
refusal before a handler is registered. Alternatives: last-write wins (lets a
daemon contract redirect a tool); first-write wins (same ambiguity); suffix
names by encounter order (construction history becomes API). Why: the tool
surface is data derived from an untrusted daemon reply, so honest-current-name
tests alone do not prove structural drift resistance. **Load-bearing? yes** —
tool name determines which writ verb an agent invokes.

### D??. A transcript owns exact evidence and orders by send

Decided: a session reserves its step before invoking the client, records the
exact wire body (including the genesis cursor), the complete claimed reply and
locally verified cursor, endpoint attribution, and start/completion times; the
getter returns a frozen deep snapshot. Endpoint is attribution only, not an
authenticated daemon identity. Alternatives: completion order (reorders
concurrency); store only the verified projection (loses the claim being
verified); return the backing array (consumer-erased audit). Why: this is the
minimum record that can later migrate to `flb.session.v0` without inventing
missing evidence. **Load-bearing? yes** — audit meaning depends on ownership,
ordering, and preserving both sides of verification.
## Task 48 — core-owned public values (2026-08-13)

### D??. Module descriptors are frozen; mutable work state is copied or constructed

Decided: process-wide algebra, law, and registry descriptors are frozen;
each algebra owns a distinct frozen law record; array identities are frozen;
and identities containing `Map` plus entity views are constructed or copied
at every public ownership boundary. This branch includes Task 38's
`emptyKV()` constructor because it is based before that independent fix and
the enriched identity must not silently depend on merge order. Alternatives:
trust TypeScript `readonly` (erased at runtime); shallow-freeze every value
(does not protect `Map` contents); deep-freeze caller-owned inputs (seizes
ownership the API was not given); copy every primitive and descriptor on every
read (allocation without a mutable carrier to isolate). Why: callers may
mutate values they receive, but that mutation must never rewrite a later fold,
digest preimage, generated law selection, or collector anchor. **Load-bearing?
yes.**

## GitHub issue #47 — KV witness numeric domain (2026-08-13)

### D??. The KV witness admits only non-negative JavaScript safe integers

Decided: `singletonSeqKV` checks every event sequence and `combineSeqKV`
checks every entry and seen coordinate in both structurally supplied states;
numbers outside `0..Number.MAX_SAFE_INTEGER` return the existing plain-function
ok-union shape with an `InvalidSequence` refusal before witness comparison.
The semilattice claim is explicitly limited to that admitted domain. Current Go
journal callers do not justify widening it: their cursor carrier is platform
`int`, their chain carrier is `int64`, and every stored identity passes through
`canonical.EntryDigest`, which already refuses above the same safe-integer
boundary. Alternatives: change `SeqEntry.seq` and every digest/wire consumer to
`bigint` (an unratified public and identity change); document the limit without
enforcing it (the NaN commutativity counterexample survives); validate only
events (public structural states bypass the gate). Why: a number has already
lost adjacent u64 identity coordinates by the time this seam receives it, so
refusal is the only narrow closure that preserves exact identity. **Load-bearing?
yes** — without the gate, `compareWitness` selects its left input for both
orders at NaN and the module's headline commutativity law is false.

## Issue 46 — lossless Schema transport wall (2026-08-13)

### D??. The text schema refuses malformed UTF-8 and invalid encoder inputs

Decided: `parseFrames` retains the canonical stream domain of arbitrary
payload bytes, while `GzipEventFrame` truthfully narrows its `WireEvent` face
to Unicode-scalar UTF-8 text. Decode uses a fatal UTF-8 decoder and returns a
typed Schema issue; encode validates stream and payload scalar values and their
canonical u16/u32 UTF-8 byte lengths in `WireEvent` before the eager canonical
encoder callback runs. Alternatives: replacement decoding (collides distinct
bytes at U+FFFD); base64 payloads (a wire-shape redesign not authorized by
issue 46); narrow `parseFrames` itself (would reject lawful canonical binary
events outside this text view); catch `RangeError` around the callback (too
late, because the public Effect constructor already threw). Why: a schema must
not admit a value its encoder rejects, and a text view must never repair bytes
into a different identity. **Load-bearing? yes** — this is the Go-to-TypeScript
identity boundary.

### D??. Sharp schema rows are live Go-origin evidence, not a frozen-fixture rewrite

Decided: a stdlib-only `go/cmd/schemawallprobe` emits two non-ASCII and two
malformed-payload frames with their independently computed Go heads. The TS
wall reproduces heads for admitted text and requires typed refusal for raw
`ff`/`fe`, while also proving the malformed source heads differ. The existing
`fixtures/stream-wall.json` remains byte-identical and untouched. Alternatives:
construct malformed frames only in TypeScript (not an independent wall); add
rows to the frozen fixture without regeneration authority; duplicate #38's
broader stream/xform corpus. Why: the live Go oracle covers this exact schema
seam without treating gzip transport bytes as identity or expanding into the
other #38 lanes. **Load-bearing? yes** — both-sides-agree is not independent
evidence, and the original ASCII-only wall could not fail on this defect.

### D??. FINDING: fatal TextDecoder still strips leading BOM bytes

Decided: preserve and stop on `FINDING-SCHEMA-BOM-001`. A live Go-origin pair
proves `ef bb bf` and empty payloads have distinct canonical heads, while the
pinned runtime's fatal decoder admits both and maps both to the empty string
because `ignoreBOM` defaults false. The issue-authorized malformed-byte and
constructor fixes remain, but the widened valid-UTF-8 case is not repaired
before operator disposition. Alternatives and the opt-in red command are in
`packages/core/FINDING-SCHEMA-BOM-001.md`. Why: U+FEFF is a Unicode scalar, so
silently stripping it contradicts the stated text domain; choosing preservation
or typed exclusion changes that public domain and must be explicit.
**Load-bearing? yes** — this is another distinct-byte collision at the same
identity boundary.

## Task 26 — Rosetta code surfaces (2026-08-14)

### D??. The typed KV combine names its operation and its error channel

Decided: the Effect-returning sibling of `combineKV` is
`combineKVEffect`. `combine` names the associative segment-recombination
operation; `Effect` names the typed refusal channel. The unreleased `mergeKV`
name is removed without an alias. Alternatives: retain `mergeKV` (collides
with the committed-interleaving meaning of Merge); `combineKVTyped` (names a
property every TypeScript value already has); retain a compatibility alias
(freezes the misleading name into a second public path). Why: one operation
keeps one domain name across its pure and Effect dialects, while the suffix
makes their different refusal channels visible at the call site.
**Load-bearing? no** — this is surface vocabulary, changed before release.

## GitHub issue #14 — Rosetta integration (2026-08-14)

### D??. The router layer is the executable oracle for the health audience split

Decided: export the server's `Routes` layer and launch the Bun listener only
when `server.ts` is the main module, so a test can send Fetch `Request` values
through the real router. The regression pins the machine-facing `/health` body
to `ok` and also pins the two browser-facing demo law strings. Alternatives:
inspect source text (would test spelling, not routing); spawn the fixed-port
server (introduces a port race); change the string without a regression (the
accepted audience split could drift again). Why: one in-process handler tests
both halves of the ratified split without opening a socket or adding a runtime
dependency. **Load-bearing? no** — this is a testability seam for an already
ratified response contract.

## GitHub issue #36 — request-byte identity admission (2026-08-13)

### D??. Typed request projection follows constrained decode

Decided: every daemon request body is decoded once through
`canonical.Decode`; only the canonical encoding of that admitted value may be
projected into the request's Go struct. Duplicate member names, lone-surrogate
escapes, and invalid UTF-8 therefore return the ordinary typed `malformed`
refusal before catalog walking or mutation. Alternatives: preflight the raw
bytes and then decode those same raw bytes again with `encoding/json` (leaves
a second repairing decoder on the identity path); repair in the catalog
scheme (too late, because the original bytes are already gone); restrict only
`type.create` (the shared request seam would remain internally inconsistent).
Why: constrained decode is the repository's only byte-to-value admission law;
a repairing decoder names a value that did not arrive. **Load-bearing? yes** —
request admission determines which bytes may create type identity.

## Task 30 — refusal sorts and corpus-grade duplicate refusals (2026-08-14)

### D62 disposition. Duplicate refusal lists every offender

Decided: issue #21's ratified LIST ALL OFFENDERS disposition supersedes D62's
single-offender refusal shape. `MergeDuplicateSequence` now carries every
duplicate-bearing `(source, seq, indexes)` tuple, sorted by source then
sequence, in both runtimes. Alternatives: sort sources before choosing one;
pick the first source reached by the merge fact; retain insertion/map order.
Why: every alternative still suppresses true offenders or makes the refusal
depend on representation order; a complete sorted value is deterministic and
safe to retain as evidence. **Load-bearing? yes.**

### D??. Refusal sort is persisted and the total table has a grammar digest

Decided: every daemon W7 refusal persists `sort`; the Go emitter derives it
from the total nine-kind table, TypeScript requires and round-trips it, and
strict Go comparison requires the field. The table is frozen as the canonical
`{grammar, sortByKind}` manifest for `flb.type.v0`, digest
`ea71a32bea23660b72438167ff44def9a50be917fc087aeef8a84ee5f6fd3a88`.
The tracer has no independently content-addressed grammar artifact yet, so this
smallest manifest pin makes any re-sort mint a new digest without inventing the
future certification record. Client-local refusals remain outside the daemon
sort table. Alternatives: the superseded server-side-only code property;
persist the sort but leave the table unversioned; classify client-local kinds
without ontology authority. Why: Addendum 2 requires archived meaning to ride
with the datum and forbids a later code edit from silently rewriting the table;
the manifest digest is the narrow pin available before Task 32 adds
`grammar_digest` to certification records. **Load-bearing? yes.**

### D??. Duplicate-refusal source order is UTF-8 byte order

Decided: `(source, seq)` ordering compares source UTF-8 bytes first and the
unsigned sequence second; indexes remain ascending event positions. The shared
M1 vector pins a BMP/supplementary pair that reverses under UTF-16 ordering.
Alternatives: Go's native order on one side and JavaScript's native order on
the other; RFC 8785 UTF-16 member-name order. Why: source ids are encoded as
UTF-8 bytes in the canonical event frame and are not JSON member names; using
that existing domain gives both runtimes one explicit comparator.
**Load-bearing? yes** — changing it changes the corpus-grade refusal value.
## GitHub issue #15 — Watch retention finding (2026-08-13)

### D??. FINDING: `History:1` contradicts a lossless reading of WL1/WL2

Decided: no production disposition is taken on this branch. An already-created
Watch consumer paused across `Claim;Commit` sees only `Committed` with the
production `History:1` shape; the one-field `History:2` control sees `Held,
Committed`. JetStream stream coordinates independently show revision 1 was
evicted (`msgs=1 first=2 last=2`) in the first run and retained
(`msgs=2 first=1 last=2`) in the control. The issue owner's latest comment
explicitly makes this a spec choice. Alternatives awaiting ratification: deepen
history and keep WL1/WL2 lossless; weaken WL1/WL2 to the existing best-effort
chatter contract; or give Watch its own durable retention/gap contract.
Recommended: ratify best-effort chatter and make the laws conditional on
delivery, because finite KV history (pinned NATS maximum 64) cannot establish an
unbounded losslessness law; build a separate durable feed if a consumer needs
every transition. The opt-in red command, ordinary-gate causal control, and
decision evidence are in
[`go/effector/FINDING-WATCH-EVICTION-001.md`](../go/effector/FINDING-WATCH-EVICTION-001.md).
**Load-bearing? yes** — changing retention or law strength changes what every
Watch consumer is entitled to infer.
## Task 33 — no dead ends, mechanized (2026-08-14)

### D??. Completion reachability is a least fixpoint over the grammar's production edges

Decided: project the closed `flb.type.v0` grammar into production results and
required child nonterminals, then compute its least productive fixpoint. A
post-fill template is completable only when every hole's nonterminal has a
closed witness, the completed witness passes the certifier's structure walk,
and every demanded ref digest belongs to the caller-provided snapshot of the
locally resolvable catalog. Thus an empty catalog excludes the `ref` production
but does not block templates that do not demand refs; a populated catalog makes
only its exact member digests available. Alternatives: inspect the frontier
table itself; search to an arbitrary tree-depth bound; treat any nonempty
catalog as resolving every concrete ref. Why: table inspection is circular,
bounded unfolding misses lawful recursive productions, and catalog cardinality
does not prove membership. The finite production fixpoint terminates and its
closed witness is checked by the admission grammar rather than trusted.
**Load-bearing? yes** — this is the mechanical meaning of C4's “admits a closed
completion” claim.
## Task 29 — MCP output envelope (2026-08-14)

### D??. The advertised envelope is the existing reply object, open over fact fields

Decided: every dynamic MCP tool uses one `StructWithRest` output schema that
requires the existing `ok` discriminant, permits the contract-derived fact
fields as unknown rest properties, and optionally declares a refusal as a
union of two refinements of the shared wire `Refusal`: the nine daemon kinds
and every client-local kind emitted by the current writ, author, and codegen
surfaces. Alternatives: retain
`Schema.Unknown` or use a top-level fact/refusal union (both are dropped by
the pinned `registerToolkit` object guard); add a new nested `fact` envelope
(would change the daemon reply passthrough); enumerate only the nine daemon
kinds (would turn an existing local refusal into a tool-result encoding
defect). Why: the schema must advertise every value that can already cross
the seam while leaving each contract-derived fact byte-for-byte unchanged.
**Load-bearing? yes** — this shape simultaneously carries W8 and determines
whether validating MCP clients can see the refusal contract.
## Issue 16 — MCP pin conformance (stopped on FINDING-MCP-001, 2026-08-13)

### D??. FINDING: raw-schema dynamic tools advertise but do not enforce input schemas

Decided: stop after reproducing the issue's schema-validation correction at
the public stdio JSON-RPC seam. Foldlab passes raw JSON Schema to
`Tool.dynamic`; rc.108 deliberately stores it for advertisement while using
`Schema.Unknown` for handler parameters, so a `type_create` call missing the
advertised required `structure` property reaches protod and returns its typed
`malformed` refusal instead of MCP `InvalidParams`. Alternatives deliberately
not taken: add a second validator; derive Effect Schema alongside JSON Schema;
or rewrite the red regression to bless daemon validation. Why: the first two
change the ratified D22 trust boundary and require a new equivalence oracle;
the third would erase a demonstrated contradiction between issue #16's
correction and the pinned implementation. Evidence and disposition choices
are in `ts/FINDING-MCP-001.md`. **Load-bearing? yes** — callers cannot know
whether advertised schemas are enforced until the coordinator chooses the MCP
validation boundary.
## Issue 31 — strict structure JCS identity closure (2026-08-13)

### D??. One RFC 8785 encoder owns the TypeScript identity domain

Decided: `proto/ts` delegates canonical encoding to
`packages/core/src/jcs.ts` and exposes its typed `CanonicalEncoding` result;
proto retains only grammar-aware structure normalization and hashing. The
proto-to-Go test now crosses the real `go/cmd/jcsprobe` process, while the core
encoder retains its generated differential wall. Alternatives: repair the
second serializer in place (two implementations could drift again); vendor a
third-party JCS package (new runtime dependency and another trust base); keep a
throwing compatibility wrapper (excluded inputs would still escape the refusal
channel). Why: the defect existed because the strongest wall certified the
already-correct TS/Go pair while the identity-bearing proto implementation was
independent. **Load-bearing? yes** — every TypeScript digest now has one
canonical admission domain.

### D??. Structure identity validates before its pure normalization walk

Decided: `canonicalizeStructure` first asks the shared encoder to admit the
complete input, then normalizes union order, canonicalizes again, and only then
may `structureDigest` hash. Therefore cycles, exotic prototypes, undefined,
non-finite numbers, and invalid Unicode refuse as typed data before recursive
normalization; negative zero remains admitted and normalizes to RFC 8785's
`0`. `normalizeStructure` stays non-mutating and is pinned idempotent, with an
in-place-sort negative control. Alternatives: normalize first (cycles can
overflow before admission); catch recursion errors (engine-dependent failure,
not domain evidence); hash `JSON.stringify` output (the lone-surrogate mutant
recreates the reported digest). Why: admission must dominate every identity
walk, and normalization must not change its caller. **Load-bearing? yes.**

### D??. Existing frozen independent oracles close the reported sharp edges

Decided: the new wall reads RFC 8785 Appendix B's frozen minus-zero row from
`fixtures/jcs-rfc8785.json` and the existing CG1 lone-surrogate value from
`go/canonical/probes/cg1-vector.json`; no frozen fixture was regenerated. The
same test requires proto runtime values and the real Go constrained decoder to
agree on acceptance and canonical bytes. Alternative: add expected literals
only inside the test (not independent); regenerate a wire fixture (the issue
does not license moving any existing digest). Why: the two existing artifacts
already name the independent standard result and the cross-runtime excluded
value. **Load-bearing? no** — the oracle artifacts may be consolidated later
without changing the admitted domain.
## Task 37 — the session journal (2026-08-14)

### D??. Session names address a canonical open event under a reserved house prefix

Decided: one session is the journal `flb_session_v0_<digest>`, where `digest` is
SHA-256 over the RFC 8785 bytes of its full `open` event. The open carries a
digest over an owned grammar descriptor that commits every v0 production's
required/optional fields and child sorts, not only the kind names. The
underscore spelling obeys the existing journal-name grammar; generic ingress
refuses the prefix, while `session.open` is the only creator. Alternatives:
random session ids; hash only author/seed; use dotted `flb.session.v0` names
outside the house regex; digest only the current kind list. Why: identical open
facts converge, the journal remains directly readable, and a production-shape
change cannot masquerade as the same grammar. **Load-bearing? yes** — U3's
identity and cross-version replay both depend on what the key commits.

### D??. The O(1) extension cache is derived and head-keyed, never authority

Decided: each loaded session journal has a process-local `(verified cursor,
partial)` cache protected by the session's append lock. Cache miss/restart
replays from genesis; cache hit applies one move to the current carrier and
advances one journal position. Generic ingress cannot write the reserved
journal, so every admitted mutation passes through mandatory `expectedHead`
position-CAS. Alternatives: replay the entire journal on every move (violates
the L3 extension claim); treat the cache as durable state (creates a second
authority); route sessions through the effector (spends decision coordination
on evidence). Why: the journal remains the sole source of truth while the
meaning fold extends without history-length work. **Load-bearing? yes** — this
is the implementation of L1/L3 and G3 together.

### D??. Task 37 records the current digest scheme and owes a future bridge

Decided: every prefix state and L7 commit audit is explicitly tagged
`bytes-sha256-v1`, computed as SHA-256 over RFC 8785 bytes of the current
normalize (including canonical union-member order). Task 36 is not merged at
this lane's base, so no `flb.type.v1` record is invented here. When that scheme
lands, an old session commit remains an immutable old-scheme fact and gains a
dual-record bridge; it is never reinterpreted or overwritten. Alternatives:
read whichever scheme is active after a future merge; anticipate task 36's
unmerged record shape; omit the scheme from state replies. Why: all three make
historical state digests silently change or claim a contract this base does not
have. **Load-bearing? yes** — L7 is meaningful only when both equal digests name
the same scheme.

### D??. Retention is recorded now; compaction remains a typed domain refusal

Decided: session events carry `compactible`, `irreducible`, or
`never-discardable`; fill/unfill/refusal/read are trace traffic, open and
utterance/proposal are replay roots, and commit/adoption are permanent spine
facts. Both Go and TypeScript expose a compaction planning path that returns the
marks plus `compaction-blocked`; it cannot discard bytes until task 32 supplies
`flb.certification.v0`, structural-refusal export, and the corpus digest sealing
the prefix. Eventual compaction lets head-relative absence refusals die with the
trace but preserves the prefix state digest beside that corpus digest as durable
evidence. Because task 30 is not present at this base, its classifier is not
copied here; at integration both `session-stale` and build-relative
`compaction-blocked` join the absence sort and never enter the structural
corpus. Alternatives: compact without export; add a fifth daemon request
that can only refuse; implement task 32's record in this lane; leave retention
implicit in prose. Why: the fallback enforces G4 without expanding the ratified
four-request session surface or crossing an active lane. **Load-bearing? yes**
— silent compaction would destroy teaching evidence forbidden by issue #24.

## Task 37 Addendum 1 — principal ownership repair (2026-08-14)

### D??. `open.author` is the asserted session owner; every mutator repeats it

Decided: the non-empty `author` on the immutable open event establishes one
session-owned `principal` string. Every fill, unfill, and commit request and
journal event carries that string exactly; a missing principal is malformed and
an unequal principal returns `session-principal` before expected-head CAS or
append. Replay recovers the principal beside the partial, state/commit facts
return it, and all generated retry bodies carry it. Concurrent clients using the
same principal remain legal and race through the existing expected-head gate;
overlapping edits still require the effector disposition stated by Addendum 1.
Alternatives: retain author only on open (the confirmed unattributed-history
defect); allow arbitrary per-move principals (contradicts one author of record);
add `auth_basis` and transport authentication here (the estate map records that
machinery as missing and this loopback daemon cannot prove it); derive principal
from submitter (an independently unauthenticated catalog claim). Why: the journal
now answers who owns every state transition after restart without inventing an
authentication claim the substrate cannot discharge. **Load-bearing? yes** —
this is an asserted ownership coordinate, explicitly not authenticated identity;
real authentication remains the J9 residual and must precede trusting it as a
person.

### D??. Addendum 1 authorizes the session fixture's principal-bearing revision

Decided: update only `proto/wire/fixtures/sessions.json` so every post-open move
carries `principal:"fixture-agent"`, then recompute its canonical event bytes and
per-prefix chain heads with the existing TS identity implementation; keep the
open event, session key, grammar digest, state scheme, and every state digest
unchanged. Alternatives: add a second fixture (leaves the authoritative dialogue
outside the new replay domain); keep old head pins (would certify events replay
now rejects); regenerate unrelated wire fixtures. Why: Addendum 1 changes the
identity bytes of session moves and expressly requires propagation through the
fixture, while no other frozen authority moved. **Load-bearing? yes** — U3 R0
must pin the actual principal-bearing journal grammar.

### D??. The combined refusal manifest covers the type and session grammars

Decided at integration: extend Task 30's persisted sort manifest to the three
session kinds and name its grammar `flb.type.v0+flb.session.v0`.
`session-stale` and build-relative `compaction-blocked` are absence as Task 37
already required; `session-principal` is structural because the submitted
principal and immutable `open.author` determine the refusal independently of
later heads. Alternatives: leave the new kinds unclassified (the daemon's
central emitter panics); keep a manifest claiming only `flb.type.v0` while it
contains session laws (false provenance); classify principal mismatch as
absence (later presence cannot repeal the same request against the immutable
open event). Why: every daemon refusal must persist one truthful sort, and a
changed kind table must mint a new manifest digest. **Load-bearing? yes** —
archived refusal meaning and future corpus admission depend on this table.

### D??. Session state evidence stays historical while new catalog commits use the owned scheme

Decided at Task 36 integration: `flb.session.v0` state replies and the frozen
session fixture retain their historical `bytes-sha256-v1` state-scheme tag;
session commit sends a cloned request through the sole `certify(bytes)` seam,
requires the resulting `flb.type.v1` digest to equal the replay-derived state
digest, and records the owned catalog scheme in the commit event and reply.
The certification append has already made the corresponding
`flb.scheme-bridge.v0` durable before that reply. Alternatives: relabel the
existing session fixture and every historical state fact as `flb.type.v1`
(reinterpretation); bypass `certify(bytes)` with a second catalog-admission
path; keep requiring a new catalog fact to use the predecessor scheme (blocks
the owned-scheme transition). Why: historical evidence keeps the scheme it was
minted under, while every post-transition catalog admission uses the one
ratified owned identity seam. **Load-bearing? yes** — replay audit, catalog
identity, and the append-only bridge must agree without rewriting history.

## Issue #9 — catalog bound honesty (2026-08-13)

### D??. Guard every constant and independently control each literal-domain ceiling

Decided: state the complete configured domain explicitly. `NumDaemons`,
`NumCreators`, and `NumVals` must each belong to the model's named
`LiteralDomain` (`1..4`); `DataCap` must be a natural number; and all four
fault-selection switches must be Boolean. Each size guard has an otherwise
valid overrun config in `run.sh`, and the gate requires its assumption failure
before state generation. Alternatives: one config with all three sizes at 5
(one surviving assumption could mask deletion of the others); add controls for
`DataCap` and Boolean typing (those do not encounter the reported silent
literal-domain truncation, and malformed switches already fail when
evaluated). Why: the three formerly green truncations must each remain
independently repealable, while the named domain keeps a future widening local
to one model definition. **Load-bearing? yes** — deleting any size guard must
turn its own control green and fail the gate.

### D??. The natural catalog bound names the explored value domain

Decided: `CatalogNaturallyBounded` uses `Cardinality(Vals)`, with
`FiniteSets` imported. At every current legal config this equals `NumVals`, so
the clean closures are inertness controls. Alternative: retain `NumVals`
because the new assumption equates it to the domain cardinality. Rejected: a
future change can separate the configured number from the actual domain again;
the invariant must name the semantic quantity it certifies. Why: the guard
prevents today's silent overrun, while the invariant remains honest if the
literal domain later widens. **Load-bearing? yes** — this is the semantic half
of FINDING-BOUNDS-001.

## Issue 28 — ledger and documentation integrity (2026-08-13)

### D??. The claims ledger names only committed, reproducible evidence

Decided: remove prose-only mutation outcomes from the negative-control claim,
scope Go combine evidence to R0, and carry G1's attestation and choreographed-
schedule bounds into `VERIFICATION.md`. The earlier unseeded refusal-split
finding and raw-NUL source defect are already superseded at this integration
head, so this repair does not revive their stale prose or churn the now-text
test file. Alternatives: build mutation machinery solely to preserve stronger
prose; leave caveats only in the gauntlet spec; replay obsolete fixes over
later deterministic-refusal and safe-integer work. Why: the ledger is an index
of evidence that exists and can be rerun at the current head, with the same
bounds as its source. **Load-bearing? yes** — later work uses the ledger to
decide which rights have actually been earned.

### D??. Rosetta bridges keep their prohibition force

Decided: every root glossary bridge keeps the external standard term and its
explanation, but says “do not use for this concept in foldlab prose.”
Alternatives: restore the terse pre-Rosetta `_Avoid_` lines (loses the bridge);
retain the gloss alone (turns a repository instruction into narration);
introduce new house synonyms (outside this repair). Why: a vocabulary bridge
can teach recognition without licensing drift in repository prose.
**Load-bearing? no** — wording may improve while the chosen house terms stay
unchanged.

## Task 36 — the owned canonical encoding (2026-08-14)

### D??. Normalize is a pure copy-producing function over grammar-valid terms

Decided: Go `normalize(any) (any, error)` returns a new type tree and has one
rewrite clause today: recursively normalize union members, then sort them by
canonical bytes. The validation walk uses normal-form bytes only for duplicate
detection and never mutates the submitted tree; `walkPartial` remains explicitly
position-preserving. The property gate runs 512 deterministic depth-4 terms
(PCG seeds `0x36d20001/2`), compares bottom-up with fair top-down clause schedules,
and carries an order-toggling idempotence mutant; the TS twin runs 512 terms at
seed `0x36d20003`. The cost envelope counts production work independently of
identity: an N-node grammar tree permits exactly one structural node visit and
one cached canonical sort-key derivation per union member, with sort comparisons
metered separately. The adversarial gate alternates nested structs and binary
unions at four scales inside the 256-container decode domain; its independent
shape walk supplies the bound, and an idempotent extra-pass mutant returns the
same normal form but exceeds it. Alternatives: retain the rewrite inside `walkStructure`;
normalize in place; make partials share the identity discipline. Why: the first
two hide or leak normalization and the third breaks fill/unfill path inversion.
**Load-bearing? yes** — every owned identity depends on this unique normal form.

### D??. The owned scheme is named `flb.type.v1` and gets new, separate vectors

Decided: the active scheme tag is exactly `flb.type.v1`; the predecessor remains
`bytes-sha256-v1`. The old `types.json` corpus is re-derived through the extracted
normalize using the predecessor scheme and is byte-identical; new nested,
permuted-union, and ref-bearing vectors live in `owned-types-v1.json`. At the
current first normalize clause the two hashes can be equal while their scheme
claims remain different. Alternatives: call the new scheme `foldlab.schema.v1`;
retag or rewrite `types.json`; bind identity to SchemaAST. Why: all three
contradict ticket 004 D1 or erase the migration evidence. **Load-bearing? yes**
— the scheme tag fixes the preimage contract, not merely the hash algorithm.

### D??. Cycle checking follows resolved structures at the walk seam

Decided: `walkRefGraph` takes the candidate, its refusal path, and a structure
resolver; it tracks active and visited digest sets, refuses a back-edge as a
W7-shaped `invalid-structure`, and permits acyclic sharing. Unknown references
remain the catalog's more specific `unknown-ref` decision. Alternatives: rely
only on append order; check self-refs only; implement SCC hashing now. Why: the
first leaves the law accidental, the second misses multi-hop cycles, and the
third builds the pre-ratified successor without a consumer. **Load-bearing?
yes** — acyclicity is part of the `flb.type.v1` admissible domain.

### D??. Scheme bridges are mixed evidence records in the catalog journal

Decided: `flb.scheme-bridge.v0` is `{kind,from:{digest,scheme},to:{digest,scheme}}`
and is appended immediately after the new owned catalog fact in the same
journal. A successful response therefore witnesses both records in its catalog
head. If the fact append succeeds but the bridge append fails, the in-memory and
restart indexes retain the fact; retry appends only the missing bridge before
replying. Rebuild strictly decodes known bridge records and rejects unknown
evidence kinds. Alternatives: overwrite the predecessor fact; put bridges in a
private second journal; embed the bridge inside the fact. Why: overwrite breaks
append-only history, a private journal weakens auditability, and embedding is
not a second evidence record. **Load-bearing? yes** — this is the migration law.

### D??. The certifier trusted-base draft is scoped to the admission call graph

Decided: the merge-time `VERIFICATION.md` draft will enumerate `dispatch.go`,
`certify.go`, `catalog.go`, `walk.go`, `normalize.go`, `recursion.go`, `scheme.go`,
`scheme_bridge.go`, and `refusal.go`, with the imported `go/canonical` and
`go/journal` assumptions named rather than silently counted as local code. The
TS twin is a wall, not part of the trusted certifier. Alternatives: a line count;
list all of protod; list only `certify.go`. Why: those choices respectively rot,
hide the real call graph, or omit the machinery that can betray admission.
**Load-bearing? yes** — this bounds what the certification claim trusts.

### D??. `certify` consumes the complete `type.create` request bytes

Decided: the named seam is unexported
`Daemon.certify(context, []byte) -> certificate | *Refusal | error`; its bytes
include the request envelope, not only the nested structure, so malformed-body
and missing-structure decisions cannot live on a second path. The error result
is reserved for substrate failure. `catalog.commitCertified` is unexported and
a static test permits its one production caller only in `certify.go`.
Alternatives: name only the structure walk; keep envelope refusals in dispatch;
export a convenience certifier. Why: each creates a second admission decision
or an unlicensed public surface. **Load-bearing? yes** — Task 32 attaches outcome
persistence at this seam.
## Task 19 — NATS hardening batch (2026-08-13)

### D??. Durability is a required two-level lifecycle choice

Decided: `protod.Options.SyncMode` has no valid zero value and accepts exactly
`crash-durable` or `power-durable`; the latter sets the pinned nats-server
`server.Options.SyncAlways` field. `journald` sets an explicit 512 MiB Go
runtime memory limit; `protod` defaults to the same value and exposes an
override flag. Journald requires the same sync choice through its
flag/environment seam. Alternatives: keep the server default implicit; make
sync-always unconditional; infer a choice from deployment. Why: the two levels
make different power-loss claims and their count-10 write comparisons differ by
roughly 30–85x with p=0.000, so choosing silently would either overclaim durability or hide
a material cost. **Load-bearing? yes** — the acknowledgement claim is a
function of this choice.

### D??. Owned stream shapes are standing invariants signaled by advisories

Decided: journal and effector subscribe to the pinned
`$JS.EVENT.ADVISORY.STREAM.UPDATED.<stream>` subject at Open and latch the
advisory itself before re-reading the live shape, so conformant edits and a
transient forbidden shape reverted before that read remain visible. Later
operations refuse with the existing typed bad-shape error. The journal gate separately denies each Task 19
hazard field; the effector pins history to exactly one; both deny
`AsyncPersistMode`. Alternatives: open-time-only checks; polling; attempting to
undo admin changes. Why: the pin emits a precise update advisory, and refusal
preserves evidence rather than racing an administrator with an automatic
repair. **Load-bearing? yes** — otherwise the executable envelope is only a
startup observation.

### D??. Listener credentials are per acquisition and logs carry a drop total

Decided: each protod acquisition generates separate random 256-bit internal and
application passwords; no anonymous user exists, and the client URL carries
the application credential. Each authenticated application connection then
gets a private account with only the public writ service-imported, preserving
issue #56's inbox isolation while superseding its anonymous-client mechanism.
The embedded server uses a protod logger with
`NoLog:false`; pinned JetStream API queue-drop warnings are surfaced with a
monotone `ipq_drops_total`. Product connections carry
app/version/purpose names. Alternatives: static credentials; anonymous mapping
to the restricted user; leave `NoLog:true`; expose a new monitoring Go API.
Why: static/anonymous credentials retain local impersonation, a shared account
leaks inbox traffic, while the log is
the pinned server's synchronous drop signal and does not widen the daemon's
lifecycle-only API. **Load-bearing? yes** for listener authority; **no** for the
client labels.

### D?? disposition. T19-1 keeps direct get denied and pipelines ordinary gets

Decided: Addendum 1 accepts T19-1. The red direct-batch probe remains runnable
under the `task19finding` build tag. Production uses a bounded 16-request window
of ordinary per-message JetStream management gets and folds replies strictly
in sequence order through the unchanged verifier. The pre-change sequential
path remains test-only and agrees on entries, digests, and cursor over the
frozen corpus. Alternatives: enable `AllowDirect`; add a pull consumer; keep the
walk strictly sequential; use a 32-request window. Why: direct get contradicts
the ratified gate, a consumer adds ack/redelivery lifecycle, and 16 was the
smallest measured window that delivered the stable local throughput gain. The
count-10 result is +45.18% crash-durable throughput (p=0.000); the power-durable
delta is noise. **Load-bearing? yes** — request scheduling may not reorder the
identity fold.

### D??. Pipelining's allocation price is explicit

Decided: retain the bounded pipeline despite a measured +0.73% allocations per
1,000-entry read (p=0.000), recorded beside the throughput result. Alternatives:
hide the regression; revert to sequential; reach below the pinned high-level
API for a custom async request multiplexer. Why: each pinned `GetMsg` is a
blocking call, so concurrency necessarily adds goroutine/result bookkeeping;
the crash-durable throughput gain pays that bounded cost, while a lower-level
replacement would need a new semantic wall. **Load-bearing? no** — this is a
performance seam, not an identity law.

## Task 47 — create reply snapshots (2026-08-14)

(D-number assigned 2026-08-15, post-merge repair: D67.)

### D67. Create certificates carry the catalog snapshot captured under commit

Decided: `catalog.commitCertified` returns the fact, convergence bit, and
catalog head as one result captured while holding the catalog lock. For a new
fact, the head is read immediately after that fact's scheme bridge append. For
convergence, the fact sequence remains historical and the head is the snapshot
under which `byDigest` was consulted, after repairing a missing bridge if
needed. Every consumer, including `type.create` and session commit, uses that
captured head rather than re-reading the journal later. Alternatives: read the
head in each caller after certification (permits a later create to move it);
name the fact's head before the bridge (omits evidence the reply witnesses);
return the historical bridge head on convergence (misstates the observation's
catalog snapshot). Why: sequence and head together are provenance, so they must
be produced by the critical section that established their meaning. The
pre-declared orphan-fact crash finding remains unchanged: a bridge failure after
the fact append still drops the reply and is not repaired here. **Load-bearing?
yes** — Task 32 persists this catalog-head provenance.
## Task 46 — daemon-held claim tokens (2026-08-14)

(D-numbers assigned 2026-08-15, post-merge repair: D68–D69.)

### D68. Commit authority is an opaque daemon-held claim token

Decided: a successful journald `claim` returns a fresh 32-byte
cryptographically random lowercase-hex token and records, by effector name and
work digest, the token and exact `effector.Claim` minted by that register. A
successful steal replaces only that composite-keyed entry. `commit` strictly
accepts only `{id,op,name,digest,token,result}`; the removed `fence` and `owner` fields
are unknown fields and therefore malformed. The daemon resolves its recorded
claim and passes that value to `effector.Commit`; a foreign or stale token is
fenced before the effector call. The token is consumed by the first successful
commit. Once the register is `Done`, token validity no longer matters: the same
result is absorbed as `{ok:true,first:false}`, while a different result reports
the register's dominant `committed` fact. The fence remains observable for
diagnosis and lookup but is never wire authority. Alternatives: trust the
client-supplied fence; bind only the client-supplied owner; use a stateless
signed claim envelope; persist the opaque token. Why: the first two leave
authority fabricable, the signed envelope exports the capability's proof
material and key lifecycle, and persistence is unnecessary for lease recovery.
The wire change is explicitly authorized by
`scratch/codex/46-claim-tokens.md` and the ratified workflow-design §6 decision
6; no frozen fixture covers the journald claim/commit seam. **Load-bearing?
yes** — the register proof assumes only the register mints commit authority.

### D69. A journald restart orphans tokens until lease recovery

Decided: the token map is process memory and is deliberately empty after a
daemon restart. The underlying register claim remains authoritative in
JetStream until its lease expires; the old process token cannot be recovered or
used. Recovery is: inspect or retry, observe `held`, wait for lease expiry,
claim again (which steals with a higher fence and mints a new token), then
commit with that token. This is the existing at-least-once lease mechanism, not
lost work or a durability defect. Alternatives: persist tokens beside the
register, deterministically derive a token from the visible fence, or let a
restarted daemon reconstruct authority from claim fields. Why: all three make
authority durable or derivable outside the daemon process and recreate the
transport leak this task closes. **Load-bearing? yes** — operators must treat
restart as lease recovery, never as token recovery.

## Task 49 — flb.protocol.v0 tracer bullet (2026-08-14)

(D-numbers assigned 2026-08-15, post-merge repair: D79–D84. Task 48's
nine entries are D70–D78, in `verify/moves/DECISIONS.md`.)

### D79. The five bootstrap types use the exact expressible v0 shapes

Decided: `task.spec.v0`, `task.authorization.v0`, `task.build_report.v0`,
`task.review.v0`, and `task.decision.v0` use strict structs; optional notes use
`struct.optional`; review findings use a list of strict structs; and verdict is
a union of the three literal strings `accept`, `revise`, and `reject`. Empty
review findings are an ordinary empty list. Alternatives: brand the five
types; encode verdict as a free string plus a check; make findings optional.
Why: every requested shape is directly expressible in the current grammar, so
an approximation or new machinery would widen the contract without need.
**Load-bearing? yes** — runtime fill checking and the protocol's hole identities
depend on these cataloged structures.

### D80. Protocol operations keep dotted request names and NATS-safe subjects

Decided: `contract.describe` names the derived MCP tools exactly
`protocol.create`, `protocol.session.open`, `.fill`, `.close`, and `.state`,
while their transport subjects are the NATS-safe
`flb.req.protocol.create` and `flb.req.protocol.session.*` forms. The contract
remains the only MCP tool list. Alternatives: retain the older underscore MCP
naming convention; hand-register aliases; put tool names directly on NATS.
Why: Task 49 fixes the public tool names, NATS already licenses dots as subject
tokens, and aliases would create a second drifting surface. **Load-bearing?
yes** — MCP derivation must expose all five capabilities without handwritten
registration.

### D81. Bootstrap is executable TypeScript above the three-verb client

Decided: `src/protocol.ts` owns the reusable five-types-first bootstrap and
`examples/bootstrap-protocol-v0.ts` is its runnable entry point. It calls only
the existing request writ through `ProtoClient`; protod owns all validation and
identity derivation. Alternatives: daemon startup side effects; a Go-only
bootstrap command; prose-only copy/paste bodies. Why: catalog contents should
not appear implicitly at daemon acquisition, while an executable client-side
bootstrap is repeatable and same-byte submissions converge. **Load-bearing?
no** — the bootstrap location can move without changing protocol semantics.

### D82. Protocol session identity and evidence are canonical and arrival-free

Decided: the session id is the digest of its canonical open event; each request
replays the owned journal through verify-on-read under one per-session mutex.
Filled meaning contains only the value. The journal derives the authorized seat
from immutable bindings and retains candidate `(value, seat)` evidence;
candidate output sorts by seat then canonical value bytes. If one principal is
bound to multiple authorized seats, the first seat in the hole declaration is
the deterministic holder. Alternatives: include arrival actor in filled
meaning; preserve candidate arrival order; require globally unique principals;
accept an asserted seat in fill. Why: this mirrors Task 48's meaning/evidence
split, makes conflicting arrival orders converge, and keeps seat authority
derived rather than caller-fabricated. **Load-bearing? yes** — fence results and
final state identity must not depend on scheduling.

### D83. Close records explicit unfilled states and digests a non-circular fold

Decided: close changes remaining `open` holes to visible `unfilled`, leaves a
filled state's value in place with `sealed:true`, and changes disputes to
`decided` while retaining candidates. The final digest covers protocol,
bindings, holes, closed status, outcome, and optional predecessor, excluding
session id, journal head, and the digest field itself. Alternatives: infer
unfilled from closed+open; replace filled with a new sealed state tag; include
the close head in the final digest. Why: explicit terminal states are auditable,
the requested state shape already provides `sealed?`, and including the head
would make the close event's identity circular. **Load-bearing? yes** —
predecessor validation and close replay re-derive this exact digest.

### D84. The close-outcome rule keys on the literal hole name `decision`

SUPERSEDED BY: D92 (DEV-675 completion declaration) — the literal is
deleted and the close outcome follows the protocol's required
`completion` field.

Decided (operator, at the task 49 merge): ship with the session runtime
computing a session's outcome from the hole named `decision`
(`protocol_session.go`), and no completion declaration in
`flb.protocol.v0`. Consequence, stated: any protocol value without a
hole of that name closes `abandoned` — silently, since validation never
requires the hole. This records the acceptance review's
FINDING-49-COMPLETION (`scratch/codex/49-protocol-v0.md`), which asked
for a completion field before merge because a cataloged record shape is
cheapest to change before its first real use. Alternatives: a
`completion` field naming the outcome-bearing holes; a per-protocol
close rule; refusing protocols that lack a `decision` hole. Why
deferred: dogfood build — the only consumer is the task-acceptance
scheme, which has the hole. The debt comes due when a second protocol
scheme exists or a dogfood run closes a real session; consult this
entry before either. **Load-bearing? yes** — close is the protocol's
one fence, and a silent `abandoned` is a wrong outcome, not a refusal.

## DEV-673 (assigned at merge e296c8031, 2026-08-15: D84 was the last
heading, so the task-local D85–D86 stand as the final numbers — no
renumbering)

### D85. A fill absorbs at every hole state; refusal is enumerated

Decided (operator, 2026-08-15, Branch A after the DEV-671 three-lens
review): fills are total. A fill arriving at a disputed hole absorbs
into the candidate set via the canonical dispute-merge; a same-value
refill leaves meaning unchanged and journals the confirming holder's
pair; a fill after `decided` leaves the tombstone untouched and appends
the pair to ghost evidence as its receipt. Refusal is exhaustively
enumerated by `D85Refusal`: fills never refuse, disputes refuse only at
decided holes (see D86 for the empty offer), decides refuse unless the
hole is disputed and the value is represented. Alternatives:
round-freeze (disputes frozen at two candidates); order-dependence
within rounds. Why: order-dependence is time leaking into meaning; the
pair-set is already a proved semilattice, so absorb makes terminal
state a function of what was said. **Load-bearing? yes** — the DEV-673
theorem package (strong no-loss, meaning/evidence confluence,
schedule-free fences) quantifies through these semantics.

### D86. An empty dispute offer is refused at every state

Decided (operator, 2026-08-15, on the DEV-673 blocking finding): the
dispute refusal test is `cs = ∅` on the offered set, not emptiness of
the merged set. The original test refused an empty offer at an open
hole but admitted it at a filled one — converting `filled` to
`disputed` — so a kernel-checked two-move permutation changed terminal
meaning and the frozen L2/L5 pair was jointly unsatisfiable
(docs/research/2026-08-15-dev673-spec-review.md). Alternatives: keep
the merged-set test and exclude empty disputes from the confluence
fragment (leaves an order-sensitive behavior reachable on the wire and
a ghost-evidence read in the refusal predicate); a separate ratified
contest-without-alternative move (available later if wanted). Why: a
move that asserts nothing must change nothing, and refusal must be a
function of the move and the meaning fold alone. **Load-bearing?
yes** — meaning confluence over the wire fragment is false without it.

## DEV-674 — the daemon absorbs (2026-08-16; assigned at merge: D86
was the last heading on main, so the task-local D87–D91 stand as the
final numbers — no renumbering)

### D87. A fill is journaled exactly when its (value, seat) pair is new

Decided: one pair-newness rule governs every fill path — open fill,
confirming refill, absorb into a dispute, post-close receipt: the
daemon admits-and-journals a fill iff its `(value, seat)` pair is new
to the hole's retained evidence, and a pair already present replies OK
idempotently with the head unchanged, never appending. The replay
validator enforces the same rule strictly: a stored fill repeating a
journaled pair is refused as corruption, because the serve path never
writes one. Both sites consume one decision kernel
(`protocolFillStep`), so the serve behavior and the journal validation
cannot drift. Alternatives: journal every delivery and rely on the
fold's set union (the journal grows without information under
at-least-once transport); tolerate repeated pairs on replay as no-ops
(admits journals this daemon never writes and silently un-checks the
minimality invariant). Why: journal minimality, at-least-once
collapse, and D85's extensional set semantics become one rule checked
at both fill sites. **Load-bearing? yes** — implements D85 on the
wire; DEV-670's wall drives redelivery vectors against it.

### D88. No-self-revision binds over multi-pair evidence, in open rounds only

Decided: a fill refuses iff the submitting seat already contributed an
evidence pair for the hole's FILLED value and the submitted value
differs (the single-pair `Candidates[0].Seat` check was this
predicate's special case). The predicate binds only at filled holes in
open sessions: disputed holes absorb from any authorized seat — a
dispute is contest, not revision — and after close every fill on a
decided or sealed hole lands as an evidence receipt, even a differing
value from the sealing seat, because there is no dispute left to open
and the seal is the meaning's protection. Alternatives: refuse
post-close self-revisions too (splits the receipt path and adds a
second divergence constructor to the DEV-670 wall mapping); predicate
on "appears among the evidence seats" alone (equivalent for lawful
states; the value-qualified form stays truthful on corrupt ones). Why:
keeps the daemon's divergence from the model's total fills (D85) at
exactly one named constructor, stated over the evidence it depends on.
**Load-bearing? yes** — DEV-670's `selfRevisionRefusedByDaemon`
encodes exactly this predicate.

### D89. Hole folds expose retained evidence; the close digest covers it

Decided: filled holes marshal their `candidates` beside `value` and
`sealed`, so a confirming refill is readable in state reads and fill
replies, not only in the raw journal; disputed and decided holes
already exposed theirs. Consequence, stated: the final state digest —
computed at close over the marshaled hole folds, pinned in the close
event, never recomputed — now covers filled-hole evidence, making
terminal identity a function of the full intent set, meaning AND
evidence, which is D85's thesis on the wire. A journal closed before
this change re-derives a different digest and fails replay; no such
journal exists outside test temp stores (v0, no migration owed).
Alternatives: keep filled folds meaning-only (confirming refills
invisible in every reply, so the acceptance's state-read assertion is
unfalsifiable); expose evidence in replies but digest meaning only
(two hole-fold encodings that drift). **Load-bearing? yes** — digest
preimages are wire law.

### D90. The fill state machine, not a session gate, decides late fills

Decided: the serve path's session-closed pre-check on fill is gone;
hole existence, seat authority, and value conformance refuse first,
and the fill kernel then routes closed-session fills — decided and
sealed holes append receipts, unfilled holes refuse `session-closed`
with the law reworded to "terminal for meaning". Consequence:
post-close refusal kinds changed for unknown holes (was
session-closed, now the unknown-hole refusal), unauthorized principals
(now seat-unauthorized), and non-conforming values (now
invalid-structure). The close verb keeps its early closed check, so a
repeated close still refuses `session-closed`. Alternatives: keep the
gate and carve receipt exceptions inside it (the gate would need
exactly the hole/seat/value context it precedes); a separate receipt
verb (a fourth face for what is still a fill). Why: a refusal should
name the deepest law that fails, and the receipt path needs full
validation anyway. **Load-bearing? maybe** — refusal kinds are
wire-visible teaching and DEV-670's mapping reads them.

### D91. A seat's multiple dispute values fence by canonical byte order

Decided: nothing in `fenceChoice` changed; this records the newly
reachable case. Absorb lets one seat hold several pairs inside a
dispute, and at close the seat-authority fence picks that seat's first
candidate in the canonical sort (seat, then value bytes) — the
tie-break within the chosen seat is smallest canonical value bytes,
deterministic and arrival-free like the rest of the fold. Alternatives
(future ratification if wanted): refuse to fence a multi-value seat;
latest-pair-wins (requires arrival order, refused by D82). Why: the
existing fold already decides this case lawfully; recording it beats
rediscovering it in the wall. **Load-bearing? maybe** — DEV-670's
fence vectors will pin it.

### D91 disposition

Ratified as law at the DEV-675 grill (ruling R5, 2026-08-16) and
recorded as D96: the emergent tie-break is now contract prose in
CONTRACT.md and pinned by `TestFenceTieBreakIsCanonicalWithinTheSeat`.
The refuse-to-fence alternative was rejected at ratification because it
hands any seat a veto on close — submit two values into a dispute and
the session never terminates.

## DEV-675 — the debt-free wire (2026-08-16; task-local D92–D97 —
D91 was the last heading on main; the merger confirms the numbers)

### D92. Close outcome follows a required completion declaration

Decided (operator ruling R1, 2026-08-16 grill): `flb.protocol.v0`
requires `completion`, a non-empty, UTF-16-sorted, duplicate-free
array of declared hole names; close records `completed` exactly when
every named hole ends `filled` or `decided`, else `abandoned`;
creation refuses unknown names, duplicates, unsorted order, and the
empty list — an empty ∀ would close every round vacuously
`completed`, and unconditional completion is declared by naming a
hole the protocol always fills. Alternatives: per-hole `required`
flag (the same facts scattered); a declared outcome expression
(grammar creep); a reserved `decision` convention (D84 with a
permit). Why: one fact in one place, the `struct.optional` sorted-
names law (D9) applied again, and D84's wrong-outcome fault dies at
creation instead of at close. **Load-bearing? yes** — close is the
protocol's one fence, and the outcome now follows a declared fact.

### D93. Hard cutover: the redefined grammar IS flb.protocol.v0

Decided (operator ruling R2, overriding the succession
recommendation): the redefined grammar ships under the existing
version string; every trace of the prior protocol shape is discarded
— no succession machinery, no teaching refusal naming a successor,
no bridge. An old-shape submitted value refuses as malformed at its
missing required field through the ordinary grammar refusal. Build
extension, stated: `protocolFromFact` re-checks the completion and
revision laws on every DECODED catalog fact, so a pre-cutover fact
surviving in an old store refuses at session open and at replay
rather than folding an empty declaration into a vacuous `completed`
— the R2 refusal applied to the catalog surface the ruling's text
did not name. Preconditions verified at the grill: creation's key
allowlist means no cataloged fact carrying the new fields can exist,
and D89 records that no real session journals exist. Alternatives:
the Task 36 scheme-succession precedent; a versioned successor
string. Why: this is the first actually verified valid protocol;
versioning becomes a critical correctness concern FROM THIS POINT,
and nothing needs adherence to the pre-cutover shape.
**Load-bearing? yes** — the DEV-670 wall generates against these
semantics.

### D94. Digest preimages are versioned; replay refuses unknown session versions

Decided (operator ruling R3, composed with the cutover): the session
version string and journal prefix stay `flb.protocol.session.v0`;
the final-state digest's meaning map gains
`"v": "flb.protocol.session.v0"`. The law, binding from this cutover
forward: a digest preimage is frozen for the life of its version
string, any change to what the bytes cover mints the next version,
and the version lives inside the digested bytes, so two preimage
shapes can never collide on one digest domain. The replay open case
splits its error — "repeated protocol session open" vs the named
refusal "a journal written under an unknown session version refuses
replay rather than misfolding". D89 needs no retroactive boundary:
pre-cutover history is discarded outright and the redefined v0 is
the FIRST frozen preimage. Alternatives: version outside the
digested bytes (collidable); no version (the D89 pattern survives).
**Load-bearing? yes** — digest preimages are wire law.

### D95. Revision policy is a required declared field through the one fill kernel

Decided (operator ruling R4): `flb.protocol.v0` requires `revision`,
either `"successor-round"` (the D88 refusal: a seat that contributed
a pair for the filled value may not submit a differing value in the
open round) or `"absorb"` (model-pure: such a fill disputes like any
clash; fills are total). No default — an identity-bearing semantic
is never defaulted. The policy threads through `protocolFillStep` as
a parameter: one kernel, both call sites, both policies, and the
self-revision refusal text is unchanged under `"successor-round"`.
The bootstrap task-acceptance protocol declares `"successor-round"`
(behavior unchanged); per ruling R7 the DEV-670 wall corpus declares
`"absorb"` only, so the wall tests the naked calculus with an EMPTY
open-session fill divergence set and `selfRevisionRefusedByDaemon`
leaves the enum. Alternatives: absorb-only without a field (deletes
the governance protection with no declared opt-in); per-hole
granularity (build when a consumer asks); hard-coded refusal
(divergence enum non-empty forever). **Load-bearing? yes** — the
policy dissolves the last declared divergence from the model's total
fills.

### D96. Fence tie-break within the chosen seat is smallest canonical value bytes

Decided (operator ruling R5): D91's emergent behavior becomes law —
within the fence-chosen seat, the candidate with the smallest
canonical value bytes wins, pinned by
`TestFenceTieBreakIsCanonicalWithinTheSeat` and stated in
CONTRACT.md. Rejected at ratification: refuse-to-fence (hands any
seat a veto on close — a griefing vector beyond making close
partial); latest-pair-wins (requires arrival order, refused by D82).
**Load-bearing? yes** — DEV-670's fence vectors pin it.

### D97. The pure step seam: one kernel per verb, and the fold model lives beside them

Decided (build, under ruling R6's retro-ratification of D87–D90 and
the brief's structural rules): `protocol_step.go` holds the fill
kernel, the new close kernel `protocolCloseStep` (seal / fence /
unfilled / completion outcome / versioned digest — the duplicated
close fold collapsed exactly as DEV-674 collapsed fills), the
`protocolSessionTransition` wrapper the DEV-670 Tier-1 harness
consumes, `protocolOpenFold`, and the fold data model including the
state-dependent `MarshalJSON` — moved here because which fields a
hole state exposes shapes the digest preimage, which is identity,
not presentation. The close kernel owns the session-status branch
(`closeRefusedClosed`), so the serve path's early closed check and
the replay validator's repeated-close refusal are one branch
translated twice; close refusal precedence is preserved (closed
before operator). Callers keep only validation (catalog resolution,
seat derivation, value conformance, operator authority) and outcome
translation; `validatePredecessor`'s read of a terminal fold is
single-sited verification, not a transition twin. Alternatives:
transition covering open too (impossible purely — open needs the
catalog); kernels left in `protocol_session.go` (the review rule
"a semantic switch outside protocol_step.go fails the review" would
be unenforceable). **Load-bearing? maybe** — DEV-670 consumes
`protocolSessionTransition` as its Step-shaped function.

**SUPERSEDED BY DEV-676 S1 (task-local D104; final number assigned at
merge), only as to the literal "operator authority" wording.** The pure
step seam and closed-before-authority refusal precedence remain in force.

## DEV-675 review remediation (2026-08-16; the independent review's
recommended rulings, operator-ratified with G1–G5 — D98–D103 assigned
at merge)

### D98. An unlawful decoded protocol fact refuses at session open as data

Decided (G1 ratified as amended by the independent review):
`serveProtocolSessionOpen` surfaces a `protocolFromFact` failure as a
typed `invalid-structure` refusal at path `protocol` with repair
hints, instead of dropping the reply. CONTRACT.md already promised
"refuses at session open and replay rather than folding"; the build's
silence was the defect. The refusal reuses the frozen
`invalid-structure` kind, so the refusal-sort manifest digest is
untouched. Replay errors on the other serve paths remain wire silence
per D101. Pinned by `TestPreCutoverFactRefusesAtSessionOpen`.
Alternatives: keep silence (contradicts the refusal-as-data law and
the contract's own sentence); a new refusal kind (re-mints the frozen
sort manifest for no new ontology). **Load-bearing? yes** — a client
can now distinguish "recreate the protocol" from "daemon unreachable".

### D99. One completion checker drives creation and decoded facts

Decided (the F6 cure, ratified with G1): the completion law is stated
once — `protocolCompletionCheck` — and both the creation refusal path
(`protocolCompletion`) and the decoded-fact predicate
(`protocolGrammarLawful`) derive from it. Two restatements of one law
in one file would eventually admit at creation what decode refuses,
or vice versa — the "agree by inspection" hazard this issue exists to
kill. Alternatives: keep the twin restatements (drift hazard);
refusal-shaped check only (decoded facts need no paths).
**Load-bearing? yes** — the predicate guards the catalog surface D93
extended.

### D100. The transition seam clones on fill

Decided (F5, per the independent review's recommendation):
`protocolSessionTransition` never mutates its input — a fill clones
the fold before folding, matching close. A DEV-670 Tier-1 harness may
step several events from one snapshot without contaminating its
baseline; the O(fold) clone per replayed event is the stated price.
Pinned by `TestTransitionLeavesItsInputFoldUntouched`. Alternatives:
fill-in-place with a documented ownership asymmetry (the `0db328c`
contract — a footgun the first harness would trip); copy-on-write
holes (complexity unearned at this fold size). **Load-bearing? yes**
— DEV-670 consumes the seam.

### D101. Wire silence for replay errors, unknown session version included

Decided (G2 ratified): on the wire, a journal that refuses replay —
unknown session version included — receives the substrate-corruption
treatment: no reply. The named unknown-version error binds the replay
validator (D94); no wire refusal kind exists for it, because a typed
kind would re-mint the frozen sort manifest for a distinction no
consumer reads today. Revisit when a second session version exists.
Alternatives: a typed wire refusal now (manifest re-mint plus a new
kind for client teaching that has no client). **Load-bearing? no** —
recorded so the silence is a choice, not an accident.

### D102. The moves fixture carries a per-vector protocol variant field

Decided (build, recorded per the review): `protocol-moves.json`
vectors may name a `protocol` variant — `task-acceptance` (default),
`report-completion`, `absorb-decision` — because the fixture's
single-bootstrap format could not express the three cutover vectors.
Both drivers refuse unknown variant names. Alternatives: separate
fixture files per protocol (three walls to keep aligned); inline
protocol definitions per vector (bloats every row for three uses).
**Load-bearing? no**.

### D103. An open-less session journal serves silence, never a panic

Decided (G4, authorized as review repair): the serve paths guard the
nil fold an empty journal replays to — the crash window between
journal creation and the open append — and answer silence until the
open is redelivered; the content-addressed open converges on the same
journal and repairs it. Previously a fill, close, or state request on
such a journal panicked inside the NATS handler and took down the
daemon process. Pinned by `TestEmptyProtocolSessionJournalServesSilence`.
Alternatives: ticket-and-defer (leaves a process-crash exposure a
one-line guard removes); a typed refusal (invents a law for a state
no lawful flow produces). **Load-bearing? no**.

## DEV-676 — declared close authority (2026-08-16; task-local
D104–D108 — final numbers assigned at merge)

### D104. Close authority is a required any-of declaration over seats

Decided (operator-ratified S1): `flb.protocol.v0` requires `close`, a
non-empty, UTF-16-sorted, duplicate-free array of declared seat names.
Any principal bound to any named seat may close the round; creation
refuses an empty declaration, an unknown seat, a duplicate, or unsorted
order at the offending path. The task-acceptance bootstrap declares
`close: ["operator"]`, while the contract vector's `coordinator-close`
variant proves that the seat name is not implicit law. This supersedes
D97 only where its build record called caller-owned close validation
"operator authority"; D97's pure-kernel seam and closed-first refusal
precedence remain. Alternatives: one seat-name string (forecloses any-of
authority); overloading inert `liveness` (gives an existing field implicit
meaning); per-hole close authority (no consumer asks for it). Why: close
authority is one explicit identity-bearing protocol fact rather than a
literal hidden in each caller. **Load-bearing? yes** — without the
declaration a lawful protocol can have no principal able to terminate it.

### D105. The close declaration hard-cuts over under flb.protocol.v0

Decided (operator-ratified S2, the D93 pattern): the grammar keeps the
`flb.protocol.v0` scheme string and makes `close` required. A submitted
old-shape value refuses as malformed at `close`; a close-less decoded
catalog fact refuses through the D98 typed session-open surface and at
replay through `protocolGrammarLawful`. Creation's former key allowlist
could not have cataloged a value carrying `close`, and tracer stores are
temporary, but the refusal is enforced by the grammar rather than relying
on those environmental facts. Alternatives: mint a successor protocol
scheme; default a missing declaration to `operator`; retain a compatibility
decoder. Why: this is the same no-production-state cutover D93 licensed,
and a default would preserve the literal this task removes.
**Load-bearing? yes** — the model-generated wall must freeze only the
declared-authority grammar.

### D106. Close events retain principal only; replay re-derives authority

Decided (operator-ratified S3): the close journal event remains unchanged
and carries its asserted `principal` only. Serve and replay independently
derive whether that principal holds one of the protocol's declared close
seats from the immutable bindings and protocol definition. Alternatives:
record the derived close seat on the event. Why: immutable bindings make
the derivation stable, so the extra coordinate would change the journal
shape without adding evidence. **Load-bearing? yes** — replay must reject
unauthorized stored closes without trusting a recorded authorization claim.

### D107. Declared close authority does not mint a session version

Decided (operator-ratified S4): `flb.protocol.session.v0` remains the
session version. The final-state digest preimage still contains exactly
`v`, protocol, bindings, holes, status, outcome, and optional predecessor;
the changed grammar already moves the referenced protocol digest. No close
declaration or derived seat is added beside that digest. Alternatives: mint
a new session version; duplicate the close declaration or derived seat in
the final-state preimage. Why: D94's freeze law applies to the preimage's
field set, which this change does not alter. **Load-bearing? yes** — the
no-mint is an identity decision, not an omitted migration step.

### D108. One declared-names checker serves completion and close

Decided (operator-ratified S5, generalizing D99): one checker owns the
non-empty, UTF-16-sorted, duplicate-free, declared-name law. Its taught
noun is parametrized — "a hole name declared by this protocol" for
`completion`, "a seat declared by this protocol" for `close` — and both
fields derive their creation refusals and decoded-fact predicates from
that checker. The field-specific whole-shape and sorted-order teaching
remain declaration-relative. Alternatives: add a second close checker;
repeat either law inside `protocolGrammarLawful`. Why: creation and replay
must not drift on which identity-bearing declarations they admit.
**Load-bearing? yes** — two restatements can make a catalog fact creatable
but unreplayable, or replayable despite being uncreatable.

## Task 21 — float leaf drop (2026-08-16; task-local D?? entries — final
numbers assigned at merge)

### D??. The removed float leaf uses the existing unknown-kind refusal

Decided: `{"k":"float"}` falls through the existing `invalid-structure`
unknown-kind path in type authoring and the existing nonconforming-value path
in protocol fills. No float-specific refusal kind or law is added. The
committed negative control pins `invalid-structure`, path `["partial","k"]`,
and the existing unknown-kind law for a concierge fill vector. Alternatives:
mint a `float-removed` refusal; retain a compatibility admission path; report
the leaf as malformed JSON. Why: post-sweep ruling 2 narrows the grammar rather
than adding a new failure ontology, and the existing refusal already names an
unlawful kind precisely. **Load-bearing? yes** — a new refusal kind would move
the frozen refusal-sort manifest for no new semantic distinction.

### D??. Every active grammar mirror hard-cuts under the existing v0 name

Decided: remove the leaf from the Go certifier, completion/frontier alphabets,
session grammar descriptor, value checker, TypeScript author/session/codegen
mirrors, and the Lean TyX reference grammar. `Schema.Number` now returns the
existing local `beyond-v0` refusal; numeric check rows remain representable on
`Schema.Int`. JSON-scalar numeric literals, `opaque` values, and the RFC 8785
canonicalization seam remain unchanged. Alternatives: leave decode/codegen
compatibility for cataloged float nodes; remove JSON numbers generally; defer
the Lean change until the referee engine. Why: parallel compatibility would
keep the drift the ruling exists to remove, while narrowing JCS would cross the
explicit task boundary. **Load-bearing? yes** — REF-2a quantifies over this
narrowed whole grammar.

### D??. Regenerate only fixtures whose bytes depend on the removed leaf

Decided: regenerate `types.json`, `chains.json`, `frames.json`, and
`concierge.json` with `go run ./cmd/wirefix -force`, then mechanically
recompute `sessions.json` with the TypeScript identity implementation because
the session grammar digest and every dependent chain head move. The stated
reason is **"post-sweep ruling 2, float leaf leaves v0"**. The sensor fixture
uses `{"k":"opaque"}` for its number-valued `reading`, preserving evidence
that arbitrary JSON numbers remain inside JCS without reintroducing a float
type leaf. `owned-types-v1.json`, `scheme-bridges.json`, and protocol-move
fixtures contain no float leaf and stay byte-identical. Alternatives: hand-edit
expected digests; retain the float-bearing rows; regenerate unrelated fixture
families. Why: fixture identity is bytes, so every dependent digest must come
from the existing generators while unrelated frozen evidence stays fixed.
**Load-bearing? yes** — stale fixture bytes would make both runtime walls fail.

## Task 25 — float/hygiene cure (2026-08-17; task-local D?? entries — final
numbers assigned at merge)

Cures the Rev findings in
`docs/research/2026-08-16-review-float-hygiene-branch.md` under the brief
`scratch/dispatch/25-float-hygiene-cure.md`. Authority for the admission
change is post-sweep rulings 5 and 6
(`docs/design/2026-08-16-ref0-extraction-grill-record.md`).

### D??. `sessions.json` is generated by driving a live daemon, not recomputed

Decided: `cmd/wirefix` gains `buildSessions`, which acquires a daemon, opens one
`flb.session.v0` session as `fixture-agent`, plays fill/fill/unfill/fill, reads
the session journal back, and writes the exact canonical payloads the daemon
appended together with the chain heads over them and the daemon's own state
digests. The file gains a `_provenance` line naming
`go run ./cmd/wirefix -force`, and both readers now require that line
(`session_test.go`, `session-journal.test.ts`). Alternatives: commit a
TypeScript recompute script matching the prose claim at `CONTRACT.md:395`;
keep hand-editing the file when the grammar digest moves; drop the mechanical
claim from `CONTRACT.md` instead of backing it. Why: house law is that a
model-standing fixture is generated by executing the model and that a gate
diffs a fresh regeneration byte-for-byte — a recompute script would restate the
event shapes a second time, while driving the daemon observes them. Regenerating
under this generator reproduced every digest the hand-edited file carried,
which independently confirms the Rev seat's oracle result (F6).
**Load-bearing? yes** — without a command, a future disagreement on these bytes
cannot distinguish drift from corruption.

### D??. The generator learns the grammar digest from the daemon's refusal

Decided: `wirefix` obtains the session grammar digest by opening under a
64-zero digest the daemon cannot hold and reading the `expected` field of the
resulting teaching refusal. Alternatives: export
`protod.SessionGrammarDigest()`; recompute the descriptor inside `wirefix`;
add the digest to `contract.describe`. Why: `proto/AGENTS.md` keeps protod's
public API to lifecycle only, and recomputing the descriptor would make the
generator one more restatement of the very grammar this fixture exists to
catch drift in. Using the refusal is also a standing demonstration of W7 — the
refusal carries enough to self-repair without external docs.
**Load-bearing? maybe** — if the open refusal ever stops naming the expected
digest, fixture generation fails loudly rather than silently pinning a stale
grammar.

### D??. One integrality bound, stated once, governs every v0 number position

Decided: `{"k":"literal"}` admits string | integral number | bool | null, where
"integral" is the bound the estate already wrote for `{"k":"int"}` —
`Trunc(n) == n` and `|n| <= 9007199254740991`. The bound is factored into one
predicate (`isIntegralJSONNumber`, `walk.go`) that both positions call; the
`int` case now calls it instead of restating it, and `Number.isSafeInteger` is
the exact TypeScript mirror in the author fold. A non-integer literal refuses
as `invalid-structure` under its own law — "a literal number is integral —
whole and within ±(2^53-1)" — rather than under the scalar-shape law, so the
teaching names the bound that was missed instead of calling `0.1` a non-scalar.
Alternatives: restate the bound at the literal site; refuse non-integer
literals under the existing "a JSON scalar" law; leave `literal` wide and
re-price REF-2a's charter to exclude literal scalars. Why: post-sweep ruling 5.
The float-leaf drop was supposed to leave no non-integer number in type
identity bytes, and `{"k":"literal","value":5e-324}` was still lawful — the
exact ES2019 §7.1.12.1 shortest-round-trip object the drop existed to avoid
formalizing. A second statement of the bound is how the two positions would
drift apart again. **Load-bearing? yes** — REF-2a's canonical-value theorem
quantifies over this grammar, and one admitted non-integer number reinstates
the shortest-round-trip proof obligation.

### D??. The session grammar descriptor restates the narrowed literal production

Decided: the descriptor's literal row changes from `{"value": "json"}` to
`{"value": "string|integral-number|bool|null"}` in the Go daemon, the
TypeScript mirror, and the deliberately hand-restated black-box copy in
`session_conformance_test.go`. The session grammar digest therefore moves a
second time in this lane, `d5ff3590… → 78aff5581… → ca4ac75f…`, and
`sessions.json` is regenerated through `cmd/wirefix`. Alternatives: leave the
row at `"json"` because the descriptor's resolution never distinguished scalars
from objects anyway; describe the bound in prose beside the descriptor without
moving the digest. Why: the descriptor exists to commit production SHAPES, so
that a shape change necessarily opens under a different grammar identity — a
narrowed literal position under an unchanged digest would let a client hold a
digest that no longer says what the daemon admits, which is exactly the drift
the descriptor is built to make impossible. The restatement also retires a
pre-existing coarseness: the row said `"json"` where the grammar has only ever
admitted scalars. **Load-bearing? yes** — the digest is the client's only
handle on which grammar it is authoring against.

### D??. Regenerating `sessions.json` is the whole fixture consequence

Decided: the narrowing moves no fixture but `sessions.json`, and that file is
regenerated by `go run ./cmd/wirefix -force` with the stated reason **"post-sweep
ruling 5, literal scalars narrow to integers"**. Exactly nine values move
(the grammar digest, the session key, step 0's `grammar` and `canonical`, and
all five chain heads); every state digest is unchanged because state digests
are taken over the partial term, not the grammar. `types.json`, `chains.json`,
`frames.json`, and `concierge.json` regenerate byte-identical, verified by
running the generator into a clean directory and comparing. A tree-wide sweep
found no committed non-integer literal anywhere — the corpora that carry
literals use `"on"`, `"off"`, `10`, `true`, and `null` — so nothing else needed
regeneration. Alternatives: hand-edit the moved digests; regenerate the whole
fixture family to be safe. Why: fixture identity is bytes, and a regeneration
that also rewrites untouched evidence destroys the ability to read the diff as
a claim. **Load-bearing? yes** — a stale grammar digest makes every session
open refuse.
