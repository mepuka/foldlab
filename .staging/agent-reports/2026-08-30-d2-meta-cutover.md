# AGENT REPORT — D2: the toEffectSchema interpreter + meta-consumer cutover

Lane: implementation (Opus), dispatched by the Mac coordinator
2026-08-30 per the operator's D2 order. Banked verbatim on operator
order ("make sure these agents save results to the repo"). The
changes described were UNCOMMITTED at banking time: new
`library/effects/src/cas/MetaSchema.ts` + `test/MetaSchema.test.ts`,
modified `bin/cli/{ledgers,commands}.ts`, `bin/mcp/http.ts`.

---

All gates green. D2 is done.

## The interpreter — `library/effects/src/cas/MetaSchema.ts` (new, 361 lines)

`toEffectSchema(ast: MetaSchema): MetaCodec` where `MetaCodec = Schema.Codec<unknown, unknown>`. One switch, seven arms plus `default: absurd(ast)` — a constructor added in Lean makes `absurd`'s argument non-`never` and reds the build here.

| arm | built as |
|---|---|
| `str` | `Schema.String` |
| `nat` | `Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))` (= emitted `{"type":"integer","minimum":0}`) |
| `bool` | `Schema.Boolean` |
| `enum` | `Schema.Literals(ast.values)` |
| `array` | `Schema.Array(toEffectSchema(items))` |
| `record` | `Schema.Struct(fields)`; an `opt` field becomes `Schema.optionalKey` — matching the JSON Schemas leaving it out of `required` |
| `opt` | `Schema.UndefinedOr(inner)` — the standalone reading; inside a field the record arm reaches `inner` first |

**Closedness**: Effect v4 has no schema-level `additionalProperties:false`. I probed `StructWithRest(struct, [Record(String, Never)])` — it rejects *declared* keys too (the documented type-level gotcha bites at runtime). So closedness lives in exported `closedDecoding: ParseOptions = { errors: "all", onExcessProperty: "error" }`, applied by `decodeMetaArtifact`, which is the sanctioned door. Verified it propagates through nesting and through `fromJsonString`.

Also exported: `MetaArtifactRefused` (tagged error, `artifact` + `reason`, `message` naming the repair), `describedShapes` (the six terms, named), `shapeForSchemaRef`/`shapeForRow` (schema-file → AST term), `decodeMetaArtifact(shape, jsonText)`, `fieldNames`/`fieldShape`/`itemsShape`, and `decodeMetaManifest`. Doc comment carries the law verbatim from META-OUTPUTS §cutover and **names the owed agreement gate** (v4-derived JSON Schema vs. the Lean-emitted one) without building it.

One earned narrowing: `decodeMetaManifest` attaches `MetaManifest` (types only — `outputs[].{path,emitter,schema,awaiting}`) via `cast`, guarded by `manifestProjectionHolds`, which checks those names against `manifestShape`'s own AST field list. A field renamed in Lean is a refusal that names it, never an `undefined` read. No hand Schema anywhere.

## `bin/cli/ledgers.ts` — +251/−39 (219 → 404 lines)

- **Deleted**: the `ledgers` object with its 3 hand-written meta-plane path literals. Paths now come from `metaRegistry(labRoot)`, which reads `MANIFEST.META.json` and decodes it through `toEffectSchema(manifestShape)`.
- **Hand schemas deleted: zero** — and that is the honest finding. Every artifact `doctor` reports is either `awaiting` (environment, laws, obligations) or off-plane (`admission-map.json`, conformance plane, no manifest row). Each now carries its awaiting-row text in its doc comment; `surface`'s awaiting row is named too, on `ObligationLedger`, since nothing here reads it.
- **New**: `describedLedgers(labRoot)` returns `{stem, path, schema: toEffectSchema(row's AST)}` for every described row — the seam where a hand schema for a described artifact *could* have appeared, closed by construction.
- `readLabLedgers` replaces the four `readLedger` calls in `commands.ts` (−8/+7 there).

## `bin/mcp/http.ts` — +25, comment only

Left the paths. Four compounding reasons, written into the doc comment: 4 of 7 sources aren't on the meta plane at all (mcp/, schemas/, conformance/); the 3 that are (surface, obligations, environment) are all `awaiting`, so deriving buys a path and no shape; they resolve from `import.meta.url` while the manifest is *not* shipped in the tarball, so a derived list would serve **zero** projections from an installed tree where this one still serves `cas-tools.json` — a regression in exactly the deployment SERVING.md carries the OWED row for; and `projectionSources` is a static value that SERVING.md's drift gate reads as one. Wire names untouched.

## Refusal drills — every one names the path

```
str   <- 7            Expected string ⏎ at ["leaf"]
nat   <- -1           Expected a value greater than or equal to 0 ⏎ at ["leaf"]
nat   <- 1.5          Expected an integer ⏎ at ["leaf"]
bool  <- "true"       Expected boolean ⏎ at ["leaf"]
enum  <- "settled"    Expected "owed" | "parked" ⏎ at ["leaf"]
array <- ["a","b",3]  Expected string ⏎ at ["leaf"][2]
record <- {}          Missing key ⏎ at ["leaf"]
record + unknown key  Expected no excess property ⏎ at ["stowaway"]
opt   <- "seven"      Expected number ⏎ at ["leaf"]
nested                Expected number ⏎ at ["rows"][1]["leaf"]
real MANIFEST, outputs→outputz   Expected no excess property ⏎ at ["outputz"] ⏎ Missing key ⏎ at ["outputs"]
real MANIFEST, schemaVersion -1  Expected a value greater than or equal to 0 ⏎ at ["emitted"]["schemaVersion"]
real MANIFEST, not JSON          Expected a valid JSON string
```

## Verification

- `bun run typecheck` — clean.
- `bun --bun vitest run` — **439 passed / 54 files**, up from the 418/53 baseline (+21). One flake seen mid-run (`WordLog.test.ts` "two OS processes appending at once", 5 s timeout) while lint ran concurrently; green on re-run alone and on three subsequent full runs.
- `bun run lint` — **172 warnings, 1 error: exactly the baseline.** The per-file+per-rule diff against the baseline is empty. The one error is pre-existing (`src/cas/CanonicalSchema.ts:605 no-useless-return`). I did trip 3 `no-shadow` errors mid-work (`rows` in `ledgers.ts` collides with the module's existing `rows` schema helper) — fixed by renaming my parameters to `registry`.
- CLI smoke: `Cli.test.ts` + `ServingDoc.test.ts` 50/50; `cas doctor` prose and `--json` byte-identical to before (manifest-derived paths resolve to the same strings the literals held).

## Tails

1. **One behavior shift, deliberate and pinned.** If `MANIFEST.META.json` is missing or drifted, the three meta-plane ledgers now report `unreadable` *at the manifest* instead of `absent`/`read`. Absent vs. undecodable stay apart in the error channel (`PlatformError` vs. `MetaArtifactRefused`) and in the words. Multi-line schema refusals are flattened with `·` so `doctor` keeps one line per ledger — the drifted case broke that layout on first cut. Three tests pin all three states.
2. **The cutover's remaining half is on the Lean side.** No hand schema was deleted because no artifact `doctor` reads is described yet. The moment `environment`/`laws`/`obligations` grow `schema` rows, three hand structs go and `describedLedgers` already carries them.
3. **Owed, named, not built**: the agreement gate — v4's derived JSON Schema for `toEffectSchema(shape)` vs. the Lean-emitted `<stem>.META.schema.json`.
4. `src/cas/MetaSchema.ts` is a new handwritten TS file, so the trust census (`trust.META.json`, byte-gated) is now stale by one row. Lean-side, outside my lane.
5. Other lanes are writing to this working tree concurrently (`.agents/`, `.reference/`, `.staging/`, `docs/`; the `Programs.ts` edits present at session start no longer show as working-tree modifications — the coordinator notes they were committed in `9bbcb901`, not reverted). My changes are exactly `bin/cli/commands.ts`, `bin/cli/ledgers.ts`, `bin/mcp/http.ts`, plus the two new files. Nothing committed.
