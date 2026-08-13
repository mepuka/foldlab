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
import { Effect, Schema } from "effect"
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

const malformedPayloadCases: ReadonlyArray<ReadonlyArray<number>> = [
  [0x00, 0x3d, 0x76], // NUL key
  [0x6b, 0x3d, 0x00], // NUL value
  [0xed, 0xa0, 0x80, 0x3d, 0x76], // UTF-8 encoding of a lone surrogate
  [0x6b, 0x3d, 0xe2, 0x82], // truncated UTF-8 sequence
]
const malformedPayloadArbitrary = FastCheck.constantFrom(...malformedPayloadCases)
  .map((payload) => Uint8Array.from(payload))

const invalidAnchorArbitrary = FastCheck.oneof(
  FastCheck.constant({ key: "high\ud800", head: "00".repeat(32) }),
  FastCheck.constant({ key: "low\udc00", head: "00".repeat(32) }),
  FastCheck.constant({ key: "contains=delimiter", head: "00".repeat(32) }),
  FastCheck.string({ maxLength: 80 }).filter((head) => !/^[0-9a-f]{64}$/i.test(head))
    .map((head) => ({ key: "valid", head })),
)

const invalidEventArbitrary = FastCheck.oneof(
  FastCheck.integer({ max: -1 }).map((seq) => ({
    stream: "bus",
    seq,
    payload: new TextEncoder().encode("key=value"),
  })),
  FastCheck.constant({
    stream: "bus\ud800",
    seq: 1,
    payload: new TextEncoder().encode("key=value"),
  }),
)

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
  test("C1: malformed payloads refuse without poisoning the backing", () => {
    const backing = memoryBacking()
    const collector = makeCollector(backing, () => "entity")
    const nulKey: StreamEvent = {
      stream: "bus",
      seq: 1,
      payload: Uint8Array.from([0x00, 0x3d, 0x76]),
    }

    const refusal = Effect.runSync(Effect.flip(collector.ingest(nulKey)))
    expect(refusal._tag).toBe("MalformedPayload")
    expect(backing.keys()).toEqual([])
    expect(collector.anchors()).toEqual([])

    for (const invalidLead of [0xff, 0xfe]) {
      const invalid = makeCollector(memoryBacking(), () => "entity")
      const invalidUtf8: StreamEvent = {
        stream: "bus",
        seq: 1,
        payload: Uint8Array.from([invalidLead, 0x3d, 0x76]),
      }
      expect(Effect.runSync(Effect.flip(invalid.ingest(invalidUtf8)))._tag).toBe(
        "MalformedPayload",
      )
      expect(invalid.entity("entity")).toBeUndefined()
      expect(invalid.anchors()).toEqual([])
    }

    const composed = Effect.runSync(Effect.flip(composeEntities("root", [{
      key: "child\0",
      head: "00".repeat(32),
    }])))
    expect(composed._tag).toBe("InvalidEntityAnchor")
  })

  test("composition refuses non-scalar keys and malformed heads before encoding", () => {
    for (const child of [
      { key: "high\ud800", head: "00".repeat(32) },
      { key: "low\udc00", head: "00".repeat(32) },
      { key: "valid", head: "not-a-head" },
    ]) {
      const refusal = Effect.runSync(Effect.flip(composeEntities("root", [child])))
      expect(refusal._tag).toBe("InvalidEntityAnchor")
    }
    const parent = Effect.runSync(Effect.flip(composeEntities("root\ud800", [])))
    expect(parent._tag).toBe("InvalidEntityAnchor")
  })

  test("the composition refusal generator targets invalid keys and heads", () => {
    FastCheck.assert(
      FastCheck.property(invalidAnchorArbitrary, (child) => {
        const refusal = Effect.runSync(Effect.flip(composeEntities("root", [child])))
        expect(refusal._tag).toBe("InvalidEntityAnchor")
      }),
      { seed: 0x22c1_0005, numRuns: 250, endOnFailure: false },
    )
  })

  test("collector reads and writes its backing only when the Effect executes", () => {
    let correlations = 0
    let gets = 0
    let sets = 0
    const backing: Backing = {
      get: () => {
        gets++
        return undefined
      },
      set: () => {
        sets++
      },
      keys: () => [],
    }
    const collector = makeCollector(backing, () => {
      correlations++
      return "entity"
    })
    const pending = collector.ingest(event("bus", 1, "key=value"))
    expect(correlations).toBe(0)
    expect(gets).toBe(0)
    expect(sets).toBe(0)
    Effect.runSync(pending)
    expect(correlations).toBe(1)
    expect(gets).toBe(1)
    expect(sets).toBe(1)
  })

  test("collector refuses malformed event identity as data", () => {
    for (const candidate of [
      { stream: "bus", seq: -1, payload: new TextEncoder().encode("key=value") },
      { stream: "bus\ud800", seq: 1, payload: new TextEncoder().encode("key=value") },
    ]) {
      const collector = makeCollector(memoryBacking(), () => "entity")
      const refusal = Effect.runSync(Effect.flip(collector.ingest(candidate)))
      expect(refusal._tag).toBe("InvalidStreamEvent")
      expect(collector.anchors()).toEqual([])
    }
  })

  test("the collector refusal generator targets malformed event identity", () => {
    FastCheck.assert(
      FastCheck.property(invalidEventArbitrary, (candidate) => {
        const collector = makeCollector(memoryBacking(), () => "entity")
        const refusal = Effect.runSync(Effect.flip(collector.ingest(candidate)))
        expect(refusal._tag).toBe("InvalidStreamEvent")
        expect(collector.anchors()).toEqual([])
      }),
      { seed: 0x22c1_0006, numRuns: 250, endOnFailure: false },
    )
  })

  test("the entity refusal generator targets every payload boundary", () => {
    FastCheck.assert(
      FastCheck.property(malformedPayloadArbitrary, (payload) => {
        const collector = makeCollector(memoryBacking(), () => "entity")
        const refusal = Effect.runSync(Effect.flip(collector.ingest({
          stream: "bus",
          seq: 1,
          payload,
        })))
        expect(refusal._tag).toBe("MalformedPayload")
        expect(collector.entity("entity")).toBeUndefined()
        expect(collector.anchors()).toEqual([])
      }),
      {
        examples: malformedPayloadCases.map((payload) => [Uint8Array.from(payload)]),
        seed: 0x22c1_0001,
        numRuns: 100,
        endOnFailure: false,
      },
    )
  })

  test("EC1: collector over the mixed stream = folds of each entity's subsequence", () => {
    FastCheck.assert(
      FastCheck.property(entityHistoryArbitrary, (history) => {
        const c = makeCollector(memoryBacking(), correlate)
        for (const e of history) Effect.runSync(c.ingest(e))
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
          Effect.runSync(a.ingest(e))
          Effect.runSync(b.ingest(e))
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
        for (const e of history) Effect.runSync(inc.ingest(e))
        const batch = makeCollector(memoryBacking(), correlate)
        for (const e of history) Effect.runSync(batch.ingest(e))
        expect(inc.anchors()).toEqual(batch.anchors())
      }),
      { examples: [[mixed]], seed: 0x07ec_0003, numRuns: 250, endOnFailure: false },
    )
  })

  test("EC4: composition is deterministic, order-sensitive, and child-history-sensitive", () => {
    FastCheck.assert(
      FastCheck.property(compositionHistoryArbitrary, (history) => {
        const c = makeCollector(memoryBacking(), correlate)
        for (const e of history) Effect.runSync(c.ingest(e))
        const kids = c.anchors().map(({ key, head }) => ({ key, head }))

        const parent = Effect.runSync(composeEntities("root", kids))
        const again = Effect.runSync(composeEntities("root", kids))
        expect(again.head).toBe(parent.head)
        expect(stateDigest(again.state)).toBe(stateDigest(parent.state))

        // Order of children is committed: reversing them moves the parent head
        // (the chain remembers) while the state fold forgives (distinct keys).
        const reversed = Effect.runSync(composeEntities("root", [...kids].reverse()))
        expect(reversed.head).not.toBe(parent.head)
        expect(stateDigest(reversed.state)).toBe(stateDigest(parent.state))

        // A child's history changing moves the parent transitively.
        const target = kids.at(-1)!
        const grown = kids.map((k) => k.key === target.key
          ? { ...k, head: extend(k.head, event("bus", Number.MAX_SAFE_INTEGER, `${k.key}=grown`)) }
          : k)
        expect(Effect.runSync(composeEntities("root", grown)).head).not.toBe(parent.head)
      }),
      { examples: [[mixed]], seed: 0x07ec_0004, numRuns: 250, endOnFailure: false },
    )
  })
})
