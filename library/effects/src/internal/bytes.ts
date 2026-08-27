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
