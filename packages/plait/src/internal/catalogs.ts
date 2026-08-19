/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * The durable content-addressed value store behind `CatalogService`.
 *
 * One interface, two adapters. The process-local `Map` in `Catalog.ts` was the
 * only implementation the seam ever had, which made the seam a hypothesis; this
 * module is the second adapter that makes it real. Everything it hides is
 * hidden: the bucket's ruled shape, the key layout, the idempotent-create
 * mechanics, and the verification. `CatalogService` does not move.
 *
 * **The store this generalizes already ran.** The fold has checkpointed its
 * state as digest-keyed KV entries since the anchor adapter was written —
 * create-idempotent-by-comparison on the write side, re-derive-and-refuse on
 * the read side, file-backed and crash-proven. That store had no interface and
 * no reuse path, so the estate ran two content-addressed stores and only one of
 * them was durable. The ruled direction is this one: the catalog gains the
 * durable layer built on that pattern, and the anchor adapter becomes its
 * consumer. The reverse — moving the fold onto the process-local map — would
 * delete the crash-durability the fold's chaos gates prove.
 *
 * **Verify-on-read lives here, at the store seam this module owns, and that
 * does not weaken the resolve-side split.** Verification for a *resolved
 * reference* still happens at exactly one seam, `Resolved.resolve`, and the
 * in-memory `Catalog` layer and the `Payloads` seam under it stay unverified so
 * a lying layer can be supplied beneath them. What that argument protects is
 * the writability of the control: a store that polices its own answers cannot
 * be made to lie by a fixture. A REAL backend needs no cooperation — the
 * control flips bytes in the bucket behind the API — so this adapter re-derives
 * without costing anything a control needed, exactly as the public blob store
 * already does. The order is the law: `sha256(fetched octets) == D` first,
 * decode second, with the estate's fatal constrained decoder over the verified
 * bytes. Re-deriving from a decoded value instead is the laundering door, and
 * this seam does not have one.
 *
 * **The duplicate-create reconcile carries a load-bearing tolerance, and
 * removing it means checking a stated fact first.** A create that loses the
 * digest key reports wrong-last-sequence, and this store answers by reading the
 * key back and comparing bytes rather than by believing the report. That
 * tolerance is not defensive style. `nats-io/nats-server` issue 5162 — a KV
 * `Create` racing a `Delete` on a tombstoned key returns a spurious
 * wrong-last-sequence — has been OPEN since 2024-03-02, and its disposition on
 * the record is that it cannot be fixed under the current protocol: a project
 * member's "I think this is more a client thing", a contributor's "I do not
 * think we can improve this scenario at the moment given current API
 * capabilities", and the reporter's root cause, that the JetStream protocol
 * carries no atomic KV create which avoids the client checking for a delete
 * marker. So a wrong-last-sequence is evidence about a sequence number and
 * never evidence about content: the bytes at a digest key are the only thing
 * that settles whether the value is admitted. The executed control that kills
 * the trusting variant plants a spurious wrong-last-sequence over a create that
 * actually landed and requires the reconcile to admit it.
 *
 * **The incarnation stamp, and why nothing is pinned here yet.** A KV bucket
 * has lives: destroy and recreate it under the same name and the revision order
 * restarts, so a fence taken against the dead one names a store that no longer
 * exists. The register carrier pins its incarnation for exactly that reason —
 * its fencing tokens ARE revisions, and a token from a reborn bucket must
 * refuse rather than land. This carrier is the lattice carrier's case instead,
 * and the argument is the same one recorded for it: no catalog revision ever
 * crosses a call boundary. The addresses here are digests, which are immutable
 * and identical across incarnations by construction, and neither `put` nor
 * `get` returns a revision or accepts one. There is no fence a reborn bucket
 * could dishonor; what a destroyed bucket destroys is data, which no pin
 * recovers. So the stamp's place is named and its pin is deferred: the
 * three-bucket incarnation conversion is what decides whether this argument
 * becomes a pin like the register's or stays an exemption like the cell's, and
 * the reading point is the bucket status the shape gate below already takes.
 * Building a pin ahead of that ruling would be machinery nothing consumes.
 *
 * **Bounds, stated on the layer.** Crash-durable per the estate's declared
 * substrate spectrum — file storage under background sync — and power-loss
 * durability is not claimed here or anywhere else in the estate. The
 * process-local layer remains the default and remains what the fast suites run
 * on; flipping a deployment onto this one is a deployment act. Federation,
 * venue authority, blob payload migration, and the object store are all outside
 * this module. The catalog model's own R3 claim, at the repaired hypothesis
 * bounds recorded in the estate's verification ledger, is the model substrate
 * this store's contract sits under: it licenses the design, and the package
 * realizes only the single-holder fragment — no per-daemon authority, no
 * mirror, no lag, and no durable snapshot of a catalog as one value.
 *
 * @module
 */
import { decodeJson } from "@foldlab/core/jcs"
import { StorageType, StoreCompression } from "@nats-io/jetstream"
import { Kvm, type KV, type KvEntry } from "@nats-io/kv"
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Option, Scope } from "effect"

import {
  CATALOG_BUCKET,
  CATALOG_HISTORY,
  type CatalogService,
  type DurableCatalogOptions,
} from "../planes/Catalog.js"
import { canonicalBytes, type WireValue } from "../truth/Canonical.js"
import type { Digest } from "../truth/Digest.js"
import {
  structuralRefusal,
  type Next,
  type Refusal,
} from "../truth/Refusal.js"
import {
  KV_ALLOW_DIRECT,
  adminSurface,
  expiresFacts,
  expiringAuthorityCarrier,
  hasPinnedAdminSurface,
  importsFacts,
  mirroredAuthorityCarrier,
  type CarrierSite,
} from "./carriers.js"
import { digestOfCanonicalBytes, digestOfStoredBytes } from "./digests.js"
import {
  KvFailure,
  acquireConnection,
  isCasRefusal,
  teachRetryOperation,
  transportRefusalFor,
} from "./transport.js"

/** Where the catalog carrier is opened, for a named law to address. */
const catalogSite: CarrierSite = { path: ["bucket"], subject: "catalog.publish" }

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "catalog-transport-unavailable",
  law: "Transport absence may be retried; a cataloged value's identity may not.",
  expected: "the pinned local NATS KV operation to be available",
  next: teachRetryOperation,
})

const teachRepublish: ReadonlyArray<Next> = [{
  subject: "catalog.publish",
  note:
    "Publish the value again through the catalog: a digest key holds exactly the canonical bytes that hash to it, and nothing else writes this bucket.",
}]

const teachWireValue: ReadonlyArray<Next> = [{
  subject: "catalog.publish",
  note: "Store the value as the canonical uncompressed bytes of one RFC 8785 wire value.",
}]

/**
 * The identity law of this store, minted once for every way it can be broken.
 *
 * `got` says what was found where the digest's own bytes belong — the digest
 * the fetched octets actually hash to, or the absence a refused create claimed
 * was an occupied key.
 */
const mismatch = (digest: Digest, got: string): Refusal =>
  structuralRefusal({
    kind: "digest-mismatch",
    law:
      "A cataloged value's identity is re-derived from the exact bytes held at its own digest key and is never asserted by the store.",
    path: ["catalog", digest],
    got,
    expected: digest,
    next: teachRepublish,
  })

const malformed = (digest: Digest, reason: string): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "Bytes admitted at a digest decode as exactly one RFC 8785 wire value.",
    path: ["catalog", digest],
    got: reason,
    expected: "one RFC 8785 wire value",
    next: teachWireValue,
  })

/**
 * The key one cataloged value occupies.
 *
 * The digest is the whole address; the prefix is layout and carries no identity
 * role, exactly as a blob store's fan-out directory does. Exported for the same
 * reason the anchor carrier exports its own key function: a substrate control
 * has to reach behind this store's API to flip a byte under it, and a control
 * that had to guess the layout would be testing its guess.
 */
export const valueKey = (digest: Digest): string => `value.${digest}`

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.byteLength === right.byteLength && left.every((value, index) => value === right[index])

const readEntry = (
  bucket: KV,
  key: string,
  operation: string,
): Effect.Effect<KvEntry | null, Refusal> => Effect.tryPromise({
  try: () => bucket.get(key),
  catch: (cause) => transportRefusal(operation, cause),
})

/**
 * How a create that reported wrong-last-sequence at a digest key is disposed.
 *
 * A disposition, not a policy switch: the shipped store has exactly one, and
 * the seam exists so the executed control can build the same store over the
 * unlawful twin below and be killed by it. Nothing selects between them at
 * runtime and no option reaches this choice.
 */
export interface CreateDisposition {
  readonly reconcile: (
    bucket: KV,
    digest: Digest,
    bytes: Uint8Array,
  ) => Effect.Effect<void, Refusal>
}

/**
 * The shipped disposition: read the key back and compare bytes.
 *
 * Content addressing is what makes this total. Every writer that reaches a
 * digest key writes the same canonical octets, so a key already holding them is
 * a create that has nothing left to do — whether the report was a genuine
 * duplicate or the spurious wrong-last-sequence the module law cites. A key
 * holding anything else, or nothing at all after a create claimed it was
 * occupied, is the store contradicting the address it was given, and that is
 * structural.
 */
export const reconcileByReadBack: CreateDisposition = {
  reconcile: (bucket, digest, bytes) => Effect.flatMap(
    readEntry(bucket, valueKey(digest), "catalog.read-existing"),
    (existing) => existing !== null && bytesEqual(existing.value, bytes)
      ? Effect.void
      : Effect.fail(mismatch(
        digest,
        existing === null
          ? "absent after a create the substrate refused"
          : "different bytes at the digest key",
      )),
  ),
}

/**
 * NEGATIVE TWIN — the disposition that believes the create's report.
 *
 * Exported for the executed control that must kill it, and reached by nothing
 * else: the shipped store binds {@link reconcileByReadBack} and no caller may
 * choose. It stands beside its lawful counterpart for the same reason the
 * lattice plane's last-writer-wins merge does — a variant spelled in the
 * shipped module is a variant the shipped module's own path can be run against,
 * so the control exercises the real store rather than a restatement of it.
 */
export const trustCreateOutcome: CreateDisposition = {
  reconcile: (_bucket, digest) =>
    Effect.fail(mismatch(digest, "a create the substrate refused, taken at face value")),
}

/**
 * The store over one opened bucket.
 *
 * Split from the opening so the executed control can interpose on the bucket —
 * behind the API, as every substrate control in this package does — without any
 * hook reaching into the store itself. A store is over a bucket; that is the
 * factoring, not a test seam.
 */
export const catalogStoreOver = (
  bucket: KV,
  disposition: CreateDisposition,
): CatalogService => {
  const put: CatalogService["put"] = Effect.fn("Catalog.put")(function* (
    value,
  ): Effect.fn.Return<Digest, Refusal> {
    // Canonicalized once. The bytes are what gets written and what the digest
    // is taken over, so deriving the digest through the value's own door would
    // canonicalize the same value a second time to reach the same hash — the
    // duplication the internal digest seam names, on a path every checkpoint
    // commit runs.
    const bytes = yield* canonicalBytes(value)
    const digest = digestOfCanonicalBytes(bytes)
    yield* Effect.tryPromise({
      try: () => bucket.create(valueKey(digest), bytes),
      catch: (cause) => new KvFailure(cause),
    }).pipe(Effect.catch(({ cause }) => isCasRefusal(cause)
      ? disposition.reconcile(bucket, digest, bytes)
      : Effect.fail(transportRefusal("catalog.create", cause))))
    return digest
  })

  const get: CatalogService["get"] = Effect.fn("Catalog.get")(function* (
    digest,
  ): Effect.fn.Return<Option.Option<WireValue>, Refusal> {
    const entry = yield* readEntry(bucket, valueKey(digest), "catalog.read")
    if (entry === null) return Option.none()
    const stored = digestOfStoredBytes(entry.value)
    if (stored !== digest) return yield* mismatch(digest, stored)
    const decoded = decodeJson(entry.value)
    if (!decoded.ok) return yield* malformed(digest, decoded.refusal.reason)
    return Option.some(decoded.value)
  })

  return { get, put }
}

/**
 * Opens the ruled catalog bucket and refuses anything that is not it.
 *
 * The shape is the anchor and cell carriers' — file storage, one replica, no
 * age or size eviction, and no admin surface beyond the direct-get the KV
 * client itself turns on — with one retained revision, because a value at a
 * digest key never changes and a history would offer a past that cannot exist.
 * A memory-storage server is not a degraded mode here; it is refused.
 */
export const openCatalogBucket = Effect.fn("Catalog.openBucket")(function* (
  connection: NatsConnection,
): Effect.fn.Return<KV, Refusal> {
  const bucket = yield* Effect.tryPromise({
    try: () => new Kvm(connection).create(CATALOG_BUCKET, {
      storage: StorageType.File,
      replicas: 1,
      history: CATALOG_HISTORY,
      ttl: 0,
      max_bytes: -1,
      // Declared, not feature-detected — see the cell and anchor carriers' twins.
      allow_direct: KV_ALLOW_DIRECT,
    }),
    catch: (cause) => transportRefusal("catalog.bucket.ensure", cause),
  })
  const status = yield* Effect.tryPromise({
    try: () => bucket.status(),
    catch: (cause) => transportRefusal("catalog.bucket.status", cause),
  })
  const config = status.streamInfo.config
  if (importsFacts(config)) return yield* mirroredAuthorityCarrier(catalogSite, config)
  if (expiresFacts(config)) return yield* expiringAuthorityCarrier(catalogSite, config)
  if (status.storage !== StorageType.File || status.replicas !== 1 ||
    status.history !== CATALOG_HISTORY || status.ttl !== 0 || status.max_bytes !== -1 ||
    !hasPinnedAdminSurface(config, KV_ALLOW_DIRECT)) {
    return yield* structuralRefusal({
      kind: "catalog-substrate-shape",
      law:
        "The catalog bucket is file-backed R=1 with one retained revision, no age or size eviction, and no admin surface beyond it.",
      path: ["bucket", "config"],
      got: JSON.stringify({
        storage: status.storage,
        replicas: status.replicas,
        history: status.history,
        ttl: status.ttl,
        max_bytes: status.max_bytes,
        ...adminSurface(config),
      }),
      expected:
        "file/R=1/history=1/ttl=0/max_bytes=-1/direct=on, and no republish, subject transform, mirror-direct, atomic publish, message counter, compression, or value-size cap",
      next: [{
        subject: "catalog.publish",
        note:
          "Restore the ruled flb-fab-cat bucket shape, admin surface included, before publishing durable values.",
        body: {
          storage: StorageType.File,
          replicas: 1,
          history: CATALOG_HISTORY,
          ttl: 0,
          max_bytes: -1,
          republish: null,
          subject_transform: null,
          allow_direct: KV_ALLOW_DIRECT,
          mirror_direct: false,
          allow_atomic: false,
          allow_msg_counter: false,
          compression: StoreCompression.None,
          max_msg_size: -1,
        },
      }],
    })
  }
  return bucket
})

/**
 * The durable store over one already-established connection.
 *
 * This is the door the anchor adapter consumes: the fold's checkpoint state is
 * a cataloged value like any other, and the connection it rides is the one the
 * anchor carrier already holds rather than a second socket per pump.
 */
export const makeCatalogStore = (
  connection: NatsConnection,
): Effect.Effect<CatalogService, Refusal> =>
  Effect.map(
    openCatalogBucket(connection),
    (bucket) => catalogStoreOver(bucket, reconcileByReadBack),
  )

/** The durable store with its own scope-owned connection, for the layer. */
export const makeDurableCatalog = Effect.fn("Catalog.makeDurable")(function* (
  options: DurableCatalogOptions,
): Effect.fn.Return<CatalogService, Refusal, Scope.Scope> {
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait-catalog",
    "catalog.connection.acquire",
    transportRefusal,
  )
  return yield* makeCatalogStore(connection)
})
