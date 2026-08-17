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

/** The certifier's closure law, mirrored (operator ruling 7): every number in a
 * flb.type.v0 term is integral. This is the MIRROR's sentence, kept verbatim
 * from the author fold so no client-visible refusal text moved when the bound
 * did; the daemon utters its own wording, and the bound the two state is the
 * same one. */
export const INTEGRAL_NUMBER_LAW =
  "every number in a type term is integral — whole and within ±(2^53-1); use opaque for other numbers"

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** Where the closure law was broken, as a term coordinate. */
export interface NonIntegralNumber {
  readonly path: ReadonlyArray<string>
  readonly value: number
}

/** The one TS statement of the integrality bound, as ONE traversal over the
 * whole term rather than a check per number-bearing position — the same shape
 * as the Go walk, for the same reason: a position added later inherits the law
 * instead of needing its own patch. `Number.isSafeInteger` is the exact mirror
 * of `isIntegralJSONNumber`; members are visited in identity order so the
 * refusal coordinate does not depend on object insertion order.
 *
 * It lives HERE rather than in the author fold because the fold is not the only
 * place a term becomes an identity: `structureDigest` mints one from raw Json,
 * and a bound stated at the fold alone is a bound the mint does not have — the
 * exact shape of the certifier's own two blockers, one layer out. */
export const findNonIntegralNumber = (
  value: Json,
  path: ReadonlyArray<string>,
): NonIntegralNumber | undefined => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? undefined : { path, value }
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const found = findNonIntegralNumber(value[index] as Json, [...path, String(index)])
      if (found !== undefined) return found
    }
    return undefined
  }
  if (value !== null && typeof value === "object") {
    const members = value as Record<string, Json>
    for (const name of Object.keys(members).sort(byCodeUnit)) {
      const found = findNonIntegralNumber(members[name] as Json, [...path, name])
      if (found !== undefined) return found
    }
  }
  return undefined
}

export interface NonIntegralNumberRefusal {
  readonly _tag: "NonIntegralNumber"
  readonly path: string
  readonly reason: string
}

/** A structure identity refuses for either reason a v0 identity can fail to
 * exist: the value is outside the RFC 8785 domain, or it is a term the
 * certifier would not admit. */
export type StructureRefusal = CanonicalRefusal | NonIntegralNumberRefusal

export type StructureDigestResult =
  | { readonly ok: true; readonly digest: string }
  | { readonly ok: false; readonly refusal: StructureRefusal }

/** SHA-256 over the canonical bytes of a normalized flb.type.v0 structure —
 * and ONLY of a structure the daemon's certifier would admit. The closure sweep
 * runs before the mint because this function and its `sessionStateDigest` alias
 * are the TS side's identity mint: without it they returned `{ok:true}` for a
 * term carrying 5e-324, byte-identical to the digest the Go side derives for the
 * same term, so a client could hold what looks like a v0 identity for something
 * no daemon will ever create. The sweep runs AFTER canonicalization so a cyclic
 * or non-Unicode value still refuses for its own reason, and so the traversal
 * only ever walks a finite acyclic value. */
export const structureDigest = (structure: Json): StructureDigestResult => {
  const canonical = canonicalizeStructure(structure)
  if (!canonical.ok) return canonical
  const nonIntegral = findNonIntegralNumber(structure, [])
  if (nonIntegral !== undefined) {
    return {
      ok: false,
      refusal: {
        _tag: "NonIntegralNumber",
        path: ["$", ...nonIntegral.path].join("/"),
        reason: INTEGRAL_NUMBER_LAW,
      },
    }
  }
  return { ok: true, digest: sha256Hex(canonical.bytes) }
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
