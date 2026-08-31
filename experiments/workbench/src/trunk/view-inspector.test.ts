/**
 * S3b BATTERY — the inspector and the strip face (L-V9, L-V10).
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * Red at COLLECTION today because `./app.ts` and `./view.ts` do not
 * exist. Read-only to the implementer.
 */
import { given, scene, tap } from "foldkit/scene"
import { expect, test } from "vitest"

import { Selection, initialApp, type AppModel } from "./app.ts"
import { update } from "./app.ts"
import { view } from "./view.ts"
import { foldDocument } from "./fold.ts"
import { WINDOW, emptyModel, kindName, laneIndex } from "./model.ts"
import { cutDoi, placementOf } from "./placement.ts"
import { loadWhole, syntheticPage } from "./fixtures/harness.ts"
import {
  allNodes,
  byTestId,
  bySel,
  classesOf,
  quadOf,
  textOf,
  type VNodeShape,
} from "./fixtures/app-harness.ts"

const BOOT = { widthCss: 507, heightCss: 660, dpr: 1, theme: "light" }

const app0 = (): AppModel => initialApp("http://127.0.0.1:7101", BOOT)

const goldenModel = (): AppModel => {
  const trunk = foldDocument(emptyModel, loadWhole())
  return { ...app0(), trunk, doi: cutDoi(trunk, WINDOW) }
}

// ---------------------------------------------------------------- L-V9

const markQuads = (root: VNodeShape): ReadonlyArray<readonly [string, string, string, string]> => {
  const camera = byTestId(root, "camera")
  return bySel(camera ?? {}, "rect")
    .filter((node) => {
      const classes = classesOf(node)
      return classes.includes("mark") || classes.includes("strip")
    })
    .map((node) => quadOf(node))
}

test("the inspector appends after the canvas; selection changes no rect geometry", () => {
  const model = goldenModel()
  const col = laneIndex("value")
  const column = model.trunk.columns[col]
  const row = (column?.count ?? 1) - 1
  const address = column?.tail.at(-1)?.address ?? ""
  const selected: AppModel = {
    ...model,
    selection: Selection.Mark({ col, row, address }),
  }
  let unselectedQuads: ReadonlyArray<readonly [string, string, string, string]> = []
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      unselectedQuads = markQuads(simulation.html)
    }),
  )
  scene(
    { update, view },
    given(selected),
    tap((simulation) => {
      // document order: the canvas precedes the inspector, never overlays it
      const nodes = allNodes(simulation.html)
      const canvasIndex = nodes.findIndex((node) => byTestId(node, "trunk-canvas") === node)
      const inspectorIndex = nodes.findIndex((node) => byTestId(node, "inspector") === node)
      expect(canvasIndex).toBeGreaterThan(-1)
      expect(inspectorIndex).toBeGreaterThan(-1)
      expect(inspectorIndex, "the inspector APPENDS").toBeGreaterThan(canvasIndex)
      // uniform marks: geometry untouched, the ring is a separate element
      expect(markQuads(simulation.html)).toStrictEqual(unselectedQuads)
      const rings = allNodes(simulation.html).filter((node) => classesOf(node).includes("ring"))
      expect(rings.length, "the selection ring exists outside the mark").toBeGreaterThan(0)
    }),
  )
})

test("the inspector shows the receipt's facts: grouped address, kind, dash never zero", () => {
  const model = goldenModel()
  const col = laneIndex("value")
  const column = model.trunk.columns[col]
  const tip = column?.tail.at(-1)
  expect(tip).toBeDefined()
  const address = tip?.address ?? ""
  const grouped = address.match(/.{8}/gu)?.join(" ") ?? ""
  const selected: AppModel = {
    ...model,
    selection: Selection.Mark({ col, row: (column?.count ?? 1) - 1, address }),
  }
  scene(
    { update, view },
    given(selected),
    tap((simulation) => {
      const inspector = textOf(byTestId(simulation.html, "inspector") ?? {})
      expect(inspector, "the address in 8-char groups").toContain(grouped)
      expect(inspector).toContain(`${String(tip?.seq ?? -1)}`)
      expect(inspector).toContain(kindName(tip?.tag ?? 0))
      expect(inspector, "an absent body is a dash, never a zero").toContain("—")
    }),
  )
  // N9: an unregistered receipt is named by the CLI's bare hex
  const residue = laneIndex("unregistered")
  const residueColumn = model.trunk.columns[residue]
  const residueTip = residueColumn?.tail.at(-1)
  const selectedResidue: AppModel = {
    ...model,
    selection: Selection.Mark({
      col: residue,
      row: (residueColumn?.count ?? 1) - 1,
      address: residueTip?.address ?? "",
    }),
  }
  scene(
    { update, view },
    given(selectedResidue),
    tap((simulation) => {
      const inspector = textOf(byTestId(simulation.html, "inspector") ?? {})
      expect(inspector).toContain(kindName(residueTip?.tag ?? 0))
      expect(kindName(residueTip?.tag ?? 0)).toMatch(/^0x[0-9a-f]{2}$/u)
    }),
  )
})

// --------------------------------------------------------------- L-V10

test("a selected strip says not yet, with its count — and its marks only when held", () => {
  const model = goldenModel()
  const chunkCol = laneIndex("chunk")
  const chunk = model.trunk.columns[chunkCol]
  const placement = placementOf(model.trunk, model.doi)
  const strip = placement.ops.find((op) => op._tag === "Strip" && op.col === chunkCol)
  expect(strip?._tag).toBe("Strip")
  const count = strip?._tag === "Strip" ? strip.count : 0
  const withRun: AppModel = {
    ...model,
    selection: Selection.Run({ col: chunkCol, fromRow: 0, count }),
  }
  // the fixture's chunk column fits the carrier whole: the range is HELD
  expect(chunk?.count).toBe(chunk?.tail.length)
  const markFrom = chunk?.tail[0]?.seq ?? -1
  const markTo = chunk?.tail[count - 1]?.seq ?? -1
  scene(
    { update, view },
    given(withRun),
    tap((simulation) => {
      const inspector = textOf(byTestId(simulation.html, "inspector") ?? {})
      expect(inspector).toContain(`${String(count)} admissions`)
      expect(inspector, "TP-7's wording, never a cannot").toContain("not yet")
      expect(inspector).not.toContain("cannot")
      expect(inspector, "the range is held, so it is named").toContain(
        `marks ${String(markFrom)}–${String(markTo)}`,
      )
    }),
  )
  // beyond the carrier the range is unknowable and must not be invented
  const deep = foldDocument(emptyModel, syntheticPage(0, 700, [8]))
  const deepModel: AppModel = {
    ...app0(),
    trunk: deep,
    doi: cutDoi(deep, WINDOW),
    selection: Selection.Run({ col: chunkCol, fromRow: 0, count: 670 }),
  }
  scene(
    { update, view },
    given(deepModel),
    tap((simulation) => {
      const inspector = textOf(byTestId(simulation.html, "inspector") ?? {})
      expect(inspector).toContain("670 admissions")
      expect(inspector).toContain("not yet")
      expect(inspector, "no invented marks for rows the carrier lost").not.toContain("marks ")
    }),
  )
})
