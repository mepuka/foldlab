/**
 * The cas-http/0 server core: one total function from request to
 * response, built over exactly two services — the byte backend and the
 * platform Crypto — with the shared admission law judging every upload.
 *
 * This is the profile's server side given a real home: the status
 * table, profile-header refusal, exact media types, closed-empty
 * acknowledgments, and full PUT admission (canonical decode, known
 * kind, reference closure, size budget, digest equality) — the checks
 * the informal test peer skipped. Server-side closure verification on
 * publish, optional at `/0`, is enforced here.
 *
 * The factoring is the interaction-tree shape deliberately: the
 * dispatcher emits backend events (load, put, presence, publish) and
 * pure judgments between them, so a deployment topology is a choice of
 * backend interpretation, never a rewrite of the law. Authentication
 * follows §9 — an opaque bearer per authority, constant-time compared,
 * with the principal passed explicitly to every semantic operation.
 */
import { Effect, Option, Redacted } from "effect"
import {
  HttpServerRequest,
  HttpServerResponse,
} from "effect/unstable/http"
import { ContentId } from "../cas/Node.ts"
import { makeSha256Address } from "../cas/Store.ts"
import { canonicalNode, judgeAdmission, kindTagOfCanonical } from "../internal/admission.ts"
import type { AdmissionFacts } from "../internal/admission.ts"
import {
  decodeKeyListDocument,
  encodeCapabilityDocument,
  encodePresenceDocument,
} from "../internal/remoteControl.ts"
import { CasServerBackend } from "./Backend.ts"
import type { Crypto } from "effect"

export interface CasServerPolicy {
  /** Published as the capability document's `maxBatchKeys`. */
  readonly maxBatchKeys: number
  /** Published as the capability document's second field: the maximum
   * canonical node body accepted, enforced as the 413 bound. */
  readonly maxNodeBytes: number
  /** The opaque bearer credential for this authority. Absent means an
   * open instance. */
  readonly credential?: Redacted.Redacted<string> | undefined
  /** Whether reads (load, capabilities, presence) are served without a
   * credential when one is configured. Writes always require it. */
  readonly anonymousReads?: boolean | undefined
}

/** The authenticated principal, passed explicitly to every semantic
 * operation per §9. */
export type Principal =
  | { readonly _tag: "Anonymous" }
  | { readonly _tag: "Bearer" }

const octetStream = "application/octet-stream"
const utf8 = new TextEncoder()

/** Constant-time byte comparison over the UTF-8 encodings — no early
 * exit, length folded into the accumulator. */
const constantTimeEquals = (left: string, right: string): boolean => {
  const a = utf8.encode(left)
  const b = utf8.encode(right)
  let acc = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    acc |= (a[index] ?? 0) ^ (b[index] ?? 0)
  }
  return acc === 0
}

type Authentication =
  | { readonly _tag: "Ok"; readonly principal: Principal }
  | { readonly _tag: "Unauthenticated" }

const authenticate = (
  policy: CasServerPolicy,
  authorization: string | undefined,
): Authentication => {
  if (authorization === undefined) return { _tag: "Ok", principal: { _tag: "Anonymous" } }
  if (!authorization.startsWith("Bearer ")) return { _tag: "Unauthenticated" }
  if (policy.credential === undefined) return { _tag: "Unauthenticated" }
  return constantTimeEquals(
    authorization.slice("Bearer ".length),
    Redacted.value(policy.credential),
  )
    ? { _tag: "Ok", principal: { _tag: "Bearer" } }
    : { _tag: "Unauthenticated" }
}

const authorized = (
  policy: CasServerPolicy,
  principal: Principal,
  operation: "read" | "write",
): boolean => {
  if (policy.credential === undefined) return true
  if (principal._tag === "Bearer") return true
  return operation === "read" && policy.anonymousReads === true
}

const status = (code: number): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.empty({ status: code })

const bytesResponse = (
  bytes: Uint8Array,
  code = 200,
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.uint8Array(bytes, { status: code, contentType: octetStream })

const casPath = /^\/cas\/([0-9a-f]{64})$/
const rootsPath = /^\/roots\/([0-9a-f]{64})$/

/** Build the per-request server effect once over the resolved backend
 * and digest path. The returned effect is TOTAL — every refusal is a
 * response from the profile's status table, never an error. */
export const makeCasHttpApp = (
  policy: CasServerPolicy,
): Effect.Effect<
  Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    never,
    HttpServerRequest.HttpServerRequest
  >,
  never,
  CasServerBackend | Crypto.Crypto
> => Effect.gen(function* () {
  const backend = yield* CasServerBackend
  const address = yield* makeSha256Address

  const requestBody = (
    request: HttpServerRequest.HttpServerRequest,
  ): Effect.Effect<Uint8Array, never> =>
    request.arrayBuffer.pipe(
      Effect.map((buffer) => new Uint8Array(buffer)),
      Effect.orElseSucceed(() => new Uint8Array(0)),
    )

  const admissionFacts = Effect.fn("CasServer.admissionFacts")(function* (
    id: ContentId,
    refs: ReadonlyArray<{ readonly id: ContentId }>,
  ) {
    const refTags: Array<Option.Option<number>> = []
    for (const ref of refs) {
      const resident = yield* backend.loadBytes(ref.id)
      refTags.push(Option.map(resident, kindTagOfCanonical))
    }
    const resident = yield* backend.loadBytes(id)
    const facts: AdmissionFacts = { refTags, resident }
    return facts
  })

  const handleLoad = Effect.fn("CasServer.load")(function* (
    _principal: Principal,
    id: ContentId,
  ) {
    const resident = yield* backend.loadBytes(id)
    return Option.isNone(resident) ? status(404) : bytesResponse(resident.value)
  })

  const handleUpload = Effect.fn("CasServer.upload")(function* (
    _principal: Principal,
    id: ContentId,
    body: Uint8Array,
  ) {
    if (body.length > policy.maxNodeBytes) return status(413)
    const actual = yield* address.digest(body.slice()).pipe(
      Effect.map(Option.some),
      Effect.orElseSucceed(() => Option.none<ContentId>()),
    )
    if (Option.isNone(actual) || actual.value !== id) return status(409)
    const decoded = canonicalNode(body)
    if (Option.isNone(decoded)) return status(409)
    const verdict = judgeAdmission(
      body,
      yield* admissionFacts(id, decoded.value.refs),
    )
    switch (verdict._tag) {
      case "Admit":
        yield* backend.putBytes(id, body)
        return status(201)
      case "AlreadyResident":
        return status(200)
      default:
        return status(409)
    }
  })

  const handleMissing = Effect.fn("CasServer.missing")(function* (
    _principal: Principal,
    body: Uint8Array,
  ) {
    const keys = decodeKeyListDocument(body)
    if (Option.isNone(keys)) return status(400)
    if (keys.value.length > policy.maxBatchKeys) return status(413)
    const statuses = yield* backend.presence(keys.value)
    return bytesResponse(encodePresenceDocument(statuses))
  })

  const handlePublish = Effect.fn("CasServer.publish")(function* (
    _principal: Principal,
    root: ContentId,
    body: Uint8Array,
  ) {
    const closure = decodeKeyListDocument(body)
    if (Option.isNone(closure)) return status(400)
    // Server-side closure verification — optional at /0, enforced here:
    // the root and every declared closure key must be admitted content.
    const held = yield* backend.presence([root, ...closure.value])
    if (held.some((presence) => presence !== "present")) return status(409)
    yield* backend.publishRoot(root)
    return status(204)
  })

  return Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    if (request.headers["cas-profile"] !== "cas-http/0") return status(400)

    const authentication = authenticate(policy, request.headers["authorization"])
    if (authentication._tag === "Unauthenticated") return status(401)
    const principal = authentication.principal
    const requireAuthorized = (operation: "read" | "write") =>
      authorized(policy, principal, operation)

    const path = request.url.split("?")[0] ?? request.url

    if (path === "/control/capabilities") {
      if (request.method !== "GET") return status(405)
      if (!requireAuthorized("read")) return status(401)
      return bytesResponse(encodeCapabilityDocument({
        maxBatchKeys: policy.maxBatchKeys,
        maxBlobBytes: policy.maxNodeBytes,
      }))
    }

    if (path === "/control/missing") {
      if (request.method !== "POST") return status(405)
      if (request.headers["content-type"] !== octetStream) return status(400)
      if (!requireAuthorized("read")) return status(401)
      return yield* handleMissing(principal, yield* requestBody(request))
    }

    const rootMatch = rootsPath.exec(path)
    if (rootMatch?.[1] !== undefined) {
      if (request.method !== "PUT") return status(405)
      if (request.headers["content-type"] !== octetStream) return status(400)
      if (!requireAuthorized("write")) return status(401)
      return yield* handlePublish(
        principal,
        ContentId.make(rootMatch[1]),
        yield* requestBody(request),
      )
    }

    const casMatch = casPath.exec(path)
    if (casMatch?.[1] !== undefined) {
      const id = ContentId.make(casMatch[1])
      if (request.method === "GET") {
        if (!requireAuthorized("read")) return status(401)
        return yield* handleLoad(principal, id)
      }
      if (request.method === "PUT") {
        if (request.headers["content-type"] !== octetStream) return status(400)
        if (!requireAuthorized("write")) return status(401)
        return yield* handleUpload(principal, id, yield* requestBody(request))
      }
      return status(405)
    }

    return status(400)
  }).pipe(
    // A backend that cannot answer is the capacity class, never an
    // admission verdict.
    Effect.catchTag("CasServerBackendFailure", () => Effect.succeed(status(503))),
  )
})
