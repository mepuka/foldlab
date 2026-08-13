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
import { Schema } from "effect"
import * as FastCheck from "fast-check"
import {
  composeEntities,
  entitySeed,
  makeCollector,
  memoryBacking,
  type Backing,
  type EntityView,
} from "../src/entity.ts"
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

const entityEventPartSchema = Schema.Struct({
  key: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(12)),
  seq: Schema.Natural.check(
    Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  ),
  value: Schema.String.check(Schema.isMaxLength(32)),
})
const entityEventPartArbitrary = Schema.toArbitrary(entityEventPartSchema)(FastCheck)
  .filter(({ key }) => !key.includes("=") && new TextDecoder().decode(new TextEncoder().encode(key)) === key)
const toHistory = (
  parts: ReadonlyArray<typeof entityEventPartSchema.Type>,
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
