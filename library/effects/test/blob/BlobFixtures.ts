import { Effect, Equal, Option, Schema } from "effect"
import {
  CasBlob,
} from "../../src/cas/Blob.ts"
import { ManifestModel } from "../conformance/harness.ts"

const Byte = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 0xff }))
const UInt32 = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 0xffff_ffff }))

const ManifestSchema = Schema.Struct({
  recipeId: UInt32,
  totalBytes: Schema.Number.check(
    Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  ),
  leafCount: UInt32,
})

const ManifestResultSchema = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("Decoded"),
    manifest: ManifestSchema,
  }),
  Schema.Struct({ _tag: Schema.Literal("Rejected") }),
])

export const ManifestRowSchema = Schema.Struct({
  case: Schema.String,
  expect: ManifestResultSchema,
  input: Schema.Struct({ bytes: Schema.Array(Byte) }),
})
export type ManifestRow = typeof ManifestRowSchema.Type

export const MerkleOracle = "Addresses are 32-byte toy digests (the declared 32-lane byte fold, not cryptographic) over structural pre-image encodings — a tag byte for leaf or parent, the leaf's absolute index and bytes, the parent's two child addresses — so domain separation and position binding live in the pre-image exactly as the model states them; the tie to a production hash arrives with the implementation slice."

/** One binding slot; a later Lean-computed blob-graph family can be appended. */
export const blobFamilyBindings = [{
  family: "MRK-018",
  model: ManifestModel,
  row: ManifestRowSchema,
  hasOracle: true as const,
  oracle: MerkleOracle,
}] as const

export const mrk018Binding = blobFamilyBindings[0]

export type ManifestDecode = (
  bytes: Uint8Array,
) => Option.Option<CasBlob.ManifestContent>

const render = (decoded: Option.Option<CasBlob.ManifestContent>) =>
  Option.match(decoded, {
    onNone: () => ({ _tag: "Rejected" as const }),
    onSome: (manifest) => ({
      _tag: "Decoded" as const,
      manifest: {
        recipeId: manifest.recipeId,
        totalBytes: Number(manifest.totalBytes),
        leafCount: manifest.leafCount,
      },
    }),
  })

export const runManifestRow = (
  decode: ManifestDecode,
  row: ManifestRow,
) => Effect.gen(function* () {
  const input = Uint8Array.from(row.input.bytes)
  const decoded = decode(input)
  if (Option.isNone(decoded)) return { _tag: "Rejected" as const }

  const canonical = CasBlob.encodeManifestPayload(decoded.value)
  const roundTrip = decode(canonical)
  if (!Equal.equals(canonical, input)
    || Option.isNone(roundTrip)
    || !Equal.equals(roundTrip.value, decoded.value)) {
    return yield* Effect.die(new Error(
      `${row.case}: manifest codec violated canonical exactness`,
    ))
  }
  return render(decoded)
})

export const runManifestMutantRow = (
  decode: ManifestDecode,
  row: ManifestRow,
) => Effect.sync(() => render(decode(Uint8Array.from(row.input.bytes))))

export const realManifestDecode: ManifestDecode = CasBlob.decodeManifestPayload

export const bytesOfSize = (size: number): Uint8Array =>
  Uint8Array.from({ length: size }, (_, index) => (index * 17 + 11) % 251)

export const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length
  && left.every((byte, index) => byte === right[index])

export const roundTripCases = [
  { case: "empty", input: 0, expect: { length: 0, matches: true } },
  { case: "one-byte", input: 1, expect: { length: 1, matches: true } },
  {
    case: "one-chunk-minus-one",
    input: CasBlob.ChunkSize - 1,
    expect: { length: CasBlob.ChunkSize - 1, matches: true },
  },
  {
    case: "exactly-one-chunk",
    input: CasBlob.ChunkSize,
    expect: { length: CasBlob.ChunkSize, matches: true },
  },
  {
    case: "one-chunk-plus-one",
    input: CasBlob.ChunkSize + 1,
    expect: { length: CasBlob.ChunkSize + 1, matches: true },
  },
  {
    case: "several-chunks",
    input: CasBlob.ChunkSize * 2 + 17,
    expect: { length: CasBlob.ChunkSize * 2 + 17, matches: true },
  },
] as const

export interface SliceInput {
  readonly offset: bigint
  readonly length: bigint
}

export const sliceSourceSize = CasBlob.ChunkSize * 2 + 17

const sliceExpectation = (range: SliceInput) => ({
  length: Number(range.length),
  matches: true,
})

export const sliceCases = [
  { case: "zero-at-start", input: { offset: 0n, length: 0n }, expect: { length: 0, matches: true } },
  { case: "first-byte", input: { offset: 0n, length: 1n }, expect: { length: 1, matches: true } },
  {
    case: "first-complete-chunk",
    input: { offset: 0n, length: BigInt(CasBlob.ChunkSize) },
    expect: { length: CasBlob.ChunkSize, matches: true },
  },
  {
    case: "cross-first-chunk-edge",
    input: { offset: BigInt(CasBlob.ChunkSize - 1), length: 2n },
    expect: { length: 2, matches: true },
  },
  {
    case: "zero-at-chunk-edge",
    input: { offset: BigInt(CasBlob.ChunkSize), length: 0n },
    expect: { length: 0, matches: true },
  },
  {
    case: "second-complete-chunk",
    input: { offset: BigInt(CasBlob.ChunkSize), length: BigInt(CasBlob.ChunkSize) },
    expect: { length: CasBlob.ChunkSize, matches: true },
  },
  {
    case: "last-ragged-chunk",
    input: { offset: BigInt(CasBlob.ChunkSize * 2), length: 17n },
    expect: { length: 17, matches: true },
  },
  {
    case: "last-byte",
    input: { offset: BigInt(sliceSourceSize - 1), length: 1n },
    expect: { length: 1, matches: true },
  },
  {
    case: "whole-blob",
    input: { offset: 0n, length: BigInt(sliceSourceSize) },
    expect: { length: sliceSourceSize, matches: true },
  },
  {
    case: "zero-at-end",
    input: { offset: BigInt(sliceSourceSize), length: 0n },
    expect: { length: 0, matches: true },
  },
].map((item) => ({ ...item, expect: sliceExpectation(item.input) }))

export const invalidSliceCases: ReadonlyArray<{
  readonly case: string
  readonly input: SliceInput
  readonly expect: {
    readonly _tag: "Rejected"
    readonly error: "CasBlobError/Range"
  }
}> = [
  {
    case: "one-byte-past-end",
    input: { offset: BigInt(sliceSourceSize), length: 1n },
    expect: { _tag: "Rejected", error: "CasBlobError/Range" },
  },
  {
    case: "negative-offset",
    input: { offset: -1n, length: 1n },
    expect: { _tag: "Rejected", error: "CasBlobError/Range" },
  },
  {
    case: "negative-length",
    input: { offset: 0n, length: -1n },
    expect: { _tag: "Rejected", error: "CasBlobError/Range" },
  },
]
