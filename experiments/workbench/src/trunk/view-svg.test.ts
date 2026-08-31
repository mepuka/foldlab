/**
 * S3b BATTERY — the SVG register against the engine's bytes (L-V1,
 * L-V2, L-V3, L-V5).
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * The engine's `canonicalRects` is the byte reference the SVG must
 * realize (S3a §5); every expectation here is COMPUTED from the landed
 * engine, never stored. Red at COLLECTION today because `./app.ts` and
 * `./view.ts` do not exist. Read-only to the implementer.
 */
import { given, scene, tap } from "foldkit/scene"
import { expect, test } from "vitest"

import { initialApp, update, type AppModel } from "./app.ts"
import { cameraTransform, columnRects, view } from "./view.ts"
import { foldDocument } from "./fold.ts"
import { WINDOW, emptyModel, laneIndex, tintIndex, type Model } from "./model.ts"
import { cutDoi, initialDoi, placementOf, type Doi } from "./placement.ts"
import {
  GOLDEN_DPRS,
  canonicalRects,
  columnOriginCss,
  place,
  type Viewport,
} from "./place.ts"
import { loadWhole, syntheticPage } from "./fixtures/harness.ts"
import {
  allNodes,
  attrsOf,
  byTestId,
  bySel,
  classesOf,
  linesOfCanonical,
  quadOf,
  styleOf,
  type VNodeShape,
} from "./fixtures/app-harness.ts"

const PINNED: Viewport = { widthCss: 507, heightCss: 660, originYCss: -660 }

const goldenModel = (dpr: number): AppModel => {
  const trunk = foldDocument(emptyModel, loadWhole())
  const base = initialApp("http://127.0.0.1:7101", {
    widthCss: PINNED.widthCss,
    heightCss: PINNED.heightCss,
    dpr,
    theme: "light",
  })
  return { ...base, trunk, doi: cutDoi(trunk, WINDOW) }
}

const viewportOf = (model: AppModel): Viewport => ({
  widthCss: model.epoch.widthCss,
  heightCss: model.epoch.heightCss,
  originYCss: model.epoch.originYCss,
})

const engineRects = (model: AppModel) =>
  place(placementOf(model.trunk, model.doi), viewportOf(model), model.epoch.dpr)

/** The rendered rect quads under the camera, asserted against the
 * engine's canonical bytes for the same model. */
const expectGoldenAgreement = (model: AppModel): void => {
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const camera = byTestId(simulation.html, "camera")
      expect(camera, "one camera group").not.toBeNull()
      const rects = engineRects(model)
      const canonical = canonicalRects(rects, viewportOf(model), model.epoch.dpr)
      const expected = linesOfCanonical(canonical)
      const rendered = bySel(camera ?? {}, "rect").map((rect) => quadOf(rect))
      expect(rendered, `dpr ${String(model.epoch.dpr)}`).toStrictEqual(expected)
      expect(rendered.length).toBeGreaterThan(0)
    }),
  )
}

// ---------------------------------------------------------------- L-V1

test("the SVG register realizes canonicalRects verbatim at dpr 1", () => {
  expectGoldenAgreement(goldenModel(1))
})

test("the SVG register realizes canonicalRects verbatim at each golden DPR", () => {
  for (const dpr of GOLDEN_DPRS) expectGoldenAgreement(goldenModel(dpr))
})

test("rects arrive in place's order under one camera group and nowhere else", () => {
  const model = goldenModel(2)
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const cameras = allNodes(simulation.html).filter(
        (node) => attrsOf(node)["data-testid"] === "camera",
      )
      expect(cameras, "exactly one camera").toHaveLength(1)
      const canvas = byTestId(simulation.html, "trunk-canvas")
      expect(canvas).not.toBeNull()
      const rectsInSvg = bySel(canvas ?? {}, "rect").length
      const rectsInCamera = bySel(cameras[0] ?? {}, "rect").length
      // every MARK rect lives under the camera; the only rects allowed
      // outside it are the selection/focus ring, absent here
      expect(rectsInSvg).toBe(rectsInCamera)
      expect(rectsInCamera).toBe(engineRects(model).length)
    }),
  )
})

test("culling is the engine's: what place answers is what renders", () => {
  const golden = goldenModel(1)
  const scrolled: AppModel = {
    ...golden,
    epoch: { ...golden.epoch, originYCss: -1200 },
    liveOriginYCss: -1200,
  }
  const culled = engineRects(scrolled)
  const whole = place(
    placementOf(scrolled.trunk, scrolled.doi),
    { widthCss: 507, heightCss: 4000, originYCss: -4000 },
    1,
  )
  expect(culled.length, "the scrolled viewport truly culls").toBeLessThan(whole.length)
  scene(
    { update, view },
    given(scrolled),
    tap((simulation) => {
      const camera = byTestId(simulation.html, "camera")
      expect(bySel(camera ?? {}, "rect").map((rect) => quadOf(rect))).toStrictEqual(
        linesOfCanonical(canonicalRects(culled, viewportOf(scrolled), 1)),
      )
    }),
  )
})

// ---------------------------------------------------------------- L-V2

test("columnRects agrees with the whole placement, column by column", () => {
  const fixtureTrunk = foldDocument(emptyModel, loadWhole())
  const deep = foldDocument(emptyModel, syntheticPage(0, 700, [8, 1]))
  const cases: ReadonlyArray<readonly [Model, Doi]> = [
    [fixtureTrunk, cutDoi(fixtureTrunk, WINDOW)],
    [fixtureTrunk, initialDoi],
    [deep, cutDoi(deep, WINDOW)],
  ]
  for (const dpr of [1, 1.5]) {
    for (const [trunk, doi] of cases) {
      const wholeAnswer = place(placementOf(trunk, doi), PINNED, dpr)
      const split = trunk.columns.flatMap((column, col) => {
        const asked = Math.min(doi.floor[col] ?? 0, column.count)
        const floor = Math.max(asked, column.count - column.tail.length)
        return columnRects(column, col, floor, PINNED, dpr)
      })
      expect(split, "no second layout arithmetic").toStrictEqual(wholeAnswer)
    }
  }
})

test("labels sit at place's column origins", () => {
  const model = goldenModel(1)
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      model.trunk.columns.forEach((column, col) => {
        if (column.count === 0) return
        const label = byTestId(simulation.html, `label-${String(col)}`)
        expect(label, `lane ${String(col)} is labelled`).not.toBeNull()
        expect(styleOf(label ?? {})["left"], "the engine's origin, no second arithmetic").toBe(
          `${String(columnOriginCss(col))}px`,
        )
      })
    }),
  )
})

// ---------------------------------------------------------------- L-V3

test("the camera transform is the pinned formula", () => {
  expect(cameraTransform(1, -660, -660)).toBe("translate(0 0) scale(1)")
  expect(cameraTransform(2, -660, -660)).toBe("translate(0 0) scale(0.5)")
  expect(cameraTransform(1.5, -660, -510)).toBe(
    `translate(0 -150) scale(${String(1 / 1.5)})`,
  )
  const model = goldenModel(2)
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const camera = byTestId(simulation.html, "camera")
      expect(attrsOf(camera ?? {})["transform"]).toBe(
        cameraTransform(2, model.epoch.originYCss, model.liveOriginYCss),
      )
    }),
  )
})

// ---------------------------------------------------------------- L-V5

const rectsWithOps = (model: AppModel, root: VNodeShape) => {
  const camera = byTestId(root, "camera")
  const rendered = bySel(camera ?? {}, "rect")
  const rects = engineRects(model)
  expect(rendered).toHaveLength(rects.length)
  return rendered.map((node, index) => ({ node, of: rects[index]?.of }))
}

test("each square carries its pinned tint class; unregistered marks carry owed", () => {
  const model = goldenModel(1)
  const residue = laneIndex("unregistered")
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const seenTints = new Set<string>()
      for (const { node, of } of rectsWithOps(model, simulation.html)) {
        if (of?._tag !== "Square") continue
        const classes = classesOf(node)
        expect(classes).toContain("mark")
        if (of.col === residue) {
          expect(classes, "doubt takes the whole saturated budget").toContain("owed")
          expect(classes.some((name) => name.startsWith("tint-"))).toBe(false)
        } else {
          const tint = `tint-${String(tintIndex(of.address))}`
          expect(classes, `the pinned index for ${of.address.slice(0, 8)}`).toContain(tint)
          expect(classes).not.toContain("owed")
          seenTints.add(tint)
        }
      }
      expect([...seenTints].toSorted(), "the fixture realizes all five steps").toStrictEqual([
        "tint-0", "tint-1", "tint-2", "tint-3", "tint-4",
      ])
    }),
  )
})

test("strips carry the strip class and exist at the golden state", () => {
  const model = goldenModel(1)
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const strips = rectsWithOps(model, simulation.html).filter(
        ({ of }) => of?._tag === "Strip",
      )
      expect(strips.length, "chunk and step strip under the cut partition").toBeGreaterThanOrEqual(2)
      for (const { node } of strips) {
        expect(classesOf(node)).toContain("strip")
        expect(classesOf(node)).not.toContain("mark")
      }
    }),
  )
})
