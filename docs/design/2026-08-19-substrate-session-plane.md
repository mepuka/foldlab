# The substrate session plane — every channel a NATS server can hold, the three faces of its API, and the session as a declared fact

Date: 2026-08-19. Status: **DESIGN, PRE-GRILL.** Drafted by the Mac spec
lane (session plane) at `origin/main` `c0b5b690ac21`. It rules nothing;
the operator rules.

**The commission, verbatim intent (operator, tonight, voice):** *"On
startup you're starting a session. You connected — that's a DIGEST. It's
got your configuration ID, IP. That's ground truth. Then the periodic
health heartbeat, status, who's connected, what's your ID."* §5 is that
sentence made mechanical; §3 and §4 are the ground it has to stand on.

**The posture this record is written under (operator ruling,
2026-08-19).** The estate WILL have its own daemon wrapping the official
server — the embedded-server path analysed in the server-as-abstraction
research. **For now the ruled posture is PRIVILEGED CLIENTS:** the estate
speaks to a stock `nats-server` through the client API, under declared
credentials, asserting shapes it does not own. Nothing here pretends to
own the server. Every table below therefore carries a **daemon column**
marking which rows a future daemon internalises and which stay
client-plane forever, and §5's model is written so that it holds in both
postures — *a privileged client declares its session fact today; the
daemon emits the same fact natively later. Same meaning, different
carriage.* The daemon's activation is the operator's act and is tracked
as a roadmap marker on the board (DEV-829); **no row in §8 proposes
wrapper machinery.**

**This record changes no code, no gate, no ledger row, no ticket, and no
seam status.** Its only write is this file. Unlike the storage-stack
record it promotes, it *does* measure: every number in §3 and every
default in §7 was produced first-hand this session against the pinned
binary, from a scratch script held in the drafting worktree and
deliberately not committed (§9, bound 1).

**Law 10 and this file.** Law 10 forbids tracking artifacts — repo-local
ids, ticket numbers, paths, commands — on any surface rendered *outward*.
A design record is tracking-land, not an official document, so `file:line`
citations, ticket keys, and flag strings are lawful here and are used
throughout. Nothing in this file is a projection source; if any sentence
below is ever promoted to a rendered surface, it loses its citations on
the way out.

**Confidence tiers, as the estate uses them:** **ratified** (grill record
or standing ruling) · **proven** (a Lean theorem behind a green gate) ·
**source-verified** (read in the pinned vendor tree at `file:line`) ·
**measured** (executed this session, numbers reported) · **PROPOSED** (a
grill row) · **UNVERIFIED** (stated as a gap).

Its sources, named verbatim, all read first-hand this session:

- `docs/research/2026-08-12-nats-server-as-abstraction.md` — the
  owner-facing lifecycle and the three topologies. **Built on, not
  repeated:** that record answers *who owns the server*; this one answers
  *what channels exist and what a connection means*, and cites it rather
  than restating it.
- `docs/research/2026-08-12-nats-agent-protocol.md` — the three wire
  shapes and the promotion rule.
- `docs/research/2026-08-13-nats-vendor-corpus-scorecard.md` — the
  RethinkCon 2026 vendor corpus, cited in `doc§timestamp` form.
- `docs/research/2026-08-18-jepsen-remediation-at-v2-14-4.md` — what is
  and is not fixed at the pin.
- `docs/design/2026-08-18-plait-agent-plane.md` — §8 (the shuttle), §9
  (agent identity, sessions, the digest chain), §11.2 (the tick pattern).
- Tonight's spec comments on DEV-781, DEV-782, DEV-826, DEV-827, and the
  two operator requirements filed on DEV-826 and DEV-781.
- The pins themselves: `nats-server` v2.14.4 and `nats.go` v1.53.1 in the
  Go module cache (`go/go.mod:6-7`; extracted trees confirmed on disk at
  `/Users/pooks/go/pkg/mod/github.com/nats-io/`), and `@nats-io/*` 3.4.0
  in `packages/plait/node_modules` (`packages/plait/package.json:75-79`).
- The code seams: `packages/plait/src/internal/transport.ts`,
  `packages/plait/test/NatsHarness.ts`, and the Go NATS surface in `go/`
  and `proto/go/`.

---

## 0. For an outsider, before any house word

A NATS server is a message broker. Programs open a TCP connection to it
and send it four kinds of instruction: publish a message on a subject,
subscribe to a subject, make a request and wait for a reply, and — for
the persistent half of the product, JetStream — manage streams and
key-value buckets by sending specially-addressed requests. That last
point is the one that surprises people: **there is no separate
administrative protocol.** Creating a stream is publishing a request to a
subject named `$JS.API.STREAM.CREATE.<name>`. Everything is messages.

Alongside that one client port, the server can be *configured* to open
several other doors: a WebSocket port for browsers, an MQTT port for
devices, a leafnode port so another NATS server can bridge into it, a
cluster port so peers can replicate, a gateway port for joining
superclusters, and an HTTP port that serves read-only JSON status pages.
Section 3 is a census: which of those doors *can* exist at the version
this estate pins, and which the estate actually opens. The answer, at the
pins, is one.

The second half of this record is about what it *means* to connect. When
a program connects, the server assigns it a number, records its address,
and tells it who the server is; the program in turn declares a name and a
bag of options. That exchange is real information — it is the only moment
in a program's life when the substrate and the program tell each other
who they are. The estate's discipline is that facts are declared values
whose name is the hash of their bytes; so the proposal here is that this
exchange should be *folded into one such value at the moment it happens*,
and that everything afterwards — heartbeats, "who is connected", loss and
recovery of the connection — should be facts that cite it, rather than
questions asked of the broker.

**House terms, one line each.** A **digest** is a SHA-256 hash over a
value's canonical bytes: its permanent name. A **fact** is a value
appended to an append-only **lane**; a **fold** is a declared reduction
over a lane; an **anchor** is a reader's recorded position in one. A
**refusal** is a typed value carrying the law it defends and a legal next
move, returned instead of an error. A **writ** is the authority scope a
connection acts under. **Carriage** is everything that moves bytes and
claims no meaning. **The pin** is the exact vendor version the estate
locks. **`$SYS`** is the server's own internal account, on which it
publishes events about itself. **SP-** names a grill row from this
record's sheet.

---

## 1. Result first

**1.1 A running estate process holds five client TCP connections to the
substrate, and the substrate holds exactly one listening socket.**
Measured: building the five plane layers (`Lanes`, `Folds`, `Cells`,
`Registers`, `Sessions`) against one harness server yields
`/connz num_connections = 5`, client ids 5 through 9, one per service
layer, each named, all `kind: Client`, `lang: nats.js`, `version: 3.4.0`,
`ip: 127.0.0.1`. On the server side, at the harness's exact flag set, one
socket is in `LISTEN`. There is no second channel of any kind. **§3.**

**1.2 The monitoring plane is not merely unread — at the pins it is not
listening.** Tonight's audit found `/healthz` consumed nowhere in the
estate; the sharper finding is that the test harness passes no `-m` and
no config sets `http_port`, so the server never binds the HTTP port and
the ports file it writes has no `monitoring` key at all. Measured:
`{"nats":["nats://127.0.0.1:62202"]}` — one key. **DEV-826's deliverable
1 — "probe `/healthz` before first substrate call" — therefore cannot be
built without first changing the harness's server options, which is a
config decision nobody has made.** That is the first thing this record
found that it did not expect. **§3.3, SP-6.**

**1.3 Presence via `$SYS` is not a design choice the estate is declining;
it is unreachable at the pins.** The system account exists
(`varz.system_account = "$SYS"`) and the server publishes connect,
disconnect, lame-duck, shutdown and stats events on it
(`server/events.go:48-70`). But the estate's connections land in the
global account `$G` (measured: `info.remote_account = "$G"`), and a
request from `$G` to `$SYS.REQ.SERVER.PING.VARZ` returns **`no
responders`** — measured — while a `$SYS.>` subscriber in `$G` receives
zero messages across another client's full connect-and-disconnect cycle.
So "who is connected" cannot be answered by asking the broker without
first minting a system-account credential that does not exist. The
operator's instinct — presence as a *derived fold over facts the estate
declared* — is not the elegant option; at the pins it is the only one.
**§3.4, §5.4.**

**1.4 The session is a declared fact, and NATS's own CONNECT/INFO
exchange is its carriage, never its meaning.** At establishment the
substrate and the process exchange a complete, closed set of identity
data — measured verbatim: `server_id`, `server_name`, `version`, `proto`,
`go`, `host`, `port`, `headers`, `max_payload`, `jetstream`, `client_id`,
`client_ip`, `connect_info`, `remote_account`, `api_lvl`, `xkey`, against
the process's declared `name` and connect options. Folding that plus the
estate's own writ into one canonical value gives the **session fact**;
its digest is the session's name. Everything after — heartbeats,
disconnection, reconnection, drain — is a further fact that *cites that
digest*. This is the operator's model, and it is the same shape as the
agent plane's already-designed session (agent plane §9.2: a session is a
journal whose key is the digest of its canonical open event, derivable by
any party with zero I/O). **§5.**

**1.5 Heartbeat is a tick fact, never a clock read.** The estate's fold
has no clock (agent plane §11.1) and the ratified tick pattern (§11.2,
PROPOSED as G32) already says how a boundary clock becomes lawful
evidence: a seat holds a declared schedule and emits `{schedule digest,
firing n, claimed time}` as ordinary monotone evidence. A substrate
heartbeat is that pattern with the session digest added: `{session,
schedule, firing, claimed}`. Two racing emitters of the n-th heartbeat
emit byte-identical bodies, so duplicates are absorbed. Nothing in the
estate ever asks "is it still alive"; it reads how far the heartbeat lane
has advanced, which is the same honest-staleness arithmetic the frontier
view already uses. **§5.3, SP-2.**

**1.6 The connection state machine DEV-826 requires has exactly eleven
states, and they are enumerable rather than inventable.** Measured from
the pin's own declaration
(`@nats-io/nats-core@3.4.0` `lib/core.d.ts:1-43`): `disconnect`,
`reconnect`, `reconnecting`, `update`, `ldm`, `error`, `ping`,
`staleConnection`, `forceReconnect`, `slowConsumer`, `close` — each with
its own payload shape. The operator's requirement that the machine's
states be *derived from the pinned client's actual status-event
vocabulary, never invented* is satisfiable today by transcription, and
the transcription is above. **§5.5, SP-4.**

**1.7 The estate's connections give up permanently after twenty seconds
of substrate absence, and nothing notices.** The transport spine passes
exactly four things to `connect` — servers, name, and (only with a
credential) the authenticator and inbox prefix
(`internal/transport.ts:196-206`). Every other option is the pin's
default, and `maxReconnectAttempts` defaults to **10** with
`reconnectTimeWait` at **2000 ms**
(`@nats-io/nats-core@3.4.0` `lib/options.js:29,36-48`). Measured with the
spine's own option set: server killed → `disconnect` at 1 ms → ten
`reconnecting` statuses at ~2 s intervals → `close` at **20 669 ms**,
with `nc.closed()` resolving `ConnectionError: connection refused`. After
that the process holds a dead connection forever; `NatsConnection.status()`
is consumed nowhere in `src`, so nothing observes the transition, and
every later call mints a transport-absence refusal whose taught repair is
"retry", which can never succeed. **DEV-781's spec comment reasons that
"an unbounded reconnect is lawful" under recover-by-read — the measured
default is not unbounded, it is ten.** That is the second surprise. **§7.1,
SP-5.**

**1.8 The API taxonomy has three faces and the daemon boundary runs
through only one of them.** Owner→server (server options, config reload,
the `$SYS` subject API, the HTTP monitoring plane) is the face a future
daemon internalises wholesale. Client→server (core pub/sub/request,
`$JS.API.>`, KV as a JetStream view) is client-plane forever — the daemon
would speak it too, in-process, and the vendor says so in as many words:
management is "all API based even in single server mode"
(`server/stream.go:3513-3514`, cited in the server-as-abstraction
research §1.2). Inbound/node→estate (leafnodes, the shuttle's plane) is
where the daemon changes what is *possible* rather than what is *owned*.
**§4.**

**1.9 The estate already runs the standing-shape discipline DEV-781 is
about — in Go, not in TypeScript.** `go/journal/journal.go:124-159`
subscribes to `$JS.EVENT.ADVISORY.STREAM.UPDATED.<stream>` and latches a
shape violation on every advisory, closing the info-before-subscribe race
by re-asserting once after subscribing. The TypeScript side has no
equivalent: its gates run once at open. DEV-781 proposes reconnect as the
re-assertion point; the Go twin shows a second, strictly better one — the
server's own advisory — which needs no reconnect to fire. Both are
carriage for the same meaning. **§4.2, SP-3.**

**1.10 Three different things in this estate are called a "session", and
the collision is now load-bearing enough to name.** (a) `Sessions` in
`packages/plait/src/planes/Session.ts` is a *read session over deployed
folds* — a writ, a view digest, a partition, a position. (b) The agent
plane's session (§9.2) is a *protocol session journal* keyed by the
digest of its open event. (c) This record's session is the *substrate
session* — one connection's identity, folded at establishment. They are
three distinct constructs at three planes and they compose (a substrate
session is what a protocol session's carriage rides on; a read session
names no connection at all). Shipping a third `Session` type without
naming the collision would be the drift. **§5.1, SP-1.**

---

## 2. Grounding — the authorities this record stands on

| Authority | What it settles | Status |
|---|---|---|
| Server-as-abstraction research | The server is a Go value with an explicit lifecycle; streams/consumers/KV are not Go objects even in-process; TS can hold at most a process and a connection; three topologies, all present in embryo | source-verified at the pins |
| Agent-protocol research | Three wire shapes (journal facts, commitment registers, ephemeral chatter) and the promotion rule: *chatter accelerates; facts decide* | ratified in use |
| Agent plane §9.2 | A session is a journal whose key is the digest of its canonical open event, derivable with zero I/O; completion is a total function of the declaration | PROPOSED (G27–G32 family) |
| Agent plane §11.2 | The tick pattern: a schedule is a declared value, a scheduler is a seat, firing is emitting evidence; triggers react to existence, never to time | PROPOSED (G32) |
| Vendor corpus scorecard | Item 1 — shape gates run ONCE at `Open` while stream configs are live-mutable (doc 05 §00:35:49); item 2 — acked writes reach kernel buffers, explicit sync every two minutes (05 §01:21:01); item 3 — server IPQ overflow drops silently with only a log line (05 §00:44:43) | vendor-stated |
| Jepsen remediation addendum | `#7549` (single-bit `.blk` errors → partial loss of acknowledged writes) is OPEN and NOT fixed at v2.14.4, with no peer reconciliation of a mid-stream checksum gap | source-verified |
| DEV-826 + its operator comment | Readiness is unprobed; nothing drains; the lifecycle gets formally modelled as a state machine whose states derive from the pinned client's real vocabulary | ticket, open |
| DEV-781 + its operator comment | Shape is asserted at open and mutable afterwards; the status pump does not exist; connect options are unruled defaults; the pump's state set must be the enumerated real one | ticket, open |
| DEV-745 | The shuttle epic — the estate's first long-lived NATS process and the first client that can honour a lame-duck disposition | chartered |
| Operator ruling 2026-08-19 | Privileged clients now; the estate's own daemon wrapping the official server later; daemon activation is the operator's act | ruled |

Two vendor facts are confirmed **first-hand this session** rather than
carried on the corpus's word, which matters because the corpus is ASR:

- **The two-minute sync interval is real and is the default.** Measured:
  `varz.jetstream.config.sync_interval = 120000000000` ns. The scorecard's
  scariest row (05 §01:21:01) is now measured, not transcribed. Nothing
  in the estate sets `SyncAlways` outside two explicitly-labelled
  durability probes (`go/journal/hardening_bench_test.go:26`,
  `go/substrate/recovery_test.go:45`).
- **`strict` JetStream is on and the API level is 4.** Measured:
  `varz.jetstream.config.strict = true`, `api.level = 4`.

---

## 3. The channel inventory, measured

### 3.1 How it was measured

One `nats-server` built from the estate's own Go module lock
(`go build github.com/nats-io/nats-server/v2` in `go/`, answering
`nats-server: v2.14.4`), launched with the harness's flag set verbatim
(`packages/plait/test/NatsHarness.ts:152-169`):

```
-js  -sd <dir>/store  -a 127.0.0.1  -p -1  --ports_file_dir <dir>
```

Listening sockets were read from the OS (`lsof -nP -p <pid> -iTCP -sTCP:LISTEN`),
not from the server's self-report. A second incarnation added `-m -1` so
the HTTP plane could be interrogated; a third built the estate's five
plane layers against it and read `/connz`. All three ran in the drafting
worktree; the script is not committed.

### 3.2 Every channel that CAN exist at v2.14.4 vs what the estate OPENS

Client kinds are the server's own enumeration
(`server/client.go:45-66`: `CLIENT`, `ROUTER`, `GATEWAY`, `SYSTEM`,
`LEAF`, `JETSTREAM`, `ACCOUNT`; the last three are internal).

| Channel | Direction | Enabled by | At the harness pins | Estate opens | Daemon column |
|---|---|---|---|---|---|
| Client TCP | inbound to server | `Options.Port` / `-p` | **ON** — one socket in `LISTEN`, ephemeral port (measured) | **5 connections per process** (measured) | client-plane forever |
| Client TLS | inbound | `Options.TLSConfig` | OFF — `tls_timeout: 2` is a timeout, not a listener; zero `TLS` fields set anywhere in `go/` or `proto/go/` | none | daemon may terminate TLS; the meaning is unchanged |
| WebSocket | inbound | `websocket{}` block | **OFF** — `varz.websocket = {}` (measured) | none | daemon internalises the decision |
| MQTT | inbound | `mqtt{}` block | **OFF** — `varz.mqtt = {}` (measured) | none | daemon internalises the decision |
| Leafnode listener | inbound | `leafnodes{port}` | **OFF** — `varz.leaf = {}`, `varz.leafnodes = 0` (measured) | none | **daemon's whole point** — §4.3 |
| Leafnode remote | **outbound from server** | `leafnodes{remotes}` | **OFF** — `varz.remotes = 0` (measured) | none | daemon's, likewise |
| Cluster route | both | `cluster{}` | **OFF** — `varz.cluster = {}`, `varz.routes = 0` (measured) | none | daemon internalises |
| Gateway | both | `gateway{}` | **OFF** — `varz.gateway = {}` (measured) | none | daemon internalises |
| HTTP monitoring | inbound | `Options.HTTPPort` / `-m` | **OFF** — ports file has no `monitoring` key (measured) | **none — the finding** | daemon internalises: it can read its own `Varz()` in-process |
| HTTPS monitoring | inbound | `-ms` | OFF — `varz.https_port = 0` (measured) | none | as above |
| Profiling port | inbound | `--profile` | OFF — `/profilez` unregistered, 404 (measured) | none | host-plane, never semantic |
| In-process conn | neither — no socket | `DontListen` + `InProcessConn` | not used by the TS harness; **used by every Go test** (`DontListen: true` at six sites) | Go only | **the daemon's native carriage** |
| Internal system client | in-process | always | present — `varz.system_account = "$SYS"` (measured) | unreachable from `$G` (§3.4) | daemon holds it natively |
| Internal JetStream client | in-process | with `-js` | present | not addressable | daemon holds it natively |

**Count, stated once so it can be quoted: at the estate's pins a running
substrate holds one listener and admits one channel kind. Every other row
in that table is `{}`.** Corroborating self-report at zero client
connections: `varz.connections = 0`, `routes = 0`, `remotes = 0`,
`leafnodes = 0`, `subscriptions = 63` — those 63 are the server's own
internal subscriptions, held by internal-kind clients that `/connz` does
not list. Client ids 1–4 were consumed before the estate's first
connection got id 5, which is the same fact seen from the other side.

### 3.3 What the estate opens, per process, measured

Five plane layers built in one scope against one server:

| cid | connection name | source | subscriptions |
|---|---|---|---|
| 5 | `foldlab-plait-lanes` | `internal/lanes.ts:216-221` | 0 |
| 6 | `foldlab-plait-sessions` | `internal/sessions.ts:41-46` | 1 |
| 7 | `foldlab-plait-folds` | `internal/folds.ts:47-52` | 1 |
| 8 | `foldlab-plait-cell` | `internal/cells.ts:227-232` | 1 |
| 9 | `foldlab-plait-register` | `internal/registers.ts:197-202` | 1 |

Two further named acquires exist and did not participate in this build:
`foldlab-plait` (`internal/nats.ts:234-239`) and `foldlab-plait-chaos`
(`internal/chaos.ts:293-298`), plus one raw `connect` outside the spine
at `surface/cli.ts:288`. **So the shape is one connection per service
layer, not one per process** — a process that provides all seven would
hold seven. Every connection is named, always: the spine sets `name`
unconditionally (`internal/transport.ts:198`), which is what made this
table readable at all.

Cost of construction, measured on the same run:
`jsz.api.total = 16, errors = 4` and `streams = 3` — building five layers
costs sixteen `$JS.API` round trips, four of which are the
lookup-before-create probes that legitimately fail.

### 3.4 The monitoring HTTP plane: what it exposes, and that nothing reads it

Fifteen routes are registered at v2.14.4
(`server/server.go:3029-3042` for the path constants, `:3133-3161` for
the handlers): `/`, `/varz`, `/connz`, `/routez`, `/gatewayz`, `/leafz`,
`/subsz` (plus the `/subscriptionsz` alias), `/stacksz`, `/accountz`,
`/accstatz`, `/jsz`, `/healthz`, `/ipqueuesz`, `/raftz`. Measured with
`-m` enabled on a single unclustered node: eleven answered `200`;
`/raftz` answered `404` ("No Raft nodes registered",
`server/monitor.go:4234-4239`); `/profilez` and `/expvarz` are not
registered at all in this build.

`/healthz` takes the option set `js-enabled`(deprecated),
`js-enabled-only`, `js-server-only`, `js-meta-only`, `account`, `stream`,
`consumer`, `details` (`server/monitor.go:2994-3005`). Measured: every
variant returned `{"status":"ok"}` on a healthy server, which is the
uninteresting half; the interesting half is that on the 2.14 line a
stream that hits a filesystem write error freezes and reports unhealthy
here, and **that is the designed signal for a wedged writer**
(jepsen-remediation addendum; DEV-826's premise).

**The negative, verified as a negative.** A full-tree search for
`healthz`, `varz`, `connz`, `http_port`, `HTTPPort`, `8222`, `$SYS`, and
`SYS.REQ` across `packages/`, `proto/`, `go/`, `scripts/`, `verify/`,
`fixtures/`, `.github/` and the root configs returns **zero hits in
estate code**. The only two hits anywhere are prose inside
`docs/research/2026-08-18-jepsen-remediation-at-v2-14-4.md` (a
recommendation about upstream, and an upstream issue title). There is no
HTTP client of any kind in `packages/plait` — zero `fetch(`, zero
`node:http`. The one `createServer` in the tree is `node:net`, a
wire-level NATS proxy used by the hold-proxy test harness.

So the audit's finding stands and sharpens: **`/healthz` is consumed
nowhere, and at the pins there is nothing at the other end to consume.**

### 3.5 `$SYS`: present, populated, and unreachable

The server publishes a rich event vocabulary on the system account
(`server/events.go:40-78`), including exactly the subjects an operator
would reach for when asked "who is connected":

| Subject | Event |
|---|---|
| `$SYS.ACCOUNT.<acct>.CONNECT` | a client connected |
| `$SYS.ACCOUNT.<acct>.DISCONNECT` | a client disconnected |
| `$SYS.ACCOUNT.<acct>.SERVER.CONNS` | per-account connection count updates |
| `$SYS.SERVER.<id>.LAMEDUCK` | the server entered lame-duck mode |
| `$SYS.SERVER.<id>.SHUTDOWN` | the server is going down |
| `$SYS.SERVER.<id>.STATSZ` | periodic server stats |
| `$SYS.SERVER.<id>.CLIENT.AUTH.ERR` | an authentication failure |
| `$SYS.REQ.SERVER.PING.<endpoint>` | request the monitoring payloads over NATS |
| `$SYS.REQ.SERVER.<id>.RELOAD` | reload the server config |
| `$SYS.REQ.SERVER.<id>.KICK` / `.LDM` | evict / lame-duck one client |
| `$SYS.REQ.USER.INFO` | the caller's own bound account and permissions |

Measured from an estate-shaped connection (default account, no
credential): `nc.request("$SYS.REQ.SERVER.PING.VARZ")` → **`RequestError:
no responders`**. A subscription to `$SYS.>` is *accepted* — client-side
subscriptions always are — and receives **zero messages** while a second
client connects, flushes and closes; a `>` subscription in the same
account receives zero too, because the events are published in `$SYS` and
account isolation holds. **`$SYS` is a door the estate has no key to, and
would need a minted system-account credential to open.** That is a
config decision with a blast radius (a system-account credential can kick
clients and reload the server), and it is exactly the kind of decision
this record refuses to make on the operator's behalf (SP-3).

---

## 4. The API taxonomy: three faces

Each face is enumerated, each row cites its source, and each carries the
**daemon column** the 2026-08-19 posture requires: *internalised* (the
future daemon owns this and the client stops speaking it), *client-plane
forever* (the daemon speaks it too, only in-process), or *enabled*
(the daemon changes what is possible, not who owns it).

### 4.1 Face (a) — owner→server

The face the estate does **not** hold today. Under the privileged-client
posture, every row here is either an operator act or a flag on a stock
binary.

| Surface | Mechanism at the pin | Estate today | Daemon column |
|---|---|---|---|
| Server options at start | `server.Options` struct, or CLI flags | TS harness passes five flags (`-js -sd -a -p --ports_file_dir`, `NatsHarness.ts:152-169`), optionally `-c <conf>` for three call sites; Go tests build `Options` literals directly at six sites (`ServerName`, `JetStream`, `StoreDir`, `DontListen`, `NoLog`, `NoSigs`, and `SyncAlways` on two durability probes) | **internalised** — the daemon constructs the value |
| Config reload | SIGHUP; `$SYS.REQ.SERVER.<id>.RELOAD` (`server/events.go:69`) | **never used** | **internalised** |
| `$SYS` subject API | the table in §3.5 | **unreachable** (§3.5, measured) | **internalised** — the daemon holds the system account natively |
| HTTP monitoring | fifteen routes (`server/server.go:3133-3161`) | **not listening, not read** (§3.4) | **internalised** — `s.Varz()`/`s.Healthz()` are Go calls once the server is a value |
| Lifecycle | `NewServer` / `Start` / `ReadyForConnections` / `Shutdown` / `WaitForShutdown` / `LameDuckShutdown` (server-as-abstraction §1.1) | the TS harness's readiness is a **ports file appearing**, and its stop is `kill()` — SIGTERM, which at this server is an immediate orderly shutdown | **internalised** — this is DEV-826's other half |
| Accounts | `LookupOrRegisterAccount` (`server/server.go:1741`) | `proto/go/protod/auth.go:70` already mints **one account per client connection** at runtime — the estate's existing embedded-server prototype | **internalised**; note the prototype already proves the shape |

**The readiness gap, stated precisely.** The harness's readiness signal is
the `.ports` file appearing, polled up to 2400 × 25 ms
(`NatsHarness.ts:56-63`). A ports file proves the client port is bound. It
proves nothing about JetStream, so every suite races `$JS.API`
availability — which is DEV-826's finding, and which the sixty-second
nominal bound treats as a symptom. The vendor's readiness probe is
`/healthz?js-enabled-only=true`. **Under the privileged-client posture the
only way to reach it is to add `-m` to the harness's flags** — a change to
face (a) that this record does not make and SP-6 prices.

### 4.2 Face (b) — client→server

The face the estate holds today, in full. Everything here stays
client-plane forever: even inside the future daemon, stream and KV
management is subject-addressed request/reply, *"all API based even in
single server mode"* (`server/stream.go:3513-3514`).

| Surface | Estate speaks it? | Where, `file:line` |
|---|---|---|
| `connect` / `close` | **yes** — and only these two, in the spine | `internal/transport.ts:196` (connect), `:175` (close) |
| `drain` | **no** — never called anywhere, TS or Go | negative verified; the method exists at the pin (measured: `typeof nc.drain === "function"`, and a drained connection reports `isClosed() === true`) |
| `status()` | **no** — consumed nowhere in `src`; used once in a test | `test/KVWatchSemantics.test.ts:250-268` (the DEV-731 reconnect arm) |
| `info` | **one field only** — `max_payload` | `internal/lanes.ts:222` |
| core publish / subscribe / request | only through the JetStream and KV modules; no bare `nc.publish` in `src` | adapters at `internal/nats.ts:241,247,273`, `lanes.ts:154,224,250`, `pump.ts:125,150,164`, `chaos.ts:203,226` |
| `$JS.API.>` stream management | **yes**, via `jetstreamManager()` | `lanes.ts`, `pump.ts`, `chaos.ts`, `nats.ts` |
| `$JS.API.*` as ACL strings | **yes** — the permission projection writes them as grants, never as requests | `internal/permissions.ts:118,120,135-137` |
| `$JS.API.DIRECT.GET` | **yes**, via KV direct reads | `permissions.ts:136`; proxy-observed at `test/HoldProxy.ts:52` |
| KV as a JetStream view (`Kvm`) | **yes** — anchors, cells, registers | `internal/anchors.ts:9`, `cells.ts:8`, `registers.ts:8` |
| Object Store | **declared dependency, imported by no `src` file** | `package.json:78`; only `test/ObjectStoreSemantics.test.ts:6` |
| Ordered consumers | one live use (the commons subscribe path) | `internal/nats.ts` |
| Durable pull consumers | the fold pump | `internal/pump.ts` |
| `$JS.EVENT.ADVISORY.*` | **Go only** — the standing shape gate | `go/journal/journal.go:124-159` |
| Go client surface | `nats.Connect` at fourteen live sites; `InProcessServer` at seven; `Name` at most | see `go/substrate/harness_test.go:191-195`, `proto/go/protod/protod.go:197-202` |

Two asymmetries are worth the grill's attention. First, **`$JS.EVENT`
advisories are a standing-invariant mechanism the Go side uses and the TS
side does not** — DEV-781 proposes reconnect as the re-assertion point,
and the advisory is a strictly earlier one (a live `UPDATE` fires it
without any connection event). Second, **`nats.Connect` in Go is as
unruled as `connect` in TypeScript**: across both modules the only
reconnect-adjacent option ever passed is a single `nats.NoReconnect()` in
a recovery probe (`go/substrate/recovery_test.go:268`), and
`go/cmd/registerwall/main.go:20` connects with a bare URL from `argv` and
no options at all.

### 4.3 Face (c) — inbound / node→estate

The face that barely exists yet, and the one the daemon *enables* rather
than internalises.

| Surface | At the pins | What it would carry | Daemon column |
|---|---|---|---|
| Leafnode listener | **not enabled** (§3.2) | a per-node NATS server bridging subject interest into a hub, with its own JetStream domain and mirrors of hub streams, functioning while offline (server-as-abstraction §5.1) | **enabled** — a leaf is `Options` with `LeafNode` filled in, and only a server can be one |
| Leafnode remotes | **not enabled** | the outbound half of the same | **enabled** |
| JetStream mirrors | **refused by gate** on authority journals — `badShapeReason` rejects mirror/source config (`go/journal/journal.go` shape gate; rationale in the agent-protocol research's *deliberately refused* list) | replicated ontology at origin sequence numbers, verifiable by the existing verify-on-read; lag manifests as *absence*, never wrong data | **enabled**, and it bifurcates the gate — authority journals import nothing; replica journals are mirrors verified by read. That bifurcation is ADR-scale and is **not** proposed here |
| The shuttle's plane | chartered, unbuilt (DEV-745) | harness events in, fabric acts out, per the agent plane's mapping table (§8.3); the daemon is itself a node — credentialed, `(head, writ)`, admitted by attest | client-plane: the shuttle is a **privileged client** in exactly the ruled sense, and it is the estate's first long-lived one |
| WebSocket / MQTT | **not enabled** | browser and device clients | **deliberately not enabled** — no estate need, and each is a listener with its own auth surface |
| Gateway / cluster | **not enabled** | superclusters, replication | **deliberately not enabled at this stage**; note that the durability posture below is a *single-server* posture and says so |

**What is deliberately not enabled, and why it is a list rather than an
omission.** WebSocket, MQTT, gateway, cluster, HTTPS monitoring and the
profiling port are all off, at every pin, in both Go modules and in the TS
harness — verified by grep across both modules with zero hits for
`Websocket`, `MQTT`, `LeafNode`, `Cluster:`, `Gateway`, `HTTPPort`,
`HTTPSPort`, `TrustedKeys`, `NoAuthUser` and `TLS`. Today that is true by
nobody having typed them. SP-8 proposes making it true by refusal.

One correction the grep alone would have gotten wrong, recorded because
it is exactly the class of error a channel census invites: a keyword
search for `Accounts:` returns zero, yet `proto/go/protod` **is
multi-account** — it registers one account per client connection
programmatically (`proto/go/protod/auth.go:70`), exports two service
subjects from the global account (`:33`), and imports them per account
(`:76`). Channels are configured in code as often as in config.

---

## 5. The session as a digest — the ground-truth model

> The operator's frame: *you connected — that's a DIGEST. It's got your
> configuration ID, IP. That's ground truth.*

This section is written in the estate's register: **meaning first,
carriage second.** NATS's CONNECT/INFO exchange and its `$SYS` events are
the carriage. The session fact is the meaning. The test of whether the
distinction is real is the posture test: the same fact must be mintable
by a privileged client today and by the daemon tomorrow, with different
carriage and identical bytes.

### 5.1 Three senses of "session", separated before anything is built

| Sense | Where | What it names | Carries a connection? |
|---|---|---|---|
| Read session | `planes/Session.ts:87-102` | a writ, a view digest, a partition, a position over deployed folds | no — it is transport-free by construction |
| Protocol session | agent plane §9.2 | a journal keyed by the digest of its canonical open event; fills idempotent per `(value, seat)`; close atomic at the declared authority | no — it rides venues unchanged |
| **Substrate session** | this record | one connection's identity, folded at establishment | **it is the connection** |

They compose in one direction only: a protocol session's moves travel
over a substrate session; a read session names neither. **A substrate
session is never a read session's identity** — that would smuggle
carriage into meaning and break the read plane's transport-freedom, which
is the property that lets a read session resume anywhere.

### 5.2 The session fact: what is folded, and from where

At establishment the estate holds three groups of data. All of the first
group was measured verbatim from a live connection at the pins.

**Group 1 — what the substrate declares about itself and about you
(carriage: the `INFO` block).** Measured fields, complete:

```
server_id       NDWIHWMLKQJOZYTCEYMM6GLXPEV65FWVAGUTBB7G4GQXCMZCMWZD5B6V
server_name     (identical to server_id — the estate never sets ServerName)
version         2.14.4
proto           1
go              go1.26.5
host            127.0.0.1
port            62433
headers         true
max_payload     1048576
jetstream       true
client_id       5
client_ip       127.0.0.1
connect_info    true
remote_account  $G
api_lvl         4
xkey            XBYJ4PZQ5YC5CJ7D7QZPYJLIHS4GQ3R7AQWINRBNK42NVZMR5ATUOGW5
```

Type source: `@nats-io/nats-core@3.4.0` `lib/core.d.ts:92-160`.

**Group 2 — what the process declares about itself (carriage: the
`CONNECT` protocol line).** Today: `name`, and with a credential the
authenticator and `inboxPrefix` (`internal/transport.ts:196-206`).
Everything else is a pinned default (§7.1). **The declared options are
data**, which is DEV-781's operator requirement stated as a value rather
than as a config file: *a default the estate never chose is not a
decision*.

**Group 3 — what the estate knows that the substrate cannot.** The writ
digest the connection acts under; which service layer opened it; the
declared shape assertions it made at open.

**The proposal (SP-1).** Fold groups 1–3 into one canonical value at the
moment `connect` resolves and take its digest as the session's name.
Three properties follow, and they are the reason to do it this way rather
than logging the same fields:

1. **Derivability.** Two parties holding the same three groups compute
   the same digest with zero I/O — the same property the agent plane's
   session key already has (§9.2). A session digest can therefore be
   *cited* by a party that never saw the connection.
2. **Immutability with honest scope.** `server_id`, `client_id` and
   `client_ip` are fixed for the life of one TCP connection and change on
   reconnect. So **a reconnect mints a NEW session fact that names its
   predecessor** — which is the same predecessor-pinning discipline the
   agent plane's chain already uses, and it makes "the connection came
   back as a different connection" a *fact* rather than an invisible
   internal event.
3. **Posture neutrality.** A privileged client mints it from the `INFO`
   block; the daemon mints it from `server.Options` plus the client's
   registration, in-process, with no `INFO` block involved. Same fields,
   same bytes, same digest. The carriage differs; the meaning does not.

**What must NOT go in.** No wall-clock establishment time as an identity
field — a claimed time is observation data, carried, never identifying
(agent plane §11.4). No `rtt`, no `stats()` — those are frontier
readings, not identity. No `xkey` if it is regenerated per connection
without meaning; it is listed above because it was measured, and whether
it belongs in the fold is a grill question, not a drafting one.

### 5.3 Heartbeat: a periodic declared fact, never a clock read

The commission's second clause — *"then the periodic health heartbeat"* —
lands directly on the ratified tick pattern (agent plane §11.2), and the
estate should not build a second mechanism.

```
{ session:  <session fact digest>,
  schedule: <schedule declaration digest>,
  firing:   <n>,                 // the n-th occurrence per Cron.next
  claimed:  <ISO time string>,   // observation data, nothing more
  health:   <declared health value> }
```

Four properties, each inherited rather than invented:

- **It is evidence, not a clock.** The fold never reads time; a seat holds
  the schedule and emits. Triggers react to the fact's *existence*.
- **It is duplicate-safe.** `(session, schedule, firing)` names the
  occurrence, so two racing emitters produce byte-identical bodies —
  absorbed on the monotone plane.
- **It is replay-deterministic.** A replayed history contains the same
  heartbeats at the same positions, so re-running any fold over them
  consults no clock.
- **Absence is honest.** A seat that dies emits nothing and no claim
  breaks. "How stale is this session" is head-minus-anchor arithmetic on
  the heartbeat lane — the same honest-staleness computation the frontier
  view already uses, with no clock on either side.

**The health value is where the substrate's own signals enter as
meaning.** Under the privileged-client posture the honest content is thin
— what the client knows: last status event, pending pings, connection
open or not. `/healthz` is *not* available to a privileged client at the
pins (§3.4), so a heartbeat that claims server health today would be
claiming what it cannot see. Under the daemon posture the same field
carries `s.Healthz()` directly. **The heartbeat's schema must therefore
declare where its health value came from**, or the two postures produce
the same bytes for different claims — which is the one way this design
could quietly lie. SP-2 carries that.

### 5.4 Presence: a derived fold, not a query

*"who's connected, what's your ID"* — the commission's third clause.

The instinct to answer it with `$SYS` is the carriage instinct, and §3.5
shows it is not even available. The meaning answer:

> **Presence is a fold over session facts.** Session-established and
> session-ended facts land on an evidence lane; the presence view is the
> declared reduction over that lane. "Who is connected" is a *read at an
> anchor*, with head-minus-anchor as its honest staleness, and it needs
> no clock, no `$SYS` credential, and no HTTP port.

Five consequences worth stating because each is a decision this
construction makes for you:

1. **Presence is per-estate, not per-server.** A fold over session facts
   spans every server a session was established against, which `$SYS`
   never does without a supercluster.
2. **Presence survives the substrate.** `/connz` is gone the moment the
   server restarts; the session lane is not.
3. **Presence is attributable.** A session fact carries a writ; a `connz`
   row carries a name string anyone can claim. (The agent plane's standing
   bound applies unchanged: `holder` strings are carried verbatim and are
   unauthenticated — a session fact is *connection-attributed mechanics*,
   not an evidentiary "who", until the estate's attribution decision
   lands.)
4. **Presence is lossy in exactly one direction, and says so.** A process
   killed with signal 9 emits no session-ended fact. The fold sees a
   session whose heartbeat lane stopped advancing — which is *absence*,
   the honest reading, and is refusable at a fence. It never sees a false
   "connected". `/connz` has the dual failure: it shows a connection the
   server has not yet reaped.
5. **`$SYS` is not thereby banned — it is demoted to chatter.** If a
   system credential is ever minted, `$SYS.ACCOUNT.*.CONNECT` becomes an
   *accelerant*: it can tell the fold to look sooner. It can never be the
   authority, because it is not a fact the estate declared. That is the
   agent-protocol research's promotion rule applied without modification:
   *chatter accelerates; facts decide.*

### 5.5 Composition with DEV-826: states are the machine, sessions are what its transitions emit

The operator's requirement on DEV-826 is a formally modelled state
machine whose states are *derived from the pinned client's actual
status-event vocabulary, never invented*. The vocabulary, transcribed
from the pin (`@nats-io/nats-core@3.4.0` `lib/core.d.ts:1-43`) — eleven
event types, with their payloads:

| Event `type` | Payload | Meaning at the pin |
|---|---|---|
| `disconnect` | `{server}` | the socket to that server dropped |
| `reconnecting` | `{}` | an attempt is starting |
| `reconnect` | `{server}` | attached again, possibly to a different server |
| `update` | `{added?, deleted?}` | the gossiped cluster list changed |
| `ldm` | `{server}` | that server entered lame-duck mode and is asking clients to move |
| `error` | `{error}` | the server sent a protocol-level error |
| `ping` | `{pendingPings}` | a client-initiated ping went out |
| `staleConnection` | `{}` | `maxPingOut` exceeded; the client's own verdict |
| `forceReconnect` | `{}` | the application called `reconnect()` |
| `slowConsumer` | `{sub, pending}` | a subscription fell behind its budget |
| `close` | `{}` | terminal — the connection will not come back |

**The composition rule this record proposes:** the machine's *states* are
the machine; the *facts* are what its transitions emit. Specifically —

- The machine is over the connection, and its state set is drawn from
  that vocabulary, not from a hand-written union. Note that four of the
  eleven (`ping`, `slowConsumer`, `update`, `error`) are **not** state
  transitions at all: they are readings that occur *within* a state.
  Modelling them as states would be the invention the operator's ruling
  forbids; modelling them as facts emitted while in a state is faithful.
- `reconnect` mints a **new session fact** naming the previous session's
  digest as predecessor (§5.2 property 2) — because `client_id` and
  possibly `server_id` changed, so the old fact is no longer true.
- `close` emits a **session-ended fact** citing the session digest and
  carrying the terminal reason. Measured, the pin resolves `nc.closed()`
  with the cause (`ConnectionError: connection refused`), so the reason
  is available, not inferred.
- `ldm` is the one transition that carries an *instruction*, and DEV-826
  correctly assigns lame-duck handling to DEV-745 — the shuttle is the
  estate's first process long-lived enough to honour it. The session fact
  is what makes the hand-off cheap: the shuttle's supervisor reacts to a
  lame-duck fact on the lane, not to a callback nobody else can see.
- **Drain and close are different transitions and must not be modelled as
  one.** Measured at the pin: `drain()` exists, and a drained connection
  reports `isClosed() === true` afterwards — so the *end state* is shared
  and the *path* is not. DEV-826's third deliverable already insists the
  two teardown semantics in the tree stay distinguishable (harness
  SIGTERM = orderly; chaos signal 9 = deliberate); the state machine is
  where that distinction becomes checkable rather than remembered.

Two facts the machine must be built to survive, both measured:

1. **The default machine has a terminal absorbing state reachable in 20.7
   seconds** (§1.7). Any state machine over the current defaults must
   model `close`-after-exhaustion as reachable, not exceptional.
2. **Nothing currently observes any transition.** `status()` is consumed
   nowhere in `src`. So DEV-781's spec comment is right that "re-assert on
   reconnect" is two builds; this record adds that the second build — the
   status pump — is also the *emitter* of every fact in §5, which is an
   argument for building it once as a fact source rather than twice as a
   callback.

### 5.6 Composition with DEV-781: the connect options ARE the session's declared half

DEV-781's operator requirement — connect options become declared data —
is not a neighbouring concern. **The declared options are group 2 of the
session fact.** That has a consequence worth the grill's time: if the
options are declared data with a digest, then *the session fact's digest
covers the options the process connected under*, and a process that
connects with different options mints a demonstrably different session.
"We changed the reconnect bound" stops being a deployment fact nobody can
see and becomes a difference in the truth plane.

It also fixes DEV-781's assertion-ordering problem from the other side.
The spec comment notes that KV buckets are asserted at service
construction while lane streams are asserted lazily and memoised, so
re-assertion means different things per carrier, and an empty memo
re-asserts nothing. If the session fact records *which shapes were
asserted at open*, then re-assertion after a reconnect has a declared
target: the shapes this session claimed. An empty set is then honestly
empty rather than ambiguously empty.

---

## 6. What the future daemon changes, in one table

Kept short deliberately: the daemon is the operator's act, and this
record's job is to make the boundary legible, not to argue for it.

| Concern | Privileged client (today, ruled) | Daemon (later, operator's act) | Does the session fact change? |
|---|---|---|---|
| Server options | flags on a stock binary | a `server.Options` value the daemon owns | no — group 2 is the *client's* declaration either way |
| Readiness | ports file, or `/healthz` once `-m` is added | `ReadyForConnections` in-process | no |
| Health in the heartbeat | what the client can see | `s.Healthz()` directly | **the value changes; the schema must say which source produced it** (SP-2) |
| `$SYS` | unreachable without a minted credential | held natively | no — `$SYS` stays chatter in both (§5.4 consequence 5) |
| Monitoring | not listening | `s.Varz()` as a Go call | no |
| Presence | fold over session facts | fold over session facts | **no — this is the point** |
| Leafnodes / mirrors | impossible (client cannot be a server) | possible, and gate-bifurcating | no |
| Lifecycle ownership | the process owns a connection | the process owns a server | the session fact gains a *server-owned* variant with the same fields |

---

## 7. First-class config: the options that deserve declared-data status

Tonight's audit line, restated as measured fact: **every connect option
the estate runs under is a client default nobody in this estate has
read.** The tables below name each option, its pinned default read from
the pin's own source, and what this record proposes the estate pin it to.
Every "estate should pin" cell is a **PROPOSED** position feeding SP-5 and
SP-7; none is ruled here.

### 7.1 Client connect options — `@nats-io/nats-core@3.4.0`

Defaults from `lib/options.js:29-52`; documented semantics from
`lib/core.d.ts`. The estate sets **only** `servers`, `name`, and (with a
credential) `authenticator` and `inboxPrefix` — `internal/transport.ts:196-206`.

| Option | Pinned default | Proposed pin | Why |
|---|---|---|---|
| `reconnect` | `true` | `true`, declared | Lawful under recover-by-read: a pump re-attaches at `floor + 1` and a session recomputes from its anchor. Declaring it makes the recovery posture explicit. |
| `maxReconnectAttempts` | **`10`** | **`-1` (never give up)** — the row with a correctness stake | Measured: at the default the connection **permanently closes after 20 669 ms** of substrate absence, and nothing observes it. A bounded reconnect is an availability policy; the estate never wrote one. |
| `reconnectTimeWait` | `2000` ms | declare; `2000` defensible | Sets the give-up horizon jointly with the row above. |
| `reconnectJitter` | `100` ms | `100`, declared | Thundering-herd control once more than one process exists. |
| `reconnectJitterTLS` | `1000` ms | declare; no TLS today | Dead until TLS lands; declaring it costs nothing and stops a silent surprise. |
| `pingInterval` | `120000` ms (2 min) | declare; note the server's own `ping_interval` is also 120 s (measured `varz.ping_interval = 120000000000` ns) | Client and server ping independently; the two intervals being equal by coincidence is worth pinning as intent. |
| `maxPingOut` | `2` | `2`, declared | With `pingInterval`, this fixes stale-connection detection at ~4 minutes. That number should be a decision. |
| `timeout` (connect handshake) | `20000` ms | declare; likely lower | Twenty seconds of handshake with no refusal is a long silence for a scope acquire. |
| `waitOnFirstConnect` | `false` | **decide explicitly** | At `false`, a process starting before its substrate fails immediately rather than waiting. That is a deployment-ordering policy. |
| `noRandomize` | `false` (randomisation ON) | `true` while single-server | Randomisation is meaningless with one server and becomes a surprise the day a list appears. |
| `ignoreClusterUpdates` | `false` | **`true`** while unclustered | The client currently accepts gossiped server lists from a server that has none. Refusing them is the honest single-server posture. |
| `ignoreAuthErrorAbort` | `false` | `false`, declared | The default aborts reconnect after two identical auth errors — correct, and worth naming so it is not mistaken for the reconnect bound. |
| `noEcho` | `false` | declare | Affects whether a connection sees its own publishes; matters the moment one connection both emits and folds. |
| `inboxPrefix` | unset | set **always**, not only with a credential | Today it rides in only with a credential; the permission projection already derives ACLs from it (`permissions.ts:112-175`), so a credential-free connection has an ACL-invisible inbox. |
| `name` | unset | **already set, unconditionally** (`transport.ts:198`) — keep | This is the one option the estate already got right, and it is what made §3.3 measurable. |
| `debug` / `verbose` / `pedantic` | `false` | `false`, declared | Vendor says they cost server performance; naming them closes the question. |

**One asymmetry to close in the same act:** the Go side is equally
unruled — the only reconnect-adjacent option anywhere in `go/` or
`proto/go/` is one `nats.NoReconnect()` in a recovery probe, and
`go/cmd/registerwall/main.go:20` connects with a bare URL and no options
at all. Whatever the grill rules for the TS spine should be ruled for
`nats.go` in the same row, or the two clients drift.

### 7.2 Server options — what the estate runs on today

Measured from `/varz` on a server started with the harness's exact flags
plus `-m`.

| Option | Measured default at the pins | Proposed | Why |
|---|---|---|---|
| `jetstream.sync_interval` | **120 s** | **decide: `sync_always` or accept with a stated residual** | Acked writes reach kernel buffers; the failsafe sync is every two minutes. Kill-9 safe; pull-the-plug not. Confirms the vendor corpus first-hand (05 §01:21:01). Single-server has exactly one remedy and it lives in *server* config — outside every gate the estate owns. |
| `jetstream.strict` | `true` | keep, declared | Measured on; nothing sets it; it should not be an accident. |
| `max_payload` | `1048576` | already load-bearing — the payload-budget gate reads `info.max_payload` (`lanes.ts:222`) | The one server option the estate already reads. |
| `max_pending` | `67108864` (64 MB/connection) | declare | The vendor's dominant failure mode is a **loud disconnect** at this budget (05 §01:23:44), and the prescribed fix is byte-limited fetch. |
| `ping_interval` / `ping_max` | `120 s` / `2` | declare alongside the client's | Two independent liveness mechanisms with the same numbers by coincidence. |
| `write_deadline` | `10 s` | declare | Governs how long a slow consumer stalls the server before eviction. |
| `max_connections` | `65536` | declare | Irrelevant at five, and exactly the kind of number that stops being irrelevant silently. |
| `auth_timeout` / `tls_timeout` | `2 s` / `2 s` | declare | |
| `max_control_line` | `4096` | declare | Bounds subject + header length; KV key space is subject space. |
| `ServerName` | **unset — equals the generated `server_id`** (measured) | **set it** | The session fact carries `server_name`; an unset name makes it a NUID that changes every restart, which loses the one human-readable coordinate the fact would otherwise carry. |
| `NoLog` | `true` at five of six Go harness sites, `false` at one (`go/journal/journal_test.go:35-41`) and in `protod` | **decide** | The vendor's IPQ overflow drops messages **silently, with only a server log line** (05 §00:44:43). Running `NoLog: true` suppresses the only signal. This is DEV-827's silent-drop class, and it is a server-option decision, not a client one. |
| `HTTPPort` | **not set** | **decide** — DEV-826's readiness probe depends on it | §3.4. |
| `DontListen` | `true` at every Go test harness; **not available to the TS harness** (the TS client needs a socket) | keep the split, and name it | The Go side's best hermeticity is structurally unavailable to TypeScript, which is the server-as-abstraction research's constraint showing up as a config asymmetry. |
| Websocket / MQTT / LeafNode / Cluster / Gateway | all unset (§3.2) | **refuse, don't merely omit** | SP-8. |

---

## 8. Honest bounds

1. **The measurements are single-host, single-server, unclustered, and
   from tonight.** Everything in §3 was measured on one macOS box against
   one freshly-built binary with an empty store. Nothing here is a
   capacity claim, and the reconnect timing (20 669 ms) is one sample on
   an idle machine — the *shape* (ten attempts then terminal close) is
   the claim; the milliseconds are illustrative. The script producing
   them lives in the drafting worktree and is deliberately not committed,
   so the numbers are **reproducible by re-derivation, not by replay**.
   If the grill wants them walled, that is a build, not a re-read.
2. **`/healthz` was measured on a healthy server only.** Every variant
   returned `ok`. The interesting behaviour — a frozen stream reporting
   unhealthy — was not induced. **UNVERIFIED** at this version by
   first-hand measurement; it is carried on the jepsen-remediation
   addendum and the vendor's release notes.
3. **The `$SYS` unreachability result is bounded to the default
   configuration.** It says a connection in `$G` with no credential
   cannot reach `$SYS`. It does not say a system-account credential is
   hard to mint, and it does not measure what such a credential would
   cost in blast radius. SP-3 asks for the ruling, not the measurement.
4. **Group 3 of the session fact is a sketch.** Groups 1 and 2 are
   measured and enumerated; the writ digest and the asserted-shape set
   are described in prose and have no schema. A session fact schema is a
   build, and SP-1 is what would authorise it.
5. **This record proposes no wrapper machinery and prices no daemon.**
   Per the 2026-08-19 posture, every daemon column above is a *marking*,
   not a proposal. Whether §6's boundary is drawn in the right place is a
   question for the roadmap marker, not for this sheet.
6. **The eleven-state vocabulary is the client's, not the substrate's.**
   It is what the pinned JavaScript client chooses to surface. `nats.go`
   at v1.53.1 surfaces a different set (handlers rather than a status
   stream). A machine modelled on the TypeScript vocabulary is a machine
   over *that client*, and the Go side will need its own transcription or
   an explicit refinement map. That is a real cost DEV-826 should carry
   rather than discover.
7. **No claim is made that five connections is the right number.** It is
   the measured number. SP-9 asks whether it should be one.

---

## 9. The decision sheet

House style: one decision per item; recommended option first; alternatives
priced; reversal cost stated. **All SP items are PROPOSED. This record
ratifies nothing.**

- **SP-1 — the substrate session as a declared fact.** Recommended:
  **adopt** — at establishment, fold the substrate's `INFO` declaration,
  the process's declared connect options, and the estate's writ and
  asserted-shape set into one canonical value; its digest is the
  session's name; reconnection mints a successor naming its predecessor;
  disconnection and close are facts citing the digest. Name it
  **substrate session** to keep it distinct from the read session
  (`planes/Session.ts`) and the protocol session (agent plane §9.2) —
  §5.1. Alternatives priced: **(a) log the same fields** — costs the
  derivability property (§5.2.1), which is the only reason a third party
  can cite a session it never saw, and returns presence to a query;
  **(b) use the client id as the session identity** — refused: `client_id`
  is unique per server incarnation only, is reused after restart, and
  carries none of the declared half, so two materially different
  connections can share one; **(c) defer until the daemon** — costs the
  posture-neutrality demonstration, which is cheapest to prove while both
  postures are hypothetical. Reversal: the fact is additive on an
  evidence lane; retiring it deletes a lane and strands no identity,
  because nothing else keys on it.

- **SP-2 — the heartbeat is a tick fact, and it declares its health
  source.** Recommended: **adopt the ratified tick pattern unchanged**
  (agent plane §11.2) with `session` added to the occurrence key, and
  **require the health value to name its provenance** (client-observed vs
  server-reported), so the privileged-client and daemon postures cannot
  emit identical bytes for non-identical claims. Alternatives priced:
  **(a) a heartbeat that reads a clock** — refused by the fold-has-no-clock
  premise; it would put a clock inside meaning and break replay
  determinism; **(b) a heartbeat carrying `/healthz`** — not available to a
  privileged client at the pins (§3.4), so it would be a claim about
  something unseen; **(c) no provenance field** — the one way this design
  lies quietly, per §5.3. Reversal: a lane and a schedule declaration;
  deleting both returns liveness to absence-reading, which is where it is
  today.

- **SP-3 — `$SYS` is chatter, and whether to mint a system credential is
  the operator's.** Recommended: **rule `$SYS` non-authoritative
  permanently** — presence and liveness derive from session facts, and
  `$SYS` events, if ever reachable, may only accelerate (the promotion
  rule, unmodified). Separately, **ask the operator** whether a
  system-account credential is minted at all; this record does not
  propose one. Alternatives priced: **(a) presence from `$SYS`** —
  unavailable at the pins (measured, §3.5), and even when available it is
  per-server, dies with the server, and is unattributable; **(b) presence
  from `/connz`** — same three defects plus an HTTP port that is not
  listening; **(c) leave the question open** — costs DEV-826 and DEV-781 a
  shared premise, since both need to know whether a status pump may ask
  the server anything. Reversal: a ruling sentence; nothing is built on
  it either way. **Rider:** the Go side's `$JS.EVENT.ADVISORY` gate
  (`go/journal/journal.go:124-159`) is the *lawful* form of "listen to
  what the server says" — it drives a refusal, never an authority — and
  is the model the TypeScript side should copy for DEV-781 rather than
  waiting for a reconnect.

- **SP-4 — the connection state machine's state set is transcribed, not
  invented.** Recommended: **adopt the pin's eleven event types as the
  vocabulary** (§5.5), with the explicit split that four of them
  (`ping`, `slowConsumer`, `update`, `error`) are readings *within* a
  state rather than states, and that `drain` and `close` share an end
  state by different paths. Alternatives priced: **(a) a hand-designed
  state union** — precisely what the operator's ruling forbids, and it
  drifts the first time the client adds an event; **(b) model both
  clients' vocabularies as one machine now** — the Go client surfaces
  handlers, not a status stream, so a unified machine would be a
  refinement map nobody has built (bound 6); do TypeScript first and
  carry the Go transcription as named debt. Reversal: the transcription
  is a table; a later Lean model and corpus rows extend it rather than
  replacing it.

- **SP-5 — connect options become declared data, and the reconnect bound
  is the row with a correctness stake.** Recommended: **adopt §7.1** —
  pin every option with its pinned default named, and set
  `maxReconnectAttempts` to **`-1`**. Evidence: measured permanent close
  at **20 669 ms** under the estate's own option set, unobserved because
  `status()` is consumed nowhere. Alternatives priced: **(a) keep the
  default and observe it** — a status pump that watches a connection die
  can report, but cannot revive; the recover-by-read posture makes an
  unbounded reconnect free, so bounding it buys nothing and costs the
  process; **(b) bound it high (say 1000)** — a magic number defending
  against nothing specific, and it still has a cliff; **(c) declare the
  options without changing any value** — legitimate and much cheaper, and
  it still converts "we kept the default" from an omission into a
  decision — but it leaves the measured cliff in place. Reversal: the
  options are data; changing a pin is an edit to a declared value and
  strands nothing. **Rider:** rule the Go client in the same act (§7.1
  closing note) or the two drift.

- **SP-6 — readiness needs a door, and at the pins there isn't one.**
  Recommended: **enable the monitoring port at the harness pin
  (`-m`) and probe `/healthz?js-enabled-only=true`** before the first
  substrate call, replacing ports-file-appearance as the readiness
  signal. This is a change to face (a) and therefore a config decision
  the operator owns. Alternatives priced: **(a) probe `$JS.API.INFO` over
  NATS instead** — needs no new listener and no new port, and it does
  test the thing that actually races (JetStream availability), but it is
  not the vendor's readiness contract and will not report the frozen-writer
  condition the 2.14 line added; **(b) keep the ports file and widen the
  timeout further** — treats a symptom the current sixty-second bound
  already treats, and leaves the wedged-stream signal unread forever;
  **(c) wait for the daemon**, which reads `ReadyForConnections`
  in-process and needs no port — correct eventually, and it leaves every
  suite racing until then. Reversal: one flag in the harness and one
  probe; removing both returns readiness to the ports file. **Note for
  DEV-826:** its deliverable 1 is not buildable as written until this row
  or alternative (a) is ruled.

- **SP-7 — the server options the estate depends on become declared data
  too.** Recommended: **adopt §7.2**, with three rows called out as
  genuine choices rather than transcriptions: **sync mode** (accept the
  measured 120 s with a stated power-loss residual, or set
  `sync_always` and pay the write cost — the single-server remedy lives
  in server config, outside every gate the estate owns); **`NoLog`**
  (running it `true` suppresses the only signal for the vendor's silent
  IPQ drop class, 05 §00:44:43 — DEV-827's premise); and **`ServerName`**
  (unset today, so the session fact's `server_name` is a NUID that
  changes every restart). Alternatives priced: **(a) client options only**
  — leaves the durability and observability decisions unmade while
  declaring the cheap half; **(b) wait for the daemon to own server
  options** — correct as sequencing, wrong as a reason to leave the
  current posture's defaults unread, since the harness runs them today.
  Reversal: declared data; each is one field.

- **SP-8 — the closed channel set becomes a refusal, not an omission.**
  Recommended: **adopt** — WebSocket, MQTT, leafnode, cluster, gateway,
  HTTPS monitoring and the profiling port are declared closed at the
  pins, and a server option enabling any of them is refused by the
  substrate gate with a taught repair. §3.2 is the inventory the refusal
  would check. Alternatives priced: **(a) leave it to nobody typing them**
  — the current state, and it is exactly the class the vendor corpus's
  `persist-mode-async` hazard belongs to: a creation-time flag that
  passes both existing shape gates and is invisible to verify-on-read;
  **(b) refuse only the listeners with auth surfaces** — a shorter list
  that still needs the same machinery, so the saving is illusory.
  Reversal: a list and a gate clause; deleting both returns the estate to
  omission.

- **SP-9 — one connection per service layer, measured at five.**
  Recommended: **keep the current shape and declare it**, because each
  layer's connection is scope-owned and dies with its layer, which is
  what makes teardown correct today. Alternatives priced: **(a) one
  connection per process, shared** — fewer sockets, one named client, and
  a single point whose death takes every plane with it; it also makes
  per-layer credentials (and therefore per-layer ACLs, which
  `permissions.ts` already derives) impossible; **(b) leave it
  undeclared** — the current state, and it means the session-fact count
  per process is an accident rather than a decision. Reversal: the
  connection acquire is one function (`transport.ts:186-211`); collapsing
  or fanning out is a change at one site.

- **SP-10 — confirmation row: the daemon boundary is the operator's, and
  this sheet does not price it.** Pinned as the 2026-08-19 posture ruling
  and tracked as a roadmap marker (DEV-829). Cited here because §4's
  daemon column and §6 are applications of it. **Ask of the grill:
  confirm that nothing in this record moves it.** No row above proposes
  wrapper machinery, and §5's model is written to be posture-neutral by
  construction.

---

## 10. Glossary additions

| Term | Meaning |
|---|---|
| substrate session | one connection's identity, folded at establishment into a canonical value whose digest names it (§5.2) — distinct from the read session (`planes/Session.ts`) and the protocol session (agent plane §9.2) |
| the session fact | the declared value carrying the substrate's `INFO` declaration, the process's declared connect options, and the estate's writ and asserted shapes (§5.2) |
| session predecessor | the digest a reconnect-minted session names, making "the connection came back as a different connection" a fact rather than an internal event (§5.2) |
| the channel inventory | the census of every listener a server version can hold against the ones a deployment opens (§3.2) |
| the three faces | owner→server, client→server, inbound/node→estate — the axis along which the daemon boundary runs (§4) |
| the daemon column | the per-row marking of what a future daemon internalises, what stays client-plane forever, and what it merely enables (§4, §6) |
| privileged client | the ruled 2026-08-19 posture: the estate speaks to a stock server through the client API under declared credentials, owning no server |
| presence as a fold | "who is connected" answered as a declared reduction over session facts read at an anchor, never as a query against `$SYS` or `/connz` (§5.4) |
| the substrate heartbeat | the tick pattern with the session digest in its occurrence key and a provenance-declaring health value (§5.3) |

---

## 11. Sources

**Read in full this session:** the four research records and the agent
plane design record named at the head; `packages/plait/test/NatsHarness.ts`
(216 lines); `packages/plait/src/internal/transport.ts` (229 lines);
`packages/plait/src/internal/sessions.ts`; the board bodies and comment
threads of DEV-745, DEV-781, DEV-782, DEV-826, DEV-827.

**Read at cited lines in the pinned vendor trees:**
`nats-server` v2.14.4 — `server/events.go:40-78` (the `$SYS` subject
constants), `server/server.go:3029-3042` and `:3133-3161` (the monitoring
routes), `server/monitor.go:2994-3005` (the `/healthz` option set) and
`:4234-4239` (`/raftz`'s 404), `server/client.go:45-66` (the seven client
kinds), `server/stream.go:3513-3514` (management is API-based even in
single-server mode, quoted via the server-as-abstraction research).
`@nats-io/nats-core` 3.4.0 — `lib/core.d.ts:1-43` (the eleven status
types), `:92-160` (`ServerInfo`), the `ConnectionOptions` declaration;
`lib/options.js:29-52` (the defaults).

**Measured first-hand this session**, with a scratch script held in the
drafting worktree and not committed: the harness-exact listener census
(§3.2), the five-connection estate process (§3.3), the monitoring
endpoint sweep and `/healthz` variants (§3.4), the `$SYS` reachability
probe (§3.5), the `INFO` block (§5.2), and the reconnect-exhaustion trace
(§1.7, §7.1).
