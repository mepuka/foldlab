/**
 * S3b BATTERY — **THE `trunk-a11y` GATE** (TP-21 requires the gate to
 * be NAMED; this file, whole, is its VNode half — §7 BB-5 is its
 * browser half). Laws L-Y1..L-Y4.
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * Red at COLLECTION today because `./app.ts` and `./view.ts` do not
 * exist. Read-only to the implementer.
 */
import { Command, click, given, keydown, scene, selector, tap, testId, within } from "foldkit/scene"
import { expect, test } from "vitest"

import { Focus, LoadBody, Message, initialApp, update, type AppModel } from "./app.ts"
import { view } from "./view.ts"
import { foldDocument } from "./fold.ts"
import { LANES, WINDOW, emptyModel, kindName, laneIndex } from "./model.ts"
import { cutDoi, placementOf, type Op } from "./placement.ts"
import { loadWhole, syntheticPage } from "./fixtures/harness.ts"
import {
  allNodes,
  attrsOf,
  byTestId,
  classesOf,
  textOf,
} from "./fixtures/app-harness.ts"

const BOOT = { widthCss: 507, heightCss: 660, dpr: 1, theme: "light" }
const STORE = "http://127.0.0.1:7101"

const goldenModel = (): AppModel => {
  const trunk = foldDocument(emptyModel, loadWhole())
  return { ...initialApp(STORE, BOOT), trunk, doi: cutDoi(trunk, WINDOW) }
}

const opsOf = (model: AppModel): ReadonlyArray<Op> =>
  placementOf(model.trunk, model.doi).ops

const cellOf = (node: Parameters<typeof attrsOf>[0]): string =>
  `${String(attrsOf(node)["data-col"])}:${String(attrsOf(node)["data-row"])}`

const ringsIn = (root: Parameters<typeof allNodes>[0]): number =>
  allNodes(root).filter((node) => classesOf(node).includes("ring")).length

// ---------------------------------------------------------------- L-Y1

test("every square has exactly one list row; every list row a square", () => {
  const model = goldenModel()
  const squares = opsOf(model).filter((op) => op._tag === "Square")
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const rows = allNodes(simulation.html).filter(
        (node) => attrsOf(node)["data-testid"] === "list-row",
      )
      const rendered = rows.map((row) => cellOf(row)).toSorted()
      const expected = squares
        .map((op) => (op._tag === "Square" ? `${String(op.col)}:${String(op.row)}` : ""))
        .toSorted()
      expect(rendered, "a bijection, not a resemblance").toStrictEqual(expected)
    }),
  )
})

test("the list rows carry lane, row, address and kind", () => {
  const model = goldenModel()
  const col = laneIndex("value")
  const tip = model.trunk.columns[col]?.tail.at(-1)
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const rows = allNodes(simulation.html).filter(
        (node) =>
          attrsOf(node)["data-testid"] === "list-row" &&
          String(attrsOf(node)["data-col"]) === String(col) &&
          String(attrsOf(node)["data-row"]) === String((model.trunk.columns[col]?.count ?? 1) - 1),
      )
      expect(rows).toHaveLength(1)
      const text = textOf(rows[0] ?? {})
      expect(text).toContain("value")
      expect(text).toContain(tip?.address ?? "MISSING")
      expect(text).toContain(kindName(tip?.tag ?? 0))
    }),
  )
})

test("strips appear in the list with their counts — nothing hides", () => {
  const model = goldenModel()
  const strips = opsOf(model).filter((op) => op._tag === "Strip")
  expect(strips.length).toBeGreaterThanOrEqual(2)
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const rows = allNodes(simulation.html).filter(
        (node) => attrsOf(node)["data-testid"] === "list-strip",
      )
      expect(rows).toHaveLength(strips.length)
      for (const strip of strips) {
        if (strip._tag !== "Strip") continue
        const row = rows.find(
          (node) => String(attrsOf(node)["data-col"]) === String(strip.col),
        )
        expect(row, `lane ${LANES[strip.col] ?? "?"} strip is listed`).toBeDefined()
        expect(textOf(row ?? {})).toContain(String(strip.count))
      }
    }),
  )
})

// ---------------------------------------------------------------- L-Y2

test("the rect's click message is the keyboard's message", () => {
  const model = goldenModel()
  const col = laneIndex("value")
  const address = model.trunk.columns[col]?.tail[0]?.address ?? ""
  let viaClick = ""
  let viaKey = ""
  scene(
    { update, view },
    given(model),
    // the first rect of the value column is its row-0 square (floor 0)
    click(within(testId(`column-${String(col)}`), selector("rect"))),
    Command.resolve(LoadBody, Message.SucceededLoadBody({ address, hex: "aa", size: 1 })),
    tap((simulation) => {
      viaClick = textOf(byTestId(simulation.html, "inspector") ?? {})
    }),
  )
  scene(
    { update, view },
    given({ ...model, focus: Focus.Mark({ col, row: 0 }) }),
    keydown(testId("trunk-canvas"), "Enter"),
    Command.resolve(LoadBody, Message.SucceededLoadBody({ address, hex: "aa", size: 1 })),
    tap((simulation) => {
      viaKey = textOf(byTestId(simulation.html, "inspector") ?? {})
    }),
  )
  expect(viaClick).toContain(address.slice(0, 8))
  expect(viaKey, "two input paths, one law").toBe(viaClick)
})

// ---------------------------------------------------------------- L-Y3

test("the canvas is focusable and labelled; the marks are hidden from the tree", () => {
  const model = goldenModel()
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      const canvas = byTestId(simulation.html, "trunk-canvas")
      expect(canvas).not.toBeNull()
      expect(String(attrsOf(canvas ?? {})["tabindex"]), "reachable by keyboard").toBe("0")
      const label = String(attrsOf(canvas ?? {})["aria-label"] ?? "")
      expect(label, "N1/N5 reach the tree").toContain(STORE)
      expect(label).toContain(`mark ${String(model.trunk.mark)}`)
      const camera = byTestId(simulation.html, "camera")
      expect(String(attrsOf(camera ?? {})["aria-hidden"]), "the LIST is the register").toBe("true")
    }),
  )
})

// ---------------------------------------------------------------- L-Y4

test("the focused cell is visible: the ring rides focus", () => {
  const model = goldenModel()
  scene(
    { update, view },
    given(model),
    tap((simulation) => {
      expect(ringsIn(simulation.html), "no focus, no ring").toBe(0)
    }),
  )
  scene(
    { update, view },
    given({ ...model, focus: Focus.Mark({ col: laneIndex("value"), row: 20 }) }),
    tap((simulation) => {
      expect(ringsIn(simulation.html), "focus draws the ring").toBeGreaterThan(0)
    }),
  )
})

test("focus survives growth", () => {
  const model: AppModel = {
    ...goldenModel(),
    focus: Focus.Mark({ col: laneIndex("value"), row: 20 }),
  }
  const grown = update(
    model,
    Message.SucceededPullHistory({ body: syntheticPage(model.trunk.mark, 5, [83]) }),
  ).model
  expect(grown.trunk.status._tag).toBe("Live")
  // non-triviality guard (degenerate probe): the growth must have FOLDED
  expect(grown.trunk.mark, "the page actually landed").toBe(model.trunk.mark + 5)
  expect(grown.focus, "the poll must not steal the keyboard user's place").toStrictEqual(
    model.focus,
  )
})
