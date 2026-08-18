/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * @module
 */
import { Effect, Schema } from "effect"

import { structuralRefusal, type StructuralRefusal } from "./Refusal.js"

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

/** A typed subject computation whose only failure is a structural routing refusal. */
export type SubjectResult<S extends FabricSubject> = Effect.Effect<S, StructuralRefusal>

const tokenPattern = /^[^.*>\s]+$/u

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
  if (!tokenPattern.test(lane)) return yield* invalidToken("lane", lane)
  if (!Number.isSafeInteger(part) || part < 0) {
    return yield* invalidToken("part", part)
  }
  return EvidenceSubject.make(`flb.fab.ev.${lane}.${part}`)
})

/** Constructs `flb.fab.fact.<venue>` without embedding identity. */
export const factSubject = Effect.fn("Subjects.factSubject")(function* (
  venue: string,
): Effect.fn.Return<FactSubject, StructuralRefusal> {
  if (!tokenPattern.test(venue)) return yield* invalidToken("venue", venue)
  return FactSubject.make(`flb.fab.fact.${venue}`)
})

/** Constructs `flb.fab.node.<node>` without embedding identity. */
export const nodeSubject = Effect.fn("Subjects.nodeSubject")(function* (
  node: string,
): Effect.fn.Return<NodeSubject, StructuralRefusal> {
  if (!tokenPattern.test(node)) return yield* invalidToken("node", node)
  return NodeSubject.make(`flb.fab.node.${node}`)
})
