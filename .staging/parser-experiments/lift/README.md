# lift — Effect TypeScript → store-language linear operations (v0)

The full-circle mapper (session 2026-08-28): a compiler-API
implementation of the recognition proposal's v0 rules — Rule 1
(program-decl), 3 (const-yield-put), 4 (node-literal), 5 (answer-ref,
emitted as INDEX — names die at the boundary), 6 (return-word),
9 (partition) — plus the refusal-only classifiers and the spectrum
rollup. Hoover-side evidence under the direction law: it parses and
classifies, and mints no fixture, word, or identity.

```sh
bun lift/lift.ts --g0     # generated fixtures: recognition must be total
bun lift/lift.ts --wild   # corpus sweep -> wild-linearizability.json
```

## Results

**G0 (by construction): 9/9 PROG-DECL declarations lift, 0 spurious
lifts on the other 256 fixtures.** A lifted document is the linear
instruction sequence — `{index, version, tag, payloadHex, refs:
[{source: index, expectedTag}]}` — plus the word projection.

**Wild (30 repos, 6,908 gen-spine candidate declarations): 0 lift
outright** — expected, since v0's whitelist IS the estate's put-only
straight-line register. The deliverable is the refusal histogram:

| code | n | reading |
|---|---|---|
| E-PARAM-SHAPE | 2,321 | mostly zero-param `() => Effect.gen(…)` thunks — the cheapest B-pack admission there is |
| E-SPINE-ESCAPE | 2,085 | pipe/block bodies |
| E-YIELD-POSITION | 1,280 | largely `yield* ServiceTag` — the R-SVC register knocking |
| E-BIND-SHAPE | 353 | destructured binders (applicative-gap; the B-plumb target) |
| E-STMT-SHAPE | 349 · E-OP-RECEIVER 269 · E-OP-UNKNOWN 96 | body shapes outside the whitelist |
| E-BRANCH 65 · E-LOOP 10 · E-HANDLER 5 | genuine control flow — RARE |

Spectrum rollup: classification 3,110 · monadic 3,445 ·
applicative-gap 353.

## Honest caveats

- Partition refuses at the FIRST offending statement (Rule 9
  fail-closed), so the histogram measures each body's first blocker,
  not all blockers; E-PARAM-SHAPE fires before body inspection and
  masks body classes behind it.
- Rule 7 hex pinning is not enforced (no in-file helper in fixtures);
  every lift carries `helperUnpinned: true`.
- E-BRANCH arms are not attempted, so no refusal lands in `selective`.
- These counts are raw tallies, not the composer-brief's promised
  per-stratum CIs — that upgrade runs through the admitted
  composer/wink-statistics harness.

## What the histogram already argues

The top three buckets (81% of refusals) are SHAPE gaps, not semantic
ones: zero-param thunks, pipe spines, and service-accessor yields.
Branches, loops, and handlers — the constructs that genuinely resist
linearization — are under 1.2% of candidates. The wild register is far
more linearizable than the refusal-total suggests; it is mostly waiting
on B-pack rules, not on new semantics. Rule proposals stay
ratification-gated (word gate; nothing here mints manifest rules).

> SUPERSEDED 2026-08-28: canonical code PROMOTED to experiments/lift-harness (commit da0cc83a); this dir keeps run records only.
