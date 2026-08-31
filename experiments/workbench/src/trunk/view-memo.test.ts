/**
 * S3b BATTERY — the memo law at the view (L-V4, plus L-V3's memo half).
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * The device (one stable dispatch per scene run; createLazy keyed by
 * fn/dispatch/args) is proved by fixtures/app-harness.test.ts. Red at
 * COLLECTION today because `./app.ts` and `./view.ts` do not exist.
 * Read-only to the implementer.
 */
import { given, scene, tap } from "foldkit/scene"
import { expect, test } from "vitest"

import { Message, initialApp, update, type AppModel } from "./app.ts"
import { view } from "./view.ts"
import { foldDocument } from "./fold.ts"
import { LANES, WINDOW, emptyModel, laneIndex } from "./model.ts"
import { cutDoi, placementOf } from "./placement.ts"
import { canonicalRects, place } from "./place.ts"
import { loadWhole, syntheticPage } from "./fixtures/harness.ts"
import { attrsOf, byTestId, bySel, linesOfCanonical, quadOf, type VNodeShape } from "./fixtures/app-harness.ts"

const BOOT = { widthCss: 507, heightCss: 660, dpr: 1, theme: "light" }

const goldenModel = (): AppModel => {
  const trunk = foldDocument(emptyModel, loadWhole())
  return { ...initialApp("http://127.0.0.1:7101", BOOT), trunk, doi: cutDoi(trunk, WINDOW) }
}

type Groups = ReadonlyArray<VNodeShape | null>

const grabColumns = (out: Array<Groups>) =>
  tap<AppModel, Message>((simulation) => {
    out.push(LANES.map((_lane, col) => byTestId(simulation.html, `column-${String(col)}`)))
  })

const sameAt = (before: Groups, after: Groups): ReadonlyArray<boolean> =>
  before.map((group, col) => group !== null && group === after[col])

// ---------------------------------------------------------------- L-V4a

test("rendering twice at one model returns the same column groups by reference", () => {
  const model = goldenModel()
  const grabbed: Array<Groups> = []
  scene(
    { update, view },
    given(model),
    grabColumns(grabbed),
    given(model),
    grabColumns(grabbed),
  )
  expect(sameAt(grabbed[0] ?? [], grabbed[1] ?? [])).toStrictEqual(LANES.map(() => true))
})

// ---------------------------------------------------------------- L-V4b

test("a fold touching one lane re-renders only that column's group", () => {
  const before = goldenModel()
  const valueCol = laneIndex("value")
  // one receipt into the value lane; span stays under the cut slack
  const page = syntheticPage(before.trunk.mark, 1, [1])
  const after = update(before, Message.SucceededPullHistory({ body: page })).model
  expect(after.doi, "no cut on this small growth").toBe(before.doi)
  const grabbed: Array<Groups> = []
  scene(
    { update, view },
    given(before),
    grabColumns(grabbed),
    given(after),
    grabColumns(grabbed),
  )
  const kept = sameAt(grabbed[0] ?? [], grabbed[1] ?? [])
  expect(kept, "fifteen columns skip construction AND diffing (spike §1.2)").toStrictEqual(
    LANES.map((_lane, col) => col !== valueCol),
  )
})

// ------------------------------------------------------- L-V3 memo half

test("a sub-drift scroll changes only the camera transform", () => {
  const before = goldenModel()
  const after = update(
    before,
    Message.Scrolled({ originYCss: before.epoch.originYCss + 150 }),
  ).model
  expect(after.epoch.originYCss, "150 css px is not a drift").toBe(before.epoch.originYCss)
  const grabbed: Array<Groups> = []
  const transforms: Array<string> = []
  const grabTransform = tap<AppModel, Message>((simulation) => {
    transforms.push(String(attrsOf(byTestId(simulation.html, "camera") ?? {})["transform"]))
  })
  scene(
    { update, view },
    given(before),
    grabColumns(grabbed),
    grabTransform,
    given(after),
    grabColumns(grabbed),
    grabTransform,
  )
  expect(sameAt(grabbed[0] ?? [], grabbed[1] ?? []), "the camera alone absorbed it").toStrictEqual(
    LANES.map(() => true),
  )
  expect(transforms[0]).not.toBe(transforms[1])
  expect(transforms[1]).toContain("translate(0 -150)")
})

// ---------------------------------------------------------------- L-V4d

test("a dpr change re-places: the rects are the engine's at the new dpr", () => {
  const before = goldenModel()
  const after = update(before, Message.ChangedDpr({ dpr: 2 })).model
  expect(after.epoch.dpr).toBe(2)
  scene(
    { update, view },
    given(after),
    tap((simulation) => {
      const camera = byTestId(simulation.html, "camera")
      const viewport = {
        widthCss: after.epoch.widthCss,
        heightCss: after.epoch.heightCss,
        originYCss: after.epoch.originYCss,
      }
      const rects = place(placementOf(after.trunk, after.doi), viewport, 2)
      expect(bySel(camera ?? {}, "rect").map((rect) => quadOf(rect))).toStrictEqual(
        linesOfCanonical(canonicalRects(rects, viewport, 2)),
      )
    }),
  )
})

// ---------------------------------------------------------------- L-V4e

test("a cut re-renders exactly the columns whose effective floor moved", () => {
  const before = goldenModel()
  const chunkCol = laneIndex("chunk")
  // 61 receipts into chunk pushes its span past the slack: a cut fires
  const page = syntheticPage(before.trunk.mark, 61, [8])
  const after = update(before, Message.SucceededPullHistory({ body: page })).model
  expect(after.doi, "the cut produced a new partition").not.toBe(before.doi)
  const floorChanged = LANES.map(
    (_lane, col) => (before.doi.floor[col] ?? 0) !== (after.doi.floor[col] ?? 0),
  )
  expect(floorChanged[chunkCol]).toBe(true)
  const grabbed: Array<Groups> = []
  scene(
    { update, view },
    given(before),
    grabColumns(grabbed),
    given(after),
    grabColumns(grabbed),
  )
  const kept = sameAt(grabbed[0] ?? [], grabbed[1] ?? [])
  kept.forEach((wasKept, col) => {
    const untouched = col !== chunkCol && floorChanged[col] === false
    expect(wasKept, `${LANES[col] ?? "?"} kept iff untouched`).toBe(untouched)
  })
})
