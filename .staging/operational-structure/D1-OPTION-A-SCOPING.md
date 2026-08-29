# D1 Option-A scoping — the upgrade that is not an upgrade

Scout report, 2026-08-29. Repo main past 0716e436.

## Verdict first: Option A as ruled is not executable. There is no upstream rev to upgrade to.

The pin **is** upstream HEAD. `tree-sitter/tree-sitter-typescript` master tip = `75b3874edb2dc714fb1fd77a32013d0f8699989f`, dated **2025-01-30** — the estate's pinned rev, unmoved for 19 months. `git rev-list --count 75b3874e..master` = **0**. No branch in the repo (28 checked) carries variance support. `lean4-tree-sitter` upstream `main` = `3a57f55e` = tag `v0.2.4` = the estate's pin; **no newer binding release exists**, and no v4.33 branch (`git ls-remote`: latest branch is `DM/lean-4.32-upgrade`, already merged as the pin).

The grammar at HEAD is confirmed defective by inspection: `common/define-grammar.js:1005-1010` gives `type_parameter: $ => seq(optional('const'), field('name',…), …)` — `const` only, no `in`/`out`.

**"Upgrade the pin" must be re-read as "vendor an unmerged upstream PR, or fork."** That is a materially different act than the ruling contemplates, and it is the first ruling ask.

---

## 1. Upstream fix — two unmerged candidates, both fully characterized

I fetched both PR heads and built all three grammars against the estate's own vendored core (`ffi/tree-sitter/lib`, v0.24.7).

| | pin `75b3874e` | **PR #364** `465aa162d077093dc5ad4f46a9463bde6274425e` | PR #361 `d5d7b1a83899ef39f4c08b385c2d5529b999e204` |
|---|---|---|---|
| state | master HEAD, 2025-01-30 | **open, ready for review**, tomerwave, 2026-07-30, no maintainer review | **draft**, Mario Nebl, 2026-03-27 |
| grammar delta | — | **1 line**: `optional(choice('in', seq(optional('in'), 'out')))` | 10 lines: new named rule `variance: choice(seq('in','out'),'in','out')` |
| parser ABI | `LANGUAGE_VERSION 14` | **14** (compatible: core v0.24.7 accepts 13–14, `api.h:29,35`) | 14 |
| SYMBOL_COUNT | 376 | 377 | 378 |
| node-types total / named / field-bearing / supertypes | **324 / 183 / 78 / 7** | **325 / 183 / 78 / 7** | 326 / **184** / 78 / 7 |
| node-types.json bytes / sha256 | 108583 / `c790a733fc75…` | **108630 / `3e49eaebc9f5…`** | 108873 / `bc55bc6c302e…` |
| parser.c sha256 | `74fe453edd70…` (= `bootstrap.sh:36`) | **`b2dc4637d4db…`** | `2f97fbfac13a…` |
| scanner.c / shim.c / lib.c | — | **byte-identical** (`9125013b…`, unchanged) | byte-identical |
| node renames | — | **zero** | zero |

**PR #364's entire node-types.json diff is one anonymous entry**, `{"type":"out","named":false}` (`in` already existed as the binary operator). No named node added, no field added, no supertype changed, no existing node's shape changed. Parse trees for existing code are unchanged — the PR's own test corpus (`test/corpus/types.txt`) shows variance modifiers vanishing from the s-expression entirely.

PR #361 is richer (variance is structurally recoverable as a named `variance` node) but adds a `children` block to the existing `type_parameter` entry — a shape change on an existing node type, which is exactly what the materializer lane's node-types.json → canonical-schema mapping consumes. It is also a stale draft.

**Recommendation: #364.** Minimal blast radius; the cost is that variance is unreadable (anonymous, unfielded) — acceptable, since nothing in the estate reads it.

---

## 1b. Block-fast finding the harness did not measure: Schema.ts has a **second, independent** grammar defect

I parsed all six vendored rc.111 sources under all three grammars (harness: `scratchpad/build/parse-{master,364,361}`, ERROR/MISSING node census).

| file | pin | PR #364 | PR #361 |
|---|---|---|---|
| `SchemaAST.ts` | 2 ERROR | **0** | 0 |
| `SchemaTransformation.ts` | 4 ERROR | **0** | 0 |
| `SchemaRepresentation.ts` / `SchemaParser.ts` / `JsonSchema.ts` | 0 | 0 | 0 |
| **`Schema.ts`** | **397 ERROR + 44 MISSING**, root ERROR at **line 1 col 1** | **332 ERROR + 44 MISSING**, first error at line 6242 | 332 + 44 |

Two corrections to `INGESTION-HARNESS.md:99-108`:

- `SchemaTransformation.ts` produces **4** ERROR nodes, not 2 (2 declarations × 2).
- **`Schema.ts` is not an 8-site file.** Under the current pin it is unparsed from byte zero. Under #364 it parses to line 6242 and then hits **237 distinct residual error sites**, none of them variance.

Minimal repro of the residual defect, verified identical under pin and both PRs:

```ts
interface X { readonly m: { <C>(a: C): number
  <C>(b: C): string } }        // ERROR
interface X { readonly m: { <C>(a: C): number; <C>(b: C): string } }  // clean
interface X { readonly m: { (a: number): number
  (b: string): string } }      // clean
```

**Newline-separated (semicolon-less) *generic* call-signature overloads inside an object type.** `number` `<` `C` lexes as a comparison. `Schema.ts` uses this shape throughout (`:6235 readonly match: {…}`, `:6250 matchOrElse`, `:6424`, `:14395`). Call it **D1b**. It has no upstream PR, no issue, and is a genuine LR ambiguity — not a one-line fix.

**Consequence for the ruling:** Option A, even at its best, **does not make `Schema.ts` parseable**, and `Schema.ts` is the R8 public surface. D1's stated purpose — "blocking full R8" (`INGESTION-HARNESS.md:130`) — is **not discharged by Option A**. What Option A *does* discharge, completely, is `SchemaAST.ts` and `SchemaTransformation.ts`.

---

## 2. Blast radius, consumer by consumer

### (a) The extract twin — smallest surface, one real risk

- **Does a grammar bump need a binding release?** Mechanically, no. `ffi/vendor_grammars.sh` copies the **pre-generated** `parser.c` from the grammar repo at the rev in `ffi/language_definitions.json` (`"typescript": {"rev": "75b3874e…"}`) — it never runs the tree-sitter CLI. Both PRs commit regenerated `parser.c`/`grammar.json`/`node-types.json`, so the vendoring path works untouched. **But** `language_definitions.json` lives *inside* the lean4-tree-sitter repo, so changing it means either an upstream `predictable-machines` commit (none available) or the estate patching that file post-clone inside `twin/bootstrap.sh`. That patch step is new machinery the bootstrap does not have today.
- **Is a binding release available?** **No.** `main` = `3a57f55e` = `v0.2.4`. Nothing newer.
- **Grill item 3 (toolchain split):** Option A does **not** ride a v4.33.1 bump. There is no upstream v4.33 branch. `twin/extract-lean/lean-toolchain` and `.staging/fixture-gen/ts-leg/lean-toolchain` are both v4.32.0 because the *binding* is; bumping to v4.33.1 requires forking lean4-tree-sitter anyway. **If the estate is going to fork the binding for the grammar, fork once and carry both changes.** That is the one place the two grill items genuinely couple — and it argues for doing them together, not for Option A being free.
- **Node-type surface the Lean walker depends on:** 22 distinct node-type strings and 13 field names in `experiments/entity-store-extract/twin/extract-lean/ExtractTwin.lean` (`export_statement:211`, `class_declaration:386,413`, `method_definition:351`, `required_parameter:359`, `variable_declarator:429`, …; fields `name`, `value`, `function`, `arguments`, `type`, `parameters`, `pattern`, `body`). **PR #364 touches none of them.** Zero rename risk.
- **The one real risk.** `ExtractTwin.lean:93` embeds the pin in `instrumentVersion` (`"0.2.4+3a57f55e…"`), and `SchemaAST.ts:3207/3255` `class Filter<in E>` / `class FilterGroup<in E>` go from ERROR nodes to real `class_declaration` nodes. `Filter` and `FilterGroup` are both in `CLOSURE_BEARING_NAMES` (`src/extract.ts:50-64`). Reading the Lean side, `closureBearingNames` is consumed only via `containsWord typeText` (`ExtractTwin.lean:129`) — it matches *field type text*, not class declarations — and neither class extends `Base`, so the A–E enumerations should be unmoved. **This is the single must-verify step of the whole upgrade**: the twin's output for `SchemaAST.ts` may change, and the cross-instrument gate (`harness.ts:234-245`) normalizes only `instrument`/`instrumentVersion` (`harness.ts:173-176`). Any other byte moving turns the gate red with a byte offset and no named cause.

### (b) node-types.json / the materializer lane

`.staging/treesitter/MATERIALIZER-LANE.md:17-21` states the inventory as "324 node types, 183 named, 78 with typed fields, 7 supertype unions", pinned at 108,583 bytes / `c790a733…`. Under #364: **325 / 183 / 78 / 7**, 108,630 bytes, `3e49eaeb…`. The delta is one anonymous token. The lane's mapping table (`MATERIALIZER-LANE.md:31-39`) keys on named nodes, fields, and supertypes — **all three counts are unchanged**. The lane's actual blocker (`:47-56`, recursion / `Suspend`+`Reference` as `GROW(C6)`) is untouched. **Materializer blast radius: one digest, one count. Negligible.** Under #361 it would be 326/184 plus a shape change on `type_parameter` — materially worse.

### (c) `.staging/fixture-gen/ts-leg` — a silent follower, and the worst hazard here

`ts-leg/lakefile.toml:4-8` path-requires the twin's clone (`path = "../../treesitter/clones/lean4-tree-sitter"`); `lake-manifest.json:4-10` confirms `"type": "path"`. **It carries no `PIN=`, no digest check.** If `twin/bootstrap.sh` bumps, ts-leg follows on the next `lake build` with nothing telling it. Its outputs: `leaf-rows.jsonl`, 34,519 rows, feeding `backfill-manifest.json` (whose `:4` records the grammar pin as **prose only**) and `atoms-g0-backfilled.jsonl` (`788f90bc…`, 34,254 rows). A `SYMBOL_COUNT` change (376→377) shifts leaf enumeration for any fixture with variance annotations. Additionally `ts-leg/fields.txt` is a 40-line field vocabulary hand-derived from node-types.json (`TsLeg.lean:8-9`) with **no digest gate**. Also note M6: the 265 fixtures back `HarnessPaths.ts:56`, so a silent ts-leg drift propagates into the lift-harness gate.

---

## 3. Re-admission cost — the exact artifacts that move

**Must change, gated:**

| Artifact | Change |
|---|---|
| `docs/lab-core/TOOLS.md:31` | Row rewrite. Its own clause: *"Version drift of the pin **or the C seam** is a re-admission event."* Must name the new grammar rev, and — if the estate vendors a PR — must state that the C seam is **estate-carried, not upstream-released**, with the trust statement rewritten accordingly. |
| `docs/lab-core/TOOLS.md:26` | typescript@5.9.2 row's gate clause re-asserted if any inventory byte moves. |
| `.reference/provenance/receipts/` | **New receipt** (the existing `lean4-tree-sitter-stage1-standup.json` is an `observedAt` observation, not amendable): 3 commits, 2 rootTrees, 4 `sourceDigests`, per-host build digests (`libtree-sitter-lean.a`, `extract_twin`), and `schemaIngestionPin` (`:66-71`) → **108630 / `3e49eaeb…`**. Its `knownDefect` field (`:73`) must be **rewritten, not deleted** — D1b replaces D1. |
| `twin/bootstrap.sh:14` | `PIN=` — but see the blocker below: this pin is the *binding*, not the grammar. |
| `twin/bootstrap.sh:36` | `74fe453e…` → `b2dc4637d4db…`. **Only this one digest moves**; `:35` lib.c, `:37` scanner.c, `:38` shim.c are byte-identical under #364 (verified). |
| `ExtractTwin.lean:93` | `instrumentVersion` string. |
| `experiments/entity-store-extract/inventory.json` | Regenerated + re-gated. **Expected: no byte change** (twin-side `instrumentVersion` is normalized out; the TS leg is untouched). Must be *measured*, not assumed. |
| `twin/README.md:16-17`, `.staging/treesitter/README.md:7-12`, `MATERIALIZER-LANE.md:17-19` | Pin prose. |

**Re-runs demanded:** `mise run check:extract-twin` (`mise.toml:224-231`, five gate steps at `harness.ts:193-280`) — the cross-instrument byte gate and the enumeration agreement in one pass. `inventory.json:44` counts `{variants:21, unionAlias:21, guardTags:21, representationUnion:22, runtimeArray:22}` must come back identical.

**Two defects to fix in passing:**
- `.reference/catalog/REFERENCES.md:103` already says **v0.1.0** against the receipt's `0.2.4` — drifted before this upgrade.
- **`.reference/provenance/sources.lock.json` has *no* tree-sitter entry at all.** Grep for `tree-sitter|75b3874e|3a57f55e|0.24.7` returns nothing. The grammar pin exists only in a receipt and a shell script, invisible to any lock-driven sweep. `pendingRepositoryPins` (`:347-368`) has a `typescript` row (`:359`) but not the grammar. **Add the grammar to the lock as part of this upgrade** — otherwise the next sweep misses it again.

**Naming defect, flag before dispatch:** the brief and `inventory.json:44` say **five-way**; every normative doc says **four-way** while enumerating five (A–E): `SPECS.md:21-27`, `TOOLS.md:26`, `INVENTORY-SCHEMA.md:59,97`, `REPORT.md:15`, `test/extract.test.ts:5`. The artifact is right; the prose is wrong in six places.

**Silent followers with no gate:** `ts-leg` (path-require), `ts-leg/fields.txt`, `backfill-manifest.json:4` + its five digests.

---

## 4. The dated bridge (Option B) — its cost is now the *default*, not the fallback

The brief's conditional ("*if* the upgrade needs a binding release that doesn't exist") **has fired**. There is no binding release and no upstream grammar rev. So the honest fork is:

**A′ — estate-carried grammar.** Vendor PR #364's `parser.c`/`node-types.json` by pinning the PR head SHA `465aa162…` in a fork of `language_definitions.json`. Cost: the estate becomes the grammar's provenance authority. TOOLS.md row 31's "upstream pin" trust statement no longer holds; the receipt records an unmerged third-party PR head. If #364 merges later, the pin must be re-recorded a second time; if it is rejected or rewritten, the estate carries a permanent fork. This is a **standing maintenance obligation**, which is precisely what the pin discipline exists to avoid.

**B — compiler-API carve-out, dated.** Cost, stated plainly: it breaks two-instrument discipline exactly on the R8 surface (`TOOLS.md:31`, "the cross-instrument byte-identity gate carries the Stage-1 evidence... the C seam is the entire trusted boundary"). But its **expiry condition is now unsatisfiable on any known date** — you cannot write "expires when upstream releases the fix" against a repo dormant 19 months with an unreviewed PR. A bridge with an unbounded expiry is not a bridge; `dsl-proposal.md:952-957`'s recommendation was written assuming an upstream rev existed.

**What I'd actually recommend, given D1b:** neither, yet. Do the **narrow A′** for `SchemaAST.ts`/`SchemaTransformation.ts` (where it is a genuine full fix, one digest, one node-types entry, zero walker risk) and **do not claim it unblocks R8**, because D1b keeps `Schema.ts` unparseable regardless. Whatever answer `Schema.ts` gets, it is a different question than D1 and it is Option-B-shaped or upstream-contribution-shaped.

---

## 5. Sequencing — what can proceed on the old pin

**Can proceed unchanged:**
- Building the **census instrument** itself (`experiments/parser-census/` is two JSON files today). The instrument is grammar-agnostic code.
- Any corpus work over `SchemaRepresentation.ts` / `SchemaParser.ts` / `JsonSchema.ts` — all parse clean at the pin.
- Lift-harness / R11 / decoder work (P1–P3) — the oxc and typescript@5.9.2 legs don't touch the grammar.

**Must wait, or must record the pin and re-run:**
- **The first census *run*.** `corpus-manifest.json:2` promises "`declCount` is null pending a census instrument run — never hand-counted." The corpus includes `microsoft/TypeScript` and `DefinitelyTyped` (`:4`), which are dense in variance annotations, and `project-labels.json:12` defines `variance-annotations` as *the D1 evidence stratum*. A census run on the old pin systematically under-counts its own evidence stratum. Two acceptable shapes: (i) run after the pin moves, or (ii) run now but stamp every `declCount` with the grammar rev and treat the run as **provisional**, re-run on bump. **Do not let un-stamped `declCount` values land** — that gums the future exactly as ruling item 8 warns.
- **The first libfree corpus run**, per the ruling.
- Any `ts-leg` regeneration — it silently follows the bump.

---

## 6. Recipe, blockers, ruling asks

### Recipe (if A′ is authorized)

1. Fork `predictable-machines/lean4-tree-sitter` at `3a57f55e`; in `ffi/language_definitions.json` set both `typescript` and `tsx` `rev` to `465aa162d077093dc5ad4f46a9463bde6274425e`. Tag it. *(Or: teach `twin/bootstrap.sh` to patch that file post-clone — cheaper, but hides the fork inside a script.)*
2. Re-run `ffi/vendor_grammars.sh`. No tree-sitter CLI needed — `parser.c` is pre-generated.
3. Update `twin/bootstrap.sh:14` (binding rev) and `:36` (`74fe453e…` → `b2dc4637d4db…`). Leave `:35`, `:37`, `:38` alone — verified unchanged.
4. `mise run check:extract-twin`. **Expect green with zero inventory byte change.** If `inventory.json` moves, stop: `Filter`/`FilterGroup` have entered an enumeration and the ruling needs to hear about it before anything is regenerated.
5. Regenerate `ts-leg` leaf rows; diff `leaf-rows.jsonl` and `atoms-g0-backfilled.jsonl` against `backfill-manifest.json`'s five digests; re-derive `fields.txt`.
6. Re-materialize the second grammar clone; record node-types.json as **108630 / `3e49eaeb…`**, counts **325/183/78/7**.
7. New receipt; TOOLS.md rows 31 (+26); `.staging/treesitter/README.md`, `MATERIALIZER-LANE.md`, `twin/README.md`; fix `REFERENCES.md:103`; **add the grammar to `sources.lock.json`**.
8. Fix the four-way/five-way wording in the six places listed.

### Blockers — block-fast verdicts

| # | Blocker | Verdict |
|---|---|---|
| **B1** | Upstream grammar rev does not exist. Pin == master HEAD, dormant since 2025-01-30. | **HARD BLOCK.** Option A cannot be executed as ruled. |
| **B2** | lean4-tree-sitter has no release past `v0.2.4`/`3a57f55e`. `language_definitions.json` is inside that repo. | **HARD BLOCK.** A′ requires an estate fork of the binding. |
| **B3** | **D1b** — `Schema.ts` has a second grammar defect (newline-separated generic call-signature overloads), unfixed by either PR, 237 residual sites. | **HARD BLOCK on the ruling's stated purpose.** Option A does not unblock full R8. |
| **B4** | The only candidate is an unmerged, unreviewed third-party PR (#364, 30 days old). | **SOFT.** Technically verified sound by me: ABI 14, one anonymous node, zero renames, both target files clean. Cost is a standing fork obligation. |
| **B5** | Grill item 3's v4.33.1 bump does **not** ride Option A for free. | **SOFT.** But if the binding is forked anyway, fork once. |
| **B6** | `ts-leg` follows the bump with no pin and no gate; `fields.txt` and `backfill-manifest.json` digests are ungated. | **SOFT**, must be in the recipe or it drifts silently. |
| **B7** | `sources.lock.json` has no tree-sitter entry; `extract.ts:33-34` records the same lock's `bytes`/`sha256` as known-wrong ("CRLF defect, repair in flight"). | **SOFT**, but this upgrade is the moment to close it. |

### Ruling asks

1. **Does "Option A" survive the discovery that it means forking?** A′ (estate carries an unmerged PR head as the grammar authority, with a standing re-record obligation) is a different act from "upgrade the pin." Explicit yes/no.
2. **#364 or #361?** Recommend **#364** — 1 grammar line, one anonymous node, 183 named unchanged, no shape change to `type_parameter`. #361 gives structurally-readable variance at the cost of a named node and a `children` block on an existing node type; it is a stale draft. Nothing in the estate reads variance today.
3. **Does the estate upstream its work?** Contributing to #364 (or reviewing it) is the only path that ends the fork obligation. Ruling item 7's own stated why — *"we return the favor by offering our tooling back"* — points directly at this. A rejected/rewritten #364 leaves a permanent fork.
4. **D1b — what happens to `Schema.ts`?** It is unparseable at the pin *and* after the fix. The R8 public surface has no tree-sitter instrument at any pin currently reachable. Options: a second grammar contribution (hard — LR ambiguity), Option B carve-out scoped to `Schema.ts` only, or narrowing R8's tree-sitter obligation to the files that parse. **This is now the real D1 decision, and it was not on the table when the ruling was made.**
5. **Census run: block or stamp?** Recommend stamping `declCount` with the grammar rev and marking the run provisional, so census-instrument work is not serialized behind a fork decision. Refuse un-stamped counts.
6. **Fork the binding once, for both the grammar and v4.33.1?** (Grill item 3.)

---

**Verification artifacts** (scratchpad, disposable): `scratchpad/tsts` (clone with `pr364`/`pr361` refs fetched), `scratchpad/build/parse-{master,364,361}` (three compiled harnesses over the estate's own vendored core), `scratchpad/snip/*.ts` (D1b minimal repros). Nothing in `/Users/pooks/Dev/foldlab` was modified; the estate's clones were read but never fetched into.
