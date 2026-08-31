/**
 * BATTERY — S3a, the trunk engine. Laws L-M5, L-C6, L-P1..L-P9.
 *
 * Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`.
 * Written by the BREAKER before `src/trunk/place.ts` exists; RED by
 * construction. Read-only to the implementer.
 */
import { readFileSync } from "node:fs"
import { expect, test } from "vitest"

import { forAll, loadWhole, syntheticPage } from "./fixtures/harness.ts"
import { foldPage } from "./fold.ts"
import { emptyModel, laneIndex, LANES, WINDOW } from "./model.ts"
import { cutDoi, placementOf, type Op, type Placement } from "./placement.ts"
import {
  columnOriginCss,
  GEOMETRY,
  GOLDEN_DPRS,
  place,
  rowBandCss,
  type Viewport,
} from "./place.ts"

/** The contract's own affine map, restated here so the engine is checked
 * against the packet's arithmetic rather than against itself. */
const xdev = (xCss: number, dpr: number): number => Math.round(xCss * dpr)
const ydev = (yCss: number, view: Viewport, dpr: number): number =>
  Math.round((yCss - view.originYCss) * dpr)

const VIEW: Viewport = { widthCss: 600, heightCss: 800, originYCss: -800 }
const TALL: Viewport = { widthCss: 600, heightCss: 40_000, originYCss: -40_000 }

const fixtureModel = () => foldPage(emptyModel, loadWhole())

const bandOf = (op: Op): { readonly topCss: number; readonly bottomCss: number } => {
  const from = op._tag === "Square" ? op.row : op.fromRow
  const count = op._tag === "Square" ? 1 : op.count
  return { topCss: rowBandCss(from + count - 1).topCss, bottomCss: rowBandCss(from).bottomCss }
}

// ------------------------------------------------------------- L-M5

test("L-M5 the ruled lane order lays out to 507 css px", () => {
  expect(columnOriginCss(0)).toBe(0)
  expect(columnOriginCss(LANES.length - 1) + GEOMETRY.laneCss, "aesthetics §1.5").toBe(507)
  expect(GEOMETRY.canvasWidthCss).toBe(507)

  const gaps = LANES.slice(1).map((_lane, index) => columnOriginCss(index + 1) - columnOriginCss(index))
  for (const gap of gaps) {
    expect([27, 42, 57], `gap ${gap} is one of intra / class / residue`).toContain(gap)
  }
  expect(gaps.filter((gap) => gap === 27), "ten intra gutters").toHaveLength(10)
  expect(gaps.filter((gap) => gap === 42), "four class gutters").toHaveLength(4)
  expect(gaps.filter((gap) => gap === 57), "one residue gutter").toHaveLength(1)
  expect(columnOriginCss(laneIndex("unregistered")) - columnOriginCss(laneIndex("chunk")))
    .toBe(GEOMETRY.laneCss + GEOMETRY.gutterUnregisteredCss)
})

// ------------------------------------------------------------- L-P1

test("L-P1 a row's document band never depends on the word", () => {
  expect(rowBandCss(0)).toStrictEqual({ topCss: -12, bottomCss: 0 })
  expect(rowBandCss(1)).toStrictEqual({ topCss: -27, bottomCss: -15 })
  expect(rowBandCss(29)).toStrictEqual({ topCss: -447, bottomCss: -435 })

  forAll(
    (draw) => draw.int(0, 100_000),
    200,
    (row) => {
      const band = rowBandCss(row)
      expect(band.bottomCss).toBe(-row * GEOMETRY.pitchCss)
      expect(band.topCss).toBe(-row * GEOMETRY.pitchCss - GEOMETRY.squareCss)
      expect(band.bottomCss - band.topCss, "every row is one square tall").toBe(12)
    },
  )
  // Growth upward from a COMMON BASELINE: row 0's bottom is the origin
  // and never moves, whatever the word does.
  expect(rowBandCss(0).bottomCss).toBe(0)
})

test("L-P1 growth does not move a placed square in document space", () => {
  // AMENDED (coordinator 2026-08-31, packet §10 A-3): growth beyond the
  // carrier evicts addresses (CI-2), so the law is tested inside it;
  // beyond is L-P9 `carrier` + CI-2's territory.
  const small = foldPage(emptyModel, syntheticPage(0, 10, [8]))
  const big = foldPage(small, syntheticPage(10, 400, [8]))
  const col = laneIndex("chunk")
  const doi = { span: WINDOW, floor: LANES.map(() => 0) }
  const rowsOf = (m: typeof small) =>
    placementOf(m, doi).ops.filter((op) => op.col === col && op._tag === "Square")

  const before = rowsOf(small)
  const after = new Map(
    rowsOf(big).map((op) => [op._tag === "Square" ? op.row : -1, op] as const),
  )
  for (const op of before) {
    if (op._tag !== "Square") continue
    expect(after.get(op.row), `row ${op.row} kept its address`).toStrictEqual(op)
    expect(bandOf(op), "and its band").toStrictEqual(rowBandCss(op.row))
  }
})

// ------------------------------------------------------------- L-P2

test("L-P2 every coordinate is an integer device pixel, at all four golden DPRs", () => {
  const model = fixtureModel()
  const placement = placementOf(model, cutDoi(model, WINDOW))
  for (const dpr of GOLDEN_DPRS) {
    const rects = place(placement, TALL, dpr)
    expect(rects.length, `dpr ${dpr} placed something`).toBeGreaterThan(0)
    for (const rect of rects) {
      for (const [name, value] of Object.entries({ x: rect.x, y: rect.y, w: rect.w, h: rect.h })) {
        expect(Number.isInteger(value), `dpr ${dpr}: ${name} = ${value} is a device pixel`).toBe(true)
      }
      expect(rect.w, "no zero-width rect").toBeGreaterThan(0)
      expect(rect.h, "no zero-height rect").toBeGreaterThan(0)
    }
  }
})

test("L-P2 the rects realize the contract's affine map, edge by edge", () => {
  const model = fixtureModel()
  const placement = placementOf(model, cutDoi(model, WINDOW))
  for (const dpr of GOLDEN_DPRS) {
    for (const rect of place(placement, TALL, dpr)) {
      const originCss = columnOriginCss(rect.of.col)
      const band = bandOf(rect.of)
      expect(rect.x).toBe(xdev(originCss, dpr))
      expect(rect.w, "width is the difference of two snapped EDGES")
        .toBe(xdev(originCss + GEOMETRY.laneCss, dpr) - xdev(originCss, dpr))
      expect(rect.y).toBe(ydev(band.topCss, TALL, dpr))
      expect(rect.h, "height is the difference of two snapped EDGES")
        .toBe(ydev(band.bottomCss, TALL, dpr) - ydev(band.topCss, TALL, dpr))
    }
  }
})

test("L-P2 a fractional viewport origin still lands on device pixels", () => {
  const model = fixtureModel()
  const placement = placementOf(model, cutDoi(model, WINDOW))
  for (const originYCss of [-800.5, -800.3, -799.7]) {
    for (const dpr of GOLDEN_DPRS) {
      const view: Viewport = { widthCss: 600, heightCss: 900, originYCss }
      for (const rect of place(placement, view, dpr)) {
        expect(Number.isInteger(rect.y) && Number.isInteger(rect.h)).toBe(true)
      }
    }
  }
})

// ------------------------------------------------------------- L-P3

test("L-P3 the two-row strip at dpr 1.5 — edge snapping, not size snapping", () => {
  // The packet's ADEQUACY-2, exhibited. CSS band [-27, 0], height 27.
  //   edge-snapped: y = round(1159.5) = 1160, bottom = 1200, h = 40
  //   size-snapped: h = round(27 * 1.5) = round(40.5) = 41 -> bottom 1201,
  //                 one device pixel BELOW the baseline.
  // Math.round breaks the -40.5 / +40.5 tie in opposite directions, so
  // the two disciplines are different functions.
  const placement: Placement = {
    doi: { span: WINDOW, floor: LANES.map(() => 0) },
    ops: [{ _tag: "Strip", col: 0, fromRow: 0, count: 2 }],
  }
  const rects = place(placement, VIEW, 1.5)
  expect(rects).toHaveLength(1)
  const rect = rects[0]
  expect(rect).toBeDefined()
  if (rect === undefined) return

  const baselineDev = ydev(0, VIEW, 1.5)
  expect(baselineDev).toBe(1200)
  expect(rect.y).toBe(1160)
  expect(rect.h, "40, not the 41 size-snapping gives").toBe(40)
  expect(rect.y + rect.h, "the strip stops exactly at the baseline").toBe(baselineDev)
  expect(Math.round(27 * 1.5), "and the two really do disagree").toBe(41)
})

test("L-P3 no rect ever crosses the baseline", () => {
  const model = fixtureModel()
  for (const dpr of GOLDEN_DPRS) {
    const placement = placementOf(model, cutDoi(model, WINDOW))
    const baselineDev = ydev(0, TALL, dpr)
    for (const rect of place(placement, TALL, dpr)) {
      expect(rect.y + rect.h, `dpr ${dpr}`).toBeLessThanOrEqual(baselineDev)
    }
    const rowZero = place(placement, TALL, dpr).filter((rect) => {
      const op = rect.of
      return (op._tag === "Square" ? op.row : op.fromRow) === 0
    })
    expect(rowZero.length, "every non-empty column starts at the baseline").toBeGreaterThan(0)
    for (const rect of rowZero) expect(rect.y + rect.h).toBe(baselineDev)
  }
})

// ------------------------------------------------------------- L-C6

test("L-C6 a strip occupies exactly the rows it covers, at full pitch", () => {
  const deep = foldPage(emptyModel, syntheticPage(0, 400, [8]))
  const placement = placementOf(deep, cutDoi(deep, WINDOW))
  const strip = placement.ops.find((op) => op._tag === "Strip")
  expect(strip).toBeDefined()
  if (strip === undefined || strip._tag !== "Strip") return

  const band = bandOf(strip)
  expect(band.bottomCss - band.topCss, "no compression, no band, no sediment")
    .toBe(strip.count * GEOMETRY.pitchCss - GEOMETRY.gapCss)
  expect(band.bottomCss).toBe(rowBandCss(strip.fromRow).bottomCss)
  expect(band.topCss).toBe(rowBandCss(strip.fromRow + strip.count - 1).topCss)
})

// ------------------------------------------------------------- L-P8

test("L-P8 the engine names no browser global", () => {
  const forbidden = [
    "window", "document", "devicePixelRatio", "navigator", "globalThis",
    "performance", "Date.now", "Math.random", "fetch", "requestAnimationFrame",
  ]
  for (const name of ["model.ts", "fold.ts", "placement.ts", "place.ts"]) {
    const source = readFileSync(new URL(`./${name}`, import.meta.url), "utf8")
    const code = source.replaceAll(/\/\*[\s\S]*?\*\//gu, "").replaceAll(/\/\/[^\n]*/gu, "")
    for (const global of forbidden) {
      expect(code.includes(global), `${name} must not reach for ${global}`).toBe(false)
    }
  }
})
