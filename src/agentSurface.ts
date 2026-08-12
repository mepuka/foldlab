/**
 * The agent surface: the fence as tools (AGENT FIRST, NEXT.md).
 *
 * The primary consumer of the registry is an agent, and the primary
 * interface is the tool call — so this module IS the product surface:
 * mint by declaration (the server owns the primitive implementations; an
 * agent cannot ship code across the wire, only declare — which is the
 * fence's whole point), compose by digest, resolve, probe a transform over
 * example records, and read the ontology. Refusals return as DATA
 * (failureMode "return"): a law violation is a tool result the agent can
 * reason about, never a protocol error.
 *
 * Auto-annotation: the surface populates annotation CLAIMS on every mint
 * (configurable — agent id, session, source pointer). Claims live beside
 * the registry and surface in the ontology read; they never move a digest
 * and they become facts only by passing a law (ADR-0004). Human views are
 * projections of this surface, never the source of it.
 */

import { Effect, Schema } from "effect"
import { Tool, Toolkit } from "effect/unstable/ai"
import {
  makeRegistry,
  probeCorpus,
  type Handle,
  type Json,
  type MintOptions,
} from "./mint.ts"
import { toStreamEvents, WireEvent } from "./schema.ts"
import { headFrom, streamSeed, type StreamEvent } from "./stream.ts"
import { apply, filterKeyPrefix, mapValueUpper, renameStream, type Xform } from "./xform.ts"

// ---------- the primitive catalog: what may be declared ----------

export interface Primitive {
  readonly id: string
  readonly describe: string
  readonly needsParam: boolean
  readonly build: (param: string) => Xform
}

export const catalog: ReadonlyArray<Primitive> = [
  {
    id: "renameStream",
    describe: "retag events onto another stream identity (param: target stream)",
    needsParam: true,
    build: renameStream,
  },
  {
    id: "filterKeyPrefix",
    describe: "keep key=value events whose key starts with the prefix (param: prefix)",
    needsParam: true,
    build: filterKeyPrefix,
  },
  {
    id: "mapValueUpper",
    describe: "uppercase the value half of key=value payloads (no param)",
    needsParam: false,
    build: () => mapValueUpper(),
  },
]

// ---------- wire shapes ----------

const Refusal = Schema.Struct({ law: Schema.String, detail: Schema.String })
type Refusal = typeof Refusal.Type

const Minted = Schema.Struct({
  digest: Schema.String,
  schemaDigest: Schema.String,
  xformDigest: Schema.String,
})

const decodeWire = (e: StreamEvent) => ({
  stream: e.stream,
  seq: e.seq,
  payload: new TextDecoder().decode(e.payload),
})

// ---------- the surface ----------

export interface SurfaceOptions {
  /** Populates annotation claims on every mint. Claims are the authoring
   * surface: they ride into the ontology read, never move a digest, and
   * become facts only by passing a law. Default: none. */
  readonly annotate?: (ctx: {
    readonly tool: string
    readonly primitive?: string
    readonly param?: string | null
  }) => Record<string, Json>
}

export const makeAgentSurface = (options?: SurfaceOptions) => {
  const registry = makeRegistry()
  const handles = new Map<string, Handle>()
  const claims = new Map<string, Record<string, Json>>()
  const annotate = options?.annotate ?? (() => ({}))
  const probeSeed = streamSeed("agent.probe.v1")

  const refuse = (law: string, detail: string) => Effect.fail<Refusal>({ law, detail })

  const remember = (h: Handle, claim: Record<string, Json>) => {
    handles.set(h.digest, h)
    claims.set(h.digest, claim)
    return { digest: h.digest, schemaDigest: h.schemaDigest, xformDigest: h.xformDigest }
  }

  const mintOptions = (seed: string | null): MintOptions | undefined =>
    seed === null ? undefined : { seed: streamSeed(seed) }

  const ops = {
    mint: (p: { primitive: string; param: string | null; seed: string | null }) =>
      Effect.gen(function* () {
        const prim = catalog.find((c) => c.id === p.primitive)
        if (prim === undefined) {
          return yield* refuse(
            "declaration",
            `unknown primitive "${p.primitive}" — catalog: ${catalog.map((c) => c.id).join(", ")}`,
          )
        }
        if (prim.needsParam && p.param === null) {
          return yield* refuse("declaration", `primitive "${prim.id}" needs a param`)
        }
        const handle = yield* registry
          .mint(
            WireEvent,
            { id: prim.id, params: p.param },
            prim.build(p.param ?? ""),
            mintOptions(p.seed),
          )
          .pipe(Effect.mapError((e) => ({ law: e.law, detail: e.detail })))
        return remember(handle, annotate({ tool: "mint_transform", primitive: prim.id, param: p.param }))
      }),

    compose: (p: { digests: ReadonlyArray<string>; seed: string | null }) =>
      Effect.gen(function* () {
        const resolved: Array<Handle> = []
        for (const d of p.digests) {
          const h = handles.get(d)
          if (h === undefined) {
            return yield* refuse("unknown-digest", `no handle for ${d} — nothing resolves that was not committed`)
          }
          resolved.push(h)
        }
        const handle = yield* registry.composeMint(resolved, mintOptions(p.seed)).pipe(
          Effect.mapError((e) =>
            e._tag === "MintRefused"
              ? { law: e.law, detail: e.detail }
              : { law: "unknown-digest", detail: e.digest },
          ),
        )
        return remember(handle, annotate({ tool: "compose_mints" }))
      }),

    resolve: (p: { digest: string }) =>
      registry.resolve(p.digest).pipe(
        Effect.map((r) => ({ kind: r.kind, refs: [...r.refs], meta: JSON.stringify(r.meta) })),
        Effect.mapError((e) => ({ law: "unknown-digest", detail: e.digest })),
      ),

    probe: (p: { digest: string; events: ReadonlyArray<typeof WireEvent.Type> | null }) =>
      Effect.gen(function* () {
        const h = handles.get(p.digest)
        if (h === undefined) {
          return yield* refuse("unknown-digest", `no handle for ${p.digest}`)
        }
        const input = p.events === null ? probeCorpus() : toStreamEvents(p.events)
        const out = apply(h.xform, input)
        return {
          kept: out.length,
          inputHead: headFrom(probeSeed, input),
          outputHead: headFrom(probeSeed, out),
          sample: out.slice(0, 5).map(decodeWire),
        }
      }),

    ontology: () =>
      Effect.sync(() => ({
        graph: JSON.stringify(
          registry.entries().map((r) => ({
            digest: r.digest,
            kind: r.kind,
            refs: r.refs,
            meta: r.meta,
            claims: claims.get(r.digest) ?? null,
          })),
        ),
      })),

    examples: () => Effect.sync(() => ({ events: probeCorpus().map(decodeWire) })),
  }

  const toolkit = Toolkit.make(
    Tool.make("mint_transform", {
      description:
        "Mint a declared transform through the fence: laws run (purity, determinism, batch≡stream), the pair is anchored, digests come back. Refusals are data naming the law.",
      parameters: Schema.Struct({
        primitive: Schema.String,
        param: Schema.NullOr(Schema.String),
        seed: Schema.NullOr(Schema.String),
      }),
      success: Minted,
      failure: Refusal,
      failureMode: "return",
    }),
    Tool.make("compose_mints", {
      description: "Compose already-minted transforms by digest. Forged digests refuse before any law runs.",
      parameters: Schema.Struct({
        digests: Schema.Array(Schema.String),
        seed: Schema.NullOr(Schema.String),
      }),
      success: Minted,
      failure: Refusal,
      failureMode: "return",
    }),
    Tool.make("resolve_digest", {
      description: "Resolve a digest to its registry record. An unknown digest is a typed refusal, not a miss.",
      parameters: Schema.Struct({ digest: Schema.String }),
      success: Schema.Struct({
        kind: Schema.String,
        refs: Schema.Array(Schema.String),
        meta: Schema.String,
      }),
      failure: Refusal,
      failureMode: "return",
    }),
    Tool.make("probe_transform", {
      description:
        "Run a minted transform over events (yours, or the probe corpus when null) and get heads back — verifiable by recomputation.",
      parameters: Schema.Struct({
        digest: Schema.String,
        events: Schema.NullOr(Schema.Array(WireEvent)),
      }),
      success: Schema.Struct({
        kept: Schema.Number,
        inputHead: Schema.String,
        outputHead: Schema.String,
        sample: Schema.Array(WireEvent),
      }),
      failure: Refusal,
      failureMode: "return",
    }),
    Tool.make("ontology", {
      description:
        "The registry graph: every committed record (digest, kind, refs, meta) with its annotation claims. The ontology that built itself.",
      parameters: Schema.Struct({}),
      success: Schema.Struct({ graph: Schema.String }),
    }),
    Tool.make("example_records", {
      description: "The deterministic probe corpus as typed events — example records to transform.",
      parameters: Schema.Struct({}),
      success: Schema.Struct({ events: Schema.Array(WireEvent) }),
    }),
  )

  const handlersLayer = toolkit.toLayer({
    mint_transform: (p) => ops.mint(p),
    compose_mints: (p) => ops.compose(p),
    resolve_digest: (p) => ops.resolve(p),
    probe_transform: (p) => ops.probe(p),
    ontology: () => ops.ontology(),
    example_records: () => ops.examples(),
  })

  return { registry, toolkit, handlersLayer, ops }
}
