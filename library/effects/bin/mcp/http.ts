/**
 * The daemon host — both planes on one port.
 *
 * `cas daemon` is the long-lived sibling of `cas serve`: one Bun HTTP
 * server binding the two wire surfaces the estate already ratified,
 * over the SAME store composition and under the SAME boot-time
 * manifest gate as the stdio host. Nothing semantic is minted here —
 * this file is the bind the audit priced at ~50 lines, plus the
 * production discipline around it.
 *
 * ## The two planes, one port
 *
 * - **cas-http/0** — the profile's three resource spaces (`/cas/{hex}`,
 *   `/roots/{hex}`, `/control/…`), served by the existing transport-free
 *   core (`src/server/Core.ts` under `src/server/HttpApp.ts`) through a
 *   wildcard route. This is that core's first bind ever. The wire law
 *   stays total: an unknown path or wrong method is the PROFILE's
 *   refusal (400/405 from the status table), not a router 404, because
 *   the wildcard hands every unclaimed exchange to `decide`.
 * - **MCP over HTTP** — `McpServer.layerHttp` at `/mcp`: the
 *   single-endpoint Streamable HTTP topology at the pin (no legacy
 *   two-endpoint SSE, no event resumption, no session expiry — the
 *   adapter's own documented scope). The tool table is the SAME
 *   `casToolkit` the stdio host serves, behind the SAME
 *   `layerHandlers` gate, after the SAME manifest agreement check —
 *   the gate is transport-independent law.
 *
 * Two more routes share the port and are host surface, not protocol:
 * `/metrics` (Prometheus exposition, decision 20's first production
 * sensor) and nothing else. Everything unclaimed falls to the profile.
 *
 * ## The `ServePolicy`, honored for real this time
 *
 * The stdio host ruled each field explicitly and refused what stdio
 * cannot honor. The daemon is the transport most of those numbers were
 * written for:
 *
 * - `port` — HONORED. The bind address; a `--port` flag overrides for
 *   one invocation without rewriting the store's config.
 * - `maxNodeBytes` — HONORED on BOTH planes, and CLAMPED under the
 *   transport frame cap exactly as stdio clamps it. On the MCP plane a
 *   payload crosses as hex inside a JSON body, so `2 × maxNodeBytes +
 *   slack` must stay under the body cap for the host's own
 *   `mcp/NodeTooLarge` to fire first; the cas-http/0 plane carries raw
 *   octets and the same effective number becomes the capability
 *   document's published bound, so the two planes publish ONE cap.
 * - `maxInFlight` — HONORED, PER PLANE. The MCP plane's bound is the
 *   semaphore inside `layerHandlers` (BS-1); the cas-http/0 plane gets
 *   its own semaphore of the same size here. The store can therefore
 *   see at most `2 × maxInFlight` store-touching calls when both
 *   planes saturate — said out loud at startup rather than hidden,
 *   because one shared gate would mean reaching into the handler
 *   layer's internals, and that layer is another lane's file.
 * - `maxBatchKeys` — HONORED on the cas-http/0 plane (the
 *   `/control/missing` batch bound the field was written for). Still
 *   not applicable to MCP, exactly as on stdio.
 * - `anonymousReads: false` — REFUSED AT BOOT, exactly as stdio
 *   refuses it (the refuse-first ruling). The protocol layer under
 *   `src/server/Protocol.ts` can check a bearer credential, but a
 *   credentialed HTTP story is a named NON-GOAL of `cas daemon` v0:
 *   serving it would put a secret on a wire this host has no TLS for —
 *   TLS is the adopted front proxy's job (see docs/lab-core/SERVING.md)
 *   — so a store that gates reads is not served until the credentialed
 *   story lands as its own ruled slice.
 *
 * ## The frame cap
 *
 * On stdio the transport's 16 MiB NDJSON cap LOSES an oversized
 * request (the audit's sharpest finding). On HTTP the equivalent cap
 * is Bun's `maxRequestBodySize`, which this host pins to the SAME
 * number — and Bun REFUSES an oversized body with an HTTP error
 * instead of dropping it, so on this transport even the over-cap case
 * is an answer, never silence. The clamp keeps the host's own typed
 * refusals (`mcp/NodeTooLarge`, the profile's 413) firing before the
 * transport's for every payload the policy admits.
 *
 * ## Vital signs
 *
 * The stdio heartbeat discipline extends unchanged: `layerHeartbeat`
 * beats every 2 s carrying the metric snapshot, and a missing beat IS
 * a detected stall. The daemon adds three sensors of its own —
 * `cas.daemon.request` (request duration, attributed by plane),
 * `cas.daemon.inflight` (the wire plane's own gauge, beside the MCP
 * plane's `cas.host.inflight`), and `cas.replica.age_ms` (how far the
 * litestream replica is behind, where the config names a local one;
 * `-1` when unmeasured, and the log says why). All of it is scraped at
 * `/metrics`, and `--otlp <baseUrl>` exports logs, metrics, and spans
 * as OTLP/JSON besides.
 *
 * ## Logs
 *
 * logfmt on stderr, same as stdio. Every request is answered by one
 * `request` line — seq, plane, method, path, status, ms — where `seq`
 * is a per-boot monotone counter, so a reader can reconstruct event
 * order even when two lines share a millisecond. The MCP handlers'
 * own per-tool lines (tool, address, outcome) arrive between them,
 * exactly as they do on stdio. The field vocabulary is documented in
 * docs/lab-core/SERVING.md; it is the first sensor of decision 20's
 * logging hoover, so the fields are STABLE — a rename is a versioning
 * event for whatever learns to read them.
 *
 * ## The front door (MCP security guidance, applied to the whole port)
 *
 * The MCP spec's transport security guidance names the local-daemon
 * attack precisely: a malicious web page scripting requests at a
 * localhost server, either cross-origin or through DNS rebinding. The
 * pin's own MCP endpoint already refuses any browser `Origin` it was
 * not told to allow; this host extends that exact posture to EVERY
 * route on the port, plus the Host-header check the rebinding attack
 * requires:
 *
 * - A request whose `Host` does not name a loopback host, the bound
 *   host, or a `--allow-host` entry is refused 403 — a DNS-rebinding
 *   request arrives at 127.0.0.1 carrying the attacker's own Host.
 * - A request carrying an `Origin` outside `--allow-origin` is refused
 *   403 on every plane. No origins are allowed by default; non-browser
 *   clients send no Origin and are unaffected.
 * - An allowed origin gets real CORS: the preflight is answered and
 *   the response carries `access-control-allow-origin`, which is what
 *   lets the browser front end read this host's projections.
 *
 * ## Projections — tier 0 of the front end
 *
 * The emitted, byte-gated JSON artifacts are served read-only under
 * `/projections/…` (index at `/projections`): the tool manifest, the
 * surface and obligations ledgers, the schema index, the environment
 * ledger. The daemon SERVES these files and never authors them — they
 * are the Lean emitters' output, read from disk per request so a
 * regenerate is visible without a restart.
 *
 * ## Shutdown
 *
 * SIGINT/SIGTERM interrupt the runtime, and the server layer's
 * finalizer performs Bun's graceful stop: stop accepting, drain
 * in-flight requests, then force-close at the timeout. In-flight MCP
 * calls that do not finish in time are LOST WITHOUT NOTICE to the
 * client — the same in-flight-loss semantics as a crash — and the
 * store-side recovery is the same: puts are idempotent, re-put is
 * free (SERVING.md states this on the wire surface).
 */
import { BunHttpServer } from "@effect/platform-bun"
import {
  Clock,
  Duration,
  Effect,
  Exit,
  FileSystem,
  Layer,
  Metric,
  Option,
  Path,
  Schema,
  Semaphore,
} from "effect"
import { McpServer } from "effect/unstable/ai"
import {
  FetchHttpClient,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http"
import { Otlp, PrometheusMetrics } from "effect/unstable/observability"
import { Server } from "../../src/index.ts"
import type { ServePolicy } from "../cli/store.ts"
import { layerHandlers } from "./handlers.ts"
import {
  frameSlackBytes,
  gateOnManifest,
  type HostLimits,
  maxServableNodeBytes,
  offeredProtocols,
  serverIdentity,
  transportFrameBytes,
} from "./server.ts"
import { heartbeatInterval, layerHeartbeat } from "./telemetry.ts"
import { casToolkit } from "./tools.ts"

/* ── the port's address space ────────────────────────────────────── */

/** Where MCP-over-HTTP answers. One POST endpoint, per the pin's
 * Streamable HTTP adapter; other methods on it answer 405. */
export const mcpPath = "/mcp"

/** Where Prometheus scrapes. */
export const metricsPath = "/metrics"

/** Where the emitted JSON artifacts are served read-only — tier 0 of
 * the front end. */
export const projectionsPath = "/projections"

/** The one cas-http/0 read served outside the admission gate — it
 * touches no store, and a saturated store must not make the host look
 * dead to a client asking what it serves (the same ruling that keeps
 * `tools/list` outside the stdio gate). */
const capabilitiesPath = "/control/capabilities"

/** Which plane answered a path — the attribute every request metric
 * and request log line carries. */
const planeOf = (path: string): string =>
  path === mcpPath
    ? "mcp"
    : path === metricsPath
    ? "metrics"
    : path === projectionsPath || path.startsWith(`${projectionsPath}/`)
    ? "projections"
    : "cas-http/0"

/* ── the daemon's own sensors ────────────────────────────────────── */

/** Request duration, attributed by plane — the daemon's first number
 * beyond BS-1's four. */
export const requestDuration = Metric.timer("cas.daemon.request", {
  description: "HTTP request duration, by plane",
})

/** The wire plane's in-flight gauge, beside the MCP plane's
 * `cas.host.inflight` — two planes, two gates, two gauges, so a reader
 * can tell which surface is saturated. */
export const wireInflight = Metric.gauge("cas.daemon.inflight", {
  description: "cas-http/0 requests currently past the admission gate",
})

/** How stale the litestream replica is, in milliseconds — the audit's
 * "lag unbounded and unmeasured" gap, measured. `-1` means unmeasured,
 * and the startup log names why: no `backup.target` in the config, or
 * a non-local target this host cannot stat (scrape litestream's own
 * metrics endpoint for those). */
export const replicaAge = Metric.gauge("cas.replica.age_ms", {
  description:
    "milliseconds since the litestream replica last advanced; -1 when unmeasured",
})

/** Resident memory. The honest sensor for the two unbounded growths a
 * long-lived host cannot bound from inside: the transport's outbound
 * queues, and the pin's MCP-over-HTTP session map, which is only ever
 * added to (`McpServer.ts:2314` sets; nothing deletes — no session
 * expiry at this pin, per the adapter's own docs). Watch this gauge;
 * its slope under steady traffic is those leaks' measurement. */
export const rssBytes = Metric.gauge("cas.daemon.rss_bytes", {
  description: "resident set size of the daemon process",
})

/* ── policy, ruled for the daemon ────────────────────────────────── */

/** A store whose policy gates reads has no daemon spelling YET — the
 * credentialed HTTP story is a named non-goal of v0, refused at boot
 * per the refuse-first ruling rather than served open. */
export class CredentialedPolicyUndaemonable
  extends Schema.TaggedError<CredentialedPolicyUndaemonable>()(
    "daemon/CredentialedPolicyUndaemonable",
    { credentialEnv: Schema.optionalKey(Schema.String) },
  )
{
  override get message(): string {
    return [
      "this store's serve policy requires a credential for reads, and cas daemon does not speak credentials yet",
      this.credentialEnv === undefined
        ? "  config.json says anonymousReads: false"
        : `  config.json says anonymousReads: false, credentialEnv: ${this.credentialEnv}`,
      "  credentialed HTTP is a named non-goal of daemon v0 — this host has no TLS of its own, and a bearer credential belongs behind the front proxy's TLS",
      "  set anonymousReads: true to serve this store open, or wait for the credentialed slice",
    ].join("\n")
  }
}

/** What one `cas daemon` invocation asks for, beyond the store's own
 * policy: the bind address, a one-invocation port override, the OTLP
 * export target, and the replica target the lag gauge reads. */
export interface DaemonOptions {
  readonly policy: ServePolicy
  readonly host: string
  readonly port: Option.Option<number>
  readonly otlp: Option.Option<string>
  readonly replicaTarget: Option.Option<string>
  /** Browser origins allowed to speak to this port. Empty means every
   * Origin-carrying request is refused — the MCP adapter's own
   * default, extended to the whole port. */
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
  /** Host-header names accepted beyond loopback and the bound host —
   * the name a front proxy forwards, when it preserves the public
   * Host. */
  readonly allowedHosts?: ReadonlyArray<string> | undefined
}

/** The limits the daemon actually serves under, after the policy has
 * been ruled: the port that will bind, the clamped node cap, and the
 * two bounds honored per plane. */
export interface DaemonLimits {
  readonly port: number
  readonly maxNodeBytes: number
  readonly maxInFlight: number
  readonly maxBatchKeys: number
}

/**
 * The policy, read and ruled for HTTP. Refuses a credentialed policy
 * outright (the named non-goal); clamps `maxNodeBytes` under the body
 * cap with the same arithmetic as stdio, so the host's typed refusal
 * always fires before the transport's; says out loud which caps are in
 * force and that `maxInFlight` is per plane.
 */
export const applyDaemonPolicy = (
  options: DaemonOptions,
): Effect.Effect<DaemonLimits, CredentialedPolicyUndaemonable> =>
  Effect.gen(function* () {
    const policy = options.policy
    if (!policy.anonymousReads) {
      return yield* new CredentialedPolicyUndaemonable(
        policy.credentialEnv === undefined
          ? {}
          : { credentialEnv: policy.credentialEnv },
      )
    }
    const maxNodeBytes = Math.min(policy.maxNodeBytes, maxServableNodeBytes)
    if (maxNodeBytes !== policy.maxNodeBytes) {
      yield* Effect.logWarning("maxNodeBytes clamped under the transport frame cap").pipe(
        Effect.annotateLogs({
          configured: policy.maxNodeBytes,
          effective: maxNodeBytes,
          frameBytes: transportFrameBytes,
          reason:
            "an MCP payload crosses as hex, so 2 x maxNodeBytes + slack must stay under maxRequestBodySize — the clamp keeps mcp/NodeTooLarge firing before the transport's own refusal",
        }),
      )
    }
    const port = Option.getOrElse(options.port, () => policy.port)
    yield* Effect.logInfo("serve policy applied").pipe(
      Effect.annotateLogs({
        honored:
          `port=${port} maxNodeBytes=${maxNodeBytes} maxInFlight=${policy.maxInFlight} maxBatchKeys=${policy.maxBatchKeys}`,
        // Two planes, two gates: the store can see up to twice the
        // bound when both saturate. Stated at every startup so the
        // number in the config never reads as a whole-host promise.
        perPlane: `maxInFlight bounds EACH plane; worst case ${2 * policy.maxInFlight} store-touching calls`,
        frameCap: `${transportFrameBytes} bytes (maxRequestBodySize), slack ${frameSlackBytes}`,
        portOverridden: Option.isSome(options.port),
      }),
    )
    return {
      port,
      maxNodeBytes,
      maxInFlight: policy.maxInFlight,
      maxBatchKeys: policy.maxBatchKeys,
    }
  })

/** The wire policy the cas-http/0 core serves under: the ruled limits,
 * no credential (a credentialed policy refused at boot), reads open —
 * which is the only configuration this daemon serves. */
const wirePolicy = (limits: DaemonLimits): Server.Policy => ({
  maxBatchKeys: limits.maxBatchKeys,
  maxNodeBytes: limits.maxNodeBytes,
  anonymousReads: true,
})

/* ── the two planes ──────────────────────────────────────────────── */

/**
 * MCP over HTTP: the same toolkit, the same handler gate, a different
 * transport layer. `layerHttp` registers the POST route (and the 405s
 * around it) against the shared router; its only failure mode at the
 * pin is an empty protocol list, which `offeredProtocols` cannot be.
 */
const layerMcpPlane = (
  limits: HostLimits,
  allowedOrigins: ReadonlyArray<string>,
) =>
  McpServer.toolkit(casToolkit).pipe(
    Layer.provide(layerHandlers(limits)),
    Layer.provideMerge(
      McpServer.layerHttp({
        ...serverIdentity,
        path: mcpPath,
        protocols: offeredProtocols,
        // Defence in depth: the front door already refuses foreign
        // origins port-wide; the adapter checks its own route again.
        allowedOrigins,
      }).pipe(Layer.orDie),
    ),
  )

/**
 * cas-http/0, bound at last: the four-step shell over the semantic
 * core, registered as the port's wildcard. Static routes (`/mcp`,
 * `/metrics`) win over the wildcard in the router, so this plane
 * receives exactly the exchanges the profile governs — and answers
 * ALL of them, unknown paths and wrong methods included, from its own
 * status table. Store-touching requests pass an admission gate sized
 * `maxInFlight`; the capabilities read stays outside it.
 */
const layerCasPlane = (limits: DaemonLimits) =>
  Layer.effectDiscard(Effect.gen(function* () {
    const policy = wirePolicy(limits)
    const app = yield* Server.httpApp(policy)
    const gate = yield* Semaphore.make(limits.maxInFlight)
    const router = yield* HttpRouter.HttpRouter
    // The gauge's value, held where the gate holds it — the same
    // set-not-increment discipline as the MCP plane's gauge.
    let live = 0
    const mark = (delta: number): Effect.Effect<void> =>
      Effect.suspend(() => {
        live += delta
        return Metric.update(wireInflight, live)
      })
    const gated = gate.withPermits(1)(
      mark(1).pipe(
        Effect.andThen(app),
        Effect.onExit(() => mark(-1)),
      ),
    )
    yield* router.add("*", "/*", (request) =>
      request.url.split("?")[0] === capabilitiesPath ? app : gated)
  })).pipe(Layer.provide(Server.Core.layer(wirePolicy(limits))))

/* ── the front door: guard, time, log ────────────────────────────── */

/** A Host header's name, without its port: `127.0.0.1:8080` →
 * `127.0.0.1`, `[::1]:8080` → `[::1]`. */
const hostName = (header: string): string => {
  if (header.startsWith("[")) {
    const closing = header.indexOf("]")
    return closing >= 0 ? header.slice(0, closing + 1) : header
  }
  return header.split(":")[0] ?? header
}

/** The Host names always accepted: the rebinding check must never
 * refuse the addresses this host actually answers on. */
const loopbackHosts: ReadonlyArray<string> = [
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]

/** What the front door decided about one request before any handler
 * ran. */
type DoorDecision =
  | { readonly _tag: "Pass"; readonly origin: string | undefined }
  | { readonly _tag: "Preflight"; readonly origin: string }
  | { readonly _tag: "RefusedHost"; readonly host: string }
  | { readonly _tag: "RefusedOrigin"; readonly origin: string }

/** An Origin's `host[:port]` half, without parsing exceptions:
 * `http://app.local:5173` → `app.local:5173`. An origin that does not
 * look like `scheme://…` (e.g. the literal `null`) answers itself,
 * which can then only match nothing. */
const originHost = (origin: string): string => {
  const separator = origin.indexOf("://")
  return separator >= 0 ? origin.slice(separator + 3) : origin
}

const decideDoor = (
  request: HttpServerRequest.HttpServerRequest,
  allowedHosts: ReadonlySet<string>,
  allowedOrigins: ReadonlySet<string>,
): DoorDecision => {
  // DNS rebinding arrives AT the loopback address carrying the
  // attacker's own Host; a request naming a host this daemon was not
  // told it answers as is refused before any plane sees it. A missing
  // Host is tolerated — every browser sends one, and the attack needs
  // a browser.
  const host = request.headers["host"]
  if (host !== undefined && !allowedHosts.has(hostName(host))) {
    return { _tag: "RefusedHost", host }
  }
  const origin = request.headers["origin"]
  // A SAME-ORIGIN request also carries an Origin on modern browsers'
  // POSTs: an origin whose host half equals the (already-validated)
  // Host header is the daemon's own pages talking to it, and passes
  // without an allowlist entry. The pattern is opencode's request
  // guard (`corpus/anomalyco_opencode/packages/server/src/cors.ts:22-26`),
  // which its own highest-risk surface (the pty WebSocket) relies on.
  const sameOrigin = origin !== undefined
    && host !== undefined
    && originHost(origin) === host
  if (origin !== undefined && !sameOrigin && !allowedOrigins.has(origin)) {
    return { _tag: "RefusedOrigin", origin }
  }
  if (
    origin !== undefined
    && request.method === "OPTIONS"
    && request.headers["access-control-request-method"] !== undefined
  ) {
    return { _tag: "Preflight", origin }
  }
  return { _tag: "Pass", origin }
}

const preflightResponse = (
  request: HttpServerRequest.HttpServerRequest,
  origin: string,
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.empty({ status: 204 }).pipe(
    HttpServerResponse.setHeaders({
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, PUT, POST, OPTIONS",
      "access-control-allow-headers": request.headers["access-control-request-headers"]
        ?? "content-type, accept, cas-profile, mcp-session-id, mcp-protocol-version",
      "access-control-max-age": "600",
      vary: "origin",
    }),
  )

/** The CORS decoration an allowed browser origin earns on every
 * answer, session headers exposed so a browser MCP client can hold its
 * session. */
const corsHeaders = (origin: string) => ({
  "access-control-allow-origin": origin,
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
  vary: "origin",
})

/**
 * One global middleware, three duties in arrival order: refuse what
 * the security posture refuses (foreign Host, foreign Origin), answer
 * the CORS preflight for origins that were allowed in, and give EVERY
 * exchange — refused ones included — its one sequence-numbered
 * `request` log line and its duration observation. Refusals on the
 * planes themselves are responses from their status tables, never
 * errors, so a governed exchange always logs a status; a defect that
 * still escapes logs `unhandled`.
 */
const layerFrontDoor = (options: {
  readonly bindHost: string
  readonly allowedHosts: ReadonlyArray<string>
  readonly allowedOrigins: ReadonlyArray<string>
}): Layer.Layer<never, never, HttpRouter.HttpRouter> =>
  Layer.effectDiscard(Effect.gen(function* () {
    const router = yield* HttpRouter.HttpRouter
    const hosts = new Set([
      ...loopbackHosts,
      hostName(options.bindHost),
      ...options.allowedHosts.map(hostName),
    ])
    const origins = new Set(options.allowedOrigins)
    let sequence = 0
    yield* router.addGlobalMiddleware((handler) =>
      Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
        const path = request.url.split("?")[0] ?? request.url
        const plane = planeOf(path)
        const decision = decideDoor(request, hosts, origins)
        // Captured as its own const so the narrowing survives into the
        // closure — a fallback `?? ""` here would be an empty
        // allow-origin header waiting to be emitted.
        const passOrigin = decision._tag === "Pass" ? decision.origin : undefined
        const answer = decision._tag === "Preflight"
          ? Effect.succeed(preflightResponse(request, decision.origin))
          : decision._tag === "RefusedHost" || decision._tag === "RefusedOrigin"
          ? Effect.succeed(HttpServerResponse.empty({ status: 403 }))
          : passOrigin === undefined
          ? handler
          : Effect.map(handler, (response) =>
            HttpServerResponse.setHeaders(response, corsHeaders(passOrigin)))
        return Clock.currentTimeMillis.pipe(
          Effect.flatMap((started) =>
            answer.pipe(
              Effect.onExit((exit) =>
                Clock.currentTimeMillis.pipe(
                  Effect.flatMap((ended) => {
                    const ms = ended - started
                    sequence += 1
                    return Metric.update(
                      Metric.withAttributes(requestDuration, { plane }),
                      Duration.millis(ms),
                    ).pipe(
                      Effect.andThen(Effect.logInfo("request").pipe(
                        Effect.annotateLogs({
                          seq: sequence,
                          plane,
                          method: request.method,
                          path,
                          status: Exit.isSuccess(exit) ? exit.value.status : "unhandled",
                          ms,
                          ...(decision._tag === "RefusedHost"
                            ? { refused: "host", host: decision.host }
                            : decision._tag === "RefusedOrigin"
                            ? { refused: "origin", origin: decision.origin }
                            : {}),
                        }),
                      )),
                    )
                  }),
                )),
            )),
        )
      }))
  }))

/* ── projections: the emitted artifacts, served ──────────────────── */

/**
 * The emitted JSON artifacts this daemon serves read-only — tier 0 of
 * the front end: a browser (or any agent) learns the estate's tool
 * vocabulary, surface, obligations, and environment from the same
 * byte-gated documents the gates check, over plain GETs. The daemon
 * never authors these; each is read from disk per request, so a
 * regenerated artifact is served without a restart. Absent artifacts
 * answer 404 — an un-emitted projection is a fact, not an error page.
 */
export const projectionSources: ReadonlyArray<{
  readonly name: string
  readonly source: URL
}> = [
  { name: "cas-tools.json", source: new URL("../../../cas/mcp/cas-tools.json", import.meta.url) },
  { name: "cas-surface.json", source: new URL("../../../cas/surface/cas-surface.json", import.meta.url) },
  { name: "cas-obligations.json", source: new URL("../../../cas/surface/cas-obligations.json", import.meta.url) },
  { name: "schema-index.json", source: new URL("../../../cas/schemas/index.json", import.meta.url) },
  { name: "schema-addresses.json", source: new URL("../../../cas/schemas/addresses.json", import.meta.url) },
  { name: "schema-verdicts.json", source: new URL("../../../cas/conformance/schema-verdicts.json", import.meta.url) },
  { name: "environment.json", source: new URL("../../../../docs/lab-core/ENVIRONMENT.json", import.meta.url) },
]

const layerProjections: Layer.Layer<
  never,
  never,
  HttpRouter.HttpRouter | FileSystem.FileSystem | Path.Path
> = Layer.effectDiscard(Effect.gen(function* () {
  const router = yield* HttpRouter.HttpRouter
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const resolved = yield* Effect.forEach(projectionSources, (entry) =>
    path.fromFileUrl(entry.source).pipe(
      Effect.map((file) => ({ name: entry.name, file })),
      Effect.orDie,
    ))
  for (const entry of resolved) {
    yield* router.add(
      "GET",
      `${projectionsPath}/${entry.name}`,
      fs.readFileString(entry.file).pipe(
        Effect.map((body) =>
          HttpServerResponse.text(body, {
            contentType: "application/json",
            headers: { "cache-control": "no-cache" },
          })),
        Effect.orElseSucceed(() => HttpServerResponse.empty({ status: 404 })),
      ),
    )
  }
  yield* router.add(
    "GET",
    projectionsPath,
    Effect.forEach(resolved, (entry) =>
      fs.exists(entry.file).pipe(
        Effect.orElseSucceed(() => false),
        Effect.map((present) => ({
          name: entry.name,
          path: `${projectionsPath}/${entry.name}`,
          present,
        })),
      )).pipe(
        Effect.map((projections) =>
          HttpServerResponse.jsonUnsafe({ projections }, {
            headers: { "cache-control": "no-cache" },
          })),
      ),
  )
}))

/* ── the vitals sampler ──────────────────────────────────────────── */

/** How often process vitals are read. */
export const vitalsSampleInterval: Duration.Duration = Duration.seconds(5)

/** Resident memory, sampled for as long as the daemon lives — the
 * sensor for what cannot be bounded from inside (see `rssBytes`). */
const layerRss: Layer.Layer<never> = Layer.effectDiscard(
  Effect.forkScoped(Effect.forever(
    Effect.suspend(() => Metric.update(rssBytes, process.memoryUsage().rss)).pipe(
      Effect.andThen(Effect.sleep(vitalsSampleInterval)),
    ),
  )),
)

/* ── the replica lag sampler ─────────────────────────────────────── */

/** How often the replica directory is examined. Freshness at 5 s
 * granularity is plenty for a gauge whose alert threshold is minutes. */
export const replicaSampleInterval: Duration.Duration = Duration.seconds(5)

/** A litestream target this host can stat: a plain path or a
 * `file://` URL. Anything with another scheme (s3, abs, sftp) is real
 * but not locally measurable — litestream's own metrics endpoint is
 * the sensor there, and the log says so. */
const localReplicaPath = (target: string): Option.Option<string> =>
  target.startsWith("file://")
    ? Option.some(target.slice("file://".length))
    : target.includes("://")
    ? Option.none()
    : Option.some(target)

/** The newest mtime under the replica directory, as epoch ms. The
 * replica advances by writing WAL segment files, so the newest file IS
 * the last replication. An unreadable or absent directory answers
 * none — a replica that has never been written is unmeasured, not
 * fresh. */
const newestReplicaWrite = (
  directory: string,
): Effect.Effect<Option.Option<number>, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const nothing: ReadonlyArray<string> = []
    const entries = yield* fs.readDirectory(directory, { recursive: true }).pipe(
      Effect.orElseSucceed(() => nothing),
    )
    let newest = Option.none<number>()
    for (const entry of entries) {
      const info = yield* fs.stat(path.join(directory, entry)).pipe(
        Effect.asSome,
        Effect.orElseSucceed(() => Option.none<FileSystem.File.Info>()),
      )
      if (Option.isNone(info) || info.value.type !== "File") continue
      const mtime = info.value.mtime
      if (Option.isNone(mtime)) continue
      const ms = mtime.value.getTime()
      newest = Option.some(Option.match(newest, {
        onNone: () => ms,
        onSome: (held) => Math.max(held, ms),
      }))
    }
    return newest
  })

/** One sample: gauge = now − newest replica write, or `-1` when there
 * is nothing to measure. */
const sampleReplica = (
  directory: string,
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  newestReplicaWrite(directory).pipe(
    Effect.flatMap((newest) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          Metric.update(
            replicaAge,
            Option.match(newest, {
              onNone: () => -1,
              onSome: (written) => Math.max(0, now - written),
            }),
          )),
      )),
  )

/**
 * The lag gauge's layer. Where the config names a local target, a
 * forked sampler keeps the gauge fresh for as long as the daemon
 * lives; where it names none — or names a remote one — the gauge says
 * `-1` and one startup line says why, so "unmeasured" is always a
 * statement and never a silent zero.
 */
export const layerReplicaLag = (
  target: Option.Option<string>,
): Layer.Layer<never, never, FileSystem.FileSystem | Path.Path> =>
  Option.match(target, {
    onNone: () =>
      Layer.effectDiscard(
        Metric.update(replicaAge, -1).pipe(
          Effect.andThen(Effect.logInfo("replica lag unmeasured").pipe(
            Effect.annotateLogs({
              reason: "config.json names no backup.target",
            }),
          )),
        ),
      ),
    onSome: (raw) =>
      Option.match(localReplicaPath(raw), {
        onNone: () =>
          Layer.effectDiscard(
            Metric.update(replicaAge, -1).pipe(
              Effect.andThen(Effect.logInfo("replica lag unmeasured").pipe(
                Effect.annotateLogs({
                  target: raw,
                  reason:
                    "the target is not a local path — scrape litestream's own metrics endpoint for remote replica lag",
                }),
              )),
            ),
          ),
        onSome: (directory) =>
          Layer.effectDiscard(
            Metric.update(replicaAge, -1).pipe(
              Effect.andThen(Effect.logInfo("replica lag measured").pipe(
                Effect.annotateLogs({
                  target: directory,
                  sampleMs: Duration.toMillis(replicaSampleInterval),
                }),
              )),
              Effect.andThen(Effect.forkScoped(Effect.forever(
                sampleReplica(directory).pipe(
                  Effect.andThen(Effect.sleep(replicaSampleInterval)),
                ),
              ))),
            ),
          ),
      }),
  })

/* ── the composition ─────────────────────────────────────────────── */

/** The startup banner: the bound address (the ACTUAL one, so an
 * ephemeral-port boot still names its port), the planes, the offered
 * protocol revisions, and the caps in force. The one line an agent
 * reads to know what this process is. */
const layerBanner = (
  limits: DaemonLimits,
  options: DaemonOptions,
): Layer.Layer<never, never, HttpServer.HttpServer> =>
  Layer.effectDiscard(
    Effect.flatMap(HttpServer.HttpServer, (server) =>
      Effect.logInfo("daemon serving").pipe(
        Effect.annotateLogs({
          address: HttpServer.formatAddress(server.address),
          planes:
            `cas-http/0=wildcard mcp=${mcpPath} metrics=${metricsPath} projections=${projectionsPath}`,
          protocols: offeredProtocols
            .map((protocol) => protocol.protocolVersion)
            .join(","),
          policy:
            `maxNodeBytes=${limits.maxNodeBytes} maxInFlight=${limits.maxInFlight}/plane maxBatchKeys=${limits.maxBatchKeys}`,
          origins: (options.allowedOrigins ?? []).length === 0
            ? "none (every browser Origin refused)"
            : (options.allowedOrigins ?? []).join(","),
          extraHosts: (options.allowedHosts ?? []).length === 0
            ? "none"
            : (options.allowedHosts ?? []).join(","),
          otlp: Option.getOrElse(options.otlp, () => "off"),
          // Announced so a reader knows what silence means: a gap wider
          // than this in the heartbeat stream is the host stalled.
          heartbeatMs: Duration.toMillis(heartbeatInterval),
        }),
      )),
  )

/** The OTLP export, when a wire is named: logs, metrics, and the spans
 * the estate's `Effect.fn` sites already carry, as OTLP/JSON over the
 * platform's HTTP client. Off by default — an export target is an
 * invocation's choice, never a config surprise. */
const layerOtlp = (
  otlp: Option.Option<string>,
): Layer.Layer<never> =>
  Option.match(otlp, {
    onNone: () => Layer.empty,
    onSome: (baseUrl) =>
      Otlp.layerJson({
        baseUrl,
        resource: {
          serviceName: `${serverIdentity.name}-daemon`,
          serviceVersion: serverIdentity.version,
        },
      }).pipe(Layer.provide(FetchHttpClient.layer)),
  })

/**
 * The whole daemon as one layer: gate on the manifest, rule the
 * policy, then bind both planes, the metrics route, the request log,
 * the heartbeat, the replica gauge, and the banner on one Bun server.
 * The store services stay requirements — `bin/cli/daemon.ts` provides
 * them from the resolved store, exactly as every other verb's
 * composition does.
 *
 * A refusal here is the invocation's refusal: nothing is served by a
 * host that cannot prove it serves the emitted table, and nothing is
 * served open that the store's own policy says to gate.
 */
export const layerDaemon = (options: DaemonOptions) =>
  Layer.unwrap(Effect.gen(function* () {
    yield* gateOnManifest
    const limits = yield* applyDaemonPolicy(options)
    const allowedOrigins = options.allowedOrigins ?? []
    // The adapter's own origin check is a static list, so the front
    // door's dynamic same-origin allowance is taught to it explicitly:
    // the daemon's own origin, in its loopback spellings, joins the
    // adapter list when the port is fixed. (On an ephemeral port —
    // tests — the origin is unknowable before the bind; the front door
    // still admits same-origin, and only the /mcp route is stricter.)
    const adapterOrigins = limits.port === 0 ? allowedOrigins : [
      ...allowedOrigins,
      `http://${hostName(options.host)}:${limits.port}`,
      `http://localhost:${limits.port}`,
      `http://127.0.0.1:${limits.port}`,
    ]
    const application = Layer.mergeAll(
      layerMcpPlane({
        maxNodeBytes: limits.maxNodeBytes,
        maxInFlight: limits.maxInFlight,
      }, adapterOrigins),
      layerCasPlane(limits),
      layerProjections,
      PrometheusMetrics.layerHttp({ path: metricsPath }),
      layerFrontDoor({
        bindHost: options.host,
        allowedHosts: options.allowedHosts ?? [],
        allowedOrigins,
      }),
    )
    return HttpRouter.serve(application, {
      // The front door's request line is the request logger — one
      // line, one vocabulary, sequence-numbered; the middleware logger
      // would be a second voice saying less.
      disableLogger: true,
      disableListenLog: true,
    }).pipe(
      Layer.merge(layerBanner(limits, options)),
      Layer.provide(BunHttpServer.layer({
        port: limits.port,
        hostname: options.host,
        // The transport's own cap, pinned to the same number as
        // stdio's frame cap so the clamp arithmetic is one discipline.
        // Bun answers an oversized body with an HTTP refusal — on this
        // transport nothing is silently lost even past the cap. This
        // is also the TOTAL-body bound the stdio transport lacks: a
        // `cas_run` whose whole document exceeds the frame is refused
        // here, where stdio would lose it.
        maxRequestBodySize: transportFrameBytes,
        // Slow-loris posture: a connection that stops making progress
        // is closed by the platform. Bun's own default is 10 s; stated
        // here so the number is a decision, not an accident.
        idleTimeout: 30,
        // SIGTERM/SIGINT drain: stop accepting, let in-flight requests
        // finish, force-close at the deadline.
        gracefulShutdownTimeout: Duration.seconds(10),
      })),
      Layer.merge(layerHeartbeat),
      Layer.merge(layerRss),
      Layer.merge(layerReplicaLag(options.replicaTarget)),
      Layer.merge(layerOtlp(options.otlp)),
    )
  }))
