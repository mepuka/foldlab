import { createHash } from "node:crypto"

import { Schema } from "effect"

import { canonicalBytes, type CanonicalBytes, type WireValue } from "./Canonical.js"

/** A lowercase SHA-256 digest written as 64 hexadecimal characters. */
export const Digest = Schema.String
  .check(Schema.isPattern(/^[0-9a-f]{64}$/))
  .pipe(Schema.brand("@foldlab/plait/Digest"))
  .annotate({ identifier: "PlaitDigest" })

/** The admitted digest type. */
export type Digest = typeof Digest.Type

/** A digest or the canonical-value refusal that prevented identity. */
export type DigestResult =
  | { readonly ok: true; readonly digest: Digest }
  | Exclude<CanonicalBytes, { readonly ok: true }>

/**
 * Derives identity from canonical uncompressed bytes.
 *
 * @example
 * ```ts
 * import { digestOf } from "@foldlab/plait/Digest"
 *
 * digestOf({ a: 1 })
 * // { ok: true, digest: "015abd7f..." }
 * ```
 */
export const digestOf = (value: WireValue): DigestResult => {
  const canonical = canonicalBytes(value)
  if (!canonical.ok) return canonical
  return {
    ok: true,
    digest: Digest.make(createHash("sha256").update(canonical.bytes).digest("hex")),
  }
}
