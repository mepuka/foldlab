# Engine service spec — recognition engines as Effect services

Status: PROPOSED 2026-08-28, pre-grade until grilled. Companion to
[differential-testing-spec.md](differential-testing-spec.md); this
document answers "what is the oxc engine, architecturally — context or
a service?" and specifies the Effect-idiomatic shape the harness's
invocation layer grows into. Exact construct names are verified
against the pinned `effect@4.0.0-rc.112` source at implementation time
(standing lane law: search the pinned source for the cleanest
constructs; this spec fixes shapes, not spellings).

## 1. The answer: three strata

The question "context or a service?" dissolves into three layers with
different natures:

1. **The contract is pure data — never a service.** `contract.ts`
   (verdict types, refusal taxonomy, spectrum, manifest, canonical
   JSON, `verdictKey`) is the portable stratum that mirrors to Lean.
   It has no effects, no environment, no lifecycle; wrapping it in a
   service would trap the one layer that must stay first-order.
2. **An engine is a service.** "Engine" is the capability *recognize
   source text into verdicts*; realizations differ in everything else
   (in-process function, spawned linter, future Lake executable). That
   is exactly what a service interface is for.
3. **Invocation context is configuration, provided by layers.** Where
   the oxlint binary lives, which config file, which flags, which
   working directory — that is a config service consumed by the oxc
   engine's layer, not part of the engine interface. The interface
   must not know oxlint exists.

## 2. Service shapes

One interface, many tags — the gate needs the engines *severally*
(it compares them), so each leg gets its own tag rather than one tag
with a swapped implementation:

```ts
// the capability (interface — shape only, names verified at impl)
interface RecognitionEngine {
  readonly name: "ck" | "oxc" | "lean"   // engine identity, in reports
  readonly recognize: (source: string) =>
    Effect<ReadonlyArray<Verdict>, EngineError>
}

// tags (one per leg; the gate demands both)
CkEngine  : Tag<CkEngine,  RecognitionEngine>
OxcEngine : Tag<OxcEngine, RecognitionEngine>

// configuration for the spawned leg (its layer's requirement,
// invisible to the interface)
interface OxcConfig {
  readonly oxlintBin: string        // resolved binary path
  readonly configPath: string       // .oxlintrc.json
  readonly extraArgs: ReadonlyArray<string>
}
```

Layers:

- `CkEngineLive` — no requirements. Wraps the pure `liftSource` with
  `Effect.sync`/`try`; parse panics become a typed error instead of a
  thrown exception.
- `OxcEngineLive` — requires `OxcConfig` plus the platform services
  (`CommandExecutor`, `FileSystem`, `Path` from `@effect/platform`).
  Spawns oxlint per §3, decodes per §4. The current
  `Bun.spawnSync`/`node:fs`/`URL.pathname` plumbing in `gate.ts` is
  retired by this layer — hand-wrapped host IO in Effect code is a
  standing defect class in this estate, and the `pathname` form is
  the concrete reason the gate cannot run on Windows today.
- `LeanEngineLive` (future, N=3) — same `CommandExecutor` seam, a
  Lake-built executable speaking canonical JSON on stdout. It binds
  the identical interface and is admitted the identical way: by
  passing the agreement gate beside the other legs. Note the
  asymmetry the README already states: only the Lean realization may
  additionally *execute* documents against the reference handler;
  that capability is deliberately NOT on this interface — the
  interface is hoover-side by construction.

The invocation seam of record stays `source → Verdict[]` exactly as
the contract says; services realize the seam, they do not widen it.

## 3. Process invocation (oxc leg)

- Build the command from `OxcConfig`: `oxlint -c <configPath> -A all
  --format json <files…>`, cwd pinned to the package root so the
  config's relative plugin path resolves identically on every host.
- Batch invocation is the norm (oxlint amortizes across files); the
  layer exposes single-source `recognize` by writing the source to a
  temp file via `FileSystem` and reaping it — and a bulk
  `recognizeAll(files)` used by the gate to keep the 3x wall-clock
  advantage. Both produce the same verdicts per the contract; the
  bulk path is an optimization, never a semantic fork.
- Non-zero exit with no parseable output, spawn failure, and timeout
  are distinct typed errors (§5) — never a silent empty verdict list,
  which the gate would misread as agreement-on-nothing.

## 4. Wire decoding (Schema discipline)

The precedent stands: wire bytes decode INTO the domain through
schemas and stock transformations, no casts. The oxlint output is a
wire format and gets a schema:

- `OxlintDiagnostic`: `{ code, message, filename, severity, labels }`
  — filter on `code === "dslv0(lift)"`.
- `Verdict` as a discriminated union on `kind` (`Lift` | `Refusal`),
  `RefusalCode` as a literal union lifted verbatim from the contract.
- `diagnostic.message` decodes by composing the JSON-string
  transformation with the `Verdict` schema (the stock
  parse-JSON-then-decode composition) — replacing today's
  `JSON.parse(d.message)` double-cast.
- **Canonical JSON stays the byte law.** Schemas validate structure on
  the way IN; every byte written (gate reports, ledger rows, records)
  goes OUT through `contract.canonJson`. Key order is never delegated
  to `JSON.stringify` or to a schema encoder.
- The same `Verdict` schema is the T4 generator seam: the pinned
  `effect` Schema module derives fast-check arbitraries, so property
  tests and wire decoding share one source of truth.

## 5. Error taxonomy

Tagged errors, one family (names illustrative):

- `EngineParseFailure` — the underlying parser threw; carries engine
  name and cause. (A refusal is NOT an error — refusals are verdicts.)
- `OxlintSpawnError` / `OxlintExit` / `OxlintTimeout` — process-level
  failures, with argv and stderr captured.
- `OxlintOutputDecode` — schema decode failure, carrying the offending
  payload; a contract drift alarm, not a skip.
- `FixtureLaneAbsent` — the fixture corpus (`.staging/fixture-gen`)
  is not generated on this host. The README promised the gate would
  "say so"; before this service refactor it threw bare `ENOENT`. The
  typed error made that promise checkable in portability tier T7. That
  tier was retired on 2026-08-29 and no longer supplies regression
  coverage.

## 6. The gate as a program

`AgreementGate` becomes an Effect program requiring `CkEngine`,
`OxcEngine`, `FileSystem`, `Path`: enumerate fixtures, run both legs,
compare declaration-ordered, detail-inclusive verdict lists (`pos`
excluded — ruling R10), and return a
`GateReport` *value* — counts, disagreement list, per-file detail —
which the CLI renders and the records lane serializes via `canonJson`.
The report type gets a schema like everything else on the wire. The
gate's trust statement is unchanged: it is the harness's only trust
mechanism, and nothing in this spec touches what it means — only how
it is invoked.

## 7. The independence law survives the refactor

`plugin.mjs` stays deliberately self-contained: no imports from
`src/`, no shared recognition code, exactly as its header warns. The
service layer wraps *invocation* of the two legs; it must never become
a place where recognition logic quietly unifies, or the gate proves
nothing. Concretely: `OxcEngineLive` may import the contract (shapes
and codes) and nothing else from the ck side; `plugin.mjs` continues
to duplicate the walker by design.

## 8. Dependency decision (surfaced, not assumed)

This spec requires `@effect/platform` + `@effect/platform-bun` at pins
matching the `effect` rc, plus (T4) `fast-check` — three new exact
pins and a TOOLS.md admission for fast-check before its output enters
gated work. `effect` itself is already a dependency (the oxc plugin
runs on the effect-oxlint chassis). If the platform packages are not
to be added, the fallback is NOT hand-wrapped `node:fs`/`Bun.spawnSync`
— it is deferring this spec; the estate does not take the workaround.

## 9. Landing order

After the testing spec's docket rules (§4 there) and alongside its
tiers: contract untouched → schemas (§4) → error family (§5) →
`CkEngineLive`/`OxcEngineLive` + `AgreementGate` (§2, §6) → CLI
becomes a thin `@effect/cli` adapter over the services (the estate's
standing CLI law) → `LeanEngineLive` when the Lean walker exists.
