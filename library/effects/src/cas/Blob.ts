/**
 * Deterministic blobs represented as ordinary CAS node graphs.
 *
 * Recipe 1 fixes 65,536-byte chunks. Chunk data is position-free (tag 8),
 * while leaves bind the absolute chunk index and declared length (tag 9).
 * Parents also use tag 9 and the manifest uses tag 10. BlobRef is only a
 * phantom refinement of ContentId: the manifest node remains the sole wire
 * identity and every read revalidates its runtime kind.
 */
import { Context, Effect, Layer, Option, Schema, Stream } from "effect"
import {
  CasNodeInput,
  ContentId,
  type CasError,
} from "./Node.ts"
import { CasStore, type CasStoreShape } from "./Store.ts"
import { pow2Below } from "../internal/merkleTree.ts"

export namespace CasBlob {
  export const ChunkDataTag = 8 as const
  export const BlobNodeTag = 9 as const
  export const BlobManifestTag = 10 as const
  export const ReferencedChunkRecipe = 1 as const
  export const ChunkSize = 65_536 as const

  const MaxUint32 = 0xffff_ffff
  const MaxUint64 = 0xffff_ffff_ffff_ffffn
  const KnownRecipes = new Set([0, ReferencedChunkRecipe])

  /** Blob identity is the manifest ContentId with a compile-time-only brand. */
  export const BlobRef = ContentId.pipe(Schema.brand("BlobRef"))
  export type BlobRef = typeof BlobRef.Type

  export interface ManifestContent {
    readonly recipeId: number
    readonly totalBytes: bigint
    readonly leafCount: number
  }

  export interface BlobInfo extends ManifestContent {
    readonly treeRoot: ContentId
  }

  export interface ByteRange {
    readonly offset: bigint
    readonly length: bigint
  }

  /** The node graph or its binary fields do not have the frozen recipe shape. */
  export class FormatError extends Schema.TaggedError<FormatError>()(
    "CasBlobError/Format",
    {
      id: Schema.optionalKey(ContentId),
      reason: Schema.String,
    },
  ) {}

  /** The manifest names a recipe whose read semantics this client will not guess. */
  export class UnsupportedRecipe extends Schema.TaggedError<UnsupportedRecipe>()(
    "CasBlobError/UnsupportedRecipe",
    {
      id: ContentId,
      recipeId: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: MaxUint32 })),
    },
  ) {}

  /** A strict byte range falls outside the committed manifest length. */
  export class RangeError extends Schema.TaggedError<RangeError>()(
    "CasBlobError/Range",
    {
      offset: Schema.BigInt,
      length: Schema.BigInt,
      totalBytes: Schema.BigInt,
    },
  ) {}

  /** A complete blob cannot be represented by one host Uint8Array. */
  export class MaterializationError extends Schema.TaggedError<MaterializationError>()(
    "CasBlobError/Materialization",
    { totalBytes: Schema.BigInt },
  ) {}

  export type BlobError =
    | FormatError
    | UnsupportedRecipe
    | RangeError
    | MaterializationError

  export interface Shape {
    readonly put: <E, R>(
      source: Stream.Stream<Uint8Array, E, R>,
    ) => Effect.Effect<BlobRef, E | CasError | BlobError, R>
    readonly get: (
      ref: BlobRef,
    ) => Effect.Effect<Uint8Array, CasError | BlobError>
    readonly stream: (
      ref: BlobRef,
    ) => Stream.Stream<Uint8Array, CasError | BlobError>
    readonly slice: (
      ref: BlobRef,
      range: ByteRange,
    ) => Stream.Stream<Uint8Array, CasError | BlobError>
    readonly inspect: (
      ref: BlobRef,
    ) => Effect.Effect<BlobInfo, CasError | BlobError>
  }

  export class Service extends Context.Service<Service, Shape>()(
    "foldlab/effect-replay/CasBlob",
  ) {}

  const writeNat32 = (target: Uint8Array, offset: number, value: number): void => {
    target[offset] = (value >>> 24) & 0xff
    target[offset + 1] = (value >>> 16) & 0xff
    target[offset + 2] = (value >>> 8) & 0xff
    target[offset + 3] = value & 0xff
  }

  const readNat32 = (source: Uint8Array, offset: number): number =>
    (source[offset] ?? 0) * 0x1000000
    + (source[offset + 1] ?? 0) * 0x10000
    + (source[offset + 2] ?? 0) * 0x100
    + (source[offset + 3] ?? 0)

  const writeNat64 = (target: Uint8Array, offset: number, value: bigint): void => {
    let remaining = value
    for (let index = 7; index >= 0; index -= 1) {
      target[offset + index] = Number(remaining & 0xffn)
      remaining >>= 8n
    }
  }

  const readNat64 = (source: Uint8Array, offset: number): bigint => {
    let value = 0n
    for (let index = 0; index < 8; index += 1) {
      value = (value << 8n) | BigInt(source[offset + index] ?? 0)
    }
    return value
  }

  /** Canonical 16-byte manifest payload encoder. */
  export const encodeManifestPayload = (manifest: ManifestContent): Uint8Array => {
    const bytes = new Uint8Array(16)
    writeNat32(bytes, 0, manifest.recipeId)
    writeNat64(bytes, 4, manifest.totalBytes)
    writeNat32(bytes, 12, manifest.leafCount)
    return bytes
  }

  /**
   * Closed recipe-gated manifest decoder mirrored from Manifest.lean.
   * Successful input is already the unique canonical encoding of the result.
   */
  export const decodeManifestPayload = (
    bytes: Uint8Array,
  ): Option.Option<ManifestContent> => {
    if (bytes.length !== 16) return Option.none()
    const recipeId = readNat32(bytes, 0)
    if (!KnownRecipes.has(recipeId)) return Option.none()
    return Option.some({
      recipeId,
      totalBytes: readNat64(bytes, 4),
      leafCount: readNat32(bytes, 12),
    })
  }

  const format = (reason: string, id?: ContentId): FormatError =>
    new FormatError(id === undefined ? { reason } : { id, reason })

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

  interface ReadPlan extends BlobInfo {
    readonly ref: BlobRef
  }

  const expectedLeafCount = (totalBytes: bigint): bigint =>
    totalBytes === 0n
      ? 1n
      : (totalBytes + BigInt(ChunkSize) - 1n) / BigInt(ChunkSize)

  const loadPlan = (
    store: CasStoreShape,
    ref: BlobRef,
  ): Effect.Effect<ReadPlan, CasError | BlobError> => Effect.gen(function* () {
    const id = ContentId.make(ref)
    const manifestNode = yield* store.load(id)
    if (manifestNode.kind.tag !== BlobManifestTag) {
      return yield* format(
        `expected manifest tag ${BlobManifestTag}, received ${manifestNode.kind.tag}`,
        id,
      )
    }
    if (manifestNode.refs.length !== 1
      || manifestNode.refs[0]?.expectedTag !== BlobNodeTag) {
      return yield* format("manifest must carry exactly one tag-9 tree reference", id)
    }

    if (manifestNode.payload.length !== 16) {
      return yield* format("manifest payload must contain exactly 16 bytes", id)
    }
    const rawRecipe = readNat32(manifestNode.payload, 0)
    const decoded = decodeManifestPayload(manifestNode.payload)
    if (Option.isNone(decoded)) {
      if (!KnownRecipes.has(rawRecipe)) {
        return yield* new UnsupportedRecipe({ id, recipeId: rawRecipe })
      }
      return yield* format("manifest payload failed closed decoding", id)
    }

    const manifest = decoded.value
    const treeRoot = manifestNode.refs[0].id
    return {
      ref,
      recipeId: manifest.recipeId,
      totalBytes: manifest.totalBytes,
      leafCount: manifest.leafCount,
      treeRoot,
    }
  })

  const requireRecipeOne = (
    plan: ReadPlan,
  ): Effect.Effect<ReadPlan, BlobError> => {
    if (plan.recipeId !== ReferencedChunkRecipe) {
      return Effect.fail(new UnsupportedRecipe({
        id: ContentId.make(plan.ref),
        recipeId: plan.recipeId,
      }))
    }
    const expected = expectedLeafCount(plan.totalBytes)
    if (plan.leafCount === 0 || BigInt(plan.leafCount) !== expected) {
      return Effect.fail(format(
        `recipe 1 geometry requires ${expected} leaves, received ${plan.leafCount}`,
        ContentId.make(plan.ref),
      ))
    }
    return Effect.succeed(plan)
  }

  const loadParent = (
    store: CasStoreShape,
    id: ContentId,
  ): Effect.Effect<readonly [ContentId, ContentId], CasError | BlobError> =>
    store.load(id).pipe(Effect.flatMap((parent) => {
      if (parent.kind.tag !== BlobNodeTag
        || parent.payload.length !== 0
        || parent.refs.length !== 2
        || parent.refs[0]?.expectedTag !== BlobNodeTag
        || parent.refs[1]?.expectedTag !== BlobNodeTag) {
        return Effect.fail(format(
          "blob parent must be an empty tag-9 node with two ordered tag-9 references",
          id,
        ))
      }
      return Effect.succeed([parent.refs[0].id, parent.refs[1].id] as const)
    }))

  const expectedChunkLength = (plan: ReadPlan, index: number): number => {
    if (plan.totalBytes === 0n) return 0
    if (index + 1 < plan.leafCount) return ChunkSize
    return Number(plan.totalBytes - BigInt(index) * BigInt(ChunkSize))
  }

  const loadChunk = (
    store: CasStoreShape,
    plan: ReadPlan,
    id: ContentId,
    index: number,
  ): Effect.Effect<Uint8Array, CasError | BlobError> => Effect.gen(function* () {
    const leaf = yield* store.load(id)
    const expectedLength = expectedChunkLength(plan, index)
    if (leaf.kind.tag !== BlobNodeTag
      || leaf.payload.length !== 8
      || leaf.refs.length !== 1
      || leaf.refs[0]?.expectedTag !== ChunkDataTag) {
      return yield* format(
        "blob leaf must be a tag-9 node with an 8-byte payload and one tag-8 reference",
        id,
      )
    }
    const declaredIndex = readNat32(leaf.payload, 0)
    const declaredLength = readNat32(leaf.payload, 4)
    if (declaredIndex !== index || declaredLength !== expectedLength) {
      return yield* format(
        `leaf geometry mismatch: expected index ${index} length ${expectedLength}, received index ${declaredIndex} length ${declaredLength}`,
        id,
      )
    }

    const chunkId = leaf.refs[0].id
    const chunk = yield* store.load(chunkId)
    if (chunk.kind.tag !== ChunkDataTag || chunk.refs.length !== 0) {
      return yield* format("chunk data must be a reference-free tag-8 node", chunkId)
    }
    if (chunk.payload.length !== declaredLength) {
      return yield* format(
        `chunk length mismatch: declared ${declaredLength}, received ${chunk.payload.length}`,
        chunkId,
      )
    }
    return chunk.payload.slice()
  })

  interface SelectedRange {
    readonly offset: bigint
    readonly end: bigint
  }

  const walk = (
    store: CasStoreShape,
    plan: ReadPlan,
    id: ContentId,
    base: number,
    count: number,
    selected?: SelectedRange,
  ): Stream.Stream<Uint8Array, CasError | BlobError> => {
    if (selected !== undefined) {
      const subtreeStart = BigInt(base) * BigInt(ChunkSize)
      const subtreeEnd = base + count === plan.leafCount
        ? plan.totalBytes
        : BigInt(base + count) * BigInt(ChunkSize)
      if (selected.end <= subtreeStart || selected.offset >= subtreeEnd) {
        return Stream.empty
      }
    }

    if (count === 1) {
      return Stream.unwrap(loadChunk(store, plan, id, base).pipe(
        Effect.map((chunk) => {
          if (selected === undefined) return Stream.succeed(chunk)
          const chunkStart = BigInt(base) * BigInt(ChunkSize)
          const from = Number(
            (selected.offset > chunkStart ? selected.offset : chunkStart) - chunkStart,
          )
          const chunkEnd = chunkStart + BigInt(chunk.length)
          const to = Number(
            (selected.end < chunkEnd ? selected.end : chunkEnd) - chunkStart,
          )
          return from === to ? Stream.empty : Stream.succeed(chunk.slice(from, to))
        }),
      ))
    }

    return Stream.unwrap(loadParent(store, id).pipe(Effect.map(([left, right]) => {
      const split = pow2Below(count)
      return Stream.concat(
        walk(store, plan, left, base, split, selected),
        walk(store, plan, right, base + split, count - split, selected),
      )
    })))
  }

  const join = (
    chunks: ReadonlyArray<Uint8Array>,
    totalBytes: bigint,
  ): Effect.Effect<Uint8Array, MaterializationError> => {
    if (totalBytes > BigInt(Number.MAX_SAFE_INTEGER)) {
      return Effect.fail(new MaterializationError({ totalBytes }))
    }
    return Effect.try({
      try: () => {
        const output = new Uint8Array(Number(totalBytes))
        let offset = 0
        for (const chunk of chunks) {
          output.set(chunk, offset)
          offset += chunk.length
        }
        return output
      },
      catch: () => new MaterializationError({ totalBytes }),
    })
  }

  const make = (store: CasStoreShape): Shape => {
    const inspect = Effect.fn("CasBlob.inspect")(function* (ref: BlobRef) {
      const plan = yield* loadPlan(store, ref)
      return {
        recipeId: plan.recipeId,
        totalBytes: plan.totalBytes,
        leafCount: plan.leafCount,
        treeRoot: plan.treeRoot,
      }
    })

    const stream = (ref: BlobRef): Stream.Stream<Uint8Array, CasError | BlobError> =>
      Stream.unwrap(loadPlan(store, ref).pipe(
        Effect.flatMap(requireRecipeOne),
        Effect.map((plan) => walk(store, plan, plan.treeRoot, 0, plan.leafCount)),
      ))

    const slice = (
      ref: BlobRef,
      range: ByteRange,
    ): Stream.Stream<Uint8Array, CasError | BlobError> => Stream.unwrap(
      loadPlan(store, ref).pipe(
        Effect.flatMap(requireRecipeOne),
        Effect.map((plan) => {
          const end = range.offset + range.length
          if (range.offset < 0n || range.length < 0n || end > plan.totalBytes) {
            return Stream.fail(new RangeError({
              offset: range.offset,
              length: range.length,
              totalBytes: plan.totalBytes,
            }))
          }
          if (range.length === 0n) return Stream.empty
          return walk(store, plan, plan.treeRoot, 0, plan.leafCount, {
            offset: range.offset,
            end,
          })
        }),
      ),
    )

    const get = Effect.fn("CasBlob.get")(function* (ref: BlobRef) {
      const info = yield* inspect(ref)
      const chunks = yield* Stream.runCollect(stream(ref))
      return yield* join(chunks, info.totalBytes)
    })

    const put = <E, R>(
      source: Stream.Stream<Uint8Array, E, R>,
    ): Effect.Effect<BlobRef, E | CasError | BlobError, R> => Effect.gen(function* () {
      const leaves: Array<ContentId> = []
      let pending = new Uint8Array(0)
      let totalBytes = 0n

      const admitChunk = (bytes: Uint8Array): Effect.Effect<void, CasError | BlobError> =>
        Effect.gen(function* () {
          if (leaves.length >= MaxUint32) {
            return yield* format("recipe 1 exceeds the u32 leaf-count field")
          }
          const chunkId = yield* store.put(node(ChunkDataTag, bytes.slice(), []))
          const leafId = yield* store.put(node(
            BlobNodeTag,
            leafPayload(leaves.length, bytes.length),
            [{ id: chunkId, expectedTag: ChunkDataTag }],
          ))
          leaves.push(leafId)
        })

      yield* Stream.runForEach(source, (part) => Effect.gen(function* () {
        totalBytes += BigInt(part.length)
        if (totalBytes > MaxUint64) {
          return yield* format("recipe 1 exceeds the u64 total-bytes field")
        }

        let offset = 0
        while (offset < part.length) {
          const take = Math.min(ChunkSize - pending.length, part.length - offset)
          const combined = new Uint8Array(pending.length + take)
          combined.set(pending)
          combined.set(part.subarray(offset, offset + take), pending.length)
          pending = combined
          offset += take
          if (pending.length === ChunkSize) {
            yield* admitChunk(pending)
            pending = new Uint8Array(0)
          }
        }
      }))

      if (pending.length > 0 || leaves.length === 0) yield* admitChunk(pending)

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
      const manifest = encodeManifestPayload({
        recipeId: ReferencedChunkRecipe,
        totalBytes,
        leafCount: leaves.length,
      })
      const id = yield* store.put(node(
        BlobManifestTag,
        manifest,
        [{ id: treeRoot, expectedTag: BlobNodeTag }],
      ))
      return BlobRef.make(id)
    })

    return Service.of({ put, get, stream, slice, inspect })
  }

  /** Construct one blob service over the CasStore selected by Layer composition. */
  export const layer: Layer.Layer<Service, never, CasStore> = Layer.effect(
    Service,
    CasStore.use((store) => Effect.succeed(make(store))),
  )

  export const put = <E, R>(
    source: Stream.Stream<Uint8Array, E, R>,
  ): Effect.Effect<BlobRef, E | CasError | BlobError, R | Service> =>
    Service.use((service) => service.put(source))

  export const get = (
    ref: BlobRef,
  ): Effect.Effect<Uint8Array, CasError | BlobError, Service> =>
    Service.use((service) => service.get(ref))

  export const stream = (
    ref: BlobRef,
  ): Stream.Stream<Uint8Array, CasError | BlobError, Service> =>
    Stream.unwrap(Service.use((service) => Effect.succeed(service.stream(ref))))

  export const slice = (
    ref: BlobRef,
    range: ByteRange,
  ): Stream.Stream<Uint8Array, CasError | BlobError, Service> =>
    Stream.unwrap(Service.use((service) => Effect.succeed(service.slice(ref, range))))

  export const inspect = (
    ref: BlobRef,
  ): Effect.Effect<BlobInfo, CasError | BlobError, Service> =>
    Service.use((service) => service.inspect(ref))
}
