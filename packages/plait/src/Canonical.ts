/**
 * Canonical JSON values and their unique RFC 8785 byte form.
 *
 * Core reports refusal locations as unescaped slash-joined strings. On failure
 * this module re-runs that same canonicalizer over an order-preserving,
 * key-escaped shadow so literal slashes survive as path segments. A stateful
 * accessor or Proxy can change between the identity and diagnostic passes; if
 * the shadow no longer refuses, the path falls back to the joined-string form.
 *
 * @module
 */
import {
  encodeJsonValue,
  type JsonValue,
} from "@foldlab/core/jcs"
import { Effect } from "effect"

import { structuralRefusal, type StructuralRefusal } from "./Refusal.js"

/** The JSON-domain values admitted by foldlab's RFC 8785 seam. */
export type WireValue = JsonValue

const utf8 = new TextEncoder()

const legacyPathSegments = (path: string): ReadonlyArray<string> =>
  path === "$"
    ? []
    : path.startsWith("$/")
    ? path.slice(2).split("/")
    : [path]

const escapePathKey = (key: string): string => {
  let escaped = "~"
  for (let index = 0; index < key.length; index++) {
    escaped += key.charCodeAt(index).toString(16).padStart(4, "0")
  }
  return escaped
}

const unescapePathKey = (key: string): string => {
  if (!key.startsWith("~") || (key.length - 1) % 4 !== 0) return key
  let unescaped = ""
  for (let index = 1; index < key.length; index += 4) {
    unescaped += String.fromCharCode(Number.parseInt(key.slice(index, index + 4), 16))
  }
  return unescaped
}

const escapePathKeys = (
  value: WireValue,
  seen: Map<object, WireValue> = new Map(),
): WireValue => {
  if (value === null || typeof value !== "object") return value
  const previous = seen.get(value)
  if (previous !== undefined) return previous

  if (Array.isArray(value)) {
    const escaped: Array<WireValue> = []
    seen.set(value, escaped)
    for (let index = 0; index < value.length; index++) {
      escaped[index] = escapePathKeys(value[index], seen)
    }
    return escaped
  }

  const record = value as { readonly [key: string]: WireValue }
  const prototype = Object.getPrototypeOf(record)
  if (prototype !== null && prototype !== Object.prototype) return value

  const escaped = Object.create(prototype) as Record<string, WireValue>
  seen.set(record, escaped)
  for (const key of Object.keys(record)) {
    const keyEncoding = encodeJsonValue(key)
    escaped[escapePathKey(key)] = keyEncoding.ok
      ? escapePathKeys(record[key]!, seen)
      : key
  }
  return escaped
}

const pathSegments = (
  value: WireValue,
  path: string,
): ReadonlyArray<string> => {
  const diagnostic = encodeJsonValue(escapePathKeys(value))
  if (!diagnostic.ok && diagnostic.refusal.path.startsWith("$/")) {
    return diagnostic.refusal.path.slice(2).split("/").map(unescapePathKey)
  }
  return legacyPathSegments(path)
}

const nonCanonicalValue = (
  value: WireValue,
  refusal: { readonly path: string; readonly reason: string },
): StructuralRefusal =>
  structuralRefusal({
    kind: "non-canonical-value",
    law: "Canonical bytes exist only for values admitted by foldlab's RFC 8785 seam.",
    path: pathSegments(value, refusal.path),
    got: refusal.reason,
    expected: "one RFC 8785 wire value",
    next: [{
      subject: "canonicalize",
      note: "Replace the refused value at the named path with one RFC 8785 wire value.",
    }],
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
 *
 * The module JSDoc states the residual bound on its two-pass path diagnostic.
 */
export const canonicalBytes = Effect.fn("Canonical.canonicalBytes")(function* (
  value: WireValue,
): Effect.fn.Return<Uint8Array, StructuralRefusal> {
  const encoded = encodeJsonValue(value)
  if (!encoded.ok) return yield* nonCanonicalValue(value, encoded.refusal)
  return utf8.encode(encoded.bytes)
})
