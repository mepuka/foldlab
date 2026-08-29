/**
 * The file backend contract, proved against the pure in-memory
 * `FileSystem` test layer — no platform reach anywhere: fan-out layout,
 * temp+rename publish, idempotent re-put, dumb reads re-verified by the
 * store law above, and the empty-file roots registry.
 */
import { expect, it } from "@effect/vitest"
import { Effect, FileSystem, Layer } from "effect"
import { ByteReader, RootStore } from "../src/cas/Backend.ts"
import { CasNodeInput, ContentId } from "../src/cas/Node.ts"
import {
  CasStore,
  layerAddressSha256Live,
  layerFile,
} from "../src/cas/Store.ts"
import { makeMemoryFs, type MemoryFs } from "./MemoryFsHarness.ts"

const storeRoot = "store"

const layerHarness = (memory: MemoryFs) => layerFile(storeRoot).pipe(
  Layer.provide(Layer.mergeAll(
    Layer.succeed(FileSystem.FileSystem, memory.fs),
    layerAddressSha256Live,
  )),
)

const node = (
  payload: ReadonlyArray<number>,
  tag: number,
  refs: CasNodeInput["refs"] = [],
): CasNodeInput => CasNodeInput.make({
  kind: { version: 0, tag },
  payload: Uint8Array.from(payload),
  refs,
})

it.effect("round-trips through the store law and lands the fan-out layout", () =>
  Effect.gen(function* () {
    const memory = yield* makeMemoryFs
    yield* Effect.gen(function* () {
      const store = yield* CasStore
      const child = node([1, 2, 3], 91)
      const id = yield* store.put(child)
      expect(yield* store.put(child)).toBe(id)
      expect(yield* store.load(id)).toEqual(child)

      // The address is the path: objects/<2 hex>/<62 hex>, and the
      // publish left no temp file — and no temp SCAFFOLD DIRECTORY —
      // behind: the platform realizes a temp file as a directory with
      // the file inside, so an unscoped temp leaks a directory per
      // fresh write.
      const held = yield* memory.dump
      expect(held.has(`${storeRoot}/objects/${id.slice(0, 2)}/${id.slice(2)}`))
        .toBe(true)
      expect([...held.keys()].filter((key) => key.includes("put-"))).toEqual([])
      const heldDirectories = yield* memory.dumpDirectories
      expect([...heldDirectories].filter((key) => key.includes("put-"))).toEqual([])

      // The law, not the backend, refuses a dangling closure.
      const dangling = node([9], 92, [{
        expectedTag: 91,
        id: ContentId.make("ab".repeat(32)),
      }])
      const refused = yield* store.put(dangling).pipe(Effect.flip)
      expect(refused._tag).toBe("CasError/DanglingReference")
    }).pipe(Effect.provide(layerHarness(memory)))
  }))

it.effect("reads stay dumb and the law refuses corrupted bytes typed", () =>
  Effect.gen(function* () {
    const memory = yield* makeMemoryFs
    yield* Effect.gen(function* () {
      const store = yield* CasStore
      const id = yield* store.put(node([7, 7, 7], 91))
      const path = `${storeRoot}/objects/${id.slice(0, 2)}/${id.slice(2)}`

      // Flip one payload byte directly in storage: still a canonical
      // encoding, no longer the digest's pre-image.
      const held = yield* memory.dump
      const corrupted = held.get(path)!.slice()
      corrupted[6] = corrupted[6] === 0 ? 1 : 0
      yield* memory.poke(path, corrupted)

      const refused = yield* store.load(id).pipe(Effect.flip)
      expect(refused._tag).toBe("CasError/AddressMismatch")
    }).pipe(Effect.provide(layerHarness(memory)))
  }))

it.effect("presence answers positionally and roots persist as empty files", () =>
  Effect.gen(function* () {
    const memory = yield* makeMemoryFs
    yield* Effect.gen(function* () {
      const store = yield* CasStore
      const reader = yield* ByteReader
      const roots = yield* RootStore

      // An unpublished store lists no roots — absent directory included.
      expect(yield* roots.list).toEqual([])

      const id = yield* store.put(node([4, 5], 91))
      const absent = ContentId.make("cd".repeat(32))
      expect(yield* reader.presence([id, absent])).toEqual(["present", "missing"])

      yield* roots.publish(id)
      yield* roots.publish(id)
      expect(yield* roots.list).toEqual([id])
      expect((yield* memory.dump).get(`${storeRoot}/roots/${id}`))
        .toEqual(new Uint8Array(0))
    }).pipe(Effect.provide(layerHarness(memory)))
  }))
