# Plait — package architecture and module design

Status: coordination record, ruled binding for the E2 scaffold
(ratification record, directive 4). Written by the coordinator
2026-08-17. Amendable only by findings — an executor who discovers this
map fights the code reports the finding rather than silently
reorganizing. Exemplar: the vendored Effect v4 source
(`repos/effect/packages/effect`), whose conventions this map follows
deliberately; where Plait deviates, the deviation is stated with its
reason.

## 1. What the exemplar teaches

Read from the pinned Effect source, these are the conventions adopted
wholesale:

1. **One concept, one module, flat `src/`.** Effect ships `Layer.ts`,
   `Stream.ts`, `Reducer.ts` — nouns, flat, no `utils/`, no `types/`,
   no barrel-of-barrels. A module owns its concept's type, constructors,
   combinators, and service tag together.
2. **Implementation hides in `internal/`.** Public modules re-export
   from internal files; consumers can never deep-import machinery.
3. **`unstable/` is a namespace, not a branch.** Experimental surfaces
   ship in-tree under `unstable/`, clearly marked, promoted by moving —
   the repository's own `ai`/`client`/`codegen` empty promotion
   placeholders express the same discipline.
4. **Services live in their concept's module** as `Context.Service`
   classes with static layers — not in a `services/` ghetto.
5. **Data first, behavior second.** `Reducer` is an interface plus
   `make`; capability travels as values. Plait sharpens this: capability
   values additionally carry *digests*.
6. **JSDoc with runnable examples** on every public export; the doc is
   part of the surface.

## 2. The package map

```
packages/plait/
  package.json            effect (catalog pin) + @nats-io/* 3.4.0 exact; no other runtime deps
  src/
    index.ts              curated barrel — the public surface, nothing else escapes
    Digest.ts             the identity primitive: branded digest, Schema, equality-as-coherence
    Canonical.ts          canonical bytes — a seam over packages/core's RFC 8785 jcs; no second canonicalizer
    Catalog.ts            the content-addressed value store client: resolve digest → value
                          (verify-on-read), admit via the certifier seam; the service
                          Resolved<A> decode requires (added 2026-08-17, DEV-697 finding —
                          §3 referenced the service with no module owning it)
    Refusal.ts            tagged refusal unions; sorts (structural | absence); retryAbsence policies
    Wire.ts               envelope Schema (closed struct; kinds emit|attest|checkpoint|sealed)
    Subjects.ts           the flb.fab.* grammar as typed constructors; subjects route, never identify
    Lane.ts               declared evidence lanes (canonical declarations; partition derivation)
    Cell.ts               lattice cells: joins, merge-write loop, watch
    Register.ts           lease registers: hold/renew/commit; fencing tokens
    Anchor.ts             fold checkpoint facts; the position floor
    Blob.ts               content-addressed payloads; inline/blob threshold
    Algebra.ts            declared algebras over Reducer; brands earned by generated law suites
    Fold.ts               declared folds; deploy handles; resumption as the only verb
    Policy.ts             the policy meet-semilattice; writ profiles; Layer compilation
    Capability.ts         cataloged action capabilities (schema in/out, effect door)
    ContextProgram.ts     selectors, renderers, volatility classes, assembly
    Action.ts             declarations, rounds, the action register client
    Trigger.ts            the monotone reaction algebra; the hint pump
    Guidance.ts           the frontier as context material (state-anchored, seat-relative)
    Models.ts             the provider seam (wraps pinned effect/unstable/ai); capability classes
    Toolkits.ts           model-facing toolkits derived from cataloged capabilities
    FabricClient.ts       connection + venue map; Scope-bound; LayerMap by venue
    Venues.ts             venue records + the request-plane client to a venue's
                          daemon (flb.req.*) — sessions are driven through here
    Seats.ts              seat bindings and authority acts (close, deadline) as
                          typed clients (both added 2026-08-17, DEV-700 findings
                          H-3/H-4 — used by parts 2–3, owned by no module)
    Attest.ts             the conformance harness client; vector replay
    internal/             nats adapters (publish/consume/kv/obj), codecs, consumer pump,
                          heartbeats, cache-boundary mapping — nothing here is a public name
    unstable/
      mcp/                the introspection/configuration MCP surface (§5)
      codegen/            declaration-driven generators (§6)
  test/                   mirrors src/; law suites beside their modules
  fixtures/               generated only — provenance line + regeneration diff, per house law
```

Deviations from the exemplar, stated: Plait keeps `test/` and
`fixtures/` at package root (house wall/fixture conventions outrank
Effect's colocated `*.test.ts`); and every declaration module exports a
`*.digest` — Effect values have identity by reference, Plait values by
content, which is the whole point of the substrate.

Two workspace notes. `verify/fabric` (Lean, zero-dep) and later
`verify/fabric-veil` are sibling proof packages, not TS workspace
members; their emitted vectors land in `packages/plait/fixtures/` via
the regeneration gate. The repository's empty `codegen` promotion
placeholder is the eventual home for generators that outgrow
`unstable/codegen`; promotion is by move, per the placeholder policy.

## 3. The Schema-R domain core

The operator's directive — "custom schema types with R channels" — is
the architectural center of the DX. Effect v4 Schema permits
transformations whose decode is effectful and *requires services*. Plait
uses this to make the substrate's semantics part of the type of every
wire shape:

```ts
// Digest.ts — identity is a brand; equality is the coherence check.
// (Signatures corrected 2026-08-17, DEV-700 finding H-1: at the pin,
// Schema.Schema<out T> takes one parameter (Schema.ts:937); the
// encoded/service-carrying form is Schema.Codec<T, E, RD, RE> (:1037).)
export const Digest: Schema.Codec<Digest, string>            // sha256 hex, branded

// Canonical.ts — THE byte form; encode is total on the wire grammar.
export const canonicalBytes: (value: WireValue) => Uint8Array
export const digestOf: (value: WireValue) => Digest

// Digest.ts — the R-channel move: a reference that DECODES BY RESOLVING.
// Decoding a Resolved<A> requires the Catalog (and Blobs for large
// payloads) from the environment; decode re-derives the digest of what
// it fetched and refuses on mismatch — constrained decode with
// resolution, as one composable schema.
export interface Resolved<A> extends Schema.Codec<A, Digest, Catalog | Blobs, never> {}
export const Resolved: <A>(schema: Schema.Codec<A, WireValue>) => Resolved<A>
```

Consequences, each a deliberate DX property:

- **The R channel documents substrate dependencies.** An envelope whose
  body embeds `Resolved(TermMap)` *type-requires* `Catalog | Blobs`;
  a handler that decodes it cannot compile without the services. What a
  message needs from the fabric is visible in its type, not in prose.
- **Re-derivation is unskippable.** There is no decode path that trusts
  an asserted digest; the schema *is* the verify-on-read law.
- **Refusals are the error channel** (`Refusal.ts`): every decode/
  resolve failure is a tagged refusal with kind, sort, law, path,
  got/expected, `next` — the wire refusal envelope and the Effect error
  type are one definition. `sort: "absence"` is the only class the
  shipped retry policies touch.
- **Brands are earned, never asserted** (`Algebra.ts`): the
  `Commutative` brand's only constructor runs the generated fast-check
  law suite (ADR-0010's lawful surface); `Fold.declare` with
  `partitions > 1` type-requires the brand. Rights follow proofs, in
  the type system.
- **Policies compile to Layers** (`Policy.ts`): `Policy.layer(p)`
  provides exactly the services p's writ licenses; handler R channels
  are checked against it at declaration. Typed writ = DX; servers =
  security (ruling G10's bound, restated wherever this appears).

## 4. Runtime discipline

- **Layers own every lifecycle**; `Scope` bounds connections,
  consumers, leases; **lease loss interrupts the holder's fiber** —
  interruption is the runtime meaning of a stale token.
- **No ambient state.** Everything reachable from a handler arrives via
  R; every service has a test layer; the package must be fully
  exercisable against a local NATS with no global setup.
- **Streams are the only read surface**; requests are Effects; there is
  no callback API and no EventEmitter anywhere public.
- **`Effect.fn` names every exported effectful function** (spans for
  free); telemetry rides the built-in tracing, exported via the
  standard Otlp modules, never a bespoke logger.
- **The transport is quarantined in `internal/`.** Public modules never
  mention NATS types; the day the substrate needs a second transport,
  the blast radius is `internal/` plus `FabricClient`.

## 5. MCP as the introspection and configuration surface

Precedent, shipped and walled: the daemon derives its 15 MCP tools from
its own self-description, and served-equals-derived is enforced by
digest wall. Plait generalizes this into the operator's "configuration
via MCP" directive:

- **Introspection tools** (read plane): browse/resolve catalog values
  by digest; inspect lanes, anchors, registers, cells; serve the
  frontier; tail a lane; show an action tree with its attenuation
  audit. Every tool is *derived* from the same declarations the runtime
  executes — a hand-written tool list is refused by the wall.
- **Configuration tools** (write plane): submit declarations — lanes,
  policies, context programs, frames, capabilities — through the
  certifier. Configuration is cataloged data admitted like any value:
  digested, refusable, diffable, walled. No YAML of semantics exists;
  only connection bootstrap (URLs, credentials) stays environmental.
- **Writ applies to tools**: the MCP surface an agent sees is projected
  through its policy — a worker-seat connection is served worker-writ
  tools only. The projection inherits the frontier's ruled shape
  (state-anchored, seat-relative) and its projection-soundness IOU.
- Named dependency: the estate's MCP untyped-argument fix (synthesis
  item 1) governs how `opaque`-typed arguments are advertised; Plait's
  surface adopts whatever that ruling lands, and does not front-run it.

## 6. Codegen

Two generator families, both semantic folds over committed inputs, both
walled by regeneration diffs:

1. **Model → fixtures**: the Lean emitters (`verify/fabric`, later the
   Veil trace export) author conformance vectors; CI re-generates and
   byte-diffs. Already law (generated-vectors ruling); listed here
   because the scaffold reserves `fixtures/` for exactly this.
2. **Declarations → surfaces**: from cataloged declarations, generate
   TS types for lane events and capability schemas, law-suite stubs,
   MCP tool descriptions, and reference docs. Generated code carries
   its source digest in a header; a wall pins generated ≡ derived.
   Home: `unstable/codegen`, promoted to the workspace `codegen`
   placeholder when it stabilizes.

## 7. Gate wiring

`packages/plait` joins `bun run test:packages` and the root battery
from its first commit: typecheck, tests, law suites, walls, fixture
regeneration diffs. The Lean packages keep the model-gate shape
(`verify/fabric/run.sh` — build, roster, footprint, partition,
negative controls, regeneration). Nothing imports from `repos/`;
`bunfig.toml` test discovery stays scoped to `packages/`.

## 8. Open seams (executor DECISIONS territory, constraints stated)

- Local NATS test harness mechanics (pinned `nats-server v2.14.4`,
  R=1, file-backed temp dirs; how the binary is obtained is the
  executor's decision to record).
- Internal codec details (headers vs payload framing for the envelope's
  transport dress — identity is of canonical bytes regardless).
- LayerMap keying granularity for multi-venue clients (per-venue vs
  per-account) — decide when E7 makes it real.
