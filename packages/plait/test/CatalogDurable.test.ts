import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { StorageType } from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Option } from "effect"

import {
  CATALOG_BUCKET,
  CATALOG_HISTORY,
  Catalog,
  type CatalogService,
} from "../src/planes/Catalog.js"
import { valueKey } from "../src/internal/catalogs.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import type { Refusal } from "../src/truth/Refusal.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

const harnesses = new Set<NatsHarness>()
const stores = new Set<string>()

afterEach(async () => {
  for (const harness of harnesses) await harness.stop()
  harnesses.clear()
  for (const store of stores) await rm(store, { recursive: true, force: true })
  stores.clear()
})

const serverOn = async (storeDirectory?: string): Promise<NatsHarness> => {
  const harness = await startNatsHarness(
    storeDirectory === undefined ? {} : { storeDirectory },
  )
  harnesses.add(harness)
  return harness
}

const ownedStore = async (): Promise<string> => {
  const store = await mkdtemp(join(tmpdir(), "plait-catalog-store-"))
  stores.add(store)
  return store
}

/** Runs one program against a fresh durable layer over the named server. */
const durable = <A>(
  url: string,
  body: (catalog: CatalogService) => Effect.Effect<A, Refusal>,
): Promise<A> =>
  Effect.runPromise(
    Effect.gen(function* () {
      return yield* body(yield* Catalog)
    }).pipe(
      Effect.provide(Catalog.layerDurable({ servers: url })),
      Effect.scoped,
    ),
  )

/** The same, but keeping the refusal instead of the value. */
const durableRefusal = (
  url: string,
  body: (catalog: CatalogService) => Effect.Effect<unknown, Refusal>,
): Promise<Refusal> =>
  Effect.runPromise(
    Effect.gen(function* () {
      return yield* body(yield* Catalog)
    }).pipe(
      Effect.provide(Catalog.layerDurable({ servers: url })),
      Effect.scoped,
      Effect.flip,
    ),
  )

const refusalFrom = (url: string): Promise<Refusal> =>
  Effect.runPromise(
    Catalog.pipe(
      Effect.provide(Catalog.layerDurable({ servers: url })),
      Effect.scoped,
      Effect.flip,
    ),
  )

describe("the durable catalog layer", () => {
  test("admits a value at the digest of its canonical bytes and reads it back", async () => {
    const harness = await serverOn()
    const admitted = await durable(harness.url, (catalog) =>
      Effect.gen(function* () {
        const digest = yield* catalog.put({ b: 2, a: 1 })
        return { digest, found: yield* catalog.get(digest) }
      }))
    expect(admitted.digest).toBe(await Effect.runPromise(digestOf({ a: 1, b: 2 })))
    expect(Option.getOrNull(admitted.found)).toEqual({ b: 2, a: 1 })
  }, 120_000)

  test("an unadmitted digest is absent, never an invented value", async () => {
    const harness = await serverOn()
    const found = await durable(harness.url, (catalog) =>
      Effect.flatMap(digestOf({ never: "admitted" }), catalog.get))
    expect(Option.isNone(found)).toBe(true)
  }, 120_000)

  test("a value outlives the server that admitted it", async () => {
    // The claim this row makes and the one it does not. It makes: a value this
    // layer admitted is still there for a later reader, over a store the
    // admitting server no longer owns — which is exactly what the process-local
    // layer cannot do, and the whole reason the fold's checkpoints were never
    // allowed to move onto it. It does not make a power-durability claim, and
    // nothing in the estate does; process-crash recovery over this substrate is
    // the substrate's own claim, proven where the substrate is, and the fold's
    // two chaos gates are its runtime evidence.
    //
    // Rebuilding a consumer's seeded replica after such a restart is the
    // consumer's concern and is deliberately not built here: the engine's
    // door-context replica is a monotone lower bound seeded at layer build, and
    // this store is now its largest source. What re-seeds it, and when, is the
    // engine's question to answer.
    const store = await ownedStore()
    const first = await serverOn(store)
    const digest = await durable(first.url, (catalog) => catalog.put({ survives: true }))
    await first.stop()
    harnesses.delete(first)

    const second = await serverOn(store)
    const found = await durable(second.url, (catalog) => catalog.get(digest))
    expect(Option.getOrNull(found)).toEqual({ survives: true })
  }, 180_000)

  test("admitting the same value twice is idempotent by comparison", async () => {
    const harness = await serverOn()
    const twice = await durable(harness.url, (catalog) =>
      Effect.gen(function* () {
        const first = yield* catalog.put({ admitted: "twice" })
        const second = yield* catalog.put({ admitted: "twice" })
        return { first, second, found: yield* catalog.get(second) }
      }))
    expect(twice.second).toBe(twice.first)
    expect(Option.getOrNull(twice.found)).toEqual({ admitted: "twice" })

    // One revision at the key, because the second create reconciled instead of
    // writing: the duplicate landed nothing, so nothing moved.
    const connection = await connect({ servers: harness.url })
    try {
      const bucket = await new Kvm(connection).open(CATALOG_BUCKET, { allow_direct: true })
      const entry = await bucket.get(valueKey(twice.first))
      expect(entry === null ? null : entry.revision).toBe(1)
    } finally {
      await connection.close()
    }
  }, 120_000)

  test("a byte flipped in the bucket behind the API is refused, never served", async () => {
    const harness = await serverOn()
    const digest = await durable(harness.url, (catalog) => catalog.put({ tamper: "me" }))

    const connection = await connect({ servers: harness.url })
    try {
      const bucket = await new Kvm(connection).open(CATALOG_BUCKET, { allow_direct: true })
      const entry = await bucket.get(valueKey(digest))
      if (entry === null) throw new Error("the admitted value is not in the bucket")
      const flipped = Uint8Array.from(entry.value)
      const last = flipped.length - 1
      flipped[last] = (flipped[last] ?? 0) ^ 0x01
      await bucket.put(valueKey(digest), flipped)
    } finally {
      await connection.close()
    }

    const refusal = await durableRefusal(harness.url, (catalog) => catalog.get(digest))
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("digest-mismatch")
    expect(refusal.expected).toBe(digest)
    expect(refusal.got).not.toBe(digest)
    expect(refusal.next.length).toBeGreaterThan(0)
  }, 120_000)

  test("a memory-storage bucket is refused at acquisition, not treated as degraded", async () => {
    const harness = await serverOn()
    const connection = await connect({ servers: harness.url })
    try {
      await new Kvm(connection).create(CATALOG_BUCKET, {
        storage: StorageType.Memory,
        replicas: 1,
        history: CATALOG_HISTORY,
        ttl: 0,
        max_bytes: -1,
      })
    } finally {
      await connection.close()
    }
    const refusal = await refusalFrom(harness.url)
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("catalog-substrate-shape")
    expect(refusal.law).toContain("file-backed R=1")
    expect(refusal.next.length).toBeGreaterThan(0)
  }, 120_000)

  test("a bucket retaining a second revision is refused on the same law", async () => {
    const harness = await serverOn()
    const connection = await connect({ servers: harness.url })
    try {
      await new Kvm(connection).create(CATALOG_BUCKET, {
        storage: StorageType.File,
        replicas: 1,
        history: CATALOG_HISTORY + 1,
        ttl: 0,
        max_bytes: -1,
      })
    } finally {
      await connection.close()
    }
    const refusal = await refusalFrom(harness.url)
    expect(refusal.kind).toBe("catalog-substrate-shape")
  }, 120_000)

  test("the process-local layer is still the default, and still says so", async () => {
    // Not a durability claim: a characterization that the two adapters answer
    // differently, which is why the flip between them is a deployment act.
    const digest: Digest = Effect.runSync(
      Effect.gen(function* () {
        return yield* (yield* Catalog).put({ scoped: true })
      }).pipe(Effect.provide(Catalog.layer)),
    )
    const elsewhere = Effect.runSync(
      Effect.gen(function* () {
        return yield* (yield* Catalog).get(digest)
      }).pipe(Effect.provide(Catalog.layer)),
    )
    expect(Option.isNone(elsewhere)).toBe(true)
  }, 120_000)
})
