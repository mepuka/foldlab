// RFC 8785 canonicalization and the identity fold, TS side. This must
// take equal inputs to equal bytes/digests as go/canonical — the wire
// fixture wall (test/wall.test.ts) is the proof, never trust.
import { createHash } from "node:crypto"

export const GENESIS = "0".repeat(64)

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }

/** UTF-16 code unit order — JS default string comparison, which is what
 * RFC 8785 specifies for member sorting. */
const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

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

/** The interim identity scheme, named to match the daemon (W10). */
export const SCHEME = "bytes-sha256-v1"

export const structureDigest = (structure: Json): string => sha256Hex(canonicalize(structure))

export interface ChainEntry {
  readonly seq: number
  readonly prev: string
  readonly payload: string
}

/** Digest of one chain entry: SHA-256 over the canonical bytes of
 * {payload, prev, seq} — byte-identical to go/canonical.EntryDigest. */
export const entryDigest = (entry: ChainEntry): string =>
  sha256Hex(canonicalize({ payload: entry.payload, prev: entry.prev, seq: entry.seq }))

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
    cursor = { seq: entry.seq, head: entryDigest(entry) }
  }
  return { ok: true, seq: cursor.seq, head: cursor.head }
}
