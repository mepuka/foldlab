/**
 * BATTERY — S3a, the trunk engine. Laws L-P4..L-P9 (disjointness,
 * determinism and the pinned register, uniform marks, virtualization,
 * browserlessness, and the epoch terminators).
 *
 * Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`.
 * Written by the BREAKER before `src/trunk/place.ts` exists; RED by
 * construction. Read-only to the implementer.
 */
import { expect, test } from "vitest"

import { GrammarKindTags } from "../generated/kindTags.ts"
import { forAll, loadWhole, syntheticPage, totalOf } from "./fixtures/harness.ts"
import { foldPage } from "./fold.ts"
import { emptyModel, K_CARRIER, LANES, WINDOW } from "./model.ts"
import { cutDoi, initialDoi, opTotal, placementOf, type Op } from "./placement.ts"
import {
  canonicalRects,
  DRIFT_CSS,
  GEOMETRY,
  GOLDEN_DPRS,
  isDisjoint,
  OVERDRAW_CSS,
  place,
  terminators,
  type Epoch,
  type Rect,
  type Viewport,
} from "./place.ts"

const VIEW: Viewport = { widthCss: 600, heightCss: 800, originYCss: -800 }
const TALL: Viewport = { widthCss: 600, heightCss: 40_000, originYCss: -40_000 }

const fixtureModel = () => foldPage(emptyModel, loadWhole())
const tags = [...GrammarKindTags, 200, 42]

// ------------------------------------------------------------- L-P4

test("L-P4 no two rects share a device pixel, on every generated placement", () => {
  forAll(
    (draw) => {
      let model = emptyModel
      let from = 0
      for (let i = 0; i < draw.int(1, 3); i += 1) {
        const size = draw.int(0, 500)
        model = foldPage(model, syntheticPage(from, size, tags))
        from += size
      }
      return { model, window: draw.int(1, 60), dpr: draw.pick(GOLDEN_DPRS) }
    },
    60,
    ({ model, window, dpr }) => {
      const rects = place(placementOf(model, cutDoi(model, window)), TALL, dpr)
      expect(rects.length === 0, "and not vacuously").toBe(totalOf(model) === 0)
      expect(isDisjoint(rects), "the checker passes").toBe(true)
      expect(bruteForceDisjoint(rects), "and brute force agrees").toBe(true)
    },
  )
})

const bruteForceDisjoint = (rects: ReadonlyArray<Rect>): boolean => {
  for (let i = 0; i < rects.length; i += 1) {
    const a = rects[i]
    if (a === undefined) continue
    for (let j = i + 1; j < rects.length; j += 1) {
      const b = rects[j]
      if (b === undefined) continue
      const overlapX = a.x < b.x + b.w && b.x < a.x + a.w
      const overlapY = a.y < b.y + b.h && b.y < a.y + a.h
      if (overlapX && overlapY) return false
    }
  }
  return true
}

test("L-P4 the disjointness checker refuses an overlapping pair", () => {
  // A checker that returns a constant true passes every other case in
  // this battery. It does not pass this one.
  const square: Op = { _tag: "Square", col: 0, row: 0, address: "a".repeat(64) }
  const overlapping: ReadonlyArray<Rect> = [
    { x: 0, y: 0, w: 18, h: 18, of: square },
    { x: 10, y: 10, w: 18, h: 18, of: square },
  ]
  const touching: ReadonlyArray<Rect> = [
    { x: 0, y: 0, w: 18, h: 18, of: square },
    { x: 18, y: 0, w: 18, h: 18, of: square },
  ]
  expect(isDisjoint(overlapping)).toBe(false)
  expect(isDisjoint(touching), "abutting is not overlapping").toBe(true)
  expect(isDisjoint([])).toBe(true)
})

test("L-P4 the gutters survive at every golden DPR", () => {
  const model = fixtureModel()
  const rects = place(placementOf(model, cutDoi(model, WINDOW)), TALL, 1)
  const byColumn = new Map<number, Array<Rect>>()
  for (const rect of rects) {
    byColumn.set(rect.of.col, [...(byColumn.get(rect.of.col) ?? []), rect])
  }
  for (const [col, column] of byColumn) {
    const sorted = column.toSorted((a, b) => a.y - b.y)
    sorted.forEach((rect, index) => {
      if (index === 0) return
      const previous = sorted[index - 1]
      if (previous === undefined) return
      expect(rect.y - (previous.y + previous.h), `col ${col}: at least one device pixel of air`)
        .toBeGreaterThanOrEqual(1)
    })
  }
})

// ------------------------------------------------------------- L-P5

test("L-P5 place is deterministic", () => {
  const model = fixtureModel()
  const placement = placementOf(model, cutDoi(model, WINDOW))
  for (const dpr of GOLDEN_DPRS) {
    expect(place(placement, TALL, dpr)).toStrictEqual(place(placement, TALL, dpr))
  }
  // And it does not depend on the identity of the Placement value.
  const again = placementOf(fixtureModel(), cutDoi(fixtureModel(), WINDOW))
  expect(place(again, TALL, 2)).toStrictEqual(place(placement, TALL, 2))
})

test("L-P5 canonicalRects is byte-stable, and byte-different per DPR", () => {
  const model = fixtureModel()
  const placement = placementOf(model, cutDoi(model, WINDOW))
  const rendered = GOLDEN_DPRS.map((dpr) => canonicalRects(place(placement, TALL, dpr), TALL, dpr))

  GOLDEN_DPRS.forEach((dpr, index) => {
    const again = canonicalRects(place(placement, TALL, dpr), TALL, dpr)
    expect(again, `dpr ${dpr} is byte-stable`).toBe(rendered[index])
  })
  expect(new Set(rendered).size, "four DPRs, four distinct registers").toBe(4)
})

test("L-P5 the canonical register has the pinned shape", () => {
  const model = fixtureModel()
  const rects = place(placementOf(model, cutDoi(model, WINDOW)), TALL, 2)
  const text = canonicalRects(rects, TALL, 2)
  const lines = text.split("\n")

  expect(text.endsWith("\n"), "the file ends with LF").toBe(true)
  expect(text).not.toContain("\r")
  expect(lines[0]).toBe(
    `# dpr=2 vw=${TALL.widthCss} vh=${TALL.heightCss} oy=${TALL.originYCss} n=${rects.length}`,
  )
  expect(lines).toHaveLength(rects.length + 2)
  for (const line of lines.slice(1, -1)) {
    expect(
      /^S -?\d+ -?\d+ \d+ \d+ [0-9a-f]{64} [0-4]$|^T -?\d+ -?\d+ \d+ \d+ \d+ \d+$/u.test(line),
      line,
    ).toBe(true)
    expect(line.endsWith(" "), "no trailing space").toBe(false)
  }
})

// ------------------------------------------------------------- L-P6

test("L-P6 every square has the same device dimensions at the golden DPRs", () => {
  const model = fixtureModel()
  const placement = placementOf(model, cutDoi(model, WINDOW))
  for (const dpr of GOLDEN_DPRS) {
    expect(Number.isInteger(GEOMETRY.squareCss * dpr), `12 * ${dpr} is a whole device pixel`)
      .toBe(true)
    const sizes = new Set(
      place(placement, TALL, dpr)
        .filter((rect) => rect.of._tag === "Square")
        .map((rect) => `${rect.w}x${rect.h}`),
    )
    expect(sizes.size, `dpr ${dpr}: presence, never magnitude`).toBe(1)
    expect([...sizes][0]).toBe(`${GEOMETRY.squareCss * dpr}x${GEOMETRY.squareCss * dpr}`)
  }
})

// ------------------------------------------------------------- L-P7

test("L-P7 place culls to the overdrawn viewport", () => {
  // AMENDED (coordinator 2026-08-31, packet §10 A-2): unculled is a
  // COVERAGE fact — ">9000 ops" was unsatisfiable under CI-2.
  const deep = foldPage(emptyModel, syntheticPage(0, 20_000, tags))
  const placement = placementOf(deep, cutDoi(deep, 10_000))
  const view: Viewport = { widthCss: 600, heightCss: 600, originYCss: -600 }
  const rects = place(placement, view, 1)

  expect(opTotal(placement), "unculled — every receipt covered").toBe(20_000)
  expect(placement.ops.length, "at the carrier's arithmetic exactly")
    .toBe(LANES.length * (K_CARRIER + 1))
  const ceiling =
    LANES.length * (Math.ceil((view.heightCss + 2 * OVERDRAW_CSS) / GEOMETRY.pitchCss) + 2) +
    LANES.length
  expect(rects.length, "but place returns a viewport-bounded list").toBeLessThanOrEqual(ceiling)
  expect(rects.length).toBeGreaterThan(0)

  const topDev = Math.round((view.originYCss - OVERDRAW_CSS - view.originYCss) * 1)
  const bottomDev = Math.round((view.originYCss + view.heightCss + OVERDRAW_CSS - view.originYCss) * 1)
  for (const rect of rects) {
    expect(rect.y + rect.h, "inside the overdraw band").toBeGreaterThanOrEqual(topDev)
    expect(rect.y).toBeLessThanOrEqual(bottomDev)
  }
})

test("L-P7 culling filters — it never re-lays out", () => {
  const model = fixtureModel()
  const placement = placementOf(model, cutDoi(model, WINDOW))
  const near: Viewport = { widthCss: 600, heightCss: 400, originYCss: -400 }
  const far: Viewport = { widthCss: 600, heightCss: 1200, originYCss: -1200 }

  for (const dpr of GOLDEN_DPRS) {
    const delta = (near.originYCss - far.originYCss) * dpr
    expect(Number.isInteger(delta), "the two frames differ by whole device pixels").toBe(true)
    const wide = new Map(
      place(placement, far, dpr).map((rect) => [keyOf(rect), rect] as const),
    )
    for (const rect of place(placement, near, dpr)) {
      const same = wide.get(keyOf(rect))
      expect(same, `${keyOf(rect)} is present in the wider viewport`).toBeDefined()
      if (same === undefined) continue
      expect({ x: same.x, w: same.w, h: same.h }, "unchanged but for the frame")
        .toStrictEqual({ x: rect.x, w: rect.w, h: rect.h })
      expect(same.y).toBe(rect.y + delta)
    }
  }
})

const keyOf = (rect: Rect): string =>
  rect.of._tag === "Square"
    ? `S:${rect.of.col}:${rect.of.row}`
    : `T:${rect.of.col}:${rect.of.fromRow}:${rect.of.count}`

// ------------------------------------------------------------- L-P9

test("L-P9 an unchanged epoch reports no terminator", () => {
  const model = fixtureModel()
  const epoch: Epoch = {
    viewport: VIEW,
    dpr: 2,
    theme: "light",
    classifierRevision: 1,
    doi: cutDoi(model, WINDOW),
  }
  expect(terminators(epoch, epoch, model)).toStrictEqual([])
})

test("L-P9 every epoch change is reported, and only real ones", () => {
  const model = fixtureModel()
  const doi = cutDoi(model, WINDOW)
  const base: Epoch = {
    viewport: VIEW, dpr: 2, theme: "light", classifierRevision: 1, doi,
  }
  const cases: ReadonlyArray<readonly [string, Epoch]> = [
    ["resize", { ...base, viewport: { ...VIEW, widthCss: 601 } }],
    ["dpr", { ...base, dpr: 3 }],
    ["theme", { ...base, theme: "dark" }],
    ["classifier", { ...base, classifierRevision: 2 }],
    ["cut", { ...base, doi: cutDoi(model, 8) }],
    ["scroll-drift", { ...base, viewport: { ...VIEW, originYCss: VIEW.originYCss - DRIFT_CSS } }],
  ]
  for (const [expected, after] of cases) {
    expect(terminators(base, after, model), expected).toContain(expected)
  }
})

test("L-P9 a scroll below the drift threshold is not a terminator", () => {
  // A single threshold thrashes; the two-threshold discipline is
  // Perfetto's, and 199 css px of drift must not void the epoch.
  const model = fixtureModel()
  const base: Epoch = {
    viewport: VIEW, dpr: 2, theme: "light", classifierRevision: 1, doi: cutDoi(model, WINDOW),
  }
  const nudged: Epoch = {
    ...base,
    viewport: { ...VIEW, originYCss: VIEW.originYCss - (DRIFT_CSS - 1) },
  }
  expect(terminators(base, nudged, model)).not.toContain("scroll-drift")
  expect(OVERDRAW_CSS, "Perfetto's virtual_canvas.ts").toBe(300)
  expect(DRIFT_CSS, "Perfetto's virtual_canvas.ts").toBe(200)
})

test("L-P9 carrier exhaustion is a terminator — the extension law's own limit", () => {
  // A Doi cut when the column was shallow, carried forward past the
  // carrier bound: the floor must be forced up, so the epoch is over.
  const shallow = foldPage(emptyModel, syntheticPage(0, 10, [8]))
  const doi = cutDoi(shallow, WINDOW)
  const grown = foldPage(shallow, syntheticPage(10, 5_000, [8]))
  const base: Epoch = {
    viewport: VIEW, dpr: 2, theme: "light", classifierRevision: 1, doi,
  }
  expect(terminators(base, base, grown)).toContain("carrier")
  expect(terminators(base, base, shallow), "and not before").not.toContain("carrier")
})

// ------------------------------------------------------- the ground

test("an empty model places nothing at every golden DPR", () => {
  for (const dpr of GOLDEN_DPRS) {
    expect(place(placementOf(emptyModel, initialDoi), VIEW, dpr)).toStrictEqual([])
    expect(canonicalRects([], VIEW, dpr).split("\n")).toHaveLength(2)
  }
})
