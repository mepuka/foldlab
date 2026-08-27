import { expect, it, layer } from "@effect/vitest"
import {
  Channel,
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
import { makeRemoteAdapter, type RemoteAdapter } from "../../src/internal/remote.ts"
import { makeRemoteHttp } from "../../src/internal/remoteHttp.ts"
import {
  initialMachineState,
  step,
  type MInput,
  type TaggedDecision,
} from "../../src/internal/remoteMachine.ts"
import type {
  CompletionWitness,
  RemoteCasTransport,
  RemoteWireEvent,
} from "../../src/internal/remoteTransport.ts"
import { HostilePeer, type HostileFault } from "./harness/HostilePeer.ts"
import { ReferencePeer } from "./harness/ReferencePeer.ts"
import { serveGatedPeer } from "./harness/GatedPeer.ts"
import { awaitPeerSocketsReleased } from "./harness/ConformancePeer.ts"
import {
  remoteStepLayer,
  type RemoteBytes,
  type RemoteKey,
  RemoteStepSUT,
} from "../conformance/harness.ts"

const digest = (bytes: Uint8Array): ContentId =>
  ContentId.make(createHash("sha256").update(bytes).digest("hex"))

const keyBytes = (id: ContentId): RemoteKey => Array.from(Buffer.from(id, "hex"))

const normalizeInput = (
  input: MInput<ContentId, Uint8Array>,
): MInput<RemoteKey, RemoteBytes> => {
  if (input._tag === "Request") {
    return input.op._tag === "Load"
      ? { _tag: "Request", id: input.id, op: { _tag: "Load", key: keyBytes(input.op.key) } }
      : {
        _tag: "Request",
        id: input.id,
        op: {
          _tag: "Upload",
          key: keyBytes(input.op.key),
          bytes: Array.from(input.op.bytes),
        },
      }
  }
  if (input.event._tag === "Ok") {
    return {
      _tag: "FromWire",
      id: input.id,
      event: {
        _tag: "Ok",
        declared: input.event.declared,
        bytes: Array.from(input.event.bytes),
      },
    }
  }
  if (input.event._tag === "IntegrityMismatch") {
    return { _tag: "FromWire", id: input.id, event: { _tag: "IntegrityMismatch" } }
  }
  throw new Error(`differential scenario contains unsupported event ${input.event._tag}`)
}

const normalizeDecision = (
  tagged: import("../../src/internal/remoteMachine.ts").TaggedDecision<ContentId, Uint8Array>,
) => {
  const decision = tagged.decision
  if (decision._tag === "Issued") {
    const command = decision.command
    if (command._tag === "Load") {
      return { op: tagged.op, decision: { _tag: "Issued" as const, command: {
        _tag: "Load" as const,
        key: keyBytes(command.key),
      } } }
    }
    if (command._tag === "Upload") {
      return { op: tagged.op, decision: { _tag: "Issued" as const, command: {
        _tag: "Upload" as const,
        key: keyBytes(command.key),
        bytes: Array.from(command.bytes),
      } } }
    }
    throw new Error(`differential scenario contains unsupported command ${command._tag}`)
  }
  return {
    op: tagged.op,
    decision: { _tag: decision._tag, key: keyBytes(decision.key) },
  }
}

const TestCrypto = Layer.succeed(Crypto.Crypto, Crypto.make({
  randomBytes: (size) => new Uint8Array(randomBytes(size)),
  digest: (algorithm, bytes) => Effect.sync(() => {
    const name = algorithm.toLowerCase().replace("-", "")
    return new Uint8Array(createHash(name).update(bytes).digest())
  }),
}))

const HttpRuntime = Layer.mergeAll(
  FetchHttpClient.layer,
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
      yield* awaitPeerSocketsReleased(endpoint)
      expect(endpoint.observe().openSockets).toBe(0)
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
      yield* awaitPeerSocketsReleased(endpoint)
      expect(endpoint.observe().openSockets).toBe(0)
    }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, {
      maxDecodedBytes: 32,
      maxQueuedBytes: 32,
    }))))
  })))

it.effect("RMT-002 cuts off a chunked body at the decoded-byte bound without admitting it", () =>
  Effect.scoped(Effect.gen(function* () {
      const bytes = encodeCasNode(node(Array.from({ length: 48 }, (_, index) => index)))
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "chunkedOversize", body: bytes })

      yield* Effect.gen(function* () {
        const store = yield* CasStore
        const first = yield* store.load(id).pipe(Effect.flip)
        expect(first._tag).toBe("CasError/RemoteFailure")
        if (first._tag === "CasError/RemoteFailure") {
          expect(first.cause).toMatchObject({
            _tag: "CasRemoteError/Budget",
            stage: "decoded",
            observed: bytes.length,
            bound: 24,
          })
        }

        yield* store.load(id).pipe(Effect.flip)
        expect(endpoint.observe().gets).toBe(2)
        yield* awaitPeerSocketsReleased(endpoint)
        expect(endpoint.observe().openSockets).toBe(0)
      }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, {
        maxDecodedBytes: 24,
      }))))
    })))

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
          observed: bytes.length,
          bound: 1,
        })
      }

      yield* store.load(digest(bytes)).pipe(Effect.flip)
      expect(endpoint.observe().gets).toBe(2)
      yield* awaitPeerSocketsReleased(endpoint)
      expect(endpoint.observe().openSockets).toBe(0)
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
        observed: bytes.length,
        bound: 1,
      })
    }
    yield* awaitPeerSocketsReleased(endpoint)
    expect(endpoint.observe().openSockets).toBe(0)
  })))

it.effect("hostile cas-http/0 admits a complete content-length response and reuses it locally", () =>
  Effect.scoped(Effect.gen(function* () {
      const bytes = encodeCasNode(node([6, 2, 6]))
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "complete", body: bytes })

      yield* CasStore.use((store) => Effect.gen(function* () {
        yield* store.load(id)
        yield* store.load(id)
      })).pipe(Effect.provide(remoteLayer(config(endpoint.authority))))
      expect(endpoint.observe().gets).toBe(1)
      yield* awaitPeerSocketsReleased(endpoint)
      expect(endpoint.observe().openSockets).toBe(0)
    })))

const hostileCases: ReadonlyArray<readonly [HostileFault, string, string]> = [
  ["truncated", "truncated fixed-length response", "CasRemoteError/Protocol"],
  ["contentLengthLarger", "overstated content length", "CasRemoteError/Protocol"],
  ["underreportedOversize", "understated content length", "CasRemoteError/Integrity"],
  ["wrongBytes", "substituted bytes", "CasRemoteError/Integrity"],
  ["resetMidBody", "connection reset mid-body", "CasRemoteError/Protocol"],
]

for (const [fault, title, expectedTag] of hostileCases) {
  it.effect(`hostile cas-http/0 ${title} fails typed, admits nothing, and releases its socket`, () =>
      Effect.scoped(Effect.gen(function* () {
        const bytes = encodeCasNode(node([7, 7, 7, 7]))
        const id = digest(bytes)
        const endpoint = yield* HostilePeer.serve({ fault, body: bytes })

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
          yield* awaitPeerSocketsReleased(endpoint)
          expect(endpoint.observe().openSockets).toBe(0)
        }).pipe(Effect.provide(remoteLayer(config(endpoint.authority))))
      })))
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
    yield* awaitPeerSocketsReleased(endpoint)
    expect(endpoint.observe().openSockets).toBe(0)
  })))

it.effect("plain FetchHttpClient wiring keeps every redirect as a denied machine event", () =>
  Effect.scoped(Effect.gen(function* () {
    const bytes = encodeCasNode(node([3, 0, 2]))
    const endpoint = yield* HostilePeer.serve({ fault: "redirect", body: bytes })
    const error = yield* CasStore.use((store) => store.load(digest(bytes))).pipe(
      Effect.flip,
      Effect.provide(remoteLayer(config(endpoint.authority))),
    )
    expect(error).toMatchObject({
      _tag: "CasError/RemoteFailure",
      cause: {
        _tag: "CasRemoteError/Policy",
        code: "redirectDenied",
      },
    })
    expect(endpoint.observe().gets).toBe(1)
    yield* awaitPeerSocketsReleased(endpoint)
    expect(endpoint.observe().openSockets).toBe(0)
  })))

it.effect("queued admission budgeting is invariant under one-chunk and many-chunk sources", () =>
  Effect.scoped(Effect.gen(function* () {
    const endpoint = yield* HostilePeer.serve({ fault: "complete", body: new Uint8Array() })
    const outcomes = yield* CasTransfer.use((transfer) => Effect.forEach([
      Cas.Transfer.replayable(Stream.succeed(Uint8Array.from([1, 2, 3, 4]))),
      Cas.Transfer.replayable(Stream.make(
        Uint8Array.of(1),
        Uint8Array.of(2),
        Uint8Array.of(3),
        Uint8Array.of(4),
      )),
    ], (source) => transfer.putStream(source, {
      kind: { version: 0, tag: 9 },
      refs: [],
    }).pipe(
      Effect.flip,
      Effect.map((error) => ({
        _tag: error._tag,
        stage: "stage" in error ? error.stage : undefined,
        observed: "observed" in error ? error.observed : undefined,
        bound: "bound" in error ? error.bound : undefined,
      })),
    ))).pipe(Effect.provide(remoteLayer(config(endpoint.authority, {
      maxQueuedBytes: 3,
    }))))
    expect(outcomes).toEqual([
      { _tag: "CasRemoteError/Budget", stage: "queued", observed: 4, bound: 3 },
      { _tag: "CasRemoteError/Budget", stage: "queued", observed: 4, bound: 3 },
    ])
    expect(endpoint.observe().requests).toBe(0)
    expect(endpoint.observe().openSockets).toBe(0)
  })))

it.effect("a cold reference-carrying parent load is the documented R3 closure boundary", () =>
  Effect.scoped(Effect.gen(function* () {
    const child = node([1, 1, 2, 3], 10)
    const childId = digest(encodeCasNode(child))
    const parent = CasNodeInput.make({
      kind: { version: 0, tag: 11 },
      payload: Uint8Array.of(5, 8),
      refs: [{ id: childId, expectedTag: child.kind.tag }],
    })
    const parentBytes = encodeCasNode(parent)
    const parentId = digest(parentBytes)
    const endpoint = yield* ReferencePeer.serve({ nodes: new Map([[parentId, parentBytes]]) })
    const error = yield* CasStore.use((store) => store.load(parentId)).pipe(
      Effect.flip,
      Effect.provide(remoteLayer(config(endpoint.authority))),
    )
    expect(error).toMatchObject({
      _tag: "CasError/RemoteFailure",
      cause: { _tag: "CasError/DanglingReference", missing: childId },
    })
    expect(endpoint.observe().gets).toBe(1)
    yield* awaitPeerSocketsReleased(endpoint)
    expect(endpoint.observe().openSockets).toBe(0)
  })))

it.effect("a mid-download deadline surfaces typed completion evidence and releases its socket", () =>
  Effect.scoped(Effect.gen(function* () {
      const bytes = encodeCasNode(node([4, 4, 4, 4]))
      const endpoint = yield* serveGatedPeer(bytes)
      const layer = remoteLayer(config(endpoint.authority))
      yield* CasStore.use((store) => Effect.gen(function* () {
        const first = yield* store.load(digest(bytes)).pipe(Effect.flip, Effect.forkScoped)
        yield* endpoint.awaitRequest(1)
        yield* TestClock.adjust(5_001)
        const error = yield* Fiber.join(first)
        yield* endpoint.awaitClosed(1)
        expect(error._tag).toBe("CasError/RemoteFailure")
        if (error._tag === "CasError/RemoteFailure") {
          expect(error.cause).toMatchObject({
            _tag: "CasRemoteError/Unavailable",
            code: "timeout",
            completion: "possiblyProcessed",
          })
        }

        const second = yield* store.load(digest(bytes)).pipe(Effect.flip, Effect.forkScoped)
        yield* endpoint.awaitRequest(2)
        yield* TestClock.adjust(5_001)
        yield* Fiber.join(second)
        yield* endpoint.awaitClosed(2)
        expect(endpoint.observe().gets).toBe(2)
        expect(endpoint.observe().openSockets).toBe(0)
      })).pipe(Effect.provide(layer))
    })))

it.effect("caller interruption mid-body releases the socket and clears machine state", () =>
  Effect.scoped(Effect.gen(function* () {
    const bytes = encodeCasNode(node([4, 2, 4, 2]))
    const endpoint = yield* serveGatedPeer(bytes)
    const remoteConfig = config(endpoint.authority)

    yield* Effect.gen(function* () {
      const transport = yield* makeRemoteHttp(remoteConfig)
      const address = yield* makeSha256Address
      const adapter = yield* makeRemoteAdapter(remoteConfig, transport, address)
      const loading = yield* adapter.store.load(digest(bytes)).pipe(Effect.forkScoped)
      yield* endpoint.awaitRequest(1)
      yield* Fiber.interrupt(loading)
      yield* endpoint.awaitClosed(1)

      const snapshot = yield* adapter.snapshot
      expect(snapshot.inFlightSize).toBe(0)
      expect(snapshot.cacheSize).toBe(0)
      expect(endpoint.observe().gets).toBe(1)
      expect(endpoint.observe().openSockets).toBe(0)
    }).pipe(Effect.provide(HttpRuntime))
  })))

it.effect("a one-shot upload reset is never retried and carries indeterminate completion evidence", () =>
  Effect.scoped(Effect.gen(function* () {
      const uploaded = node([9, 9, 1], 7)
      const bytes = encodeCasNode(uploaded)
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "cancellationMidUpload", body: bytes })

      yield* Effect.gen(function* () {
        const transfer = yield* CasTransfer
        const store = yield* CasStore
        const error = yield* transfer.putStream(
          Cas.Transfer.oneShot(Stream.succeed(uploaded.payload)),
          { kind: uploaded.kind, refs: [], expected: id },
        ).pipe(Effect.flip)
        expect(error._tag).toBe("CasRemoteError/Policy")
        if (error._tag === "CasRemoteError/Policy") {
          expect(error).toMatchObject({
            code: "oneShotRetryRefused",
            completion: "possiblyProcessed",
            cause: { _tag: "CasRemoteError/Unavailable" },
          })
        }
        expect(endpoint.observe().puts).toBe(1)

        yield* store.load(id)
        expect(endpoint.observe().gets).toBe(1)
        yield* awaitPeerSocketsReleased(endpoint)
        expect(endpoint.observe().openSockets).toBe(0)
      }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, { maxAttempts: 3 }))))
    })))

it.effect("a replayable upload reconsumes and rechecks its source before a bounded retry", () =>
  Effect.scoped(Effect.gen(function* () {
      const uploaded = node([3, 1, 4], 8)
      const bytes = encodeCasNode(uploaded)
      const id = digest(bytes)
      const endpoint = yield* HostilePeer.serve({ fault: "cancellationMidUpload", body: bytes })
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
        yield* awaitPeerSocketsReleased(endpoint)
        expect(endpoint.observe().openSockets).toBe(0)
      }).pipe(Effect.provide(remoteLayer(config(endpoint.authority, { maxAttempts: 2 }))))
    })))

interface ScriptedExchange {
  readonly events: ReadonlyArray<RemoteWireEvent>
  readonly witness: CompletionWitness
}

const scriptedTransport = (script: ReadonlyArray<ScriptedExchange>): RemoteCasTransport => {
  let cursor = 0
  return {
    issue: () => {
      const exchange = script[cursor]
      cursor += 1
      if (exchange === undefined) {
        return Channel.fromEffectDone(Effect.die(new Error("unexpected differential transfer")))
      }
      return Channel.fromArray(exchange.events).pipe(
        Channel.concatWith(() => Channel.fromEffectDone(Effect.succeed(exchange.witness))),
      )
    },
  }
}

layer(remoteStepLayer(step))("remote adapter differential mirror lane", (it) => {
  it.effect("the adapter and pure mirror agree across the shared differential scenario table", () =>
    Effect.gen(function* () {
    const sut = yield* RemoteStepSUT
    const resident = node([8, 6, 7, 5, 3, 0, 9])
    const bytes = encodeCasNode(resident)
    const id = digest(bytes)
    const complete = (events: ReadonlyArray<RemoteWireEvent>, sentBytes = 0): ScriptedExchange => ({
      events,
      witness: { receivedBytes: bytes.length, sentBytes, terminalFraming: "complete" },
    })
    const loadExchange = complete([
      { _tag: "ResponseStarted", declared: bytes.length },
      { _tag: "BodyChunk", bytes },
    ])
    const uploadAck = complete([{
      _tag: "Event",
      event: { _tag: "Ok", declared: 0, bytes: new Uint8Array() },
    }], bytes.length)
    const uploadMismatch = complete([{
      _tag: "Event",
      event: { _tag: "IntegrityMismatch" },
    }], bytes.length)
    const loadInput = (op: number): MInput<ContentId, Uint8Array> => ({
      _tag: "Request",
      id: op,
      op: { _tag: "Load", key: id },
    })
    const loadAnswer = (op: number): MInput<ContentId, Uint8Array> => ({
      _tag: "FromWire",
      id: op,
      event: { _tag: "Ok", declared: bytes.length, bytes },
    })
    const uploadInput = (op: number): MInput<ContentId, Uint8Array> => ({
      _tag: "Request",
      id: op,
      op: { _tag: "Upload", key: id, bytes },
    })
    const uploadAnswer = (
      op: number,
      event: "Ok" | "IntegrityMismatch" = "Ok",
    ): MInput<ContentId, Uint8Array> => ({
      _tag: "FromWire",
      id: op,
      event: event === "Ok"
        ? { _tag: "Ok", declared: 0, bytes: new Uint8Array() }
        : { _tag: "IntegrityMismatch" },
    })

    const scenarios: ReadonlyArray<{
      readonly name: string
      readonly overrides?: Parameters<typeof config>[1]
      readonly script: ReadonlyArray<ScriptedExchange>
      readonly inputs: ReadonlyArray<MInput<ContentId, Uint8Array>>
      readonly execute: (adapter: RemoteAdapter) => Effect.Effect<unknown, unknown>
    }> = [
      {
        name: "verified load",
        script: [loadExchange],
        inputs: [loadInput(1), loadAnswer(1)],
        execute: (adapter) => adapter.store.load(id),
      },
      {
        name: "upload acknowledgement",
        script: [uploadAck],
        inputs: [uploadInput(1), uploadAnswer(1)],
        execute: (adapter) => adapter.store.put(resident),
      },
      {
        name: "deduplicated upload after load",
        script: [loadExchange],
        inputs: [loadInput(1), loadAnswer(1), uploadInput(2)],
        execute: (adapter) => Effect.gen(function* () {
          yield* adapter.store.load(id)
          yield* adapter.store.put(resident)
        }),
      },
      {
        name: "deduplicated upload after acknowledgement",
        script: [uploadAck],
        inputs: [uploadInput(1), uploadAnswer(1), uploadInput(2)],
        execute: (adapter) => Effect.gen(function* () {
          yield* adapter.store.put(resident)
          yield* adapter.store.put(resident)
        }),
      },
      {
        name: "rejected repeat after integrity mismatch",
        script: [uploadMismatch],
        inputs: [uploadInput(1), uploadAnswer(1, "IntegrityMismatch"), uploadInput(2)],
        execute: (adapter) => Effect.gen(function* () {
          yield* adapter.store.put(resident).pipe(Effect.result)
          yield* adapter.store.put(resident).pipe(Effect.result)
        }),
      },
      {
        name: "oversize upload",
        overrides: { maxEncodedBytes: bytes.length - 1 },
        script: [],
        inputs: [uploadInput(1)],
        execute: (adapter) => adapter.store.put(resident).pipe(Effect.result),
      },
      {
        name: "declared oversize load",
        overrides: { maxDecodedBytes: bytes.length - 1 },
        script: [complete([{ _tag: "ResponseStarted", declared: bytes.length }])],
        inputs: [
          loadInput(1),
          {
            _tag: "FromWire",
            id: 1,
            event: { _tag: "Ok", declared: bytes.length, bytes: new Uint8Array() },
          },
        ],
        execute: (adapter) => adapter.store.load(id).pipe(Effect.result),
      },
    ]

    const address = yield* makeSha256Address
    for (const scenario of scenarios) {
      const remoteConfig = config("http://127.0.0.1:1", scenario.overrides)
      const adapter = yield* makeRemoteAdapter(
        remoteConfig,
        scriptedTransport(scenario.script),
        address,
      )
      yield* scenario.execute(adapter)
      const observed = yield* adapter.snapshot
      const params = {
        budgets: {
          maxBytes: scenario.name.includes("upload") || scenario.name.includes("repeat")
            ? remoteConfig.maxEncodedBytes
            : remoteConfig.maxDecodedBytes,
          maxKeys: 1,
        },
        size: (value: RemoteBytes) => value.length,
        verify: (key: RemoteKey, value: RemoteBytes) => {
          const actual = keyBytes(digest(Uint8Array.from(value)))
          return actual.every((byte, index) => key[index] === byte)
        },
      }
      let expectedState = initialMachineState<RemoteKey, RemoteBytes>()
      const expectedDecisions: Array<TaggedDecision<RemoteKey, RemoteBytes>> = []
      for (const input of scenario.inputs) {
        const output = sut.step(params, expectedState, normalizeInput(input))
        expectedState = output.state
        expectedDecisions.push(...output.decisions)
      }
      expect({
        scenario: scenario.name,
        decisions: observed.decisions.map(normalizeDecision),
      }).toEqual({
        scenario: scenario.name,
        decisions: expectedDecisions,
      })
    }
    }).pipe(Effect.provide(TestCrypto)))
})

it.effect("an invalid upload acknowledgement clears the correlated in-flight operation", () =>
  Effect.gen(function* () {
    const uploaded = node([1, 4, 1, 4], 12)
    const bytes = encodeCasNode(uploaded)
    const remoteConfig = config("http://127.0.0.1:1")
    const address = yield* makeSha256Address
    const adapter = yield* makeRemoteAdapter(remoteConfig, scriptedTransport([{
      events: [],
      witness: {
        receivedBytes: 0,
        sentBytes: bytes.length,
        terminalFraming: "complete",
      },
    }]), address)
    const error = yield* adapter.store.put(uploaded).pipe(Effect.flip)
    expect(error).toMatchObject({
      _tag: "CasError/RemoteFailure",
      cause: { _tag: "CasRemoteError/Protocol", code: "invalidAcknowledgement" },
    })
    const snapshot = yield* adapter.snapshot
    expect(snapshot.inFlightSize).toBe(0)
  }).pipe(Effect.provide(TestCrypto)))

it.effect("rate-limit evidence retains the Schema-decoded retry-after value", () =>
  Effect.gen(function* () {
    const resident = node([2, 7, 1, 8], 13)
    const bytes = encodeCasNode(resident)
    const id = digest(bytes)
    const remoteConfig = config("http://127.0.0.1:1")
    const address = yield* makeSha256Address
    const adapter = yield* makeRemoteAdapter(remoteConfig, scriptedTransport([{
      events: [{ _tag: "Event", event: { _tag: "RateLimited", retryAfter: 17 } }],
      witness: { receivedBytes: 0, sentBytes: 0, terminalFraming: "complete" },
    }]), address)
    const error = yield* adapter.store.load(id).pipe(Effect.flip)
    expect(error).toMatchObject({
      _tag: "CasError/RemoteFailure",
      cause: {
        _tag: "CasRemoteError/Unavailable",
        code: "rateLimited",
        retryAfter: 17,
      },
    })
  }).pipe(Effect.provide(TestCrypto)))

it.effect("offline puts are observably distinct from local-authoritative admission", () => {
  const authority = RemoteAuthority.make("http://127.0.0.1:1")
  const makeModeConfig = (authorityMode: "offline" | "local-authoritative") =>
    new CasRemoteConfig({
      authority,
      authorityMode,
      maxEncodedBytes: 4096,
      maxDecodedBytes: 4096,
      maxDecompressedBytes: 4096,
      maxQueuedBytes: 4096,
      maxAttempts: 1,
      operationDeadlineMs: 5_000,
      redirectPolicy: { maxRedirects: 0, crossOrigin: "deny" },
    })
  const uploaded = node([6, 6, 6], 14)
  return Effect.gen(function* () {
    const offline = yield* CasStore.use((store) => store.put(uploaded)).pipe(
      Effect.flip,
      Effect.provide(remoteLayer(makeModeConfig("offline"))),
    )
    expect(offline).toMatchObject({
      _tag: "CasError/RemoteFailure",
      cause: { _tag: "CasRemoteError/Policy", code: "offline" },
    })
    const local = yield* CasStore.use((store) => store.put(uploaded)).pipe(
      Effect.provide(remoteLayer(makeModeConfig("local-authoritative"))),
    )
    expect(local).toBe(digest(encodeCasNode(uploaded)))
  })
})
