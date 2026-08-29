# Fixture generation — the G0 lane design

Status: pre-grade, 2026-08-28. Everything under `.staging/` is pre-grade
by the estate's grade rule (AGENTS.md, "Producing artifacts"): nothing
here is an artifact, no claim here is gated above G0, and promotion is a
declared transformation, not a rename.

This lane is the second of two parallel efforts. The first — the
recognition lane, `.staging/libfree/dsl-proposal.md` — asks *which
TypeScript can be lifted into the store language, and how a refusal is
classified*. This lane asks the inverse: **given a grammar, produce
labeled TypeScript at scale, with ground truth by construction**, so a
lightweight classifier can be trained and measured against material
whose labels nobody had to guess.

The two lanes share a vocabulary deliberately. Where the recognition
proposal already names a register (§3), a rule (§8), or a refusal code
(§8), this lane cites it verbatim rather than minting a synonym. Where
it does not, this lane names the gap in `DECISIONS.md` and proposes,
rather than mints (C4).

---

## 1. What the lane produces

| File | Grain | Contents |
|---|---|---|
| `dataset-g0.jsonl` | declaration | 265 rows: one generated fixture each, with the candidate declaration's byte span and its ground-truth class |
| `atoms-g0.jsonl` | token | 34,467 rows: one per significant token of every fixture, with its effect-atom label |
| `manifest-g0.json` | run state | seeds, rule addresses, sweep tables, mutation register, noise sources, the pinned labels digest, and every histogram |

The two grains come from ONE construction and join on `declIndex`. The
declaration grain is the census lane's unit of observation; the token
grain is the graphbrain-shaped training set the operator ruled for
mid-lane (see §6).

---

## 2. The grammar as data

**Carrier.** G0 is authored as Lean first-order data in
`lean/FixGen/Grammar.lean` — no new text format is minted, per the
grammar-grill ruling the recognition proposal cites at its §7.1. The
authoring surface is Lean declarations, exactly how the estate authors
its MCP tool table and its vector registry.

```
inductive Prod where
  | taggedDecl   (name tag : String) (fields : List FieldSpec)
  | progDecl     (name : String) (shape : ProgShape)
  | constDecl    (name : String) (fields : List (String × String))
  | decoy        (variant name tag : String)
  | commentDecoy (variant name tag : String)
  | host         (variant name : String)
```

**Two families, per the coordinator's G0 ruling.**

*Family (a) — the estate's backend TypeScript AST.* `progDecl` and
`constDecl` lower through `Cas.Backend.treeProgram` and
`Cas.Backend.Ts.Render` — the estate's own printer over the estate's own
`Expr`/`Stmt`/`ProgDecl` AST (`library/cas/Cas/Backend/Ts.lean`,
`EmitProg.lean`). These rows are byte-gated house style by construction:
their bytes are the bytes `mise run gen:backend-programs` already holds
byte-identical, and their labels were never in doubt. The five
`rfl`-pinned target forms in `Cas/Backend/Target.lean` are the type-level
side of the same fragment; G0 does not yet emit type-position fixtures
from them (decision D6).

*Family (b) — `TaggedDecl(name, tag, fields)`, the NEW production.*
`class <name> extends Data.TaggedError("<tag>")<{<fields>}> {}`. The
class name is a parameter, the tag is a string literal chosen by an
explicit **tag policy** (`same`, `skew-ident`, `skew-dotted`), and the
field record is drawn from the canonical-schema atoms
(`Cas.Schema.Ast` — `null`/`bool`/`int`/`str`/`lit`/`arr`/`struct`).
Field types render through the estate's pinned TypeScript type fragment
(`Cas.Schema.Foreign.TypeScript.TypeExpr.render`); only the object-type
record, for which `TypeExpr` has no constructor, is spelled locally.

**Content addressing.** Every production and every rule encodes to
canonical JSON (`Cas.Json.renderCompact`, CAS-003) and is addressed as
the estate's own `.value` node — `Cas.sha256Addr (Cas.encodeNode ⟨0,
Ty.value.wireTag, utf8 payload, []⟩)`, which is exactly the elaboration
`Cas/Grammar/Tree.lean` gives `Tree.value`. No new identity scheme is
introduced. Each dataset row carries `ruleAddress` (the producing rule)
and `productionAddress` (the instantiated production it actually shows),
so a fixture cites its producing rule by address, not by name.

Rule addresses in this run:

| Rule | Register | Address (sha256, scheme-0) |
|---|---|---|
| `tagged-error-decl` | R-ERR | `b555886c075b126fe3794636e62479e37e3c5988c013bf3e78aac873931d4fd6` |
| `program-decl` | R-GEN | `c9a198234d43366286aa9054af2d9d4e4f9becf680fa40b5f961636d21e530c6` |
| `schema-const-decl` | R-SCHEMA | `dc8bb80398a5e0b1b140cfa6f52b217d69e2602f6aa33b9cd04fecc10f0d5908` |
| `near-miss-decoy` | R-ERR | `86741544232b0778776d4744202dd53050a5ebcc6fba673e73de98516034d083` |
| `host-decl` | — | `b07f507e853d9220a3deb9c2bcd282f1b0b52b66d7b97dc804fd9c08fde74356` |
| `comment-decoy` | — | `b377b9a430c1d733e6872f386851dc3b1f635ffdfc72c71869f0dc74f72b6d25` |

---

## 3. Sampling: determinism is the design, not a property

The corpus is a **pure function of committed data**. `FixGen/Corpus.lean`
contains no `IO`; the executable's only inputs are the seed constants,
the sweep tables, the noise corpus, and the labels file it reads to
verify (not to sample). There is no clock, no `Math.random`, no
directory listing, no environment.

**Seeds** (`FixGen.seeds`, committed in source):

```
mutation = 20260828      -- base seed
stride   = 7919          -- prime stride; rowSeed i = mutation + i*stride
```

`rowSeed i` seeds a SplitMix64 stream used for mutation selection, noise
draw counts, noise snippet choice, pseudonym choice, and wrapper choice.
The stride is prime so the mutation pattern does not align with the
sweep's periods (8 names, 3 policies, 6 field sets).

**The sweep** is exhaustive where it matters and enumerated where it does
not. Order is position in `FixGen.plan`, so row indices are committed
data:

| Segment | Cross product | Rows |
|---|---|---|
| `taggedDecl` | 8 names × 3 tag policies × 6 field sets | 144 |
| `decoy` | 8 near-miss variants × 6 names | 48 |
| `commentDecoy` | 4 variants × 6 names | 24 |
| `host` | 6 variants × 6 names | 36 |
| `progDecl` | 9 enumerated grammar terms | 9 |
| `constDecl` | 4 enumerated mirror rows | 4 |
| | | **265** |

Growth is a sweep-table edit, not a code change.

---

## 4. Mutation operators

Two tiers, kept apart because they mean different things to a
recognizer. Production-tier mutations rewrite the production, so the
row's `productionAddress` and its label are recomputed from the mutated
production — the label follows the bytes, never the intent.
Presentation-tier mutations leave the production alone, so a whole
presentation family shares one `productionAddress`. That is exactly the
invariance a classifier is meant to learn.

| Code | Tier | Effect | Fired in |
|---|---|---|---|
| `M-RENAME` | production | α-rename the declared identifier and field names to committed pseudonyms — deliberately dropping the `Error` suffix, so a classifier keying on the name is punished. The tag travels with the name when the tag policy is `same`, so α-renaming never manufactures skew. | 51 rows |
| `M-EXPORT` | presentation | `export ` prefix, inside the candidate span | 107 |
| `M-IMPORT-ALIAS` | presentation | `import { Data as D } from "effect"`, callee spelled `D.TaggedError` (dsl-proposal §4b.2 A1) | 63 |
| `M-IMPORT-SUBMODULE` | presentation | `import * as Data from "effect/Data"` (dsl-proposal §4b.1 W1) | 42 |
| `M-QUOTE` | presentation | single-quoted tag literal | 54 |
| `M-WS` | presentation | flip the payload record between inline and one-field-per-line | 49 |
| `M-COMMENT` | presentation | block comment spliced inside the record braces | 21 |
| `M-WRAP` | presentation | nest in `export namespace … { … }`, indenting the span | 30 |

The two import mutations are mutually exclusive; alias wins. Firing odds
(`mutOdds`) are committed data, not tuned constants: `1/2` for export,
`1/3` for rename and whitespace, `1/4` for the imports and quoting,
`1/5` for comments, `1/6` for wrapping.

**Family (a) admits no mutations.** Those rows exist precisely because
their bytes are already byte-gated house style; mutating them would
destroy the property that makes them useful. Noise embedding still
applies.

---

## 5. Noise embedding

Every fixture is `imports ++ noise* ++ [wrapper] ++ CANDIDATE ++
[wrapper close] ++ noise*`. Noise is drawn from the
**`non-effect-baseline` stratum** — the control stratum of
`experiments/parser-census/project-labels.json` (committed `70e684fd`),
whose own header closes its label vocabulary: *extend it here first,
never ad hoc in an experiment*. This lane obeys that: it cites strata,
it does not invent them, and the generator **fails** if a cited stratum
or project id is absent from that file.

The labels file is pinned by digest into the manifest:

```
path   experiments/parser-census/project-labels.json
commit 70e684fd
sha256 dcb0f2ba748d97dab21e69802825f64b623bbbae8cd9fc333b43fd4063f1677b
```

**Honest availability note.** All three projects that file labels
`non-effect-baseline` — `typescript-compiler`, `definitely-typed`,
`wink-composer` — carry `"localPath": null`. They are pinned but not
materialized on this host, so G0 cannot splice their bytes. G0 therefore
ships a **synthetic** baseline corpus (12 snippets in
`FixGen/Noise.lean`) whose shapes transcribe that register, and declares
the three pinned sources in the same source table with
`available: false` and their pins recorded. No row claims provenance it
does not have: `noiseStratum` says which stratum the noise *imitates*
and `noiseSynthetic` says whether the bytes came from a checkout.
Materializing the pins turns those sources on without a grammar change,
because the source table is data. This is decision **D3**.

---

## 6. The row contracts

### 6.1 Declaration grain — `dataset-g0.jsonl`

One canonical-JSON object per line (`Cas.Json.renderCompact`: sorted
keys, no whitespace, `JSON.stringify`-exact escaping).

| Field | Meaning |
|---|---|
| `declIndex` | position in `FixGen.plan`; the join key for the token grain |
| `seed` | the row's SplitMix64 seed (`mutation + declIndex*stride`) |
| `rule`, `ruleAddress` | the producing rule, by name and by content address |
| `production`, `productionAddress` | the instantiated production as canonical JSON, and its address |
| `register` | the recognition lane's §3 register (`R-ERR`, `R-GEN`, `R-SCHEMA`, or empty) |
| `spine` | the §8 spine-constructor rule names this production's recognition would compose from |
| `refusalCode` | the §8 refusal code v0 recognition emits on this production (`E-FAIL-NOT-DOCUMENTED` for `R-ERR`), empty when v0 recognizes it |
| `label` | the ground-truth class (closed set, §6.3) |
| `isTaggedDecl` | the binary task's target |
| `tagPolicy`, `fieldSet`, `recordLayout` | the sweep coordinates |
| `mutations` | the applied operators, in register order |
| `wrapper` | the namespace name when `M-WRAP` fired, else null |
| `noiseSource`, `noiseStratum`, `noiseSynthetic`, `noiseBefore`, `noiseAfter` | the noise provenance |
| `targetStart`, `targetLength` | the candidate's byte span in `text`, UTF-8 |
| `targetText` | the exact slice, so a row is self-verifying |
| `text` | the whole generated fixture |

### 6.2 Token grain — `atoms-g0.jsonl`

The column order of `.staging/parser-experiments/atoms-effect-design.md`,
with the instrument columns null:

```
label, token, tsNodeType, tsParentType, tsFieldName, ckSyntaxKind,
ckParentKind, opRef, prevToken, prevTsType, nextToken, nextTsType,
declIndex, tokenIndex, byteSpan, stratum, projectId, producingRule, seed,
inTarget, genTokClass, genRole
```

`label` is the effect-atom from the design doc's closed v0 set
(`O A B Y L T H X`), assigned **where the token was minted**: the
`TaggedDecl` renderer knows the class name is a binder, `Data`/
`TaggedError` is the op head, the tag literal is an argument, the field
names are arguments and their types are type atoms, and the braces are
ignore. That is the scarce thing this lane produces.

`tsNodeType`, `tsParentType`, `tsFieldName`, `ckSyntaxKind`,
`ckParentKind`, `opRef`, `prevTsType`, `nextTsType` are **null**: this
lane runs neither tree-sitter nor the compiler API, and emitting a
guessed node type would be a fabricated parser fact. The census lane
backfills them by joining on `(declIndex, byteSpan[0])`. Two
generator-side columns ship in the meantime, named so nobody mistakes
them for instrument output: `genTokClass` (the lexical class this
generator assigned) and `genRole` (the grammar position that minted the
token, e.g. `taggedDecl.tagLiteral`). The five-feature alpha baseline
the design doc prescribes therefore has three of its five columns
pending; `genTokClass`/`genRole`/`prevToken`/`nextToken` are a usable
stand-in for a first sanity run and nothing more.

Whitespace produces no rows — it is separation, not a token. Comments
do, because the comment decoys make them load-bearing negatives.

### 6.3 The label vocabulary (CLOSED)

Extend in `FixGen/Grammar.lean` first, never ad hoc in a run.

| Label | Rows | Meaning |
|---|---|---|
| `TAGGED-ERROR-CANONICAL` | 48 | `TaggedDecl` with `tag = name` |
| `TAGGED-ERROR-SKEWED` | 96 | `TaggedDecl` with `tag ≠ name` |
| `NEG-NEAR-MISS` | 48 | `Data.TaggedClass`, `Schema.TaggedError`, `extends Error`, const factory, type alias, `TaggedEnum`, interface shadow, `declare class` |
| `NEG-HOST` | 36 | plain non-Effect TypeScript, the control shape |
| `NEG-COMMENT-DECOY` | 24 | the `TaggedDecl` text inside a comment, a JSDoc example, or a template literal |
| `PROG-DECL` | 9 | the R-GEN straight-line program (family (a)) |
| `CONST-DECL` | 4 | the generated mirror const (family (a)) |

Binary task: 144 positive / 121 negative.

Atom histogram: `X` 22,924 · `H` 9,567 · `A` 793 · `O` 432 · `T` 360 ·
`B` 283 · `Y` 66 · `L` 42. Inside candidate spans only: `X` 4,308 ·
`A` 793 · `O` 432 · `T` 360 · `B` 283 · `H` 210 · `Y` 66 · `L` 42.

---

## 7. Gates

Three run before anything is written, and all three are failures, not
warnings:

1. **Family (a) byte gate.** The token transcription of every backend
   declaration must equal `Cas.Backend.Ts.Render`'s own output byte for
   byte. The transcription exists so family (a) tokens carry
   by-construction labels; it does not get to be trusted, so it is
   gated. Red means `FixGen/Render.lean` has drifted from the printer.
2. **Span gate.** Every declaration row's `[targetStart, +targetLength)`
   must re-slice to its `targetText`, and every token row's `byteSpan`
   must re-slice to its `token`. 265 + 34,467 checks per run.
3. **Stratum gate.** Every stratum and project id a noise source cites
   must occur in `experiments/parser-census/project-labels.json`, which
   is then pinned by digest into the manifest.

The **determinism gate** is `--check`: regenerate in memory and assert
the committed run state is byte-identical. Two runs that disagree are a
defect, exactly as in the estate's emitter gates.

---

## 8. Codex-operable commands

Every step is one idempotent command. The tasks live in
`.staging/fixture-gen/mise.toml`, **directory-scoped** the way the
Coq/OCaml annex is (AGENTS.md, "Platform"), so the root `mise.toml` — the
one CI runs — is untouched.

Gate state observed on this host, before and after this lane was built:
`mise run check:cas` green, `mise run check:effects:research` green,
`mise run check:effects:ts` **RED at HEAD, pre-existing** — its
`check-dist-consumer.ts` step reports `Cas.layerMemory is not a function`
and `dist entry is missing the Replay namespace`, which is the
consumer-smoke script still expecting a surface the CAS public-surface
ruling removed. No file under `library/` or `experiments/` was modified
by this lane (`git status` clean apart from a pre-existing untracked
PDF), so that red is unrelated and is reported, not inherited.

```
cd .staging/fixture-gen

mise run build     # build the generator against the graded `cas` library
mise run gen       # regenerate dataset-g0.jsonl, atoms-g0.jsonl, manifest-g0.json
mise run check     # family-(a) byte gate + span gate + stratum gate + determinism gate
mise run clean     # drop the generated corpus
```

**The determinism command, stated once:**

```
cd .staging/fixture-gen && mise run gen && mise run check
```

`gen` twice in a row followed by `check` must print
`ok determinism gate (265 declaration rows, 34467 token rows, 3 files
byte-identical)` and exit 0.

Equivalently, without mise:

```
cd .staging/fixture-gen/lean
lake exe fixgen         .. ../../../experiments/parser-census/project-labels.json
lake exe fixgen --check .. ../../../experiments/parser-census/project-labels.json
```

**Machine-readable outputs.** All three artifacts are canonical JSON or
JSONL. Progress is a diff of `manifest-g0.json`'s `histograms` block —
the same legible goal-state shape the recognition lane's §9b.2
prescribes for refusals.

**Committed run state.** `manifest-g0.json` carries every input that
determined the corpus: seeds, sweep tables, mutation register with odds,
rule addresses, noise sources with their pins, the labels-file digest,
and the counts. Caveat: `.staging/` is gitignored (`.gitignore:1`), so
"committed" is presently a shape, not a fact — the run state is
commit-*ready* and becomes committed on promotion. This is decision
**D1**.

---

## 9. What this lane does NOT do

- It does not run tree-sitter or the TypeScript compiler API, so it
  produces no instrument features and makes no claim about what either
  instrument sees.
- It does not train or evaluate a classifier. It produces the training
  set and the ground truth; the model, its metrics, and any promotion of
  a model into a proposer role stay ratification-gated (recognition
  lane §9b.4).
- It does not edit `.staging/libfree/dsl-proposal.md`, `docs/`,
  `formal/`, `experiments/`, or `library/`. It reads
  `experiments/parser-census/project-labels.json` and depends on
  `library/cas`; it writes nothing outside `.staging/fixture-gen/`.
- It mints no refusal code and no register. Where G0 needs a recognition
  rule the proposal's §8 does not have — and `tagged-error-decl` is
  exactly that — the gap is named in `DECISIONS.md` as a proposal to
  that lane.
