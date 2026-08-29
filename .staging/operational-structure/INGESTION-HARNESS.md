# Ingestion harness — scout report

Repo at `771ba655` (Merge G4). Working tree dirty: `mise.toml` modified (adds `check:workbench`), `experiments/workbench/` untracked. **`mise run check` is red today** on its own `git diff --exit-code` (mise.toml:191-204) until that commits.

---

## (a) The operational map

### Structural fact that governs everything below

`.gitignore:1-2` ignores `.staging/*` except its README. Every input the harness eats lives there:

| Input | Path | Committed? |
|---|---|---|
| Pinned Effect source cache | `.staging/e2/src-cache/` | **no** |
| tree-sitter clones + C seam | `.staging/treesitter/clones/` | **no** |
| Harness fixture corpus (265) | `.staging/fixture-gen/ts-leg/fixtures/` | **no** |
| Wild corpus | `corpus/` (`.gitignore:14`) | **no** |
| dsl-proposal, ADMISSION-MAP | `.staging/libfree/`, `.staging/schema-materialization/` | **no** |

Committed artifacts are only the *outputs* (`inventory.json`, `corpus-manifest.json`, `project-labels.json`). **On a fresh clone nothing in this harness runs.** Regeneration procedure for `.staging/e2/src-cache` exists nowhere in-tree — `twin/bootstrap.sh` re-materializes the tree-sitter clone, `.staging/fixture-gen/mise.toml:19-26` regenerates the fixtures, but the Effect src-cache has no bootstrap.

---

### 1. `experiments/entity-store-extract/` — Stage 1

**Runs today: YES on this host, and only on this host.**

- Pins verified live: `git hash-object` of `.staging/e2/src-cache/{SchemaAST,SchemaRepresentation}.ts` = `e99d7f47…` / `6282ab9c…` — exactly `src/extract.ts:29-37` and `.reference/provenance/sources.lock.json:61-110`.
- `node_modules/typescript` = 5.9.2 (matches `package.json:6`). `package.json` has **no `scripts` block** — invocation is `bun run src/extract.ts` / `bun test` by hand (`INVENTORY-SCHEMA.md:95-98`).
- Default srcDir is hardcoded `../../../.staging/e2/src-cache` (`src/extract.ts:462`), same in `test/extract.test.ts:23` and `twin/harness/harness.ts:31`.
- Twin: clone at pin `3a57f55e` confirmed; all four C-seam digests match `twin/bootstrap.sh:29-33`; `extract-lean/.lake/build/bin/extract_twin` built (100 MB, 2026-08-28). Toolchain v4.32.0 — **the only v4.32.0 Lake project in a graded tree**; everything else is v4.33.1.

**What it proved.** 21 variants; five-way enumeration agreement 21/21/21/22/22 (`inventory.json.counts`); byte-determinism; pin-refusal (`EXT-1`, tamper test `test/extract.test.ts:31`); and the cross-instrument gate — two independent parsers producing byte-identical inventory bodies, normalizing only `extractor.instrument`/`instrumentVersion` (`twin/harness/harness.ts:173`, `README.md` "The gate"). `assertErrorsDisjoint` (`ExtractTwin.lean:518-523`) makes grammar drift into the walk loud.

**What rotted.**
- `mise.toml:224-231` `check:extract-twin` exists but is **explicitly out of the `check` chain** (its own description says so). There is no `gen:inventory`, no `check:extract`. EXT-6 (`SPECS.md:38-40`) is entirely unwired.
- `REPORT.md:7` "C4: not applied to TOOLS.md" is **stale** — both admission rows landed: `docs/lab-core/TOOLS.md:26` (typescript@5.9.2) and `:31` (lean4-tree-sitter). The addendum at `REPORT.md:91-99` records the second; the §1 header was never corrected.
- **R-1 is discharged**, not pending (`docs/entity-store/RULINGS.md:205`, `docs/entity-store/CONTEXT.md:8`). The extract lane's "awaiting operator ruling (C4/R-1)" framing is out of date on both counts.
- ACC-1…4 and FIX-1…4 (`SPECS.md:42-83`) remain **specs with no artifact**: no `admission-map.json`, no `model-extensions.json`, no fixture corpus in this lane.
- `.tmp-tamper/` left in the working tree (gitignored scratch from the tamper test).
- Twin harness pins `effect@4.0.0-rc.111` (`twin/harness/package.json:9`) while `experiments/lift-harness` and `experiments/workbench` pin `rc.112`. `experiments/workbench/package.json:35` already records this as an **unresolved pin (C6 pending)**.

---

### 2. `experiments/entity-store-generate/` — Stage 2

**Runs today: YES, and portably** — zero dependencies (`package.json` has no `dependencies`), `bun test` is builtin, `bun run gen`/`check` read `../entity-store-extract/inventory.json`. The only external requirement is `lake` on PATH (`src/check.ts:67-68`) with toolchain v4.33.1 (matches every graded project).

**What it proved.** The gate shape: byte-compare the whole regenerated tree against the committed one, protect the single hand-written file, then `lake build` (`README.md` "Run"). `generated/EntityStoreGenerate/Inventory.lean:53-58` carries three decided theorems (`all_variants_complete`, `tags_distinct`, `constructor_count = 21`) and line 1 carries the full provenance stanza.

**What rotted / what it never did.**
- **Not in `mise.toml` at all.** No `gen:entity-store-generate`, no `check:generate`.
- Last touched 2026-08-25 (`21c0a7ff`) — the oldest lane here, untouched through four days of estate motion.
- It consumes ~1/8 of the inventory: `generate.ts:147-155` *decodes* `fields`/`ctorParams`/`baseFields` strictly, then emits **only `tagLiteral`**. No field is transcribed into Lean. The 21 constructors are nullary.
- Its target carrier is nothing the estate uses. The gated consumer of inventory facts is `experiments/entity-store-model/E2/Correspondence.lean` — a **hand-written** Shape-B correspondence over `E2.SchemaCore` (13 variants incl. `mu`/`var`/`address`), whose header (`:1-4`) says "in the generated pipeline these three parts are emitted from inventory.json." That pipeline was never built.

---

### 3. `experiments/lift-harness/` + `.staging/parser-experiments/dslv0/`

**Runs today: PARTIALLY.** `bun x vitest run` and `bun x tsgo --noEmit` run; **`bun bin/main.ts gate` cannot run on a fresh checkout** — `HarnessPaths.ts:56` resolves `fixtures` to `.staging/fixture-gen/ts-leg/fixtures`, gitignored. On this host the 265 fixtures are present, so the gate runs. `.oxlintrc.json` loads `./src/plugin.mjs` (local, committed).

`.staging/parser-experiments/dslv0/` is **superseded**: `experiments/lift-harness/README.md:8-11` names `ngram/`, `lift/`, `dslv0/` as "original run records and superseded scripts; this package is canonical". `dslv0/` still holds its own `plugin.mjs`, `gate.ts`, `node_modules`. `docs/lab-core/TOOLS.md:37` still **cites the dead path** `.staging/parser-experiments/dslv0/` as the oxc chassis's home.

**What R1-R12 proved** (`7d8dda24`, `docs/differential-testing-spec.md`): 265/265 verdict agreement across two independent engines including detail strings (R10), 9/9 lifts both legs, T1-T8 tiers, an append-only divergence ledger (`test/ledger.json`), and three Windows portability defects pinned as tests (T7).

**What rotted — the R11 authority is split-brain.** This is the sharpest defect found:

- `src/contract.ts:29` imports `../../../library/effects/src/cas/generated/lift/manifest.json` — the Lean-generated authority (`lake exe emitlift`, byte-gated in `check:cas`).
- `src/oxc-engine.mjs:38` reads `new URL('./manifest.json', import.meta.url)` — i.e. **`experiments/lift-harness/src/manifest.json`, a stale local copy**.
- The comment directly above it (`oxc-engine.mjs:35-37`) asserts "this leg reads the same bytes `contract.ts` types. Engines share DATA, never code; that is the whole reason the agreement gate proves anything." **False at HEAD.**
- `contract.ts:122` compounds it: "The AUTHORITY is `./manifest.json`" — stale prose contradicting line 29.
- Measured drift today: `details`, `pins`, `natBits`, `candidateDepthMax`, `natLiteralPattern`, `payloadHexPattern`, `unreachableV0` all **byte-equal**; `rules` differ only by an added `description` key per rule; the generated file additionally carries `elements`. So the gate is still *semantically* green — but a Lean edit to `Cas.Lift.manifestV0` now moves one leg and not the other, silently.

Other rot: `README.md` and `mise.toml` (dir-scoped) still describe promotion as future; `mise.toml:1-3` says "On promotion these graduate as `check:harness` / `census:harness`" — **not done**. `wink-naive-bayes-text-classifier@2.2.1` (`package.json:12`) has **no TOOLS.md row** (mitigated: `sieve.ts` is imported only by `cli.ts:23`, never by `gate.ts` — out of the trusted path).

**Schema-surface (R8 slice 4) vs PROGRAM ingestion — the distinction, grounded.**

| | Schema-surface ingestion (R8) | Program ingestion |
|---|---|---|
| Ruling | `library/cas/EFFECTS-BACKEND.md:120-133` (ratified), slice 4 at `:330-331` | R7 `EFFECTS-BACKEND.md:110-117` + the lift-harness |
| Reads | pinned `.ts` **declarations** (types, signatures) | `Effect.gen` **bodies** |
| Instrument | the Stage-1 extractor pair | the lift-harness's two engines (ck / oxc) |
| Product | Lean target rows (`Cas/Backend/Target.lean`, 5 seed rows rfl-pinned at `:93-127`) + the 21-variant inventory | `Lift` documents (`contract.ts:68-76`) |
| Lands in | the **schema plane** — `Cas.Schema.Ast` via `Cas.Schema.ingest` | the **program plane** — `PProg = List PLine` (`Cas/Lang/Defun.lean:169-176`) |
| Status | door LANDED and gated; the extract→generate pipeline pointing at it is NOT built | recognizer LANDED and gated; the Lean landing is NOT built |

`R-SCHEMA` (`dsl-proposal.md:249-257`) says `Schema.*` combinator expressions are *value-level type descriptions — data, not computation*, and route to the schema plane, R8's lane. That is a **register in an un-grilled `.staging` proposal**, not a ruling. Its content is however already realized in the gated tree: `Cas.Schema.ingest` (`Cas/Schema/Ingest.lean:6-21`) takes Effect's native persistent `SchemaRepresentation` document (revision 1) and answers a canonical code.

---

### 4. `.staging/treesitter/` + `experiments/parser-census/`

**Grammar pin state: intact and verifiable.** `lean4-tree-sitter@3a57f55e` (v0.2.4, Lean v4.32.0); C seam = tree-sitter core v0.24.7 + tree-sitter-typescript `75b3874e`; all four digests verified above against `bootstrap.sh:29-33` and `.reference/provenance/receipts/lean4-tree-sitter-stage1-standup.json`. A second grammar clone at the same rev supplies `typescript/src/node-types.json` for the materializer lane (`.staging/treesitter/README.md`).

**D1 variance defect — current standing, measured against the vendored rc.111 source:**

| File | Variance sites | Bearing on the twin |
|---|---|---|
| `SchemaRepresentation.ts` | **0** | parses clean — the ingestion target |
| `SchemaParser.ts` | **0** | parses clean |
| `SchemaAST.ts` | 2 — `:3207 class Filter<in E>`, `:3255 class FilterGroup<in E>` | 2 ERROR nodes; neither extends `Base`; disjoint from the walk |
| `SchemaTransformation.ts` | 2 — `:71 Middleware<in out T, in out E>`, `:143 Transformation<in out T, in out E>` | **not pinned**; both names are in `CLOSURE_BEARING_NAMES` (`extract.ts:60-61`) |
| `Schema.ts` | 8 — `:824, :848, :867, :941, :1041, :1064, :1087, :1141` (all `out`-variance interfaces) | **not pinned**; the R8 public surface |
| `JsonSchema.ts` | 0 | clean |

So the D1 answer is owed for **exactly two files, twelve declarations**: `SchemaTransformation.ts` (2) and `Schema.ts` (8), plus the 2 already-held in `SchemaAST.ts`. `library/cas/SCHEMA-MATERIALIZATION.md:210-216` confirms the scope and corrects `EFFECTS-BACKEND.md:247`: it is "five of eight affected **modules**", not classes. Not blocking schema materialization; blocking full R8.

**Corpus labels.** `experiments/parser-census/project-labels.json:12` defines the closed label `variance-annotations` as "the D1 evidence stratum". Ten labels total, `:5-14`. `corpus-manifest.json` records pins/licences/counts; `declCount: null` throughout — **"pending a census instrument run"**. There is no census instrument: `experiments/parser-census/` contains **two JSON files and nothing else**. The `census:capture`/`census:tally`/`census:gate` tasks of `dsl-proposal.md:1298-1305` are proposed, never built.

**MATERIALIZER-LANE's recursion half.** `.staging/treesitter/MATERIALIZER-LANE.md:47-56` states the blocker as "`union` and `mu`/named references". **Union has landed** — `Ast.union (members) (mode)` (`Cas/Schema/Ast.lean:101`), ratified order-is-identity 2026-08-29, admitted in the emitgate table. **The recursion half stands**: `Suspend` and `Reference` are `GROW(C6)` in `.staging/schema-materialization/ADMISSION-MAP.md` rows 11-12. The 7 supertype unions of `node-types.json` are now expressible; the `expression → … → expression` cycle is not.

---

## (b) The mechanization gap list

**M1 — wire Stage 1 into `mise gen`/`check` (EXT-6).** `mise.toml` needs `gen:inventory` (dir `experiments/entity-store-extract`, `bun run src/extract.ts`) plus `check:extract` (`bun install --frozen-lockfile && bun test`). The drift gate then falls out of `check`'s existing `git diff --exit-code` (mise.toml:194). Blocker: **`.staging/e2/src-cache` is gitignored and has no bootstrap script.** Either add `experiments/entity-store-extract/bootstrap-src.sh` (fetch `Effect-TS/effect@0dd7825e`, sparse-checkout the two pinned files, verify blob SHA-1) or vendor the two files into the lane. Until then any `gen:inventory` task is host-local and CI-red.

**M2 — wire Stage 2.** `check:generate` = `bun test && bun run check` in `experiments/entity-store-generate`. Fully portable (no deps, toolchain matches). This is the cheapest item on the list.

**M3 — put `check:extract-twin` in the chain, or state why not.** It needs network + elan v4.32.0 on first run (mise.toml:225). Options: (i) commit the vendored C seam under `experiments/entity-store-extract/twin/vendor/` and drop the network requirement; (ii) keep it manual and add an explicit CI-exempt marker. The current state — a green gate nobody runs — is the worst of the three.

**M4 — close the R11 split-brain.** Delete `experiments/lift-harness/src/manifest.json`; point `oxc-engine.mjs:38` at `library/effects/src/cas/generated/lift/manifest.json` (it must stay a `readFileSync` — the module is loaded by oxlint's plugin runtime and vitest's node worker, per `README.md` "Note on the `oxc-engine.mjs` leg"). Fix the stale prose at `contract.ts:122` and `oxc-engine.mjs:35-37`. Add a T1 assertion that both legs' manifest bytes are identical, so this cannot regress.

**M5 — promote the harness's task surface.** `experiments/lift-harness/mise.toml:1-3` names the graduation itself: root `check:harness` + `census:harness`. Blocked by M6.

**M6 — the fixture corpus must be reachable from a clean checkout.** `HarnessPaths.ts:56` points into gitignored `.staging`. Either promote `.staging/fixture-gen/` (it depends on graded `library/cas` via `lakefile.toml [[require]] path = "../../../library/cas"`, so promotion is mechanical) with `gen:fixtures`/`check:fixtures` in root mise, or commit the 265 fixture files. Note `.staging/fixture-gen/ts-leg` is a **second** lean4-tree-sitter consumer and would need its own admission accounting on promotion.

**M7 — the D1 decision, scoped.** Remaining target files: `SchemaTransformation.ts` (2 declarations) and `Schema.ts` (8), per the table above. Option A (grammar-pin upgrade) invalidates the 324-type `node-types.json` inventory and may need a lean4-tree-sitter binding release (`dsl-proposal.md:920-931`). Option B (compiler-API-only carve-out) breaks two-instrument discipline exactly on the R8 surface. **The pins are stable and verifiable today, so this is a decision, not a repair** — but it gates the first libfree corpus run and full R8.

**M8 — the inventory as store content.** The bridge now exists. `Cas/Schema/Projection.lean:425` `putNode {α} [Described α] (version tag) (revision) (x) : Option Node`, with `project_agreement` (`:486`) and `eraseR_elR` (`:220`) proving the bridge cannot fork the ratified wire shape. `Cas/Schema/Exchange.lean` is the worked example of a described kind. So: give `Inventory` a `Described` instance (or derive it — `Cas/Schema/Deriving/Handler.lean`), reserve a kind tag through `Cas.Grammar.manifestV0` (**not** by hand — G0 landed, `library/effects/src/internal/kindTags.ts:14-18` now imports the generated `GrammarKindTags`), and `lake exe`-emit the node. **Named gap:** the inventory's carrier fields are strings and lists of records; `Ast.struct`/`Ast.arr`/`Ast.str`/`Ast.int`/`Ast.lit` cover the shape, so nothing new is needed — but the `Described` instance must be *generated from the inventory schema*, not hand-written, or it re-introduces the hand-transcription EXT-5 exists to forbid.

**M9 — the ACC artifact.** `.staging/schema-materialization/ADMISSION-MAP.md` is the ACC-1/ACC-2 table, written 2026-08-29, complete and refreshed — but it is (i) **prose in a gitignored directory**, (ii) keyed to the 22-member `Representation` union, not the 21-member `AST` union the inventory enumerates, and (iii) **checked by nothing**. The de-facto machine-readable answer already exists: `library/effects/src/cas/generated/SchemaAdmission.ts:240-306` admits exactly ten tags — `Null, Boolean, String, Number, Literal, Arrays, Objects, Declaration, Union, Enum`. The eleven inventory variants with **no row in any gated artifact**: `Any, BigInt, Never, ObjectKeyword, Suspend, Symbol, TemplateLiteral, Undefined, UniqueSymbol, Unknown, Void`. Mechanization = emit `admission-map.json` from the Lean side beside `emitgate`, and add an ACC-1 totality check: every inventory variant has exactly one row.

**M10 — promotion of `.staging/parser-experiments`.** `TOOLS.md:33,35` say winkComposer and wink-statistics are "promoting to `experiments/parser-census/`". They are pinned only in `.staging/parser-experiments/package.json:7-9` and used by nothing in `experiments/`. Either build the census instrument or retire the two rows. `TOOLS.md:37`'s dead `dslv0/` path needs correcting to `experiments/lift-harness/src/plugin.mjs` regardless.

**M11 — pin reconciliation.** `effect@rc.111` (library/effects, twin harness) vs `rc.112` (lift-harness, workbench). `AGENTS.md:108-110`: "The `effect` npm version and the provenance source pin must name each other; when one moves, the correspondence is re-recorded." `sources.lock.json:30` records rc.111. `experiments/workbench/package.json:35` flags the gap. One version, or two recorded pins.

**M12 — E2 vs Cas: two carriers, one inventory.** `experiments/entity-store-model/E2/Correspondence.lean` (13-variant `SchemaCore` with `mu`/`var`/`ref`/`address`) is built by `check:entity-store`; `Cas.Schema.Ast` (12 constructors, no `mu`) is built by `check:cas`. The extractor's ACC spec targets the first; ADMISSION-MAP targets the second. **Which carrier the inventory lands in is unruled** and it is the fork in the road for everything downstream.

---

## (c) The PROGRAM-ingestion path sketch

No new abstractions. Every piece named below exists.

```
Effect .ts source
  │ recognize — two admitted engines, verdicts byte-compared
  │   ck:  src/lift.ts (typescript@5.9.2 classic API)
  │   oxc: src/oxc-engine.mjs  (oxlint chassis / oxc-parser)
  │   gate: src/gate.ts, verdictKey equality (R10), 265/265
  ▼
Lift document — canonical JSON  (contract.ts:68-76)
  { kind:"lifted", name, storeBinder,
    instructions:[{index, version, tag, payloadHex, refs:[{source, expectedTag}]}],
    helperUnpinned }
  │
  │  ╔═══ GAP P1: no decoder. Nothing in Lean reads this document. ═══╗
  ▼
PProg = List PLine                (Cas/Lang/Defun.lean:169-176)
  PLine.put (version tag : UInt8) (payload : Bytes) (refs : List (UInt8 × PIn))
  PIn = .lit Addr32 | .ans Nat
  ▼
PProg.envelope / puts / dataflowFrom   (Defun.lean:1159-1174)
  proved sandwich: runPFrom_puts_sound, PProg.resolve_sound,
  runPFrom_absent_sound  (Fragments.lean L-A rung)
  ▼
encodeProg H p : Word   (Defun.lean:836)  ⟷  decodeProg (Defun.lean:928)
  ▼
store-resident program content  (F3; R7 "programs are content, hosts are code")
```

**The correspondence is exact and load-bearing.** `Instruction{version, tag, payloadHex, refs:[{source, expectedTag}]}` is precisely `PLine.put version tag (hex⁻¹ payloadHex) (refs.map fun r => (r.expectedTag, PIn.ans r.source))`. `Ref.source` is already an index — `contract.ts:47` "names die at the boundary", which is exactly `PIn.ans`. This is not an analogy; the harness's document schema was authored as the store language's run-instruction shape (`README.md`, "The Lean port seam").

**Named gaps, no more:**

- **P1 — the decoder.** `Lift JSON → PProg` in Lean. `Cas.Json.parse` exists; `Cas/Codec/Hex.lean` decodes `payloadHex`. This is a total function with named refusals, ~80 lines. Nothing else is missing between the recognizer and the proved envelope.
- **P2 — no `.lit` arm, no `load` line.** The recognized document has no literal-address operand and `const-yield-load` is disabled (`manifest.json` rules, "load is not yet documented"). So P1's image is a strict sub-language of `PProg`: puts only, answer-refs only. Fine for v0; state it as the decoder's domain, not discover it later.
- **P3 — the round trip has no gate.** The fixtures are Lean-generated (`.staging/fixture-gen/lean/tools/Dataset.lean` prints through `Cas.Backend.Ts.Render` under a byte gate), and `lake exe emitprograms` already goes `Tree → straight-line Effect program` (`Cas/Backend/EmitProg.lean:29-45`). So the closing gate is available and cheap: **emit a program from a `PProg`, recognize the emitted text, decode back, assert `PProg` equality**. That is the byte-identity discipline the estate already runs eleven times in `check:cas`.
- **P4 — TG1 stands open and is structural.** `test/ledger.json` row TG1: a type-only import erases at compile time, both engines agree, the gate is green, the program `ReferenceError`s at runtime. Two type-blind engines agreeing proves only that they read syntax the same way. The candidate oracle is recorded (`oxc-transform` with `onlyRemoveTypeImports: true`, admission **pending** per `TOOLS.md:49-50`). P1 must not treat gate-green as run-safe.
- **P5 — the direction law forbids one leg.** `AGENTS.md:127-129`: hoover = ingestion, execute = fixtures, materialize = code; never crossed. R8 (`differential-testing-spec.md:128`) dropped the `word` field from the hoover-side document for this reason. So P1 delivers a `PProg` and **stops**; the word is minted only by running it against the Lean reference handler. Any design that has the decoder compute a word has crossed the law.
- **P6 — the recognizer is not generated.** `dsl-proposal.md §9.2/§9.3` designs both instruments as *generated from the manifest* (Lean walker + compiler-API recognizer + taxonomy, three spellings one source, byte-gated). Today both are hand-written (`src/lift.ts`, `src/oxc-engine.mjs`) and only the manifest DATA is generated. Consequence, stated in `dsl-proposal.md:952-957`: a D1 grammar-pin upgrade currently means hand-porting matchers rather than re-running generation.
- **P7 — R-SCHEMA is a classification, not a route.** `Schema.*` combinator expressions must be *classified* by the program recognizer and handed to the schema plane, not refused noisily (`dsl-proposal.md:255-257`). The schema-plane door already exists (`Cas.Schema.ingest`) and already accepts Effect's own `SchemaRepresentation` JSON. What is missing is the hand-off: nothing in `contract.ts`'s refusal taxonomy (`:35-41`) has a "route to schema plane" verdict — there are twenty refusal codes and no *classification-to-another-plane* outcome. That is a contract change, and it is where R-SCHEMA becomes machinery instead of prose.

---

## (d) The grill list — operator rulings, in order

**Blocking the wiring (M1-M3):**

1. **The `.staging` input problem.** Every harness input is gitignored. Rule: vendor the two pinned Effect files into `experiments/entity-store-extract/`, add a digest-checked bootstrap script, or accept that Stage 1 is permanently host-local and never enters `mise run check`. Nothing else in (b) can proceed past this.
2. **`check:extract-twin` in the chain — yes or no.** If yes, the vendored C seam must be committed (network in CI is not the estate's pattern; `bootstrap.sh` clones from GitHub). If no, it needs an explicit standing-exception record, because a green gate nobody runs decays silently.
3. **Toolchain split.** `twin/extract-lean` is v4.32.0 against an estate-wide v4.33.1. Bump the twin (which forces a lean4-tree-sitter re-admission — the binding pins the toolchain) or ratify the split as standing.

**Blocking correctness (M4, M11):**

4. **R11 restored.** Confirm the oxc leg must read the Lean-generated manifest and the local `src/manifest.json` is deleted. The load-bearing fields are byte-equal today, so this is cheap now and expensive after the next `Cas.Lift.manifestV0` edit.
5. **One effect pin.** rc.111 or rc.112, across `library/effects`, `twin/harness`, `lift-harness`, `workbench` — and re-record the `sources.lock.json` correspondence per `AGENTS.md:108-110`.

**Blocking the lane's meaning (M9, M12):**

6. **Which carrier does the inventory land in** — `E2.SchemaCore` (the lane's original ACC target, 13 variants with `mu`/`var`/`address`) or `Cas.Schema.Ast` (the gated plane, 12 constructors, no `mu`)? Everything downstream forks here. Recommendation is implicit in the record: `ADMISSION-MAP.md` was written against `Cas.Schema.Ast` and the emitgate table already realizes it.
7. **Ratify ADMISSION-MAP.md as the ACC-1 artifact, and make it machine-checked.** It is complete, refreshed, and unratified in a gitignored directory. Ruling needed on: whether it re-keys from the 22-variant `Representation` union to the 21-variant `AST` union (or carries both), and whether it is emitted from Lean beside `emitgate` rather than hand-maintained.
8. **The eleven un-rowed variants.** `Any, BigInt, Never, ObjectKeyword, Suspend, Symbol, TemplateLiteral, Undefined, UniqueSymbol, Unknown, Void` — `ADMITTED` / `DEFERRED(code)` / `REJECTED(code)`, each with a reason. `ADMISSION-MAP.md` rows 13-22 propose them; nothing has ruled them. ACC-1's totality gate cannot exist until they are ruled.
9. **Should the inventory become store content** via `Projection.putNode`? Sub-rulings: does it get a ratified kind tag in `Cas.Grammar.manifestV0` (the only legal way, post-G0), and is its `Described` instance derived or hand-written? A hand-written instance re-introduces exactly the hand-transcription R8 and EXT-5 forbid.

**Blocking the corpus lane (M7, M10):**

10. **D1 — Option A or Option B**, for the twelve declarations in `SchemaTransformation.ts` (2) and `Schema.ts` (8). `dsl-proposal.md:952-957` recommends A sequenced before the first libfree corpus run, with B as a *dated* bridge carrying an expiry condition. Not blocking schema materialization (`SCHEMA-MATERIALIZATION.md:210-216`); blocking full R8.
11. **The census instrument.** `experiments/parser-census/` holds two JSON files and every `declCount` is `null` "pending a census instrument run". Build it, or retire the winkComposer / wink-statistics TOOLS rows (`:33`, `:35`) that promise it. Either way `TOOLS.md:37`'s dead `dslv0/` path needs correcting.

**Blocking program ingestion (P-gaps):**

12. **The `Lift → PProg` decoder** (P1) — commission it, and rule its domain explicitly (puts-only, answer-refs-only; no `.lit`, no `load` — P2).
13. **The round-trip gate** (P3): `PProg → emitted TS → recognize → PProg`, byte-identity discipline. Rule whether this joins `check:cas` or stands as `check:harness`.
14. **TG1** (P4) — admit `oxc-transform@0.147.0` (already installed, `TOOLS.md:49-50` "pending admission") as the import-survival oracle, or rule the contract gap as standing and stamp every lift with it. Note it closes import survival **only**; Rule 7 stays disabled and every lift still carries `helperUnpinned: true`.
15. **R-SCHEMA as machinery** (P7) — does the program recognizer's contract grow a *route-to-schema-plane* classification outcome, distinct from its twenty refusal codes? This is the ruling the operator's phrase points at, and it is a `contract.ts` change, not a doc change.
16. **Generate the recognizers from the manifest** (P6, `dsl-proposal.md §9.2-9.4`) — or accept that a D1 pin upgrade is a hand-port. These two rulings are coupled: item 10's cost estimate depends on item 16's answer.

**Standing behind all of it:** `.staging/libfree/dsl-proposal.md` carries ten decisions D1-D10 (`:1650-1775`), each with its recommendation and its strongest counter, and the document's closing line requests a grilling pass before any part of it enters `docs/` or generates code. D1 above is that document's D1. The other nine are the second grill, not this one.

---

## Corrections — 2026-08-29

Appended, not rewritten: the body above stands as written, and each entry
below names the line it corrects and the lane that refuted it.

**C1 — M9's machine-readable citation, re-checked against the tree.**
The admission-map lane reported M9's pointer (`:134`) as dead. Verified
here, and the report is only half right, so the correction is recorded
as measured rather than as received:

- `library/effects/src/cas/generated/SchemaAdmission.ts:240-306` is
  **LIVE, with a five-line drift**: the `Nodes` table runs `:240-301`
  and admits exactly the ten tags M9 names — `Null, Boolean, String,
  Number, Literal, Arrays, Objects, Declaration, Union, Enum`. Read the
  range as `:240-301`; the claim it carries is unchanged.
- `library/cas/tools/Admission.lean` is **absent** — no such file, at
  that path or any other in `library/cas`. It is not cited in this
  document's body either; the citation travelled with the lane record,
  not with M9, and it should not be picked up from there.

The ten-tag fact has two authorities to cite in its place, and they are
the ones the admission-map lane's own table (`ADMISSION-MAP.md:16`)
points at:

- `library/cas/Cas/Schema/SelfCodec.lean` — `Ast.toRepresentationJson`
  (`:200`), the Lean side's representation projection.
- `library/effects/src/cas/CanonicalSchema.ts` — `admitNode` (`:460`),
  the door's own walk.

The eleven unrowed inventory variants named in M9 are unaffected. M9's
mechanization ask — emit `admission-map.json` beside `emitgate`, plus an
ACC-1 totality check — stands, and should be written against the two
files above rather than against the generated TypeScript table.
[admission-map lane, re-verified 2026-08-29]

**C2 — the §4 variance table undercounts twice.** The table at `:99-106`
is wrong in two rows, and one of its column headings conflates two
different measurements (variance *sites* in the source versus ERROR
*nodes* the pinned grammar produces over them):

- `SchemaTransformation.ts` — the row reads `2`. There are 2
  declarations (`Middleware`, `Transformation`) but each carries two
  annotated type parameters (`<in out T, in out E>`), so the pinned
  grammar produces **4 ERROR nodes, not 2** (2 declarations × 2).
  [`D1-OPTION-A-SCOPING.md:46, :52`]
- `Schema.ts` — the row reads `8 — :824, :848, :867, :941, :1041,
  :1064, :1087, :1141`. There are **TWELVE** variance sites. The four
  the row misses are the `Bottom` family — `BottomWithoutNew` (`:151`),
  `Bottom` (`:283`), `BottomLazyWithoutNew` (`:345`), `BottomLazy`
  (`:394`) — whose multi-line type-parameter lists hide the annotations
  from a single-line scan. Verified in-tree against the committed
  artifact `experiments/entity-store-extract/oxc-surface.json`
  (`totals.varianceSites: 16` over six files; `Schema.ts` carries 12,
  `SchemaAST.ts` 2, `SchemaTransformation.ts` 2). [OXC lane]
- And the sentence following the table — "the D1 answer is owed for
  **exactly two files, twelve declarations**" — is therefore also wrong
  in its arithmetic: it is two files, **fourteen** declarations
  (12 + 2), plus the 2 already held in `SchemaAST.ts`.

**C3 — `Schema.ts` is not an eight-site file, and it is not a
sites-file at all at the pin.** The table's "not pinned; the R8 public
surface" gloss understates the standing. Under the current grammar pin
`Schema.ts` is **unparsed from byte zero**: 397 ERROR + 44 MISSING
nodes, root ERROR at line 1 column 1. Under the candidate upstream fix
(#364) it parses to line 6242 and then hits 237 distinct residual error
sites, **none of them variance** — a second, separate grammar defect
(newline-separated generic call-signature overloads). So no variance
upgrade unblocks `Schema.ts`, and the R8 public surface has no
tree-sitter instrument at any pin currently reachable.
[`D1-OPTION-A-SCOPING.md:48, :53`, blocker B3]
