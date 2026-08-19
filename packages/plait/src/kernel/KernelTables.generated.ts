/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * GENERATED FILE - DO NOT EDIT.
 *
 * Corpus:  64afd406f040a419f7c4192906944f7abb75def21fb7c729980d3035508456ed
 * Format:  interchange format 2
 *
 * That digest is this module's whole provenance, and it is a digest rather
 * than a location because a plait item refers only to digests: a path names
 * wherever a reader happens to be standing, which is the ambient reference the
 * algebra refuses. It is SHA-256 over the corpus's canonical bytes.
 *
 * The kernel model's closed tables, projected into the runtime's type layer:
 * the declaration-kind and hole-stage registries with their ranks, the taught
 * refusals with the law each defends and the repair each teaches, and the
 * compile-time brands of the sort system. The existing runtime refusal
 * projection is also generated here; a spelling the corpus does not carry is
 * marked staged debt, and the ticket owning it stays in the reviewed roster.
 *
 * Every refusal row carries its kind's standing MEANING as a doc comment: one
 * to two sentences saying what fact the kind names and what that implies,
 * distinct from the law and repair a refusal teaches at the moment it fires.
 * The operator's taste pass ratified those sentences, so each one stands as
 * written and nothing is rendered above it.
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

/**
 * What these tables came from, carried as data for a consumer to assert: the
 * identity of the corpus, and the interchange format it was read at. A
 * consumer that wants to know whether it holds these tables' source hashes
 * the bytes it has and compares - which is a check, where a path would have
 * been a hope.
 */
export const KERNEL_TABLE_PROVENANCE = {
  corpus: "64afd406f040a419f7c4192906944f7abb75def21fb7c729980d3035508456ed",
  format: 2n,
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
  /**
   * A fold read a clock. The fold carrier has no clock parameter, so a time a fold
   * consumes arrives as a tick fact on an evidence lane like every other fact.
   */
  {
    reason: "clock-read",
    law: "the fold carrier has no clock parameter (f11_query_deterministic)",
    repair: "emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value",
    applicability: "advisory",
  },
  /**
   * A trigger fires on silence rather than on a fact. The trigger grammar is closed at
   * five monotone productions, so acting on the absence of evidence has no production
   * to be written in.
   */
  {
    reason: "absence-trigger",
    law: "the trigger grammar is closed at five monotone productions (f10_stability)",
    repair: "route acting-on-silence through the deadline seat: a fenced decide fed by tick facts",
    applicability: "advisory",
  },
  /**
   * A commit was attempted without holding a fencing token. Only a fenced token lands
   * an outcome, so an unfenced decide has nothing making it at most once.
   */
  {
    reason: "unfenced-decide",
    law: "only a fenced token commits (at_most_one_landed_commit)",
    repair: "hold the register's token and commit with it; grant and renew are runtime liveness, not grammar",
    applicability: "advisory",
  },
  /**
   * A write was resolved by arrival order. Cells merge by join under a declared ACI
   * algebra, so an idempotent merge leaves arrival order nothing to decide.
   */
  {
    reason: "last-writer-wins",
    law: "cells merge by join under a declared ACI algebra (f1_cell_merge_aci)",
    repair: "declare the merge algebra; idempotent join leaves nothing for arrival order to choose",
    applicability: "machine-applicable",
  },
  /**
   * A fetched value was trusted without re-deriving its digest. A decode re-derives the
   * identity of what it fetched, so an unverified read makes the store, rather than the
   * bytes, the authority.
   */
  {
    reason: "unverified-read",
    law: "a decode re-derives the digest of what it fetched (verify-on-read)",
    repair: "resolve and let the door re-derive; absence is retryable, a mismatch is structural",
    applicability: "machine-applicable",
  },
  /**
   * Two identifiers were compared across the spaces that mint them. Tokens are
   * per-register and positions are per-partition, so a comparison across spaces is a
   * sort error wearing the shape of a number.
   */
  {
    reason: "cross-sort-identifier",
    law: "tokens are per-register and positions are per-partition; sorts never compare across spaces",
    repair: "compare a token only within its register and a position only within its partition",
    applicability: "advisory",
  },
  /**
   * A name was invented rather than derived. Every identifier is the digest of a
   * declaration or a derivation from one, so nothing in the language mints a name out
   * of nothing.
   */
  {
    reason: "minted-identifier",
    law: "every identifier is a digest of a declaration or a derivation from one",
    repair: "declare the value and use its digest; nothing mints a name",
    applicability: "advisory",
  },
  /**
   * A derived read depends on something outside its support and its query value. Such a
   * read is a function of those two alone, so an ambient input would make one query at
   * one anchor answerable two ways.
   */
  {
    reason: "ambient-query-input",
    law: "a derived read is a function of support and query alone (f11_topk_of_support)",
    repair: "read state through a fold at an anchor, and put any seed inside the declared query value",
    applicability: "advisory",
  },
  /**
   * A pin names a declaration that has not been admitted. The reference graph is a DAG
   * in admission order, so a referent is declared before anything points at it.
   */
  {
    reason: "forward-reference",
    law: "pins name already-admitted digests (c7_pin_well_founded)",
    repair: "declare the referent first; the reference graph is a DAG by admission order",
    applicability: "advisory",
  },
  /**
   * A secret was carried in the wire grammar. The grammar admits no secret position, so
   * credentials ride the environmental band as redacted configuration, outside meaning.
   */
  {
    reason: "secret-carrier",
    law: "the wire grammar admits no secret position",
    repair: "carry credentials in the environmental band as redacted configuration, outside meaning",
    applicability: "advisory",
  },
  /**
   * A read claimed that something is present nowhere. A local view is a lattice lower
   * bound, so it licenses an at-least claim and never a global negative.
   */
  {
    reason: "absence-claim",
    law: "a local view is a lattice lower bound (cell_absorb_inflationary)",
    repair: "claim at-least from a replica, never not-present-anywhere",
    applicability: "advisory",
  },
  /**
   * A recorded fact was changed after the fact. Journals are append-only, so a
   * correction is a successor value pinning its predecessor and forgetting is fenced
   * compaction above the horizon.
   */
  {
    reason: "past-mutation",
    law: "journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)",
    repair: "declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon",
    applicability: "machine-applicable",
  },
  /**
   * A declaration names an identifier outside the universe its writ pins. The writ is
   * the boundary a declaration's references live inside, so reaching past it would let
   * a spawn read what its grant never admitted.
   */
  {
    reason: "off-writ-referent",
    law: "a declaration's identifiers lie inside the universe its writ pins",
    repair: "spawn under a writ that pins the referent, or request the referent into the pinned universe",
    applicability: "advisory",
  },
  /**
   * A program's identity was taken from its closure bytes. A declaration is the
   * identity, so computation is referenced by the digest of a declared fold and never
   * by the shape of a function value.
   */
  {
    reason: "closure-introspection",
    law: "a program's identity is its declaration, never its closure bytes",
    repair: "reference computation by digest: declare the fold and pin its digest",
    applicability: "advisory",
  },
  /**
   * A resolve was qualified by an anchor. A digest names one value forever, so an
   * anchor could only decorate that answer; head-relative reading belongs to a fold
   * read at an anchor instead.
   */
  {
    reason: "anchored-resolve",
    law: "a digest names one value forever, so no anchor can change a resolve",
    repair: "drop the anchor; read head-relative state through a fold at an anchor",
    applicability: "machine-applicable",
  },
  /**
   * Execution was attempted on a declaration with a hole still open. Only closed
   * programs execute, and a hole is a declared parameter rather than a wildcard, so it
   * is filled before the declaration is a run.
   */
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
export interface KernelRuntimeStructuralRefusalRow {
  readonly kind: KernelRuntimeStructuralRefusalKind
  readonly source: "kernel-corpus" | "staged-debt"
}

/**
 * The runtime projection with derivation ancestry on every row. A spelling the
 * corpus does not carry is marked staged debt, never a silent twin. Which
 * ticket owns closing that debt is a tracking fact and stays in the reviewed
 * roster, where a reviewer reads it; it is not part of the language.
 */
export const KERNEL_RUNTIME_STRUCTURAL_REFUSALS = [
  /**
   * The presented value has no canonical form under the estate's RFC 8785 seam, so it
   * cannot be given a content address. Identity here is bytes, and a value the
   * canonicalizer will not admit has no identity to name.
   */
  {
    kind: "non-canonical-value",
    source: "staged-debt",
  },
  /**
   * A routing token presented to the fabric is not one literal NATS token. Subjects
   * route and never identify, so a token that could expand or wildcard would widen a
   * route no declaration named.
   */
  {
    kind: "invalid-subject-token",
    source: "staged-debt",
  },
  /**
   * The presented bytes do not carry the fixed v0 envelope shape the fabric contract
   * declares. The envelope is the frame every fact travels in, so a shape the grammar
   * does not admit is refused before anything reads a body.
   */
  {
    kind: "malformed-envelope",
    source: "staged-debt",
  },
  /**
   * A body claiming to reach outside itself is not the exact closed blob-reference form
   * envelope v0 reserves. That reserved form is the only way a body may name bytes it
   * does not carry, so a near miss is refused rather than guessed at.
   */
  {
    kind: "malformed-blob-reference",
    source: "staged-debt",
  },
  /**
   * A canonical body exceeds what envelope v0 carries inline. Bodies above the pinned
   * threshold travel as blobs, which is what keeps the emit path inside a measured
   * substrate budget instead of discovering the ceiling under load.
   */
  {
    kind: "inline-body-too-large",
    source: "staged-debt",
  },
  /**
   * Bytes re-derived on read do not hash to the digest that named them. Verify-on-read
   * is what makes a content address a claim about bytes rather than a claim about a
   * store, so a mismatch is structural and is never retried.
   */
  {
    kind: "digest-mismatch",
    source: "staged-debt",
  },
  /**
   * The commons control stream is not the shape the fabric declares for it. A carrier's
   * shape is part of its meaning, so a stream that evicts, imports, or admits evidence
   * the declaration excludes is refused before anything is written to it.
   */
  {
    kind: "substrate-shape",
    source: "staged-debt",
  },
  /**
   * A lane declaration is not canonical data carrying one literal route handle, a
   * positive partition count, and a declared key path. A lane is the addressing unit
   * every partition under it inherits, so an ill-formed one would place facts on routes
   * no declaration names.
   */
  {
    kind: "invalid-lane-declaration",
    source: "staged-debt",
  },
  /**
   * A partition key was derived from something other than the declared path over the
   * admitted event, or names a partition the fold handle does not expose. Routing is a
   * function of the declaration alone, so an ambient or invented key is refused.
   */
  {
    kind: "invalid-partition-key",
    source: "staged-debt",
  },
  /**
   * An arriving event is not addressed by the lane and partition key its pump declared.
   * A durable pump consumes only its own declared evidence, so a foreign arrival is
   * refused rather than folded into a state that could no longer be attributed.
   */
  {
    kind: "lane-evidence-mismatch",
    source: "staged-debt",
  },
  /**
   * The stream backing a declared lane partition is not the exact non-evicting shape
   * the declaration requires. Each declared pair owns one stream whose dense sequence
   * is the successor position, so an evicting or duplicated stream would break the
   * successor discipline that protects application.
   */
  {
    kind: "lane-substrate-shape",
    source: "staged-debt",
  },
  /**
   * The live substrate advertises a maximum payload too small to carry an emit at the
   * pinned inline threshold. The threshold is pinned against a measured budget, so a
   * substrate below it is refused at open time rather than at emit time.
   */
  {
    kind: "payload-substrate-shape",
    source: "staged-debt",
  },
  /**
   * An authority carrier was opened against a stream that imports its facts from
   * another origin. A mirroring or sourcing stream is a locally read-only copy of
   * someone else's journal, so holding it as an authority would attribute decisions to
   * facts it does not own.
   */
  {
    kind: "mirrored-authority-carrier",
    source: "staged-debt",
  },
  /**
   * An authority carrier was opened against a stream whose server may expire the facts
   * it holds. A fact the substrate deletes un-decides every decision that cited it, so
   * material meant to expire belongs on a carrier no decision reads.
   */
  {
    kind: "expiring-authority-carrier",
    source: "staged-debt",
  },
  /**
   * A declared algebra's definition or initial state is not a canonical wire-grammar
   * value. An algebra is declared before it is trusted, so a definition with no
   * canonical bytes has no digest to seed its law suite from.
   */
  {
    kind: "invalid-algebra-declaration",
    source: "staged-debt",
  },
  /**
   * A fold declaration carries a flow-control or pinned-head value outside the domain
   * the runtime admits. The declaration is what every pump and checkpoint under the
   * fold is configured from, so an out-of-domain field is refused here rather than
   * surfacing later as a runtime failure.
   */
  {
    kind: "invalid-fold-declaration",
    source: "staged-debt",
  },
  /**
   * An algebra was spread across more than one partition without having earned the
   * commutative brand. F4 licenses partition fan-out only for an algebra whose
   * digest-seeded law suite passed, so an unearned brand would let arrival order choose
   * the answer.
   */
  {
    kind: "unearned-commutative-algebra",
    source: "staged-debt",
  },
  /**
   * An anchor advance is not the contiguous successor step the anchor discipline
   * admits. A floor advances by exactly one applied position, so a jump would record a
   * frontier no application actually reached.
   */
  {
    kind: "invalid-anchor-advance",
    source: "staged-debt",
  },
  /**
   * The anchor bucket is not the non-evicting, revision-retaining shape the fold plane
   * declares. Anchors are what a resumption reads back, so a bucket that evicts or
   * carries admin surface beyond the declaration cannot be trusted to still hold the
   * frontier.
   */
  {
    kind: "anchor-substrate-shape",
    source: "staged-debt",
  },
  /**
   * An anchor and the content-addressed state it names do not re-derive to the recorded
   * canonical digests. The anchor is the record a resumption trusts, so state that does
   * not re-derive is refused rather than resumed from.
   */
  {
    kind: "malformed-anchor-state",
    source: "staged-debt",
  },
  /**
   * This pump lost the anchor revision CAS it held. One live pump owns each fold
   * partition, so a lost revision means another owner exists and this one detaches;
   * there is deliberately no re-read-and-continue path.
   */
  {
    kind: "lost-anchor-cas",
    source: "staged-debt",
  },
  /**
   * A fold partition's durable consumer is not the explicit-ack, bounded-in-flight pull
   * consumer the fold plane declares. That window is what bounds the reorder buffer, so
   * a consumer outside the shape would let the buffer grow past its declared bound.
   */
  {
    kind: "consumer-substrate-shape",
    source: "staged-debt",
  },
  /**
   * Positions arrived beyond what the position-addressed reorder buffer may hold. The
   * buffer is bounded by the durable consumer's in-flight window, so an overflow
   * reports a substrate not honouring that window rather than a buffer that should
   * grow.
   */
  {
    kind: "fold-buffer-overflow",
    source: "staged-debt",
  },
  /**
   * A session declaration is missing its holder, its set of declared views, an anchor
   * policy this seam knows, or a partition its fold's lane declares. A session is
   * read-plane state judged before any layer is reached, so an ill-formed one is
   * refused where no fixture service can drop it.
   */
  {
    kind: "invalid-session-declaration",
    source: "staged-debt",
  },
  /**
   * A session asked for an image outside the declared views its writ names. A session
   * emits only the image of the declared fold it subscribed to, and only while the writ
   * still names that view.
   */
  {
    kind: "undeclared-view",
    source: "staged-debt",
  },
  /**
   * A chaos run was requested over something other than one pinned span of one admitted
   * declared fold. Chaos measures the real durable-consumer protocol, so an ambient
   * head or an arbitrary program would measure something no declaration describes.
   */
  {
    kind: "invalid-chaos-request",
    source: "staged-debt",
  },
  /**
   * A presented fold state is not a wire-grammar value whose state digest re-derives
   * over its canonical bytes. Fold state is content-addressed like everything else, so
   * a state whose digest does not re-derive cannot be anchored.
   */
  {
    kind: "invalid-fold-state",
    source: "staged-debt",
  },
  /**
   * A work digest presented to the register plane does not map to one literal key. A
   * register is keyed by the work it fences, so a key that could expand would fence
   * something other than what was named.
   */
  {
    kind: "invalid-register-key",
    source: "staged-debt",
  },
  /**
   * The bytes stored at a register key are not the closed holder-and-outcome record the
   * register plane writes. Only that adapter writes the bucket, so a value outside the
   * closed shape means the substrate holds something no lawful write produced.
   */
  {
    kind: "malformed-register-state",
    source: "staged-debt",
  },
  /**
   * Renew, commit, or expire-steal was attempted against a register that does not
   * exist. A grant creates the register before anything fences on it, so this names a
   * missing grant and not a retryable observation.
   */
  {
    kind: "register-absent",
    source: "staged-debt",
  },
  /**
   * The register bucket is not the non-evicting, revision-retaining shape the fencing
   * plane declares. A fencing token is that bucket's revision order, so a bucket that
   * evicts or renumbers would make a stale token indistinguishable from a current one.
   */
  {
    kind: "register-substrate-shape",
    source: "staged-debt",
  },
  /**
   * A grant was attempted against work whose register already exists. A grant requires
   * absence, so admitting a second one would hand two holders a lease over the same
   * work.
   */
  {
    kind: "duplicate-grant",
    source: "staged-debt",
  },
  /**
   * The register already carries a landed outcome. An outcome, once set, never changes,
   * so this round is over whether or not the presented token is current.
   */
  {
    kind: "outcome-already-landed",
    source: "staged-debt",
  },
  /**
   * The presented fencing token is not the register's current one. Only a current token
   * renews or commits, so a stale one belongs to a superseded round and must never
   * land.
   */
  {
    kind: "stale-register-token",
    source: "staged-debt",
  },
  /**
   * An expire-steal lost its compare-and-set against a concurrently advancing register.
   * A steal grants a strictly larger token from the revision it read, so a moved
   * revision is re-read and the steal re-attempted against it.
   */
  {
    kind: "concurrent-register-update",
    source: "staged-debt",
  },
  /**
   * Presented bytes do not decode as their declared schema, or do not decode as one
   * wire value at all. A decoder that repairs its input names a different value, so a
   * near miss is refused rather than coerced.
   */
  {
    kind: "malformed-value",
    source: "staged-debt",
  },
  /**
   * A cell name does not map to one literal key. A cell is named by that key, so a name
   * that could expand would merge into a keyspace the caller never named.
   */
  {
    kind: "invalid-cell-key",
    source: "staged-debt",
  },
  /**
   * The bytes stored at a cell key are not the canonical array of holder-attributed
   * observations. Only a join writes that bucket, so a value outside the canonical
   * shape means the substrate holds something no merge produced.
   */
  {
    kind: "malformed-cell-state",
    source: "staged-debt",
  },
  /**
   * The cell bucket is not the non-evicting, single-revision shape the lattice plane
   * declares. A cell is a join-semilattice carrier, so a bucket retaining extra
   * revisions would offer a history the merge discipline does not admit.
   */
  {
    kind: "cell-substrate-shape",
    source: "staged-debt",
  },
  /**
   * A petname carries a separator or a control character, or is one of the relative
   * forms. Petnames name values rather than positions, so the relative forms are
   * refused along with anything a reader could take for a path.
   */
  {
    kind: "invalid-petname",
    source: "staged-debt",
  },
  /**
   * A hop of a path opened a value that is not a directory. A walk never reinterprets a
   * value, so it stops here instead of guessing at a structure the value does not have.
   */
  {
    kind: "not-a-directory",
    source: "staged-debt",
  },
  /**
   * The directory reached at this hop binds no such name. A root digest names one
   * immutable directory, so the answer never moves: this is structural, never a
   * retryable absence.
   */
  {
    kind: "unbound-petname",
    source: "staged-debt",
  },
  /**
   * This name is bound to more than one digest in the directory reached. A directory
   * carries a binding set and nothing in a walk arbitrates, so an ambiguous name
   * resolves to none of its candidates.
   */
  {
    kind: "ambiguous-binding",
    source: "staged-debt",
  },
  /**
   * An incarnation is one life of a store — the store a name resolved to at the moment
   * a fence was taken against it. A store reborn under that name is a different store
   * answering to it and owes nothing to its predecessor's fences, so a fence from the
   * dead incarnation names a store that no longer exists rather than a round that has
   * merely moved on.
   */
  {
    kind: "incarnation-mismatch",
    source: "staged-debt",
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
