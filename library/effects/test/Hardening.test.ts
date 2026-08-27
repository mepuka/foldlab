import { expect, it } from "@effect/vitest"
import { Context, Effect, Layer, Schema } from "effect"
import { ContentId } from "../src/CasNode.ts"
import { layerMemory } from "../src/CasStore.ts"
import {
  describeService,
  type ServiceDescriptions,
} from "../src/Operation.ts"
import {
  layerReplay,
  Replay,
  session,
  type ReplayShape,
} from "../src/Replay.ts"
import {
  replayable,
  type Live,
} from "../src/ServiceAdapter.ts"

class QuoteUnavailable extends Schema.TaggedError<QuoteUnavailable>()(
  "Hardening/QuoteUnavailable",
  { symbol: Schema.String },
) {}

interface RatesShape {
  readonly quote: (
    symbol: string,
  ) => Effect.Effect<number, QuoteUnavailable>
}

class Rates extends Context.Service<Rates, RatesShape>()(
  "test/effect-replay/HardeningRates",
) {}

const RatesDescriptions = describeService<RatesShape>("test/HardeningRates")({
  quote: {
    revision: 3,
    request: Schema.String,
    success: Schema.Number,
    failure: QuoteUnavailable,
  },
})

const MispairedDescriptions: ServiceDescriptions<RatesShape> = {
  quote: {
    id: "test/HardeningRates/quote",
    revision: 3,
    // @ts-expect-error A number request codec cannot describe quote(string).
    request: Schema.Number,
    success: Schema.Number,
    failure: QuoteUnavailable,
    leafReplay: "substitutable",
  },
}
void MispairedDescriptions

const makeRates = (): RatesShape => ({
  quote: (symbol) => symbol === "missing"
    ? Effect.fail(new QuoteUnavailable({ symbol }))
    : Effect.succeed(symbol.length),
})

it.effect("H1 derives ids and leaf replay while keeping revision explicit", () =>
  Effect.sync(() => {
    expect(RatesDescriptions.quote).toEqual({
      id: "test/HardeningRates/quote",
      revision: 3,
      request: Schema.String,
      success: Schema.Number,
      failure: QuoteUnavailable,
      leafReplay: "substitutable",
    })
  }))

it.effect("H2 returns one deterministic core kit for repeated calls", () =>
  Effect.sync(() => {
    const first = replayable(Rates, RatesDescriptions)
    const second = replayable(Rates, RatesDescriptions)
    const live = makeRates()
    const byValue = replayable(Rates, RatesDescriptions, live)

    expect(second).toBe(first)
    expect(first.live.key).toBe(`${Rates.key}/LiveRole`)
    expect(byValue.live).toBe(first.live)
    expect(byValue.replay).toBe(first.replay)

    const sameKey = Context.Service<Live<Rates>, RatesShape>(first.live.key)
    expect(Context.get(Context.make(first.live, live), sameKey)).toBe(live)
  }))

it.effect("H3 delegates session execution through Replay.run", () => {
  let runs = 0
  const run: ReplayShape["run"] = (program, options) =>
    Effect.sync(() => {
      runs += 1
      expect(options).toEqual({ mode: "record" })
    }).pipe(
      Effect.andThen(program),
      Effect.match({
        onFailure: (error) => ({
          _tag: "Completed" as const,
          terminal: { _tag: "Failed" as const, error },
        }),
        onSuccess: (value) => ({
          _tag: "Completed" as const,
          terminal: { _tag: "Succeeded" as const, value },
        }),
      }),
    )
  const replay = Replay.of({
    invoke: () => Effect.die("invoke outside delegated run"),
    run,
  })

  return Effect.gen(function* () {
    const outcome = yield* session(Effect.succeed(42), { mode: "record" })
    expect(outcome).toEqual({
      _tag: "Completed",
      terminal: { _tag: "Succeeded", value: 42 },
    })
    expect(runs).toBe(1)
  }).pipe(Effect.provideService(Replay, replay))
})

it.effect("H3 keeps Replay.invoke outside a session on the defect channel", () => {
  const runtime = layerReplay.pipe(Layer.provide(layerMemory({
    digest: () => Effect.succeed(ContentId.make("00".repeat(32))),
  })))

  return Replay.use((replay) =>
    replay.invoke(RatesDescriptions.quote, "EUR")).pipe(
    Effect.provide(runtime),
    Effect.catchDefect((defect) =>
      Effect.sync(() => {
        expect(defect).toMatchObject({
          _tag: "ReplayRuntimeTransport",
          reason: "Replay.invoke used outside session",
        })
      })),
  )
})

it.effect("H4 leaves Replay.run invariant defects on the defect channel", () => {
  const invariant = new Error("injected invariant breach")
  const replay = Replay.of({
    invoke: () => Effect.die(invariant),
    run: () => Effect.die(invariant),
  })

  return session(Effect.void, { mode: "record" }).pipe(
    Effect.provideService(Replay, replay),
    Effect.catchDefect((defect) =>
      Effect.sync(() => expect(defect).toBe(invariant))),
  )
})
