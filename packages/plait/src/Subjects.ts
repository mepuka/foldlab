import { Schema } from "effect"

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

/** A typed subject or a structural routing refusal. */
export type SubjectResult<S extends FabricSubject> =
  | { readonly ok: true; readonly subject: S }
  | { readonly ok: false; readonly refusal: StructuralRefusal }

const tokenPattern = /^[^.*>\s]+$/u

const invalidToken = (path: string, got: string | number): StructuralRefusal =>
  structuralRefusal({
    kind: "invalid-subject-token",
    law: "Fabric routing tokens are non-empty NATS tokens without dots, whitespace, or wildcards.",
    path: [path],
    got: typeof got === "number" && !Number.isFinite(got) ? String(got) : got,
    expected: "one literal NATS subject token",
    next: [],
  })

/** Constructs `flb.fab.ev.<lane>.<part>` without embedding identity. */
export const evidenceSubject = (
  lane: string,
  part: number,
): SubjectResult<EvidenceSubject> => {
  if (!tokenPattern.test(lane)) return { ok: false, refusal: invalidToken("lane", lane) }
  if (!Number.isSafeInteger(part) || part < 0) {
    return { ok: false, refusal: invalidToken("part", part) }
  }
  return {
    ok: true,
    subject: EvidenceSubject.make(`flb.fab.ev.${lane}.${part}`),
  }
}

/** Constructs `flb.fab.fact.<venue>` without embedding identity. */
export const factSubject = (venue: string): SubjectResult<FactSubject> =>
  tokenPattern.test(venue)
    ? { ok: true, subject: FactSubject.make(`flb.fab.fact.${venue}`) }
    : { ok: false, refusal: invalidToken("venue", venue) }

/** Constructs `flb.fab.node.<node>` without embedding identity. */
export const nodeSubject = (node: string): SubjectResult<NodeSubject> =>
  tokenPattern.test(node)
    ? { ok: true, subject: NodeSubject.make(`flb.fab.node.${node}`) }
    : { ok: false, refusal: invalidToken("node", node) }
