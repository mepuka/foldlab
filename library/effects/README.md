# effects — Effect-native content-addressed record/replay

`@foldlab/effect-replay` is a private mixed TypeScript/Lean library for
recording explicitly described Effect service calls into a content-addressed
history and replaying them without a live adapter. The TypeScript implementation
is current through M5, the E2/E3 descriptor slice, the R3 remote front end, and
the record-mode delegation protocol at `effects-model@0.2.0`: the in-memory and
remote CAS adapters, pure reducer, session service, replayable service kit,
transparent orchestration, streamed transfer service, verified blob reads, and
typed value/service projection are present.

The library keeps different evidence surfaces separate. TypeScript compilation
and tests observe the runtime implementation; the Lean model, conformance
ledger, and ratified manifest vectors live under their own gates. See
[`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) and the minted vocabulary in
[`docs/effect-replay/CONTEXT.md`](../../docs/effect-replay/CONTEXT.md).

## Runtime surface

The package barrel exports exactly two namespaces — `Cas` and `Replay` — one
per plane. Inside a namespace the `Cas` prefix of internal module names drops:
the store tag is `Cas.Store`, the transfer tag is `Cas.Transfer`, the blob
surface is `Cas.Blob`, and the remote configuration is `Cas.RemoteConfig`.

- `Cas` carries the node Schemas, clause-named errors, and content
  identifiers; the `Store` service tag with the isolated in-memory adapter
  (`Cas.layerMemory`) and the scheme-0 canonical node codec
  (`Cas.encodeNode`/`Cas.decodeNode`); the `value` typed-value projection and
  `service` eager hydration descriptor; verified blob reads and recipe-1 blob
  construction under `Cas.Blob`;
  the `Transfer` service tag with the `restartable`/`oneShot` upload sources;
  the typed remote configuration and failure family; and `Cas.layerRemote`,
  which builds one shared `Store | Transfer` adapter and keeps the
  caller-provided `HttpClient` and native `Crypto` services visible as layer
  requirements.
- `Replay` carries the runtime `Replay` service with `Replay.layer` and
  `Replay.session`; the synchronous pure reducer `Replay.reduce` with its
  session carriers and decision vocabulary; `Replay.describeService`
  operation descriptions; and the `Replay.replayable` service kit, which
  returns the internal-live role, record, and replay layers.

Deeper module paths (`cas/*.ts`, `replay/*.ts`) remain importable for tests
and correspondence work; the reducer's clause helpers live only there.

`internal/storage.ts`, `internal/live.ts`, and the `internal/remote*.ts` and
`internal/merkle*.ts` modules are never exported. Their history/witness
Schemas, binary carriers, live bindings, remote state machine, untrusted
transport seam, and merkle tree/proof codecs are implementation details with
no public canonicality or stability claim.

`Cas.value` encodes a Schema's Encoded form as recursively key-sorted,
finite-number-only UTF-8 JSON under an explicit kind tag and revision. Its
phantom `Root<A>` never skips the resident-node kind check. Encoding and
decoding failures are `ProjectionCodecFailure`; CAS failures retain their own
error members. `Cas.service` returns a descriptor whose `layer` and `layerAs`
load and decode the root and run its constructor while the returned Layer is
acquired; `descriptor.layerAs(kit.live, root)` installs that same shape under a
replayable kit's internal live role instead of the public tag.

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

`Cas.layerRemote` speaks `cas-http/0`. The wire contract — resource
spaces, framings, status mappings, the capability document, batch and
publish semantics, and the blob node graph — is normative in
[`PROFILE-CAS-HTTP-0.md`](PROFILE-CAS-HTTP-0.md); this section
describes the library's behavior above that wire.

Remote layers eagerly probe `GET /control/capabilities` by default; setting
`capabilityProbe: "lazy"` lets the Layer acquire without network traffic and
defers one deadline-bounded, per-layer memoized probe until the first
wire-backed operation. The eight-byte document remains required and is never
persisted across layers.
`CasTransfer.missing` sends canonical, order-preserving key-list batches no
larger than the probed key limit and returns positional planning data only—it
never admits content or negatively caches absence. `CasTransfer.publish`
refuses locally unless the root and declared closure are confirmed.
`CasTransfer.push` resolves the complete local graph before operation-specific
wire traffic, plans missing keys in capability-sized batches, uploads children
before parents, and publishes the root last. A missing answer that contradicts
the machine's existing confirmation fails closed as `remoteRejected`; it is
never reported as a transfer that did not occur.

The HTTP shell performs no retry and follows no redirect. The library supplies
`redirect: "manual"` around each request, including with plain
`FetchHttpClient` wiring, so every `3xx` reaches the machine and becomes the
typed `redirectDenied` policy outcome. `redirectPolicy.maxRedirects` and
`redirectPolicy.crossOrigin` are validated configuration reserved for R4;
redirect following is not active in this slice. The semantic adapter retries only a
`Cas.restartable` source — a stream factory reacquired for every attempt — up
to `maxAttempts`, with the content address rechecked on every attempt. A
retryable failure from `Cas.oneShot` becomes `oneShotRetryRefused` and retains
the underlying transport evidence.

Authority modes never silently fall back. `remote-authoritative` uses the
wire, `local-authoritative` admits locally without a remote claim, and
`offline` rejects puts with the typed `offline` policy marker. On Fetch
transport errors, `sentBytes` is necessarily a conservative prepared-byte
witness because the platform does not expose the transmitted count.

Four byte budgets and one key-count bound bind at these `cas-http/0` stages:

| Stage | Plane and bound |
|---|---|
| `encoded` | Canonical upload bytes, checked by the machine before wire issue. |
| `decoded` | Load `content-length` declaration and the running response-byte counter. |
| `decompressed` | Non-identity `content-encoding` is refused as `invalidHeaders`, so no codec stage ever runs; the bound is still checked against the `decoded` response counter. |
| `queued` | Bytes buffered awaiting admission, independent of transport or source rechunking. |
| `keys` | Batch key count, bounded by the probed `maxBatchKeys` capability rather than by configuration. |

The current adapter recomputes and checks downloads completely before exposing bytes, using a scoped,
decoded-budget-bounded in-memory spool. Filesystem spooling and authenticated
chunk proofs are later slices. The test-side `ConformancePeer` interface is
the named landing point for the adopted LeanServer peer; this slice provides the Node
reference and hostile raw-socket bindings only.

Cold-pull limitation (deferred pull-staging boundary): a cold replica cannot yet load a
reference-carrying parent when its children are absent locally. Parent
admission therefore returns `RemoteFailure` wrapping `DanglingReference`;
discovery-order closure pulling remains a later slice. The adapter's diagnostic
decision transcript is a most-recent ring capped by
`decisionTranscriptCapacity` (default 4096); snapshots report how many older
entries were dropped. It remains diagnostic state, not a production telemetry
buffer.

## Usage sketch

Assume `Rates`, `RatesShape`, `QuoteUnavailable`, and `liveRates` are ordinary
Effect service declarations, and that `runtimeLayer` supplies `Replay.layer`
over one `Cas.layerMemory`. A session returns its durable witness root and,
when present, the recorded or consumed history root alongside the outcome.

```ts
import { Cas, Replay } from "@foldlab/effect-replay"

const descriptions = Replay.describeService<RatesShape>("app/Rates")({
  quote: { revision: 1, request: Schema.String,
    success: Schema.Number, failure: QuoteUnavailable },
})
const kit = Replay.replayable(Rates, descriptions, liveRates)
const program = Rates.use((rates) => rates.quote("EUR"))
const flow = Effect.gen(function* () {
  const recorded = yield* Replay.session(program.pipe(Effect.provide(kit.record)),
    { mode: "record" })
  if (recorded.history === undefined) return yield* Effect.die("no history")
  const replayed = yield* Replay.session(program.pipe(Effect.provide(kit.replay)),
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
mise run check:effects:research
```

The first performs the frozen Bun install, strict source/test typechecks, and
Vitest suite. The second builds the Lean package under `--wfail`, regenerates
the ledger and manifests, checks transition and mutant constraints, and asserts
that generated conformance surfaces are byte-unchanged. The third asserts the
research snapshots are byte-equal to their canonical owners.

Research snapshots and their ownership are indexed in
[`research/README.md`](research/README.md). Code is licensed under the
[Apache-2.0 license](../../LICENSE).
