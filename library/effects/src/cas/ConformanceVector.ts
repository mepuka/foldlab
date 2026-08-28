/**
 * The conformance vector — the registered replay surface, TypeScript
 * twin of `library/cas/Cas/Vectors/Vectors.lean`.
 *
 * A conformance vector is a store word with a name: a replayable
 * admission history the Lean model emits (`lake exe vectors`) and any
 * runtime replays binding by binding, recomputing every address and
 * re-running admission. These schemas hand-mirror the Lean emitter and
 * are the drift tripwire between the two: a fixture the schemas refuse
 * is a red suite, never a fix-up.
 *
 * The vector registry lives on the Lean side (one list the emitter,
 * the byte-identity gate, and the `index.json` manifest all iterate);
 * this module is the consuming type — it never writes, regenerates,
 * or repairs a fixture (generated-vectors law).
 *
 * The format is DESCRIBED: `vectorAst`/`indexAst` are canonical
 * schema ASTs mirroring the Lean codes, and the Effect Schemas carry
 * them through the annotation API — the runtime codec is the carrier,
 * the canonical AST is the content-addressed identity. On the Lean
 * side the same codes drive the generic codec, whose proved forward
 * and exactness theorems ARE the format's validator.
 */
import { Schema } from "effect"
import * as CanonicalSchema from "./CanonicalSchema.ts"
import { Byte, CasNodeInput, ContentId } from "./Node.ts"
import { indexAst, vectorAst } from "./generated/ConformanceVectorAst.ts"

/** The vector wire schema version this consumer understands. */
export const SchemaVersion = 1

/** The digest scheme the fixtures declare: scheme-0 SHA-256. */
export const DigestScheme = "sha256-scheme0"

/** The vector format as canonical schema — GENERATED mirrors of the
 * Lean codes (`lake exe emitwire`, byte-identity-gated): the
 * content-addressed identity of the file format itself. The Effect
 * Schemas below carry these ASTs through the annotation API: the
 * runtime codec is the carrier, the canonical AST is the identity. */
export * from "./generated/ConformanceVectorAst.ts"

/** One typed reference: the expected kind tag and the hex address. */
export const VectorRef = Schema.Struct({
  expectedTag: Byte,
  id: ContentId,
})
export type VectorRef = typeof VectorRef.Type

/** One node: scalar header fields, hex payload, ordered references. */
export const VectorNode = Schema.Struct({
  version: Byte,
  tag: Byte,
  payload: Schema.Uint8ArrayFromHex,
  refs: Schema.Array(VectorRef),
})
export type VectorNode = typeof VectorNode.Type

/** One binding: the Lean-computed address and the node it binds. */
export const VectorBinding = Schema.Struct({
  address: ContentId,
  node: VectorNode,
})
export type VectorBinding = typeof VectorBinding.Type

/** A registered conformance vector: metadata plus the store word in
 * admission order. Carries `vectorAst` — the format's canonical,
 * content-addressed identity — through the annotation API. */
export const ConformanceVector = Schema.Struct({
  schemaVersion: Schema.Literal(SchemaVersion),
  digest: Schema.Literal(DigestScheme),
  name: Schema.String,
  description: Schema.String,
  word: Schema.Array(VectorBinding),
}).pipe(CanonicalSchema.annotate(vectorAst))
export type ConformanceVector = typeof ConformanceVector.Type

/** One index row: where a fixture lives and what its word binds. */
export const IndexEntry = Schema.Struct({
  name: Schema.String,
  file: Schema.String,
  description: Schema.String,
  bindings: Schema.Int,
  root: ContentId,
})
export type IndexEntry = typeof IndexEntry.Type

/** The `index.json` manifest — the tracking surface over the Lean
 * registry, carrying `indexAst` as its canonical identity. */
export const VectorIndex = Schema.Struct({
  schemaVersion: Schema.Literal(SchemaVersion),
  digest: Schema.Literal(DigestScheme),
  vectors: Schema.Array(IndexEntry),
}).pipe(CanonicalSchema.annotate(indexAst))
export type VectorIndex = typeof VectorIndex.Type

/** Project a vector node onto the store's boundary shape — what
 * `CasStore.put` admits during a replay. */
export const toNodeInput = (node: VectorNode): CasNodeInput =>
  CasNodeInput.make({
    kind: { version: node.version, tag: node.tag },
    payload: node.payload,
    refs: node.refs.map((ref) => ({ id: ref.id, expectedTag: ref.expectedTag })),
  })
