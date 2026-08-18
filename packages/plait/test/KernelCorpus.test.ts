/**
 * The canonical-form wall.
 *
 * The interchange is written in one canonical form, and this file is where
 * TypeScript earns the right to be called a conforming reader of it. Four
 * claims, in rising strength.
 *
 * 1. **The both-ways law, over the whole corpus.** Parse every line and write
 *    it back; the file that comes out is the file that went in, byte for byte.
 *    This one comparison subsumes member order, whitespace, string escaping,
 *    and the minimal-decimal number rule, because each of those changes a byte.
 * 2. **The weak canon check.** Every canon record's `value`, canonicalized, is
 *    the string in its `bytes`.
 * 3. **The strong canon check.** The ten values are constructed here, in
 *    TypeScript, and compared to ten pinned byte strings. This is the half a
 *    parse-and-re-emit cannot reach: a value read out of the corpus is already
 *    sorted, so re-canonicalizing it sorts nothing. Only a value this file
 *    builds with `b` before `a` exercises the member sort.
 *
 *    The ten strings are the specification of the serializer, not a
 *    transcription of the model's tables, which is why pinning them here is a
 *    check rather than a fork. Eight come from the normative schema's §3, which
 *    has its own machine-checked reference implementation. Two - `string-escapes`
 *    and `control-char` - are the exact values the emitter chose, because §3
 *    recorded both as open pending that choice and the emitter is normative
 *    where the freeze is silent. Both satisfy the freeze: one carries a quote,
 *    a backslash, a newline and a tab; the other carries U+0001.
 * 4. **The control arm.** A validator with no failing case proves nothing. Each
 *    control below mutates exactly one thing in an otherwise-good corpus and
 *    asserts the reader refuses it, naming what moved.
 *
 * Numbers are `bigint` throughout. `JSON.parse` is not a conforming parser for
 * this file and the big-integer vector is the one-line proof.
 */
import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"

import {
  CANON_VECTOR_NAMES,
  CORPUS_PATH,
  readKernelCorpus,
} from "../scripts/kernel-corpus.js"
import {
  canonicalizeJsonText,
  encodeCanonicalJson,
  isCanonicalJsonText,
  parseCanonicalJson,
  type CanonicalJson,
} from "../src/CanonicalJson.js"

const repository = resolve(import.meta.dir, "../../..")
const source = await Bun.file(resolve(repository, CORPUS_PATH)).text()
const corpus = readKernelCorpus(source)

/**
 * The ten canonical-form vectors, built here rather than read from the file.
 * `key-order` is written `b` first on purpose: that is the only way the member
 * sort is exercised at all, since anything already in the corpus is sorted.
 */
const nativeVectors: ReadonlyArray<readonly [string, CanonicalJson, string]> = [
  ["empty-object", {}, "{}"],
  ["empty-array", [], "[]"],
  ["empty-string", "", "\"\""],
  ["zero", 0n, "0"],
  ["big-integer", 9007199254740993n, "9007199254740993"],
  ["key-order", { b: 1n, a: 2n }, "{\"a\":2,\"b\":1}"],
  ["nested-object", { z: { y: [3n, 4n] } }, "{\"z\":{\"y\":[3,4]}}"],
  ["nested-array", [[], [{}]], "[[],[{}]]"],
  ["string-escapes", "a\"b\\c\nd\te", "\"a\\\"b\\\\c\\nd\\te\""],
  ["control-char", "\u0001", "\"\\u0001\""],
]

/**
 * Vectors the emitted ten do not reach, checked here so the gap is closed
 * rather than only named. The emitter's `control-char` is one character, so
 * nothing in the corpus catches an escaper that truncates a string at a
 * control character; no corpus vector prints a hex letter, so the lowercase
 * rule goes unexercised; and three of the five two-character escapes, and all
 * three literals, appear nowhere in the corpus at all. Every one of them is
 * cheap to cover directly, against the specification rather than the file.
 */
const gapVectors: ReadonlyArray<readonly [string, CanonicalJson, string]> = [
  ["control-char-surrounded", "control\u0001char", "\"control\\u0001char\""],
  ["hex-letter", "\u000b", "\"\\u000b\""],
  ["every-two-char-escape", "\b\f\n\r\t", "\"\\b\\f\\n\\r\\t\""],
  ["literals", [null, true, false], "[null,true,false]"],
]

/** One line of the corpus, with one thing about it changed. */
const mutate = (find: string, replace: string): string => {
  const at = source.indexOf(find)
  expect(at).toBeGreaterThanOrEqual(0)
  return `${source.slice(0, at)}${replace}${source.slice(at + find.length)}`
}

describe("the both-ways law", () => {
  test("the whole corpus survives parse and re-emit, byte for byte", () => {
    const rewritten = corpus.lines
      .map((line) => `${encodeCanonicalJson(parseCanonicalJson(line))}\n`)
      .join("")
    expect(rewritten).toBe(source)
    console.info(
      `CANONICAL BOTH-WAYS: PASS lines=${corpus.lines.length} bytes=${source.length}` +
        ` corpus=${CORPUS_PATH}`,
    )
  })

  test("every line is already in canonical form", () => {
    const moved = corpus.lines
      .map((line, index) => ({ line, index }))
      .filter((row) => !isCanonicalJsonText(row.line))
    expect(moved.map((row) => row.index + 1)).toEqual([])
  })

  test("the file is ASCII, LF-terminated, and carries no empty line", () => {
    expect(source.includes("\r")).toBe(false)
    expect(source.endsWith("\n")).toBe(true)
    expect(source.split("\n").filter((line) => line === "").length).toBe(1)
    expect([...source].every((character) => character.charCodeAt(0) <= 0x7f)).toBe(true)
  })
})

describe("the canon vectors", () => {
  test("the corpus names the ten vectors, in the schema's order", () => {
    expect(corpus.canons.map((canon) => canon.name)).toEqual([...CANON_VECTOR_NAMES])
  })

  test("weak: every vector's value canonicalizes to the bytes it carries", () => {
    for (const canon of corpus.canons) {
      expect(encodeCanonicalJson(canon.value as CanonicalJson)).toBe(canon.bytes)
    }
  })

  test("strong: values built here canonicalize to the bytes the schema pins", () => {
    for (const [name, value, bytes] of nativeVectors) {
      expect({ name, bytes: encodeCanonicalJson(value) }).toEqual({ name, bytes })
    }
    console.info(
      `CANON STRONG: PASS constructed=${nativeVectors.length}/${CANON_VECTOR_NAMES.length}` +
        ` vectors=${nativeVectors.map(([name]) => name).join(",")}`,
    )
  })

  test("strong: the natively built bytes are the bytes the corpus carries", () => {
    const pinned = new Map(corpus.canons.map((canon) => [canon.name, canon.bytes] as const))
    for (const [name, , bytes] of nativeVectors) {
      expect([name, pinned.get(name)]).toEqual([name, bytes])
    }
  })

  test("the cases the emitted ten leave uncovered are covered here", () => {
    for (const [name, value, bytes] of gapVectors) {
      expect({ name, bytes: encodeCanonicalJson(value) }).toEqual({ name, bytes })
    }
    console.info(
      `CANON GAPS: PASS covered=${gapVectors.map(([name]) => name).join(",")}` +
        " reason=not-exercised-by-the-emitted-ten",
    )
  })

  test("the big-integer vector is past what a double holds, and survives anyway", () => {
    const canon = corpus.canons.find((row) => row.name === "big-integer")
    expect(canon?.value).toBe(9007199254740993n)
    // The one-line proof that JSON.parse is not a conforming parser here.
    expect(JSON.parse("9007199254740993")).toBe(9007199254740992)
    expect(parseCanonicalJson("9007199254740993")).toBe(9007199254740993n)
  })
})

describe("the number rule, tighter than JSON's", () => {
  test("a fraction, an exponent, a minus, and a leading zero are refused", () => {
    for (const text of ["1.0", "1e3", "1E3", "-1", "01"]) {
      expect(() => parseCanonicalJson(text)).toThrow()
    }
  })

  test("integers parse at arbitrary precision, and re-emit minimally", () => {
    const wide = "170141183460469231731687303715884105727"
    expect(canonicalizeJsonText(wide)).toBe(wide)
    expect(parseCanonicalJson(wide)).toBe(BigInt(wide))
  })

  test("a duplicate member and an unescaped control character are refused", () => {
    expect(() => parseCanonicalJson("{\"a\":1,\"a\":2}")).toThrow(/written twice/)
    expect(() => parseCanonicalJson("\"a\u0001b\"")).toThrow(/unescaped control character/)
  })
})

describe("the control arm", () => {
  test("a swapped pair of members is refused as non-canonical", () => {
    const moved = mutate(
      "{\"name\":\"schema\",\"rank\":0,\"record\":\"kind\"}",
      "{\"rank\":0,\"name\":\"schema\",\"record\":\"kind\"}",
    )
    expect(() => readKernelCorpus(moved)).toThrow(/is not in canonical form/)
  })

  test("a big-integer rounded through a double is refused", () => {
    const rounded = mutate("9007199254740993", "9007199254740992")
    expect(() => readKernelCorpus(rounded)).toThrow()
  })

  test("a re-escaped control character is refused, and hex case is pinned", () => {
    // U+0001 spells as `0` and `1`, so no canon vector prints a hex letter and
    // the lowercase rule goes unexercised by the corpus. The gap is named in
    // the schema rather than papered over, so it is closed here directly,
    // against the canonicalizer, with U+000B - which does print one.
    expect(isCanonicalJsonText("\"\\u000B\"")).toBe(false)
    expect(isCanonicalJsonText("\"\\u000b\"")).toBe(true)
    expect(canonicalizeJsonText("\"\\u000B\"")).toBe("\"\\u000b\"")
    // And in the corpus itself: a newline written the long way is the same
    // value and a different line, which is exactly what the per-line canonical
    // check exists to catch.
    expect(() => readKernelCorpus(mutate("kind: a\\ndigest", "kind: a\\u000adigest")))
      .toThrow(/is not in canonical form/)
  })

  test("a canon record whose bytes drift from its value is refused", () => {
    // The `value` member gains a character; the `bytes` member does not. The
    // two are bound by the both-ways law, so the drift is caught at the vector
    // rather than surviving as a plausible-looking record.
    expect(() => readKernelCorpus(mutate(",\"value\":\"\\u0001\"}", ",\"value\":\"\\u0002\"}")))
      .toThrow(/canon vector control-char pins bytes/)
  })

  test("a format the reader does not know is refused, naming both", () => {
    const older = mutate("\"format\":2", "\"format\":1")
    expect(() => readKernelCorpus(older)).toThrow(/understands format 2/)
  })

  test("a count that disagrees with the records read is refused", () => {
    const miscounted = mutate("\"kind\":12", "\"kind\":11")
    expect(() => readKernelCorpus(miscounted)).toThrow(/the header pins 11 kind records/)
  })

  test("a carriage return, a missing final newline, and a non-ASCII byte are refused", () => {
    expect(() => readKernelCorpus(`${source.slice(0, -1)}\r\n`)).toThrow(/carriage return/)
    expect(() => readKernelCorpus(source.slice(0, -1))).toThrow(/does not end with a newline/)
    expect(() => readKernelCorpus(mutate("\"schema\"", "\"sch\u00e9ma\""))).toThrow(/not ASCII/)
  })

  test("an unknown record group is skipped, not fatal", () => {
    const extended = `${source}{"record":"future","what":"a group this reader does not know"}\n`
    const read = readKernelCorpus(extended)
    expect(read.skipped).toEqual(["future"])
    console.info(
      "CORPUS CONTROLS: PASS refused=member-swap,double-rounded-integer,long-form-escape," +
        "canon-bytes-drift,unknown-format,miscount,carriage-return,missing-final-lf,non-ascii" +
        ` skipped-group=${read.skipped.join(",")}`,
    )
  })
})

describe("the corpus reader", () => {
  test("it reads the groups the schema names, at the counts the header pins", () => {
    expect({
      kinds: corpus.kinds.length,
      stages: corpus.stages.length,
      refusals: corpus.refusals.length,
      types: corpus.types.length,
      encodings: corpus.encodings.length,
      admissions: corpus.admissions.length,
      docs: corpus.docs.length,
      canons: corpus.canons.length,
      lines: corpus.lines.length,
    }).toEqual({
      kinds: 12,
      stages: 5,
      refusals: 16,
      types: 22,
      encodings: 12,
      admissions: 17,
      docs: 22,
      canons: 10,
      lines: 117,
    })
  })

  test("admission row i and refusal row i name the same reason", () => {
    corpus.admissions.forEach((admission, index) => {
      if (admission.verdict !== "refused") return
      expect(admission.reason).toBe(corpus.refusals[index]!.reason)
    })
  })

  test("the corpus read is the model's own emission, not a stand-in", () => {
    // Pinned so that a stand-in cannot quietly become what the runtime derives
    // from: every derivation in this package enters through this one constant.
    expect(CORPUS_PATH).toBe("packages/plait/fixtures/kernel-conformance.ndjson")
    expect(corpus.header.source).toBe("verify/kernel")
    expect(corpus.header.generator).toBe("verify/unity emit")
    expect(corpus.header.format).toBe(2n)
  })
})
