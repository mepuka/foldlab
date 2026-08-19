/**
 * Plane: surface — entry points.
 *
 * The read-side face: the planes served over HTTP, and no write anywhere.
 *
 * ## What this is
 *
 * A watching human or a user interface needs to SEE the estate — which
 * connections stand where, what a lane has carried, what a register observed,
 * where a cell has got to, how a store's incarnations succeeded one another,
 * and what is happening right now. Every one of those is already a read of a
 * plane. This module is those reads projected onto HTTP and nothing else: it
 * mints no fact, admits no candidate, and holds no state of its own.
 *
 * ## Writes stay at the door
 *
 * There is no write endpoint here and there is no seam for one to enter
 * through. Judgment routes through kernel admission, admission is reached
 * through the engine, and the engine is reached through the agent face — one
 * door, and this face is not it. That is visible in the type rather than
 * promised in prose: nothing below requires the engine, the emit service, or
 * the door's admission function, so a handler that wanted to land a fact would
 * have to grow a requirement a reviewer reads in the signature. A request
 * carrying a write verb is answered with the taught refusal and the methods
 * this face carries, never with a partial write.
 *
 * ## Served bytes are the value's own bytes
 *
 * Every answer is the RFC 8785 canonical encoding of one wire value, produced
 * by the package's one canonicalizer. Nothing here shapes JSON by hand: a
 * handler reads a plane, wraps that read in a value naming what it is and which
 * bound it was taken under, and hands the value to `canonicalBytes`. So the
 * bytes a reader receives are the bytes that value has anywhere else in the
 * estate, and a digest taken over a served payload is the digest of the value —
 * which is what makes a served answer quotable rather than merely readable.
 *
 * Each read answers the same shape: `v` and `kind` naming the value, the
 * coordinates the read was taken at, and exactly ONE member carrying the plane
 * read verbatim. The plane's own value is never re-shaped on the way out; a
 * flattened or renamed projection would be the twin the discipline refuses.
 *
 * ## Every collection is bounded
 *
 * A tail takes a limit with a default and a ceiling, and the admitted limit
 * rides in the answer, so a reader can tell a short answer from a clipped one.
 * The incarnation walk is bounded too, and refuses rather than truncating when
 * a chain runs past it. There is no spelling on this face that reads a whole
 * lane.
 *
 * ## The live read is transport, not accumulation
 *
 * The change stream is a Server-Sent Events response over the estate's own
 * change stream: one frame per landed fact, written as the fact reaches this
 * process. Nothing is collected and no stage holds more than one element — the
 * first frame is on the wire before the second fact exists. A frame carries the
 * same canonical bytes the bounded reads carry, so a reader that folds the
 * stream and a reader that polls the tail are folding the same values.
 *
 * ## The statuses, and each is a fold arm
 *
 * A refusal's status is a projection of its SORT, and the estate has exactly
 * two sorts, so exactly two statuses. A structural refusal is a permanent
 * statement about presented input and answers 422; an absence observation is
 * head-relative and is the only retryable class, so it answers 503 — the one
 * status whose meaning is "this may succeed later". A 404 would say the thing
 * does not exist, which is a claim about the world an absence refusal
 * deliberately does not make.
 *
 * A request the route table does not carry never reaches a plane read at all,
 * so it is not a refusal of the estate's language and its status is not a
 * sort's projection. It says instead why it was not carried: a read this face
 * does not declare answers 404, and a verb that is not a read answers 405 with
 * the methods this face carries. Both answer with a taught refusal payload,
 * because a caller that guessed deserves the roster rather than a bare status.
 *
 * ## What this face does not do
 *
 * No authentication and no authorization. The holder ruling stands —
 * attribution is never authority — and nothing here pretends otherwise: a
 * reader that can reach this listener can take every read on it. Binding the
 * listener to a loopback address, or behind something that authenticates, is a
 * deployment decision this module neither makes nor assumes. There is no resume
 * on the change stream, no keepalive frame, and no federation.
 *
 * @module
 */
import { Effect, Layer, Schema, SchemaParser, Stream } from "effect"
import { Sse } from "effect/unstable/encoding"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http"

import { canonicalBytes, type WireValue } from "../truth/Canonical.js"
import { Digest, type Digest as DigestValue } from "../truth/Digest.js"
import {
  Refusal,
  decodeRefusing,
  match as matchRefusal,
  structuralRefusal,
  type Next,
} from "../truth/Refusal.js"
import { Cells, cellName } from "../planes/Cell.js"
import {
  LANE_TAIL_LIMIT_DEFAULT,
  LANE_TAIL_LIMIT_MAX,
  LaneReads,
  laneHandle,
  type DeclaredLane,
  type LandedFact,
  type LaneHandle,
  type TailOptions,
} from "../planes/Lane.js"
import { Registers, matchState, workKey } from "../planes/Register.js"
import { connectionChanges, connectionsOf } from "../internal/connectionfold.js"
import { heartbeatLane } from "../internal/heartbeatlane.js"
import { INCARNATION_CHAIN_MAX, chainOf } from "../internal/incarnations.js"
import { admittedLimit } from "../internal/lanereads.js"
import type { SessionFact } from "../internal/sessionfacts.js"
import { sessionLane } from "../internal/sessionlanes.js"

/**
 * The media type every bounded read answers under.
 *
 * The bytes are RFC 8785 canonical JSON, which is JSON — a reader needs no
 * estate-specific parser to read one, and a reader that re-canonicalizes what
 * it received gets the same bytes back.
 */
export const CANONICAL_MEDIA_TYPE = "application/json"

/** The media type the live read answers under. */
export const STREAM_MEDIA_TYPE = "text/event-stream"

/** The methods this face carries. Every other verb is answered, never served. */
export const READ_METHODS: ReadonlyArray<string> = ["GET", "HEAD"]

/** The version every served value carries; it moves when the shape does. */
const V = 0

/**
 * The names the served values carry.
 *
 * Stated once, here, because one of them is spelled twice on the wire: the
 * change step's name is both the value's own `kind` and the name of the event
 * that carries it, and a reader keying on the event name and a reader reading
 * the value have to be keying on one word.
 */
const KIND = {
  index: "plait-read-index",
  connections: "plait-connection-snapshot",
  laneTail: "plait-lane-tail",
  register: "plait-register-read",
  cell: "plait-cell-read",
  incarnations: "plait-incarnation-chain",
  step: "plait-connection-step",
  refused: "plait-refusal",
} as const

/* ------------------------------------------------------------ the roster */

/**
 * One declared read, as data.
 *
 * The router is built from these rows and the index answers with them, so the
 * roster a caller is handed IS the roster the router matched against. A row
 * added here grows both by construction; a route registered without a row would
 * be a read nothing announces, which is the drift a served index exists to
 * prevent.
 */
interface ReadDeclaration {
  /** The path pattern, in the router's own spelling. */
  readonly path: HttpRouter.PathInput
  /** What plane read it projects, in one clause. */
  readonly answers: string
  /** The bound it is taken under. */
  readonly bound: string
}

const READS: ReadonlyArray<ReadDeclaration> = [
  {
    path: "/",
    answers: "the reads this face declares",
    bound: "the roster the router was built from; no plane is read",
  },
  {
    path: "/sessions",
    answers: "every connection the folded facts cite, at the state those facts support",
    bound:
      `a bounded tail per partition, ${LANE_TAIL_LIMIT_DEFAULT} positions by default and ${LANE_TAIL_LIMIT_MAX} at most`,
  },
  {
    path: "/sessions/changes",
    answers: "one change per landed fact, as it arrives",
    bound: "live only; no history is replayed and no position is resumed from",
  },
  {
    path: "/lanes/:handle",
    answers: "one declared lane's facts, each with its partition, position, identity and holder",
    bound:
      `a bounded tail per partition, ${LANE_TAIL_LIMIT_DEFAULT} positions by default and ${LANE_TAIL_LIMIT_MAX} at most`,
  },
  {
    path: "/registers/:work",
    answers: "one commitment register's observed state, in the vocabulary the model gives it",
    bound: "one observation; a read arbitrates nothing",
  },
  {
    path: "/cells/:cell",
    answers: "one lattice cell's canonical observation set and the identity of that set",
    bound: "one observation; the answer is a lower bound of the truth, never an oracle",
  },
  {
    path: "/incarnations/:store",
    answers: "one store directory's incarnation chain, newest first",
    bound: `at most ${INCARNATION_CHAIN_MAX} chain positions; a longer chain refuses rather than truncating`,
  },
]

/* ------------------------------------------------- the vocabulary refused */

const teachTheRoster: ReadonlyArray<Next> = [{
  subject: "plait.read",
  note:
    "Take one of the declared reads; the index at the root answers with every path this face carries and the bound each is taken under.",
}]

const teachTheDoor: ReadonlyArray<Next> = [{
  subject: "plait.read",
  note:
    "This face reads and never writes. A sentence that changes the estate is offered to the agent face, judged by the one admission door, and lands through the engine.",
}]

const noSuchRead = (method: string, path: string): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "The read face answers exactly the reads it declares; a path outside that roster names no plane to read.",
    path: ["read", method],
    got: path,
    expected: READS.map((read) => read.path),
    next: teachTheRoster,
  })

const noWriteHere = (method: string, path: string): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "The read face carries no write; judgment routes through the one admission door and never through a read.",
    path: ["read", "method"],
    got: `${method} ${path}`,
    expected: [...READ_METHODS],
    next: teachTheDoor,
  })

const undeclaredLane = (handle: string, declared: ReadonlyArray<string>): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law:
      "A lane is read by the handle its declared event form derives; a handle no declaration derives names no stream.",
    path: ["lane", "handle"],
    got: handle,
    expected: declared,
    next: [{
      subject: "plait.read",
      note:
        "Read a lane this face declares; a lane's handle is the digest of the event form it carries.",
    }],
  })

const emptySegment = (field: string, got: string): Refusal =>
  structuralRefusal({
    kind: "malformed-value",
    law: "A read names what it reads; a path segment the router matched empty names nothing.",
    path: ["read", field],
    got,
    expected: "one non-empty path segment",
    next: teachTheRoster,
  })

/* --------------------------------------------------------- the renderings */

/**
 * The status a refusal earns, folded over the two sorts the estate has.
 *
 * A fold and not a lookup: a third sort would be a third arm the compiler
 * demands, which is the only way a new sort cannot quietly inherit somebody
 * else's status.
 */
const statusOf: (refusal: Refusal) => number = matchRefusal({
  StructuralRefusal: () => 422,
  AbsenceRefusal: () => 503,
})

const utf8 = new TextEncoder()
const text = new TextDecoder()

/**
 * One refusal as bytes.
 *
 * The rendering is a projection of the value, not a transcription of it: the
 * refusal is encoded through its own schema union — which is what carries the
 * taught `sort`, `kind`, `law`, `path`, `got`, `expected` and `next` without
 * this file naming any of them — and then through the package's one
 * canonicalizer, so a refusal on this wire is byte-identical to the same
 * refusal anywhere else it is written.
 *
 * The fallback exists because a total function may not fail: a refusal whose
 * own payload will not canonicalize still has to reach the reader, and a
 * rendering that refused to render would lose the only evidence there is.
 */
const refusalBytes = (refusal: Refusal): Effect.Effect<Uint8Array> =>
  SchemaParser.encodeUnknownEffect(Refusal)(refusal).pipe(
    Effect.flatMap((encoded) => canonicalBytes(encoded as WireValue)),
    Effect.orElseSucceed(() =>
      utf8.encode(JSON.stringify({
        sort: refusal.sort,
        kind: refusal.kind,
        law: refusal.law,
      }))
    ),
  )

const canonicalResponse = (
  bytes: Uint8Array,
  status: number,
  headers: Record<string, string> = {},
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.uint8Array(bytes, {
    status,
    contentType: CANONICAL_MEDIA_TYPE,
    // A read is head-relative: it answers about the head it read and about no
    // later one, so a cached copy of it is a claim about a moment that passed.
    headers: { "cache-control": "no-store", ...headers },
  })

/** A refusal answered at the status its sort earns. */
const refused = (refusal: Refusal): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
  Effect.map(refusalBytes(refusal), (bytes) => canonicalResponse(bytes, statusOf(refusal)))

/**
 * A refusal answered at a status its sort did NOT choose.
 *
 * The two callers are the router's own misses, which reach no plane read: their
 * status says why the request was not carried, and the body still teaches.
 */
const missed = (
  refusal: Refusal,
  status: number,
  headers: Record<string, string> = {},
): Effect.Effect<HttpServerResponse.HttpServerResponse> =>
  Effect.map(refusalBytes(refusal), (bytes) => canonicalResponse(bytes, status, headers))

/** One bounded read, answered as its own canonical bytes or as its refusal. */
const answering = <R>(
  read: Effect.Effect<WireValue, Refusal, R>,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
  read.pipe(
    Effect.flatMap(canonicalBytes),
    Effect.map((bytes) => canonicalResponse(bytes, 200)),
    Effect.catch(refused),
  )

/* ------------------------------------------------------------ the reading */

const COUNT_FIELD = "limit"
const PARTITION_FIELD = "partition"

const Count = Schema.FiniteFromString.pipe(Schema.decodeTo(Schema.Int))

/**
 * One optional numeric query field.
 *
 * Absent means "take the read's own default", which is what makes every bound a
 * default rather than a demand. Present but malformed refuses through the
 * estate's one parse boundary, so the teaching is the decode algebra's rather
 * than this file's.
 */
const readCount = Effect.fn("api.readCount")(function* (
  params: Readonly<Record<string, string | ReadonlyArray<string>>>,
  field: string,
): Effect.fn.Return<number | undefined, Refusal> {
  const raw = params[field]
  if (raw === undefined) return undefined
  const one = typeof raw === "string" ? raw : raw[0]
  if (one === undefined || one === "") return undefined
  return yield* decodeRefusing(Count)(one)
})

const pathSegment = Effect.fn("api.pathSegment")(function* (
  params: Readonly<Record<string, string | undefined>>,
  field: string,
): Effect.fn.Return<string, Refusal> {
  const value = params[field]
  if (value === undefined || value === "") return yield* emptySegment(field, value ?? "absent")
  return value
})

/**
 * One declared lane, read behind the type its declaration carries.
 *
 * Two lanes with two event types are served by one route, so the typed read is
 * closed over here and the row it answers with is a wire value like any other.
 * The lane's own event schema still admits every fact — the closure is over the
 * declaration, so nothing about admission is loosened by the erasure.
 */
interface ServedLane {
  readonly handle: LaneHandle
  readonly digest: DigestValue
  readonly partitions: number
  readonly tail: (
    options: TailOptions,
  ) => Effect.Effect<ReadonlyArray<LandedFact<unknown>>, Refusal, LaneReads>
}

const serving = <Event, const Partitions extends number>(
  lane: DeclaredLane<Event, Partitions>,
): ServedLane => ({
  handle: lane.handle,
  digest: lane.digest,
  partitions: lane.partitions,
  tail: (options) => Effect.flatMap(LaneReads, (reads) => reads.tail(lane, options)),
})

const factRow = (fact: LandedFact<unknown>): WireValue => ({
  partition: fact.partition,
  position: fact.position,
  digest: fact.digest,
  holder: fact.holder,
  event: fact.event as WireValue,
})

/* ------------------------------------------------------------ the handlers */

const indexRead: WireValue = {
  v: V,
  kind: KIND.index,
  reads: READS.map((read) => ({
    path: read.path,
    answers: read.answers,
    bound: read.bound,
  })),
}

const connectionsRead = (sessions: DeclaredLane<SessionFact, 8>) =>
  answering(Effect.gen(function* () {
    const query = yield* HttpServerRequest.ParsedSearchParams
    const limit = yield* readCount(query, COUNT_FIELD)
    const reads = yield* LaneReads
    const facts = yield* reads.tail(sessions, { limit })
    const connections = yield* connectionsOf(facts)
    return {
      v: V,
      kind: KIND.connections,
      lane: sessions.digest,
      limit: admittedLimit(limit),
      folded: facts.length,
      connections: connections.map((reading) => ({
        session: reading.session,
        state: reading.state,
        position: reading.position,
      })),
    } satisfies WireValue
  }))

const laneRead = (lanes: ReadonlyArray<ServedLane>) =>
  answering(Effect.gen(function* () {
    const params = yield* HttpRouter.params
    const query = yield* HttpServerRequest.ParsedSearchParams
    const requested = yield* pathSegment(params, "handle")
    const handle = yield* laneHandle(requested)
    const found = lanes.find((lane) => lane.handle === handle)
    if (found === undefined) {
      return yield* undeclaredLane(requested, lanes.map((lane) => lane.handle))
    }
    const limit = yield* readCount(query, COUNT_FIELD)
    const partition = yield* readCount(query, PARTITION_FIELD)
    const facts = yield* found.tail({ limit, partition })
    return {
      v: V,
      kind: KIND.laneTail,
      lane: found.digest,
      handle: found.handle,
      partitions: found.partitions,
      limit: admittedLimit(limit),
      facts: facts.map(factRow),
    } satisfies WireValue
  }))

/**
 * The register read, in the vocabulary the proved model gives it.
 *
 * The three arms are the fold's own and are required by its signature, so a
 * fourth state would be an arm the compiler asks for rather than a case this
 * file forgot. Nothing arbitrates: deciding which of two observations wins is
 * the register's act under its revision fence and happens nowhere on a read.
 */
const observedState = matchState({
  absent: (): WireValue => ({ state: "absent" }),
  held: (state): WireValue => ({
    state: "held",
    token: state.token,
    holder: state.holder,
  }),
  landed: (state): WireValue => ({
    state: "landed",
    token: state.token,
    holder: state.holder,
    outcome: { token: state.outcome.token, value: state.outcome.value },
  }),
})

const registerRead = answering(Effect.gen(function* () {
  const params = yield* HttpRouter.params
  const work = yield* workKey(yield* pathSegment(params, "work"))
  const registers = yield* Registers
  const observed = yield* registers.observe(work)
  return {
    v: V,
    kind: KIND.register,
    work,
    observed: observedState(observed),
  } satisfies WireValue
}))

const cellRead = answering(Effect.gen(function* () {
  const params = yield* HttpRouter.params
  const cell = yield* cellName(yield* pathSegment(params, "cell"))
  const cells = yield* Cells
  const state = yield* cells.read(cell)
  return {
    v: V,
    kind: KIND.cell,
    cell,
    state: {
      observations: state.observations.map((observation) => ({
        holder: observation.holder,
        value: observation.value,
      })),
      digest: state.digest,
    },
  } satisfies WireValue
}))

const incarnationRead = answering(Effect.gen(function* () {
  const params = yield* HttpRouter.params
  const store = yield* decodeRefusing(Digest)(yield* pathSegment(params, "store"))
  const chain = yield* chainOf(store)
  return {
    v: V,
    kind: KIND.incarnations,
    store,
    bound: INCARNATION_CHAIN_MAX,
    chain: [...chain],
  } satisfies WireValue
}))

const frameOf = (event: string, bytes: Uint8Array): string =>
  Sse.encoder.write({ _tag: "Event", event, id: undefined, data: text.decode(bytes) })

/**
 * The live read.
 *
 * The response body is the change stream itself, frame by frame: each landed
 * fact becomes one step, the step becomes one canonical value, the value
 * becomes one event, and the event reaches the socket. No stage in that chain
 * holds more than one element, which is what makes the first frame visible
 * before the second fact exists.
 *
 * A refusal mid-stream is taught rather than dropped: it becomes one last frame
 * carrying the refusal's own bytes, and the stream ends. A status was already
 * chosen when the first frame went out, so the body is the only place left to
 * teach — which is exactly why it teaches there rather than closing silently.
 */
const changesRead = (sessions: DeclaredLane<SessionFact, 8>) =>
  Effect.gen(function* () {
    const query = yield* HttpServerRequest.ParsedSearchParams
    const window = yield* readCount(query, COUNT_FIELD)
    const reads = yield* LaneReads
    const frames = connectionChanges(reads.follow(sessions, { window })).pipe(
      Stream.mapEffect((step) =>
        Effect.map(
          canonicalBytes({
            v: V,
            kind: KIND.step,
            step: {
              session: step.session,
              position: step.position,
              event: step.event,
              from: step.from,
              to: step.to,
              moved: step.moved,
            },
          }),
          (bytes) => frameOf(KIND.step, bytes),
        )
      ),
      Stream.catch((refusal: Refusal) =>
        Stream.fromEffect(
          Effect.map(refusalBytes(refusal), (bytes) => frameOf(KIND.refused, bytes)),
        )
      ),
      Stream.encodeText,
    )
    return HttpServerResponse.stream(frames, {
      contentType: STREAM_MEDIA_TYPE,
      headers: { "cache-control": "no-store" },
    })
  }).pipe(Effect.catch(refused))

/**
 * Everything the route table does not carry.
 *
 * Two answers, and they are different facts about the request. A read this face
 * does not declare is a miss: nothing here answers that path, and 404 is the
 * word for it. A verb that is not a read is a write attempt: this face carries
 * no write at all, and 405 with the methods it does carry is the word for that.
 * Both answer with the taught payload, because a caller that guessed deserves
 * the roster rather than an empty body.
 */
const uncarried = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest
  const path = request.originalUrl
  if (READ_METHODS.includes(request.method)) {
    return yield* missed(noSuchRead(request.method, path), 404)
  }
  return yield* missed(noWriteHere(request.method, path), 405, {
    allow: READ_METHODS.join(", "),
  })
})

/* ------------------------------------------------------------ the assembly */

/**
 * The routes, registered against the router the caller supplies.
 *
 * The lanes this face serves are the estate's OWN declared lanes, derived here
 * from the event forms they carry: a lane's handle is the digest of its
 * declared form, so the roster is a function of the vocabulary rather than a
 * configuration somebody keeps in step. A lane the estate declares tomorrow
 * joins this face by being declared, not by being listed twice.
 *
 * The requirements are the three READ services and nothing else. That is the
 * one-door law read off a type rather than promised: the engine, the emit
 * service, and the admission door are all absent, so no handler under this
 * layer can reach a write however it is written.
 */
export const layer: Layer.Layer<
  never,
  Refusal,
  | HttpRouter.HttpRouter
  | HttpRouter.Request.From<"Requires", Cells | LaneReads | Registers>
> = HttpRouter.use(Effect.fnUntraced(function* (router) {
  const sessions = yield* sessionLane()
  const heartbeats = yield* heartbeatLane()
  const lanes = [serving(sessions), serving(heartbeats)]

  yield* router.addAll([
    HttpRouter.route("GET", "/", answering(Effect.succeed(indexRead))),
    HttpRouter.route("GET", "/sessions", connectionsRead(sessions)),
    HttpRouter.route("GET", "/sessions/changes", changesRead(sessions)),
    HttpRouter.route("GET", "/lanes/:handle", laneRead(lanes)),
    HttpRouter.route("GET", "/registers/:work", registerRead),
    HttpRouter.route("GET", "/cells/:cell", cellRead),
    HttpRouter.route("GET", "/incarnations/:store", incarnationRead),
    HttpRouter.route("*", "*", uncarried),
  ])
}))
