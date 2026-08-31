/**
 * BATTERY — S3a, the trunk engine. Laws L-M1..L-M5 and the carrier
 * invariant's ground case.
 *
 * Packet: `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`.
 * Written by the BREAKER before `src/trunk/model.ts` exists; RED by
 * construction. Read-only to the implementer — a defect here is a
 * written BLOCK back to the breaker, never an edit.
 */
import { expect, test } from "vitest"

import { GrammarKindTags, KindTagRows } from "../generated/kindTags.ts"
import { expectValid, forAll, loadWhole } from "./fixtures/harness.ts"
import {
  CLASS_STARTS,
  emptyModel,
  K_CARRIER,
  kindName,
  laneIndex,
  laneOfTag,
  LANES,
  tintIndex,
  totalCount,
  WINDOW,
} from "./model.ts"

// ------------------------------------------------------------- L-M1

test("L-M1 the lane list is the generated registry's, plus unregistered", () => {
  expect(LANES).toHaveLength(16)
  expect(new Set(LANES).size, "no lane appears twice").toBe(16)
  expect(LANES.at(-1), "the residue lane is last").toBe("unregistered")

  const generated = KindTagRows.map((row) => row.name).toSorted()
  const sorts = LANES.filter((lane) => lane !== "unregistered").toSorted()
  expect(sorts, "the sort lanes are exactly the registry's names").toStrictEqual(generated)
})

test("L-M1 the lane ORDER is the ruled speed-class order", () => {
  // aesthetics §1.3: near-still, bursty-per-program, per-artifact,
  // steady-fast, bursty-fastest, then the residue.
  expect([...LANES]).toStrictEqual([
    "schema", "git", "cont", "agent",
    "step",
    "manifest", "tree", "file",
    "context", "entry", "value", "annotation", "query", "result",
    "chunk",
    "unregistered",
  ])
  expect([...CLASS_STARTS]).toStrictEqual([0, 4, 5, 8, 14, 15])
  LANES.forEach((lane, index) => {
    expect(laneIndex(lane), "laneIndex inverts LANES").toBe(index)
  })
})

// ------------------------------------------------------------- L-M2

test("L-M2 every registry tag lands in its own lane — one authority", () => {
  for (const row of KindTagRows) {
    expect(laneOfTag(row.tag), `tag ${row.tag} is the ${row.name} lane`).toBe(row.name)
  }
})

test("L-M2 every tag outside the registry lands in unregistered, never dropped", () => {
  forAll(
    (draw) => draw.int(0, 100_000),
    400,
    (tag) => {
      const expected = GrammarKindTags.includes(tag)
        ? KindTagRows.find((row) => row.tag === tag)?.name
        : "unregistered"
      expect(laneOfTag(tag)).toBe(expected)
    },
  )
  // The two the fixture actually carries.
  expect(laneOfTag(200)).toBe("unregistered")
  expect(laneOfTag(42)).toBe("unregistered")
})

// ------------------------------------------------------------- L-M3

test("L-M3 named kinds come off the registry, never a hand table", () => {
  for (const row of KindTagRows) {
    expect(kindName(row.tag)).toBe(row.name)
  }
})

test("L-M3 an unnamed tag renders as the CLI's bare hex (N9), never dropped", () => {
  // `bin/cli/history.ts:75-78`, copied not reinvented.
  expect(kindName(200)).toBe("0xc8")
  expect(kindName(42)).toBe("0x2a")
  expect(kindName(0)).toBe("0x00")
  expect(kindName(255)).toBe("0xff")
  expect(kindName(4096)).toBe("0x1000")
  forAll(
    (draw) => draw.int(0, 100_000),
    300,
    (tag) => {
      if (GrammarKindTags.includes(tag)) return
      expect(kindName(tag)).toBe(`0x${tag.toString(16).padStart(2, "0")}`)
    },
  )
})

// ------------------------------------------------------------- L-M4

test("L-M4 the micro-tint index is the address's first hex nibble mod 5", () => {
  const word = loadWhole().word
  const seen = new Set<number>()
  for (const receipt of word) {
    const expected = Number.parseInt(receipt.address.slice(0, 1), 16) % 5
    expect(tintIndex(receipt.address), receipt.address.slice(0, 8)).toBe(expected)
    seen.add(expected)
  }
  expect([...seen].toSorted((a, b) => a - b), "all five steps occur in the fixture")
    .toStrictEqual([0, 1, 2, 3, 4])
})

test("L-M4 the tint ladder is five steps, and reads the NIBBLE not the char code", () => {
  // TP-13's two named failures: `"a" % 5` is NaN, and a char-code
  // reading gives 97 % 5 = 2 where the nibble gives 10 % 5 = 0.
  expect(tintIndex("a".repeat(64))).toBe(0)
  expect(tintIndex("f".repeat(64))).toBe(0)
  expect(tintIndex("e".repeat(64))).toBe(4)
  expect(tintIndex("0".repeat(64))).toBe(0)
  expect(tintIndex("9".repeat(64))).toBe(4)
  const range = new Set(
    "0123456789abcdef".split("").map((nibble) => tintIndex(nibble.repeat(64))),
  )
  expect([...range].toSorted((a, b) => a - b)).toStrictEqual([0, 1, 2, 3, 4])
})

// -------------------------------------------------- the ground model

test("the empty model satisfies the carrier invariant and counts nothing", () => {
  expect(emptyModel.status._tag, "never asked is not asked-and-refused").toBe("Idle")
  expect(emptyModel.mark).toBe(0)
  expect(totalCount(emptyModel)).toBe(0)
  expectValid(emptyModel, LANES.length, K_CARRIER, laneOfTag, LANES)
})

test("TP-29 the carrier bound and the visible window are two numbers", () => {
  expect(K_CARRIER, "the CARRIER bound").toBe(512)
  expect(WINDOW, "the visible individuated window").toBe(30)
  expect(K_CARRIER).not.toBe(WINDOW)
})
