# effects — Effect-native content-addressed record/replay

`@foldlab/effect-replay` is a private mixed TypeScript/Lean library for
recording explicitly described Effect service calls into a content-addressed
history and replaying them without a live adapter. The TypeScript implementation
is current through M5, the E2/E3 descriptor slice, and the R2 remote baseline:
the in-memory and remote CAS adapters, pure reducer, session service,
replayable service kit, transparent orchestration, streamed transfer service,
and typed value/service projection are present.

The library keeps different evidence surfaces separate. TypeScript compilation
and tests observe the runtime implementation; the Lean model, conformance
ledger, and ratified manifest vectors live under their own gates. See
[`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) and the minted vocabulary in
[`docs/effect-replay/CONTEXT.md`](../../docs/effect-replay/CONTEXT.md).

## Runtime surface

The package barrel exports:

- CAS node Schemas, clause-named errors, and content identifiers from
  `cas/Node.ts`;
- the `CasStore` service and isolated in-memory adapter from `cas/Store.ts`;
- the `Cas.value` typed-value projection and `Cas.service` eager hydration
  descriptor from `cas/Value.ts` and `cas/Service.ts`;
- the typed remote configuration and failure family from `cas/Remote.ts`, plus
  `CasTransfer`, `Transfer.replayable`, and `Transfer.oneShot` from
  `cas/Transfer.ts`;
- `Cas.layerRemote`, which builds one shared `CasStore | CasTransfer` adapter
  and keeps the caller-provided `HttpClient` and native `Crypto` services
  visible as layer requirements;
- public session carriers and the synchronous pure reducer from
  `replay/Session.ts` and `replay/Reducer.ts`;
- operation descriptions and decisions from `replay/Operation.ts` and
  `replay/Decision.ts`;
- the runtime `Replay` service, `ReplayShape.run`, `layerReplay`, and `session`
  from `replay/Replay.ts`; and
- `replayable` from `replay/ServiceAdapter.ts`, which returns the internal-live
  role, record, and replay layers.

`internal/storage.ts`, `internal/live.ts`, and the `internal/remote*.ts`
modules are never exported. Their history/witness Schemas, binary carriers,
live bindings, remote state machine, and untrusted transport seam are
implementation details with no public canonicality or stability claim.

`Cas.value` encodes a Schema's Encoded form as recursively key-sorted,
finite-number-only UTF-8 JSON under an explicit kind tag and revision. Its
phantom `Root<A>` never skips the resident-node kind check. Encoding and
decoding failures are `ProjectionCodecFailure`; CAS failures retain their own
error members. `Cas.service` loads and decodes the root and runs its constructor
while the returned Layer is acquired, including when hydrating a replayable
kit's internal live role with `layerAs(kit.live, root)`.

## CAS value schema discipline

A value descriptor chooses one stable JSON-safe Encoded representation for
each field:

- Encode bytes with `Schema.Uint8ArrayFromHex`, or with
  `Schema.Uint8ArrayFromBase64` where size matters. Pick one representation per
  descriptor; never accept both.
- Encode big integers with `Schema.BigIntFromString`.
- Encode instants with `Schema.DateTimeUtcFromMillis`; epoch numbers avoid the
  format and zone ambiguity of ISO strings.
- Encode options with `Schema.OptionFromNullOr`. If the inner type is itself
  nullable, use a distinguishing representation instead because `null` cannot
  identify both cases.
- Encode set-like data as arrays sorted by an explicitly declared ordering;
  insertion order is not content identity.

Custom domain codecs use `Schema.decodeTo` or `Schema.encodeTo` only when their
encode direction is deterministic and total, their Encoded type stays within
`Schema.Json` (with finite numbers enforced at runtime), and the descriptor has
a `put` → `get` → `put` fixture asserting that both puts return the same root.

Each described service method must accept exactly one request value. Wrap
multiple logical arguments in a request object before describing the method.
The request, success, and typed-failure codecs are inferred per method, while
the operation revision remains explicit.

## Remote CAS profile

`Cas.layerRemote` speaks `cas-http/0`, a versioned project profile—not an HTTP
or CAS standard. It uses `GET {authority}/cas/{hex}` for loads and
`PUT {authority}/cas/{hex}` with a canonical node as the octet-stream body for
uploads. A load accepts only `200` with `application/octet-stream`; `404` is
`ContentNotFound`, `401` and `403` are typed authorization failures, `429`
becomes rate-limited machine input, and every `3xx` remains a redirect event.
Uploads accept `200`, `201`, or `204`; `409` is an integrity mismatch.

The HTTP shell performs no retry and follows no redirect. The library supplies
`redirect: "manual"` around each request, including with plain
`FetchHttpClient` wiring, so every `3xx` reaches the machine and becomes the
typed `redirectDenied` policy outcome. `redirectPolicy.maxRedirects` and
`redirectPolicy.crossOrigin` are validated configuration reserved for R4;
redirect following is not active in R2. The semantic adapter retries only a
`Transfer.replayable` source, up to `maxAttempts`, with the content address
rechecked on every attempt. A retryable failure from `Transfer.oneShot`
becomes `oneShotRetryRefused` and retains the underlying transport evidence.

Authority modes never silently fall back. `remote-authoritative` uses the
wire, `local-authoritative` admits locally without a remote claim, and
`offline` rejects puts with the typed `offline` policy marker. On Fetch
transport errors, `sentBytes` is necessarily a conservative prepared-byte
witness because the platform does not expose the transmitted count.

The four byte budgets bind at these `cas-http/0` stages:

| Stage | Plane and bound |
|---|---|
| `encoded` | Canonical upload bytes, checked by the machine before wire issue. |
| `decoded` | Load `content-length` declaration and the running response-byte counter. |
| `decompressed` | No distinct codec stage exists in `cas-http/0`; it shares the response counter with `decoded`. |
| `queued` | Bytes buffered awaiting admission, independent of transport or source rechunking. |

R2 verifies downloads completely before exposing bytes, using a scoped,
decoded-budget-bounded in-memory spool. Filesystem spooling and authenticated
chunk proofs are later slices. The test-side `ConformancePeer` interface is
the named landing point for the adopted LeanServer peer; R2 provides the Node
reference and hostile raw-socket bindings only.

Cold-pull limitation (R3 boundary): a cold replica cannot yet load a
reference-carrying parent when its children are absent locally. Parent
admission therefore returns `RemoteFailure` wrapping `DanglingReference`;
discovery-order closure pulling is the R3 slice. The adapter's diagnostic
decision transcript is intentionally unbounded in R2 and is not a production
telemetry buffer.

## Usage sketch

Assume `Rates`, `RatesShape`, `QuoteUnavailable`, and `liveRates` are ordinary
Effect service declarations, and that `runtimeLayer` supplies `layerReplay`
over one `layerMemory`. A session returns its durable witness root and, when
present, the recorded or consumed history root alongside the outcome.

```ts
const descriptions = describeService<RatesShape>("app/Rates")({
  quote: { revision: 1, request: Schema.String,
    success: Schema.Number, failure: QuoteUnavailable },
})
const kit = replayable(Rates, descriptions, liveRates)
const program = Rates.use((rates) => rates.quote("EUR"))
const flow = Effect.gen(function* () {
  const recorded = yield* session(program.pipe(Effect.provide(kit.record)),
    { mode: "record" })
  if (recorded.history === undefined) return yield* Effect.die("no history")
  const replayed = yield* session(program.pipe(Effect.provide(kit.replay)),
    { mode: "replay", history: recorded.history })
  return { recorded: recorded.outcome, replayed: replayed.outcome }
})
```

Record construction uses the live adapter; replay construction has no live
dependency. Both expose the original caller-facing method types.

## Replay ambient defaults

Replay mode overrides the default `Clock` and `Random` references with
tripwires and sets `TracerTimingEnabled` to `false`. Traced `Effect.fn`
orchestration therefore replays without consulting the tripwire Clock, while a
semantic `Clock` or `Random` use still produces a `Violated` session outcome.
Direct host calls such as `Date.now()` cannot be intercepted by these Effect
service defaults.

## Gates

From the repository root:

```powershell
mise run check:effects:ts
mise run check:effects
```

The first performs the frozen Bun install, strict source/test typechecks, and
Vitest suite. The second builds the Lean package under `--wfail`, regenerates
the ledger and manifests, checks transition and mutant constraints, and asserts
that generated conformance surfaces are byte-unchanged.

Research snapshots and their ownership are indexed in
[`research/README.md`](research/README.md). Code is licensed under the
[Apache-2.0 license](../../LICENSE).
