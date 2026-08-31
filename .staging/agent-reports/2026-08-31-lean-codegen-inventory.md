# Where the estate generates code from Lean, and what fires during a build

Host: macOS coordinator. Measured at `56a938fe` plus the working tree's
in-flight `dev`-lane edits. `~/.elan/bin/lake` 5.0.0 / Lean 4.33.1,
mise 2026.8.12.

## Verdict

**35 `lean_exe` declarations across eight lakefiles; 30 of them emit
into the repo.** Twenty-nine were already outside a normal build's path
— skipped by the BS1 build relation, or reachable only from a manually
excluded gate.

**Exactly one Lean emitter fired on every build:** `gen:cas-laws` →
`lake exe laws` → `library/cas/meta/out/laws.META.json`. It declared no
`sources`, so `mise run gen` re-ran it on every invocation, and `gen`
is the first line of `mise run check`.

It is now silenced, and the proof is below. Nothing else in the estate
runs a Lean emitter during `mise run gen`.

## 1. The inventory

### `library/cas/lakefile.toml` — 23 emitters, the whole backend surface

Every row below is `lean_exe` → driving `gen:*` task → committed
outputs. The join is not my transcription: it is
`library/cas/meta/out/environment.META.json`, emitted by
`tools/EnvLedger.lean` from `mise.toml` and the lakefile themselves.

| exe | source | driven by | writes |
|---|---|---|---|
| `vectors` | `tools/Vectors.lean` | `gen:cas-vectors` (mise.toml:208) | 8 files under `vectors/` |
| `schemas` | `tools/Schemas.lean` | `gen:cas-schemas` (:224) | 12 under `schemas/`, plus `annotationPlane.ts`, `StoreKindSchema.ts` |
| `verdicts` | `tools/Verdicts.lean` | `gen:cas-verdicts` (:246) | `conformance/schema-verdicts.json` |
| `admissionmap` | `tools/AdmissionMap.lean` | `gen:cas-admission-map` (:253) | `conformance/admission-map.json` |
| `emitwire` | `tools/EmitWire.lean` | `gen:backend-wire` (:266) | `effects/src/cas/generated/ConformanceVectorSchema.ts` |
| `emitword` | `tools/EmitWord.lean` | `gen:backend-word` (:273) | `WordLogSchema.ts` in **both** effects and workbench |
| `emitgate` | `tools/EmitGate.lean` | `gen:backend-gate` (:283) | `SchemaAdmission.ts` |
| `emitarchitecture` | `tools/EmitArchitecture.lean` | `gen:backend-architecture` (:290) | `architecture.ts` |
| `emitprograms` | `tools/EmitPrograms.lean` | `gen:backend-programs` (:297) | `VectorPrograms.ts` + 2 JSON |
| `emitlayers` | `tools/EmitLayers.lean` | `gen:backend-layers` (:308) | `EmittedLayers.ts` |
| `mcpspec` | `tools/EmitMcp.lean` | `gen:backend-mcp` (:315) | `mcp/cas-tools.json` |
| `emitlift` | `tools/EmitLift.lean` | `gen:lift-manifest` (:322) | `lift/manifest.json` + `.md` |
| `emitgrammar` | `tools/EmitGrammar.lean` | `gen:grammar-manifest` (:332) | 6 files across effects + workbench, and `REGISTRY.md` |
| `materialize` | `tools/Materialize.lean` | `gen:backend-materialize` (:347) | 11 modules under `materialized/estate/` |
| `surface` | `tools/Surface.lean` | `gen:cas-surface` (:391) | `meta/out/surface.META.json` |
| `obligations` | `tools/Obligations.lean` | `gen:cas-obligations` (:398) | `meta/out/obligations.META.json` |
| `laws` | `tools/Laws.lean` | `gen:cas-laws` (:425) | `meta/out/laws.META.json` |
| `debts` | `tools/Debts.lean` | `gen:debts` (:435) | `meta/out/debts.META.json` |
| `axioms` | `tools/Axioms.lean` | `gen:axioms` (:447) | `meta/out/axioms.META.json` |
| `emitmeta` | `tools/MetaShapes.lean` | `gen:meta` (:454) | 7 `.META.schema.json` + `metaSchemaAst.META.ts` + `MANIFEST.META.json` |
| `trust` | `tools/TrustCensus.lean` | `gen:trust` (:470) | `meta/out/trust.META.json` |
| `strata` | `tools/Strata.lean` | `gen:strata` (:489) | `meta/out/strata.META.json` |
| `envledger` | `tools/EnvLedger.lean` | `gen:env-ledger` (:521) | `meta/out/environment.META.json` |

Note the two cross-package writers: `emitword` and `emitgrammar` each
write the effects **and** workbench copies in one run. There is no
`gen:workbench` task, and mise.toml:812-840 states why.

### `experiments/entity-store-shell/lakefile.toml` — 4 exes, 2 emit

`estore-vectors` and `harness` write `vectors/**` and `transcripts/**`
via `gen:vectors` (mise.toml:124). `estore` and `estore-encode` are
CLI, not emitters.

### `experiments/entity-store-ledger` — Lean by shell-out, not by lakefile

`src/extract.ts:38,41` and `src/command.ts:23` invoke
`~/.elan/bin/lake` in two sibling packages; `paths.ts:10` hardcodes the
binary. `gen:ledger` (mise.toml:150) writes
`docs/entity-store/LEDGER.md` from that extraction.

### `experiments/entity-store-generate` — the inverse direction

This one generates **Lean from TypeScript**, not the reverse.
`src/check.ts` regenerates the tree into `mkdtempSync(tmpdir())` and
compares it against the committed
`experiments/entity-store-generate/generated/`; `check.ts:68` then runs
`lake build` on the committed tree. It writes nothing into the repo.

### `library/effects/archive/lean-model-0.3/lakefile.toml` — 5 exes

`conformance_ledger`, `conformance_manifest`, `conformance_mutation`,
`conformance_brief`, `axiom_gate`. Driven by `gen:effects:archive` /
`check:effects:archive` / `brief:effects:archive` — all three sit in
the ledger's `excludedGates`, unreachable from `check` and `check:ci`.

### `experiments/entity-store-extract/twin/extract-lean` — 1 exe

`extract_twin`, consumed by `twin/harness/harness.ts:33`. Its gate
`check:extract-twin` is a standing manual exception (mise.toml:883)
and is in `excludedGates`.

### `.staging/fixture-gen/{lean,ts-leg}` — 2 exes

`fixgen` and `ts_leg`. Wired to no mise task; they run only by hand.

## 2. What actually fired, before

`mise run gen`, twice in a row, from a warm tree:

```
### run 1
[gen:cas-laws] $ lake exe laws
### run 2
[gen:cas-laws] $ lake exe laws
```

Every other `gen:*` task printed `sources up-to-date, skipping`. A
snapshot of all 110 committed files reachable from a declared `outputs`
glob, taken before and after, showed **0 rewritten and 0 changed** —
the emitter was burning a Lean run per build to produce bytes that were
already there.

The cause is declaration, not behaviour: `[tasks."gen:cas-laws"]`
carried `description`, `dir` and `run` and nothing else. The
environment ledger had been reporting it the whole time —
`undeclared: ["gen:effects:research", "gen:cas-laws"]` and
`unjoined: ["laws"]`.

`tools/EnvLedger.lean:57-62` holds that an undeclared task is not an
error, because it is the correct answer when the real inputs cannot be
named. That defence does not cover this one. `laws` reads the compiled
environment and nothing else: `Law.registry` is a Lean value that
transcribes SCHEMA-MATERIALIZATION.md's queue by hand
(`tools/Law.lean:55`), and the `LAW <id>` claims it joins are
docstrings in the tree. Its sibling `check:cas:laws` (mise.toml:639)
already named that exact input set. The emitter's own half never did.

## 3. The silencing, and the proof

`[tasks."gen:cas-laws"]` now declares the sibling emitters' source
globs plus `SCHEMA-MATERIALIZATION.md` (over-declared on purpose,
matching its gate's list), and `outputs = ["meta/out/laws.META.json"]`.

Three consecutive `mise run gen` invocations after the edit:

```
### run A (first after the edit)   ### run B                            ### run C
[gen:cas-laws] $ lake exe laws     [gen:cas-laws] up-to-date, skipping  [gen:cas-laws] up-to-date, skipping
[gen:env-ledger] $ lake exe envledger  [gen:env-ledger] up-to-date, skipping  [gen:env-ledger] up-to-date, skipping
```

Run A is the relation being recorded for the first time, and
`gen:env-ledger` re-firing because `mise.toml` is one of its declared
sources (mise.toml:534). B and C are the steady state.

A full `mise run gen` now runs **no Lean emitter at all** — 27 of 28
lines skip, and the one that runs is `gen:effects:research`, a bun
script.

The ledger agrees, and it is regenerated rather than asserted:

```
undeclared: ['gen:effects:research']
unjoined:   []
```

Gates green, forced so nothing is skipped:

```
mise run --force check:cas   → EXIT 0
  ok meta/out/environment.META.json (47903 bytes) — 53 tasks, 23 exes, 8 pins
  ok meta/out/laws.META.json (9963 bytes) — 9 of 37 rulings bound, 28 unbound
  check:cas:laws — 13 of 13 controls fire
```

That run swept `check:cas`, `check:cas:surface`, `check:cas:obligations`
and `check:cas:laws`. Every `--check` binary passed, so the byte
identity of all 23 cas emitters' fixtures is unchanged by this edit.
`git diff` over the derived tree stays empty.

## 4. What I did not silence, and why

`gen:effects:research` (mise.toml:677) still runs on every `gen`. It is
`bun scripts/sync-research.ts --write`, not Lean, so it is outside what
was asked. It is the last member of `undeclared` and is a one-line fix
of the same shape if wanted.

The Lean **builds** in the check chain still run every time, correctly:
`check:fips202`, `check:entity-store`, `check:machine`, `check:cas`,
plus the `lake build` inside `check:generate` and the shell-outs in
`check:ledger`. These compile and assert; none of them generates code
into the repo.

## 5. Files touched

- `mise.toml` — `[tasks."gen:cas-laws"]` gains `sources`/`outputs`, with the reasoning above it.
- `library/cas/meta/out/environment.META.json` — regenerated; `unjoined` empties, `undeclared` loses a member.

Both files were already dirty with the in-flight `dev`-lane work, so
this change is interleaved with it in the working tree and may want
splitting before it is committed.
