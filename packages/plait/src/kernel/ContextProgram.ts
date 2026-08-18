/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * Context programs as cataloged declarations: selectors, renderers, and the
 * volatility classes that order a program's segments.
 *
 * **Scaffolding only.** This module ships the declaration *shapes* and the
 * declared segment order. It ships no assembly executor, no context value, and
 * no memo. Assembly and its byte-identical reassembly wall land behind the
 * fabric model's F7 corpus; nothing here claims F7, and no refusal in this
 * module cites it.
 *
 * What the shapes buy today: a program is a canonical value with a digest, so
 * it is diffable, refusable, and referencable like every other cataloged
 * declaration — and the selector union is closed, which makes an ambient or
 * clock-reading selector unrepresentable rather than merely discouraged. The
 * *declaration-time refusal* that cites F7 by name is the assembly slice's
 * gate, not this one's.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import { Digest, digestOf } from "../truth/Digest.js"
import { decodeRefusing, type Refusal } from "../truth/Refusal.js"

/**
 * How often a segment's rendered bytes are expected to move.
 *
 * The order is declared, total, and stable-first: `static ≺ policy ≺ session
 * ≺ live ≺ turn`. It is the segment sort key, and it is the whole reason a
 * fleet's assembled prefixes coincide.
 */
export const VolatilityClass = Schema.Literals([
  "static",
  "policy",
  "session",
  "live",
  "turn",
])

/** How often a segment's rendered bytes are expected to move. */
export type VolatilityClass = typeof VolatilityClass.Type

const volatilityOrder: ReadonlyArray<VolatilityClass> = VolatilityClass.literals

/**
 * The declared rank of a volatility class, stable-first.
 *
 * @example
 * ```ts
 * import { volatilityRank } from "@foldlab/plait/ContextProgram"
 *
 * volatilityRank("static") < volatilityRank("turn") // true
 * ```
 */
export const volatilityRank = (volatility: VolatilityClass): number =>
  volatilityOrder.indexOf(volatility)

/**
 * A digest-anchored query against the substrate.
 *
 * The union is closed on purpose: every form names a digest or a declared
 * coordinate, so no selector can read a clock, an environment variable, or any
 * other ambient fact. A program that wants a time-shaped fact takes it as
 * journaled evidence with a digest, like every other value.
 */
export const Selector = Schema.Union([
  /** A cataloged value, by its digest. */
  Schema.TaggedStruct("catalog", { value: Digest }),
  /** A journal span, by the lane and the anchor it reads at. */
  Schema.TaggedStruct("span", { lane: Digest, anchor: Digest }),
  /** A lattice cell's state, at a named cell. */
  Schema.TaggedStruct("cell", { cell: Schema.String }),
  /** A seat's frontier in a session, state-anchored and seat-relative. */
  Schema.TaggedStruct("frontier", { session: Digest, seat: Digest }),
  /** A landed outcome, by the work digest whose register holds it. */
  Schema.TaggedStruct("outcome", { work: Digest }),
])

/** A digest-anchored query against the substrate. */
export type Selector = typeof Selector.Type

/**
 * A declared semantic fold from a substrate value to a context segment.
 *
 * The renderer is referenced by the digest of its own cataloged declaration —
 * never by a function value and never by a hand-written string, so a rendered
 * segment always names the derivation that produced it.
 */
export const Renderer = Schema.Struct({ renderer: Digest })

/** A declared semantic fold from a substrate value to a context segment. */
export type Renderer = typeof Renderer.Type

/** One (selector, renderer) pair tagged with its declared volatility class. */
export const Segment = Schema.Struct({
  name: Schema.String,
  volatility: VolatilityClass,
  selector: Selector,
  renderer: Renderer,
})

/** One (selector, renderer) pair tagged with its declared volatility class. */
export type Segment = typeof Segment.Type

/** The canonical value whose digest is a context program's identity. */
export const ContextProgram = Schema.Struct({
  v: Schema.Literal(0),
  segments: Schema.Array(Segment),
})

/** The canonical value whose digest is a context program's identity. */
export type ContextProgram = typeof ContextProgram.Type

/** One admitted program together with its identity. */
export interface DeclaredProgram {
  readonly program: ContextProgram
  readonly digest: Digest
}

/**
 * The segments in their declared assembly order: volatility class first,
 * declaration order within a class.
 *
 * The within-class tie-break is declaration order, stated here because two
 * lawful implementations must not disagree on equal-class order. This function
 * is the order; it is not evidence that any assembly respects it.
 *
 * @example
 * ```ts
 * import { declare, orderedSegments } from "@foldlab/plait/ContextProgram"
 * import { Effect } from "effect"
 *
 * const declared = Effect.runSync(declare({ v: 0, segments: [] }))
 * orderedSegments(declared.program).map((segment) => segment.name)
 * ```
 */
export const orderedSegments = (
  program: ContextProgram,
): ReadonlyArray<Segment> =>
  program.segments
    .map((segment, index) => ({ segment, index }))
    .sort((left, right) =>
      volatilityRank(left.segment.volatility) - volatilityRank(right.segment.volatility) ||
      left.index - right.index
    )
    .map(({ segment }) => segment)

/**
 * Constrained-decodes a context program and derives its identity.
 *
 * @example
 * ```ts
 * import { declare } from "@foldlab/plait/ContextProgram"
 * import { Effect } from "effect"
 *
 * Effect.runSync(declare({ v: 0, segments: [] }))
 * ```
 */
export const declare = Effect.fn("ContextProgram.declare")(function* (
  candidate: unknown,
): Effect.fn.Return<DeclaredProgram, Refusal> {
  const program = yield* decodeRefusing(ContextProgram)(candidate)
  return { program, digest: yield* digestOf(program) }
})
