/**
 * The fence: type-creation as a committed operation (ADR-0004, NEXT.md).
 *
 * An agent does not write a type or transform into the world as free text —
 * it MINTS the pair by calling mint(), and the call either passes every law
 * or refuses with a typed error. Three gates, in order:
 *
 *   1. the compiler — the call must typecheck (a fabricated shape is
 *      unrepresentable, not merely wrong);
 *   2. the laws — representable schema, pure + deterministic transform,
 *      batch head == stream head at every chunking (the wall, run at mint
 *      time over a fresh probe corpus);
 *   3. the ledger — schema digest + transform digest are anchored via the
 *      entity collector's composition fold, and the anchor head IS the
 *      handle digest, so a mint is auditable by recomputation.
 *
 * Identity discipline: the schema digest is STRUCTURAL — computed over the
 * schema's representation with all annotations stripped (annotations are
 * claims; the registry holds facts). The transform digest is
 * BEHAVIOR-COMMITTED — it includes the probe output head under the mint's
 * seed, so it names what the transform did, not what its prose says. An
 * LLM can hallucinate prose; it cannot hallucinate a digest that resolves.
 */

import { Data, Effect, Schema, SchemaAST, SchemaRepresentation, Stream } from "effect"
import { composeEntities } from "./entity.ts"
import { event, headFrom, streamSeed, type Head, type StreamEvent } from "./stream.ts"
import { runHead, throughXform } from "./streamBindings.ts"
import { apply, compose, type Xform } from "./xform.ts"

export type Json = null | boolean | number | string | ReadonlyArray<Json> | {
  readonly [k: string]: Json
}

export class MintRefused extends Data.TaggedError("MintRefused")<{
  readonly law: string
  readonly detail: string
}> {}

export class UnknownDigest extends Data.TaggedError("UnknownDigest")<{
  readonly digest: string
}> {}

/** A declared transform: the id/params half of its identity (the other half
 * is committed behavior on the probe corpus). */
export interface XformDeclaration {
  readonly id: string
  readonly params?: Json
}

/** The ONLY reference agents may compose with. */
export interface Handle {
  readonly digest: Head
  readonly schemaDigest: Head
  readonly xformDigest: Head
  readonly schema: Schema.Top
  readonly xform: Xform
}

export interface RegistryRecord {
  readonly kind: "schema" | "xform" | "mint"
  readonly digest: Head
  /** Digests this record commits to (mint -> [schema, xform] or child mints). */
  readonly refs: ReadonlyArray<Head>
  readonly meta: Json
}

// ---------- canonical JSON and digests ----------

const canon = (v: unknown): string => {
  if (v === null || typeof v !== "object") return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`
  const o = v as Record<string, unknown>
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(",")}}`
}

/** Annotations are claims, never identity: strip them everywhere. */
const stripAnnotations = (v: unknown): unknown => {
  if (v === null || typeof v !== "object") return v
  if (Array.isArray(v)) return v.map(stripAnnotations)
  const o = v as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(o)) {
    if (k === "annotations") continue
    out[k] = stripAnnotations(o[k])
  }
  return out
}

const sha256hex = (s: string): Head =>
  new Bun.CryptoHasher("sha256").update(s, "utf8").digest("hex")

const representation = (ast: SchemaAST.AST): unknown =>
  SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(ast))

/**
 * The structural digest: type identity alone. Both sides of the schema
 * (type and encoded) participate — a schema IS its transformation pair —
 * but no annotation moves it (the law in test/mint.test.ts).
 */
export const structuralDigest = (schema: Schema.Top): Effect.Effect<Head, MintRefused> =>
  Effect.try({
    try: () => {
      const typeSide = canon(stripAnnotations(representation(SchemaAST.toType(schema.ast))))
      const encodedSide = canon(stripAnnotations(representation(schema.ast)))
      return sha256hex(`foldlab.schema.v1:${typeSide} ${encodedSide}`)
    },
    catch: (e) =>
      new MintRefused({
        law: "representable",
        detail: `schema has no lossless representation: ${String(e)}`,
      }),
  })

// ---------- the probe corpus ----------

/**
 * Fresh per mint (a hostile transform may mutate what it is handed — that
 * is exactly what the purity law catches, and it must not corrupt the next
 * mint's corpus). Deterministic: a probe corpus is a fixture.
 */
export const probeCorpus = (): Array<StreamEvent> =>
  Array.from({ length: 60 }, (_, i) => {
    const payload = i % 11 === 10
      ? `note-${i}` // non-fact payloads: meaning-fold no-ops, identity still moves
      : `${i % 3 === 0 ? "a" : "k"}${i % 7}=v${i}`
    return event(i % 2 === 0 ? "probe.left" : "probe.right", Math.floor(i / 2) + 1, payload)
  })

const defaultSeed = streamSeed("mint.probe.v1")

/** Optional per-mint context. `seed` roots the verification lineage (a
 * namespace, tenant, or parent anchor); behavior is committed UNDER it —
 * the same transform minted under two seeds is two commitments — and it is
 * recorded in the record's meta so an auditor knows which. */
export interface MintOptions {
  readonly seed?: Head
}

// ---------- the registry ----------

export interface Registry {
  /** Gate a (schema, transform) pair through the laws and anchor it. */
  readonly mint: (
    schema: Schema.Top,
    decl: XformDeclaration,
    xform: Xform,
    options?: MintOptions,
  ) => Effect.Effect<Handle, MintRefused>
  /** The refusal path: an unknown digest is a typed error, not a miss. */
  readonly resolve: (digest: Head) => Effect.Effect<RegistryRecord, UnknownDigest>
  /** Compose ONLY through handles; forged handles refuse before any law runs. */
  readonly composeMint: (
    handles: ReadonlyArray<Handle>,
    options?: MintOptions,
  ) => Effect.Effect<Handle, MintRefused | UnknownDigest>
  /** The ontology read: every committed record, deterministically ordered. */
  readonly entries: () => ReadonlyArray<RegistryRecord>
}

/** The mint anchor, recomputable by any auditor from the two digests. */
export const mintAnchor = (schemaDigest: Head, xformDigest: Head): Head =>
  composeEntities(`mint:${schemaDigest}:${xformDigest}`, [
    { key: `schema:${schemaDigest}`, head: schemaDigest },
    { key: `xform:${xformDigest}`, head: xformDigest },
  ]).head

export const makeRegistry = (): Registry => {
  const records = new Map<Head, RegistryRecord>()

  const put = (r: RegistryRecord) => records.set(r.digest, r)

  const verify = (
    xform: Xform,
    seed: Head,
  ): Effect.Effect<{ outputHead: Head; kept: number }, MintRefused> =>
    Effect.gen(function* () {
      const probe = probeCorpus()
      const inputHead = headFrom(seed, probe)

      const out1 = apply(xform, probe)
      if (headFrom(seed, probe) !== inputHead) {
        return yield* new MintRefused({
          law: "purity",
          detail: "transform mutated its input events",
        })
      }
      const outputHead = headFrom(seed, out1)
      if (headFrom(seed, apply(xform, probe)) !== outputHead) {
        return yield* new MintRefused({ law: "determinism", detail: "two probe runs disagree" })
      }
      for (const size of [1, 7, 64]) {
        const streamed = yield* Stream.fromIterable(probe).pipe(
          Stream.rechunk(size),
          throughXform(xform),
          runHead(seed),
        )
        if (streamed !== outputHead) {
          return yield* new MintRefused({
            law: "batch≡stream",
            detail: `chunk size ${size} moved the output head`,
          })
        }
      }
      return { outputHead, kept: out1.length }
    })

  const anchor = (
    schema: Schema.Top,
    xform: Xform,
    schemaDigest: Head,
    xformDigest: Head,
    kind: { refs: ReadonlyArray<Head>; meta: Json },
  ): Handle => {
    const digest = mintAnchor(schemaDigest, xformDigest)
    put({ kind: "schema", digest: schemaDigest, refs: [], meta: null })
    put({ kind: "xform", digest: xformDigest, refs: [], meta: kind.meta })
    put({ kind: "mint", digest, refs: [schemaDigest, xformDigest, ...kind.refs], meta: kind.meta })
    return { digest, schemaDigest, xformDigest, schema, xform }
  }

  const resolve = (digest: Head): Effect.Effect<RegistryRecord, UnknownDigest> => {
    const r = records.get(digest)
    return r === undefined ? Effect.fail(new UnknownDigest({ digest })) : Effect.succeed(r)
  }

  const mint: Registry["mint"] = (schema, decl, xform, options) =>
    Effect.gen(function* () {
      const seed = options?.seed ?? defaultSeed
      const schemaDigest = yield* structuralDigest(schema)
      const { outputHead, kept } = yield* verify(xform, seed)
      const meta: Json = { id: decl.id, params: decl.params ?? null, seed }
      const xformDigest = sha256hex(
        `foldlab.xform.v1:${canon({ ...(meta as object), probeOutput: outputHead, kept })}`,
      )
      return anchor(schema, xform, schemaDigest, xformDigest, { refs: [], meta })
    })

  const composeMint: Registry["composeMint"] = (handles, options) =>
    Effect.gen(function* () {
      const seed = options?.seed ?? defaultSeed
      for (const h of handles) {
        yield* resolve(h.digest) // a forged handle dies here, before any law runs
      }
      const fused = compose(...handles.map((h) => h.xform))
      const first = handles[0]
      if (first === undefined) {
        return yield* new MintRefused({
          law: "arity",
          detail: "composeMint needs at least one handle",
        })
      }
      const schemaDigest = yield* structuralDigest(first.schema)
      const { outputHead, kept } = yield* verify(fused, seed)
      const meta: Json = { id: "compose", params: handles.map((h) => h.digest), seed }
      const xformDigest = sha256hex(
        `foldlab.xform.v1:${canon({ ...(meta as object), probeOutput: outputHead, kept })}`,
      )
      return anchor(first.schema, fused, schemaDigest, xformDigest, {
        refs: handles.map((h) => h.digest),
        meta,
      })
    })

  const entries: Registry["entries"] = () =>
    [...records.keys()].sort().map((k) => records.get(k)!)

  return { mint, resolve, composeMint, entries }
}
