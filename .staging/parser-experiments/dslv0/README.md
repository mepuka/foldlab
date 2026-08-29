# dslv0 — the store-language lift on the oxc chassis

The production extractor architecture the 2026-08-28 grill ratified:
**parser-spined** (spans are always parser-issued), **oxc hot path**
(via oxlint custom rules on the effect-oxlint framework), the sieve
demoted to non-parsing triage, and every parser admitted only through
the **multi-parser agreement gate** on the 265 by-construction fixtures.

- `plugin.mjs` — the `dslv0/lift` rule: v0 recognition (Rules 1, 3, 4,
  5, 6, 9 of the recognition proposal + refusal classifiers) ported to
  ESTree on effect-oxlint's `Rule.define`. One diagnostic per candidate
  declaration; the message IS the evidence — a canonical-JSON lift
  (linear instructions + word, answer-refs as indices) or refusal.
- `.oxlintrc.json` — `jsPlugins` config; run with `-A all` so only the
  evidence rule fires.
- `gate.ts` — the agreement gate: oxc verdicts vs the `../lift/lift.ts`
  compiler-API leg, per fixture.

```sh
bun gate.ts                    # MULTI-PARSER AGREEMENT GATE
./node_modules/.bin/oxlint -c .oxlintrc.json -A all --format json <dir>
```

## Results (2026-08-28)

- **Gate GREEN**: 265/265 fixture verdict agreement including detail
  strings; 9/9 lifts on both legs. Wild spot-parity: 209/209 files
  (effect-machine), zero diffs.
- **Speed** (alchemy, ~12k files, same 3,219 verdicts both legs):
  oxc chassis **1.38s** vs typescript@5.9.2 in-process **4.13s** —
  ~3x, from Rust parse + parallel walking; the JS rule body is now the
  bottleneck (headroom remains).
- Pins and trust: TOOLS.md "oxc extractor chassis" row (admitted via
  the gate); effect-oxlint clone pinned in the corpus manifest (also
  wild-effect v4 dogfood corpus).

## Cautions

- oxlint ignores dot-directories: files under `.staging/` must be
  passed explicitly (gate.ts does).
- The import-binding scan in `plugin.mjs` is specifier-local, like the
  lift.ts leg — upgrading to effect-oxlint's `Scope.*` resolution is
  the intended next step and must go back through the gate.
- The plugin walks top-level declarations only (v0 scope); nested
  namespaces/blocks are out of scope on BOTH legs, so the gate cannot
  see that gap — widening scope needs new fixtures first.
- Rule 7 (hex pinning) unenforced; E-BRANCH arms unattempted — same
  deviations as the lift.ts leg, inherited knowingly.

> SUPERSEDED 2026-08-28: canonical code PROMOTED to experiments/lift-harness (commit da0cc83a); this dir keeps run records only.
