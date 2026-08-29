# Dispatch brief: instrument backfill, G1 grammar, wild auto-labels

Status: pre-grade, 2026-08-28. Ranked lane order below is the coordinator's;
the operator approved the sequence in-session ("ok please proceed", then
"yeah i'm fine with that" on the follow-on plan). Each lane is dispatchable
to one implementation agent (Opus 5 ceiling; set the model explicitly).
Everything here inherits the standing constraints without restating them:
C1–C7, the stack law (plain JS/TS under bun — NO scikit-learn, no Python
seam), homes stay in `.staging/` until grilled, `library/` and
`experiments/` gates untouched, `corpus/` is read-only evidence.

## Ground state a dispatched agent may rely on

- `experiments/parser-census/corpus-manifest.json` @ `0a07d0a1`: 29 pinned
  projects under `corpus/` (gitignored bytes) — 26 wild-effect
  consumer-register projects spanning Effect v3→v4-rc, plus the three
  materialized `non-effect-baseline` pins (TypeScript sparse `src/compiler`,
  DefinitelyTyped 48-package sample seed 20260828 with the list committed,
  wink-composer 0.5.1). 10 refusals recorded. `declCount` is null
  everywhere: no census instrument has counted yet — never hand-fill it.
- `.staging/fixture-gen/` G0: 265 declaration rows / 34,467 token rows,
  four gates green at labels digest `58d96f81…`. Instrument columns null.
- Operator register ruling: Effect **library src is poor ground truth**
  (implementation register); training positives are wild-effect projects
  plus generated fixtures. The monorepo checkout stays a feature/reference
  source only.
- Operator ruling, brackets: Pass-1 POS gives every bracket a dedicated
  structural tag (`struct-paren-open` … `struct-angle-close`), never generic
  punct; angles resolved by tsNodeType on backfill; atom set unchanged.
  Recorded in `atoms-effect-design.md`.

## Lane B — instrument backfill over G0 — **DONE 2026-08-28, in-session** (see `.staging/fixture-gen/backfill/README.md`; 34,254 leaf-grain rows, 99.86% labeled, 47 findings all one regex-tokenizer defect, both instruments 100% span-covered, determinism green)

Run the admitted tree-sitter twin over each G0 fixture's `text` (they are
self-contained TS files) and emit the token grain at the **instrument's own
tokenization** — this is the ruled resolution of fixture-gen D7: instrument
tokens are canonical; the generator's `genRole`/atom labels project onto
them by byte-span containment (a generator token's label applies to every
instrument token its span covers; an instrument token spanning two
generator tokens is a finding row, not a guess).

Deliverable: `atoms-g0-backfilled.jsonl` beside G0, same columns with
`tsNodeType`/`tsParentType`/`tsFieldName` filled (compiler-API columns may
stay null if only one instrument runs; say which ran). Gates: span gate
(every row re-slices), determinism (`--check` byte-identical), and a
coverage histogram — % of G0 tokens whose labels projected cleanly vs
finding rows. Angle-bracket resolution per the brackets ruling.

## Lane A — G1 grammar — **PAUSED 2026-08-28 (operator pivot)**: rung 1 is now the n-gram dialect sieve (`ngram/README.md`), which needs no synthetic training data. The grammar work below is re-scoped to EVAL breadth (wild-shaped R-GEN/R-PIPE fixtures to evaluate the sieve against) and rung-2 ground truth — same design, demoted urgency. Assets already landed: the real-noise artifact (`noise-real-g1.jsonl` + generated `NoiseReal.lean`, 48 snippets) and the typescript-compiler re-pin (commit 9f8c70a9).

Three additions to `FixGen`, all sweep-table-shaped:

1. **R-GEN and R-PIPE productions.** Use dsl-proposal §10b.3's
   invertibility inventory: `constYield`/`retArray`/`obj`/`arr` generate
   as-is; `call`/`opAccess` need the import-spelling table (the existing
   M-IMPORT-* axis generalizes). Positives must cover `Effect.gen`
   generator bodies (`Y` atoms are 66 of 34,467 in G0 — this is the
   scarcity being fixed) and `.pipe(...)`/`pipe(...)` chains. Mutation
   register and tag policies extend, never fork.
2. **`struct-*` token classes.** Split `genTokClass: punct` per the
   brackets ruling; the generator tags `struct-angle-*` only where it
   minted type position.
3. **The noise-snippet artifact.** `Corpus.lean` stays IO-free, so real
   noise splicing needs a committed snippets file: an acquisition step
   samples declaration-sized snippets from the three materialized baseline
   checkouts (deterministic seed, counts and file list recorded, same
   shape as the DT package sample) into a committed JSONL the generator
   reads as data. Rows carry real provenance (`noiseSynthetic: false`,
   project id, path, byte span at the pin). The 12 synthetic snippets stay
   as a declared fallback stratum. This discharges D3/D4 on use, not just
   availability.

Label vocabulary extensions (new `label` values for R-GEN/R-PIPE rows) go
in `FixGen/Grammar.lean` first per the closed-set rule, and are proposals
to the grill, not mints.

## Lane C — T∧Cs auto-labels over the wild tranche (rank 3: blocked on B's instruments)

Walk `corpus-manifest.json` wild-effect projects (skip nothing silently:
per-project row counts in the run manifest, including zeros and parse
failures). Both instruments; a declaration gets auto-labels only where
both byte-agree on the rule hit (label source precedence rule 2);
disagreements are quarantined finding rows. Output is the wild slice of
`atoms-effect.jsonl` plus the per-stratum construct histogram the
composer brief §3 promised — the first "how linearizable is
Effect-in-the-wild" numbers with real error bars. `declCount` backfill
into the corpus manifest happens here, from the instrument, with the run
pinned.

## Harness extraction (2026-08-28, late): canonical v0 code now lives in `.staging/parser-experiments/harness/` — contract (portable, Lean-port seam documented in its README) + two gated engines + CLI + models; `mise run check` there = strict tsc + the agreement gate, both green. Lane dirs keep run records.

## Ladder state 2026-08-28 (end of session): rung 1 DONE (anchor-gated sieve, zero baseline fire by construction, 153/153 decl-grain positives); extraction pipeline DONE (`ngram/extract.ts --all`: 11.9M seed tokens, per-repo density in `wild-density.json`); rung 2 NB typer at 92.4% in-region vs by-construction truth (`ngram/rung2-results-intarget.json`). Next: rung-3 pattern mining over typed spans; H/L seed gaps recorded in `ngram/README.md`.

## After A+B (not before): rung 1 (superseded by the pivot — see ladder state above)

wink-naive-bayes line sieve per the model ladder — line labels derive
mechanically from labeled spans; per-stratum P/R; ~zero-fire criterion on
the real baseline stratum is the acceptance gate. Model runs and any
promotion of a model into a proposer role stay ratification-gated
(recognition lane §9b.4).

## Tooling state

- **wink-statistics@2.1.1 ADMITTED** (operator pin 2026-08-28, "yes add
  it"): TOOLS.md row landed beside composer's. Both are installed in this
  lane's `package.json` — composer from the pinned git tag
  (`github:winkjs/composer#a371fd8b…`, npm publishes only stale 0.0.1),
  wink-statistics from npm exact. Smoke-verified under bun: composer
  0.5.1 loads (exposes `classify`/`classificationMetrics` nodes),
  `stats.streaming.summary()` computes. Dispatched agents consume these
  deps; they do not re-install from other sources.

## Open items

- **beep-effect / kilocode** size deferrals stand in the manifest's
  refusal table; revisit only if the wild register proves thin.
