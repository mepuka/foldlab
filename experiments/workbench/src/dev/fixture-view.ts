/**
 * DEV-ONLY — the fixture viewer's pure half. NOT the contracted app.
 *
 * Breaker-built harness territory (S3b packet §6, operator order
 * 2026-08-31), like `src/trunk/fixtures/harness.ts`: a developer opens
 * `/dev/index.html` under `bun run dev` and SEES the trunk render the
 * real 220-receipt fixture without a daemon. Everything visible is the
 * LANDED ENGINE's own answer:
 *
 *   fixture bytes → decodeHistory (S0's generated mirror — the ONE
 *   decode path; this module never parses the wire with a second
 *   schema) → foldDocument → cutDoi → placementOf → place → rects.
 *
 * FRESHNESS RULES (enforced mechanically):
 *   1. `src/trunk/fixtures/conformance.test.ts` — the fixture decodes
 *      through the generated `wordHistorySchema` (green gate, S3a).
 *   2. `src/dev/fixture-view.test.ts` — THE DEV-FIXTURE FRESHNESS
 *      GATE: this module's scene folds the fixture through the engine
 *      door to the known totals, disjoint, all five tints. Runs in
 *      `check:workbench`.
 *   3. The generated mirrors under `src/generated/` are OUTPUTS of
 *      `mise run gen:backend-word` and `mise run gen:grammar-manifest`
 *      — regenerate there, never edit; a drift reds gates 1–2.
 */
import fixtureBytes from "../trunk/fixtures/word-history.fixture.json?raw"
import { decodeHistory, foldDocument } from "../trunk/fold.ts"
import {
  LANES,
  WINDOW,
  emptyModel,
  laneIndex,
  tintIndex,
  totalCount,
  type Model,
} from "../trunk/model.ts"
import { cutDoi, placementOf, type Doi, type Placement } from "../trunk/placement.ts"
import {
  GEOMETRY,
  canonicalRects,
  columnOriginCss,
  place,
  type Rect,
  type Viewport,
} from "../trunk/place.ts"

export interface DevLabel {
  readonly col: number
  readonly name: string
  readonly xCss: number
}

export interface DevScene {
  readonly trunk: Model
  readonly doi: Doi
  readonly placement: Placement
  readonly viewport: Viewport
  readonly dpr: number
  readonly rects: ReadonlyArray<Rect>
  readonly canonical: string
  readonly labels: ReadonlyArray<DevLabel>
  readonly face: string
  readonly unregisteredCount: number
}

/** The tint step of a rect, for the dev page's fill classes: the
 * engine's pinned index for a Square, -1 for a Strip. */
export const tintOf = (rect: Rect): number =>
  rect.of._tag === "Square" ? tintIndex(rect.of.address) : -1

export const isResidue = (rect: Rect): boolean => rect.of.col === laneIndex("unregistered")

/**
 * The whole fixture, through the engine pipeline, at one device pixel
 * ratio. The viewport covers the full document so the page scrolls
 * natively; culling still runs (and culls nothing, by construction).
 * A fixture or mirror drift makes this THROW, which is what the
 * freshness gate asserts against.
 */
export const devScene = (dpr: number): DevScene => {
  const decoded = decodeHistory(JSON.parse(fixtureBytes))
  if (decoded._tag === "Malformed") {
    throw new Error(`the fixture no longer passes the engine door: ${decoded.reason}`)
  }
  const trunk = foldDocument(emptyModel, decoded.history)
  if (trunk.status._tag !== "Live") {
    throw new Error(`the fixture no longer folds Live: ${trunk.status._tag}`)
  }
  const doi = cutDoi(trunk, WINDOW)
  const tallest = trunk.columns.reduce((max, column) => Math.max(max, column.count), 0)
  const heightCss = tallest * GEOMETRY.pitchCss + 2 * GEOMETRY.gutterClassCss
  const viewport: Viewport = {
    widthCss: GEOMETRY.canvasWidthCss,
    heightCss,
    originYCss: -heightCss,
  }
  const placement = placementOf(trunk, doi)
  const rects = place(placement, viewport, dpr)
  const unregisteredCount = trunk.columns[laneIndex("unregistered")]?.count ?? 0
  return {
    trunk,
    doi,
    placement,
    viewport,
    dpr,
    rects,
    canonical: canonicalRects(rects, viewport, dpr),
    labels: LANES.map((name, col) => ({ col, name, xCss: columnOriginCss(col) })),
    face:
      `${String(totalCount(trunk))} admissions · mark ${String(trunk.mark)}` +
      ` · ${String(rects.length)} rects · dpr ${String(dpr)}` +
      ` · fixture (no store minted this file — engine-only witness)`,
    unregisteredCount,
  }
}
