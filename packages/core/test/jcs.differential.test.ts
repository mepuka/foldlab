/**
 * Task 09 wall: every generated candidate crosses the actual Bun and Go
 * implementations. A mismatch shrinks, stops, and reports exact minimized
 * bytes; it is never converted into an expectation update.
 */

import { afterAll, beforeAll, describe, test } from "bun:test"
import * as FastCheck from "fast-check"
import type { JsonValue } from "../src/jcs.ts"
import { GoJcsProbe, localProbeOutcome, type ProbeOutcome } from "./jcsProbe.ts"

const canonicalSeed = 0x09c5_0001
const decodeSeed = 0x09c5_0002
const defaultRuns = 160
const configuredRuns = process.env["FOLDLAB_JCS_FUZZ_RUNS"]
const numRuns = configuredRuns === undefined ? defaultRuns : Number(configuredRuns)
if (!Number.isSafeInteger(numRuns) || numRuns <= 0) {
  throw new Error("FOLDLAB_JCS_FUZZ_RUNS must be a positive safe integer")
}
const timeout = Math.max(60_000, numRuns * 250)
const utf8 = (value: string): Uint8Array => new TextEncoder().encode(value)

const rawForValue = (value: JsonValue): Uint8Array => {
  const encode = (candidate: JsonValue): string => {
    if (candidate === null || typeof candidate === "boolean" || typeof candidate === "string") {
      return JSON.stringify(candidate)
    }
    if (typeof candidate === "number") return Object.is(candidate, -0) ? "-0" : JSON.stringify(candidate)
    if (Array.isArray(candidate)) return `[${candidate.map(encode).join(",")}]`
    const record = candidate as { readonly [key: string]: JsonValue }
    const members: Array<string> = []
    for (const key of Object.keys(record)) {
      const member = record[key]
      if (member === undefined) throw new Error("fast-check produced an undefined JSON member")
      members.push(`${JSON.stringify(key)}:${encode(member)}`)
    }
    return `{${members.join(",")}}`
  }
  return utf8(encode(value))
}

const sameOutcome = (left: ProbeOutcome, right: ProbeOutcome): boolean =>
  left.accepted === right.accepted &&
  (!left.accepted || (right.accepted && left.canonical === right.canonical))

const renderBytes = (input: Uint8Array): string => {
  const bytes = Buffer.from(input)
  return `utf8=${JSON.stringify(bytes.toString("utf8"))} hex=${bytes.toString("hex")} base64=${bytes.toString("base64")}`
}

const assertDifferential = async <A>(options: {
  readonly lane: string
  readonly arbitrary: FastCheck.Arbitrary<A>
  readonly examples: ReadonlyArray<A>
  readonly seed: number
  readonly render: (value: A) => string
  readonly check: (value: A) => Promise<void>
}): Promise<void> => {
  const details = await FastCheck.check(
    FastCheck.asyncProperty(options.arbitrary, options.check),
    {
      seed: options.seed,
      numRuns,
      examples: options.examples.map((value) => [value]),
      endOnFailure: false,
      verbose: 1,
    },
  )
  if (!details.failed) return
  const minimized = details.counterexample?.[0]
  const cause = details.errorInstance instanceof Error
    ? details.errorInstance.message
    : String(details.errorInstance)
  throw new Error([
    `Task 09 FINDING (${options.lane}); fuzzing stopped`,
    `seed=${details.seed} path=${details.counterexamplePath ?? "n/a"} shrinks=${details.numShrinks}`,
    `minimized=${minimized === undefined ? "unavailable" : options.render(minimized)}`,
    `divergence=${cause}`,
  ].join("\n"))
}

const nestedArray = (depth: number): Uint8Array =>
  utf8(`${"[".repeat(depth)}0${"]".repeat(depth)}`)

const corpus: ReadonlyArray<{ readonly name: string; readonly input: Uint8Array }> = [
  { name: "2^53-3", input: utf8("9007199254740989") },
  { name: "2^53-2", input: utf8("9007199254740990") },
  { name: "2^53-1", input: utf8("9007199254740991") },
  { name: "2^53", input: utf8("9007199254740992") },
  { name: "2^53+1 source", input: utf8("9007199254740993") },
  { name: "2^53+2", input: utf8("9007199254740994") },
  { name: "negative zero", input: utf8("-0") },
  { name: "1e21 boundary", input: utf8("1e21") },
  { name: "1e21 neighbor", input: utf8("999999999999999900000") },
  { name: "1e-7 exponent form", input: utf8("1e-7") },
  { name: "1e-7 plain form", input: utf8("0.0000001") },
  { name: "1e-6 boundary", input: utf8("0.000001") },
  { name: "long mantissa", input: utf8("333333333.33333329") },
  { name: "long mantissa with exponent", input: utf8("1.23456789012345678901234567890123456789e-200") },
  { name: "surrogate pair", input: utf8('"\\ud83d\\ude80"') },
  { name: "control characters", input: utf8('"\\u0000\\b\\t\\n\\f\\r"') },
  { name: "lone high surrogate", input: utf8('"\\ud800"') },
  { name: "lone low surrogate", input: utf8('"\\udc00"') },
  { name: "lone escape", input: utf8('"\\"') },
  { name: "duplicate keys", input: utf8('{"":0,"":1}') },
  { name: "escape-equivalent duplicate keys", input: utf8('{"a":0,"\\u0061":1}') },
  { name: "UTF-16 key ordering", input: utf8('{"�":0,"😀":1,"":2}') },
  { name: "deep accepted structure", input: nestedArray(128) },
  { name: "depth limit", input: nestedArray(257) },
  { name: "trailing second value", input: utf8("{}[]") },
  { name: "invalid UTF-8", input: new Uint8Array([0x22, 0xff, 0x22]) },
]

const edgeNumbers = [
  -(2 ** 53) - 2,
  -(2 ** 53),
  -(2 ** 53) + 1,
  -0,
  0,
  2 ** 53 - 3,
  2 ** 53 - 2,
  2 ** 53 - 1,
  2 ** 53,
  2 ** 53 + 1,
  2 ** 53 + 2,
  1e21,
  999999999999999900000,
  1e-7,
  1e-6,
  333333333.33333329,
] as const

const edgeValues: ReadonlyArray<JsonValue> = [
  ...edgeNumbers,
  "\u0000\b\t\n\f\r",
  "🚀",
  { "�": 0, "😀": 1, "": 2 },
  [[[{ value: 1e-7 }]]],
]

const valueArbitrary: FastCheck.Arbitrary<JsonValue> = FastCheck.oneof(
  { weight: 5, arbitrary: FastCheck.jsonValue({ maxDepth: 8, noUnicodeString: false }) as FastCheck.Arbitrary<JsonValue> },
  { weight: 2, arbitrary: FastCheck.constantFrom(...edgeValues) },
)

const longMantissaArbitrary = FastCheck.tuple(
  FastCheck.boolean(),
  FastCheck.integer({ min: 1, max: 9 }),
  FastCheck.array(FastCheck.integer({ min: 0, max: 9 }), { minLength: 24, maxLength: 96 }),
  FastCheck.integer({ min: -320, max: 320 }),
).map(([negative, first, tail, exponent]) =>
  utf8(`${negative ? "-" : ""}${first}.${tail.join("")}e${exponent}`))

const duplicateArbitrary = FastCheck.tuple(
  FastCheck.string({ maxLength: 12 }),
  FastCheck.jsonValue({ maxDepth: 4 }),
  FastCheck.jsonValue({ maxDepth: 4 }),
).map(([key, left, right]) => utf8(
  `{${JSON.stringify(key)}:${Buffer.from(rawForValue(left as JsonValue)).toString("utf8")},` +
  `${JSON.stringify(key)}:${Buffer.from(rawForValue(right as JsonValue)).toString("utf8")}}`,
))

const rawArbitrary: FastCheck.Arbitrary<Uint8Array> = FastCheck.oneof(
  { weight: 5, arbitrary: FastCheck.json({ maxDepth: 8, noUnicodeString: false }).map(utf8) },
  { weight: 2, arbitrary: longMantissaArbitrary },
  { weight: 2, arbitrary: duplicateArbitrary },
  { weight: 3, arbitrary: FastCheck.uint8Array({ maxLength: 512 }) },
)

let goProbe: GoJcsProbe | undefined

const probe = (): GoJcsProbe => {
  if (goProbe === undefined) throw new Error("Go JCS probe was not started")
  return goProbe
}

beforeAll(() => {
  goProbe = new GoJcsProbe()
})

afterAll(async () => {
  await goProbe?.close()
})

describe("JCS TS ≡ Go differential wall", () => {
  test(`seed corpus byte-compares both implementations (${corpus.length} sharp cases)`, async () => {
    for (const entry of corpus) {
      const local = localProbeOutcome(entry.input)
      const remote = await probe().canonicalize(entry.input)
      if (!sameOutcome(local, remote)) {
        throw new Error(
          `Task 09 FINDING (${entry.name}); minimized=${renderBytes(entry.input)}; TS=${JSON.stringify(local)} Go=${JSON.stringify(remote)}`,
        )
      }
    }
  }, timeout)

  test(`generated JSON values byte-compare; seed=${canonicalSeed}; runs=${numRuns}`, async () => {
    await assertDifferential({
      lane: "canonicalize values",
      arbitrary: valueArbitrary,
      examples: edgeValues,
      seed: canonicalSeed,
      render: (value) => renderBytes(rawForValue(value)),
      check: async (value) => {
        const input = rawForValue(value)
        const local = localProbeOutcome(input)
        const remote = await probe().canonicalize(input)
        if (!sameOutcome(local, remote)) {
          throw new Error(`TS=${JSON.stringify(local)} Go=${JSON.stringify(remote)}`)
        }
      },
    })
  }, timeout)

  test(`generated byte streams decode or refuse identically; seed=${decodeSeed}; runs=${numRuns}`, async () => {
    await assertDifferential({
      lane: "constrained decode",
      arbitrary: rawArbitrary,
      examples: corpus.map((entry) => entry.input),
      seed: decodeSeed,
      render: renderBytes,
      check: async (input) => {
        const local = localProbeOutcome(input)
        const remote = await probe().canonicalize(input)
        if (!sameOutcome(local, remote)) {
          throw new Error(`TS=${JSON.stringify(local)} Go=${JSON.stringify(remote)}`)
        }
      },
    })
  }, timeout)
})
