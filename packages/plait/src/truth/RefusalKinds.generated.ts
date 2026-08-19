/**
 * Plane: truth — the vocabulary every sentence speaks.
 *
 * GENERATED FILE - DO NOT EDIT.
 *
 * Artifact: packages/plait/fixtures/kernel-conformance.ndjson
 * Command:  bun run generate:kernel-tables
 * Source:   verify/kernel, emitted by "verify/unity emit"
 *           at interchange format 2.
 *
 * The structural refusal kinds this package can mint, emitted into the plane
 * that speaks them. `truth/` is the deepest plane and imports only itself, so
 * the vocabulary lands here rather than being imported up from `kernel/`; the
 * kernel table carries the same rows with their derivation ancestry in
 * `KERNEL_RUNTIME_STRUCTURAL_REFUSALS`, where a spelling the model corpus does
 * not yet carry is named staged debt owned by DEV-804.
 *
 * @module
 */
import { Schema } from "effect"

/** Where this vocabulary came from, carried as data for a consumer to assert. */
export const REFUSAL_KIND_PROVENANCE = {
  artifact: "packages/plait/fixtures/kernel-conformance.ndjson",
  command: "bun run generate:kernel-tables",
  format: 2n,
  generator: "verify/unity emit",
  runtimeProjection: "packages/plait/scripts/kernel-runtime-refusals.ts",
  runtimeWaiverTicket: "DEV-804",
  source: "verify/kernel",
} as const

/** Every structural refusal kind the package can mint, in its persisted order. */
export const STRUCTURAL_REFUSAL_KINDS = [
  "non-canonical-value",
  "invalid-subject-token",
  "malformed-envelope",
  "malformed-blob-reference",
  "inline-body-too-large",
  "digest-mismatch",
  "substrate-shape",
  "invalid-lane-declaration",
  "invalid-partition-key",
  "lane-evidence-mismatch",
  "lane-substrate-shape",
  "payload-substrate-shape",
  "invalid-algebra-declaration",
  "invalid-fold-declaration",
  "unearned-commutative-algebra",
  "invalid-anchor-advance",
  "anchor-substrate-shape",
  "malformed-anchor-state",
  "lost-anchor-cas",
  "consumer-substrate-shape",
  "fold-buffer-overflow",
  "invalid-session-declaration",
  "undeclared-view",
  "invalid-chaos-request",
  "invalid-fold-state",
  "invalid-register-key",
  "malformed-register-state",
  "register-absent",
  "register-substrate-shape",
  "duplicate-grant",
  "outcome-already-landed",
  "stale-register-token",
  "concurrent-register-update",
  "malformed-value",
  "invalid-cell-key",
  "malformed-cell-state",
  "cell-substrate-shape",
  "invalid-petname",
  "not-a-directory",
  "unbound-petname",
  "ambiguous-binding",
] as const

/**
 * Every structural refusal kind the package can mint.
 *
 * Deliberately unannotated: an `identifier` would replace the admitted
 * literals in a failed decode's reported expectation with this schema's name.
 */
export const StructuralRefusalKind = Schema.Literals(STRUCTURAL_REFUSAL_KINDS)

/**
 * One structural refusal kind, named here so a consumer re-exports this
 * declaration instead of restating the type as one of its own. A consumer-side
 * `typeof StructuralRefusalKind.Type` reads as derivation and is not: it is the
 * consumer's own declaration, and no checker can read its ancestry back.
 */
export type StructuralRefusalKind = typeof StructuralRefusalKind.Type
