/**
 * HARNESS VALIDATION for the S3b battery — not a contract case, and
 * counted separately. GREEN today.
 *
 * Packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 *
 * This file imports NOTHING under S3b contract (`src/trunk/app.ts`,
 * `src/trunk/view.ts` do not exist and are not named here). It proves
 * the battery's devices sound, so a failure the implementer sees in the
 * battery is a contract failure and never a harness bug:
 *
 *   1. the MEMO DEVICE — foldkit's `scene` uses one dispatch per run
 *      and a singleton builder, so a `createLazy` slot with a stable fn
 *      and `===`-stable args memo-hits across steps. view-memo.test.ts
 *      rests on exactly this.
 *   2. the VNODE WALKERS — the shape scene renders (sel / data.attrs /
 *      data.class / data.ns / children / text) is what app-harness.ts
 *      walks; the SVG namespace propagates through a lazy group.
 *   3. the CANONICAL COMPARISON — `linesOfCanonical` reads the engine's
 *      pinned byte format (S3a §5) into the same quadruples `quadOf`
 *      reads off a rendered rect.
 *   4. the STUB SERVER — a real listener that records requests and
 *      answers from a table; the dead base refuses connections.
 */
import { Option } from "effect"
import { createLazy } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"
import { getByTestId, given, scene, tap } from "foldkit/scene"
import { expect, test } from "vitest"

import { canonicalRects, place, GOLDEN_DPRS } from "../place.ts"
import { initialDoi, placementOf } from "../placement.ts"
import { foldDocument } from "../fold.ts"
import { emptyModel } from "../model.ts"
import { loadWhole } from "./harness.ts"
import {
  allNodes,
  attrsOf,
  byTestId,
  bySel,
  classesOf,
  deadBase,
  linesOfCanonical,
  quadOf,
  startStub,
  styleOf,
  textOf,
  type VNodeShape,
} from "./app-harness.ts"

// A scratch view shaped like the trunk's: svg > camera g > lazy column
// group > rects. It is NOT the contracted view — it exists to pin the
// devices.
interface ScratchModel {
  readonly n: number
  readonly cameraY: number
}
interface ScratchMessage {
  readonly _tag: "Poked"
}

const lazySlot = createLazy()

const scratchColumn = (n: number, h: HtmlBuilder<ScratchMessage>): Html =>
  h.g([h.DataAttribute("testid", "column-3")], [
    h.rect(
      [
        h.X("36"), h.Y(String(-15 * n)), h.Width("12"), h.Height("12"),
        h.Class("mark tint-2"), h.OnClick({ _tag: "Poked" }),
      ],
      [],
    ),
  ])

const scratchView = (model: ScratchModel, h: HtmlBuilder<ScratchMessage>): Html =>
  h.svg([h.DataAttribute("testid", "trunk-canvas"), h.Attribute("tabindex", "0")], [
    h.g(
      [
        h.DataAttribute("testid", "camera"),
        h.Transform(`translate(0 ${String(model.cameraY)}) scale(1)`),
      ],
      [lazySlot(scratchColumn, [model.n, h])],
    ),
    h.p(
      [h.DataAttribute("testid", "face"), h.Style({ left: "36px" })],
      [`mark ${String(model.n)}`, " · stale"],
    ),
  ])

const scratchUpdate = (model: ScratchModel, _message: ScratchMessage) => ({ model })

const grab = (out: Array<VNodeShape | null>) =>
  tap<ScratchModel, ScratchMessage>((simulation) => {
    out.push(Option.getOrNull(getByTestId("column-3")(simulation.html)))
  })

test("the memo device holds: stable fn + stable args memo-hit across scene steps", () => {
  const grabbed: Array<VNodeShape | null> = []
  scene(
    { update: scratchUpdate, view: scratchView },
    given({ n: 7, cameraY: 0 }),
    grab(grabbed),
    // camera-only change: the lazy args (n, builder) are unchanged
    given({ n: 7, cameraY: 150 }),
    grab(grabbed),
    // the argument changes: the group must be rebuilt
    given({ n: 8, cameraY: 150 }),
    grab(grabbed),
  )
  expect(grabbed[0]).not.toBeNull()
  expect(grabbed[0], "equal args (camera moved): same VNode reference").toBe(grabbed[1])
  expect(grabbed[1], "changed arg: a new VNode").not.toBe(grabbed[2])
})

test("the walkers read what scene renders: attrs, classes, namespace, text, quads", () => {
  scene(
    { update: scratchUpdate, view: scratchView },
    given({ n: 2, cameraY: 0 }),
    tap((simulation) => {
      const root = Option.getOrThrow(getByTestId("trunk-canvas")(simulation.html))
      expect(root.sel).toBe("svg")
      expect(root.data?.ns, "foldkit stamps the SVG namespace").toBe("http://www.w3.org/2000/svg")

      const camera = byTestId(root, "camera")
      expect(camera).not.toBeNull()
      expect(attrsOf(camera ?? {})["transform"]).toBe("translate(0 0) scale(1)")

      const rects = bySel(root, "rect")
      expect(rects).toHaveLength(1)
      const rect = rects[0] ?? {}
      expect(rect.data?.ns, "the namespace reaches a rect inside a lazy group").toBe(
        "http://www.w3.org/2000/svg",
      )
      expect(quadOf(rect)).toStrictEqual(["36", "-30", "12", "12"])
      expect(classesOf(rect)).toStrictEqual(["mark", "tint-2"])
      expect(typeof rect.data?.on?.["click"], "the click handler is attached").toBe("function")

      const face = byTestId(root, "face")
      expect(textOf(face ?? {})).toBe("mark 2 · stale")
      expect(styleOf(face ?? {})["left"], "inline style is walkable").toBe("36px")
      expect(allNodes(root).length).toBeGreaterThanOrEqual(4)
    }),
  )
})

test("linesOfCanonical reads the engine's pinned format into rect quadruples", () => {
  const trunk = foldDocument(emptyModel, loadWhole())
  const viewport = { widthCss: 507, heightCss: 660, originYCss: -660 }
  for (const dpr of GOLDEN_DPRS) {
    const rects = place(placementOf(trunk, initialDoi), viewport, dpr)
    const canonical = canonicalRects(rects, viewport, dpr)
    const quads = linesOfCanonical(canonical)
    expect(quads).toHaveLength(rects.length)
    quads.forEach((quad, index) => {
      const rect = rects[index]
      expect(quad).toStrictEqual([
        String(rect?.x), String(rect?.y), String(rect?.w), String(rect?.h),
      ])
    })
  }
})

test("the stub server records the request and answers the table", async () => {
  const stub = await startStub((request) =>
    request.url.startsWith("/history")
      ? { status: 200, body: JSON.stringify({ next: 0, word: [] }) }
      : { status: 404, body: JSON.stringify({ refused: true }) },
  )
  try {
    const answered = await fetch(`${stub.base}/history?since=0`)
    expect(answered.status).toBe(200)
    expect(await answered.json()).toStrictEqual({ next: 0, word: [] })
    const missed = await fetch(`${stub.base}/elsewhere`)
    expect(missed.status).toBe(404)
    expect(stub.requests.map((request) => request.url)).toStrictEqual([
      "/history?since=0",
      "/elsewhere",
    ])
    expect(stub.requests[0]?.method).toBe("GET")
  } finally {
    await stub.close()
  }
})

test("the dead base refuses connections — the Unreachable arm has a witness", async () => {
  const base = await deadBase()
  await expect(fetch(`${base}/history?since=0`)).rejects.toThrow()
})
