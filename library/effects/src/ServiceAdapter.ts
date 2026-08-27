/**
 * The service kit (ruling D6, GR-11): one kit constructor per described
 * service, minting an internal live role key and returning the record and
 * replay constructions.
 *
 * The replay construction's environment contains replay dependencies ONLY —
 * the live service is absent from its type, so live fallback is
 * unexpressible rather than merely forbidden (GR-1 corollary; RPL-002's
 * TypeScript half). Wrapper bodies never resolve the public tag — a named
 * defect with a must-fail fixture. Produced services carry a runtime
 * string-keyed brand checked at construction; double wrapping is rejected
 * with a typed error, never normalized (type-level brands are ruled out by
 * caller-facing type identity). Brand mechanics arrive at M4.
 */
import type { Context, Layer } from "effect"
import type { ServiceDescriptions } from "./Operation.ts"
import type { Replay } from "./Replay.ts"

/** Phantom identifier for the internally minted live role key: the same
 * shape as the public service, under a distinct identity, so record-mode
 * wiring can never recursively resolve the wrapper as its own live
 * implementation (CTX-001). */
export interface Live<Self> {
  readonly LiveRole: Self
}

/** Construction-time rejection for wrapping an already-wrapped service. */
export interface DoubleWrap {
  readonly _tag: "DoubleWrap"
  readonly service: string
}

export interface ReplayableKit<Self, S> {
  /** The internal live role key. Live construction provides THIS, never the
   * public tag. */
  readonly live: Context.Service<Live<Self>, S>
  /** Record mode: requires the live role and the replay service. */
  readonly record: Layer.Layer<Self, DoubleWrap, Live<Self> | Replay>
  /** Replay mode: requires the replay service only — live-free by type. */
  readonly replay: Layer.Layer<Self, never, Replay>
}

/** The kit constructor. A by-value overload (passing the live
 * implementation directly, built on this) arrives with the M4
 * implementation. */
export declare const replayable: <Self, S>(
  service: Context.Service<Self, S>,
  descriptions: ServiceDescriptions<S>,
) => ReplayableKit<Self, S>
