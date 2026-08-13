/**
 * Entity-collector laws — the "fold an entity from a stream" claims, checked:
 *
 *   EC1 decompose-then-fold: the collector over a MIXED stream gives, per
 *       entity, exactly the folds of that entity's own subsequence — the
 *       entity IS the quotient by correlation
 *   EC2 backing independence: two different backing layers produce
 *       identical views (the store is a seam, not a semantics)
 *   EC3 incremental = batch: O(1) ingestion equals recomputation
 *   EC4 composition: a parent entity folded from child anchors is
 *       deterministic, order-sensitive (composition commits an order), and
 *       changes iff a child's history changes
 */

import { describe, expect, test } from "bun:test"
import * as FastCheck from "fast-check"
import {
  composeEntities,
  entitySeed,
  makeCollector,
  memoryBacking,
  type Backing,
  type EntityView,
} from "../src/entity.ts"
import { arbitraryForUnicodeString } from "../src/foldArbitrary.ts"
import { event, extend, headFrom, stateDigest, type StreamEvent } from "../src/stream.ts"

// An agent-shaped mixed stream: three sessions interleaved.
const mixed: ReadonlyArray<StreamEvent> = [
  event("bus", 1, "s1=start"),
  event("bus", 2, "s2=start"),
  event("bus", 3, "s1=tool"),
  event("bus", 4, "s3=start"),
  event("bus", 5, "s2=done"),
  event("bus", 6, "s1=done"),
]
const correlate = (e: StreamEvent): string =>
  new TextDecoder().decode(e.payload).split("=")[0]!

interface EntityEventPart {
  readonly key: string
  readonly seq: number
  readonly value: string
}

const entityEventPartArbitrary: FastCheck.Arbitrary<EntityEventPart> = FastCheck.record({
  key: arbitraryForUnicodeString({ minLength: 1, maxLength: 12 }),
  seq: FastCheck.maxSafeNat(),
  value: arbitraryForUnicodeString({ maxLength: 32 }),
}).filter(({ key, value }) =>
  !key.includes("=") && key.length <= 12 && value.length <= 32
)
const toHistory = (
  parts: ReadonlyArray<EntityEventPart>,
): ReadonlyArray<StreamEvent> =>
  parts.map(({ key, seq, value }) => event("bus", seq, `${key}=${value}`))
const entityHistoryArbitrary = FastCheck.array(entityEventPartArbitrary, { maxLength: 32 })
  .map(toHistory)
const compositionHistoryArbitrary = FastCheck.uniqueArray(entityEventPartArbitrary, {
  selector: ({ key }) => key,
  minLength: 2,
  maxLength: 8,
}).map(toHistory)

// A second, deliberately different backing implementation.
const arrayBacking = (): Backing => {
  let entries: Array<[string, EntityView]> = []
  return {
    get: (k) => entries.find(([key]) => key === k)?.[1],
    set: (k, v) => {
      entries = entries.filter(([key]) => key !== k)
      entries.push([k, v])
    },
    keys: () => entries.map(([k]) => k).sort(),
  }
}

// Raw byte payloads, INCLUDING bytes the walled meaning-fold refuses: NUL
// (0x00), lone continuation bytes (invalid UTF-8), and the '=' separator.
const rawByteArbitrary = FastCheck.uint8Array({ maxLength: 8 })
const rawEventArbitrary = FastCheck.record({
  seq: FastCheck.integer({ min: 0, max: 1_000 }),
  payload: rawByteArbitrary,
}).map(({ seq, payload }): StreamEvent => ({ stream: "raw", seq, payload }))
const rawHistoryArbitrary = FastCheck.array(rawEventArbitrary, { maxLength: 24 })
// One entity, so distinct payloads fold into a single meaning state.
const oneEntity = (): string => "e"

test("entity law inputs include valid non-ASCII and surrogate-adjacent keys", () => {
  const parts = FastCheck.sample(entityEventPartArbitrary, { seed: 0x51_05, numRuns: 1_000 })
  expect(parts.some(({ key, value }) =>
    [...key, ...value].some((unit) => unit.codePointAt(0)! > 0x7f)
  )).toBe(true)
  expect(parts.some(({ key, value }) => `${key}${value}`.includes("\ud7ff"))).toBe(true)
  expect(parts.some(({ key, value }) => `${key}${value}`.includes("\ue000"))).toBe(true)
})

describe("entity meaning-fold totality (C1)", () => {
  test("anchors() is total over arbitrary byte payloads", () => {
    FastCheck.assert(
      FastCheck.property(rawHistoryArbitrary, (history) => {
        const c = makeCollector(memoryBacking(), oneEntity)
        for (const e of history) c.ingest(e)
        expect(() => c.anchors()).not.toThrow()
      }),
      {
        examples: [[[{ stream: "raw", seq: 1, payload: new Uint8Array([0x00, 0x3d, 0x76]) }]]],
        seed: 0x07ec_00c1,
        numRuns: 500,
        endOnFailure: false,
      },
    )
  })

  test("one NUL-key event does not permanently poison the collector", () => {
    const c = makeCollector(memoryBacking(), oneEntity)
    c.ingest({ stream: "raw", seq: 1, payload: new Uint8Array([0x00, 0x3d, 0x76]) }) // "\0=v"
    expect(() => c.anchors()).not.toThrow()
    // A later clean fact still resolves; the poison did not persist.
    c.ingest(event("raw", 2, "a=b"))
    const anchors = c.anchors()
    expect(anchors).toHaveLength(1)
    expect(anchors[0]!.key).toBe("e")
  })

  test("distinct invalid bytes do not collide in meaning, yet the chain remembers them", () => {
    const withFirstByte = (b: number): EntityView => {
      const c = makeCollector(memoryBacking(), oneEntity)
      return c.ingest({ stream: "raw", seq: 1, payload: new Uint8Array([b, 0x3d, 0x76]) }) // <b>"=v"
    }
    const a = withFirstByte(0xff)
    const b = withFirstByte(0xfe)
    // The identity fold commits to the exact bytes: heads differ.
    expect(a.head).not.toBe(b.head)
    // The meaning fold FORGIVES both (neither is a lawful key=value), so no
    // lossy U+FFFD collision writes a spurious shared key.
    expect(stateDigest(a.state)).toBe(stateDigest(b.state))
    expect(a.state.count).toBe(0)
  })
})

describe("entity collector laws", () => {
  test("EC1: collector over the mixed stream = folds of each entity's subsequence", () => {
    FastCheck.assert(
      FastCheck.property(entityHistoryArbitrary, (history) => {
        const c = makeCollector(memoryBacking(), correlate)
        for (const e of history) c.ingest(e)
        for (const key of new Set(history.map(correlate))) {
          const own = history.filter((e) => correlate(e) === key)
          const view = c.entity(key)!
          expect(view.events).toBe(own.length)
          expect(view.head).toBe(headFrom(entitySeed(key), own))
        }
      }),
      { examples: [[mixed]], seed: 0x07ec_0001, numRuns: 250, endOnFailure: false },
    )
  })

  test("EC2: two backing layers, identical anchors", () => {
    FastCheck.assert(
      FastCheck.property(entityHistoryArbitrary, (history) => {
        const a = makeCollector(memoryBacking(), correlate)
        const b = makeCollector(arrayBacking(), correlate)
        for (const e of history) {
          a.ingest(e)
          b.ingest(e)
        }
        expect(a.anchors()).toEqual(b.anchors())
      }),
      { examples: [[mixed]], seed: 0x07ec_0002, numRuns: 250, endOnFailure: false },
    )
  })

  test("EC3: incremental ingestion equals batch recomputation", () => {
    FastCheck.assert(
      FastCheck.property(entityHistoryArbitrary, (history) => {
        const inc = makeCollector(memoryBacking(), correlate)
        for (const e of history) inc.ingest(e)
        const batch = makeCollector(memoryBacking(), correlate)
        for (const e of history) batch.ingest(e)
        expect(inc.anchors()).toEqual(batch.anchors())
      }),
      { examples: [[mixed]], seed: 0x07ec_0003, numRuns: 250, endOnFailure: false },
    )
  })

  test("EC4: composition is deterministic, order-sensitive, and child-history-sensitive", () => {
    FastCheck.assert(
      FastCheck.property(compositionHistoryArbitrary, (history) => {
        const c = makeCollector(memoryBacking(), correlate)
        for (const e of history) c.ingest(e)
        const kids = c.anchors().map(({ key, head }) => ({ key, head }))

        const parent = composeEntities("root", kids)
        const again = composeEntities("root", kids)
        expect(again.head).toBe(parent.head)
        expect(stateDigest(again.state)).toBe(stateDigest(parent.state))

        // Order of children is committed: reversing them moves the parent head
        // (the chain remembers) while the state fold forgives (distinct keys).
        const reversed = composeEntities("root", [...kids].reverse())
        expect(reversed.head).not.toBe(parent.head)
        expect(stateDigest(reversed.state)).toBe(stateDigest(parent.state))

        // A child's history changing moves the parent transitively.
        const target = kids.at(-1)!
        const grown = kids.map((k) => k.key === target.key
          ? { ...k, head: extend(k.head, event("bus", Number.MAX_SAFE_INTEGER, `${k.key}=grown`)) }
          : k)
        expect(composeEntities("root", grown).head).not.toBe(parent.head)
      }),
      { examples: [[mixed]], seed: 0x07ec_0004, numRuns: 250, endOnFailure: false },
    )
  })
})
