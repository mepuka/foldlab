# GEOMETRY — the trunk's layout algebra and the derivation programme

Status: **STAGED UI/APP DIRECTION — pre-grade**. Written 2026-08-30 on
operator order ("should we start with geometry… I'm sure there's a
whole world of prior art"), beside [SPEC.md](SPEC.md) and
[COLUMNS.md](COLUMNS.md). Everything below is derivable machinery over
the landed column algebra (`Cas/IR/Column.lean`); prior-art rows are
model-knowledge survey, every one `pin: PENDING`. No gate stamps.

## Two layout regimes — the algebra before the aesthetics

The column laws already decide most of the geometry. A layout assigns
each block a rectangle; the only real choice is what the sizes depend
on.

**Regime A — absolute.** Block size fixed. Then layout is a monotone
FOLD over each column: `position(i) = Σ sizes before i`, and
`column_append` lifts to a layout law — `layout(w ++ v)` EXTENDS
`layout(w)`; positions, once assigned, never change. Rendering is
append-at-tip; overflow scrolls. This is the "everything the same
relative size" option, and it inherits every stability virtue for
free. Theorem-shaped and cheap to state over the landed algebra if
ever wanted.

**Regime B — normalized.** Viewport fixed; sizes are a function of the
column counts AT A CUT. Layout is a pure function of the cut, stable
between cuts; the ONLY motion is the cut transition. "Dynamic
columns" is then a cadence-and-easing choice, never continuous
reflow.

**The shared law (the UI face of "order is a ruling, not a live
statistic"): motion happens only at named cuts.** Continuous reflow is
refused in both regimes.

## Elision and compression as formulas, not vibes

- **Degree of interest** (Furnas): `DOI(block) = API(block) −
  dist(block, focus)`. Trunk defaults: a-priori interest = recency
  (the tip is where change happens — and ONLY the tip changes, by
  `column_append`); focus = the user's selection. Blocks under
  threshold render aggregated (the density strip); above, as squares.
  One formula, two knobs — "aggregate the old, individuate the tip"
  mechanized.
- **Recency compression, closed form**: block height `h(rank) = h₀ ·
  r^rank` bounds every column's total height by `h₀/(1−r)` — infinite
  history in finite space, tip at full size, `r` the single
  "dynamism" knob. The linear alternative is Table Lens (rows
  compress to pixels, focus expands).
- **Perception check on the squares**: encoding magnitude by AREA is
  the weakest channel (Stevens' power law, exponent ≈ 0.7;
  Cleveland–McGill rank position ≫ length ≫ area). The sketch dodges
  this entirely: a square is a PRESENCE mark — one block, one
  admission — so counts are read by POSITION, the most accurate
  channel. The trunk as drawn is already perceptually near-optimal;
  keep squares uniform, never magnitude-scaled.

## The studies, mechanized — replay is the laboratory

The word IS the record, so every study the operator imagined runs
without a user in the loop:

1. **Rate sweep**: replay recorded words with scaled inter-arrival
   times (the receipt plane's `at` deltas) against each policy
   (A; B × cut cadence; `r` sweep). Measure mechanically: total pixel
   displacement (the "wiggle" objective of the streamgraph
   literature), tip visibility, label density.
2. **Cut cadence vs stability**: same word, cadences from per-append
   to per-minute; displacement and staleness curves.
3. **Burst behavior**: a blob ingest (the `chunk` column's regime)
   under each policy — the stress case the speed-class ordering
   predicts.

Deterministic, replayable, evidence-graded — layout policies become
rows in an evidence table before any taste is spent.

## Prior art (survey; every row `pin: PENDING`)

| work | what it is | what the trunk takes |
|---|---|---|
| Draco (Moritz et al.) | visualization design knowledge as ASP constraints; SOLVES for a spec | the flagship: mechanical view specification, logic-programming-shaped — harmonizes with the datalog direction (rules checking view specs) |
| Vega-Lite (Satyanarayan/Heer) | a view ALGEBRA (layer/facet/concat/repeat) over a grammar of graphics; reactive dataflow | the spec target shape — the trunk is a faceted unit-mark spec; reactive dataflow = our incremental render |
| Wilkinson, Grammar of Graphics | the original algebraic decomposition of charts | vocabulary discipline: data → mark → channel, kept separate |
| Bertin, Semiology of Graphics | visual variables + their levels (selective/ordered/quantitative) | the channel-assignment law for ornamentation: which store observation may ride which variable |
| Cleveland & McGill | measured channel-accuracy ranking | position ≫ length ≫ angle ≫ area — why squares stay presence marks |
| Byron & Wattenberg, stacked graphs | geometry + aesthetics for streaming layouts; wiggle minimization | the displacement objective for the rate studies |
| Heer & Robertson, animated transitions | object constancy under change | cut-transition easing rules |
| Few / Heer & al., horizon graphs ("Sizing the Horizon") | the chart-height-vs-accuracy study | the literature's answer to "when should I resize" |
| Furnas, generalized fisheye / DOI | elision as a formula | the aggregate-vs-individuate policy |
| Rao & Card, Table Lens | compact rows + focal expansion | the tall-column fallback when compression beats aggregation |
| Shneiderman treemaps; Bruls squarified; Sondag et al. STABLE treemaps | space-filling layout, aspect-ratio and STABILITY objectives | the stability-under-update objective, formalized by others already |
| Cassowary (Badros/Borning; AutoLayout) | incremental linear-constraint layout solving | if layout ever needs constraints, the solver family with incremental resolves |

## The mechanical view spec

A trunk view is six data fields, no code: **(classifier, order
ruling, regime, cut cadence, DOI parameters, channel assignment)**.
The emitted TS consumes it; the naming inventory labels it; a
Draco-style constraint pass can later CHECK a spec against the
perceptual rules above — rules checking rules, on the same engine the
store→app API direction already wants.

## Ruling asks

- **G1** default regime: recommend A (absolute, scrolling) for the
  tier-1 read-only trunk; B behind a toggle.
- **G2** default cut cadence for B (a number, ruled at a cut).
- **G3** Draco-style constraint checking: admit as a later research
  lane (tool admission + pins) or defer.
- **G4** the replay-driven layout studies: commission as a lane (the
  measurement code is small; the words already exist) or defer until
  the trunk renders.
