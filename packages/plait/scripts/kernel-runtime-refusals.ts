/**
 * The reviewed refusal-kind roster: the runtime projection manifest, and the
 * standing MEANING every kind in the estate's refusal vocabulary carries.
 *
 * Two reviewed data live here, and they answer two different questions.
 *
 * The **projection** is the small reviewed datum that pins which existing
 * runtime spellings belong in the kernel projection. The generator resolves
 * every spelling against the model-emitted refusal rows. A match is
 * corpus-backed; a miss is emitted as explicit Law 1 staged debt citing
 * DEV-804. The manifest is not a second public union: `truth/Refusal.ts`
 * consumes only the generated schema.
 *
 * The **meaning** is the kind's standing sense in the language, one to two
 * sentences in estate terms: what fact the kind names, and what that implies
 * or protects. It is deliberately NOT the refusal-time teaching. A `law`,
 * `expected`, and `next` speak at the moment of refusal, to whoever presented
 * the candidate, about this one presentation; a meaning speaks about the kind
 * itself, standing, to anyone reading the vocabulary. Every kind carries one —
 * the runtime spellings below and the model's own emitted reasons alike,
 * because the emitted reasons are vocabulary too and the model corpus has no
 * field to carry a meaning in.
 *
 * Every meaning below is a DRAFT. The operator's taste pass (DEV-825) ratifies
 * the sentences; until it rules, every projection renders the meaning behind
 * `DRAFT_MEANING_MARKER`, and the vocabulary wall requires that marker to be
 * there. Editing a sentence here is a visible act: the generated modules and
 * the prose page all move, and their byte-identical regeneration checks show
 * the diff.
 *
 * DEV-804 owns replacing each staged row with its corpus declaration. Removing
 * or renaming a spelling here is a persisted-wire change and is outside that
 * ticket as well as DEV-808.
 *
 * @module
 */

/** The ticket owning runtime refusal rows the kernel corpus does not yet carry. */
export const RUNTIME_REFUSAL_WAIVER_TICKET = "DEV-804" as const

/** The ticket whose operator taste pass ratifies the drafted meanings. */
export const REFUSAL_MEANING_TASTE_TICKET = "DEV-825" as const

/**
 * The line every unratified meaning is rendered behind, verbatim, in every
 * projection. Its presence is walled: a meaning that lost its marker reads as
 * ratified prose, and nothing but the taste-pass ruling may make it read that
 * way.
 */
export const DRAFT_MEANING_MARKER = "Draft meaning (pending DEV-825 taste pass):" as const

/** One runtime structural spelling and its standing meaning. */
export interface RuntimeRefusalMeaning {
  readonly kind: string
  readonly meaning: string
}

/** One model-emitted refusal reason and its standing meaning. */
export interface KernelReasonMeaning {
  readonly reason: string
  readonly meaning: string
}

/** Where this reviewed projection manifest lives, relative to the repository root. */
export const RUNTIME_REFUSAL_PROJECTION_PATH =
  "packages/plait/scripts/kernel-runtime-refusals.ts" as const

/**
 * The existing runtime structural spellings, in their persisted order, each
 * with its drafted meaning.
 *
 * The order is the wire union's and is never sorted: it is what the generated
 * `STRUCTURAL_REFUSAL_KINDS` roster carries.
 */
export const RUNTIME_STRUCTURAL_REFUSAL_PROJECTION = [
  {
    kind: "non-canonical-value",
    meaning:
      "The presented value has no canonical form under the estate's RFC 8785 seam, so it"
      + " cannot be given a content address. Identity here is bytes, and a value the"
      + " canonicalizer will not admit has no identity to name.",
  },
  {
    kind: "invalid-subject-token",
    meaning:
      "A routing token presented to the fabric is not one literal NATS token. Subjects"
      + " route and never identify, so a token that could expand or wildcard would widen a"
      + " route no declaration named.",
  },
  {
    kind: "malformed-envelope",
    meaning:
      "The presented bytes do not carry the fixed v0 envelope shape the fabric contract"
      + " declares. The envelope is the frame every fact travels in, so a shape the grammar"
      + " does not admit is refused before anything reads a body.",
  },
  {
    kind: "malformed-blob-reference",
    meaning:
      "A body claiming to reach outside itself is not the exact closed blob-reference form"
      + " envelope v0 reserves. That reserved form is the only way a body may name bytes it"
      + " does not carry, so a near miss is refused rather than guessed at.",
  },
  {
    kind: "inline-body-too-large",
    meaning:
      "A canonical body exceeds what envelope v0 carries inline. Bodies above the pinned"
      + " threshold travel as blobs, which is what keeps the emit path inside a measured"
      + " substrate budget instead of discovering the ceiling under load.",
  },
  {
    kind: "digest-mismatch",
    meaning:
      "Bytes re-derived on read do not hash to the digest that named them. Verify-on-read"
      + " is what makes a content address a claim about bytes rather than a claim about a"
      + " store, so a mismatch is structural and is never retried.",
  },
  {
    kind: "substrate-shape",
    meaning:
      "The commons control stream is not the shape the fabric declares for it. A carrier's"
      + " shape is part of its meaning, so a stream that evicts, imports, or admits"
      + " evidence the declaration excludes is refused before anything is written to it.",
  },
  {
    kind: "invalid-lane-declaration",
    meaning:
      "A lane declaration is not canonical data carrying one literal route handle, a"
      + " positive partition count, and a declared key path. A lane is the addressing unit"
      + " every partition under it inherits, so an ill-formed one would place facts on"
      + " routes no declaration names.",
  },
  {
    kind: "invalid-partition-key",
    meaning:
      "A partition key was derived from something other than the declared path over the"
      + " admitted event, or names a partition the fold handle does not expose. Routing is"
      + " a function of the declaration alone, so an ambient or invented key is refused.",
  },
  {
    kind: "lane-evidence-mismatch",
    meaning:
      "An arriving event is not addressed by the lane and partition key its pump declared."
      + " A durable pump consumes only its own declared evidence, so a foreign arrival is"
      + " refused rather than folded into a state that could no longer be attributed.",
  },
  {
    kind: "lane-substrate-shape",
    meaning:
      "The stream backing a declared lane partition is not the exact non-evicting shape"
      + " the declaration requires. Each declared pair owns one stream whose dense sequence"
      + " is the successor position, so an evicting or duplicated stream would break the"
      + " successor discipline that protects application.",
  },
  // Payload threshold (DEV-774).
  {
    kind: "payload-substrate-shape",
    meaning:
      "The live substrate advertises a maximum payload too small to carry an emit at the"
      + " pinned inline threshold. The threshold is pinned against a measured budget, so a"
      + " substrate below it is refused at open time rather than at emit time.",
  },
  // The authority-carrier laws that are not shape laws (DEV-780): a carrier
  // that imports its facts, and a carrier that lets the server expire them.
  {
    kind: "mirrored-authority-carrier",
    meaning:
      "An authority carrier was opened against a stream that imports its facts from"
      + " another origin. A mirroring or sourcing stream is a locally read-only copy of"
      + " someone else's journal, so holding it as an authority would attribute decisions"
      + " to facts it does not own.",
  },
  {
    kind: "expiring-authority-carrier",
    meaning:
      "An authority carrier was opened against a stream whose server may expire the facts"
      + " it holds. A fact the substrate deletes un-decides every decision that cited it,"
      + " so material meant to expire belongs on a carrier no decision reads.",
  },
  {
    kind: "invalid-algebra-declaration",
    meaning:
      "A declared algebra's definition or initial state is not a canonical wire-grammar"
      + " value. An algebra is declared before it is trusted, so a definition with no"
      + " canonical bytes has no digest to seed its law suite from.",
  },
  {
    kind: "invalid-fold-declaration",
    meaning:
      "A fold declaration carries a flow-control or pinned-head value outside the domain"
      + " the runtime admits. The declaration is what every pump and checkpoint under the"
      + " fold is configured from, so an out-of-domain field is refused here rather than"
      + " surfacing later as a runtime failure.",
  },
  {
    kind: "unearned-commutative-algebra",
    meaning:
      "An algebra was spread across more than one partition without having earned the"
      + " commutative brand. F4 licenses partition fan-out only for an algebra whose"
      + " digest-seeded law suite passed, so an unearned brand would let arrival order"
      + " choose the answer.",
  },
  {
    kind: "invalid-anchor-advance",
    meaning:
      "An anchor advance is not the contiguous successor step the anchor discipline"
      + " admits. A floor advances by exactly one applied position, so a jump would record"
      + " a frontier no application actually reached.",
  },
  {
    kind: "anchor-substrate-shape",
    meaning:
      "The anchor bucket is not the non-evicting, revision-retaining shape the fold plane"
      + " declares. Anchors are what a resumption reads back, so a bucket that evicts or"
      + " carries admin surface beyond the declaration cannot be trusted to still hold the"
      + " frontier.",
  },
  {
    kind: "malformed-anchor-state",
    meaning:
      "An anchor and the content-addressed state it names do not re-derive to the recorded"
      + " canonical digests. The anchor is the record a resumption trusts, so state that"
      + " does not re-derive is refused rather than resumed from.",
  },
  {
    kind: "lost-anchor-cas",
    meaning:
      "This pump lost the anchor revision CAS it held. One live pump owns each fold"
      + " partition, so a lost revision means another owner exists and this one detaches;"
      + " there is deliberately no re-read-and-continue path.",
  },
  {
    kind: "consumer-substrate-shape",
    meaning:
      "A fold partition's durable consumer is not the explicit-ack, bounded-in-flight pull"
      + " consumer the fold plane declares. That window is what bounds the reorder buffer,"
      + " so a consumer outside the shape would let the buffer grow past its declared"
      + " bound.",
  },
  {
    kind: "fold-buffer-overflow",
    meaning:
      "Positions arrived beyond what the position-addressed reorder buffer may hold. The"
      + " buffer is bounded by the durable consumer's in-flight window, so an overflow"
      + " reports a substrate not honouring that window rather than a buffer that should"
      + " grow.",
  },
  {
    kind: "invalid-session-declaration",
    meaning:
      "A session declaration is missing its holder, its set of declared views, an anchor"
      + " policy this seam knows, or a partition its fold's lane declares. A session is"
      + " read-plane state judged before any layer is reached, so an ill-formed one is"
      + " refused where no fixture service can drop it.",
  },
  {
    kind: "undeclared-view",
    meaning:
      "A session asked for an image outside the declared views its writ names. A session"
      + " emits only the image of the declared fold it subscribed to, and only while the"
      + " writ still names that view.",
  },
  {
    kind: "invalid-chaos-request",
    meaning:
      "A chaos run was requested over something other than one pinned span of one admitted"
      + " declared fold. Chaos measures the real durable-consumer protocol, so an ambient"
      + " head or an arbitrary program would measure something no declaration describes.",
  },
  {
    kind: "invalid-fold-state",
    meaning:
      "A presented fold state is not a wire-grammar value whose state digest re-derives"
      + " over its canonical bytes. Fold state is content-addressed like everything else,"
      + " so a state whose digest does not re-derive cannot be anchored.",
  },
  {
    kind: "invalid-register-key",
    meaning:
      "A work digest presented to the register plane does not map to one literal key. A"
      + " register is keyed by the work it fences, so a key that could expand would fence"
      + " something other than what was named.",
  },
  {
    kind: "malformed-register-state",
    meaning:
      "The bytes stored at a register key are not the closed holder-and-outcome record the"
      + " register plane writes. Only that adapter writes the bucket, so a value outside"
      + " the closed shape means the substrate holds something no lawful write produced.",
  },
  {
    kind: "register-absent",
    meaning:
      "Renew, commit, or expire-steal was attempted against a register that does not"
      + " exist. A grant creates the register before anything fences on it, so this names a"
      + " missing grant and not a retryable observation.",
  },
  {
    kind: "register-substrate-shape",
    meaning:
      "The register bucket is not the non-evicting, revision-retaining shape the fencing"
      + " plane declares. A fencing token is that bucket's revision order, so a bucket that"
      + " evicts or renumbers would make a stale token indistinguishable from a current"
      + " one.",
  },
  {
    kind: "duplicate-grant",
    meaning:
      "A grant was attempted against work whose register already exists. A grant requires"
      + " absence, so admitting a second one would hand two holders a lease over the same"
      + " work.",
  },
  {
    kind: "outcome-already-landed",
    meaning:
      "The register already carries a landed outcome. An outcome, once set, never changes,"
      + " so this round is over whether or not the presented token is current.",
  },
  {
    kind: "stale-register-token",
    meaning:
      "The presented fencing token is not the register's current one. Only a current token"
      + " renews or commits, so a stale one belongs to a superseded round and must never"
      + " land.",
  },
  {
    kind: "concurrent-register-update",
    meaning:
      "An expire-steal lost its compare-and-set against a concurrently advancing register."
      + " A steal grants a strictly larger token from the revision it read, so a moved"
      + " revision is re-read and the steal re-attempted against it.",
  },
  {
    kind: "malformed-value",
    meaning:
      "Presented bytes do not decode as their declared schema, or do not decode as one"
      + " wire value at all. A decoder that repairs its input names a different value, so a"
      + " near miss is refused rather than coerced.",
  },
  {
    kind: "invalid-cell-key",
    meaning:
      "A cell name does not map to one literal key. A cell is named by that key, so a name"
      + " that could expand would merge into a keyspace the caller never named.",
  },
  {
    kind: "malformed-cell-state",
    meaning:
      "The bytes stored at a cell key are not the canonical array of holder-attributed"
      + " observations. Only a join writes that bucket, so a value outside the canonical"
      + " shape means the substrate holds something no merge produced.",
  },
  {
    kind: "cell-substrate-shape",
    meaning:
      "The cell bucket is not the non-evicting, single-revision shape the lattice plane"
      + " declares. A cell is a join-semilattice carrier, so a bucket retaining extra"
      + " revisions would offer a history the merge discipline does not admit.",
  },
  // Addressing (DEV-766). `ambiguous-binding` is the model's spelling on the
  // F12 across-bind-orders row; the other three are the address door's own.
  {
    kind: "invalid-petname",
    meaning:
      "A petname carries a separator or a control character, or is one of the relative"
      + " forms. Petnames name values rather than positions, so the relative forms are"
      + " refused along with anything a reader could take for a path.",
  },
  {
    kind: "not-a-directory",
    meaning:
      "A hop of a path opened a value that is not a directory. A walk never reinterprets a"
      + " value, so it stops here instead of guessing at a structure the value does not"
      + " have.",
  },
  {
    kind: "unbound-petname",
    meaning:
      "The directory reached at this hop binds no such name. A root digest names one"
      + " immutable directory, so the answer never moves: this is structural, never a"
      + " retryable absence.",
  },
  {
    kind: "ambiguous-binding",
    meaning:
      "This name is bound to more than one digest in the directory reached. A directory"
      + " carries a binding set and nothing in a walk arbitrates, so an ambiguous name"
      + " resolves to none of its candidates.",
  },
] as const satisfies ReadonlyArray<RuntimeRefusalMeaning>

/**
 * The standing meaning of every refusal reason the kernel model emits.
 *
 * These rows are reviewed data for the same reason the projection above is:
 * the corpus is the model's own emission and carries no field a meaning could
 * ride in, and nothing in this package may edit it. The ledger is kept sorted
 * by reason so a reader finds a row by name; the generator resolves each
 * corpus reason against it and refuses both a reason with no meaning and a
 * meaning naming no reason, so neither side can drift silently.
 */
export const KERNEL_REFUSAL_REASON_MEANINGS = [
  {
    reason: "absence-claim",
    meaning:
      "A read claimed that something is present nowhere. A local view is a lattice lower"
      + " bound, so it licenses an at-least claim and never a global negative.",
  },
  {
    reason: "absence-trigger",
    meaning:
      "A trigger fires on silence rather than on a fact. The trigger grammar is closed at"
      + " five monotone productions, so acting on the absence of evidence has no production"
      + " to be written in.",
  },
  {
    reason: "ambient-query-input",
    meaning:
      "A derived read depends on something outside its support and its query value. Such a"
      + " read is a function of those two alone, so an ambient input would make one query"
      + " at one anchor answerable two ways.",
  },
  {
    reason: "anchored-resolve",
    meaning:
      "A resolve was qualified by an anchor. A digest names one value forever, so an anchor"
      + " could only decorate that answer; head-relative reading belongs to a fold read at"
      + " an anchor instead.",
  },
  {
    reason: "clock-read",
    meaning:
      "A fold read a clock. The fold carrier has no clock parameter, so a time a fold"
      + " consumes arrives as a tick fact on an evidence lane like every other fact.",
  },
  {
    reason: "closure-introspection",
    meaning:
      "A program's identity was taken from its closure bytes. A declaration is the"
      + " identity, so computation is referenced by the digest of a declared fold and never"
      + " by the shape of a function value.",
  },
  {
    reason: "cross-sort-identifier",
    meaning:
      "Two identifiers were compared across the spaces that mint them. Tokens are"
      + " per-register and positions are per-partition, so a comparison across spaces is a"
      + " sort error wearing the shape of a number.",
  },
  {
    reason: "forward-reference",
    meaning:
      "A pin names a declaration that has not been admitted. The reference graph is a DAG"
      + " in admission order, so a referent is declared before anything points at it.",
  },
  {
    reason: "last-writer-wins",
    meaning:
      "A write was resolved by arrival order. Cells merge by join under a declared ACI"
      + " algebra, so an idempotent merge leaves arrival order nothing to decide.",
  },
  {
    reason: "minted-identifier",
    meaning:
      "A name was invented rather than derived. Every identifier is the digest of a"
      + " declaration or a derivation from one, so nothing in the language mints a name out"
      + " of nothing.",
  },
  {
    reason: "off-writ-referent",
    meaning:
      "A declaration names an identifier outside the universe its writ pins. The writ is"
      + " the boundary a declaration's references live inside, so reaching past it would"
      + " let a spawn read what its grant never admitted.",
  },
  {
    reason: "past-mutation",
    meaning:
      "A recorded fact was changed after the fact. Journals are append-only, so a"
      + " correction is a successor value pinning its predecessor and forgetting is fenced"
      + " compaction above the horizon.",
  },
  {
    reason: "secret-carrier",
    meaning:
      "A secret was carried in the wire grammar. The grammar admits no secret position, so"
      + " credentials ride the environmental band as redacted configuration, outside"
      + " meaning.",
  },
  {
    reason: "unfenced-decide",
    meaning:
      "A commit was attempted without holding a fencing token. Only a fenced token lands"
      + " an outcome, so an unfenced decide has nothing making it at most once.",
  },
  {
    reason: "unfilled-hole",
    meaning:
      "Execution was attempted on a declaration with a hole still open. Only closed"
      + " programs execute, and a hole is a declared parameter rather than a wildcard, so"
      + " it is filled before the declaration is a run.",
  },
  {
    reason: "unverified-read",
    meaning:
      "A fetched value was trusted without re-deriving its digest. A decode re-derives the"
      + " identity of what it fetched, so an unverified read makes the store, rather than"
      + " the bytes, the authority.",
  },
] as const satisfies ReadonlyArray<KernelReasonMeaning>
