import { expect, it } from "@effect/vitest"
import {
  Crypto,
  Effect,
  Fiber,
  Layer,
  Stream,
} from "effect"
import { TestClock } from "effect/testing"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import { createHash, randomBytes } from "node:crypto"
import * as Cas from "../../src/Cas.ts"
import {
  CasNodeInput,
  CasStore,
  ContentId,
  RemoteFailure,
} from "../../src/index.ts"
import {
  CasRemoteConfig,
  RemoteAuthority,
} from "../../src/cas/Remote.ts"
import { encodeCasNode, makeSha256Address } from "../../src/cas/Store.ts"
import { CasTransfer } from "../../src/cas/Transfer.ts"
import { makeRemoteAdapter } from "../../src/internal/remote.ts"
import { makeRemoteHttp } from "../../src/internal/remoteHttp.ts"
import { initialMachineState, run } from "../../src/internal/remoteMachine.ts"
import { HostilePeer, type HostileFault } from "./harness/HostilePeer.ts"
import { ReferencePeer } from "./harness/ReferencePeer.ts"

const digest = (bytes: Uint8Array): ContentId =>
  ContentId.make(createHash("sha256").update(bytes).digest("hex"))

const TestCrypto = Layer.succeed(Crypto.Crypto, Crypto.make({
  randomBytes: (size) => new Uint8Array(randomBytes(size)),
  digest: (algorithm, bytes) => Effect.sync(() => {
    const name = algorithm.toLowerCase().replace("-", "")
    return new Uint8Array(createHash(name).update(bytes).digest())
  }),
}))

const HttpRuntime = Layer.mergeAll(
  FetchHttpClient.layer,
  Layer.succeed(FetchHttpClient.RequestInit, { redirect: "manual" }),
  TestCrypto,
)

const config = (
  authority: string,
  overrides: Partial<{
    readonly maxEncodedBytes: number
    readonly maxDecodedBytes: number
    readonly maxDecompressedBytes: number
    readonly maxQueuedBytes: number
    readonly maxAttempts: number
    readonly operationDeadlineMs: number
  }> = {},
) => new CasRemoteConfig({
  authority: RemoteAuthority.make(authority),
  authorityMode: "remote-authoritative",
  maxEncodedBytes: overrides.maxEncodedBytes ?? 4096,
  maxDecodedBytes: overrides.maxDecodedBytes ?? 4096,
  maxDecompressedBytes: overrides.maxDecompressedBytes ?? 4096,
  maxQueuedBytes: overrides.maxQueuedBytes ?? 4096,
  maxAttempts: overrides.maxAttempts ?? 1,
  operationDeadlineMs: overrides.operationDeadlineMs ?? 5_000,
  redirectPolicy: { maxRedirects: 0, crossOrigin: "deny" },
})

const node = (payload: ReadonlyArray<number>, tag = 3) => CasNodeInput.make({
  kind: { version: 0, tag },
  payload: Uint8Array.from(payload),
  refs: [],
})

const remoteLayer = (remoteConfig: CasRemoteConfig) =>
  Cas.layerRemote(remoteConfig).pipe(Layer.provideMerge(HttpRuntime))

it.effect("reference cas-http/0 shares admission state across CasStore and CasTransfer", () =>
  Effect.scoped(Effect.gen(function* () {
    const resident = node([1, 2, 3, 4])
    const residentBytes = encodeCasNode(resident)
    const residentId = digest(residentBytes)
    const endpoint = yield* ReferencePeer.serve({
      nodes: new Map([[residentId, residentBytes]]),
    })

    yield* Effect.gen(function* () {
      const store = yield* CasStore
      const transfer = yield* CasTransfer

      const loaded = yield* store.load(residentId)
      expect(Array.from(loaded.payload)).toEqual([1, 2, 3, 4])

      const streamed = yield* transfer.loadStream(residentId)
      const chunks = yield* Stream.runCollect(streamed)
      expect(chunks).toHaveLength(1)
      expect(Array.from(chunks[0] ?? [])).toEqual(Array.from(residentBytes))

      const uploaded = node([9, 8, 7], 4)
      const first = yield* store.put(uploaded)
      const second = yield* store.put(uploaded)
      expect(second).toBe(first)
      expect(endpoint.observe().puts).toBe(1)

      const projected = yield* transfer.putStream(
        Cas.Transfer.replayable(Stream.make(Uint8Array.from([5, 4]), Uint8Array.from([3]))),
        { kind: { version: 0, tag: 5 }, refs: [] },
      )
      expect(projected).toMatch(/^[0-9a-f]{64}$/)
      expect(endpoint.observe().puts).toBe(2)
    }).pipe(Effect.provide(remoteLayer(config(endpoint.authority))))
  })))

it.effect("RMT-002 rejects a declared oversize before any response body is read or admitted", () =>
  Effect.scoped(Effect.gen(function* () {
    const bytes = encodeCasNode(node([1, 2, 3]))
    const id = digest(bytes)
    const endpoint = yield* HostilePeer.serve({
      fault: "declaredOversize",
      body: bytes,
      declared: 512,
    })

    yield* Effect.gen(function* () {
      const store = yield* CasStore
      const first = yield* store.load(id).pipe(Effect.flip)
      expect(first).toBeInstanceOf(RemoteFailure)
      if (first._tag === "CasError/RemoteFailure") {
        expect(first.cause).toMatchObject({
          _tag: "CasRemoteError/Budget",
          stage: "decoded",
          observed: 512,
          bound: 32,
        })
      }
      expect(endpoint.observe().bodyBytesWritten).toBe(0)

      yield* store.load(id).pipe(Effect.flip)
      expect(endpoint.observe().gets).toBe(2)
    }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, {
      maxDecodedBytes: 32,
      maxQueuedBytes: 32,
    }))))
  })))

it.effect("RMT-002 cuts off a chunked body at the decoded-byte bound without admitting it", () =>
  Effect.gen(function* () {
    let observe: (() => { readonly gets: number; readonly openSockets: number }) | undefined
    yield* Effect.scoped(Effect.gen(function* () {
      const bytes = encodeCasNode(node(Array.from({ length: 48 }, (_, index) => index)))
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "chunkedOversize", body: bytes })
      observe = endpoint.observe

      yield* Effect.gen(function* () {
        const store = yield* CasStore
        const first = yield* store.load(id).pipe(Effect.flip)
        expect(first._tag).toBe("CasError/RemoteFailure")
        if (first._tag === "CasError/RemoteFailure") {
          expect(first.cause).toMatchObject({
            _tag: "CasRemoteError/Budget",
            stage: "decoded",
            observed: 25,
            bound: 24,
          })
        }

        yield* store.load(id).pipe(Effect.flip)
        expect(endpoint.observe().gets).toBe(2)
      }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, {
        maxDecodedBytes: 24,
      }))))
    }))
    expect(observe?.().openSockets).toBe(0)
  }))

it.effect("RMT-002 enforces the queued-byte bound on the consumer side without admitting", () =>
  Effect.scoped(Effect.gen(function* () {
    const bytes = encodeCasNode(node([1, 3, 3, 7]))
    const endpoint = yield* HostilePeer.serve({ fault: "complete", body: bytes })
    yield* CasStore.use((store) => Effect.gen(function* () {
      const error = yield* store.load(digest(bytes)).pipe(Effect.flip)
      expect(error._tag).toBe("CasError/RemoteFailure")
      if (error._tag === "CasError/RemoteFailure") {
        expect(error.cause).toMatchObject({
          _tag: "CasRemoteError/Budget",
          stage: "queued",
          observed: 2,
          bound: 1,
        })
      }

      yield* store.load(digest(bytes)).pipe(Effect.flip)
      expect(endpoint.observe().gets).toBe(2)
    })).pipe(
      Effect.provide(remoteLayer(config(endpoint.authority, { maxQueuedBytes: 1 }))),
    )
  })))

it.effect("the decompressed-byte budget is enforced independently of decoded bytes", () =>
  Effect.scoped(Effect.gen(function* () {
    const bytes = encodeCasNode(node([2, 7, 1, 8]))
    const endpoint = yield* HostilePeer.serve({ fault: "complete", body: bytes })
    const error = yield* CasStore.use((store) => store.load(digest(bytes))).pipe(
      Effect.flip,
      Effect.provide(remoteLayer(config(endpoint.authority, {
        maxDecodedBytes: 4096,
        maxDecompressedBytes: 1,
      }))),
    )
    expect(error._tag).toBe("CasError/RemoteFailure")
    if (error._tag === "CasError/RemoteFailure") {
      expect(error.cause).toMatchObject({
        _tag: "CasRemoteError/Budget",
        stage: "decompressed",
        observed: 2,
        bound: 1,
      })
    }
  })))

it.effect("hostile cas-http/0 admits a complete content-length response and reuses it locally", () =>
  Effect.gen(function* () {
    let observe: (() => { readonly gets: number; readonly openSockets: number }) | undefined
    yield* Effect.scoped(Effect.gen(function* () {
      const bytes = encodeCasNode(node([6, 2, 6]))
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "complete", body: bytes })
      observe = endpoint.observe

      yield* CasStore.use((store) => Effect.gen(function* () {
        yield* store.load(id)
        yield* store.load(id)
      })).pipe(Effect.provide(remoteLayer(config(endpoint.authority))))
      expect(endpoint.observe().gets).toBe(1)
    }))
    expect(observe?.().openSockets).toBe(0)
  }))

const hostileCases: ReadonlyArray<readonly [HostileFault, string]> = [
  ["truncated", "CasRemoteError/Protocol"],
  ["contentLengthLarger", "CasRemoteError/Protocol"],
  ["underreportedOversize", "CasRemoteError/Integrity"],
  ["wrongBytes", "CasRemoteError/Integrity"],
  ["resetMidBody", "CasRemoteError/Protocol"],
]

for (const [fault, expectedTag] of hostileCases) {
  it.effect(`hostile cas-http/0 ${fault} fails typed, admits nothing, and closes its scope`, () =>
    Effect.gen(function* () {
      let observe: (() => { readonly openSockets: number }) | undefined
      yield* Effect.scoped(Effect.gen(function* () {
        const bytes = encodeCasNode(node([7, 7, 7, 7]))
        const id = digest(bytes)
        const endpoint = yield* HostilePeer.serve({ fault, body: bytes })
        observe = endpoint.observe

        yield* Effect.gen(function* () {
          const store = yield* CasStore
          const first = yield* store.load(id).pipe(Effect.flip)
          expect(first._tag).toBe("CasError/RemoteFailure")
          if (first._tag === "CasError/RemoteFailure") {
            expect(first.cause._tag).toBe(expectedTag)
            if ("completion" in first.cause) {
              expect(first.cause.completion).toBe("possiblyProcessed")
            }
          }

          yield* store.load(id).pipe(Effect.flip)
          expect(endpoint.observe().gets).toBe(2)
        }).pipe(Effect.provide(remoteLayer(config(endpoint.authority))))
      }))
      expect(observe?.().openSockets).toBe(0)
    }))
}

it.effect("hostile cas-http/0 maps 404 to ContentNotFound without remote fallback", () =>
  Effect.scoped(Effect.gen(function* () {
    const bytes = encodeCasNode(node([2]))
    const endpoint = yield* HostilePeer.serve({ fault: "notFound", body: bytes })
    const error = yield* CasStore.use((store) => store.load(digest(bytes))).pipe(
      Effect.flip,
      Effect.provide(remoteLayer(config(endpoint.authority))),
    )
    expect(error._tag).toBe("CasError/ContentNotFound")
    expect(endpoint.observe().gets).toBe(1)
  })))

it.effect("a mid-download deadline surfaces typed completion evidence and closes its operation scope", () =>
  Effect.gen(function* () {
    let observe: (() => { readonly openSockets: number; readonly gets: number }) | undefined
    yield* Effect.scoped(Effect.gen(function* () {
      const bytes = encodeCasNode(node([4, 4, 4, 4]))
      const endpoint = yield* HostilePeer.serve({ fault: "cancellationMidDownload", body: bytes })
      observe = endpoint.observe
      const layer = remoteLayer(config(endpoint.authority))
      yield* CasStore.use((store) => Effect.gen(function* () {
        const first = yield* store.load(digest(bytes)).pipe(Effect.flip, Effect.forkScoped)
        while (endpoint.observe().gets === 0) yield* Effect.yieldNow
        yield* TestClock.adjust(5_001)
        const error = yield* Fiber.join(first)
        expect(error._tag).toBe("CasError/RemoteFailure")
        if (error._tag === "CasError/RemoteFailure") {
          expect(error.cause).toMatchObject({
            _tag: "CasRemoteError/Unavailable",
            code: "timeout",
            completion: "possiblyProcessed",
          })
        }

        const second = yield* store.load(digest(bytes)).pipe(Effect.flip, Effect.forkScoped)
        while (endpoint.observe().gets < 2) yield* Effect.yieldNow
        yield* TestClock.adjust(5_001)
        yield* Fiber.join(second)
        expect(endpoint.observe().gets).toBe(2)
      })).pipe(Effect.provide(layer))
    }))
    expect(observe?.().openSockets).toBe(0)
  }))

it.effect("a one-shot upload reset is never retried and carries indeterminate completion evidence", () =>
  Effect.gen(function* () {
    let observe: (() => { readonly puts: number; readonly gets: number; readonly openSockets: number }) | undefined
    yield* Effect.scoped(Effect.gen(function* () {
      const uploaded = node([9, 9, 1], 7)
      const bytes = encodeCasNode(uploaded)
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "cancellationMidUpload", body: bytes })
      observe = endpoint.observe

      yield* Effect.gen(function* () {
        const transfer = yield* CasTransfer
        const store = yield* CasStore
        const error = yield* transfer.putStream(
          Cas.Transfer.oneShot(Stream.succeed(uploaded.payload)),
          { kind: uploaded.kind, refs: [], expected: id },
        ).pipe(Effect.flip)
        expect(error._tag).toBe("CasRemoteError/Unavailable")
        if (error._tag === "CasRemoteError/Unavailable") {
          expect(error.completion).toBe("possiblyProcessed")
        }
        expect(endpoint.observe().puts).toBe(1)

        yield* store.load(id)
        expect(endpoint.observe().gets).toBe(1)
      }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, { maxAttempts: 3 }))))
    }))
    expect(observe?.().openSockets).toBe(0)
  }))

it.effect("a replayable upload reconsumes and rechecks its source before a bounded retry", () =>
  Effect.gen(function* () {
    let observe: (() => { readonly puts: number; readonly openSockets: number }) | undefined
    yield* Effect.scoped(Effect.gen(function* () {
      const uploaded = node([3, 1, 4], 8)
      const bytes = encodeCasNode(uploaded)
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "cancellationMidUpload", body: bytes })
      observe = endpoint.observe
      let sourceRuns = 0
      const source = Stream.fromEffect(Effect.sync(() => {
        sourceRuns += 1
        return uploaded.payload
      }))

      yield* Effect.gen(function* () {
        const transfer = yield* CasTransfer
        const store = yield* CasStore
        const admitted = yield* transfer.putStream(
          Cas.Transfer.replayable(source),
          { kind: uploaded.kind, refs: [], expected: id },
        )
        expect(admitted).toBe(id)
        expect(sourceRuns).toBe(2)
        expect(endpoint.observe().puts).toBe(2)

        yield* store.load(id)
        expect(endpoint.observe().puts).toBe(2)
      }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, { maxAttempts: 2 }))))
    }))
    expect(observe?.().openSockets).toBe(0)
  }))

it.effect("the adapter and pure mirror agree on normalized load decisions", () =>
  Effect.scoped(Effect.gen(function* () {
    const resident = node([8, 6, 7, 5, 3, 0, 9])
    const bytes = encodeCasNode(resident)
    const id = digest(bytes)
    const endpoint = yield* ReferencePeer.serve({ nodes: new Map([[id, bytes]]) })
    const remoteConfig = config(endpoint.authority)

    const observed = yield* Effect.gen(function* () {
      const transport = yield* makeRemoteHttp(remoteConfig)
      const address = yield* makeSha256Address
      const adapter = yield* makeRemoteAdapter(remoteConfig, transport, address)
      yield* adapter.store.load(id)
      return yield* adapter.snapshot
    }).pipe(Effect.provide(HttpRuntime))

    const expected = run({
      budgets: { maxBytes: remoteConfig.maxDecodedBytes, maxKeys: 1 },
      size: (value: Uint8Array) => value.length,
      verify: (key: ContentId, value: Uint8Array) => digest(value) === key,
    }, initialMachineState<ContentId, Uint8Array>(), [
      { _tag: "Request", id: 1, op: { _tag: "Load", key: id } },
      { _tag: "FromWire", id: 1, event: { _tag: "Ok", declared: bytes.length, bytes } },
    ])

    expect(observed.decisions).toEqual(expected.decisions)
  })))
