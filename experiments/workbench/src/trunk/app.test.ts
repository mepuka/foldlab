/**
 * S3b BATTERY — the app's state machine (L-B1, L-B2, L-B5, L-B9,
 * L-B10, L-B11).
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * Written by the breaker BEFORE the implementation exists; red at
 * COLLECTION today because `./app.ts` does not exist. Read-only to the
 * implementer.
 */
import { readFileSync } from "node:fs"
import { expect, test } from "vitest"

import {
  CUT_SLACK,
  Message,
  POLL_MS,
  epochOf,
  initialApp,
  needsCut,
  update,
  type AppModel,
} from "./app.ts"
import { foldDocument } from "./fold.ts"
import { K_CARRIER, LANES, WINDOW, emptyModel, laneOfTag, totalCount } from "./model.ts"
import { cutDoi, initialDoi } from "./placement.ts"
import { expectValid, forAll, loadMarks, loadPages, loadWhole, syntheticPage } from "./fixtures/harness.ts"

const BOOT = { widthCss: 507, heightCss: 660, dpr: 1, theme: "light" }
const STORE = "http://127.0.0.1:7101"

const app0 = (): AppModel => initialApp(STORE, BOOT)

const commandsOf = (
  result: Readonly<{ commands?: ReadonlyArray<Readonly<{ name: string; args?: unknown }>> }>,
): ReadonlyArray<Readonly<{ name: string; args?: unknown }>> => result.commands ?? []

/** Every fold in this battery re-checks the carrier invariant. */
const valid = (model: AppModel): void => {
  expectValid(model.trunk, LANES.length, K_CARRIER, laneOfTag, LANES)
}

// ---------------------------------------------------------------- L-B1

test("the initial app is honest: idle trunk, initial doi, nothing selected", () => {
  const app = app0()
  expect(app.trunk).toStrictEqual(emptyModel)
  expect(app.trunk.status._tag).toBe("Idle")
  expect(app.doi).toStrictEqual(initialDoi)
  expect(app.selection._tag).toBe("None")
  expect(app.focus._tag).toBe("None")
  expect(app.body._tag).toBe("None")
  expect(app.pollMs).toBe(POLL_MS)
  expect(app.store).toBe(STORE)
  expect(app.epoch.originYCss).toBe(-BOOT.heightCss)
  expect(app.liveOriginYCss).toBe(-BOOT.heightCss)
  expect(app.epoch.dpr).toBe(BOOT.dpr)
  valid(app)
})

test("the first tick asks from mark 0 and moves Idle to Loading", () => {
  const result = update(app0(), Message.TickedPoll())
  expect(result.model.trunk.status._tag).toBe("Loading")
  const commands = commandsOf(result)
  expect(commands).toHaveLength(1)
  expect(commands[0]?.name).toBe("PullHistory")
  expect(commands[0]?.args).toStrictEqual({ since: 0 })
})

test("a live trunk never degrades to Loading on a tick", () => {
  const live = update(app0(), Message.SucceededPullHistory({ body: loadWhole() })).model
  expect(live.trunk.status._tag).toBe("Live")
  const ticked = update(live, Message.TickedPoll())
  expect(ticked.model.trunk.status._tag, "the live face does not flicker").toBe("Live")
})

// ---------------------------------------------------------------- L-B9

test("a tick asks exactly from the mark", () => {
  const pages = loadPages()
  let app = app0()
  for (const page of pages) {
    app = update(app, Message.SucceededPullHistory({ body: page })).model
    valid(app)
    const commands = commandsOf(update(app, Message.TickedPoll()))
    expect(commands.map((command) => command.name)).toStrictEqual(["PullHistory"])
    expect(commands[0]?.args, "since is the mark, never a count").toStrictEqual({
      since: app.trunk.mark,
    })
  }
})

// ---------------------------------------------------------------- L-B2

test("the fold is the engine's foldDocument, verbatim", () => {
  const marks = loadMarks()
  const bodies: ReadonlyArray<unknown> = [
    loadWhole(),
    ...loadPages(),
    marks["truncated"],
    marks["outOfOrder"],
    marks["overlapping"],
    // missing word; missing next; negative mark; the non-JSON body the
    // seam passes through; null
    { next: 3 },
    { word: [] },
    { next: -1, word: [] },
    "<!doctype html>",
    null,
    { next: 1, word: [{ address: "zz", at: 1, seq: 0, size: 1, tag: 1 }] },
  ]
  let app = app0()
  for (const body of bodies) {
    const expected = foldDocument(app.trunk, body)
    const next = update(app, Message.SucceededPullHistory({ body })).model
    expect(next.trunk, "the app adds no opinion of its own to the fold").toStrictEqual(expected)
    app = next
  }
})

// ---------------------------------------------------------------- L-B5

test("the cut fires exactly when a column's span exceeds the slack", () => {
  forAll(
    (draw) => draw.int(0, CUT_SLACK * WINDOW + 40),
    30,
    (depth) => {
      const trunk = foldDocument(emptyModel, syntheticPage(0, depth, [8]))
      expect(needsCut(trunk, initialDoi)).toBe(depth > CUT_SLACK * WINDOW)
      // under an already-cut partition the span is WINDOW and no cut fires
      expect(needsCut(trunk, cutDoi(trunk, WINDOW))).toBe(false)
    },
  )
})

test("update cuts through cutDoi and otherwise keeps the doi by reference", () => {
  const app = app0()
  // below the slack: no cut, the doi is the SAME object
  const small = update(app, Message.SucceededPullHistory({ body: syntheticPage(0, 20, [8]) })).model
  expect(small.doi, "no cut below the slack").toBe(app.doi)
  // beyond the slack: the doi is cutDoi(trunk', WINDOW), exactly
  const big = update(app, Message.SucceededPullHistory({ body: syntheticPage(0, 100, [8]) })).model
  expect(needsCut(big.trunk, app.doi)).toBe(true)
  expect(big.doi).toStrictEqual(cutDoi(big.trunk, WINDOW))
  valid(big)
})

// --------------------------------------------------------------- L-B10

test("the app model is bounded: no second store", () => {
  const tags = [1, 8, 9, 10, 11, 12, 13, 14, 15, 65, 71, 73, 81, 82, 83, 200, 42]
  let app = app0()
  for (let page = 0; page < 100; page += 1) {
    app = update(app, Message.SucceededPullHistory({ body: syntheticPage(page * 1000, 1000, tags) })).model
  }
  valid(app)
  expect(totalCount(app.trunk)).toBe(100_000)
  const held = app.trunk.columns.reduce((sum, column) => sum + column.tail.length, 0)
  expect(held).toBeLessThanOrEqual(LANES.length * K_CARRIER)
  const bytes = JSON.stringify(app).length
  expect(bytes, "engine bound plus chrome slack").toBeLessThanOrEqual(1_400_000 + 32_768)
})

// --------------------------------------------------------------- L-B11

test("the app names no ambient global, and fetch lives in the seam module only", () => {
  const appText = readFileSync(new URL("./app.ts", import.meta.url), "utf8")
  const viewText = readFileSync(new URL("./view.ts", import.meta.url), "utf8")
  const forbidden = [
    /\bwindow\b/u,
    /\bdocument\b/u,
    /\bdevicePixelRatio\b/u,
    /\bDate\b/u,
    /\bperformance\b/u,
    /\bMath\.random\b/u,
    /\bglobalThis\b/u,
  ]
  for (const pattern of forbidden) {
    expect(pattern.test(appText), `app.ts must not name ${pattern.source}`).toBe(false)
    expect(pattern.test(viewText), `view.ts must not name ${pattern.source}`).toBe(false)
  }
  expect(/\bfetch\b/u.test(viewText), "the view performs no transport").toBe(false)
  // epochOf projects the model — the engine's terminators see ONLY message-borne facts
  const app = app0()
  const epoch = epochOf(app)
  expect(epoch.viewport).toStrictEqual({
    widthCss: app.epoch.widthCss,
    heightCss: app.epoch.heightCss,
    originYCss: app.epoch.originYCss,
  })
  expect(epoch.dpr).toBe(app.epoch.dpr)
  expect(epoch.theme).toBe(app.epoch.theme)
  expect(epoch.classifierRevision).toBe(0)
  expect(epoch.doi).toStrictEqual(app.doi)
})
