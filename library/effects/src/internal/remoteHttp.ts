/** Real HttpClient realization of the project-owned cas-http/0 profile. */
import { Channel, Effect, Option, Schema, SchemaGetter, Stream } from "effect"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
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
  error: HttpClientError.HttpClientError,
  preparedBytes: number,
  receivedBytes = 0,
): RemoteTransportFailure => {
  if (error.reason._tag === "EncodeError" || error.reason._tag === "InvalidUrlError") {
    return {
      _tag: "RemoteTransportFailure",
      code: "connectionFailed",
      completion: "knownUnprocessed",
      receivedBytes: 0,
      sentBytes: 0,
    }
  }
  const cause = "cause" in error.reason ? error.reason.cause : undefined
  const causeCode = typeof cause === "object" && cause !== null && "code" in cause
    ? cause.code
    : undefined
  const causeName = typeof cause === "object" && cause !== null && "name" in cause
    ? cause.name
    : undefined
  const code: RemoteTransportFailure["code"] = causeCode === "ECONNRESET"
    ? "connectionReset"
    : causeCode === "ETIMEDOUT"
    ? "timeout"
    : causeName === "AbortError"
    ? "cancelled"
    : "connectionFailed"
  return {
    _tag: "RemoteTransportFailure",
    code,
    completion: "possiblyProcessed",
    receivedBytes,
    // Fetch does not expose transmitted byte counts. On its transport-error
    // path this is the conservative prepared-byte witness, never the error.
    sentBytes: preparedBytes,
  }
}

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

const NonNegativeIntegerHeader = Schema.String.check(
  Schema.isPattern(/^(0|[1-9][0-9]*)$/),
).pipe(
  Schema.decodeTo(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    {
      decode: SchemaGetter.transform((value) => Number(value)),
      encode: SchemaGetter.transform((value) => String(value)),
    },
  ),
)

const parseNonNegativeInteger = (value: string | undefined): number | undefined | "invalid" => {
  if (value === undefined) return undefined
  const decoded = Schema.decodeUnknownOption(NonNegativeIntegerHeader)(value)
  return Option.isSome(decoded) && Number.isSafeInteger(decoded.value) ? decoded.value : "invalid"
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

const rateLimitedEvent = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
) => {
  const retryAfter = parseNonNegativeInteger(response.headers["retry-after"])
  return responseEvent({
    _tag: "RateLimited",
    retryAfter: typeof retryAfter === "number" ? retryAfter : 0,
  }, sentBytes)
}

const sharedStatusCases = (sentBytes: number) => ({
  401: () => responseEvent({ _tag: "Unauthenticated" }, sentBytes),
  403: () => responseEvent({ _tag: "Denied" }, sentBytes),
  429: (limited: HttpClientResponse.HttpClientResponse) => rateLimitedEvent(limited, sentBytes),
  "3xx": () => responseEvent({ _tag: "Redirected" }, sentBytes),
})

const loadResponse = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
): Channel.Channel<RemoteWireEvent, RemoteTransportFailure, CompletionWitness> => {
  const selected = HttpClientResponse.matchStatus(response, {
    ...sharedStatusCases(sentBytes),
    200: () => undefined,
    404: () => responseEvent({ _tag: "Absent" }, sentBytes),
    orElse: () => responseEvent({ _tag: "Reset" }, sentBytes, "invalidStatus"),
  })
  if (selected !== undefined) return selected

  const contentType = response.headers["content-type"]
  const declared = parseNonNegativeInteger(response.headers["content-length"])
  const mediaType = contentType?.split(";", 1)[0]?.trim()
  if (declared === "invalid"
    || contentType === undefined
    || mediaType !== "application/octet-stream") {
    return responseEvent({ _tag: "Reset" }, sentBytes, "invalidHeaders")
  }

  let receivedBytes = 0
  let framing: CompletionWitness["terminalFraming"] = "complete"
  const body = response.stream.pipe(
    Stream.map((bytes): RemoteWireEvent => {
      receivedBytes += bytes.length
      return { _tag: "BodyChunk", bytes }
    }),
    Stream.catchTag("HttpClientError", () => {
      framing = "truncated"
      return Stream.succeed<RemoteWireEvent>({
        _tag: "Event",
        event: { _tag: "Truncated" },
        protocolCode: "truncatedBody",
      })
    }),
  )

  const started: RemoteWireEvent = declared === undefined
    ? { _tag: "ResponseStarted" }
    : { _tag: "ResponseStarted", declared }
  const bodyChannel = Channel.flattenArray(body.channel).pipe(
    Channel.mapError((error) => transportFailure(error, sentBytes, receivedBytes)),
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
  return HttpClientResponse.matchStatus(response, {
    ...sharedStatusCases(sentBytes),
    200: () => responseEvent({ _tag: "Ok", declared: 0, bytes: new Uint8Array() }, sentBytes),
    201: () => responseEvent({ _tag: "Ok", declared: 0, bytes: new Uint8Array() }, sentBytes),
    204: () => responseEvent({ _tag: "Ok", declared: 0, bytes: new Uint8Array() }, sentBytes),
    409: () => responseEvent({ _tag: "IntegrityMismatch" }, sentBytes),
    orElse: () => responseEvent({ _tag: "Reset" }, sentBytes, "invalidStatus"),
  })
}

const commandRequest = (
  config: CasRemoteConfig,
  command: Extract<Command<ContentId, Uint8Array>, { readonly _tag: "Load" | "Upload" }>,
): { readonly request: HttpClientRequest.HttpClientRequest; readonly sentBytes: number } => {
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
 * Build a single-attempt transport over the caller-provided HttpClient.
 * Redirects are forced to manual observation here; redirectPolicy is
 * validated configuration whose bounded following semantics arrive in R4.
 * No retry combinator is applied, so attempts remain machine decisions.
 */
export const makeRemoteHttp = (
  config: CasRemoteConfig,
): Effect.Effect<RemoteCasTransport, never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const client = HttpClient.withScope(yield* HttpClient.HttpClient)

    return {
      issue: (_opId, _attemptId, command) => {
        if (command._tag !== "Load" && command._tag !== "Upload") {
          return Channel.fromEffectDone(Effect.die(
            new Error(`remote HTTP transport received impossible command: ${command._tag}`),
          ))
        }
        const prepared = commandRequest(config, command)

        return Channel.unwrap(
          client.execute(prepared.request).pipe(
            Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
            Effect.mapError((error) => transportFailure(error, prepared.sentBytes)),
            Effect.map((response) => command._tag === "Load"
              ? loadResponse(response, prepared.sentBytes)
              : uploadResponse(response, prepared.sentBytes)),
          ),
        )
      },
    }
  })
