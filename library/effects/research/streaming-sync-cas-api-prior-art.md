# Streaming and sync CAS APIs — prior art and design implications

Status: conception-mode research, 2026-08-27. **G0 only.** This report does
not ratify an interface, amend the Effect Replay contract, promote a claim,
or establish correspondence between the TypeScript implementation and any
external protocol. Candidate names and shapes below are deliberately
unratified.

Provenance posture: every external source used for a material observation is
linked at an immutable Git commit, tag/edition, or archived specification
edition. The source ledger records the selected Git blob or content digest.
The exact bytes are reproducible from those pins, and their research
resolution is recorded in
[`streaming-sync-cas-api-prior-art.json`](../../../.reference/provenance/receipts/streaming-sync-cas-api-prior-art.json).
Admission into Source Lock remains a separate pending estate action.

## Executive finding

The present R2 API has the right *service separation* but only a stream-shaped
baseline. `CasStore` owns whole admitted nodes; `CasTransfer` names streamed
mechanics; `CasEvents` is advisory; and raw transport stays internal. That
boundary should remain. The current HTTP implementation, however, collects an
upload before issuing it and implements download streaming by loading and
encoding a whole node into one stream element. This is within R2's stated
baseline; it is not progressive wire transfer yet.
([Transfer surface](../src/cas/Transfer.ts),
[remote implementation](../src/internal/remote.ts),
[ratified R2 boundary](../CONFORMANCE-WORKFLOW.md))

The primary-source survey points to two distinct additions rather than one
large "streaming CAS" service:

1. **progressive object transfer** — restartable byte sources, real
   outstanding-capacity control, range reads, optional upload sessions,
   operation progress, and terminal commit receipts; and
2. **graph/root synchronization** — capability negotiation, explicit
   selectors or closure plans, mutable-head policy kept outside the immutable
   store, and a result report that accounts for every requested/discovered
   object.

These should be deep modules: a small ordinary `put`/`load` surface for most
users, with session, range, and sync machinery behind explicit advanced
entry points. REAPI/ByteStream, OCI, tus, and `object_store` independently
separate a convenient one-shot operation from resumable/session mechanics;
GraphSync, Hypercore, and Automerge independently show that synchronization
needs state and control beyond a stream of bytes.
([ByteStream API](https://github.com/googleapis/googleapis/blob/de3c0d362adbaafc7a0cd1254a8cd49a528505ee/google/bytestream/bytestream.proto#L42-L91),
[OCI v1.1.1 upload protocol](https://github.com/opencontainers/distribution-spec/blob/a139cc423184af6078077b9b7ee336eddbd03f8f/spec.md#L317-L424),
[tus 1.0.0](https://github.com/tus/tus-resumable-upload-protocol/blob/c6a11fa3d7b6198e00e4aa5289ccb71314162b84/protocol.md),
[`object_store` multipart API](https://github.com/apache/arrow-rs-object-store/blob/b07471e2bc341278f86e30cf80a850d56cbe2c67/src/upload.rs),
[GraphSync interface](https://github.com/ipfs/go-graphsync/blob/12cbffae99eb011ab3da82c5b74e29ec8dc1c6e0/graphsync.go),
[Hypercore API](https://github.com/holepunchto/hypercore/blob/affec09a56d5f164292c9a3305fbfcde7a40bb85/README.md),
[Automerge sync state](https://github.com/automerge/automerge/blob/47908d6c04a0ce3fea0fa1d6b7f5ce6ba3e5792e/rust/automerge/src/sync/state.rs))

## 1. Current Foldlab baseline

The current public shape has `putStream(source, options) -> ContentId` and
`loadStream(id) -> Effect<Stream<Uint8Array>, ..., Scope>`. `UploadSource`
tags `Replayable` and `OneShot`, but both variants contain the same already-
constructed `Stream` value. The tag is therefore a caller assertion; it does
not provide a fresh opener or a seek/reopen operation as evidence that a retry
can reproduce bytes. ([Transfer](../src/cas/Transfer.ts),
[Remote types](../src/cas/Remote.ts))

At the implementation pin in this repository:

- upload copies chunks into an array and joins them before the transport call;
- download calls whole-node `load`, re-encodes the admitted node, and returns
  one whole canonical-node byte array through `Stream.succeed`; and
- `maxQueuedBytes` rejects an individual input chunk over the limit, but does
  not measure an actual queue of outstanding bytes.

Those observations describe the present mechanics, not a violation of R2's
scope. R2 explicitly selected a spooled whole-object baseline with first-class
stream-shaped interfaces and budgets.
([implementation](../src/internal/remote.ts),
[R2 plan](../IMPLEMENTATION-PLAN.md))

Three surface ambiguities should be resolved before further API freeze:

- **byte domain:** `loadStream` returns the canonical encoded *node*, not the
  node payload; names and receipts should distinguish canonical-node bytes,
  payload bytes, decoded bytes, and wire bytes;
- **scope shape:** `Effect<Stream<...>, ..., Scope>` makes callers acquire an
  effect to obtain a stream; Effect already supports direct scoped streams,
  so a direct `Stream` can own its acquisition/finalization when no separate
  handle is required; and
- **restartability:** a discriminator is weaker than an `open()`/`openAt()`
  capability that constructs a fresh source for each attempt.

Effect's pinned sources define `Stream` as a channel-backed source,
`Stream.unwrap` for an effect producing a stream, and `Stream.scoped` for
placing resource acquisition inside the stream's lifetime.
([Stream type and operators](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Stream.ts#L122-L126),
[`unwrap`](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Stream.ts#L1633-L1673))

## 2. Survey of developer-facing patterns

### 2.1 Bazel REAPI and Google ByteStream

REAPI deliberately splits batch CAS operations from large-object ByteStream
operations. It exposes `FindMissingBlobs`, independently-accounted batch
reads/writes, a streaming `GetTree`, and discoverable limits and compressor /
chunking capabilities. ByteStream adds ranged reads and an upload resource
whose server-authoritative `committed_size` can be queried after failure; that
offset may be less than bytes the client previously sent. Completion is an
explicit `finish_write` transition, and the response/query status distinguishes
committed length from completeness.
([REAPI CAS service](https://github.com/bazelbuild/remote-apis/blob/becdd8f9ff811df88a22d3eadd6341753d51d167/build/bazel/remote/execution/v2/remote_execution.proto#L347-L560),
[REAPI capabilities](https://github.com/bazelbuild/remote-apis/blob/becdd8f9ff811df88a22d3eadd6341753d51d167/build/bazel/remote/execution/v2/remote_execution.proto#L2284-L2342),
[ByteStream offsets and completion](https://github.com/googleapis/googleapis/blob/de3c0d362adbaafc7a0cd1254a8cd49a528505ee/google/bytestream/bytestream.proto#L50-L91),
[ranged read fields](https://github.com/googleapis/googleapis/blob/de3c0d362adbaafc7a0cd1254a8cd49a528505ee/google/bytestream/bytestream.proto#L95-L114))

DX lesson: batch, whole-value, and stream APIs are complementary. Resume must
use remote status, not a locally remembered sent count. Capability discovery
belongs in the client boundary, and terminal completion needs a distinct
receipt/status rather than an in-band progress element.

### 2.2 OCI Distribution chunked uploads

OCI Distribution v1.1.1 starts a blob upload with `POST`, returns a session
`Location`, accepts ordered `PATCH` chunks, reports the accepted range, and
rejects out-of-order input with `416`. A status request recovers the current
range. A final `PUT` carrying the *whole-blob* digest publishes the blob.
Downloads may use HTTP ranges and clients are advised to check the requested
digest. Cross-repository mount returns either a completed `201` or a `202`
upload session fallback.
([download and range](https://github.com/opencontainers/distribution-spec/blob/a139cc423184af6078077b9b7ee336eddbd03f8f/spec.md#L188-L204),
[chunk/status/finalize](https://github.com/opencontainers/distribution-spec/blob/a139cc423184af6078077b9b7ee336eddbd03f8f/spec.md#L317-L424),
[mount](https://github.com/opencontainers/distribution-spec/blob/a139cc423184af6078077b9b7ee336eddbd03f8f/spec.md#L426-L461))

DX lesson: an upload location is a scoped operation resource, not the content
address. The client needs begin/status/append/commit/abort semantics even when
the convenience API hides them. Bulk content and mutable manifest/tag
publication remain distinct planes.

### 2.3 tus resumable upload 1.0.0

tus makes the session lifecycle unusually explicit. `OPTIONS` advertises
versions, extensions, and maximum size; `POST` creates an upload resource;
`HEAD` returns the authoritative offset; `PATCH` succeeds only at that offset.
Optional extensions add expiry, termination, per-chunk checksum, deferred
length, and concatenation of partial uploads for parallel transfer. A checksum
mismatch leaves the server offset unchanged. Expired uploads return `404` or
`410`, requiring a new session. Metadata handling includes a header-smuggling
warning.
([tus protocol 1.0.0](https://github.com/tus/tus-resumable-upload-protocol/blob/c6a11fa3d7b6198e00e4aa5289ccb71314162b84/protocol.md))

DX lesson: if Foldlab exposes resumability, `UploadSession` needs an identity,
authoritative status, expiry, abort, and commit. Resume support is not a
boolean capability; it is a state machine with recovery and cleanup.

### 2.4 Rust `object_store`

The Rust `object_store` crate separates atomic whole-object `put` from
`MultipartUpload`. The multipart handle accepts independently-polled parts and
has explicit `complete` and `abort`; its documentation warns that dropping a
handle does not guarantee remote cleanup. `WriteMultipart` adds bounded
concurrency through `wait_for_capacity`, finishes all parts, and attempts an
abort after failure. Reads expose metadata and the actual returned range beside
either a file or byte stream; the store also supports vectored ranges,
conditional writes, and `PutResult` metadata such as ETag/version.
([store interface and read result](https://github.com/apache/arrow-rs-object-store/blob/b07471e2bc341278f86e30cf80a850d56cbe2c67/src/lib.rs),
[multipart and capacity control](https://github.com/apache/arrow-rs-object-store/blob/b07471e2bc341278f86e30cf80a850d56cbe2c67/src/upload.rs))

DX lesson: source/sink symmetry is useful, but the advanced write API should
return a terminal result and own cleanup. Backpressure is a bound on in-flight
work, not just a maximum element size. Range responses should report the range
actually supplied, and remote commit metadata should be retained in a typed
receipt.

### 2.5 Git LFS custom transfers

Git LFS custom transfer adapters negotiate upload/download direction and
concurrency ownership during initialization, then exchange line-delimited JSON
control messages. Bulk content travels through paths outside the control
channel. Each operation is correlated by object ID; adapters emit explicit
progress (`bytesSoFar`, `bytesSinceLast`) and a terminal complete/error event.
On download, Git LFS itself rechecks the object's SHA-256 before moving the
temporary file into its store, making verification ownership explicit.
([custom transfer protocol](https://github.com/git-lfs/git-lfs/blob/09705b99b15cff34b4afb64e468d29f6a77b8b21/docs/custom-transfers.md))

DX lesson: progress and control are operation-local, not global notifications;
the library should state whether it or the adapter checks the address and owns
temporary-file promotion. Concurrency can be adapter-managed or orchestrator-
managed, but the choice must not be implicit.

### 2.6 IPFS blockstore, IPLD selectors, and GraphSync

Boxo's basic blockstore is intentionally small (`Has`, `Get`, `GetSize`,
`Put`, `PutMany`, enumeration). Its optional validating wrapper recomputes the
requested CID on `Get`. The current enumeration API also illustrates an API
hazard: a value channel alone cannot report a late iteration error, so a newer
optional interface supplies a terminal error function after the channel is
drained.
([blockstore interface](https://github.com/ipfs/boxo/blob/63cae36adc96260c55d1e3b8bf5b9f4b78fd7080/blockstore/blockstore.go#L35-L110),
[validating wrapper](https://github.com/ipfs/boxo/blob/63cae36adc96260c55d1e3b8bf5b9f4b78fd7080/blockstore/validating_blockstore.go))

IPLD selectors encode sparse graph traversal as data: field/index/range
selection, recursive exploration with a limit, union, conditional traversal,
and separate notions of blocks covered versus nodes matched. The selected
selector text is explicitly a prescriptive draft, so it is pattern evidence,
not a stable standard. GraphSync's shipped Go interface couples a root CID and
selector with a request ID, priority, extensions, progress and error channels;
it provides cancel, pause/unpause, update, per-request limits, and hooks for
validated blocks. Progress carries logical path/link information and both
logical and on-wire sizes.
([IPLD selector draft](https://github.com/ipld/specs/blob/a7b9376ebd43aeabba7d78487db3d9df456b7714/selectors/selectors.md),
[GraphSync interface](https://github.com/ipfs/go-graphsync/blob/12cbffae99eb011ab3da82c5b74e29ec8dc1c6e0/graphsync.go))

DX lesson: graph selection should be a bounded data type, not a callback run
by an untrusted peer. A selector yields a fetch plan, not evidence of closure.
Every received block still crosses Foldlab admission. Cancellation, progress,
per-request resource limits, and traversal reports belong to the sync
operation. Server-side selection creates an authorization and denial-of-
service boundary.

### 2.7 Nix binary substitution

Nix's binary cache interface accepts a restartable source for upload and a
sink for read. During upload it tees the uncompressed NAR through compression
and hashing, writes the NAR data first, verifies referenced paths, signs the
metadata, and then publishes `.narinfo`; the source is explicitly restarted
before the compressed file is uploaded. On substitution, Nix checks metadata /
signatures, realizes references before the parent, tries another substituter
on absence, and treats a NAR that disappeared after metadata lookup as a
separate `SubstituteGone` case.
([restartable source and publish split](https://github.com/NixOS/nix/blob/2c73b59da29606068c0c98db015dd3a66955525d/src/libstore/include/nix/store/binary-cache-store.hh#L130-L205),
[tee/hash/data-first implementation](https://github.com/NixOS/nix/blob/2c73b59da29606068c0c98db015dd3a66955525d/src/libstore/binary-cache-store.cc#L145-L300),
[substitution closure and fallback](https://github.com/NixOS/nix/blob/2c73b59da29606068c0c98db015dd3a66955525d/src/libstore/build/substitution-goal.cc#L42-L142),
[`.narinfo` fields](https://github.com/NixOS/nix/blob/2c73b59da29606068c0c98db015dd3a66955525d/doc/manual/source/protocols/binary-cache/narinfo.md))

DX lesson: restartability is an operation, not a label; root/metadata
publication is a named boundary after content and references; and absence,
vanished content, integrity rejection, and transport failure should remain
different client outcomes.

### 2.8 XET

XET revision 05 models large files as chunks packed into xorbs plus shards that
describe ordered range reconstruction. Upload is bottom-up (xorbs before their
shard); download uses xorb ranges; operational lookup/index metadata remains
outside logical content identity. Its deduplication design also calls out
cross-access-boundary content-existence leakage. XET is an active individual
Internet-Draft, not an RFC or semantic authority for Foldlab.
([archived revision 05](https://www.ietf.org/archive/id/draft-denis-xet-05.txt),
[§§8–12](https://datatracker.ietf.org/doc/html/draft-denis-xet-05#section-8),
[security considerations](https://datatracker.ietf.org/doc/html/draft-denis-xet-05#section-14))

DX lesson: range reconstruction can be first-class data, while physical
offsets, compression, and lookup accelerators remain below identity. Global
dedup discovery must be scoped by authorization/tenant policy.

### 2.9 Hypercore

Hypercore is a signed append-only Merkle log rather than a general immutable
CAS, but its API is valuable sync prior art. It exposes read and byte streams
with snapshot/live and range options, sparse `download` handles with
completion and cancellation, sessions/checkouts/atoms that must be closed,
replication streams, availability/contiguous-length status, fork/truncate
state, and operation events.
([Hypercore API](https://github.com/holepunchto/hypercore/blob/affec09a56d5f164292c9a3305fbfcde7a40bb85/README.md))

DX lesson: a data stream and an operation handle answer different needs. Sync
clients need snapshot versus live intent, a sparse selection, cancellation,
observable availability, and explicit fork/head state. Those semantics should
not be smuggled into immutable `CasStore` reads.

### 2.10 Automerge sync

Automerge's sync protocol separates document semantics from transport and
maintains per-peer `State`. The state tracks shared/local/remote heads,
need/have summaries, sent hashes, in-flight messages, capabilities, and
directionality. Generation may return no message while awaiting acknowledgement
or when the peer is current; message receipt advances session state. Only a
small shared-head subset is persisted for reuse across sessions. The protocol
assumes a reliable in-order byte stream.
([sync protocol implementation](https://github.com/automerge/automerge/blob/47908d6c04a0ce3fea0fa1d6b7f5ce6ba3e5792e/rust/automerge/src/sync.rs),
[peer state](https://github.com/automerge/automerge/blob/47908d6c04a0ce3fea0fa1d6b7f5ce6ba3e5792e/rust/automerge/src/sync/state.rs))

DX lesson: bidirectional sync is a stateful conversation, not a pair of bulk
copies. Foldlab can reuse the explicit-session/capability/head patterns without
importing CRDT conflict semantics. Immutable CAS closure transfer and mutable
root/head reconciliation should remain separate services and policies.

### 2.11 Representative API shapes

These are compact paraphrases of the cited primary interfaces, included to
make their developer experience concrete. They are not compatibility targets.

```text
OCI:       POST uploads/ -> Location
           PATCH Location @ accepted-range -> new accepted Range
           GET Location -> authoritative Range
           PUT Location?digest=<whole> -> published blob

tus:       OPTIONS -> versions/extensions/max-size
           POST -> upload URL
           HEAD upload URL -> Upload-Offset / expiry
           PATCH upload URL @ Upload-Offset -> new offset
           DELETE upload URL -> terminated session       [extension]

object_store:
           put(path, payload) -> PutResult
           put_multipart(path) -> MultipartUpload
           MultipartUpload.{put_part, complete, abort}
           get_opts(path, range/conditions) -> GetResult{payload, meta, range}

Git LFS:   init{operation, concurrent, remote} -> init response
           upload/download{oid, size, action}
           progress{oid, bytesSoFar, bytesSinceLast}
           complete{oid, path?} | error{oid, code, message}

GraphSync: Request(ctx, peer, root, selector, extensions)
             -> (progress channel, error channel)
           Pause / Unpause / Cancel / Update(requestId, ...)

Automerge: generate_sync_message(doc, peerState) -> Message | none
           receive_sync_message(doc, peerState, message)

Hypercore: createReadStream({start, end, live, snapshot})
           download(range) -> { done(), destroy() }
           session() / snapshot() / replicate(...)

Effect:    Stream<A,E,R>                 // values over time
           Sink<A,In,L,E,R>              // consume to a result
           Channel<Out,OutErr,OutDone,...>// values + typed terminal
           HttpBody.stream(stream) / HttpIncomingMessage.stream
           RPC streaming method -> Stream or scoped Queue
```

The source shapes are documented in the
[OCI upload section](https://github.com/opencontainers/distribution-spec/blob/a139cc423184af6078077b9b7ee336eddbd03f8f/spec.md#L317-L424),
[tus 1.0.0 protocol](https://github.com/tus/tus-resumable-upload-protocol/blob/c6a11fa3d7b6198e00e4aa5289ccb71314162b84/protocol.md),
[`object_store` interfaces](https://github.com/apache/arrow-rs-object-store/blob/b07471e2bc341278f86e30cf80a850d56cbe2c67/src/lib.rs),
[Git LFS custom-transfer messages](https://github.com/git-lfs/git-lfs/blob/09705b99b15cff34b4afb64e468d29f6a77b8b21/docs/custom-transfers.md),
[GraphSync public interface](https://github.com/ipfs/go-graphsync/blob/12cbffae99eb011ab3da82c5b74e29ec8dc1c6e0/graphsync.go),
[Automerge sync API](https://github.com/automerge/automerge/blob/47908d6c04a0ce3fea0fa1d6b7f5ce6ba3e5792e/rust/automerge/src/sync.rs),
[Hypercore API](https://github.com/holepunchto/hypercore/blob/affec09a56d5f164292c9a3305fbfcde7a40bb85/README.md), and
[Effect stream/channel APIs](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Channel.ts#L140-L153).

## 3. What Effect v4 already provides at the project pin

The pinned Effect source offers most of the runtime carriers needed; Foldlab
does not need a bespoke stream runtime.

| Requirement | Pinned Effect carrier | Design implication |
| --- | --- | --- |
| Direct byte source | `Stream<A,E,R>` is channel-backed; `HttpIncomingMessage.stream` is a direct byte stream. ([Stream](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Stream.ts#L122-L126), [HTTP incoming](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/unstable/http/HttpIncomingMessage.ts#L57-L69)) | A normal download can return `Stream` directly; acquisition/finalizers can live in the stream. |
| Incremental consumer | `Sink` consumes an input stream to a result and can retain leftovers. ([Sink](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Sink.ts#L63-L71)) | Hash/count/admit and a single upload attempt fit a sink. Retry still needs a fresh source factory. |
| Typed terminal receipt | `Channel` distinguishes output elements, output failure, and output done. ([Channel](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Channel.ts#L140-L153)) | Use `OutDone` internally/advanced API for a completion receipt; `Stream` erases this to `void`. |
| Lifetime and cancellation | `Scope` owns finalizers; sockets expose a scoped writer and channel adapters. ([Scope](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Scope.ts#L45-L49), [Socket](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/unstable/socket/Socket.ts#L61-L94)) | Upload sessions, response bodies, temporary spools, and subscriptions belong to operation scopes. |
| Streaming HTTP body | `HttpBody.stream` accepts a `Stream`; `HttpBody.file` supports offset/length/chunk size. ([HTTP body](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/unstable/http/HttpBody.ts#L481-L541)) | Progressive HTTP upload and seekable file sources can use existing platform primitives. |
| Streaming RPC | `RpcClient` derives a direct stream result and optionally a scoped bounded queue with `streamBufferSize`. ([RPC client](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/unstable/rpc/RpcClient.ts#L80-L121), [queue construction](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/unstable/rpc/RpcClient.ts#L436-L470)) | An RPC adapter can share the semantic transfer service while keeping transport framing internal. |
| Nearby remote log sync | `EventLogRemote` authenticates, writes chunked encoded entries, streams changes from a sequence into a scoped queue, and reauthenticates after forbidden responses. ([EventLogRemote](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/unstable/eventlog/EventLogRemote.ts#L48-L71), [implementation](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/unstable/eventlog/EventLogRemote.ts#L140-L273)) | Reuse its scoped remote/auth/queue idioms, but do not treat chunked encoded messages as progressive CAS admission or an immutable-store contract. |
| In-memory graph algorithms | `Graph` provides immutable/scoped-mutable directed graphs, snapshots, acyclicity checks, and topological traversal. It does not expose an intrinsically acyclic graph type. ([Graph model](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Graph.ts#L1-L184), [`isAcyclic`](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Graph.ts#L4172-L4298), [`topo`](https://github.com/Effect-TS/effect/blob/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07/packages/effect/src/Graph.ts#L8025-L8120)) | Use it as an internal planning/projection carrier for admitted nodes and dependency edges. Keep CAS identities as node payloads, re-check acyclicity/closure at the owning boundary, and do not serialize `NodeIndex` as a content identity. |

The decisive Effect-specific point is that `Stream` is ideal for values but
not sufficient for a typed terminal result. `Channel` or a small operation
handle should carry completion/commit evidence. Conversely, returning
`Effect<Stream>` is only justified when obtaining the stream also yields a
separate handle or metadata; otherwise `Stream.unwrap`/`Stream.scoped` gives a
cleaner ordinary-user surface.

Effect `Graph` is therefore a clean integration point for a validated
*runtime view* of the CAS DAG and for topological sync planning, but it should
not become the CAS representation or validation authority by itself. Its
numeric node indexes are graph-local identifiers, and `Graph<N,E,"directed">`
can still be cyclic; an adapter must build it from admitted `ContentId` values
and retain the project-owned closure/acyclicity checks.

## 4. Gap map against the current surface

| Concern | Current R2 baseline | Candidate direction (unratified) |
| --- | --- | --- |
| Whole value vs stream | Whole `CasStore`; stream-shaped `CasTransfer`; HTTP collects/emits one whole node | Keep both. Make progressive transfer an implementation/property exercised by conformance tests, not implied merely by a `Stream` type. |
| Byte meaning | `loadStream` says bytes, implementation returns canonical encoded node | Name `canonicalNodeBytes` versus `payloadBytes`; receipts count canonical, payload, decoded, and wire domains separately. |
| Download shape | Nested `Effect<Stream, ..., Scope>` | Ordinary path returns direct scoped `Stream`; advanced path returns a handle/channel only when metadata, progress, cancellation, or terminal receipt is needed. |
| Retry evidence | `Replayable`/`OneShot` tags over identical stream values | `ReopenableSource.open(at?)` constructs each attempt; `OneShotSource.take` can be consumed once. Address is recomputed on every attempt. |
| Backpressure | Maximum per-chunk check | Bound actual queued/in-flight bytes and operations; expose policy/configuration and report observed high-water marks. |
| Resume | No public session/status/expiry/abort | Optional `UploadSession` with remote-authoritative offset, expiry, append, commit, abort, and cleanup result. |
| Range | None | Add only with explicit semantics for the byte domain and verification. Whole-hash CAS cannot promise an admitted arbitrary range without a proof/chunk layout or a full-object spool. |
| Progress | Advisory `CasEvents` plane | Keep global store notifications advisory; add operation-local progress attached to transfer/sync handles and correlated by operation/attempt. |
| Capability discovery | Config assumes a backend shape | Typed `CasCapabilities`: sizes, batch, range/proof mode, resume, compression, selectors, concurrency, publication/receipt classes, protocol revision. |
| Completion | Upload returns `ContentId` | `TransferReceipt` includes ID, committed counts, attempts, dedup/already-present result, completion class, and safe remote metadata. A receipt is observation, not a durability theorem. |
| Graph transfer | Whole-node methods only | `SyncPlan` + `run` + `SyncReport`; selectors and limits are data; every fetched node still uses existing admission. |
| Mutable roots / conflicts | Outside CAS | Keep a separate `CasHeads`/root-publication capability with compare-and-swap and user-selected conflict policy. Do not add mutability to `CasStore`. |

## 5. Candidate deep-module decomposition

The following is a design sketch for grilling, not a declaration freeze.

### 5.1 Layer composition from transport to semantics

The useful seam is three layers deep. Base transport adapters enact bytes and
framing; protocol drivers enact ByteStream/OCI/tus-style sessions; public CAS
services own project identity, admission, graph planning, and user-facing
policy. The internal tags in this illustrative sketch are module-private, so
raw wire bytes never become a user-resolvable CAS service.

```ts
// Illustrative and unratified.

// Layer 1: one transport exchange. Module-private tag / plain value.
interface WireTransport {
  readonly issue: (
    request: WireRequest,
  ) => Channel.Channel<WireEvent, WireFailure, WireCompletion>
}
declare class HttpWire extends Context.Service<HttpWire, WireTransport>()(
  "foldlab/internal/HttpWire",
) {} // layer requires HttpClient
declare class RpcWire extends Context.Service<RpcWire, WireTransport>()(
  "foldlab/internal/RpcWire",
) {} // layer requires RpcClient
declare class SocketWire extends Context.Service<SocketWire, WireTransport>()(
  "foldlab/internal/SocketWire",
) {} // layer requires Socket

// Layer 2: remote protocol mechanics, still module-private.
interface CasTransferDriver {
  readonly capabilities: Effect.Effect<DriverCapabilities, DriverError>
  readonly openRead: (
    id: ContentId,
    range?: ByteRange,
  ) => Channel.Channel<Uint8Array, DriverError, ReadReceipt>
  readonly beginUpload: (
    metadata: UploadMetadata,
  ) => Effect.Effect<DriverUploadSession, DriverError, Scope.Scope>
  readonly findMissing?: (
    ids: ReadonlyArray<ContentId>,
  ) => Effect.Effect<ReadonlyArray<PresenceResult>, DriverError>
}
declare class Driver extends Context.Service<Driver, CasTransferDriver>()(
  "foldlab/internal/CasTransferDriver",
) {}

const byteStreamDriver: Layer.Layer<Driver, InitError, HttpWire> = /* ... */
const ociDriver: Layer.Layer<Driver, InitError, HttpWire> = /* ... */
const tusDriver: Layer.Layer<Driver, InitError, HttpWire> = /* ... */

// Layer 3: exported deep modules. One build shares driver, pools, budgets,
// admitted cache, and operation registry.
declare const casServices: Layer.Layer<
  CasStore | CasBlob | CasTransfer | CasSync | CasEvents,
  CasRemoteInitError,
  Driver
>

const casOverOciHttp = casServices.pipe(
  Layer.provide(ociDriver),
  Layer.provide(httpWireLayer)
)
```

The concrete package may prefer plain factories for `WireTransport` and
`CasTransferDriver` instead of private context tags; the semantic point is the
same. HTTP, RPC, and sockets should be replaceable realizations below one
driver contract. An OCI/tus/ByteStream driver handles remote locations,
offsets, expiry, protocol completion, and capability decoding. Only the public
service layer interprets canonical node bytes, recomputes a `ContentId`, admits
nodes, builds a graph view, or publishes a root.

The proposed public roles are:

| Deep module | Narrow responsibility |
| --- | --- |
| `CasStore` | Existing whole admitted structured nodes. No transport/session vocabulary. |
| `CasBlob` | Optional future large opaque-payload convenience over an approved blob node kind; it must reuse, not redefine, project identity/admission. |
| `CasTransfer` | Progressive canonical-byte movement, retry/source policy, ranges, operation handle, and transfer receipt. |
| `CasSync` | Bounded closure/selector planning, execution, accounting report, and coordination with separate root publication. |
| `CasEvents` | Advisory store-level notifications only; operation-local progress remains on transfer/sync handles. |

This composition makes an in-memory driver, hostile conformance driver, HTTP
OCI driver, RPC ByteStream driver, or socket-based experimental driver
substitutable below the same semantic services without presenting them as
interchangeable protocols.

### 5.2 Preserve the simple front door

`CasStore` should remain the backend-independent whole-node service. A normal
user should still be able to put a domain-derived node and load an admitted
node without learning upload offsets, queue capacities, or transport receipts.
`CasTransfer.put`/`loadBytes` can be the progressive convenience surface and
hide single-session orchestration.

```ts
// Candidate vocabulary only.
interface ReopenableByteSource<E = SourceError, R = never> {
  readonly length?: bigint
  readonly open: (range?: ByteRange) =>
    Stream.Stream<Uint8Array, E, R>
}

interface CasTransferShape {
  readonly put: <E, R>(
    source: OneShotByteSource<E, R> | ReopenableByteSource<E, R>,
    options: PutOptions,
  ) => Effect.Effect<TransferReceipt, CasTransferError | E, R>

  readonly loadCanonicalBytes: (
    id: ContentId,
    options?: LoadOptions,
  ) => Stream.Stream<Uint8Array, CasTransferError>
}
```

An opener is operational evidence for a new attempt; it does not assert that
two openings are equal. The existing incremental address check remains the
guard against a source that changes between attempts. The direct download
stream uses `Stream.unwrap` / `Stream.scoped` internally so its resources live
for the stream lifetime without placing `Scope` in the ordinary caller's
environment.

### 5.3 Put sessions behind an advanced interface

```ts
interface CasUploadSession {
  readonly id: UploadSessionId
  readonly status: Effect.Effect<UploadStatus, CasTransferError>
  readonly append: (
    offset: bigint,
    bytes: Stream.Stream<Uint8Array, SourceError>,
  ) => Effect.Effect<UploadStatus, CasTransferError>
  readonly commit: (
    expected: ContentId,
  ) => Effect.Effect<TransferReceipt, CasTransferError>
  readonly abort: Effect.Effect<AbortReceipt, CasTransferError>
}
```

The high-level `put` owns this scope and retries only when the source can be
reopened and the remote processing classification permits it. Direct session
access is for checkpointing, large uploads, or transport-specific tooling.
Session IDs and offsets must never be confused with content identities.

### 5.4 Use a typed terminal internally

The transport/adapter seam can expose a
`Channel<WireOrProgress, Failure, CompletionReceipt>` so data, failure, and
normal completion cannot be confused in-band. The ordinary public `Stream`
can be derived from that channel when the terminal receipt is not needed; an
advanced `TransferHandle` can expose `bytes`, operation-local progress, and a
single terminal `result` while one scope owns all three views.

```ts
interface TransferOperation<A> {
  readonly id: TransferId
  readonly progress: Stream.Stream<TransferProgress>
  readonly result: Effect.Effect<A, CasTransferError>
}

interface CasTransferAdvancedShape {
  readonly startPut: <E, R>(
    source: ReopenableByteSource<E, R>,
    options: PutOptions,
  ) => Effect.Effect<
    TransferOperation<TransferReceipt>,
    CasTransferError | E,
    R | Scope.Scope
  >
}
```

`progress` is advisory state attached to one operation; it should be backed by
a dropping/sliding observation mechanism so an unobserved progress consumer
cannot stall the byte path. `result` is the one authoritative terminal
outcome. Closing the owning scope interrupts local fibers, closes the wire
body, and attempts any protocol cleanup.

This is also the natural place to enforce actual outstanding-byte and
concurrency budgets. A chunk size limit remains a separate parser/input rule.

### 5.5 Give large byte sequences a blob-level module

A progressive canonical-node transfer and a progressive large-file read are
not the same contract. With only one whole-node digest, a client cannot treat
an arbitrary prefix as authenticated until the whole canonical node has been
received and checked. An approved chunk/manifest node kind can instead make
each emitted chunk independently admissible and make range reconstruction a
property of the manifest.

```ts
interface CasBlobShape {
  readonly put: <E, R>(
    source: OneShotByteSource<E, R> | ReopenableByteSource<E, R>,
    options?: BlobPutOptions,
  ) => Effect.Effect<BlobReceipt, CasBlobError | E, R>

  readonly read: (
    root: ContentId,
    options?: { readonly range?: ByteRange },
  ) => Stream.Stream<Uint8Array, CasBlobError>

  readonly stat: (root: ContentId) => Effect.Effect<BlobInfo, CasBlobError>
}
```

`CasBlob` depends on `CasStore` admission, the approved blob descriptor, and
`CasTransfer`; it does not mint a second identity scheme. Effect `Graph` may
carry a validated in-memory projection of the chunk DAG for planning, but a
thin public `CasGraph` wrapper would add interface surface without hiding a
substantial new responsibility. Keep that projection internal to `CasBlob`
and `CasSync` unless a later use case establishes an independent graph
capability.

### 5.6 Make sync a separate service

```ts
interface CasSync {
  readonly plan: (
    roots: ReadonlyArray<ContentId>,
    target: SyncTarget,
    selection: BoundedSelection,
  ) => Effect.Effect<SyncPlan, CasSyncError>

  readonly run: (
    plan: SyncPlan,
  ) => Effect.Effect<SyncReport, CasSyncError, Scope.Scope>
}
```

`SyncPlan` is advisory scheduling data: roots, bounded selector/closure mode,
presence observations, estimated bytes, capability snapshot, and publication
steps. `SyncReport` accounts for requested, discovered, already-present,
transferred, admitted, rejected, missing, and unattempted identifiers plus the
final root/head publication outcome. Neither object is proof of closure merely
because a peer produced it.

For bidirectional operation, session state should name local/remote root sets,
shared observations, in-flight requests, negotiated capabilities, and the
conflict/publication policy. Automerge motivates this explicit carrier, but its
CRDT merge rules do not transfer to an immutable CAS.

### 5.7 Keep mutable publication explicit

OCI manifests/tags, Nix `.narinfo`, Hypercore heads/forks, and Automerge heads
all reinforce one boundary: bulk immutable content transfer and publication of
a mutable or discoverable root are different operations. A future `CasHeads`
or `CasRoots` service can supply compare-and-swap and retention/pinning policy.
It should not be folded into content admission.

## 6. Security ownership

Security is shared, but the ownership line can be crisp.

The library/adapter should own mechanisms that no application can safely
reimplement per call:

- recompute the project address and perform canonical admission before bytes
  become a readable node;
- account encoded, decoded, decompressed, queued/in-flight, and selected-graph
  budgets at the stage where each amount is observable;
- verify remote-authoritative offsets, terminal framing, requested ID, and
  response range; distinguish absence, integrity, protocol, auth, capacity,
  and transport failures;
- scope credentials to authority/tenant, redact them from receipts/events, and
  prohibit credential forwarding across an unapproved redirect;
- bound selector recursion/link count/result bytes and treat remote selection
  as untrusted scheduling input;
- cancel transport work and attempt session abort/temporary cleanup when an
  operation scope closes; and
- make progress/receipts operation-correlated so concurrent operations cannot
  be substituted for one another.

The user or deployment layer should choose policy:

- endpoints, credentials/trust roots, tenant/dedup namespace, allowed
  redirects, and whether discovery may cross an authorization boundary;
- byte/concurrency/deadline/retry limits, resume-state persistence, cleanup and
  retention expectations, and required commit/durability class;
- allowed selectors/roots, sparse versus full closure, and mutable-head
  conflict/publication policy; and
- whether wire compression, ranges, or server-side graph selection are enabled
  for a particular backend.

Capability discovery never overrides user policy. A server saying that it can
execute selectors or retain multipart state is not authorization to use that
feature. XET's content-existence discussion, tus's metadata warning, and
GraphSync's remote selector execution make these boundaries concrete.
([XET §14](https://datatracker.ietf.org/doc/html/draft-denis-xet-05#section-14),
[tus security considerations](https://github.com/tus/tus-resumable-upload-protocol/blob/c6a11fa3d7b6198e00e4aa5289ccb71314162b84/protocol.md),
[GraphSync responder/request hooks](https://github.com/ipfs/go-graphsync/blob/12cbffae99eb011ab3da82c5b74e29ec8dc1c6e0/graphsync.go))

## 7. Suggested sequencing for later ratification

1. Clarify byte-domain names and replace replayability-as-assertion with a
   source opener, while keeping the current whole-node contract.
2. Make the existing HTTP adapter genuinely progressive and measure actual
   outstanding bytes; retain whole-object spool-before-emission where the
   address scheme cannot authenticate partial content.
3. Add operation-local progress and a terminal `TransferReceipt`, carried by a
   handle or internal `Channel` rather than by ordinary data elements.
4. Add capability discovery and range/vectored reads with an explicit partial-
   verification policy.
5. Introduce resumable upload sessions only after their state/error/expiry /
   cleanup contract and conformance scenarios are frozen.
6. Introduce `CasSync` as a distinct slice with bounded selections,
   plan/run/report accounting, and separate mutable-root publication.

Each step needs its own contract/grilling pass. In particular, "range accepted
for emission", "durable commit", and "sync complete" cannot be public claims until
their exact observations and obligations are named and discharged.

## 8. Source ledger

All sources were read on 2026-08-27. Git blob IDs below identify the exact
selected file contents inside the named commit. No copied code enters this
report.

| Source | Exact pin / edition | Selected file receipt | Role and limit |
| --- | --- | --- | --- |
| [Bazel Remote APIs](https://github.com/bazelbuild/remote-apis/tree/becdd8f9ff811df88a22d3eadd6341753d51d167) | commit `becdd8f9ff811df88a22d3eadd6341753d51d167` | `remote_execution.proto`: SHA-256 `f0b237af779fd1de3a9a3a851915a09de3288538856bc5f5199701e0030cb70d`, 115765 bytes | REAPI v2 CAS/batch/tree/capability API. Protocol prior art only. |
| [Google ByteStream](https://github.com/googleapis/googleapis/blob/de3c0d362adbaafc7a0cd1254a8cd49a528505ee/google/bytestream/bytestream.proto) | commit `de3c0d362adbaafc7a0cd1254a8cd49a528505ee` | `bytestream.proto`: SHA-256 `961b833f35f4bdc51df4bca017cffdba299893e89762bf8041465560106dd3d6`, 7524 bytes | Range/resume/completion API. Not a Foldlab transport selection. |
| [OCI Distribution](https://github.com/opencontainers/distribution-spec/tree/a139cc423184af6078077b9b7ee336eddbd03f8f) | annotated tag `v1.1.1` object `b5c693e819628420cc04ba7d9263628276d8ca0f`; peeled commit `a139cc423184af6078077b9b7ee336eddbd03f8f` | `spec.md` blob `26e64b967d9a1e38e508f3f450500b5c0cf21a30` | Chunked upload and publication prior art. |
| [tus protocol](https://github.com/tus/tus-resumable-upload-protocol/tree/c6a11fa3d7b6198e00e4aa5289ccb71314162b84) | commit `c6a11fa3d7b6198e00e4aa5289ccb71314162b84`; protocol edition 1.0.0, 2016-03-25 | `protocol.md` blob `97f63cdba0a3911f956e1c66002b0187cec5aa4b` | Resumable-session API prior art. |
| [Git LFS](https://github.com/git-lfs/git-lfs/tree/09705b99b15cff34b4afb64e468d29f6a77b8b21) | commit `09705b99b15cff34b4afb64e468d29f6a77b8b21` | `docs/custom-transfers.md` blob `c9e475f812ea8d0bb59f66ef0e6ff60fe8bbce44` | Adapter lifecycle/progress/verification ownership. |
| [IPFS Boxo](https://github.com/ipfs/boxo/tree/63cae36adc96260c55d1e3b8bf5b9f4b78fd7080) | commit `63cae36adc96260c55d1e3b8bf5b9f4b78fd7080` | `blockstore.go` blob `3e12ea5c35ea0a34b96fb897723a8b8f1453e4c2`; `validating_blockstore.go` blob `2e7480dc437c1f43ddbf7d5c790aeecb81d76fdf` | Minimal blockstore and late-terminal-error API evidence. |
| [IPLD selector specification](https://github.com/ipld/specs/blob/a7b9376ebd43aeabba7d78487db3d9df456b7714/selectors/selectors.md) | commit `a7b9376ebd43aeabba7d78487db3d9df456b7714`; document marks itself Prescriptive-Draft | `selectors/selectors.md` blob `cd02236667bb17cd9b7869ee61121d515d7d537d` | Selector data-model prior art; not treated as a stable standard. |
| [go-graphsync](https://github.com/ipfs/go-graphsync/tree/12cbffae99eb011ab3da82c5b74e29ec8dc1c6e0) | commit `12cbffae99eb011ab3da82c5b74e29ec8dc1c6e0` | `graphsync.go` blob `0e374250f107ca53b12c23c3c36bce25aa789014` | Shipped Go API evidence, not a protocol endorsement or proof. |
| [Rust object_store](https://github.com/apache/arrow-rs-object-store/tree/b07471e2bc341278f86e30cf80a850d56cbe2c67) | commit `b07471e2bc341278f86e30cf80a850d56cbe2c67` | `src/lib.rs` blob `7138bdb3a024416c7ba93c0c62e03160e0553de7`; `src/upload.rs` blob `d7d50b1e31d053e43d9d3a4113aed5e5c2c61dc7` | Object/multipart/range API evidence. |
| [Nix](https://github.com/NixOS/nix/tree/2c73b59da29606068c0c98db015dd3a66955525d) | tag `2.35.2` object `a400e1f45939a4e0521f66e76470eea9e8ea666b`; peeled commit `2c73b59da29606068c0c98db015dd3a66955525d` | `binary-cache-store.cc` blob `5294ee7a0330fb247ae268b232d1bbdd52a82a68`; `binary-cache-store.hh` blob `0cc5d1f3ff3f12c3ba33afb4e2ea35b4bd3bcbec`; `substitution-goal.cc` blob `90273493e28803f63cadaeb19f95fbcf5fb2ac5d`; `narinfo.md` blob `e2e2efac0eeb11f3da5d858e3645dac765e1e33a` | Restartable source, publication, closure/fallback API evidence. |
| [XET](https://datatracker.ietf.org/doc/html/draft-denis-xet-05) | `draft-denis-xet-05`, 2026-06-29; source commit [`b29b7d1564b382245aabb65ede5fc9cfc8e93d4c`](https://github.com/jedisct1/draft-denis-xet/commit/b29b7d1564b382245aabb65ede5fc9cfc8e93d4c) | archived text SHA-256 `474d64988f0e28a561403807379e19cfe2c046a43ce39f210c9fdaf55b098a03`, 101863 bytes; source `draft-denis-xet.md` blob `c8fed40144e3a77eb90bf85558ebb9ffefc3d791` | Individual Internet-Draft; range/layout/privacy prior art only. |
| [Hypercore](https://github.com/holepunchto/hypercore/tree/affec09a56d5f164292c9a3305fbfcde7a40bb85) | commit `affec09a56d5f164292c9a3305fbfcde7a40bb85` | `README.md` blob `f39f10632c6d9d746d197e7e0941f2a950dad80a` | Append-only log/sparse replication API evidence; not a general CAS contract. |
| [Automerge](https://github.com/automerge/automerge/tree/47908d6c04a0ce3fea0fa1d6b7f5ce6ba3e5792e) | commit `47908d6c04a0ce3fea0fa1d6b7f5ce6ba3e5792e` | `sync.rs` blob `83377e4bf9549633f60fa6a878b958f82cc8cd5c`; `sync/state.rs` blob `e85f28c62001da64f57763063035bb040a124d39` | Stateful bidirectional-sync API evidence; CRDT semantics are out of scope. |
| [Effect](https://github.com/Effect-TS/effect/tree/0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07) | commit `0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07`, corresponding package `effect@4.0.0-rc.111` | `Stream.ts` `4c2f749ac2bba62b41364aff8fa7e674829f3362`; `Sink.ts` `2d5b7ddd8e3de3f6f754f4e5a79dc393b82ea292`; `Channel.ts` `cbd1247629c76703a37e8a36371306e43cacc384`; `Scope.ts` `12e1c6b1bf1a196ef64f4593e36de2b01c6e8e5c`; `Graph.ts` `4a099e3056fc93ba7bec8ad7596a32b5186e4aab`; `HttpIncomingMessage.ts` `1b915334fad875213e71a337e7a463c3de547f37`; `HttpBody.ts` `ae9db9374cbc217a932b6b8dc15438717dcf8330`; `RpcClient.ts` `641e17a60cc1aef172748e131db2988bb2310337`; `Socket.ts` `13eba59fd6c881a0d8100d66ad621e7ec2d5dc5d`; `EventLogRemote.ts` `dc76e650e0151ceb502288d3e36d5eaa95180c8f` | Subject-source runtime/API semantics. No general correctness claim follows from source inspection. |

## Boundary of this report

The survey supports API and conformance-test design choices only. It does not
show that Foldlab implements any surveyed protocol, that its current streaming
surface performs progressive network I/O, that a remote receipt proves
durability, that a selector result is a complete closure, that two peers
converge, or that any implementation satisfies a Lean model. Those remain
separate obligations with exact judgments if pursued.
