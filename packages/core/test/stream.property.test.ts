import { describe, expect, test } from "bun:test"
import { Effect, Exit, Schema } from "effect"
import * as FastCheck from "fast-check"
import {
  applyKV,
  compact,
  emptyKV,
  encodeEvent,
  encodeFact,
  event,
  extend,
  foldKV,
  headFrom,
  kvStep,
  parseFrames,
  put,
  replay,
  stateDigest,
  streamSeed,
  type Head,
  type KVState,
  type Segment,
  type StreamEvent,
} from "../src/stream.ts"
import {
  apply,
  compose,
  filterKeyPrefix,
  mapValueUpper,
  renameStream,
} from "../src/xform.ts"

const enc = new TextEncoder()
const dec = new TextDecoder("utf-8", { fatal: true })

const rawEvent = (
  stream: string,
  seq: number,
  payload: ReadonlyArray<number> | Uint8Array,
): StreamEvent => ({ stream, seq, payload: Uint8Array.from(payload) })

const shape = (events: ReadonlyArray<StreamEvent>) =>
  events.map((e) => ({ stream: e.stream, seq: e.seq, payload: [...e.payload] }))

const concatFrames = (events: ReadonlyArray<StreamEvent>): Uint8Array => {
  const frames = events.map(encodeEvent)
  const out = new Uint8Array(frames.reduce((sum, frame) => sum + frame.length, 0))
  let offset = 0
  for (const frame of frames) {
    out.set(frame, offset)
    offset += frame.length
  }
  return out
}

const frameEventArbitrary: FastCheck.Arbitrary<StreamEvent> = Schema.toArbitrary(
  Schema.Struct({
    stream: Schema.String.check(Schema.isMaxLength(64)),
    seq: Schema.Int.check(Schema.isBetween({
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    })),
    payload: Schema.Uint8Array.check(Schema.isMaxLength(512)),
  }),
)(FastCheck)

const frameBatchArbitrary = FastCheck.array(frameEventArbitrary, {
  minLength: 100,
  maxLength: 100,
})

const fusionEventArbitrary: FastCheck.Arbitrary<StreamEvent> = Schema.toArbitrary(
  Schema.Struct({
    stream: Schema.Literal("source"),
    seq: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })),
    payload: Schema.Uint8Array.check(Schema.isMaxLength(512)),
  }),
)(FastCheck)
const prefixArbitrary = Schema.toArbitrary(
  Schema.String.check(Schema.isMaxLength(16)),
)(FastCheck)
const fusionCaseArbitrary = FastCheck.record({
  input: fusionEventArbitrary,
  prefix: prefixArbitrary,
  injectEquals: FastCheck.boolean(),
  equalIndex: FastCheck.nat(),
}).map(({ input, prefix, injectEquals, equalIndex }) => {
  const payload = input.payload.slice()
  if (payload.length > 0 && injectEquals) payload[equalIndex % payload.length] = 0x3d
  return { input: { ...input, payload }, prefix }
})

const malformedPayloadCases: ReadonlyArray<ReadonlyArray<number>> = [
  [0x00, 0x3d, 0x76],
  [0x6b, 0x3d, 0x00],
  [0xed, 0xa0, 0x80, 0x3d, 0x76],
  [0x6b, 0x3d, 0xe2, 0x82],
]
const malformedPayloadArbitrary = FastCheck.constantFrom(...malformedPayloadCases)
  .map((payload) => Uint8Array.from(payload))

const prefixDecision = (payload: Uint8Array, prefix: string): boolean => {
  const boundary = payload.indexOf("=".charCodeAt(0))
  if (boundary <= 0) return false
  const bytes = enc.encode(prefix)
  if (bytes.length > boundary) return false
  return bytes.every((byte, i) => payload[i] === byte)
}

describe("stream deterministic properties", () => {
  test("canonical frames invert over 10,000 arbitrary byte payloads", () => {
    FastCheck.assert(
      FastCheck.property(frameBatchArbitrary, (events) => {
        const raw = concatFrames(events)
        expect(shape(parseFrames(raw))).toEqual(shape(events))
        expect(headFrom(streamSeed("property"), parseFrames(raw))).toBe(
          headFrom(streamSeed("property"), events),
        )
      }),
      {
        seed: 0x5eed1234,
        numRuns: 100,
        endOnFailure: false,
        verbose: 1,
        examples: [[[
          rawEvent("", 0, []),
          rawEvent("\"\\/\b\f\n\r\t", Number.MAX_SAFE_INTEGER, [0, 0xff]),
          rawEvent("\u0000", 1, [0x3d]),
          rawEvent("", 2, [0xc0, 0xaf]),
          rawEvent("𐀀", 3, new Uint8Array(512).fill(0xa5)),
        ]]],
      },
    )
  })

  test("every partial canonical field boundary refuses", () => {
    const events = [
      rawEvent("", 0, []),
      rawEvent("β", Number.MAX_SAFE_INTEGER, [0, 0xff, 0x3d]),
      rawEvent("alpha", 7, new Uint8Array(257).fill(0xa5)),
    ]
    const raw = concatFrames(events)
    const boundaries = new Set<number>([0])
    let offset = 0
    for (const event of events) {
      offset += encodeEvent(event).length
      boundaries.add(offset)
    }
    for (let i = 0; i <= raw.length; i++) {
      if (boundaries.has(i)) {
        expect(() => parseFrames(raw.subarray(0, i))).not.toThrow()
      } else {
        expect(() => parseFrames(raw.subarray(0, i))).toThrow()
      }
    }
  })

  test("forged lengths, invalid stream UTF-8, and unsafe sequences refuse", () => {
    const frame = encodeEvent(rawEvent("a", 1, [1]))
    const payLenOffset = 2 + 1 + 8
    new DataView(frame.buffer).setUint32(payLenOffset, 0xffff_ffff)
    expect(() => parseFrames(frame)).toThrow()

    const invalidID = new Uint8Array(2 + 1 + 8 + 4)
    new DataView(invalidID.buffer).setUint16(0, 1)
    invalidID[2] = 0xff
    expect(() => parseFrames(invalidID)).toThrow()

    const unsafe = encodeEvent(rawEvent("a", 1, []))
    new DataView(unsafe.buffer).setBigUint64(3, BigInt(Number.MAX_SAFE_INTEGER) + 1n)
    expect(() => parseFrames(unsafe)).toThrow()
  })

  test("chain heads have one lowercase canonical spelling", () => {
    const seed = streamSeed("canonical-head")
    expect(() => extend(seed.toUpperCase(), event("s", 1, "a=1"))).toThrow(
      "head must be exactly 32 lowercase hexadecimal bytes",
    )
    expect(extend(seed, event("s", 1, "a=1"))).toMatch(/^[0-9a-f]{64}$/)
  })

  test("canonical writers reject values their fixed fields cannot represent", () => {
    const valid = rawEvent("a", 1, [])
    for (const seq of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => encodeEvent({ ...valid, seq })).toThrow()
      expect(() => encodeFact({ picks: [{ stream: "a", seq }] })).toThrow()
    }
    expect(() => encodeEvent({ ...valid, stream: "s".repeat(0x1_0000) })).toThrow()
    expect(() => encodeFact({ picks: [{ stream: "s".repeat(0x1_0000), seq: 1 }] })).toThrow()
    expect(() => encodeEvent({ ...valid, stream: "\ud800" })).toThrow()
    expect(() => streamSeed("\ud800")).toThrow()
    expect(() => extend("00" as Head, valid)).toThrow()
  })
})

describe("transform byte properties", () => {
  test("the key grammar is the first byte '=' boundary", () => {
    const cases: Array<[Uint8Array, string, boolean]> = [
      [enc.encode("a=value"), "a", true],
      [enc.encode("alpha=value"), "a", true],
      [enc.encode("a=value"), "", true],
      [enc.encode("=value"), "", false],
      [enc.encode("alpha"), "a", false],
      [enc.encode("x=a"), "a", false],
      [enc.encode("a=value"), "alpha", false],
      [enc.encode("alpha=value"), "alpha=", false],
      [enc.encode("alpha=x=y"), "alpha", true],
      [enc.encode("β=value"), "β", true],
      [Uint8Array.from([0x61, 0xff, 0x3d, 0x76]), "a", true],
    ]
    for (const [payload, prefix, want] of cases) {
      const input = rawEvent("s", 1, payload)
      const got = filterKeyPrefix(prefix)(input)
      expect(got !== null).toBe(want)
      if (got !== null) expect(shape([got])).toEqual(shape([input]))
    }
  })

  test("every isolated byte follows Go replacement-rune semantics", () => {
    const upper = mapValueUpper()
    for (let byte = 0; byte <= 0xff; byte++) {
      const input = rawEvent("s", 1, [0x6b, 0x3d, byte])
      const got = upper(input)
      expect(got).not.toBeNull()
      const want = byte < 0x80
        ? [0x6b, 0x3d, byte >= 0x61 && byte <= 0x7a ? byte - 0x20 : byte]
        : [0x6b, 0x3d, 0xef, 0xbf, 0xbd]
      expect([...(got as StreamEvent).payload]).toEqual(want)
      expect([...input.payload]).toEqual([0x6b, 0x3d, byte])
    }
  })

  test("simple Unicode casing includes width growth, expansions, and Greek exceptions", () => {
    const cases: Array<[string, string]> = [
      ["key=Straße", "key=STRAßE"],
      ["key=ɐtail", "key=ⱯTAIL"],
      ["key=ﬃ", "key=ﬃ"],
      ["key=ᾀ", "key=ᾈ"],
      ["key=ᾳ", "key=ᾼ"],
      ["key=ῳ", "key=ῼ"],
    ]
    const upper = mapValueUpper()
    for (const [input, want] of cases) {
      const got = upper(rawEvent("s", 1, enc.encode(input)))
      expect(dec.decode((got as StreamEvent).payload)).toBe(want)
    }
    for (const value of [
      [0xff],
      [0xc0, 0xaf],
      [0xe2, 0x82],
      [0xed, 0xa0, 0x80],
      [0xf4, 0x90, 0x80, 0x80],
    ]) {
      const input = rawEvent("s", 1, [0x6b, 0x3d, ...value])
      const got = mapValueUpper()(input) as StreamEvent
      expect([...got.payload.slice(0, 2)]).toEqual([0x6b, 0x3d])
      expect(got.payload.length).toBe(2 + value.length * 3)
      expect([...input.payload]).toEqual([0x6b, 0x3d, ...value])
    }
  })

  test("a drop short-circuits every downstream transform", () => {
    let calls = 0
    const dropped = compose(
      () => null,
      (input) => {
        calls++
        return input
      },
    )(rawEvent("s", 1, enc.encode("a=1")))
    expect(dropped).toBeNull()
    expect(calls).toBe(0)
  })

  test("fusion equals sequential traversal over 10,000 arbitrary payloads", () => {
    FastCheck.assert(
      FastCheck.property(fusionCaseArbitrary, ({ input, prefix }) => {
        const payload = input.payload
        const before = payload.slice()
        const rename = renameStream("z")
        const filter = filterKeyPrefix(prefix)
        const upper = mapValueUpper()
        const fused = apply(compose(rename, filter, upper), [input])
        const sequential = apply(upper, apply(filter, apply(rename, [input])))
        expect(shape(fused)).toEqual(shape(sequential))
        expect((filterKeyPrefix(prefix)(input) !== null)).toBe(prefixDecision(payload, prefix))
        expect([...input.payload]).toEqual([...before])
      }),
      {
        seed: 0x00c0ffee,
        numRuns: 10_000,
        endOnFailure: false,
        verbose: 1,
        examples: [[{
          input: rawEvent("source", Number.MAX_SAFE_INTEGER, enc.encode("κ=Straße")),
          prefix: "κ\u0000",
        }]],
      },
    )
  })
})

describe("state and store adversaries", () => {
  test("the KV refusal generator targets every payload boundary", () => {
    FastCheck.assert(
      FastCheck.property(malformedPayloadArbitrary, (payload) => {
        const input = rawEvent("s", 1, payload)
        const refusal = Effect.runSync(Effect.flip(applyKV(emptyKV, input)))
        expect(refusal._tag).toBe("MalformedPayload")
        expect(kvStep(emptyKV, input)).toBeUndefined()
      }),
      {
        examples: malformedPayloadCases.map((payload) => [Uint8Array.from(payload)]),
        seed: 0x22c1_0003,
        numRuns: 100,
        endOnFailure: false,
      },
    )
  })

  test("KV rejects delimiter collisions, invalid UTF-8, and count overflow", () => {
    const payloads = [
      enc.encode("missing"),
      enc.encode("=empty"),
      Uint8Array.from([0x6b, 0, 0x3d, 0x76]),
      Uint8Array.from([0x6b, 0x3d, 0]),
      Uint8Array.from([0x6b, 0x3d, 0xff]),
    ]
    for (const payload of payloads) {
      expect(Exit.isFailure(Effect.runSyncExit(foldKV([rawEvent("s", 1, payload)])))).toBe(true)
    }
    const overflow: KVState = { entries: new Map(), count: 0xffff_ffff }
    expect(Exit.isFailure(Effect.runSyncExit(applyKV(overflow, event("s", 1, "k=v"))))).toBe(true)
    expect(() => stateDigest({ entries: new Map(), count: 0x1_0000_0000 })).toThrow()
    expect(() => stateDigest({ entries: new Map([["a\0", "b"]]), count: 1 })).toThrow()
  })

  test("UTF-8 byte ordering is insertion-order independent", () => {
    const left: KVState = {
      entries: new Map([["𐀀", "supplementary"], ["", "bmp"]]),
      count: 2,
    }
    const right: KVState = {
      entries: new Map([["", "bmp"], ["𐀀", "supplementary"]]),
      count: 2,
    }
    const want = "490ea0ba348d84e20ac8b0d7312311e01c8c7578ac653c08b6092f804f410ef4"
    expect(stateDigest(left)).toBe(want)
    expect(stateDigest(right)).toBe(want)
  })

  test("content-addressed stores own bytes and reject cycles", () => {
    const root = streamSeed("root")
    const payload = enc.encode("key=value")
    const store = new Map<Head, Segment>()
    const head = put(store, { parent: root, events: [rawEvent("s", 1, payload)] })
    payload[0] = 0x58
    const first = Effect.runSync(replay(store, head, root))
    expect(dec.decode(first[0]!.payload)).toBe("key=value")
    first[0]!.payload[0] = 0x59
    expect(dec.decode(Effect.runSync(replay(store, head, root))[0]!.payload)).toBe("key=value")

    const a = "01".repeat(32)
    const b = "02".repeat(32)
    const cycle = new Map<Head, Segment>([
      [a, { parent: b, events: [] }],
      [b, { parent: a, events: [] }],
    ])
    expect(Exit.isFailure(Effect.runSyncExit(replay(cycle, a, root)))).toBe(true)
  })

  test("compaction rejects boundaries outside the log", () => {
    const events = [event("s", 1, "a=1")]
    for (const boundary of [-1, 0.5, 2]) {
      expect(Exit.isFailure(Effect.runSyncExit(compact(streamSeed("s"), events, boundary)))).toBe(true)
    }
    expect(Effect.runSync(compact(streamSeed("s"), events, 0)).tail.length).toBe(1)
    expect(Effect.runSync(compact(streamSeed("s"), events, 1)).tail.length).toBe(0)
  })
})
