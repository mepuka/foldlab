# CANVAS — the rendering pipeline derived from the algebra (v2)

Status: **STAGED DERIVATION — pre-grade, REVISED 2026-08-31** under
the adversarial review
([../agent-reports/2026-08-31-canvas-review.md](../agent-reports/2026-08-31-canvas-review.md),
42 findings, CR-1..42 cited below). v1's rulings CV-1..4 stand AS
RESTRUCTURED here (the reviewer's own verdict: the shapes survive;
the strengths were wrong). Foldkit chassis ruled and unchanged.

## 1. The observation that survives

Rendering is a **word-to-word homomorphism**: the store word folds
into column state, the state lays out into a described value, and
handlers interpret it. What the review corrected is WHERE the pixel
world begins and WHICH laws are monotone (CR-40: the paint hom is
free; its commutativity is bought by a stated disjointness premise,
never assumed).

```
Word ──columnBy/Query──▶ Folds ──layoutAt(cut)──▶ Placement ──place──▶ Rect[] ──▶ painter (Canvas2D)
      (landed homs)       (bounded carrier §3)    (index space,        (device     ├──▶ SVG register
                                                   the monoid)          pixels)    └──▶ hit (pure)
```

## 2. The two-space split (CR-11, CR-12, CR-24)

- **`Placement` — index space, the algebra's object.** A closed
  rects-only op union: `Square {col, row, address}` ·
  `Strip {col, fromRow, count}`. NO `Label` (CR-16 — labels are DOM;
  a text op would destroy handler agreement on font metrics), NO
  `Cursor` (CR-15 — the cursor moves; it is an overlay, DOM or a
  second transparent canvas), NO pixel fields. `col` is DERIVED from
  the receipt's tag under the sorts classifier (CR-42 — one
  authority). The MEASURE is per-column COUNTS — the landed
  `View.height`, `Nat` under `+` — never pixel heights (CR-11).
- **`place : Placement × Viewport × DPR → Rect[]` — the ONE
  function where pixels are born.** Both handlers and `hit` consume
  its output; the agreement gate compares its rect lists (CR-24), so
  the painter cannot diverge from the SVG register without changing
  `place`. Snapping discipline (CR-25/CR-26): FILL only, never
  stroke; 1-device-pixel gutters; every coordinate rounded to
  integer DEVICE pixels (round after any regime-B scale, in device
  space); `shape-rendering="crispEdges"` on the SVG as a hint only.
  Integer-snapped disjoint fills = pixel-disjointness (CR-14), which
  is the stated premise under paint-order irrelevance (CR-13 —
  `Placement.Disjoint` is a predicate with a decidable checker, the
  `Store.Compatible` move one level up).

## 3. The carrier — bounded by construction (CR-27, CR-28)

The trunk's fold is `View.prod (View.height t) (View.lastK t k)` per
column: the count (row indices, strip extents) plus the last `k`
receipts (addresses for the individuated window). A receipt already
carries everything a Square needs (`LogEntry`: address/at/seq/size/
tag — rows-first holds, no loads). Cost at 10⁷ across 15 columns,
k≈512: ~1 MB, versus ~1.5–2 GB for the whole-word carrier.
**`Word.View.lastK` is the one new Lean inhabitant this design
needs** — a genuine `View` instance (`merge a b = lastK k (a ++ b)`,
`run_append` by a four-line case split) — a small lane beside
`View.height`.

**The stated price** (CR-29): with a bounded window, a strip's
interior addresses are not held, and individuating one needs a
RANGED read — Q-SEG served (`/history?from&to`) — which v1 does not
have. **v1 ships with unclickable strips and says so on the face**;
the strip's a11y/announce text carries "N admissions, marks a–b".
Cold start pages (`limit` param), and a paged pull leans on PDD-6
law 2 (unproved — recorded, owed) (CR-30).

## 4. The epoch law (CR-1, CR-3, CR-5, CR-6, CR-9 — the review's core)

The estate's patchability law (QUERIES.md §4: patch iff monotone,
else compute at a cut) APPLIES TO LAYOUT — it was ruled and simply
had not been applied here:

- **Between cuts**: uniform squares, frozen DOI partition, fixed
  viewport/DPR/scroll — layout IS monotone, the extension law holds,
  and appending the word paints only new ops (no clear, no diff).
- **At a cut**: the DOI partition recomputes (aggregation is a CUT
  EVENT — the only place recency/focus may act), and the epoch's
  memo is discarded. Motion only at cuts was already law; DOI now
  obeys it too.
- **v1 DOI is pure recency** (`focusWeight = 0`, CR-4): the
  individuated window is the last-k tail; the spec's `doi.r`
  geometric compression is DROPPED from v1 (CR-10: it buys ~2.5×
  resolvable blocks and costs integer heights, crispness, hit
  injectivity, and the extension law — a bad trade; threshold-k
  aggregation gives the bound that was actually load-bearing).

**Epoch terminators, enumerated** (each ⇒ total repaint from the
Placement, one code path): viewport/element resize · DPR change
(zoom, display move — media-query re-armed) · scroll (the canvas is
a VIEWPORT over document space, virtualized — browser caps make one
eternal canvas impossible: Chromium 65,535 px dimension / 268 MP
area, silently blank past it; setting width/height clears the
bitmap by spec, so the bitmap stays viewport-fixed) · context
loss/restore (Safari cannot notify — poll `isContextLost()`) · tab
restore · DOI cut · theme change · HMR/time-travel (foldkit
preserves the Model; a module-level accumulator dies silently — the
painter is a TOTAL function of the Placement; `paintedUpTo` is a
memo keyed `(epoch, count)`) · classifier/filter change.
**"Positions never move" is a DOCUMENT-space law; device space
scrolls** (CR-5).

## 5. Handlers, agreement, and the four-jobs artifact (CR-23, CR-31, CR-38)

- **Agreement is GEOMETRIC, never raster**: no spec guarantees pixel
  identity between rasterizers (or across machines); the gate
  compares `place`'s rect lists. CV-2 stands, weakened and
  strengthened at once (the shared `place` makes the gate real).
- **The SVG register is the canvas's FALLBACK CONTENT — one
  artifact, four jobs**: the golden-byte gate for the layout laws;
  the SSR face (server emits `<canvas>` with the SVG inside — same
  tree both sides, no hydration mismatch, pre-JS page shows the
  real trunk); the a11y answer (WHATWG REQUIRES fallback conveying
  the canvas's purpose; explicit role + aria-label carrying SPEC's
  N1/N5 face facts — store, device, first mark); and foldkit's own
  test seam (its accessible-locator Scene tests can address the
  trunk at all only through this, CR-32). Individuated window:
  focusable fallback children + `drawFocusIfNeeded`, arrow keys and
  Enter producing the SAME Messages as clicks. Per-receipt focus
  targets: out of scope, stated.
- **Hit-testing**: `Hit = Square addr | Aggregate {col, fromRow,
  count} | Miss` (CR-19 — aggregation makes layout a quotient; the
  section law holds arm-wise, with the ≥1-device-pixel side
  condition, CR-20). The element emits the raw canvas point;
  `update` runs the pure `hit` (CR-22) — foldkit's shipped
  `toCanvasPoint` already solves CSS-pixel and scroll mapping
  (verified), with the CSS contract stated: block display, zero
  border/padding, no transform (CR-21). The platform's own
  `addHitRegion` was REMOVED from the spec — own hit-testing is the
  only option, not a preference (CR-33).

## 6. The foldkit seam, resolved (CR-34, CR-35, CR-36, CR-37, CR-39)

- **Renamed**: the described value is **`Placement`** — `Scene`
  collides with `foldkit/scene`, the framework's own test renderer,
  live in this very repo (CR-35).
- **v1 ADOPTS foldkit's shipped `Canvas.view`** (`foldkit/canvas`:
  Shape union, painter, pointer mapping — the design had not looked,
  CR-34): its full-repaint-per-render contract is exactly the total
  painter the epoch law demands anyway, and v1's live op count is
  bounded (~15·k squares + strips), so full repaint is cheap. Our
  `place` feeds its `Rect` shapes. The epoch-local suffix-painting
  fast path is a LATER optimization with its memo — adopted only if
  profiling demands it, never as the architecture (the review's
  survival #10).
- What gates the painter: the rect-list agreement against `place`
  (browserless) plus one browser smoke; the vitest/SVG story covers
  the register and the laws, not the paint hooks (CR-39, stated
  honestly).
- Face facts and column labels are DOM chrome (CR-41): the N1/N5
  provenance line and `names.json` labels render declaratively
  above/beside the viewport.

## 6b. The design language (companion report)

The visual language lives in
[../agent-reports/2026-08-31-aesthetics-research.md](../agent-reports/2026-08-31-aesthetics-research.md)
(ruling asks A1–A6): ink on paper, no sort hue (fifteen categorical
hues measurably fails CVD and the vendors cap at twelve; identity =
position + direct labels); the one saturated colour spent on the
`unregistered` lane (hue stays reserved for doubt, the ornamentation
law extended not broken); upward growth from a common baseline (the
skyline); the SEDIMENT BAND construction for aggregation — a
fixed-height band at the base into which old history laminates, so
positions never move even under compression (strictly stronger than
the cut-law alone; supersedes §4's strip realization when adopted);
the century-rule hairlines; the address-keyed five-step micro-tint
(deterministic, byte-stable in the SVG register); rotated labels
(forced by arithmetic against the 27 px pitch); the inspector
APPENDING below the canvas, never occluding — the append-only
discipline governing layout; and the keyboard-navigation budget as a
WCAG 2.5.8 conformance requirement, not a courtesy.

## 7. What survived unweakened (the review's own list)

`columnBy`'s hom and incremental DATA story; `View`/`View.prod`
machinery (now load-bearing for the carrier); reading total and
state-free; rows-from-receipts; **squares as uniform presence marks
(the strongest claim in the set)**; Canvas2D as live handler; own
hit-testing; two-handlers-one-value; and append-only painting as an
epoch-local fast path.

## 8. The unbiased pass — synthesis (2026-08-31)

The production-canvas research
([../agent-reports/2026-08-31-production-canvas-research.md](../agent-reports/2026-08-31-production-canvas-research.md);
firewalled from this corpus) lands as follows.

**Independently confirmed** (the world converged where we derived):
the decide/draw split (Tracy's 30× — our `Placement`/`place`, and
foldkit's Model→`ReadonlyArray<Shape>` boundary "sits at the same
place the production systems draw theirs"); one-mark-per-pixel
BEFORE drawing, with Perfetto carrying a `count` through the
collapse "so it stays honest" — our `Strip {count}` verbatim; **"in
an event-log timeline the rendering strategy is mostly a data-access
strategy wearing a costume"** (Perfetto computes LOD in SQLite) —
QUERY-ENGINE's law, discovered independently by the closest domain
in the survey, with `slice_mipmap` the named precedent for a future
LOD registry-entry family; hit-testing by arithmetic; churn-rate
surface splitting (our cursor-overlay ruling generalized); the
parallel a11y tree as the structural cost of canvas (Docs' hidden
SVG-rects-with-aria IS our SVG-register-as-fallback).

**Adopted disciplines** (new, from the survey): two-threshold
virtualization (render generously ~300px overdraw, re-render lazily
~200px drift — a single threshold thrashes); QUANTIZED cut keys
(power-of-two octaves so pan-at-fixed-zoom never re-keys — sharpens
the epoch law); the unnamed tri-invented quality trick — **trade
fidelity for continuity in motion, restore promptly at rest**; the
~10 ms (not 16.7) frame budget; allocation out of hot loops.

**The reopened fork — CV-3 re-litigated.** The middle rung got
deleted in production (VS Code removed its Canvas2D renderer;
xterm.js defaults to DOM; Monaco never left) and the honest rule is:
virtualized DOM/SVG is entirely adequate at viewport-bounded modest
counts — which is exactly what DOI gives us (~10²–10³ individuated
marks). Meanwhile foldkit's own facts: `Canvas.view` has NO DPR
handling and cannot take Mount hooks, is invisible to Scene tests —
while **SVG is a fully-typed peer in the same view**: vdom-diffed,
`createLazy`-memoizable per column, browser hit-testing and the
accessibility tree for free, server-renderable, and visible to
Scene's locators. **Revised recommendation (CV-3′, pending
ruling)**: v1's live handler is SVG in foldkit's vdom — rects under
one `<g transform>` (the camera-once trick), one `createLazy` group
per column (churn split), the golden register and the live view
become THE SAME ARTIFACT (the four-jobs consolidation becomes five:
gate, SSR, a11y, tests, AND the render). Canvas2D/WebGL remains the
SCALE handler of the same `Placement`, admitted later through
`Mount` (foldkit's `map` example is the documented template) when
`slow.onSlow`'s measured frame budgets — not taste — say so. The
two-handlers doctrine makes that a swap, never a rewrite; this is
the doctrine paying for itself.

What v1 thereby DELETES: the custom painter, DPR ownership, context
-loss handling, the separate a11y tree, and the epoch-memo
machinery (vdom diffing + lazy groups carry it) — the epoch law
survives as the law governing CUTS and virtualization windows, not
as hand-built paint bookkeeping.

## Rulings

- **CV-1..4 (2026-08-31)** stand as restructured above.
- **CV-5 (ask)**: adopt v2's five review-driven decisions as one
  batch — the epoch law applied to layout (aggregation at cuts;
  pure-recency v1); Placement/place two-space split with the
  snapping rule; the `lastK` carrier (one small Lean mint) with
  unclickable-strips-v1 stated; rects-only union with SVG-as-
  fallback (one artifact, four jobs); foldkit `Canvas.view` adopted
  for v1 with the suffix fast path deferred.
- **CV-6 (ask, rides the route)**: `/history` gains `limit` now and
  `from`/`to` (Q-SEG) as the strip-click enabler later; the paged
  pull's reliance on PDD-6 law 2 recorded as owed.
