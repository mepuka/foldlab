/**
 * Structural Merkle pre-images and standards-split tree operations mirrored
 * from Effects/Merkle/Tree.lean.
 */
import { Result } from "effect"
import type { Bytes } from "./merkleChunk.ts"
import { evaluate, fromChunks, opening } from "./merkleGraph.ts"

export { pow2Below } from "./merkleGraph.ts"

export type Pre<A> =
  | { readonly _tag: "Leaf"; readonly index: number; readonly bytes: Bytes }
  | { readonly _tag: "Parent"; readonly left: A; readonly right: A }

/** The injected address function. No hash implementation is fixed here. */
export interface HP<A> {
  readonly H: (preimage: Pre<A>) => A
}

/** Chunk-tree root with `base` the absolute index of the first chunk. */
export const root = <A>(
  P: HP<A>,
  base: number,
  chunks: ReadonlyArray<Bytes>,
): A => {
  return Result.getOrThrow(evaluate(fromChunks(base, chunks), P))
}

/** Inclusion path, root-side sibling first; sides are never encoded. */
export interface GenPathInput<A> {
  readonly P: HP<A>
  readonly base: number
  readonly index: number
  readonly chunks: ReadonlyArray<Bytes>
}

export const genPath = <A>({
  P,
  base,
  index,
  chunks,
}: GenPathInput<A>): ReadonlyArray<A> => {
  return Result.getOrThrow(opening(fromChunks(base, chunks), P, base + index)).siblings
}
