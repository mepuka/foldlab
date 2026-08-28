/**
 * GENERATED — do not edit. The canonical-schema mirrors of the
 * conformance-vector wire format, lowered from the Lean codes in
 * `library/cas/Cas/Vectors/Schema.lean` (`Described.code` of the
 * wire structures) by `lake exe emitwire`; regeneration is
 * byte-identity-gated (`--check`, wired into `check:cas`). The
 * CanonicalSchemaPin suite compares these values' payload bytes
 * against the Lean-emitted fixtures — the drift tripwire, now
 * derived on both sides.
 */
import * as CanonicalSchema from "../CanonicalSchema.ts"

/** One typed reference: expected kind tag and hex address. */
export const refAst = CanonicalSchema.struct({
  expectedTag: CanonicalSchema.field(CanonicalSchema.integerAst),
  id: CanonicalSchema.field(CanonicalSchema.stringAst),
})

/** One node: scalar header fields, hex payload, ordered references. */
export const nodeAst = CanonicalSchema.struct({
  payload: CanonicalSchema.field(CanonicalSchema.stringAst),
  refs: CanonicalSchema.field(CanonicalSchema.array(refAst)),
  tag: CanonicalSchema.field(CanonicalSchema.integerAst),
  version: CanonicalSchema.field(CanonicalSchema.integerAst),
})

/** One binding: the Lean-computed address and the node it binds. */
export const bindingAst = CanonicalSchema.struct({
  address: CanonicalSchema.field(CanonicalSchema.stringAst),
  node: CanonicalSchema.field(nodeAst),
})

/** A registered conformance vector: metadata plus the store word. */
export const vectorAst = CanonicalSchema.struct({
  description: CanonicalSchema.field(CanonicalSchema.stringAst),
  digest: CanonicalSchema.field(CanonicalSchema.literal("sha256-scheme0")),
  name: CanonicalSchema.field(CanonicalSchema.stringAst),
  schemaVersion: CanonicalSchema.field(CanonicalSchema.literal(1)),
  word: CanonicalSchema.field(CanonicalSchema.array(bindingAst)),
})

/** One index row: where a fixture lives and what its word binds. */
export const indexEntryAst = CanonicalSchema.struct({
  bindings: CanonicalSchema.field(CanonicalSchema.integerAst),
  description: CanonicalSchema.field(CanonicalSchema.stringAst),
  file: CanonicalSchema.field(CanonicalSchema.stringAst),
  name: CanonicalSchema.field(CanonicalSchema.stringAst),
  root: CanonicalSchema.field(CanonicalSchema.stringAst),
})

/** The index.json manifest over the Lean vector registry. */
export const indexAst = CanonicalSchema.struct({
  digest: CanonicalSchema.field(CanonicalSchema.literal("sha256-scheme0")),
  schemaVersion: CanonicalSchema.field(CanonicalSchema.literal(1)),
  vectors: CanonicalSchema.field(CanonicalSchema.array(indexEntryAst)),
})
