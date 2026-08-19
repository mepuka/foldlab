/**
 * The runtime structural-refusal projection manifest.
 *
 * This is the small reviewed datum that pins which existing runtime spellings
 * belong in the kernel projection. The generator resolves every spelling
 * against the model-emitted refusal rows. A match is corpus-backed; a miss is
 * emitted as explicit Law 1 staged debt citing DEV-804. The manifest is not a
 * second public union: `truth/Refusal.ts` consumes only the generated schema.
 *
 * DEV-804 owns replacing each staged row with its corpus declaration. Removing
 * or renaming a spelling here is a persisted-wire change and is outside that
 * ticket as well as DEV-808.
 *
 * @module
 */

/** The ticket owning runtime refusal rows the kernel corpus does not yet carry. */
export const RUNTIME_REFUSAL_WAIVER_TICKET = "DEV-804" as const

/** Where this reviewed projection manifest lives, relative to the repository root. */
export const RUNTIME_REFUSAL_PROJECTION_PATH =
  "packages/plait/scripts/kernel-runtime-refusals.ts" as const

/** The existing runtime structural spellings, in their persisted order. */
export const RUNTIME_STRUCTURAL_REFUSAL_PROJECTION = [
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
  // Payload threshold (DEV-774).
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
  // Addressing (DEV-766). `ambiguous-binding` is the model's spelling on the
  // F12 across-bind-orders row; the other three are the address door's own.
  "invalid-petname",
  "not-a-directory",
  "unbound-petname",
  "ambiguous-binding",
  // The register incarnation pin (DEV-779): a fencing token is honored only by
  // the backing-stream incarnation that minted it.
  "incarnation-mismatch",
] as const
