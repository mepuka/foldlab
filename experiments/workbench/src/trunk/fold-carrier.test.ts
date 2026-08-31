/**
 * BATTERY — S3a, the trunk engine. Laws L-F5..L-F10 (the memo law, the
 * memory law, fail-closed refusal, the four states, non-mutation, and
 * the carrier invariant under an arbitrary fold sequence).
 *
 * Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`.
 * Written by the BREAKER before `src/trunk/fold.ts` exists; RED by
 * construction. Read-only to the implementer.
 */
import { expect, test } from "vitest"

import { GrammarKindTags } from "../generated/kindTags.ts"
import {
  expectValid,
  forAll,
  loadMarks,
  loadPages,
  loadWhole,
  receiptsHeld,
  syntheticPage,
  totalOf,
  type History,
  type ModelShape,
} from "./fixtures/harness.ts"
import { decodeHistory, foldDocument, foldPage } from "./fold.ts"
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

/** The `createLazy` argument pair the packet pins: (count, tailRevision). */
const memoKey = (model: Model, index: number): string => {
  const column = model.columns[index]
  if (column === undefined) throw new Error("missing column")
  return `${column.count}:${column.tailRevision}`
}

/** One fold step, checked for the memo law. Lifted out of the loop so
 * the closure captures nothing that moves. */
const expectKeyTracksSnapshot = (before: Model, after: Model): void => {
  LANES.forEach((lane, index) => {
    const sameSnapshot = after.columns[index] === before.columns[index]
    const sameKey = memoKey(after, index) === memoKey(before, index)
    expect(sameKey, `${lane}: key and snapshot must move together`).toBe(sameSnapshot)
  })
}

// ------------------------------------------------------------- L-F5

test("L-F5 a fold touching one lane leaves every other snapshot ===", () => {
  const settled = foldPage(emptyModel, loadWhole())
  const touched = laneIndex("chunk")
  const after = foldPage(settled, syntheticPage(220, 5, [8]))
  valid(after)

  after.columns.forEach((column, index) => {
    if (index === touched) {
      expect(column, `${LANES[index]} was touched`).not.toBe(settled.columns[index])
    } else {
      expect(column, `${LANES[index]} was not touched, so the memo must hit`)
        .toBe(settled.columns[index])
    }
  })
})

test("L-F5 an empty page leaves every snapshot ===", () => {
  const settled = foldPage(emptyModel, loadWhole())
  const after = foldPage(settled, { next: 220, word: [] })
  after.columns.forEach((column, index) => {
    expect(column, `${LANES[index]}`).toBe(settled.columns[index])
  })
})

test("L-F5 the memo key changes exactly when the snapshot does", () => {
  let model = emptyModel
  for (const page of loadPages()) {
    const before = model
    model = foldPage(model, page)
    valid(model)
    expectKeyTracksSnapshot(before, model)
  }
})

// ------------------------------------------------------------- L-F6

test("L-F6 the model is bounded by f(k, lanes) after 100000 receipts", () => {
  const tags = [...GrammarKindTags, 200, 42]
  let model = emptyModel
  let fedBytes = 0
  for (let page = 0; page < 100; page += 1) {
    const document = syntheticPage(page * 1000, 1000, tags)
    fedBytes += JSON.stringify(document).length
    model = foldPage(model, document)
  }
  valid(model)

  expect(totalOf(model), "every receipt was counted").toBe(100_000)
  expect(receiptsHeld(model), "at most k receipts per lane")
    .toBeLessThanOrEqual(LANES.length * K_CARRIER)
  for (const column of model.columns) {
    expect(column.tail.length, "lastK_length: an equation, not a bound")
      .toBe(Math.min(column.count, K_CARRIER))
  }
  const held = JSON.stringify(model).length
  expect(held, "the ceiling B derived in the packet").toBeLessThanOrEqual(1_400_000)
  expect(held, "the model is not a store mirror").toBeLessThan(fedBytes / 10)
})

// ------------------------------------------------------------- L-F7

test("L-F7 a malformed document is refused at the door", () => {
  expect(decodeHistory({})._tag, "no next").toBe("Malformed")
  expect(decodeHistory({ next: 5 })._tag, "no word").toBe("Malformed")
  expect(decodeHistory({ next: 5, word: "nope" })._tag, "word is not an array").toBe("Malformed")
  expect(decodeHistory({ next: -1, word: [] })._tag, "next is not a mark").toBe("Malformed")
  expect(decodeHistory(loadMarks()["outOfOrder"])._tag, "seqs out of order").toBe("Malformed")
  expect(
    decodeHistory({
      next: 1,
      word: [{ address: "not hex", at: 1, seq: 0, size: 1, tag: 1 }],
    })._tag,
    "the address is not 64 lowercase hex",
  ).toBe("Malformed")
  expect(decodeHistory(loadWhole())._tag, "and the real thing is accepted").toBe("Accepted")
})

test("L-F7 a refusal moves neither the mark nor a single column", () => {
  const settled = foldPage(emptyModel, loadWhole())
  const refused = foldDocument(settled, { next: 5, word: "nope" })
  expect(refused.status._tag).toBe("Refused")
  expect(refused.mark, "the mark did not move").toBe(settled.mark)
  refused.columns.forEach((column, index) => {
    expect(column, `${LANES[index]} is reference-identical`).toBe(settled.columns[index])
  })
})

// ------------------------------------------------------------- L-F8

test("L-F8 refusal is a distinct fact from never having asked", () => {
  const refused = foldDocument(emptyModel, { nonsense: true })
  expect(refused.status._tag).toBe("Refused")
  expect(emptyModel.status._tag).toBe("Idle")
  expect(refused.status).not.toStrictEqual(emptyModel.status)
  if (refused.status._tag === "Refused") {
    expect(refused.status.reason.length, "a refusal carries its reason").toBeGreaterThan(0)
  }
})

test("L-F8 folding a good page produces Live, never Idle or Loading", () => {
  let model = emptyModel
  for (const page of loadPages()) {
    model = foldPage(model, page)
    expect(model.status._tag).toBe("Live")
  }
  expect(foldDocument(emptyModel, loadWhole()).status._tag).toBe("Live")
})

// ------------------------------------------------------------- L-F9

test("L-F9 folding does not mutate the model it was given", () => {
  const settled = foldPage(emptyModel, loadWhole())
  const snapshot = JSON.parse(JSON.stringify(settled))
  const columns = [...settled.columns]
  foldPage(settled, syntheticPage(220, 50, [8, 14, 200]))
  expect(JSON.parse(JSON.stringify(settled)), "the argument is unchanged")
    .toStrictEqual(snapshot)
  settled.columns.forEach((column, index) => {
    expect(column, "no snapshot object was replaced in place").toBe(columns[index])
  })
})

// ------------------------------------------------------------ L-F10

test("L-F10 the carrier invariant survives an arbitrary fold sequence", () => {
  const tags = [...GrammarKindTags, 200, 42]
  forAll(
    (draw) => {
      const pages: Array<History> = []
      let from = 0
      const count = draw.int(1, 6)
      for (let i = 0; i < count; i += 1) {
        const size = draw.int(0, 300)
        pages.push(syntheticPage(from, size, tags))
        from += size
      }
      return pages
    },
    60,
    (pages) => {
      const model = foldAll(pages)
      expect(totalOf(model)).toBe(pages.reduce((sum, page) => sum + page.word.length, 0))
    },
  )
})
