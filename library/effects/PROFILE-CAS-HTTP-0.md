# The cas-http/0 wire profile

The normative wire contract for the remote content-addressed store.
`cas-http/0` is a versioned project profile — not an HTTP or CAS
standard. The semantic authority behind every clause is the Lean
remote client machine and its conformance vectors; this document
binds wire syntax to that model and never introduces semantics of its
own. Endpoints are added to `/0` only additively; any change to the
meaning of an existing exchange mints `cas-http/1`.

Status of each section is marked: **implemented** (normative and
shipping in the client), **ratified** (normative now; implementation
landing in a named slice), or **planned** (design authority in the
research tree; not yet normative). This document is the sole wire
authority; the package README describes library behavior above the
wire and points here for protocol law.

## 1. Common rules (implemented)

- One authority per layer; three resource spaces: the data plane
  `{authority}/cas/{hex}`, the control plane `{authority}/control/…`,
  and the root registry `{authority}/roots/{hex}`.
- Every request and response body is `application/octet-stream` with
  a closed binary framing. The framing is the codec; the profile
  carries no JSON. Media-type comparison is exact.
- One status→event table for every endpoint: `401` unauthenticated,
  `403` denied, `429` rate-limited (with retry-after), every `3xx` a
  redirect event that the shell never follows, `503`/`507` capacity.
  Malformed bodies and lengths map to the existing exchange alphabet
  (truncation), never to invented events.
- The HTTP shell performs no retry and follows no redirect; retries
  and redirects are semantic-core decisions.
- Content encoding is identity-only at `/0`: any non-identity
  `content-encoding` on a response is a typed protocol violation —
  the decompressed budget stage exists for future profiles, and
  nothing at `/0` may silently inflate bytes past the decoded
  counter.

## 2. Data plane (implemented)

- `GET {authority}/cas/{hex}` — load one node. Accepts only `200`
  with `application/octet-stream`; `404` is content-not-found. The
  declared `content-length` and a running byte counter bind the
  decoded budget before any admission.
- `PUT {authority}/cas/{hex}` — upload one canonical node as the
  body. Accepts `200`, `201`, or `204`; `409` is a server-side
  integrity mismatch. The client verifies content against the
  address before issue and re-verifies at the acknowledgment.

Acknowledgment closure (implemented): successful upload and publish
acknowledgments are CLOSED EMPTY bodies — `204` terminates at its
header section per its standard, and a nonempty body on any
acknowledgment is a typed protocol violation, never silently
drained.

## 3. Canonical key-list document (implemented — W2)

The shared framing for key collections: a 4-byte big-endian count N
followed by exactly N×32-byte addresses. Total length exactly
4 + 32·N, no trailing content, decode fail-closed; a successful
decode's input is exactly the canonical encoding of its result.
Order is significant and preserved.

## 4. Capabilities (implemented — W3)

`GET {authority}/control/capabilities` → `200` with a body of exactly
the eight canonical bytes: big-endian u32 `maxBatchKeys`, then
big-endian u32 `maxBlobBytes`. The second field's wire meaning is the
maximum canonical NODE body accepted by `/0` — the name predates the
blob abstraction, whose chunked content deliberately exceeds it; the
field renames to `maxNodeBytes` at `/1`, and range, proof, and
manifest limits publish independently there. The closed capability
decoder governs:
any other length or a non-canonical body is a typed protocol
violation. Clients re-probe per layer acquisition and never persist
capabilities across sessions. The endpoint is REQUIRED before any
batch use on this profile; its absence fails the probe as a typed
protocol violation.

## 5. Find-missing (implemented — W4)

`POST {authority}/control/missing` with a canonical key-list document
as the request body. The client refuses locally with the typed
key-count budget rejection before issue when N exceeds the probed
`maxBatchKeys`; servers MAY additionally reject oversize batches with
`413` (capacity). Response: `200` with a body of EXACTLY N status
bytes, positionally aligned to the request order — `0x00` missing,
`0x01` present, `0x02` failed. Any other length or byte value is
malformed and resolves as the typed batch failure.

The positional framing makes request-order alignment structural; the
machine's exact-accounting law remains the semantic backstop behind
the adapter's reconstruction. This profile never carries content
bytes with a presence answer — the model's found-bytes-dropped law
covers richer profiles; here there is strictly less to trust.
Presence answers are planning data only: they steer upload
scheduling, admit nothing, and are never negatively cached.

## 6. Publish (implemented — W5)

`PUT {authority}/roots/{hex}` with the root's DECLARED CLOSURE as a
canonical key-list document body (count 0 for a leaf root). The
client refuses locally with the typed ordering refusal unless the
root and every declared closure key stand confirmed by verified
acknowledgments or loads — children upload before parents, the root
publishes last. Acceptance is `200`, `201`, or `204` and maps to the
machine's publish acknowledgment, which grows the published set ONLY
and confirms nothing. `409` means the server independently verified
the declared closure and found it wanting — an integrity mismatch
resolving as the typed publish failure. Server-side closure
verification is OPTIONAL at `/0`; the client gate is the law.
Publishing an identical root and closure again is an idempotent
acceptance.

## 7. Caller surface (implemented — W6)

The three primitives land on the streamed-transfer service,
identifier-tagged through the machine internally:

- `capabilities` → the decoded limits, or a typed remote error.
- `missing(keys)` → presence as request-order subsequences
  `present` / `missing` / `failed`; documented as planning data —
  never admission, never negatively cached.
- `publish(root, closure)` → acknowledgment or a typed remote error.

The developer-facing headline is the composite the laws already
license — raw HTTP never surfaces:

- `push(root)` — enumerate the local closure children-first (a
  locally incomplete closure fails closed as the dangling-reference
  clause before ANY wire traffic), negotiate missing keys in
  `maxBatchKeys`-sized batches, upload only what is missing, publish
  the root last, and report what transferred and what the server
  already held.

The pull composite (discovery-order closure pulling through a
staging area) is a later slice of the same surface.

Error vocabulary extensions (existing five error classes, no new
class): `batchMisaligned` joins the protocol codes; `keys` joins the
budget stages (the key-count budget); `publishUnconfirmed` joins the
policy codes (the local ordering refusal). Publish and batch
transport failures classify through the existing classes by cause.

## 8. Authentication (ratified)

The credential model at `/0` is deliberately minimal: an OPAQUE
bearer credential per authority, supplied in layer configuration and
sent as `Authorization: Bearer <credential>` on every request to
exactly that authority. Rules:

- A credential is scoped to its one configured authority and never
  accompanies a request anywhere else; combined with the standing
  no-redirect-following rule, no cross-host leak path exists.
- The credential value is structurally absent from errors, reports,
  decision transcripts, and logs — redaction is by construction,
  never by filtering.
- Configuration without a credential sends no `Authorization` header;
  servers MAY serve anonymous reads per policy.
- `401` and `403` map through the standing status table; there is no
  challenge negotiation at `/0` — a `401` is terminal for its
  operation, never a retry trigger.
- Server side: the authenticated principal is passed explicitly to
  every semantic operation; authorization for root updates is
  independent of authorization for object upload; credential
  comparison is constant-time where the platform provides it.

## 9. Deadlines (ratified)

Every wire operation carries a client-side deadline from layer
configuration (`requestTimeout`, default thirty seconds), covering
the full exchange — request issue through acknowledgment or complete
body. Expiry resolves the in-flight operation as the machine's
SILENCE event with the typed `timeout` reason: no new alphabet, no
retry decided at the shell, and the semantic core sees exactly the
event it already handles. Deadlines are wall-clock shell concerns and
never enter the model. Node bodies are budget-bounded, so one
per-request deadline suffices at `/0`; streaming responses will carry
an idle-progress deadline defined with the proof plane, not this
one. The deadline is validated positive and finite; opting out is an
explicit configuration value, never an accidental zero.

## 10. Namespacing rule (standing)

Presence-style operations are scoped by the authority; no global
does-this-digest-exist query exists on any surface of this profile.

## 11. Blob representation (implemented model; client landing at F2b)

A blob is a NODE GRAPH under the ordinary data plane — no new
endpoints and no second identity. Four node shapes, version byte 0:

| Kind | Tag | Payload | References |
|---|---|---|---|
| chunk data | 8 | the raw chunk bytes | none |
| tree leaf | 9 | u32 index ++ u32 chunk length | one, expected tag 8 |
| tree parent | 9 | empty | two (left, right), expected tag 9 |
| manifest | 10 | u32 recipe id ++ u64 total bytes ++ u32 leaf count | one (tree root), expected tag 9 |

All scalar fields big-endian. The blob's identity is the manifest
node's ordinary content identifier. Chunk data is content-addressed
WITHOUT position, so equal chunks deduplicate across positions and
blobs; position binding lives in the leaf. The manifest payload
decodes fail-closed and recipe-gated: an unknown recipe identifier
is rejected, never guessed, and changing any identity-affecting
recipe parameter changes the manifest identity.

Recipe registry: `0` — inline-leaf (model substrate; no client
implements it); `1` — referenced-chunk, the shipping recipe:
fixed-size chunking at 65536 bytes, empty input is one empty chunk,
and the tree splits at the largest power of two strictly below the
leaf count. The chunk recipe is a PROFILE constant, never a server
capability — a capability-derived chunk size would fragment content
identity across authorities. A server whose node-body budget cannot
hold a chunk node cannot host recipe-1 blobs; that is a typed policy
refusal at push, never a silent re-chunk.

## 12. Planned planes (not yet normative)

Design authority: the server-reference and verified-reads survey in
the research tree. In brief: a proof plane serving inclusion openings
and range-verified streams whose wire language is exactly the
verified-streaming decoder's input alphabet, an advisory event plane
that never constitutes admission, and root-registry reads. Nothing in
this section binds until ratified here.
