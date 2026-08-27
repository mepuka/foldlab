import { expect, it } from "@effect/vitest"
import { Effect, Encoding, Schema } from "effect"
import { readFile } from "node:fs/promises"
import {
  Byte,
  CasNodeInput,
  ContentId,
  StoreFailure,
  type CasError,
} from "../src/CasNode.ts"
import {
  CasStore,
  decodeCasNode,
  encodeCasNode,
  layerMemory,
  type CasAddress,
} from "../src/CasStore.ts"

const Bytes = Schema.Array(Byte)
const AddressBytes = Bytes.check(Schema.isLengthBetween(32, 32))

const ManifestNode = Schema.Struct({
  payload: Bytes,
  refs: Schema.Array(Schema.Struct({
    addr: AddressBytes,
    expectedTag: Byte,
  })),
  tag: Byte,
  version: Byte,
})
type ManifestNode = typeof ManifestNode.Type

const CAS001Manifest = Schema.Struct({
  family: Schema.Literal("CAS-001"),
  meaning: Schema.String,
  model: Schema.Literal("effects-model@0.1.0"),
  rows: Schema.Array(Schema.Union([
    Schema.Struct({
      case: Schema.String,
      expect: Schema.Struct({ decoded: Schema.Null }),
      input: Schema.Struct({ bytes: Bytes }),
    }),
    Schema.Struct({
      case: Schema.String,
      expect: Schema.Struct({ bytes: Bytes, roundtrip: Schema.Boolean }),
      input: Schema.Struct({ node: ManifestNode }),
    }),
  ])),
})

const CAS002Manifest = Schema.Struct({
  family: Schema.Literal("CAS-002"),
  meaning: Schema.String,
  model: Schema.Literal("effects-model@0.1.0"),
  rows: Schema.Array(Schema.Struct({
    case: Schema.String,
    expect: Schema.Union([
      Schema.Struct({ admitted: Schema.Literal(true) }),
      Schema.Struct({
        admitted: Schema.Literal(false),
        clause: Schema.Literal("CasError/DanglingReference"),
        missing: AddressBytes,
      }),
      Schema.Struct({
        actualTag: Byte,
        admitted: Schema.Literal(false),
        clause: Schema.Literal("CasError/WrongKindReference"),
        expectedTag: Byte,
        ref: AddressBytes,
      }),
    ]),
    input: Schema.Struct({
      node: ManifestNode,
      store: Schema.Array(Schema.Struct({
        addr: AddressBytes,
        node: ManifestNode,
      })),
    }),
  })),
})

const contentIdFromBytes = (bytes: ReadonlyArray<number>): ContentId =>
  ContentId.make(Encoding.encodeHex(Uint8Array.from(bytes)))

const contentIdToBytes = (id: ContentId): ReadonlyArray<number> => {
  const decoded = Encoding.decodeHex(id)
  if (decoded._tag === "Failure") {
    throw new Error("validated ContentId failed hex decoding")
  }
  return Array.from(decoded.success)
}

const decodeManifestNode = (node: ManifestNode) =>
  CasNodeInput.makeEffect({
    kind: { version: node.version, tag: node.tag },
    payload: Uint8Array.from(node.payload),
    refs: node.refs.map((ref) => ({
      id: contentIdFromBytes(ref.addr),
      expectedTag: ref.expectedTag,
    })),
  })

const manifestNodeFromCas = (node: CasNodeInput): ManifestNode => ({
  payload: Array.from(node.payload),
  refs: node.refs.map((ref) => ({
    addr: contentIdToBytes(ref.id),
    expectedTag: ref.expectedTag,
  })),
  tag: node.kind.tag,
  version: node.kind.version,
})

const nodesEqual = (left: CasNodeInput, right: CasNodeInput): boolean => {
  if (left.kind.version !== right.kind.version || left.kind.tag !== right.kind.tag) {
    return false
  }
  if (left.payload.length !== right.payload.length || left.refs.length !== right.refs.length) {
    return false
  }
  for (let index = 0; index < left.payload.length; index += 1) {
    if (left.payload[index] !== right.payload[index]) return false
  }
  for (let index = 0; index < left.refs.length; index += 1) {
    const l = left.refs[index]
    const r = right.refs[index]
    if (l === undefined || r === undefined) return false
    if (l.id !== r.id || l.expectedTag !== r.expectedTag) return false
  }
  return true
}

const normalizeAdmissionError = (error: CasError): unknown => {
  switch (error._tag) {
    case "CasError/DanglingReference":
      return {
        admitted: false,
        clause: error._tag,
        missing: contentIdToBytes(error.missing),
      }
    case "CasError/WrongKindReference":
      return {
        actualTag: error.actualTag,
        admitted: false,
        clause: error._tag,
        expectedTag: error.expectedTag,
        ref: contentIdToBytes(error.ref),
      }
    default:
      return { admitted: false, clause: error._tag }
  }
}

const mappedAddress = (
  entries: ReadonlyMap<string, ContentId>,
): CasAddress => ({
  digest: (canonicalBytes) => {
    const id = entries.get(Encoding.encodeHex(canonicalBytes))
    return id === undefined
      ? Effect.fail(new StoreFailure({ reason: "No fixture address for canonical bytes" }))
      : Effect.succeed(id)
  },
})

const readJson = (url: URL): Effect.Effect<unknown> =>
  Effect.promise(async () => {
    const text = await readFile(url, "utf8")
    const json: unknown = JSON.parse(text)
    return json
  })

it.effect("CAS-001 consumes every ratified CODEC row structurally", () =>
  Effect.gen(function* () {
    const json = yield* readJson(
      new URL("../conformance/manifest/CAS-001.json", import.meta.url),
    )
    const manifest = yield* Schema.decodeUnknownEffect(CAS001Manifest)(json)

    for (const row of manifest.rows) {
      if ("node" in row.input) {
        const node = yield* decodeManifestNode(row.input.node)
        const encoded = encodeCasNode(node)
        const decoded = decodeCasNode(encoded)
        const actual = {
          bytes: Array.from(encoded),
          roundtrip: decoded !== undefined && nodesEqual(decoded, node),
        }
        expect({ case: row.case, result: actual }).toEqual({
          case: row.case,
          result: row.expect,
        })
      } else {
        const decoded = decodeCasNode(Uint8Array.from(row.input.bytes))
        const actual = {
          decoded: decoded === undefined ? null : manifestNodeFromCas(decoded),
        }
        expect({ case: row.case, result: actual }).toEqual({
          case: row.case,
          result: row.expect,
        })
      }
    }
  }))

it.effect("CAS-002 consumes every ratified REJECTION-CLAUSE row structurally", () =>
  Effect.gen(function* () {
    const json = yield* readJson(
      new URL("../conformance/manifest/CAS-002.json", import.meta.url),
    )
    const manifest = yield* Schema.decodeUnknownEffect(CAS002Manifest)(json)

    for (const [rowIndex, row] of manifest.rows.entries()) {
      const candidate = yield* decodeManifestNode(row.input.node)
      const residents: Array<{
        readonly id: ContentId
        readonly node: CasNodeInput
      }> = []
      for (const binding of row.input.store) {
        residents.push({
          id: contentIdFromBytes(binding.addr),
          node: yield* decodeManifestNode(binding.node),
        })
      }

      const addresses = new Map<string, ContentId>()
      for (const resident of residents) {
        addresses.set(Encoding.encodeHex(encodeCasNode(resident.node)), resident.id)
      }
      addresses.set(
        Encoding.encodeHex(encodeCasNode(candidate)),
        contentIdFromBytes(Array(32).fill(rowIndex + 2)),
      )

      const actual = yield* Effect.gen(function* () {
        const store = yield* CasStore
        for (const resident of residents) {
          const id = yield* store.put(resident.node)
          expect(id).toBe(resident.id)
        }
        return yield* store.put(candidate).pipe(Effect.match({
          onFailure: normalizeAdmissionError,
          onSuccess: () => ({ admitted: true as const }),
        }))
      }).pipe(Effect.provide(layerMemory(mappedAddress(addresses))))

      expect({ case: row.case, result: actual }).toEqual({
        case: row.case,
        result: row.expect,
      })
    }
  }))

it.effect("the M2 in-memory adapter re-verifies load and keeps misses as StoreFailure", () => {
  const firstId = contentIdFromBytes(Array(32).fill(0x11))
  const secondId = contentIdFromBytes(Array(32).fill(0x22))
  let digestCalls = 0
  const changingAddress: CasAddress = {
    digest: () => Effect.sync(() => digestCalls++ === 0 ? firstId : secondId),
  }

  return Effect.gen(function* () {
    const node = CasNodeInput.make({
      kind: { version: 0, tag: 3 },
      payload: Uint8Array.from([1, 2, 3]),
      refs: [],
    })

    const store = yield* CasStore
    const id = yield* store.put(node)
    expect(id).toBe(firstId)

    const mismatch = yield* store.load(id).pipe(Effect.match({
      onFailure: (error) => error,
      onSuccess: () => undefined,
    }))
    expect(mismatch?._tag).toBe("CasError/AddressMismatch")

    const missing = yield* store.load(contentIdFromBytes(Array(32).fill(0x33))).pipe(
      Effect.match({
        onFailure: (error) => error,
        onSuccess: () => undefined,
      }),
    )
    expect(missing?._tag).toBe("CasError/StoreFailure")
  }).pipe(Effect.provide(layerMemory(changingAddress)))
})

it.effect("the M2 in-memory adapter loads an immutable admitted node", () => {
  const id = contentIdFromBytes(Array(32).fill(0x44))
  const stableAddress: CasAddress = { digest: () => Effect.succeed(id) }

  return Effect.gen(function* () {
    const store = yield* CasStore
    const input = CasNodeInput.make({
      kind: { version: 0, tag: 4 },
      payload: Uint8Array.from([7, 8, 9]),
      refs: [],
    })

    yield* store.put(input)
    input.payload[0] = 0xff

    const first = yield* store.load(id)
    expect(Array.from(first.payload)).toEqual([7, 8, 9])
    first.payload[1] = 0xff

    const second = yield* store.load(id)
    expect(Array.from(second.payload)).toEqual([7, 8, 9])
  }).pipe(Effect.provide(layerMemory(stableAddress)))
})
