/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Context, Effect, Layer, Schema, Stream } from "effect"

import type { Anchor } from "./Anchor.js"
import type { WireValue } from "../truth/Canonical.js"
import { Digest, digestOf, type Digest as DigestValue } from "../truth/Digest.js"
import type { DeclaredFold } from "./Fold.js"
import { structuralRefusal, type Refusal, type StructuralRefusal } from "../truth/Refusal.js"
import type { Holder } from "../kernel/Wire.js"
import { makeSessionService } from "../internal/sessions.js"

/** Where a session takes its opening consumer position. */
export type AnchorPolicy = "resume" | "replay"

/** The anchor policies this seam knows, in declaration order. */
export const ANCHOR_POLICIES: ReadonlyArray<AnchorPolicy> = ["resume", "replay"]

/** Canonical data naming the declared views one holder may image. */
export interface WritDeclaration {
  readonly v: 0
  readonly kind: "writ"
  readonly holder: Holder
  readonly views: ReadonlyArray<DigestValue>
}

/** A validated, content-addressed read scope and the views it names. */
export interface DeclaredWrit {
  readonly declaration: WritDeclaration
  readonly digest: DigestValue
  readonly holder: Holder
  readonly views: ReadonlyArray<DigestValue>
}

/** Inputs for declaring one read scope. */
export interface WritOptions {
  readonly holder: Holder
  readonly views: ReadonlyArray<DigestValue>
}

/** Inputs for opening one session over a declared fold. */
export interface SubscribeOptions {
  readonly writ: DeclaredWrit
  readonly partition: number
  readonly policy: AnchorPolicy
}

/**
 * Read-plane state: one consumer's position plus the writ scoping what it may
 * image. A session names truth and never carries it — no revision, no
 * substrate handle, and no authority reaches this value.
 */
export interface Session {
  readonly writ: DeclaredWrit
  readonly view: DigestValue
  readonly partition: number
  readonly position: number
}

/**
 * The image of one anchored read under a declared, writ-scoped fold.
 *
 * Every field names one clause of the sentence this seam is shaped by: `state`
 * is the image, `anchor` is the coordinate the read was anchored at, `view` is
 * the declared fold whose image it is, and `writ` is the scope that licensed
 * it. `from` is the consumer position the read started at, so `anchor.floor -
 * from` is the interval this view covers — positions only, never a clock.
 */
export interface View<State> {
  readonly view: DigestValue
  readonly writ: DigestValue
  readonly partition: number
  readonly from: number
  readonly anchor: Anchor
  readonly state: State
}

/** One consumer step: the view a session emits and the session it becomes. */
export interface Step<State> {
  readonly view: View<State>
  readonly session: Session
}

/** Connection bootstrap for live read sessions. */
export interface SessionOptions {
  readonly servers: string | ReadonlyArray<string>
  readonly connectionName?: string
}

/** Transport-free consumer operations over deployed folds. */
export interface SessionService {
  readonly subscribe: <Event, State, const Partitions extends number>(
    fold: DeclaredFold<Event, State, Partitions>,
    options: SubscribeOptions,
  ) => Effect.Effect<Session, Refusal>
  readonly read: <Event, State, const Partitions extends number>(
    session: Session,
    fold: DeclaredFold<Event, State, Partitions>,
  ) => Effect.Effect<Step<State>, Refusal>
}

/**
 * Scope-owned read sessions over the anchors deployed folds checkpoint.
 *
 * The service reads; it never writes an anchor, a state, or a stream. Its live
 * layer ensures the ruled anchor bucket the way every anchor reader does, and
 * that is the only substrate call it makes that is not a read.
 */
export class Sessions extends Context.Service<Sessions, SessionService>()(
  "@foldlab/plait/Sessions",
) {
  /** Builds a scope-owned live NATS KV implementation. */
  static readonly layer = (options: SessionOptions): Layer.Layer<Sessions, Refusal> =>
    Layer.effect(Sessions, makeSessionService(options))

  /** Supplies a fixture implementation through the production service tag. */
  static readonly testLayer = (service: SessionService): Layer.Layer<Sessions> =>
    Layer.succeed(Sessions, Sessions.of(service))
}

const declarationRefusal = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
): StructuralRefusal => structuralRefusal({
  kind: "invalid-session-declaration",
  law: "A session declares one holder, a set of declared views, an anchor policy this seam knows, and a partition its fold's lane declares.",
  path,
  got,
  expected,
  next: [{
    subject: "Session.writ",
    note: "Declare a holder, the view digests this reader may image, a resume or replay policy, and a partition the lane declares.",
  }],
})

const undeclaredView = (
  path: ReadonlyArray<string>,
  got: WireValue,
  expected: WireValue,
): StructuralRefusal => structuralRefusal({
  kind: "undeclared-view",
  law: "A session emits only the image of the declared fold it subscribed to, and only while its writ still names that view.",
  path,
  got,
  expected,
  next: [{
    subject: "Session.writ",
    note: "Declare this fold as a view of the writ, or read through the session opened for a view the writ already names.",
  }],
})

/** Refuses any fold the writ does not name; the writ is re-read every step. */
const admitView = (
  writ: DeclaredWrit,
  view: DigestValue,
): Effect.Effect<void, StructuralRefusal> =>
  writ.views.includes(view)
    ? Effect.void
    : Effect.fail(undeclaredView(
      ["writ", writ.digest, "views"],
      view,
      writ.views.length === 0
        ? "one declared view; this writ names none"
        : `one of the ${writ.views.length} views this writ names`,
    ))

/**
 * Declares the read scope a session reads under.
 *
 * The views are a SET: they enter the declaration sorted and duplicate-free, so
 * two writs naming the same views carry the same digest whatever order they
 * were written in. The empty writ is the least scope — a lawful declaration
 * that names no view, so every view asked of it refuses.
 *
 * A writ is a declaration, not a guard. It scopes what this seam will image and
 * says nothing about any other read path in this package; the holder it names
 * is attribution, never authority.
 */
export const writ = Effect.fn("Session.writ")(function* (
  options: WritOptions,
): Effect.fn.Return<DeclaredWrit, StructuralRefusal> {
  if (typeof options.holder !== "string" || options.holder.length === 0) {
    return yield* declarationRefusal(
      ["holder"],
      typeof options.holder === "string" ? options.holder : String(options.holder),
      "a non-empty holder name",
    )
  }
  if (!Array.isArray(options.views)) {
    return yield* declarationRefusal(["views"], String(options.views), "an array of view digests")
  }
  for (let index = 0; index < options.views.length; index++) {
    if (!Schema.is(Digest)(options.views[index])) {
      return yield* declarationRefusal(
        ["views", String(index)],
        String(options.views[index]),
        "a lowercase SHA-256 digest",
      )
    }
  }

  const views = [...new Set(options.views)].sort()
  const declaration: WritDeclaration = {
    v: 0,
    kind: "writ",
    holder: options.holder,
    views,
  }
  const digest = yield* digestOf(declaration as unknown as WireValue)
  return { declaration, digest, holder: options.holder, views }
})

/**
 * Opens one read session over a declared fold's partition.
 *
 * `resume` positions the session at the durable anchor the pump has
 * checkpointed, so the session opens caught up; `replay` positions it at floor
 * zero, so its first read reports the whole interval the anchor has since
 * accumulated. Either way the session is a value — the substrate learns
 * nothing, and closing a session is dropping it.
 *
 * The writ is judged here, at the seam, before any layer is reached: a fold the
 * writ does not name refuses, whatever the supplied service would have done.
 */
export const subscribe = Effect.fn("Session.subscribe")(function*<
  Event,
  State,
  const Partitions extends number,
>(
  fold: DeclaredFold<Event, State, Partitions>,
  options: SubscribeOptions,
): Effect.fn.Return<Session, Refusal, Sessions> {
  yield* admitView(options.writ, fold.digest)
  if (!ANCHOR_POLICIES.includes(options.policy)) {
    return yield* declarationRefusal(
      ["policy"],
      String(options.policy),
      `one of ${ANCHOR_POLICIES.join(", ")}`,
    )
  }
  if (
    !Number.isSafeInteger(options.partition) ||
    options.partition < 0 ||
    options.partition >= fold.lane.partitions
  ) {
    return yield* declarationRefusal(
      ["partition"],
      Number.isFinite(options.partition) ? options.partition : String(options.partition),
      `an integer from 0 through ${fold.lane.partitions - 1}`,
    )
  }
  const sessions = yield* Sessions
  return yield* sessions.subscribe(fold, options)
})

/**
 * Takes one consumer step: the view this session may emit, and the session it
 * becomes at the coordinate that view was anchored at.
 *
 * This is the coalgebra half stated as a signature — state to observation and
 * next state — and the observation is an image, never a raw arrival. The writ
 * is judged again on every step: admission is never cached on a session, so a
 * hand-built session whose writ stopped naming its view refuses here.
 *
 * What it does NOT claim: this seam refuses undeclared views on ITS surface. It
 * closes no other read path in this package, and no package-wide statement
 * about outbound bytes is proved by it.
 */
export const read = Effect.fn("Session.read")(function*<
  Event,
  State,
  const Partitions extends number,
>(
  session: Session,
  fold: DeclaredFold<Event, State, Partitions>,
): Effect.fn.Return<Step<State>, Refusal, Sessions> {
  if (session.view !== fold.digest) {
    return yield* undeclaredView(["session", "view"], fold.digest, session.view)
  }
  yield* admitView(session.writ, fold.digest)
  const sessions = yield* Sessions
  return yield* sessions.read(session, fold)
})

/**
 * The stream face of the coalgebra: the unfold of {@link read}. Every element
 * is one consumer step — an anchored image and the session it leaves behind —
 * and the writ is judged on every element by construction, because each pull
 * IS a `read`. The stream never closes itself: a session names a position,
 * not a lifetime.
 *
 * Pacing is the consumer's. A pull that arrives before the anchor advanced
 * repeats the standing image at its anchor, which is lawful — a folded answer
 * is never wrong later, only earlier — and any schedule, batching, or
 * debounce is composed downstream by the reader, never promised here.
 */
export const changes = <Event, State, const Partitions extends number>(
  session: Session,
  fold: DeclaredFold<Event, State, Partitions>,
): Stream.Stream<Step<State>, Refusal, Sessions> =>
  Stream.unfold(session, (current) =>
    Effect.map(read(current, fold), (step) => [step, step.session] as const))
