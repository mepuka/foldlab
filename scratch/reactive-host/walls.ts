// EXEMPLAR ONLY — not a gate, wired into nothing.
//
// Three walls, each a law at the UI seam. Every wall compares the hosted
// Model against plait's own Anchor chain, which the MVU code never touches:
// both-sides-agree is not verification, so the oracle sits outside the fold.

import { Effect, Layer, Stream } from "effect"
import { Atom, AtomRegistry, AsyncResult } from "effect/unstable/reactivity"

import * as Catalog from "../../packages/plait/src/Catalog.js"
import * as PlaitDigest from "../../packages/plait/src/Digest.js"
import { FabricClient } from "../../packages/plait/src/FabricClient.js"
import * as Resolved from "../../packages/plait/src/Resolved.js"

import * as Slice from "./slice.js"

// ---------------------------------------------------------------------------
// Test tape. No clock anywhere: positions are the only coordinate.
// ---------------------------------------------------------------------------

const notes = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]

const tape = Effect.fn("walls.tape")(function* (slice: Slice.Slice) {
  const arrivals: Array<Slice.Positioned> = []
  for (const [index, note] of notes.entries()) {
    arrivals.push(
      yield* Slice.positionedOf(slice, { room: "north", note }, index + 1),
    )
  }
  return arrivals
})

// ---------------------------------------------------------------------------
// The hosted read plane. One Atom holds the folded Model; the fold runs over
// the subscription Stream, which is the ONLY read surface plait offers.
//
// FINDING F-3 made concrete: `ReceivedEnvelope` carries no position, so the
// consumer keeps its own digest -> position side table to run the successor
// discipline at all.
// ---------------------------------------------------------------------------

const hostedModel = (
  slice: Slice.Slice,
  arrivals: ReadonlyArray<Slice.Positioned>,
  options: {
    readonly tearAfter?: number
    readonly recovery?: ReadonlyArray<Slice.Positioned>
  } = {},
) => {
  const byDigest = new Map(arrivals.map((a) => [a.digest as string, a]))
  for (const a of options.recovery ?? []) byDigest.set(a.digest as string, a)

  const step = Slice.update(slice.fold)

  const runtime = Atom.runtime(
    Layer.merge(
      Catalog.substrateLayer,
      Slice.watchLayer(arrivals, { ...(options.tearAfter !== undefined ? { tearAfter: options.tearAfter } : {}) }),
    ),
  )

  const live = runtime.atom(Stream.unwrap(Effect.gen(function* () {
    const client = yield* FabricClient
    const subject = yield* Slice.laneSubject(slice)
    const feed = yield* client.subscribe(subject)

    const arrived = Stream.map(feed, (received) => {
      const positioned = byDigest.get(received.digest as string)
      if (positioned === undefined) {
        throw new Error(`no position for envelope ${received.digest}`)
      }
      return Slice.Arrived(positioned)
    })

    // A torn feed is an absence refusal; it is caught into a `Torn` message
    // and then recovered BY READ. The watch plane decides nothing.
    const recovered = options.recovery === undefined
      ? arrived
      : Stream.catchCause(arrived, () =>
        Stream.concat(
          Stream.make(Slice.Torn, Slice.Recovered),
          Stream.map(Stream.fromIterable(options.recovery ?? []), Slice.Arrived),
        ))

    return Stream.scan(recovered, Slice.init, (model, message) => step(model, message)[0])
  })))

  return { runtime, live }
}

// ---------------------------------------------------------------------------

const fail = (wall: string, detail: string): never => {
  console.log(`FAIL  ${wall}: ${detail}`)
  process.exitCode = 1
  throw new Error(`${wall}: ${detail}`)
}

const pass = (wall: string, detail: string): void => {
  console.log(`PASS  ${wall} — ${detail}`)
}

// ---------------------------------------------------------------------------
// WALL 1 — replay. The live fold's state and a replay from the same anchor
// agree by state digest. `f3_resume_exact` observed at the host.
// ---------------------------------------------------------------------------

const wall1 = Effect.fn("walls.wall1")(function* (slice: Slice.Slice) {
  const arrivals = yield* tape(slice)
  const { live } = hostedModel(slice, arrivals)

  const before = yield* Atom.get(live)
  const model = yield* Atom.getResult(live)

  // The independent oracle: plait's own Anchor chain, built by
  // Anchor.initial / Anchor.advance, which the MVU update never calls.
  const oracle = yield* Slice.anchorChain(slice, arrivals)
  const hosted = yield* Slice.stateDigest(model.state)

  if (hosted !== oracle.anchor.stateDigest) {
    return fail("wall 1 (replay)", `hosted ${hosted} != anchor ${oracle.anchor.stateDigest}`)
  }
  if (model.floor !== oracle.anchor.floor) {
    return fail("wall 1 (replay)", `floor ${model.floor} != ${oracle.anchor.floor}`)
  }

  // f3_resume_exact at the host: fold a prefix, resume the suffix from that
  // state, and land on the same digest as folding the whole tape.
  const cut = 2
  const prefix = yield* Slice.anchorChain(slice, arrivals.slice(0, cut))
  let resumed = prefix.state
  for (const arrival of arrivals.slice(cut)) {
    resumed = slice.fold.step(resumed, arrival.event)
  }
  const resumedDigest = yield* Slice.stateDigest(resumed)
  if (resumedDigest !== hosted) {
    return fail("wall 1 (replay)", `resume ${resumedDigest} != whole ${hosted}`)
  }

  pass(
    "wall 1 (replay)",
    `live == anchor == resume-from-${cut} at ${hosted.slice(0, 16)}… (AsyncResult entered ${before._tag})`,
  )
  return { arrivals, digest: hosted }
})

// ---------------------------------------------------------------------------
// WALL 2 — chatter. Kill the subscription mid-stream, recover by read; the
// recovered Model's state digest equals the uninterrupted run's.
// ---------------------------------------------------------------------------

const wall2 = Effect.fn("walls.wall2")(function* (
  slice: Slice.Slice,
  arrivals: ReadonlyArray<Slice.Positioned>,
  uninterrupted: PlaitDigest.Digest,
) {
  const tearAfter = 3

  // Recovery by read: the remainder, deliberately shuffled and duplicated.
  // F2b leaves multiplicity and arrival order free; only the contiguous
  // successor at floor + 1 may advance the frontier.
  const tail = arrivals.slice(tearAfter)
  const recovery = [
    ...arrivals.slice(1, 3), // stale redeliveries, below the frontier
    ...[...tail].reverse(), // out of order
    ...tail, // duplicated
  ]

  const { live } = hostedModel(slice, arrivals, { tearAfter, recovery })
  const model = yield* Atom.getResult(live)
  const recoveredDigest = yield* Slice.stateDigest(model.state)

  if (recoveredDigest !== uninterrupted) {
    return fail(
      "wall 2 (chatter)",
      `recovered ${recoveredDigest} != uninterrupted ${uninterrupted}`,
    )
  }
  if (model.floor !== arrivals.length) {
    return fail("wall 2 (chatter)", `floor ${model.floor} != ${arrivals.length}`)
  }
  if (model.absorbed === 0) {
    return fail("wall 2 (chatter)", "no redelivery was absorbed; the tape did not exercise the discipline")
  }
  if (model.chatter === "live") {
    return fail("wall 2 (chatter)", "the feed never tore; the wall proved nothing")
  }

  pass(
    "wall 2 (chatter)",
    `torn after ${tearAfter}, recovered by read, ${model.absorbed} redeliveries absorbed, same digest`,
  )
})

// ---------------------------------------------------------------------------
// WALL 3 — no clock. The Model and the view contain no wall-clock datum;
// staleness appears only as head - anchor, in positions.
// ---------------------------------------------------------------------------

const clockShaped = (value: unknown): string | null => {
  const seen: Array<string> = []
  const walk = (node: unknown, path: string): void => {
    if (typeof node === "number") {
      // An epoch-milliseconds or epoch-seconds magnitude in a Model this
      // small can only be a clock reading.
      if (Number.isFinite(node) && Math.abs(node) > 1_000_000_000) {
        seen.push(`${path} = ${node}`)
      }
      return
    }
    if (typeof node === "string") {
      if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(node)) seen.push(`${path} = ${node}`)
      return
    }
    if (node instanceof Date) {
      seen.push(`${path} is a Date`)
      return
    }
    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}[${index}]`))
      return
    }
    if (node instanceof Map) {
      for (const [key, child] of node) walk(child, `${path}.get(${String(key)})`)
      return
    }
    if (node !== null && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) walk(child, `${path}.${key}`)
    }
  }
  walk(value, "model")
  return seen.length === 0 ? null : seen.join("; ")
}

const wall3 = Effect.fn("walls.wall3")(function* (
  slice: Slice.Slice,
  arrivals: ReadonlyArray<Slice.Positioned>,
) {
  const step = Slice.update(slice.fold)
  const drive = (): Slice.Model =>
    arrivals.reduce((model, arrival) => step(model, Slice.Arrived(arrival))[0], Slice.init)

  const realNow = Date.now
  const realDate = globalThis.Date

  // Two runs the wall clock cannot tell apart, because nothing reads it.
  const stub = (fixed: number) => {
    Date.now = () => fixed
    // A Date constructed anywhere in the fold would land in the Model and be
    // caught by `clockShaped`; stubbing both doors makes the control honest.
    globalThis.Date = new Proxy(realDate, {
      construct: (target, args) => (args.length === 0 ? new target(fixed) : new (target as any)(...args)),
    }) as DateConstructor
  }

  stub(1_000_000_000_000)
  const first = drive()
  const firstView = JSON.stringify(Slice.view(first, builder), replacer)
  stub(1_900_000_000_000)
  const second = drive()
  const secondView = JSON.stringify(Slice.view(second, builder), replacer)
  Date.now = realNow
  globalThis.Date = realDate

  const firstDigest = yield* Slice.stateDigest(first.state)
  const secondDigest = yield* Slice.stateDigest(second.state)

  if (firstDigest !== secondDigest) {
    return fail("wall 3 (no clock)", `digest moved with the wall clock: ${firstDigest} vs ${secondDigest}`)
  }
  if (firstView !== secondView) {
    return fail("wall 3 (no clock)", "the rendered view moved with the wall clock")
  }

  const inModel = clockShaped(first)
  if (inModel !== null) return fail("wall 3 (no clock)", `Model carries a clock datum: ${inModel}`)

  const inView = clockShaped(JSON.parse(firstView))
  if (inView !== null) return fail("wall 3 (no clock)", `view carries a clock datum: ${inView}`)

  // Staleness must still be expressible — as positions, and only as positions.
  const stale = { ...first, head: first.floor + 4 }
  const staleView = JSON.stringify(Slice.view(stale, builder), replacer)
  if (!staleView.includes("behind 4")) {
    return fail("wall 3 (no clock)", "the view cannot express staleness as head - anchor")
  }

  pass(
    "wall 3 (no clock)",
    `Model and view invariant under two wall clocks; staleness reads "behind 4" in positions`,
  )
})

// A view builder that records structure and nothing else. The real one lives
// in foldkit; render-check.ts drives that. Here the point is only that the
// projection is a function of the Model.
const builder: any = new Proxy({}, {
  get: (_target, tag: string) =>
    tag === "keyed"
      ? () => (key: PropertyKey, attributes: unknown, children: unknown) => ({
        tag: "keyed",
        key: String(key),
        attributes,
        children,
      })
      : (attributes: unknown, children: unknown) => ({ tag, attributes, children }),
})

const replacer = (_key: string, value: unknown) =>
  typeof value === "function" ? "<fn>" : value

// ---------------------------------------------------------------------------
// The digest-keyed resolve-on-demand leg: Atom.family over Resolved.resolve,
// one Atom per digest, absence surfacing as a Failure rather than a throw.
// ---------------------------------------------------------------------------

const resolveLeg = Effect.fn("walls.resolveLeg")(function* (slice: Slice.Slice) {
  const runtime = Atom.runtime(Catalog.substrateLayer)
  const family = Atom.family((digest: PlaitDigest.Digest) =>
    runtime.atom(Resolved.resolve(digest))
  )

  // FINDING F-5: `FoldDeclaration` IS canonical data, but its interface has no
  // index signature, so it is not assignable to `WireValue` and has to be
  // restated field-by-field before it can be published or digested.
  const declaration = {
    v: slice.fold.declaration.v,
    kind: slice.fold.declaration.kind,
    lane: slice.fold.declaration.lane as string,
    algebra: slice.fold.declaration.algebra as string,
    step: slice.fold.declaration.step as string,
  }

  const published = yield* Effect.provide(
    Resolved.publish(declaration),
    Catalog.substrateLayer,
  )

  const missing = yield* Atom.get(family(PlaitDigest.Digest.make("b".repeat(64))))
  if (!AsyncResult.isFailure(missing)) {
    return fail("resolve leg", `absence did not surface as a Failure (${missing._tag})`)
  }

  const one = family(published.digest)
  if (family(published.digest) !== one) {
    return fail("resolve leg", "Atom.family is not keyed by digest identity")
  }

  pass(
    "resolve leg",
    `Atom.family memoized by digest; absence is AsyncResult.Failure, not a throw`,
  )
})

// ---------------------------------------------------------------------------

const main = Effect.gen(function* () {
  const slice = yield* Slice.declareSlice()
  console.log(`lane   ${slice.lane.digest}`)
  console.log(`fold   ${slice.fold.digest}`)
  console.log("")

  const first = yield* wall1(slice)
  yield* wall2(slice, first.arrivals, first.digest)
  yield* wall3(slice, first.arrivals)
  yield* resolveLeg(slice)
})

Effect.runPromise(
  main.pipe(Effect.scoped, Effect.provide(AtomRegistry.layer)),
).then(
  () => {
    if (process.exitCode === undefined || process.exitCode === 0) {
      console.log("\nALL WALLS PASS")
    } else {
      console.log("\nFAILURES PRESENT")
    }
  },
  (error) => {
    console.log(`\nFAILURES PRESENT\n${error}`)
    process.exitCode = 1
  },
)
