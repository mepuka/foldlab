# BACKEND SERVER ROBUSTNESS SWEEP — 2026-08-29 night

Probes run against a temp SQLite store in the scratchpad; the repo was not written to. Effect pin `4.0.0-rc.111` verified in `node_modules`, never docs.

**Headline: the store is crash-safe by construction and the audit found nothing that can corrupt it. The host is not live-safe. One defect (silent request loss on oversized frames) and one architectural hazard (the whole event loop stalls on a SQLite busy wait, invisibly) are both confirmed by probe. The daemon must not be built until the second is fixed, because a daemon converts a per-client stall into a global one.**

---

## Probe results

| Probe | Result |
|---|---|
| 40 concurrent `cas_put`, one stdio session | All 40 answered. Fiber ids `#62,#64,#66…` — **one forked fiber per request, unbounded**. Answers in dispatch order here, but that is incidental. |
| 5000-request burst, reading client | 5001 replies in 6.7 s (~740 put/s). RSS 82 MB → **310 MB**, ~46 KB per in-flight request, no bound. |
| 5000-request burst, client never reads stdout | 0 replies, RSS 272 MB, host alive. Outbound queue is unbounded (`RpcServer.ts:1281` + `Queue.ts:457`). |
| 4 MiB payload vs `maxNodeBytes` 1 MiB | Correctly refused `mcp/NodeTooLarge`. Session healthy. |
| 64 MiB payload (128 MiB frame) | `MaxBufferSizeExceeded: … maximum size of 16777216`, logged twice at ERROR. **No reply ever sent.** |
| Oversize frame, then healthy calls | id=1 **never answered**; id=2, id=3 answered normally. Session survives, request is silently lost. |
| 4 × `cas serve` processes, 1600 puts, one SQLite file | 1600/1600 answered, **zero SQLITE_BUSY**, 3.5 s. Cross-process WAL is safe. |
| External writer holds the write lock 4 s | **`tools/list` — which touches no SQL at all — waited the full 4 s.** No log line emitted for 6 s. The event loop was blocked. |
| `SIGKILL` mid-write, 688 KB dirty WAL, reopen | `integrity_check: ok`. 454 rows durable, only 172 acked to the client. **All 2097 rows load through the full read law: `verified=2097 failed=0`.** |

---

## Verdict 1 — LIVENESS + LOAD: two defects, one of them silent

**Concurrency is unbounded, by omission.** `RpcServer.make` defaults `concurrency` to `"unbounded"` (`node_modules/effect/src/unstable/rpc/RpcServer.ts:118-125`) and forks a fiber per request (`:353-360`). `McpServer` never passes the option — `node_modules/effect/src/unstable/ai/McpServer.ts:1117-1119` passes only `spanPrefix` and `disableFatalDefects`. There is no knob to reach; a bound must be added on our side.

**The size check is before the JSON parse — but the buffer is not.** `RpcSerialization.ts:136-139` checks line length before `JSON.parse`. It does so *after* `buffer += decoder.decode(bytes)` at `:131`, so a 128 MiB frame is fully materialized in memory before it is judged. Then `failMaxBufferSize` **throws** (`:58-64`) inside `Stream.runForEach`; the throw is sandboxed, logged, and retried every 500 ms (`RpcServer.ts:1295-1297`). **Nothing answers the client.** A 1 GB frame is the same story with 1 GB of transient heap. This is the audit's sharpest finding: an oversized request is not refused, it is *lost*, and a client without a timeout waits forever. Confirmed by probe (`recover` mode: id=1 never answered, id=2 and id=3 fine).

Note also a second, ungated `JSON.parse` inside the MCP wrapper at `McpServer.ts:1261` (`parser.decode(JSON.stringify(frame))`) — the 16 MiB gate is only the outer NDJSON one, and every frame is parsed twice.

**Ordering.** Within one session, answers are whatever the forked fibers finish first. The host's report already states ordering is the client's; the probe confirms nothing enforces it. That is correct for MCP and needs no change.

**Slow disk / SQLite contention — the real hang.** `@effect/sql-sqlite-bun/src/SqliteClient.ts:217-231`: one `Database`, one `Semaphore.make(1)`. No pool, no retry, no reconnect (grep for `retry|reconnect|Schedule` in that package returns zero). WAL and a 5-second `busy_timeout` are on by default (`:131-146`) — which is why the 4-process probe saw zero BUSY. But the module's own doc says the thing that matters (`:5-12`):

> "Busy waits block the event loop because `bun:sqlite` is synchronous."

The probe makes this concrete: with the write lock held elsewhere for 4 s, a `tools/list` request touching no database at all was starved for the entire 4 s, and the host emitted no log line for 6 s. **A SQLite stall is a total-process stall, and it is unobservable from inside the process** — no timer fires, no metric updates, no log flushes. Where it would hang: any writer contention (a second `cas serve`, litestream's own checkpointing, a slow network filesystem, a large WAL checkpoint). Worst case is `busy_timeout` = 5 s of full deafness per contended write.

**Where it would hang, ranked:** (1) SQLite busy wait — total stall, invisible; (2) oversized frame — permanent per-request hang, session healthy; (3) unbounded fan-out — 46 KB/request until OOM; (4) slow stdout reader — unbounded outbound queue growth.

---

## Verdict 2 — CRASHES + RESTARTS: safe by construction, verified

**What saves it.** Puts are content-addressed and idempotent, and the store re-verifies at load: `verifyNodeBytes` re-digests and re-decodes on every read (`library/effects/src/cas/Store.ts:135-157`, `:150`), and `Cas.Graph.verify` recomputes every address itself rather than trusting the store (`bin/cli/store.ts:283-287`). A torn or truncated byte string cannot be mistaken for content — it surfaces as `AddressMismatch`, fail-closed, and is repaired by re-putting the same bytes.

**Root update is atomic.** `SqlRootStore.ts:103-107` is a single `INSERT … ON CONFLICT (address) DO NOTHING` in autocommit — one SQLite statement, atomic by the engine. There is no multi-statement transaction anywhere in the estate (`grep withTransaction src bin scripts` → zero hits), so there is no half-committed state to recover. The file backend's publish is a zero-byte marker file (`FileBackend.ts:211-215`); its object write is temp-file + `link` (`FileBackend.ts:176-196`), atomic at the final path.

**Probe.** `SIGKILL` with a 688 KB dirty WAL: reopen recovered cleanly, `integrity_check: ok`, and **every one of 2097 rows loaded through the full read law**. 282 admissions were durable but never acknowledged — which is exactly the safe direction, because a re-put answers the same address.

**What actually needs work:** (a) **in-flight MCP calls are lost with no replay** — the client sees a closed pipe and cannot tell "not done" from "done, answer lost"; the CAS makes this harmless for puts (re-put is free) but the host says nothing about it; (b) **litestream replica lag is unbounded and unmeasured** — nothing reports the last successful replication, so a restore-from-replica silently loses the tail; (c) **no fsync discipline is asserted** for the file backend, so a power loss (not a process crash) can leave a linked-but-empty object — detectable at load, not preventable.

### Crash matrix

| Event | What breaks | What saves it |
|---|---|---|
| `SIGKILL` mid-put | In-flight answers lost; WAL dirty | WAL recovery on reopen; put idempotence; re-verify at load. **Probe: 2097/2097 verified** |
| `SIGKILL` mid-publish | Nothing | Single-statement `INSERT … ON CONFLICT DO NOTHING`, `SqlRootStore.ts:103-107` |
| Power loss, file backend | An object may be linked but short | Temp+`link` (`FileBackend.ts:176-196`); re-digest at load turns it into `AddressMismatch`, repairable by re-put |
| Client dies mid-session | In-flight calls lost, no notice | Idempotent puts. **Gap: no resume, no idempotency key on the wire** |
| Oversized frame | **Request silently lost forever** | **Nothing.** Defect — see verdict 1 |
| SQLite writer contention | Whole host deaf up to 5 s | `busy_timeout` prevents failure, not the stall. **Gap: no detector** |
| Disk full | `SqlError` → `BackendFailure` → typed refusal | Fail-closed; the store never claims an admission it did not make |
| litestream replica stale | Restore loses the tail | **Gap: lag unmeasured, and litestream has no TOOLS.md row** |
| Corrupted/hostile byte plane | Nothing is admitted as valid | Re-digest + canonical re-decode at every read; `SqlRootStore.ts:66,114` filters non-address rows out of listings |

---

## Verdict 3 — THE DAEMON: both, in that order, and mostly adopted

**(a) stdio-per-client, as it stands: SAFE, and today it is the *better* option.** Cross-process SQLite under WAL is fine at the current layer config — probe: 4 hosts, 1600 puts, zero BUSY, because the driver sets `busy_timeout = 5s` and `journal_mode = WAL` by default (`SqliteClient.ts:131-146`). Because each client gets its own process, an event-loop stall costs one client. That containment is real and it is free.

**(b) a long-lived daemon: the pieces exist, and Effect at the pin gives all of them.**
- The cas-http/0 semantic core is written and transport-free: `src/server/Core.ts` (`CasServerCore.layer` over `ByteReader | ByteWriter | RootStore | AddressScheme`), `src/server/HttpApp.ts:41-58` (the four-step shell), `src/server/Protocol.ts`. **The only missing piece is a bind.**
- The host: `@effect/platform-bun/src/BunHttpServer.ts:284` (`layer`), with `HttpRouter`/`HttpApi` in core at `effect/unstable/http` and `effect/unstable/httpapi`.
- MCP over HTTP: `McpServer.layerHttp` exists at `McpServer.ts:1315-1347` — single-endpoint Streamable HTTP, requires only `HttpRouter.HttpRouter`. Documented at `:1303-1307` as *not* implementing the legacy SSE topology, no event resumption, no session expiry.

So (b) is genuinely small — but **building it today multiplies the verdict-1 hazard**: one process multiplexing N clients over one event-loop-blocking SQLite connection means one contended write deafens everyone. **Sequence it after the liveness fix, not before.**

**(c) both — yes, and it is the answer.** stdio for local agents (containment, zero config, the launcher owns the lifecycle); daemon for browser and remote (decision 21's front-end lane needs a wire). They share `Core.ts` unchanged, which is the whole point of the existing split.

### Adopt-vs-build, per component (operator ruling: prefer well-regarded Rust/Go)

| Component | Verdict | Admission cost |
|---|---|---|
| **Semantic core** (admission, verification, roots) | **BUILD — never adopt.** Lean-authored semantics; the manifest boot gate exists to refuse a host that serves a table the estate did not emit (`bin/mcp/server.ts:144-160`) | — |
| **TLS / HTTP/1.1+2 termination, timeouts, connection limits, rate limits** | **ADOPT.** Caddy or nginx in front. This is where Rust/Go actually wins and where the estate has no business writing code | One TOOLS.md row, pinned version. Trust statement is easy: it moves bytes, judges nothing |
| **The bind itself (cas-http/0 + MCP-over-HTTP)** | **BUILD**, ~50 lines, because `Core.ts`/`HttpApp.ts`/`McpServer.layerHttp` already exist. Adopting a foreign MCP gateway here buys nothing — it would still call back into our handlers | — |
| **SQLite plane** | **ADOPT is the strong candidate.** libsql/turso's Rust server (`sqld`) removes the event-loop-blocking synchronous driver entirely by putting the database behind a socket — which is the direct fix for the head-of-line stall, not a workaround. Cost: an Effect `SqlClient` binding for the libsql wire, and a new network hop | One TOOLS.md row + pin. **Trust unchanged: the address is the certificate — a foreign host serving content-addressed bytes cannot lie, because `verifyNodeBytes` re-digests everything it returns (`Store.ts:150`)** |
| **Replication** | **ALREADY ADOPTED** — litestream (Go), `scripts/litestream-check.ts`, and the check already proves replicate→restore preserves every Lean-computed address | **GAP: litestream has ZERO rows in `docs/lab-core/TOOLS.md`** (0 matches across 29 rows) while being named in `bin/cli/commands.ts`'s own user-facing output. The ruling calls it "the standing precedent"; the register does not know it exists. Ruling ask R3 |
| **Observability** | **BUILD-BY-COMPOSITION.** `effect/unstable/observability` ships OTLP and Prometheus natively (`Otlp.layerJson`, `PrometheusMetrics.layerHttp`) — no `@effect/opentelemetry`, no foreign dependency. Adopt the *collector* (Go), not the client | Collector is a deployment artifact, not a gated-artifact producer — a light TOOLS.md row |

The trust law survives adoption intact, and it is worth stating plainly because it is what makes the operator's ruling safe here specifically: **content addressing makes the hosting plane untrusted by construction.** A fast foreign server can drop bytes, reorder them, or serve stale ones; it cannot forge them, because every read re-digests. That is a stronger property than most systems can offer an adopted binary, and it is why "prefer Rust/Go for hosting" costs the estate nothing in assurance.

---

## Verdict 4 — WASM

**(i) In-browser store — YES, and the composition is already right.** `layerKvsBackend` requires exactly `KeyValueStore.KeyValueStore` (`src/cas/KvsBackend.ts:109-113`); `layerSqlRootStore` requires exactly `SqlClient` (`src/cas/SqlRootStore.ts:126-129`); `AddressScheme.layerSha256` requires `Crypto`, backed by `crypto.subtle` which browsers have (`src/cas/Store.ts:395-414`). **A SQLite-wasm/OPFS build exposing an Effect `SqlClient` runs the entire existing store composition in a browser with zero changes to `library/effects/src`.** The one missing artifact is that `SqlClient` binding — there is no `@effect/sql-sqlite-wasm` at the pin; it must be written (small: the interface is `execute`/`executeValues`/`executeRaw` + an acquirer) or adopted. Effect also already ships `KeyValueStore.layerStorage` (`node_modules/effect/src/unstable/persistence/KeyValueStore.ts:839`) for localStorage — but it is `makeStringOnly`, so binary nodes go through base64 and localStorage's ~5 MB cap; it is a demo path, not the store. OPFS is the answer. **Coordinate with the front-end lane's question A: the backend feasibility verdict is unblocked-and-cheap.**

Two cautions worth passing along: SQLite-wasm's OPFS `SyncAccessHandle` VFS is synchronous and must run in a Worker, so the browser gets the *same* event-loop-blocking property unless the store lives in a Worker — architect it there from the start. And OPFS gives no cross-tab write lock, so exactly one writer tab.

**(ii) wasm hashing — NO, not on merit.** WebCrypto's `SHA-256` is native and hardware-accelerated (ARMv8 SHA extensions on this host); a wasm SHA-256 loses. Wasm becomes necessary only if the scheme changes to one WebCrypto does not have — and note `effect/Crypto`'s `DigestAlgorithm` admits only `SHA-1|SHA-256|SHA-384|SHA-512` (`node_modules/effect/src/Crypto.ts:38`), so **BLAKE3 cannot route through the existing `Crypto` service at all** and would arrive as exactly this: a Rust-compiled wasm module behind `AddressScheme`. That is the honest cost of scheme-1, and it is the one place where the Rust-adoption ruling and the hashing question meet.

**(iii) wasm Lean-checked verifier in the browser — research, cost unknown, but the shape is right.** `verifyNodeBytes` is pure over bytes; W-SEC client-side verification is the natural end state, and it is what makes a browser front end trustworthy without trusting the server. Lean→C→wasm via emscripten is the mainstream route and is not cheap. **Note as research; do not commission tonight.**

---

## Verdict 5 — HASHING: centralized as a *service* (virtue), unidentified on the *wire* (the real defect)

The seam is clean. `AddressScheme` is one service with one method — `digest: (canonicalBytes) => Effect<ContentId, StoreFailure>` (`src/cas/Store.ts:96-100`, `:284-298`), and **there are zero bypasses**: every production digest goes through it (`Store.ts:150`, `:236`; `Materialize.ts:140-141`; `CanonicalSchema.ts:737-740`; `Graph.ts:118-119`; `server/Core.ts:118`). No `createHash`, no `Bun.CryptoHasher`, no direct `crypto.subtle` outside the one `Crypto` implementation at `Store.ts:395-414`. The tests actually run non-SHA-256 schemes (`test/CasStore.test.ts:162-172`), which proves the seam is real and not decorative. The Lean side is genuinely abstract at `library/cas/Cas/Core/Address.lean:32` (`variable {Addr} (H : Bytes → Addr)`), with CAS-003's three-level lattice — Level 0 needing no premise, Level 1 naming `hInj` in the signature, **Level 2 deliberately empty and *proved* to be forced** (`Address.lean:82-86` exhibits a collapsing `H`).

**So: centralization is a virtue at the seam and is not a defect there.** The defect is one layer out, and it is threefold:

1. **The address carries no scheme identifier anywhere** — not on the wire, not in storage, not in the type. Bare lowercase 64-hex (`src/cas/Node.ts:23-26`), by explicit ruling (`PROFILE-CAS-HTTP-0.md:49-62`; H3 in `research/cas-scheme-0-hash-ruling.md`: "per-address agility buys nothing at one scheme"). That ruling is defensible while there is one scheme. Its consequence is not: **verification recomputes with the *ambient* service, never with a scheme named by the address** (`Store.ts:150` compares `address.digest(bytes)` to `id`, parsing nothing out of `id`). Under two same-width schemes, every cross-scheme read fails as `AddressMismatch` — reported as *content corruption*. The store stays fail-closed, which is correct, but **the diagnosis it produces would be actively misleading**, and that is the part worth ruling on.
2. **The 32-byte width is in the digest pre-image.** `src/internal/casCodec.ts:29,41-46` allocates `10 + payload + refs.length * 33` — a 33-byte ref record, 1 tag byte + 32 raw address bytes. A wider digest changes every node's bytes, hence its address, transitively, for the whole graph. There is no in-place migration; it is a byte-plane rewrite. The Lean model mirrors the commitment: `Addr32` at `Cas/Core/Node.lean:27` and throughout, so the model is algorithm-agnostic but **width-committed**.
3. **The two schemes could not be told apart in storage.** `cas_objects(id, value, value_type)` and `cas_roots(address TEXT PRIMARY KEY)` — no scheme column, no migrations anywhere, `CREATE TABLE IF NOT EXISTS` as a composition step (`SqlRootStore.ts:78,94-98`).

**Verdict: do not abstract further. The `AddressScheme` service already IS the abstraction seam and it is well-placed.** What is missing is not abstraction, it is *identification*. If the operator wants scheme-1, the enumerated cost — the service swap is items 4–9 of roughly 31 — is:

- **Same width (BLAKE3-256):** governance (a new profile revision + a superseding H-docket + `library/cas/REGISTRY.md`), a new `makeBlake3Address` beside `makeSha256Address` (`Store.ts:162-181`) which **cannot use `effect/Crypto` and needs a wasm/native dependency**, the `!== 32` width assertion at `Store.ts:174-177`, and then the part that does not exist yet: **inventing scheme identification** across `Node.ts:23-26`, `Backend.ts:103-108`, `SqlRootStore.ts:66,95,114`, `FileBackend.ts:57,129-137`, `server/Protocol.ts:188`, `bin/cli/store.ts:398`. Plus the byte-gated artifacts that fail on any rename: `Cas/Schema/System.lean:210,220` pins the literal string `"AddressScheme.layerSha256"` inside a gated JSON string, and `test/generated/EmittedLayers.ts:29-40` mirrors it. Plus regenerating all seven vector fixtures and `library/cas/vectors/index.json`.
- **Different width (SHA-512):** all of the above, plus `casCodec.ts` and `internal/wire.ts:138` and the `4 + 32·N` key-list framing — a full byte-plane rewrite — plus generalizing `Addr32` through `Cas/Grammar/Tree.lean`, `Cas/IR/Word.lean`, `Cas/Core/Admission.lean`.

`Cas/Core/Address.lean` itself needs **no change**. That is the design working.

---

## Minimum telemetry wiring (decision 20)

Everything below is Effect-native at the pin. No new dependency, no new abstraction.

**The non-obvious constraint that shapes the whole recommendation: a blocked event loop cannot report that it is blocked.** Any in-process metric, span, or log is silent exactly when you most need it. So the minimum wiring must include something whose *absence* is the signal.

1. **A heartbeat that doubles as the stall detector.** A forked fiber logging one logfmt line every 2 s carrying `Metric.snapshot`. If the line is missing or late, the loop was blocked — and the gap size *is* the stall duration. This is ~15 lines and it is the only thing in this list that detects the verdict-1 hazard. `Metric.snapshot: Effect<ReadonlyArray<Snapshot>>` (`Metric.ts:4052`); `Logger.formatLogFmt` is already installed (`bin/mcp/server.ts:88-90`).
2. **Four metrics.** At this pin the API is `Metric.counter(name, opts)` / `Metric.gauge` / `Metric.timer`, mutated with **`Metric.update(metric, value)`** — there is no `Metric.increment` and no `metric(...)` wrapper. `MetricRegistry` is a `Context.Reference` with a default (`Metric.ts:1640-1643`), so **no layer is required**.
   - `cas.host.inflight` — gauge. The one number that says whether the 46 KB/request growth is running away.
   - `cas.host.calls` — counter, attributed by tool and outcome.
   - `cas.store.sql_wait` — timer around the SQL path. The head-of-line stall's own measurement.
   - `cas.host.refused` — counter by clause.
3. **Spans are already free.** 35 `Effect.fn("…")` call sites in `src`/`bin` already name spans (`KvsBackend.loadBytes`, `SqlRootStore.publish`, `CasServerCore.upload`, …), and `RpcServer.ts:322-346` wraps every request in `McpServer.<tag>`. **The estate is fully instrumented for tracing and exports nothing** — zero `Metric.`, zero `withSpan`, zero `Otlp` in `src`/`bin`. The whole cost of turning tracing on is one layer at the composition.
4. **Export, when a wire exists.** `Otlp.layerJson({ baseUrl, resource })` needs only `HttpClient` (`unstable/observability/Otlp.ts:129`); `PrometheusMetrics.layerHttp()` needs `HttpRouter` (`PrometheusMetrics.ts:184`) and therefore lands with the daemon, not with stdio. On stdio, item 1 is the export.

This is also the honest first step toward decision 20's hoover: it makes the host's events a *stream with order*, which is what the hoover is meant to consume. It mints nothing the hoover would have to unwind.

---

## Ruling asks

- **R1 — Oversized frames must be answered, not dropped.** The estate's own law is that every refusal carries its clause; `MaxBufferSizeExceeded` breaks it silently. This is an upstream defect in `RpcSerialization.ts:58-64` + `RpcServer.ts:1295-1297` (throw → sandbox → retry, no reply). Ask: rule whether we (a) file upstream and pin the behavior in a test, (b) cap `maxNodeBytes × 2 + slack` below 16 MiB in `ServePolicy` so our own cap always fires first and the client always gets `mcp/NodeTooLarge`, or both. **(b) is a one-line config discipline and closes the hole for well-formed clients today.**
- **R2 — In-flight concurrency needs a bound, and the bound needs a home.** `ServePolicy` currently has no field for it (`bin/cli/store.ts:22-28`). Adding one is additive and per the entity-store workflow law wants a ruling before it is minted. Ask: `maxInFlight` in `ServePolicy`, or an unconfigured constant?
- **R3 — litestream needs a TOOLS.md row.** It is named in `bin/cli/commands.ts`'s user-facing output and has a whole verification script, and it has **zero rows** in `docs/lab-core/TOOLS.md`. The 17/22 addendum calls it the standing precedent for adoption; the register should say so before it is cited as one.
- **R4 — Rule the daemon's sequencing explicitly:** liveness fix first, bind second. Recorded here so the front-end lane does not pull the daemon forward.
- **R5 — Scheme identification is a ruling, not a refactor.** Confirm scheme-0's no-prefix ruling stands, and rule on the narrow consequence: should a digest mismatch be able to *say* "possible scheme mismatch" rather than only "corrupt content"? That is a message, not a format change, and it is the cheap half of the problem.
- **R6 — libsql/sqld as the SQLite plane** is a genuine architectural fork (it removes the stall by construction rather than mitigating it). Worth its own scout before anything is built.

---

## ONE SLICE TO COMMISSION

**BS-1 — "the host cannot stall silently."** One vertical slice in `library/effects/bin/mcp/` plus one field in `bin/cli/store.ts`. No new abstractions: Effect's own `Semaphore` and `Metric`, the existing logfmt logger, the existing `ServePolicy`.

1. A **heartbeat fiber** in `layerServe` (`bin/mcp/server.ts:193-205`): every 2 s, one logfmt line carrying `Metric.snapshot`. A missing line is a detected stall — the only mechanism in this report that catches the head-of-line hazard.
2. A **`Semaphore`** around the store-touching handlers in `layerHandlers` (`bin/mcp/handlers.ts:87`), sized from `ServePolicy` per R2. Bounds the 46 KB/request growth measured above.
3. The **four metrics**, updated at the points that already log.
4. A **`readonly: true` second `SqlClient`** for the read path in `layerSqliteCasAt` (`bin/cli/store.ts:226-243`) — the driver documents that readonly clients are unaffected by the `BEGIN IMMEDIATE` write-lock serialization (`SqliteClient.ts:5-12`), so reads stop queueing behind writers for free.
5. Pin `maxNodeBytes` under the 16 MiB frame cap per R1(b).

**Measured by re-running these exact probes**: the head-of-line probe must show `tools/list` answered during the lock hold; the burst probe must show bounded RSS; the oversize probe must show a `mcp/NodeTooLarge` refusal instead of silence. The probe scripts are in the scratchpad and are the slice's ready-made regression suite.

Why this and not the daemon: the daemon is ~50 lines because `Core.ts`, `HttpApp.ts`, and `McpServer.layerHttp` already exist — it will stay cheap. But building it first turns a one-client stall into an all-clients stall, and BS-1 is its precondition, not a detour around it.

---

*One note outside scope: `git status` shows `UU library/cas/surface/cas-surface.json` — an unmerged path that appeared during this session, not from this audit (the repo was not written to). Someone's in-flight work may need attention.*
