import { createHash } from "node:crypto"

import { Effect, Schema } from "effect"

import { canonicalBytes, type WireValue } from "./Canonical.js"
import type { StructuralRefusal } from "./Refusal.js"

/** A lowercase SHA-256 digest written as 64 hexadecimal characters. */
export const Digest = Schema.String
  .check(Schema.isPattern(/^[0-9a-f]{64}$/))
  .pipe(Schema.brand("@foldlab/plait/Digest"))
  .annotate({ identifier: "PlaitDigest" })

/** The admitted digest type. */
export type Digest = typeof Digest.Type

/**
 * Derives identity from canonical uncompressed bytes.
 *
 * @example
 * ```ts
 * import { digestOf } from "@foldlab/plait/Digest"
 * import { Effect } from "effect"
 *
 * Effect.runSync(digestOf({ a: 1 }))
 * // "015abd7f..."
 * ```
 */
export const digestOf = Effect.fn("Digest.digestOf")(function* (
  value: WireValue,
): Effect.fn.Return<Digest, StructuralRefusal> {
  const canonical = yield* canonicalBytes(value)
  return Digest.make(createHash("sha256").update(canonical).digest("hex"))
})
