/**
 * The content-addressed daemon, as a type and nothing else.
 *
 * A built program names the services it would need before anything can be
 * wired, and naming them honestly is the point of this module: the builder's
 * requirements channel says `CasDaemon` because a program that publishes a
 * declaration, resolves a digest, reads at an anchor, or lands an outcome
 * needs a daemon that does those four things. What this module deliberately
 * does not ship is any of it.
 *
 * **There is no tag, no layer, and no implementation here.** Not an
 * unimplemented one, not a throwing one, not a stub that fails at runtime -
 * none, because there is nothing to run yet and a placeholder service is how a
 * "not wired" turns into a "wired wrong" three slices later. The wiring is its
 * own separately gated slice; when it lands it mints the tag and this
 * interface becomes that tag's service shape, unchanged.
 *
 * Two fences bind the shape below and are worth stating rather than leaving to
 * be inferred from what is missing.
 *
 * No clock, no scheduler, no engine. Nothing here reads a time, waits, retries,
 * or advances a queue. A daemon that could do those things is a workflow
 * engine, and a workflow engine is refused: the claimed time of a fact travels
 * as a tick fact on an evidence lane, and ordering travels as an anchor.
 *
 * No closure crosses the seam. Every operation names its subject by digest,
 * because a function value has no canonical bytes and therefore no identity a
 * content-addressed store could file it under. Closure introspection is not an
 * unimplemented feature; it is a refused one.
 *
 * @module
 */
import type { Effect } from "effect"

import type { KernelProgramDeclaration } from "./KernelCorpusSchemas.js"
import type { KernelRefusalRow } from "./KernelTables.generated.js"

/**
 * A content address as the runtime spells it: lowercase hexadecimal over the
 * canonical bytes. The model carries identity labels instead, and the map
 * between the two is the trusted base's, not a theorem.
 */
export type CasDigestHex = string

/** Where a read stands in a partitioned stream, at the identity scale the model uses. */
export interface CasAnchor {
  readonly fold: bigint
  readonly lane: bigint
  readonly shard: bigint
  readonly position: bigint
}

/** What a landed outcome is addressed by, once a decision has one. */
export interface CasOutcome {
  readonly register: CasDigestHex
  readonly outcome: CasDigestHex
}

/**
 * The four operations a built program's requirements channel names.
 *
 * Every one of them is fallible in the taught vocabulary: a refusal carries
 * the law it defends and the repair it teaches, because the runtime's error
 * channel is the model's refusal table and not a second one invented here.
 */
export interface CasDaemon {
  /**
   * Publishes a declaration and returns its content address. Publication is an
   * act the caller chooses; building a program never performs it.
   */
  readonly publish: (
    declaration: KernelProgramDeclaration,
  ) => Effect.Effect<CasDigestHex, KernelRefusalRow>

  /** Reads back the declaration a digest names, verifying identity on read. */
  readonly resolve: (
    digest: CasDigestHex,
  ) => Effect.Effect<KernelProgramDeclaration, KernelRefusalRow>

  /** Reads a partitioned stream at an anchor. Head-relative reads carry their anchor. */
  readonly readAt: (anchor: CasAnchor) => Effect.Effect<CasDigestHex, KernelRefusalRow>

  /** Lands a decided outcome against its register. */
  readonly land: (outcome: CasOutcome) => Effect.Effect<void, KernelRefusalRow>
}

/**
 * One unfilled hole of a program, as a requirement.
 *
 * The correspondence the kernel model states, carried into the type system: a
 * program's holes are its requirements, providing is filling, and a program
 * with no holes requires nothing. A hole appears in the requirements channel
 * under its own name, so filling it removes exactly one requirement and not a
 * category of them.
 */
export interface CasHoleRequirement<Name extends bigint> {
  readonly "~foldlab/plait/kernel/requires": Name
}

/**
 * What a run would land: the address of the value the program's terminal node
 * produced.
 *
 * Nothing in this package produces one. The type exists so the success channel
 * of a built program's stub is named rather than left as `unknown`, and so a
 * later slice that does wire an executor has a shape to conform to instead of
 * a shape to invent.
 */
export interface CasProgramOutcome {
  readonly landed: CasDigestHex
}
