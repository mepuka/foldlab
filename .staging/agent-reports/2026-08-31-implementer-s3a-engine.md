# S3a — the trunk engine, implementer report

- Role: IMPLEMENTER, Lane C engine half (S3a), package `experiments/workbench`.
- Contract: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md` (read whole,
  1171 lines). The packet is the law; the battery and the packet are read-only
  to this session (`implement` SKILL.md §Phase I).
- Rulings binding after the packet was written: decision 42 (`docs/SPECS.md`
  §42 b/c) closes OPEN-1 and OPEN-2.
- Date: 2026-08-31.

STATUS: IN PROGRESS — spike PASSED (§1 below); engine modules next.

---

## 1. THE SPIKE (TP-9 / TRUNK-PLAN §1) — VERDICT: **PASS**

Measured in a live browser, not reasoned from type lists. Chrome
152.0.7977.64 (headless), driven over CDP (`browser-harness-js`), against
the workbench's own vite dev server (`bun run dev`, vite 8.2.2) serving a
scratch view at `/spike/index.html` — 16 `createLazy` column groups ×
125 `<rect>` = **2,000 rects** under ONE `<g id="camera" transform>`
inside one `<svg>`, driven through a real `Runtime.makeApplication` loop
(foldkit 0.154.0). The scratch view is deleted before the gates run; it
is not part of S3a's deliverable.

### 1.1 Namespace — PASS

```
svgCtor      SVGSVGElement     svgNs     http://www.w3.org/2000/svg
cameraCtor   SVGGElement       cameraNs  http://www.w3.org/2000/svg
groupCtor    SVGGElement       rectCtor  SVGRectElement
rectCount    2000
allSVGRect   true      anyUnknown (HTMLUnknownElement)  false
sampleBox    { w: 12, h: 12 }  paintedNonZero  true
cameraCTM    [1,0,0,1,0,1915]  (the <g transform> applies)
```

Every one of the 2,000 rects is an `SVGRectElement` in the SVG namespace;
none is an `HTMLUnknownElement`. Mechanism, for the record: foldkit's
`buildElement` (`dist/html/index.js:1392`) calls snabbdom's `h`, which
calls `addNS` when the selector is exactly `svg`
(`dist/snabbdom/h.js:132`), propagating `data.ns` down the child list at
construction time; snabbdom's `createElm` then takes the
`api.createElementNS` branch (`dist/snabbdom/init.js:141`). The
propagation walks memoized children too, so a `createLazy` group inside
an `<svg>` keeps its namespace across cache hits — confirmed by the
counters below, not only by reading.

Bonus for TP-22 (the browser owns hit-testing on SVG):
`document.elementFromPoint` over a rect returns that exact node —
`hitTag "rect"`, `hitCtor "SVGRectElement"`, `hitIsTheRect true`.

### 1.2 Memoization — PASS

One column's snapshot replaced (`columns.map`, column 3 only, every other
column object left `===`), dispatched as a real Message through
`update`:

```
rendersBefore      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
rendersAfter       [1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1]
columnsReRendered  [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0]
sameUntouchedGroupNode  true     sameUntouchedRectNode  true
untouchedRectStillConnected true
touchedRectCount   126   untouchedRectCount 125   totalRects 2001
```

Two independent instruments agree: the per-column render counter (the
view body ran once, for column 3 only) and DOM node identity (the
untouched column's `<g>` and its first `<rect>` are the SAME objects
after the patch, still connected). After 21 bumps the counters read
`[1,1,1,22,1,…,1]` — fifteen columns never re-rendered at all.

**The camera-once trick pays.** Changing only the outer
`<g transform="… scale(1/dpr)">` (the dpr flip) re-rendered ZERO columns
(`reRendered` all 0) and cost View 0.5 ms / Patch 0.3 ms. A DPR change is
therefore a camera edit, not a re-layout of 2,000 nodes — which is what
makes L-P9's `dpr` terminator affordable in S3b.

### 1.3 Frame cost — PASS (well inside RAIL's ~10 ms)

Instrumented through foldkit's own slow hooks (`slow.onSlow`, thresholds
forced to 0 so every phase reports), `deviceScaleFactor` flipped with
CDP `Emulation.setDeviceMetricsOverride`.

| what | DPR 1 | DPR 2 |
|---|---|---|
| mount, 2,000 rects created | View 4.6 ms · Patch 7.7 ms | View 2.7 ms · Patch 7.8 ms |
| one-column re-render (work) | Update 0.1 · View 0.3 · Patch 0.5 ms | 0.86 ms total per bump (10-bump mean) |
| camera-only change (dpr flip) | Update 1.7 · View 0.5 · Patch 0.3 ms | — |
| wall clock click → 2 rAF | 33 ms (frame scheduling, not work) | 33 ms |

Mount is ~12 ms of work for 2,000 rects and is a once-per-epoch cost;
steady-state growth is **under 1 ms per fold**. The wall-clock 33 ms is
two 60 Hz frames of waiting, not CPU.

### 1.4 What the spike settles

- CV-3′'s SVG path stands: **no Canvas2D-via-Mount fallback is needed for
  v1 scale.** S3b renders SVG in foldkit's vdom.
- The `(count, tailRevision)` memo key (TP-10) is worth what it claims:
  15/16 columns skip both VNode construction and diffing on every fold.
- The virtualization law (L-P7) is not load-bearing at 2,000 rects — it
  is load-bearing at 10⁵, which is why the engine implements it anyway.

Screenshot at DPR 2 (`spike-dpr2.png`, beside this report): sixteen columns of
12 px marks on a 15 px pitch growing upward from a common baseline, the
bumped column standing ten marks proud of its neighbours — the trunk's
actual shape, rendered.

---

## 2. THE ENGINE (completed by the coordinator — takeover 2026-08-31)

The implementer lane was PAUSED by operator order mid-flight
("pause s3 and take over development"); the coordinator took the
implementer seat, reviewed the four modules the lane had written, and
carried the battery to green. The lane's own work stands almost
whole — the four modules below are the lane's, reviewed line by line:

- `src/trunk/model.ts` — lanes/classifier/carrier vocabulary. LANES in
  ruled order, classifier DERIVED from the generated registry (CR-42),
  `kindName` copied from `bin/cli/history.ts` (N9), the pinned tint
  ladder with its NaN-refusing domain step, Column with DERIVED
  `tailRevision`, Model as a Schema for S3b's Runtime.
- `src/trunk/fold.ts` — `decodeHistory` (fail-closed door through S0's
  mirror; R3 order, R4 addresses at the document boundary per decision
  42 OPEN-2), `foldPage` (seq guard + per-lane high-water; truncation
  REFUSED AND SURFACED per OPEN-1; untouched lanes keep snapshots by
  reference), `foldDocument` (the S3b seam), `concatPages`.
- `src/trunk/placement.ts` — Doi (the frozen partition), `cutDoi` the
  only producer, `placementOf` with exactly-once cover by construction
  and the carrier clamp (L-C5: no Square without its address).
- `src/trunk/place.ts` — document-space `rowBandCss` anchored at the
  baseline (negative-zero footnote included), edge-snapped affine map
  to device integers, `isDisjoint` decision procedure, the seven epoch
  terminators including `carrier`, `canonicalRects` in the pinned
  byte format.

## 3. THE ADJUDICATION — three battery defects, all breaker-side

At takeover the battery stood 84/87. All three failures were
UNSATISFIABLE cases — no conforming implementation could pass them —
adjudicated by the coordinator and recorded as packet §10 (A-1..A-3),
TRUNK-PLAN §6 (corrections ledger), and a new step 6 in the implement
skill's breaker loop (the satisfiability probe, vacuity's dual):

- A-1 `Doi.window` (frozen §0) vs L-P8's own substring scan of
  `placement.ts`. Renamed `span`; the scan keeps full strength.
- A-2 L-P7 asserted `ops.length > 9000`; CI-2's equation caps a
  conforming placement at 16·513 = 8208 ops at ANY lane spread. Now
  the coverage equation (`opTotal = 20 000`) plus the exact carrier
  arithmetic (`ops.length = LANES.length · (K_CARRIER + 1)`).
- A-3 L-P1-growth grew 10 → 5010 then demanded rows 0..9 stay
  individuated; CI-2 evicts their addresses. Now 10 → 410 (inside
  the carrier); beyond it is L-P9 `carrier` + CI-2's territory.

The battery's own L-C5 cases stated the carrier boundary correctly
throughout — the defects were sibling-inconsistency, which is why the
new breaker step names sibling-case consistency explicitly.

## 4. VERDICT

- Battery: **87/87 green** (9 files), zero cases weakened — two
  re-aimed at satisfiable statements of the same laws, one field
  renamed.
- Gates: `check:workbench` GREEN (vitest + tsc + oxlint + vite build);
  `check:cas` and `check:effects:ts` GREEN alongside.
- Spike (§1): PASS, page-measured. S3b renders SVG in foldkit's vdom
  per CV-3′; no Canvas2D-via-Mount fallback needed at v1 scale.
- Decision 42 discharge: OPEN-1 refuse-and-surface in `foldPage`
  (battery: fold.test.ts truncation cases); OPEN-2 document-boundary
  addresses in `decodeHistory` (battery: malformed-page cases).
- Disputes: none left open — the three battery defects were
  adjudicated (packet §10) rather than worked around, and every
  amendment carries its provenance comment in the file.

Evidence images, beside this report ON DISK (the staging ignore rule
keeps non-md untracked, so they are Mac-local): `spike-dpr2.png` (the
2,000-rect spike at DPR 2) and `engine-smoke.png` (the engine's OWN
render of the 220-receipt fixture in live Chrome — "Live · mark 220 ·
220 receipts · 159 ops · 135 rects · dpr 2": sixteen lanes off a
common baseline, strips carrying the deep lanes, culling active).
