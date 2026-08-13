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
| publish a frame | `flb.ing.<journal>` | request/reply (the reply admits or refuses) |

`<journal>` matches `^[A-Za-z0-9_-]+$` and is never `catalog` — the
catalog is written only by the daemon, through `type.create`. Requests
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

Fact: `{"ok":true,"created":bool,"digest":hex64,"scheme":"bytes-sha256-v1",
"catalogSeq":int,"catalogHead":hex64,"next":[hint...]}`

The daemon canonicalizes the structure itself (RFC 8785) and derives
the digest from those bytes (W1, W2). Same bytes converge:
`created:false` with the existing fact, never an error (W3). An
asserted digest the daemon cannot re-derive refuses with both values.

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
  "kind": "<see table>", "law": "<the sentence that refused>",
  "path": ["..."]?, "got": ...?, "expected": ...?, "example": ...?,
  "next": [{"subject": "...", "note": "...", "body": {...}?}],
  "local": false
}}
```

`local` is `false` in every daemon refusal; the TS client emits the
same shape with `local:true` for its own conditions (`unreachable`,
`malformed-reply`, `verify-failed`, `beyond-v0`, `underivable`).
Every local refusal carries at least one `next` action and never performs that
action implicitly; daemon refusals may use an empty list when absence itself is
the complete fact.
`unreachable` reports only that no reply arrived before the client's deadline;
it does not claim whether the network failed or a reachable daemon stayed
silent.

| kind | law it names |
|---|---|
| `malformed` | body is not JSON / not an object / field shapes wrong |
| `invalid-structure` | flb.type.v0 grammar violation (path/got/expected/example) |
| `unknown-ref` | a ref digest does not resolve in the catalog |
| `digest-mismatch` | asserted identity the daemon cannot re-derive (W1) |
| `unknown-identity` | frame claims an uncataloged digest (W4) |
| `bad-journal` | ingress names an invalid or reserved journal |
| `unknown-journal` | read addresses a journal that does not exist (lag is absence) |
| `bad-cursor` | read cursor does not verify against the journal (W6) |
| `unknown-request` | request subject has no handler (W9) |

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

Interim scheme `bytes-sha256-v1` (W10): SHA-256 over the RFC 8785
canonical bytes of the structure. Every catalog fact is scheme-tagged;
ticket 004's owned scheme (canonical(normalize(term)) over the
flb.type.v0 walk) lands as a second scheme with no wire change.

## Fixtures (frozen)

Generated once by `proto/go/cmd/wirefix`; both sides re-derive
independently (`proto/go/protod/wall_test.go`,
`proto/ts/test/wall.test.ts`). Never edit; regeneration requires
`-force` and a stated reason committed with the change.

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
