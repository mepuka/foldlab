import { describe, expect, test } from "bun:test"
import { Effect, Queue, Stream } from "effect"

/**
 * The minimized counterexample behind DEV-736's blocker (finding B-4, route a).
 *
 * The commons subscribe pump (`src/internal/nats.ts`) produces through
 * `consumer.consume({ callback })`. That callback is synchronous by the pinned
 * client's own contract — `ConsumerCallbackFn = (r: JsMsg) => void |
 * Promise<never>`, documented "the callback cannot be async"
 * (`@nats-io/jetstream@3.4.0` `lib/types.d.ts:540-547`) — so the pump's only
 * available offer is `Queue.offerUnsafe`, which never suspends.
 *
 * The affordances record recommends bounding that pump by passing
 * `{ bufferSize, strategy: "suspend" }` to `Stream.callback`
 * (`repos/effect/packages/effect/src/Stream.ts:694-699`). These rows execute
 * that recommendation against the pin and record what it actually does: with a
 * producer that cannot suspend, the strategy selects WHICH messages are lost,
 * never WHETHER. The loss is a skip in the middle of an ordered read, not a
 * truncation at its end, and no row raises an error.
 *
 * What these rows claim: the behaviour of the pinned `Stream.callback` and
 * `Queue` primitives under a synchronous producer. What they do NOT claim:
 * anything about NATS delivery, the fold pump, or a landed repair — the
 * commons pump is unchanged pending the operator's ruling.
 */

const BOUND = 8
const BURST = 40

/** One synchronous burst, the shape a callback producer delivers it in. */
const burst = (
  strategy: "suspend" | "dropping" | "sliding" | undefined,
): Effect.Effect<{ readonly received: ReadonlyArray<number>; readonly accepted: ReadonlyArray<boolean> }> =>
  Effect.suspend(() => {
    const accepted: Array<boolean> = []
    return Stream.callback<number>(
      (queue) =>
        Effect.sync(() => {
          for (let value = 0; value < BURST; value++) {
            accepted.push(Queue.offerUnsafe(queue, value))
          }
          Queue.endUnsafe(queue)
        }),
      strategy === undefined ? undefined : { bufferSize: BOUND, strategy },
    ).pipe(
      Stream.runCollect,
      Effect.map((received) => ({ received: [...received], accepted })),
    )
  })

describe("the commons pump's buffer bound under a synchronous producer", () => {
  test("today's unbounded default loses nothing — the bug it has is memory, not evidence", async () => {
    const { accepted, received } = await Effect.runPromise(burst(undefined))

    expect(received.length).toBe(BURST)
    expect(accepted.every(Boolean)).toBe(true)
  })

  test("strategy \"suspend\" cannot suspend an unsafe offer, so it drops the overflow", async () => {
    const { accepted, received } = await Effect.runPromise(burst("suspend"))

    expect(received.length).toBe(BOUND)
    expect(accepted.filter((ok) => !ok).length).toBe(BURST - BOUND)
    // The read stops at the bound and the remaining 32 envelopes are gone.
    expect(received).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  test("strategy \"dropping\" loses the same envelopes, and says so", async () => {
    const { accepted, received } = await Effect.runPromise(burst("dropping"))

    expect(received.length).toBe(BOUND)
    expect(accepted.filter((ok) => !ok).length).toBe(BURST - BOUND)
  })

  test("strategy \"sliding\" loses as many and reports every offer accepted", async () => {
    const { accepted, received } = await Effect.runPromise(burst("sliding"))

    expect(received.length).toBe(BOUND)
    // Every offer returned true, so the call site cannot even count the loss.
    expect(accepted.every(Boolean)).toBe(true)
    // The oldest envelopes were evicted; the read begins mid-stream.
    expect(received).toEqual([32, 33, 34, 35, 36, 37, 38, 39])
  })

  test("the primitive: offerUnsafe on a full \"suspend\" queue discards and returns false", async () => {
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* Queue.bounded<number>(1)
        const first = Queue.offerUnsafe(queue, 1)
        const second = Queue.offerUnsafe(queue, 2)
        const size = Queue.sizeUnsafe(queue)
        const head = yield* Queue.take(queue)
        return { first, second, size, head }
      }),
    )

    expect(outcome.first).toBe(true)
    expect(outcome.second).toBe(false)
    expect(outcome.size).toBe(1)
    // The refused message left no trace: the queue holds the first, not the second.
    expect(outcome.head).toBe(1)
  })
})
