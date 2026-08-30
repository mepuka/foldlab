# SERVING — how the store is served, and what each venue trusts

Status: operational law for the serving plane, 2026-08-29 (decision 26
seat 1). Companion to
[library/effects/PROFILE-CAS-HTTP-0.md](../../library/effects/PROFILE-CAS-HTTP-0.md)
(the wire profile, normative) and
[.staging/operational-structure/BACKEND-ROBUSTNESS.md](../../.staging/operational-structure/BACKEND-ROBUSTNESS.md)
(the probed audit this plane was built against). Nothing here is
semantic authority: the store law lives in Lean, the wire law in the
profile, and this document says how to RUN them.

Drift law: the factual vocabularies below — routes, policy fields,
offered protocol revisions, metric ids, projection names, log fields
— are DERIVED from values the code exports, and
`library/effects/test/ServingDoc.test.ts` re-derives them against
this file on every test run: a fact here that drifts from the estate
is a red gate, not a stale sentence. The judgment prose is
hand-written; the facts are checked.

## The two hosts

One store, two hosts, one law. Both gate on the emitted tool manifest
at boot (`bin/mcp/manifest.ts`) — a host that cannot prove it serves
the estate's own table refuses to start, on every transport.

| Host | Verb | Transport | For |
|---|---|---|---|
| stdio host | `cas serve` | MCP over stdio (NDJSON) | local agents; the launcher owns the lifecycle; per-client process containment |
| daemon | `cas daemon` | one HTTP port, both planes | browsers, remote agents, anything that dials |

The stdio host stays the better choice for local agents even with the
daemon standing: each client gets its own process, so an event-loop
stall (the audit's verdict-1 hazard) costs one client, not all of
them. The daemon exists for the callers stdio cannot reach.

### The daemon's port, surface by surface

| Route | Plane | What it is |
|---|---|---|
| `/cas/{hex}`, `/roots/{hex}`, `/control/…` | cas-http/0 | the profile's data, roots, and control spaces — the BYTE plane, for bulk reads, uploads, and sync (§6 `/control/missing`, §7 publish). First bind of the transport-free core (`src/server/Core.ts`) |
| `/mcp` | MCP over HTTP | the same five tools the stdio host serves, same handlers, same manifest gate. Streamable HTTP, POST-only |
| `/metrics` | host | Prometheus exposition (decision 20's first production sensor) |
| `/projections`, `/projections/{name}` | host | the emitted, byte-gated JSON artifacts, served read-only — tier 0 of the front end: `cas-tools.json`, `cas-surface.json`, `cas-obligations.json`, `schema-index.json`, `schema-addresses.json`, `schema-verdicts.json`, `environment.json` |
| everything else | cas-http/0 | the wildcard hands every unclaimed exchange to the profile's own wire law, so refusals are the STATUS TABLE's (400/405), never a router 404 |

The two planes stay distinct on purpose: cas-http/0 is the byte plane
(content-addressed octets, capability document, presence, publish);
MCP is the tool plane (documents in, documents out). One does not
grow the other's verbs.

## Running it

```sh
# stdio only (an MCP client launches this as a child)
cas serve --store /path/to/store

# daemon only, loopback, policy port
cas daemon --store /path/to/store

# both, one store: WAL makes cross-process sharing safe (audit probe:
# 4 processes, 1600 puts, zero SQLITE_BUSY; cross-PLANE probed in
# test/DaemonHttp.test.ts)
cas serve  --store /path/to/store &
cas daemon --store /path/to/store
```

Flags the daemon adds: `--port` (one-invocation override; `0` asks
the OS), `--host` (default `127.0.0.1` — widen only behind the
proxy), `--otlp <baseUrl>` (OTLP/JSON export), `--allow-origin`
(comma-separated browser origins; see security), `--allow-host`
(comma-separated extra Host names; see the proxy section).

### `ServePolicy`, honored per transport

`cas init` writes the policy into the store's `config.json`; each
host rules every field out loud at startup.

| Field | stdio | daemon |
|---|---|---|
| `port` | ignored (says so) | honored; `--port` overrides |
| `maxNodeBytes` | honored, clamped under the 16 MiB frame cap | honored on BOTH planes, same clamp, one published cap |
| `maxInFlight` | honored (one semaphore) | honored PER PLANE (two gates; worst case 2× store-touching calls — stated at startup) |
| `maxBatchKeys` | not applicable | honored (`/control/missing`) |
| `anonymousReads: false` | REFUSES at boot | REFUSES at boot (see below) |

**Refuse-first, in the MCP spec's own terms.** The spec's
authorization posture for HTTP transports is that credentials ride
`Authorization` over a secured channel; this daemon terminates no TLS
(the proxy does), so serving a credential-gated store would either
put a bearer secret on cleartext loopback HTTP or silently drop the
gate. It does neither: `anonymousReads: false` is a typed refusal at
boot (`daemon/CredentialedPolicyUndaemonable`); `credentialEnv`, when
the config names one, only sharpens that refusal's message today — it
is the seam the future credentialed host reads. Credentialed reads
are a named non-goal of daemon v0 and arrive as their own ruled slice.

## Security posture (the daemon's front door)

The MCP spec's transport-security guidance names the local-daemon
attack: a malicious web page scripting requests at a localhost
server, cross-origin or via DNS rebinding. The daemon's whole port —
not just `/mcp` — holds the spec's line:

- **Bind loopback by default.** `--host 0.0.0.0` is an explicit act,
  and belongs behind the proxy.
- **Origin allowlist, empty by default.** Any request carrying an
  `Origin` outside `--allow-origin` answers 403 on every plane
  (the pin's MCP adapter enforces the same on its own route — defence
  in depth). Same-origin requests (the daemon's own pages) pass
  without an entry; non-browser clients send no Origin and are
  untouched. Allowed origins get real CORS: answered preflight,
  `access-control-allow-origin`, session headers exposed.
- **Host allowlist.** A request whose `Host` names neither loopback,
  the bound host, nor an `--allow-host` entry answers 403 — DNS
  rebinding arrives at 127.0.0.1 wearing the attacker's Host.
- **No tokens in URLs**, per spec: the profile carries credentials
  only in `Authorization` (§9), and the daemon serves no credentialed
  flow at all yet.
- **Slow-loris / idle connections:** the platform closes connections
  idle past 30 s (stated in the composition, not defaulted).
- **Oversized bodies:** `maxRequestBodySize` = 16 MiB (the same
  number as stdio's frame cap, one clamp discipline) — Bun REFUSES
  over-cap bodies with an HTTP status. On this transport nothing is
  silently lost even past the cap; this is also the TOTAL-body bound
  stdio lacks (below).

## TLS and the front proxy (adopted, not built)

Decision 17/22: TLS termination, rate limits, and connection caps are
the adopted proxy's job (Caddy or nginx — well-regarded, Rust/Go
plane). The trust story survives adoption because **the address is
the certificate**: every read re-digests, so a hosting plane that
moves bytes cannot forge them (BACKEND-ROBUSTNESS verdict 3; SPECS
decision 22 addendum). The proxy judges nothing.

```caddy
cas.example.internal {
    reverse_proxy 127.0.0.1:8080
    # Caddy preserves the public Host by default; tell the daemon to
    # accept it (or rewrite: header_up Host 127.0.0.1):
    #   cas daemon --allow-host cas.example.internal
}
```

Behind the proxy the daemon still binds loopback. Browser front ends
served from another origin need that origin in `--allow-origin`.

## The protocol ceiling (a stated pin, not an accident)

Both hosts offer, newest first: **2025-11-25, 2025-06-18,
2025-03-26, 2024-11-05** — one shared list
(`bin/mcp/server.ts` `offeredProtocols`), the newest the pinned
`effect@4.0.0-rc.112` adapter carries. The HTTP endpoint is the
single-endpoint Streamable HTTP topology; the adapter implements no
legacy HTTP+SSE, no GET SSE stream, no `Last-Event-ID` resumption, no
session expiry (its own documented scope).

**Revision 2026-07-28 is NOT offered** (verified against the spec's
changelog, 2026-08-29): it is the stateless rewrite — protocol
sessions and `Mcp-Session-Id` removed (SEP-2567); the
`initialize` handshake replaced by per-request `_meta` and a
mandatory `server/discover` RPC (SEP-2575); SSE resumability removed
(a broken stream means re-issue the request); Roots/Sampling/Logging
deprecated (SEP-2577); required `Mcp-Method`/`Mcp-Name` headers on
HTTP POSTs. Offering it means a new adapter at a new pin — an
upstream event, tracked in OWED. The stateless direction is GOOD for
this daemon (the session-map growth noted under telemetry disappears
with sessions themselves).

## Telemetry

Scraped at `/metrics`; exported as OTLP/JSON (logs+metrics+traces)
with `--otlp <baseUrl>`; and carried in-band by the heartbeat.

| Metric | Kind | Where | Meaning |
|---|---|---|---|
| `cas.host.inflight` | gauge | both hosts | MCP store-touching calls past the admission gate |
| `cas.host.calls` | counter (tool, outcome) | both | every tool call, by how it ended |
| `cas.host.refused` | counter (clause) | both | typed refusals, by clause |
| `cas.store.sql_wait` | timer | both | the SQL path including the wait — the head-of-line stall's own measurement |
| `cas.daemon.request` | timer (plane) | daemon | request duration by plane |
| `cas.daemon.inflight` | gauge | daemon | the cas-http/0 plane's own gate |
| `cas.daemon.rss_bytes` | gauge | daemon | resident memory — the sensor for what cannot be bounded from inside (the pin's HTTP session map only grows: `McpServer.ts:2314` sets, nothing deletes; watch the slope) |
| `cas.replica.age_ms` | gauge | daemon | litestream replica staleness; `-1` = unmeasured, and the log says why |

**The heartbeat is the stall detector.** One logfmt line every 2 s
carrying the full metric snapshot; `lateMs` is the measured stall,
and a MISSING beat is a stall in progress — the only sensor that
works when the event loop is blocked, because it is the absence of
output. Same discipline, both hosts.

**Replica lag, exactly:** where `config.json` names a `backup.target`
that is a local path (or `file://` URL), a sampler stats the replica
every 5 s and the gauge is now − newest write. No target configured,
or a remote scheme (s3/abs/sftp): the gauge reads `-1` and one
startup line names the reason — scrape litestream's own metrics
endpoint for remote replicas. Unmeasured is always a statement,
never a silent zero.

## The log stream (the hoover floor, decision 20)

logfmt on stderr, both hosts. These fields are STABLE — the future
logging hoover ingests them without guessing, so renaming one is a
versioning event:

- `message=request` (daemon, one per exchange): `seq` (per-boot
  monotone — total event order even within one millisecond), `plane`
  (`cas-http/0` | `mcp` | `metrics` | `projections`), `method`,
  `path`, `status` (a number, or `unhandled`), `ms`, and on refused
  exchanges `refused=host|origin` with the offending value.
- `message=heartbeat` (both): `elapsedMs`, `lateMs`, `metrics` (the
  rendered snapshot).
- per-tool lines (both, from the handlers): `tool`, plus the
  outcome's own fields (`address`, `tag`, `payloadBytes`, …).
- `message="daemon serving"` / `message=serving` (boot banner):
  effective policy, bound address, offered protocols, origins/hosts
  posture, heartbeat period.

## Crash, restart, shutdown — the honest semantics

The store is crash-safe by construction (audit verdict 2: 2097/2097
verified through the full read law after SIGKILL with a dirty WAL).
The crash matrix rows now covered by STANDING TESTS
(`library/effects/test/DaemonHttp.test.ts`,
`test/McpBackpressure.test.ts`, `test/RpcFrameCapPin.test.ts`):
SIGKILL mid-put under load with reopen-and-verify and
restart-and-serve; cross-plane WAL under multiplexed load (HTTP ×2
planes + a real stdio child on one file); oversize refused on every
surface; the upstream frame-cap loss pinned at the serialization
seam; SIGTERM as a handled drain; the front-door refusals; replica
lag measured and unmeasured.

**In-flight loss.** A client whose host dies mid-call cannot
distinguish "not done" from "done, answer lost" — there is no resume
and no idempotency key on the wire, on either transport. The store
makes this harmless where it matters: puts are content-addressed and
idempotent, so THE RECOVERY IS RE-PUT — same bytes, same address,
free. Reads are trivially re-issued. Publish is idempotent
(`INSERT … ON CONFLICT DO NOTHING`). Design clients accordingly.

**Shutdown.** SIGINT/SIGTERM interrupt the runtime; the server
layer's finalizer performs Bun's graceful stop — stop accepting,
drain in-flight, force-close at 10 s — and the process exits 130 (the
runtime's interruption exit). Honesty note: a handler that never
completes can hold `server.stop()` open past the preemptive bound at
this pin; give the supervisor its own hard stop (systemd
`TimeoutStopSec=15` and the default SIGKILL escalation covers it).

**The stdio total-frame guidance.** BS-1's clamp is per NODE. A
`cas_run` document carrying many within-cap instructions can still
exceed the 16 MiB stdio frame, and on stdio that frame is LOST (the
pinned upstream behavior). Split large runs — or send them to the
daemon, whose body cap REFUSES with a status instead. Bounding a
run's total size as policy is a fenced ask (a `ServePolicy` field and
possibly a manifest row — the handler lane's seat).

**Power loss (file backend).** No fsync discipline is asserted: a
power cut (unlike a process crash) can leave an object linked but
short. The temp-file + `link` publish (`FileBackend.ts`) makes this
DETECTABLE, not preventable — the read law re-digests, the torn
object surfaces as `AddressMismatch`, and re-put repairs it.
Fail-closed, never silent.

## The litestream sidecar

```sh
litestream replicate /path/to/store/cas.db file:///backups/cas-replica
# restore drill (do this on a schedule, not in an emergency):
litestream restore -o /tmp/restored.db -integrity-check full file:///backups/cas-replica
bun scripts/litestream-check.ts verify /tmp/restored.db addresses.json
```

One file carries both tables (`cas_objects`, `cas_roots`), so bytes
and the names that name them replicate together or not at all.
`scripts/litestream-check.ts` proves replicate→restore preserves
every Lean-computed address. Name the replica in `config.json`
(`backup.target`) and the daemon measures its staleness (above).
Never file-copy or commit a live WAL database.

## OWED — honest and tracked

- **Credentialed reads over HTTP** — refuse-first stands; the
  credentialed slice needs the proxy TLS story plus §9's server
  clauses, as its own ruling.
- **MCP protocol revision 2026-07-28** — needs the stateless adapter
  at a future effect pin (`server/discover`, per-request `_meta`, no
  sessions); the ceiling above is the stated pin until then.
- **libsql/sqld as the SQLite plane** (audit ask R6) — removes the
  event-loop stall by construction; scout owed, wave 3.
- **litestream's TOOLS.md row** (audit ask R3) — the register still
  lacks it; the package seat owns the row.
- **Upstream session expiry** (or the 2026-07-28 adapter that
  obsoletes it) — until one lands, `cas.daemon.rss_bytes` is the
  watch and restart cadence the mitigation.
- **Run-size policy field** (total-frame bound as policy) — fenced to
  the handler/manifest lanes.
