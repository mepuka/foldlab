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
    const c = makeCollector(memoryBacking(), correlate)
    for (const e of mixed) c.ingest(e)
    for (const key of ["s1", "s2", "s3"]) {
      const own = mixed.filter((e) => correlate(e) === key)
      const view = c.entity(key)!
      expect(view.events).toBe(own.length)
      expect(view.head).toBe(headFrom(entitySeed(key), own))
    }
  })

  test("EC2: two backing layers, identical anchors", () => {
    const a = makeCollector(memoryBacking(), correlate)
    const b = makeCollector(arrayBacking(), correlate)
    for (const e of mixed) {
      a.ingest(e)
      b.ingest(e)
    }
    expect(a.anchors()).toEqual(b.anchors())
  })

  test("EC3: incremental ingestion equals batch recomputation", () => {
    const inc = makeCollector(memoryBacking(), correlate)
    for (const e of mixed) inc.ingest(e)
    const batch = makeCollector(memoryBacking(), correlate)
    for (const e of mixed) batch.ingest(e)
    expect(inc.anchors()).toEqual(batch.anchors())
  })

  test("EC4: composition is deterministic, order-sensitive, and child-history-sensitive", () => {
    const c = makeCollector(memoryBacking(), correlate)
    for (const e of mixed) c.ingest(e)
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
    const grown = kids.map((k) =>
      k.key === "s3" ? { ...k, head: extend(k.head, event("bus", 7, "s3=done")) } : k,
    )
    expect(composeEntities("root", grown).head).not.toBe(parent.head)
  })
})
