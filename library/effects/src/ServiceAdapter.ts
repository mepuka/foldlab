/**
 * The service kit (ruling D6, GR-11): one kit constructor per described
 * service, minting an internal live role key and returning the record and
 * replay constructions.
 *
 * The replay construction's environment contains replay dependencies ONLY —
 * the live service is absent from its type, so live fallback is
 * unexpressible rather than merely forbidden (GR-1 corollary; RPL-002's
 * TypeScript half). Wrapper bodies never resolve the public tag — a named
 * defect with a must-fail fixture. Produced services carry a runtime
 * string-keyed brand checked at construction; double wrapping is rejected
 * with a typed error, never normalized (type-level brands are ruled out by
 * caller-facing type identity).
 */
import { Context, Effect, Layer, Schema } from "effect"
import type {
  AnyOperationDescription,
  ServiceDescriptions,
} from "./Operation.ts"
import { Replay, type ReplayShape } from "./Replay.ts"
import { bindLive } from "./ReplayLive.ts"

/** Phantom identifier for the internally minted live role key: the same
 * shape as the public service, under a distinct identity, so record-mode
 * wiring can never recursively resolve the wrapper as its own live
 * implementation (CTX-001). */
export interface Live<Self> {
  readonly LiveRole: Self
}

/** Construction-time rejection for wrapping an already-wrapped service. */
export class DoubleWrap extends Schema.TaggedError<DoubleWrap>()(
  "ServiceAdapter/DoubleWrap",
  { service: Schema.String },
) {}

export interface ReplayableKit<Self, S> {
  /** The internal live role key. Live construction provides THIS, never the
   * public tag. */
  readonly live: Context.Service<Live<Self>, S>
  /** Record mode: requires the live role and the replay service. */
  readonly record: Layer.Layer<Self, DoubleWrap, Live<Self> | Replay>
  /** Replay mode: requires the replay service only — live-free by type. */
  readonly replay: Layer.Layer<Self, never, Replay>
}

/** A convenience kit whose record construction has its live role supplied
 * by value. It is implemented by providing the core kit's distinct live
 * role; replay construction remains unchanged and live-free. */
export interface ReplayableValueKit<Self, S> {
  readonly live: Context.Service<Live<Self>, S>
  readonly record: Layer.Layer<Self, DoubleWrap, Replay>
  readonly replay: Layer.Layer<Self, never, Replay>
}

const WrappedServiceBrand = "foldlab/effect-replay/ServiceAdapter/wrapped"
const coreKits = new WeakMap<object, unknown>()

type RuntimeMethod = (
  request: unknown,
) => Effect.Effect<unknown, unknown>

const isObject = (value: unknown): value is object =>
  (typeof value === "object" && value !== null) || typeof value === "function"

const isWrappedService = (value: unknown): boolean =>
  isObject(value) &&
  WrappedServiceBrand in value &&
  (value as Record<string, unknown>)[WrappedServiceBrand] === true

const brand = <S>(service: S): S => {
  Object.defineProperty(service, WrappedServiceBrand, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  })
  return service
}

const descriptionKeys = <S>(
  descriptions: ServiceDescriptions<S>,
): ReadonlyArray<keyof S> =>
  Reflect.ownKeys(descriptions) as unknown as ReadonlyArray<keyof S>

const descriptionAt = <S>(
  descriptions: ServiceDescriptions<S>,
  key: keyof S,
): AnyOperationDescription => descriptions[key]

const asRuntimeMethod = <S>(service: S, key: keyof S): RuntimeMethod => {
  const method = (service as Record<keyof S, unknown>)[key]
  if (typeof method !== "function") {
    throw new TypeError(`Described service member ${String(key)} is not a function`)
  }
  return method as RuntimeMethod
}

/** Build a replay wrapper without accepting or closing over a live service. */
const replayService = <S>(
  descriptions: ServiceDescriptions<S>,
  replay: ReplayShape,
): S => {
  const wrapped: Partial<Record<keyof S, unknown>> = {}
  for (const key of descriptionKeys(descriptions)) {
    const operation = descriptionAt(descriptions, key)
    wrapped[key] = (request: unknown) => replay.invoke(operation, request)
  }
  return brand(wrapped as S)
}

/** Build a record wrapper around the distinct internal live role. */
const recordService = <S>(
  descriptions: ServiceDescriptions<S>,
  replay: ReplayShape,
  live: S,
): S => {
  const wrapped: Partial<Record<keyof S, unknown>> = {}
  for (const key of descriptionKeys(descriptions)) {
    const liveMethod = asRuntimeMethod(live, key)
    const operation = bindLive(descriptionAt(descriptions, key), liveMethod)
    wrapped[key] = (request: unknown) => replay.invoke(operation, request)
  }
  return brand(wrapped as S)
}

const makeKit = <Self, S>(
  service: Context.Service<Self, S>,
  descriptions: ServiceDescriptions<S>,
): ReplayableKit<Self, S> => {
  const cached = coreKits.get(service)
  if (cached !== undefined) return cached as ReplayableKit<Self, S>

  const live = Context.Service<Live<Self>, S>(
    `${service.key}/LiveRole`,
  )

  const record = Layer.effect(
    service,
    Effect.gen(function* () {
      const liveService = yield* live
      if (isWrappedService(liveService)) {
        return yield* new DoubleWrap({ service: service.key })
      }
      const replay = yield* Replay
      return recordService(descriptions, replay, liveService)
    }),
  )

  const replay = Layer.effect(
    service,
    Replay.use((runtime) => Effect.succeed(replayService(descriptions, runtime))),
  )

  const kit: ReplayableKit<Self, S> = { live, record, replay }
  coreKits.set(service, kit)
  return kit
}

/** Construct the core live-role/record/replay kit. */
export function replayable<Self, S>(
  service: Context.Service<Self, S>,
  descriptions: ServiceDescriptions<S>,
): ReplayableKit<Self, S>

/** Lift one existing service value through the core kit's live-role layer. */
export function replayable<Self, S>(
  service: Context.Service<Self, S>,
  descriptions: ServiceDescriptions<S>,
  implementation: S,
): ReplayableValueKit<Self, S>

export function replayable<Self, S>(
  service: Context.Service<Self, S>,
  descriptions: ServiceDescriptions<S>,
  implementation?: S,
): ReplayableKit<Self, S> | ReplayableValueKit<Self, S> {
  const kit = makeKit(service, descriptions)
  if (implementation === undefined) return kit
  return {
    ...kit,
    record: kit.record.pipe(
      Layer.provide(Layer.succeed(kit.live, implementation)),
    ),
  }
}
