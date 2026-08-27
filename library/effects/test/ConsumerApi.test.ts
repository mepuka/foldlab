/**
 * The ratified consumer-API additions, exercised end to end: the
 * structurally distinct record/replay entry points, the Layer-implemented
 * replayable kit (including the DoubleWrap check surviving the re-tag),
 * and the CAS error-tag constants with the total fold.
 */
import { expect, it } from "@effect/vitest"
import { Context, Effect, Layer, Ref, Schema } from "effect"
import { Cas, Replay } from "../src/index.ts"
import { layerMemory } from "../src/cas/Store.ts"
import { layerReplay, record, replay } from "../src/replay/Replay.ts"
import { replayable } from "../src/replay/ServiceAdapter.ts"
import { deterministicAddress } from "./fixtures/address.ts"

class QuoteUnavailable extends Schema.TaggedError<QuoteUnavailable>()(
  "ConsumerApi/QuoteUnavailable",
  { symbol: Schema.String },
) {}

interface RatesShape {
  readonly quote: (symbol: string) => Effect.Effect<number, QuoteUnavailable>
}

class Rates extends Context.Service<Rates, RatesShape>()(
  "test/effect-replay/ConsumerApiRates",
) {}

const RatesDescriptions = Replay.describeService<RatesShape>(
  "test/ConsumerApiRates",
)({
  quote: {
    revision: 1,
    request: Schema.String,
    success: Schema.Number,
    failure: QuoteUnavailable,
  },
})

const runtimeLayer = () =>
  layerReplay.pipe(Layer.provideMerge(layerMemory(deterministicAddress())))

const program = Rates.use((rates) => rates.quote("EUR"))

it.effect("record and replay wrappers round-trip without a flat options bag", () =>
  Effect.gen(function* () {
    const kit = replayable(Rates, RatesDescriptions, {
      quote: (symbol) => Effect.succeed(symbol.length),
    })
    const recorded = yield* record(program.pipe(Effect.provide(kit.record)))
    if (recorded.history === undefined) {
      return yield* Effect.die("expected a recorded history root")
    }
    const replayed = yield* replay(
      program.pipe(Effect.provide(kit.replay)),
      recorded.history,
    )
    expect({ recorded: recorded.outcome, replayed: replayed.outcome }).toEqual({
      recorded: { _tag: "Completed", terminal: { _tag: "Succeeded", value: 3 } },
      replayed: { _tag: "Completed", terminal: { _tag: "Succeeded", value: 3 } },
    })
  }).pipe(Effect.provide(runtimeLayer())))

it.effect("a Layer implementation builds under the public tag and records", () =>
  Effect.gen(function* () {
    const builds = yield* Ref.make(0)
    const liveLayer: Layer.Layer<Rates> = Layer.effect(
      Rates,
      Ref.update(builds, (n) => n + 1).pipe(
        Effect.as({ quote: (symbol: string) => Effect.succeed(symbol.length * 10) }),
      ),
    )
    const kit = replayable(Rates, RatesDescriptions, liveLayer)
    const recorded = yield* record(program.pipe(Effect.provide(kit.record)))
    expect(recorded.outcome).toEqual({
      _tag: "Completed",
      terminal: { _tag: "Succeeded", value: 30 },
    })
    expect(yield* Ref.get(builds)).toBe(1)
  }).pipe(Effect.provide(runtimeLayer())))

it.effect("the DoubleWrap check survives the layer re-tag", () =>
  Effect.gen(function* () {
    const kit = replayable(Rates, RatesDescriptions)
    // An implementation layer whose output is itself a wrapped service:
    // the replay construction's product under the public tag.
    const wrappedImplementation: Layer.Layer<Rates, never, Replay.Replay> =
      kit.replay
    const doubled = replayable(Rates, RatesDescriptions, wrappedImplementation)
    const error = yield* Effect.flip(Rates.pipe(Effect.provide(doubled.record)))
    expect(error).toEqual(new Replay.DoubleWrap({ service: Rates.key }))
  }).pipe(Effect.provide(runtimeLayer())))

it.effect("error tags, the guard, and the fold agree with the union", () =>
  Effect.sync(() => {
    const notFound = new Cas.ContentNotFound({
      id: Cas.ContentId.make("00".repeat(32)),
    })
    expect(notFound._tag).toBe(Cas.ErrorTag.ContentNotFound)
    expect(Cas.isCasError(notFound)).toBe(true)
    expect(Cas.isCasError(new QuoteUnavailable({ symbol: "EUR" }))).toBe(false)

    const label = Cas.matchError<string>({
      ContentNotFound: (error) => `missing ${error.id.slice(0, 4)}`,
      onOther: (error) => `other ${error._tag}`,
    })
    expect(label(notFound)).toBe("missing 0000")
    expect(label(new Cas.StoreFailure({ reason: "x" })))
      .toBe("other CasError/StoreFailure")
  }))
