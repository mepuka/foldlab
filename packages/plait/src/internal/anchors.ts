/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { decodeJson } from "@foldlab/core/jcs"
import { StorageType } from "@nats-io/jetstream"
import { Kvm, type KV, type KvEntry } from "@nats-io/kv"
import type { NatsConnection } from "@nats-io/nats-core"
import { Effect, Result, Schema } from "effect"

import {
  ANCHOR_BUCKET,
  ANCHOR_HISTORY,
  Anchor,
  initial,
  type Anchor as AnchorValue,
} from "../planes/Anchor.js"
import { canonicalBytes, type WireValue } from "../truth/Canonical.js"
import { digestOf } from "../truth/Digest.js"
import type { DeclaredFold } from "../planes/Fold.js"
import {
  absenceRefusal,
  structuralRefusal,
  type Refusal,
  WireValueSchema,
} from "../truth/Refusal.js"
import { KvFailure, isCasRefusal, transportRefusalFor } from "./transport.js"

export interface LoadedAnchor<State> {
  readonly anchor: AnchorValue
  readonly state: State
  readonly revision: number
}

export interface AnchorStore {
  readonly initialize: <Event, State, Partitions extends number>(
    fold: DeclaredFold<Event, State, Partitions>,
    partition: number,
  ) => Effect.Effect<LoadedAnchor<State>, Refusal>
  /**
   * `initialize` without the creation: a reader's load of the checkpoint and
   * the state it names. An absent anchor is the absence `initialize` would
   * have filled by writing, and a reader never writes it.
   */
  readonly load: <Event, State, Partitions extends number>(
    fold: DeclaredFold<Event, State, Partitions>,
    partition: number,
  ) => Effect.Effect<LoadedAnchor<State>, Refusal>
  readonly commit: <State>(
    key: string,
    expectedRevision: number,
    anchor: AnchorValue,
    state: State,
  ) => Effect.Effect<number, Refusal>
  readonly read: (key: string) => Effect.Effect<AnchorValue, Refusal>
  readonly key: <Event, State, Partitions extends number>(
    fold: DeclaredFold<Event, State, Partitions>,
    partition: number,
  ) => string
}

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "anchor-transport-unavailable",
  law: "Transport absence may be retried; anchor revision conflicts may not.",
  expected: "the pinned local NATS KV operation to be available",
  next: () => [{
    subject: "Folds.deploy",
    note: "A transport refusal leaves this anchor write's outcome unknown. Do not retry it in place: detach and redeploy - resumption reads the landed anchor back, and a retried CAS that already landed refuses as lost-anchor-cas by design.",
  }],
})

const malformed = (
  path: ReadonlyArray<string>,
  got: string,
  expected: string,
): Refusal => structuralRefusal({
  kind: "malformed-anchor-state",
  law: "An anchor and its content-addressed state must re-derive to the recorded canonical digests.",
  path,
  got,
  expected,
  next: [{
    subject: "Folds.deploy",
    note: "Restore the checkpoint fact and state bytes written only by the anchor adapter.",
  }],
})

const lostCas = (key: string, revision: number, cause: unknown): Refusal =>
  structuralRefusal({
    kind: "lost-anchor-cas",
    law: "One live pump owns each fold partition; losing its anchor revision CAS is a fatal detach.",
    path: ["anchor", key, "revision"],
    got: revision,
    expected: "the still-current anchor revision",
    next: [{
      subject: "Folds.deploy",
      note: `Detach this pump; do not re-read and continue (${String(cause)}).`,
    }],
  })

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.byteLength === right.byteLength && left.every((value, index) => value === right[index])

const parseAnchor = (entry: KvEntry): Effect.Effect<AnchorValue, Refusal> => {
  const decoded = decodeJson(entry.value)
  if (!decoded.ok) {
    return Effect.fail(malformed(
      ["anchor", String(entry.revision)],
      decoded.refusal.reason,
      "one canonical anchor record",
    ))
  }
  const parsed = Schema.decodeUnknownResult(Anchor, {
    onExcessProperty: "error",
    errors: "first",
  })(decoded.value)
  return Result.isSuccess(parsed)
    ? Effect.succeed(parsed.success)
    : Effect.fail(malformed(
      ["anchor", String(entry.revision)],
      String(parsed.failure),
      "the closed {floor,stateDigest,head} anchor record",
    ))
}

const readEntry = (
  bucket: KV,
  key: string,
  operation: string,
): Effect.Effect<KvEntry | null, Refusal> => Effect.tryPromise({
  try: () => bucket.get(key),
  catch: (cause) => transportRefusal(operation, cause),
})

/** The absence a key with no anchor carries, minted the same for every reader. */
const anchorAbsent = (anchorKey: string): Refusal => absenceRefusal({
  kind: "anchor-absent",
  law: "A deployed partition publishes its floor-zero anchor before returning its handle.",
  path: ["anchor", anchorKey],
  got: "absent",
  expected: "a deployed fold anchor",
  next: [{ subject: "Folds.deploy", note: "Deploy the fold to create or resume its anchor." }],
})

const stateKey = (digest: string): string => `state.${digest}`

const ensureState = Effect.fn("AnchorStore.ensureState")(function* (
  bucket: KV,
  state: WireValue,
) {
  const digest = yield* digestOf(state)
  const bytes = yield* canonicalBytes(state)
  yield* Effect.tryPromise({
    try: () => bucket.create(stateKey(digest), bytes),
    catch: (cause) => new KvFailure(cause),
  }).pipe(Effect.catch(({ cause }) => {
    if (!isCasRefusal(cause)) return Effect.fail(transportRefusal("anchor.state.create", cause))
    return Effect.flatMap(
      readEntry(bucket, stateKey(digest), "anchor.state.read-existing"),
      (existing) => existing !== null && bytesEqual(existing.value, bytes)
        ? Effect.void
        : Effect.fail(malformed(
          ["state", digest],
          existing === null ? "absent after duplicate create" : "different bytes at digest key",
          "the exact canonical state bytes named by the key",
        )),
    )
  }))
  return { digest, bytes }
})

const loadState = Effect.fn("AnchorStore.loadState")(function*<State> (
  bucket: KV,
  digest: string,
): Effect.fn.Return<State, Refusal> {
  const entry = yield* readEntry(bucket, stateKey(digest), "anchor.state.read")
  if (entry === null) {
    return yield* malformed(["state", digest], "absent", "the canonical state bytes")
  }
  const decoded = decodeJson(entry.value)
  if (!decoded.ok || !Schema.is(WireValueSchema)(decoded.value)) {
    return yield* malformed(
      ["state", digest],
      decoded.ok ? "non-wire state" : decoded.refusal.reason,
      "one canonical wire-grammar state",
    )
  }
  const actual = yield* digestOf(decoded.value)
  if (actual !== digest) {
    return yield* malformed(["state", digest], actual, digest)
  }
  return decoded.value as State
})

export const makeAnchorStore = Effect.fn("AnchorStore.make")(function* (
  connection: NatsConnection,
): Effect.fn.Return<AnchorStore, Refusal> {
  const bucket = yield* Effect.tryPromise({
    try: () => new Kvm(connection).create(ANCHOR_BUCKET, {
      storage: StorageType.File,
      replicas: 1,
      history: ANCHOR_HISTORY,
      ttl: 0,
      max_bytes: -1,
    }),
    catch: (cause) => transportRefusal("anchor.bucket.ensure", cause),
  })
  const status = yield* Effect.tryPromise({
    try: () => bucket.status(),
    catch: (cause) => transportRefusal("anchor.bucket.status", cause),
  })
  if (status.storage !== StorageType.File || status.replicas !== 1 ||
    status.history !== ANCHOR_HISTORY || status.ttl !== 0 || status.max_bytes !== -1) {
    return yield* structuralRefusal({
      kind: "anchor-substrate-shape",
      law: "The anchor bucket is file-backed R=1 with 64 revisions and no age or size eviction.",
      path: ["bucket", "config"],
      got: JSON.stringify({
        storage: status.storage,
        replicas: status.replicas,
        history: status.history,
        ttl: status.ttl,
        max_bytes: status.max_bytes,
      }),
      expected: "file/R=1/history=64/ttl=0/max_bytes=-1",
      next: [{
        subject: "Folds.deploy",
        note: "Restore the ruled flb-fab-anchor bucket shape before deploying folds.",
      }],
    })
  }

  const key: AnchorStore["key"] = (fold, partition) =>
    `anchor.${fold.digest}.${fold.lane.digest}.${partition}`

  const initialize: AnchorStore["initialize"] = Effect.fn("AnchorStore.initialize")(
    function*<Event, State, Partitions extends number> (
      fold: DeclaredFold<Event, State, Partitions>,
      partition: number,
    ): Effect.fn.Return<LoadedAnchor<State>, Refusal> {
      const anchorKey = key(fold, partition)
      const present = yield* readEntry(bucket, anchorKey, "anchor.read")
      if (present !== null) {
        const anchor = yield* parseAnchor(present)
        const state = yield* loadState<State>(bucket, anchor.stateDigest)
        return { anchor, state, revision: present.revision }
      }

      const state = fold.algebra.reducer.initialValue
      if (!Schema.is(WireValueSchema)(state)) {
        return yield* malformed(["state", "initial"], String(state), "one wire-grammar state")
      }
      const anchor = yield* initial(state)
      yield* ensureState(bucket, state)
      const bytes = yield* canonicalBytes(anchor)
      const revision = yield* Effect.tryPromise({
        try: () => bucket.create(anchorKey, bytes),
        catch: (cause) => new KvFailure(cause),
      }).pipe(Effect.catch(({ cause }) => isCasRefusal(cause)
        ? Effect.fail(lostCas(anchorKey, 0, cause))
        : Effect.fail(transportRefusal("anchor.create", cause))))
      return { anchor, state, revision }
    },
  )

  const load: AnchorStore["load"] = Effect.fn("AnchorStore.load")(
    function*<Event, State, Partitions extends number> (
      fold: DeclaredFold<Event, State, Partitions>,
      partition: number,
    ): Effect.fn.Return<LoadedAnchor<State>, Refusal> {
      const anchorKey = key(fold, partition)
      const entry = yield* readEntry(bucket, anchorKey, "anchor.read")
      if (entry === null) return yield* anchorAbsent(anchorKey)
      const anchor = yield* parseAnchor(entry)
      const state = yield* loadState<State>(bucket, anchor.stateDigest)
      return { anchor, state, revision: entry.revision }
    },
  )

  const commit: AnchorStore["commit"] = Effect.fn("AnchorStore.commit")(
    function* (anchorKey, expectedRevision, anchor, rawState) {
      if (!Schema.is(WireValueSchema)(rawState)) {
        return yield* malformed(["state"], String(rawState), "one wire-grammar state")
      }
      const stored = yield* ensureState(bucket, rawState)
      if (stored.digest !== anchor.stateDigest) {
        return yield* malformed(
          ["anchor", "stateDigest"],
          anchor.stateDigest,
          stored.digest,
        )
      }
      const bytes = yield* canonicalBytes(anchor)
      return yield* Effect.tryPromise({
        try: () => bucket.update(anchorKey, bytes, expectedRevision),
        catch: (cause) => new KvFailure(cause),
      }).pipe(Effect.catch(({ cause }) => isCasRefusal(cause)
        ? Effect.fail(lostCas(anchorKey, expectedRevision, cause))
        : Effect.fail(transportRefusal("anchor.update", cause))))
    },
  )

  const read: AnchorStore["read"] = Effect.fn("AnchorStore.read")(function* (anchorKey) {
    const entry = yield* readEntry(bucket, anchorKey, "anchor.read")
    if (entry === null) return yield* anchorAbsent(anchorKey)
    return yield* parseAnchor(entry)
  })

  return { initialize, load, commit, read, key }
})
