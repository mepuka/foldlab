/** Real HttpClient realization of the project-owned cas-http/0 profile. */
import { Channel, Effect, Option, Schema, SchemaGetter, Stream } from "effect"
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient"
import * as HttpClient from "effect/unstable/http/HttpClient"
import type * as HttpClientError from "effect/unstable/http/HttpClientError"
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest"
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse"
import type { CasRemoteConfig } from "../cas/Remote.ts"
import type { ContentId } from "../cas/Node.ts"
import { encodeKeyListDocument } from "./remoteControl.ts"
import type { Event } from "./remoteMachine.ts"
import type {
  CompletionWitness,
  RemoteCasTransport,
  RemoteIssue,
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
  let current: unknown = "cause" in error.reason ? error.reason.cause : undefined
  let causeCode: unknown
  let causeName: unknown
  for (let depth = 0; depth < 2 && typeof current === "object" && current !== null; depth += 1) {
    if (causeCode === undefined && "code" in current) causeCode = current.code
    if (causeName === undefined && "name" in current) causeName = current.name
    current = "cause" in current ? current.cause : undefined
  }
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

const unsupportedContentEncoding = (value: string | undefined): boolean =>
  value !== undefined && value.split(",").some((coding) =>
    coding.trim().toLowerCase() !== "identity")

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
  return responseEvent(
    typeof retryAfter === "number"
      ? { _tag: "RateLimited", retryAfter }
      : { _tag: "RateLimited" },
    sentBytes,
  )
}

const sharedStatusCases = (sentBytes: number) => ({
  401: () => responseEvent({ _tag: "Unauthenticated" }, sentBytes),
  403: () => responseEvent({ _tag: "Denied" }, sentBytes),
  429: (limited: HttpClientResponse.HttpClientResponse) => rateLimitedEvent(limited, sentBytes),
  503: () => responseEvent({ _tag: "Capacity" }, sentBytes),
  507: () => responseEvent({ _tag: "Capacity" }, sentBytes),
  "3xx": () => responseEvent({ _tag: "Redirected" }, sentBytes),
})

const binaryBody = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
): Channel.Channel<RemoteWireEvent, RemoteTransportFailure, CompletionWitness> => {
  const contentType = response.headers["content-type"]
  const contentEncoding = response.headers["content-encoding"]
  const declared = parseNonNegativeInteger(response.headers["content-length"])
  if (declared === "invalid"
    || contentType !== "application/octet-stream"
    || unsupportedContentEncoding(contentEncoding)) {
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
    Channel.concatWith(() => Channel.fromEffectDone(Effect.sync(() =>
      terminal(receivedBytes, sentBytes, framing)
    ))),
  )
  return Channel.succeed(started).pipe(Channel.concatWith(() => bodyChannel))
}

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
  return selected === undefined ? binaryBody(response, sentBytes) : selected
}

const controlResponse = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
  acceptsPayloadTooLarge: boolean,
): Channel.Channel<RemoteWireEvent, RemoteTransportFailure, CompletionWitness> => {
  const selected = HttpClientResponse.matchStatus(response, {
    ...sharedStatusCases(sentBytes),
    200: () => undefined,
    ...(acceptsPayloadTooLarge
      ? { 413: () => responseEvent({ _tag: "Capacity" }, sentBytes) }
      : {}),
    orElse: () => responseEvent({ _tag: "Reset" }, sentBytes, "invalidStatus"),
  })
  return selected === undefined ? binaryBody(response, sentBytes) : selected
}

const emptyAcknowledgement = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
): Channel.Channel<RemoteWireEvent, RemoteTransportFailure, CompletionWitness> => {
  const declared = parseNonNegativeInteger(response.headers["content-length"])
  const contentType = response.headers["content-type"]
  const contentEncoding = response.headers["content-encoding"]
  if (declared === "invalid"
    || (contentType !== undefined && contentType !== "application/octet-stream")
    || unsupportedContentEncoding(contentEncoding)) {
    return responseEvent({ _tag: "Reset" }, sentBytes, "invalidHeaders")
  }
  if (declared !== undefined && declared !== 0) {
    return responseEvent({ _tag: "Truncated" }, sentBytes, "unexpectedBody")
  }

  return Channel.unwrap(response.stream.pipe(
    Stream.runHead,
    Effect.mapError((error) => transportFailure(error, sentBytes)),
    Effect.map((head) => Option.isNone(head)
      ? responseEvent({ _tag: "Ok", declared: 0, bytes: new Uint8Array() }, sentBytes)
      : finishAfter(
        {
          _tag: "Event",
          event: { _tag: "Truncated" },
          protocolCode: "unexpectedBody",
        },
        terminal(head.value.length, sentBytes),
      )),
  ))
}

const acknowledgementResponse = (
  response: HttpClientResponse.HttpClientResponse,
  sentBytes: number,
): Channel.Channel<RemoteWireEvent, RemoteTransportFailure, CompletionWitness> =>
  HttpClientResponse.matchStatus(response, {
    ...sharedStatusCases(sentBytes),
    200: (accepted) => emptyAcknowledgement(accepted, sentBytes),
    201: (accepted) => emptyAcknowledgement(accepted, sentBytes),
    // RFC 9110 defines 204 as terminating at the header section: it cannot
    // carry content, so there is no response stream to decode.
    204: () => responseEvent({ _tag: "Ok", declared: 0, bytes: new Uint8Array() }, sentBytes),
    409: () => responseEvent({ _tag: "IntegrityMismatch" }, sentBytes),
    orElse: () => responseEvent({ _tag: "Reset" }, sentBytes, "invalidStatus"),
  })

const commandRequest = (
  config: CasRemoteConfig,
  issue: RemoteIssue,
): { readonly request: HttpClientRequest.HttpClientRequest; readonly sentBytes: number } => {
  let request: HttpClientRequest.HttpClientRequest
  let sentBytes = 0
  if (issue._tag === "Publish") {
    const body = encodeKeyListDocument(issue.closure)
    sentBytes = body.length
    request = HttpClientRequest.put(`${config.authority}/roots/${issue.command.key}`).pipe(
      HttpClientRequest.bodyUint8Array(body, "application/octet-stream"),
    )
  } else {
    const command = issue.command
    switch (command._tag) {
      case "ProbeCapabilities":
        request = HttpClientRequest.get(`${config.authority}/control/capabilities`)
        break
      case "Load":
        request = HttpClientRequest.get(`${config.authority}/cas/${command.key}`)
        break
      case "FindMissing": {
        const body = encodeKeyListDocument(command.keys)
        sentBytes = body.length
        request = HttpClientRequest.post(`${config.authority}/control/missing`).pipe(
          HttpClientRequest.bodyUint8Array(body, "application/octet-stream"),
        )
        break
      }
      case "Upload":
        sentBytes = command.bytes.length
        request = HttpClientRequest.put(`${config.authority}/cas/${command.key}`).pipe(
          HttpClientRequest.bodyUint8Array(command.bytes, "application/octet-stream"),
        )
        break
    }
  }
  request = request.pipe(
    HttpClientRequest.setHeader("accept", "application/octet-stream"),
    HttpClientRequest.setHeader("cas-profile", PROFILE),
  )
  if (config.credentials !== undefined) {
    request = HttpClientRequest.bearerToken(request, config.credentials)
  }
  return {
    request,
    sentBytes,
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
      issue: (_opId, _attemptId, issue) => {
        const command = issue.command
        const prepared = commandRequest(config, issue)

        return Channel.unwrap(
          client.execute(prepared.request).pipe(
            Effect.provideService(FetchHttpClient.RequestInit, { redirect: "manual" }),
            Effect.mapError((error) => transportFailure(error, prepared.sentBytes)),
            Effect.map((response) => {
              const expectedOrigin = new URL(config.authority).origin
              const responseOrigin = new URL(response.request.url).origin
              if (responseOrigin !== expectedOrigin) {
                return responseEvent(
                  { _tag: "Reset" },
                  prepared.sentBytes,
                  "invalidHeaders",
                )
              }
              switch (command._tag) {
                case "ProbeCapabilities":
                  return controlResponse(response, prepared.sentBytes, false)
                case "Load":
                  return loadResponse(response, prepared.sentBytes)
                case "FindMissing":
                  return controlResponse(response, prepared.sentBytes, true)
                case "Upload":
                  return acknowledgementResponse(response, prepared.sentBytes)
                case "PublishRoot":
                  return acknowledgementResponse(response, prepared.sentBytes)
              }
            }),
          ),
        )
      },
    }
  })
