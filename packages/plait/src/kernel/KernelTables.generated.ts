/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * GENERATED FILE - DO NOT EDIT.
 *
 * Artifact: packages/plait/fixtures/kernel-conformance.ndjson
 * Command:  bun run generate:kernel-tables
 * Source:   verify/kernel, emitted by "verify/unity emit"
 *           at interchange format 2.
 *
 * The kernel model's closed tables, projected into the runtime's type layer:
 * the declaration-kind and hole-stage registries with their ranks, the taught
 * refusals with the law each defends and the repair each teaches, and the
 * compile-time brands of the sort system. The existing runtime refusal
 * projection is also generated here; corpus gaps wear an owned waiver.
 *
 * These are safety-side names and texts, never runtime guarantees. A model
 * theorem stays in the model; what crosses the seam is the vocabulary the
 * door harness then checks the runtime against, verdict for verdict.
 *
 * Brand identities are string literals, not unique symbols, because that is
 * how the estate's pinned Effect release spells a type identity.
 *
 * @module
 */

/** Where these tables came from, carried as data for a consumer to assert. */
export const KERNEL_TABLE_PROVENANCE = {
  artifact: "packages/plait/fixtures/kernel-conformance.ndjson",
  command: "bun run generate:kernel-tables",
  format: 2n,
  generator: "verify/unity emit",
  runtimeProjection: "packages/plait/scripts/kernel-runtime-refusals.ts",
  runtimeWaiverTicket: "DEV-804",
  source: "verify/kernel",
} as const

/** The closed universe of declaration kinds, in rank order. */
export const KERNEL_DECL_KINDS = [
  "schema",
  "program",
  "policy",
  "capability",
  "lane",
  "algebra",
  "index",
  "resource",
  "ontology",
  "schedule",
  "template",
  "language",
] as const

/** One declaration kind of the closed universe. */
export type KernelDeclKind = (typeof KERNEL_DECL_KINDS)[number]

/** The numeric rank of each declaration kind. */
export const KERNEL_DECL_KIND_RANK = {
  schema: 0,
  program: 1,
  policy: 2,
  capability: 3,
  lane: 4,
  algebra: 5,
  index: 6,
  resource: 7,
  ontology: 8,
  schedule: 9,
  template: 10,
  language: 11,
} as const satisfies { readonly [Kind in KernelDeclKind]: number }

/** The epistemic stages of a hole, in rising rank order. */
export const KERNEL_HOLE_STAGES = [
  "opened",
  "filled",
  "disputed",
  "decided",
  "sealed",
] as const

/** One epistemic stage of a hole. */
export type KernelHoleStage = (typeof KERNEL_HOLE_STAGES)[number]

/** The numeric rank of each hole stage. */
export const KERNEL_HOLE_STAGE_RANK = {
  opened: 0,
  filled: 1,
  disputed: 2,
  decided: 3,
  sealed: 4,
} as const satisfies { readonly [Stage in KernelHoleStage]: number }

/**
 * How a taught repair may be applied: machine-applicable exactly when the
 * lawful rewrite is a function of the refused candidate alone, advisory when
 * the repair needs something the candidate does not carry.
 */
export type KernelApplicability = "machine-applicable" | "advisory"

/** The wire spelling of every refusal reason, in the model's order. */
export const KERNEL_REFUSAL_REASONS = [
  "clock-read",
  "absence-trigger",
  "unfenced-decide",
  "last-writer-wins",
  "unverified-read",
  "cross-sort-identifier",
  "minted-identifier",
  "ambient-query-input",
  "forward-reference",
  "secret-carrier",
  "absence-claim",
  "past-mutation",
  "off-writ-referent",
  "closure-introspection",
  "anchored-resolve",
  "unfilled-hole",
] as const

/** One refusal reason the kernel door can carry. */
export type KernelRefusalReason = (typeof KERNEL_REFUSAL_REASONS)[number]

/** One taught refusal: the law it defends and the legal next move. */
export interface KernelRefusalRow {
  readonly reason: KernelRefusalReason
  readonly law: string
  readonly repair: string
  readonly applicability: KernelApplicability
}

/** The taught-refusal table. A reason without its law and repair cannot exist. */
export const KERNEL_REFUSALS = [
  {
    reason: "clock-read",
    law: "the fold carrier has no clock parameter (f11_query_deterministic)",
    repair: "emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value",
    applicability: "advisory",
  },
  {
    reason: "absence-trigger",
    law: "the trigger grammar is closed at five monotone productions (f10_stability)",
    repair: "route acting-on-silence through the deadline seat: a fenced decide fed by tick facts",
    applicability: "advisory",
  },
  {
    reason: "unfenced-decide",
    law: "only a fenced token commits (at_most_one_landed_commit)",
    repair: "hold the register's token and commit with it; grant and renew are runtime liveness, not grammar",
    applicability: "advisory",
  },
  {
    reason: "last-writer-wins",
    law: "cells merge by join under a declared ACI algebra (f1_cell_merge_aci)",
    repair: "declare the merge algebra; idempotent join leaves nothing for arrival order to choose",
    applicability: "machine-applicable",
  },
  {
    reason: "unverified-read",
    law: "a decode re-derives the digest of what it fetched (verify-on-read)",
    repair: "resolve and let the door re-derive; absence is retryable, a mismatch is structural",
    applicability: "machine-applicable",
  },
  {
    reason: "cross-sort-identifier",
    law: "tokens are per-register and positions are per-partition; sorts never compare across spaces",
    repair: "compare a token only within its register and a position only within its partition",
    applicability: "advisory",
  },
  {
    reason: "minted-identifier",
    law: "every identifier is a digest of a declaration or a derivation from one",
    repair: "declare the value and use its digest; nothing mints a name",
    applicability: "advisory",
  },
  {
    reason: "ambient-query-input",
    law: "a derived read is a function of support and query alone (f11_topk_of_support)",
    repair: "read state through a fold at an anchor, and put any seed inside the declared query value",
    applicability: "advisory",
  },
  {
    reason: "forward-reference",
    law: "pins name already-admitted digests (c7_pin_well_founded)",
    repair: "declare the referent first; the reference graph is a DAG by admission order",
    applicability: "advisory",
  },
  {
    reason: "secret-carrier",
    law: "the wire grammar admits no secret position",
    repair: "carry credentials in the environmental band as redacted configuration, outside meaning",
    applicability: "advisory",
  },
  {
    reason: "absence-claim",
    law: "a local view is a lattice lower bound (cell_absorb_inflationary)",
    repair: "claim at-least from a replica, never not-present-anywhere",
    applicability: "advisory",
  },
  {
    reason: "past-mutation",
    law: "journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)",
    repair: "declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon",
    applicability: "machine-applicable",
  },
  {
    reason: "off-writ-referent",
    law: "a declaration's identifiers lie inside the universe its writ pins",
    repair: "spawn under a writ that pins the referent, or request the referent into the pinned universe",
    applicability: "advisory",
  },
  {
    reason: "closure-introspection",
    law: "a program's identity is its declaration, never its closure bytes",
    repair: "reference computation by digest: declare the fold and pin its digest",
    applicability: "advisory",
  },
  {
    reason: "anchored-resolve",
    law: "a digest names one value forever, so no anchor can change a resolve",
    repair: "drop the anchor; read head-relative state through a fold at an anchor",
    applicability: "machine-applicable",
  },
  {
    reason: "unfilled-hole",
    law: "only closed programs execute; a hole is a declared parameter, not a wildcard",
    repair: "fill every declared hole; disjoint fills commute, so fill order is free",
    applicability: "advisory",
  },
] as const satisfies ReadonlyArray<KernelRefusalRow>

/** The taught refusal each reason carries, keyed by its wire spelling. */
export const KERNEL_REFUSAL_BY_REASON = {
  "clock-read": KERNEL_REFUSALS[0],
  "absence-trigger": KERNEL_REFUSALS[1],
  "unfenced-decide": KERNEL_REFUSALS[2],
  "last-writer-wins": KERNEL_REFUSALS[3],
  "unverified-read": KERNEL_REFUSALS[4],
  "cross-sort-identifier": KERNEL_REFUSALS[5],
  "minted-identifier": KERNEL_REFUSALS[6],
  "ambient-query-input": KERNEL_REFUSALS[7],
  "forward-reference": KERNEL_REFUSALS[8],
  "secret-carrier": KERNEL_REFUSALS[9],
  "absence-claim": KERNEL_REFUSALS[10],
  "past-mutation": KERNEL_REFUSALS[11],
  "off-writ-referent": KERNEL_REFUSALS[12],
  "closure-introspection": KERNEL_REFUSALS[13],
  "anchored-resolve": KERNEL_REFUSALS[14],
  "unfilled-hole": KERNEL_REFUSALS[15],
} as const satisfies { readonly [Reason in KernelRefusalReason]: KernelRefusalRow }

/** The existing runtime structural-refusal spellings, generated from the projection manifest. */
export const KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS = [
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
  "mirrored-authority-carrier",
  "expiring-authority-carrier",
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
  "incarnation-mismatch",
] as const

/** One structural-refusal kind the runtime can mint. */
export type KernelRuntimeStructuralRefusalKind =
  (typeof KERNEL_RUNTIME_STRUCTURAL_REFUSAL_KINDS)[number]

/** How one runtime spelling traces to the generated kernel vocabulary. */
export type KernelRuntimeStructuralRefusalRow =
  | { readonly kind: KernelRuntimeStructuralRefusalKind; readonly source: "kernel-corpus" }
  | { readonly kind: KernelRuntimeStructuralRefusalKind; readonly source: "staged-debt"; readonly waiver: "DEV-804" }

/**
 * The runtime projection with derivation ancestry on every row. Missing corpus
 * rows are explicit Law 1 staged debt owned by DEV-804, never silent twins.
 */
export const KERNEL_RUNTIME_STRUCTURAL_REFUSALS = [
  {
    kind: "non-canonical-value",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-subject-token",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "malformed-envelope",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "malformed-blob-reference",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "inline-body-too-large",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "digest-mismatch",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "substrate-shape",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-lane-declaration",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-partition-key",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "lane-evidence-mismatch",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "lane-substrate-shape",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "payload-substrate-shape",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "mirrored-authority-carrier",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "expiring-authority-carrier",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-algebra-declaration",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-fold-declaration",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "unearned-commutative-algebra",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-anchor-advance",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "anchor-substrate-shape",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "malformed-anchor-state",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "lost-anchor-cas",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "consumer-substrate-shape",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "fold-buffer-overflow",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-session-declaration",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "undeclared-view",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-chaos-request",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-fold-state",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-register-key",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "malformed-register-state",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "register-absent",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "register-substrate-shape",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "duplicate-grant",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "outcome-already-landed",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "stale-register-token",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "concurrent-register-update",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "malformed-value",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-cell-key",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "malformed-cell-state",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "cell-substrate-shape",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "invalid-petname",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "not-a-directory",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "unbound-petname",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "ambiguous-binding",
    source: "staged-debt",
    waiver: "DEV-804",
  },
  {
    kind: "incarnation-mismatch",
    source: "staged-debt",
    waiver: "DEV-804",
  },
] as const satisfies ReadonlyArray<KernelRuntimeStructuralRefusalRow>

/**
 * The compile-time brand carrier. The property never exists at runtime; it
 * exists so two sorts with the same representation refuse to unify.
 */
export interface KernelBrand<Tag extends string> {
  readonly "~foldlab/plait/kernel/Brand": Tag
}

/**
 * The sorts this module brands, and the parameters that index each. The
 * carrier is the model's own scalar; a call site migrating a real runtime
 * value substitutes its carrier through the alias's second parameter.
 */
export const KERNEL_BRANDED_SORTS = [
  { name: "Digest", params: ["kind"], carrier: "Nat" },
  { name: "Token", params: ["register"], carrier: "Nat" },
  { name: "Position", params: ["partition"], carrier: "Nat" },
] as const

/**
 * Brand-indexed sorts with no single carrier field, so no scalar alias is
 * generated for them. They are reported rather than invented: a structure
 * with several fields has no one value a brand could ride on.
 */
export const KERNEL_UNBRANDED_INDEXED_SORTS = [
  { name: "AnchorFact", params: ["declared", "partition"] },
] as const

/** The branded Digest sort, indexed by kind. */
export type KernelDigest<Kind extends KernelDeclKind, Carrier = number> =
  Carrier & KernelBrand<`~foldlab/plait/kernel/Digest/${Kind}`>

/** The branded Token sort, indexed by register. */
export type KernelToken<Register extends string, Carrier = number> =
  Carrier & KernelBrand<`~foldlab/plait/kernel/Token/${Register}`>

/** The branded Position sort, indexed by partition. */
export type KernelPosition<Partition extends string, Carrier = number> =
  Carrier & KernelBrand<`~foldlab/plait/kernel/Position/${Partition}`>

/**
 * The per-kind digest aliases. The declaration kinds are the one brand
 * domain the model closes, so they enumerate; a register and a partition
 * are open, so their brands stay parameters.
 */
/** A content address branded to the schema declaration kind. */
export type SchemaDigest<Carrier = number> = KernelDigest<"schema", Carrier>
/** A content address branded to the program declaration kind. */
export type ProgramDigest<Carrier = number> = KernelDigest<"program", Carrier>
/** A content address branded to the policy declaration kind. */
export type PolicyDigest<Carrier = number> = KernelDigest<"policy", Carrier>
/** A content address branded to the capability declaration kind. */
export type CapabilityDigest<Carrier = number> = KernelDigest<"capability", Carrier>
/** A content address branded to the lane declaration kind. */
export type LaneDigest<Carrier = number> = KernelDigest<"lane", Carrier>
/** A content address branded to the algebra declaration kind. */
export type AlgebraDigest<Carrier = number> = KernelDigest<"algebra", Carrier>
/** A content address branded to the index declaration kind. */
export type IndexDigest<Carrier = number> = KernelDigest<"index", Carrier>
/** A content address branded to the resource declaration kind. */
export type ResourceDigest<Carrier = number> = KernelDigest<"resource", Carrier>
/** A content address branded to the ontology declaration kind. */
export type OntologyDigest<Carrier = number> = KernelDigest<"ontology", Carrier>
/** A content address branded to the schedule declaration kind. */
export type ScheduleDigest<Carrier = number> = KernelDigest<"schedule", Carrier>
/** A content address branded to the template declaration kind. */
export type TemplateDigest<Carrier = number> = KernelDigest<"template", Carrier>
/** A content address branded to the language declaration kind. */
export type LanguageDigest<Carrier = number> = KernelDigest<"language", Carrier>
