/** Byte-wise equality on raw buffers. A plain loop, deliberately not
 * `Equal.equals`: the library equivalence hashes both operands and memoizes
 * pairs in a WeakMap, machinery a hot store path does not want. */
export const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

const hexNibble = (code: number): number => (code <= 0x39 ? code - 0x30 : code - 0x57)

/** Total decoder over an already-validated lowercase-hex string (a branded
 * ContentId or similar). Totality on the validated pattern removes the
 * unreachable decode-failure branch a general hex decoder would carry. */
export const decodeValidatedHex = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length >>> 1)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = hexNibble(hex.codePointAt(index * 2) ?? 0) * 16
      + hexNibble(hex.codePointAt(index * 2 + 1) ?? 0)
  }
  return bytes
}
