# Extractor lane report — Stage 1 standing

Status: staged, pre-grade — 2026-08-25. Definition-of-done items 1–6 of the extractor
brief, in order. Everything below is regenerable; nothing outside `experiments/entity-store-extract/`
was touched.

## 1. Admission rows — DRAFTS for the operator to land (C4: not applied to TOOLS.md)

Two rows, because two instruments are in play and the operator should rule which enters
gated work (they are not exclusive — the second can serve until the first is stood up,
then become the cross-check):

| Tool | Role | Trust statement |
|---|---|---|
| lean4-tree-sitter (`predictable-machines/lean4-tree-sitter`, revision-pinned; C seam: the tree-sitter runtime + the `tree-sitter-typescript` grammar shared library, each version-and-digest-pinned) | Syntax-level walk over pinned TypeScript sources for inventory extraction and cross-checks | Trusted only that the named grammar's parse of the pinned bytes yields the CSTs the walk reads; the C FFI boundary (runtime `.dylib`/`.so` + grammar `.so`, digests recorded per host) is the entire trusted seam. Contributes shape facts only; no semantic claims. Output enters gated work solely as `inventory.json`, which the four-way enumeration agreement must pass. |
| TypeScript compiler API (`typescript@5.9.2` exactly, npm; classic JS API, not the 7.x native port) | Interim extractor instrument: syntax-only parse (`createSourceFile`, no checker) of the pinned sources | Trusted only that its parser maps the pinned bytes to a faithful syntax tree; no type resolution is used, so no inference is trusted. Same output gate as above. Version drift is a re-admission event. |

Note for the ruling: the census keying (§7 items 1–4) is expressed in compiler-API node
kinds, and the implemented extractor uses instrument 2. The brief's named-C-seam
requirement applies to instrument 1 when it is stood up; running both and asserting
byte-identical inventories would make the two extractors each other's check — the
cheapest possible hardening of the one trusted component.

## 2. The generator contract — published

`INVENTORY-SCHEMA.md` (schemaVersion 1, extensions documented and justified) +
`sample-mini-inventory.json` (3 variants, hand-checkable, identical shape). Stage 2 can
build against the sample today.

## 3. inventory.json — complete and deterministic

All 21 variants; base fields from `abstract class Base` (SchemaAST.ts:636); every
closure-bearing field marked with its provenance (`kindBy`); TemplateLiteral's three
constructor-derived caches marked `derived-cache`; ctor params with arity/defaults;
union source order preserved through `unionIndex`. Determinism: two runs byte-identical
(tested), LF-only, no timestamps, no host paths (tested), committed copy = fresh run
(the drift-gate shape, tested).

## 4. Cross-checks — implemented, green at the pin

21 (union alias) / 21 (makeGuard tags) / 21 (Base-extending classes) agree; 22
(Representation type union) = 21 + Reference; 22 (RepresentationUnion runtime array) =
the type union. The 23-tag count trap is its own test (Filter + FilterGroup carry
`_tag`s and are asserted NOT to be variants). A synthetic-drift test asserts the
cross-check fails loudly on a wrong enumeration; a tamper test asserts extraction
refuses modified bytes before parsing.

## 5. EXT / ACC / FIX specs — drafted

`SPECS.md`: EXT-1…6 (implemented), ACC-1…4 (the admission-map contract, incl. the A-1
no-bijection affordance and the field-disposition rule), FIX-1…4 (deterministic
fixtures, decide-wall discipline, the T-2 dumper seam).

## 6. Honest gaps (census §8 style)

1. **Instrument substitution.** The brief names lean4-tree-sitter as the syntax
   instrument; this stage ran the TypeScript compiler API instead (pinned, syntax-only,
   admission row drafted). No tree-sitter parse was performed; the two-instrument
   agreement check in §1 is proposed, not executed. **CLOSED 2026-08-28 — see the
   addendum below: the twin is stood up and the cross-instrument gate is green.**
2. **`kindBy: "name-table"` facts are only as good as the tables.** `Getter` was never
   read upstream (census gap 2) — its closure-bearing status is inferred from use
   sites. If `Getter` carries identity fields, the table overstates nothing (marking a
   field closure-bearing is the conservative direction), but the census caveat carries.
3. **Generic field types are recorded uninstantiated** (`Union.types :
   ReadonlyArray<A>`). Consumers get the verbatim syntax plus the union alias; the
   instantiation `A = AST` is a reading, not an extracted fact, without the checker.
4. **`optional` is a syntactic heuristic** (`?` token or `| undefined` in the type
   text). It matches all 21 variants at this pin; it is not a type-level fact.
5. **SchemaRepresentation.ts facts (enumerations D and E) rest on an unpinned-in-lock
   file** — its blob `6282ab9c…` IS in the lock; but the seven census-load-bearing
   `internal/` files remain unpinned, and nothing in this inventory depends on them.
   The dependency direction is stated per INVENTORY-SCHEMA.md's non-claims.
6. **The lock's bytes/sha256 fields were not used and not repaired** (known CRLF
   defect, repair in a separate session): verification is git-blob-SHA-1-only,
   per the brief.
7. **No runtime enumeration was taken from the installed npm package.** The sibling
   lane measured that npm `4.0.0-rc.111` dist bytes ≠ pinned commit bytes for 4 of 5
   artifacts; a dist-derived fifth enumeration would be evidence about the published
   build, not the pin, and was deliberately left out of the inventory's agreement set.

## Instruments per fact (the brief's record-keeping rule)

| Fact family | Instrument | Provenance |
|---|---|---|
| Union alias, guard tags, classes, `_tag` literals, fields, ctor params, decl lines | typescript@5.9.2 syntax parse of pinned bytes | git blob SHA-1 verified pre-parse |
| Closure-bearing / derived-cache marks | declared name tables (echoed in `extractor.nameTables`) | name-table |
| Representation union + runtime array | typescript@5.9.2 syntax parse of pinned SchemaRepresentation.ts | git blob SHA-1 verified pre-parse |
| toRepresentation behavioral facts cited in SPECS/ACC | census (G0-pinned reading) + this session's live probes against the npm build | census receipts; probes are build-evidence only |

## Addendum — 2026-08-28: the second instrument is stood up, the gate is green

The §1 ruling landed: lean4-tree-sitter is ADMITTED (TOOLS.md row applied,
2026-08-28) and the §6 gap-1 two-instrument agreement check is now executed,
not proposed. The twin lives in [`twin/`](twin/): a Lean walk
(`extract-lean/ExtractTwin.lean`, toolchain v4.32.0) over the vendored
tree-sitter C seam (core v0.24.7 + tree-sitter-typescript `75b3874e`),
pinned and digest-checked by `twin/bootstrap.sh` against the stand-up
receipt (`.reference/provenance/receipts/lean4-tree-sitter-stage1-standup.json`).

The gate (`mise run check:extract-twin`) is the §1 note's check made exact,
with one honest deviation from its "byte-identical inventories" phrasing:
the twin re-derives `inventory.json` from the same pinned bytes
**byte-identically except `extractor.instrument` and
`extractor.instrumentVersion`**, which each instrument fills with its own
declared identity — a twin copying those two fields would impersonate the
other instrument. The harness additionally asserts: git-blob pins verified
through a branded `GitBlobSha1` Effect Schema (operator ruling 2026-08-28:
the git-blob identity is a Schema, never a bare string), the reference
extractor byte-identical to the committed inventory, twin determinism
across independent runs, and both inventories decoding through a typed
`Inventory` schema with the declared instrument identities and pins.

Known defect, held: the pinned grammar cannot parse the `<in E>` variance
annotation — exactly two 1-byte ERROR nodes at `Filter`/`FilterGroup`
(neither extends `Base`; neither is read by the walk). The twin refuses to
emit if any ERROR/MISSING node intersects a byte range it consumed, so
grammar drift that touches the walk is loud, never silent.

Instruments-per-fact update: every fact family in the table above is now
double-derived (typescript@5.9.2 and lean4-tree-sitter @ `3a57f55e` agree
byte-for-byte on the inventory body); provenance is unchanged — git blob
SHA-1 verified pre-parse, name-table facts still name-table.

## Addendum — 2026-08-29: the third instrument reads the WHOLE surface

The pinned rc.111 schema surface is six files. Until today the lane could read
two of them with two instruments, and had no instrument at all for the two the
tree-sitter twin cannot parse. `src/oxc-extract.ts` is a third leg over the
already-admitted `oxc-parser@0.147.0` — the same in-process chassis the lift
harness uses — and it parses **all six with zero errors**, `Schema.ts` and
`SchemaTransformation.ts` included.

The gate is `mise run check:extract-oxc` (`src/oxc-check.ts`, six steps):

| | asserts |
|---|---|
| G1 pin | all six files match their recorded git blob (`SURFACE_PINS`) |
| G2 coverage | the surface pins cover the inventory's own two, digests equal |
| G3 parse | **zero parse errors across all six** — the readability claim itself |
| G4 agreement | enumerations A–E agree: 21 / 21 / 21 / 22 / 22, no failures |
| G5 instrument | the oxc inventory is byte-identical to the committed one, normalizing only `extractor.instrument` / `instrumentVersion` |
| G6 surface | the committed `oxc-surface.json` is byte-identical to a fresh survey |

G5 is the twin gate's discipline pointed at a third instrument, and the vitest
suite runs it twice: once against the committed `inventory.json`, once against a
**live** compiler-API extraction. Three instruments now agree on the inventory
body. The compiler-API leg is the OFFLINE differential — it is imported by the
suite and by nothing on the hot path, which carries one parser. Whether the tsc
leg is retained as a gate-time second instrument is an operator ruling; classic
`tsc` is banned from production hot paths and this leg observes that, without
pre-empting the ruling.

The two legs share DATA and no walking code. `src/contract.ts` now holds what
both read — the pins, the declared name tables, the inventory record shapes, the
cross-check predicate, the canonical emit — and `extract.ts` re-exports it, so
its published surface is unchanged. The move was verified byte-neutral: a fresh
compiler-API extraction is still identical to the committed `inventory.json`.

### What is newly readable

`oxc-surface.json` is the census, regenerable by `mise run gen:oxc-surface`. It
records, per file, parse cleanliness, the top-level declaration histogram, and
every declaration carrying a construct the pinned tree-sitter grammar has no
rule for. **Sixteen variance-annotated declarations, carrying 61 variance-marked
type parameters:**

| file | declarations |
|---|---|
| `SchemaAST.ts` | `Filter` :3207, `FilterGroup` :3255 — the two already held as ERROR nodes |
| `SchemaTransformation.ts` | `Middleware` :71, `Transformation` :143 (`in out T`, `in out E`) |
| `Schema.ts` | `BottomWithoutNew` :151, `Bottom` :283, `BottomLazyWithoutNew` :345, `BottomLazy` :394, `ConstraintCodec` :824, `ConstraintDecoder` :848, `ConstraintEncoder` :867, `Schema` :941, `Codec` :1041, `Decoder` :1064, `Encoder` :1087, `Optic` :1141 |

**Correction to the harness map.** `INGESTION-HARNESS.md:105` records eight
variance sites in `Schema.ts`. Measured here: **twelve**. The four the table
misses are the `Bottom` family, whose `in out TypeParameters` sits inside a
multi-line type-parameter list — presumably why a line-oriented count skipped
them. The eight it names are all present at exactly the lines it names, and the
`SchemaAST.ts` and `SchemaTransformation.ts` rows are exact.

The second defect, **D1b** — newline-separated generic call-signature overloads
inside an object type, which no reachable tree-sitter pin parses — is read here
too: nine object types in `Schema.ts` hold two or more call signatures with at
least one generic, at `:6235`, `:6250`, `:6421`, `:6430`, `:14391`, `:14661`,
`:14721`, `:14781`, `:14842`. This counts SHAPES, not the 237 residual ERROR
sites `D1-OPTION-A-SCOPING.md` measured under PR #364; the two numbers answer
different questions and neither replaces the other.

### What this does and does not settle

It settles readability: `Schema.ts` — the R8 public surface — now has an
instrument. It does **not** settle D1. The tree-sitter defect is unchanged, the
twin's ERROR nodes are unchanged, and nothing here argues for or against the
grammar fork. What it removes is the premise that the surface is unreadable:
that was an instrument fact about tree-sitter, and this lane now has an
instrument for which it is not true.

It also does not yet extract anything FROM the two newly-readable files. The
inventory is still derived from `SchemaAST.ts` and `SchemaRepresentation.ts`,
because that is what the frozen generator contract (`INVENTORY-SCHEMA.md`)
names. Extending the inventory to the R8 public surface is a contract change and
is not taken here.

**Still host-local.** `check:extract-oxc` is out of the default `check` chain
for the lane's standing reason: `.staging/e2/src-cache` is gitignored and has no
bootstrap (M1, grill item 1). `src/contract.ts`'s `resolveSrcDir` searches
`E2_SRC_CACHE` and then each ancestor for `.staging/e2/src-cache`, and refuses
by name when it finds nothing — which makes the gate runnable from a worktree
and honest about what it needs, not portable.
