import type {
  KernelDeclKind,
  KernelRefusalRow,
} from "../src/kernel/KernelTables.generated.js"

/** The direct generated export proves enforcement does not reject every exported type. */
export type {
  KernelDeclKind as GeneratedCoreControl,
} from "../src/kernel/KernelTables.generated.js"

/**
 * Five planted laundering attempts, one per shape a hand-written declaration can
 * use to sit next to a generated type: widening a union, aliasing it outright,
 * intersecting it, extending it through an interface, and re-mapping its
 * members. Each resolves to a declaration this file owns, so none of them may
 * inherit the generated table's authority.
 */
export type LaunderedWidening = KernelDeclKind | "handwritten-extra"

export type LaunderedAlias = KernelDeclKind

export type LaunderedIntersection = KernelRefusalRow & { readonly extra: string }

export interface LaunderedExtension extends KernelRefusalRow {
  readonly extra: string
}

export type LaunderedMapped = {
  readonly [Field in keyof KernelRefusalRow]: KernelRefusalRow[Field]
}
