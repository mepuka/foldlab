# @foldlab/cas — a content-addressed store as a data structure

`@foldlab/cas` is a private mixed TypeScript/Lean library: a mini
general-purpose content-addressed store (CAS) for Effect. You use it the
way you use a Map — put a value, get a typed root back, follow typed
references — except every node is addressed by the hash of its canonical
bytes, every edge is kind-checked at admission, and every read
re-verifies what storage returned. The same store value can then be
served over a small wire profile, or read straight off any static host,
because storage sits behind one dumb byte-plane seam.

The library keeps different evidence surfaces separate. TypeScript
compilation and tests observe the runtime implementation; the Lean
model, conformance ledger, and ratified manifest vectors live under
their own gates. See [`IMPLEMENTATION-PLAN.md`](IMPLEMENTATION-PLAN.md)
and the minted vocabulary in
[`docs/effect-replay/CONTEXT.md`](../../docs/effect-replay/CONTEXT.md);
the user register — the everyday and protocol vocabulary the CLI
renders — is [`VOCABULARY.md`](VOCABULARY.md).

## The shape

Three layers, one seam:

```
  laws        Cas.value / Cas.ref     typed values, typed DAG references
              Cas.Blob                verified chunked blobs
              Cas.Graph               closure walks, untrusted-host audit
              Cas.Store               the typed-node law: admission at put,
                                      re-verification at load
              Server.Core / httpApp   the same seams, served (cas-http/0)
  ──────────────────────────────────────────────────────────────────────
  seams       Cas.ByteReader          reads and presence  (every backend)
              Cas.ByteWriter          grow-only joins     (writable backends)
              Cas.RootStore           published-roots registry
  ──────────────────────────────────────────────────────────────────────
  backends    Cas.layerMemoryBackend  plain maps
              Cas.layerFileBackend    a store root on any FileSystem
              Cas.layerPathReader     read-only, over any host that serves
                                      bytes at a path (supply one function)
              Cas.layerKvsBackend     any Effect KeyValueStore (SQL is the
                                      SQLite and Litestream route)
              Cas.layerSqlRootStore   the roots registry over any SqlClient —
                                      what SQL adds is enumeration
```

Which layers make a store on a machine, what backing each layout up
means, and why git sync is right for one and wrong for the other:
[`BACKEND.md`](BACKEND.md).

Backends are deliberately dumb byte planes — admission and verification
are laws above the seam, so a backend cannot weaken the store and a
hostile host cannot serve you wrong bytes without a typed refusal. The
read/write split is type-level: a read-only composition (a git-hosted
store, say) simply never provides `ByteWriter`, and writing over it is a
compile error.

## Install and consume

The package remains private while publication is an operator decision.
The built package is ESM-only and publishes JavaScript plus declarations
from `dist`:

```sh
bun add @foldlab/cas@0.1.0 effect@4.0.0-rc.111
```

```ts
import { Cas, Server } from "@foldlab/cas"
```

`Cas` and `Server` are the only root exports — one namespace per plane.

## The data structure

```ts
import { Effect, Layer, Schema } from "effect"
import { Cas } from "@foldlab/cas"

const Author = Cas.value({
  kindTag: 0x21,
  revision: 0,
  schema: Schema.Struct({ name: Schema.String }),
})

const Post = Cas.value({
  kindTag: 0x22,
  revision: 0,
  schema: Schema.Struct({
    title: Schema.String,
    author: Cas.ref(() => Author),          // a typed edge
  }),
})

const program = Effect.gen(function* () {
  const author = yield* Author.put({ name: "ada" })
  const post = yield* Post.put({ title: "hi", author })   // leaf-up
  const back = yield* Post.get(post)     // back.author : Root<Author>
  return yield* Author.get(back.author)  // descent is explicit and lazy
})

program.pipe(Effect.provide(Cas.layerMemoryLive))
```

Typed references are positional markers in the canonical payload plus
typed entries in the node's reference array, so the store's admission
law checks every edge: a reference that points at the wrong kind of
node, or at nothing, refuses at `put` with the clause-named error.
Reading decodes references to typed roots — never loaded children — so
every load stays visible.

Swap `Cas.layerMemoryLive` for a file-backed store, seams exposed:

```ts
const local = Cas.layerFile("./store").pipe(
  Layer.provide(myFileSystemLayer),        // any FileSystem realization
  Layer.provideMerge(Cas.layerCryptoWebCrypto),
)
```

The on-disk layout is `objects/<2 hex>/<62 hex>` plus `roots/<64 hex>`
empty files — rsync-able, diff-able, and committable. Push the store
root to a git repo and anyone can read it with no server at all:

```ts
const hosted = Cas.layerPathReader((path) =>
  httpGetOption(`https://raw.githubusercontent.com/org/repo/main/store/${path}`))
// Cas.Graph.verify(root) now audits the host: every reachable node
// re-hashed and re-decoded — a corrupt or hostile host is a typed
// refusal, not wrong data.
```

## Serving it

A server is the same seams under a wire law — no new storage concepts:

```ts
import { Server } from "@foldlab/cas"

const app = Server.httpApp({ maxBatchKeys: 64, maxNodeBytes: 1 << 20 }).pipe(
  Effect.provide(Server.Core.layer(policy)),
  Effect.provide(backendLayers),           // the SAME backend value
)
```

`cas-http/0` is the wire authority — see
[`PROFILE-CAS-HTTP-0.md`](PROFILE-CAS-HTTP-0.md): content-addressed
`PUT`/`GET` under `/cas/{hex}`, presence under `/control/missing`,
capabilities, root publish and presence under `/roots/{hex}`, bearer
authorization with anonymous reads as policy. The request algebra, the
pure wire-decision law, and the status tables are all data
(`Server.Request`, `Server.decide`, `Server.renderOutcome`), so a
deployment topology is a choice of layers and nothing else.

## Runtime surface

- `Cas` — node vocabulary and clause-named errors (`Cas.ErrorTag`,
  `Cas.isCasError`, `Cas.matchError`); the seams and backends above;
  the `Store` service with the scheme-0 canonical codec
  (`Cas.encodeNode`/`Cas.decodeNode`); `value`/`ref` typed projection;
  `Graph.closure`/`Graph.verify`; verified blob reads under `Cas.Blob`.
- `Server` — `Core` (the semantic core over the seams), `httpApp` (the
  four-step HTTP shell), and the wire law as data.

The record/replay plane (session runtime, pure reducer, replayable
service kit) is stashed at `archive/replay-plane/`, and the hand-built
remote client with its streaming-proof machinery at
`archive/remote-plane/` — a remote returns as a generated transport
adapter of the operation manifest, never as bespoke machinery. The
library focuses on CAS semantics, the DSL, and metaprogramming;
history-node kind tags stay reserved. The retired dual-lane Lean
corpus lives at `archive/lean-model-0.3/`; the live Lean type model of
this library is the Lake package at `library/cas`.

## Gates

`bun run typecheck` (the Effect-aware native compiler), `bun run lint`
(oxlint with the effect ruleset and the house laws), `bun run test`
(unit, law, and conformance suites — the retired model's frozen vectors
still replayed against the implementation), and `mise run check:cas`
(the live Lean type model). TypeScript observations and Lean model
claims remain separate surfaces; every "verified" in this README means
"covered by the named gate", nothing more.
