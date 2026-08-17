import {
  encodeJsonValue,
  type JsonValue,
} from "../../core/src/jcs.js"

/** The JSON-domain values admitted by foldlab's RFC 8785 seam. */
export type WireValue = JsonValue

/** Canonical bytes or the package/core refusal that explains why none exist. */
export type CanonicalBytes =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | {
    readonly ok: false
    readonly refusal: {
      readonly _tag: "NonCanonicalValue"
      readonly path: string
      readonly reason: string
    }
  }

const utf8 = new TextEncoder()

/**
 * Returns the unique RFC 8785 bytes for a wire value.
 *
 * @example
 * ```ts
 * import { canonicalBytes } from "@foldlab/plait/Canonical"
 *
 * canonicalBytes({ b: 2, a: 1 })
 * // { ok: true, bytes: Uint8Array.from([123, 34, 97, ...]) }
 * ```
 */
export const canonicalBytes = (value: WireValue): CanonicalBytes => {
  const encoded = encodeJsonValue(value)
  return encoded.ok
    ? { ok: true, bytes: utf8.encode(encoded.bytes) }
    : encoded
}
