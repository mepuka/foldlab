# Architecture audit, TS lane: wire, client, author, codegen, mcp, session, core algebra

Lane report, 2026-08-14. Explore agent (very thorough), coordinator-dispatched;
verified against `main` at `21d77220c`. Companion to the
[authoritative synthesis](2026-08-14-architecture-audit.md); this document is
evidence, the synthesis ranks and decides. Preserved as delivered, light
formatting only.

---

## 1. How `flb.type.v0` is modeled in TS

**It isn't — not as a type.** No Effect Schema and no discriminated union for
the IR anywhere in TypeScript.

- The author fold's output type is `proto/ts/src/author.ts:20` —
  `export type V0 = { [key: string]: Json }`, an open record over the generic
  JSON union at `proto/ts/src/jcs.ts:13`.
- Codegen consumes `Json` and narrows at runtime only: the `node()` guard at
  `proto/ts/src/codegen.ts:32-35`, then three independent `switch (n["k"])`
  walks — effect-schema `codegen.ts:107-190`, json-schema
  `codegen.ts:203-292`, go `codegen.ts:335-403` — each with its own
  `default: … "unknown kind"` (`codegen.ts:187-189`, `289-291`, `400-402`).
  `toSchemaNode` is literally typed `): any | Fail` (`codegen.ts:111`).
- The IR crosses the wire untyped too: `client.createType(structure: Json, …)`
  (`client.ts:288-296`), `ConciergeReply.partial: Schema.Json`
  (`wire.ts:141`), `SessionStateReply.partial: Schema.Json` (`wire.ts:161`).
  Grammar validation is entirely daemon-side.

**Closed vs open:** open in TS, closed in Go. The authoritative closed
enumeration is `proto/go/protod/walk.go:19-24` (`v0Kinds`, 13 kinds;
`partialKinds` = those + `"hole"`). TS mirrors it three-plus times as *data
or control flow*, never as a type: the productions list in
`session.ts:27-46`, and the three codegen switches.

**Partial terms / holes:** data-only. `session.ts:241` mints `{ k: "hole" }`
as a `Json`; the grammar descriptor names
`partialKind: { k: "hole", required: ["k"] }` at `session.ts:26`. Codegen
refuses holes at `codegen.ts:127-128`, `222-223`, `351-352`
("authoring-only"). Nothing in the type system distinguishes a complete
structure from a partial one — `Json` is the type of both; the author fold
(`author.ts:266`) simply never produces a hole.

So: several partial representations (a phantom `V0` alias, a `Json` value
grammar in `session.ts`, three runtime switches, one Go list), no single
type, no closed union, no type-level hole.

## 2. Refusals end to end

**Wire schema** (`proto/ts/src/wire.ts:69-99`): shared `RefusalFields` —
note `kind: Schema.String`, *not* a literal union (`wire.ts:70`).
`DaemonRefusal` adds `sort: Literals(["structural","absence"])` +
`local: Literal(false)` (`:79-83`); `LocalRefusal` adds `local: Literal(true)`
and no sort (`:86-89`); union at `:92`.

**Sort table:** 12 daemon kinds at `wire.ts:23-36`, types derived at
`:38-39`, grammar digest pinned at `:43-45`, genuinely walled against
`proto/wire/refusal-sorts.json` on both sides
(`proto/ts/test/refusal-sort.test.ts:15-54`;
`proto/go/protod/refusal_sort_test.go:19`). Go's twin is
`proto/go/protod/refusal.go:47-60`.

**Client-local kinds are not typed at all.** `localRefusal(kind: string, …)`
(`wire.ts:263`). Kinds actually minted, by grep: `bad-journal`
(`client.ts:58`), `unreachable` (`client.ts:98`,`156`), `malformed`
(`client.ts:128`,`140`; `mcp.ts:237`), `verify-failed` (`client.ts:200`,
`215`,`231`,`245`,`260`), `malformed-reply` (`wire.ts:290`,`301`,`312`;
`mcp.ts:132`), `beyond-v0` (`author.ts:76`), `invalid-structure`
(`author.ts:85`,`240`), `underivable` (`codegen.ts:27`), `digest-mismatch`
(`codegen.ts:419`), plus `compaction-blocked` hand-built with `local:true`
at `session.ts:92-103`.

**What mcp.ts advertises:** a *narrowed* re-declaration — 12 daemon literals
(`mcp.ts:31-48`) and 8 client-local literals (`mcp.ts:50-63`), packed into
`McpOutputEnvelope` (`mcp.ts:69-75`), declared as every dynamic tool's
`success` schema (`mcp.ts:203`).

**Finding — the advertised local vocabulary is incomplete and unwalled.**
`invalid-structure` (`author.ts:86`,`241`) and `compaction-blocked`
(`session.ts:93`) are minted as *local* refusals but appear only in the
*daemon* literal list, which additionally requires `sort` and `local:false`.
Neither path is reachable from today's mcp handlers, but nothing enforces
that, and no test compares `mcp.ts:31-63` against `DAEMON_REFUSAL_SORTS` or
the `localRefusal` call sites — `mcp-derivation-conformance.test.ts:30-49`
only checks tool-name injectivity. Separately, the exported `asRefusal`
helper (`mcp.ts:298-301`) decodes against the *wide* `RefusalSchema`, so an
MCP client using it accepts a looser vocabulary than the tool schema
advertises.

**The `example` field:** `Schema.optionalKey(Schema.Unknown)`
(`wire.ts:75`); Go side `Example any` with `omitempty`
(`proto/go/protod/refusal.go:92`). Polymorphic in practice — a bare
journal-name string at `client.ts:53`, an flb.type.v0 node at
`author.ts:248-251` and `mcp.test.ts:346`. Load-bearing: the self-repair
story casts it unvalidated — `proto/ts/examples/refusals.ts:41`,
`typoed.refusal.example as Json`, fed straight back into `createType`. There
is also a *second, differently typed* `example`:
`FrontierChoice.example: Schema.Json` (`wire.ts:129-130`) and
`ContractIngress.example: Schema.String` (`wire.ts:227`).

## 3. Continuation-modeled machinery: implemented vs designed

**Implemented (all of it append-only audit, none of it continuation
capture):**
- `Session` transcript — `session.ts:178-274`; steps allocated at send time,
  not completion (`:205-229`), snapshot frozen + structurally cloned
  (`:201-203`); tested at `proto/ts/test/session-transcript.test.ts:8-77`.
  No replay function over a transcript; `received` is `unknown`
  (`session.ts:183`).
- `JournalSession` — `session.ts:109-176`. `expectedHead` is passed through
  but never retried (`:140-160`); `resume` (`:129`) is a state re-read, not
  a replay. Session-journal replay lives in Go; TS only re-derives the
  frozen fixture's heads and state digests
  (`proto/ts/test/session-journal.test.ts:66-80` over
  `proto/wire/fixtures/sessions.json`).
- Retention/compaction — `sessionRetentionTier` (`session.ts:67-80`) and
  `refuseSessionCompaction` (`session.ts:85-105`): total, deliberately
  always refusing, pending `flb.certification.v0`.
- Fold-side replay primitives in core — `defineFold` (`fold.ts:129-158`),
  invalidation-free cache keyed by (fold digest, head)
  (`foldCache.ts:128-140`, `184-241`), `compact` (`stream.ts:439-453`),
  segment `replay` over a content-addressed store (`stream.ts:486-505`),
  `applyMerge` replaying a committed linearization (`stream.ts:200-236`).

**Designed only — zero code.** Grepping `packages/` and `proto/` for
`WorkflowEngine`, `unstable/workflow`, `Activity.make`, `DurableDeferred`,
`MessageStorage` returns nothing. So:
- Every signature in
  `docs/design/2026-08-13-effector-backed-workflow-replay.md:220-227`
  (`WorkflowEngineLayer`, `FoldlabTracer`) and the four-Layer spine at
  `:247-269` (`ProtoClientLayer`, `JournalLayer`, `EffectorLayer`,
  `WorkflowRuntimeLayer`) is unbuilt. The doc labels itself honestly
  (RATIFIED-UNBUILT at `:89`, `:135`; "design doc — prose and type
  signatures only, no machinery" at `:6-7`).
- `docs/map/tickets/008-the-workflow-abstraction.md:1-8` is `status: open`,
  unassigned, the effectfulness question explicitly open (`:26-31`). No TS
  artifact corresponds.
- Ticket 020's ratified first slice, `JournalMessageStorage` (Phase 1
  resolution items 1–5), is unbuilt. `packages/client/src/index.ts`,
  `packages/codegen/src/index.ts`, `packages/ai/src/index.ts` are 2-line
  stubs.

## 4. Effect usage patterns

**proto/ts is promise-based with Effect used as a schema library, not a
runtime.** `ProtoClient` methods are plain `async` (`client.ts:77`, `117`,
`176`, `186`). The only Effect runtime usage is the MCP layer
(`mcp.ts:195-267`), and even there handlers are
`Effect.promise(async () => …)` (`mcp.ts:214`) typed
`Record<string, (payload: unknown) => Effect.Effect<unknown>>`
(`mcp.ts:211`) — nothing on the error channel, nothing in the requirements
channel, then cast away (`mcp.ts:257`). **No generators, no fibers, no
`Scope`, no `Effect.fn`, no forking anywhere in the repo**; the single
`Effect.gen` is `packages/server/src/server.ts:61-66`.

**packages/core deliberately runs two error idioms:**
- Pure `{ ok }` unions in the fold/identity lane — `algebra.ts:352-353`,
  `fold.ts`, `foldCache.ts:92-110`, `jcs.ts`, `kvSemilattice.ts`.
- Typed Effect error channel in the stream lane — `Data.TaggedError` at
  `stream.ts:162-176`, `240-242`, `307-310`, `422-425`, `465-471`, driven by
  `Effect.suspend`/`Effect.reduce` (`stream.ts:204`, `304`).
  `foldBindings.ts:20-25` lifts a pure fold onto `Stream.runFold` adding no
  failure of its own. `schema.ts:107-142` is the one real bidirectional
  transformation, failing with `SchemaIssue.InvalidValue`.

The two idioms are documented as non-interchangeable
(`kvSemilattice.ts:46-50`, `stream.ts:286-289`) but the seam between them is
enforced by prose, not types.

## 5. Type-modeling smells

1. **IR untyped at the load-bearing seam** — `author.ts:20`;
   `codegen.ts:111` returns `any | Fail`; `codegen.ts:130`
   `Schema.Literal(n["value"] as any)` re-admits any JSON value as a
   literal, a check the author fold *does* perform (`author.ts:190-197`) but
   codegen does not.
2. **The Effect AST is walked through `any`** — `author.ts:120`
   (`ast as any`), `:158`, `:107`, `:43`. The `CHECK_TABLE`
   (`author.ts:47-64`) is keyed on Effect's internal representation ids; the
   header comment (`author.ts:1-7`) claims a pin bump "breaks THIS table
   loudly", which holds for a renamed *id* but not a renamed *payload
   field* — `args: (p) => ({ min: p.minLength })` would silently yield
   `{min: undefined}` and surface later as a confusing canonicalization
   refusal.
3. **Asymmetric validation in the MCP handlers** — `mcp.ts:219` casts
   publish arguments unvalidated
   (`payload as { journal: string; frame: Json }`) while the read handler
   decodes strictly (`mcp.ts:224-227`); the request handler decodes facts
   against `Schema.Unknown` (`mcp.ts:253`).
4. **`as any` at wiring seams** — `mcp.ts:202` (derived JSON Schema into
   `Tool.dynamic`), `:257`, `:279`, and `mcp-main.ts:34`.
5. **Partiality not expressed** — `localRefusal(kind: string, …)`
   (`wire.ts:263`) has no closed kind type; the refusal vocabulary exists
   only as two hand-maintained literal lists in `mcp.ts:31-63`. Likewise
   `session.ts:183` `received: unknown` makes the audit record's payload
   untyped (tests reach it via `JSON.stringify(...).toContain(...)` —
   `session-transcript.test.ts:26`,`69`,`76`).
6. **Casts on cache/product paths** — `foldCache.ts:238`
   `JSON.parse(entry.bytes) as A`; `algebra.ts:749` and `fold.ts:152`
   `as unknown as`; `foldArbitrary.ts:90`,`:106`,`:131` (the phantom-carrier
   claim `algebra.ts:53-57` acknowledges is never checked).
7. **Law claims are not committed by the digest** — `AlgebraLaws` rides
   *outside* the canonical spec on purpose (`algebra.ts:190-199`), so two
   algebras with identical digests may carry different claims; and `mapped`
   copies the target's laws even on the unnamed/refused path
   (`algebra.ts:619`, `624-632`), so claims survive an identity failure.
8. **Cross-package relative import** — `proto/ts/src/jcs.ts:5-9` reaches
   `../../../packages/core/src/jcs.ts` directly, bypassing the workspace
   graph; `proto/ts/package.json` declares its own `effect@4.0.0-rc.108`
   alongside the root catalog's — a version skew would be silent.

**Go/TS drift — there *is* a real shared fixture wall.**
`proto/wire/fixtures/*` is generated once by `proto/go/cmd/wirefix/main.go`
and consumed by both sides (`proto/go/protod/wall_test.go`;
`proto/ts/test/wall.test.ts:20-146` covering types, owned-types-v1, chains,
frames, concierge, scheme-bridges). Reply accept/reject verdicts are
Go-oracled (`proto/wire/reply-conformance.json` →
`reply-conformance.test.ts:50-70`,
`proto/go/catalogr4/reply_conformance_test.go:11`). The refusal sort table
is walled both ways. Codegen has a derive→compile→re-fold→same-Go-digest
round-trip wall (`codegen.test.ts:1-4`, `:18-21`).

**What is *not* walled:** (a) the 13-kind v0 grammar — Go's `walk.go:19-24`
vs TS's `session.ts:27-46` productions vs the three `codegen.ts` switches;
nothing asserts the four agree; (b) the mcp.ts refusal-kind literal lists;
(c) Go's `omitempty` on `Path`/`Got`/`Expected`/`Example`
(`refusal.go:88-92`) silently drops falsy values — `got: false`, `got: 0`,
`got: ""` vanish on the wire and TS reads absence; the conformance corpus
does not cover that case; (d) `packages/core/src/kvSemilattice.ts:38-45`
states outright it has no Go twin and no wall.

## 6. Is the fold algebra consumed?

**No — machinery awaiting a consumer.** Importers of `algebra.ts` are its
own lane and tests: `fold.ts:24`, `foldArbitrary.ts:19`, `foldCache.ts:18`,
`foldLaws.ts:12`, `foldBindings.ts:8`, plus `fold.laws.test.ts:23`,
`fold.cache.test.ts:3`, `fold.generators.test.ts:3`, `ownership.test.ts:2`,
`foldTestData.ts:1`, and one demo, `examples/rosetta/rosetta.ts:17-20`.

Nothing folds journals or refusals through it:
- The declared step registry reads only `StreamEvent`
  (`algebra.ts:658-729`); `EventGeneratorSpec` has exactly one member,
  `"streamEvent"` (`algebra.ts:285`). No step over `ChainEntry`, `Refusal`,
  or a transcript entry.
- proto/ts imports nothing from `@foldlab/core` except the canonical encoder
  (`proto/ts/src/jcs.ts:5-9`). The verify-on-read journal fold is
  hand-rolled — `foldChain`, a bespoke loop at `proto/ts/src/jcs.ts:186-207`,
  called from `client.ts:227`.
- `packages/server/src/server.ts:31` imports only `@foldlab/core/stream`;
  `bench/stream.bench.ts:16-17` only stream/xform; `entity.ts:20-28` folds
  via `kvStep`/`extend` directly, not through `Algebra`/`Fold`.
- The generated law suites (`foldLaws.ts:122-288`) are consumed only by
  `fold.laws.test.ts`, over the seven primitives in
  `foldTestData.ts:19-27`.

The join/semilattice claims in `algebra.ts:406-410` (`sum`/`count`
commutative-only; `max`/`min`/`any`/`all`/`setUnion` full joins) do turn
into real property tests (`foldLaws.ts:209-235`), and the product intersects
claims honestly (`algebra.ts:525-528`) — the machinery is sound and tested.
It has no production consumer. The ticket that produced it is closed
(`docs/map/tickets/014-the-fold-algebra.md:6`); its named intended
consumer — metrics-as-declared-folds in ticket 020 Phase 1 — is unbuilt.
The refusal corpus it was aimed at is explicitly future work
(`wire.ts:19-22`, `session.ts:82-84`, `proto/go/protod/refusal.go`
"Corpus law: a future fold over refusals…").
