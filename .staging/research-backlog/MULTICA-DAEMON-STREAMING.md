# Multica daemon streaming — recovered RFC, failure semantics, and Foldlab lessons

Status: operator-directed source study, 2026-08-31. **Pre-grade, G0, not
ratified, not dispatched.** This document does not mint a Foldlab protocol or
authorize an implementation. It records what Multica does at one exact source
pin, separates code from tests and inference, and ends with ruling asks.

Source: [`multica-ai/multica` commit
`7c0e750452599ef5ead020c8c787b32c512f2cd4`](https://github.com/multica-ai/multica/tree/7c0e750452599ef5ead020c8c787b32c512f2cd4),
equal to fetched `origin/main` with a clean worktree on 2026-08-31. The commit,
tree, and primary source blobs are fixed in the
[source receipt](../../.reference/provenance/receipts/multica-daemon-streaming.json).
This is the implementation companion to
[First-class agent-streaming integrations](agent-streaming-integrations.md),
which surveys pi, MCP, ACP, AG-UI, and the estate's existing `since(n)`
direction.

## Abstract

Multica has **two different streaming systems**, and treating them as one would
erase its most useful design decision:

1. A long-lived WebSocket connects the **Multica daemon to the Multica
   server**. It carries liveness, disposable wake-up hints, configuration
   invalidations, and one task-claim RPC. It does **not** carry an agent's live
   transcript.
2. A locally spawned coding-agent process connects to the daemon over a
   provider-specific stdio protocol. A provider adapter reduces that protocol
   to a common `Messages` stream plus exactly one terminal `Result`. The daemon
   batches messages over ordinary authenticated HTTP; the server persists every
   accepted batch and, for issue- and chat-backed tasks, publishes
   browser-facing real-time events.

The strongest part is the boundary between **a hint** and **truth**. A task
wake-up or pending-work frame may be lost, duplicated, delayed, or reordered;
the receiver merely re-reads authoritative state. The task-claim RPC is more
dangerous because it may commit before its response is lost, so the client
distinguishes `not sent` from `sent, outcome unknown` and delays fallback. That
is a concrete, reusable lesson for Foldlab's seam-effect law.

The most important defects are equally concrete:

- a server heartbeat runs synchronously on the socket read loop with no
  connection cancellation or deadline, so a stuck irreversible dequeue can
  wedge every inbound frame;
- a WebSocket's authenticated identity has no lease or mid-connection
  revalidation;
- transcript batches are atomic but single-shot: a failed 500 ms batch is
  discarded, sequence gaps are not acknowledged, and `(task_id, seq)` is not
  unique;
- response and queue overflow policies are message-class-specific but are not
  declared in the wire schema or fully measured;
- current source documentation contains drift between declared message types
  and frames actually sent.

For Foldlab, the recommendation is **not** “copy Multica's WebSocket.” Preserve
the estate's stronger pull-and-cursor law, then borrow Multica's explicit
uncertain-outcome handling, connection generations, payload-free hints,
teardown order, and executable race cases. Refuse any design in which an
uncursored push channel becomes authority, a hand-authored second schema owns
the wire, or correctness-bearing output can disappear under a debug log.

---

## 1. Reading rules and recovered-RFC status

The words **MUST**, **SHOULD**, **MAY**, and **MUST NOT** below are RFC-style
reconstructions of behavior at the pinned commit. They do not claim Multica has
published a stable protocol or that a later commit must remain compatible.

Evidence labels:

- **CODE** — directly implemented at the pin.
- **TEST-RUN** — exercised successfully during this study.
- **TEST-SOURCE** — encoded in a source test but not independently exercised
  by that particular citation.
- **INFERENCE** — a consequence of control flow or missing machinery, not an
  upstream assertion.
- **GAP** — contradiction, unhandled outcome, or absent falsifier found by this
  study.
- **FOLDLAB ASK** — pre-grade translation awaiting an operator ruling.

All external citations are commit-qualified GitHub permalinks. Local Foldlab
citations name the estate file and exact lines. No claim here is above G0.

## 2. System boundary: the socket is not the agent stream

The common adapter interface returns a `Session` with a message channel that
closes before a one-value result channel. Its internal message algebra is
`text | thinking | tool-use | tool-result | status | error | log`; its terminal
statuses are `completed | failed | aborted | timeout | cancelled`
([`agent.go:17-23`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L17-L23),
[`agent.go:136-169`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L136-L169),
[`agent.go:194-201`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L194-L201)).
The daemon drains that local channel, coalesces text and thinking, translates
tool names from hyphenated internal kinds to underscore persistence kinds, and
posts batches every 500 ms
([`daemon.go:8306-8368`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8306-L8368),
[`daemon.go:8370-8502`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8370-L8502)).

The server WebSocket, by contrast, accepts only heartbeat and RPC request
frames. The browser-facing transcript is persisted through
`POST /api/daemon/tasks/{taskId}/messages`. After the database insert, the
server republishes messages for issue- and chat-backed tasks; it deliberately
does not broadcast autopilot or quick-create task messages
([`hub.go:729-754`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L729-L754),
[`handler/daemon.go:4520-4551`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L4520-L4551),
[`handler/daemon.go:4627-4650`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L4627-L4650)).

The actual topology is therefore:

```text
provider CLI
  │ provider-specific stdio: NDJSON / JSON-RPC / ACP-like events
  ▼
agent adapter ── Session.Messages(256) + Session.Result(1)
  │
  ▼
daemon drain ── 500 ms coalescing, seq assignment, redaction
  │ authenticated HTTP POST, not daemon WS
  ▼
task_message table ── HTTP since(seq) catch-up
  └─ issue/chat tasks only: ordered realtime publication

Multica server ◀════════ daemon WebSocket control channel ════════▶ daemon
                 heartbeat, hints, invalidations, tasks.claim RPC
```

**Recovered requirement SYS-1.** A correct description MUST keep the daemon
control channel, local agent protocol, transcript persistence channel, and
browser real-time channel separate. They have different identities, buffers,
ordering, retry, and authority.

## 3. Actors and authority

| Actor or state | Authority at the pin |
|---|---|
| Agent subprocess | Produces provider events and a provider session pointer. It does not own task state. |
| Daemon process | Owns local process lifecycle, concurrency slots, runtime cache, connection generation, heartbeat freshness, transcript sequence assignment, and temporary retries. |
| Server database and queues | Own runtime registration, task claim/start/terminal state, persisted transcript rows, and pending actions. |
| Redis liveness | A 90-second renewable liveness record, ahead of a 150-second database stale sweeper; it is not task truth. |
| Redis relay | Cross-node delivery acceleration with bounded replay and per-connection deduplication; it is not a daemon mailbox. |
| Task and pending-work WebSocket hints | Latency signals only. Correctness comes from the next pull, heartbeat, or uncertainty-guarded claim. Configuration invalidations have a weaker repair story (§9.3). |

The Redis liveness and database-write timing are explicitly related: a 90 s
liveness TTL, a 60 s per-runtime database flush throttle, a 15 s daemon
heartbeat, and a 30 s batch tick leave a stated 45 s margin below the 150 s
sweeper threshold
([`handler/daemon.go:1010-1045`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L1010-L1045)).

**Recovered requirement SYS-2.** A hint MUST NOT be interpreted as state. A
receiver MAY discard, coalesce, duplicate, or receive a stale hint because its
only lawful reaction is an authoritative read, or a separately
capacity-bounded and uncertainty-guarded claim. The claim itself is not
idempotent: a sent-unknown `tasks.claim` MUST NOT be retried immediately.
Multica says the narrower loss rule directly for `pending_work`: that frame
carries no work and is safe to lose, duplicate, or ignore
([`messages.go:115-132`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L115-L132),
[`wsrpc.go:20-32`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L20-L32),
[`wsrpc.go:228-279`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L228-L279)).

## 4. Daemon WebSocket handshake and authorization

### 4.1 Endpoint and client handshake

The daemon derives the URL by changing `http→ws` or `https→wss`, appending
`/api/daemon/ws`, preserving a base query, removing any fragment, and adding a
sorted comma-separated `runtime_ids` query value. It sends bearer
authorization plus client platform, version, OS, and capability headers. The
dialer uses environment proxies and a 10 s handshake timeout
([`wakeup.go:99-143`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L99-L143),
[`wakeup.go:486-511`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L486-L511)).

The route sits behind `DaemonAuth`. The middleware accepts workspace daemon
tokens (`mdt_`), Cloud identity tokens (`mcn_`), personal access tokens
(`mul_`), and a JWT compatibility path. Missing or invalid bearer credentials
fail before upgrade
([`daemon_auth.go:92-268`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/middleware/daemon_auth.go#L92-L268)).
Every requested runtime is resolved and authorized before upgrade. A daemon
token must match both workspace and, where present, daemon ID; a user credential
must have workspace access. User-authenticated account-only sockets may name no
runtimes, but daemon-token sockets may not
([`daemon_ws.go:11-82`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon_ws.go#L11-L82)).

**Recovered requirement DWS-1.** Upgrade MUST be refused before any socket is
registered unless bearer identity is valid and every declared runtime is in
scope.

### 4.2 Frozen connection identity

On successful upgrade the server copies daemon ID, user ID, workspace IDs,
runtime IDs, version, and capabilities into a connection identity. It indexes
the same socket independently by runtime, workspace, and user; multiple sockets
under the same identity are allowed
([`hub.go:22-86`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L22-L86),
[`hub.go:184-203`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L184-L203),
[`hub.go:281-312`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L281-L312),
[`hub.go:604-646`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L604-L646)).

The origin checker accepts every `Origin`, relying on the invariant that this
route requires an explicit authorization header, accepts no cookies, and thus
cannot be opened by ordinary cross-origin browser JavaScript. The source says
this MUST be re-evaluated if cookie authentication is ever added
([`hub.go:205-219`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L205-L219)).

**GAP AUTH-1 — authority has no lease.** The credential is checked only at
upgrade. Later heartbeat and RPC handling use the copied identity, not the
bearer credential. Heartbeat rechecks current runtime/workspace ownership, but
there is no maximum socket age, token-expiry timer, revocation check, or
connection authentication epoch. **INFERENCE:** a revoked or expired token can
retain the captured authority until disconnect unless a runtime ownership check
independently fails
([`hub.go:281-312`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L281-L312),
[`hub.go:842-858`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L842-L858),
[`daemon_rpc.go:54-89`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon_rpc.go#L54-L89)).

The daemon's token lifecycle does not repair that socket gap. Startup loads the
active profile token once. When that credential is a renewable `mul_` personal
access token, the daemon makes a best-effort renewal before its first workspace
sync and then every three days, each under a 15 s bound. The server extends the
same secret in place; it does not rotate it. A 401 tells the operator to log in
again and restart the daemon—there is no live config reload or socket
re-authentication
([`daemon.go:2000-2049`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L2000-L2049),
[`daemon.go:2082-2099`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L2082-L2099),
[`daemon.go:3456-3537`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L3456-L3537),
[`handler/personal_access_token.go:143-172`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/personal_access_token.go#L143-L172),
[`handler/personal_access_token.go:208-249`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/personal_access_token.go#L208-L249)).

## 5. Application envelope and message catalog

### 5.1 Envelope

The declared application envelope is:

```json
{"type":"daemon:…","payload":{}}
```

`payload` is raw JSON. There is no envelope protocol version, connection epoch,
sequence number, acknowledgement number, or delivery class
([`messages.go:80-84`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L80-L84)).
Cross-node relay frames can add an undeclared top-level `event_id`, while local
frames do not; Go's decoder ignores that extra field
([`redis_relay.go:612-634`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/redis_relay.go#L612-L634)).

**Recovered requirement DWS-2.** Unknown well-formed message types and malformed
JSON MUST be ignored without closing the socket. This is Multica's
forward-compatibility policy, although it also makes sender defects silent
([`hub.go:729-754`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L729-L754)).

### 5.2 Daemon → server

| Type | Fields | Recovered behavior |
|---|---|---|
| `daemon:heartbeat` | `runtime_id`, optional `supports_batch_import` | MUST run heartbeat/pending-action processing synchronously; MAY yield no ack on malformed, unauthorized, absent-handler, or handler-error paths. |
| `daemon:rpc_request` | `request_id`, `method`, optional raw `body`, optional `timeout_ms` | MUST correlate by request ID; valid requests run asynchronously; malformed or missing-ID requests are silently ignored. |
| Any other valid type | open payload | MUST be ignored for forward compatibility. |

The two accepted cases are the complete dispatch switch
([`hub.go:729-754`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L729-L754)).

### 5.3 Server → daemon

| Type | Fields and meaning | Delivery class |
|---|---|---|
| `daemon:heartbeat_ack` | runtime, status, server capabilities, `runtime_gone`, optional update/model/local-skill actions | Response; may be dropped when server send queue is full. |
| `daemon:rpc_response` | request ID, HTTP-like status, optional body/error | Correlated response; may reorder and may be dropped. |
| `daemon:task_available` | runtime ID, optional task ID | Disposable wake-up; task remains claimed through HTTP/WS RPC. |
| `daemon:runtime_profiles_changed` | workspace ID, optional profile ID | Best-effort invalidation; receipt triggers refresh, but loss on a healthy socket is not periodically repaired. |
| `daemon:workspaces_changed` | empty object | Disposable invalidation; receiver re-syncs. |
| `daemon:pending_work` | runtime ID, optional `kind`, currently `model_list` | Disposable pull-now hint; carries no work. |

Payload declarations are in
[`messages.go:52-78`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L52-L78),
[`messages.go:94-132`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L94-L132), and
[`messages.go:340-405`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L340-L405);
builders are in
[`hub.go:541-576`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L541-L576),
[`hub.go:810-830`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L810-L830), and
[`hub.go:878-891`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L878-L891).

### 5.4 Declared-versus-live drift

Two declarations do not describe the live socket:

- `DaemonRegisterPayload` says registration is sent “on connection,” but the
  hub accepts no `daemon:register` frame. Registration is an HTTP call, and the
  same type name is used for a workspace/browser event
  ([`messages.go:180-192`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L180-L192),
  [`events.go:145-151`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/events.go#L145-L151),
  [`handler/daemon.go:711-715`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L711-L715),
  [`router.go:1380-1388`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/cmd/server/router.go#L1380-L1388)).
- `TaskDispatchPayload` is described as server-to-daemon, but the socket sends a
  payload-light `task_available`; full tasks come from `tasks.claim`
  ([`messages.go:86-99`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L86-L99),
  [`daemon_rpc.go:38-51`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon_rpc.go#L38-L51)).

**GAP WIRE-1.** One hand-maintained declaration mixes daemon-control messages,
browser domain events, and unused payloads. This is precisely the class of
drift Foldlab R11 forbids: one versioned manifest must own commands, replies,
errors, constraints, and byte encoding, with surfaces generated or
mechanically checked
([`EFFECTS-BACKEND.md:189-202`](../../library/cas/EFFECTS-BACKEND.md)).

## 6. Connection state machines

Neither side declares a state enum. The tables below recover the states required
to explain observed transitions.

### 6.1 Server-side socket

```text
AUTHORIZING
  └─ valid bearer + authorized runtime set
       ▼
UPGRADED ── register in runtime/workspace/user indexes ──▶ ACTIVE
                                                          │
                     ┌────────────────────────────────────┼───────────────┐
                     │                                    │               │
                     ▼                                    ▼               ▼
             HEARTBEAT_BUSY                        RPC_IN_FLIGHT       WRITING
             synchronous read loop                 ≤ 8 async           one pump
                     │                                    │               │
                     └────────────────────────────────────┴───────────────┘
                                                          │
               read/write error, slow eviction, or caller close
                                                          ▼
                                                     CLOSING
                       cancel RPCs → unindex → close send queue → close socket
                                                          ▼
                                                      CLOSED
```

Registration occurs before the read and write pumps start
([`hub.go:281-312`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L281-L312)).
Unregistration is idempotent and removes all index entries before closing the
send channel under its send mutex
([`hub.go:648-706`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L648-L706)).

**Recovered requirement DWS-3.** Disconnect MUST signal cancellation to every
in-flight RPC before the response channel closes. It need not assume the
handler cooperates: a late return MUST NOT panic or send on a closed channel.
This is source-tested by
`TestRPCDispatch_DisconnectDuringHandlerNoPanic`
([`rpc_dispatch_test.go:118-155`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/rpc_dispatch_test.go#L118-L155)).

### 6.2 Daemon-side connection

| Recovered state | Entry and exit |
|---|---|
| `HTTP_ONLY` | Scheduled HTTP heartbeat and task polling remain active while the socket is absent. WS failure does not stop them. |
| `DIALING` | A 10 s WebSocket handshake is attempted with the current runtime set. |
| `CONNECTED_UNNEGOTIATED` | A new RPC generation is attached, immediate heartbeats are queued, an immediate claim poll is signalled, and reconciliation is broadcast. `rpc-v1` is still disabled. |
| `READY` | A heartbeat ack from this exact generation advertises `rpc-v1`; per-runtime WS freshness can suppress scheduled HTTP heartbeat. |
| `CLAIM_UNCERTAIN` | A claim frame began writing but no response was established. After uncertainty is detected, the caller installs a fresh 7 s HTTP-fallback cooldown. A disconnect can detect uncertainty immediately; a response timeout detects it only after its own 7 s wait, making HTTP eligible roughly 14 s after send, plus poll scheduling. |
| `RECONNECT_WAIT` | Backoff begins at 1 s, doubles to 30 s, and receives ±20% jitter. Only a connection stable for 10 s resets it. |
| `RUNTIME_RECOVERY` | `runtime_gone` removes local mappings and freshness, coalesces concurrent recovery, re-registers under the daemon root context, and replaces the local runtime set. |
| `SHUTDOWN` | The socket is closed before RPC detachment so queued claim frames cannot flush after fallback; heartbeat and writer goroutines are then stopped and drained. |

The reconnect loop and stable-connection reset are in
[`wakeup.go:22-97`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L22-L97).
Attach/negotiation is generation-scoped
([`wsrpc.go:84-159`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L84-L159)).
The shutdown order is explicit and load-bearing
([`wakeup.go:205-250`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L205-L250)).

**Recovered requirement DWS-4.** A capability learned on connection generation
`g` MUST NOT enable RPC on generation `g+1`. Reconnect MUST reopen negotiation,
and an old-server decision MUST be forgotten on the next generation.

**Recovered requirement DWS-5.** Teardown MUST close the physical socket before
marking a sent claim safe for fallback. Otherwise an already queued claim can
flush after the fallback and double-claim.

### 6.3 Runtime-set fan-out

Runtime-set change is publish/subscribe, not a shared one-consumer channel.
Every supervisor receives a one-slot coalesced signal and re-derives current
state; notification does not carry a possibly stale replacement set
([`daemon.go:1856-1897`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L1856-L1897)).

**Recovered requirement DWS-6.** A configuration invalidation MAY coalesce, but
it MUST wake every independent supervisor. The signal SHOULD mean “re-read,”
not “apply this unversioned snapshot.”

## 7. Liveness: four clocks, not one `connected` boolean

### 7.1 Transport liveness

The server installs a 60 s read deadline, renews it on pong, sends a ping every
54 s, and gives every text, ping, and close write a 10 s deadline
([`hub.go:16-20`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L16-L20),
[`hub.go:699-727`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L699-L727),
[`hub.go:894-920`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L894-L920)).
The daemon also uses a 60 s read deadline but renews it on **any application
message, ping, or pong**; its ping handler replies with a 10 s control-write
deadline
([`wakeup.go:373-465`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L373-L465)).

**Recovered requirement LIVE-1.** WebSocket ping/pong proves only that bytes can
still pass and the peer's read loop can answer. It MUST NOT be used as runtime
registration, application freshness, or agent-progress evidence.

### 7.2 Application heartbeat

The daemon sends a heartbeat for every runtime immediately after connect and
normally every 15 s. Heartbeats share the single bounded writer and are dropped
rather than blocking when it is full
([`wakeup.go:278-325`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L278-L325),
[`config.go:21-65`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/config.go#L21-L65)).

A successful ack stamps one runtime as fresh. Freshness lasts twice the
configured heartbeat interval: one missed ack remains tolerated; roughly two
misses re-enable scheduled HTTP heartbeat. Socket teardown calls a clear-all
operation so HTTP heartbeat can resume
([`daemon.go:1899-1943`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L1899-L1943),
[`wakeup.go:138-143`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L138-L143),
[`daemon.go:3910-3949`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L3910-L3949)).

**Recovered requirement LIVE-2.** Application freshness MUST be timestamped per
runtime and expire automatically. It MUST NOT be a connection-wide Boolean.

**GAP LIVE-4 — old-reader effects are not fully generation-fenced.** The reader
goroutine is started but not joined during runtime-set change or shutdown. An
ack already read can race the teardown clear: RPC capability marking checks the
connection generation, but freshness stamping and heartbeat-action fan-out do
not. The reader also supplies `context.Background()`, so action goroutines
launched from that ack are not canceled by socket disconnect or daemon-root
cancellation. This is an **INFERENCE** from teardown and ack-handler ordering
([`wakeup.go:140-143`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L140-L143),
[`wakeup.go:205-250`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L205-L250),
[`wakeup.go:351-366`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L351-L366),
[`wakeup.go:429-435`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L429-L435),
[`daemon.go:3951-3992`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L3951-L3992)).

### 7.3 Server liveness record

Heartbeat refreshes Redis liveness for 90 s and schedules bounded database
summary writes. The read-only `HasPending` probe has a 1 s timeout. The
state-changing `PopPending` call deliberately has no timeout because cancellation
cannot un-run its Redis claim script
([`handler/daemon.go:988-1022`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L988-L1022),
[`handler/daemon.go:1193-1236`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L1193-L1236)).

**GAP LIVE-1 — heartbeat can wedge the connection.** The entire heartbeat
callback runs synchronously inside the server read pump with
`context.Background()`, not the connection context. Runtime lookup, Redis
liveness touch, database scheduling, and pending-action work can all delay the
read-pump defer; `PopPending` is the intentionally unbounded operation, not the
only possible stall. While the callback is stuck, the pump cannot read pong, a
later heartbeat, an RPC request, or peer disconnect. The source test locks in
“no deadline” with a 250 ms stall but does not falsify a permanent stall followed
by disconnect
([`hub.go:717-725`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L717-L725),
[`hub.go:832-867`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L832-L867),
[`handler/daemon.go:1170-1190`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L1170-L1190),
[`handler/daemon.go:1206-1236`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L1206-L1236),
[`hub_test.go:508-569`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub_test.go#L508-L569)).

**GAP LIVE-2 — a claimed action can lose its only immediate delivery.** Several
heartbeat paths move pending work into a running state before building the ack.
The ack then uses a nonblocking send; if the 16-frame socket queue is full, it
is discarded while the connection remains open. Resuming HTTP heartbeat does
not un-claim that action; the source explicitly says a claimed import otherwise
waits for the running timeout
([`handler/daemon.go:1291-1402`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L1291-L1402),
[`hub.go:878-891`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L878-L891)).
This is not ordinary hint loss: the frame contains the result of an irreversible
queue transition.

### 7.4 Agent-process progress

A positive run timeout is a hard wall-clock deadline; zero or negative means no
deadline, leaving liveness to activity watchdogs
([`agent.go:123-134`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L123-L134)).
The daemon-wide idle watchdog defaults to two hours. It records activity when a
normalized message is **received**, not when persistence succeeds. While a tool
is in flight it uses a separate tool window; it refuses to fire while the
message channel still has buffered entries. Checks occur between the budget and
budget plus one tick
([`daemon.go:8274-8304`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8274-L8304),
[`daemon.go:8617-8682`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8617-L8682)).

**Recovered requirement LIVE-3.** “Process alive,” “transport alive,” “runtime
fresh,” “agent making semantic progress,” and “output durably recorded” are
five distinct observations. None implies the next.

**GAP LIVE-3 — health conflates process and service.** The local health endpoint
can remain `running` while remote authentication, workspace synchronization,
both heartbeat paths, or task claiming are unavailable; it exposes no age of
last remote success or reconnect state
([`health.go:19-79`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/health.go#L19-L79),
[`health.go:296-355`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/health.go#L296-L355)).

## 8. Buffers, limits, and overflow semantics

| Boundary | Limit | Full/overflow behavior | Authority consequence |
|---|---:|---|---|
| Server inbound WS frame | 64 KiB | Read fails and connection tears down | Daemon reconnects; inbound frame is not replayed. |
| Daemon inbound WS frame | 64 MiB | Read fails and connection tears down | Sized for up to 32 full task payloads; HTTP recovery remains. |
| Server outbound socket queue | 16 frames | Hints evict/close slow socket; heartbeat/RPC response uses nonblocking drop and leaves it connected | Hints are safe; dropped state-changing responses may create uncertainty. |
| Server RPC concurrency | 8 per socket | No wait queue; ninth request receives 429 | Caller can retry only according to method semantics. |
| Server relay dedup | last 128 event IDs per socket | Older/reconnected duplicates pass | Dedup is a short-loop guard, not exactly-once. |
| Daemon WS writer | `max(16, 2 × runtime count)` frames | Heartbeats drop; RPC enqueue reports safe `write buffer full` before send | Frame count, not byte budget. |
| Daemon task-wakeup input | 256 | Producer uses nonblocking send | Later scheduled polling remains correctness path. |
| Daemon poller wake-up | 1 | Coalesces | Re-read current capacity/state. |
| Each runtime-set subscriber | 1 | Coalesces independently | Every subscriber still wakes. |
| RPC response waiter | 1 | First response wins; unknown/late response drops | Correlation is in-memory and generation-scoped. |
| Agent normalized message channel | usually 256 | Common `trySend` silently drops | Can lose transcript and retry-safety evidence. |
| Agent line scanner | 1 MiB initial, 32 MiB maximum line | `bufio.ErrTooLong`; strict adapters fail, some ignore | Provider session can be valid while harness transport fails. |
| Transcript flush cadence | 500 ms; 5 s POST timeout | Batch is removed from memory before POST and discarded on error | At-most-once transcript delivery. |
| Persisted tool-result output | first 8,192 bytes | Silent byte slice truncation | Remainder cannot be recovered from Multica transcript. |
| Server task-message batch | no local count/body cap in handler | Whole JSON decoded; one SQL statement | One bad row fails the atomic batch. |

Server limits and divergent full-queue policies are implemented in
[`hub.go:88-174`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L88-L174),
[`hub.go:281-312`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L281-L312),
[`hub.go:457-539`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L457-L539), and
[`hub.go:699-725`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L699-L725).
Daemon WS limits are in
[`wakeup.go:25-34`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L25-L34) and
[`wakeup.go:159-193`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L159-L193).
The shared agent scanner is in
[`stream_scanner.go:8-35`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/stream_scanner.go#L8-L35).

**Recovered requirement FLOW-1.** Capacity MUST be declared separately in
messages, bytes, concurrent work, and retained history. Backpressure is not a
memory budget.

**Recovered requirement FLOW-2.** Every message class MUST declare one overflow
effect: `coalesce`, `drop-and-reconcile`, `reject-before-send`, `disconnect`, or
`durable retry`. “Channel full” is not itself a protocol policy.

**GAP FLOW-1 — count bounds hide byte pressure.** The client may accept a 64 MiB
response while both peers bound queues by frame count. Current use has one
claim poller, but a generic future RPC surface could multiply per-connection
memory dramatically.

**GAP FLOW-2 — silent normalized-event loss is correctness-bearing.** Most
adapters use a 256-entry message channel and a nonblocking `trySend` that drops
when full
([`claude.go:127-128`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/claude.go#L127-L128),
[`claude.go:687-693`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/claude.go#L687-L693)).
A dropped `tool-use` is not merely missing UI: the daemon can retain
`toolCount==0`, making a later fresh-session retry appear safe after real side
effects, and can fail to enter the tool-specific watchdog state. This is an
**INFERENCE** across the drop, counter, and retry gates
([`daemon.go:7721-7795`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L7721-L7795),
[`daemon.go:8037-8065`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8037-L8065),
[`daemon.go:8417-8428`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8417-L8428)).

**GAP FLOW-3 — admission has no aggregate connection or identity budget.** The
upgrade parser accepts an uncapped list of runtime IDs, and the hub permits
multiple sockets under the same runtime, workspace, and user without a
per-identity or global connection cap. Authentication and per-runtime lookup
bound each item, but not the number of items or sockets
([`daemon_ws.go:60-82`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon_ws.go#L60-L82),
[`hub.go:184-203`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L184-L203)).

**GAP OBS-1 — inbound message metrics collapse the traffic they claim to
separate.** The hub records `rpc_request`, `invalid`, and unknown type names,
but the metric's closed allow-list contains none of those labels. Normalization
therefore maps all three to `other`, despite the wiring comment saying
dashboards can split invalid and unknown traffic
([`hub.go:729-744`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L729-L744),
[`labels_pr3.go:202-211`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/metrics/labels_pr3.go#L202-L211),
[`business_events.go:485-490`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/metrics/business_events.go#L485-L490),
[`main.go:539-543`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/cmd/server/main.go#L539-L543)).

## 9. Ordering, relay, and delivery classes

### 9.1 One socket

The single write pump serializes frames that enter its queue. It does not create
a semantic total order: concurrent notifiers race to enqueue, RPC handlers are
asynchronous and responses may reorder, and heartbeat handling blocks later
reads. `request_id`, not position, is the RPC association
([`hub.go:756-830`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L756-L830),
[`hub.go:894-920`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L894-L920)).

### 9.2 Cross-instance relay

When relay is enabled, notification is delivered locally first and then
published with the same ULID. Loopback is suppressed by the receiving socket's
128-ID memory
([`notifier.go:11-130`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/notifier.go#L11-L130),
[`hub.go:132-156`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L132-L156)).

Only the default sharded mode and dual mode install daemon wake-up relay
delivery. Legacy Redis relay mode explicitly leaves daemon fan-out local, so a
producer on one API instance cannot wake a daemon connected only to another
instance through that legacy relay
([`main.go:426-447`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/cmd/server/main.go#L426-L447)).

The sharded Redis Streams relay defaults to eight shards, approximate 2,000
entries per shard, reads of 128, 5 s blocking reads, 5 min restart replay, and a
2 s publish deadline. Every API node consumes every shard
([`sharded_stream_relay.go:17-67`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/sharded_stream_relay.go#L17-L67),
[`sharded_stream_relay.go:152-173`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/sharded_stream_relay.go#L152-L173),
[`sharded_stream_relay.go:217-232`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/sharded_stream_relay.go#L217-L232),
[`sharded_stream_relay.go:265-294`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/sharded_stream_relay.go#L265-L294)).

The shard function gives one Redis stream per key:

- pending-work uses runtime ID, so one runtime stays on one shard;
- profile invalidation uses workspace ID;
- workspace invalidation uses user ID;
- task wake-ups use task ID, so two tasks for one runtime may cross shards and
  reorder.

That is a Redis-reader property, not an end-to-end socket-order guarantee. The
origin node delivers a notification locally **before** publishing it. A later
local event can therefore reach a socket ahead of an earlier remote event still
waiting in the shard; when the origin eventually reads its own later stream
copy, per-socket event-ID deduplication suppresses only that duplicate. Even
events with the same shard key can thus overtake at the socket boundary
([`notifier.go:23-48`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/notifier.go#L23-L48),
[`hub.go:132-156`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L132-L156),
[`sharded_stream_relay.go:265-301`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/sharded_stream_relay.go#L265-L301)).

The relay advances its reader cursor and immediately tries local fan-out. It
has no per-daemon acknowledgement and no durable mailbox for a disconnected
daemon. Bounded stream replay is therefore node-restart assistance, not daemon
resumption
([`sharded_stream_relay.go:296-331`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/sharded_stream_relay.go#L296-L331),
[`sharded_stream_relay.go:439-482`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/realtime/sharded_stream_relay.go#L439-L482)).

### 9.3 Delivery matrix

| Class | May lose | May duplicate | May reorder | Catch-up or repair |
|---|---|---|---|---|
| Task/pending-work hint | yes | yes | yes | Scheduled claim or heartbeat. |
| Workspace invalidation | yes | yes | yes | Periodic workspace sync. |
| Runtime-profile invalidation | yes | yes | yes | Receipt refreshes immediately; reconnect performs full profile reconciliation, but a healthy connection has no periodic repair. |
| Heartbeat ack | yes under queue pressure | request may repeat | across runtimes/actions | HTTP heartbeat resumes after freshness expiry; popped actions rely on action-store recovery. |
| WS RPC response | yes under queue pressure/disconnect | request ID may be reused; server does not dedup | yes | Client uncertainty delay; server stale-dispatch recovery. |
| Redis relay event | yes to absent socket | yes beyond 128 IDs/reconnect | yes across shards and at the local-first delivery boundary | Bounded node replay only. |
| Persisted task message | a failed batch is lost before persistence | random row IDs make safe retry unavailable | sequence order within a committed batch | HTTP `since(seq)` returns only committed rows. |
| Terminal complete/fail/cancel callback | transient attempts can all fail and process death loses retry state | yes during retry | terminal CAS decides | Six in-memory attempts; server treats terminal duplicate as success. |

**Recovered requirement ORDER-1.** Ordering guarantees MUST name both the key
and the boundary: “FIFO in one writer queue,” “ordered rows within one SQL
batch,” and “same relay shard reader” are different judgments.

**GAP CONFIG-1 — profile invalidation is correctness-bearing but
best-effort.** Publication has no retry, receiving the frame is the only
immediate refresh trigger, and ordinary timed workspace synchronization
explicitly skips runtime-profile reconciliation. A lost invalidation can leave
a healthy daemon on stale profile state indefinitely; reconnect is the repair
([`notifier.go:51-72`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/notifier.go#L51-L72),
[`wakeup.go:401-411`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wakeup.go#L401-L411),
[`daemon.go:3581-3594`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L3581-L3594),
[`daemon.go:3626-3632`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L3626-L3632)).

## 10. Task-claim RPC and the uncertainty barrier

### 10.1 Server contract

Only `tasks.claim` is bound. It reuses the HTTP claim handler in process, with
identity and capability/version headers reconstructed from the established
socket. A batch is capped at 32 tasks; malformed, missing, stale, or unauthorized
runtime IDs are skipped according to the shared handler
([`daemon_rpc.go:38-89`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon_rpc.go#L38-L89),
[`handler/daemon.go:1564-1685`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L1564-L1685)).

The server permits eight concurrent RPC handlers per socket and has no waiting
queue. Saturation produces 429. Positive `timeout_ms` derives a child deadline;
zero has only connection-lifetime cancellation. Responses are correlated but
not ordered. Duplicate request IDs are neither refused nor deduplicated
([`hub.go:172-174`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L172-L174),
[`hub.go:756-830`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L756-L830)).

### 10.2 Client outcome algebra

The client gives each outgoing frame an atomic state:

```text
queued ── cancel before writer ──▶ cancelled / NOT_SENT
   │
   └─ writer begins ─────────────▶ SENT
                                      │
                                      ├─ correlated response ──▶ KNOWN(status, body)
                                      └─ timeout/detach ───────▶ UNKNOWN
```

Canceling a queued frame prevents the writer from ever delivering it, making
immediate HTTP fallback safe. Once `beginWrite` succeeds, cancellation fails
and the result is uncertain
([`wsrpc.go:15-82`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L15-L82),
[`wsrpc.go:181-284`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L181-L284)).
The source tests explicitly cover cancel-before-write and write-before-cancel
([`wsrpc_test.go:187-279`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc_test.go#L187-L279)).

The RPC call itself waits the 5 s server budget plus 2 s response grace. If it
then determines the frame was sent but the outcome is unknown, the caller
starts a **new** 7 s cooldown before bypassing WS once. A disconnect-detected
unknown outcome therefore waits at least 7 s after detection; a timeout-detected
unknown outcome makes HTTP eligible roughly 14 s after send, plus claim-poll
scheduling. Capability 404 is cached as legacy batch-unavailable until the next
connection generation
([`wsrpc.go:20-32`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L20-L32),
[`wsrpc.go:240-279`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L240-L279),
[`wsrpc.go:315-367`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/wsrpc.go#L315-L367)).

**Recovered requirement RPC-1.** A client MUST distinguish `NOT_SENT` from
`SENT_UNKNOWN`. It MUST NOT immediately retry a non-idempotent operation on
another transport after `SENT_UNKNOWN`.

**Recovered requirement RPC-2.** Capability negotiation MUST belong to one
connection generation. A reconnect MUST NOT inherit the previous peer's
advertisement.

### 10.3 What the timeout does not prove

The protocol comment says server execution is bounded and timed-out work is
rolled back, but the transport supplies only cooperative context cancellation.
The real claim and response-finalization paths use separate committed
transactions and side effects. A later timeout cannot retroactively roll back
an earlier commit; response-lost tasks instead become eligible for stale
redelivery after 90 s
([`messages.go:52-66`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/protocol/messages.go#L52-L66),
[`service/task.go:3358-3479`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/service/task.go#L3358-L3479),
[`service/task.go:3699-3720`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/service/task.go#L3699-L3720)).

**GAP RPC-1.** “Context deadline observed,” “transaction rolled back,” “no
effect committed,” and “response delivered” are four separate claims. The
current timeout test proves only that a cooperative fake handler observes
`ctx.Done()`
([`rpc_dispatch_test.go:157-191`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/rpc_dispatch_test.go#L157-L191)).

**GAP RPC-2.** HTTP claims do not get the same explicit request identity or
uncertainty cooldown. A 5 s HTTP response can be lost after commit; repeated
calls can accumulate dispatched-but-not-started tasks until 90 s recovery. The
system is recoverable, but the local slot owner never learned which slots were
consumed
([`client.go:246-324`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/client.go#L246-L324),
[`service/task.go:182-195`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/service/task.go#L182-L195),
[`service/task.go:3776-3822`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/service/task.go#L3776-L3822)).

**GAP RPC-3.** `request_id` is correlation only. Reusing it can execute the
handler again; it is not an idempotency key.

**GAP RPC-4 — the error field is not the status contract.** The reused HTTP
claim handler writes ordinary 4xx/5xx errors into its captured response body and
returns `err=nil`; the WebSocket wrapper therefore sends a non-2xx status plus
`body` and an empty `error`. Unknown methods and direct handler failures use the
`error` field instead. A client that checks only `error` misclassifies ordinary
claim refusals
([`daemon_rpc.go:38-89`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon_rpc.go#L38-L89),
[`hub.go:786-818`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L786-L818)).

## 11. Local agent streams: one façade, several completion laws

### 11.1 Common lifecycle contract

Every backend returns the same two-channel façade:

```text
Execute(ctx, prompt, options)
  ├─ Messages: zero or more normalized observations, then close
  └─ Result:   exactly one terminal value after Messages closes, then close
```

The interface promises the close order and one terminal result, but it does not
make the normalized observations durable, lossless, or sufficient to prove
completion
([`agent.go:17-23`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L17-L23),
[`agent.go:136-169`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L136-L169),
[`agent.go:194-201`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L194-L201)).
The common message vocabulary is:

| Normalized type | Important fields | Daemon use |
|---|---|---|
| `status` | `status`, optional `session_id` | Activity and early resume-pointer pinning; not written as a transcript row. |
| `thinking` | `content` | Coalesced separately from answer text. |
| `text` | `content` | Coalesced into visible transcript text and considered activity. |
| `tool-use` | `tool`, `call_id`, `input` | Increments tool count and in-flight watchdog state; persisted as `tool_use`. |
| `tool-result` | `tool`, `call_id`, `output` | Decrements in-flight state; persisted as `tool_result`. |
| `error` | `content` | Persisted immediately as an error row; does not by itself define the terminal `Result`. |
| `log` | `level`, `content` | Adapter diagnostic only; the daemon does not persist it in the task transcript. |

Most adapters allocate `Messages(256)` and `Result(1)`. Their shared
`trySend` is nonblocking, so a full message channel loses the new observation
without notifying the producer or consumer
([`claude.go:127-160`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/claude.go#L127-L160),
[`claude.go:687-693`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/claude.go#L687-L693)).

**Recovered requirement AGENT-1.** `Messages` closing MUST precede the terminal
`Result`, but terminal success MUST be established by protocol-positive
evidence, not inferred from channel closure or process exit code zero.

**Recovered requirement AGENT-2.** A normalized event used for retry safety,
cancellation, watchdog selection, or final-output selection MUST NOT use a
silent-drop queue. Either it is delivered, backpressures the producer, or its
loss becomes an explicit terminal refusal.

### 11.2 Framing and process ownership

Line-oriented adapters share a scanner with a 1 MiB initial allocation and a
32 MiB maximum **single line**. Crossing the maximum ends scanning with
`bufio.ErrTooLong`; the source explicitly distinguishes a transport failure
from a valid provider session that the harness can no longer read
([`stream_scanner.go:8-35`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/stream_scanner.go#L8-L35)).
The cap is per frame, not per run, and is not a total-output budget.
Reasonix is a drift exception: it constructs a separate scanner capped at
10 MiB and does not inspect `scanner.Err()` before reporting process exit
([`reasonix.go:214-228`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/reasonix.go#L214-L228)).
By contrast, Multica's one-shot collector demonstrates a total retained-output
budget: 8 MiB stdout plus a 32 KiB stderr tail, with overflow reported rather
than silently truncated
([`run_collect.go:65-122`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/run_collect.go#L65-L122)).

Prompt input and stdout consumption are usually concurrent. This avoids the
classic two-pipe deadlock in which a large prompt fills stdin while the child
fills stdout and neither side drains the other. Claude and OpenCode document
this race directly
([`claude.go:134-155`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/claude.go#L134-L155),
[`opencode.go:198-209`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/opencode.go#L198-L209)).

Every runtime process is intended to be a tree-owned child. Unix starts the
child as a process-group leader and signals the negative PID, falling back to
the direct process only if group signalling fails
([`proc_other.go:16-59`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/proc_other.go#L16-L59)).
Windows starts the process suspended, assigns it to a kill-on-close Job Object,
then resumes it. Job assignment deliberately fails open: the task still runs,
but cancellation may kill only the direct child and the only signal is a
warning log
([`proc_windows.go:80-131`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/proc_windows.go#L80-L131),
[`proc_windows.go:134-174`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/proc_windows.go#L134-L174)).

**Recovered requirement AGENT-3.** Cancellation MUST target the owned process
tree, not only the direct child. If tree ownership degrades, health MUST expose
that degraded cancellation guarantee as state, not only as one past log line.

### 11.3 Completion-law matrix

The façade hides materially different provider laws. This matrix records the
important representatives, rather than pretending every adapter provides the
same proof of terminal success.

| Adapter family | Local wire and terminal evidence | What is strong | What remains weak or heuristic |
|---|---|---|---|
| Claude, CodeBuddy, Qwen | NDJSON; explicit `result` event | Shared finalizer fails on scanner error, write/exit failure, missing result, structured result error, cancellation, or timeout. Terminal text is separate from streamed turns; a successful empty terminal result falls back to the last complete assistant text. Tool use or an unreadable turn clears that fallback, while a thinking-only turn leaves it intact. Failed runs expose no partial answer as final output ([`stream_json_result.go:12-88`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/stream_json_result.go#L12-L88), [`stream_json_result.go:89-161`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/stream_json_result.go#L89-L161), [`qwen.go:185-214`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/qwen.go#L185-L214)). | Unknown JSON events may still be ignored; normalized observations still use the lossy common channel. |
| Cursor | NDJSON; explicit `result` event | Treats result as protocol boundary even if a worker lingers; without it, scanner/write/process errors or clean EOF all fail ([`cursor.go:248-267`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/cursor.go#L248-L267), [`cursor.go:320-376`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/cursor.go#L320-L376)). Unknown transcript-bearing event types are counted rather than guessed. | The count is diagnostic, not a completeness guarantee; the message channel may still drop recognized tool events. |
| Codex | Long-lived stdio JSON-RPC; `turn/completed` is lifecycle authority, `agentMessage phase=final_answer` selects delivery | Correlates RPCs, rejects other-thread notifications, distinguishes final answer from narration, fails pending RPCs when the reader dies, and has bounded two-phase cleanup for scanner overflow ([`codex.go:1090-1184`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/codex.go#L1090-L1184), [`codex.go:1186-1227`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/codex.go#L1186-L1227), [`codex.go:3095-3180`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/codex.go#L3095-L3180), [`codex.go:3266-3283`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/codex.go#L3266-L3283)). | Cleanup has timing-sensitive tests; one overflow-cleanup test missed its strict 5 s acceptance bound twice in this study (§16). |
| DSH | Versioned NDJSON commands/events with request ID and explicit terminal result | Sends protocol cancel before TERM/KILL escalation; absence of a terminal result is an explicit failure with ordered diagnostic precedence ([`dsh.go:260-348`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/dsh.go#L260-L348)). | Recognized messages still enter the same lossy normalized queue. |
| Copilot | NDJSON event reducer; process exit finalizes accumulated state | Scanner overflow is logged, nonzero exit fails, and provider event state is centralized. | There is no required terminal-result witness: clean EOF can preserve the reducer's initial `completed` status. Malformed lines are logged with their raw content, creating both false-green and secret-log exposure risks ([`copilot.go:375-435`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/copilot.go#L375-L435)). |
| Pi / Oh-My-Pi | NDJSON deltas, `turn_end`, retry events; process exit finalizes | Tracks provider retry exhaustion and keeps the final provider error; concurrent prompt write avoids pipe deadlock ([`pi.go:282-305`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/pi.go#L282-L305), [`pi.go:317-424`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/pi.go#L317-L424)). | The main scan loop never consults `scanner.Err()`, and there is no explicit whole-run terminal frame. Clean EOF after partial output can complete. **INFERENCE:** with no run deadline, an oversized continuing line can stop the parent scanner, leave the child blocked writing stdout, and leave the parent waiting for that child indefinitely ([`pi.go:304-470`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/pi.go#L304-L470), [`agent.go:123-134`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L123-L134)). |
| ACP-derived Hermes and peers | Bidirectional JSON-RPC; `session/prompt` response plus asynchronous `session/update` notifications | Correlated RPCs, session fencing, history-replay suppression, post-response drain, provider-error promotion, and resume-loss classification are explicit ([`hermes.go:357-426`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/hermes.go#L357-L426), [`hermes.go:469-557`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/hermes.go#L469-L557), [`hermes.go:675-785`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/hermes.go#L675-L785)). | ACP exposes no final-answer marker. The adapter selects text after the latest tool and, when a turn ends on a tool, falls back to the latest non-empty pre-tool block; this can promote interim narration ([`acp_deliverable.go:8-22`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/acp_deliverable.go#L8-L22), [`acp_deliverable.go:38-67`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/acp_deliverable.go#L38-L67)). Most peers special-case only `cancelled`; an explicit `error` or unknown stop reason can retain the initial `completed` status unless later text or stderr heuristics independently promote failure, while Reasonix fails closed on both. The common reader also discards the scanner's precise terminal error ([`hermes.go:413-426`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/hermes.go#L413-L426), [`hermes.go:627-688`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/hermes.go#L627-L688), [`reasonix.go:425-444`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/reasonix.go#L425-L444)). Notification completion additionally uses a 250 ms quiet heuristic plus a backend hard bound; the quiet period cannot prove no later frame exists ([`hermes.go:791-839`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/hermes.go#L791-L839)). |
| QwenPaw ACP | Same shared ACP parser | Session create/load errors and request cancellation are classified. | A prompt response with stop reason `cancelled` is only logged; `finalStatus` remains `completed`, so this path can report cancellation as success ([`qwenpaw.go:298-365`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/qwenpaw.go#L298-L365)). |
| OpenCode / DevEco / CodeArts | NDJSON step events without one universal terminal-result frame | Scanner errors fail. OpenCode and CodeArts detect open steps, missing continuations, and empty terminal steps; CodeArts additionally refuses a stream with no parseable events ([`opencode.go:451-492`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/opencode.go#L451-L492), [`codearts.go:455-505`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/codearts.go#L455-L505)). | OpenCode still has a clean-empty-stream hole because no event leaves every structural flag false. DevEco has no structural terminal guard at all: empty or malformed-only output plus exit zero remains completed ([`deveco.go:303-365`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/deveco.go#L303-L365)). |
| OpenClaw | Reads an entire pretty-printed result or buffers stdout and replays it as NDJSON | A complete parse plus 2 s idle is a protocol boundary even if the child lingers; empty unparseable output fails ([`openclaw_stdout.go:9-63`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/openclaw_stdout.go#L9-L63), [`openclaw.go:410-428`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/openclaw.go#L410-L428), [`openclaw.go:538-555`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/openclaw.go#L538-L555)). | The fallback is not live: all stdout is accumulated without a total byte bound before events are emitted. Any nonempty unstructured text is accepted as completed output. |
| Antigravity | Plain line stream plus a side log/transcript | Promotes known print timeout/provider errors and can recover an answer from the provider transcript. | Scanner failure is warning-only; clean exit remains the principal completion signal ([`antigravity.go:127-187`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/antigravity.go#L127-L187)). |

Resume capability is likewise evidence-valued rather than Boolean. A result can
positively report a permanent or transient resume refusal, but `false` is not
proof that the old session was accepted: six adapters are explicitly listed as
unable to detect rejection. The daemon permits one fresh-session retry only
after interpreting that adapter evidence and observing no tool use; even then,
the source says a zero tool count proves only that no tool was observed, not
that no side effect occurred
([`agent.go:202-237`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L202-L237),
[`agent.go:346-364`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L346-L364),
[`daemon.go:8037-8075`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8037-L8075)).

**GAP AGENT-1 — one type hides different truth conditions.** A caller holding
`Session` cannot determine whether `completed` means “explicit terminal result,”
“step structure looked closed,” “RPC response arrived and the pipe went quiet,”
or merely “process exited zero.” Adapter identity is therefore part of the
meaning of the result even though the shared type does not carry its completion
witness.

**GAP AGENT-2 — terminal evidence and transcript evidence can diverge.** A
provider adapter may correctly hold a final answer in `Result.Output` even when
the corresponding `MessageText` was dropped or its HTTP batch failed. Conversely,
partial text can be persisted before the backend later fails closed. A consumer
MUST NOT infer terminal success from transcript non-emptiness or transcript
completeness from terminal success.

## 12. Transcript reduction, sequencing, and persistence

### 12.1 Reduction before persistence

The daemon keeps independent text and thinking builders. Every 500 ms it emits
all pending thinking first and all pending text second. Tool and error messages
receive sequence numbers immediately, while text/thinking receive sequence
numbers only at flush
([`daemon.go:8306-8368`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8306-L8368),
[`daemon.go:8370-8502`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8370-L8502)).

That is a projection, not a lossless log. For example:

```text
source observations: text("A"), tool-use(T), text("B")
persisted rows:       tool_use(T, seq=1), text("AB", seq=2)
```

The first text observation moved after the tool. Interleaved thinking and text
also become one thinking row followed by one text row, regardless of source
chronology.

The same reducer has no byte or count limit on `pendingText`,
`pendingThinking`, or the pending batch. A ticker flush detaches the current
batch, releases the mutex, and can then block for up to five seconds on its
HTTP POST while the main drain loop continues accepting observations into new
builders. The adapter's 256-entry message channel therefore limits queued
messages at one seam but does not bound total transcript memory at the next
([`daemon.go:8312-8350`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8312-L8350),
[`daemon.go:8353-8429`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8353-L8429)).

**GAP FLOW-4 — the persistence reducer has an uncapped accumulation lane.** A
slow or repeatedly timing-out transcript endpoint can convert continued local
agent output into unbounded daemon memory growth even though every individual
channel and request body has a separate count or byte limit.

**Recovered requirement TRACE-1.** If `seq` claims source order, it MUST be
assigned when the source observation is accepted. A later coalescing projection
MAY combine adjacent observations only if it retains the source span or openly
defines a different ordering judgment.

Tool results are truncated to the first 8,192 bytes before transport. The slice
can end inside a multi-byte UTF-8 code point; no truncation marker, original
length, digest, or external blob address is recorded
([`daemon.go:8444-8478`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8444-L8478)).

**Recovered requirement TRACE-2.** Truncation MUST be explicit data: original
byte length, retained byte length, truncation flag, and a recoverable address or
digest when the omitted bytes matter. It MUST preserve the declared text
encoding.

### 12.2 Delivery state machine

The daemon's batch state is:

```text
pending builders / batch
  └─ flush: detach batch from memory
       └─ POST under new 5 s background context
            ├─ 2xx: debug success; batch gone
            └─ any error: debug failure; batch gone
```

The batch is removed before the POST and there is no retry, acknowledgement
cursor, spool, or outbox. Final drain waits for the attempt to return, not for
durable acceptance beyond the HTTP response
([`daemon.go:8318-8350`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8318-L8350),
[`daemon.go:8507-8535`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8507-L8535),
[`client.go:481-495`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/client.go#L481-L495)).

**GAP TRACE-1 — transcript delivery is at-most-once.** A request that never
commits because of a timeout, pre-commit 5xx, or daemon death can produce a
permanent hole. If the server commits but the success response is lost, the
batch is durable but its outcome is unknown to the daemon. That second case is
not itself a hole; it becomes a duplicate risk if a retry is later added
without logical append identity. Normal daemon health exposes neither case.

### 12.3 Server commit and catch-up

The server redacts and sanitizes every row, generates a fresh UUID for every
attempt, and inserts the whole request through one SQL statement. Only after
the statement succeeds, and only for issue- or chat-backed tasks, it
republishes the inserted rows in `seq` order
([`handler/daemon.go:4520-4551`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L4520-L4551),
[`handler/daemon.go:4571-4650`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L4571-L4650)).
That gives **batch atomicity**: no committed prefix. The query's own source says
this is consistency, not completeness; completing the guarantee requires retry
plus uniqueness on `(task_id, seq)`
([`task_message.sql:29-45`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/db/queries/task_message.sql#L29-L45)).

The schema has a primary key only on random row ID and a non-unique index on
`(task_id, seq)`
([`026_task_messages.up.sql:1-13`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/migrations/026_task_messages.up.sql#L1-L13)).
Therefore simply adding client retries today could duplicate logical rows. A
lost success response is `SENT_UNKNOWN`, just as in task claim, but transcript
ingest has no idempotency key, and the daemon does not use the existing read
endpoint to reconcile the append outcome.

`GET .../messages?since=n` selects committed rows with `seq > n` ordered by
sequence. It neither acknowledges contiguity nor reports that earlier sequence
numbers were never committed
([`task_message.sql:76-84`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/db/queries/task_message.sql#L76-L84),
[`handler/daemon.go:4776-4815`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L4776-L4815)).

**Recovered requirement TRACE-3.** A resumable append protocol MUST make a
retry of the same logical append idempotent and MUST return the highest
contiguous committed source cursor, not merely rows whose numeric field exceeds
the caller's guess.

### 12.4 Unequal durability by message class

Multica already has a stronger pattern for terminal task callbacks. Complete,
fail, and cancellation acknowledgement retry transient failures after
4/8/16/32/64 seconds—six attempts total—and the server treats a repeated
terminal transition as success
([`client.go:984-996`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/client.go#L984-L996),
[`client.go:1050-1095`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/client.go#L1050-L1095)).
The retries remain memory-only, so process death still loses them, but their
delivery contract is substantially stronger than transcript, session pin, usage,
or progress reporting
([`client.go:473-571`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/client.go#L473-L571)).

**GAP TRACE-2 — importance is not a declared delivery class.** The code chooses
retry policy separately at call sites. Nothing in the common message algebra or
wire manifest states why terminal branch identity retries for 124 s while the
only transcript copy is discarded after one attempt.

### 12.5 Session-pointer and usage state

The terminal result carries a provider session ID plus per-model input, output,
cache-read, and cache-write token counts and optional provider-priced cost
([`agent.go:171-201`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/agent.go#L171-L201)).
These fields do not share one durability contract.

An early `MessageStatus` with a session ID starts one background session-pin
attempt so a mid-run daemon crash can retain the resume pointer. For Codex, the
daemon first waits for the corresponding rollout file and withholds a terminal
session ID if that file never appears; the terminal complete/fail callback is
the authoritative session writer and uses the stronger callback retry policy
([`daemon.go:7829-7849`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L7829-L7849),
[`daemon.go:8370-8416`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L8370-L8416),
[`client.go:558-571`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/client.go#L558-L571)).
The early pin remains best-effort: one failed POST is logged and not retried.

Usage is sent independently of terminal status, also with one client attempt.
On the server, each model entry is upserted separately; an individual failure
is logged, processing continues, and the endpoint still returns HTTP 200. A
mixed-success request can therefore acknowledge partial usage as full success
([`daemon.go:5156-5165`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/daemon.go#L5156-L5165),
[`client.go:520-526`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemon/client.go#L520-L526),
[`handler/daemon.go:4333-4404`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/handler/daemon.go#L4333-L4404)).

**GAP STATE-1 — one task exposes several durability grades without one state
ledger.** Transcript batches, early session pin, usage, and terminal task result
can each be accepted or lost independently. The terminal callback can therefore
be durable while the transcript, usage, or early crash-recovery pointer is
incomplete, and no aggregate receipt reports that combination.

## 13. Disconnection, cancellation, and shutdown

### 13.1 Socket disconnect

On a normal server-side read exit, the defer order is: cancel the connection
context, unregister from all indexes, close the send queue, then close the
socket. Async RPC handlers receive the canceled context, but the hub does not
stop or join them; a non-cooperative handler can continue indefinitely. Any
late response is safely suppressed because the connection is already marked
closed. The source test deliberately lets a handler return only after
disconnect and checks that this does not panic
([`hub.go:699-706`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L699-L706),
[`hub.go:784-829`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L784-L829),
[`rpc_dispatch_test.go:118-154`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/rpc_dispatch_test.go#L118-L154)).
Daemon teardown clears the WS-fresh map, detaches the generation-scoped RPC
client, and lets scheduled HTTP paths resume, subject to the old-reader race in
GAP LIVE-4. There is no socket session resumption or replay; it reconciles from
server state.

This clean path has one exception: the synchronous heartbeat handler described
in GAP LIVE-1 is not derived from the connection context. If it never returns,
the read-pump defer never runs and disconnect does not cancel that work.

### 13.2 Agent cancellation

Adapter cancellation is deliberately ordered around pipe ownership:

1. stop or close further prompt input;
2. send a protocol cancellation when the local wire supports it;
3. TERM the owned process tree;
4. after a grace window, KILL the tree;
5. only then close the read pipe to unblock a scanner;
6. wait/reap before declaring cleanup.

Closing stdout before killing the tree is avoided because an orphan can spin on
`EPIPE`; Claude and OpenCode both encode that concern
([`claude.go:180-210`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/claude.go#L180-L210),
[`opencode.go:211-240`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/pkg/agent/opencode.go#L211-L240)).

The common terminal vocabulary is not normalized at this boundary. Backends
emit both `aborted` and `cancelled`; the daemon can synthesize `cancelled` when
its own context ends; QwenPaw has the false-green stop-reason path above. A
consumer cannot equate these strings without adapter-specific knowledge.

**Recovered requirement CANCEL-1.** Cancellation outcome MUST distinguish at
least: request observed, provider acknowledged, process tree confirmed gone,
output tail drained, and terminal state committed. One Boolean or one status
word cannot answer all five.

### 13.3 Service shutdown

Daemon-side shutdown explicitly closes the socket before detaching RPC state,
then stops and joins heartbeat/writer goroutines. Server-side shutdown drains
HTTP for ten seconds but does not call a daemon-hub close-all/drain operation;
the hub has per-client unregister only. **INFERENCE:** established WebSockets
remain hijacked until peer error or process termination, so the server cannot
send a deliberate restart reason or bound their handler drain as a group
([`main.go:368-375`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/cmd/server/main.go#L368-L375),
[`main.go:726-752`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/cmd/server/main.go#L726-L752),
[`hub.go:604-706`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/hub.go#L604-L706)).

No correctness-bearing daemon delivery has a disk-backed outbox. A daemon crash
can therefore strand a terminal callback until a server sweeper, lose transcript
batches permanently, and lose a just-discovered session pointer. Process-tree
ownership limits child leakage; it does not make control-plane delivery durable.

## 14. Consolidated robustness register

Priority below means review order for this source study, not a security score.

| Priority | Finding | Trigger | Observable result | Existing repair | Missing falsifier or control |
|---|---|---|---|---|---|
| High | TRACE-1 at-most-once transcript | One HTTP timeout/5xx or daemon death during a flush | Permanent, normally silent sequence gap | Atomic server batch prevents a partial prefix | Idempotent append, durable outbox, contiguous ack, restart test |
| High | LIVE-1 synchronous unscoped heartbeat | Runtime lookup, liveness touch, scheduling, or pending-action work stalls | Server read loop cannot consume pong, RPC, or disconnect | WS read deadline eventually matters only after handler returns | Disconnect-while-stalled test; bounded detachable worker or recoverable action lease |
| High | LIVE-2 claimed action / dropped ack | Pending action is popped while outbound socket queue is full | Action is running but daemon never received it | Store-specific running timeout | Durable delivery identity or acknowledgement before irreversible claim |
| High | FLOW-2 normalized tool-event drop | Agent emits faster than daemon drains 256 entries | Missing transcript/tool count; wrong retry-safety and watchdog evidence | Scheduled task recovery does not reconstruct local observations | Lossless correctness lane; saturation test through full daemon drain |
| High | AUTH-1 frozen bearer authority | Credential expires or is revoked while socket stays healthy | Captured workspace/runtime authority may persist | Some heartbeat paths re-resolve runtime ownership | Auth epoch/lease, server revocation close, maximum connection age test |
| High | CONFIG-1 lost profile invalidation | Relay publish, socket enqueue, or delivery fails while connection stays healthy | Runtime profile remains stale indefinitely | Reconnect performs full profile reconciliation | Periodic version/cursor reconciliation or durable invalidation acknowledgement |
| High | AGENT-1 completion-law variance | Weak adapter reaches clean EOF or heuristic boundary | False-green completion or truncated final answer | Stronger adapters fail closed; provider-specific patches | Manifest-declared terminal witness and common conformance corpus |
| Medium | RPC sent-unknown without idempotency | Claim commits, response is lost | Duplicate fallback risk or stranded dispatched tasks | WS claim cooldown; 90 s stale reclaim | Operation identity + reconcile endpoint; matching HTTP barrier |
| Medium | RPC error-shape split | Reused HTTP handler returns non-2xx with `err=nil` | Failure body travels with empty `error`; client logic can diverge by path | Status code remains present | One generated response union and vectors for every refusal path |
| Medium | TRACE-1 chronology projection | Text/thinking interleave with tool/error before 500 ms flush | Persisted order differs from observation order | Deterministic within one batch | Source-sequence-at-ingress test and span-preserving coalescer |
| Medium | FLOW-4 uncapped transcript reducer | Transcript POST stalls while the agent keeps emitting | New text/thinking builders and batch grow without a total memory bound | Five-second POST deadline eventually allows another flush attempt | Per-task byte/count budget, bounded spill, and slow-endpoint saturation test |
| Medium | Count-only queue budgets | Few very large frames or outputs | Large retained memory despite low queue count | Per-frame read limits | Per-connection byte budget and admission test |
| Medium | Relay has no daemon mailbox | Daemon disconnect or replay/dedup window expires | Events missed or duplicated | Task/pending hints pull-reconcile; profile invalidation does not | Explicit delivery-class declaration and reconciliation-age metric |
| Medium | STATE-1 auxiliary state is best-effort | Session-pin POST fails or one usage upsert fails | Lost crash-recovery pointer or partial usage despite later success/HTTP 200 | Terminal session callback retries; successful usage rows remain | Per-class receipt, retry identity, and aggregate task-state completeness view |
| Medium | LIVE-4 stale reader crosses generation | Ack is already read while socket teardown clears freshness | Old generation can restamp freshness or launch uncancelled actions | Capability marking itself is generation-checked | Join reader; generation-check all effects; derive action contexts from connection/root scope |
| Medium | Health reports process, not remote service | Auth/control/data paths fail while daemon process runs | Local endpoint can remain green | Logs and later task failures | Structured health vector with last-success ages and degraded causes |
| Medium | Server shutdown lacks daemon-hub drain | Graceful server stop with open sockets | Abrupt peer reconnect; no restart reason or group drain | Client reconnect loop | Close-all API, restart code, bounded handler join test |
| Medium | Aggregate admission uncapped | Many runtime IDs or sockets under one identity | Authentication/lookup and goroutine/queue growth | Per-frame and per-socket limits | Per-identity/global quotas and admission metrics |
| Low | Wire declaration drift | Payload declared but not accepted/sent, relay adds field | Incorrect generated clients/docs and silent compatibility errors | Unknown frames ignored | Single manifest and byte-level vectors under R11 |
| Low | OBS-1 metrics collapse kinds and omit pressure outcomes | Inbound RPC/invalid/unknown frame, response/heartbeat drop, or semaphore saturation | Distinct traffic maps to `other`; operators see connections but not why useful frames disappear | Connect/disconnect/wakeup/slow-eviction counters exist ([`metrics.go:5-31`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/internal/daemonws/metrics.go#L5-L31)) | Correct closed labels; per-class enqueued/dropped/coalesced, queue bytes, RPC latency/saturation, ack age |

## 15. Foldlab translation: adopt the laws, not the implementation

This section does not propose a second Foldlab runtime or change the store
language. R7 keeps programs as addressed content and hosts as code; R10 already
places transport failure, cancellation, backpressure, and progress in seam
signatures; R11 already requires one versioned manifest to own the wire
([`EFFECTS-BACKEND.md:111-118`](../../library/cas/EFFECTS-BACKEND.md),
[`EFFECTS-BACKEND.md:150-202`](../../library/cas/EFFECTS-BACKEND.md)).
The question is which Multica lessons sharpen those existing rulings.

### 15.1 Adopt

**FOLDLAB ASK F1 — keep pull as authority.** Ratify that a future push plane
carries only a payload-free or cursor-lower-bound “state may have advanced”
hint. On receipt, reconnect, duplication, gap, or timeout, the consumer calls
the existing authoritative read. This follows the estate's present event-service
law—notification never constitutes admission unless replay machinery is defined
above it—and the current streaming study's stronger `cas_word(since:n)` result
([`CONTEXT.md:443-454`](../../docs/effect-replay/CONTEXT.md),
[`agent-streaming-integrations.md:1181-1214`](agent-streaming-integrations.md)).

**FOLDLAB ASK F2 — name the uncertain outcome at every transport.** Require the
transport handler to expose these states, or another explicitly defined state
algebra:

```text
NOT_SENT          safe to choose another transport immediately
SENT_UNKNOWN      peer may have committed; reconcile or wait
COMMITTED(receipt)
REFUSED(reason)
```

For content-addressed put, `SENT_UNKNOWN` is harmless because re-put is
idempotent. For any future non-idempotent control operation, the manifest must
provide a stable operation ID and a read/reconcile path before automatic retry.
Foldlab's current serving law already names the same crash ambiguity and permits
retry only where the store operation is idempotent
([`SERVING.md:313-333`](../../library/effects/SERVING.md)).

**FOLDLAB ASK F3 — generation-scope every learned fact.** Capability set,
authentication lease, pending correlation table, and freshness stamps belong to
one connection generation. Reconnect starts unnegotiated. Add an authentication
epoch or maximum lease age so authority cannot outlive revocation indefinitely.

**FOLDLAB ASK F4 — make delivery class a manifest field.** For every message or
operation, R11's manifest should state:

- authority: hint, observation, or committed record;
- ordering key and sequence source;
- maximum encoded bytes, queue bytes, and concurrent instances;
- overflow action: coalesce, drop-and-reconcile, reject-before-send,
  disconnect, or durable retry;
- cancellation and sent-unknown behavior;
- retry identity and acknowledgement/cursor rule;
- protocol version, capability gate, and generation scope.

These are constraints and errors already owed by R11, not a new semantic layer.

**FOLDLAB ASK F5 — split hints from correctness-bearing records in memory.** A
hint may use a one-slot coalescing channel because its consumer re-reads truth.
An agent observation that affects the word, retry safety, or terminal judgment
must take a lossless route to a durable append/outbox. Queue saturation must
either backpressure or terminate with a typed refusal; it cannot silently erase
the evidence.

**FOLDLAB ASK F6 — sequence at observation, project later.** Assign the durable
source cursor when an accepted observation crosses the host seam. A coalesced
human-facing projection may merge adjacent text, but it should cite the covered
source interval. Tool output over the inline budget should become addressed
content with an explicit preview, length, and digest rather than a silent byte
slice. R7 makes this natural: large output is content; the stream carries its
address and bounded rendering.

**FOLDLAB ASK F7 — make liveness a vector.** Expose at least transport age,
authentication-lease age, last authoritative read/write success, last semantic
progress, oldest uncommitted outbox item, and process-tree ownership. “Serving”
is a process fact, not a substitute for any of those. Preserve the estate's
existing rule that unmeasured state is stated rather than encoded as zero
([`SERVING.md:281-311`](../../library/effects/SERVING.md)).

**FOLDLAB ASK F8 — standardize a provider-adapter conformance corpus.** Every
adapter should face the same executable traces:

1. success with explicit terminal evidence;
2. clean EOF before terminal evidence;
3. malformed frame and oversized frame;
4. cancellation before send, during tool execution, and after terminal frame;
5. output after nominal response but before pipe EOF;
6. saturated observation queue;
7. child exits while descendant holds a pipe;
8. restart after append commit but before acknowledgement;
9. duplicate append with the same logical ID;
10. interleaved text/thinking/tool chronology.

The adapter must declare which terminal witness it recognizes. “Exit zero” is
not the default witness.

**FOLDLAB ASK F9 — bind shutdown into the same contract.** Scope owns sockets,
response bodies, subscriptions, child trees, and outbox flush. Shutdown stops
admission, closes push with a restart reason, drains bounded correctness work,
records what remains uncommitted, then terminates the process tree. This extends,
rather than replaces, the existing remote-transport ownership obligations
([`CONTEXT.md:456-470`](../../docs/effect-replay/CONTEXT.md)).

### 15.2 Refuse

Foldlab should explicitly refuse these Multica shapes:

- an uncursored WebSocket or SSE feed as the authoritative history;
- random server row IDs without a logical append identity;
- sequence assignment at batch flush when source order is the claim;
- silent truncation or silent normalized-event loss;
- count-only buffering without a byte budget;
- a `connected` or `running` Boolean standing in for liveness;
- upgrade-time authentication with no lease or generation;
- two hand-maintained wire declarations;
- a timeout described as rollback without a judgment that proves no commit;
- correctness delivery that ends in a debug log.

The planned Foldlab event plane is already non-normative and explicitly
advisory; nothing here requires promoting it early
([`PROFILE-CAS-HTTP-0.md:260-267`](../../library/effects/PROFILE-CAS-HTTP-0.md)).

### 15.3 Ruling packet

Before any implementation, the operator would need to answer only these
contract questions:

1. Is `cas_word(since:n)` the sole authoritative resumption cursor, with push
   permanently advisory?
2. Does every correctness-bearing append require a stable logical ID and a
   highest-contiguous acknowledgement?
3. Which exact observations are correctness-bearing, and which are disposable
   progress hints?
4. Is authentication leased per connection generation, and what invalidates the
   lease?
5. Is source observation order preserved in the canonical record, with text
   coalescing only a cited projection?
6. Do oversized tool results become addressed content, and what bounded preview
   is allowed on the event plane?
7. What shutdown bound applies, and what durable state records work that did not
   flush before it?
8. Which adapter completion witnesses are admitted, and is process exit ever
   sufficient on its own?

Until those are grilled and entered in the owning specification, F1–F9 remain
recommendations only.

## 16. Verification performed for this study

The repository pin was fetched immediately before analysis. `HEAD`,
`origin/main`, and a clean worktree all resolved to
`7c0e750452599ef5ead020c8c787b32c512f2cd4`; the tree object was
`27061b3720ac2c0654540726206de2bd6d9c9bf2`. Tests used
`/opt/homebrew/bin/go`, observed as `go1.26.6 darwin/arm64`, which matches the
toolchain required by
[`server/go.mod:1-3`](https://github.com/multica-ai/multica/blob/7c0e750452599ef5ead020c8c787b32c512f2cd4/server/go.mod#L1-L3).

Executed from `/Users/pooks/Dev/multica/server`:

| Command or focused set | Observed result |
|---|---|
| `/opt/homebrew/bin/go test ./pkg/protocol` | **PASS**, package compiled; no test files. |
| `/opt/homebrew/bin/go test ./internal/daemonws` | **PASS**, 1.655 s. |
| Focused daemon tests for wake-up URL parsing, heartbeat freshness/HTTP fallback, WS message reading, RPC send state, queueing, runtime-gone recovery, transcript final flush/sequence continuation/cancellation, and idle watchdog | **PASS**, 2.430 s. |
| Focused agent tests for scanner bounds, stream-json terminal selection, Claude startup-pipe pressure, Codex final-answer selection/cancellation, OpenCode event reduction, and Qoder close/send race | **PASS**, 7.685 s. |
| Broader focused agent set | **FAIL** only at `TestCodexExecuteCleansUpWhenScannerOverflowsOnResume`: measured 5.368 s against a strict `<5 s` assertion. |
| Exact isolated rerun of that Codex test | **FAIL again**: 5.491 s against `<5 s`. |

Exact passing and isolated-failure commands:

```sh
/opt/homebrew/bin/go test ./pkg/protocol

/opt/homebrew/bin/go test ./internal/daemonws

/opt/homebrew/bin/go test ./internal/daemon -run \
  'Test(TaskWakeupURL|WSHeartbeatFreshnessSuppressesHTTP|ReadTaskWakeupMessages|WSRPCClient|WSOutbound|RuntimeGone|ExecuteAndDrain_(FlushesTranscriptBeforeReturningResult|SeqContinuesAcrossRetry|ContextCancelled_FlushesPendingTranscript|IdleWatchdog))' \
  -count=1

/opt/homebrew/bin/go test ./pkg/agent -run \
  'Test(AgentStreamScanner|StreamJSONBackendsFinalOutputBoundaries|FinalizeStreamResult|ClaudeExecuteDoesNotDeadlockOnStartupStdoutBurst|CodexRawItemAgentMessageFinalAnswer|CodexRequestPrefersContextCancellation|OpencodeProcessEvents|QoderMessageStreamDropsSendAfterClose)' \
  -count=1

/opt/homebrew/bin/go test ./pkg/agent -run \
  '^TestCodexExecuteCleansUpWhenScannerOverflowsOnResume$' \
  -count=1
```

The repeated Codex failure is evidence of a timing-bound miss in this
environment, not evidence by itself of the cause. The test's process did return;
the observed failure was elapsed time. It is recorded rather than normalized
away because cleanup latency is part of the streaming contract.

The first protocol compile attempt was sandbox-blocked from the existing Go
build cache. The identical command above was then rerun with that cache access
allowed and passed; the sandbox denial is not counted as a Multica test result.

No full database, Redis relay, browser reconnect, Windows Job Object, or
multi-node integration suite was run. The SQL atomicity case in §12 is therefore
**TEST-SOURCE**, not **TEST-RUN**. The Multica worktree remained clean after all
commands.

## 17. Conclusion

Multica's central architecture is more disciplined than the phrase “daemon
streaming” suggests: the socket is a disposable acceleration and the durable
server state remains the recovery authority. Its connection generations, per-runtime
freshness, sent-versus-unknown barrier, subprocess-tree teardown, and explicit
terminal frames are valuable patterns.

The implementation becomes fragile where those distinctions disappear:
provider-specific completion laws behind one result type, correctness events on
a silent-drop channel, source order assigned at flush, batches discarded after
one POST, and connection authority without a lease. Foldlab already has the
stronger foundation: addressed content, an authoritative durable word, seam
effects in signatures, and one generated protocol manifest. The practical
lesson is to use those existing laws to make loss, uncertainty, resumption,
ordering, and shutdown **data in the contract**, never behavior inferred from a
goroutine, queue, or log line.
