/** RFC 8785 canonical JSON and its load-bearing constrained decoder. */

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

export type CanonicalEncoding =
  | { readonly ok: true; readonly bytes: string }
  | {
    readonly ok: false
    readonly refusal: {
      readonly _tag: "NonCanonicalValue"
      readonly path: string
      readonly reason: string
    }
  }

export type JsonDecode =
  | { readonly ok: true; readonly value: JsonValue }
  | {
    readonly ok: false
    readonly refusal: {
      readonly _tag: "InvalidJson"
      readonly offset: number
      readonly reason: string
    }
  }

export type CanonicalJson = CanonicalEncoding | Exclude<JsonDecode, { readonly ok: true }>

const maxJsonDepth = 256
const strictUtf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

const byCodeUnit = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0

const hasUnpairedSurrogate = (value: string): boolean => {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      index++
      const next = value.charCodeAt(index)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true
    }
  }
  return false
}

const refuseEncoding = (path: string, reason: string): CanonicalEncoding => ({
  ok: false,
  refusal: { _tag: "NonCanonicalValue", path, reason },
})

const encodeValue = (
  value: JsonValue,
  path: string,
  ancestors: Set<object>,
  depth: number,
): CanonicalEncoding => {
  if (value === null || typeof value === "boolean") {
    return { ok: true, bytes: JSON.stringify(value) }
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return refuseEncoding(path, "number is not finite")
    return { ok: true, bytes: JSON.stringify(value) }
  }
  if (typeof value === "string") {
    if (hasUnpairedSurrogate(value)) return refuseEncoding(path, "string is not valid Unicode")
    return { ok: true, bytes: JSON.stringify(value) }
  }
  if (Array.isArray(value)) {
    if (depth >= maxJsonDepth) return refuseEncoding(path, `nesting exceeds ${maxJsonDepth}`)
    if (ancestors.has(value)) return refuseEncoding(path, "cyclic values are outside the canonical domain")
    ancestors.add(value)
    const parts: Array<string> = []
    for (let index = 0; index < value.length; index++) {
      const member = value[index]
      if (member === undefined) return refuseEncoding(`${path}/${index}`, "undefined is outside the canonical domain")
      const encoded = encodeValue(member, `${path}/${index}`, ancestors, depth + 1)
      if (!encoded.ok) return encoded
      parts.push(encoded.bytes)
    }
    ancestors.delete(value)
    return { ok: true, bytes: `[${parts.join(",")}]` }
  }
  const record = value as { readonly [key: string]: JsonValue }
  if (depth >= maxJsonDepth) return refuseEncoding(path, `nesting exceeds ${maxJsonDepth}`)
  const prototype = Object.getPrototypeOf(record)
  if (prototype !== null && prototype !== Object.prototype) {
    // A Date, Map, Set, or class instance smuggled past the JsonValue type
    // would otherwise serialize by its enumerable own keys — usually `{}` —
    // colliding distinct values onto one canonical witness. Only plain and
    // null-prototype objects (what the constrained decoder mints) are canonical.
    return refuseEncoding(path, "non-plain objects are outside the canonical domain")
  }
  if (ancestors.has(record)) return refuseEncoding(path, "cyclic values are outside the canonical domain")
  ancestors.add(record)
  const keys = Object.keys(record).sort(byCodeUnit)
  const members: Array<string> = []
  for (const key of keys) {
    if (hasUnpairedSurrogate(key)) return refuseEncoding(`${path}/${key}`, "member name is not valid Unicode")
    const member = record[key]
    if (member === undefined) return refuseEncoding(`${path}/${key}`, "undefined is outside the canonical domain")
    const encoded = encodeValue(member, `${path}/${key}`, ancestors, depth + 1)
    if (!encoded.ok) return encoded
    members.push(`${JSON.stringify(key)}:${encoded.bytes}`)
  }
  ancestors.delete(record)
  return { ok: true, bytes: `{${members.join(",")}}` }
}

/** RFC 8785 serialization makes canonical bytes a unique equality witness. */
export const encodeJsonValue = (value: JsonValue): CanonicalEncoding =>
  encodeValue(value, "$", new Set(), 0)

class JsonParserFailure extends Error {
  constructor(readonly offset: number, message: string) {
    super(message)
  }
}

class JsonParser {
  private offset = 0

  constructor(private readonly source: string) {}

  parse(): JsonValue {
    const value = this.parseValue(0)
    this.skipWhitespace()
    if (this.offset !== this.source.length) this.fail("trailing data after the JSON value")
    return value
  }

  private parseValue(depth: number): JsonValue {
    this.skipWhitespace()
    const token = this.source[this.offset]
    switch (token) {
      case "n":
        return this.parseLiteral("null", null)
      case "t":
        return this.parseLiteral("true", true)
      case "f":
        return this.parseLiteral("false", false)
      case '"':
        return this.parseString()
      case "[":
        return this.parseArray(depth)
      case "{":
        return this.parseObject(depth)
      default:
        if (token === "-" || (token !== undefined && token >= "0" && token <= "9")) {
          return this.parseNumber()
        }
        return this.fail("expected a JSON value")
    }
  }

  private parseLiteral<T extends null | boolean>(spelling: string, value: T): T {
    if (!this.source.startsWith(spelling, this.offset)) this.fail(`expected ${spelling}`)
    this.offset += spelling.length
    return value
  }

  private parseArray(depth: number): ReadonlyArray<JsonValue> {
    if (depth >= maxJsonDepth) this.fail(`nesting exceeds ${maxJsonDepth}`)
    this.offset++
    this.skipWhitespace()
    const values: Array<JsonValue> = []
    if (this.source[this.offset] === "]") {
      this.offset++
      return values
    }
    while (true) {
      values.push(this.parseValue(depth + 1))
      this.skipWhitespace()
      const separator = this.source[this.offset++]
      if (separator === "]") return values
      if (separator !== ",") this.fail("expected ',' or ']' in array")
    }
  }

  private parseObject(depth: number): { readonly [key: string]: JsonValue } {
    if (depth >= maxJsonDepth) this.fail(`nesting exceeds ${maxJsonDepth}`)
    this.offset++
    this.skipWhitespace()
    const value = Object.create(null) as Record<string, JsonValue>
    const names = new Set<string>()
    if (this.source[this.offset] === "}") {
      this.offset++
      return value
    }
    while (true) {
      this.skipWhitespace()
      if (this.source[this.offset] !== '"') this.fail("expected an object member name")
      const name = this.parseString()
      if (names.has(name)) this.fail("duplicate object member name")
      names.add(name)
      this.skipWhitespace()
      if (this.source[this.offset++] !== ":") this.fail("expected ':' after object member name")
      value[name] = this.parseValue(depth + 1)
      this.skipWhitespace()
      const separator = this.source[this.offset++]
      if (separator === "}") return value
      if (separator !== ",") this.fail("expected ',' or '}' in object")
    }
  }

  private parseString(): string {
    this.offset++
    let value = ""
    let start = this.offset
    while (this.offset < this.source.length) {
      const unit = this.source.charCodeAt(this.offset)
      if (unit === 0x22) {
        value += this.source.slice(start, this.offset)
        this.offset++
        return value
      }
      if (unit === 0x5c) {
        value += this.source.slice(start, this.offset)
        this.offset++
        const escape = this.source[this.offset++]
        switch (escape) {
          case '"':
          case "\\":
          case "/":
            value += escape
            break
          case "b":
            value += "\b"
            break
          case "f":
            value += "\f"
            break
          case "n":
            value += "\n"
            break
          case "r":
            value += "\r"
            break
          case "t":
            value += "\t"
            break
          case "u": {
            const high = this.parseHexUnit()
            if (high >= 0xd800 && high <= 0xdbff) {
              if (this.source[this.offset] !== "\\" || this.source[this.offset + 1] !== "u") {
                this.fail("lone high surrogate escape")
              }
              this.offset += 2
              const low = this.parseHexUnit()
              if (low < 0xdc00 || low > 0xdfff) this.fail("high surrogate is not followed by a low surrogate")
              value += String.fromCharCode(high, low)
            } else {
              if (high >= 0xdc00 && high <= 0xdfff) this.fail("lone low surrogate escape")
              value += String.fromCharCode(high)
            }
            break
          }
          default:
            this.fail("invalid string escape")
        }
        start = this.offset
        continue
      }
      if (unit < 0x20) this.fail("unescaped control character in string")
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const low = this.source.charCodeAt(this.offset + 1)
        if (low < 0xdc00 || low > 0xdfff) this.fail("string is not valid Unicode")
        this.offset += 2
        continue
      }
      if (unit >= 0xdc00 && unit <= 0xdfff) this.fail("string is not valid Unicode")
      this.offset++
    }
    return this.fail("unterminated string")
  }

  private parseHexUnit(): number {
    if (this.offset + 4 > this.source.length) this.fail("incomplete Unicode escape")
    let value = 0
    for (let index = 0; index < 4; index++) {
      const unit = this.source.charCodeAt(this.offset++)
      const nibble = unit >= 0x30 && unit <= 0x39
        ? unit - 0x30
        : unit >= 0x41 && unit <= 0x46
        ? unit - 0x41 + 10
        : unit >= 0x61 && unit <= 0x66
        ? unit - 0x61 + 10
        : -1
      if (nibble < 0) this.fail("invalid Unicode escape")
      value = value * 16 + nibble
    }
    return value
  }

  private parseNumber(): number {
    const start = this.offset
    if (this.source[this.offset] === "-") this.offset++
    if (this.source[this.offset] === "0") {
      this.offset++
      const next = this.source[this.offset]
      if (next !== undefined && next >= "0" && next <= "9") this.fail("leading zero in number")
    } else {
      const first = this.source[this.offset]
      if (first === undefined || first < "1" || first > "9") this.fail("expected a number")
      do this.offset++
      while (this.source[this.offset] !== undefined && this.source[this.offset]! >= "0" && this.source[this.offset]! <= "9")
    }
    if (this.source[this.offset] === ".") {
      this.offset++
      const first = this.source[this.offset]
      if (first === undefined || first < "0" || first > "9") this.fail("fraction requires a digit")
      do this.offset++
      while (this.source[this.offset] !== undefined && this.source[this.offset]! >= "0" && this.source[this.offset]! <= "9")
    }
    const exponent = this.source[this.offset]
    if (exponent === "e" || exponent === "E") {
      this.offset++
      const sign = this.source[this.offset]
      if (sign === "+" || sign === "-") this.offset++
      const first = this.source[this.offset]
      if (first === undefined || first < "0" || first > "9") this.fail("exponent requires a digit")
      do this.offset++
      while (this.source[this.offset] !== undefined && this.source[this.offset]! >= "0" && this.source[this.offset]! <= "9")
    }
    const value = Number(this.source.slice(start, this.offset))
    if (!Number.isFinite(value)) this.fail("number is not finite in IEEE 754 binary64")
    return value
  }

  private skipWhitespace(): void {
    while (true) {
      const unit = this.source.charCodeAt(this.offset)
      if (unit !== 0x20 && unit !== 0x09 && unit !== 0x0a && unit !== 0x0d) return
      this.offset++
    }
  }

  private fail(reason: string): never {
    throw new JsonParserFailure(this.offset, reason)
  }
}

/** I-JSON's uniqueness and Unicode laws license decoding one byte stream to one value. */
export const decodeJson = (input: Uint8Array): JsonDecode => {
  let source: string
  try {
    source = strictUtf8.decode(input)
  } catch {
    return {
      ok: false,
      refusal: { _tag: "InvalidJson", offset: 0, reason: "input is not valid UTF-8" },
    }
  }
  try {
    return { ok: true, value: new JsonParser(source).parse() }
  } catch (error) {
    if (error instanceof JsonParserFailure) {
      return {
        ok: false,
        refusal: { _tag: "InvalidJson", offset: error.offset, reason: error.message },
      }
    }
    throw error
  }
}

/** Constrained decode followed by RFC 8785 serialization licenses canonicalizing bytes. */
export const canonicalizeJson = (input: Uint8Array): CanonicalJson => {
  const decoded = decodeJson(input)
  return decoded.ok ? encodeJsonValue(decoded.value) : decoded
}
