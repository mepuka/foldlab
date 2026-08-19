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
 * Each kind carries its standing MEANING as a doc comment: one to two sentences
 * saying what fact the kind names and what that implies, which is a different
 * act from the law and repair a refusal teaches when it fires. The meanings are
 * drafts until the operator's taste pass rules, which is what the marker line
 * above each of them says. They are reviewed data in
 * packages/plait/scripts/kernel-runtime-refusals.ts.
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
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The presented value has no canonical form under the estate's RFC 8785 seam, so it
   * cannot be given a content address. Identity here is bytes, and a value the
   * canonicalizer will not admit has no identity to name.
   */
  "non-canonical-value",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A routing token presented to the fabric is not one literal NATS token. Subjects
   * route and never identify, so a token that could expand or wildcard would widen a
   * route no declaration named.
   */
  "invalid-subject-token",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The presented bytes do not carry the fixed v0 envelope shape the fabric contract
   * declares. The envelope is the frame every fact travels in, so a shape the grammar
   * does not admit is refused before anything reads a body.
   */
  "malformed-envelope",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A body claiming to reach outside itself is not the exact closed blob-reference form
   * envelope v0 reserves. That reserved form is the only way a body may name bytes it
   * does not carry, so a near miss is refused rather than guessed at.
   */
  "malformed-blob-reference",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A canonical body exceeds what envelope v0 carries inline. Bodies above the pinned
   * threshold travel as blobs, which is what keeps the emit path inside a measured
   * substrate budget instead of discovering the ceiling under load.
   */
  "inline-body-too-large",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * Bytes re-derived on read do not hash to the digest that named them. Verify-on-read
   * is what makes a content address a claim about bytes rather than a claim about a
   * store, so a mismatch is structural and is never retried.
   */
  "digest-mismatch",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The commons control stream is not the shape the fabric declares for it. A carrier's
   * shape is part of its meaning, so a stream that evicts, imports, or admits evidence
   * the declaration excludes is refused before anything is written to it.
   */
  "substrate-shape",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A lane declaration is not canonical data carrying one literal route handle, a
   * positive partition count, and a declared key path. A lane is the addressing unit
   * every partition under it inherits, so an ill-formed one would place facts on routes
   * no declaration names.
   */
  "invalid-lane-declaration",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A partition key was derived from something other than the declared path over the
   * admitted event, or names a partition the fold handle does not expose. Routing is a
   * function of the declaration alone, so an ambient or invented key is refused.
   */
  "invalid-partition-key",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * An arriving event is not addressed by the lane and partition key its pump declared.
   * A durable pump consumes only its own declared evidence, so a foreign arrival is
   * refused rather than folded into a state that could no longer be attributed.
   */
  "lane-evidence-mismatch",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The stream backing a declared lane partition is not the exact non-evicting shape
   * the declaration requires. Each declared pair owns one stream whose dense sequence
   * is the successor position, so an evicting or duplicated stream would break the
   * successor discipline that protects application.
   */
  "lane-substrate-shape",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The live substrate advertises a maximum payload too small to carry an emit at the
   * pinned inline threshold. The threshold is pinned against a measured budget, so a
   * substrate below it is refused at open time rather than at emit time.
   */
  "payload-substrate-shape",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * An authority carrier was opened against a stream that imports its facts from
   * another origin. A mirroring or sourcing stream is a locally read-only copy of
   * someone else's journal, so holding it as an authority would attribute decisions to
   * facts it does not own.
   */
  "mirrored-authority-carrier",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * An authority carrier was opened against a stream whose server may expire the facts
   * it holds. A fact the substrate deletes un-decides every decision that cited it, so
   * material meant to expire belongs on a carrier no decision reads.
   */
  "expiring-authority-carrier",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A declared algebra's definition or initial state is not a canonical wire-grammar
   * value. An algebra is declared before it is trusted, so a definition with no
   * canonical bytes has no digest to seed its law suite from.
   */
  "invalid-algebra-declaration",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A fold declaration carries a flow-control or pinned-head value outside the domain
   * the runtime admits. The declaration is what every pump and checkpoint under the
   * fold is configured from, so an out-of-domain field is refused here rather than
   * surfacing later as a runtime failure.
   */
  "invalid-fold-declaration",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * An algebra was spread across more than one partition without having earned the
   * commutative brand. F4 licenses partition fan-out only for an algebra whose
   * digest-seeded law suite passed, so an unearned brand would let arrival order choose
   * the answer.
   */
  "unearned-commutative-algebra",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * An anchor advance is not the contiguous successor step the anchor discipline
   * admits. A floor advances by exactly one applied position, so a jump would record a
   * frontier no application actually reached.
   */
  "invalid-anchor-advance",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The anchor bucket is not the non-evicting, revision-retaining shape the fold plane
   * declares. Anchors are what a resumption reads back, so a bucket that evicts or
   * carries admin surface beyond the declaration cannot be trusted to still hold the
   * frontier.
   */
  "anchor-substrate-shape",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * An anchor and the content-addressed state it names do not re-derive to the recorded
   * canonical digests. The anchor is the record a resumption trusts, so state that does
   * not re-derive is refused rather than resumed from.
   */
  "malformed-anchor-state",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * This pump lost the anchor revision CAS it held. One live pump owns each fold
   * partition, so a lost revision means another owner exists and this one detaches;
   * there is deliberately no re-read-and-continue path.
   */
  "lost-anchor-cas",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A fold partition's durable consumer is not the explicit-ack, bounded-in-flight pull
   * consumer the fold plane declares. That window is what bounds the reorder buffer, so
   * a consumer outside the shape would let the buffer grow past its declared bound.
   */
  "consumer-substrate-shape",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * Positions arrived beyond what the position-addressed reorder buffer may hold. The
   * buffer is bounded by the durable consumer's in-flight window, so an overflow
   * reports a substrate not honouring that window rather than a buffer that should
   * grow.
   */
  "fold-buffer-overflow",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A session declaration is missing its holder, its set of declared views, an anchor
   * policy this seam knows, or a partition its fold's lane declares. A session is
   * read-plane state judged before any layer is reached, so an ill-formed one is
   * refused where no fixture service can drop it.
   */
  "invalid-session-declaration",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A session asked for an image outside the declared views its writ names. A session
   * emits only the image of the declared fold it subscribed to, and only while the writ
   * still names that view.
   */
  "undeclared-view",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A chaos run was requested over something other than one pinned span of one admitted
   * declared fold. Chaos measures the real durable-consumer protocol, so an ambient
   * head or an arbitrary program would measure something no declaration describes.
   */
  "invalid-chaos-request",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A presented fold state is not a wire-grammar value whose state digest re-derives
   * over its canonical bytes. Fold state is content-addressed like everything else, so
   * a state whose digest does not re-derive cannot be anchored.
   */
  "invalid-fold-state",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A work digest presented to the register plane does not map to one literal key. A
   * register is keyed by the work it fences, so a key that could expand would fence
   * something other than what was named.
   */
  "invalid-register-key",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The bytes stored at a register key are not the closed holder-and-outcome record the
   * register plane writes. Only that adapter writes the bucket, so a value outside the
   * closed shape means the substrate holds something no lawful write produced.
   */
  "malformed-register-state",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * Renew, commit, or expire-steal was attempted against a register that does not
   * exist. A grant creates the register before anything fences on it, so this names a
   * missing grant and not a retryable observation.
   */
  "register-absent",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The register bucket is not the non-evicting, revision-retaining shape the fencing
   * plane declares. A fencing token is that bucket's revision order, so a bucket that
   * evicts or renumbers would make a stale token indistinguishable from a current one.
   */
  "register-substrate-shape",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A grant was attempted against work whose register already exists. A grant requires
   * absence, so admitting a second one would hand two holders a lease over the same
   * work.
   */
  "duplicate-grant",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The register already carries a landed outcome. An outcome, once set, never changes,
   * so this round is over whether or not the presented token is current.
   */
  "outcome-already-landed",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The presented fencing token is not the register's current one. Only a current token
   * renews or commits, so a stale one belongs to a superseded round and must never
   * land.
   */
  "stale-register-token",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * An expire-steal lost its compare-and-set against a concurrently advancing register.
   * A steal grants a strictly larger token from the revision it read, so a moved
   * revision is re-read and the steal re-attempted against it.
   */
  "concurrent-register-update",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * Presented bytes do not decode as their declared schema, or do not decode as one
   * wire value at all. A decoder that repairs its input names a different value, so a
   * near miss is refused rather than coerced.
   */
  "malformed-value",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A cell name does not map to one literal key. A cell is named by that key, so a name
   * that could expand would merge into a keyspace the caller never named.
   */
  "invalid-cell-key",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The bytes stored at a cell key are not the canonical array of holder-attributed
   * observations. Only a join writes that bucket, so a value outside the canonical
   * shape means the substrate holds something no merge produced.
   */
  "malformed-cell-state",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The cell bucket is not the non-evicting, single-revision shape the lattice plane
   * declares. A cell is a join-semilattice carrier, so a bucket retaining extra
   * revisions would offer a history the merge discipline does not admit.
   */
  "cell-substrate-shape",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A petname carries a separator or a control character, or is one of the relative
   * forms. Petnames name values rather than positions, so the relative forms are
   * refused along with anything a reader could take for a path.
   */
  "invalid-petname",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * A hop of a path opened a value that is not a directory. A walk never reinterprets a
   * value, so it stops here instead of guessing at a structure the value does not have.
   */
  "not-a-directory",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * The directory reached at this hop binds no such name. A root digest names one
   * immutable directory, so the answer never moves: this is structural, never a
   * retryable absence.
   */
  "unbound-petname",
  /**
   * Draft meaning (pending DEV-825 taste pass):
   * This name is bound to more than one digest in the directory reached. A directory
   * carries a binding set and nothing in a walk arbitrates, so an ambiguous name
   * resolves to none of its candidates.
   */
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
