/**
 * THE BREAKER'S HARNESS for S3a — contract packet
 * `.staging/frontend-trunk/packets/S3A-TRUNK-ENGINE.md`.
 *
 * Written by the breaker, read-only to the implementer. It carries no
 * opinion about the engine: nothing here imports `src/trunk/*`, so the
 * harness stays loadable while the modules under contract do not exist,
 * and `fixtures/conformance.test.ts` can prove the fixture conforms
 * today rather than at implementation time.
 *
 * Three things live here:
 *
 *   - the fixture loaders, which read the JSON as BYTES (`node:fs`) and
 *     decode through S0's generated `wordHistorySchema`. The fixture is
 *     therefore exercised as the wire document it imitates, and the
 *     decode is the conformance proof — no schema is transcribed;
 *   - `forAll`, a deterministic property runner. See the packet's
 *     FLAG-7: `fast-check@4.9.0` is present in node_modules only as a
 *     transitive dependency of `effect`, and the breaker refused to
 *     introduce a phantom dependency. Fixed case counts, a seeded LCG,
 *     NO SHRINKING — a claim-scope fact, stated. The signature is
 *     shaped so the implementer's promotion to fast-check is a body
 *     swap;
 *   - `expectValid`, the carrier invariant CI-1..CI-5 as one assertion,
 *     called after every fold in the battery.
 */
import { Schema } from "effect"
import { expect } from "vitest"
import { readFileSync } from "node:fs"

import { wordHistorySchema } from "../../generated/WordLogSchema.ts"

// ---------------------------------------------------------------- shapes
//
// Structural mirrors of the packet's §0 surface, declared HERE so the
// harness never imports the modules under contract. The battery imports
// the real types from `src/trunk/*`; these are only what the harness
// needs to talk about a model without depending on one.

export type History = typeof wordHistorySchema.Type
export type Receipt = History["word"][number]

export interface ColumnShape {
  readonly count: number
  readonly tailRevision: number
  readonly tail: ReadonlyArray<Receipt>
}

export interface ModelShape {
  readonly status: { readonly _tag: string }
  readonly mark: number
  readonly columns: ReadonlyArray<ColumnShape>
}

// -------------------------------------------------------------- loaders

const decodeHistoryStrict = Schema.decodeUnknownSync(wordHistorySchema)

const readJson = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"))

/** The whole recorded word: 220 receipts, all 15 registry sorts, two
 * unregistered tags, two bursts in `chunk`. Packet §8 pins the rule. */
export const loadWhole = (): History => decodeHistoryStrict(readJson("./word-history.fixture.json"))

/** The SAME word as four pages: 0..79, 80..159, 160..219, then empty at
 * the tip. The concatenation, replay and drought cases. */
export const loadPages = (): ReadonlyArray<History> => {
  const raw = readJson("./word-history.pages.fixture.json")
  if (!Array.isArray(raw)) throw new Error("pages fixture is not an array")
  return raw.map((page) => decodeHistoryStrict(page))
}

/** Five documents whose `next` is not `max(seq) + 1`. */
export const loadMarks = (): Readonly<Record<string, History>> => {
  const raw = readJson("./word-history.marks.fixture.json")
  if (typeof raw !== "object" || raw === null) throw new Error("marks fixture is not an object")
  const out: Record<string, History> = {}
  for (const [key, value] of Object.entries(raw)) out[key] = decodeHistoryStrict(value)
  return out
}

/** The bytes on disk, for the conformance test's own assertions. */
export const wholeFixtureBytes = (): string =>
  readFileSync(new URL("./word-history.fixture.json", import.meta.url), "utf8")

// ------------------------------------------------------- page algebra

/** Adjacent-page concatenation, as the battery's own reference — the
 * engine's `concatPages` is checked AGAINST this, never trusted as it. */
export const concatReference = (a: History, b: History): History => ({
  next: b.next,
  word: [...a.word, ...b.word],
})

// ---------------------------------------------------- property runner

export interface Draw {
  /** Inclusive on both ends. */
  readonly int: (lo: number, hi: number) => number
  readonly pick: <A>(xs: ReadonlyArray<A>) => A
  readonly bool: () => boolean
}

/**
 * A deterministic property runner. `cases` samples from a seeded
 * 32-bit LCG (Numerical Recipes constants), each case reported with its
 * index and the seed that produced it. No shrinking: a failure names
 * the seed, and re-running the same seed reproduces the counterexample
 * exactly. FLAG-7 in the packet says how this becomes `fc.assert`.
 */
export const forAll = <A>(
  generate: (draw: Draw) => A,
  cases: number,
  property: (value: A, index: number) => void,
  seed = 0x2f6e_2b1d,
): void => {
  for (let index = 0; index < cases; index += 1) {
    const caseSeed = (seed + index * 0x9e37_79b9) >>> 0
    let state = caseSeed === 0 ? 1 : caseSeed
    const next = (): number => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
      return state / 0x1_0000_0000
    }
    const draw: Draw = {
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: (xs) => {
        const picked = xs[Math.floor(next() * xs.length)]
        if (picked === undefined) throw new Error("pick from an empty array")
        return picked
      },
      bool: () => next() < 0.5,
    }
    const value = generate(draw)
    try {
      property(value, index)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(
        `property failed on case ${index} (seed 0x${caseSeed.toString(16)}): ${detail}`,
        { cause: error },
      )
    }
  }
}

// --------------------------------------------------- the CI assertion

/**
 * CI-1..CI-5 of the packet, as one assertion. Called after EVERY fold in
 * the battery, so "valid in, broken out" (BREAKER.md §10.1) fires on any
 * case, not only on the case written for it.
 *
 * `laneOf` is passed in rather than imported so the harness stays free
 * of the modules under contract.
 */
export const expectValid = (
  model: ModelShape,
  laneCount: number,
  carrierBound: number,
  laneOf: (tag: number) => string,
  lanes: ReadonlyArray<string>,
): void => {
  expect(model.columns.length, "CI-1: one column per lane").toBe(laneCount)
  expect(model.mark, "CI-5: the mark is a receipt index").toBeGreaterThanOrEqual(0)

  model.columns.forEach((column, index) => {
    const lane = lanes[index]
    expect(lane, "CI-1: columns are in LANES order").toBeDefined()
    // CI-2 is an EQUATION, not a bound: `lastK_length` proves
    // `(lastK k l).length = min k l.length`, so a tail that is merely
    // short enough is still wrong.
    expect(column.tail.length, `CI-2: ${String(lane)} holds min(k, count) receipts`)
      .toBe(Math.min(carrierBound, column.count))

    let previous = -1
    for (const receipt of column.tail) {
      expect(receipt.seq, `CI-3: ${String(lane)} tail is strictly increasing`)
        .toBeGreaterThan(previous)
      previous = receipt.seq
      expect(laneOf(receipt.tag), `CI-3: ${String(lane)} holds only its own receipts`)
        .toBe(lane)
    }

    const last = column.tail.at(-1)
    expect(column.tailRevision, `CI-4: ${String(lane)} revision is the tail's last seq`)
      .toBe(last === undefined ? -1 : last.seq)
  })
}

/** Σ column counts. The battery's own reference for count honesty. */
export const totalOf = (model: ModelShape): number =>
  model.columns.reduce((sum, column) => sum + column.count, 0)

/** Receipts reachable from the model — the memory law's (ii). */
export const receiptsHeld = (model: ModelShape): number =>
  model.columns.reduce((sum, column) => sum + column.tail.length, 0)

/** A synthetic page, for the memory law's 10^5 feed and for generated
 * property cases. Seqs are contiguous from `from`; tags cycle through
 * `tags` so every lane, including `unregistered`, is exercised. */
export const syntheticPage = (
  from: number,
  count: number,
  tags: ReadonlyArray<number>,
): History => {
  const word: Array<Receipt> = []
  for (let i = 0; i < count; i += 1) {
    const seq = from + i
    const tag = tags[seq % tags.length]
    if (tag === undefined) throw new Error("empty tag set")
    let block = ""
    for (let j = 0; j < 16; j += 1) block += "0123456789abcdef"[(seq * 7 + j * 11 + 3) % 16]
    word.push({
      address: block.repeat(4),
      at: 1_756_600_000_000 + seq * 137,
      seq,
      size: 32 + ((seq * 37) % 991),
      tag,
    })
  }
  return { next: from + count, word }
}
