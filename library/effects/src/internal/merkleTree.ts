/**
 * Structural Merkle pre-images and standards-split tree operations mirrored
 * from Effects/Merkle/Tree.lean.
 */
import type { Bytes } from "./merkleChunk.ts"

export type Pre<A> =
  | { readonly _tag: "Leaf"; readonly index: number; readonly bytes: Bytes }
  | { readonly _tag: "Parent"; readonly left: A; readonly right: A }

/** The injected address function. No hash implementation is fixed here. */
export interface HP<A> {
  readonly H: (preimage: Pre<A>) => A
}

/** Largest power of two strictly below n, returning one below two. */
export const pow2Below = (n: number): number =>
  n <= 2 ? 1 : 2 * pow2Below(Math.floor((n + 1) / 2))

/** Chunk-tree root with `base` the absolute index of the first chunk. */
export const root = <A>(
  P: HP<A>,
  base: number,
  chunks: ReadonlyArray<Bytes>,
): A => {
  if (chunks.length <= 1) {
    return P.H({
      _tag: "Leaf",
      index: base,
      bytes: chunks.length === 0 ? [] : chunks[0]!,
    })
  }
  const split = pow2Below(chunks.length)
  return P.H({
    _tag: "Parent",
    left: root(P, base, chunks.slice(0, split)),
    right: root(P, base + split, chunks.slice(split)),
  })
}

/** Inclusion path, root-side sibling first; sides are never encoded. */
export const genPath = <A>(
  P: HP<A>,
  base: number,
  index: number,
  chunks: ReadonlyArray<Bytes>,
): ReadonlyArray<A> => {
  if (chunks.length <= 1) return []
  const split = pow2Below(chunks.length)
  if (index < split) {
    return [
      root(P, base + split, chunks.slice(split)),
      ...genPath(P, base, index, chunks.slice(0, split)),
    ]
  }
  return [
    root(P, base, chunks.slice(0, split)),
    ...genPath(P, base + split, index - split, chunks.slice(split)),
  ]
}
