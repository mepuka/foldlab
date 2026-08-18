/*
 * The kernel language, projected into plain TypeScript.
 *
 * EXPLORATORY, hand-derived from the Lean model in verify/kernel at
 * this commit. The design mandates that projections be GENERATED from
 * the one grammar and walled served-equals-derived; this file is the
 * reference sketch that generation owes, not the generator's output.
 * A divergence between this file and the model is a defect in this
 * file.
 *
 * Fidelity contract: every closed inventory of the model appears here
 * with the same cardinality and the same wire names — 8 generators,
 * 12 declaration kinds, 5 trigger productions, 5 hole stages, 16
 * refusal reasons with law, repair, and applicability. Field names
 * follow the ratified wire convention (compound self-descriptive
 * names: a field is named for the value it carries, never bare
 * `schema`). The unlawful candidate spellings are deliberately
 * unprojected: an SDK that cannot spell the crime is the point — the
 * refusal vocabulary appears only on the result side.
 *
 * Zero imports, zero dependencies. Type-checks standalone under
 * strict mode. The `@ts-expect-error` lines are the must-not-compile
 * controls: this file compiles only if those lines FAIL to.
 */

/* ── Sorts ──────────────────────────────────────────────────────── */

export type DeclKind =
  | 'schema'
  | 'program'
  | 'policy'
  | 'capability'
  | 'lane'
  | 'algebra'
  | 'index' // the declared-reduction kind; rename to 'reduction' is KM-11
  | 'resource'
  | 'ontology'
  | 'schedule'
  | 'template'
  | 'language'

declare const KIND: unique symbol
declare const SPACE: unique symbol

/** A branded content address: one brand per declaration kind. */
export type Digest<K extends DeclKind> = string & { readonly [KIND]: K }

/** Mint a digest literal. The literal type rides along, so two
 *  distinct digests are two distinct types — the unit-space
 *  discipline carried by inference. */
export function digest<K extends DeclKind, const S extends string>(
  kind: K,
  bytes: S,
): Digest<K> & S {
  void kind
  return bytes as Digest<K> & S
}

/** A canonical value: bytes with one canonical form. Opaque here. */
export type Value = string & { readonly [SPACE]?: 'value' }
export function value(bytes: string | number): Value {
  return String(bytes) as Value
}

/** A journal partition: one lane, one shard. Order exists only
 *  inside a partition. */
export interface LanePartition<L extends Digest<'lane'> = Digest<'lane'>> {
  readonly lane_digest: L
  readonly shard: number
}

/** A fencing token, meaningful only at its register. The register
 *  digest's type is part of the token's type: the fence rides the
 *  type, and a cross-register token has no spelling. */
export interface Token<R extends Digest<'program'>> {
  readonly register_digest: R
  readonly fence: number
}
export function token<R extends Digest<'program'>>(
  register_digest: R,
  fence: number,
): Token<R> {
  return { register_digest, fence }
}

/** A checkpoint fact: (floor, state, head) — typed by its own
 *  reduction AND its own partition. Replaying an anchor against a
 *  different reduction has no spelling. */
export interface AnchorFact<
  F extends Digest<'index'>,
  P extends LanePartition,
> {
  readonly reduction_digest: F
  readonly partition: P
  readonly floor: number
  readonly state_label: string
  readonly head: number
}

/* ── The five trigger productions (closed) ──────────────────────── */

export type HoleStage = 'opened' | 'filled' | 'disputed' | 'decided' | 'sealed'

export type TriggerPredicate =
  | { readonly production: 'evidence-appears'; readonly lane_digest: Digest<'lane'>; readonly pattern: Value }
  | { readonly production: 'cell-reaches'; readonly cell_digest: Digest<'resource'>; readonly threshold: Value }
  | { readonly production: 'hole-reaches'; readonly hole: number; readonly stage: HoleStage }
  | { readonly production: 'outcome-landed'; readonly register_digest: Digest<'program'> }
  | { readonly production: 'head-advanced-past'; readonly partition: LanePartition; readonly position: number }
// absence, negation, and deadline have no member: closure is the
// enforcement, here as in the model.

/* ── The eight generators: the sentence union ───────────────────── */

type ResolveSentence = {
  [K in DeclKind]: {
    readonly act: 'resolve'
    readonly kind: K
    readonly digest: Digest<K> // kind and brand tied per union arm
  }
}[DeclKind]

export type Act =
  | { readonly act: 'declare'; readonly kind: DeclKind; readonly value: Value; readonly writ_digest: Digest<'policy'> }
  | ResolveSentence
  | { readonly act: 'emit'; readonly lane_digest: Digest<'lane'>; readonly body: Value }
  | { readonly act: 'join'; readonly cell_digest: Digest<'resource'>; readonly contribution: Value }
  | {
      readonly act: 'fold'
      readonly reduction_digest: Digest<'index'>
      readonly partition: LanePartition
      readonly anchor: AnchorFact<Digest<'index'>, LanePartition>
      readonly query: Value
    }
  | {
      readonly act: 'decide'
      readonly register_digest: Digest<'program'>
      readonly token: Token<Digest<'program'>>
      readonly outcome: Value
    }
  | { readonly act: 'trigger'; readonly predicate: TriggerPredicate; readonly declaration_digest: Digest<'program'> }
  | { readonly act: 'spawn'; readonly parent_writ_digest: Digest<'policy'>; readonly request_writ_digest: Digest<'policy'> }

/* Constructors carry the dependent ties the erased union cannot:
 * the token must be fenced at THIS register, the anchor must belong
 * to THIS reduction and THIS partition. The pairing is checked where
 * the sentence is made — the model's dependent-constructor shape. */

export function resolve<K extends DeclKind>(
  kind: K,
  ref: Digest<NoInfer<K>>,
): Act {
  return { act: 'resolve', kind, digest: ref } as Act
}

export function decide<R extends Digest<'program'>>(
  register_digest: R,
  fenced: Token<NoInfer<R>>,
  outcome: Value,
): Act {
  return { act: 'decide', register_digest, token: fenced, outcome }
}

export function fold<F extends Digest<'index'>, P extends LanePartition>(
  reduction_digest: F,
  partition: P,
  anchor: AnchorFact<NoInfer<F>, NoInfer<P>>,
  query: Value,
): Act {
  return { act: 'fold', reduction_digest, partition, anchor, query }
}

/* ── Refusals: the result-side vocabulary ───────────────────────── */

export type RefusalReason =
  | 'clock-read'
  | 'absence-trigger'
  | 'unfenced-decide'
  | 'last-writer-wins'
  | 'unverified-read'
  | 'cross-sort-identifier'
  | 'minted-identifier'
  | 'ambient-query-input'
  | 'forward-reference'
  | 'secret-carrier'
  | 'absence-claim'
  | 'past-mutation'
  | 'off-writ-referent'
  | 'closure-introspection'
  | 'anchored-resolve'
  | 'unfilled-hole'

/** Machine-applicable: the lawful rewrite is a function of the
 *  refused candidate alone. Advisory: the repair needs information
 *  the candidate does not carry. */
export type Applicability = 'machine-applicable' | 'advisory'

export interface Refusal {
  readonly reason: RefusalReason
  readonly law: string
  readonly repair: string
  readonly applicability: Applicability
}

/** The taught-refusal table — total: a reason without its law,
 *  repair, and marking cannot exist. Strings mirror the model. */
export const TAUGHT: Record<RefusalReason, Refusal> = {
  'clock-read': {
    reason: 'clock-read',
    law: 'the fold carrier has no clock parameter (f11_query_deterministic)',
    repair: 'emit the claimed time as a tick fact on an evidence lane; schedule through a declared schedule value',
    applicability: 'advisory',
  },
  'absence-trigger': {
    reason: 'absence-trigger',
    law: 'the trigger grammar is closed at five monotone productions (f10_stability)',
    repair: 'route acting-on-silence through the deadline seat: a fenced decide fed by tick facts',
    applicability: 'advisory',
  },
  'unfenced-decide': {
    reason: 'unfenced-decide',
    law: 'only a fenced token commits (at_most_one_landed_commit)',
    repair: 'hold the register token and commit with it; grant and renew are runtime liveness, not grammar',
    applicability: 'advisory',
  },
  'last-writer-wins': {
    reason: 'last-writer-wins',
    law: 'cells merge by join under a declared ACI algebra (f1_cell_merge_aci)',
    repair: 'declare the merge algebra; idempotent join leaves nothing for arrival order to choose',
    applicability: 'machine-applicable',
  },
  'unverified-read': {
    reason: 'unverified-read',
    law: 'a decode re-derives the digest of what it fetched (verify-on-read)',
    repair: 'resolve and let the door re-derive; absence is retryable, a mismatch is structural',
    applicability: 'machine-applicable',
  },
  'cross-sort-identifier': {
    reason: 'cross-sort-identifier',
    law: 'tokens are per-register and positions are per-partition; sorts never compare across spaces',
    repair: 'compare a token only within its register and a position only within its partition',
    applicability: 'advisory',
  },
  'minted-identifier': {
    reason: 'minted-identifier',
    law: 'every identifier is a digest of a declaration or a derivation from one',
    repair: 'declare the value and use its digest; nothing mints a name',
    applicability: 'advisory',
  },
  'ambient-query-input': {
    reason: 'ambient-query-input',
    law: 'a derived read is a function of support and query alone (f11_topk_of_support)',
    repair: 'read state through a fold at an anchor, and put any seed inside the declared query value',
    applicability: 'advisory',
  },
  'forward-reference': {
    reason: 'forward-reference',
    law: 'pins name already-admitted digests (c7_pin_well_founded)',
    repair: 'declare the referent first; the reference graph is a DAG by admission order',
    applicability: 'advisory',
  },
  'secret-carrier': {
    reason: 'secret-carrier',
    law: 'the wire grammar admits no secret position',
    repair: 'carry credentials in the environmental band as redacted configuration, outside meaning',
    applicability: 'advisory',
  },
  'absence-claim': {
    reason: 'absence-claim',
    law: 'a local view is a lattice lower bound (cell_absorb_inflationary)',
    repair: 'claim at-least from a replica, never not-present-anywhere',
    applicability: 'advisory',
  },
  'past-mutation': {
    reason: 'past-mutation',
    law: 'journals are append-only; anchored resumption survives compaction (compact_below_floor_preserves_resumption)',
    repair: 'declare a successor value pinning its predecessor; forgetting is fenced compaction above the horizon',
    applicability: 'machine-applicable',
  },
  'off-writ-referent': {
    reason: 'off-writ-referent',
    law: 'a declaration identifiers lie inside the universe its writ pins',
    repair: 'spawn under a writ that pins the referent, or request the referent into the pinned universe',
    applicability: 'advisory',
  },
  'closure-introspection': {
    reason: 'closure-introspection',
    law: 'a program identity is its declaration, never its closure bytes',
    repair: 'reference computation by digest: declare the fold and pin its digest',
    applicability: 'advisory',
  },
  'anchored-resolve': {
    reason: 'anchored-resolve',
    law: 'a digest names one value forever, so no anchor can change a resolve',
    repair: 'drop the anchor; read head-relative state through a fold at an anchor',
    applicability: 'machine-applicable',
  },
  'unfilled-hole': {
    reason: 'unfilled-hole',
    law: 'only closed programs execute; a hole is a declared parameter, not a wildcard',
    repair: 'fill every declared hole; disjoint fills commute, so fill order is free',
    applicability: 'advisory',
  },
}

export type AdmitResult =
  | { readonly admitted: Act }
  | { readonly refused: Refusal }

/* ── Programs: sentences composed into a DAG ────────────────────── */

export type GenTag = Act['act']

export type ProgramArg =
  | { readonly ref: 'digest'; readonly kind: DeclKind; readonly digest: string }
  | { readonly ref: 'literal'; readonly literal: Value }
  | { readonly ref: 'hole'; readonly hole: number }

export interface ProgramNode {
  readonly name: number
  readonly generator: GenTag
  readonly args: readonly ProgramArg[]
  readonly uses: readonly number[] // must name earlier nodes: the DAG
}

export interface ProgramDecl {
  readonly nodes: readonly ProgramNode[] // newest first, admission order
  readonly holes: readonly { readonly hole: number; readonly schema_digest: Digest<'schema'> }[]
  readonly lineage: readonly Digest<'program'>[]
}

/* ── The language, spoken: the walkthrough examples in plain TS ─── */

export const corpusSchema = digest('schema', 'sha256:08')
export const opsLane = digest('lane', 'sha256:01')
export const progressCell = digest('resource', 'sha256:06')
export const searchIndex = digest('index', 'sha256:02')
export const distillWork = digest('program', 'sha256:03')
export const rootWrit = digest('policy', 'sha256:04')
export const narrowRequest = digest('policy', 'sha256:05')

export const shardZero = { lane_digest: opsLane, shard: 0 } as const

export const anchorAtFour: AnchorFact<typeof searchIndex, typeof shardZero> = {
  reduction_digest: searchIndex,
  partition: shardZero,
  floor: 4,
  state_label: 'state:11',
  head: 6,
}

export const tokenAtDistill = token(distillWork, 9)

export const s1: Act = { act: 'declare', kind: 'schema', value: value(90210), writ_digest: rootWrit }
export const s2: Act = resolve('schema', corpusSchema)
export const s3: Act = { act: 'emit', lane_digest: opsLane, body: value(1234) }
export const s4: Act = { act: 'join', cell_digest: progressCell, contribution: value(77) }
export const s5: Act = fold(searchIndex, shardZero, anchorAtFour, value(555))
export const s6: Act = decide(distillWork, tokenAtDistill, value(42))
export const s7: Act = {
  act: 'trigger',
  predicate: { production: 'outcome-landed', register_digest: distillWork },
  declaration_digest: distillWork,
}
export const s8: Act = { act: 'spawn', parent_writ_digest: rootWrit, request_writ_digest: narrowRequest }

/* A second reduction — a task-roster view, not search: same sentence
 * form, different declared content, constant query. */
export const sessionLane = digest('lane', 'sha256:10')
export const rosterFold = digest('index', 'sha256:20')
export const sessionShard = { lane_digest: sessionLane, shard: 2 } as const
export const rosterAnchor: AnchorFact<typeof rosterFold, typeof sessionShard> = {
  reduction_digest: rosterFold,
  partition: sessionShard,
  floor: 12,
  state_label: 'state:31',
  head: 15,
}
export const rosterRead: Act = fold(rosterFold, sessionShard, rosterAnchor, value(0))

/* The three-node program DAG: resolve a source, decide a
 * distillation over it (one hole), join the outcome certificate. */
export const distillProgram: ProgramDecl = {
  nodes: [
    { name: 2, generator: 'join', args: [{ ref: 'digest', kind: 'resource', digest: 'sha256:06' }], uses: [1, 0] },
    { name: 1, generator: 'decide', args: [{ ref: 'hole', hole: 0 }], uses: [0] },
    { name: 0, generator: 'resolve', args: [{ ref: 'digest', kind: 'schema', digest: 'sha256:08' }], uses: [] },
  ],
  holes: [{ hole: 0, schema_digest: corpusSchema }],
  lineage: [],
}

/* ── Must-not-compile: the negative controls, native to TS ──────── */
/* This file type-checks ONLY IF each line below fails to. */

export const otherWork = digest('program', 'sha256:99')

// @ts-expect-error — a token fenced at one register cannot commit at another
export const crossRegister: Act = decide(otherWork, tokenAtDistill, value(1))

// @ts-expect-error — an anchor is typed by its own reduction and partition
export const crossFold: Act = fold(searchIndex, shardZero, rosterAnchor, value(0))

// @ts-expect-error — digests never compare or assign across kinds
export const crossKind: Digest<'program'> = corpusSchema

// @ts-expect-error — resolve binds the digest brand to the named kind
export const wrongKind: Act = resolve('program', corpusSchema)
