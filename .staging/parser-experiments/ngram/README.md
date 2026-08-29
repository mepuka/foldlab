# Rung 1 — the n-gram dialect sieve (operator design 2026-08-28)

Effect detection as dialect identification: transliterate code into a
compressed alphabet where effect-ness survives import RESOLUTION (never
spelling), collapse everything else, and classify **character 4-grams of
the transliterated line** with wink-naive-bayes, gated on the ANCHOR: a
line may fire only if its stream carries `§` — an import-RESOLVED effect
binding — so a zero-effect file is silent BY CONSTRUCTION, never by
statistics. The effect signifier is `§` (a char no identifier contains;
a plain `E` was spoofable by verbatim member names like `.Element`). Brackets stay literal
chars in the stream (the linearization); depth-at-line-start and indent
bucket ride along as features. Zero-effect files are decided by import
scan, not by the model.

```sh
bun train-eval.ts   # collect + train + calibrate + eval, ~1s end to end
```

- `translit.ts` — masking pre-pass (multi-line comments/strings/templates),
  import-binding scan, symbol mapping, n-grams.
- `train-eval.ts` — corpus collection, NB training, odds-threshold
  calibration (99.5th pct of baseline holdout scores), the fixture eval.
- `results.json` / `model-r1.json` — run record + serialized model with
  threshold (register P: candidate proposer, empty trust).

## Results (2026-08-28 final, anchor-gated, train ~150ms on 71k lines)

Baseline fire is **0/20,018 unseen lines and 0.0000 on the file-honest
holdout — zero by construction** (no import ⇒ no `§` ⇒ no fire). All 153
fixture positives hit at declaration grain. Near-miss fires split
exactly on import resolution: the five variants that fire (`TaggedClass`,
`TaggedEnum`, const-factory, declare-class, type-alias) ARE resolved
effect code; the silent three carry no resolved effect material
(schema-tagged-error is silent only because G0 never imports Schema).
Training includes the old-register tranche (typed-fx, menimal, otel,
contentlayer @effect-ts-generation; commit 6b968a16); the binding scan
covers effect, @effect/*, and @effect-ts/*.

`extract.ts` is the rung-2 feedstock pipeline: sieve hits → enclosing
balanced bracket span → compiler-API statement snap → resolution-seed
labeled tokens (labelSource: "resolution-seed", never ground truth).
First run over two repos: 1,255 spans, 412k tokens, 5,204 Y rows.

## Rung 2 — the atom typer (2026-08-28, same session)

`rung2-typer.ts`: wink-NB over per-token features (ckSyntaxKind,
ckParentKind, prevCk, nextCk, token-text≤20) — the graphbrain-alpha
analog under the stack law (no forest needed yet). Trained on 1.29M
rows subsampled per-class from the 11.9M wild seed tokens (streamed);
evaluated on the generated corpus's by-construction labels, restricted
to inTarget spans (the region rung 2 actually runs on — sieve-silent
noise never reaches it). Train+eval ~10s end to end.

**In-region accuracy 0.9243** (6,501 tokens): X F1 .995 · A .900 ·
O .879 (P .962) · B .864 · Y 1.000 · T .671 · H .296 · L 0. Two seed
conventions had to be aligned to the ruled ones along the way (type-node
interiors: T only for type tokens, punctuation X per A1; modifier
keywords X; PropertySignature names A per A8) — each alignment was
visible as a confusion block before the fix (58%→75%→88%→92%).

Honest gaps: `H` in-span is heterogeneous and small-support (arrow
bodies, host calls inside gen) — the next win is likely a rules pass,
not more NB; `L` is never minted by the wild seed rules (capability
references need type-info or a dedicated seed rule) so the G0 store-
binder convention goes unmatched; `.pipe` on local receivers still
seeds H. These are rung-3 / pattern-mining inputs, recorded here so
nobody reads 92% as uniform.

## Superseded first-pass numbers

Training: 40k lines from effect-importing files across 7 wild repos
(biased positives, ruled fine) vs 40k baseline lines (compiler + DT +
wink mixture). Eval on the GENERATED fixture corpus — line labels by
construction — plus unseen baseline files.

Declaration grain (sieve contract — any target line fires):

| label | decl-hit | want |
|---|---|---|
| TAGGED-ERROR-CANONICAL | 48/48 | hit |
| TAGGED-ERROR-SKEWED | 96/96 | hit (α-renamed, aliased, wrapped included) |
| PROG-DECL (Effect.gen) | 9/9 | hit |
| NEG-COMMENT-DECOY | 0/24 | silent (masking pre-pass) |
| NEG-HOST | 0/36 | silent |
| CONST-DECL | 0/4 | silent |
| NEG-NEAR-MISS | 36/48 | fires — CORRECT at the dialect task: `Data.TaggedClass` / `Schema.TaggedError` ARE effect code; rule-level discrimination is rung 2's job |

Baseline, unseen files (DT + wink, 20k lines): fire-rate **0.0009** —
the census's ~zero-fire criterion holds. Noise/context lines inside
fixtures: 8.2% line-grain fire (irrelevant at decl grain; headroom via
threshold).

Known limits, recorded honestly: the eval's positive registers are
TaggedError + house Effect.gen only (the generated corpus has no wild
R-GEN/R-PIPE fixtures yet — the paused G1 grammar work covers that);
line-grain recall inside multiline records is structurally low (interior
field lines carry no effect-gram) and is not the metric the sieve is
held to.

> SUPERSEDED 2026-08-28: canonical code PROMOTED to experiments/lift-harness (commit da0cc83a); this dir keeps run records only.
