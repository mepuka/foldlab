# atoms-effect: the token-grain training set (graphbrain pattern)

Operator ruling 2026-08-28: build the dataset in the shape of graphbrain's
`atoms-en.csv`, with our two parsers composing the train set, then mine the
subset patterns that indicate Effect code.

## Provenance (C6)

- `graphbrain/graphbrain-archive` @ `8ebf7c0b2f7f76229f0fa882db4a365aa810b780`
  (HEAD, resolved 2026-08-28; repo archived 2026-03-26), MIT-family license to
  be confirmed on pin materialization. Operator supplied the reference.
- `src/graphbrain/data/atoms-en.csv`: 6,936 tab-separated rows; column 1 is
  the atom-type LABEL (C concept, P predicate, M modifier, T trigger,
  J junction, B builder, X ignore), remaining columns are per-token features
  from spaCy (token, POS, fine tag, dependency; the same for the HEAD token
  and the previous/next neighbors; boolean flags; entity type; word shape;
  source-corpus id).
- `src/graphbrain/parsers/alpha.py`: the alpha stage is
  `sklearn RandomForestClassifier(random_state=777)` over ONE-HOT encodings of
  exactly five features per token — (tag, dep, head-pos, head-dep, pos-after).
  The beta stage (`alpha_beta.py`) is deterministic rules composing the typed
  atoms into hyperedges along the dependency tree.

## The mapping onto our lanes (exact, not analogical)

| graphbrain | foldlab |
| --- | --- |
| token | token/leaf node (finer than the census's declaration grain; declaration stays the aggregation unit) |
| atom type (C/P/M/B/T/J/X) | effect-atom type: closed set, first draft below |
| spaCy features (tag, dep, head, neighbors) | the TWO parsers' per-token facts: tree-sitter (node type, parent type, field name, ERROR proximity) ∥ compiler API (SyntaxKind, parent kind, resolved-import OpRef fact) plus prev/next token features |
| alpha = random forest per-token typer | register P (dsl-proposal §10b): candidate proposer, hoover-side, empty trust |
| beta = deterministic composition rules | the recognition manifest's spine rules (already ruled: rules as Lean first-order data) |
| hand-labeled corpus | labels BY CONSTRUCTION from the generation lane + T∧Cs-agreement auto-labels on wild strata |
| pattern search over hyperedges | subset-pattern mining over typed-atom trees → the discriminative patterns that indicate Effect code, which graduate (by grill) into manifest rules |

## Effect-atom type set (draft v0 — closed; extend here first)

- `O` op head — the recognized callee at a rule head (`Effect.gen`, `store.put`, `Data.TaggedError`)
- `A` argument — a value in op-argument position (payload hex, tag literal, field record)
- `B` binder — declared name (`const x`, generator binding, class name)
- `Y` yield marker — `yield*` and its particle
- `L` capability reference — service tag, layer, context member
- `T` type atom — type-position tokens (annotations, type params, variance)
- `H` host — executable code outside the recognized spine (the refusal-side material)
- `X` ignore — punctuation, trivia, imports handled by resolution

Label source precedence: (1) generation-lane ground truth (emitter knows every
token's role by construction); (2) T∧Cs agreement on wild strata (both
instruments byte-agree on the rule hit ⇒ tokens inherit roles from the rule
template); (3) disagreement rows are flagged unlabeled — they are findings,
never training data.

## Two-pass tagging (operator ruling 2026-08-28)

graphbrain's dataset is TWO-PASS: spaCy POS/dep tagging first, atom
simplification second — the alpha classifier predicts the simple layer FROM
the rich layer. We mirror that exactly:

- **Pass 1 — TS-POS tagging.** A fine lexical tagset over tokens, where
  high-discrimination tokens get their own tags: `kw-extends`, `kw-class`,
  `kw-export`, `kw-yield`, `kw-readonly`, `ident-upper`, `ident-lower`,
  `string-lit`, `num-lit`, `punct-<mark>`, `template-lit`, … plus the
  instrument columns (tsNodeType/ckSyntaxKind) when backfilled — those ARE
  the dep-tree analog. This resolves the generation lane's A1: the atom set
  stays closed; `extends` stays atom `X` but carries `kw-extends` in the POS
  column, which is where the classifier's signal lives (graphbrain predicts
  atoms FROM tags; it never needed `extends`-class words to BE atoms).
- **Pass 2 — atom simplification.** The closed O/A/B/Y/L/T/H/X set, as
  labeled by construction or by T∧Cs rule-template inheritance.

Rung-2 features become (pos, prevPos, nextPos, parentNodeType, fieldName) →
atom: the literal graphbrain shape. Pattern mining runs over BOTH layers —
POS-sequence patterns and atom-tree patterns — since the operator expects the
POS layer to carry additional pattern signal of its own.

## Brackets are structure tokens (operator ruling 2026-08-28, late session)

Operator: "brackets need to become structure tokens i think." Ruling recorded:
in Pass 1, every bracket token carries a dedicated structural POS tag —
`struct-paren-open/close`, `struct-brace-open/close`, `struct-bracket-open/close`,
`struct-angle-open/close` — never a generic `punct-<mark>`. The atom layer is
unchanged (brackets stay `X`; the closed set stays closed; signal lives in the
POS column per the two-pass law). Angle brackets are ambiguous at the lexical
grain (type-argument vs comparison operator): the generator tags them
`struct-angle-*` only where it minted them in type position, and wild strata
resolve the ambiguity from the instrument columns on backfill (tsNodeType is
the authority; unresolved angles fall back to `punct-lt`/`punct-gt`).
Consequence for the generation lane: FixGen's `genTokClass` currently emits
`punct` for all brackets — G1 must split it into the `struct-*` classes above.
The line-grain bracket profile below is unaffected and stays.

## The n-gram transliteration rung (operator ruling 2026-08-28, late session — SUPERSEDES rung 1's bag-of-tokens)

Operator: "we're overcomplicating this… the noise data we're interested in
is noise that is associated with effect code… we can always determine when
a file has no effect code"; "we are fine training on biased effect code
because just like the 0-effect case it is easily detectable"; atoms become
a compressed alphabet — "E ← unique effect signifier", normal tokens
collapse; "Effect.gen(function*( is not just one token"; near-misses like
"effect. generator" must stay closer to the false positive; "we need to
actually n-gram to create unique, not just absorb entire tokens"; "we
always linearize based on brackets using the char position as a feature";
width possibly fixed.

Ruling recorded:

- **Rung 1 is dialect identification.** Zero-effect files are decided by
  import resolution, not by the model. The model's job is scoring
  effect-signal inside files that have any.
- **Transliteration before features.** Per file: bind local names to `E`
  by import resolution (aliases included; spelling never trusted); member
  names after a dot keep their verbatim text (gen, pipe, TaggedError —
  on ANY receiver, so `.pipe(` survives and host members weigh against);
  other idents → `x`; strings → `s`, templates → `t`, numbers → `n`;
  keywords → short marks (`function*` → `f*`, `yield*` → `y*`); brackets
  stay literal chars (the linearization); comments dropped to `c`.
- **Features are character n-grams over the transliterated line** (fixed
  width, start/end padded), plus bracket-position features: depth at line
  start and indent bucket. Whole-token absorption is out.
- **Training data is the wild corpus** (biased positives fine); the
  generated fixture corpus becomes the LABELED EVAL SET (line labels by
  construction from target spans). The ~zero-fire criterion on baseline
  files stands unchanged.
- The two-pass POS/atom machinery is NOT discarded — it moves wholly to
  rung 2+ (structure extraction), out of the candidate-detection path.

## Preprocessing units and bracket features (operator ruling 2026-08-28)

Corpus text is preprocessed into DECLARATION and LINE units, and bracket
structure is always captured ("too easy to capture to give up"): per line —
depth at line start, depth delta, max depth within line, and the bracket
profile (the ordered string of `(){}[]<>` openers/closers the line touches).
These are line-sieve features alongside the token bag, and declaration units
carry their span's aggregate profile.

## The real-Effect corpus (operator ruling 2026-08-28)

V3's answer: vendor an ENORMOUS register of real Effect code from GitHub —
not just the three baseline pins. Bytes live under `corpus/` (gitignored;
never committed), while the committed artifact is the corpus manifest
(`experiments/parser-census/corpus-manifest.json`): repo, pinned commit,
license, byte/file/declaration counts, strata labels per project-labels
vocabulary. Permissive licenses only (MIT/Apache-2.0/BSD/ISC/0BSD);
everything else is refused and the refusal recorded. Preprocessing per the
units ruling above, emitted as JSONL beside the manifest pins.

## Row format

`atoms-effect.jsonl` (JSONL, not CSV — estate house format; byte-gated,
deterministic order): one row per token with
`{label, token, tsNodeType, tsParentType, tsFieldName, ckSyntaxKind, ckParentKind, opRef|null, prevToken, prevTsType, nextToken, nextTsType, declIndex, byteSpan, stratum, projectId, producingRule|null, seed|null}`.
The five-feature alpha baseline is the deliberate first model:
(tsNodeType, tsFieldName, tsParentType, ckParentKind, nextTsType) mirrors
graphbrain's (tag, dep, hpos, hdep, pos_after). Start EXACTLY this small;
grow features only against measured per-stratum P/R.

## The model ladder (operator addition 2026-08-28)

Operator: `wink-naive-bayes-text-classifier` "might work very well here if you
get a good labeled set... all you need is to pick above the noise and the
patterns are fairly easy on a line by line basis." Pinned: npm
`wink-naive-bayes-text-classifier@2.2.1`, MIT, winkjs family (same vendor as
the admitted composer harness; deps wink-nlp/wink-helpers/wink-eng-lite-web-model),
plain JS — runs under bun in the codex lane directly, no Python seam.

**Stack law (operator ruling 2026-08-28): NO scikit-learn, no Python seam,
anywhere in this lane.** graphbrain's alpha is cited as architecture only —
its sklearn implementation is explicitly NOT adopted. Every model rung runs as
plain JS/TS under bun inside the codex lane. Rung 1 is wink-naive-bayes
(pinned above). If rung 2 needs an actual forest, candidate is pure-JS
`ml-random-forest` (mljs, MIT) — pin and TOOLS.md-admit at first use; if
wink-naive-bayes at token grain clears the bar first, rung 2 may not need a
forest at all. Model serialization is JSON committed next to the run manifest,
same determinism discipline as every other generated fixture.

Three rungs, cheapest first, all hoover-side (register P discipline applies to
every rung — ranked candidates, never filters that delete):

1. **NB line sieve** (wink-naive-bayes, LINE grain): classify each line
   effect-candidate vs noise from bag-of-tokens. Job: recall — "pick above the
   noise". Line labels derive mechanically from the same labeled set: a line
   is positive iff it intersects a labeled byte span, so `atoms-g0.jsonl` and
   the census spans feed this rung with zero extra labeling work.
2. **RF atom typer** (graphbrain alpha analog, TOKEN grain): types tokens in
   sieve-surfaced regions with the five-feature baseline above.
3. **Manifest rules** (beta analog, deterministic): the only rung that mints
   documents, and only through the word gate.

Evaluation shared across rungs: per-stratum P/R against by-construction
labels; the `non-effect-baseline` ~zero-fire criterion applies to rung 1
exactly as to rung 2. If rung 1's recall on generated+wild positives is high
enough at line grain, rung 2 runs only inside sieve hits — that is the
lightweight shape the operator is pointing at.

## Pattern mining (the operator's third step)

After alpha-typing wild strata: mine frequent typed-atom subtree/subsequence
patterns per stratum, rank by lift toward effect-code-vs-baseline, and emit a
candidate-pattern report. Candidates are evidence for NEW manifest rules —
they enter the manifest only through the grill, and admission stays word-gated
(direction law unchanged).
