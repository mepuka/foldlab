/**
 * Lossless declared chunking mirrored from Effects/Merkle/Chunk.lean.
 *
 * A Recipe can only be constructed with a positive safe-integer chunk size.
 * Empty input therefore has the same single-empty-chunk convention as the
 * model, while every non-empty input ends in exactly one possibly-ragged
 * chunk.
 */
import { Option } from "effect"

export type Bytes = ReadonlyArray<number>

export class Recipe {
  private constructor(readonly chunkSize: number) {}

  static make(chunkSize: number): Option.Option<Recipe> {
    return Number.isSafeInteger(chunkSize) && chunkSize > 0
      ? Option.some(new Recipe(chunkSize))
      : Option.none()
  }

  chunk(bytes: Bytes): ReadonlyArray<Bytes> {
    return chunkGo(this.chunkSize, bytes)
  }

  /** Accept exactly the chunk lists produced by this recipe. */
  unchunk(chunks: ReadonlyArray<Bytes>): Option.Option<Bytes> {
    const bytes = chunks.flatMap((chunk) => chunk)
    return chunksEqual(this.chunk(bytes), chunks)
      ? Option.some(bytes)
      : Option.none()
  }
}

/** Recursive partition step; `size` comes only from a checked Recipe. */
const chunkGo = (size: number, bytes: Bytes): ReadonlyArray<Bytes> => {
  if (bytes.length <= size) return [bytes.slice()]
  return [bytes.slice(0, size), ...chunkGo(size, bytes.slice(size))]
}

const chunksEqual = (
  left: ReadonlyArray<Bytes>,
  right: ReadonlyArray<Bytes>,
): boolean => left.length === right.length && left.every((chunk, index) => {
  const other = right[index]
  return other !== undefined
    && chunk.length === other.length
    && chunk.every((byte, byteIndex) => byte === other[byteIndex])
})
