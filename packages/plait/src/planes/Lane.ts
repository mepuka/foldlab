/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Context, Effect, Layer, Predicate, Result, Schema } from "effect"

import type { ConnectionBootstrap } from "../internal/transport.js"
import type { WireValue } from "../truth/Canonical.js"
import { Digest, digestOf, type Digest as DigestValue } from "../truth/Digest.js"
import { structuralRefusal, type Refusal, type StructuralRefusal, WireValueSchema } from "../truth/Refusal.js"
import { evidenceSubject, TOKEN_PATTERN } from "../kernel/Subjects.js"
import type { Certificate, Holder } from "../kernel/Wire.js"
import { makeLaneService } from "../internal/lanes.js"

/**
 * The route name one evidence lane is declared under.
 *
 * A handle becomes a routing token verbatim, so its grammar is the fabric's
 * literal-token alphabet and nothing wider. The brand is demanded at
 * `declare`'s door: a lane cannot be declared under a name nobody minted, and
 * a handle cannot be spent where a cell name or a work key is wanted.
 */
export const LaneHandle = Schema.String
  .check(Schema.isPattern(TOKEN_PATTERN))
  .pipe(Schema.brand("@foldlab/plait/LaneHandle"))
  .annotate({ identifier: "PlaitLaneHandle" })

/** The route name one evidence lane is declared under. */
export type LaneHandle = typeof LaneHandle.Type

/** The closed, identity-bearing grammar for deriving a partition key. */
export const PartitionKey = Schema.Struct({
  path: Schema.Array(Schema.Union([Schema.String, Schema.Finite])),
})

/** The closed, identity-bearing grammar for deriving a partition key. */
export type PartitionKey = typeof PartitionKey.Type

/** Canonical data that names one evidence lane. */
export interface LaneDeclaration {
  readonly v: 0
  readonly kind: "lane"
  readonly handle: LaneHandle
  readonly eventSchema: DigestValue
  readonly partitions: number
  readonly partitionKey: PartitionKey
}

/** A validated, content-addressed evidence-lane declaration. */
export interface DeclaredLane<Event, Partitions extends number = number> {
  readonly declaration: LaneDeclaration
  readonly digest: DigestValue
  readonly event: Schema.ConstraintDecoder<Event>
  readonly handle: LaneHandle
  readonly partitions: Partitions
  readonly partitionKey: PartitionKey
}

/** Inputs for declaring one evidence lane. */
export interface DeclareOptions<Event, Partitions extends number> {
  readonly handle: LaneHandle
  readonly event: Schema.ConstraintDecoder<Event>
  readonly eventSchema: DigestValue
  readonly partitions: Partitions
  readonly partitionKey: PartitionKey
}

/** The derived routing coordinate for one admitted event. */
export interface LanePartition {
  readonly key: WireValue
  readonly partition: number
}

/** Connection bootstrap for live evidence-lane streams. */
export interface LaneOptions extends ConnectionBootstrap {}

/** Provenance fields carried by one emitted event envelope. */
export interface EmitOptions {
  readonly holder: Holder
  readonly pins?: ReadonlyArray<DigestValue>
  readonly cert?: Certificate
}

/** The durable coordinate returned after one evidence event is stored. */
export interface EmittedEvent {
  readonly digest: DigestValue
  readonly partition: number
  readonly position: number
  readonly duplicate: boolean
}

/** Transport-free live lane operations. */
export interface LaneService {
  readonly emit: <Event, const Partitions extends number>(
    lane: DeclaredLane<Event, Partitions>,
    event: Event,
    options: EmitOptions,
  ) => Effect.Effect<EmittedEvent, Refusal>
}

/** Scope-owned live evidence lanes; all NATS types remain internal. */
export class Lanes extends Context.Service<Lanes, LaneService>()(
  "@foldlab/plait/Lanes",
) {
  /** Builds a scope-owned NATS implementation. */
  static readonly layer = (options: LaneOptions): Layer.Layer<Lanes, Refusal> =>
    Layer.effect(Lanes, makeLaneService(options))

  /** Supplies a fixture implementation through the production service tag. */
  static readonly testLayer = (service: LaneService): Layer.Layer<Lanes> =>
    Layer.succeed(Lanes, Lanes.of(service))
}

const declarationRefusal = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
): StructuralRefusal => structuralRefusal({
  kind: "invalid-lane-declaration",
  law: "A lane is canonical data with one literal route handle, a positive partition count, and a declared key path.",
  path,
  got,
  expected,
  next: [{
    subject: "Lane.declare",
    note: "Declare a literal lane handle, 1..1024 partitions, an admitted event-schema digest, and a key path.",
  }],
})

/**
 * Admits one lane handle, refusing anything the routing grammar cannot carry.
 *
 * The grammar is checked by constructing the subject the handle would route
 * under, so the handle's law and the subject's are the same law read once —
 * `declare` calls this rather than testing the token itself.
 *
 * @example
 * ```ts
 * import { laneHandle } from "@foldlab/plait/Lane"
 * import { Effect } from "effect"
 *
 * Effect.runSync(laneHandle("orders"))
 * // "orders"
 * ```
 */
export const laneHandle = Effect.fn("Lane.laneHandle")(function* (
  handle: string,
): Effect.fn.Return<LaneHandle, StructuralRefusal> {
  yield* evidenceSubject(handle, 0).pipe(
    Effect.mapError((refusal) => declarationRefusal(
      ["handle"],
      handle,
      refusal.expected,
    )),
  )
  return LaneHandle.make(handle)
})

const partitionRefusal = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
): StructuralRefusal => structuralRefusal({
  kind: "invalid-partition-key",
  law: "Lane partition routing is derived only from the declared path over the admitted event value.",
  path,
  got,
  expected,
  next: [{
    subject: "Lane.partitionKey",
    note: "Choose a path present in every admitted event, or use an empty path to key by the whole event.",
  }],
})

/**
 * Declares a content-addressed evidence lane.
 *
 * The event schema itself is runtime behavior; its already-admitted structural
 * digest enters identity. The partition-key path is a small declared grammar,
 * so no anonymous JavaScript function can hide outside the lane digest.
 */
export const declare = Effect.fn("Lane.declare")(function*<Event, const Partitions extends number>(
  options: DeclareOptions<Event, Partitions>,
): Effect.fn.Return<DeclaredLane<Event, Partitions>, StructuralRefusal> {
  if (!Schema.is(Digest)(options.eventSchema)) {
    return yield* declarationRefusal(
      ["eventSchema"],
      String(options.eventSchema),
      "a lowercase SHA-256 digest",
    )
  }
  if (!Number.isSafeInteger(options.partitions) || options.partitions < 1 || options.partitions > 1024) {
    return yield* declarationRefusal(
      ["partitions"],
      Number.isFinite(options.partitions) ? options.partitions : String(options.partitions),
      "an integer from 1 through 1024",
    )
  }
  yield* laneHandle(options.handle)
  const parsedKey = Schema.decodeResult(PartitionKey, {
    onExcessProperty: "error",
    errors: "first",
  })(options.partitionKey)
  if (Result.isFailure(parsedKey)) {
    return yield* declarationRefusal(
      ["partitionKey"],
      Schema.is(WireValueSchema)(options.partitionKey) ? options.partitionKey : String(options.partitionKey),
      "the closed { path: (string | number)[] } partition-key declaration",
    )
  }

  const declaration: LaneDeclaration = {
    v: 0,
    kind: "lane",
    handle: options.handle,
    eventSchema: options.eventSchema,
    partitions: options.partitions,
    partitionKey: parsedKey.success,
  }
  const digest = yield* digestOf(declaration as unknown as WireValue)
  return {
    declaration,
    digest,
    event: options.event,
    handle: options.handle,
    partitions: options.partitions,
    partitionKey: parsedKey.success,
  }
})

const atPath = (
  value: unknown,
  path: ReadonlyArray<string | number>,
): { readonly found: true; readonly value: unknown } | { readonly found: false } => {
  let cursor = value
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(cursor) || !Number.isSafeInteger(segment) || segment < 0 || segment >= cursor.length) {
        return { found: false }
      }
      cursor = cursor[segment]
      continue
    }
    if (!Predicate.isObject(cursor) || !Object.hasOwn(cursor, segment)) return { found: false }
    cursor = cursor[segment]
  }
  return { found: true, value: cursor }
}

/** Derives the canonical key and stable partition for one admitted event. */
export const partition = Effect.fn("Lane.partition")(function*<Event, const Partitions extends number>(
  lane: DeclaredLane<Event, Partitions>,
  event: Event,
): Effect.fn.Return<LanePartition, StructuralRefusal> {
  const decoded = Schema.decodeUnknownResult(lane.event, {
    onExcessProperty: "error",
    errors: "first",
  })(event)
  if (Result.isFailure(decoded)) {
    return yield* partitionRefusal(
      ["event"],
      Schema.is(WireValueSchema)(event) ? event : String(event),
      "one value admitted by the lane's event schema",
    )
  }

  const selected = atPath(decoded.success, lane.partitionKey.path)
  if (!selected.found) {
    return yield* partitionRefusal(
      ["partitionKey", ...lane.partitionKey.path.map(String)],
      "missing",
      "a present canonical event value",
    )
  }
  if (!Schema.is(WireValueSchema)(selected.value)) {
    return yield* partitionRefusal(
      ["partitionKey", ...lane.partitionKey.path.map(String)],
      String(selected.value),
      "one RFC 8785 wire value",
    )
  }
  const keyDigest = yield* digestOf(selected.value)
  return {
    key: selected.value,
    partition: Number(BigInt(`0x${keyDigest}`) % BigInt(lane.partitions)),
  }
})

/** Admits, routes, and durably appends one event to its declared partition. */
export const emit = Effect.fn("Lane.emit")(function*<Event, const Partitions extends number>(
  lane: DeclaredLane<Event, Partitions>,
  event: Event,
  options: EmitOptions,
): Effect.fn.Return<EmittedEvent, Refusal, Lanes> {
  const lanes = yield* Lanes
  return yield* lanes.emit(lane, event, options)
})
