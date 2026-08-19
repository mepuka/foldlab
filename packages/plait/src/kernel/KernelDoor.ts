/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The runtime's one admission seam. Candidate and intrinsic-act shapes are
 * the schemas emitted from the formal model; this module supplies only the
 * executable projection between them. Model identity labels stay `bigint` all
 * the way through the door. A runtime content digest may accompany a caller's
 * data, but it neither supplies nor changes those labels.
 *
 * Every refusal is the generated table row for its reason. There is no second
 * host vocabulary and no refusal without the law and repair it teaches.
 *
 * @module
 */
import * as Generated from "./KernelSchemas.generated.js"
// The public spellings below are the generated declarations themselves, bound
// under this door's names. Nothing here restates a shape: the alias arrives
// with the generator's own declaration, so the type-universe walk resolves
// every one of them back to `KernelSchemas.generated.d.ts`.
import type {
  KernelActValue as KernelAct,
  KernelCandidateActValue as KernelCandidateAct,
  KernelCandidatePredicateValue as KernelCandidatePredicate,
  KernelDoorValue as KernelDoorContext,
  KernelKTriggerPredicateValue as KernelTriggerPredicate,
  KernelRawArgValue as KernelRawArg,
  KernelRefValue as KernelRef,
} from "./KernelSchemas.generated.js"
import {
  KERNEL_DECL_KINDS,
  KERNEL_HOLE_STAGES,
  KERNEL_REFUSAL_BY_REASON,
  type KernelDeclKind,
  type KernelHoleStage,
  type KernelRefusalReason,
  type KernelRefusalRow,
} from "./KernelTables.generated.js"

/** The generated schema for a candidate offered to the door. */
export const Candidate = Generated.KernelCandidateAct

/** The generated schema for an admitted intrinsic sentence. */
export const Act = Generated.KernelAct

/** The generated schema for the catalog and writ-pinned admission context. */
export const DoorContext = Generated.KernelDoor

/**
 * The candidate language itself, re-exported from the module the generator
 * writes. Each name is the generated declaration under this door's public
 * spelling — the raw argument atom, the raw trigger predicate, the candidate
 * sentence, the kind-tagged model identity, the admission context, the lawful
 * intrinsic sentence, and the model's closed monotone trigger grammar.
 *
 * A re-export is the only shape that derives. `typeof Generated.X.Type` reads
 * as derivation and is not: it is a fresh declaration in this file, and the
 * type-universe walk resolves it here rather than to the generator's bytes.
 * These seven were spelled that way until DEV-804 and scored zero derived.
 */
export type {
  KernelActValue as KernelAct,
  KernelCandidateActValue as KernelCandidateAct,
  KernelCandidatePredicateValue as KernelCandidatePredicate,
  KernelDoorValue as KernelDoorContext,
  KernelKTriggerPredicateValue as KernelTriggerPredicate,
  KernelRawArgValue as KernelRawArg,
  KernelRefValue as KernelRef,
} from "./KernelSchemas.generated.js"

/**
 * The result of admission. Success carries both the intrinsic sentence and its
 * canonical model encoding; refusal carries the complete generated teaching
 * row, flattened so every host exposes identical reason/law/repair fields.
 */
export type KernelVerdict =
  | {
    readonly verdict: "admitted"
    readonly act: KernelAct
    readonly encoded: ReadonlyArray<bigint>
  }
  | ({ readonly verdict: "refused" } & KernelRefusalRow)

/** A context-bound view of the single admission function. */
export interface KernelDoor {
  readonly admit: (candidate: KernelCandidateAct) => KernelVerdict
}

/** The one host-facing judgment function. */
export type KernelAdmit = (
  context: KernelDoorContext,
  candidate: KernelCandidateAct,
) => KernelVerdict

const kindRank = (kind: KernelDeclKind): bigint => BigInt(KERNEL_DECL_KINDS.indexOf(kind))

const stageRank = (stage: KernelHoleStage): bigint => BigInt(KERNEL_HOLE_STAGES.indexOf(stage))

/** The decode half of the kind rank. */
const rankToKind = (rank: bigint): KernelDeclKind | undefined =>
  rank < 0n || rank >= BigInt(KERNEL_DECL_KINDS.length)
    ? undefined
    : KERNEL_DECL_KINDS[Number(rank)]

/** The decode half of the hole-stage rank. */
const rankToStage = (rank: bigint): KernelHoleStage | undefined =>
  rank < 0n || rank >= BigInt(KERNEL_HOLE_STAGES.length)
    ? undefined
    : KERNEL_HOLE_STAGES[Number(rank)]

/** The canonical framing of a lawful trigger predicate. */
const encodePredicate = (
  predicate: KernelTriggerPredicate,
): ReadonlyArray<bigint> => {
  switch (predicate._tag) {
    case "evidenceAppears":
      return [0n, predicate.lane.id, predicate.pattern.bytes, 0n]
    case "cellReaches":
      return [1n, predicate.cell.id, predicate.threshold.bytes, 0n]
    case "holeReaches":
      return [2n, predicate.hole, stageRank(predicate.target), 0n]
    case "outcomeLanded":
      return [3n, predicate.register.id, 0n, 0n]
    case "headAdvancedPast":
      return [
        4n,
        predicate.partition.lane.id,
        predicate.partition.shard,
        predicate.position.value,
      ]
  }
}

/** The decode half of the trigger framing. */
const decodePredicate = (
  tag: bigint,
  a: bigint,
  b: bigint,
  c: bigint,
): KernelTriggerPredicate | undefined => {
  switch (tag) {
    case 0n:
      return { _tag: "evidenceAppears", lane: { id: a }, pattern: { bytes: b } }
    case 1n:
      return { _tag: "cellReaches", cell: { id: a }, threshold: { bytes: b } }
    case 2n: {
      const target = rankToStage(b)
      return target === undefined ? undefined : { _tag: "holeReaches", hole: a, target }
    }
    case 3n:
      return { _tag: "outcomeLanded", register: { id: a } }
    case 4n:
      return {
        _tag: "headAdvancedPast",
        partition: { lane: { id: a }, shard: b },
        position: { value: c },
      }
    default:
      return undefined
  }
}

/** The canonical framing of one intrinsic sentence. */
export const encodeAct = (act: KernelAct): ReadonlyArray<bigint> => {
  switch (act._tag) {
    case "declare":
      return [0n, kindRank(act.kind), act.value.bytes, act.writ.id]
    case "resolve":
      return [1n, kindRank(act.kind), act.target.id]
    case "emit":
      return [2n, act.lane.id, act.body.bytes]
    case "join":
      return [3n, act.cell.id, act.contribution.bytes]
    case "fold":
      return [
        4n,
        act.declared.id,
        act.partition.lane.id,
        act.partition.shard,
        act.anchor.floor.value,
        act.anchor.state.value,
        act.anchor.head.value,
        act.query.bytes,
      ]
    case "decide":
      return [5n, act.register.id, act.token.value, act.outcome.bytes]
    case "trigger":
      return [6n, ...encodePredicate(act.predicate), act.declaration.id]
    case "spawn":
      return [7n, act.parent.id, act.request.id]
  }
}

/** Decodes one canonical intrinsic-sentence vector. */
export const decodeAct = (encoded: ReadonlyArray<bigint>): KernelAct | undefined => {
  const [tag] = encoded
  if (tag === 0n && encoded.length === 4) {
    const kind = rankToKind(encoded[1]!)
    return kind === undefined
      ? undefined
      : {
        _tag: "declare",
        kind,
        value: { bytes: encoded[2]! },
        writ: { id: encoded[3]! },
      }
  }
  if (tag === 1n && encoded.length === 3) {
    const kind = rankToKind(encoded[1]!)
    return kind === undefined
      ? undefined
      : { _tag: "resolve", kind, target: { id: encoded[2]! } }
  }
  if (tag === 2n && encoded.length === 3) {
    return { _tag: "emit", lane: { id: encoded[1]! }, body: { bytes: encoded[2]! } }
  }
  if (tag === 3n && encoded.length === 3) {
    return {
      _tag: "join",
      cell: { id: encoded[1]! },
      contribution: { bytes: encoded[2]! },
    }
  }
  if (tag === 4n && encoded.length === 8) {
    return {
      _tag: "fold",
      declared: { id: encoded[1]! },
      partition: { lane: { id: encoded[2]! }, shard: encoded[3]! },
      anchor: {
        floor: { value: encoded[4]! },
        state: { value: encoded[5]! },
        head: { value: encoded[6]! },
      },
      query: { bytes: encoded[7]! },
    }
  }
  if (tag === 5n && encoded.length === 4) {
    return {
      _tag: "decide",
      register: { id: encoded[1]! },
      token: { value: encoded[2]! },
      outcome: { bytes: encoded[3]! },
    }
  }
  if (tag === 6n && encoded.length === 6) {
    const predicate = decodePredicate(encoded[1]!, encoded[2]!, encoded[3]!, encoded[4]!)
    return predicate === undefined
      ? undefined
      : { _tag: "trigger", predicate, declaration: { id: encoded[5]! } }
  }
  if (tag === 7n && encoded.length === 3) {
    return { _tag: "spawn", parent: { id: encoded[1]! }, request: { id: encoded[2]! } }
  }
  return undefined
}

const atomWeight = (argument: KernelRawArg): bigint => {
  switch (argument._tag) {
    case "digestRef":
      return 1n + kindRank(argument.kind) * 4096n + argument.id
    case "literal":
      return 2n + argument.value * 16n
    case "hole":
      return 3n + argument.name * 16n
    case "clockNow":
      return 4n
    case "randomSeed":
      return 5n
    case "secretBytes":
      return 6n + argument.bytes * 16n
    case "mintedId":
      return 7n + argument.token * 16n
    case "functionValue":
      return 8n + argument.code * 16n
  }
}

/** The model canonicalizer for a candidate payload, over unbounded naturals. */
const canonicalValue = (arguments_: ReadonlyArray<KernelRawArg>): bigint => {
  let accumulator = 7n
  for (const argument of arguments_) {
    accumulator = accumulator * 1_000_003n + atomWeight(argument)
  }
  return accumulator
}

const refMember = (
  references: ReadonlyArray<KernelRef>,
  kind: KernelDeclKind,
  id: bigint,
): boolean => references.some((reference) => reference.kind === kind && reference.id === id)

const argumentRefusal = (
  context: KernelDoorContext,
  argument: KernelRawArg,
): KernelRefusalReason | undefined => {
  switch (argument._tag) {
    case "digestRef":
      return refMember(context.catalog, argument.kind, argument.id)
        ? undefined
        : "forward-reference"
    case "literal":
      return undefined
    case "hole":
      return "unfilled-hole"
    case "clockNow":
      return "clock-read"
    case "randomSeed":
      return "ambient-query-input"
    case "secretBytes":
      return "secret-carrier"
    case "mintedId":
      return "minted-identifier"
    case "functionValue":
      return "closure-introspection"
  }
}

const sweepArguments = (
  context: KernelDoorContext,
  arguments_: ReadonlyArray<KernelRawArg>,
): KernelRefusalReason | undefined => {
  for (const argument of arguments_) {
    const reason = argumentRefusal(context, argument)
    if (reason !== undefined) return reason
  }
  return undefined
}

const insideUniverse = (
  context: KernelDoorContext,
  arguments_: ReadonlyArray<KernelRawArg>,
): boolean =>
  arguments_.every((argument) =>
    argument._tag !== "digestRef" || refMember(context.pinned, argument.kind, argument.id)
  )

const predicateRefusal = (
  predicate: KernelCandidatePredicate,
): KernelRefusalReason | undefined => {
  switch (predicate._tag) {
    case "onAbsence":
    case "negation":
    case "deadline":
      return "absence-trigger"
    case "absentEverywhere":
      return "absence-claim"
    case "holeReaches":
      return rankToStage(predicate.stage) === undefined ? "absence-trigger" : undefined
    default:
      return undefined
  }
}

const translatePredicate = (
  predicate: KernelCandidatePredicate,
): KernelTriggerPredicate | undefined => {
  switch (predicate._tag) {
    case "evidenceAppears":
      return {
        _tag: "evidenceAppears",
        lane: { id: predicate.lane },
        pattern: { bytes: predicate.pattern },
      }
    case "cellReaches":
      return {
        _tag: "cellReaches",
        cell: { id: predicate.cell },
        threshold: { bytes: predicate.threshold },
      }
    case "holeReaches": {
      const target = rankToStage(predicate.stage)
      return target === undefined
        ? undefined
        : { _tag: "holeReaches", hole: predicate.hole, target }
    }
    case "outcomeLanded":
      return { _tag: "outcomeLanded", register: { id: predicate.register } }
    case "headAdvancedPast":
      return {
        _tag: "headAdvancedPast",
        partition: { lane: { id: predicate.lane }, shard: predicate.shard },
        position: { value: predicate.position },
      }
    default:
      return undefined
  }
}

const refused = (reason: KernelRefusalReason): KernelVerdict => ({
  verdict: "refused",
  ...KERNEL_REFUSAL_BY_REASON[reason],
})

const admitted = (act: KernelAct): KernelVerdict => ({
  verdict: "admitted",
  act,
  encoded: encodeAct(act),
})

/**
 * Judges one generated candidate against one generated door context.
 *
 * Check order is stable: candidate shape, referent sweep, then writ universe.
 * That order is part of deterministic refusal parity with the emitted vectors.
 */
export const admit: KernelAdmit = (context, candidate) => {
  switch (candidate._tag) {
    case "declare": {
      const swept = sweepArguments(context, candidate.payload)
      if (swept !== undefined) return refused(swept)
      if (!insideUniverse(context, candidate.payload)) return refused("off-writ-referent")
      if (!refMember(context.catalog, "policy", candidate.writ)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "declare",
        kind: candidate.kind,
        value: { bytes: canonicalValue(candidate.payload) },
        writ: { id: candidate.writ },
      })
    }
    case "resolveDigest": {
      if (candidate.anchor !== undefined) return refused("anchored-resolve")
      if (!refMember(context.catalog, candidate.kind, candidate.target)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "resolve",
        kind: candidate.kind,
        target: { id: candidate.target },
      })
    }
    case "trustBytes":
      return refused("unverified-read")
    case "emit": {
      const swept = sweepArguments(context, candidate.body)
      if (swept !== undefined) return refused(swept)
      if (!refMember(context.catalog, "lane", candidate.lane)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "emit",
        lane: { id: candidate.lane },
        body: { bytes: canonicalValue(candidate.body) },
      })
    }
    case "join": {
      if (candidate.strategy._tag === "lastWriterWins") {
        return refused("last-writer-wins")
      }
      const swept = sweepArguments(context, candidate.contribution)
      if (swept !== undefined) return refused(swept)
      if (!refMember(context.catalog, "resource", candidate.cell)) {
        return refused("forward-reference")
      }
      if (!refMember(context.catalog, "algebra", candidate.strategy.algebra)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "join",
        cell: { id: candidate.cell },
        contribution: { bytes: canonicalValue(candidate.contribution) },
      })
    }
    case "readLatest":
      return refused("ambient-query-input")
    case "fold": {
      const anchor = candidate.anchor
      if (anchor === undefined) return refused("ambient-query-input")
      if (anchor.foldId !== candidate.declared) return refused("cross-sort-identifier")
      const swept = sweepArguments(context, candidate.query)
      if (swept !== undefined) return refused(swept)
      if (!refMember(context.catalog, "index", candidate.declared)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "fold",
        declared: { id: candidate.declared },
        partition: { lane: { id: anchor.lane }, shard: anchor.shard },
        anchor: {
          floor: { value: anchor.floor },
          state: { value: anchor.state },
          head: { value: anchor.head },
        },
        query: { bytes: canonicalValue(candidate.query) },
      })
    }
    case "decide": {
      const claim = candidate.token
      if (claim === undefined) return refused("unfenced-decide")
      if (claim.register !== candidate.register) return refused("cross-sort-identifier")
      const swept = sweepArguments(context, candidate.outcome)
      if (swept !== undefined) return refused(swept)
      if (!refMember(context.catalog, "program", candidate.register)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "decide",
        register: { id: candidate.register },
        token: { value: claim.value },
        outcome: { bytes: canonicalValue(candidate.outcome) },
      })
    }
    case "trigger": {
      const reason = predicateRefusal(candidate.predicate)
      if (reason !== undefined) return refused(reason)
      const predicate = translatePredicate(candidate.predicate)
      if (predicate === undefined) return refused("absence-trigger")
      if (!refMember(context.catalog, "program", candidate.declaration)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "trigger",
        predicate,
        declaration: { id: candidate.declaration },
      })
    }
    case "spawn": {
      if (!refMember(context.catalog, "policy", candidate.parent)) {
        return refused("forward-reference")
      }
      if (!refMember(context.catalog, "policy", candidate.request)) {
        return refused("forward-reference")
      }
      return admitted({
        _tag: "spawn",
        parent: { id: candidate.parent },
        request: { id: candidate.request },
      })
    }
    case "updateInPlace":
      return refused("past-mutation")
  }
}

/** Binds the one admission function to a catalog/pinned-universe context. */
export const make = (context: KernelDoorContext): KernelDoor => ({
  admit: (candidate) => admit(context, candidate),
})
