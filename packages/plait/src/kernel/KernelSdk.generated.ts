/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * GENERATED FILE - DO NOT EDIT.
 *
 * Corpus:  533906015f3c360052e915052101d28f24e743a29b070adb0af23255cf2e354c
 * Format:  interchange format 2
 *
 * That digest is this module's whole provenance, and it is a digest rather
 * than a location because a plait item refers only to digests: a path names
 * wherever a reader happens to be standing, which is the ambient reference the
 * algebra refuses. It is SHA-256 over the corpus's canonical bytes.
 *
 * The kernel language as plain TypeScript: things as functions and arguments.
 *
 * Zero imports and zero dependencies. Every type here is spellable with the
 * language's own syntax, every constructor is a plain function, and every
 * closed inventory is a literal array a reader can enumerate. Nothing here is
 * an effect system, a service, or a client: the eight generators build
 * CANDIDATE values, and a candidate becomes a sentence only by being judged.
 *
 * The values this module builds are exactly the values the one admission
 * function accepts. That is the property the whole surface is arranged
 * around: a projection that could describe the language but could not hand it
 * to the door would be a description of a door rather than a way through one.
 *
 * Three layers, from the outside in.
 *
 * The **inventories and the taught refusals** are the vocabulary: what a
 * declaration kind may be, what stages a hole passes through, what the door
 * can refuse, and for every refusal the law it defends and the legal next
 * move. Each refusal row carries its reason's standing MEANING as a doc
 * comment, distinct from the law and the repair a refusal teaches when it
 * fires. The operator's taste pass ratified those sentences, so each one
 * stands as written rather than as a draft awaiting a ruling.
 *
 * The **candidate grammar** is the raw spelling: every shape a caller can
 * present, lawful and unlawful alike. The unlawful shapes are here on
 * purpose. A surface that made them unspellable would PREVENT rather than
 * teach, and the taught repair for a refused candidate is only meaningful if
 * the candidate can be written down.
 *
 * The **eight generators** are the lawful half: one plain function per
 * generator of the model, taking that generator's own fields, in that
 * generator's own order. Four of them write a field rather than accepting
 * one, and those four are the model's dependent ties - a token is fenced at
 * the register it commits to, an anchor belongs to the reduction it resumes,
 * a resolve carries no anchor, a join carries the declared algebra. The tie
 * is carried by construction, so a crossed pair has no spelling here at all;
 * the crime remains spellable as a candidate value, where the door teaches.
 *
 * Integers are `bigint` throughout, because the model's integers are
 * unbounded and an encoded sentence already exceeds what a double holds
 * exactly. Brand identities are string literals rather than unique symbols,
 * because that is how the estate's pinned release spells a type identity and
 * because a module-local symbol cannot be named from anywhere else.
 *
 * These are safety-side names and texts, never runtime guarantees. A model
 * theorem stays in the model; what crosses the seam is the vocabulary the
 * door harness then checks the runtime against, verdict for verdict.
 *
 * @module
 */

/**
 * What this surface came from, carried as data for a consumer to assert: the
 * identity of the corpus, and the interchange format it was read at. A
 * consumer that wants to know whether it holds this surface's source hashes
 * the bytes it has and compares - which is a check, where a path would have
 * been a hope.
 */
export const KERNEL_SDK_PROVENANCE = {
  corpus: "533906015f3c360052e915052101d28f24e743a29b070adb0af23255cf2e354c",
  format: 2n,
} as const

// ---------------------------------------------------------------------------
// The vocabulary: the closed inventories, and what the door teaches.
// ---------------------------------------------------------------------------

/**
 * The closed universe of declaration kinds. One brand per kind: a
 * digest is always the digest of a declaration of a known kind.
 */
export const DECL_KINDS = [
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
export type DeclKind = (typeof DECL_KINDS)[number]

/** The wire-stable rank of each declaration kind. An encoded sentence writes it. */
export const DECL_KIND_RANK = {
  schema: 0n,
  program: 1n,
  policy: 2n,
  capability: 3n,
  lane: 4n,
  algebra: 5n,
  index: 6n,
  resource: 7n,
  ontology: 8n,
  schedule: 9n,
  template: 10n,
  language: 11n,
} as const satisfies { readonly [Kind in DeclKind]: bigint }

/**
 * The epistemic stages of a hole, in rising rank order. `opened` is
 * the protocol stage named open; the language keyword forces the
 * spelling.
 */
export const HOLE_STAGES = [
  "opened",
  "filled",
  "disputed",
  "decided",
  "sealed",
] as const

/** One epistemic stage of a hole. */
export type HoleStage = (typeof HOLE_STAGES)[number]

/**
 * The rank of each hole stage. Ranks compare in the reached-at-least direction
 * only; the gap between two of them means nothing.
 */
export const HOLE_STAGE_RANK = {
  opened: 0n,
  filled: 1n,
  disputed: 2n,
  decided: 3n,
  sealed: 4n,
} as const satisfies { readonly [Stage in HoleStage]: bigint }

/** The generator vocabulary, in the model's own declaration order. */
export const GENERATORS = [
  "declare",
  "resolve",
  "emit",
  "join",
  "fold",
  "decide",
  "trigger",
  "spawn",
] as const

/** One kernel generator: one way to say something. */
export type Generator = (typeof GENERATORS)[number]

/**
 * The closed trigger grammar: exactly the monotone productions the model
 * names. Every production reads its component upward, so stability under
 * growth is a property of the grammar's shape rather than of a check.
 */
export const TRIGGER_PRODUCTIONS = [
  "evidenceAppears",
  "cellReaches",
  "holeReaches",
  "outcomeLanded",
  "headAdvancedPast",
] as const

/** One lawful trigger production. */
export type TriggerProduction = (typeof TRIGGER_PRODUCTIONS)[number]

/** The wire spelling of every refusal reason, in the model's order. */
export const REFUSAL_REASONS = [
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

/** One refusal reason the door can carry. */
export type RefusalReason = (typeof REFUSAL_REASONS)[number]

/**
 * How a taught repair may be applied. A repair is machine-applicable
 * exactly when the lawful rewrite is a function of the refused
 * candidate alone -- an agent may apply it mechanically, with no new
 * information; it is advisory when the repair needs something the
 * candidate does not carry (a token to hold, a value to declare, an
 * authority to request). The Rust diagnostic discipline, adopted by
 * the operator's ruling.
 */
export type Applicability = "machine-applicable" | "advisory"

/** One taught refusal: the law it defends and the legal next move. */
export interface Refusal {
  readonly reason: RefusalReason
  readonly law: string
  readonly repair: string
  readonly applicability: Applicability
}

/**
 * The taught-refusal table - total: a reason without its law, its repair and
 * its marking cannot exist here, because it cannot exist in the model.
 */
export const TAUGHT = [
  /**
   * A fold read a clock. The fold carrier has no clock parameter, so a time a fold consumes
   * arrives as a tick fact on an evidence lane like every other fact.
   */
  {
    reason: "clock-read",
    law: "the fold carrier has no clock parameter (f11_query_deterministic)",
    repair: "emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value",
    applicability: "advisory",
  },
  /**
   * A trigger fires on silence rather than on a fact. The trigger grammar is closed at five
   * monotone productions, so acting on the absence of evidence has no production to be written
   * in.
   */
  {
    reason: "absence-trigger",
    law: "the trigger grammar is closed at five monotone productions (f10_stability)",
    repair: "route acting-on-silence through the deadline seat: a fenced decide fed by tick facts",
    applicability: "advisory",
  },
  /**
   * A commit was attempted without holding a fencing token. Only a fenced token lands an
   * outcome, so an unfenced decide has nothing making it at most once.
   */
  {
    reason: "unfenced-decide",
    law: "only a fenced token commits (at_most_one_landed_commit)",
    repair: "hold the register's token and commit with it; grant and renew are runtime liveness, not grammar",
    applicability: "advisory",
  },
  /**
   * A write was resolved by arrival order. Cells merge by join under a declared ACI algebra, so
   * an idempotent merge leaves arrival order nothing to decide.
   */
  {
    reason: "last-writer-wins",
    law: "cells merge by join under a declared ACI algebra (f1_cell_merge_aci)",
    repair: "declare the merge algebra; idempotent join leaves nothing for arrival order to choose",
    applicability: "machine-applicable",
  },
  /**
   * A fetched value was trusted without re-deriving its digest. A decode re-derives the
   * identity of what it fetched, so an unverified read makes the store, rather than the bytes,
   * the authority.
   */
  {
    reason: "unverified-read",
    law: "a decode re-derives the digest of what it fetched (verify-on-read)",
    repair: "resolve and let the door re-derive; absence is retryable, a mismatch is structural",
    applicability: "machine-applicable",
  },
  /**
   * Two identifiers were compared across the spaces that mint them. Tokens are per-register and
   * positions are per-partition, so a comparison across spaces is a sort error wearing the
   * shape of a number.
   */
  {
    reason: "cross-sort-identifier",
    law: "tokens are per-register and positions are per-partition; sorts never compare across spaces",
    repair: "compare a token only within its register and a position only within its partition",
    applicability: "advisory",
  },
  /**
   * A name was invented rather than derived. Every identifier is the digest of a declaration or
   * a derivation from one, so nothing in the language mints a name out of nothing.
   */
  {
    reason: "minted-identifier",
    law: "every identifier is a digest of a declaration or a derivation from one",
    repair: "declare the value and use its digest; nothing mints a name",
    applicability: "advisory",
  },
  /**
   * A derived read depends on something outside its support and its query value. Such a read is
   * a function of those two alone, so an ambient input would make one query at one anchor
   * answerable two ways.
   */
  {
    reason: "ambient-query-input",
    law: "a derived read is a function of support and query alone (f11_topk_of_support)",
    repair: "read state through a fold at an anchor, and put any seed inside the declared query value",
    applicability: "advisory",
  },
  /**
   * A pin names a declaration that has not been admitted. The reference graph is a DAG in
   * admission order, so a referent is declared before anything points at it.
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
   * A read claimed that something is present nowhere. A local view is a lattice lower bound, so
   * it licenses an at-least claim and never a global negative.
   */
  {
    reason: "absence-claim",
    law: "a local view is a lattice lower bound (cell_absorb_inflationary)",
    repair: "claim at-least from a replica, never not-present-anywhere",
    applicability: "advisory",
  },
  /**
   * A recorded fact was changed after the fact. Journals are append-only, so a correction is a
   * successor value pinning its predecessor and forgetting is fenced compaction above the
   * horizon.
   */
  {
    reason: "past-mutation",
    law: "journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)",
    repair: "declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon",
    applicability: "machine-applicable",
  },
  /**
   * A declaration names an identifier outside the universe its writ pins. The writ is the
   * boundary a declaration's references live inside, so reaching past it would let a spawn read
   * what its grant never admitted.
   */
  {
    reason: "off-writ-referent",
    law: "a declaration's identifiers lie inside the universe its writ pins",
    repair: "spawn under a writ that pins the referent, or request the referent into the pinned universe",
    applicability: "advisory",
  },
  /**
   * A program's identity was taken from its closure bytes. A declaration is the identity, so
   * computation is referenced by the digest of a declared fold and never by the shape of a
   * function value.
   */
  {
    reason: "closure-introspection",
    law: "a program's identity is its declaration, never its closure bytes",
    repair: "reference computation by digest: declare the fold and pin its digest",
    applicability: "advisory",
  },
  /**
   * A resolve was qualified by an anchor. A digest names one value forever, so an anchor could
   * only decorate that answer; head-relative reading belongs to a fold read at an anchor
   * instead.
   */
  {
    reason: "anchored-resolve",
    law: "a digest names one value forever, so no anchor can change a resolve",
    repair: "drop the anchor; read head-relative state through a fold at an anchor",
    applicability: "machine-applicable",
  },
  /**
   * Execution was attempted on a declaration with a hole still open. Only closed programs
   * execute, and a hole is a declared parameter rather than a wildcard, so it is filled before
   * the declaration is a run.
   */
  {
    reason: "unfilled-hole",
    law: "only closed programs execute; a hole is a declared parameter, not a wildcard",
    repair: "fill every declared hole; disjoint fills commute, so fill order is free",
    applicability: "advisory",
  },
] as const satisfies ReadonlyArray<Refusal>

/** The taught refusal each reason carries, keyed by its wire spelling. */
export const TAUGHT_BY_REASON = {
  "clock-read": TAUGHT[0],
  "absence-trigger": TAUGHT[1],
  "unfenced-decide": TAUGHT[2],
  "last-writer-wins": TAUGHT[3],
  "unverified-read": TAUGHT[4],
  "cross-sort-identifier": TAUGHT[5],
  "minted-identifier": TAUGHT[6],
  "ambient-query-input": TAUGHT[7],
  "forward-reference": TAUGHT[8],
  "secret-carrier": TAUGHT[9],
  "absence-claim": TAUGHT[10],
  "past-mutation": TAUGHT[11],
  "off-writ-referent": TAUGHT[12],
  "closure-introspection": TAUGHT[13],
  "anchored-resolve": TAUGHT[14],
  "unfilled-hole": TAUGHT[15],
} as const satisfies { readonly [Reason in RefusalReason]: Refusal }

// ---------------------------------------------------------------------------
// The sort system: one brand per declaration kind, over the model's carrier.
// ---------------------------------------------------------------------------

/**
 * The compile-time brand carrier. The property never exists at runtime; it
 * exists so two sorts with the same representation refuse to unify. It is a
 * string-literal key rather than a unique symbol, so it can be named from
 * anywhere and spelled without importing anything.
 */
export interface Brand<Tag extends string> {
  readonly "~foldlab/plait/kernel/Brand": Tag
}

/**
 * A content address branded by the declaration kind it names. Digests
 * are modeled as identity labels; that a real digest is a hash over
 * one canonical byte form stays in the trusted base. A digest of one
 * kind never compares with a digest of another: the comparison has no
 * type, which is the referent-pinning discipline carried by the sort
 * system itself.
 *
 * Branded here by kind over the model's carrier, with a string-literal key rather than a
 * module-local symbol, so the brand can be named from anywhere and spelled without an import.
 */
export type Digest<Kind extends DeclKind, Carrier = bigint> =
  Carrier & Brand<`~foldlab/plait/kernel/Digest/${Kind}`>

/**
 * The per-kind digest aliases. The declaration kinds are the one brand domain
 * the model closes, so they enumerate; a register and a partition are open, so
 * the sorts branded by them are carried here as their carrier and the tie a
 * brand would have made is written by the constructor instead.
 */
/** A content address branded to the schema declaration kind. */
export type SchemaDigest<Carrier = bigint> = Digest<"schema", Carrier>
/** A content address branded to the program declaration kind. */
export type ProgramDigest<Carrier = bigint> = Digest<"program", Carrier>
/** A content address branded to the policy declaration kind. */
export type PolicyDigest<Carrier = bigint> = Digest<"policy", Carrier>
/** A content address branded to the capability declaration kind. */
export type CapabilityDigest<Carrier = bigint> = Digest<"capability", Carrier>
/** A content address branded to the lane declaration kind. */
export type LaneDigest<Carrier = bigint> = Digest<"lane", Carrier>
/** A content address branded to the algebra declaration kind. */
export type AlgebraDigest<Carrier = bigint> = Digest<"algebra", Carrier>
/** A content address branded to the index declaration kind. */
export type IndexDigest<Carrier = bigint> = Digest<"index", Carrier>
/** A content address branded to the resource declaration kind. */
export type ResourceDigest<Carrier = bigint> = Digest<"resource", Carrier>
/** A content address branded to the ontology declaration kind. */
export type OntologyDigest<Carrier = bigint> = Digest<"ontology", Carrier>
/** A content address branded to the schedule declaration kind. */
export type ScheduleDigest<Carrier = bigint> = Digest<"schedule", Carrier>
/** A content address branded to the template declaration kind. */
export type TemplateDigest<Carrier = bigint> = Digest<"template", Carrier>
/** A content address branded to the language declaration kind. */
export type LanguageDigest<Carrier = bigint> = Digest<"language", Carrier>

/**
 * Names a digest at its kind. It does not MINT one: every identifier is the
 * digest of a declaration or a derivation from one, and minting a name is
 * itself one of the taught refusals - the atom that spells that crime is
 * below, under the raw arguments, where the door can refuse it and teach.
 */
export const digestOf = <Kind extends DeclKind>(
  kind: Kind,
  id: bigint,
): Digest<Kind> => {
  void kind
  return id as Digest<Kind>
}

/** A lane partition: the venue-local shard of an evidence stream. */
export interface LanePartition {
  readonly lane: LaneDigest
  readonly shard: bigint
}

/**
 * An anchor fact: `(fold digest, partition) -> (floor, state, head)`.
 * A fact, not a cache -- the resume coordinate every head-relative
 * read carries. The fold digest and partition are part of the type:
 * an anchor replays nowhere but at its own fold and partition.
 *
 * The reduction and the partition are not type indices here: the constructor that takes an
 * anchor writes both from the coordinate the caller folds at, so a replay under another
 * reduction has no spelling through it.
 */
export interface AnchorFact {
  readonly floor: bigint
  readonly state: bigint
  readonly head: bigint
}

// ---------------------------------------------------------------------------
// The candidate grammar: every shape a caller can present to the door.
// ---------------------------------------------------------------------------

/**
 * A kind-tagged reference: the one lawful way a heterogeneous collection of
 * digests is carried, so the kind travels with the identifier instead of
 * being inferred from context.
 */
export interface Ref {
  readonly id: bigint
  readonly kind: DeclKind
}

/**
 * A raw argument atom. The lawful atoms are digest references and
 * literals; holes are lawful in program declarations and refused in a
 * single sentence; every other atom is an unlawful shape kept
 * spellable so the door's refusal of it is demonstrable.
 */
export type RawArg =
  | { readonly _tag: "digestRef"; readonly kind: DeclKind; readonly id: bigint }
  | { readonly _tag: "literal"; readonly value: bigint }
  | { readonly _tag: "hole"; readonly name: bigint }
  | { readonly _tag: "clockNow" }
  | { readonly _tag: "randomSeed" }
  | { readonly _tag: "secretBytes"; readonly bytes: bigint }
  | { readonly _tag: "mintedId"; readonly token: bigint }
  | { readonly _tag: "functionValue"; readonly code: bigint }

/** The digestRef arm of RawArg. */
export const digestRef = (kind: DeclKind, id: bigint): RawArg =>
  ({ _tag: "digestRef", kind, id })

/** The literal arm of RawArg. */
export const literal = (value: bigint): RawArg => ({ _tag: "literal", value })

/** The hole arm of RawArg. */
export const hole = (name: bigint): RawArg => ({ _tag: "hole", name })

/** The clockNow arm of RawArg, which carries nothing. */
export const clockNow = (): RawArg => ({ _tag: "clockNow" })

/** The randomSeed arm of RawArg, which carries nothing. */
export const randomSeed = (): RawArg => ({ _tag: "randomSeed" })

/** The secretBytes arm of RawArg. */
export const secretBytes = (bytes: bigint): RawArg => ({ _tag: "secretBytes", bytes })

/** The mintedId arm of RawArg. */
export const mintedId = (token: bigint): RawArg => ({ _tag: "mintedId", token })

/** The functionValue arm of RawArg. */
export const functionValue = (code: bigint): RawArg => ({ _tag: "functionValue", code })

/**
 * A candidate anchor: the raw spelling of a resume coordinate, its
 * fold carried as data rather than as a type index -- which is exactly
 * what lets a cross-fold anchor be spelled and refused.
 */
export interface CandidateAnchor {
  readonly foldId: bigint
  readonly lane: bigint
  readonly shard: bigint
  readonly floor: bigint
  readonly state: bigint
  readonly head: bigint
}

/**
 * A raw token claim: the register the claimant believes the token
 * belongs to, carried as data so a cross-register claim is spellable
 * and refused.
 */
export interface TokenClaim {
  readonly register: bigint
  readonly value: bigint
}

/**
 * A candidate merge strategy. Both spellings retain the intended
 * declared algebra. Last-writer-wins additionally asks arrival order
 * to override that algebra and is refused at the door. Retaining the
 * algebra makes dropping the unlawful override a candidate-only
 * repair: no catalog lookup or new choice is smuggled into it.
 */
export type MergeStrategy =
  | { readonly _tag: "declaredAlgebra"; readonly algebra: bigint }
  | { readonly _tag: "lastWriterWins"; readonly algebra: bigint }

/** The declaredAlgebra arm of MergeStrategy. */
export const declaredAlgebra = (algebra: bigint): MergeStrategy =>
  ({ _tag: "declaredAlgebra", algebra })

/** The lastWriterWins arm of MergeStrategy. */
export const lastWriterWins = (algebra: bigint): MergeStrategy =>
  ({ _tag: "lastWriterWins", algebra })

/**
 * The candidate trigger grammar: the five lawful productions plus the
 * shapes the closed grammar deliberately cannot carry -- absence,
 * negation, deadline, and the not-present-anywhere claim a local
 * replica can never ground.
 */
export type CandidatePredicate =
  | { readonly _tag: "evidenceAppears"; readonly lane: bigint; readonly pattern: bigint }
  | { readonly _tag: "cellReaches"; readonly cell: bigint; readonly threshold: bigint }
  | { readonly _tag: "holeReaches"; readonly hole: bigint; readonly stage: bigint }
  | { readonly _tag: "outcomeLanded"; readonly register: bigint }
  | {
    readonly _tag: "headAdvancedPast"
    readonly lane: bigint
    readonly shard: bigint
    readonly position: bigint
  }
  | { readonly _tag: "onAbsence"; readonly subject: bigint }
  | { readonly _tag: "negation"; readonly inner: CandidatePredicate }
  | { readonly _tag: "deadline"; readonly tick: bigint }
  | { readonly _tag: "absentEverywhere"; readonly cell: bigint }

/** The evidenceAppears arm of CandidatePredicate. */
export const evidenceAppears = (lane: bigint, pattern: bigint): CandidatePredicate =>
  ({ _tag: "evidenceAppears", lane, pattern })

/** The cellReaches arm of CandidatePredicate. */
export const cellReaches = (cell: bigint, threshold: bigint): CandidatePredicate =>
  ({ _tag: "cellReaches", cell, threshold })

/** The holeReaches arm of CandidatePredicate. */
export const holeReaches = (hole: bigint, stage: bigint): CandidatePredicate =>
  ({ _tag: "holeReaches", hole, stage })

/** The outcomeLanded arm of CandidatePredicate. */
export const outcomeLanded = (register: bigint): CandidatePredicate =>
  ({ _tag: "outcomeLanded", register })

/** The headAdvancedPast arm of CandidatePredicate. */
export const headAdvancedPast = (
  lane: bigint,
  shard: bigint,
  position: bigint,
): CandidatePredicate => ({ _tag: "headAdvancedPast", lane, shard, position })

/** The onAbsence arm of CandidatePredicate. */
export const onAbsence = (subject: bigint): CandidatePredicate =>
  ({ _tag: "onAbsence", subject })

/** The negation arm of CandidatePredicate. */
export const negation = (inner: CandidatePredicate): CandidatePredicate =>
  ({ _tag: "negation", inner })

/** The deadline arm of CandidatePredicate. */
export const deadline = (tick: bigint): CandidatePredicate => ({ _tag: "deadline", tick })

/** The absentEverywhere arm of CandidatePredicate. */
export const absentEverywhere = (cell: bigint): CandidatePredicate =>
  ({ _tag: "absentEverywhere", cell })

/**
 * The raw candidate grammar. Every generator is spellable, and so is
 * every unlawful shape: an anchored resolve, a trusted read, an
 * unfenced or cross-register decide, a last-writer-wins join, an
 * unanchored latest read, and an in-place mutation of the past.
 */
export type CandidateAct =
  | {
    readonly _tag: "declare"
    readonly kind: DeclKind
    readonly payload: ReadonlyArray<RawArg>
    readonly writ: bigint
  }
  | {
    readonly _tag: "resolveDigest"
    readonly kind: DeclKind
    readonly target: bigint
    readonly anchor: bigint | undefined
  }
  | {
    readonly _tag: "trustBytes"
    readonly kind: DeclKind
    readonly target: bigint
    readonly asserted: bigint
  }
  | { readonly _tag: "emit"; readonly lane: bigint; readonly body: ReadonlyArray<RawArg> }
  | {
    readonly _tag: "join"
    readonly cell: bigint
    readonly contribution: ReadonlyArray<RawArg>
    readonly strategy: MergeStrategy
  }
  | { readonly _tag: "readLatest"; readonly subject: bigint }
  | {
    readonly _tag: "fold"
    readonly declared: bigint
    readonly anchor: CandidateAnchor | undefined
    readonly query: ReadonlyArray<RawArg>
  }
  | {
    readonly _tag: "decide"
    readonly register: bigint
    readonly token: TokenClaim | undefined
    readonly outcome: ReadonlyArray<RawArg>
  }
  | {
    readonly _tag: "trigger"
    readonly predicate: CandidatePredicate
    readonly declaration: bigint
  }
  | { readonly _tag: "spawn"; readonly parent: bigint; readonly request: bigint }
  | {
    readonly _tag: "updateInPlace"
    readonly kind: DeclKind
    readonly target: bigint
    readonly payload: ReadonlyArray<RawArg>
    readonly writ: bigint
  }

/**
 * The admission context: the already-admitted catalog and the
 * universe of referents the acting writ pins.
 */
export interface Door {
  readonly catalog: ReadonlyArray<Ref>
  readonly pinned: ReadonlyArray<Ref>
}

/**
 * What the door answers. An admitted candidate becomes a sentence and carries
 * its canonical framing - the vector two implementations must agree on. A
 * refused one carries the whole taught row, so the reason, the law it defends
 * and the legal next move arrive together and a caller can repair.
 */
export type Verdict =
  | { readonly verdict: "admitted"; readonly encoded: ReadonlyArray<bigint> }
  | ({ readonly verdict: "refused" } & Refusal)

// ---------------------------------------------------------------------------
// The eight generators: the lawful half, one plain function each.
// ---------------------------------------------------------------------------

/**
 * Builds one `declare` candidate. Nothing is executed and nothing is published: only the door
 * judges.
 */
export const declare = <Kind extends DeclKind>(
  /**
   * `kind : DeclKind`. The closed universe of declaration kinds. One brand per kind: a
   * digest is always the digest of a declaration of a known kind.
   */
  kind: Kind,
  /**
   * `value : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   *
   * Spelled here as the raw argument list a candidate carries, because a value IS the
   * canonicalization of that list and the raw list is what the door is handed.
   */
  value: ReadonlyArray<RawArg>,
  /**
   * `writ : Digest(policy)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  writ: PolicyDigest,
): CandidateAct => ({
  _tag: "declare",
  kind,
  payload: value,
  writ,
})

/**
 * Builds one `resolve` candidate. This constructor cannot spell a resolve at an anchor: a
 * digest names one value forever, so the lawful sentence carries no anchor and this constructor
 * writes none. Nothing is executed and nothing is published: only the door judges.
 */
export const resolve = <Kind extends DeclKind>(
  /**
   * `kind : DeclKind`. The closed universe of declaration kinds. One brand per kind: a
   * digest is always the digest of a declaration of a known kind.
   */
  kind: Kind,
  /**
   * `target : Digest(kind)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  target: Digest<NoInfer<Kind>>,
): CandidateAct => ({
  _tag: "resolveDigest",
  kind,
  target,
  anchor: undefined,
})

/**
 * Builds one `emit` candidate. Nothing is executed and nothing is published: only the door
 * judges.
 */
export const emit = (
  /**
   * `lane : Digest(lane)`. A content address branded by the declaration kind it names. Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  lane: LaneDigest,
  /**
   * `body : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   *
   * Spelled here as the raw argument list a candidate carries, because a value IS the
   * canonicalization of that list and the raw list is what the door is handed.
   */
  body: ReadonlyArray<RawArg>,
): CandidateAct => ({
  _tag: "emit",
  lane,
  body,
})

/**
 * Builds one `join` candidate. It also takes `algebra`, because the candidate carries the merge
 * strategy and the lawful sentence does not, because a lawful join presupposes the declared
 * algebra. This constructor cannot spell a join that asks arrival order to override the
 * declared algebra: this constructor writes the declared-algebra strategy and takes no other.
 * Nothing is executed and nothing is published: only the door judges.
 */
export const join = (
  /**
   * `cell : Digest(resource)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  cell: ResourceDigest,
  /**
   * `contribution : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   *
   * Spelled here as the raw argument list a candidate carries, because a value IS the
   * canonicalization of that list and the raw list is what the door is handed.
   */
  contribution: ReadonlyArray<RawArg>,
  /**
   * `algebra : Digest(algebra)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  algebra: AlgebraDigest,
): CandidateAct => ({
  _tag: "join",
  cell,
  contribution,
  strategy: { _tag: "declaredAlgebra", algebra },
})

/**
 * Builds one `fold` candidate. This constructor cannot spell a fold with no anchor: every
 * head-relative read resumes at a coordinate, so the anchor is a parameter and never absent.
 * This constructor cannot spell an anchor replayed under a reduction that is not its own: the
 * reduction is written from the one the caller folds at. Nothing is executed and nothing is
 * published: only the door judges.
 */
export const fold = (
  /**
   * `declared : Digest(index)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  declared: IndexDigest,
  /**
   * `partition : LanePartition`. A lane partition: the venue-local shard of an evidence stream.
   */
  partition: LanePartition,
  /**
   * `anchor : AnchorFact(declared,partition)`. An anchor fact: `(fold digest, partition) ->
   * (floor, state, head)`.
   * A fact, not a cache -- the resume coordinate every head-relative
   * read carries. The fold digest and partition are part of the type:
   * an anchor replays nowhere but at its own fold and partition.
   *
   * The reduction and the partition are not type indices here: the constructor that takes an
   * anchor writes both from the coordinate the caller folds at, so a replay under another
   * reduction has no spelling through it.
   */
  anchor: AnchorFact,
  /**
   * `query : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   *
   * Spelled here as the raw argument list a candidate carries, because a value IS the
   * canonicalization of that list and the raw list is what the door is handed.
   */
  query: ReadonlyArray<RawArg>,
): CandidateAct => ({
  _tag: "fold",
  declared,
  anchor: {
    foldId: declared,
    lane: partition.lane,
    shard: partition.shard,
    floor: anchor.floor,
    state: anchor.state,
    head: anchor.head,
  },
  query,
})

/**
 * Builds one `decide` candidate. This constructor cannot spell a decide with no token: only a
 * fenced token commits, so the fence is a parameter and never absent. This constructor cannot
 * spell a token fenced at one register committing at another: the register is written from the
 * one the caller commits at. Nothing is executed and nothing is published: only the door
 * judges.
 */
export const decide = (
  /**
   * `register : Digest(program)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  register: ProgramDigest,
  /**
   * `token : Token(register)`. A fencing token, meaningful only within the register that issued
   * it. The register is part of the token's type: a cross-register
   * comparison fails to elaborate, so the proven-but-vacuous-bound
   * failure (two sides of a comparison denominated in different spaces)
   * has no syntax.
   *
   * The register is not a type index here: the constructor that takes a fence writes the
   * register from the one the caller commits at, so a cross-register claim has no spelling
   * through it.
   */
  token: bigint,
  /**
   * `outcome : Value`. An immutable value at its canonical byte form, modeled as an opaque
   * identity label. Canonical-byte identity (one value, one byte form)
   * is the certifier's own wall and is not restated here.
   *
   * Spelled here as the raw argument list a candidate carries, because a value IS the
   * canonicalization of that list and the raw list is what the door is handed.
   */
  outcome: ReadonlyArray<RawArg>,
): CandidateAct => ({
  _tag: "decide",
  register,
  token: { register, value: token },
  outcome,
})

/**
 * Builds one `trigger` candidate. Nothing is executed and nothing is published: only the door
 * judges.
 */
export const trigger = (
  /**
   * `predicate : KTriggerPredicate`. The closed trigger grammar at kernel sorts: exactly the
   * five
   * monotone productions. Every production reads its component upward
   * (presence, reached-at-least, landed, advanced-past), so stability
   * under growth is a property of the grammar's shape.
   *
   * The surface takes the candidate grammar instead, which is this grammar widened by the
   * shapes it cannot carry, so the door refuses and TEACHES those shapes rather than this
   * projection preventing them in silence.
   */
  predicate: CandidatePredicate,
  /**
   * `declaration : Digest(program)`. A content address branded by the declaration kind it
   * names. Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  declaration: ProgramDigest,
): CandidateAct => ({
  _tag: "trigger",
  predicate,
  declaration,
})

/**
 * Builds one `spawn` candidate. Nothing is executed and nothing is published: only the door
 * judges.
 */
export const spawn = (
  /**
   * `parent : Digest(policy)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  parent: PolicyDigest,
  /**
   * `request : Digest(policy)`. A content address branded by the declaration kind it names.
   * Digests
   * are modeled as identity labels; that a real digest is a hash over
   * one canonical byte form stays in the trusted base. A digest of one
   * kind never compares with a digest of another: the comparison has no
   * type, which is the referent-pinning discipline carried by the sort
   * system itself.
   *
   * Branded here by kind over the model's carrier, with a string-literal key rather than a
   * module-local symbol, so the brand can be named from anywhere and spelled without an import.
   */
  request: PolicyDigest,
): CandidateAct => ({
  _tag: "spawn",
  parent,
  request,
})
