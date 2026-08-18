// EXEMPLAR ONLY — not a gate, wired into nothing, imported by nothing in
// packages/. Deleting this directory changes no gate result.
//
// One real lane end-to-end through (lane, declared fold, anchor) -> Model ->
// view. The composition under test:
//
//   foldkit's  update : (Model, Message) -> (Model, Commands)
//     is a catamorphism over the message stream
//   Model      = anchored fold state
//   Message    = a positioned lane envelope arriving by subscription
//   Commands   = candidate acts, values only, never an imperative call
//   View       = a pure finishing projection
//
// The read plane is hosted on effect/unstable/reactivity (Atom), which ships
// INSIDE the pinned effect@4.0.0-rc.108 — see FINDING F-1 in README.md.
//
// Public plait surfaces only. Where a needed read is internal-only, the gap is
// recorded in README.md rather than worked around.

import { Effect, Reducer, Schema, Stream } from "effect"
import { Atom } from "effect/unstable/reactivity"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Algebra from "../../packages/plait/src/Algebra.js"
import * as Anchor from "../../packages/plait/src/Anchor.js"
import * as Catalog from "../../packages/plait/src/Catalog.js"
import * as PlaitDigest from "../../packages/plait/src/Digest.js"
import { FabricClient } from "../../packages/plait/src/FabricClient.js"
import type { ReceivedEnvelope } from "../../packages/plait/src/FabricClient.js"
import * as Fold from "../../packages/plait/src/Fold.js"
import * as Lane from "../../packages/plait/src/Lane.js"
import { absenceRefusal, type Refusal } from "../../packages/plait/src/Refusal.js"
import * as Resolved from "../../packages/plait/src/Resolved.js"
import * as Subjects from "../../packages/plait/src/Subjects.js"
import * as Wire from "../../packages/plait/src/Wire.js"

// ---------------------------------------------------------------------------
// 1. The lane, the algebra, the fold — declared, content-addressed, pure.
// ---------------------------------------------------------------------------

export const NoteAppended = Schema.Struct({
  room: Schema.String,
  note: Schema.String,
})
export type NoteAppended = typeof NoteAppended.Type

/** A stand-in schema digest: this exemplar declares no schema in a catalog. */
const noteSchemaDigest = PlaitDigest.Digest.make("a".repeat(64))

/** The fold state: the notes seen, in lane order. A monoid under concat. */
export type Roll = ReadonlyArray<string>

export interface Slice {
  readonly lane: Lane.DeclaredLane<NoteAppended, 1>
  readonly algebra: Algebra.DeclaredAlgebra<Roll>
  readonly fold: Fold.DeclaredFold<NoteAppended, Roll, 1>
}

export const declareSlice = Effect.fn("slice.declareSlice")(function* (): Effect.fn.Return<
  Slice,
  Refusal
> {
  const lane = yield* Lane.declare({
    handle: "room-notes",
    event: NoteAppended,
    eventSchema: noteSchemaDigest,
    // One partition: concat is associative but NOT commutative, so the
    // declaration door refuses partitions > 1 without an earned witness.
    partitions: 1 as const,
    partitionKey: { path: ["room"] },
  })

  const algebra = yield* Algebra.declare({
    declaration: { name: "note-roll-concat", version: 0 },
    reducer: Reducer.make<Roll>((left, right) => [...left, ...right], []),
  })

  const fold = yield* Fold.declare({
    lane,
    algebra,
    contribution: {
      declaration: { name: "note-roll-append", version: 0 },
      apply: (event: NoteAppended) => [event.note],
    },
  })

  return { lane, algebra, fold }
})

// ---------------------------------------------------------------------------
// 2. The positioned envelope.
//
// FINDING F-3: the public subscribe surface delivers `ReceivedEnvelope`
// (subject, envelope, digest) with NO position. `EmittedEvent.position` and
// `PublishedEnvelope.sequence` exist only on the WRITE side, and the
// successor machinery that consumes positions is internal-only
// (src/internal/successors.ts). A consumer running the successor discipline
// from a subscription therefore has to carry position out of band — which is
// what this record does, and what DEV-765 should close.
// ---------------------------------------------------------------------------

export interface Positioned {
  readonly position: number
  readonly envelope: Wire.Envelope
  readonly digest: PlaitDigest.Digest
  readonly event: NoteAppended
}

export const positionedOf = Effect.fn("slice.positionedOf")(function* (
  slice: Slice,
  event: NoteAppended,
  position: number,
): Effect.fn.Return<Positioned, Refusal> {
  const { digest, envelope } = yield* Wire.encodeEnvelope({
    v: 0,
    kind: "emit",
    lane: slice.lane.digest,
    key: { room: event.room },
    holder: "scratch/reactive-host",
    body: { room: event.room, note: event.note },
    pins: [],
  })
  return { position, envelope, digest, event }
})

// ---------------------------------------------------------------------------
// 3. Model, Message, Commands — the MVU triple.
//
// The Model carries NO wall-clock datum. Staleness is head - anchor, both
// positions, and nothing else. (Wall 3.)
// ---------------------------------------------------------------------------

export interface Model {
  /** The applied-position frontier. The anchor coordinate. */
  readonly floor: number
  /** The fold state at `floor`. */
  readonly state: Roll
  /** Arrivals ahead of the frontier, held until their successor arrives. */
  readonly buffer: ReadonlyMap<number, Positioned>
  /** The highest position the watch plane has mentioned. Advisory only. */
  readonly head: number
  /** What the watch plane is doing. Carries no truth. */
  readonly chatter: "live" | "torn" | "recovering"
  /** Redeliveries the successor discipline absorbed. Evidence, not state. */
  readonly absorbed: number
}

export const init: Model = {
  floor: 0,
  state: [],
  buffer: new Map(),
  head: 0,
  chatter: "live",
  absorbed: 0,
}

export type Message =
  | { readonly _tag: "Arrived"; readonly arrival: Positioned }
  | { readonly _tag: "Torn" }
  | { readonly _tag: "Recovered" }

export const Arrived = (arrival: Positioned): Message => ({ _tag: "Arrived", arrival })
export const Torn: Message = { _tag: "Torn" }
export const Recovered: Message = { _tag: "Recovered" }

/**
 * A candidate act. A VALUE, never an imperative call: `update` returns it and
 * decides nothing. Whether a backfill happens, and against what authority, is
 * not the view's business.
 */
export type Command =
  | { readonly _tag: "RequestBackfill"; readonly fromPosition: number }

export type Return = readonly [Model, ReadonlyArray<Command>]

// ---------------------------------------------------------------------------
// 4. `update` — the catamorphism.
//
// `fold.step` is plait's own public, PURE step (algebra.reducer.combine over
// contribution.apply). This function adds only the successor discipline:
// exactly the `floor + 1` rule `Anchor.advance` enforces, restated in pure
// code because the public door is Effect-valued (FINDING F-2).
// ---------------------------------------------------------------------------

const drain = (fold: Slice["fold"], model: Model): Model => {
  let { floor, state, buffer } = model
  let next = buffer.get(floor + 1)
  while (next !== undefined) {
    const mutable = new Map(buffer)
    mutable.delete(floor + 1)
    buffer = mutable
    state = fold.step(state, next.event)
    floor = floor + 1
    next = buffer.get(floor + 1)
  }
  return { ...model, floor, state, buffer }
}

export const update = (fold: Slice["fold"]) =>
(model: Model, message: Message): Return => {
  switch (message._tag) {
    case "Arrived": {
      const { arrival } = message
      const head = Math.max(model.head, arrival.position)

      // At or below the frontier: a redelivery. Counted, never reapplied.
      // This branch is bookkeeping, not the safety property — run.sh arm 5
      // showed that weakening it changes no digest. The safety property is
      // `drain`'s floor + 1 rule, and that is what arm 5 mutates.
      if (arrival.position <= model.floor) {
        return [{ ...model, head, absorbed: model.absorbed + 1 }, []]
      }

      // Already buffered: also a redelivery.
      if (model.buffer.has(arrival.position)) {
        return [{ ...model, head, absorbed: model.absorbed + 1 }, []]
      }

      const buffer = new Map(model.buffer)
      buffer.set(arrival.position, arrival)
      const drained = drain(fold, { ...model, head, buffer })

      // A gap the watch plane cannot close is a candidate act, not a decision.
      const commands: ReadonlyArray<Command> = drained.buffer.size > 0
        ? [{ _tag: "RequestBackfill", fromPosition: drained.floor + 1 }]
        : []
      return [drained, commands]
    }

    case "Torn":
      // The watch plane decided nothing. Truth is untouched; only the
      // chatter tag moves, and a backfill is offered as a value.
      return [
        { ...model, chatter: "torn" },
        [{ _tag: "RequestBackfill", fromPosition: model.floor + 1 }],
      ]

    case "Recovered":
      return [{ ...model, chatter: "recovering" }, []]
  }
}

// ---------------------------------------------------------------------------
// 5. The view — a pure finishing projection. DELIBERATELY UNSTYLED.
//
// Raw values, minimal markup, no class, no colour, no layout. The visual
// language belongs to the design lane; this slice proves only the spine.
// ---------------------------------------------------------------------------

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([h.Id("slice")], [
    h.p([h.Id("floor")], [`floor ${model.floor}`]),
    h.p([h.Id("head")], [`head ${model.head}`]),
    // The ONLY staleness datum: head - anchor, in positions. No clock.
    h.p([h.Id("behind")], [`behind ${model.head - model.floor}`]),
    h.p([h.Id("chatter")], [`chatter ${model.chatter}`]),
    h.p([h.Id("absorbed")], [`absorbed ${model.absorbed}`]),
    h.ul(
      [h.Id("roll")],
      model.state.map((note, index) => h.keyed("li")(index, [], [note])),
    ),
  ])

// ---------------------------------------------------------------------------
// 6. The anchor oracle — INDEPENDENT of the MVU fold.
//
// Both-sides-agree is not verification. The walls compare the Model's state
// digest against a chain built by plait's own `Anchor.initial` /
// `Anchor.advance`, which the MVU code never touches.
// ---------------------------------------------------------------------------

export const anchorChain = Effect.fn("slice.anchorChain")(function* (
  slice: Slice,
  arrivals: ReadonlyArray<Positioned>,
): Effect.fn.Return<{ anchor: Anchor.Anchor; state: Roll }, Refusal> {
  let state: Roll = []
  let anchor = yield* Anchor.initial(state)
  for (const arrival of arrivals) {
    state = slice.fold.step(state, arrival.event)
    // Refuses any position that is not floor + 1. The successor discipline,
    // enforced by plait rather than restated by us.
    anchor = yield* Anchor.advance(anchor, state, arrival.digest, arrival.position)
  }
  return { anchor, state }
})

export const stateDigest = (state: Roll) => PlaitDigest.digestOf([...state])

// ---------------------------------------------------------------------------
// 7. The read plane — Atom over the plait services layer.
//
// `Atom.runtime` hosts a Layer; `Atom.family` resolves on demand keyed by
// digest; `AsyncResult`'s Initial / Failure / Success carry absence, refusal,
// and value. All headless: `AtomRegistry.layer` needs no DOM and no framework
// binding (FINDING F-1).
// ---------------------------------------------------------------------------

/** The refusal a torn subscription carries: absence-sorted, therefore retryable. */
export const tornRefusal = absenceRefusal({
  kind: "watch-feed-torn",
  law: "A watch feed is advisory; its silence proves nothing and its tear refuses with absence.",
  path: ["scratch", "reactive-host", "watch"],
  got: "torn",
  expected: "a continuing advisory feed",
  next: [{
    subject: "RequestBackfill",
    note: "Recover by read from floor + 1. The watch plane decided nothing.",
  }],
})

/**
 * A fixture watch plane. `subscribe` is the chatter; `tearAfter` is where it
 * dies mid-stream. Nothing here decides anything: it only carries.
 */
export const watchLayer = (
  arrivals: ReadonlyArray<Positioned>,
  options: { readonly tearAfter?: number } = {},
) =>
  FabricClient.testLayer({
    publish: () => Effect.die("scratch/reactive-host publishes nothing"),
    subscribe: (subject) => {
      const received = Stream.map(
        Stream.fromIterable(arrivals),
        (arrival): ReceivedEnvelope => ({
          subject,
          envelope: arrival.envelope,
          digest: arrival.digest,
        }),
      )
      return Effect.succeed(
        options.tearAfter === undefined
          ? received
          : Stream.concat(
            Stream.take(received, options.tearAfter),
            Stream.fail(tornRefusal),
          ),
      )
    },
  })

/** The read-plane runtime: the plait substrate, hosted by Atom. */
export const runtimeAtom = Atom.runtime(Catalog.substrateLayer)

/** Resolve-on-demand, keyed by digest. One Atom per digest, memoized. */
export const resolvedAtom = Atom.family((digest: PlaitDigest.Digest) =>
  runtimeAtom.atom(Resolved.resolve(digest))
)

/** The lane subject the fixture watch plane answers on. */
export const laneSubject = (slice: Slice) =>
  Subjects.evidenceSubject(slice.lane.handle, 0)
