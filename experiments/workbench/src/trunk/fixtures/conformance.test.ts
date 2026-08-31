/**
 * HARNESS VALIDATION — not a contract case, and counted separately.
 *
 * Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md` §8.
 *
 * This file imports NOTHING under contract, so it is GREEN today. It
 * proves the three fixtures are what the packet says they are, decoded
 * through S0's emitted `wordHistorySchema` — the workbench never parses
 * the wire itself, and a fixture that does not survive the generated
 * mirror is a fixture defect the breaker owns, not an engine defect the
 * implementer inherits.
 */
import { expect, test } from "vitest"

import { GrammarKindTags, KindTagRows } from "../../generated/kindTags.ts"
import {
  concatReference,
  expectValid,
  forAll,
  loadMarks,
  loadPages,
  loadWhole,
  receiptsHeld,
  syntheticPage,
  totalOf,
  wholeFixtureBytes,
  type ModelShape,
} from "./harness.ts"

test("the recorded word decodes through the generated wordHistorySchema", () => {
  const whole = loadWhole()
  expect(whole.next).toBe(220)
  expect(whole.word).toHaveLength(220)
  expect(whole.word.every((entry, index) => entry.seq === index)).toBe(true)
})

test("every registry sort appears, and two tags outside the registry do", () => {
  const tags = new Set(loadWhole().word.map((entry) => entry.tag))
  for (const row of KindTagRows) {
    expect(tags.has(row.tag), `the fixture exercises the ${row.name} lane`).toBe(true)
  }
  const strangers = [...tags].filter((tag) => !GrammarKindTags.includes(tag))
  expect(strangers.toSorted((a, b) => a - b)).toStrictEqual([42, 200])
  expect(KindTagRows).toHaveLength(15)
})

test("the fixture reaches all five micro-tint steps and holds 64-hex addresses", () => {
  const word = loadWhole().word
  const steps = new Set(word.map((entry) => Number.parseInt(entry.address[0] ?? "", 16) % 5))
  expect([...steps].toSorted((a, b) => a - b)).toStrictEqual([0, 1, 2, 3, 4])
  expect(word.every((entry) => /^[0-9a-f]{64}$/u.test(entry.address))).toBe(true)
})

test("timestamps are strictly monotone, with droughts between the runs", () => {
  const word = loadWhole().word
  const gaps = word.map((entry, index) => (index === 0 ? 1 : entry.at - (word[index - 1]?.at ?? 0)))
  expect(gaps.every((gap) => gap > 0)).toBe(true)
  expect(gaps.filter((gap) => gap > 100_000)).toHaveLength(21)
})

test("one lane runs deep enough to strip under any small window", () => {
  const depths = new Map<number, number>()
  for (const entry of loadWhole().word) depths.set(entry.tag, (depths.get(entry.tag) ?? 0) + 1)
  expect(depths.get(8), "chunk, two bursts").toBe(85)
  expect(depths.get(14), "step, one burst").toBe(38)
  expect(Math.min(...depths.values()), "and one lane stays shallow").toBe(1)
})

test("the paged fixture concatenates back to the whole word", () => {
  const pages = loadPages()
  expect(pages.map((page) => page.next)).toStrictEqual([80, 160, 220, 220])
  expect(pages.map((page) => page.word.length)).toStrictEqual([80, 80, 60, 0])
  const rejoined = pages.reduce((left, right) => concatReference(left, right))
  expect(rejoined).toStrictEqual(loadWhole())
})

test("the mark fixture carries five documents whose next is not max(seq)+1", () => {
  const marks = loadMarks()
  expect(Object.keys(marks).toSorted()).toStrictEqual([
    "emptyAtTip",
    "emptyMidWord",
    "outOfOrder",
    "overlapping",
    "truncated",
  ])
  expect(marks["emptyAtTip"]?.next).toBe(220)
  expect(marks["emptyMidWord"]?.next).toBe(80)
  expect(marks["truncated"]?.next).toBe(7)
  expect(marks["outOfOrder"]?.word.map((entry) => entry.seq)).toStrictEqual([0, 2, 1, 3])
  expect(marks["overlapping"]?.word.map((entry) => entry.seq)).toStrictEqual([
    76, 77, 78, 79, 80, 81, 82, 83,
  ])
})

test("the fixture on disk is JSON bytes, not a TypeScript literal", () => {
  const bytes = wholeFixtureBytes()
  expect(bytes.startsWith("{\n")).toBe(true)
  expect(bytes.endsWith("}\n")).toBe(true)
  expect(bytes).not.toContain("//")
})

test("the synthetic page generator produces schema-shaped receipts", () => {
  const page = syntheticPage(1000, 25, [8, 200])
  expect(page.next).toBe(1025)
  expect(page.word.map((entry) => entry.seq)).toStrictEqual(
    Array.from({ length: 25 }, (_, index) => 1000 + index),
  )
  expect(page.word.every((entry) => /^[0-9a-f]{64}$/u.test(entry.address))).toBe(true)
  expect(new Set(page.word.map((entry) => entry.tag))).toStrictEqual(new Set([8, 200]))
  expect(syntheticPage(0, 0, [1]).word).toHaveLength(0)
})

// ------------------------------------ the property runner, self-checked

test("forAll is deterministic and reports the seed on failure", () => {
  const draws: Array<number> = []
  forAll((draw) => draw.int(0, 999), 30, (value) => void draws.push(value))
  const again: Array<number> = []
  forAll((draw) => draw.int(0, 999), 30, (value) => void again.push(value))
  expect(again, "same seed, same cases").toStrictEqual(draws)
  expect(new Set(draws).size, "and the cases are not all the same").toBeGreaterThan(20)
  expect(draws.every((value) => value >= 0 && value <= 999)).toBe(true)

  expect(() =>
    forAll((draw) => draw.int(0, 10), 5, (value) => {
      if (value >= 0) throw new Error("boom")
    }),
  ).toThrow(/property failed on case 0 \(seed 0x[0-9a-f]+\): boom/u)
})

// -------------------------------- the CI assertion, self-checked

const LANE_NAMES = ["one", "two"] as const
const laneOfTag = (tag: number): string => (tag === 1 ? "one" : "two")
const receipt = (seq: number, tag: number) => ({
  address: "0".repeat(64),
  at: 1,
  seq,
  size: 1,
  tag,
})
const modelWith = (tails: ReadonlyArray<ReadonlyArray<ReturnType<typeof receipt>>>): ModelShape => ({
  status: { _tag: "Live" },
  mark: 0,
  columns: tails.map((tail) => ({
    count: tail.length,
    tailRevision: tail.at(-1)?.seq ?? -1,
    tail,
  })),
})

test("expectValid accepts a valid carrier and refuses each broken one", () => {
  const good = modelWith([[receipt(0, 1)], [receipt(1, 2)]])
  expectValid(good, 2, 512, laneOfTag, LANE_NAMES)

  // CI-1: wrong number of columns.
  expect(() => expectValid(modelWith([[]]), 2, 512, laneOfTag, LANE_NAMES)).toThrow()
  // CI-2: a tail that is not exactly min(k, count).
  expect(() =>
    expectValid(
      { ...good, columns: [{ count: 0, tailRevision: 0, tail: [receipt(0, 1)] }, ...good.columns.slice(1)] },
      2, 512, laneOfTag, LANE_NAMES,
    ),
  ).toThrow()
  // CI-3: a foreign lane's receipt.
  expect(() =>
    expectValid(modelWith([[receipt(0, 2)], [receipt(1, 2)]]), 2, 512, laneOfTag, LANE_NAMES),
  ).toThrow()
  // CI-4: a revision that does not name the tail's last seq.
  expect(() =>
    expectValid(
      { ...good, columns: [{ count: 1, tailRevision: 99, tail: [receipt(0, 1)] }, ...good.columns.slice(1)] },
      2, 512, laneOfTag, LANE_NAMES,
    ),
  ).toThrow()

  expect(totalOf(good)).toBe(2)
  expect(receiptsHeld(good)).toBe(2)
})
