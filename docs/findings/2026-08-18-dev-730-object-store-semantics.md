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
- each put of the same name mints a fresh `nuid`, a fresh `mtime`, and a fresh
  revision, even when the bytes and therefore the digest are identical. There
  is no content dedup at this seam. A put that omits the description clears the
  previous one rather than inheriting it. The revision is the backing stream's
  sequence number for the metadata message, so one put of an n-chunk object
  advances it by n + 1 — it is not a dense per-object counter. That same number
  is what `previousRevision` fences on, and a stale value is refused with the
  familiar `wrong last sequence` error.

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
