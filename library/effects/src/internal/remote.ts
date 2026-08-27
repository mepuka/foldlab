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
  type CasPresence,
  type CasPushReport,
  type CasRemoteConfig,
  type CasRemoteError,
  type RemoteCapabilities,
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
  RemoteIssue,
  RemoteTransportFailure,
  RemoteWireEvent,
} from "./remoteTransport.ts"
import {
  decodeCapabilityDocument,
  decodePresenceDocument,
  encodeKeyListDocument,
} from "./remoteControl.ts"

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
  readonly confirmedSize: number
  readonly inFlightSize: number
  readonly publishedSize: number
  readonly rejectedSize: number
  readonly reportedMissingSize: number
  readonly reportedPresentSize: number
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
  readonly presence?: CasPresence
  readonly witness: CompletionWitness
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
  opId: number | undefined,
  stage: RemoteBudgetError["stage"],
  observed: number,
  bound: number,
  attemptId = 1,
): RemoteBudgetError => new RemoteBudgetError({
  ...(opId === undefined ? {} : { opId }),
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
  retryAfter?: number,
): RemoteUnavailableError => new RemoteUnavailableError({
  opId,
  attemptId,
  stage: "response",
  authority: config.authority,
  code,
  completion,
  receivedBytes,
  sentBytes,
  ...(retryAfter === undefined ? {} : { retryAfter }),
})

const remotePolicy = (
  config: CasRemoteConfig,
  opId: number,
  code: RemotePolicyError["code"],
  completion: RemotePolicyError["completion"] = "knownUnprocessed",
  attemptId = 1,
  cause?: RemoteProtocolError | RemoteUnavailableError,
): RemotePolicyError => new RemotePolicyError({
  opId,
  attemptId,
  stage: "request",
  authority: config.authority,
  code,
  completion,
  receivedBytes: 0,
  sentBytes: 0,
  ...(cause === undefined ? {} : { cause }),
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
): Effect.Effect<RemoteAdapter, CasRemoteError> => Effect.gen(function* () {
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
    maxKeys = Number.MAX_SAFE_INTEGER,
  ): Effect.Effect<StepOut<ContentId, Uint8Array>> =>
    SynchronizedRef.modify(runtime, (current) => {
      const output = step({
        budgets: { maxBytes, maxKeys },
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
    issue: RemoteIssue,
  ): Effect.Effect<Exchange, CasRemoteError> => {
    const command = issue.command
    const preparedSentBytes = issue._tag === "Publish"
      ? encodeKeyListDocument(issue.closure).length
      : command._tag === "Upload"
      ? command.bytes.length
      : command._tag === "FindMissing"
      ? encodeKeyListDocument(command.keys).length
      : 0
    return Effect.scoped(Effect.gen(function* () {
    const scope = yield* Effect.scope
    const pull = yield* Channel.toPullScoped(
      transport.issue(opId, attemptId, issue),
      scope,
    )
    const chunks: Array<Uint8Array> = []
    let received = 0
    let declared: number | undefined
    let direct: Extract<RemoteWireEvent, { readonly _tag: "Event" }> | undefined
    const controlExpected = command._tag === "ProbeCapabilities"
      ? 8
      : command._tag === "FindMissing"
      ? command.keys.length
      : undefined
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
        const bytes = joinChunks(chunks, received)
        if (command._tag === "Load") {
          const event: Event<ContentId, Uint8Array> = {
            _tag: "Ok",
            declared: declared ?? received,
            bytes,
          }
          return {
            event,
            witness,
          }
        }
        if (command._tag === "ProbeCapabilities") {
          const limits = decodeCapabilityDocument(bytes)
          const event: Event<ContentId, Uint8Array> = Option.isSome(limits)
            ? { _tag: "Capabilities", limits: limits.value }
            : { _tag: "Truncated" }
          return Option.isSome(limits)
            ? { event, witness }
            : { event, protocolCode: "invalidFraming" as const, witness }
        }
        if (command._tag === "FindMissing") {
          const decoded = decodePresenceDocument(command.keys, bytes)
          if (Option.isNone(decoded)) {
            const event: Event<ContentId, Uint8Array> = { _tag: "Truncated" }
            return { event, protocolCode: "invalidFraming" as const, witness }
          }
          const results = command.keys.map((key, index) => {
            switch (decoded.value.statuses[index]) {
              case "missing":
                return { _tag: "Missing" as const, key }
              case "present":
                return { _tag: "Found" as const, key, bytes: new Uint8Array() }
              default:
                return { _tag: "Failed" as const, key }
            }
          })
          const event: Event<ContentId, Uint8Array> = { _tag: "BatchResult", results }
          return { event, presence: decoded.value.presence, witness }
        }
        yield* clearInFlight(opId, { _tag: "Reset" }, config.maxEncodedBytes)
        return yield* remoteProtocol(config, opId, "invalidAcknowledgement", witness, attemptId)
      }

      const wire = next.event
      switch (wire._tag) {
        case "ResponseStarted": {
          declared = wire.declared
          if (controlExpected !== undefined
            && declared !== undefined
            && declared !== controlExpected) {
            yield* clearInFlight(opId, { _tag: "Truncated" }, config.maxDecodedBytes)
            return yield* remoteProtocol(config, opId, "invalidFraming", {
              receivedBytes: 0,
              sentBytes: preparedSentBytes,
              terminalFraming: "reset",
            }, attemptId)
          }
          if (controlExpected === undefined
            && declared !== undefined
            && declared > config.maxDecodedBytes) {
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
          const buffered = received + wire.bytes.length
          if (controlExpected !== undefined) {
            if (buffered > controlExpected) {
              yield* clearInFlight(opId, { _tag: "Truncated" }, config.maxDecodedBytes)
              return yield* remoteProtocol(config, opId, "invalidFraming", {
                receivedBytes: buffered,
                sentBytes: preparedSentBytes,
                terminalFraming: "reset",
              }, attemptId)
            }
            received = buffered
            chunks.push(wire.bytes.slice())
            break
          }
          if (buffered > config.maxQueuedBytes) {
            yield* clearInFlight(opId, { _tag: "Interrupted" }, config.maxDecodedBytes)
            return yield* remoteBudget(
              config,
              opId,
              "queued",
              buffered,
              config.maxQueuedBytes,
              attemptId,
            )
          }
          if (buffered > config.maxDecodedBytes) {
            yield* clearInFlight(opId, {
              _tag: "Ok",
              declared: buffered,
              bytes: new Uint8Array(),
            }, config.maxDecodedBytes)
            return yield* remoteBudget(
              config,
              opId,
              "decoded",
              buffered,
              config.maxDecodedBytes,
              attemptId,
            )
          }
          if (buffered > config.maxDecompressedBytes) {
            yield* clearInFlight(opId, { _tag: "Interrupted" }, config.maxDecodedBytes)
            return yield* remoteBudget(
              config,
              opId,
              "decompressed",
              buffered,
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
        preparedSentBytes,
        attemptId,
      ))),
    )),
    )
  }

  const failureFromExchange = (
    opId: number,
    attemptId: number,
    exchange: Exchange | undefined,
  ): Effect.Effect<never, CasRemoteError> => {
    const witness = exchange?.witness ?? {
      receivedBytes: 0,
      sentBytes: 0,
      terminalFraming: "reset" as const,
    }
    if (exchange?.protocolCode !== undefined) {
      return Effect.fail(remoteProtocol(config, opId, exchange.protocolCode, witness, attemptId))
    }
    switch (exchange?.event._tag) {
      case "Unauthenticated":
      case "Denied":
        return Effect.fail(remoteUnavailable(
          config,
          opId,
          exchange.event._tag === "Denied" ? "denied" : "unauthenticated",
          "possiblyProcessed",
          witness.receivedBytes,
          witness.sentBytes,
          attemptId,
        ))
      case "Redirected":
        return Effect.fail(remotePolicy(config, opId, "redirectDenied", "possiblyProcessed", attemptId))
      case "Silence":
        return Effect.fail(remoteUnavailable(
          config,
          opId,
          "timeout",
          "possiblyProcessed",
          witness.receivedBytes,
          witness.sentBytes,
          attemptId,
        ))
      case "Interrupted":
        return Effect.fail(remoteUnavailable(
          config,
          opId,
          "cancelled",
          "possiblyProcessed",
          witness.receivedBytes,
          witness.sentBytes,
          attemptId,
        ))
      case "RateLimited":
        return Effect.fail(remoteUnavailable(
          config,
          opId,
          "rateLimited",
          "possiblyProcessed",
          witness.receivedBytes,
          witness.sentBytes,
          attemptId,
          exchange.event.retryAfter,
        ))
      case "Capacity":
        return Effect.fail(remoteUnavailable(
          config,
          opId,
          "capacity",
          "possiblyProcessed",
          witness.receivedBytes,
          witness.sentBytes,
          attemptId,
        ))
      default:
        return Effect.fail(remoteUnavailable(
          config,
          opId,
          "connectionReset",
          "possiblyProcessed",
          witness.receivedBytes,
          witness.sentBytes,
          attemptId,
        ))
    }
  }

  const resultError = (
    opId: number,
    attemptId: number,
    result: MResult<ContentId, Uint8Array>,
    exchange: Exchange | undefined,
    budget: {
      readonly stage: RemoteBudgetError["stage"]
      readonly observed: number
      readonly bound: number
    },
  ): Effect.Effect<never, CasRemoteError | ContentNotFound> => {
    const key = "key" in result ? result.key : undefined
    switch (result._tag) {
      case "NotFound":
        return Effect.fail(new ContentNotFound({ id: result.key }))
      case "BudgetRejected":
        return Effect.fail(remoteBudget(
          config,
          opId,
          budget.stage,
          budget.observed,
          budget.bound,
          attemptId,
        ))
      case "IntegrityRejected":
      case "RepeatRefused":
        return Effect.fail(remoteIntegrity(
          config,
          opId,
          "remoteRejected",
          exchange?.witness.receivedBytes ?? 0,
          "admission",
          attemptId,
        ))
      case "AuthFailed": {
        const tag = exchange?.event._tag
        return Effect.fail(remoteUnavailable(
          config,
          opId,
          tag === "Denied" ? "denied" : "unauthenticated",
          "possiblyProcessed",
          exchange?.witness.receivedBytes ?? 0,
          exchange?.witness.sentBytes ?? 0,
          attemptId,
        ))
      }
      case "TransportFailed": {
        return failureFromExchange(opId, attemptId, exchange)
      }
      case "KeyBudgetRejected":
        return Effect.fail(remoteBudget(
          config,
          opId,
          budget.stage,
          budget.observed,
          budget.bound,
          attemptId,
        ))
      case "BatchRejected":
        return Effect.fail(remoteProtocol(
          config,
          opId,
          "batchMisaligned",
          exchange?.witness ?? {
            receivedBytes: 0,
            sentBytes: 0,
            terminalFraming: "complete",
          },
          attemptId,
        ))
      case "BatchFailed":
        return failureFromExchange(opId, attemptId, exchange)
      case "OrderingRefused":
        return Effect.fail(remotePolicy(
          config,
          opId,
          "publishUnconfirmed",
          "knownUnprocessed",
          attemptId,
        ))
      case "PublishFailed":
        return exchange?.event._tag === "IntegrityMismatch"
          ? Effect.fail(remoteIntegrity(
            config,
            opId,
            "remoteRejected",
            exchange.witness.receivedBytes,
            "response",
            attemptId,
          ))
          : failureFromExchange(opId, attemptId, exchange)
      case "DuplicateId":
      case "Absorbed":
        return Effect.die(new Error(`remote machine invariant breach: ${result._tag}`))
      case "Commanded":
      case "Delivered":
      case "Uploaded":
      case "BatchAnswered":
      case "Published":
        return Effect.die(new Error(`remote machine result is not an error: ${result._tag}${key ?? ""}`))
    }
  }

  const remoteResultError = (
    opId: number,
    attemptId: number,
    result: MResult<ContentId, Uint8Array>,
    exchange: Exchange | undefined,
    budget: {
      readonly stage: RemoteBudgetError["stage"]
      readonly observed: number
      readonly bound: number
    },
  ): Effect.Effect<never, CasRemoteError> => resultError(
    opId,
    attemptId,
    result,
    exchange,
    budget,
  ).pipe(Effect.catchTag("CasError/ContentNotFound", (error) => Effect.die(
    new Error(`remote machine produced impossible not-found result for ${error.id}`),
  )))

  const probedCapabilities: RemoteCapabilities | undefined =
    config.authorityMode === "remote-authoritative"
      ? yield* Effect.gen(function* () {
        const opId = yield* allocateOpId
        const exchange = yield* consumeExchange(opId, 1, {
          _tag: "Command",
          command: { _tag: "ProbeCapabilities" },
        })
        if (exchange.event._tag === "Capabilities") return exchange.event.limits
        return yield* failureFromExchange(opId, 1, exchange)
      }).pipe(Effect.withSpan("CasTransfer.Remote.capabilities.probe"))
      : undefined

  const capabilities = probedCapabilities === undefined
    ? allocateOpId.pipe(Effect.flatMap((opId) => Effect.fail(remotePolicy(
      config,
      opId,
      config.authorityMode === "offline" ? "offline" : "authorityMode",
    ))))
    : Effect.succeed(probedCapabilities)

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
      return yield* resultError(opId, attemptId, requested.result, undefined, {
        stage: "encoded",
        observed: bytes.length,
        bound: config.maxEncodedBytes,
      })
    }

    const command = requested.commands[0]?.command
    if (command === undefined || command._tag !== "Upload") {
      return yield* Effect.die(new Error("commanded upload emitted no command"))
    }
    const exchange = yield* consumeExchange(opId, attemptId, {
      _tag: "Command",
      command,
    })
    const rechecked = yield* address.digest(bytes.slice())
    const answered = yield* machineStep({
      _tag: "FromWire",
      id: opId,
      event: exchange.event,
    }, { key, bytes, valid: rechecked === key }, config.maxEncodedBytes)

    if (answered.result._tag !== "Uploaded") {
      return yield* resultError(opId, attemptId, answered.result, exchange, {
        stage: "encoded",
        observed: bytes.length,
        bound: config.maxEncodedBytes,
      })
    }
    const admitted = yield* localStore.put(node)
    if (admitted !== key) {
      return yield* new AddressMismatch({ expected: key, actual: admitted })
    }
    return key
  }).pipe(Effect.onInterrupt(() => clearInFlight(
    opId,
    { _tag: "Interrupted" },
    config.maxEncodedBytes,
  )))

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
      return yield* resultError(opId, 1, requested.result, undefined, {
        stage: "decoded",
        observed: 0,
        bound: config.maxDecodedBytes,
      })
    }

    const command = requested.commands[0]?.command
    if (command === undefined || command._tag !== "Load") {
      return yield* Effect.die(new Error("commanded load emitted no command"))
    }
    const exchange = yield* consumeExchange(opId, 1, {
      _tag: "Command",
      command,
    })

    if (exchange.event._tag !== "Ok") {
      const answered = yield* machineStep({
        _tag: "FromWire",
        id: opId,
        event: exchange.event,
      }, undefined, config.maxDecodedBytes)
      return yield* resultError(opId, 1, answered.result, exchange, {
        stage: "decoded",
        observed: exchange.witness.receivedBytes,
        bound: config.maxDecodedBytes,
      })
    }

    const bytes = exchange.event.bytes
    const decoded = decodeCasNode(bytes)
    if (decoded === undefined || !Equal.equals(encodeCasNode(decoded), bytes)) {
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
      Effect.mapError((error): CasError => error._tag === "CasError/DanglingReference"
        ? new RemoteFailure({ cause: error })
        : error),
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
      return yield* resultError(opId, 1, answered.result, exchange, {
        stage: "decoded",
        observed: bytes.length,
        bound: config.maxDecodedBytes,
      })
    }
    return decoded
  }).pipe(Effect.onInterrupt(() => clearInFlight(
    opId,
    { _tag: "Interrupted" },
    config.maxDecodedBytes,
  )))

  const missing = Effect.fn("CasTransfer.Remote.missing")(function* (
    keys: ReadonlyArray<ContentId>,
  ): Effect.fn.Return<CasPresence, CasRemoteError> {
    const opId = yield* allocateOpId
    return yield* Effect.gen(function* () {
      if (config.authorityMode !== "remote-authoritative") {
        return yield* remotePolicy(
          config,
          opId,
          config.authorityMode === "offline" ? "offline" : "authorityMode",
        )
      }
      const limits = yield* capabilities

      const requested = yield* machineStep({
        _tag: "Request",
        id: opId,
        op: { _tag: "FindMissing", keys },
      }, undefined, config.maxDecodedBytes, limits.maxBatchKeys)
      if (requested.result._tag !== "Commanded") {
        return yield* remoteResultError(opId, 1, requested.result, undefined, {
          stage: "keys",
          observed: keys.length,
          bound: limits.maxBatchKeys,
        })
      }

      const command = requested.commands[0]?.command
      if (command === undefined || command._tag !== "FindMissing") {
        return yield* Effect.die(new Error("commanded find-missing emitted no batch command"))
      }
      const exchange = yield* consumeExchange(opId, 1, {
        _tag: "Command",
        command,
      })
      const answered = yield* machineStep({
        _tag: "FromWire",
        id: opId,
        event: exchange.event,
      }, undefined, config.maxDecodedBytes, limits.maxBatchKeys)
      if (answered.result._tag !== "BatchAnswered" || exchange.event._tag !== "BatchResult") {
        return yield* remoteResultError(opId, 1, answered.result, exchange, {
          stage: "keys",
          observed: keys.length,
          bound: limits.maxBatchKeys,
        })
      }

      if (exchange.presence !== undefined) return exchange.presence
      const present: Array<ContentId> = []
      const absent: Array<ContentId> = []
      const failed: Array<ContentId> = []
      for (const status of exchange.event.results) {
        switch (status._tag) {
          case "Found":
            present.push(status.key)
            break
          case "Missing":
            absent.push(status.key)
            break
          case "Failed":
            failed.push(status.key)
            break
        }
      }
      return { present, missing: absent, failed }
    }).pipe(Effect.onInterrupt(() => clearInFlight(
      opId,
      { _tag: "Interrupted" },
      config.maxDecodedBytes,
    )))
  })

  const publish = Effect.fn("CasTransfer.Remote.publish")(function* (
    root: ContentId,
    closure: ReadonlyArray<ContentId>,
  ): Effect.fn.Return<void, CasRemoteError> {
    const opId = yield* allocateOpId
    return yield* Effect.gen(function* () {
      if (config.authorityMode !== "remote-authoritative") {
        return yield* remotePolicy(
          config,
          opId,
          config.authorityMode === "offline" ? "offline" : "authorityMode",
        )
      }

      const requested = yield* machineStep({
        _tag: "Request",
        id: opId,
        op: { _tag: "PublishRoot", key: root, closure },
      }, undefined, config.maxEncodedBytes)
      if (requested.result._tag !== "Commanded") {
        return yield* remoteResultError(opId, 1, requested.result, undefined, {
          stage: "encoded",
          observed: 4 + 32 * closure.length,
          bound: config.maxEncodedBytes,
        })
      }

      const command = requested.commands[0]?.command
      if (command === undefined || command._tag !== "PublishRoot") {
        return yield* Effect.die(new Error("commanded publish emitted no publish command"))
      }
      const exchange = yield* consumeExchange(opId, 1, {
        _tag: "Publish",
        command,
        closure,
      })
      const answered = yield* machineStep({
        _tag: "FromWire",
        id: opId,
        event: exchange.event,
      }, undefined, config.maxEncodedBytes)
      if (answered.result._tag !== "Published") {
        return yield* remoteResultError(opId, 1, answered.result, exchange, {
          stage: "encoded",
          observed: 4 + 32 * closure.length,
          bound: config.maxEncodedBytes,
        })
      }
    }).pipe(Effect.onInterrupt(() => clearInFlight(
      opId,
      { _tag: "Interrupted" },
      config.maxEncodedBytes,
    )))
  })

  interface LocalGraphEntry {
    readonly id: ContentId
    readonly node: CasNodeInput
    readonly bytes: Uint8Array
  }

  const collectLocalGraph = (
    root: ContentId,
  ): Effect.Effect<ReadonlyArray<LocalGraphEntry>, CasError> => Effect.gen(function* () {
    const seen = new Set<ContentId>()
    const entries: Array<LocalGraphEntry> = []

    const visit = (
      id: ContentId,
      isRoot: boolean,
      resident?: CasNodeInput,
    ): Effect.Effect<void, CasError> => Effect.gen(function* () {
      if (seen.has(id)) return
      const current = resident ?? (yield* localStore.load(id).pipe(
          Effect.mapError((error): CasError => !isRoot && error._tag === "CasError/ContentNotFound"
            ? new DanglingReference({ missing: id })
            : error),
        ))
      seen.add(id)
      for (const ref of current.refs) {
        const child = yield* localStore.load(ref.id).pipe(
          Effect.mapError((error): CasError => error._tag === "CasError/ContentNotFound"
            ? new DanglingReference({ missing: ref.id })
            : error),
        )
        if (child.kind.tag !== ref.expectedTag) {
          return yield* new WrongKindReference({
            ref: ref.id,
            expectedTag: ref.expectedTag,
            actualTag: child.kind.tag,
          })
        }
        if (seen.has(ref.id)) continue
        yield* visit(ref.id, false, child)
      }
      entries.push({ id, node: current, bytes: encodeCasNode(current) })
    })

    yield* visit(root, true)
    return entries
  })

  const push = Effect.fn("CasTransfer.Remote.push")(function* (
    root: ContentId,
  ): Effect.fn.Return<CasPushReport, CasRemoteError | CasError> {
    // Resolve and kind-check the complete local graph before the first
    // operation-specific wire request. Layer capability probing is separate.
    const graph = yield* collectLocalGraph(root)
    const limits = yield* capabilities
    const largestNode = graph.reduce(
      (largest, entry) => Math.max(largest, entry.bytes.length),
      0,
    )
    if (largestNode > limits.maxBlobBytes) {
      return yield* remoteBudget(
        config,
        undefined,
        "encoded",
        largestNode,
        limits.maxBlobBytes,
      )
    }
    const keys = graph.map((entry) => entry.id)
    const present: Array<ContentId> = []
    const absent: Array<ContentId> = []
    const failed: Array<ContentId> = []

    if (limits.maxBatchKeys === 0) {
      yield* missing(keys)
    } else {
      for (let offset = 0; offset < keys.length; offset += limits.maxBatchKeys) {
        const planned = yield* missing(keys.slice(offset, offset + limits.maxBatchKeys))
        present.push(...planned.present)
        absent.push(...planned.missing)
        failed.push(...planned.failed)
      }
    }

    const planned = new Map<ContentId, "present" | "missing" | "failed">()
    for (const key of present) planned.set(key, "present")
    for (const key of absent) planned.set(key, "missing")
    for (const key of failed) planned.set(key, "failed")

    const transferred: Array<ContentId> = []
    const alreadyPresent: Array<ContentId> = []
    for (const entry of graph) {
      const status = planned.get(entry.id)
      if (status === "missing") {
        const opId = yield* allocateOpId
        const confirmed = yield* SynchronizedRef.get(runtime).pipe(
          Effect.map((current) => HashSet.has(current.machine.confirmed, entry.id)),
        )
        if (confirmed) {
          return yield* remoteIntegrity(
            config,
            opId,
            "remoteRejected",
            0,
            "response",
          )
        }
        yield* driveUpload(opId, 1, entry.node, entry.id, entry.bytes)
        transferred.push(entry.id)
      } else if (status === "present") {
        const opId = yield* allocateOpId
        yield* driveLoad(opId, entry.id)
        alreadyPresent.push(entry.id)
      }
    }

    const closure = graph
      .map((entry) => entry.id)
      .filter((id) => id !== root)
    yield* publish(root, closure)
    return { transferred, alreadyPresent }
  })

  const putTransfer = Effect.fn("CasTransfer.Remote.putStream")(function* (
    source: UploadSource,
    options: PutStreamOptions,
  ) {
    const opId = yield* allocateOpId
    let expected = options.expected
    let attemptId = 1

    // The explicit loop preserves attemptId threading and re-consumes a
    // Replayable source for every attempt; a generic retry combinator cannot.
    while (true) {
      const chunks: Array<Uint8Array> = []
      let length = 0

      yield* source.stream.pipe(Stream.runForEach((chunk) => {
        const buffered = length + chunk.length
        if (buffered > config.maxQueuedBytes) {
          return Effect.fail(remoteBudget(
            config,
            opId,
            "queued",
            buffered,
            config.maxQueuedBytes,
            attemptId,
          ))
        }
        if (buffered > config.maxEncodedBytes) {
          return Effect.fail(remoteBudget(
            config,
            opId,
            "encoded",
            buffered,
            config.maxEncodedBytes,
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

      if (config.authorityMode === "offline") {
        return yield* remotePolicy(config, opId, "offline")
      }
      if (config.authorityMode === "local-authoritative") {
        return yield* localStore.put(validated.node)
      }

      const uploaded = yield* driveUpload(
        opId,
        attemptId,
        validated.node,
        validated.id,
        validated.bytes,
      ).pipe(Effect.result)
      if (uploaded._tag === "Success") return uploaded.success

      const retryable = uploaded.failure._tag === "CasRemoteError/Protocol"
        || uploaded.failure._tag === "CasRemoteError/Unavailable"
      if (source._tag === "OneShot" && retryable) {
        return yield* remotePolicy(
          config,
          opId,
          "oneShotRetryRefused",
          uploaded.failure.completion,
          attemptId,
          uploaded.failure,
        )
      }
      if (!retryable || attemptId >= config.maxAttempts) {
        return yield* Effect.fail(uploaded.failure)
      }
      attemptId += 1
    }
  })

  const put = Effect.fn("CasStore.Remote.put")(function* (input: CasNodeInput) {
    const opId = yield* allocateOpId
    const validated = yield* validateUploadNode(input)
    if (config.authorityMode === "offline") {
      return yield* Effect.fail(wrapRemoteFailure(remotePolicy(config, opId, "offline")))
    }
    if (config.authorityMode === "local-authoritative") {
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
    const node = yield* load(id).pipe(
      Effect.mapError((error): CasError | CasRemoteError => error._tag === "CasError/RemoteFailure"
        ? error.cause
        : error),
    )
    const bytes = encodeCasNode(node)
    if (bytes.length > config.maxDecodedBytes) {
      return yield* remoteBudget(config, undefined, "decoded", bytes.length, config.maxDecodedBytes)
    }
    return Stream.succeed(bytes)
  })

  const snapshot = SynchronizedRef.get(runtime).pipe(Effect.map((current) => ({
    decisions: current.decisions,
    cacheSize: HashSet.size(current.machine.cache),
    confirmedSize: HashSet.size(current.machine.confirmed),
    inFlightSize: HashMap.size(current.machine.inFlight),
    publishedSize: HashSet.size(current.machine.published),
    rejectedSize: HashSet.size(current.machine.rejected),
    reportedMissingSize: HashSet.size(current.machine.reportedMissing),
    reportedPresentSize: HashSet.size(current.machine.reportedPresent),
  })))

  return {
    store: { put, load },
    transfer: {
      capabilities,
      missing,
      publish,
      push,
      putStream: putTransfer,
      loadStream,
    },
    snapshot,
  }
})
