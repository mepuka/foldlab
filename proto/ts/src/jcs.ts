// RFC 8785 canonicalization and the identity fold, TS side. This must
// take equal inputs to equal bytes/digests as go/canonical — the wire
// fixture wall (test/wall.test.ts) is the proof, never trust.
import { createHash } from "node:crypto"

export const GENESIS = "0".repeat(64)

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

/** UTF-16 code unit order — JS default string comparison, which is what
 * RFC 8785 specifies for member sorting. */
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const utf8 = new TextEncoder()

/** Lexicographic byte order, used when a grammar law sorts already
 * canonicalized values rather than RFC 8785 object member names. */
export const compareCanonicalBytes = (left: string, right: string): number => {
  const leftBytes = utf8.encode(left)
  const rightBytes = utf8.encode(right)
  const length = Math.min(leftBytes.length, rightBytes.length)
  for (let index = 0; index < length; index++) {
    const delta = leftBytes[index]! - rightBytes[index]!
    if (delta !== 0) return delta
  }
  return leftBytes.length - rightBytes.length
}

/** Canonical bytes of a JSON value (RFC 8785). JSON.stringify already
 * matches JCS for strings (minimal escapes) and numbers (ES shortest
 * form); the work is member ordering and domain policing. */
export const canonicalize = (value: Json): string => {
  if (value === null || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("number is not finite")
    if (Object.is(value, -0)) throw new Error("negative zero is outside the canonical domain")
    return JSON.stringify(value)
  }
  if (typeof value === "string") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`
  const keys = Object.keys(value).sort(byCodeUnit)
  const members = keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key] as Json)}`)
  return `{${members.join(",")}}`
}

export const sha256Hex = (input: string): string =>
  createHash("sha256").update(input, "utf8").digest("hex")

/** Normalize the one unordered collection in flb.type.v0. This is
 * deliberately grammar-aware: arrays in literals/check args remain
 * ordered JSON data, while union members sort by their canonical bytes. */
export const normalizeStructure = (value: Json): Json => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value

  switch (value["k"]) {
    case "list":
      return { ...value, of: normalizeStructure(value["of"] as Json) }
    case "struct": {
      const rawFields = value["fields"]
      if (typeof rawFields !== "object" || rawFields === null || Array.isArray(rawFields)) return value
      const fields: Record<string, Json> = {}
      for (const name of Object.keys(rawFields)) {
        fields[name] = normalizeStructure(rawFields[name] as Json)
      }
      return { ...value, fields }
    }
    case "union": {
      const rawMembers = value["of"]
      if (!Array.isArray(rawMembers)) return value
      const members = rawMembers.map(normalizeStructure)
      members.sort((left, right) => compareCanonicalBytes(canonicalize(left), canonicalize(right)))
      return { ...value, of: members }
    }
    case "brand":
      return { ...value, of: normalizeStructure(value["of"] as Json) }
    case "check":
      return { ...value, base: normalizeStructure(value["base"] as Json) }
    default:
      return value
  }
}

/** Canonical bytes of a structure after applying its grammar-level
 * unordered-collection normalization. */
export const canonicalizeStructure = (structure: Json): string =>
  canonicalize(normalizeStructure(structure))

/** The interim identity scheme, named to match the daemon (W10). */
export const SCHEME = "bytes-sha256-v1"

export const structureDigest = (structure: Json): string => sha256Hex(canonicalizeStructure(structure))

export interface ChainEntry {
  readonly seq: number
  readonly prev: string
  readonly payload: string
}

export interface InvalidUnicodeRefusal {
  readonly _tag: "InvalidUnicode"
  readonly field: "payload" | "prev"
  readonly reason: string
}

export type EntryDigestResult =
  | { readonly ok: true; readonly digest: string }
  | { readonly ok: false; readonly refusal: InvalidUnicodeRefusal }

const invalidUnicode = (field: "payload" | "prev"): InvalidUnicodeRefusal => ({
  _tag: "InvalidUnicode",
  field,
  reason: `${field} is not valid Unicode`,
})

const unicodeScalarRefusal = (
  value: string,
  field: "payload" | "prev",
): InvalidUnicodeRefusal | undefined => {
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = value.charCodeAt(index + 1)
      if (!(low >= 0xdc00 && low <= 0xdfff)) return invalidUnicode(field)
      index++
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return invalidUnicode(field)
    }
  }
  return undefined
}

/** Digest of one chain entry: SHA-256 over the canonical bytes of
 * {payload, prev, seq} — byte-identical to go/canonical.EntryDigest. Values
 * outside the Unicode scalar domain are a typed data refusal, never a throw. */
export const entryDigest = (entry: ChainEntry): EntryDigestResult => {
  const refusal = unicodeScalarRefusal(entry.payload, "payload") ??
    unicodeScalarRefusal(entry.prev, "prev")
  if (refusal !== undefined) return { ok: false, refusal }
  return {
    ok: true,
    digest: sha256Hex(canonicalize({ payload: entry.payload, prev: entry.prev, seq: entry.seq })),
  }
}

/** The verify-on-read chain fold (W6): heads are claims; this recomputes
 * one locally. Returns the verified head, or the seq/reason of the first
 * entry that fails — as data, never a throw. */
export const foldChain = (
  entries: ReadonlyArray<ChainEntry>,
  from: { seq: number; head: string } = { seq: -1, head: GENESIS },
):
  | { ok: true; seq: number; head: string }
  | { ok: false; seq: number; reason: string } => {
  let cursor = from
  for (const entry of entries) {
    if (entry.seq !== cursor.seq + 1) {
      return { ok: false, seq: entry.seq, reason: `seq is ${entry.seq}, want ${cursor.seq + 1}` }
    }
    if (entry.prev !== cursor.head) {
      return { ok: false, seq: entry.seq, reason: "prev does not match the verified head" }
    }
    const digest = entryDigest(entry)
    if (!digest.ok) {
      return { ok: false, seq: entry.seq, reason: digest.refusal.reason }
    }
    cursor = { seq: entry.seq, head: digest.digest }
  }
  return { ok: true, seq: cursor.seq, head: cursor.head }
}
