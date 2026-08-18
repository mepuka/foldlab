import { describe, test } from "bun:test"

import { Effect, type Layer } from "effect"

import { Blobs } from "../src/Blob.js"
import { Digest } from "../src/Digest.js"
import { isRetryable, type Refusal } from "../src/Refusal.js"

/**
 * The backend-agnostic blob conformance suite — the wall a `BlobsService`
 * backend ships with, green, or does not ship (affordances record A-9).
 *
 * One suite, every layer: the laws below are stated over the interface, never
 * over a backend's mechanics, so the NATS object-store backend (gated on
 * DEV-730) and any later remote backend add an instantiation and no law. The
 * probe gate binds the object-store backend only — the filesystem backend's
 * substrate is the OS filesystem and this suite is its wall.
 *
 * The checks throw plain errors rather than using a test framework's
 * assertions: a backend that lives outside this package must be able to run
 * them, and the negative controls (`refutedLaws`) need to catch a violation as
 * a value rather than as a test-runner side effect.
 */
const utf8 = new TextEncoder()

/**
 * FIPS 180-4's published SHA-256 vector for "abc" — the oracle for the identity
 * law, and deliberately outside both this package and any backend. A store that
 * addressed its content by some other function of the bytes would agree with
 * itself forever; it disagrees with this line immediately.
 */
const ABC = utf8.encode("abc")
const ABC_DIGEST = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"

/**
 * A second payload whose digest agrees with `ABC`'s on its first byte. Both
 * digests are derived at run time by the store's own `put`; this line pins
 * bytes, never an answer.
 *
 * The prefix agreement is what makes the distinctness law discriminating. A
 * store that addresses content by a truncation of the digest — the two-
 * character fan-out the filesystem backend uses for layout, mistaken for
 * identity — holds only one of these two at a time, and every other law in
 * this suite still passes on it.
 */
const PREFIX_TWIN = utf8.encode("distinct-payload-7")

/** A digest no store holds, used to observe head-relative absence. */
const NEVER_STORED = Digest.make("0".repeat(64))

/** One backend opened for one check, with the door a control lies behind. */
export interface BlobsStore {
  readonly layer: Layer.Layer<Blobs>
  /** Flips one byte of the stored content behind the backend's back. */
  readonly corrupt: (digest: Digest) => Promise<void>
  readonly close: () => Promise<void>
}

/** A backend under the wall: a fresh, empty store per check. */
export interface BlobsBackend {
  readonly name: string
  readonly open: () => Promise<BlobsStore>
}

/** One law of the store contract, checkable against any backend. */
export interface ConformanceCheck {
  readonly law: string
  readonly run: (store: BlobsStore) => Promise<void>
}

/** The laws by name, so a control can say which one it dropped. */
export const BLOB_LAWS = {
  identity: "put addresses the exact bytes it stored, and get returns them byte-identically",
  absence: "a digest the store does not hold is a retryable blob-absent absence",
  verifiedRead: "a corrupted store is refused digest-mismatch, never served",
  idempotence: "put is idempotent by content addressing",
  presence: "has is head-relative presence: false before the put, true after it",
  distinctness:
    "two distinct payloads coexist: each get returns its own bytes and each has is true",
} as const

const refuse = (law: string, detail: string): never => {
  throw new Error(`blob conformance — ${law}: ${detail}`)
}

const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index])

const run = <A>(store: BlobsStore, effect: Effect.Effect<A, Refusal, Blobs>): Promise<A> =>
  Effect.runPromise(Effect.provide(effect, store.layer))

const put = (store: BlobsStore, bytes: Uint8Array): Promise<Digest> =>
  run(store, Effect.flatMap(Blobs, (blobs) => blobs.put(bytes)))

const get = (store: BlobsStore, digest: Digest): Promise<Uint8Array> =>
  run(store, Effect.flatMap(Blobs, (blobs) => blobs.get(digest)))

const has = (store: BlobsStore, digest: Digest): Promise<boolean> =>
  run(store, Effect.flatMap(Blobs, (blobs) => blobs.has(digest)))

/** Rejects when the store served bytes instead of refusing. */
const refusedGet = (store: BlobsStore, digest: Digest): Promise<Refusal> =>
  Effect.runPromise(
    Effect.provide(
      Effect.flatMap(Blobs, (blobs) => Effect.flip(blobs.get(digest))),
      store.layer,
    ),
  )

/** Every law, in the order a reader should meet them. */
export const blobsConformanceChecks: ReadonlyArray<ConformanceCheck> = [
  {
    law: BLOB_LAWS.identity,
    run: async (store) => {
      const digest = await put(store, ABC)
      if (digest !== ABC_DIGEST) {
        refuse(BLOB_LAWS.identity, `put returned ${digest}, not the published vector ${ABC_DIGEST}`)
      }
      const fetched = await get(store, digest)
      if (!sameBytes(fetched, ABC)) {
        refuse(BLOB_LAWS.identity, `get returned ${fetched.length} bytes that are not the ones put`)
      }
    },
  },
  {
    law: BLOB_LAWS.absence,
    run: async (store) => {
      const refusal = await refusedGet(store, NEVER_STORED).catch(() =>
        refuse(BLOB_LAWS.absence, "get of an unheld digest did not refuse at all")
      )
      if (refusal.sort !== "absence" || refusal.kind !== "blob-absent") {
        refuse(BLOB_LAWS.absence, `refused ${refusal.sort}/${refusal.kind}, not absence/blob-absent`)
      }
      if (!isRetryable(refusal)) refuse(BLOB_LAWS.absence, "the refusal is not retryable")
      if (refusal.next.length === 0) refuse(BLOB_LAWS.absence, "the refusal teaches no repair")
    },
  },
  {
    law: BLOB_LAWS.verifiedRead,
    run: async (store) => {
      const digest = await put(store, ABC)
      await store.corrupt(digest)
      const refusal = await refusedGet(store, digest).catch(() =>
        refuse(BLOB_LAWS.verifiedRead, "the corrupted store served its bytes instead of refusing")
      )
      if (refusal.sort !== "structural" || refusal.kind !== "digest-mismatch") {
        refuse(
          BLOB_LAWS.verifiedRead,
          `refused ${refusal.sort}/${refusal.kind}, not structural/digest-mismatch`,
        )
      }
      if (refusal.expected !== digest) {
        refuse(BLOB_LAWS.verifiedRead, `the refusal expected ${String(refusal.expected)}`)
      }
      if (refusal.got === digest) {
        refuse(BLOB_LAWS.verifiedRead, "the refusal re-derived the digest it was asked for")
      }
    },
  },
  {
    law: BLOB_LAWS.idempotence,
    run: async (store) => {
      const first = await put(store, ABC)
      const second = await put(store, ABC).catch((cause) =>
        refuse(BLOB_LAWS.idempotence, `the second put of the same bytes failed: ${String(cause)}`)
      )
      if (first !== second) {
        refuse(BLOB_LAWS.idempotence, `the same bytes were named ${first} then ${second}`)
      }
      const fetched = await get(store, first)
      if (!sameBytes(fetched, ABC)) {
        refuse(BLOB_LAWS.idempotence, "the re-put store no longer round-trips its bytes")
      }
    },
  },
  {
    law: BLOB_LAWS.presence,
    run: async (store) => {
      if (await has(store, NEVER_STORED)) {
        refuse(BLOB_LAWS.presence, "an empty store reported bytes it does not hold")
      }
      const digest = await put(store, ABC)
      if (!(await has(store, digest))) {
        refuse(BLOB_LAWS.presence, "the store denies bytes it acknowledged putting")
      }
    },
  },
  {
    law: BLOB_LAWS.distinctness,
    run: async (store) => {
      // Every other law exercises one payload in a fresh store, so a store that
      // is not content-addressed at lookup ships green through all of them.
      // This is the row that puts two in and asks for both back.
      const first = await put(store, ABC)
      const second = await put(store, PREFIX_TWIN)
      if (first === second) {
        refuse(BLOB_LAWS.distinctness, `two different payloads were both named ${first}`)
      }
      const firstBytes = await get(store, first).catch((cause) =>
        refuse(BLOB_LAWS.distinctness, `the first payload no longer reads back: ${String(cause)}`)
      )
      if (!sameBytes(firstBytes, ABC)) {
        refuse(BLOB_LAWS.distinctness, "the first payload came back as bytes it was not put with")
      }
      const secondBytes = await get(store, second).catch((cause) =>
        refuse(BLOB_LAWS.distinctness, `the second payload no longer reads back: ${String(cause)}`)
      )
      if (!sameBytes(secondBytes, PREFIX_TWIN)) {
        refuse(BLOB_LAWS.distinctness, "the second payload came back as bytes it was not put with")
      }
      if (!(await has(store, first)) || !(await has(store, second))) {
        refuse(BLOB_LAWS.distinctness, "the store denies one of two payloads it acknowledged")
      }
    },
  },
]

/** Registers the whole suite against one backend. */
export const blobsConformance = (backend: BlobsBackend): void => {
  describe(`the blob conformance suite — ${backend.name}`, () => {
    for (const check of blobsConformanceChecks) {
      test(check.law, async () => {
        const store = await backend.open()
        try {
          await check.run(store)
        } finally {
          await store.close()
        }
      })
    }
  })
}

/**
 * Runs every law against a backend and names the ones that refused it.
 *
 * This is the door the negative controls use: a prover that cannot fail proves
 * nothing, so each planted backend must be refuted on exactly the law it
 * dropped and on no other.
 */
export const refutedLaws = async (
  backend: BlobsBackend,
): Promise<ReadonlyArray<string>> => {
  const refuted: Array<string> = []
  for (const check of blobsConformanceChecks) {
    const store = await backend.open()
    try {
      await check.run(store)
    } catch {
      refuted.push(check.law)
    } finally {
      await store.close()
    }
  }
  return refuted
}
