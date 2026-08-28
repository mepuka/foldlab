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
import type { Predicate } from "effect"
import { CasRemoteError, type CasRemoteError as CasRemoteErrorType } from "./Remote.ts"

/** One byte in the version/tag plane. */
export const Byte = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 0xff }),
)
export type Byte = typeof Byte.Type

/** Content identifier: full digest bytes, hex-encoded, branded. Address laws
 * live on the Lean side under the hash-hypothesis lattice; this is the
 * transport representation. */
export const ContentId = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{64}$/u),
).pipe(Schema.brand("ContentId"))
export type ContentId = typeof ContentId.Type

/** Versioned kind: the scheme version byte and the kind tag byte (one-byte
 * plane, ruling D3). */
export const NodeKind = Schema.Struct({
  version: Byte,
  tag: Byte,
})
export type NodeKind = typeof NodeKind.Type

/** A typed reference names both the target and the kind tag expected there. */
export const CasReference = Schema.Struct({
  id: ContentId,
  expectedTag: Byte,
})
export type CasReference = typeof CasReference.Type

/** Boundary shape of a CAS node: versioned kind, canonical payload bytes,
 * ordered references. References live inside the framed body as full-length
 * addresses in declared order (ruling D3, point 3). */
export const CasNodeInput = Schema.Struct({
  kind: NodeKind,
  payload: Schema.Uint8Array.check(Schema.isMaxLength(0xffff_ffff)),
  refs: Schema.Array(CasReference).check(Schema.isMaxLength(0xffff_ffff)),
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
  { version: Byte, tag: Byte },
) {}

export class DanglingReference extends Schema.TaggedError<DanglingReference>()(
  "CasError/DanglingReference",
  { missing: ContentId },
) {}

export class WrongKindReference extends Schema.TaggedError<WrongKindReference>()(
  "CasError/WrongKindReference",
  { ref: ContentId, expectedTag: Byte, actualTag: Byte },
) {}

/** A caller-requested root is absent from the store. Admission-time missing
 * references remain the distinct DanglingReference clause. */
export class ContentNotFound extends Schema.TaggedError<ContentNotFound>()(
  "CasError/ContentNotFound",
  { id: ContentId },
) {}

export class StoreFailure extends Schema.TaggedError<StoreFailure>()(
  "CasError/StoreFailure",
  { reason: Schema.String },
) {}

/** A remote-backed store retains the typed remote cause without widening the
 * frozen CasStore method signatures beyond the CasError family. */
export class RemoteFailure extends Schema.TaggedError<RemoteFailure>()(
  "CasError/RemoteFailure",
  { cause: Schema.Union([CasRemoteError, DanglingReference]) },
) {
  declare readonly cause: CasRemoteErrorType | DanglingReference
}

export type CasError =
  | AddressMismatch
  | NonCanonicalBytes
  | UnknownKind
  | DanglingReference
  | WrongKindReference
  | ContentNotFound
  | StoreFailure
  | RemoteFailure

interface CasErrorMembers {
  readonly AddressMismatch: AddressMismatch
  readonly NonCanonicalBytes: NonCanonicalBytes
  readonly UnknownKind: UnknownKind
  readonly DanglingReference: DanglingReference
  readonly WrongKindReference: WrongKindReference
  readonly ContentNotFound: ContentNotFound
  readonly StoreFailure: StoreFailure
  readonly RemoteFailure: RemoteFailure
}

/** The runtime `_tag` of every CAS error member, as typed constants. The
 * tags are namespaced (`"CasError/..."`) while the exported class names
 * are not, so a bare class name at a `catchTag` site never matches —
 * these constants close that gap. */
export const CasErrorTag = {
  AddressMismatch: "CasError/AddressMismatch",
  NonCanonicalBytes: "CasError/NonCanonicalBytes",
  UnknownKind: "CasError/UnknownKind",
  DanglingReference: "CasError/DanglingReference",
  WrongKindReference: "CasError/WrongKindReference",
  ContentNotFound: "CasError/ContentNotFound",
  StoreFailure: "CasError/StoreFailure",
  RemoteFailure: "CasError/RemoteFailure",
} satisfies { readonly [K in keyof CasErrorMembers]: `CasError/${K}` }

const casErrorClasses = [
  AddressMismatch,
  NonCanonicalBytes,
  UnknownKind,
  DanglingReference,
  WrongKindReference,
  ContentNotFound,
  StoreFailure,
  RemoteFailure,
]

/** Whether a value is a member of the CAS error union — an instance
 * check against the declared classes, never a tag-prefix heuristic. */
export const isCasError: Predicate.Refinement<unknown, CasError> = (
  value,
): value is CasError => casErrorClasses.some((member) => value instanceof member)

/** Fold over the CAS error union by member name. Either every member is
 * handled — the compiler enforces totality — or `onOther` catches the
 * members left unnamed. */
export function matchCasError<A>(cases: {
  readonly [K in keyof CasErrorMembers]: (error: CasErrorMembers[K]) => A
}): (error: CasError) => A
export function matchCasError<A>(cases:
  & { readonly [K in keyof CasErrorMembers]?: (error: CasErrorMembers[K]) => A }
  & { readonly onOther: (error: CasError) => A }
): (error: CasError) => A
export function matchCasError<A>(cases:
  | { readonly [K in keyof CasErrorMembers]: (error: CasErrorMembers[K]) => A }
  | (
    & { readonly [K in keyof CasErrorMembers]?: (error: CasErrorMembers[K]) => A }
    & { readonly onOther: (error: CasError) => A }
  )
): (error: CasError) => A {
  // The overloads make the fold total: either every member handler is
  // present, or `onOther` is — so no unhandled branch exists to model.
  // Instance checks against the declared classes narrow the union member
  // by member; the final branch is the last remaining member.
  if ("onOther" in cases) {
    const handle = <M extends CasError>(
      handler: ((error: M) => A) | undefined,
      member: M,
    ): A => handler === undefined ? cases.onOther(member) : handler(member)
    return (error) =>
      error instanceof AddressMismatch ? handle(cases.AddressMismatch, error)
      : error instanceof NonCanonicalBytes ? handle(cases.NonCanonicalBytes, error)
      : error instanceof UnknownKind ? handle(cases.UnknownKind, error)
      : error instanceof DanglingReference ? handle(cases.DanglingReference, error)
      : error instanceof WrongKindReference ? handle(cases.WrongKindReference, error)
      : error instanceof ContentNotFound ? handle(cases.ContentNotFound, error)
      : error instanceof StoreFailure ? handle(cases.StoreFailure, error)
      : handle(cases.RemoteFailure, error)
  }
  return (error) =>
    error instanceof AddressMismatch ? cases.AddressMismatch(error)
    : error instanceof NonCanonicalBytes ? cases.NonCanonicalBytes(error)
    : error instanceof UnknownKind ? cases.UnknownKind(error)
    : error instanceof DanglingReference ? cases.DanglingReference(error)
    : error instanceof WrongKindReference ? cases.WrongKindReference(error)
    : error instanceof ContentNotFound ? cases.ContentNotFound(error)
    : error instanceof StoreFailure ? cases.StoreFailure(error)
    : cases.RemoteFailure(error)
}
