/**
 * BATTERY — S3a, the trunk engine. Laws L-C1..L-C7.
 *
 * Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`.
 * Written by the BREAKER before `src/trunk/placement.ts` exists; RED by
 * construction. Read-only to the implementer.
 */
import { expect, test } from "vitest"

import { GrammarKindTags } from "../generated/kindTags.ts"
import {
  expectValid,
  forAll,
  loadWhole,
  syntheticPage,
  totalOf,
} from "./fixtures/harness.ts"
import { foldPage } from "./fold.ts"
import { emptyModel, K_CARRIER, laneIndex, laneOfTag, LANES, WINDOW, type Model } from "./model.ts"
import {
  cutDoi,
  covered,
  initialDoi,
  opTotal,
  placementOf,
  startRow,
  type Doi,
  type Op,
} from "./placement.ts"

const valid = (model: Model): void => {
  expectValid(model, LANES.length, K_CARRIER, laneOfTag, LANES)
}

const opKey = (op: Op): string =>
  op._tag === "Square"
    ? `S:${op.col}:${op.row}:${op.address}`
    : `T:${op.col}:${op.fromRow}:${op.count}`

/** Every row index an op claims, per column. */
const claims = (ops: ReadonlyArray<Op>): Map<number, Array<number>> => {
  const rows = new Map<number, Array<number>>()
  for (const op of ops) {
    const list = rows.get(op.col) ?? []
    const from = startRow(op)
    for (let r = from; r < from + covered(op); r += 1) list.push(r)
    rows.set(op.col, list)
  }
  return rows
}

const foldedFixture = (): Model => {
  const model = foldPage(emptyModel, loadWhole())
  valid(model)
  return model
}

const tags = [...GrammarKindTags, 200, 42]

/** A model reached by folding a random page chain — the only way a model
 * is reachable at all, so the generator goes through the fold. */
const generatedModel = (draw: { readonly int: (lo: number, hi: number) => number }): Model => {
  let model = emptyModel
  let from = 0
  const pages = draw.int(1, 4)
  for (let i = 0; i < pages; i += 1) {
    const size = draw.int(0, 400)
    model = foldPage(model, syntheticPage(from, size, tags))
    from += size
  }
  return model
}

// ------------------------------------------------------------- L-C1

test("L-C1 the ops cover every row of every column exactly once", () => {
  const model = foldedFixture()
  for (const doi of [initialDoi, cutDoi(model, WINDOW), cutDoi(model, 4)]) {
    const placement = placementOf(model, doi)
    expect(placement.ops.length, "and not vacuously").toBeGreaterThan(0)
    const rows = claims(placement.ops)
    LANES.forEach((lane, col) => {
      const count = model.columns[col]?.count ?? 0
      const claimed = (rows.get(col) ?? []).toSorted((a, b) => a - b)
      expect(claimed, `${lane}: rows 0..count-1, each once`)
        .toStrictEqual(Array.from({ length: count }, (_, r) => r))
    })
  }
})

test("L-C1 coverage holds for every generated model and window", () => {
  forAll(
    (draw) => ({ model: generatedModel(draw), window: draw.int(1, 200) }),
    50,
    ({ model, window }) => {
      const placement = placementOf(model, cutDoi(model, window))
      expect(placement.ops.length === 0).toBe(totalOf(model) === 0)
      const rows = claims(placement.ops)
      LANES.forEach((_lane, col) => {
        const count = model.columns[col]?.count ?? 0
        const claimed = (rows.get(col) ?? []).toSorted((a, b) => a - b)
        expect(claimed).toStrictEqual(Array.from({ length: count }, (_, r) => r))
      })
    },
  )
})

// ------------------------------------------------------------- L-C2

test("L-C2 squares plus strip counts equals the total folded", () => {
  const model = foldedFixture()
  for (const doi of [initialDoi, cutDoi(model, WINDOW), cutDoi(model, 1)]) {
    expect(opTotal(placementOf(model, doi))).toBe(totalOf(model))
  }
  expect(totalOf(model)).toBe(220)
})

test("L-C2 count honesty survives an unregistered-only word", () => {
  const model = foldPage(emptyModel, syntheticPage(0, 40, [200]))
  valid(model)
  const placement = placementOf(model, cutDoi(model, WINDOW))
  expect(opTotal(placement), "the residue lane is not skipped").toBe(40)
  expect(placement.ops.some((op) => op.col === laneIndex("unregistered"))).toBe(true)
})

test("L-C2 an empty model places no op and totals zero", () => {
  const placement = placementOf(emptyModel, initialDoi)
  expect(placement.ops).toHaveLength(0)
  expect(opTotal(placement)).toBe(0)
})

// ------------------------------------------------------------- L-C3

test("L-C3 the individuated floor does not move between cuts", () => {
  const model = foldedFixture()
  const doi = cutDoi(model, WINDOW)
  const grown = foldPage(model, syntheticPage(220, 300, [8, 14]))
  valid(grown)

  expect(placementOf(grown, doi).doi.floor, "placementOf never recomputes the partition")
    .toStrictEqual(doi.floor)
  const chunk = laneIndex("chunk")
  expect(doi.floor[chunk], "the floor is where the last cut put it")
    .toBe(placementOf(grown, doi).doi.floor[chunk])
})

test("L-C3 a cut is the only thing that moves the floor", () => {
  const model = foldedFixture()
  const first = cutDoi(model, WINDOW)
  const grown = foldPage(model, syntheticPage(220, 300, [8]))
  const second = cutDoi(grown, WINDOW)
  const chunk = laneIndex("chunk")
  expect(second.floor[chunk], "and at a cut it moves to count - window")
    .toBeGreaterThan(first.floor[chunk] ?? 0)
})

// ------------------------------------------------------------- L-C4

test("L-C4 growth extends the placement and moves nothing", () => {
  const model = foldedFixture()
  const doi = cutDoi(model, WINDOW)
  const before = placementOf(model, doi).ops.map(opKey)

  const grown = foldPage(model, syntheticPage(220, 120, tags))
  valid(grown)
  const after = placementOf(grown, doi).ops.map(opKey)

  // Subsequence, not prefix (packet FLAG-1): the canonical order is
  // column-major and growth inserts inside each column's block.
  let cursor = 0
  for (const key of before) {
    const found = after.indexOf(key, cursor)
    expect(found, `the op ${key} survived growth, in order`).toBeGreaterThanOrEqual(0)
    cursor = found + 1
  }
  expect(after.length).toBeGreaterThan(before.length)
})

test("L-C4 a top-anchored layout would move every op — the adversary dies here", () => {
  // ADEQUACY-1 in the packet. Every old Square must be deep-equal after
  // growth, at the SAME row index; an implementation that indexes rows
  // from the newest receipt renumbers all of them.
  const model = foldedFixture()
  const doi = cutDoi(model, WINDOW)
  const squaresOf = (m: Model): ReadonlyArray<Op> =>
    placementOf(m, doi).ops.filter((op) => op._tag === "Square")

  const squares = squaresOf(model)
  expect(squares.length, "there are squares to move").toBeGreaterThan(0)
  const before = new Map(squares.map((op) => [opKey(op), op]))
  const grown = foldPage(model, syntheticPage(220, 7, [8]))
  const after = new Map(squaresOf(grown).map((op) => [opKey(op), op]))

  for (const [key, op] of before) {
    expect(after.get(key), `${key} kept its row and its address`).toStrictEqual(op)
  }
})

test("L-C4 growth under a stale Doi never un-covers a row", () => {
  forAll(
    (draw) => ({ model: generatedModel(draw), size: draw.int(1, 200) }),
    40,
    ({ model, size }) => {
      const doi = cutDoi(model, WINDOW)
      const grown = foldPage(model, syntheticPage(totalOf(model) + 1000, size, tags))
      const rowsBefore = claims(placementOf(model, doi).ops)
      const rowsAfter = claims(placementOf(grown, doi).ops)
      for (const [col, rows] of rowsBefore) {
        const now = new Set(rowsAfter.get(col) ?? [])
        for (const row of rows) expect(now.has(row), `col ${col} row ${row}`).toBe(true)
      }
    },
  )
})

// ------------------------------------------------------------- L-C5

test("L-C5 no square is emitted without its address", () => {
  const model = foldedFixture()
  // A Doi whose floor is far below the carrier for the deep lane: the
  // placement must still never claim an address it does not hold.
  const doi: Doi = { span: WINDOW, floor: LANES.map(() => 0) }
  for (const op of placementOf(model, doi).ops) {
    if (op._tag !== "Square") continue
    const column = model.columns[op.col]
    expect(column).toBeDefined()
    if (column === undefined) continue
    const base = column.count - column.tail.length
    expect(op.row, "the row is inside the held tail").toBeGreaterThanOrEqual(base)
    expect(op.address, "and the address is the tail's own")
      .toBe(column.tail[op.row - base]?.address)
  }
})

test("L-C5 rows below the carrier are covered by a strip, not invented", () => {
  const deep = foldPage(emptyModel, syntheticPage(0, K_CARRIER + 200, [8]))
  valid(deep)
  const doi: Doi = { span: WINDOW, floor: LANES.map(() => 0) }
  const placement = placementOf(deep, doi)
  const col = laneIndex("chunk")
  const squares = placement.ops.filter((op) => op._tag === "Square" && op.col === col)
  expect(squares.length, "at most k squares can be individuated")
    .toBeLessThanOrEqual(K_CARRIER)
  expect(opTotal(placement), "and the rest is carried by a strip, honestly")
    .toBe(K_CARRIER + 200)
})

// ------------------------------------------------------------- L-C7

test("L-C7 ops arrive in canonical order: column ascending, row ascending", () => {
  const model = foldedFixture()
  for (const doi of [initialDoi, cutDoi(model, WINDOW), cutDoi(model, 3)]) {
    const ops = placementOf(model, doi).ops
    ops.forEach((op, index) => {
      if (index === 0) return
      const previous = ops[index - 1]
      if (previous === undefined) return
      const ordered =
        previous.col < op.col ||
        (previous.col === op.col && startRow(previous) < startRow(op))
      expect(ordered, `op ${index} follows op ${index - 1}`).toBe(true)
    })
  }
})

test("L-C7 a column's strip precedes its squares", () => {
  const model = foldPage(emptyModel, syntheticPage(0, 400, [8]))
  const ops = placementOf(model, cutDoi(model, WINDOW)).ops
  expect(ops[0]?._tag, "the strip covers row 0").toBe("Strip")
  expect(ops.at(-1)?._tag, "the newest individuated row is last").toBe("Square")
  expect(ops.filter((op) => op._tag === "Strip"), "one strip per column").toHaveLength(1)
})

// -------------------------------------------------------- the window

test("the window and the carrier are different numbers, and both bite", () => {
  const deep = foldPage(emptyModel, syntheticPage(0, 1000, [8]))
  const col = laneIndex("chunk")
  const windowed = placementOf(deep, cutDoi(deep, WINDOW)).ops
    .filter((op) => op._tag === "Square" && op.col === col)
  expect(windowed, "the visible window individuates 30 rows").toHaveLength(WINDOW)
  expect(deep.columns[col]?.tail, "while the carrier holds 512").toHaveLength(K_CARRIER)
})
