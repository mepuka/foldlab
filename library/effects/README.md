# effects — Effect-native content-addressed record/replay

`@foldlab/effect-replay` is a private mixed TypeScript/Lean library for
recording explicitly described Effect service calls into a content-addressed
history and replaying them without a live adapter. The TypeScript implementation
is current through M5: the in-memory CAS, pure reducer, session service,
replayable service kit, and transparent orchestration composition are present.

The library keeps different evidence surfaces separate. TypeScript compilation
and tests observe the runtime implementation; the Lean model, conformance
ledger, and ratified manifest vectors live under their own gates. See
[`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md) and the minted vocabulary in
[`docs/effect-replay/CONTEXT.md`](../../docs/effect-replay/CONTEXT.md).

## Runtime surface

The package barrel exports:

- CAS node Schemas, clause-named errors, and content identifiers from
  `CasNode.ts`;
- the `CasStore` service and isolated in-memory adapter from `CasStore.ts`;
- replay decisions and the synchronous pure reducer;
- operation-description types plus `describeService`;
- the `Replay` service, `ReplayShape.run`, `layerReplay`, and `session`; and
- `replayable`, which returns the internal-live-role, record, and replay layers.

`ReplayStorage.ts` and `ReplayLive.ts` are internal. Their history/witness
Schemas and binary carriers are implementation details with no public
canonicality or stability claim.

Each described service method must accept exactly one request value. Wrap
multiple logical arguments in a request object before describing the method.
The request, success, and typed-failure codecs are inferred per method, while
the operation revision remains explicit.

## Usage sketch

Assume `Rates`, `RatesShape`, `QuoteUnavailable`, and `liveRates` are ordinary
Effect service declarations, and that `runtimeLayer` supplies `layerReplay`
over one `layerMemory`. The CAS address boundary used during recording must
retain the resulting history root for the later replay attempt.

```ts
const descriptions = describeService<RatesShape>("app/Rates")({
  quote: { revision: 1, request: Schema.String,
    success: Schema.Number, failure: QuoteUnavailable },
})
const kit = replayable(Rates, descriptions, liveRates)
const program = Rates.use((rates) => rates.quote("EUR"))
const recorded = session(program.pipe(Effect.provide(kit.record)), { mode: "record" })
// Run `recorded`, then obtain `history` from the recording CAS address boundary.
const replayed = session(program.pipe(Effect.provide(kit.replay)),
  { mode: "replay", history })
```

Record construction uses the live adapter; replay construction has no live
dependency. Both expose the original caller-facing method types.

## Replay tracing caveat

Replay mode overrides the default `Clock` and `Random` references with
tripwires. `Effect.fn` spans consult the default `Clock`, so traced orchestration
control can produce a `Violated` session outcome even when its described leaves
are replayable. Use `Effect.fnUntraced` inside replayed orchestration unless the
clock access is intentionally part of the ambient-use check. Direct host calls
such as `Date.now()` cannot be intercepted by these Effect service defaults.

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
