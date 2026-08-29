/** Inclusion reconstruction mirrored from Effects/Merkle/Verify.lean. */
import { Equal, Option } from "effect"
import type { Bytes } from "./merkleChunk.ts"
import { pow2Below, type HP } from "./merkleTree.ts"

/**
 * Recompute an opening's root. The walk derives every side from index and
 * count; the proof controls sibling values only.
 */
export const branchRoot = <A>(
  P: HP<A>,
  base: number,
  index: number,
  count: number,
  bytes: Bytes,
  siblings: ReadonlyArray<A>,
): Option.Option<A> => {
  if (siblings.length === 0) {
    return count <= 1
      ? Option.some(P.H({ _tag: "Leaf", index: base, bytes }))
      : Option.none()
  }
  if (count <= 1) return Option.none()

  const sibling = siblings[0]!
  const rest = siblings.slice(1)
  const split = pow2Below(count)
  if (index < split) {
    return Option.map(
      branchRoot(P, base, index, split, bytes, rest),
      (value) => P.H({ _tag: "Parent", left: value, right: sibling }),
    )
  }
  return Option.map(
    branchRoot(P, base + split, index - split, count - split, bytes, rest),
    (value) => P.H({ _tag: "Parent", left: sibling, right: value }),
  )
}

export const verifyInclusion = <A>(
  P: HP<A>,
  index: number,
  count: number,
  bytes: Bytes,
  siblings: ReadonlyArray<A>,
  expectedRoot: A,
): boolean => {
  if (!(index < count)) return false
  const rebuilt = branchRoot(P, 0, index, count, bytes, siblings)
  return Option.isSome(rebuilt) && Equal.equals(rebuilt.value, expectedRoot)
}
