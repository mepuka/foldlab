import { describe, expect, test } from "bun:test"

import { createHash } from "node:crypto"
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { Effect, Layer } from "effect"

import { Blobs, type BlobsService } from "../src/planes/Blob.js"
import { Digest } from "../src/truth/Digest.js"
import { absenceRefusal, structuralRefusal, type Refusal } from "../src/truth/Refusal.js"
import {
  BLOB_LAWS,
  blobsConformance,
  refutedLaws,
  type BlobsBackend,
} from "./BlobsConformance.js"
import { testFileSystemLayer } from "./TestFileSystem.js"

/** The control's own hash, derived here rather than through the package. */
const sha256 = (bytes: Uint8Array): Digest =>
  Digest.make(createHash("sha256").update(bytes).digest("hex"))

const flipFirstByte = (bytes: Uint8Array): Uint8Array => {
  const flipped = new Uint8Array(bytes)
  flipped[0] = (flipped[0] ?? 0) ^ 0xff
  return flipped
}

// ---------------------------------------------------------------------------
// The shipped backend, under the wall.
// ---------------------------------------------------------------------------

const fileSystemBackend: BlobsBackend = {
  name: "the filesystem backend over a temporary root",
  open: async () => {
    const root = await mkdtemp(join(tmpdir(), "plait-blobs-"))
    return {
      layer: Layer.provide(Blobs.layerFileSystem({ root }), testFileSystemLayer),
      // Behind the backend's back: the file is rewritten through node, not
      // through the service, which is why verified-get stays testable with no
      // unverified public read path.
      corrupt: async (digest) => {
        const path = join(root, digest.slice(0, 2), digest)
        await writeFile(path, flipFirstByte(new Uint8Array(await readFile(path))))
      },
      close: () => rm(root, { recursive: true, force: true }),
    }
  },
}

blobsConformance(fileSystemBackend)

describe("the filesystem backend's own mechanics", () => {
  test("the two-character fan-out is layout: the digest is the whole address", async () => {
    const root = await mkdtemp(join(tmpdir(), "plait-blobs-"))
    try {
      const bytes = new TextEncoder().encode("layout, not identity")
      const digest = await Effect.runPromise(
        Effect.flatMap(Blobs, (blobs) => blobs.put(bytes)).pipe(
          Effect.provide(Layer.provide(Blobs.layerFileSystem({ root }), testFileSystemLayer)),
        ),
      )
      // The file is named by the digest, under a prefix directory that carries
      // no identity of its own; a reader needs only the digest to find it.
      const stored = new Uint8Array(await readFile(join(root, digest.slice(0, 2), digest)))
      expect(sha256(stored)).toBe(digest)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test("only complete files appear under a digest: no staged name survives a put", async () => {
    const root = await mkdtemp(join(tmpdir(), "plait-blobs-"))
    try {
      const bytes = new TextEncoder().encode("write staged, then rename into place")
      const digest = await Effect.runPromise(
        Effect.flatMap(Blobs, (blobs) => blobs.put(bytes)).pipe(
          Effect.provide(Layer.provide(Blobs.layerFileSystem({ root }), testFileSystemLayer)),
        ),
      )
      expect(await readdir(join(root, digest.slice(0, 2)))).toEqual([digest])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// The negative controls: a wall that cannot fail proves nothing.
// ---------------------------------------------------------------------------

/** A conformant in-memory store, written independently of `Blob.ts`. */
const memoryBlobs = (): {
  readonly entries: Map<string, Uint8Array>
  readonly service: BlobsService
} => {
  const entries = new Map<string, Uint8Array>()
  const absent = (digest: Digest) =>
    absenceRefusal({
      kind: "blob-absent",
      law: "A blob reads only from a store that already holds bytes under its digest.",
      path: ["blob", digest],
      got: "absent",
      expected: digest,
      next: [{ subject: "blob.put", note: "Put the bytes before reading them." }],
    })
  return {
    entries,
    service: {
      put: (bytes) =>
        Effect.sync(() => {
          const digest = sha256(bytes)
          entries.set(digest, new Uint8Array(bytes))
          return digest
        }),
      get: (digest) =>
        Effect.suspend((): Effect.Effect<Uint8Array, Refusal> => {
          const held = entries.get(digest)
          if (held === undefined) return Effect.fail(absent(digest))
          const rederived = sha256(held)
          return rederived === digest ? Effect.succeed(held) : Effect.fail(structuralRefusal({
            kind: "digest-mismatch",
            law: "A blob's identity is re-derived over the fetched bytes.",
            path: ["blob", digest],
            got: rederived,
            expected: digest,
            next: [{ subject: "blob.put", note: "Re-put the original bytes." }],
          }))
        }),
      has: (digest) => Effect.sync(() => entries.has(digest)),
    },
  }
}

const memoryBackend = (
  name: string,
  plant: (base: BlobsService, entries: Map<string, Uint8Array>) => BlobsService,
): BlobsBackend => ({
  name,
  open: async () => {
    const { entries, service } = memoryBlobs()
    return {
      layer: Blobs.testLayer(plant(service, entries)),
      corrupt: async (digest) => {
        const held = entries.get(digest)
        if (held === undefined) throw new Error(`control: nothing is stored at ${digest}`)
        entries.set(digest, flipFirstByte(held))
      },
      close: async () => {},
    }
  },
})

/**
 * A store that keys on the two-character fan-out prefix instead of the whole
 * digest — the filesystem backend's layout mistaken for its identity. It still
 * re-derives on read, so it never hands a caller wrong bytes; what it loses is
 * whichever of two prefix-sharing payloads was stored first.
 *
 * It carries its own memory and its own `corrupt` door because the shared
 * memory backend's door addresses entries by whole digest, which this store
 * does not.
 */
const prefixAddressedBackend: BlobsBackend = {
  name: "a store addressed by the two-character fan-out prefix, not the whole digest",
  open: async () => {
    const buckets = new Map<string, Uint8Array>()
    const bucketOf = (digest: Digest): string => digest.slice(0, 2)
    const service: BlobsService = {
      put: (bytes) =>
        Effect.sync(() => {
          const digest = sha256(bytes)
          buckets.set(bucketOf(digest), new Uint8Array(bytes))
          return digest
        }),
      get: (digest) =>
        Effect.suspend((): Effect.Effect<Uint8Array, Refusal> => {
          const held = buckets.get(bucketOf(digest))
          if (held === undefined) {
            return Effect.fail(absenceRefusal({
              kind: "blob-absent",
              law: "A blob reads only from a store that holds it.",
              path: ["blob", digest],
              got: "absent",
              expected: digest,
              next: [{ subject: "blob.put", note: "Put the bytes first." }],
            }))
          }
          const rederived = sha256(held)
          return rederived === digest ? Effect.succeed(held) : Effect.fail(structuralRefusal({
            kind: "digest-mismatch",
            law: "A blob's identity is re-derived over the fetched bytes.",
            path: ["blob", digest],
            got: rederived,
            expected: digest,
            next: [{ subject: "blob.put", note: "Re-put the original bytes." }],
          }))
        }),
      has: (digest) => Effect.sync(() => buckets.has(bucketOf(digest))),
    }
    return {
      layer: Blobs.testLayer(service),
      corrupt: async (digest) => {
        const held = buckets.get(bucketOf(digest))
        if (held === undefined) throw new Error(`control: nothing is stored at ${digest}`)
        buckets.set(bucketOf(digest), flipFirstByte(held))
      },
      close: async () => {},
    }
  },
}

/** One planted backend per law, each dropping exactly that law. */
const controls: ReadonlyArray<{ readonly backend: BlobsBackend; readonly drops: string }> = [
  {
    drops: BLOB_LAWS.identity,
    backend: memoryBackend(
      "a store self-consistent under an address that is not the content's digest",
      (_base, entries) => {
        const address = (bytes: Uint8Array): Digest => sha256(new Uint8Array([...bytes, 0]))
        return {
          put: (bytes) =>
            Effect.sync(() => {
              const digest = address(bytes)
              entries.set(digest, new Uint8Array(bytes))
              return digest
            }),
          get: (digest) =>
            Effect.suspend((): Effect.Effect<Uint8Array, Refusal> => {
              const held = entries.get(digest)
              if (held === undefined) {
                return Effect.fail(absenceRefusal({
                  kind: "blob-absent",
                  law: "A blob reads only from a store that holds it.",
                  path: ["blob", digest],
                  got: "absent",
                  expected: digest,
                  next: [{ subject: "blob.put", note: "Put the bytes first." }],
                }))
              }
              const rederived = address(held)
              return rederived === digest ? Effect.succeed(held) : Effect.fail(structuralRefusal({
                kind: "digest-mismatch",
                law: "A blob's identity is re-derived over the fetched bytes.",
                path: ["blob", digest],
                got: rederived,
                expected: digest,
                next: [{ subject: "blob.put", note: "Re-put the original bytes." }],
              }))
            }),
          has: (digest) => Effect.sync(() => entries.has(digest)),
        }
      },
    ),
  },
  {
    drops: BLOB_LAWS.absence,
    backend: memoryBackend(
      "a store that invents empty bytes instead of observing absence",
      (base, entries) => ({
        ...base,
        get: (digest) =>
          Effect.suspend(() =>
            entries.has(digest) ? base.get(digest) : Effect.succeed(new Uint8Array())
          ),
      }),
    ),
  },
  {
    drops: BLOB_LAWS.verifiedRead,
    backend: memoryBackend(
      "a store that serves what it holds without re-deriving",
      (base, entries) => ({
        ...base,
        get: (digest) =>
          Effect.suspend(() => {
            const held = entries.get(digest)
            return held === undefined ? base.get(digest) : Effect.succeed(held)
          }),
      }),
    ),
  },
  {
    drops: BLOB_LAWS.idempotence,
    backend: memoryBackend(
      "a store that refuses a second put of bytes it already holds",
      (base, entries) => ({
        ...base,
        put: (bytes) =>
          Effect.suspend(() => {
            const digest = sha256(bytes)
            return entries.has(digest)
              ? Effect.fail(structuralRefusal({
                kind: "malformed-value",
                law: "This planted store admits each blob once.",
                path: ["blob", digest],
                got: "already stored",
                expected: "absent",
                next: [{ subject: "blob.put", note: "Do not re-put." }],
              }))
              : base.put(bytes)
          }),
      }),
    ),
  },
  {
    drops: BLOB_LAWS.presence,
    backend: memoryBackend(
      "a store whose presence check answers true for everything",
      (base) => ({ ...base, has: () => Effect.succeed(true) }),
    ),
  },
  { drops: BLOB_LAWS.distinctness, backend: prefixAddressedBackend },
]

describe("the conformance suite's negative controls", () => {
  test("the unplanted control base passes every law", async () => {
    expect(await refutedLaws(memoryBackend("the control base", (base) => base))).toEqual([])
  })

  for (const control of controls) {
    test(`${control.backend.name} is refuted on exactly its own law`, async () => {
      expect(await refutedLaws(control.backend)).toEqual([control.drops])
    })
  }
})
