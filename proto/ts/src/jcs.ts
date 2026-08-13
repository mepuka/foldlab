// RFC 8785 identity adapter and the identity fold, TS side. The canonical
// encoder lives in packages/core and is directly walled to go/canonical;
// proto must not carry an independent serializer with a different domain.
import { createHash } from "node:crypto"
import {
  encodeJsonValue,
  type CanonicalEncoding,
  type JsonValue,
} from "../../../packages/core/src/jcs.ts"

export const GENESIS = "0".repeat(64)

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

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

export type { CanonicalEncoding }
export type CanonicalRefusal = Extract<CanonicalEncoding, { readonly ok: false }>["refusal"]

/** Canonical bytes or a typed domain refusal. This is an adapter, not a
 * second implementation: packages/core's encoder is the sole TS RFC 8785
 * serializer and its differential wall binds these bytes to Go. */
export const canonicalize = (value: Json): CanonicalEncoding =>
  encodeJsonValue(value as JsonValue)

export const sha256Hex = (input: string): string =>
  createHash("sha256").update(input, "utf8").digest("hex")

/** Normalize the one unordered collection in flb.type.v0. This is
 * deliberately grammar-aware: arrays in literals/check args remain
 * ordered JSON data, while union members sort by their canonical bytes. */
export const normalize = (value: Json): Json => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value

  switch (value["k"]) {
    case "list":
      return { ...value, of: normalize(value["of"] as Json) }
    case "struct": {
      const rawFields = value["fields"]
      if (typeof rawFields !== "object" || rawFields === null || Array.isArray(rawFields)) return value
      const fields: Record<string, Json> = {}
      for (const name of Object.keys(rawFields)) {
        fields[name] = normalize(rawFields[name] as Json)
      }
      return { ...value, fields }
    }
    case "union": {
      const rawMembers = value["of"]
      if (!Array.isArray(rawMembers)) return value
      const normalized = rawMembers.map(normalize)
      const members: Array<{ readonly value: Json; readonly canonical: string }> = []
      for (const member of normalized) {
        const encoded = canonicalize(member)
        // Structure identity preflights the complete input before normalization,
        // so this branch is unreachable there. Direct diagnostic callers still
        // receive a pure result instead of a serialization exception.
        if (!encoded.ok) return { ...value, of: normalized }
        members.push({ value: member, canonical: encoded.bytes })
      }
      members.sort((left, right) => compareCanonicalBytes(left.canonical, right.canonical))
      return { ...value, of: members.map((member) => member.value) }
    }
    case "brand":
      return { ...value, of: normalize(value["of"] as Json) }
    case "check":
      return { ...value, base: normalize(value["base"] as Json) }
    default:
      return value
  }
}

/** Canonical bytes of a structure after applying its grammar-level
 * unordered-collection normalization. */
export const canonicalizeStructure = (structure: Json): CanonicalEncoding => {
  // Validate before walking: cycles, exotic prototypes, undefined members,
  // non-finite numbers, and invalid Unicode must never reach normalization.
  const admitted = canonicalize(structure)
  return admitted.ok ? canonicalize(normalize(structure)) : admitted
}

/** The owned identity scheme, named to match the daemon (W10). */
export const SCHEME = "flb.type.v1"

/** The transition's attestation-grade predecessor. */
export const ATTESTATION_SCHEME = "bytes-sha256-v1"

export type StructureDigestResult =
  | { readonly ok: true; readonly digest: string }
  | { readonly ok: false; readonly refusal: CanonicalRefusal }

export const structureDigest = (structure: Json): StructureDigestResult => {
  const canonical = canonicalizeStructure(structure)
  return canonical.ok
    ? { ok: true, digest: sha256Hex(canonical.bytes) }
    : canonical
}

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

export interface InvalidSequenceRefusal {
  readonly _tag: "InvalidSequence"
  readonly seq: unknown
  readonly reason: string
}

export type EntryDigestResult =
  | { readonly ok: true; readonly digest: string }
  | {
    readonly ok: false
    readonly refusal: InvalidUnicodeRefusal | InvalidSequenceRefusal | CanonicalRefusal
  }

const invalidUnicode = (field: "payload" | "prev"): InvalidUnicodeRefusal => ({
  _tag: "InvalidUnicode",
  field,
  reason: `${field} is not valid Unicode`,
})

const unicodeScalarRefusal = (
  value: unknown,
  field: "payload" | "prev",
): InvalidUnicodeRefusal | undefined => {
  if (typeof value !== "string") return invalidUnicode(field)
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

const sequenceRefusal = (seq: unknown): InvalidSequenceRefusal | undefined =>
  typeof seq !== "number" ||
    !Number.isSafeInteger(seq) ||
    seq < 0 ||
    Object.is(seq, -0)
    ? { _tag: "InvalidSequence", seq, reason: "seq is not a safe unsigned integer" }
    : undefined

/** Digest of one chain entry: SHA-256 over the canonical bytes of
 * {payload, prev, seq} — byte-identical to go/canonical.EntryDigest. Values
 * outside the Unicode scalar or safe-unsigned sequence domains are typed data
 * refusals, never throws. */
export const entryDigest = (entry: ChainEntry): EntryDigestResult => {
  const refusal = unicodeScalarRefusal(entry.payload, "payload") ??
    unicodeScalarRefusal(entry.prev, "prev") ??
    sequenceRefusal(entry.seq)
  if (refusal !== undefined) return { ok: false, refusal }
  const canonical = canonicalize({ payload: entry.payload, prev: entry.prev, seq: entry.seq })
  return canonical.ok
    ? { ok: true, digest: sha256Hex(canonical.bytes) }
    : canonical
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
    const digest = entryDigest(entry)
    if (!digest.ok) {
      return { ok: false, seq: entry.seq, reason: digest.refusal.reason }
    }
    if (entry.seq !== cursor.seq + 1) {
      return { ok: false, seq: entry.seq, reason: `seq is ${entry.seq}, want ${cursor.seq + 1}` }
    }
    if (entry.prev !== cursor.head) {
      return { ok: false, seq: entry.seq, reason: "prev does not match the verified head" }
    }
    cursor = { seq: entry.seq, head: digest.digest }
  }
  return { ok: true, seq: cursor.seq, head: cursor.head }
}
