/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The shipping admission door. Its input, context, and intrinsic output are
 * the model-generated algebraic constructs from `KernelSchemas.generated.ts`,
 * with bigint identities preserved end to end. The conformance harness replays
 * the model's own emitted admission vectors against this implementation.
 *
 * The check order inside a candidate is fixed — signature shape, then
 * reference sweep, then universe — so the verdict is deterministic.
 *
 * @module
 */
import type {
  KernelAct,
  KernelCandidateAct,
  KernelCandidatePredicate,
  KernelDoor,
  KernelDoorContext,
  KernelRawArg,
  KernelTriggerPredicate,
  KernelVerdict,
} from "./KernelDoor.js"
import {
  KERNEL_DECL_KINDS,
  KERNEL_HOLE_STAGES,
  type KernelDeclKind,
  type KernelHoleStage,
  type KernelRefusalReason,
} from "./KernelTables.generated.js"

export type { KernelAct, KernelTriggerPredicate } from "./KernelDoor.js"

const kindRank = (kind: KernelDeclKind): bigint =>
  BigInt(KERNEL_DECL_KINDS.indexOf(kind))

const stageRank = (stage: KernelHoleStage): bigint =>
  BigInt(KERNEL_HOLE_STAGES.indexOf(stage))

/** The decode half of the generated declaration-kind order. */
export const rankToKind = (rank: bigint): KernelDeclKind | null =>
  KERNEL_DECL_KINDS.find((_, index) => BigInt(index) === rank) ?? null

/** The decode half of the generated hole-stage order. */
export const rankToStage = (rank: bigint): KernelHoleStage | null =>
  KERNEL_HOLE_STAGES.find((_, index) => BigInt(index) === rank) ?? null

/** The model's canonical framing of an intrinsic trigger predicate. */
export const encodePred = (
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

/** The decode half of the intrinsic predicate framing. */
export const decodePred = (
  tag: bigint,
  a: bigint,
  b: bigint,
  c: bigint,
): KernelTriggerPredicate | null => {
  switch (tag) {
    case 0n:
      return { _tag: "evidenceAppears", lane: { id: a }, pattern: { bytes: b } }
    case 1n:
      return { _tag: "cellReaches", cell: { id: a }, threshold: { bytes: b } }
    case 2n: {
      const target = rankToStage(b)
      return target === null ? null : { _tag: "holeReaches", hole: a, target }
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
      return null
  }
}

/** The model's canonical framing of an intrinsic kernel sentence. */
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
      return [6n, ...encodePred(act.predicate), act.declaration.id]
    case "spawn":
      return [7n, act.parent.id, act.request.id]
  }
}

/** Every well-framed model encoding decodes to the generated intrinsic type. */
export const decodeAct = (encoded: ReadonlyArray<bigint>): KernelAct | null => {
  const [tag] = encoded
  if (tag === 0n && encoded.length === 4) {
    const kind = rankToKind(encoded[1]!)
    return kind === null
      ? null
      : {
        _tag: "declare",
        kind,
        value: { bytes: encoded[2]! },
        writ: { id: encoded[3]! },
      }
  }
  if (tag === 1n && encoded.length === 3) {
    const kind = rankToKind(encoded[1]!)
    return kind === null
      ? null
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
    const partition = {
      lane: { id: encoded[2]! },
      shard: encoded[3]!,
    }
    return {
      _tag: "fold",
      declared: { id: encoded[1]! },
      partition,
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
    const predicate = decodePred(encoded[1]!, encoded[2]!, encoded[3]!, encoded[4]!)
    return predicate === null
      ? null
      : { _tag: "trigger", predicate, declaration: { id: encoded[5]! } }
  }
  if (tag === 7n && encoded.length === 3) {
    return {
      _tag: "spawn",
      parent: { id: encoded[1]! },
      request: { id: encoded[2]! },
    }
  }
  return null
}

const atomWeight = (arg: KernelRawArg): bigint => {
  switch (arg._tag) {
    case "digestRef":
      return 1n + kindRank(arg.kind) * 4096n + arg.id
    case "literal":
      return 2n + arg.value * 16n
    case "hole":
      return 3n + arg.name * 16n
    case "clockNow":
      return 4n
    case "randomSeed":
      return 5n
    case "secretBytes":
      return 6n + arg.bytes * 16n
    case "mintedId":
      return 7n + arg.token * 16n
    case "functionValue":
      return 8n + arg.code * 16n
  }
}

/** The model canonicalizer over its native unbounded integer carrier. */
export const canonicalBytes = (args: ReadonlyArray<KernelRawArg>): bigint => {
  let accumulator = 7n
  for (const arg of args) accumulator = accumulator * 1000003n + atomWeight(arg)
  return accumulator
}

const refMember = (
  refs: KernelDoorContext["catalog"],
  kind: KernelDeclKind,
  id: bigint,
): boolean => refs.some((ref) => ref.kind === kind && ref.id === id)

const argRefusal = (
  context: KernelDoorContext,
  arg: KernelRawArg,
): KernelRefusalReason | null => {
  switch (arg._tag) {
    case "digestRef":
      return refMember(context.catalog, arg.kind, arg.id) ? null : "forward-reference"
    case "literal":
      return null
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

const argSweep = (
  context: KernelDoorContext,
  args: ReadonlyArray<KernelRawArg>,
): KernelRefusalReason | null => {
  for (const arg of args) {
    const reason = argRefusal(context, arg)
    if (reason !== null) return reason
  }
  return null
}

const insideUniverse = (
  context: KernelDoorContext,
  args: ReadonlyArray<KernelRawArg>,
): boolean =>
  args.every((arg) =>
    arg._tag !== "digestRef" || refMember(context.pinned, arg.kind, arg.id)
  )

const predicateRefusal = (
  predicate: KernelCandidatePredicate,
): KernelRefusalReason | null => {
  switch (predicate._tag) {
    case "onAbsence":
    case "negation":
    case "deadline":
      return "absence-trigger"
    case "absentEverywhere":
      return "absence-claim"
    case "holeReaches":
      return rankToStage(predicate.stage) === null ? "absence-trigger" : null
    default:
      return null
  }
}

const translatePredicate = (
  predicate: KernelCandidatePredicate,
): KernelTriggerPredicate | null => {
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
      return target === null ? null : { _tag: "holeReaches", hole: predicate.hole, target }
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
      return null
  }
}

const refused = (reason: KernelRefusalReason): KernelVerdict => ({
  verdict: "refused",
  reason,
})

const admitted = (act: KernelAct): KernelVerdict => ({
  verdict: "admitted",
  encoded: encodeAct(act),
})

/** Builds the one shipping door over a generated admission context. */
export const makeKernelDoor = (context: KernelDoorContext): KernelDoor => ({
  admit: (candidate: KernelCandidateAct): KernelVerdict => {
    switch (candidate._tag) {
      case "declare": {
        const swept = argSweep(context, candidate.payload)
        if (swept !== null) return refused(swept)
        if (!insideUniverse(context, candidate.payload)) return refused("off-writ-referent")
        if (!refMember(context.catalog, "policy", candidate.writ)) {
          return refused("forward-reference")
        }
        return admitted({
          _tag: "declare",
          kind: candidate.kind,
          value: { bytes: canonicalBytes(candidate.payload) },
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
        const swept = argSweep(context, candidate.body)
        if (swept !== null) return refused(swept)
        if (!refMember(context.catalog, "lane", candidate.lane)) {
          return refused("forward-reference")
        }
        return admitted({
          _tag: "emit",
          lane: { id: candidate.lane },
          body: { bytes: canonicalBytes(candidate.body) },
        })
      }
      case "join": {
        if (candidate.strategy._tag === "lastWriterWins") {
          return refused("last-writer-wins")
        }
        const swept = argSweep(context, candidate.contribution)
        if (swept !== null) return refused(swept)
        if (!refMember(context.catalog, "resource", candidate.cell)) {
          return refused("forward-reference")
        }
        if (!refMember(context.catalog, "algebra", candidate.strategy.algebra)) {
          return refused("forward-reference")
        }
        return admitted({
          _tag: "join",
          cell: { id: candidate.cell },
          contribution: { bytes: canonicalBytes(candidate.contribution) },
        })
      }
      case "readLatest":
        return refused("ambient-query-input")
      case "fold": {
        const anchor = candidate.anchor
        if (anchor === undefined) return refused("ambient-query-input")
        if (anchor.foldId !== candidate.declared) return refused("cross-sort-identifier")
        const swept = argSweep(context, candidate.query)
        if (swept !== null) return refused(swept)
        if (!refMember(context.catalog, "index", candidate.declared)) {
          return refused("forward-reference")
        }
        const partition = {
          lane: { id: anchor.lane },
          shard: anchor.shard,
        }
        return admitted({
          _tag: "fold",
          declared: { id: candidate.declared },
          partition,
          anchor: {
            floor: { value: anchor.floor },
            state: { value: anchor.state },
            head: { value: anchor.head },
          },
          query: { bytes: canonicalBytes(candidate.query) },
        })
      }
      case "decide": {
        const claim = candidate.token
        if (claim === undefined) return refused("unfenced-decide")
        if (claim.register !== candidate.register) return refused("cross-sort-identifier")
        const swept = argSweep(context, candidate.outcome)
        if (swept !== null) return refused(swept)
        if (!refMember(context.catalog, "program", candidate.register)) {
          return refused("forward-reference")
        }
        return admitted({
          _tag: "decide",
          register: { id: candidate.register },
          token: { value: claim.value },
          outcome: { bytes: canonicalBytes(candidate.outcome) },
        })
      }
      case "trigger": {
        const reason = predicateRefusal(candidate.predicate)
        if (reason !== null) return refused(reason)
        const predicate = translatePredicate(candidate.predicate)
        if (predicate === null) return refused("absence-trigger")
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
  },
})
