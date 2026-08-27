/** Consistency reconstruction mirrored from Effects/Merkle/Consistency.lean. */
import { Equal, Option } from "effect"
import { pow2Below, type HP } from "./merkleTree.ts"

export type RebuiltPair<A> = readonly [oldRoot: A, newRoot: A]

/**
 * Rebuild old and new roots from a bare proof list. The size-derived walk
 * consumes the list exactly; `anchored` is RFC 9162's b flag.
 */
export const consRebuild = <A>(
  P: HP<A>,
  oldAnchor: A,
  oldSize: number,
  newSize: number,
  anchored: boolean,
  proof: ReadonlyArray<A>,
): Option.Option<RebuiltPair<A>> => {
  if (newSize <= oldSize) {
    if (anchored && proof.length === 0) {
      return Option.some([oldAnchor, oldAnchor] as const)
    }
    if (!anchored && proof.length === 1) {
      const terminal = proof[0]!
      return Option.some([terminal, terminal] as const)
    }
    return Option.none()
  }
  if (newSize <= 1) return Option.none()

  if (proof.length === 0) return Option.none()
  const hash = proof[0]!
  const rest = proof.slice(1)
  const split = pow2Below(newSize)

  if (oldSize <= split) {
    return Option.map(
      consRebuild(P, oldAnchor, oldSize, split, anchored, rest),
      ([oldRoot, newRoot]) => [
        oldRoot,
        P.H({ _tag: "Parent", left: newRoot, right: hash }),
      ] as const,
    )
  }

  return Option.map(
    consRebuild(P, oldAnchor, oldSize - split, newSize - split, false, rest),
    ([oldRoot, newRoot]) => [
      P.H({ _tag: "Parent", left: hash, right: oldRoot }),
      P.H({ _tag: "Parent", left: hash, right: newRoot }),
    ] as const,
  )
}

export const verifyConsistency = <A>(
  P: HP<A>,
  oldSize: number,
  newSize: number,
  oldRoot: A,
  newRoot: A,
  proof: ReadonlyArray<A>,
): boolean => {
  if (!(1 <= oldSize && oldSize < newSize)) return false
  const rebuilt = consRebuild(P, oldRoot, oldSize, newSize, true, proof)
  return Option.isSome(rebuilt)
    && Equal.equals(rebuilt.value[0], oldRoot)
    && Equal.equals(rebuilt.value[1], newRoot)
}
