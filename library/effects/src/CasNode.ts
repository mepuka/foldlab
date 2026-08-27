/**
 * CAS node boundary Schemas and the typed CAS error family.
 *
 * Schema validates and interoperates at typed boundaries; its default JSON
 * encoding is NEVER the digest pre-image (ruling D3). The pre-image is the
 * project-owned framed canonical encoding, which arrives with the M2 codec.
 * The admitted-node distinction (raw versus admitted, checked at put per
 * ruling GR-6) is an M2 refinement; these declarations freeze the boundary
 * shape only.
 */
import { Schema } from "effect"

/** Content identifier: full digest bytes, hex-encoded, branded. Address laws
 * live on the Lean side under the hash-hypothesis lattice; this is the
 * transport representation. */
export const ContentId = Schema.String.pipe(Schema.brand("ContentId"))
export type ContentId = typeof ContentId.Type

/** Versioned kind: the scheme version byte and the kind tag byte (one-byte
 * plane, ruling D3). Byte-range refinement lands with the M2 codec. */
export const NodeKind = Schema.Struct({
  version: Schema.Number,
  tag: Schema.Number,
})
export type NodeKind = typeof NodeKind.Type

/** Boundary shape of a CAS node: versioned kind, canonical payload bytes,
 * ordered references. References live inside the framed body as full-length
 * addresses in declared order (ruling D3, point 3). */
export const CasNodeInput = Schema.Struct({
  kind: NodeKind,
  payload: Schema.Uint8Array,
  refs: Schema.Array(ContentId),
})
export type CasNodeInput = typeof CasNodeInput.Type

/** The CAS error family — a DISTINCT typed family from mismatch categories
 * (GR-2 exclusion) with clause-named members (GR-6). */
export class AddressMismatch extends Schema.TaggedError<AddressMismatch>()(
  "CasError/AddressMismatch",
  { expected: ContentId, actual: ContentId },
) {}

export class NonCanonicalBytes extends Schema.TaggedError<NonCanonicalBytes>()(
  "CasError/NonCanonicalBytes",
  { id: ContentId },
) {}

export class UnknownKind extends Schema.TaggedError<UnknownKind>()(
  "CasError/UnknownKind",
  { version: Schema.Number, tag: Schema.Number },
) {}

export class DanglingReference extends Schema.TaggedError<DanglingReference>()(
  "CasError/DanglingReference",
  { missing: ContentId },
) {}

export class WrongKindReference extends Schema.TaggedError<WrongKindReference>()(
  "CasError/WrongKindReference",
  { ref: ContentId, expectedTag: Schema.Number, actualTag: Schema.Number },
) {}

export class StoreFailure extends Schema.TaggedError<StoreFailure>()(
  "CasError/StoreFailure",
  { reason: Schema.String },
) {}

export type CasError =
  | AddressMismatch
  | NonCanonicalBytes
  | UnknownKind
  | DanglingReference
  | WrongKindReference
  | StoreFailure
