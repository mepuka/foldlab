import { describe, expect, test } from "bun:test"
import { QueuedIteratorImpl } from "@nats-io/nats-core/internal"
import type { ConsumerMessages, ConsumerNotification, JsMsg } from "@nats-io/jetstream"
import { Deferred, Effect, Fiber, Queue, Stream } from "effect"

import { Digest } from "../src/Digest.js"
import { commonsPump } from "../src/internal/nats.js"
import { encodeEnvelope, verifyEnvelopeDigest } from "../src/Wire.js"

/**
 * The counterexample suite behind DEV-736 (finding B-4), and the gate on the
 * repair that answered it.
 *
 * The first block is the refusal of route (a): the affordances record proposed
 * bounding the commons pump by passing `{ bufferSize, strategy: "suspend" }`
 * to `Stream.callback` (`repos/effect/packages/effect/src/Stream.ts:694-699`).
 * The pump's producer was `consumer.consume({ callback })`, and that callback
 * is synchronous by the pinned client's own contract — `ConsumerCallbackFn =
 * (r: JsMsg) => void | Promise<never>`, documented "the callback cannot be
 * async" (`@nats-io/jetstream@3.4.0` `lib/types.d.ts:540-547`) — so its only
 * available offer was `Queue.offerUnsafe`, which never suspends. These rows
 * execute the recommendation against the pin: with a producer that cannot
 * suspend, the strategy selects WHICH messages are lost, never WHETHER, and no
 * row raises an error (DECISIONS DEV-736 T0).
 *
 * The second block is the load shape both forms are measured at, and the
 * repair the operator ruled on 2026-08-18: the pull form, `commonsPump` over
 * the client's own `ConsumerMessages` iterator (DECISIONS DEV-736 T1). One
 * arrival clock, one downstream paying digest verification, two places for the
 * message to land — the refused callback queue, and the pulled iterator.
 *
 * What these rows claim: the behavior of the pinned `Stream.callback`,
 * `Queue`, and `QueuedIterator` primitives under an arrival clock the consumer
 * cannot slow. What they do NOT claim: anything about NATS delivery over a
 * live server, which `RoundTrip.test.ts` and `FabricWall.test.ts` own.
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
  test("the unbounded default loses nothing — the bug it had was memory, not evidence", async () => {
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

const LOAD_BOUND = 16
const LOAD_TURN = 20
const LOAD_TURNS = 10
const LOAD = LOAD_TURN * LOAD_TURNS
const lane = Digest.make("015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862")

/**
 * The load shape, built once: 200 real envelopes, each carrying its own
 * canonical digest as the message id the pump's downstream re-derives.
 */
const load = await Effect.runPromise(
  Effect.forEach(
    Array.from({ length: LOAD }, (_, index) => index),
    (index) =>
      encodeEnvelope({
        v: 0,
        kind: "emit",
        lane,
        key: index,
        holder: "seat-alpha",
        body: null,
        pins: [],
      }).pipe(
        Effect.map((encoded) => ({
          index,
          message: {
            data: encoded.bytes,
            headers: { get: () => String(encoded.digest) },
          } as unknown as JsMsg,
          digest: String(encoded.digest),
        })),
      ),
  ),
)
const indexOfDigest = new Map(load.map((entry) => [entry.digest, entry.index]))

/**
 * The arrival clock: ten event-loop turns of twenty envelopes. It is driven by
 * the runtime, never by the consumer — which is the property that makes a
 * producer unpausable, and the only property this shape needs.
 */
const arrive = async (
  deliver: (message: JsMsg) => void,
  end: () => void,
): Promise<void> => {
  for (let index = 0; index < LOAD; index++) {
    if (index % LOAD_TURN === 0) await new Promise<void>((resume) => setTimeout(resume, 0))
    deliver(load[index]!.message)
  }
  end()
}

/** The pump's own downstream: re-derive the digest, check it against the id. */
const verifyReceived = Effect.fn("test.verifyReceived")(function* (message: JsMsg) {
  const messageId = message.headers?.get("Nats-Msg-Id") ?? ""
  const verified = yield* verifyEnvelopeDigest(message.data, messageId)
  return indexOfDigest.get(String(verified.digest))!
})

/** The first index the read skipped, or -1 when it skipped nothing. */
const firstGap = (received: ReadonlyArray<number>): number => {
  for (let position = 0; position < received.length; position++) {
    if (received[position] !== position) return position
  }
  return received.length === LOAD ? -1 : received.length
}

/** Route (a) at this load shape: the refused callback adapter, bounded. */
const throughCallback = (
  strategy: "suspend" | "dropping" | "sliding",
): Effect.Effect<{ readonly received: ReadonlyArray<number>; readonly accepted: ReadonlyArray<boolean> }> =>
  Effect.suspend(() => {
    const accepted: Array<boolean> = []
    return Stream.callback<JsMsg>(
      (queue) =>
        Effect.sync(() => {
          void arrive(
            (message) => { accepted.push(Queue.offerUnsafe(queue, message)) },
            () => { Queue.endUnsafe(queue) },
          )
        }),
      { bufferSize: LOAD_BOUND, strategy },
    ).pipe(
      Stream.mapEffect(verifyReceived),
      Stream.runCollect,
      Effect.map((received) => ({ received: [...received], accepted })),
      Effect.orDie,
    )
  })

/**
 * The pin's own message iterator, wearing the `Close` half of
 * `ConsumerMessages` so the landed pump can be measured against it directly.
 * `close()` queues its stop behind the pending messages, which is what the
 * client does (`@nats-io/jetstream@3.4.0` `lib/consumer.js:581-602`).
 */
class StandInMessages extends QueuedIteratorImpl<JsMsg> implements ConsumerMessages {
  closeCalls = 0
  pulls = 0
  onPull: ((pulls: number) => void) | undefined = undefined;

  override [Symbol.asyncIterator](): AsyncIterator<JsMsg> {
    const iterator = super[Symbol.asyncIterator]()
    const counted: AsyncIterator<JsMsg> = {
      next: () => {
        this.pulls++
        this.onPull?.(this.pulls)
        return iterator.next()
      },
    }
    // Kept, so the counterexample row below can hand it to the channel.
    if (iterator.return !== undefined) counted.return = iterator.return.bind(iterator)
    return counted
  }

  close(): Promise<void | Error> {
    this.closeCalls++
    this.push(() => { super.stop() })
    return this.iterClosed
  }

  closed(): Promise<void | Error> {
    return this.iterClosed
  }

  status(): AsyncIterable<ConsumerNotification> {
    return (async function* () {})()
  }
}

/** Route (b) at the same load shape: the landed pump, pulled. */
const throughPull = (): Effect.Effect<ReadonlyArray<number>> =>
  Effect.suspend(() => {
    const messages = new StandInMessages()
    void arrive(
      (message) => { messages.push(message) },
      () => { messages.push(() => { messages.stop() }) },
    )
    return commonsPump(Effect.succeed(messages)).pipe(
      Stream.mapEffect(verifyReceived),
      Stream.runCollect,
      Effect.map((received) => [...received]),
      Effect.orDie,
    )
  })

describe("the same load shape: 200 envelopes, ten arrival turns, a downstream paying digest verification", () => {
  // Measured 160 of 200 delivered, first gap at 16, identical across twenty
  // runs: the consumer drains the bound between turns, so each turn of twenty
  // loses exactly the four the bound could not hold. The gate below asserts
  // the shape of that loss rather than the count, because the count is a fact
  // about this host's scheduler and the shape is a fact about the adapter.
  test("route (a): the bounded callback adapter punches holes in the middle of the read", async () => {
    for (const strategy of ["suspend", "dropping"] as const) {
      const { accepted, received } = await Effect.runPromise(throughCallback(strategy))

      expect(received.length).toBeLessThan(LOAD)
      expect(accepted.filter((ok) => !ok).length).toBe(LOAD - received.length)
      // Ordered and unique: what is missing is missing, not reordered.
      expect([...received].sort((left, right) => left - right)).toEqual([...received])
      expect(new Set(received).size).toBe(received.length)
      // The read carried on past the first hole — this is not truncation.
      const gap = firstGap(received)
      expect(gap).toBeGreaterThanOrEqual(LOAD_BOUND)
      expect(received[received.length - 1]).toBeGreaterThan(gap)
    }
  })

  test("route (a) under \"sliding\": as much is lost and every offer reports success", async () => {
    const { accepted, received } = await Effect.runPromise(throughCallback("sliding"))

    expect(received.length).toBeLessThan(LOAD)
    // Nothing in the returned booleans lets the call site count what went.
    expect(accepted.every(Boolean)).toBe(true)
  })

  test("route (b): the landed pull pump delivers all 200, in order", async () => {
    const received = await Effect.runPromise(throughPull())

    expect(received.length).toBe(LOAD)
    expect(received).toEqual(Array.from({ length: LOAD }, (_, index) => index))
  })
})

describe("the property T4 chose the callback adapter for", () => {
  /** Parks a pump on an outstanding pull with nothing left to deliver. */
  const idlePump = Effect.fn("test.idlePump")(function* (
    messages: StandInMessages,
    stream: Stream.Stream<JsMsg, never>,
  ) {
    const idle = yield* Deferred.make<void>()
    messages.onPull = (pulls) => {
      // The first pull carries the one message; the second finds nothing.
      if (pulls === 2) Deferred.doneUnsafe(idle, Effect.void)
    }
    const reading = yield* Effect.forkChild(
      stream.pipe(Stream.mapEffect(verifyReceived), Stream.runDrain),
    )
    messages.push(load[0]!.message)
    yield* Deferred.await(idle)
    return reading
  })

  test("interruption ends an idle pull pump, and the release closes the iterator", async () => {
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const messages = new StandInMessages()
        const reading = yield* idlePump(
          messages,
          Stream.orDie(commonsPump(Effect.succeed(messages))),
        )

        const interrupted = yield* Fiber.interrupt(reading).pipe(
          Effect.timeoutOption("2 seconds"),
        )

        return {
          interrupted: interrupted._tag,
          closeCalls: messages.closeCalls,
          done: messages.done,
        }
      }),
    )

    // The scope closed: an unreachable pump would have parked here forever.
    expect(outcome.interrupted).toBe("Some")
    // The release ran, exactly once, and it is what ended the iterator.
    expect(outcome.closeCalls).toBe(1)
    expect(outcome.done).toBe(true)
  })

  test("the counterexample: handing the raw iterator over instead hangs the scope", async () => {
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const messages = new StandInMessages()
        // The same shape without the pump's withheld `return`: the channel
        // registers `iter.return()` as a finalizer, and a generator parked on
        // `await` cannot honor it.
        const naive = Stream.unwrap(
          Effect.acquireRelease(
            Effect.succeed(messages),
            (open) => Effect.promise(() => open.close()).pipe(Effect.asVoid),
          ).pipe(
            Effect.map((open) => Stream.fromAsyncIterable(open, () => undefined)),
          ),
        )
        const reading = yield* idlePump(messages, Stream.orDie(naive))

        const interrupted = yield* Fiber.interrupt(reading).pipe(
          Effect.timeoutOption("1 second"),
        )
        // Unstick the parked generator so the fiber does not outlive the row.
        messages.stop()

        return { interrupted: interrupted._tag, closeCalls: messages.closeCalls }
      }),
    )

    expect(outcome.interrupted).toBe("None")
    // Not even reached: the channel's own finalizer runs first and never returns.
    expect(outcome.closeCalls).toBe(0)
  })
})
