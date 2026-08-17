import {
  encodeJsonValue,
  type JsonValue,
} from "@foldlab/core/jcs"
import { Effect } from "effect"

import { structuralRefusal, type StructuralRefusal } from "./Refusal.js"

/** The JSON-domain values admitted by foldlab's RFC 8785 seam. */
export type WireValue = JsonValue

const utf8 = new TextEncoder()

const pathSegments = (path: string): ReadonlyArray<string> =>
  path === "$"
    ? []
    : path.startsWith("$/")
    ? path.slice(2).split("/")
    : [path]

const nonCanonicalValue = (
  refusal: { readonly path: string; readonly reason: string },
): StructuralRefusal =>
  structuralRefusal({
    kind: "non-canonical-value",
    law: "Canonical bytes exist only for values admitted by foldlab's RFC 8785 seam.",
    path: pathSegments(refusal.path),
    got: refusal.reason,
    expected: "one RFC 8785 wire value",
    next: [],
  })

/**
 * Returns the unique RFC 8785 bytes for a wire value.
 *
 * @example
 * ```ts
 * import { canonicalBytes } from "@foldlab/plait/Canonical"
 * import { Effect } from "effect"
 *
 * Effect.runSync(canonicalBytes({ b: 2, a: 1 }))
 * // Uint8Array.from([123, 34, 97, ...])
 * ```
 */
export const canonicalBytes = Effect.fn("Canonical.canonicalBytes")(function* (
  value: WireValue,
): Effect.fn.Return<Uint8Array, StructuralRefusal> {
  const encoded = encodeJsonValue(value)
  if (!encoded.ok) return yield* nonCanonicalValue(encoded.refusal)
  return utf8.encode(encoded.bytes)
})
