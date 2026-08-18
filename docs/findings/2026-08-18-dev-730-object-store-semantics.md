# FINDING-DEV730-OBJ-RANGED-001 — the pinned object-store client has no ranged read

Status: retained substrate finding; no production fix is attempted because no
Plait blob surface exists.

## Ran evidence

`bun test ./test/ObjectStoreSemantics.test.ts`, from `packages/plait`, runs the
`@nats-io/obj@3.4.0` client against a freshly built `nats-server v2.14.4`, one
file-backed node, `num_replicas: 1`. The five-arm suite was repeated ten times
on Windows/NTFS at the authoring revision without a failure.

A NATS object store is a bucket of named objects. Each object is written as a
run of chunk messages plus one metadata message, all inside one JetStream
stream. The metadata message carries the object's size, its chunk count, a
`nuid` (the identifier of the chunk run holding this object's bytes), and a
digest string. The probe records what the client and server actually do with
those pieces at the pin:

- a put/get round trip returns the bytes unchanged, and the digest the client
  reports is exactly `SHA-256=` followed by the padded base64url SHA-256 of the
  payload, as computed independently by Node's `crypto` — the two
  implementations agree without sharing code;
- the chunk count is the payload size divided by the maximum chunk size,
  rounded up: 131071 bytes → 1 chunk, 131072 → 1, 131073 → 2, 3158073 → 25,
  and 0 bytes → 0 chunks. The default maximum is 131072 bytes and is echoed
  back in the object's own metadata; a put may declare a smaller one (1000
  bytes at a declared 100 → 10 chunks). A read hands back one stored chunk per
  read, so the stored boundaries are visible to the reader;
- delete purges the chunk messages (the purge response counted 3 for a
  three-chunk object; the backing stream went from 4 messages to 1) and leaves
  one rolled-up metadata tombstone: `deleted: true`, `size: 0`, `chunks: 0`,
  empty digest, with the original `nuid` and `mtime` retained and the revision
  advanced. `get` and `getBlob` answer `null`, `list` omits the name, `update`
  refuses, deleting again reports success with nothing purged, and deleting a
  name that never existed reports failure;
- each put of the same name mints a fresh `nuid` and a fresh revision, even
  when the bytes and therefore the digest are identical. `mtime` is recomputed
  on every put and never carried over, and was observed nondecreasing; it is
  not a freshness oracle, because the client sets it from its own clock at
  millisecond resolution, so two puts inside one millisecond carry the same
  string. There
  is no content dedup at this seam. A put that omits the description clears the
  previous one rather than inheriting it. The revision is the backing stream's
  sequence number for the metadata message, so one put of an n-chunk object
  advances it by n + 1 — it is not a dense per-object counter. That same number
  is what `previousRevision` fences on, and a stale value is refused with the
  familiar `wrong last sequence` error.

## Replay

```text
cd packages/plait
bun test ./test/ObjectStoreSemantics.test.ts
```

Emitted verbatim, one line per arm, at the head this record describes
(`5 pass / 0 fail / 79 expect() calls`):

```text
SUBSTRATE OBJ TRACE round-trip=bytes-identical digest=SHA-256-base64url-padded oracle=node-crypto client-digest=computed-client-side meta-after-tamper=[size,chunks,digest]-unchanged whole-read=refused delivered-before-refusal=[131072,131072,3]
SUBSTRATE OBJ TRACE default-max-chunk=131072 chunks=[0B:0,131071B:1,131072B:1,131073B:2,3158073B:25] read-boundaries=stored-chunks zero-byte-read=[0] declared-max=100:10-chunks
SUBSTRATE OBJ TRACE ranged-read=absent get-arity=1 getBlob-arity=1 result-keys=[data,error,info] partial=cancel-only prefix=131072B-unverified error-promise=undefined-on-success,null-on-zero-size
SUBSTRATE OBJ TRACE delete=purge(chunks)+rollup(meta) purged=3 messages=4->1 tombstone=[deleted:true,size:0,chunks:0,digest:''] nuid=retained mtime=retained revision=advanced get=null list=omits re-delete=success:true,purged:0 unknown-delete=success:false
SUBSTRATE OBJ TRACE put-same-name=[digest-stable,nuid-fresh,mtime-recomputed-nondecreasing,description-cleared] mtime=client-clock-ms-resolution revision=meta-stream-sequence step=chunks+1 revisions=[2,4,6] previousRevision=stale-refused-wrong-last-sequence list-entry=no-revision-field
```

## The four attributed mechanisms

The tamper arm proves that injected bytes leave metadata unchanged. It does not
by itself establish *why*, and the record above attributes four mechanisms to
the client and the server. Each is stated here with the observation that shows
it and the pinned source that implements it. Line numbers are the shipped
`@nats-io/obj@3.4.0` in this checkout
(`node_modules/@nats-io/obj/lib/`), which is the pin the suite runs against.

### 1. The digest is derived client-side

Observed: `digest=SHA-256-base64url-padded oracle=node-crypto
client-digest=computed-client-side`. The suite recomputes the digest with
Node's `crypto` and compares strings; two implementations that share no code
agree on every payload the suite puts.

Pinned source:

- `objectstore.js:390`: `_put` opens its own hash — `const sha = await
  createSha256()` — before reading the first byte of the caller's stream.
- `objectstore.js:399,449`: `sha.update(payload)` runs over each drained chunk
  as the client publishes it.
- `objectstore.js:406-407`: the metadata's digest is assembled from that hash —
  `Base64UrlPaddedCodec.encode(sha.digest())` under the `SHA-256=` prefix.
- `sha256.js:20,46-56`: the default backend is the bundled pure-JS `js-sha256`.

Nothing in the put path asks the server for a hash, and the server is never
sent the payload for hashing — it is sent chunks and, separately, a JSON
metadata message that already contains the answer.

### 2. The digest is checked only when the last chunk arrives

Observed: `delivered-before-refusal=[131072,131072,3]` and
`whole-read=refused`. The reader received all three payloads, injected bytes
included, and the refusal `received a corrupt object, digests do not match`
arrived after the last one.

Pinned source:

- `objectstore.js:551`: `_get` opens a fresh hash for the read.
- `objectstore.js:562-563`: per delivered message, `sha.update(jm.data)` then
  `controller.enqueue(jm.data)` — the bytes are handed to the reader in the
  same step that hashes them, with nothing between.
- `objectstore.js:565-567`: the comparison is guarded by
  `if (jm.info.pending === 0)`, so it runs once, on the last message.
- `objectstore.js:570`: on disagreement, `controller.error(...)` with the
  observed message text.

This is the whole basis of the unverified-prefix finding: a consumer that stops
reading early, or acts on bytes as they arrive, has consumed unverified bytes
by construction, not by misuse.

### 3. Metadata is written by the client and never checked by the server

Observed: `meta-after-tamper=[size,chunks,digest]-unchanged`. A foreign chunk
published into the backing subject changed nothing the metadata reports.

Pinned source:

- `objectstore.js:405-407`: `mtime`, `digest`, and `deleted` are set on the
  client's own `info` object.
- `objectstore.js:414`: the metadata publish carries `RollupHdr` set to
  `RollupValueSubject`, which is what collapses a name's metadata history to
  its latest message.
- `objectstore.js:417-424`: the message body is `JSON.stringify(info)`,
  published like any other message.
- `objectstore.js:764-765`: `_metaSubject` is `$O.<bucket>.M.<base64url name>`
  — an ordinary JetStream subject in the same stream as the chunks.

The server stores that JSON. It is not asked to derive, compare, or reject
anything in it, which is why a chunk written behind the client's back leaves
`size`, `chunks`, and `digest` exactly as the writer left them.

### 4. The revision is the metadata message's stream sequence

Observed: `revisions=[2,4,6]`, `step=chunks+1`, and
`previousRevision=stale-refused-wrong-last-sequence`. A one-chunk put advances
the revision by two; a three-chunk put advances it by four.

Pinned source:

- `objectstore.js:425`: `info.revision = ack.seq` — the revision is the PubAck
  sequence of the metadata publish, which is the backing stream's global
  sequence, not a per-object counter.
- `objectstore.js:410-412`: `previousRevision` is sent as
  `PubHeaders.ExpectedLastSubjectSequenceHdr`, so the fence is the server's own
  expected-last-subject-sequence check — the same mechanism whose refusal the
  substrate gate already pins as `wrong last sequence`.

## Findings

**FINDING-DEV730-OBJ-RANGED-001 — there is no ranged read to probe.** The API
surface was enumerated rather than assumed: the reachable methods are
`delete`, `destroy`, `get`, `getBlob`, `info`, `init`, `link`, `linkStore`,
`list`, `put`, `putBlob`, `rawInfo`, `seal`, `status`, `update`, `watch`.
Nothing names a range, offset, seek, partial, or slice. `get` and `getBlob`
each take exactly one argument — the object name — and the result of `get`
carries exactly three fields: `info`, `error`, and `data`. Ranged reads are
therefore an *absence at the pin*, not an untested feature.

The one partial read available is stopping the whole-object stream early. That
prefix is unverified, and the suite pins why: the digest is derived over the
whole object and checked only when the last chunk arrives. Against an object
with one extra chunk message injected behind the client's back, the metadata
still reported the original size, chunk count, and digest; `getBlob` refused
with `received a corrupt object, digests do not match`; and the reader was
handed all three payloads — 131072, 131072, and the injected 3 bytes — *before*
that refusal arrived. Every byte a reader touches is unverified until the read
completes.

This is the evidence base the deferred ranged-get law (G-6) asked for. A byte
range cannot re-derive a whole-value digest, and at this pin a partial read
cannot re-derive anything at all, because the client's only checksum covers the
whole object. A chunk-manifest identity law would have to name and verify each
chunk itself; nothing in the pinned client does so today.

**FINDING-DEV730-OBJ-METADATA-002 — object metadata is not an integrity
oracle.** The digest is computed client-side during the put and stored in the
metadata message; the server neither computes nor checks it. Injecting a chunk
left size, chunks, and digest untouched. Metadata answers what the writer
claimed, so a reader that trusts it has verified nothing — the re-derivation on
read is the only check, and it lives entirely in the client.

**FINDING-DEV730-OBJ-SHAPE-003 — two typed-surface deviations.** `ObjectResult.error`
is declared `Promise<Error | null>`; on a successful non-empty read it resolves
`undefined`, and only the zero-size short circuit resolves `null`. A consumer
writing `if (await result.error === null)` would take the wrong branch on every
non-empty success. Separately, `list()` entries are a different shape from
`info()`: they carry `isUpdate` and carry no `revision` field at all, so a
consumer reading revisions off a listing reads `undefined`.

## Bounds

Single node, R=1, file storage, one server process, no clustering and no
restart. The tamper arm injects one extra chunk message; it demonstrates that
the read path re-derives and refuses, and it does not measure any other
corruption class, nor storage-level corruption beneath JetStream. The chunk
observations are five sizes at the default maximum plus one declared maximum,
not a theorem about all sizes. Nothing here licenses absence reasoning, claims
durability beyond process-crash recovery, or asserts any correspondence with
Plait code — no blob surface exists to correspond with. The findings license
future advisory use only: they say what this client and this server did, and a
future `Blob.ts` still owes its own wall.
