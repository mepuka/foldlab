/**
 * Operation descriptions: the explicit per-method contract that makes a
 * service wrappable (ruling D6 — reflection is insufficient).
 *
 * A revision bump MUST accompany any Schema change; a drift without a bump
 * is caught at consumption as outcome inadmissibility (GR-2), never
 * silently accepted.
 */
import type { Schema } from "effect"

/** M4 admits service-free codecs: operation encoding and decoding cannot
 * smuggle ambient requirements into caller-facing method environments. */
export type OperationSchema = Schema.Codec<unknown, unknown, never, never>

/** The leaf-replay class. Slice 1 admits exactly one class; future classes
 * (opaque outer substitution and friends) enter through their own Pass A. */
export type LeafReplay = "substitutable"

export interface OperationDescription<
  Req extends OperationSchema = OperationSchema,
  Succ extends OperationSchema = OperationSchema,
  Fail extends OperationSchema = OperationSchema,
> {
  /** Stable operation identity, e.g. "acme/Rates/get". */
  readonly id: string
  /** Bumped on ANY change to the request, success, or failure Schemas. */
  readonly revision: number
  readonly request: Req
  readonly success: Succ
  readonly failure: Fail
  readonly leafReplay: LeafReplay
}

export type AnyOperationDescription = OperationDescription

/** One description per method of the wrapped service shape. */
export type ServiceDescriptions<S> = {
  readonly [K in keyof S]: AnyOperationDescription
}
