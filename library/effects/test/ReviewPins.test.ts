/**
 * Executable pins for the verified host-boundary review of 0fa1bde7.
 *
 * Discipline: each pin exercises one confirmed finding's exact fault
 * scenario and asserts the CURRENT defective behavior, so the suite is
 * green while the defect stands and fails loudly the moment a fix lands —
 * the fix author flips the pin to the fixed assertion in the same change.
 * Findings resolved before this file exist as locks (they assert the
 * fixed behavior).
 *
 * Not pinned here, with reasons:
 * - CQ-2 (manufactured budget evidence in `resultError`) and CQ-3 (the
 *   three-primitive session synchronization topology) are internal shape
 *   findings with no distinct observable behavior; their behavioral
 *   consequences are pinned by findings 2 and 3.
 * - DX-2 (restartable source) is RESOLVED — the factory contract is
 *   witnessed by "a restartable upload reacquires and rechecks its source
 *   before a bounded retry" in remote/RemoteAdapter.test.ts.
 * - DX-6 (budget units in prose) is a naming finding; pin 8 covers the
 *   one place where the unlabeled number is also wrong.
 * - Finding 2's design question is answered by the model: the Lean
 *   reducer's record-mode invoke returns `delegated` with NO state change
 *   and no pending-delegation tracking (Effects/Replay/Reducer.lean,
 *   invokeRecord), so the model is silent on interleaving and the
 *   exclusivity rule must land in Lean before the runtime enforces it.
 */
import { expect, it } from "@effect/vitest"
import { expectTypeOf } from "vitest"
import {
  Channel,
  Context,
  Crypto,
  Deferred,
  Effect,
  Encoding,
  Fiber,
  Layer,
  Schema,
  Stream,
} from "effect"
import type { Scope } from "effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import { createHash, randomBytes } from "node:crypto"
import * as barrel from "../src/index.ts"
import { CasNodeInput, ContentId } from "../src/cas/Node.ts"
import {
  encodeCasNode,
  layerMemory,
  makeMemoryCasStore,
  makeSha256Address,
  CasStore,
  type CasAddress,
} from "../src/cas/Store.ts"
import { CasRemoteConfig, RemoteAuthority, restartable } from "../src/cas/Remote.ts"
import type { CasTransferShape } from "../src/cas/Transfer.ts"
import { CasBlob } from "../src/cas/Blob.ts"
import { makeRemoteAdapter } from "../src/internal/remote.ts"
import { makeRemoteHttp } from "../src/internal/remoteHttp.ts"
import { encodeCapabilityDocument } from "../src/internal/remoteControl.ts"
import type { RemoteCasTransport } from "../src/internal/remoteTransport.ts"
import type { ServiceDescriptions } from "../src/replay/Operation.ts"
import { describeService } from "../src/replay/Operation.ts"
import { layerReplay, session } from "../src/replay/Replay.ts"
import { replayable } from "../src/replay/ServiceAdapter.ts"
import { decodeWitness, StoredWitness } from "../src/internal/storage.ts"

const HistoryTag = 0x48
const WitnessTag = 0x57

class PinFail extends Schema.TaggedError<PinFail>()(
  "ReviewPins/Fail",
  { note: Schema.String },
) {}

const deterministicAddress = (): CasAddress => {
  const ids = new Map<string, ContentId>()
  let next = 1n
  return {
    digest: (bytes) => Effect.sync(() => {
      const key = Encoding.encodeHex(bytes)
      const resident = ids.get(key)
      if (resident !== undefined) return resident
      const id = ContentId.make((next++).toString(16).padStart(64, "0"))
      ids.set(key, id)
      return id
    }),
  }
}

interface SpyPut {
  readonly id: ContentId
  readonly node: CasNodeInput
}

/** A memory store whose puts are captured after commit, with optional
 * hooks before and after the underlying admission. */
const makeSpyStore = (hooks?: {
  readonly before?: (node: CasNodeInput) => Effect.Effect<void>
  readonly after?: (node: CasNodeInput, id: ContentId) => Effect.Effect<void>
}) => Effect.gen(function* () {
  const underlying = yield* makeMemoryCasStore(deterministicAddress())
  const captured: Array<SpyPut> = []
  const shape = CasStore.of({
    put: (input) => Effect.gen(function* () {
      if (hooks?.before) yield* hooks.before(input)
      const id = yield* underlying.put(input)
      captured.push({ id, node: input })
      if (hooks?.after) yield* hooks.after(input, id)
      return id
    }),
    load: underlying.load,
  })
  return { shape, captured, underlying }
})

const decodeStoredWitness = (payload: Uint8Array) =>
  Schema.decodeUnknownSync(StoredWitness)(decodeWitness(payload))

const TestCrypto = Layer.succeed(Crypto.Crypto, Crypto.make({
  randomBytes: (size) => new Uint8Array(randomBytes(size)),
  digest: (algorithm, bytes) => Effect.sync(() => {
    const name = algorithm.toLowerCase().replace("-", "")
    return new Uint8Array(createHash(name).update(bytes).digest())
  }),
}))

const pinConfig = (overrides: Partial<{
  readonly maxEncodedBytes: number
  readonly maxQueuedBytes: number
}> = {}) => new CasRemoteConfig({
  authority: RemoteAuthority.make("http://127.0.0.1:1"),
  authorityMode: "remote-authoritative",
  maxEncodedBytes: overrides.maxEncodedBytes ?? 4096,
  maxDecodedBytes: 4096,
  maxDecompressedBytes: 4096,
  maxQueuedBytes: overrides.maxQueuedBytes ?? 4096,
  maxAttempts: 1,
  operationDeadlineMs: 5_000,
  redirectPolicy: { maxRedirects: 0, crossOrigin: "deny" },
})

const capabilityBytes = () =>
  encodeCapabilityDocument({ maxBatchKeys: 4, maxBlobBytes: 4_096 })

/** A transport that serves the capability probe and refuses any other
 * wire exchange — for adapter paths that must fail before traffic. */
const probeOnlyTransport = (): RemoteCasTransport => ({
  issue: (_operationId, _attempt, request) => {
    if (request.command._tag === "ProbeCapabilities") {
      const bytes = capabilityBytes()
      return Channel.fromArray([
        { _tag: "ResponseStarted", declared: bytes.length } as const,
        { _tag: "BodyChunk", bytes } as const,
      ]).pipe(
        Channel.concatWith(() => Channel.fromEffectDone(Effect.succeed({
          receivedBytes: bytes.length,
          sentBytes: 0,
          terminalFraming: "complete" as const,
        }))),
      )
    }
    return Channel.fromEffectDone(
      Effect.die(new Error("review pin drove an unexpected wire exchange")),
    )
  },
})

/* ------------------------------------------------------------------ */
/* Replay fixtures                                                     */
/* ------------------------------------------------------------------ */

interface PairShape {
  readonly alpha: (x: string) => Effect.Effect<string, PinFail>
  readonly beta: (x: string) => Effect.Effect<string, PinFail>
}

class Pair extends Context.Service<Pair, PairShape>()(
  "test/effect-replay/ReviewPins/Pair",
) {}

const PairDescriptions = {
  alpha: {
    id: "pins/Pair/alpha",
    revision: 0,
    request: Schema.String,
    success: Schema.String,
    failure: PinFail,
    leafReplay: "substitutable",
  },
  beta: {
    id: "pins/Pair/beta",
    revision: 0,
    request: Schema.String,
    success: Schema.String,
    failure: PinFail,
    leafReplay: "substitutable",
  },
} satisfies ServiceDescriptions<PairShape>

const pairKit = replayable(Pair, PairDescriptions)

const runtimeOver = (store: Layer.Layer<CasStore>) =>
  layerReplay.pipe(Layer.provide(store))

/* ------------------------------------------------------------------ */
/* Finding 1 — the redirect guarantee is not transport-independent      */
/* ------------------------------------------------------------------ */

it.effect("pin 1: a client that silently follows a redirect passes the origin check", () =>
  Effect.scoped(Effect.gen(function* () {
    // fromWeb carries the ORIGINAL request — exactly what the fetch
    // adapter does after auto-following — so the origin comparison can
    // never observe that the content came from another origin.
    let followed = false
    const bytes = capabilityBytes()
    const client = HttpClient.make((request) => Effect.sync(() => {
      followed = true
      return HttpClientResponse.fromWeb(
        request,
        new Response(Buffer.from(bytes), {
          status: 200,
          headers: {
            "content-type": "application/octet-stream",
            "content-length": String(bytes.length),
          },
        }),
      )
    }))
    const remoteConfig = pinConfig()
    const transport = yield* makeRemoteHttp(remoteConfig).pipe(
      Effect.provideService(HttpClient.HttpClient, client),
    )
    const address = yield* makeSha256Address
    // Pinned defect: the adapter acquires cleanly — the followed
    // redirect is invisible. Fixed behavior: the transport exposes the
    // final response origin (or refuses unenforceable clients) and this
    // acquisition fails with the redirect policy outcome.
    const adapter = yield* makeRemoteAdapter(remoteConfig, transport, address)
    expect(followed).toBe(true)
    expect(adapter).toBeDefined()
  }).pipe(Effect.provide(TestCrypto))))

/* ------------------------------------------------------------------ */
/* Finding 2 — concurrent record has completion-order semantics         */
/* ------------------------------------------------------------------ */

it.effect("pin 2: concurrent recording orders history by completion, so program-order replay rejects", () =>
  Effect.gen(function* () {
    const alphaGate = yield* Deferred.make<void>()
    let historyCommits = 0
    const spy = yield* makeSpyStore({
      after: (node) => Effect.suspend(() => {
        if (node.kind.tag !== HistoryTag) return Effect.void
        historyCommits += 1
        // beta's occurrence is durably committed before alpha may even
        // resume, so history order is completion order by construction.
        return historyCommits === 1
          ? Deferred.succeed(alphaGate, undefined).pipe(Effect.asVoid)
          : Effect.void
      }),
    })
    const runtime = runtimeOver(Layer.succeed(CasStore, spy.shape))
    const live = Pair.of({
      alpha: (x) => Deferred.await(alphaGate).pipe(Effect.as(`A:${x}`)),
      beta: (x) => Effect.succeed(`B:${x}`),
    })
    // alpha is invoked first but completes last: history records [beta,
    // alpha] — completion order, not invocation order.
    const concurrent = Pair.use((pair) =>
      Effect.all([pair.alpha("x"), pair.beta("y")], { concurrency: 2 }))
    const recorded = yield* session(
      concurrent.pipe(
        Effect.provide(pairKit.record),
        Effect.provideService(pairKit.live, live),
      ),
      { mode: "record" },
    ).pipe(Effect.provide(runtime))
    expect(recorded.outcome._tag).toBe("Completed")
    if (recorded.history === undefined) {
      return yield* Effect.die("concurrent recording returned no history")
    }
    // The same two operations invoked in program order now replay
    // against a completion-ordered history and reject at position zero.
    // Fixed behavior (post-ruling): interleaved record-mode invocation
    // is rejected up front, or history carries event identity/causality.
    const sequential = Pair.use((pair) =>
      Effect.gen(function* () {
        const a = yield* pair.alpha("x")
        const b = yield* pair.beta("y")
        return [a, b] as const
      }))
    const replayed = yield* session(
      sequential.pipe(Effect.provide(pairKit.replay)),
      { mode: "replay", history: recorded.history },
    ).pipe(Effect.provide(runtime))
    expect(replayed.outcome).toMatchObject({
      _tag: "Rejected",
      category: "OperationMismatch",
      at: 0,
    })
  }))

/* ------------------------------------------------------------------ */
/* Finding 3 — interruption between CAS commit and state publication    */
/* ------------------------------------------------------------------ */

it.effect("pin 3: interruption after the history put commits a node the aborted witness never reports", () =>
  Effect.gen(function* () {
    const reachedWindow = yield* Deferred.make<void>()
    const holdWindow = yield* Deferred.make<void>()
    let historyPuts = 0
    const spy = yield* makeSpyStore({
      after: (node) => Effect.gen(function* () {
        if (node.kind.tag !== HistoryTag) return
        historyPuts += 1
        if (historyPuts === 2) {
          // The second history node is committed; hold the fiber inside
          // the window before Ref.set publishes it into session state.
          yield* Deferred.succeed(reachedWindow, undefined)
          yield* Deferred.await(holdWindow)
        }
      }),
    })
    const live = Pair.of({
      alpha: (x) => Effect.succeed(`A:${x}`),
      beta: (x) => Effect.succeed(`B:${x}`),
    })
    const program = Pair.use((pair) =>
      Effect.gen(function* () {
        yield* pair.alpha("one")
        yield* pair.beta("two")
      }))
    const fiber = yield* session(
      program.pipe(
        Effect.provide(pairKit.record),
        Effect.provideService(pairKit.live, live),
      ),
      { mode: "record" },
    ).pipe(
      Effect.provide(runtimeOver(Layer.succeed(CasStore, spy.shape))),
      Effect.forkChild,
    )
    yield* Deferred.await(reachedWindow)
    yield* Fiber.interrupt(fiber)

    const historyIds = spy.captured
      .filter((p) => p.node.kind.tag === HistoryTag)
      .map((p) => p.id)
    expect(historyIds).toHaveLength(2)
    const first = historyIds[0]
    const second = historyIds[1]
    if (first === undefined || second === undefined) {
      return yield* Effect.die("expected two committed history nodes")
    }
    // The second node IS committed in the store...
    const committed = yield* spy.underlying.load(second)
    expect(committed.kind.tag).toBe(HistoryTag)
    // ...but the aborted witness reports the STALE root: publication
    // never ran. Fixed behavior: commit plus publication is one masked
    // critical section, and the witness reports the committed root.
    const witness = spy.captured.find((p) => p.node.kind.tag === WitnessTag)
    if (witness === undefined) {
      return yield* Effect.die("expected a persisted aborted witness")
    }
    const stored = decodeStoredWitness(witness.node.payload)
    expect(stored.outcome).toEqual({ _tag: "Aborted", reason: "Interrupted" })
    expect(stored.historyRoot).toBe(first)
    expect(stored.historyRoot).not.toBe(second)
  }))

/* ------------------------------------------------------------------ */
/* Finding 4 — generic terminals die in the plain-object codec          */
/* ------------------------------------------------------------------ */

it.effect("pin 4: a session whose terminal value has a non-plain prototype fails at witness persistence", () => {
  const store = layerMemory(deterministicAddress())
  return Effect.gen(function* () {
    // The program itself succeeds; persisting its terminal does not.
    // Fixed behavior: explicit terminal codecs or a projected terminal
    // representation persist this witness.
    const error = yield* session(
      Effect.succeed(new Date(0)),
      { mode: "record" },
    ).pipe(Effect.flip)
    expect(error).toMatchObject({
      _tag: "CasError/StoreFailure",
      reason: expect.stringContaining("Witness terminal encoding failed"),
    })
  }).pipe(Effect.provide(runtimeOver(store)))
})

/* ------------------------------------------------------------------ */
/* Finding 5 — aborted witnesses are unreachable; the mask is unbounded */
/* ------------------------------------------------------------------ */

it.effect("pin 5a: the aborted witness is persisted but its receipt is discarded", () =>
  Effect.gen(function* () {
    const spy = yield* makeSpyStore()
    const defect = new Error("pin-defect")
    const caught = yield* session(Effect.die(defect), { mode: "record" }).pipe(
      Effect.catchDefect((d) => Effect.succeed(d)),
      Effect.provide(runtimeOver(Layer.succeed(CasStore, spy.shape))),
    )
    // The witness node exists in the store...
    const witness = spy.captured.find((p) => p.node.kind.tag === WitnessTag)
    if (witness === undefined) {
      return yield* Effect.die("expected a persisted aborted witness")
    }
    const stored = decodeStoredWitness(witness.node.payload)
    expect(stored.outcome).toEqual({ _tag: "Aborted", reason: "Defect" })
    // ...but the emitted channel re-raises the original defect with no
    // receipt: the ContentId is unreachable outside a spying store.
    // Fixed behavior: a receipt sink/callback or cause-visible receipt.
    expect(caught).toBe(defect)
    expect(String(caught)).not.toContain(witness.id)
  }))

it.effect("pin 5b: a hanging store makes session cancellation uninterruptible without bound", () =>
  Effect.gen(function* () {
    const witnessStarted = yield* Deferred.make<void>()
    const releaseStore = yield* Deferred.make<void>()
    const spy = yield* makeSpyStore({
      before: (node) => node.kind.tag === WitnessTag
        ? Deferred.succeed(witnessStarted, undefined).pipe(
            Effect.andThen(Deferred.await(releaseStore)),
          )
        : Effect.void,
    })
    const fiber = yield* session(
      Effect.die(new Error("pin-hang")),
      { mode: "record" },
    ).pipe(
      Effect.provide(runtimeOver(Layer.succeed(CasStore, spy.shape))),
      Effect.forkChild,
    )
    yield* Deferred.await(witnessStarted)
    let interruptSettled = false
    const interruptor = yield* Fiber.interrupt(fiber).pipe(
      Effect.tap(() => Effect.sync(() => {
        interruptSettled = true
      })),
      Effect.forkChild,
    )
    for (let i = 0; i < 200; i += 1) yield* Effect.yieldNow
    // Pinned defect: cancellation is stuck behind the unbounded
    // uninterruptible witness write. Fixed behavior: the masked store
    // operation is bounded, so interruption settles without the store's
    // cooperation.
    expect(interruptSettled).toBe(false)
    yield* Deferred.succeed(releaseStore, undefined)
    yield* Fiber.join(interruptor)
    expect(interruptSettled).toBe(true)
  }))

/* ------------------------------------------------------------------ */
/* Finding 6 — nested cancellation is misclassified                     */
/* ------------------------------------------------------------------ */

it.effect("pin 6: an AbortError nested under a TypeError classifies as connectionFailed", () =>
  Effect.scoped(Effect.gen(function* () {
    const remoteConfig = pinConfig()
    const client = HttpClient.make((request) => Effect.fail(
      new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({
          request,
          cause: Object.assign(new TypeError("fetch failed"), {
            cause: Object.assign(new Error("the operation was aborted"), {
              name: "AbortError",
            }),
          }),
        }),
      }),
    ))
    const transport = yield* makeRemoteHttp(remoteConfig).pipe(
      Effect.provideService(HttpClient.HttpClient, client),
    )
    const address = yield* makeSha256Address
    const error = yield* makeRemoteAdapter(remoteConfig, transport, address).pipe(
      Effect.flip,
    )
    // Pinned defect: the outer TypeError's name masks the inner
    // AbortError. Fixed behavior: every inspected level is searched for
    // recognized codes and names, and this classifies as "cancelled".
    expect(error).toMatchObject({
      _tag: "CasRemoteError/Unavailable",
      code: "connectionFailed",
    })
  }).pipe(Effect.provide(TestCrypto))))

/* ------------------------------------------------------------------ */
/* Finding 7 — 204 bypasses the content-encoding guard                  */
/* ------------------------------------------------------------------ */

it.effect("pin 7: a 204 acknowledgement with a hostile content-encoding is accepted", () =>
  Effect.scoped(Effect.gen(function* () {
    const bytes = capabilityBytes()
    const client = HttpClient.make((request) => Effect.sync(() => {
      if (request.url.includes("/control/capabilities")) {
        return HttpClientResponse.fromWeb(
          request,
          new Response(Buffer.from(bytes), {
            status: 200,
            headers: {
              "content-type": "application/octet-stream",
              "content-length": String(bytes.length),
            },
          }),
        )
      }
      return HttpClientResponse.fromWeb(
        request,
        new Response(null, {
          status: 204,
          headers: { "content-encoding": "gzip" },
        }),
      )
    }))
    const remoteConfig = pinConfig()
    const transport = yield* makeRemoteHttp(remoteConfig).pipe(
      Effect.provideService(HttpClient.HttpClient, client),
    )
    const address = yield* makeSha256Address
    const adapter = yield* makeRemoteAdapter(remoteConfig, transport, address)
    const uploaded = CasNodeInput.make({
      kind: { version: 0, tag: 3 },
      payload: Uint8Array.from([9, 9, 9]),
      refs: [],
    })
    // Pinned defect: the upload succeeds — 204 returns Ok directly and
    // never reaches the header validation 200/201 run through. Fixed
    // behavior: the hostile encoding is an invalidHeaders protocol
    // outcome on every acknowledgement status.
    const id = yield* adapter.store.put(uploaded)
    const digest = ContentId.make(
      createHash("sha256").update(encodeCasNode(uploaded)).digest("hex"),
    )
    expect(id).toBe(digest)
  }).pipe(Effect.provide(TestCrypto))))

/* ------------------------------------------------------------------ */
/* Finding 8 — raw payload length labeled as encoded-node evidence      */
/* ------------------------------------------------------------------ */

it.effect("pin 8: putStream reports raw payload length as encoded-stage evidence", () =>
  Effect.gen(function* () {
    const remoteConfig = pinConfig({ maxEncodedBytes: 8, maxQueuedBytes: 4096 })
    const address = yield* makeSha256Address
    const adapter = yield* makeRemoteAdapter(
      remoteConfig,
      probeOnlyTransport(),
      address,
    )
    const payload = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const kind = { version: 0, tag: 5 }
    const error = yield* adapter.transfer.putStream(
      restartable(() => Stream.succeed(payload)),
      { kind, refs: [] },
    ).pipe(Effect.flip)
    const trueEncoded = encodeCasNode(CasNodeInput.make({
      kind,
      payload,
      refs: [],
    })).length
    expect(trueEncoded).toBeGreaterThan(payload.length)
    // Pinned defect: the "encoded" stage reports the accumulated raw
    // payload (11), not the canonical encoded-node size. Fixed behavior:
    // the machine evaluates the fully encoded node, so observed is the
    // canonical size.
    expect(error).toMatchObject({
      _tag: "CasRemoteError/Budget",
      stage: "encoded",
      observed: payload.length,
      bound: 8,
    })
  }).pipe(Effect.provide(TestCrypto)))

/* ------------------------------------------------------------------ */
/* CQ-1 — witness envelope consistency across both persistence paths    */
/* ------------------------------------------------------------------ */

it.effect("lock CQ-1: completed and aborted witnesses share one envelope discipline", () =>
  Effect.gen(function* () {
    const spy = yield* makeSpyStore()
    const live = Pair.of({
      alpha: (x) => Effect.succeed(`A:${x}`),
      beta: () => Effect.die(new Error("pin-abort")),
    })
    const runtime = runtimeOver(Layer.succeed(CasStore, spy.shape))
    yield* session(
      Pair.use((pair) => pair.alpha("ok")).pipe(
        Effect.provide(pairKit.record),
        Effect.provideService(pairKit.live, live),
      ),
      { mode: "record" },
    ).pipe(Effect.provide(runtime))
    yield* session(
      Pair.use((pair) => pair.alpha("ok").pipe(
        Effect.andThen(pair.beta("boom")),
      )).pipe(
        Effect.provide(pairKit.record),
        Effect.provideService(pairKit.live, live),
      ),
      { mode: "record" },
    ).pipe(
      Effect.catchDefect(() => Effect.void),
      Effect.provide(runtime),
    )
    const witnesses = spy.captured.filter((p) => p.node.kind.tag === WitnessTag)
    expect(witnesses).toHaveLength(2)
    for (const w of witnesses) {
      expect(w.node.kind.version).toBe(0)
      expect(w.node.refs).toHaveLength(1)
      expect(w.node.refs[0]?.expectedTag).toBe(HistoryTag)
      const stored = decodeStoredWitness(w.node.payload)
      expect(stored.historyRoot).toBe(w.node.refs[0]?.id)
    }
  }))

/* ------------------------------------------------------------------ */
/* DX pins                                                              */
/* ------------------------------------------------------------------ */

interface DupShape {
  readonly ping: (x: string) => Effect.Effect<number, PinFail>
}

class Dup extends Context.Service<Dup, DupShape>()(
  "test/effect-replay/ReviewPins/Dup",
) {}

it("pin DX-1: kit memoization silently ignores a conflicting registration", () => {
  const descA = {
    ping: {
      id: "pins/Dup/ping",
      revision: 1,
      request: Schema.String,
      success: Schema.Number,
      failure: PinFail,
      leafReplay: "substitutable",
    },
  } satisfies ServiceDescriptions<DupShape>
  const descB = {
    ping: {
      id: "pins/Dup/ping",
      revision: 2,
      request: Schema.String,
      success: Schema.Number,
      failure: PinFail,
      leafReplay: "substitutable",
    },
  } satisfies ServiceDescriptions<DupShape>
  const first = replayable(Dup, descA)
  const second = replayable(Dup, descB)
  // Pinned defect: the second registration hands back the first kit and
  // its schemas without a word. Fixed behavior: a conflicting
  // registration is rejected at construction.
  expect(second).toBe(first)
})

it("pin DX-3: loadStream declares a phantom Scope requirement", () => {
  type LoadStreamEffect = ReturnType<CasTransferShape["loadStream"]>
  type ContextOf<T> = T extends Effect.Effect<infer _A, infer _E, infer R>
    ? R
    : never
  // Pinned shape: the double-effect signature requires Scope even though
  // acquisition is internal. Fixed behavior: the requirement disappears
  // (this type equality fails) when the deep module hides its scope.
  expectTypeOf<ContextOf<LoadStreamEffect>>().toEqualTypeOf<Scope.Scope>()
})

it.effect("pin DX-4: blob get plans the manifest twice", () =>
  Effect.gen(function* () {
    const underlying = yield* makeMemoryCasStore(deterministicAddress())
    const loads = new Map<ContentId, number>()
    const counting = CasStore.of({
      put: underlying.put,
      load: (id) => Effect.suspend(() => {
        loads.set(id, (loads.get(id) ?? 0) + 1)
        return underlying.load(id)
      }),
    })
    const blobLayer = CasBlob.layer.pipe(
      Layer.provide(Layer.succeed(CasStore, counting)),
    )
    yield* Effect.gen(function* () {
      const ref = yield* CasBlob.put(Stream.succeed(Uint8Array.from([1, 2, 3])))
      loads.clear()
      const bytes = yield* CasBlob.get(ref)
      expect(Array.from(bytes)).toEqual([1, 2, 3])
      // Pinned defect: get = inspect + stream, and each resolves the
      // manifest independently. Fixed behavior: one resolved read plan
      // is shared, and the manifest loads once.
      expect(loads.get(ContentId.make(ref))).toBe(2)
    }).pipe(Effect.provide(blobLayer))
  }))

it("pin DX-5: describeService accepts degenerate prefixes and revisions unvalidated", () => {
  const empty = describeService<DupShape>("")({
    ping: {
      revision: 0,
      request: Schema.String,
      success: Schema.Number,
      failure: PinFail,
    },
  })
  const fractional = describeService<DupShape>("pins/frac")({
    ping: {
      revision: 1.5,
      request: Schema.String,
      success: Schema.Number,
      failure: PinFail,
    },
  })
  // Pinned defect: an empty prefix yields a degenerate id and a
  // fractional revision passes through. Fixed behavior: construction
  // rejects both immediately.
  expect(empty.ping.id).toBe("/ping")
  expect(fractional.ping.revision).toBe(1.5)
})

it("lock DX-7: the barrel is exactly the two plane doors", () => {
  expect(Object.keys(barrel).sort()).toEqual(["Cas", "Replay"])
  expect("value" in barrel.Cas).toBe(true)
  expect("restartable" in barrel.Cas).toBe(true)
  expect("reduce" in barrel.Replay).toBe(true)
  expect("replayable" in barrel.Replay).toBe(true)
  // The reducer clause helpers stay module-internal.
  expect("absorb" in barrel.Replay).toBe(false)
  expect("invokeRecord" in barrel.Replay).toBe(false)
})
