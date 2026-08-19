/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The fabric's literal-token grammar, stated once. Two families speak it: the
 * routing subjects a message travels under, and the canonical NAME sorts that
 * ride the same token alphabet — a cell's key, a register's work key, a lane's
 * handle, a stream's name. They are branded so that no two of them, and no
 * bare string, are interchangeable: a name is a sort, and sorts do not compare
 * across kinds. The brands add nominal identity to the check the pattern
 * already made; the refusal each sort answers with belongs to the seam that
 * owns the concept, so the grammar lives here exactly once and the teaching
 * stays where the value lives.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import { structuralRefusal, type StructuralRefusal } from "../truth/Refusal.js"

/**
 * The one literal-token alphabet: non-empty, and free of the dot, whitespace,
 * and wildcard characters the substrate reads as structure.
 *
 * Every token-shaped sort in the package is checked against this pattern and
 * no other, so widening the grammar is one edit and never a sweep.
 */
export const TOKEN_PATTERN = /^[^.*>\s]+$/u

/** An evidence-lane routing subject. */
export const EvidenceSubject = Schema.String
  .check(Schema.isPattern(/^flb\.fab\.ev\.[^.*>\s]+\.[0-9]+$/u))
  .pipe(Schema.brand("@foldlab/plait/EvidenceSubject"))

/** An evidence-lane routing subject. */
export type EvidenceSubject = typeof EvidenceSubject.Type

/** A venue fact-announcement routing subject. */
export const FactSubject = Schema.String
  .check(Schema.isPattern(/^flb\.fab\.fact\.[^.*>\s]+$/u))
  .pipe(Schema.brand("@foldlab/plait/FactSubject"))

/** A venue fact-announcement routing subject. */
export type FactSubject = typeof FactSubject.Type

/** An advisory node-presence routing subject. */
export const NodeSubject = Schema.String
  .check(Schema.isPattern(/^flb\.fab\.node\.[^.*>\s]+$/u))
  .pipe(Schema.brand("@foldlab/plait/NodeSubject"))

/** An advisory node-presence routing subject. */
export type NodeSubject = typeof NodeSubject.Type

/** Every public fabric routing subject. */
export type FabricSubject = EvidenceSubject | FactSubject | NodeSubject

/**
 * The name of one lattice cell: a single literal key, never a path.
 *
 * The sort lives here because two planes spell it — the cell carrier itself
 * and the context program's cell selector — and one grammar cannot be stated
 * twice. `Cell.ts` re-exports it so the concept's own module carries its sort;
 * the refusal a bad name earns is that module's, minted at `Cell.cellName`.
 */
export const CellName = Schema.String
  .check(Schema.isPattern(TOKEN_PATTERN))
  .pipe(Schema.brand("@foldlab/plait/CellName"))
  .annotate({ identifier: "PlaitCellName" })

/** The name of one lattice cell: a single literal key, never a path. */
export type CellName = typeof CellName.Type

const invalidToken = (path: string, got: string | number): StructuralRefusal =>
  structuralRefusal({
    kind: "invalid-subject-token",
    law: "Fabric routing tokens are non-empty NATS tokens without dots, whitespace, or wildcards.",
    path: [path],
    got: typeof got === "number" && !Number.isFinite(got) ? String(got) : got,
    expected: "one literal NATS subject token",
    next: [{
      subject: "flb.fab.ev.example.0",
      note: "Replace the refused segment with a non-empty literal token such as example.",
    }],
  })

/** Constructs `flb.fab.ev.<lane>.<part>` without embedding identity. */
export const evidenceSubject = Effect.fn("Subjects.evidenceSubject")(function* (
  lane: string,
  part: number,
): Effect.fn.Return<EvidenceSubject, StructuralRefusal> {
  if (!TOKEN_PATTERN.test(lane)) return yield* invalidToken("lane", lane)
  if (!Number.isSafeInteger(part) || part < 0) {
    return yield* invalidToken("part", part)
  }
  return EvidenceSubject.make(`flb.fab.ev.${lane}.${part}`)
})

/** Constructs `flb.fab.fact.<venue>` without embedding identity. */
export const factSubject = Effect.fn("Subjects.factSubject")(function* (
  venue: string,
): Effect.fn.Return<FactSubject, StructuralRefusal> {
  if (!TOKEN_PATTERN.test(venue)) return yield* invalidToken("venue", venue)
  return FactSubject.make(`flb.fab.fact.${venue}`)
})

/** Constructs `flb.fab.node.<node>` without embedding identity. */
export const nodeSubject = Effect.fn("Subjects.nodeSubject")(function* (
  node: string,
): Effect.fn.Return<NodeSubject, StructuralRefusal> {
  if (!TOKEN_PATTERN.test(node)) return yield* invalidToken("node", node)
  return NodeSubject.make(`flb.fab.node.${node}`)
})
