/**
 * BATTERY — S3a, the trunk engine. Laws L-F1..L-F10.
 *
 * Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`.
 * Written by the BREAKER before `src/trunk/fold.ts` exists; RED by
 * construction. Read-only to the implementer.
 */
import { expect, test } from "vitest"

import { KindTagRows } from "../generated/kindTags.ts"
import {
  concatReference,
  expectValid,
  forAll,
  loadMarks,
  loadPages,
  loadWhole,
  syntheticPage,
  totalOf,
  type History,
  type ModelShape,
} from "./fixtures/harness.ts"
import { concatPages, foldPage } from "./fold.ts"
import { emptyModel, K_CARRIER, laneIndex, laneOfTag, LANES, type Model } from "./model.ts"

const valid = (model: ModelShape): void => {
  expectValid(model, LANES.length, K_CARRIER, laneOfTag, LANES)
}

const foldAll = (pages: ReadonlyArray<History>): Model => {
  let model = emptyModel
  for (const page of pages) {
    model = foldPage(model, page)
    valid(model)
  }
  return model
}

const split = (history: History, at: number): readonly [History, History] => [
  { next: at, word: history.word.slice(0, at) },
  { next: history.next, word: history.word.slice(at) },
]

// ------------------------------------------------------------- L-F1

test("L-F1 incremental equals fresh, on the recorded pages", () => {
  const incremental = foldAll(loadPages())
  const fresh = foldPage(emptyModel, loadWhole())
  valid(fresh)
  expect(totalOf(fresh), "and not vacuously — 220 receipts were folded").toBe(220)
  expect(incremental).toStrictEqual(fresh)
})

test("L-F1 incremental equals fresh, at every split point", () => {
  const whole = loadWhole()
  const fresh = foldPage(emptyModel, whole)
  forAll(
    (draw) => draw.int(0, whole.word.length),
    120,
    (at) => {
      const [left, right] = split(whole, at)
      expect(concatPages(left, right), "concatPages is the word's own append")
        .toStrictEqual(concatReference(left, right))
      const incremental = foldPage(foldPage(emptyModel, left), right)
      valid(incremental)
      expect(incremental).toStrictEqual(fresh)
    },
  )
})

test("L-F1 incremental equals fresh across three pages, past the carrier bound", () => {
  // Every column of the recorded word is shallower than K_CARRIER, so a
  // merge that forgets to re-apply lastK survives it. This feeds one
  // lane 3 * 400 receipts so the bound actually bites.
  const tags = [8]
  const pages = [0, 400, 800].map((from) => syntheticPage(from, 400, tags))
  const incremental = foldAll(pages)
  const whole = pages.reduce((left, right) => concatReference(left, right))
  const fresh = foldPage(emptyModel, whole)
  valid(fresh)
  expect(incremental).toStrictEqual(fresh)
  expect(incremental.columns[laneIndex("chunk")]?.tail).toHaveLength(K_CARRIER)
})

// ------------------------------------------------------------- L-F2

test("L-F2 re-delivering a page immediately changes nothing", () => {
  for (const page of loadPages()) {
    const once = foldPage(emptyModel, page)
    const twice = foldPage(once, page)
    valid(twice)
    expect(totalOf(once), "the page was actually folded").toBe(page.word.length)
    expect(twice).toStrictEqual(once)
  }
})

test("L-F2 re-delivering an older page never adds a receipt", () => {
  const pages = loadPages()
  const settled = foldAll(pages)
  const before = totalOf(settled)
  expect(before, "the whole word is in").toBe(220)
  for (const page of pages) {
    const again = foldPage(settled, page)
    valid(again)
    expect(totalOf(again), "an already-folded page contributes nothing")
      .toBeLessThanOrEqual(before)
  }
})

test("L-F2 a half-overlapping page folds only its new suffix", () => {
  // `overlapping` carries seqs 76..83 with next 84, delivered at mark 80:
  // four receipts are replay and four are new. An unguarded fold reaches
  // 88; the seq guard reaches 84.
  const pages = loadPages()
  const first = pages[0]
  const overlapping = loadMarks()["overlapping"]
  expect(first).toBeDefined()
  expect(overlapping).toBeDefined()
  if (first === undefined || overlapping === undefined) return

  const atEighty = foldPage(emptyModel, first)
  expect(totalOf(atEighty)).toBe(80)
  const folded = foldPage(atEighty, overlapping)
  valid(folded)
  expect(totalOf(folded), "the four replayed receipts are dropped").toBe(84)
  expect(folded.mark).toBe(84)
})

// ------------------------------------------------------------- L-F3

test("L-F3 the mark is the page's next, never a receipt's seq", () => {
  expect(foldPage(emptyModel, loadWhole()).mark).toBe(220)
  let model = emptyModel
  for (const [index, page] of loadPages().entries()) {
    model = foldPage(model, page)
    expect(model.mark, `page ${index}`).toBe(page.next)
  }
  const marks = loadMarks()
  const atTip = marks["emptyAtTip"]
  const midWord = marks["emptyMidWord"]
  if (atTip === undefined || midWord === undefined) throw new Error("missing fixture")
  expect(foldPage(model, atTip).mark, "an empty page still teaches the mark").toBe(220)
  expect(foldPage(emptyModel, midWord).mark).toBe(80)
})

test("L-F3 a truncation moves the mark BACKWARDS", () => {
  // `Math.max(mark, next)` dies here. The store's word is shorter than
  // this session's mark; `next` is still the only source of the mark.
  const settled = foldPage(emptyModel, loadWhole())
  expect(settled.mark).toBe(220)
  const truncated = loadMarks()["truncated"]
  if (truncated === undefined) throw new Error("missing truncated document")
  const after = foldPage(settled, truncated)
  valid(after)
  expect(after.mark, "the mark follows next, downwards").toBe(7)
})

test("OPEN-1 a backwards mark never double-counts what follows it", () => {
  // The packet's OPEN-1: refusing the truncation and resetting on it are
  // both admissible and unruled. This case pins only what BOTH satisfy
  // and what count honesty licenses alone — the naive third behaviour
  // (take the mark, keep the columns, refold the next page) reaches 293
  // and plants duplicate seqs in the tails.
  const marks = loadMarks()
  const truncated = marks["truncated"]
  const first = loadPages()[0]
  if (truncated === undefined || first === undefined) throw new Error("missing fixture")

  const settled = foldPage(emptyModel, loadWhole())
  expect(totalOf(settled), "the fold does something before the rewind").toBe(220)
  const rewound = foldPage(settled, truncated)
  const refolded = foldPage(rewound, first)
  valid(refolded)
  expect(totalOf(refolded), "no receipt is counted twice").toBeLessThanOrEqual(220)
})

// ------------------------------------------------------------- L-F4

test("L-F4 every receipt lands in exactly one lane", () => {
  const whole = loadWhole()
  const model = foldPage(emptyModel, whole)
  valid(model)

  const expected = new Map<string, number>(LANES.map((lane) => [lane, 0]))
  for (const receipt of whole.word) {
    const lane = laneOfTag(receipt.tag)
    expected.set(lane, (expected.get(lane) ?? 0) + 1)
  }
  LANES.forEach((lane, index) => {
    expect(model.columns[index]?.count, lane).toBe(expected.get(lane))
  })
  expect(totalOf(model), "sum of the column counts is the word's length").toBe(220)
  expect(model.columns[laneIndex("unregistered")]?.count, "0xc8 twice and 0x2a once").toBe(3)
})

test("L-F4 an unregistered tag surfaces, it is never dropped", () => {
  const stranger = syntheticPage(0, 3, [200])
  const model = foldPage(emptyModel, stranger)
  valid(model)
  expect(totalOf(model)).toBe(3)
  expect(model.columns[laneIndex("unregistered")]?.count).toBe(3)
  for (const row of KindTagRows) {
    expect(model.columns[laneIndex(row.name)]?.count, `${row.name} stays empty`).toBe(0)
  }
})
