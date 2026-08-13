# The MCP surface foldlab can build on: a deep read of rc.108 against the current spec

FROM OPERATOR-DIRECTED RESEARCH — pinned rc.108

Author: protocol-analysis team (Opus), 2026-08-14, isolated worktree. A **design
doc — prose, tables, and type signatures only, no machinery.** Two sources of
truth, both read directly: (A) the vendored pin `repos/effect/packages/effect/src/unstable/ai/*`
at `effect@4.0.0-rc.108` (release tag commit `bef7bf3`, `AGENTS.md:62-84`),
cited `file:line`; (B) the Model Context Protocol specification at
`modelcontextprotocol.io`, cited by revision + page + section. Labels:
**SHIPPED** (walled or tested today), **SHIPPED-UNSTABLE** (present at the pin
under `effect/unstable/`, API may move), **RATIFIED-UNBUILT** (decided, no
build), **ASPIRATIONAL**, **VERIFIED-BY-PROBE** (I ran it against the installed
pin; the probe is in the appendix), **INFERENCE** (reasoned, not observed).
Consumer-gated to tickets **003** (the concierge, landed), **015** (the grammar
foundry), **016** (the ontology explorer), **020** (the Effect surface) per the
no-machinery-before-consumer precept.

## The revision finding (read first — everything below depends on it)

**The pin implements one MCP protocol revision, `2025-06-18`, and the current
published revision is `2026-07-28`, which is a stateless architectural rewrite
that deletes most of the lifecycle the pin implements.**

The pin's protocol list is a single adapter:

```ts
// unstable/ai/McpProtocol.ts:16
export const v2025_06_18: ProtocolAdapter = Internal.make({
  protocolVersion: "2025-06-18",
  transport: { acceptsJsonRpcBatches: false, requiresVersionHeader: true },
  ...
})
```

and the exported `ProtocolVersion` type is literally `"2025-06-18"`
(`McpProtocol.ts:34-48`). The registry accepts a `NonEmptyReadonlyArray` of
adapters and rejects duplicate versions (`internal/mcpProtocolRegistry.ts:44-51`),
so the *shape* for multi-revision support exists — but rc.108 ships exactly one
adapter to put in it.

The current revision, verified by direct fetch of
`https://modelcontextprotocol.io/specification/2026-07-28/changelog` §"Major
changes", removes: protocol-level sessions and `Mcp-Session-Id` (item 1);
`initialize` / `notifications/initialized` entirely, replaced by per-request
`_meta` carrying protocol version and client capabilities (item 2); the HTTP GET
stream and `resources/subscribe` / `resources/unsubscribe`, replaced by
`subscriptions/listen` (item 4); `ping`, `logging/setLevel`, and
`notifications/roots/list_changed` (item 5); all server-initiated requests —
`roots/list`, `sampling/createMessage`, `elicitation/create` — replaced by the
Multi Round-Trip Requests (MRTR) pattern (item 7); and SSE stream resumability
and message redelivery, `Last-Event-ID` and SSE event IDs (item 9). It adds a
mandatory `server/discover` RPC (item 3), a required `resultType` on every
result (item 8), and required `Mcp-Method` / `Mcp-Name` HTTP headers (minor
item 4). Roots, Sampling, and Logging are all **Deprecated** as features
(changelog §"Deprecated" item 1, SEP-2577).

The streamable-HTTP page states the two facts that matter most to an
event-sourced backend, verbatim: **"Resumable SSE streams via `Last-Event-ID`
are not supported."** and, of the pin's whole session/GET/DELETE/resumability
mechanism, **"None of these mechanisms are part of this revision."**
(`/specification/2026-07-28/basic/transports/streamable-http`, §"Receiving
Messages" and §"Backward Compatibility → Earlier Streamable HTTP Revisions").

**Label: the pin is SHIPPED-UNSTABLE and correct for `2025-06-18`; measured
against `2026-07-28` it is a *legacy-era* server by the spec's own vocabulary**
(`/specification/2026-07-28/basic/versioning` §"Backward Compatibility"
distinguishes "modern" from "legacy" eras and says era detection is
transport-specific and cached per server). This does not make the pin unusable —
the spec defines a compatibility path and nothing is *removed* yet, only
deprecated with a minimum twelve-month window (changelog §"Governance", SEP-2596).
It does mean **every session-, subscription-, and server-initiated-request-shaped
design decision foldlab makes on rc.108 is building on a mechanism the spec has
already replaced.** That is the single most important input to Part 5.

**Evidence discipline note.** I fetched and read the `2026-07-28` pages
directly. I did **not** fetch the `2025-06-18` pages; my evidence for what
`2025-06-18` requires is the pin's own schema module and its conformance suite
(`repos/effect/packages/effect/test/unstable/ai/McpServer/McpConformance/`,
2 175 lines across twelve files, whose test names quote MUST/SHOULD directly).
Claims about `2025-06-18` normative text are therefore labelled from that
source, not from the spec pages. Where I say a feature is ABSENT from the pin,
that is a claim about the pin, verified by reading it.

---

## Part 1 — The primitive inventory

Column 3 is the load-bearing one. "Spec §" cites `2026-07-28` unless marked;
`[R]` marks a feature the current revision **removed or replaced**, `[D]` marks
one it **deprecated**. Effect types are the surface a foldlab handler actually
touches.

| MCP feature | Spec § (2026-07-28 unless noted) | In rc.108 `McpServer`? | Effect type it surfaces as |
|---|---|---|---|
| **Lifecycle** |
| `initialize` handshake | `[R]` basic/index §Statelessness; changelog major-2 | `McpServer.ts:1936-1983` | handler returning `{capabilities, serverInfo, protocolVersion}`; `Initialize` = `Rpc.make` (`McpSchema.ts:712`) |
| `notifications/initialized` | `[R]` changelog major-2 | `McpServer.ts:2056-2063` | `Effect.sync` adding to `initializedClients: Set<number>` |
| Version negotiation | basic/versioning §Protocol Version Negotiation | `McpServer.ts:625`, `mcpProtocolRegistry.ts:61` | `select(offered) → protocols[0]` fallback; test `LifecycleTest.ts:106` |
| Server capability advertisement | server/discover §DiscoverResult | `McpServer.ts:1937-1955` | `Types.DeepMutable<ServerCapabilities.Type>` (`McpSchema.ts:381`) |
| `server/discover` | server/discover ("Servers **MUST** implement it") | **ABSENT** | — |
| `instructions` in init result | server/discover §DiscoverResult | **ABSENT** — schema field exists (`McpSchema.ts:702`), no API sets it; `grep instructions McpServer.ts` → no hit | — |
| `_meta` protocol version / client capabilities per request | basic/index §`_meta` | **ABSENT** (pin uses handshake) | — |
| `resultType` on every result | basic/index §ResultType | **ABSENT** | — |
| **Tools** |
| `tools/list` | server/tools | `McpServer.ts:2046-2052` | `ListToolsResult` (`McpSchema.ts:1499`) |
| `tools/call` | server/tools | `McpServer.ts:2045`, dispatch `:293-302` | `Effect<CallToolResult, InternalError \| InvalidParams, McpServerClient>` |
| `notifications/tools/list_changed` | server/tools | `McpServer.ts:291`, coalesced `:258-267` | fired by `addTool`, `RpcClient` notification |
| Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) | server/tools §Tool annotations (schema.ts) | `McpServer.ts:1292-1295` ← `Tool.Readonly/Destructive/Idempotent/OpenWorld` (`Tool.ts:1761,1787,1814,1841`) | `Context.Reference<boolean>` annotations on a `Tool` |
| Tool `title` | server/tools §Tool | **PARTIAL** — written to `annotations.title` (`McpServer.ts:1288-1291`), never to the top-level `Tool.title` field (`McpSchema.ts:1465`) | `Tool.Title` service (`Tool.ts:1718`) |
| Tool `icons` | server/tools §Tool | **ABSENT** from schema | — |
| `outputSchema` | server/tools | **PARTIAL** — emitted only when the success schema's JSON Schema has `type === "object"` (`McpServer.ts:1286`) | derived from `Tool` success schema via `Tool.getJsonSchemaFromSchema` (`Tool.ts:1676`) |
| `structuredContent` | server/tools ("any JSON value" in this revision) | `McpServer.ts:1313` — set when `typeof encodedResult === "object"` | `Schema.Any` (`McpSchema.ts:1536`) |
| `isError` two-channel model | server/tools §Error handling | `McpServer.ts:1249-1253`, `:1328-1336` | `CallToolResult.isError` (`McpSchema.ts:1542`) |
| Input-schema validation of arguments | server/tools | `Toolkit.ts:296-308` → `ToolParameterValidationError` → `InvalidParams` (`McpServer.ts:1324-1325`); test `McpServer.test.ts:237` | `Schema` decode of `parametersSchema` |
| `x-mcp-header` / `Mcp-Param-*` | basic/transports/streamable-http §Custom Headers | **ABSENT** | — |
| **Resources** |
| `resources/list` | server/resources | `McpServer.ts:2002-2006` | `ListResourcesResult` (`McpSchema.ts:971`) |
| `resources/templates/list` | server/resources | `McpServer.ts:2038-2044` | `ListResourceTemplatesResult` (`McpSchema.ts:997`) |
| RFC 6570 URI templates | server/resources §ResourceTemplate | `McpServer.ts:1889-1915` `compileUriTemplate` | tagged-template `McpServer.resource\`file://x/${param}\`` (`:1592`), `McpSchema.param` (`:2522`) |
| `resources/read` | server/resources | `McpServer.ts:2007`, `findResource` `:324-337` | `Effect<ReadResourceResult, …>`; content may be `string \| Uint8Array \| ReadResourceResult` (`:1421`) |
| `resources/subscribe` / `unsubscribe` | `[R]` server/resources; replaced by basic/patterns/subscriptions | `McpServer.ts:2008-2037` — **stdio only**; over HTTP the pin sets `capabilities.resources.subscribe = false` (`:1958-1960`) | mutation of `Session.resourceSubscriptions: Set<string>` (`:410`) |
| `notifications/resources/updated` | basic/patterns/subscriptions | `McpServer.ts:818-825`, filtered by subscription set | `server.notifications["notifications/resources/updated"]({uri})` |
| `notifications/resources/list_changed` | server/resources | `McpServer.ts:313`, `:322` | fired by `addResource` / `addResourceTemplate` |
| Resource annotations `audience` / `priority` | server/resources §Annotations | `McpSchema.ts:288-304`; set from registration options (`McpServer.ts:1477`) | `Annotations` opaque schema |
| Resource annotation `lastModified` | server/resources §Annotations | **ABSENT** from `Annotations` (`McpSchema.ts:288-304`) | — |
| Resource `size`, `_meta` | server/resources §Resource | schema has them (`McpSchema.ts:859`, `:866`); no registration option sets them (`McpServer.ts:1413-1427`) | — |
| Not-found error code | server/resources ("**MUST** return … `-32602`") | **DIVERGENT** — pin returns `-32002` (`McpServer.ts:328`); the current spec retired `-32002` (changelog minor-6) | `McpErrorBase` |
| **Prompts** |
| `prompts/list`, `prompts/get` | server/prompts | `McpServer.ts:1997-2001`, `:1995` | `ListPromptsResult` (`McpSchema.ts:1313`), `GetPromptResult` (`:1339`) |
| `notifications/prompts/list_changed` | server/prompts | `McpServer.ts:348` | fired by `addPrompt` |
| Prompt arguments + `required` | server/prompts §Prompt | `McpServer.ts:1685-1693` — `required` derived from `SchemaAST.isOptional` | `Schema.Struct.Fields` |
| **Completion** |
| `completion/complete` | server/utilities/completion | `McpServer.ts:1985-1986`, `completion` `:357-376` | per-parameter handler `(input: string, context) => Effect<CompleteResult, …>` |
| `ref/prompt` / `ref/resource` | completion §Reference Types | `McpServer.ts:359-362` (key `ref/{kind}/{name|uriTemplate}/{arg}`) | `PromptReference` / `ResourceReference` (`McpSchema.ts:1871-1892`) |
| `context.arguments` | completion §Data Types | `McpServer.ts:366`, threaded to every handler | `CompletionContext = Complete.payloadSchema.Type["context"]` (`:96`) |
| max-100 values | completion §Completion Results | `McpServer.ts:367` `Arr.take(…, 100)`; test `CompletionTest.ts:151` | `Schema.Array(Schema.String)` (`McpSchema.ts:1905`) |
| `total` / `hasMore` | completion §CompleteResult | `McpServer.ts:372-373`; the layer wrappers hardcode `total = values.length, hasMore = false` (`:1543-1547`, `:1728-1732`) | `optional(Schema.Int)` / `optional(Schema.Boolean)` |
| `_meta` on a completion result | basic/index §`_meta` (all results) | **ABSENT** — `CompleteResult` omits `ResultMeta.fields` (`McpSchema.ts:1900-1917`), unlike every other result type | — |
| **Elicitation** |
| `elicitation/create` | client/elicitation | `McpServer.ts:1828-1857` `McpServer.elicit` | `Effect<S["Type"], ElicitationDeclined, McpServerClient \| S["DecodingServices"]>` |
| accept / decline / cancel | client/elicitation §Actions | `McpServer.ts:1849-1856` — accept decodes, cancel → `Effect.interrupt`, decline → typed error | `ElicitAcceptResult` / `ElicitDeclineResult` (`McpSchema.ts:2066`, `:2090`) |
| `requestedSchema` primitive subset | client/elicitation §requestedSchema | **UNENFORCED** — `Schema.Any` (`McpSchema.ts:2139`); derived from any Effect schema via `Tool.getJsonSchemaFromSchema` (`McpServer.ts:1844`) | any `Schema.ConstraintEncoder<Record<string, unknown>, unknown>` |
| `mode: "url"` elicitation | client/elicitation §Params | **ABSENT** | — |
| **Sampling** |
| `sampling/createMessage` | `[D]` client/sampling | **PRESENT BUT UNSURFACED** — in `ServerRequestRpcs` (`McpSchema.ts:2386`), reachable only via `McpServerClient.getClient` (`:2176`); no `McpServer.sample` accessor exists (`grep sampling McpServer.ts` → no hit) | `RpcClient.RpcClient<Rpcs<ServerRequestRpcs>>["sampling/createMessage"]` |
| `modelPreferences`, `systemPrompt`, `maxTokens`, `stopSequences`, `metadata` | client/sampling | `McpSchema.ts:1829-1858` | `CreateMessage.payloadSchema` |
| `tools` / `toolChoice` in sampling | client/sampling §Request | **ABSENT** from schema | — |
| **Roots** |
| `roots/list` | `[D]` client/roots | in `ServerRequestRpcs` (`McpSchema.ts:2387`); no public accessor; called internally only on list-changed (`McpServer.ts:705`) | `client["roots/list"](undefined)` |
| `notifications/roots/list_changed` | `[R]` changelog major-5 | `McpServer.ts:692-711` — **stdio only**; over HTTP it short-circuits to `Effect.void` (`:695-697`) | inbound notification handler |
| **Utilities** |
| `ping` | `[R]` changelog major-5 | `McpServer.ts:1935` (`() => Effect.succeed({})`); also server→client (`McpSchema.ts:2385`) | `Rpc.make("ping", …)` |
| `notifications/cancelled` | basic/patterns/cancellation | `McpServer.ts:672-687` → `RpcMessage` `Interrupt`; response suppressed `:576-591` | fiber interruption; `activeRequests: Map<number, Map<string, boolean>>` |
| `notifications/progress` (inbound) | basic/patterns/progress | `McpServer.ts:2064` — accepted and **discarded** (`Effect.void`) | — |
| `notifications/progress` (outbound) | basic/patterns/progress | **PARTIAL** — in `ServerNotificationRpcs` (`McpSchema.ts:2409`), emitted via `server.notifications`, but the request's `_meta.progressToken` never reaches a toolkit handler (`McpServer.ts:299` passes `request.arguments` only) | `ProgressNotification` (`McpSchema.ts:789`) |
| `logging/setLevel` | `[R]`/`[D]` server/utilities/logging | `McpServer.ts:1987-1994`, per-session level | `SessionLogLevel` → `CurrentLogLevel` (`:572`) |
| `notifications/message` | `[D]` server/utilities/logging | `McpServer.ts:810-817` with level filter `:2181-2187` | Effect `LogLevel` mapped at `:2164-2176` |
| **Pagination** | server/utilities/pagination | **ABSENT** — `cursor` / `nextCursor` schemas exist (`McpSchema.ts:228-255`) and every list result carries `PaginatedResultMeta.fields`, but no handler reads a cursor or sets `nextCursor` (`McpServer.ts:1997-2052`) | `Cursor = Schema.String` (`McpSchema.ts:203`) |
| **Caching** (`ttlMs`, `cacheScope`) | server/utilities/caching ("Servers **MUST** include caching hints") | **ABSENT** | — |
| **Transports** |
| stdio | basic/transports/stdio | `McpServer.layerStdio` (`:1028`), NDJSON+JSON-RPC serialization `:923-980` | `Layer<McpServer \| McpServerClient, IllegalArgumentError, Stdio>` |
| Streamable HTTP POST | basic/transports/streamable-http §Sending Messages | `McpServer.layerHttp` (`:1060`), POST route `:1106` | `Layer<…, IllegalArgumentError, HttpRouter.HttpRouter>` |
| `Accept` must list both types | streamable-http §Sending Messages | `McpServer.ts:1117-1132` → 406 | — |
| `202 Accepted` for notifications | streamable-http §Sending Messages | `McpServer.ts:601-613` | pre-response handler rewriting 200→202 |
| `Mcp-Session-Id` | `[R]` streamable-http §Earlier Revisions | `McpServer.ts:388`, minted `crypto.randomUUID()` `:1968` | `Sessions.bySessionId: Map<string, Session>` (`:414-417`) |
| `MCP-Protocol-Version` header | streamable-http §Protocol Version Header | `McpServer.ts:389`, validated `:1134-1140`, `:1210-1216`, echoed `:1970-1974` | — |
| `Mcp-Method` / `Mcp-Name` headers | streamable-http §Standard Request Headers ("**REQUIRED** for compliance") | **ABSENT** | — |
| GET SSE stream | `[R]` streamable-http §Earlier Revisions | **ABSENT BY DESIGN** — GET returns 405 (`McpServer.ts:1081`); test `TransportsTest.ts:259` | — |
| `Last-Event-ID` resumability | `[R]` streamable-http ("not supported") | **ABSENT** | — |
| DELETE session termination | `[R]` streamable-http §Earlier Revisions | **ABSENT** — DELETE returns 405; test `TransportsTest.ts:310` asserts the session survives | — |
| Origin validation / DNS rebinding | streamable-http §Security & Endpoint | `McpServer.ts:1075-1078`, `:1108-1112` → 403; `allowedOrigins` option `:1065` | — |
| JSON-RPC batching | (rejected by the pin's adapter) | rejected: `acceptsJsonRpcBatches: false` (`McpProtocol.ts:19`); stdio `:947-954`, HTTP 400 `:1177-1179` | — |
| **Patterns / extensions** |
| MRTR (`InputRequiredResult`) | basic/patterns/mrtr | **ABSENT** | — |
| `subscriptions/listen` | basic/patterns/subscriptions | **ABSENT** | — |
| Extensions capability | basic/versioning §Extension Negotiation | `McpServer.ts:1953-1955` — opaque passthrough of an `extensions` record (`:462`) | `Record<\`${string}/${string}\`, unknown>` |
| Tasks extension | extensions/tasks | **ABSENT** | — |
| Authorization (OAuth 2.1, RFC 9728) | basic/authorization | **ABSENT** from `McpServer`; `layerHttp` mounts on a bare `HttpRouter` (`:1106`) | — |
| **Effect-specific, no spec counterpart** |
| Per-client capability gating of list results | — | `McpServer.ts:2128-2150` `filterByClient` + `EnabledWhen` (`McpSchema.ts:2536`) | `Context.Service<EnabledWhen, Predicate<Initialize.payload>>` |

---

## Part 2 — The gap list

Two axes, because the revision finding forces it. **Axis A** = what rc.108 does
not implement of *its own* target revision. **Axis B** = what `2026-07-28`
changed out from under it. A gap on axis A is a build-it-ourselves item; a gap
on axis B is a seam risk that a pin bump will surface.

### Axis A — gaps within the pin's own revision

**A1 — Pagination: schemas present, behavior absent.** `Cursor`,
`PaginatedRequestMeta.cursor`, and `PaginatedResultMeta.nextCursor` are all
defined (`McpSchema.ts:203`, `:234`, `:254`), and every list result type spreads
`PaginatedResultMeta.fields` (`ListToolsResult` `:1502`, `ListResourcesResult`
`:974`, `ListResourceTemplatesResult` `:1000`, `ListPromptsResult` `:1316`). No
handler reads the cursor and none sets `nextCursor` — `tools/list` and friends
return the whole array (`McpServer.ts:2046-2052`). The conformance suite has no
pagination test. **A server with a large catalog returns it in one frame or not
at all.**

**A2 — Progress is receive-only and the token is dropped.** The inbound
notification handler is `(_) => Effect.void` (`McpServer.ts:2064`). Outbound is
wired (`ServerNotificationRpcs` includes `ProgressNotification`,
`McpSchema.ts:2409`) but a toolkit tool handler cannot obtain the caller's
`progressToken`: `callTool` invokes `handle(request.arguments)`
(`McpServer.ts:299`), discarding the decoded `_meta` that `CallTool`'s payload
schema does carry (`McpSchema.ts:1563`). The conformance tests confirm the
scope — `UtilitiesTest.ts:158-207` only assert that string and numeric tokens
are *accepted*, never that one is emitted.

**A3 — Outbound notifications are broadcast, not addressed.** The notification
pump iterates `server.initializedClients` and sends to every one
(`McpServer.ts:797-835`). Only two filters exist: log level
(`:810-817`) and resource-subscription membership (`:818-825`). There is no
per-client routing for anything else. **A `notifications/progress` emitted by a
handler goes to every connected client, not to the one that supplied the
token.** Combined with A2 this makes progress unusable for a multi-client server
without building the addressing yourself. (INFERENCE from the loop's structure;
no test exercises multi-client progress.)

**A4 — Sampling has no accessor.** `elicit` (`McpServer.ts:1828`) and
`clientCapabilities` (`:1865`) are exported; there is no `McpServer.sample`. The
only route is `McpServerClient.getClient` (`McpSchema.ts:2176`) →
`client["sampling/createMessage"](…)`, which is exactly what the conformance
tests do (`SamplingTest.ts:87`). Consequence: no capability pre-check, no typed
refusal analogous to `ElicitationDeclined` (`McpSchema.ts:2155`), and the
scoping of the RPC client is the caller's problem. **Partial, not absent.**

**A5 — Resource subscriptions are stdio-only.** `initialize` advertises
`resources.subscribe = true` (`McpServer.ts:1946-1948`) and then unconditionally
overwrites it to `false` whenever an `HttpServerRequest` is in the fiber context
(`:1958-1960`). Over HTTP, `resources/subscribe` returns `MethodNotFound`
(`:2015-2019`). This is *correct* for `2025-06-18` — subscriptions needed the
GET stream the pin does not implement — but it means **subscription-shaped
foldlab designs work only over stdio.**

**A6 — Roots refresh is stdio-only.** On `notifications/roots/list_changed` the
pin re-fetches roots, but only when there is no HTTP request in context:
`if (httpRequest !== undefined) return Effect.void` (`McpServer.ts:695-697`).
Same reason, same consequence.

**A7 — No `instructions`.** The `InitializeResult` schema has the field
(`McpSchema.ts:702`) — the spec's hint-to-the-model channel — and `McpServer`
never populates it (`:1978-1982`). There is no option on `run` / `layer` /
`layerStdio` / `layerHttp` to supply one.

**A8 — Tool `title` lands in the wrong place.** `Tool.Title` is written into
`annotations.title` (`McpServer.ts:1288-1291`), not the top-level `Tool.title`
field that exists in the schema (`McpSchema.ts:1465`). Clients reading the
display name from the documented location see nothing.

**A9 — `outputSchema` is emitted only for object-typed results.** `registerToolkit`
guards on `outputSchema.type === "object"` (`McpServer.ts:1286`). **VERIFIED-BY-PROBE**
(appendix): a tagged union `Schema.Union([Ok, Refusal])` produces
`{"anyOf":[…]}` with `type === undefined`, so **no `outputSchema` is
advertised**, while `structuredContent` still carries the value because that
guard is only `typeof result.encodedResult === "object"` (`:1313`). A tool whose
result is "success or typed refusal" therefore ships an *undeclared* structured
payload. This is the single most consequential gap for foldlab; Part 3.5 develops
it.

**A10 — Declared tool failures are flattened to text.** A tool with a
`failureSchema` fails into `toolErrorResult(error.message)` — `isError: true`
plus one `TextContent` block, no `structuredContent`
(`McpServer.ts:1328-1334`, `:1249-1253`). The typed failure's *shape* does not
cross the seam. Confirmed by the conformance test name "returns schema-validated
messages for declared handler failures" (`McpServer.test.ts:304`) — messages,
not values.

**A11 — Streaming tool results are collapsed.** `Toolkit`'s handler returns a
`Stream` supporting preliminary results (`Toolkit.ts:203-217`); `registerToolkit`
runs it into `Sink.last()` (`McpServer.ts:1304-1306`). Intermediate values are
computed and discarded.

**A12 — Not-found is `-32002`.** `findResource` fails with
`new McpErrorBase({ code: -32002, … })` (`McpServer.ts:328`).

**A13 — No authorization surface.** `layerHttp` adds routes to an `HttpRouter`
(`:1106`) with origin checking only. Everything in
`/specification/2026-07-28/basic/authorization` — RFC 9728 protected-resource
metadata, audience validation, the `resource` parameter — is the integrator's to
build.

### Axis B — the era gap

Each of these is a mechanism rc.108 implements that the current revision has
replaced. None is a defect in the pin; each is a **thing not to build a foldlab
law on top of.**

| rc.108 mechanism | file:line | Replaced in 2026-07-28 by | Where |
|---|---|---|---|
| `initialize` + `notifications/initialized` | `McpServer.ts:1936`, `:2056` | per-request `_meta` + `server/discover` | changelog major-2, major-3 |
| `Mcp-Session-Id` sessions | `:388`, `:1968`, `:414-417` | nothing — statelessness; explicit server-minted handles as tool arguments | changelog major-1; basic/index §Statelessness |
| `resources/subscribe` / `unsubscribe` | `:2008-2037` | `subscriptions/listen` with an opt-in filter and `subscriptionId` | changelog major-4 |
| GET SSE stream (already 405) | `:1081` | `subscriptions/listen` response stream | changelog major-4 |
| server-initiated `elicitation/create` | `:1846` | MRTR `InputRequiredResult.inputRequests` | changelog major-7; basic/patterns/mrtr |
| server-initiated `sampling/createMessage` | `McpSchema.ts:2386` | MRTR, and Sampling is `[D]` | changelog major-7, Deprecated-1 |
| server-initiated `roots/list` | `McpSchema.ts:2387` | MRTR, and Roots is `[D]` | changelog major-7, Deprecated-1 |
| `notifications/roots/list_changed` | `McpServer.ts:692` | removed outright | changelog major-5 |
| `ping` | `McpServer.ts:1935` | removed outright | changelog major-5 |
| `logging/setLevel` | `:1987` | per-request `_meta.io.modelcontextprotocol/logLevel`; Logging is `[D]` | changelog major-5, Deprecated-1 |
| `-32002` resource-not-found | `:328` | `-32602`; `-32002` retired | changelog minor-6 |

**Label: axis A is SHIPPED-UNSTABLE gap-in-implementation; axis B is a
pin-bump risk that no amount of care inside foldlab can prevent.** The mitigation
is architectural and is stated in Part 5.

---

## Part 3 — The foldlab fit, feature by feature

This is the payload. Each subsection scores one primitive against foldlab
mechanics as the repo actually defines them, and ends with a verdict.

### 3.1 `completion/complete` vs the concierge's legal fills

**The concierge's offer, exactly.** A `type.fill` / `type.unfill` reply carries
(`proto/wire/CONTRACT.md:62-66`):

```json
{"ok":true,"partial":<flb.type.partial.v0>,"frontier":[
  {"path":["..."],"legal":[{"kind":"string","example":{"k":"string"}}],
   "refs":["<resolvable digest>"]}
],"next":[hint...]}
```

Each frontier entry is a **path**, a set of **(kind, worked example)** pairs, and
up to sixteen **resolvable catalog digests** — the lexicographically first
sixteen (`CONTRACT.md:79-85`). The offer is complete and deterministic in
depth-first / UTF-16 identity order, not ranked. Law C4 is "every
`legal[].example` is directly accepted at that path" (`CONTRACT.md:81-82`,
witnessed `proto/go/protod/conformance_test.go:554`).

**What MCP's completion API can carry.** `completion/complete` returns
`completion.values`, a flat `Array<Schema.String>` capped at 100, plus optional
`total` and `hasMore` (`McpSchema.ts:1900-1917`; spec
`/specification/2026-07-28/server/utilities/completion` §CompleteResult:
"`values`: Array of suggestions (max 100)"). The request identifies **one
argument of one prompt or one resource template** by name, plus
`context.arguments`, a `Record<String, String>` of already-resolved arguments
(`McpSchema.ts:1941-1971`).

**Verdict: MCP completion cannot carry a typed-hole frontier. Not "loses
fidelity" — cannot carry it.** Four losses, each structural:

1. **No structure in a value.** A legal fill is an *object* (`{"k":"string"}`,
   or a whole subtree for a nested kind). `values` is `Array<Schema.String>`
   (`McpSchema.ts:1905`). Encoding a subtree as a JSON string inside a
   completion value would make the offer un-machine-checkable at the type level
   and would be a second, non-canonical encoding of a value that already has a
   canonical byte form — which the repo forbids by construction
   ("Everything that names, fingerprints, or ships a value goes through it, so
   there is exactly one identity", `CONTEXT.md:19-21`).
2. **No `_meta` escape hatch.** Every other result type in the pin spreads
   `ResultMeta.fields`; `CompleteResult` does not (`McpSchema.ts:1900-1917`).
   So even the usual smuggling channel is closed *at this pin* — you cannot
   attach the `path`, the `kind` tags, or the `refs` to the result. (The
   `2026-07-28` `_meta` rules would permit it in principle;
   `basic/index` §`_meta`.)
3. **One hole per request, and the frontier is the whole set.** The concierge's
   frontier is *every* hole in one deterministic order — that ordering is what
   makes "the first path that refuses" a well-defined fact (`CONTEXT.md:171-176`).
   Completion addresses one argument at a time and defines no ordering
   relationship between successive requests.
4. **Ranking is the wrong shape in both directions.** The spec says servers
   "**SHOULD**: Return suggestions sorted by relevance; Implement fuzzy matching
   where appropriate" (completion §Implementation Considerations) — advisory,
   unspecified, and *relevance*-shaped. The concierge's order is **identity
   order**, a fact, not a ranking. Adopting MCP's completion contract would mean
   advertising a relevance claim foldlab does not make and cannot check.

**And there is no refusal channel.** The concierge's refusal payload carries
`kind`, the `law` sentence that refused, `path`, `got`, `expected`, `example`,
and `next` hints (`CONTRACT.md:119-132`) — W7, "replies teach"
(`proto/SPEC.md:53-59`). Completion's error handling is three JSON-RPC codes
(completion §Error Handling). A refusal that teaches cannot be a `-32602`.

**Consequence for 015/016.** The foundry's mandatory teaching loop
(`docs/map/tickets/015-the-grammar-foundry.md:26-33`) and the explorer's budget
refusal carrying "the still-sound partial basis and the resume journal head"
(`016:26-31`) both require a rich reply. **Neither can ride
`completion/complete`.** The concierge stays where ticket 003 put it — as daemon
request kinds surfaced as *tools*, "never MCP-layer logic"
(`003:34-37`), which is exactly what `proto/ts/src/mcp.ts:1-9` already
implements. **Label: the existing design is right; completion is a decoy.**

The one honest use for `completion/complete`: **scalar argument autocompletion
for a resource template parameter** — completing a digest prefix to a full
`hex64`, or a journal name. The pin supports precisely that shape
(`McpServer.ts:1534-1556`; the layer wrapper encodes `Array<Param["Type"]>` to
strings). That is worth having and costs nothing. It is not the frontier.

### 3.2 Resources + subscriptions vs digest streams and anchors

**Does the URI model fit?** Yes, and better than most. The spec places no
constraint on scheme beyond RFC 3986 and states the scheme list is
non-exhaustive (`/specification/2026-07-28/server/resources` §URI schemes); the
pin passes `uri` through as `Schema.String` (`McpSchema.ts:829`) and the read
handler takes any string (`McpServer.ts:2007`). foldlab has no URI scheme today —
I grepped for `fold:`, `sha256:`, `flb://` and found none; addressing is bare
`hex64` digests plus a scheme *tag* on the fact, `bytes-sha256-v1`
(`CONTRACT.md:161-179`). A resource URI scheme would be **new surface**, and by
ADR-0010 it enters only with the law that licenses it (`CONTEXT.md:112-117`).

**The strong fit: content-addressed resources are immutable, and MCP has no way
to say so.** A digest-addressed resource is the ideal MCP resource — the
`resources/read` result for `flb:type/<hex64>` can never change, so it is
infinitely cacheable and never needs a subscription. But the pin's `Resource`
schema has no immutability field, no ETag, no `lastModified` (`McpSchema.ts:823-867`;
`Annotations` is only `audience` + `priority`, `:288-304`). `2026-07-28` adds
exactly the missing channel — `CacheableResult` with required `ttlMs` and
`cacheScope`, and servers "**MUST** include caching hints" on `resources/read`
(`server/utilities/caching`) — and **rc.108 does not have it** (Part 1). So on
the pin, foldlab can serve immutable content-addressed resources but cannot
*declare* their immutability in-protocol. **INFERENCE:** the only in-protocol
signal available at the pin is `Resource.description` prose, which is not
machine-checkable.

**The weak fit: subscriptions.** Three problems compound.

1. **Stdio only** (A5). A digest-stream product (016) is HTTP-shaped; the pin's
   subscribe path is not available there (`McpServer.ts:1958-1960`).
2. **Subscriptions are per-URI membership, and digests are the wrong grain.** The
   pin models a subscription as `Set<string>` of exact URIs (`:410`, `:2020`),
   matched by exact equality against the notification's `uri` (`:822`). A
   content-addressed URI never updates, so subscribing to one is vacuous.
   What foldlab actually wants to watch is a **journal advancing** — a
   `(seq, head)` cursor moving forward (`CONTRACT.md:87-100`) — which is a
   *mutable* address (`flb:journal/<name>`) whose updates a reader must then
   *fetch and verify*. That is expressible, but see (3).
3. **`notifications/resources/updated` carries only a URI** (`McpSchema.ts:1116-1124`).
   No sequence number, no head, no payload. The subscriber learns "something
   changed" and must re-read. Against foldlab's discipline that is not a loss —
   heads are claims and the reader recomputes locally anyway (W6,
   `CONTRACT.md:96-99`) — but it means **the notification carries zero evidence**,
   and the redelivery story is empty: the pin drops notifications for any client
   not currently in `initializedClients` (`McpServer.ts:797-801`) and nothing is
   replayed on reconnect. A missed `updated` is silently lost.

**Verdict: serve digests as resources — a strong, cheap fit. Do not build the
digest-stream product on `resources/subscribe`.** The subscription mechanism is
stdio-only at the pin, removed in the current revision (axis B), and carries no
evidence. The foldlab-native alternative already exists and is better: a
`journal.read` tool with a verified `(seq, head)` cursor, which the client polls
or long-polls. Its cursor is a *checkable claim* — "A cursor that does not verify
refuses (`bad-cursor`) and leaks nothing" (`CONTRACT.md:99-100`) — where MCP's
cursor is opaque by mandate. **Label: resources SHIPPED-UNSTABLE and usable;
subscriptions RATIFIED-AGAINST.**

### 3.3 Elicitation vs the concierge dialogue

**What the pin gives.** `McpServer.elicit({ message, schema })` returns
`Effect<S["Type"], ElicitationDeclined, McpServerClient | S["DecodingServices"]>`
(`McpServer.ts:1828-1835`). Accepted content is decoded against the same Effect
schema that produced the advertised JSON Schema (`:1844`, `:1851`); decline is a
typed error carrying the original request (`McpSchema.ts:2155-2159`); cancel is
`Effect.interrupt` (`McpServer.ts:1853`). **This is the single best-designed
primitive in the pin for foldlab's purposes** — one schema, both directions,
refusal typed.

**The three constraints.**

1. **The spec's `requestedSchema` is a restricted flat subset** — top-level
   primitive properties only: string with `minLength`/`maxLength`/`format` ∈
   {email, uri, date, date-time}, number/integer with `minimum`/`maximum`,
   boolean, single-select enum, multi-select array of enums; "complex nested
   structures, arrays of objects (beyond enums), and other advanced JSON Schema
   features are intentionally not supported"
   (`/specification/2026-07-28/client/elicitation` §requestedSchema). **The pin
   does not enforce this** — `requestedSchema` is `Schema.Any`
   (`McpSchema.ts:2139`) and `elicit` will happily derive a deeply nested schema
   from any Effect schema. **A partial `flb.type.v0` tree is exactly the nested
   structure the subset excludes.** So the concierge's *state* cannot travel
   through an elicitation; only scalar answers can.
2. **Client validation of the response is only `SHOULD`** (client/elicitation).
   Since the pin decodes with `Schema.decodeUnknownEffect` and `Effect.orDie` on
   mismatch (`McpServer.ts:1851`), a non-validating client turns a protocol-level
   type error into a server-side **defect**, not a refusal. That inverts foldlab's
   W8 ("refusals are data … nothing throws across the seam", `SPEC.md:53-59`).
   A foldlab server must wrap `elicit` and convert the die into a typed refusal.
3. **Axis B**: in `2026-07-28`, elicitation is no longer a server-initiated
   request. It is an `InputRequiredResult` returned from `tools/call`, and the
   client retries with `inputResponses` plus an opaque `requestState`
   (`basic/patterns/mrtr` §Core Types, §Client Requirements). The pin's
   `Effect`-shaped `elicit` — a suspended fiber awaiting a reply — has **no MRTR
   analogue**; MRTR requires the server to *terminate the request*, encode its
   continuation, and be resumed by a new JSON-RPC id.

**The MRTR observation that matters.** MRTR is the concierge's own architecture,
arrived at independently. "Notably, it allows servers to request additional
information without maintaining any server-side state. The server encodes any
needed context into the `requestState` field, which the client echoes back on
retry" (`basic/patterns/mrtr` §Basic Workflow). Compare ticket 003: "the partial
IS the state and travels in every request/reply, so the daemon holds no
sessions" (`003:32-34`). **foldlab's concierge is already MRTR-shaped, and
stronger:** the concierge's travelling state is *canonical, digestible, and
inspectable*, where MRTR mandates the opposite — "Clients **MUST NOT** inspect,
parse, modify, or make any assumptions about its contents", and servers "**MUST**
protect its integrity (e.g. HMAC or AEAD)" (`mrtr` §Client Requirements-2,
§Server Requirements-4). MRTR's `requestState` is an *encrypted decision*;
foldlab's partial is *evidence*. That is the three-sorts distinction
(`README.md:38-46`) drawn by the MCP spec without naming it.

**Verdict: elicit is the right primitive for scalar questions the concierge
needs answered — "which journal?", "confirm this digest" — and is unusable as
the concierge dialogue itself.** The dialogue stays in tool arguments, where
foldlab already put it, and where MRTR is heading anyway. **Label:
SHIPPED-UNSTABLE, use narrowly.**

### 3.4 Sampling vs the foundry — is this the certified-codegen loop?

**The shape is exactly right.** In `sampling/createMessage` the *server* supplies
`messages`, `systemPrompt`, `modelPreferences`, `maxTokens`, `stopSequences`
(`McpSchema.ts:1829-1858`), the *client* runs the model and returns a
`CreateMessageResult` (`:1796-1808`), and the server then does whatever it likes
with the result — including refuse it. That is the foundry's loop
(`015:19-33`): an untrusted synthesizer proposes; the certifier disposes;
`certify(bytes) → Certificate | Refusal` is the only admission path
(`CONTEXT.md:178-184`). The server-controlled prompt plus server-side
verification is precisely "the LLM synthesizer is permanently untrusted"
(`015:19-25`) expressed as a protocol.

**Four reasons it is not the loop you can ship on rc.108.**

1. **No accessor** (A4). You reach it through `McpServerClient.getClient`, with
   no capability pre-check and no typed refusal. `clientCapabilities`
   (`McpServer.ts:1865`) exists to check `capabilities.sampling`
   (`McpSchema.ts:358`) but nothing wires the two together.
2. **Every server-side control is advisory.** The spec: hints "are advisory —
   clients make final model selection"; the client "**MAY** modify or ignore"
   `systemPrompt`, `includeContext`, `temperature`, `stopSequences`, and
   `metadata`; only `maxTokens` **MUST** be respected
   (`/specification/2026-07-28/client/sampling`). The pin's own doc comments
   carry the same warnings verbatim (`McpSchema.ts:1739-1743`, `:1836-1845`).
   **The server does not control the prompt; it proposes one.** For a foundry
   that publishes a trusted-base line count (`015:19-25`), a prompt the client
   may silently rewrite is not part of the trusted base — which is fine, because
   the synthesizer is untrusted anyway, **but it means the loop's reproducibility
   claim collapses.** Re-running the same foundry request may sample a different
   model with a different system prompt and there is no protocol-level record of
   which. Against the replay precondition — an activity must be deterministic in
   the digest, or journal its nondeterministic output as a fact
   (`docs/design/2026-08-13-effector-backed-workflow-replay.md:137-159`) —
   **sampling is irreducibly the second case**, and `CreateMessageResult` gives
   you `model` and optional `stopReason` (`McpSchema.ts:1800-1807`) and nothing
   about the prompt actually used. Journal the *result*, never claim the *call*
   is reproducible.
3. **Grammar-constrained decoding cannot be requested.** `015:37-42` wants a
   GBNF/FSM index served by digest so "any agent runtime pins to a DSL by hash".
   `CreateMessage`'s payload has no grammar, no response-format, no tool-choice
   field (`McpSchema.ts:1829-1858`); `2026-07-28` adds `tools`/`toolChoice` to
   sampling but still no grammar (`client/sampling` §Request), and the pin has
   neither. Constrained generation must happen client-side, out of band, keyed
   by a digest foldlab publishes some other way.
4. **Sampling is `[D]` deprecated** (changelog §Deprecated-1, SEP-2577), with the
   suggested migration "integrate directly with LLM provider APIs instead of
   Sampling". Building 015's core loop on a deprecated primitive is a choice to
   rebuild it within the twelve-month window.

**Verdict: sampling is the *right idea* and the *wrong dependency*.** The
foundry's loop is certifier-shaped, not transport-shaped: the certifier is a Go
entry point (`015:19-25`), the synthesizer is untrusted wherever it runs, and
whether the model call travels over `sampling/createMessage` or a direct provider
API changes nothing about the proof. **Recommendation: build the foundry so the
synthesizer is a pluggable, journaled activity, and treat `sampling/createMessage`
as one optional adapter behind it — never as the loop's spine.** The one thing
sampling buys that a direct provider call does not is *the user's own model and
the user's own bill*, which is a product argument, not a proof argument. **Label:
RATIFIED-AGAINST as a dependency; ASPIRATIONAL as an adapter.**

### 3.5 Tool annotations + structured output vs typed refusals

**This is where the pin and foldlab meet most directly, and where the sharpest
defect is.**

**Annotations.** All four hints map cleanly:
`Tool.Readonly` → `readOnlyHint` (default `false`), `Tool.Destructive` →
`destructiveHint` (default **`true`**), `Tool.Idempotent` → `idempotentHint`
(default `false`), `Tool.OpenWorld` → `openWorldHint` (default **`true`**)
(`McpServer.ts:1292-1295`; defaults at `Tool.ts:1761-1843` and
`McpSchema.ts:1422-1449`). Two notes. First, **the defaults are the safe ones** —
an unannotated foldlab tool is advertised as destructive and open-world, which is
the correct posture and matches the substrate assumption gate's stance that the
envelope refuses what the proofs do not cover (`VERIFICATION.md:320-340`).
Second, **annotations are hints with no enforcement anywhere in the protocol**:
"clients **MUST** consider tool annotations to be untrusted unless they come from
trusted servers" (`/specification/2026-07-28/server/tools`), and the pin's own
doc comment says the same (`McpSchema.ts:1400-1407`). So `readOnlyHint: true` is
a *claim*, not a *right* in the ADR-0010 sense (`CONTEXT.md:112-117`). foldlab
can make the claim true by construction — a read-only tool routed through the
three-verb writ's `read` (W9) cannot mutate — but MCP will not check it. **That
is a place to pin behavior with a conformance test on our side, not a place to
trust the protocol.**

**Structured output — the defect.** Ask the mission's question directly: *can a
refusal be a first-class structured result rather than `isError` + text?*

Two paths exist, and they behave differently:

- **Refusal as a declared failure** (`Tool.failure`): flattened to
  `isError: true` + one text block, shape lost (A10, `McpServer.ts:1328-1334`).
  **No.**
- **Refusal as a value in the success channel** — `success: Schema.Union([Ok, Refusal])`,
  which is exactly the certifier's signature `certify(bytes) → Certificate | Refusal`
  (`CONTEXT.md:178-184`) and exactly W8, "refusals are data … nothing throws
  across the seam" (`SPEC.md:53-59`). The value *does* arrive:
  `structuredContent` is set for any object result (`McpServer.ts:1313`) and the
  JSON also rides in a text block (`:1314-1318`), with `isError: false`. **But
  `outputSchema` is not advertised**, because a union's JSON Schema is
  `{"anyOf":[…]}` with no top-level `type` and the guard at `:1286` requires
  `type === "object"`. **VERIFIED-BY-PROBE** — full output in the appendix:

  ```
  UNION outputSchema: {"anyOf":[{...Ok...},{...Refusal...}]}
  UNION .type === undefined      => advertised by registerToolkit? false
  STRUCT .type === object
  ```

  So the client receives a structured refusal it was never told to expect and
  cannot validate. The spec's contract in this revision is "Servers **MUST**
  provide structured results that conform" to `outputSchema` and "Clients
  **SHOULD** validate" (`server/tools`) — with no `outputSchema`, that whole
  contract is inert.

**This already bites the shipped server.** `proto/ts/src/mcp.ts` declares every
derived tool with `success: Schema.Unknown` (`proto/ts/src/mcp.ts:71`) and
returns `reply.ok ? reply.fact : { ok: false, refusal: reply.refusal }`
verbatim (`:84`, `:87`). **VERIFIED-BY-PROBE**: `Schema.Unknown` produces `{}`,
`type === undefined`, so **no `outputSchema` is advertised for any tool the
foldlab MCP server currently serves.** The refusal discipline is intact — a
refusal is a value, `isError` is never set, W8 holds across the seam exactly as
the file's header comment claims (`mcp.ts:7-9`) — but the *nine refusal kinds*
(`CONTRACT.md:134-144`) are invisible to a schema-validating client. This is the
protocol-level twin of a finding the repo already recorded from the other side:
"Refusal `kind` is an open string … agents cannot machine-check exhaustiveness
over the nine kinds" (`docs/research/2026-08-13-external-review-findings.md`,
Secondary findings).

**A correction to the record, while I am here.** The same file states: "the
Effect MCP pin skips server-side schema validation, so a client that ignores the
advertised schema is still admitted." **That is false at rc.108.** `Toolkit`
decodes call arguments against the tool's own `parametersSchema` and raises
`ToolParameterValidationError` (`Toolkit.ts:296-308`), which `registerToolkit`
maps to `InvalidParams` before the handler runs (`McpServer.ts:1324-1325`); the
conformance test is named "returns concise parameter-validation errors without
invoking the handler" and asserts `handlerInvoked === false`
(`McpServer.test.ts:237-258`). Input validation is enforced. **Output** validation
is what is missing, and only because `outputSchema` is not advertised.

**Verdict: yes, a refusal can be a first-class structured result — the value
channel works today — but it travels undeclared.** The fix is small and lives on
our side: **give every refusal-bearing tool an object-typed success schema with a
discriminant** (`Schema.Struct({ ok: Schema.Boolean, fact: …, refusal: … })`
rather than a top-level union), so `type === "object"` holds, `outputSchema` is
advertised, and the nine kinds become an enumerable, client-checkable set. That
is a one-line shape change with a real proof consequence, and it should carry a
conformance test asserting the served `outputSchema` is non-empty and contains
the refusal kinds. **Label: SHIPPED defect with a cheap fix; the fix is a
ticket-003-adjacent change to `proto/ts/src/mcp.ts:67-73`.**

### 3.6 Streamable HTTP resumability vs journal cursors

**There is nothing to compose with.** At the pin, GET returns 405
(`McpServer.ts:1081`; test `TransportsTest.ts:259`), there is no SSE stream to
resume, and `Last-Event-ID` appears nowhere in the module. In the current
revision the mechanism is gone from the spec entirely: **"Resumable SSE streams
via `Last-Event-ID` are not supported"**, and a broken stream means the in-flight
request is lost and "clients **MUST** re-issue it as a new request with a new
request ID" (`basic/transports/streamable-http` §Receiving Messages; changelog
major-9).

**So the question inverts.** It is not "does MCP's resume story compose with an
event-sourced backend?" — MCP has no resume story. It is: **does MCP's
no-resume story fight foldlab's cursor?** Answer: **no, and the fit is
unusually clean, because foldlab's cursor is application-level and MCP's lost
mechanism was transport-level.**

- foldlab's cursor is `{seq, head}` and the reader verifies it locally: heads are
  claims (W6), the reply says so in `note`, the entry digest is recomputed from
  the canonical bytes of `{"payload","prev","seq"}` chained from an all-zero
  genesis, and "A cursor that does not verify refuses (`bad-cursor`) and leaks
  nothing" (`CONTRACT.md:87-100`).
- MCP's cursor, where it exists at all, is opaque by mandate ("Clients **MUST**
  treat cursors as opaque"), its stability is only **SHOULD**, and cross-page
  consistency is explicitly not guaranteed — "clients may observe duplicates or
  gaps" (`server/utilities/pagination`, §Caching). And the pin implements none
  of it (A1).

**Verdict: put the cursor in the tool arguments, never in the transport.** A
`journal.read` tool taking `{journal, from: {seq, head}, max}` and returning
`{entries, seq, head}` — which `proto/wire/CONTRACT.md:87-100` already specifies
— survives every transport event MCP can produce, including the ones the spec
says are unrecoverable: a broken stream costs one re-issued tool call at the last
verified cursor, with no redelivery semantics to reason about and no
at-least-once claim to defend. This is the same conclusion foldlab reaches
elsewhere for a different reason: **transport is "anything that moves or regroups
bytes without touching identity … nothing ever fingerprints a transport form"**
(`CONTEXT.md:67-71`). A resumable-stream design would have made the transport
load-bearing for identity. Its removal from the spec removes the temptation.
**Label: RATIFIED-BY-ACCIDENT — the spec's regression is foldlab's alignment.**

### 3.7 Progress and cancellation vs long-running folds and workflow runs

**Cancellation is real and works.** The pin tracks in-flight requests per client
(`McpServer.ts:742-745`), converts `notifications/cancelled` into an
`RpcMessage` `Interrupt` for the matching request id (`:672-687`), and suppresses
the response for a cancelled request (`:576-591`). The conformance suite pins the
semantics precisely: "MUST not send a response to a cancellation notification"
(`UtilitiesTest.ts:33`), "SHOULD stop work and suppress the response after
cancellation" (`:51`), "SHOULD ignore cancellation for an unknown request
identifier" (`:107`), "SHOULD ignore cancellation for an already completed
request identifier" (`:140`). **Effect fiber interruption is the natural
implementation and the pin uses it.** For a long-running fold this is exactly
what you want, and it composes with `Effect.onInterrupt` for cleanup.

One caveat with teeth: **cancellation is cooperative and the client may be gone.**
Over HTTP in `2026-07-28`, closing the SSE response stream *is* the cancellation
signal and no notification is expected (`basic/patterns/cancellation`;
streamable-http §Cancellation) — a mechanism the pin does not have, since it has
no long-lived response streams. So on rc.108 over HTTP, **a disconnected client
cannot cancel at all.** For a workflow run this matters: an interrupted MCP
request must not be read as "the run was cancelled". The effector's register is
the authority on that — `Done(fence, result)` is terminal (`README.md:42-45`) —
and an MCP cancellation is at most a hint to stop *this* call.

**Progress is not usable as shipped.** A2 and A3 together: the token never
reaches a toolkit handler (`McpServer.ts:299`), and outbound notifications
broadcast to every initialized client (`:797-835`). To emit correctly-addressed
progress on rc.108 you would have to register the tool through the lower-level
`McpServer.addTool` (`:119`) rather than `registerToolkit`, decode `_meta`
yourself, and build per-client routing the pump does not offer. That is a
build-it-ourselves item of moderate size.

**What the spec would give you anyway is weak.** A server that receives a
progress token **MAY** simply "Choose not to send any progress notifications";
frequency is "whatever … they deem appropriate"; `total` MAY be omitted; the only
hard rule is that `progress` **MUST** increase and notifications **MUST** stop
after completion (`basic/patterns/progress`). So progress is a UX affordance with
no contract worth depending on.

**Verdict: adopt cancellation, treat it as advisory, and let the register be the
authority. Skip progress until a consumer demands it; when one does, build it on
`addTool` and per-client routing, and never let a progress notification be the
evidence of anything.** For a long fold the honest surface is a *journaled*
progress fact the client can read at a cursor — evidence, not a notification.
**Label: cancellation SHIPPED-UNSTABLE and adopted; progress ABSENT-IN-PRACTICE.**

---

## Part 4 — Defined-behavior audit

Each row is a place the spec leaves behavior implementation-defined, or the pin
makes an unstated choice. For each: **PIN** (write a conformance test against
rc.108's actual behavior and treat it as the contract) or **REFUSE** (do not
build anything that depends on it).

**From the spec (2026-07-28), verbatim or closely quoted:**

| # | Ambiguity | Section | Disposition |
|---|---|---|---|
| D1 | Whether a server answers a request with a single JSON object or an SSE stream is entirely server-discretionary; "The client **MUST** support both" | streamable-http §Sending Messages-6 | REFUSE — never branch on which you got |
| D2 | Stream termination after the final response is **SHOULD**, not MUST | streamable-http §Receiving Messages | REFUSE |
| D3 | Header requirements for notification POSTs are "not defined by this revision" | streamable-http §Sending Messages, Note | REFUSE — do not rely on client notifications over HTTP |
| D4 | A server **MAY** treat a request omitting `MCP-Protocol-Version` as `2025-03-26` | streamable-http §Protocol Version Header | PIN — always send the header |
| D5 | Era detection on stdio must not key on a specific error code; legacy servers respond with "implementation-defined errors (commonly `-32601` or `-32602`) or not at all", and the probe timeout is unspecified | basic/versioning §Backward Compatibility; transports/stdio | REFUSE — pin our own era explicitly |
| D6 | Unsupported extension: the supporting party "**MUST** either revert to core protocol behavior or reject the request" — which one is left open | basic/versioning §Extension Negotiation | REFUSE — no foldlab law may ride an extension |
| D7 | Pagination cursor stability is only **SHOULD**; expiry/invalidation semantics unspecified; "clients may observe duplicates or gaps" across pages | server/utilities/pagination; §Caching | REFUSE — foldlab cursors are `{seq, head}` and verified (3.6) |
| D8 | An empty string is a valid cursor and "**MUST NOT** be treated as the end of results" | server/utilities/pagination | PIN if we ever implement pagination |
| D9 | Completion relevance ordering and fuzzy matching are **SHOULD** with no defined algorithm; `total` has no stated accuracy requirement; there is no cursor, only `hasMore` with no way to fetch more | server/utilities/completion | REFUSE — see 3.1 |
| D10 | Tool `name` character set and uniqueness are **SHOULD** only; cross-server collisions are the client's problem | server/tools | PIN — constrain our names ourselves |
| D11 | Deterministic `tools/list` ordering is **SHOULD** (new this revision) | server/tools; changelog minor-3 | PIN — foldlab emits identity order regardless |
| D12 | The boundary between a "malformed request" (JSON-RPC error) and a tool "input validation error" (`isError`) is left to the server; `isError: false` vs absent is not spelled out | server/tools §Error handling | PIN — always set `isError` explicitly |
| D13 | Tool annotations are unenforced hints; clients **MUST** treat them as untrusted | server/tools | PIN on our side with a test; never trust inbound |
| D14 | Subscription notification ordering relative to the underlying change is unspecified; whether `list_changed` is coalesced or at-most-once is unspecified; concurrent-subscription and URI-list limits unspecified | basic/patterns/subscriptions | REFUSE |
| D15 | Subscription state is **not** retained across reconnect on either transport; nothing is redelivered; missed notifications are lost | basic/patterns/subscriptions | REFUSE — 3.2 |
| D16 | Progress is fully discretionary: a server **MAY** send none, at any frequency, with `total` omitted | basic/patterns/progress | REFUSE — 3.7 |
| D17 | Servers **MAY** ignore cancellations; timeout values are unspecified | basic/patterns/cancellation | PIN our own behavior; treat inbound as advisory |
| D18 | MRTR: `requestState` format, size, and lifetime are entirely server-chosen; no bound on round-trips; no timeout for how long a server must accept a given state; replay defenses are **SHOULD** and "do not by themselves guarantee single-use" | basic/patterns/mrtr | REFUSE for now (not at the pin); when it arrives, foldlab's canonical partial is the better state |
| D19 | Caching: TTL is "a freshness hint, not a guarantee"; a `"public"` result from an authenticated endpoint may escape its authorization context, and servers "MUST NOT rely on `cacheScope` alone" | server/utilities/caching | REFUSE — never let a TTL be evidence |
| D20 | `clientInfo` / `serverInfo` are self-reported, "not verified by the protocol"; implementations "**SHOULD NOT** … rely on them for security decisions" | basic/index §`_meta` | REFUSE — matches "whoever synthesized the bytes is permanently untrusted" (`CONTEXT.md:181-183`) |
| D21 | JSON Schema: which dialects beyond 2020-12 are supported is implementation-defined; composition-keyword bounds are "**SHOULD** apply reasonable bounds" with no numbers | basic/index §JSON Schema Usage | PIN — foldlab emits 2020-12 only, bounded by the `flb.type.v0` grammar |
| D22 | Error codes `-32000`..`-32019` are implementation-defined and "receivers **MUST NOT** assume any specific meaning"; purely local errors have no assigned code | basic/index §Error Codes | REFUSE — never encode a foldlab refusal kind in an error code |
| D23 | Resource URI scheme list is explicitly non-exhaustive; custom schemes need only satisfy RFC 3986 | server/resources | PIN — if we mint a scheme it needs its own law (ADR-0010) |

**From the pin (rc.108) — unstated choices a foldlab conformance test must
freeze:**

| # | Behavior | file:line | Disposition |
|---|---|---|---|
| P1 | An unsupported offered protocol version silently negotiates down to `protocols[0]` rather than failing | `mcpProtocolRegistry.ts:61`; test `McpServer.test.ts:468`, `LifecycleTest.ts:106` | PIN |
| P2 | `list_changed` notifications are coalesced per tag with a `setTimeout(…, 0)` debounce | `McpServer.ts:258-267` | PIN — and note nothing in the spec requires or forbids it (D14) |
| P3 | Outbound notifications go to **every** client in `initializedClients`, filtered only by log level and resource subscription | `:797-835` | PIN, and treat as the reason progress is unusable (A3) |
| P4 | Notifications produced before any client is initialized are silently dropped | `:797-801` | PIN |
| P5 | `structuredContent` is set whenever `typeof encodedResult === "object"` — which includes `null` and arrays — independently of whether `outputSchema` was advertised | `:1313`, `:1286` | PIN — this is the A9/3.5 defect's mechanism |
| P6 | A declared tool failure becomes `isError` + `error.message`, or the generic string `"Tool execution failed due to an internal server error."` when the error is not an `Error` | `:1247`, `:1328-1334` | PIN |
| P7 | Non-declared failures and defects are collapsed to the same generic message — the client cannot distinguish a defect from an undeclared failure | `:1326`, `:1334`, `:1336` | PIN |
| P8 | Completion values are truncated to 100 server-side and `hasMore` is recomputed, overriding what the handler returned | `:367-374` | PIN |
| P9 | The layer-level `resource` / `prompt` completion wrappers hardcode `total = values.length` and `hasMore = false` before that truncation | `:1543-1547`, `:1728-1732` | PIN — `total` is therefore the *pre-truncation* count, which is right but undocumented |
| P10 | `resources.subscribe` is advertised `true` and then forced to `false` per-request when an `HttpServerRequest` is in context | `:1946-1948`, `:1958-1960` | PIN |
| P11 | Resource lookup uses a `find-my-way` HTTP router over URIs with `ignoreTrailingSlash`, `ignoreDuplicateSlashes`, `caseSensitive: true` — so `flb:type/abc/` and `flb:type/abc` are the **same** resource | `:1875-1887` | **PIN — and audit.** Digest URIs must never be normalized by a router; a decoder that repairs its input is naming a different value (`CONTEXT.md:25-31`) |
| P12 | An initialize offering a version and an `Mcp-Protocol-Version` header disagreeing with the session's negotiated version yields HTTP 400 | `:1210-1216` | PIN |
| P13 | JSON-RPC batches are rejected — 400 over HTTP, a synthesized `-32600` over stdio | `McpProtocol.ts:19`; `McpServer.ts:947-954`, `:1177-1179` | PIN |
| P14 | `EnabledWhen` lets the served tool/resource/prompt list vary by the client's initialize payload | `:2128-2150`; `McpSchema.ts:2536` | **REFUSE.** `2026-07-28` states the tool set "**MUST NOT** vary per-connection" (server/tools). Using `EnabledWhen` writes an axis-B violation into our own server |

**P11 and P14 are the two that would silently produce wrong foldlab behavior**,
and neither is a spec ambiguity — both are pin choices that collide with foldlab
invariants. They belong in the conformance suite before any digest-addressed
resource ships.

---

## Part 5 — The verdict: the minimal MCP surface for a foldlab concierge/foundry server on rc.108

### What we get free

- **Tools, with enforced input validation.** `Toolkit` → `registerToolkit` →
  `tools/list` / `tools/call`, with call arguments decoded against the same
  schema that produced the advertised `inputSchema`
  (`Toolkit.ts:296-308`, `McpServer.ts:1324-1325`, test `McpServer.test.ts:237`).
  Derivation from `contract.describe` already makes drift structurally
  impossible (`proto/ts/src/mcp.ts:1-5`). **This is the whole load-bearing
  surface and it works.**
- **The four tool annotations**, with safe defaults (destructive, open-world) —
  `McpServer.ts:1292-1295`.
- **`structuredContent`** — a refusal already travels as a value with
  `isError: false` (`:1313`, `proto/ts/src/mcp.ts:84-87`).
- **stdio transport**, complete and conformance-tested (`:1028`;
  `TransportsTest.ts:38-146`).
- **Streamable HTTP POST**, with origin checking, `Accept` negotiation, 202 for
  notifications, session ids, and protocol-version header validation
  (`:1060-1245`) — everything except the parts `2026-07-28` deleted.
- **Cancellation**, mapped to Effect fiber interruption with pinned semantics
  (`:672-687`, `:576-591`; `UtilitiesTest.ts:31-157`).
- **Elicitation**, one schema in both directions with a typed decline
  (`:1828-1857`) — for scalar questions only.
- **Resources and RFC 6570 templates**, with per-parameter completion, as the
  serving surface for digest-addressed content (`:1413-1578`).
- **A conformance harness worth stealing.** 2 175 lines under
  `test/unstable/ai/McpServer/McpConformance/` whose tests are named after the
  spec's MUST/SHOULD sentences. foldlab's own conformance suite for P1-P14 should
  be written in that shape.

### What we build

1. **An object-typed refusal envelope for every tool** so `outputSchema` is
   actually advertised — `Schema.Struct` with a discriminant, not a top-level
   union (3.5, A9, P5). Smallest change with the largest proof consequence;
   touches `proto/ts/src/mcp.ts:67-73`.
2. **A refusal-kind enumeration in the served schema**, closing the
   already-recorded "agents cannot machine-check exhaustiveness over the nine
   kinds" finding at the protocol layer.
3. **The concierge as tools, not as completion or elicitation** — already true
   (`003:34-37`); this doc ratifies it against the alternatives rather than
   leaving it unexamined.
4. **`journal.read` as the streaming surface**, with the verified `{seq, head}`
   cursor in tool arguments (3.6, `CONTRACT.md:87-100`). No subscriptions, no
   SSE, no resumability.
5. **A foldlab conformance suite pinning P1-P14**, with P11 (URI normalization)
   and P14 (`EnabledWhen` / per-connection variance) as blocking items before
   any digest-addressed resource ships. Per the precept, it ships negative
   controls (`AGENTS.md:45-47`).
6. **A synthesizer seam for 015 that is not `sampling/createMessage`** —
   pluggable, journaled, with the certifier unchanged (3.4).
7. **Progress, only when a consumer demands it**, on `addTool` with per-client
   routing (3.7, A2, A3) — or, preferably, as journaled facts read at a cursor.
8. **Authorization**, entirely (A13), if the server is ever exposed beyond
   localhost.

### What we must not trust

- **Tool annotations as enforcement.** They are hints the client is told to
  distrust (D13). A `readOnlyHint` is true because the writ's three verbs make it
  true (W9), not because we said so.
- **Any notification as evidence.** Broadcast to all clients (P3), dropped before
  initialization (P4), coalesced on a timer (P2), never redelivered (D15). A
  notification is a hint to go read something; the read is the evidence.
- **MCP cursors, TTLs, or `_meta` as identity.** Opaque by mandate, stability only
  SHOULD, duplicates and gaps permitted (D7, D19). Transport never fingerprints
  (`CONTEXT.md:67-71`).
- **The `2025-06-18` lifecycle.** Sessions, `initialize`, `ping`,
  `logging/setLevel`, `resources/subscribe`, server-initiated requests — every
  one is gone or deprecated in the current revision (Part 2 axis B). Anything
  foldlab builds on them is scheduled for a rewrite.
- **`sampling/createMessage` as a controlled prompt.** Every field but
  `maxTokens` is advisory (3.4); the call is not reproducible and the protocol
  records nothing about what was actually run.
- **`completion/complete` as a frontier channel.** It cannot carry structure, has
  no `_meta` at this pin, and asks for a relevance ranking foldlab does not make
  (3.1).
- **Error codes as a refusal vocabulary.** `-32000`..`-32019` carry no agreed
  meaning (D22); refusals are values in the result, which is what W8 already
  says.

### The one-line answer

**Ship tools over stdio and Streamable-HTTP POST, put every refusal in the
success channel behind an object-typed `outputSchema`, put every cursor in the
arguments, and treat the rest of MCP — sessions, subscriptions, sampling,
completion, progress, resumability — as unreliable narration about a protocol
that has already replaced them.** That surface is the intersection of what
rc.108 implements correctly, what `2026-07-28` preserves, and what foldlab can
prove.

---

## Appendix A — the probe

Run from a workspace package (the `effect` catalog dependency resolves there,
not at the repo root). Not committed as machinery; reproduced here so the
**VERIFIED-BY-PROBE** claims in 3.5 and A9 are re-checkable.

```ts
import { Schema } from "effect"
import { Tool } from "effect/unstable/ai"

const Ok = Schema.Struct({ _tag: Schema.tag("Ok"), value: Schema.String })
const Refusal = Schema.Struct({ _tag: Schema.tag("Refusal"), law: Schema.String })

Tool.getJsonSchemaFromSchema(Schema.Union([Ok, Refusal]))  // {anyOf:[…]}, type: undefined
Tool.getJsonSchemaFromSchema(Ok)                            // type: "object"
Tool.getJsonSchemaFromSchema(Schema.Array(Schema.String))   // type: "array"
Tool.getJsonSchemaFromSchema(Schema.Unknown)                // {}, type: undefined
```

Observed output at `effect@4.0.0-rc.108`:

```
UNION outputSchema: {"anyOf":[{"type":"object","properties":{"_tag":{"type":"string","enum":["Ok"]},"value":{"type":"string"}},"required":["_tag","value"],"additionalProperties":false},{"type":"object","properties":{"_tag":{"type":"string","enum":["Refusal"]},"law":{"type":"string"}},"required":["_tag","law"],"additionalProperties":false}]}
UNION .type === undefined
=> advertised by registerToolkit? false
STRUCT .type === object
ARRAY .type === array
Unknown: {} | type: undefined
dynamic inputSchema: {"type":"object","properties":{}}
dynamic success json: {}
```

The guard that consumes this is `McpServer.ts:1286`:
`...(outputSchema.type === "object" ? { outputSchema } : {})`.

## Appendix B — citation ledger

**Pin — `repos/effect/packages/effect/src/unstable/ai/`, `effect@4.0.0-rc.108`**

- `McpProtocol.ts` — `:16-26` the sole adapter; `:19` no batches; `:20` version
  header required; `:34-48` `ProtocolAdapter` / `ProtocolVersion`.
- `internal/mcpProtocol.ts` — `:11-23` adapter interface; `:67-79` payload codecs.
- `internal/mcpProtocolRegistry.ts` — `:10-11` tag prefixing; `:44-51` duplicate
  version refusal; `:61` `select` fallback; `:62-68` request routing.
- `McpSchema.ts` — `:122` `ProgressToken`; `:146-157` `RequestMeta`; `:170`/`:189`
  result/notification meta; `:203`-`:255` cursor + paginated meta; `:288-304`
  `Annotations`; `:334`/`:381` capabilities; `:477-526` error codes; `:669` ping;
  `:702` `instructions`; `:712` initialize; `:761` cancelled; `:789` progress;
  `:823-913` resource + template; `:971`-`:1124` resource RPCs; `:1158`-`:1391`
  prompts; `:1412-1450` tool annotations; `:1458-1491` `Tool`; `:1499-1516` list;
  `:1533-1543` `CallToolResult`; `:1559` `CallTool`; `:1605`-`:1687` logging;
  `:1695-1859` sampling; `:1871-1972` completion; `:1984-2054` roots;
  `:2066-2159` elicitation; `:2176` `McpServerClient`; `:2307`-`:2415` the four
  RPC groups; `:2522` `param`; `:2536` `EnabledWhen`.
- `McpServer.ts` — `:110-194` the service; `:200-378` `make`; `:258-267`
  list-changed debounce; `:299` argument-only dispatch; `:328` `-32002`;
  `:357-376` completion; `:388-389` headers; `:407-417` sessions; `:458-478`
  `run`; `:534-574` client middleware; `:576-591` cancellation suppression;
  `:672-687` cancelled → interrupt; `:692-711` roots refresh; `:788-840`
  notification pump; `:881-903` `layer`; `:923-980` stdio serialization;
  `:1028-1039` `layerStdio`; `:1060-1092` `layerHttp`; `:1094-1245` HTTP protocol
  layer; `:1247-1341` `registerToolkit`; `:1413-1578` `registerResource`;
  `:1665-1770` `registerPrompt`; `:1828-1857` `elicit`; `:1865-1869`
  `clientCapabilities`; `:1875-1915` URI matcher and template compiler;
  `:1917-2077` wire handlers; `:2128-2150` `filterByClient`; `:2164-2187` log
  levels.
- `Tool.ts` — `:1608` `getDescription`; `:1654`/`:1676` JSON Schema derivation;
  `:1718` `Title`; `:1737` `Meta`; `:1761`/`:1787`/`:1814`/`:1841` the four hint
  annotations and their defaults.
- `Toolkit.ts` — `:203-217` streaming handler; `:296-308` parameter decode →
  `ToolParameterValidationError`.
- `test/unstable/ai/McpServer/` — `McpServer.test.ts:237` input validation;
  `:304` declared-failure messages; `:468` version down-negotiation; `:487`
  subscription isolation; `McpConformance/TransportsTest.ts:259` GET → 405;
  `:310` DELETE → 405 with session intact; `UtilitiesTest.ts:31-157`
  cancellation; `:158-207` progress tokens accepted; `ResourcesTest.ts:45`,
  `:318-439` subscriptions; `ToolsTest.ts:313`, `:318` structured content and
  `isError`; `CompletionTest.ts:151` max 100; `SamplingTest.ts:87` sampling via
  the peer client; `LifecycleTest.ts:106` down-negotiation.

**Spec — `modelcontextprotocol.io`, revision `2026-07-28`** (fetched
2026-08-14; `/specification/2026-07-28/…`)

- `changelog` — §Major changes 1-9, §Minor changes 3/4/5/6/10, §Deprecated 1-4,
  §Governance.
- `basic/index` — §ResultType, §Error Codes, §Statelessness, §`_meta`,
  §JSON Schema Usage.
- `basic/versioning` — §Protocol Version Negotiation, §Extension Negotiation,
  §Backward Compatibility.
- `basic/transports/stdio`; `basic/transports/streamable-http` — §Security &
  Endpoint, §Sending Messages, §Receiving Messages, §Cancellation, §Request
  Metadata, §Backward Compatibility → Earlier Streamable HTTP Revisions.
- `basic/patterns/mrtr` — §Core Types, §Supported Requests, §Server Requirements,
  §Client Requirements, §Error Handling; `basic/patterns/subscriptions`;
  `basic/patterns/cancellation`; `basic/patterns/progress`.
- `server/discover`; `server/tools`; `server/resources`; `server/prompts`;
  `server/utilities/completion`; `server/utilities/logging`;
  `server/utilities/pagination`; `server/utilities/caching`.
- `client/roots`; `client/sampling`; `client/elicitation`;
  `basic/authorization`.
- **UNVERIFIED (not fetched):** the `2025-06-18` revision pages; the three
  `basic/authorization/*` sub-pages; the external `ext-tasks` normative spec.
  Claims about `2025-06-18` in this doc are sourced from the pin's schema module
  and conformance suite, not from the spec text.

**foldlab**

- `AGENTS.md:45-50` prover/claims precepts; `:62-84` the Effect pin.
- `CONTEXT.md:19-31` canonical encoding and constrained decode; `:52-56` anchor;
  `:67-71` transport; `:112-117` declared right; `:129-142` journal / span /
  certificate; `:161-176` structural digest and identity order; `:178-192`
  certifier and catalog; `:194-199` semantic fold.
- `README.md:38-46` the three sorts and the register.
- `VERIFICATION.md:320-340` the certified capability envelope.
- `proto/SPEC.md:52` W6; `:53-59` W7/W8; `:60-62` W9.
- `proto/wire/CONTRACT.md:62-66` frontier fact; `:70-72` C1/C2; `:79-85`
  frontier ordering, C4, `refs`; `:87-100` `journal.read` cursor; `:119-144`
  refusal shape and the nine kinds; `:161-179` digest form and scheme tag.
- `proto/ts/src/mcp.ts:1-9` the derivation discipline; `:63-101` `mcpLayer`;
  `:67-73` `Tool.dynamic` with `success: Schema.Unknown`; `:79-88` verbatim
  replies.
- `docs/map/tickets/003-the-wrapper-prototype.md:30-64`;
  `015-the-grammar-foundry.md:19-51`; `016-the-ontology-explorer.md:21-55`;
  `020-the-effect-surface.md:45-78`.
- `docs/design/2026-08-13-effector-backed-workflow-replay.md:137-159` the replay
  precondition.
- `docs/research/2026-08-13-external-review-findings.md` §Secondary findings —
  the open refusal-`kind` string, and the schema-validation claim corrected in
  3.5.
