# Variant: a layer that captures `Fiber.getCurrent()` at build time is inert under `Layer.mergeAll`

Filed from the daemon/cas-word/cli-naming merge firefight, 2026-08-30.
Pinned at `effect@4.0.0-rc.112`. Estate fix landed separately on
`fix/daemon-word-wal` (`f1d3719c`); this note is the upstream-facing
half and changes nothing in `library/effects`.

## Judgment

**Defect, upstream, in `RpcServer.makeProtocolStdio` — not in `Layer`.**
`Layer.mergeAll`'s concurrent build is documented semantics; capturing
the layer-build fiber as a handle on the caller's lifetime is not a
valid thing to do under it, and the failure is silent.

## Mechanism

Not memoization, and not a service built twice. The store composition's
merged layer graph is sound: the same `layerStoreAt(store)` value under
one `memoMap` is memoized to one build, one SQLite connection pair, one
of every seam. Nothing in the request path blocks on a duplicated
instance.

The break is **fiber identity at layer-build time**.

`effect/src/unstable/rpc/RpcServer.ts:1284-1309`, `makeProtocolStdio`:

```ts
export const makeProtocolStdio = Effect.gen(function*() {
  const stdio = yield* Stdio
  const fiber = Fiber.getCurrent()!            // 1286 — captured while BUILDING
  ...
    yield* stdio.stdin.pipe(
      Stream.runForEach(...),
      ...
      Effect.ensuring(Effect.forkDetach(Fiber.interrupt(fiber), { startImmediately: true })),  // 1307
      Effect.forkScoped
    )
```

The transport's entire shutdown story is line 1307: when stdin reaches
EOF the stream completes and the fiber captured at line 1286 is
interrupted. For an MCP stdio host that interrupt is the only thing
that ever ends the serving loop — `McpServer` hosts wait on
`Effect.never` by construction, and the estate's is no exception
(`library/effects/bin/mcp/server.ts:302`, `serveUntilClosed`).

The capture is only correct if the fiber that builds the layer is the
fiber that goes on to run the program. Two `Layer` combinators differ
on exactly that, and neither says so at the call site:

- `effect/src/Layer.ts:1587-1602`, `mergeAllEffect` — the engine under
  `Layer.merge` and `Layer.mergeAll`:

  ```ts
  const parentScope = Scope.forkUnsafe(scope, "parallel")
  return internalEffect.forEach(layers, (layer) => layer.build(memoMap, Scope.forkUnsafe(parentScope, "sequential")), {
    concurrency: layers.length
  })
  ```

  `concurrency: layers.length` forks a fiber per member. Each member is
  built on an ephemeral build fiber that completes and dies the moment
  its layer is built.

- `effect/src/Layer.ts:1907-1926`, `provideWith` — the engine under
  `Layer.provide` and `Layer.provideMerge`:

  ```ts
  fromBuild((memoMap, scope) =>
    internalEffect.flatMap(
      ... that.build(memoMap, scope),
      (context) => self.build(memoMap, scope).pipe(...)
    ))
  ```

  A plain `flatMap`. Both halves build on the calling fiber.

So a transport built under `mergeAll` captures a corpse. At EOF the
interrupt is dispatched to a fiber that finished milliseconds after
boot, lands on nothing, and the host serves a closed pipe forever —
no error, no log, no exit. Every visible sign of life is still correct:
the heartbeat beats, the metrics are clean, calls are answered.

## The estate's instance

`library/effects/bin/cli/commands.ts`, the `serve` verb. The composition
was three chained `Effect.provide` calls, and a lint pass folded them
into one `Layer.mergeAll` to satisfy the multiple-provide rule:

```ts
// before — green: layerServeHere built on the fiber that runs the loop
serveUntilClosed.pipe(
  Effect.provide(layerServeHere),
  Effect.provide(layerStoreAt(store)),
  Effect.provide(layerStderrLogs),
)

// after — hangs: layerServeHere built on a forked build fiber
serveUntilClosed.pipe(
  Effect.provide(Layer.mergeAll(
    layerServeHere.pipe(Layer.provide(Layer.mergeAll(layerStoreHere, layerStderrLogs))),
    layerStoreHere,
    layerStderrLogs,
  )),
)
```

The two spell the same context and typecheck identically. `cas serve
--store S </dev/null` exits in ~20 ms on the first and never on the
second. The estate's fix is `Layer.provideMerge`, which is also what
the comment above the code already claimed the shape meant.

Worth noting for the upstream report: Effect's own idiom in tests and
docs is `layerServeStdio(...).pipe(Layer.provideMerge(layerStdio))`,
which is the sequential shape. The estate's own host unit tests
(`test/McpHost.test.ts:78-81`, `test/McpBackpressure.test.ts:202-204`)
use it too, which is why only the probe that spawns a real `cas serve`
child and waits on `child.exited` ever saw this.

## Minimal repro, isolated from the estate

No RPC, no MCP, no store — one layer that captures its build fiber and
interrupts it later, under three compositions that differ only in
combinator. `bun zz-variant.ts` against `effect@4.0.0-rc.112`:

```ts
import { Context, Effect, Fiber, Layer } from "effect"

class Transport extends Context.Service<Transport, { readonly ok: true }>()(
  "Transport",
) {}
class Bystander extends Context.Service<Bystander, { readonly ok: true }>()(
  "Bystander",
) {}

/** The transport: at BUILD time it captures the running fiber, and a
 * scoped fiber interrupts that captured fiber 200 ms later — standing
 * in for "stdin reached EOF". */
const layerTransport = Layer.effect(
  Transport,
  Effect.gen(function* () {
    const captured = Fiber.getCurrent()!
    yield* Effect.forkScoped(
      Effect.sleep(200).pipe(
        Effect.andThen(
          Effect.forkDetach(Fiber.interrupt(captured), { startImmediately: true }),
        ),
      ),
    )
    return { ok: true } as const
  }),
)

const layerBystander = Layer.succeed(Bystander, { ok: true } as const)

const serveForever = Effect.never.pipe(Effect.asVoid)

/** Each case runs in its OWN fiber, so the transport's interrupt lands
 * on that fiber and not on the probe. */
const race = (effect: Effect.Effect<void>, label: string) =>
  Effect.gen(function* () {
    const started = Date.now()
    const fiber = yield* Effect.forkChild(effect)
    const outcome = yield* Effect.raceFirst(
      Fiber.await(fiber).pipe(Effect.as("SHUT DOWN — the interrupt landed")),
      Effect.sleep(3000).pipe(Effect.as("HUNG — the interrupt landed on nothing")),
    )
    yield* Fiber.interrupt(fiber)
    console.log(`${label}: ${outcome}, ${Date.now() - started}ms`)
  })

const program = Effect.gen(function* () {
  yield* race(
    serveForever.pipe(Effect.provide(layerTransport)),
    "provide(layerTransport)                       ",
  )
  yield* race(
    serveForever.pipe(
      Effect.provide(Layer.mergeAll(layerTransport, layerBystander)),
    ),
    "provide(Layer.mergeAll(transport, bystander)) ",
  )
  yield* race(
    serveForever.pipe(
      Effect.provide(layerTransport.pipe(Layer.provideMerge(layerBystander))),
    ),
    "provide(transport |> provideMerge(bystander)) ",
  )
})

Effect.runPromise(Effect.scoped(program)).then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  },
)
```

Observed:

```
provide(layerTransport)                       : SHUT DOWN — the interrupt landed, 207ms
provide(Layer.mergeAll(transport, bystander)) : HUNG — the interrupt landed on nothing, 3007ms
provide(transport |> provideMerge(bystander)) : SHUT DOWN — the interrupt landed, 202ms
```

Case B is the defect: adding an unrelated bystander service to the same
provide, by a combinator documented only as "built concurrently",
silently disables the transport's shutdown.

## What upstream should probably do

End the transport's life through its own **scope** rather than through a
captured fiber — close the layer's scope on EOF, or expose a `Latch` /
`Deferred` the host awaits instead of `Effect.never`. Either survives
any build order. Failing that, `makeProtocolStdio` should at minimum
refuse to build off the calling fiber silently.

## Owed

- Upstream issue against `effect` with the repro above.
- Estate question, separate: whether the multiple-provide lint rule
  should know that `Layer.mergeAll` and a provide chain are not
  interchangeable. The rewrite that caused this was lint-motivated and
  every gate the estate had was green on it.
