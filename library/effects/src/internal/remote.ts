/** Verified semantic adapter between CasStore and the untrusted transport. */
import {
  Channel,
  Effect,
  Equal,
  HashMap,
  HashSet,
  Option,
  Pull,
  Ref,
  Scope,
  Stream,
  SynchronizedRef,
} from "effect"
import {
  AddressMismatch,
  CasNodeInput,
  ContentNotFound,
  DanglingReference,
  NonCanonicalBytes,
  RemoteFailure,
  StoreFailure,
  UnknownKind,
  WrongKindReference,
  type CasError,
  type ContentId,
} from "../cas/Node.ts"
import {
  RemoteBudgetError,
  RemoteIntegrityError,
  RemotePolicyError,
  RemoteProtocolError,
  RemoteUnavailableError,
  type CasRemoteConfig,
  type CasRemoteError,
} from "../cas/Remote.ts"
import type { CasTransferShape, PutStreamOptions, UploadSource } from "../cas/Transfer.ts"
import {
  CasSchemeVersion,
  decodeCasNode,
  encodeCasNode,
  makeMemoryCasStore,
  type CasAddress,
  type CasStoreShape,
} from "../cas/Store.ts"
import {
  initialMachineState,
  step,
  type Command,
  type Event,
  type MInput,
  type MachineState,
  type MResult,
  type RDecision,
  type StepOut,
  type TaggedDecision,
} from "./remoteMachine.ts"
import type {
  CompletionWitness,
  RemoteCasTransport,
  RemoteTransportFailure,
  RemoteWireEvent,
} from "./remoteTransport.ts"

interface MachineRuntime {
  readonly machine: MachineState<ContentId, Uint8Array>
  readonly decisions: ReadonlyArray<TaggedDecision<ContentId, Uint8Array>>
}

const wrapRemoteFailure = (error: CasError | CasRemoteError): CasError => {
  switch (error._tag) {
    case "CasRemoteError/Integrity":
    case "CasRemoteError/Budget":
    case "CasRemoteError/Protocol":
    case "CasRemoteError/Unavailable":
    case "CasRemoteError/Policy":
      return new RemoteFailure({ cause: error })
    default:
      return error
  }
}

export interface RemoteMachineSnapshot {
  readonly decisions: ReadonlyArray<TaggedDecision<ContentId, Uint8Array>>
  readonly cacheSize: number
  readonly inFlightSize: number
  readonly rejectedSize: number
}

export interface RemoteAdapter {
  readonly store: CasStoreShape
  readonly transfer: CasTransferShape
  readonly snapshot: Effect.Effect<RemoteMachineSnapshot>
}

interface Verification {
  readonly key: ContentId
  readonly bytes: Uint8Array
  readonly valid: boolean
}

interface Exchange {
  readonly event: Event<ContentId, Uint8Array>
  readonly protocolCode?: Extract<RemoteWireEvent, { readonly _tag: "Event" }>["protocolCode"]
  readonly witness: CompletionWitness
}

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false
  }
  return true
}

const joinChunks = (chunks: ReadonlyArray<Uint8Array>, length: number): Uint8Array => {
  const output = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

const remoteIntegrity = (
  config: CasRemoteConfig,
  opId: number,
  code: RemoteIntegrityError["code"],
  receivedBytes: number,
  stage: RemoteIntegrityError["stage"] = "admission",
  attemptId = 1,
): RemoteIntegrityError => new RemoteIntegrityError({
  opId,
  attemptId,
  stage,
  authority: config.authority,
  code,
  receivedBytes,
})

const remoteBudget = (
  config: CasRemoteConfig,
  opId: number,
  stage: RemoteBudgetError["stage"],
  observed: number,
  bound: number,
  attemptId = 1,
): RemoteBudgetError => new RemoteBudgetError({
  opId,
  attemptId,
  stage,
  authority: config.authority,
  observed,
  bound,
})

const remoteProtocol = (
  config: CasRemoteConfig,
  opId: number,
  code: RemoteProtocolError["code"],
  witness: CompletionWitness,
  attemptId = 1,
): RemoteProtocolError => new RemoteProtocolError({
  opId,
  attemptId,
  stage: "response",
  authority: config.authority,
  code,
  completion: "possiblyProcessed",
  receivedBytes: witness.receivedBytes,
  sentBytes: witness.sentBytes,
})

const remoteUnavailable = (
  config: CasRemoteConfig,
  opId: number,
  code: RemoteUnavailableError["code"],
  completion: RemoteUnavailableError["completion"],
  receivedBytes: number,
  sentBytes: number,
  attemptId = 1,
): RemoteUnavailableError => new RemoteUnavailableError({
  opId,
  attemptId,
  stage: "response",
  authority: config.authority,
  code,
  completion,
  receivedBytes,
  sentBytes,
})

const remotePolicy = (
  config: CasRemoteConfig,
  opId: number,
  code: RemotePolicyError["code"],
  completion: RemotePolicyError["completion"] = "knownUnprocessed",
  attemptId = 1,
): RemotePolicyError => new RemotePolicyError({
  opId,
  attemptId,
  stage: "request",
  authority: config.authority,
  code,
  completion,
  receivedBytes: 0,
  sentBytes: 0,
})

const unavailableFromTransport = (
  config: CasRemoteConfig,
  opId: number,
  attemptId: number,
  failure: RemoteTransportFailure,
): RemoteUnavailableError => remoteUnavailable(
  config,
  opId,
  failure.code,
  failure.completion,
  failure.receivedBytes,
  failure.sentBytes,
  attemptId,
)

/** Construct one shared adapter build. */
export const makeRemoteAdapter = (
  config: CasRemoteConfig,
  transport: RemoteCasTransport,
  address: CasAddress,
): Effect.Effect<RemoteAdapter> => Effect.gen(function* () {
  const localStore = yield* makeMemoryCasStore(address)
  const runtime = yield* SynchronizedRef.make<MachineRuntime>({
    machine: initialMachineState(),
    decisions: [],
  })
  const nextOpId = yield* Ref.make(1)

  const allocateOpId = Ref.getAndUpdate(nextOpId, (id) => id + 1)

  const machineStep = (
    input: MInput<ContentId, Uint8Array>,
    verification: Verification | undefined,
    maxBytes: number,
  ): Effect.Effect<StepOut<ContentId, Uint8Array>> =>
    SynchronizedRef.modify(runtime, (current) => {
      const output = step({
        budgets: { maxBytes, maxKeys: 1 },
        size: (bytes) => bytes.length,
        verify: (key, bytes) => verification !== undefined
          && verification.valid
          && Equal.equals(key, verification.key)
          && Equal.equals(bytes, verification.bytes),
      }, current.machine, input)
      return [output, {
        machine: output.state,
        decisions: [...current.decisions, ...output.decisions],
      }] as const
    })

  const clearInFlight = (
    opId: number,
    event: Event<ContentId, Uint8Array>,
    maxBytes: number,
  ) => machineStep({ _tag: "FromWire", id: opId, event }, undefined, maxBytes)

  const consumeExchange = (
    opId: number,
    attemptId: number,
    command: Command<ContentId, Uint8Array>,
  ): Effect.Effect<Exchange, CasRemoteError> => Effect.scoped(Effect.gen(function* () {
    const scope = yield* Effect.scope
    const pull = yield* Channel.toPullScoped(transport.issue(opId, attemptId, command), scope)
    const chunks: Array<Uint8Array> = []
    let received = 0
    let declared: number | undefined
    let direct: Extract<RemoteWireEvent, { readonly _tag: "Event" }> | undefined

    while (true) {
      const pulled = yield* Pull.catchDone(
        pull.pipe(Effect.map((event) => ({ _tag: "Element" as const, event }))),
        (witness) => Effect.succeed({ _tag: "Done" as const, witness }),
      ).pipe(Effect.result)
      if (pulled._tag === "Failure") {
        yield* clearInFlight(
          opId,
          { _tag: "Reset" },
          command._tag === "Upload" ? config.maxEncodedBytes : config.maxDecodedBytes,
        )
        return yield* Effect.fail(unavailableFromTransport(
          config,
          opId,
          attemptId,
          pulled.failure,
        ))
      }
      const next = pulled.success

      if (next._tag === "Done") {
        const witness = next.witness
        if (direct !== undefined) {
          return {
            event: direct.event,
            ...(direct.protocolCode === undefined ? {} : { protocolCode: direct.protocolCode }),
            witness,
          }
        }

        if (command._tag !== "Load") {
          return yield* remoteProtocol(config, opId, "invalidAcknowledgement", witness, attemptId)
        }
        if (witness.terminalFraming !== "complete") {
          const event: Event<ContentId, Uint8Array> = witness.terminalFraming === "truncated"
            ? { _tag: "Truncated" }
            : { _tag: "Reset" }
          const protocolCode: NonNullable<Exchange["protocolCode"]> =
            witness.terminalFraming === "truncated" ? "truncatedBody" : "invalidFraming"
          return {
            event,
            protocolCode,
            witness,
          }
        }
        if (declared !== undefined && declared !== received) {
          const event: Event<ContentId, Uint8Array> = { _tag: "Truncated" }
          const protocolCode: NonNullable<Exchange["protocolCode"]> = "invalidFraming"
          return {
            event,
            protocolCode,
            witness,
          }
        }
        const event: Event<ContentId, Uint8Array> = {
          _tag: "Ok",
          declared: declared ?? received,
          bytes: joinChunks(chunks, received),
        }
        return { event, witness }
      }

      const wire = next.event
      switch (wire._tag) {
        case "ResponseStarted": {
          declared = wire.declared
          if (declared !== undefined && declared > config.maxDecodedBytes) {
            yield* clearInFlight(opId, {
              _tag: "Ok",
              declared,
              bytes: new Uint8Array(),
            }, config.maxDecodedBytes)
            return yield* remoteBudget(
              config,
              opId,
              "decoded",
              declared,
              config.maxDecodedBytes,
              attemptId,
            )
          }
          break
        }
        case "BodyChunk": {
          if (wire.bytes.length > config.maxQueuedBytes) {
            yield* clearInFlight(opId, { _tag: "Interrupted" }, config.maxDecodedBytes)
            return yield* remoteBudget(
              config,
              opId,
              "queued",
              config.maxQueuedBytes + 1,
              config.maxQueuedBytes,
              attemptId,
            )
          }
          if (received + wire.bytes.length > config.maxDecodedBytes) {
            yield* clearInFlight(opId, {
              _tag: "Ok",
              declared: config.maxDecodedBytes + 1,
              bytes: new Uint8Array(),
            }, config.maxDecodedBytes)
            return yield* remoteBudget(
              config,
              opId,
              "decoded",
              config.maxDecodedBytes + 1,
              config.maxDecodedBytes,
              attemptId,
            )
          }
          if (received + wire.bytes.length > config.maxDecompressedBytes) {
            yield* clearInFlight(opId, { _tag: "Interrupted" }, config.maxDecodedBytes)
            return yield* remoteBudget(
              config,
              opId,
              "decompressed",
              config.maxDecompressedBytes + 1,
              config.maxDecompressedBytes,
              attemptId,
            )
          }
          received += wire.bytes.length
          chunks.push(wire.bytes.slice())
          break
        }
        case "Event":
          direct = wire
          break
      }
    }
  })).pipe(
    Effect.timeout(config.operationDeadlineMs),
    Effect.catchTag("TimeoutError", () => clearInFlight(
      opId,
      { _tag: "Silence" },
      command._tag === "Upload" ? config.maxEncodedBytes : config.maxDecodedBytes,
    ).pipe(
      Effect.andThen(Effect.fail(remoteUnavailable(
        config,
        opId,
        "timeout",
        "possiblyProcessed",
        0,
        command._tag === "Upload" ? command.bytes.length : 0,
        attemptId,
      ))),
    )),
  )

  const resultError = (
    opId: number,
    attemptId: number,
    result: MResult<ContentId, Uint8Array>,
    exchange: Exchange | undefined,
  ): CasRemoteError | ContentNotFound => {
    const key = "key" in result ? result.key : undefined
    switch (result._tag) {
      case "NotFound":
        return new ContentNotFound({ id: result.key })
      case "BudgetRejected":
        return remoteBudget(
          config,
          opId,
          "decoded",
          config.maxDecodedBytes + 1,
          config.maxDecodedBytes,
          attemptId,
        )
      case "IntegrityRejected":
      case "RepeatRefused":
        return remoteIntegrity(
          config,
          opId,
          "remoteRejected",
          exchange?.witness.receivedBytes ?? 0,
          "admission",
          attemptId,
        )
      case "AuthFailed": {
        const tag = exchange?.event._tag
        return remoteUnavailable(
          config,
          opId,
          tag === "Denied" ? "denied" : "unauthenticated",
          "possiblyProcessed",
          exchange?.witness.receivedBytes ?? 0,
          exchange?.witness.sentBytes ?? 0,
          attemptId,
        )
      }
      case "TransportFailed": {
        const witness = exchange?.witness ?? {
          receivedBytes: 0,
          sentBytes: 0,
          terminalFraming: "reset" as const,
        }
        if (exchange?.protocolCode !== undefined) {
          return remoteProtocol(config, opId, exchange.protocolCode, witness, attemptId)
        }
        switch (exchange?.event._tag) {
          case "Redirected":
            return remotePolicy(config, opId, "redirectDenied", "possiblyProcessed", attemptId)
          case "Silence":
            return remoteUnavailable(
              config,
              opId,
              "timeout",
              "possiblyProcessed",
              0,
              witness.sentBytes,
              attemptId,
            )
          case "Interrupted":
            return remoteUnavailable(
              config,
              opId,
              "cancelled",
              "possiblyProcessed",
              0,
              witness.sentBytes,
              attemptId,
            )
          case "RateLimited":
            return remoteUnavailable(
              config,
              opId,
              "rateLimited",
              "possiblyProcessed",
              0,
              witness.sentBytes,
              attemptId,
            )
          case "Capacity":
            return remoteUnavailable(
              config,
              opId,
              "capacity",
              "possiblyProcessed",
              0,
              witness.sentBytes,
              attemptId,
            )
          default:
            return remoteUnavailable(
              config,
              opId,
              "connectionReset",
              "possiblyProcessed",
              witness.receivedBytes,
              witness.sentBytes,
              attemptId,
            )
        }
      }
      case "DuplicateId":
      case "Absorbed":
        throw new Error(`remote machine invariant breach: ${result._tag}`)
      case "Commanded":
      case "Delivered":
      case "Uploaded":
        throw new Error(`remote machine result is not an error: ${result._tag}${key ?? ""}`)
    }
  }

  const validateUploadNode = (
    input: CasNodeInput,
  ): Effect.Effect<{ readonly node: CasNodeInput; readonly bytes: Uint8Array; readonly id: ContentId }, CasError> =>
    Effect.gen(function* () {
      const node = yield* CasNodeInput.makeEffect(input).pipe(
        Effect.mapError((issue) => new StoreFailure({
          reason: `Invalid CAS node input: ${String(issue)}`,
        })),
      )
      if (node.kind.version !== CasSchemeVersion) return yield* new UnknownKind(node.kind)

      for (const ref of node.refs) {
        const resident = yield* localStore.load(ref.id).pipe(
          Effect.mapError((error): CasError => error._tag === "CasError/ContentNotFound"
            ? new DanglingReference({ missing: ref.id })
            : error),
        )
        if (resident.kind.tag !== ref.expectedTag) {
          return yield* new WrongKindReference({
            ref: ref.id,
            expectedTag: ref.expectedTag,
            actualTag: resident.kind.tag,
          })
        }
      }

      const bytes = encodeCasNode(node)
      const id = yield* address.digest(bytes.slice())
      return { node, bytes, id }
    })

  const driveUpload = (
    opId: number,
    attemptId: number,
    node: CasNodeInput,
    key: ContentId,
    bytes: Uint8Array,
  ): Effect.Effect<ContentId, CasRemoteError | CasError> => Effect.gen(function* () {
    if (bytes.length > config.maxEncodedBytes) {
      return yield* remoteBudget(
        config,
        opId,
        "encoded",
        bytes.length,
        config.maxEncodedBytes,
        attemptId,
      )
    }

    const actual = yield* address.digest(bytes.slice())
    const verified = actual === key
    const requested = yield* machineStep({
      _tag: "Request",
      id: opId,
      op: { _tag: "Upload", key, bytes },
    }, { key, bytes, valid: verified }, config.maxEncodedBytes)

    if (!verified || requested.result._tag === "IntegrityRejected") {
      return yield* remoteIntegrity(
        config,
        opId,
        "addressMismatch",
        bytes.length,
        "request",
        attemptId,
      )
    }
    if (requested.result._tag === "Uploaded") {
      const admitted = yield* localStore.put(node)
      return admitted
    }
    if (requested.result._tag !== "Commanded") {
      return yield* resultError(opId, attemptId, requested.result, undefined)
    }

    const command = requested.commands[0]?.command
    if (command === undefined) throw new Error("commanded upload emitted no command")
    const exchange = yield* consumeExchange(opId, attemptId, command)
    const rechecked = yield* address.digest(bytes.slice())
    const answered = yield* machineStep({
      _tag: "FromWire",
      id: opId,
      event: exchange.event,
    }, { key, bytes, valid: rechecked === key }, config.maxEncodedBytes)

    if (answered.result._tag !== "Uploaded") {
      return yield* resultError(opId, attemptId, answered.result, exchange)
    }
    const admitted = yield* localStore.put(node)
    if (admitted !== key) {
      return yield* new AddressMismatch({ expected: key, actual: admitted })
    }
    return key
  })

  const driveLoad = (
    opId: number,
    id: ContentId,
  ): Effect.Effect<CasNodeInput, CasRemoteError | CasError> => Effect.gen(function* () {
    const requested = yield* machineStep({
      _tag: "Request",
      id: opId,
      op: { _tag: "Load", key: id },
    }, undefined, config.maxDecodedBytes)
    if (requested.result._tag !== "Commanded") {
      return yield* resultError(opId, 1, requested.result, undefined)
    }

    const command = requested.commands[0]?.command
    if (command === undefined) throw new Error("commanded load emitted no command")
    const exchange = yield* consumeExchange(opId, 1, command)

    if (exchange.event._tag !== "Ok") {
      const answered = yield* machineStep({
        _tag: "FromWire",
        id: opId,
        event: exchange.event,
      }, undefined, config.maxDecodedBytes)
      return yield* resultError(opId, 1, answered.result, exchange)
    }

    const bytes = exchange.event.bytes
    const decoded = decodeCasNode(bytes)
    if (decoded === undefined || !bytesEqual(encodeCasNode(decoded), bytes)) {
      yield* machineStep({
        _tag: "FromWire",
        id: opId,
        event: exchange.event,
      }, { key: id, bytes, valid: false }, config.maxDecodedBytes)
      return yield* remoteIntegrity(config, opId, "nonCanonicalBytes", bytes.length)
    }

    const actual = yield* address.digest(bytes.slice())
    if (actual !== id) {
      yield* machineStep({
        _tag: "FromWire",
        id: opId,
        event: exchange.event,
      }, { key: id, bytes, valid: false }, config.maxDecodedBytes)
      return yield* remoteIntegrity(config, opId, "addressMismatch", bytes.length)
    }

    const admitted = yield* localStore.put(decoded).pipe(
      Effect.tapError(() => machineStep({
        _tag: "FromWire",
        id: opId,
        event: exchange.event,
      }, { key: id, bytes, valid: false }, config.maxDecodedBytes)),
    )
    if (admitted !== id) {
      return yield* new AddressMismatch({ expected: id, actual: admitted })
    }

    const answered = yield* machineStep({
      _tag: "FromWire",
      id: opId,
      event: exchange.event,
    }, { key: id, bytes, valid: true }, config.maxDecodedBytes)
    if (answered.result._tag !== "Delivered") {
      return yield* resultError(opId, 1, answered.result, exchange)
    }
    return decoded
  })

  const putTransfer = (
    source: UploadSource,
    options: PutStreamOptions,
  ): Effect.Effect<ContentId, CasRemoteError | CasError> => Effect.gen(function* () {
    const opId = yield* allocateOpId
    let expected = options.expected
    let attemptId = 1

    while (true) {
      const chunks: Array<Uint8Array> = []
      let length = 0

      yield* source.stream.pipe(Stream.runForEach((chunk) => {
        if (chunk.length > config.maxQueuedBytes) {
          return Effect.fail(remoteBudget(
            config,
            opId,
            "queued",
            config.maxQueuedBytes + 1,
            config.maxQueuedBytes,
            attemptId,
          ))
        }
        if (length + chunk.length > config.maxDecodedBytes) {
          return Effect.fail(remoteBudget(
            config,
            opId,
            "decoded",
            config.maxDecodedBytes + 1,
            config.maxDecodedBytes,
            attemptId,
          ))
        }
        length += chunk.length
        chunks.push(chunk.slice())
        return Effect.void
      }))

      const node = CasNodeInput.make({
        kind: options.kind,
        refs: [...options.refs],
        payload: joinChunks(chunks, length),
      })
      const validated = yield* validateUploadNode(node)
      expected ??= validated.id
      if (expected !== validated.id) {
        return yield* remoteIntegrity(
          config,
          opId,
          "addressMismatch",
          validated.bytes.length,
          "request",
          attemptId,
        )
      }

      if (config.authorityMode !== "remote-authoritative") {
        return yield* localStore.put(validated.node)
      }

      const uploaded = yield* driveUpload(
        opId,
        attemptId,
        validated.node,
        validated.id,
        validated.bytes,
      ).pipe(Effect.match({
        onFailure: (error) => ({ _tag: "Failure" as const, error }),
        onSuccess: (value) => ({ _tag: "Success" as const, value }),
      }))
      if (uploaded._tag === "Success") return uploaded.value

      const retryable = uploaded.error._tag === "CasRemoteError/Protocol"
        || uploaded.error._tag === "CasRemoteError/Unavailable"
      if (source._tag === "OneShot" || !retryable || attemptId >= config.maxAttempts) {
        return yield* Effect.fail(uploaded.error)
      }
      attemptId += 1
    }
  })

  const put = Effect.fn("CasStore.Remote.put")(function* (input: CasNodeInput) {
    const opId = yield* allocateOpId
    const validated = yield* validateUploadNode(input)
    if (config.authorityMode !== "remote-authoritative") {
      return yield* localStore.put(validated.node)
    }
    return yield* driveUpload(opId, 1, validated.node, validated.id, validated.bytes).pipe(
      Effect.mapError(wrapRemoteFailure),
    )
  })

  const load = Effect.fn("CasStore.Remote.load")(function* (id: ContentId) {
    const local = yield* localStore.load(id).pipe(
      Effect.map(Option.some),
      Effect.catchTag("CasError/ContentNotFound", () => Effect.succeed(Option.none())),
    )
    if (local._tag === "Some") return local.value
    if (config.authorityMode !== "remote-authoritative") {
      return yield* new ContentNotFound({ id })
    }

    const opId = yield* allocateOpId
    return yield* driveLoad(opId, id).pipe(
      Effect.mapError(wrapRemoteFailure),
    )
  })

  const loadStream = Effect.fn("CasTransfer.Remote.loadStream")(function* (id: ContentId) {
    yield* Scope.Scope
    const node = yield* load(id).pipe(
      Effect.mapError((error): CasError | CasRemoteError => error._tag === "CasError/RemoteFailure"
        ? error.cause
        : error),
    )
    const bytes = encodeCasNode(node)
    if (bytes.length > config.maxDecodedBytes) {
      const opId = yield* allocateOpId
      return yield* remoteBudget(config, opId, "decoded", bytes.length, config.maxDecodedBytes)
    }
    return Stream.succeed(bytes)
  })

  const snapshot = SynchronizedRef.get(runtime).pipe(Effect.map((current) => ({
    decisions: current.decisions,
    cacheSize: HashSet.size(current.machine.cache),
    inFlightSize: HashMap.size(current.machine.inFlight),
    rejectedSize: HashSet.size(current.machine.rejected),
  })))

  return {
    store: { put, load },
    transfer: { putStream: putTransfer, loadStream },
    snapshot,
  }
})
