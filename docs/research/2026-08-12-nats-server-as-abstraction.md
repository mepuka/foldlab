# The NATS server as a value: what an effectful wrapper would actually wrap

Every load-bearing claim carries a primary source: `file:line` against the
pinned module versions from `go/go.sum` (`nats-server` **v2.14.4**, `nats.go`
**v1.53.1**, read from the local module cache), `file:line` into this repo, or
a URL into nats-io docs/source. Anything weaker is marked **UNVERIFIED**.

## TL;DR

The embedded NATS server is a plain Go value — `server.NewServer(*Options) →
*Server` with an explicit lifecycle (`Start`/`ReadyForConnections`/`Shutdown`/
`WaitForShutdown`) — but its *contents* (streams, KV buckets, consumers) are
not reachable as Go objects even from inside the process: all management is
subject-addressed client API, uniformly with remote callers. The durable
identity of a server is its `StoreDir`, not the `*Server` value; every piece
of this repo already treats restart as "new Server, same store." TypeScript
can never hold the server (nats.js is client-only), so the wrapper's TS face
can own at most a *process* and a *connection*; the substrate already runs all
three viable topologies (hidden in-process sidecar = journald; TS-data-driven
Go runtime = the derived-node plan; external server + clients = the gauntlet
fleets). The daemon/distribution reading is mechanically supported: JetStream
**mirrors** copy a stream byte-for-byte *at the origin's sequence numbers*
with resync-on-gap, so a hash-chained registry journal replicated to a
leaf-node daemon stays verifiable by the existing verify-on-read, and mirror
lag manifests as *absence* (UnknownDigest), never as wrong data. Sources
renumber and interleave — unusable for chained streams. Evidence favors a
Go-owned daemon embedding the server as a scoped value, configured by
TS-authored registry data, with TS as client-at-most.

---

## 1. The embedded server as a Go value

### 1.1 Construction and lifecycle

The server is constructed from a plain options struct and driven by explicit
lifecycle methods (all in nats-server v2.14.4 `server/server.go` unless
noted):

| Operation | Signature | Source |
|---|---|---|
| Construct | `NewServer(opts *Options) (*Server, error)` | pkg.go.dev/github.com/nats-io/nats-server/v2/server |
| Start | `func (s *Server) Start()` — non-blocking when launched via `go s.Start()` | server.go:2250 |
| Readiness | `func (s *Server) ReadyForConnections(dur time.Duration) bool` | server.go:4033 |
| Stop | `func (s *Server) Shutdown()` then `func (s *Server) WaitForShutdown()` | server.go:2571, 2761 |
| Drain-style stop | `func (s *Server) LameDuckShutdown()` | server.go:4431 |
| Liveness | `func (s *Server) Running() bool` | server.go:1687 |
| Client address | `func (s *Server) ClientURL() string` | server.go:1072 |
| In-process conn | `func (s *Server) InProcessConn() (net.Conn, error)` | server.go:2869 |
| JetStream after start | `func (s *Server) EnableJetStream(config *JetStreamConfig) error` | jetstream.go:193 |

Two option fields make the server fully hermetic: `DontListen bool`
(opts.go:402) suppresses every socket — the health check explicitly special-
cases it (`chk["server"] = info{ok: s.listener != nil || opts.DontListen, ...}`,
server.go:3979; accept-loop skip at server.go:3994-3997) — and `StoreDir`
scopes all JetStream persistence to a directory. The canonical embedding
pattern (options → `NewServer` → `go Start()` → `ReadyForConnections` gate →
connect) is the community-documented one
(https://www.karanpratapsingh.com/blog/embedding-nats-go) and is exactly what
this repo already does five times over (§4).

The client side of in-process embedding is a two-method contract in nats.go
v1.53.1: `type InProcessConnProvider interface { InProcessConn() (net.Conn,
error) }` (nats.go:304-306) and `func InProcessServer(server
InProcessConnProvider) Option` (nats.go:1122-1127). `*server.Server`
satisfies it via server.go:2869. No ports, no sockets, one process.

### 1.2 Accounts, streams, KV buckets: how they exist as objects

**Accounts** are the only resource that is a first-class *Go* object on the
server handle: `LookupAccount(name string) (*Account, error)`
(server.go:2093), `RegisterAccount(name string) (*Account, error)`
(server.go:1754), `LookupOrRegisterAccount(name string) (*Account, bool)`
(server.go:1741). They are runtime-creatable and enumerable in-process.
(This repo uses only the default global account — no `Accounts` are
configured anywhere in `go/`.)

**Streams, consumers, KV buckets are NOT Go objects you can reach from the
`*Server` value.** They exist only behind the subject-addressed JetStream
API, even from inside the owning process. The server's own mirror machinery
says this in as many words: *"Now send off request to create/update our
consumer. This will be all API based even in single server mode."*
(nats-server v2.14.4 server/stream.go:3513-3514). The management surface is
the client's (nats.go `jetstream` package,
https://pkg.go.dev/github.com/nats-io/nats.go/jetstream):

- Create/own: `CreateStream(ctx, StreamConfig) (Stream, error)`,
  `CreateKeyValue(ctx, KeyValueConfig) (KeyValue, error)`,
  `CreateConsumer(ctx, stream, ConsumerConfig) (Consumer, error)`.
- Enumerate: `ListStreams(ctx) StreamInfoLister` (channel of `*StreamInfo`),
  `StreamNames(ctx) StreamNameLister`, `KeyValueStores(ctx) KeyValueLister`,
  `KeyValueStoreNames(ctx) KeyValueNamesLister`.
- A KV bucket IS a stream (`KV_<bucket>`, subjects `$KV.<bucket>.>`) and a
  revision IS a stream sequence — source-verified in the guarantees dossier
  ([2026-08-12-jetstream-guarantees-source-verified.md](2026-08-12-jetstream-guarantees-source-verified.md) §3).

**Consequence for the wrapper.** The "server as a value" decomposes into two
values with different owners:

1. **The process value**: `Options` + `StoreDir` + lifecycle. Only Go can
   hold it. Its durable identity is the store directory — `Shutdown` +
   `NewServer` over the same `StoreDir` is a restart, not a new world.
2. **The resource plane**: streams/buckets as *data* (configs in, infos out)
   over a uniform API that behaves identically for in-process and remote
   callers. Anything that can hold a connection — including TS — can
   enumerate, create, and gate resources. This is why the shape gates
   (`badShapeReason`, go/journal/journal.go:255-290; the effector's bucket
   gate) work at all: ownership of a resource is enforced by *checking its
   config as data at open*, not by holding a Go object.

## 2. The embedding constraint and the viable topologies

**The constraint, verified:** the server embeds in Go only. The v3
JavaScript client ecosystem (https://github.com/nats-io/nats.js) is a
client monorepo — runtime-agnostic core/JetStream/KV modules plus TCP
transports for Node/Bun/Deno and W3C WebSocket for browsers. Nothing in it
runs a server; every reference is to connecting to an external
`nats-server`. So a TS Effect wrapper can own, at most: (a) a spawned OS
process, (b) a client connection, (c) data that configures either.

Three topologies span the TS Schema-authoring face and the Go substrate.
All three already exist in this repo in embryonic form.

### Topology A — Go sidecar owns the server; TS drives it

`go/cmd/journald` is the existing proof, with a stronger twist than "TS
client": the TS face never speaks NATS at all. The sidecar embeds the server
fully hidden (`DontListen: true`, main.go:287), gates on
`ReadyForConnections` (main.go:295), connects to itself in-process
(main.go:305), and exposes a *pinned NDJSON op protocol over stdio*
(main.go:39-53, 179-279). Lifecycle ownership is airtight: server dies with
the sidecar (`defer Shutdown/WaitForShutdown`, main.go:300-303); readiness
is a protocol fact (the `{"ready":true}` first line, main.go:318-320) that
the conformance test treats as the spawn contract
(go/cmd/journald/conformance_test.go:75-79).

- **Lifecycle**: TS acquires a process; `Scope`/`acquireRelease` maps to
  spawn → await ready line → kill. Exact fit for Effect.
- **Hermeticity**: best possible — no ports (`DontListen`), store dir per
  test, black-box conformance already demonstrated
  (conformance_test.go:44-80).
- **Crash-recovery**: restart = respawn over the same `--store` dir
  (main.go:351-357). The store dir is the durable value; the process is
  cattle.
- **Cost**: every NATS capability TS needs must be re-exposed through the op
  protocol, op by op. That is also its virtue: the boundary is data
  (ADR-0003), and the Go side's verification cannot be bypassed by a clever
  client.

### Topology B — Go node runtime configured entirely by TS-authored registry data

The map's destination demands this shape eventually: a node that is
*derived* — "an effectful wrapper interpreting the schema's law-gated
bindings over NATS, no hand-wired transport" (docs/map/map.md:10-13). Here
Go owns both server and node loop; TS authors nothing at runtime — it mints
registry data (schemas, bindings) that crosses as journal facts, and the Go
runtime folds them. TS's "wrapper" is then an authoring-time construct; the
only live TS artifact is data.

- **Lifecycle**: fully Go-owned; the daemon is `journald` grown up. TS holds
  no runtime resource at all in the pure form (or a connection in the mixed
  form).
- **Hermeticity**: same as A (embedded, `DontListen` possible if nothing
  external needs TCP).
- **Crash-recovery**: strongest — the node's config IS journal facts, so
  recovery is replay; no out-of-band config to drift
  (the frame in [2026-08-12-nats-agent-protocol.md](2026-08-12-nats-agent-protocol.md) §"facts before visibility").
- **Cost**: the registry encoding must be nailed down first (ticket 004),
  because it becomes the *interface* between the faces.

### Topology C — external server; both sides are clients

The gauntlet fleets run this internally: the controller spawns
`gauntlet server` as a separate OS process listening on a real port
(go/crashstorm/server.go:11-31 — `Host: "127.0.0.1", Port: port`), waits by
probing connect+flush (controller.go:156-172), and workers connect by URL
(controller.go:180-189). It exists precisely because crash injection
requires killing participants independently of the server
(controller.go:292, 313).

- **Lifecycle**: nobody in-process owns the server; some supervisor does.
  Clean for fleets, weakest for a "wrapper" — the wrapped thing outlives and
  predates the wrapper, so the wrapper can only *attach*.
- **Hermeticity**: worst — ports, startup races, shared instance risk;
  mitigated by testcontainers-style per-test containers at real cost.
- **Crash-recovery**: the server's replication story (R>=3, see the
  guarantees dossier's deployment assumptions) rather than a local respawn.
- **When forced**: the moment TS must hold a *live* NATS connection
  (nats.js over TCP/WebSocket), the server must listen somewhere —
  `DontListen` and pure in-process privacy are Go-only luxuries. A hybrid
  keeps A's ownership: the Go sidecar owns an embedded server that *does*
  listen on localhost, and TS connects to `ClientURL()`.

## 3. Prior art: the server as a managed value

- **Embedded NATS in the wild.** The community pattern is exactly the repo's
  harness: options value → `NewServer` → `go Start()` → `ReadyForConnections`
  gate → `ClientURL()`/`InProcessConn` → `Shutdown`/`WaitForShutdown`
  (https://www.karanpratapsingh.com/blog/embedding-nats-go;
  in-process transport mechanics explained at
  https://gosuda.org/blog/posts/how-embedded-nats-communicate-with-go-application-z36089af0).
  Ownership model: the application process IS the supervisor; the server is
  a scoped resource acquired at boot.
- **testcontainers-go NATS module**
  (https://golang.testcontainers.org/modules/nats/): `Run(ctx, img, opts...)
  (*NATSContainer, error)` returns a handle whose readiness is baked into
  acquisition; use via `ConnectionString(ctx)`; release via
  `testcontainers.TerminateContainer(ctr)` in a defer. The server as an
  acquire/release resource with connection-string as the only capability —
  the minimal "server as value" contract, and the one Effect's
  `acquireRelease` mirrors directly.
- **NACK, the JetStream k8s controller** (https://github.com/nats-io/nack):
  the operator does NOT run servers. It defines `Stream`, `Consumer`,
  `KeyValue`, `ObjectStore`, `Account` CRDs and reconciles them against an
  external NATS it reaches as a client. Its ownership stance is the
  interesting part: "Resources managed by NACK controllers are expected to
  *exclusively* be managed by NACK, and configuration state will be enforced
  if mutated by an external client" — declared config is authority, drift is
  corrected. And its `Account` CRD "does not create or manage NATS accounts.
  It functions as a connection and authentication config" — resources as
  data, exactly the §1.2 split.
- **Temporal's worker** (https://pkg.go.dev/go.temporal.io/sdk/worker):
  `New(client, taskQueue, options) Worker`; `Start() error` (non-blocking),
  `Run(interruptCh <-chan interface{}) error` (blocking), `Stop()`. The
  worker owns polling and execution; the server owns durable state, history,
  and scheduling. The split to copy: the *server* is a remote authority
  reached by a client value; the *worker* is the process-scoped value your
  program actually owns and supervises. Applied here: foldlab's "node" is
  the worker-analogue; whether it also embeds its authority (topologies A/B)
  is exactly what Temporal deliberately does not do — and what embedded NATS
  uniquely permits.

The convergent shape across all four: **acquire → readiness gate → use
through a narrow handle → release**, plus, orthogonally, **server-side
resources as declarative data reconciled/gated by a client**. Nobody hands
out live server internals.

## 4. What the substrate already assumes about ownership

| Site | Ownership model | Evidence |
|---|---|---|
| `go/journal`, `go/effector` primitives | None — they take `js jetstream.JetStream` and never see a server. Resource ownership is enforced as data via shape gates at `Open`. | journal.go:53-93, journal.go:255-290; effector conformance laws EL0/EL8 (effector_test.go:6-17) |
| Unit-test harnesses | One hermetic embedded server per test: `DontListen` + `InProcessServer` + `StoreDir: t.TempDir()`, torn down in `t.Cleanup`. | effector_test.go:39-70; journal_test.go:30-60 |
| `journald` sidecar | Server lives and dies with the process; store dir passed by flag is the sole durable identity; readiness is a protocol line; TS never touches NATS. | go/cmd/journald/main.go:281-357 |
| journald conformance gate | The sidecar is a black-box *process* value: build, spawn, speak NDJSON, kill. | conformance_test.go:31-80 |
| Gauntlet fleets (crashstorm, transfleet) | Server as a separate OS process on a TCP port, spawned/killed/respawned by a controller; readiness by connect+flush probe; workers are URL clients. | crashstorm/server.go:11-31, controller.go:128-172, 292-313; transfleet/server.go:11-31 |
| TS packages | `@foldlab/nats` is a stub (src/index.ts is empty; no NATS client dependency anywhere in `packages/`). Nothing in TS currently assumes any server access. | packages/nats/package.json, packages/nats/src/index.ts |

Two assumptions are so uniform they amount to committed doctrine:
**(1) the store dir is the server's identity** — every restart path
(journald respawn, fleet respawn) reuses the dir and nothing else; **(2) the
server is never shared between owners** — each test, sidecar, and fleet run
has a private instance, and resource-level trust comes from shape gates +
verify-on-read, not from trusting the instance.

One standing rule matters for §5: the journal shape gate **refuses**
mirror/source config on authority journals — "stream imports messages from
another stream" (journal.go:283-284), rationale in the protocol memo
("imported or removable messages break the 'position occupancy is proof'
reading of CAS",
[2026-08-12-nats-agent-protocol.md](2026-08-12-nats-agent-protocol.md)
§"Deliberately refused").

## 5. The daemon/distribution reading: leaf nodes, mirrors, KV replication

The reading under survey: the NATS server as a *local daemon* that spreads
the system's ontology (the registry) while providing schema/workflow/
transport utilities locally.

### 5.1 Leaf nodes: the edge daemon

A leaf node is a NATS server that opens an *outbound* connection to a hub
and bridges subject interest across the link; local clients never appear on
the hub as connections, and the leaf carries only subjects with remote
interest (https://docs.nats.io/running-a-nats-service/configuration/leafnodes).
The disconnected story is explicit in the docs source
(nats-io/nats.docs, running-a-nats-service/configuration/leafnodes/jetstream_leafnodes.md):

- "One of the use cases for a NATS server configured as a leaf node is to
  provide a local NATS network even when the connection to a hub or the
  cloud is down."
- "To support such a disconnected use case with JetStream, independent
  JetStream islands are also supported and available through the same NATS
  network." Disambiguation is the `domain` JetStream option; each domain's
  API is addressable as `$JS.<domain>.API.>`.
- "If you want to connect a leaf to the hub and get commands, even when the
  leaf node connection is offline, mirroring a stream located in the hub is
  the way to go. ... Once copied, accessing the data is independent of the
  leaf node connection being online."
- Cross-domain mirror/source "is the recommended way to exchange persistent
  data across domains."

So the daemon shape is: an embedded Go server per node, `JetStreamDomain`
set per node, holding its *own* streams/buckets (local authority) plus
mirrors of hub streams (replicated ontology), functioning fully while
offline. Lifecycle is unchanged from §1 — a leaf is just `Options` with
`LeafNode.Remotes` filled in.

### 5.2 Mirrors: replication a chain verifier can lean on

Semantics, from docs
(https://docs.nats.io/nats-concepts/jetstream/source_and_mirror) and
nats-server v2.14.4 source:

- **Read-only, one origin.** "A mirror is read-only. You can't publish to
  it directly, because it listens on no subjects of its own" (docs); the
  server enforces both statements as API errors — `JSMirrorWithSubjectsErr`
  10034 "stream mirrors can not contain subjects" and
  `JSStreamMirrorNotUpdatableErr` 10055 "stream mirror configuration can not
  be updated" (jetstream_errors_generated.go:817, 864). Exactly one
  upstream; config fixed at creation.
- **Origin positions are preserved.** "A message in the mirror keeps the
  same sequence number, the same timestamp, and the same subject it had
  upstream" (docs). Mechanically: `processInboundMirrorMsg` stores/proposes
  each message with `sseq-1` as the expected last sequence — i.e. *at* the
  origin sequence (stream.go:3305, 3308).
- **Gap-freedom is enforced, not hoped.** The transport is an internal
  ordered push consumer (`AckNone`, `MaxDeliver: 1`, heartbeats + flow
  control, stream.go:3527-3543) — chatter-grade — but the mirror's apply
  loop is a sequence gate: in-order messages advance
  (`sseq == mirror.sseq+1`, stream.go:3236-3238); an out-of-order message
  triggers `retryMirrorConsumer()` and is *rejected* (stream.go:3254-3258);
  on `errLastSeqMismatch` the counters roll back and the consumer is rebuilt
  (stream.go:3316-3336); resumption is always
  `DeliverByStartSequence, OptStartSeq: state.LastSeq + 1`
  (stream.go:3532-3533). The only path that admits a "gap" is when the
  *origin itself* expired or deleted messages — detected by
  `dseq == mirror.dseq+1` with a sequence jump — and even then the missing
  range is recorded explicitly via `skipMsgs(mirror.sseq+1, sseq-1)`
  (stream.go:3243-3253, skipMsgs at stream.go:3372), preserving numbering.
- **What this gives a hash-chained registry journal.** Because positions and
  bytes survive replication, the existing verify-on-read runs *unchanged* on
  a mirror: seq must equal position, prev must equal the verified head, wire
  bytes must be canonical (journal.go:182-196). A mirror cannot reorder or
  substitute without tripping it. Skip records cannot legitimately occur for
  our journals (origin is `DenyDelete`/`DenyPurge`, journal.go:76-77), and
  if one ever appeared, `GetMsg` on the skipped position fails and `Read`
  refuses with `ErrTampered` ("message is missing", journal.go:176-178).
  The one honest degradation mode is **lag**: the mirror is a verified
  *prefix* of the origin. A digest minted upstream but not yet replicated
  resolves as *absent* locally — UnknownDigest-under-lag is
  absence-not-corruption, which is precisely the failure mode the fence at
  ingress can refuse cleanly.
- **Sources are disqualified for this use.** A sourced stream interleaves
  multiple upstreams and assigns *fresh* sequence numbers on arrival (docs:
  "the aggregate gives them fresh sequence numbers... it doesn't preserve
  each upstream's the way a mirror does"). That destroys the
  position-occupancy reading the chain verification depends on. Sources are
  for aggregation, not for spreading an ontology.

### 5.3 KV replication: mirrors cover it, with write-routing home

A KV bucket is a stream, so stream mirroring is bucket mirroring. The spec
says so directly: "Key-Value buckets enable configuration of sources and
mirrors. ... Mirrors provide a way to create read-only copies of a bucket in
different locations or clusters" (nats-architecture-and-design ADR-8;
operational details deferred to ADR-57, which requires mirror buckets to
keep the `KV_` convention and serve the Direct GET API with
`MirrorDirect = true`). The client completes the picture: in nats.go
v1.53.1 `kv.go`, `mapStreamToKVS` detects `info.Config.Mirror != nil` and
re-points the *put prefix* at the origin — through the external API prefix
for cross-domain mirrors — so **writes against a mirror bucket are routed to
the origin bucket**, while reads are served locally via direct get (server
side: the mirror subscribes for direct gets once nearly caught up,
`MirrorDirect` handling at stream.go:3267-3276). Revisions are stream
sequences and mirrors preserve sequences, so a revision observed on a
replica is the *same number* the origin would report — revision-CAS
semantics stay meaningful across replication; only the write must travel.

## Implications for the ownership ticket (002)

1. **Which side owns the node runtime: Go, by elimination and by evidence.**
   TS cannot hold a server (nats.js is client-only), and the strongest
   existing artifact — journald plus its black-box conformance gate —
   already demonstrates the Go-owned form with the best hermeticity
   (`DontListen`, store-dir identity, ready-line contract). The wrapper's TS
   face owns, at most, a spawned process and/or a client connection; as an
   Effect value that is `acquireRelease(spawn → awaitReady, kill)` — the
   testcontainers contract, not a server object.
2. **Topology: B (Go daemon configured by TS-authored registry data), with
   A's stdio pattern as its test face.** C (external server) is forced only
   where independent crash injection or a live TS connection is required —
   and the hybrid (embedded server that listens on localhost) preserves
   Go's lifecycle ownership even then. The map's "derived node" phrasing
   (map.md:10-13) already presumes B.
3. **"The server as a value" should enter the ownership discussion as two
   values, not one**: the process value (Go-only, store-dir-identified,
   scope-managed) and the resource plane (pure data — configs gated at open,
   infos enumerated by any connection-holder). The minter question is about
   the *resource plane*; nothing in it requires the minter to be the process
   owner — but co-locating them (the daemon mints locally) costs nothing
   architecturally because management is API-uniform even in-process
   (stream.go:3513-3514).
4. **The daemon/distribution reading is load-bearing, not decorative.**
   Registry-as-hash-chained-journal mirrors to leaf daemons with positions
   and bytes intact; the existing verifier needs zero changes to check a
   replica; lag is absence, so "mint/resolve locally,
   UnknownDigest-under-lag" is a refusal case the fence can state exactly
   (digest doesn't resolve *yet* ⇒ record may not enter the streams — same
   rule as today, no new machinery). KV mirrors extend this to any future
   KV-backed registry: reads local, writes routed to the origin authority.
5. **One gate must bifurcate before any of this ships.** The journal shape
   gate refuses mirror config outright (journal.go:283-284) — correct for
   *authority* journals, wrong for *replicas*. The distinction "authority
   stream imports nothing / replica stream is a mirror of a named authority
   and is verified by read, never written" changes what the gate means and
   is an ADR-scale decision, not a tweak. Ticket 002 should grill exactly
   this line: minting writes only to authorities; daemons hold mirrors;
   verify-on-read is the trust mechanism on both.
