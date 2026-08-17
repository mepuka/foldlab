# proto/wire — the seam as data

The daemon's interface is subjects carrying JSON; this file pins the
subjects and shapes, and `fixtures/` pins the bytes. The runtime
authority for shapes is `contract.describe` (the daemon describes
itself; the MCP tool surface is derived from that reply, not from this
file). This file is the human contract; a disagreement between it and
the daemon is a bug in one of them.

## Subjects

| surface | subject | pattern |
|---|---|---|
| create a type | `flb.req.type.create` | request/reply |
| fill one type hole | `flb.req.type.fill` | request/reply |
| unfill one type node | `flb.req.type.unfill` | request/reply |
| read a journal | `flb.req.journal.read` | request/reply |
| describe the contract | `flb.req.contract.describe` | request/reply |
| open a construction session | `flb.req.session.open` | request/reply |
| append a session move | `flb.req.session.move` | request/reply |
| resume session state | `flb.req.session.state` | request/reply |
| commit a decided session | `flb.req.session.commit` | request/reply |
| create a protocol | `flb.req.protocol.create` | request/reply |
| open a protocol session | `flb.req.protocol.session.open` | request/reply |
| fill a protocol hole | `flb.req.protocol.session.fill` | request/reply |
| close a protocol session | `flb.req.protocol.session.close` | request/reply |
| read protocol-session state | `flb.req.protocol.session.state` | request/reply |
| publish a frame | `flb.ing.<journal>` | request/reply (the reply admits or refuses) |

`<journal>` matches `^[A-Za-z0-9_-]+$` and is never `catalog` or a name
beginning `flb_session_v0_` or `flb_protocol_session_v0_` — those journals are written only by the
daemon through their request kinds. Requests
on unknown `flb.req.*` subjects are answered with an `unknown-request`
refusal (data, not silence). Requests without a reply inbox are dropped:
there is nowhere to teach into.

## Envelopes

Every reply is either the request's **fact** shape or the uniform
**refusal** `{"ok":false,"refusal":{...}}`. Nothing throws across the
seam; no NATS error ever carries a domain "no" (W8).

Reply decoding is recursively exact: unknown properties refuse instead of
being stripped. Digest and head coordinates are 64 lowercase hexadecimal
characters; published sequence coordinates are safe non-negative integers
(`journal.read.from.seq` alone also admits the genesis coordinate `-1`). A
daemon refusal must carry `local:false`. Go and TypeScript apply these laws to
the shared adversarial corpus in `reply-conformance.json`; its claim is
corpus-sized accept/refuse equivalence, not proof over all JSON values.

### type.create

```json
{"structure": <flb.type.v0>, "assertedDigest": "<hex64>"?, "submitter": "<string>"?}
```

Fact: `{"ok":true,"created":bool,"digest":hex64,"scheme":"flb.type.v1",
"catalogSeq":int,"catalogHead":hex64,"next":[hint...]}`

The daemon validates and normalizes the owned structure, canonicalizes
the normal form itself (RFC 8785), and derives the digest from those
bytes (W1, W2). Same normal form converges:
`created:false` with the existing fact, never an error (W3). An
asserted digest the daemon cannot re-derive refuses with both values.
Each new certification appends the owned fact and then a canonical
`flb.scheme-bridge.v0` record from `bytes-sha256-v1` to `flb.type.v1`;
neither prior fact is ever rewritten.

`catalogSeq` addresses this create's fact. For `created:true`, `catalogHead`
is the catalog head immediately after this create's fact and bridge, captured
under the same catalog lock. For `created:false`, the sequence remains the
historical fact's position and the head is the catalog snapshot under which
convergence was observed. Heads are claims; readers verify them (W6).

### type.fill / type.unfill

```json
{"partial": <flb.type.partial.v0>, "path": ["edge", "..."], "subtree": <flb.type.partial.v0>}
{"partial": <flb.type.partial.v0>, "path": ["edge", "..."]}
```

`type.fill` replaces the hole at `path` with `subtree`; `type.unfill`
replaces the type node at `path` with `{"k":"hole"}`. Root is `[]`.
Child paths are `of` for list/brand, `base` for check,
`fields/<name>` for struct, and `of/<decimal-index>` for union. Paths
address type nodes only — metadata positions refuse.

Fact for both:

```json
{"ok":true,"partial":<flb.type.partial.v0>,"frontier":[
  {"path":["..."],"legal":[{"kind":"string","example":{"k":"string"}}],
   "refs":["<resolvable digest>"]}
],"next":[hint...]}
```

The entire authoring state is in the request and reply; the daemon
stores no session. Repeating the same request against the same catalog
returns byte-identical data (C1), and unfill at the same path is the
inverse of fill (C2). To enter the concierge without another verb,
fill the root hole with a root hole:

```json
{"partial":{"k":"hole"},"path":[],"subtree":{"k":"hole"}}
```

The frontier contains every hole in deterministic depth-first order;
struct fields use UTF-16 name order and union positions preserve their
partial order. Every `legal[].example` is directly accepted at that
path (C4). All final v0 kinds are advertised; `ref` appears only when
the catalog supplies a truthful example. `refs` is the lexicographically
first 16 resolvable digests. An empty frontier means zero holes and is
exactly when `type.create` accepts the partial (C3).

### flb.session.v0

```json
{"grammar":"<current grammar digest>","seed":<partial>?,"author":"<non-empty>"}
{"session":"flb_session_v0_<hex64>","expectedHead":"<hex64>","principal":"<open.author>",
 "op":"fill"|"unfill","path":["..."],"subtree":<partial>?}
{"session":"flb_session_v0_<hex64>"}
{"session":"flb_session_v0_<hex64>","expectedHead":"<hex64>",
 "principal":"<open.author>","submitter":"<string>"?}
```

These are respectively `session.open`, `session.move`, `session.state`, and
`session.commit`. The session name is SHA-256 over the canonical `open` event,
and its suffix names one reserved journal. `open` defaults `seed` to a root
hole; identical open data converges on the same journal.

`expectedHead` and `principal` are mandatory on every state-changing move
(fill, unfill, commit). `open.author` establishes the session's one asserted
owner coordinate. Missing principal is malformed; an unequal one returns
`session-principal`; both refuse before append. Concurrent clients may write
under that same principal and still race only through expected-head CAS. A stale
head returns `session-stale` with the current head/state and the exact refused
move context plus a filled retry body. It never invokes the effector: session
traffic is evidence guarded by journal position-CAS. This is ownership, not
authentication: the present loopback daemon has no `auth_basis`, and real
principal authentication remains a separate required gate.

State facts carry `session`, `head`, `step`, `principal`, `partial`, `stateDigest`,
`stateScheme`, `catalogHead`, `frontier`, `anchor:{key,head,stateDigest}`, and
`next`. The frontier is computed solely from the partial and the catalog
snapshot named by `catalogHead`; session history is not an input. Commit first
replays the verified journal, normalizes and canonicalizes the zero-hole state,
and requires its current `bytes-sha256-v1` digest to equal the daemon-derived
catalog digest (L7). The commit journal event additionally records `scheme`,
`catalogSeq`, and `catalogHead`; a future scheme is a dual record/bridge, never
an in-place reinterpretation of this fact. Those catalog coordinates are the
same locked certification snapshot described by `type.create`, never a later
head read by the session caller.

Every session event carries a retention mark. Each fill, unfill, and commit event
also carries `principal`, so restart and replay re-establish ownership from the
journal rather than process memory. Fill/unfill/refusal/read traces
are `compactible`; open/utterance/proposal traffic is `irreducible`; commit and
adoption facts are `never-discardable`. Before a session prefix can compact,
its structural refusals export to the `flb.certification.v0` corpus, absence
refusals die with the head-relative trace, and both the state digest and corpus
digest remain as evidence of what was summarized. Actual compaction is blocked
in this build because that corpus-sealing seam does not exist. The typed
`compaction-blocked` path retains the complete session.

### flb.protocol.v0 and protocol sessions

`protocol.create` catalogs a strict `flb.protocol.v0` value after validating
nonempty unique seats, hole-seat inclusion, type resolution, the fence law,
the completion and close declarations, and the revision policy. A single-seat
hole must not carry a fence. Every multi-seat hole carries
`{"rule":"seat-authority","order":[...]}`, where `order` is a permutation
of its seats. `completion` is required: a non-empty, UTF-16-sorted,
duplicate-free array of declared hole names — the holes whose terminal
states decide the close outcome. The empty list refuses, because an empty ∀
would close every round vacuously `completed`; unconditional completion is
declared by naming a hole the protocol always fills. `close` is required: a
non-empty, UTF-16-sorted, duplicate-free array of declared seat names — the
seats whose bound principals may close the round (any-of). `revision` is
required and is either `"successor-round"` or `"absorb"` — an identity-bearing
semantic is never defaulted. A value missing `completion`, `close`, or
`revision` refuses as malformed at the missing field's path. The daemon derives
identity from the protocol record's RFC 8785 bytes and records the catalog fact
under scheme `flb.protocol.v0`. A cataloged fact that does not satisfy this
grammar refuses at session open and replay rather than folding.

The four session requests are:

```json
{"protocol":"<digest>","bindings":{"seat":"principal"},"predecessor":{"session":"...","state_digest":"<digest>"}?}
{"session":"...","principal":"...","hole":"...","value":...}
{"session":"...","principal":"..."}
{"session":"..."}
```

They are respectively `protocol.session.open`, `.fill`, `.close`, and
`.state`. Bindings name every declared seat exactly once and remain immutable.
The journal name is content-addressed from the canonical open event. State is
always reconstructed by a verified journal read.

An open hole fills with meaning only; every non-open hole fold exposes its
retained journal evidence as `candidates`. A fill is admitted and journaled
exactly when its `(value, seat)` pair is new to the hole's evidence;
redelivering a journaled pair replies OK with the head unchanged, so
at-least-once delivery cannot grow the journal. A same-value refill from a
new seat journals the confirming pair with meaning untouched. A different
value from a seat that has not contributed the filled value turns the hole
into a canonical pair-attributed dispute built from every evidence pair plus
the offender, and further fills on a disputed hole absorb into the candidate
set from any authorized seat. What a different value from a seat that
already contributed the filled value does is the protocol's own declared
policy: under `revision: "successor-round"` it refuses (no self-revision:
correction is a successor round), and under `revision: "absorb"` it disputes
like any other clash — fills are total and the open-session fill path
carries no divergence from the model. `close` is atomic under the per-session
serialization point, and a close principal must hold one of the protocol's
declared close seats (any-of). It seals filled holes, fences disputes by the
declared seat order — within the fence-chosen seat the tie-break is smallest
canonical value bytes, deterministic and arrival-free — records open holes as
unfilled, and closes with `completed` exactly when every hole named by the
completion declaration ends `filled` or `decided`; otherwise it records
`abandoned`. A closed session is terminal for meaning: fills on decided and
sealed holes append evidence receipts and never move the final state digest,
while fills on unfilled holes and repeated closes refuse.

The final state digest covers the session version string
(`"v": "flb.protocol.session.v0"`), protocol, bindings, hole folds (their
retained evidence included), status, outcome, and optional predecessor, but
not the journal head (which would be circular). The close event commits that
digest and the reply's head is captured inside the same critical section; the
digest is pinned at close and later evidence receipts never recompute it.

### Versioning

A digest preimage is frozen for the life of its version string: any change
to what the digested bytes cover mints the next version, and the version
string lives inside the digested bytes, so two preimage shapes can never
collide on one digest domain. `flb.protocol.session.v0` as defined above is
the first frozen preimage. Replay refuses a version it does not carry with a
named error — a journal written under an unknown session version refuses
replay rather than misfolding.

### journal.read

```json
{"journal": "<name>", "from": {"seq": int, "head": "<hex64>"}?, "max": int?}
```

Fact: `{"ok":true,"journal":name,"entries":[{"seq","prev","payload"}...],
"seq":int,"head":hex64,"note":...,"next":[...]}`

`from` defaults to `{seq:-1, head:GENESIS}`. Heads are claims (W6): the
reply says so in `note`, and the reader recomputes the chain locally
(entry digest = SHA-256 of the canonical bytes of
`{"payload":...,"prev":...,"seq":...}`, chained from all-zero genesis).
A cursor that does not verify refuses (`bad-cursor`) and leaks nothing.
The daemon verifies the supplied cursor against the stored entry even when the
returned suffix is empty. The reader accepts a fact only when its `journal`
both matches this grammar and equals the exact journal requested; chain linkage
alone cannot prove that attribution.

### ingress frame

```json
{"type": "<hex64 of a cataloged structure>", "payload": <any json>}
```

Admit: `{"ok":true,"admitted":true,"journal":name,"seq":int,"head":hex64,
"note":...,"next":[...]}`

Admission checks IDENTITY RESOLUTION ONLY. Payload conformance against
the claimed structure is explicitly NOT checked (ratified; conformance
arrives later as a codegen-derived codec) — the admit reply's `note`
says so. The admitted journal entry payload is the CANONICAL bytes of
the frame, never the sender's formatting. Extra frame keys beyond
`type`/`payload` are admitted as content (they enter the canonical
bytes).

### refusal (uniform)

```json
{"ok": false, "refusal": {
  "kind": "<see table>", "sort": "structural|absence",
  "law": "<the sentence that refused>",
  "path": ["..."]?, "got": ...?, "expected": ...?, "example": ...?,
  "next": [{"subject": "...", "note": "...", "body": {...}?}],
  "local": false
}}
```

`sort` is persisted in every daemon refusal. Readers of archived values use
that field; they never reclassify the kind through current code. The canonical
kind-to-sort manifest for `flb.type.v0+flb.session.v0+flb.protocol.v0` is frozen in
`refusal-sorts.json` under grammar digest
`26193b59e8c12952edaf206d1d31dca7974843c5db0f19f9be2f2faabc35ad03`;
a re-sort must mint a new digest. Only `structural` refusals may enter a future
permanent refusal corpus. `absence` is a head-relative observation whose
missing evidence may later arrive.

`local` is `false` in every daemon refusal. The TS client's own conditions
(`unreachable`, `malformed-reply`, `verify-failed`, `beyond-v0`,
`underivable`) carry `local:true` and deliberately have no daemon sort.

| kind | sort | law it names |
|---|---|---|
| `malformed` | `structural` | body is not JSON / not an object / field shapes wrong |
| `invalid-structure` | `structural` | owned type/protocol grammar or move-state violation (path/got/expected/example) |
| `unknown-ref` | `absence` | a ref digest does not resolve in the catalog |
| `digest-mismatch` | `structural` | asserted identity the daemon cannot re-derive (W1) |
| `unknown-identity` | `absence` | frame claims an uncataloged digest (W4) |
| `bad-journal` | `structural` | ingress names an invalid or reserved journal |
| `unknown-journal` | `absence` | read addresses a journal that does not exist (lag is absence) |
| `bad-cursor` | `structural` | read cursor does not verify against the journal (W6) |
| `unknown-request` | `structural` | request subject has no handler (W9) |
| `session-stale` | `absence` | expectedHead is not the session's current head (G3) |
| `session-principal` | `structural` | mutator principal differs from immutable `open.author` |
| `compaction-blocked` | `absence` | the certification corpus seam is unavailable (G4) |
| `seat-unauthorized` | `structural` | principal holds no seat authorized for this move |
| `session-closed` | `structural` | protocol session is terminal |

Every local refusal carries at least one `next` action and never performs that
action implicitly; daemon refusals may use an empty list when absence itself is
the complete fact. `unreachable` reports only that no reply arrived before the
client's deadline; it does not claim whether the network failed or a reachable
daemon stayed silent.

For a concierge `unknown-ref`, a populated catalog makes the refusal's
first repair executable: `example` is a resolvable digest and `next[0]`
is a `type.fill` body whose offending ref position has been re-holed and
filled with that example. Candidates use the frontier's deterministic,
bounded digest order. With no catalog candidate, the refusal retains the
wire-frozen retry/describe fallback because no honest replacement exists yet;
making its internal create/read advice survive the generic concierge teacher
remains a bounded residual outside the populated-catalog one-step repair.

## flb.type.v0 specifics pinned by this implementation

- Nodes are strict: unknown `"k"` refuses; unknown keys refuse.
- `{"k":"opaque"}` means any well-formed v0 value not structurally
  described here. It has no children; derivation targets render it
  permissively (`Schema.Unknown`, JSON Schema `{}`, Go `any`).
- `struct.optional` names must be declared, unique, and sorted by
  UTF-16 code units.
- `union.of` is non-empty; members are recursively normalized, sorted
  lexicographically by their canonical UTF-8 bytes, and must be unique
  after sorting. Arrays whose order is not semantic must define a sort:
  RFC 8785 sorts object members only, not arrays.
- `check.args` is a required JSON object (possibly empty); check names
  are free strings from the foldlab-owned table (`minLength`,
  `maxLength`, `pattern`, `min`, `max`, `greaterThan`, `lessThan` in
  the bullet).
- `ref.digest` is 64 lowercase hex and must resolve at create time —
  the catalog is a DAG by construction. On the Effect authoring side a
  ref is a non-parametric Declaration whose required `identifier`
  annotation is that digest. General annotations remain uncommitted:
  a Declaration identifier bears identity because it is the node's only
  canonicalizable substance.
- `{"k":"hole"}` exists only in `flb.type.partial.v0`. It has no
  digest, never enters `type.create`, the catalog, generated code, or
  the identity fixtures (C5). Partials preserve union positions so
  fill/unfill has an exact inverse; `type.create` performs the final
  canonical member sort and duplicate refusal.

## Identity

Owned scheme `flb.type.v1` (W10): SHA-256 over the RFC 8785 canonical
bytes of `normalize(term)`. Normalize is total on grammar-valid terms,
structurally terminating, confluent, and idempotent; its first clause
sorts union members by canonical bytes after recursively normalizing
them. The predecessor `bytes-sha256-v1` remains accepted as
attestation-grade during the dual-run transition. Every catalog fact
is scheme-tagged, and every transition is append-only bridge evidence.

## Fixtures (frozen)

`types.json`, `chains.json`, `frames.json`, and `concierge.json` are
generated by `proto/go/cmd/wirefix`; both sides re-derive them independently
(`proto/go/protod/wall_test.go`, `proto/ts/test/wall.test.ts`). Never edit;
regeneration requires `-force` and a stated reason committed with the change.

- `types.json` — flb.type.v0 structures with canonical bytes + digests
  (leaves, opaque, literals, UTF-16 key ordering, canonical union order,
  escapes, nesting, ref).
- `chains.json` — journal chain vectors: payloads → entry digests → head.
- `frames.json` — ingress frames with canonical bytes (unicode, number
  normalization).
- `concierge.json` — public fill/unfill request/reply pairs, including
  successful steps and teachable refusals; Go also replays each pair
  against a live daemon.
`reply-conformance.json` sits beside the generated identity fixtures but is a
hand-authored adversarial conformance corpus. Its `_provenance` field records
the first freeze, independent Go oracle, and both executable readers. It may
grow only with a stated reply-domain reason; existing rows are frozen evidence.
- `sessions.json` — one `flb.session.v0` dialogue with each canonical event
  (including its owned principal), per-prefix chain head, and normalized state
  digest (U3 R0). Its canonical events and dependent heads are mechanically
  recomputed through `proto/ts/src/jcs.ts` when the grammar digest moves.
- `owned-types-v1.json` — the new owned-scheme normal forms and digests,
  including nested, permuted-union, and ref-bearing terms.
- `scheme-bridges.json` — canonical dual-scheme evidence records decoded
  and re-derived by both runtimes.

`protocol-moves.json` is the one Task 49-authorized addition to this directory.
It is hand-authored, carries its own provenance, and is exercised through the
real Go runtime and the TypeScript client decoder. The vectors are a WALL
against the proved model rule, not a correspondence proof. In particular,
they do not prove correspondence between the Lean model and the daemon.
