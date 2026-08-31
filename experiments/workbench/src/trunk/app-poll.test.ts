/**
 * S3b BATTERY — the poll loop, refusals, epochs and input (L-B3, L-B4,
 * L-B6, L-B7, L-B8).
 *
 * Contract packet: `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 * Written by the breaker BEFORE the implementation exists; red at
 * COLLECTION today because `./app.ts` does not exist. Read-only to the
 * implementer.
 */
import { expect, test } from "vitest"

import {
  BACKOFF_MS,
  Focus,
  Message,
  POLL_MS,
  PullRefusal,
  effectiveFloor,
  epochOf,
  initialApp,
  update,
  type AppModel,
} from "./app.ts"
import { laneIndex, type Receipt } from "./model.ts"
import { DRIFT_CSS, terminators } from "./place.ts"
import { loadMarks, loadWhole } from "./fixtures/harness.ts"

const BOOT = { widthCss: 507, heightCss: 660, dpr: 1, theme: "light" }

const app0 = (): AppModel => initialApp("http://127.0.0.1:7101", BOOT)

const liveApp = (): AppModel =>
  update(app0(), Message.SucceededPullHistory({ body: loadWhole() })).model

const commandsOf = (
  result: Readonly<{ commands?: ReadonlyArray<Readonly<{ name: string; args?: unknown }>> }>,
): ReadonlyArray<Readonly<{ name: string; args?: unknown }>> => result.commands ?? []

/** The address the carrier holds for an individuated (col, row) cell. */
const addressAt = (app: AppModel, col: number, row: number): string => {
  const column = app.trunk.columns[col]
  if (column === undefined) throw new Error(`no column ${String(col)}`)
  const receipt: Receipt | undefined = column.tail[row - (column.count - column.tail.length)]
  if (receipt === undefined) throw new Error(`row ${String(row)} is not held`)
  return receipt.address
}

// ---------------------------------------------------------------- L-B3

test("a transport refusal backs off, keeps every column by reference, and surfaces the fix", () => {
  const live = liveApp()
  const refused = update(
    live,
    Message.RefusedPullHistory({ refusal: PullRefusal.Forbidden() }),
  ).model
  expect(refused.trunk.status._tag).toBe("Refused")
  expect(refused.trunk.columns, "the placement is kept, not cleared").toBe(live.trunk.columns)
  expect(refused.trunk.mark).toBe(live.trunk.mark)
  expect(refused.pollMs).toBe(BACKOFF_MS)
  const reason =
    refused.trunk.status._tag === "Refused" ? refused.trunk.status.reason : ""
  expect(reason, "the Forbidden arm names the operator's fix").toContain("--allow-origin")
})

test("a malformed page refuses through the door and backs off the poll", () => {
  const live = liveApp()
  const refused = update(live, Message.SucceededPullHistory({ body: "<!doctype html>" })).model
  expect(refused.trunk.status._tag).toBe("Refused")
  expect(refused.trunk.columns).toBe(live.trunk.columns)
  expect(refused.trunk.mark).toBe(live.trunk.mark)
  expect(refused.pollMs).toBe(BACKOFF_MS)
})

test("a success restores the cadence", () => {
  const backedOff = update(
    liveApp(),
    Message.RefusedPullHistory({ refusal: PullRefusal.Unreachable({ detail: "down" }) }),
  ).model
  expect(backedOff.pollMs).toBe(BACKOFF_MS)
  const recovered = update(
    backedOff,
    Message.SucceededPullHistory({ body: { next: backedOff.trunk.mark, word: [] } }),
  ).model
  expect(recovered.trunk.status._tag).toBe("Live")
  expect(recovered.pollMs).toBe(POLL_MS)
})

// ---------------------------------------------------------------- L-B4

test("a backwards next surfaces truncation and only an explicit reset clears it", () => {
  const live = liveApp()
  const truncated = update(live, Message.SucceededPullHistory({ body: loadMarks()["truncated"] })).model
  expect(truncated.trunk.status._tag).toBe("Refused")
  expect(truncated.trunk.columns, "columns survive the repair signature").toBe(live.trunk.columns)
  const reset = update(truncated, Message.ClickedReset())
  expect(reset.model.trunk.mark).toBe(0)
  expect(reset.model.trunk.status._tag).toBe("Idle")
  expect(reset.model.trunk.columns.every((column) => column.count === 0)).toBe(true)
  const commands = commandsOf(reset)
  expect(commands.map((command) => command.name)).toStrictEqual(["PullHistory"])
  expect(commands[0]?.args, "the reset refolds from zero").toStrictEqual({ since: 0 })
})

test("no message but reset ever discards columns", () => {
  const live = liveApp()
  const total = live.trunk.columns.reduce((sum, column) => sum + column.count, 0)
  const messages: ReadonlyArray<Message> = [
    Message.TickedPoll(),
    Message.RefusedPullHistory({ refusal: PullRefusal.NoRoute() }),
    Message.RefusedPullHistory({ refusal: PullRefusal.Status({ status: 500 }) }),
    Message.SucceededPullHistory({ body: "garbage" }),
    Message.SucceededPullHistory({ body: loadMarks()["truncated"] }),
    Message.Scrolled({ originYCss: -100 }),
    Message.Resized({ widthCss: 800, heightCss: 500 }),
    Message.ChangedDpr({ dpr: 2 }),
    Message.ChangedTheme({ theme: "dark" }),
    Message.PressedKey({ key: "ArrowUp" }),
    Message.ClickedRun({ col: 14, fromRow: 0, count: 55 }),
    Message.RefusedLoadBody({ address: "00".repeat(32), refusal: PullRefusal.NoRoute() }),
  ]
  let app = live
  let sawRefusal = false
  for (const message of messages) {
    app = update(app, message).model
    const kept = app.trunk.columns.reduce((sum, column) => sum + column.count, 0)
    expect(kept, `columns survive ${JSON.stringify(message)}`).toBe(total)
    sawRefusal = sawRefusal || app.trunk.status._tag === "Refused"
  }
  // non-triviality guard (degenerate probe): an identity update also
  // keeps columns; the sequence must have actually been PROCESSED
  expect(sawRefusal, "the refusing messages really refused").toBe(true)
  expect(app.epoch.dpr, "the epoch messages really landed").toBe(2)
  expect(app.epoch.theme).toBe("dark")
})

// ---------------------------------------------------------------- L-B6

test("scroll below the drift moves only the live origin; at the drift the epoch follows", () => {
  const live = liveApp()
  const originY = live.epoch.originYCss
  const small = update(
    live,
    Message.Scrolled({ originYCss: originY + (DRIFT_CSS - 1) }),
  ).model
  expect(small.liveOriginYCss).toBe(originY + DRIFT_CSS - 1)
  expect(small.epoch.originYCss, "199 css px is not a drift").toBe(originY)
  expect(terminators(epochOf(live), epochOf(small), small.trunk)).toStrictEqual([])
  const drifted = update(
    live,
    Message.Scrolled({ originYCss: originY - DRIFT_CSS }),
  ).model
  expect(drifted.liveOriginYCss).toBe(originY - DRIFT_CSS)
  expect(drifted.epoch.originYCss, "200 css px is").toBe(originY - DRIFT_CSS)
  expect(terminators(epochOf(live), epochOf(drifted), drifted.trunk)).toContain("scroll-drift")
})

test("dpr, theme and resize move the epoch by their own message only", () => {
  const live = liveApp()
  const dpr = update(live, Message.ChangedDpr({ dpr: 2 })).model
  expect(dpr.epoch.dpr).toBe(2)
  expect(dpr.epoch.theme).toBe(live.epoch.theme)
  expect(dpr.epoch.widthCss).toBe(live.epoch.widthCss)
  expect(terminators(epochOf(live), epochOf(dpr), dpr.trunk)).toStrictEqual(["dpr"])
  const theme = update(live, Message.ChangedTheme({ theme: "dark" })).model
  expect(terminators(epochOf(live), epochOf(theme), theme.trunk)).toStrictEqual(["theme"])
  const resized = update(live, Message.Resized({ widthCss: 900, heightCss: 700 })).model
  expect(resized.epoch.widthCss).toBe(900)
  expect(resized.epoch.heightCss).toBe(700)
  expect(resized.epoch.dpr).toBe(live.epoch.dpr)
  expect(terminators(epochOf(live), epochOf(resized), resized.trunk)).toContain("resize")
})

// ---------------------------------------------------------------- L-B7

test("clicking a mark selects it and asks for its body; a stale body answer is dropped", () => {
  const live = liveApp()
  const col = laneIndex("value")
  const column = live.trunk.columns[col]
  const row = (column?.count ?? 1) - 1
  const address = addressAt(live, col, row)
  const clicked = update(live, Message.ClickedMark({ col, row, address }))
  expect(clicked.model.selection._tag).toBe("Mark")
  expect(clicked.model.body._tag).toBe("Loading")
  const commands = commandsOf(clicked)
  expect(commands.map((command) => command.name)).toStrictEqual(["LoadBody"])
  expect(commands[0]?.args).toStrictEqual({ address })
  // supersede the selection, then let the FIRST body answer arrive late
  const other = addressAt(live, col, row - 1)
  const moved = update(clicked.model, Message.ClickedMark({ col, row: row - 1, address: other })).model
  const stale = update(moved, Message.SucceededLoadBody({ address, hex: "aa", size: 1 })).model
  expect(stale.body._tag, "a stale answer changes nothing").toBe("Loading")
  const fresh = update(moved, Message.SucceededLoadBody({ address: other, hex: "bb", size: 2 })).model
  expect(fresh.body._tag).toBe("Loaded")
})

test("clicking a strip selects the run and asks for nothing", () => {
  const live = liveApp()
  const clicked = update(live, Message.ClickedRun({ col: 14, fromRow: 0, count: 55 }))
  expect(clicked.model.selection._tag).toBe("Run")
  expect(commandsOf(clicked), "there is no ranged read to serve it").toHaveLength(0)
})

// ---------------------------------------------------------------- L-B8

test("arrow keys move focus over the square lattice, clamped", () => {
  const live = liveApp()
  // from None, an arrow focuses the tip of the first non-empty lane
  const first = update(live, Message.PressedKey({ key: "ArrowRight" })).model
  expect(first.focus._tag).toBe("Mark")
  const schemaCol = laneIndex("schema")
  const schemaCount = live.trunk.columns[schemaCol]?.count ?? 0
  expect(first.focus).toStrictEqual(Focus.Mark({ col: schemaCol, row: schemaCount - 1 }))
  // ArrowUp clamps at the tip
  const up = update(first, Message.PressedKey({ key: "ArrowUp" })).model
  expect(up.focus).toStrictEqual(first.focus)
  // ArrowDown walks toward the floor and clamps there
  const chunkCol = laneIndex("chunk")
  const chunk = live.trunk.columns[chunkCol]
  const chunkFloor = effectiveFloor(
    chunk ?? { count: 0, tailRevision: -1, tail: [] },
    live.doi.floor[chunkCol] ?? 0,
  )
  const atFloor = { ...live, focus: Focus.Mark({ col: chunkCol, row: chunkFloor }) }
  const below = update(atFloor, Message.PressedKey({ key: "ArrowDown" })).model
  expect(below.focus, "focus never enters a strip row").toStrictEqual(atFloor.focus)
  const above = update(atFloor, Message.PressedKey({ key: "ArrowUp" })).model
  expect(above.focus).toStrictEqual(Focus.Mark({ col: chunkCol, row: chunkFloor + 1 }))
})

test("enter on the focused square is the click, exactly", () => {
  const live = liveApp()
  const col = laneIndex("value")
  const row = (live.trunk.columns[col]?.count ?? 1) - 1
  const address = addressAt(live, col, row)
  const focused = { ...live, focus: Focus.Mark({ col, row }) }
  const viaKey = update(focused, Message.PressedKey({ key: "Enter" }))
  const viaClick = update(focused, Message.ClickedMark({ col, row, address }))
  expect(viaKey.model, "same model transition").toStrictEqual(viaClick.model)
  expect(
    commandsOf(viaKey).map((command) => ({ name: command.name, args: command.args })),
    "same commands",
  ).toStrictEqual(commandsOf(viaClick).map((command) => ({ name: command.name, args: command.args })))
})
