/**
 * THE ONE FUNCTION WHERE PIXELS ARE BORN.
 *
 * Contract: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md` §0/§1.
 * Laws discharged here: L-M5 (the ruled lane order lays out to 507 css
 * px), L-C6 (full-pitch strips), L-P1 (position immutability in DOCUMENT
 * space), L-P2 (device integrality), L-P3 (edge snapping, not size
 * snapping), L-P4 (disjointness as a decision procedure), L-P5
 * (determinism, byte-gated), L-P6 (uniform marks), L-P7
 * (virtualization), L-P8 (browserless: DPR and the viewport ARRIVE as
 * arguments — this module reaches for no browser global), L-P9 (epoch
 * terminators).
 *
 * Document space is anchored at the BASELINE (y = 0) and grows NEGATIVE
 * upward, so a mark's band is a function of (col, row) alone, for life.
 * Device space scrolls; the document does not.
 */
import { CLASS_STARTS, LANES, laneIndex, tintIndex, type Model } from "./model.ts"
import { covered, startRow, type Doi, type Op, type Placement } from "./placement.ts"

interface Geometry {
  readonly squareCss: 12
  readonly gapCss: 3
  readonly pitchCss: 15
  readonly laneCss: 12
  readonly gutterIntraCss: 15
  readonly gutterClassCss: 30
  readonly gutterUnregisteredCss: 45
  readonly canvasWidthCss: 507
}

/** Aesthetics §1.5: 16·12 + 10·15 + 4·30 + 45 = 507, which fits the
 * ruled --measure of 62ch. */
export const GEOMETRY: Geometry = {
  squareCss: 12,
  gapCss: 3,
  pitchCss: 15,
  laneCss: 12,
  gutterIntraCss: 15,
  gutterClassCss: 30,
  gutterUnregisteredCss: 45,
  canvasWidthCss: 507,
}

/** Perfetto's `virtual_canvas.ts`, attributed: the band drawn beyond the
 * viewport, and the drift that ends an epoch. Two thresholds, because a
 * single one thrashes. */
export const OVERDRAW_CSS = 300
export const DRIFT_CSS = 200

/** TP-13: the four device pixel ratios the goldens are taken at. */
export const GOLDEN_DPRS: readonly [1, 1.5, 2, 3] = [1, 1.5, 2, 3]

export interface Viewport {
  readonly widthCss: number
  readonly heightCss: number
  /** Document y of the viewport's TOP edge. */
  readonly originYCss: number
}

/** DEVICE pixels, integers, all four fields — the representation that
 * makes the laws decidable without float equality (packet FLAG-5). */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly of: Op
}

const RESIDUE = laneIndex("unregistered")

/** The gutter to the LEFT of a lane: the residue lane takes the widest,
 * a class boundary the middle one, everything else the intra gutter. */
const gutterBefore = (col: number): number => {
  if (col === RESIDUE) return GEOMETRY.gutterUnregisteredCss
  return CLASS_STARTS.includes(col) ? GEOMETRY.gutterClassCss : GEOMETRY.gutterIntraCss
}

const ORIGINS: ReadonlyArray<number> = LANES.map((_lane, col) => col).reduce<Array<number>>(
  (origins, col) => {
    const previous = origins[col - 1]
    origins.push(previous === undefined ? 0 : previous + GEOMETRY.laneCss + gutterBefore(col))
    return origins
  },
  [],
)

export const columnOriginCss = (col: number): number => ORIGINS[col] ?? 0

/** A row's document band, a function of the row ALONE — no model, no
 * count, no viewport, no dpr. This is what buys the extension law. */
export const rowBandCss = (row: number): { readonly topCss: number; readonly bottomCss: number } => ({
  // Written as a subtraction FROM the baseline, not as a negated
  // product: `-0 * 15` is negative zero, which is a different value from
  // the baseline under structural equality even though it prints the
  // same. Row 0's bottom edge IS the baseline, exactly.
  topCss: 0 - row * GEOMETRY.pitchCss - GEOMETRY.squareCss,
  bottomCss: 0 - row * GEOMETRY.pitchCss,
})

const bandOf = (op: Op): { readonly topCss: number; readonly bottomCss: number } => ({
  topCss: rowBandCss(startRow(op) + covered(op) - 1).topCss,
  bottomCss: rowBandCss(startRow(op)).bottomCss,
})

/**
 * The affine map into device space, snapped at the EDGES and never at
 * the size: `round(bottom·dpr) - round(top·dpr)` is a different function
 * from `round((bottom - top)·dpr)`, and at dpr 1.5 the second one puts a
 * two-row strip one device pixel BELOW the baseline.
 *
 * Culling is a FILTER over the same arithmetic (L-P7): a rect present at
 * one viewport is byte-identical at any viewport containing it, up to
 * the frame's own whole-pixel translation.
 */
export const place = (
  placement: Placement,
  viewport: Viewport,
  dpr: number,
): ReadonlyArray<Rect> => {
  const visibleTopCss = viewport.originYCss - OVERDRAW_CSS
  const visibleBottomCss = viewport.originYCss + viewport.heightCss + OVERDRAW_CSS
  const xdev = (xCss: number): number => Math.round(xCss * dpr)
  const ydev = (yCss: number): number => Math.round((yCss - viewport.originYCss) * dpr)

  const rects: Array<Rect> = []
  for (const op of placement.ops) {
    const band = bandOf(op)
    if (band.bottomCss < visibleTopCss || band.topCss > visibleBottomCss) continue
    const originCss = columnOriginCss(op.col)
    const x = xdev(originCss)
    const y = ydev(band.topCss)
    rects.push({
      x,
      y,
      w: xdev(originCss + GEOMETRY.laneCss) - x,
      h: ydev(band.bottomCss) - y,
      of: op,
    })
  }
  return rects
}

/**
 * The decidable checker (CR-13/CR-14). Integer-snapped disjoint fills
 * are what BUYS paint-order irrelevance; the premise is never assumed,
 * it is run. Abutting is not overlapping.
 */
export const isDisjoint = (rects: ReadonlyArray<Rect>): boolean => {
  const sorted = rects.toSorted((a, b) => a.x - b.x || a.y - b.y)
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i]
    if (a === undefined) continue
    for (let j = i + 1; j < sorted.length; j += 1) {
      const b = sorted[j]
      if (b === undefined) continue
      if (b.x >= a.x + a.w) break
      if (a.x < b.x + b.w && a.y < b.y + b.h && b.y < a.y + a.h) return false
    }
  }
  return true
}

/** Everything a held placement is only valid under. */
export interface Epoch {
  readonly viewport: Viewport
  readonly dpr: number
  readonly theme: string
  readonly classifierRevision: number
  readonly doi: Doi
}

export type Terminator =
  | "resize"
  | "dpr"
  | "scroll-drift"
  | "theme"
  | "classifier"
  | "cut"
  | "carrier"

const sameFloor = (before: Doi, after: Doi): boolean =>
  before.floor.length === after.floor.length &&
  before.floor.every((value, col) => value === after.floor[col])

/** The extension law's own limit: a column that has outgrown its carrier
 * forces its floor up, so a placement held from before that moment no
 * longer extends. */
const carrierExhausted = (doi: Doi, model: Model): boolean =>
  model.columns.some(
    (column, col) => column.count - (doi.floor[col] ?? 0) > column.tail.length,
  )

/**
 * The enumerated epoch terminators — CANVAS §4's list minus the four
 * canvas-only ones CV-3′ deletes, plus `carrier`. `terminators(e, e, m)`
 * is empty, and L-C4's premise is exactly that emptiness.
 */
export const terminators = (
  before: Epoch,
  after: Epoch,
  model: Model,
): ReadonlyArray<Terminator> => {
  const out: Array<Terminator> = []
  if (
    before.viewport.widthCss !== after.viewport.widthCss ||
    before.viewport.heightCss !== after.viewport.heightCss
  ) {
    out.push("resize")
  }
  if (before.dpr !== after.dpr) out.push("dpr")
  if (Math.abs(after.viewport.originYCss - before.viewport.originYCss) >= DRIFT_CSS) {
    out.push("scroll-drift")
  }
  if (before.theme !== after.theme) out.push("theme")
  if (before.classifierRevision !== after.classifierRevision) out.push("classifier")
  if (!sameFloor(before.doi, after.doi)) out.push("cut")
  if (carrierExhausted(after.doi, model)) out.push("carrier")
  return out
}

const lineOf = (rect: Rect): string => {
  const head = `${String(rect.x)} ${String(rect.y)} ${String(rect.w)} ${String(rect.h)}`
  return rect.of._tag === "Square"
    ? `S ${head} ${rect.of.address} ${String(tintIndex(rect.of.address))}\n`
    : `T ${head} ${String(rect.of.fromRow)} ${String(rect.of.count)}\n`
}

/**
 * The engine's byte gate, and the numbers S3b's SVG goldens must
 * reproduce verbatim. Integers only, single ASCII spaces, LF only, and
 * the file ends with LF — no float formatting enters the bytes.
 */
export const canonicalRects = (
  rects: ReadonlyArray<Rect>,
  viewport: Viewport,
  dpr: number,
): string => {
  const header =
    `# dpr=${String(dpr)} vw=${String(viewport.widthCss)} vh=${String(viewport.heightCss)}` +
    ` oy=${String(viewport.originYCss)} n=${String(rects.length)}\n`
  return header + rects.map((rect) => lineOf(rect)).join("")
}
