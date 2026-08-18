/**
 * Estate canonical JSON: one byte string per value, and the parser that reads
 * it back without losing anything.
 *
 * The reference is RFC 8785 (JCS) for member ordering, string escaping, and
 * structure serialization, with one deliberate deviation for numbers. JCS
 * serializes numbers through IEEE-754 doubles; this estate's interchange
 * carries naturals that exceed 2^53 (an encoding vector is a product of
 * multiplications, so it grows fast), so every number here is an unbounded
 * non-negative integer written as minimal decimal, and the carrier is
 * `bigint`. A fraction, an exponent, or a minus sign is malformed input, not a
 * lenient equivalent - the parser refuses it rather than rounding it.
 *
 * Two operations and one law:
 *
 * - {@link parseCanonicalJson} reads text into a value, refusing anything the
 *   number rule forbids and anything JSON forbids.
 * - {@link encodeCanonicalJson} writes a value back as the one canonical byte
 *   string for it.
 * - **Both ways**: for text already in canonical form, parse-then-encode
 *   returns the same bytes, and for any value, encode-then-parse returns an
 *   equal value. {@link isCanonicalJsonText} checks the first direction
 *   directly.
 *
 * The parser is deliberately more permissive than the writer about layout:
 * it accepts whitespace between tokens and members in any order, so it can be
 * used to *canonicalize* input that is merely well-formed. It is not more
 * permissive about meaning: duplicate members, non-integer numbers, unescaped
 * control characters, and lone surrogates are all refused.
 *
 * @module
 */

/** An object in the canonical JSON domain: string keys, canonical values. */
export interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJson
}

/**
 * A value in the canonical JSON domain. Numbers are `bigint` because the
 * interchange's integers are unbounded; there is no `number` case, so a float
 * cannot be represented, let alone written.
 */
export type CanonicalJson =
  | null
  | boolean
  | string
  | bigint
  | ReadonlyArray<CanonicalJson>
  | CanonicalJsonObject

/** Raised when text is not readable, or a value is not writable, as canonical JSON. */
export class CanonicalJsonError extends Error {
  override readonly name = "CanonicalJsonError"
  /** Where the fault is: a byte offset for a parse, a value path for an encode. */
  readonly at: string
  constructor(at: string, reason: string) {
    super(`canonical JSON: ${reason} (at ${at})`)
    this.at = at
  }
}

const refuse = (at: string, reason: string): never => {
  throw new CanonicalJsonError(at, reason)
}

// JCS names five two-character escapes and writes every other control
// character as a four-hex-digit escape in lowercase. Nothing else is escaped:
// no forward slash, no non-ASCII code point.
const twoCharEscapes: { readonly [code: number]: string } = {
  0x08: "\\b",
  0x09: "\\t",
  0x0a: "\\n",
  0x0c: "\\f",
  0x0d: "\\r",
}

/**
 * Writes one string as a canonical JSON string, quotes included.
 *
 * A lone surrogate is refused rather than written: it has no UTF-8 encoding,
 * so a file carrying one has no bytes to be canonical about.
 */
export const encodeCanonicalString = (value: string, at = "$"): string => {
  let out = "\""
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code === 0x22) out += "\\\""
    else if (code === 0x5c) out += "\\\\"
    else if (code < 0x20) {
      out += twoCharEscapes[code] ?? `\\u${code.toString(16).padStart(4, "0")}`
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const low = value.charCodeAt(index + 1)
      if (!(low >= 0xdc00 && low <= 0xdfff)) {
        return refuse(at, "a high surrogate is not followed by a low surrogate")
      }
      out += value[index]! + value[index + 1]!
      index++
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return refuse(at, "a low surrogate stands alone")
    } else out += value[index]!
  }
  return `${out}"`
}

// Member order is by UTF-16 code unit, which is what JavaScript's own string
// comparison does. Keys in this interchange are ASCII, where code-unit order
// and byte order coincide.
const byCodeUnit = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

/**
 * Writes a value as its canonical byte string: members sorted, no whitespace,
 * JCS escapes, integers as minimal decimal.
 *
 * Refuses what the domain cannot carry - a negative integer, a lone
 * surrogate, `undefined`, a function, a JavaScript `number`. The refusal is
 * the point: a value that has no canonical form must not acquire one by
 * rounding or by coercion.
 */
export const encodeCanonicalJson = (value: CanonicalJson, at = "$"): string => {
  if (value === null) return "null"
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false"
    case "string":
      return encodeCanonicalString(value, at)
    case "bigint":
      return value < 0n
        ? refuse(at, `the integer ${value} is negative`)
        : value.toString(10)
    case "object": {
      if (Array.isArray(value)) {
        const members = (value as ReadonlyArray<CanonicalJson>)
          .map((entry, index) => encodeCanonicalJson(entry, `${at}[${index}]`))
        return `[${members.join(",")}]`
      }
      const source = value as CanonicalJsonObject
      const keys = Object.keys(source).sort(byCodeUnit)
      const members = keys.map((key) => {
        const member = source[key]
        if (member === undefined) return refuse(`${at}.${key}`, "the member is undefined")
        return `${encodeCanonicalString(key, `${at}.${key}`)}:${
          encodeCanonicalJson(member, `${at}.${key}`)
        }`
      })
      return `{${members.join(",")}}`
    }
    default:
      return refuse(at, `a ${typeof value} has no canonical JSON form`)
  }
}

const isDigit = (code: number): boolean => code >= 0x30 && code <= 0x39

const hexValue = (code: number): number =>
  code >= 0x30 && code <= 0x39
    ? code - 0x30
    : code >= 0x61 && code <= 0x66
    ? code - 0x61 + 10
    : code >= 0x41 && code <= 0x46
    ? code - 0x41 + 10
    : -1

/** A cursor over the source text. One instance reads one document. */
class Reader {
  readonly source: string
  offset = 0
  constructor(source: string) {
    this.source = source
  }

  skipWhitespace(): void {
    while (this.offset < this.source.length) {
      const code = this.source.charCodeAt(this.offset)
      if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) this.offset++
      else break
    }
  }

  refuseHere(reason: string): never {
    return refuse(`offset ${this.offset}`, reason)
  }

  expect(character: string): void {
    if (this.source[this.offset] !== character) {
      this.refuseHere(`expected ${character}`)
    }
    this.offset++
  }
}

const readString = (reader: Reader): string => {
  reader.expect("\"")
  let out = ""
  for (;;) {
    if (reader.offset >= reader.source.length) reader.refuseHere("the string is unterminated")
    const code = reader.source.charCodeAt(reader.offset)
    if (code === 0x22) {
      reader.offset++
      return out
    }
    if (code < 0x20) reader.refuseHere("an unescaped control character is in a string")
    if (code !== 0x5c) {
      out += reader.source[reader.offset]!
      reader.offset++
      continue
    }
    reader.offset++
    const escape = reader.source[reader.offset]
    reader.offset++
    switch (escape) {
      case "\"":
        out += "\""
        break
      case "\\":
        out += "\\"
        break
      case "/":
        out += "/"
        break
      case "b":
        out += "\b"
        break
      case "f":
        out += "\f"
        break
      case "n":
        out += "\n"
        break
      case "r":
        out += "\r"
        break
      case "t":
        out += "\t"
        break
      case "u": {
        let value = 0
        for (let digit = 0; digit < 4; digit++) {
          const nibble = hexValue(reader.source.charCodeAt(reader.offset + digit))
          if (nibble < 0) reader.refuseHere("a \\u escape is not four hex digits")
          value = value * 16 + nibble
        }
        reader.offset += 4
        out += String.fromCharCode(value)
        break
      }
      default:
        reader.refuseHere(`unknown escape \\${escape ?? "<end of input>"}`)
    }
  }
}

// The number rule, tighter than JSON's: an unbounded non-negative integer in
// minimal decimal. A consumer that quietly accepted 1.0, 1e3, or -1 would be
// accepting a different interchange.
const readInteger = (reader: Reader): bigint => {
  const start = reader.offset
  if (reader.source[reader.offset] === "-") {
    reader.refuseHere("a number carries a minus sign")
  }
  while (reader.offset < reader.source.length && isDigit(reader.source.charCodeAt(reader.offset))) {
    reader.offset++
  }
  if (reader.offset === start) reader.refuseHere("expected a digit")
  const digits = reader.source.slice(start, reader.offset)
  const next = reader.source[reader.offset]
  if (next === "." ) reader.refuseHere("a number carries a fraction")
  if (next === "e" || next === "E") reader.refuseHere("a number carries an exponent")
  if (digits.length > 1 && digits.startsWith("0")) {
    reader.refuseHere("a number carries a leading zero")
  }
  return BigInt(digits)
}

const readValue = (reader: Reader): CanonicalJson => {
  reader.skipWhitespace()
  const character = reader.source[reader.offset]
  if (character === undefined) reader.refuseHere("the document ends before a value")
  switch (character) {
    case "{": {
      reader.offset++
      const out: { [key: string]: CanonicalJson } = Object.create(null) as {
        [key: string]: CanonicalJson
      }
      reader.skipWhitespace()
      if (reader.source[reader.offset] === "}") {
        reader.offset++
        return out
      }
      for (;;) {
        reader.skipWhitespace()
        const key = readString(reader)
        if (Object.prototype.hasOwnProperty.call(out, key)) {
          reader.refuseHere(`the member ${key} is written twice`)
        }
        reader.skipWhitespace()
        reader.expect(":")
        out[key] = readValue(reader)
        reader.skipWhitespace()
        const next = reader.source[reader.offset]
        if (next === ",") {
          reader.offset++
          continue
        }
        if (next === "}") {
          reader.offset++
          return out
        }
        reader.refuseHere("expected , or }")
      }
    }
    case "[": {
      reader.offset++
      const out: Array<CanonicalJson> = []
      reader.skipWhitespace()
      if (reader.source[reader.offset] === "]") {
        reader.offset++
        return out
      }
      for (;;) {
        out.push(readValue(reader))
        reader.skipWhitespace()
        const next = reader.source[reader.offset]
        if (next === ",") {
          reader.offset++
          continue
        }
        if (next === "]") {
          reader.offset++
          return out
        }
        reader.refuseHere("expected , or ]")
      }
    }
    case "\"":
      return readString(reader)
    case "t":
      if (reader.source.startsWith("true", reader.offset)) {
        reader.offset += 4
        return true
      }
      return reader.refuseHere("expected true")
    case "f":
      if (reader.source.startsWith("false", reader.offset)) {
        reader.offset += 5
        return false
      }
      return reader.refuseHere("expected false")
    case "n":
      if (reader.source.startsWith("null", reader.offset)) {
        reader.offset += 4
        return null
      }
      return reader.refuseHere("expected null")
    default:
      return readInteger(reader)
  }
}

/**
 * Reads one canonical JSON document. Integers arrive as `bigint`, so a value
 * above 2^53 survives the round trip that `JSON.parse` would silently round.
 */
export const parseCanonicalJson = (text: string): CanonicalJson => {
  const reader = new Reader(text)
  const value = readValue(reader)
  reader.skipWhitespace()
  if (reader.offset !== text.length) {
    reader.refuseHere("the document carries trailing content")
  }
  return value
}

/**
 * Whether text is already in canonical form: it parses, and writing the parsed
 * value back reproduces the same bytes. This is the both-ways law as a
 * predicate, and it subsumes member order, whitespace, escaping, and the
 * minimal-decimal number rule in one comparison.
 */
export const isCanonicalJsonText = (text: string): boolean => {
  try {
    return encodeCanonicalJson(parseCanonicalJson(text)) === text
  } catch {
    return false
  }
}

/**
 * The canonical form of text that is merely well-formed. Refuses the same
 * inputs {@link parseCanonicalJson} refuses.
 */
export const canonicalizeJsonText = (text: string): string =>
  encodeCanonicalJson(parseCanonicalJson(text))
