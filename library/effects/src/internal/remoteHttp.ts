/** Real HttpClient realization of the project-owned cas-http/0 profile. */
import { Cause, Channel, Effect, Stream } from "effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import type * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import type { CasRemoteConfig } from "../cas/Remote.ts"
import type { ContentId } from "../cas/Node.ts"
import type { Command, Event } from "./remoteMachine.ts"
import type {
  CompletionWitness,
  RemoteCasTransport,
  RemoteTransportFailure,
  RemoteWireEvent,
} from "./remoteTransport.ts"

const PROFILE = "cas-http/0"

const transportFailure = (
  sentBytes: number,
): RemoteTransportFailure => ({
  _tag: "RemoteTransportFailure",
  code: "connectionFailed",
  completion: sentBytes === 0 ? "knownUnprocessed" : "possiblyProcessed",
  receivedBytes: 0,
  sentBytes,
})

const terminal = (
  receivedBytes: number,
  sentBytes: number,
  terminalFraming: CompletionWitness["terminalFraming"] = "complete",
): CompletionWitness => ({ receivedBytes, sentBytes, terminalFraming })

const finishAfter = (
  event: RemoteWireEvent,
  witness: CompletionWitness,
): Channel.Channel<RemoteWireEvent, never, CompletionWitness> =>
  Channel.succeed(event).pipe(
    Channel.concatWith(() => Channel.fromEffectDone(Effect.succeed(witness))),
  )

const parseContentLength = (
  value: string | undefined,
): number | undefined | "invalid" => {
  if (value === undefined) return undefined
  if (!/^(0|[1-9][0-9]*)$/.test(value)) return "invalid"
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : "invalid"
}

const responseEvent = (
  event: Event<ContentId, Uint8Array>,
  sentBytes: number,
  protocolCode?: Extract<RemoteWireEvent, { readonly _tag: "Event" }>["protocolCode"],
) => finishAfter(
  protocolCode === undefined
    ? { _tag: "Event", event }
    : { _tag: "Event", event, protocolCode },
  terminal(0, sentBytes),
)

const loadResponse = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
): Channel.Channel<RemoteWireEvent, RemoteTransportFailure, CompletionWitness> => {
  if (response.status === 404) return responseEvent({ _tag: "Absent" }, sentBytes)
  if (response.status === 401) return responseEvent({ _tag: "Unauthenticated" }, sentBytes)
  if (response.status === 403) return responseEvent({ _tag: "Denied" }, sentBytes)
  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers["retry-after"] ?? "0", 10)
    return responseEvent({
      _tag: "RateLimited",
      retryAfter: Number.isSafeInteger(retryAfter) && retryAfter >= 0 ? retryAfter : 0,
    }, sentBytes)
  }
  if (response.status >= 300 && response.status < 400) {
    return responseEvent({ _tag: "Redirected" }, sentBytes)
  }
  if (response.status !== 200) {
    return responseEvent({ _tag: "Reset" }, sentBytes, "invalidStatus")
  }

  const contentType = response.headers["content-type"]
  const declared = parseContentLength(response.headers["content-length"])
  if (declared === "invalid"
    || contentType === undefined
    || !contentType.toLowerCase().startsWith("application/octet-stream")) {
    return responseEvent({ _tag: "Reset" }, sentBytes, "invalidHeaders")
  }

  let receivedBytes = 0
  let framing: CompletionWitness["terminalFraming"] = "complete"
  const body = response.stream.pipe(
    Stream.map((bytes): RemoteWireEvent => {
      receivedBytes += bytes.length
      return { _tag: "BodyChunk", bytes }
    }),
    Stream.catchCause(
      (cause) => {
        if (Cause.hasInterrupts(cause)) {
          return Stream.fromEffect(Effect.failCause(cause))
        }
        framing = "truncated"
        return Stream.succeed<RemoteWireEvent>({
          _tag: "Event",
          event: { _tag: "Truncated" },
          protocolCode: "truncatedBody",
        })
      },
    ),
  )

  const started: RemoteWireEvent = declared === undefined
    ? { _tag: "ResponseStarted" }
    : { _tag: "ResponseStarted", declared }
  const bodyChannel = Channel.flattenArray(body.channel).pipe(
    Channel.mapError(() => transportFailure(sentBytes)),
    Channel.concatWith(() => Channel.fromEffectDone(Effect.sync(() =>
      terminal(receivedBytes, sentBytes, framing)
    ))),
  )
  return Channel.succeed(started).pipe(Channel.concatWith(() => bodyChannel))
}

const uploadResponse = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
): Channel.Channel<RemoteWireEvent, never, CompletionWitness> => {
  if (response.status === 200 || response.status === 201 || response.status === 204) {
    return responseEvent({ _tag: "Ok", declared: 0, bytes: new Uint8Array() }, sentBytes)
  }
  if (response.status === 409) {
    return responseEvent({ _tag: "IntegrityMismatch" }, sentBytes)
  }
  if (response.status === 401) return responseEvent({ _tag: "Unauthenticated" }, sentBytes)
  if (response.status === 403) return responseEvent({ _tag: "Denied" }, sentBytes)
  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers["retry-after"] ?? "0", 10)
    return responseEvent({
      _tag: "RateLimited",
      retryAfter: Number.isSafeInteger(retryAfter) && retryAfter >= 0 ? retryAfter : 0,
    }, sentBytes)
  }
  if (response.status >= 300 && response.status < 400) {
    return responseEvent({ _tag: "Redirected" }, sentBytes)
  }
  return responseEvent({ _tag: "Reset" }, sentBytes, "invalidStatus")
}

const commandRequest = (
  config: CasRemoteConfig,
  command: Command<ContentId, Uint8Array>,
): { readonly request: HttpClientRequest.HttpClientRequest; readonly sentBytes: number } | undefined => {
  if (command._tag !== "Load" && command._tag !== "Upload") return undefined
  const url = `${config.authority}/cas/${command.key}`
  let request = command._tag === "Load"
    ? HttpClientRequest.get(url)
    : HttpClientRequest.put(url).pipe(HttpClientRequest.bodyUint8Array(
      command.bytes,
      "application/octet-stream",
    ))
  request = request.pipe(
    HttpClientRequest.setHeader("accept", "application/octet-stream"),
    HttpClientRequest.setHeader("cas-profile", PROFILE),
  )
  if (config.credentials !== undefined) {
    request = HttpClientRequest.bearerToken(request, config.credentials)
  }
  return {
    request,
    sentBytes: command._tag === "Upload" ? command.bytes.length : 0,
  }
}

/**
 * Build a single-attempt transport over the caller-provided HttpClient. No
 * redirect or retry combinator is applied; both remain observable machine
 * decisions.
 */
export const makeRemoteHttp = (
  config: CasRemoteConfig,
): Effect.Effect<RemoteCasTransport, never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const client = HttpClient.withScope(yield* HttpClient.HttpClient)

    return {
      issue: (_opId, _attemptId, command) => {
        const prepared = commandRequest(config, command)
        if (prepared === undefined) {
          return Channel.fromEffectDone(Effect.fail(transportFailure(0)))
        }

        return Channel.unwrap(
          client.execute(prepared.request).pipe(
            Effect.mapError(() => transportFailure(prepared.sentBytes)),
            Effect.map((response) => command._tag === "Load"
              ? loadResponse(response, prepared.sentBytes)
              : uploadResponse(response, prepared.sentBytes)),
          ),
        )
      },
    }
  })
