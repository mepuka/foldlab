import { describe, expect, test } from "bun:test"

import { Effect, Reducer, Result, Schema, Stream } from "effect"

import * as Algebra from "../src/truth/Algebra.js"
import { initial } from "../src/planes/Anchor.js"
import { Digest, digestOf } from "../src/truth/Digest.js"
import * as Fold from "../src/planes/Fold.js"
import * as Lane from "../src/planes/Lane.js"
import * as Session from "../src/planes/Session.js"
import { Holder } from "../src/kernel/Wire.js"
import { LaneHandle } from "../src/planes/Lane.js"

const Event = Schema.Struct({ tenant: Schema.String, delta: Schema.Finite })
const eventSchema = Digest.make("e".repeat(64))

const declareFold = (handle: LaneHandle) => Effect.gen(function* () {
  const lane = yield* Lane.declare({
    handle,
    event: Event,
    eventSchema,
    partitions: 1 as const,
    partitionKey: { path: ["tenant"] },
  })
  const algebra = yield* Algebra.declare({
    declaration: { name: `${handle}-sum`, version: 0 },
    reducer: Reducer.make<number>((left, right) => left + right, 0),
  })
  return yield* Fold.declare({
    lane,
    algebra,
    contribution: {
      declaration: { name: `${handle}-delta`, version: 0 },
      apply: (event: typeof Event.Type) => event.delta,
    },
  })
})

/**
 * The planted control: a service that images whatever it is handed, with no
 * scope check of its own.
 *
 * Every refusal observed through this layer was therefore minted at the public
 * seam and nowhere else, which is the property the writ has to have — a scope
 * enforced by the adapter would be a scope a fixture layer could drop.
 */
const openDoor = (floor: number, state: number): Session.SessionService => {
  const subscribe: Session.SessionService["subscribe"] = Effect.fn(
    "Session.fixture.subscribe",
  )(function* (fold, options) {
    return {
      writ: options.writ,
      view: fold.digest,
      partition: options.partition,
      position: options.policy === "replay" ? 0 : floor,
    }
  })

  const read: Session.SessionService["read"] = Effect.fn("Session.fixture.read")(
    function* (session, fold) {
      const anchor = { ...(yield* initial(state)), floor }
      return {
        view: {
          view: fold.digest,
          writ: session.writ.digest,
          partition: session.partition,
          from: session.position,
          anchor,
          // The fixture's carrier is a number whatever the fold declares; the
          // seam under test judges scope, not the image's type.
          state: state as never,
        },
        session: { ...session, position: floor },
      }
    },
  )

  return { subscribe, read }
}

const layerOf = (floor: number, state: number) =>
  Session.Sessions.testLayer(openDoor(floor, state))

describe("declared writs", () => {
  test("the views are a set, so order and duplicates do not move the digest", async () => {
    const [left, right] = await Effect.runPromise(Effect.all([
      declareFold(LaneHandle.make("writ-set-a")),
      declareFold(LaneHandle.make("writ-set-b")),
    ]))

    const [written, rewritten] = await Effect.runPromise(Effect.all([
      Session.writ({ holder: Holder.make("reader"), views: [left.digest, right.digest] }),
      Session.writ({
        holder: Holder.make("reader"),
        views: [right.digest, left.digest, right.digest],
      }),
    ]))

    expect(rewritten.digest).toBe(written.digest)
    expect(written.views).toEqual([...written.views].sort())
    expect(rewritten.views.length).toBe(2)
    expect(written.declaration.kind).toBe("writ")
  })

  test("the empty writ is lawful, names no view, and refuses every one", async () => {
    const fold = await Effect.runPromise(declareFold(LaneHandle.make("writ-empty")))
    const empty = await Effect.runPromise(Session.writ({ holder: Holder.make("reader"), views: [] }))
    expect(empty.views).toEqual([])

    const refusal = await Effect.runPromise(Effect.flip(
      Session.subscribe(fold, { writ: empty, partition: 0, policy: "resume" }).pipe(
        Effect.provide(layerOf(0, 0)),
      ),
    ))

    expect(refusal.kind).toBe("undeclared-view")
    expect(refusal.expected).toContain("names none")
  })

  test("a view that is not a digest refuses the declaration", async () => {
    const refusal = await Effect.runPromise(Effect.flip(Session.writ({
      holder: Holder.make("reader"),
      views: ["not-a-digest" as unknown as Digest],
    })))

    expect(refusal.kind).toBe("invalid-session-declaration")
    expect(refusal.path).toEqual(["views", "0"])
  })

  test("a holder with no name refuses the declaration", async () => {
    const refusal = await Effect.runPromise(Effect.flip(
      // Cast, deliberately: the holder brand makes an unnamed holder
      // unspellable, and the seam's own runtime check is what this asserts —
      // the same shape the view arm above uses to present a non-digest.
      Session.writ({ holder: "" as unknown as Holder, views: [] }),
    ))

    expect(refusal.kind).toBe("invalid-session-declaration")
    expect(refusal.path).toEqual(["holder"])
  })
})

describe("the consumer seam", () => {
  test("the writ is judged at the seam, not by the layer under it", async () => {
    const [declared, undeclared] = await Effect.runPromise(Effect.all([
      declareFold(LaneHandle.make("seam-declared")),
      declareFold(LaneHandle.make("seam-undeclared")),
    ]))
    const scope = await Effect.runPromise(Session.writ({
      holder: Holder.make("reader"),
      views: [declared.digest],
    }))
    const layer = layerOf(3, 6)

    const admitted = await Effect.runPromise(
      Session.subscribe(declared, { writ: scope, partition: 0, policy: "resume" }).pipe(
        Effect.provide(layer),
      ),
    )
    expect(admitted.view).toBe(declared.digest)
    expect(admitted.position).toBe(3)

    const refusal = await Effect.runPromise(Effect.flip(
      Session.subscribe(undeclared, { writ: scope, partition: 0, policy: "resume" }).pipe(
        Effect.provide(layer),
      ),
    ))
    expect(refusal.kind).toBe("undeclared-view")
    expect(refusal.path).toEqual(["writ", scope.digest, "views"])

    const trace = "SESSION CONTROL: PASS mutant=open-door-service admitted=declared-view refused=undeclared-view judged-at=Session.subscribe"
    console.info(trace)
  })

  test("an anchor policy this seam does not know refuses", async () => {
    const fold = await Effect.runPromise(declareFold(LaneHandle.make("policy-unknown")))
    const scope = await Effect.runPromise(Session.writ({
      holder: Holder.make("reader"),
      views: [fold.digest],
    }))

    const refusal = await Effect.runPromise(Effect.flip(
      Session.subscribe(fold, {
        writ: scope,
        partition: 0,
        policy: "tail" as Session.AnchorPolicy,
      }).pipe(Effect.provide(layerOf(0, 0))),
    ))

    expect(refusal.kind).toBe("invalid-session-declaration")
    expect(refusal.path).toEqual(["policy"])
  })

  test("a partition the lane never declared refuses", async () => {
    const fold = await Effect.runPromise(declareFold(LaneHandle.make("partition-outside")))
    const scope = await Effect.runPromise(Session.writ({
      holder: Holder.make("reader"),
      views: [fold.digest],
    }))

    const refusal = await Effect.runPromise(Effect.flip(
      Session.subscribe(fold, { writ: scope, partition: 1, policy: "resume" }).pipe(
        Effect.provide(layerOf(0, 0)),
      ),
    ))

    expect(refusal.kind).toBe("invalid-session-declaration")
    expect(refusal.path).toEqual(["partition"])
  })

  test("replay opens at floor zero and resume opens at the checkpointed floor", async () => {
    const fold = await Effect.runPromise(declareFold(LaneHandle.make("policy-positions")))
    const scope = await Effect.runPromise(Session.writ({
      holder: Holder.make("reader"),
      views: [fold.digest],
    }))
    const layer = layerOf(7, 12)

    const [replayed, resumed] = await Effect.runPromise(Effect.all([
      Session.subscribe(fold, { writ: scope, partition: 0, policy: "replay" }),
      Session.subscribe(fold, { writ: scope, partition: 0, policy: "resume" }),
    ]).pipe(Effect.provide(layer)))

    expect(replayed.position).toBe(0)
    expect(resumed.position).toBe(7)
  })

  test("a step emits the image and the session the read leaves behind", async () => {
    const fold = await Effect.runPromise(declareFold(LaneHandle.make("step-image")))
    const scope = await Effect.runPromise(Session.writ({
      holder: Holder.make("reader"),
      views: [fold.digest],
    }))

    const step = await Effect.runPromise(Effect.gen(function* () {
      const opened = yield* Session.subscribe(fold, {
        writ: scope,
        partition: 0,
        policy: "replay",
      })
      return yield* Session.read(opened, fold)
    }).pipe(Effect.provide(layerOf(4, 9))))

    expect(step.view.view).toBe(fold.digest)
    expect(step.view.writ).toBe(scope.digest)
    expect(step.view.from).toBe(0)
    expect(step.view.anchor.floor).toBe(4)
    expect(step.view.anchor.stateDigest).toBe(await Effect.runPromise(digestOf(9)))
    expect(step.view.state).toBe(9)
    expect(step.session.position).toBe(4)
    expect(step.session.writ.digest).toBe(scope.digest)
  })

  test("admission is never cached: a writ that stopped naming the view refuses", async () => {
    const fold = await Effect.runPromise(declareFold(LaneHandle.make("writ-narrowed")))
    const [scope, narrowed] = await Effect.runPromise(Effect.all([
      Session.writ({ holder: Holder.make("reader"), views: [fold.digest] }),
      Session.writ({ holder: Holder.make("reader"), views: [] }),
    ]))

    const opened = await Effect.runPromise(
      Session.subscribe(fold, { writ: scope, partition: 0, policy: "resume" }).pipe(
        Effect.provide(layerOf(2, 5)),
      ),
    )

    const refusal = await Effect.runPromise(Effect.flip(
      Session.read({ ...opened, writ: narrowed }, fold).pipe(
        Effect.provide(layerOf(2, 5)),
      ),
    ))

    expect(refusal.kind).toBe("undeclared-view")
    expect(refusal.path).toEqual(["writ", narrowed.digest, "views"])
  })

  test("reading a fold this session did not subscribe to refuses", async () => {
    const [subscribed, other] = await Effect.runPromise(Effect.all([
      declareFold(LaneHandle.make("session-view")),
      declareFold(LaneHandle.make("session-other")),
    ]))
    const scope = await Effect.runPromise(Session.writ({
      holder: Holder.make("reader"),
      views: [subscribed.digest, other.digest],
    }))

    const opened = await Effect.runPromise(
      Session.subscribe(subscribed, { writ: scope, partition: 0, policy: "resume" }).pipe(
        Effect.provide(layerOf(1, 1)),
      ),
    )

    const refusal = await Effect.runPromise(Effect.flip(
      Session.read(opened, other).pipe(Effect.provide(layerOf(1, 1))),
    ))

    expect(refusal.kind).toBe("undeclared-view")
    expect(refusal.path).toEqual(["session", "view"])
    expect(refusal.expected).toBe(subscribed.digest)
  })
})

/**
 * The stream face: `changes` is the unfold of `read`, so its elements are the
 * read chain's own steps and the writ is judged on every pull by
 * construction. The fixture advances its floor per read, so element equality
 * with the sequential chain is a real sequencing claim, not a constant.
 */
const advancingDoor = (): Session.SessionService => {
  let floor = 0
  const subscribe: Session.SessionService["subscribe"] = Effect.fn(
    "Session.fixture.subscribe",
  )(function* (fold, options) {
    return {
      writ: options.writ,
      view: fold.digest,
      partition: options.partition,
      position: options.policy === "replay" ? 0 : floor,
    }
  })
  const read: Session.SessionService["read"] = Effect.fn("Session.fixture.read")(
    function* (session, fold) {
      floor += 1
      const anchor = { ...(yield* initial(floor)), floor }
      return {
        view: {
          view: fold.digest,
          writ: session.writ.digest,
          partition: session.partition,
          from: session.position,
          anchor,
          state: floor as never,
        },
        session: { ...session, position: floor },
      }
    },
  )
  return { subscribe, read }
}

describe("the changes stream face", () => {
  test("take(n) is exactly n sequential reads", async () => {
    const fold = Effect.runSync(declareFold(LaneHandle.make("stream-face")))
    const collected = await Effect.runPromise(
      Effect.gen(function* () {
        const writ = yield* Session.writ({ holder: Holder.make("reader"), views: [fold.digest] })
        const session = yield* Session.subscribe(fold, {
          writ,
          partition: 0,
          policy: "replay",
        })
        return yield* Stream.runCollect(Stream.take(Session.changes(session, fold), 3))
      }).pipe(Effect.provide(Session.Sessions.testLayer(advancingDoor()))) as unknown as Effect.Effect<
        ReadonlyArray<Session.Step<number>>,
        never
      >,
    )
    expect(collected.map((step) => step.view.anchor.floor)).toEqual([1, 2, 3])
    expect(collected.map((step) => step.view.from)).toEqual([0, 1, 2])
    expect(collected.map((step) => step.session.position)).toEqual([1, 2, 3])
  })

  test("the writ is judged on every element: an unnamed view refuses on the stream", async () => {
    const fold = Effect.runSync(declareFold(LaneHandle.make("stream-face-unnamed")))
    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const writ = yield* Session.writ({ holder: Holder.make("reader"), views: [] })
        const session: Session.Session = {
          writ,
          view: fold.digest,
          partition: 0,
          position: 0,
        }
        return yield* Effect.result(
          Stream.runCollect(Stream.take(Session.changes(session, fold), 1)),
        )
      }).pipe(Effect.provide(Session.Sessions.testLayer(advancingDoor()))) as unknown as Effect.Effect<
        Result.Result<unknown, { readonly kind: string }>,
        never
      >,
    )
    expect(Result.isFailure(outcome)).toBe(true)
    if (Result.isFailure(outcome)) expect(outcome.failure.kind).toBe("undeclared-view")
  })
})
