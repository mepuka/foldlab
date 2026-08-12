/**
 * The HTTP surface over the two-fold core (effect/unstable/http on
 * @effect/platform-bun, per the effect.solutions setup).
 *
 * The demo routes serve the lab's central law where a browser can see it:
 * SL1 — the chain remembers what the fold forgives. /demo/merge returns two
 * linearizations of the same sources whose fold state digests are EQUAL and
 * whose merged heads DIFFER; /demo/fork returns two heads sharing one
 * parent. See .reference/core-concepts.md for the theory and
 * .reference/playground-mech for the proofs behind it.
 */

import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import {
  applyMerge,
  event,
  factDigest,
  foldKV,
  headFrom,
  mergeSeed,
  put,
  type Head,
  type MergeFact,
  type Segment,
  type StreamEvent,
  stateDigest,
  streamSeed,
} from "@foldlab/core/stream"

const alpha = [event("alpha", 1, "a=1"), event("alpha", 2, "b=2"), event("alpha", 3, "a=3")]
const beta = [event("beta", 1, "c=4"), event("beta", 2, "a=5")]
const sources = new Map<string, ReadonlyArray<StreamEvent>>([
  ["alpha", alpha],
  ["beta", beta],
])

const baseFact: MergeFact = {
  picks: [
    { stream: "alpha", seq: 1 },
    { stream: "beta", seq: 1 },
    { stream: "alpha", seq: 2 },
    { stream: "beta", seq: 2 },
    { stream: "alpha", seq: 3 },
  ],
}
// The same sources with two adjacent CROSS-KEY picks swapped: meaning
// (fold state) must agree, history (merged head) must not.
const swappedFact: MergeFact = {
  picks: [
    { stream: "alpha", seq: 1 },
    { stream: "alpha", seq: 2 },
    { stream: "beta", seq: 1 },
    { stream: "beta", seq: 2 },
    { stream: "alpha", seq: 3 },
  ],
}

const mergeDemo = Effect.gen(function* () {
  const base = yield* applyMerge(baseFact, sources)
  const swapped = yield* applyMerge(swappedFact, sources)
  const baseState = yield* foldKV(base)
  const swappedState = yield* foldKV(swapped)
  return yield* HttpServerResponse.json({
    law: "SL1: the chain remembers what the fold forgives",
    baseFactDigest: factDigest(baseFact),
    swappedFactDigest: factDigest(swappedFact),
    mergedHeads: {
      base: headFrom(mergeSeed(), base),
      swapped: headFrom(mergeSeed(), swapped),
      equal: headFrom(mergeSeed(), base) === headFrom(mergeSeed(), swapped),
    },
    foldStateDigests: {
      base: stateDigest(baseState),
      swapped: stateDigest(swappedState),
      equal: stateDigest(baseState) === stateDigest(swappedState),
    },
  })
})

const forkDemo = Effect.suspend(() => {
  const root = streamSeed("session")
  const store = new Map<Head, Segment>()
  const trunk = put(store, {
    parent: root,
    events: [event("session", 1, "a=1"), event("session", 2, "b=2")],
  })
  const childA = put(store, { parent: trunk, events: [event("session", 3, "a=9")] })
  const childB = put(store, { parent: trunk, events: [event("session", 3, "b=7")] })
  return HttpServerResponse.json({
    law: "SL4: a fork is two heads, one parent — shared structure, distinct identity",
    root,
    trunk,
    childA,
    childB,
    segmentsStored: store.size,
    note: "fork resolution is fenced commitment; see the effector lane in .reference/playground-mech",
  })
})

const Routes = Layer.mergeAll(
  HttpRouter.add("GET", "/health", HttpServerResponse.text("foldlab: two folds, one law")),
  HttpRouter.add("GET", "/demo/merge", mergeDemo),
  HttpRouter.add("GET", "/demo/fork", forkDemo),
)

HttpRouter.serve(Routes).pipe(
  Layer.provide(BunHttpServer.layer({ port: 3123 })),
  Layer.launch,
  BunRuntime.runMain,
)
