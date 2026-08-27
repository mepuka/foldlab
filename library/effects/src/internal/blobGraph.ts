/** Recipe-1 blob graph materialization over an explicit ordered chunk list. */
import { Data, Effect } from "effect"
import { CasNodeInput, type CasError, type ContentId } from "../cas/Node.ts"
import type { CasStoreShape } from "../cas/Store.ts"
import { pow2Below } from "./merkleTree.ts"
import { BlobManifestTag, BlobNodeTag, ChunkDataTag } from "./kindTags.ts"

export { BlobManifestTag, BlobNodeTag, ChunkDataTag }
export const ReferencedChunkRecipe = 1 as const

const MaxUint32 = 0xffff_ffff
const MaxUint64 = 0xffff_ffff_ffff_ffffn

/** Internal recipe violation, carried as a typed tag in the error
 * channel and translated to the public format error at the boundary —
 * never encoded, never a bare `Error`. */
export class BlobGraphError extends Data.TaggedError("BlobGraphError")<{
  readonly reason: string
}> {}

export interface BlobGraphResult {
  readonly blobRef: ContentId
  readonly treeRoot: ContentId
  readonly totalBytes: bigint
  readonly leafCount: number
}

const writeNat32 = (target: Uint8Array, offset: number, value: number): void => {
  target[offset] = (value >>> 24) & 0xff
  target[offset + 1] = (value >>> 16) & 0xff
  target[offset + 2] = (value >>> 8) & 0xff
  target[offset + 3] = value & 0xff
}

const writeNat64 = (target: Uint8Array, offset: number, value: bigint): void => {
  let remaining = value
  for (let index = 7; index >= 0; index -= 1) {
    target[offset + index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
}

export const encodeBlobManifestPayload = (manifest: {
  readonly recipeId: number
  readonly totalBytes: bigint
  readonly leafCount: number
}): Uint8Array => {
  const bytes = new Uint8Array(16)
  writeNat32(bytes, 0, manifest.recipeId)
  writeNat64(bytes, 4, manifest.totalBytes)
  writeNat32(bytes, 12, manifest.leafCount)
  return bytes
}

const node = (
  tag: number,
  payload: Uint8Array,
  refs: CasNodeInput["refs"],
): CasNodeInput => CasNodeInput.make({
  kind: { version: 0, tag },
  payload,
  refs,
})

const leafPayload = (index: number, chunkLength: number): Uint8Array => {
  const payload = new Uint8Array(8)
  writeNat32(payload, 0, index)
  writeNat32(payload, 4, chunkLength)
  return payload
}

/**
 * Materialize the complete recipe-1 graph for the supplied chunk boundaries.
 * Chunk order and boundaries are semantic input here; the public blob writer's
 * fixed-size chunker is a separate stage.
 */
export const materializeBlobGraph = (
  store: CasStoreShape,
  chunks: ReadonlyArray<Uint8Array>,
): Effect.Effect<BlobGraphResult, CasError | BlobGraphError> =>
  Effect.gen(function* () {
    if (chunks.length === 0) {
      return yield* Effect.fail(new BlobGraphError({ reason: "recipe 1 requires at least one chunk" }))
    }
    if (chunks.length > MaxUint32) {
      return yield* Effect.fail(new BlobGraphError({ reason: "recipe 1 exceeds the u32 leaf-count field" }))
    }

    const leaves: Array<ContentId> = []
    let totalBytes = 0n
    for (const bytes of chunks) {
      totalBytes += BigInt(bytes.length)
      if (totalBytes > MaxUint64) {
        return yield* Effect.fail(new BlobGraphError({ reason: "recipe 1 exceeds the u64 total-bytes field" }))
      }
      const chunkId = yield* store.put(node(ChunkDataTag, bytes.slice(), []))
      const leafId = yield* store.put(node(
        BlobNodeTag,
        leafPayload(leaves.length, bytes.length),
        [{ id: chunkId, expectedTag: ChunkDataTag }],
      ))
      leaves.push(leafId)
    }

    const buildTree = (
      base: number,
      count: number,
    ): Effect.Effect<ContentId, CasError> => Effect.gen(function* () {
      if (count === 1) {
        const leaf = leaves[base]
        if (leaf === undefined) return yield* Effect.die("missing admitted blob leaf")
        return leaf
      }
      const split = pow2Below(count)
      const left = yield* buildTree(base, split)
      const right = yield* buildTree(base + split, count - split)
      return yield* store.put(node(BlobNodeTag, new Uint8Array(0), [
        { id: left, expectedTag: BlobNodeTag },
        { id: right, expectedTag: BlobNodeTag },
      ]))
    })

    const treeRoot = yield* buildTree(0, leaves.length)
    const payload = encodeBlobManifestPayload({
      recipeId: ReferencedChunkRecipe,
      totalBytes,
      leafCount: leaves.length,
    })
    const blobRef = yield* store.put(node(
      BlobManifestTag,
      payload,
      [{ id: treeRoot, expectedTag: BlobNodeTag }],
    ))
    return { blobRef, treeRoot, totalBytes, leafCount: leaves.length }
  })
