/**
 * A REFERENCE-ONLY admission door, and the planted candidates it is replayed
 * against.
 *
 * Nothing in this file ships. No admission door exists in `packages/` yet, so
 * the conformance harness needs a target, and a harness whose only target is
 * the implementation it is testing proves nothing. This door is a
 * transliteration of the kernel model's `Kernel.admit`
 * (`verify/kernel/Kernel/Definitions.lean`), written so the harness can be
 * exercised end to end today and re-pointed at a real door the day one lands:
 * the harness takes its target as a parameter.
 *
 * The planted candidates are the model's own committed corpus, one per closure
 * row plus the lawful twin, transcribed from `Kernel.Planted` and keyed by the
 * def names the emitted admission records carry. The emitted records name a
 * candidate but do not carry its structure, so this table is the join the
 * harness needs; keeping it beside the reference door, not inside `src`, keeps
 * that dependency visible.
 */
import type {
  KernelCandidateAct,
  KernelCandidatePredicate,
  KernelDoor,
  KernelDoorContext,
  KernelRawArg,
  KernelVerdict,
} from "../src/kernel/KernelDoor.js"
import {
  KERNEL_DECL_KINDS,
  KERNEL_HOLE_STAGES,
  type KernelDeclKind,
  type KernelHoleStage,
  type KernelRefusalReason,
} from "../src/kernel/KernelTables.generated.js"

/** The closed trigger grammar: exactly the five monotone productions. */
export type KernelTriggerPredicate =
  | { readonly _tag: "evidenceAppears"; readonly lane: number; readonly pattern: number }
  | { readonly _tag: "cellReaches"; readonly cell: number; readonly threshold: number }
  | { readonly _tag: "holeReaches"; readonly hole: number; readonly target: KernelHoleStage }
  | { readonly _tag: "outcomeLanded"; readonly register: number }
  | {
    readonly _tag: "headAdvancedPast"
    readonly lane: number
    readonly shard: number
    readonly position: number
  }

/** One lawful kernel sentence: the eight generators at their intrinsic sorts. */
export type KernelAct =
  | {
    readonly _tag: "declare"
    readonly kind: KernelDeclKind
    readonly value: number
    readonly writ: number
  }
  | { readonly _tag: "resolve"; readonly kind: KernelDeclKind; readonly target: number }
  | { readonly _tag: "emit"; readonly lane: number; readonly body: number }
  | { readonly _tag: "join"; readonly cell: number; readonly contribution: number }
  | {
    readonly _tag: "fold"
    readonly declared: number
    readonly lane: number
    readonly shard: number
    readonly floor: number
    readonly state: number
    readonly head: number
    readonly query: number
  }
  | {
    readonly _tag: "decide"
    readonly register: number
    readonly token: number
    readonly outcome: number
  }
  | {
    readonly _tag: "trigger"
    readonly predicate: KernelTriggerPredicate
    readonly declaration: number
  }
  | { readonly _tag: "spawn"; readonly parent: number; readonly request: number }

const kindRank = (kind: KernelDeclKind): number => KERNEL_DECL_KINDS.indexOf(kind)

const stageRank = (stage: KernelHoleStage): number => KERNEL_HOLE_STAGES.indexOf(stage)

/** The decode half of the kind rank: every in-range rank names exactly one kind. */
export const rankToKind = (rank: number): KernelDeclKind | null =>
  KERNEL_DECL_KINDS[rank] ?? null

/** The decode half of the stage rank. */
export const rankToStage = (rank: number): KernelHoleStage | null =>
  KERNEL_HOLE_STAGES[rank] ?? null

/** The canonical framing of a trigger predicate: a tag and three field slots. */
export const encodePred = (predicate: KernelTriggerPredicate): ReadonlyArray<number> => {
  switch (predicate._tag) {
    case "evidenceAppears":
      return [0, predicate.lane, predicate.pattern, 0]
    case "cellReaches":
      return [1, predicate.cell, predicate.threshold, 0]
    case "holeReaches":
      return [2, predicate.hole, stageRank(predicate.target), 0]
    case "outcomeLanded":
      return [3, predicate.register, 0, 0]
    case "headAdvancedPast":
      return [4, predicate.lane, predicate.shard, predicate.position]
  }
}

/** The decode half of the predicate framing. */
export const decodePred = (
  tag: number,
  a: number,
  b: number,
  c: number,
): KernelTriggerPredicate | null => {
  switch (tag) {
    case 0:
      return { _tag: "evidenceAppears", lane: a, pattern: b }
    case 1:
      return { _tag: "cellReaches", cell: a, threshold: b }
    case 2: {
      const target = rankToStage(b)
      return target === null ? null : { _tag: "holeReaches", hole: a, target }
    }
    case 3:
      return { _tag: "outcomeLanded", register: a }
    case 4:
      return { _tag: "headAdvancedPast", lane: a, shard: b, position: c }
    default:
      return null
  }
}

/** The canonical framing of a kernel sentence: a generator tag and its fields. */
export const encodeAct = (act: KernelAct): ReadonlyArray<number> => {
  switch (act._tag) {
    case "declare":
      return [0, kindRank(act.kind), act.value, act.writ]
    case "resolve":
      return [1, kindRank(act.kind), act.target]
    case "emit":
      return [2, act.lane, act.body]
    case "join":
      return [3, act.cell, act.contribution]
    case "fold":
      return [4, act.declared, act.lane, act.shard, act.floor, act.state, act.head, act.query]
    case "decide":
      return [5, act.register, act.token, act.outcome]
    case "trigger":
      return [6, ...encodePred(act.predicate), act.declaration]
    case "spawn":
      return [7, act.parent, act.request]
  }
}

/** The decode half: every encoded sentence decodes to itself, which names it. */
export const decodeAct = (encoded: ReadonlyArray<number>): KernelAct | null => {
  const [tag] = encoded
  if (tag === 0 && encoded.length === 4) {
    const kind = rankToKind(encoded[1]!)
    return kind === null ? null : { _tag: "declare", kind, value: encoded[2]!, writ: encoded[3]! }
  }
  if (tag === 1 && encoded.length === 3) {
    const kind = rankToKind(encoded[1]!)
    return kind === null ? null : { _tag: "resolve", kind, target: encoded[2]! }
  }
  if (tag === 2 && encoded.length === 3) {
    return { _tag: "emit", lane: encoded[1]!, body: encoded[2]! }
  }
  if (tag === 3 && encoded.length === 3) {
    return { _tag: "join", cell: encoded[1]!, contribution: encoded[2]! }
  }
  if (tag === 4 && encoded.length === 8) {
    return {
      _tag: "fold",
      declared: encoded[1]!,
      lane: encoded[2]!,
      shard: encoded[3]!,
      floor: encoded[4]!,
      state: encoded[5]!,
      head: encoded[6]!,
      query: encoded[7]!,
    }
  }
  if (tag === 5 && encoded.length === 4) {
    return { _tag: "decide", register: encoded[1]!, token: encoded[2]!, outcome: encoded[3]! }
  }
  if (tag === 6 && encoded.length === 6) {
    const predicate = decodePred(encoded[1]!, encoded[2]!, encoded[3]!, encoded[4]!)
    return predicate === null ? null : { _tag: "trigger", predicate, declaration: encoded[5]! }
  }
  if (tag === 7 && encoded.length === 3) {
    return { _tag: "spawn", parent: encoded[1]!, request: encoded[2]! }
  }
  return null
}

const atomWeight = (arg: KernelRawArg): number => {
  switch (arg._tag) {
    case "digestRef":
      return 1 + kindRank(arg.kind) * 4096 + arg.id
    case "literal":
      return 2 + arg.value * 16
    case "hole":
      return 3 + arg.name * 16
    case "clockNow":
      return 4
    case "randomSeed":
      return 5
    case "secretBytes":
      return 6 + arg.bytes * 16
    case "mintedId":
      return 7 + arg.token * 16
    case "functionValue":
      return 8 + arg.code * 16
  }
}

/**
 * The model canonicalizer for a raw payload: a positional fold into one byte
 * identity. The model computes over unbounded naturals; this runs on doubles,
 * so the fold refuses past the exact-integer boundary rather than returning a
 * rounded identity that would compare equal to a different payload.
 */
export const canonicalBytes = (args: ReadonlyArray<KernelRawArg>): number => {
  let accumulator = 7
  for (const arg of args) {
    accumulator = accumulator * 1000003 + atomWeight(arg)
    if (!Number.isSafeInteger(accumulator)) {
      throw new Error("canonicalBytes left the exact-integer range; the identity would be rounded")
    }
  }
  return accumulator
}

const refMember = (
  refs: ReadonlyArray<{ readonly kind: KernelDeclKind; readonly id: number }>,
  kind: KernelDeclKind,
  id: number,
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
      return { _tag: "evidenceAppears", lane: predicate.lane, pattern: predicate.pattern }
    case "cellReaches":
      return { _tag: "cellReaches", cell: predicate.cell, threshold: predicate.threshold }
    case "holeReaches": {
      const target = rankToStage(predicate.stage)
      return target === null ? null : { _tag: "holeReaches", hole: predicate.hole, target }
    }
    case "outcomeLanded":
      return { _tag: "outcomeLanded", register: predicate.register }
    case "headAdvancedPast":
      return {
        _tag: "headAdvancedPast",
        lane: predicate.lane,
        shard: predicate.shard,
        position: predicate.position,
      }
    default:
      return null
  }
}

const refused = (reason: KernelRefusalReason): KernelVerdict => ({ verdict: "refused", reason })

const admitted = (act: KernelAct): KernelVerdict => ({
  verdict: "admitted",
  encoded: encodeAct(act),
})

/**
 * Builds the reference door over one admission context. The check order inside
 * a candidate is fixed — signature shape, then reference sweep, then universe —
 * so the door is deterministic, which is what makes a verdict comparable to the
 * model's at all.
 */
export const referenceDoor = (context: KernelDoorContext): KernelDoor => ({
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
          value: canonicalBytes(candidate.payload),
          writ: candidate.writ,
        })
      }
      case "resolveDigest": {
        if (candidate.anchor !== null) return refused("anchored-resolve")
        if (!refMember(context.catalog, candidate.kind, candidate.target)) {
          return refused("forward-reference")
        }
        return admitted({ _tag: "resolve", kind: candidate.kind, target: candidate.target })
      }
      case "trustBytes":
        return refused("unverified-read")
      case "emit": {
        const swept = argSweep(context, candidate.body)
        if (swept !== null) return refused(swept)
        if (!refMember(context.catalog, "lane", candidate.lane)) return refused("forward-reference")
        return admitted({
          _tag: "emit",
          lane: candidate.lane,
          body: canonicalBytes(candidate.body),
        })
      }
      case "join": {
        if (candidate.strategy._tag === "lastWriterWins") return refused("last-writer-wins")
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
          cell: candidate.cell,
          contribution: canonicalBytes(candidate.contribution),
        })
      }
      case "readLatest":
        return refused("ambient-query-input")
      case "fold": {
        const anchor = candidate.anchor
        if (anchor === null) return refused("ambient-query-input")
        if (anchor.foldId !== candidate.declared) return refused("cross-sort-identifier")
        const swept = argSweep(context, candidate.query)
        if (swept !== null) return refused(swept)
        if (!refMember(context.catalog, "index", candidate.declared)) {
          return refused("forward-reference")
        }
        return admitted({
          _tag: "fold",
          declared: candidate.declared,
          lane: anchor.lane,
          shard: anchor.shard,
          floor: anchor.floor,
          state: anchor.state,
          head: anchor.head,
          query: canonicalBytes(candidate.query),
        })
      }
      case "decide": {
        const claim = candidate.token
        if (claim === null) return refused("unfenced-decide")
        if (claim.register !== candidate.register) return refused("cross-sort-identifier")
        const swept = argSweep(context, candidate.outcome)
        if (swept !== null) return refused(swept)
        if (!refMember(context.catalog, "program", candidate.register)) {
          return refused("forward-reference")
        }
        return admitted({
          _tag: "decide",
          register: candidate.register,
          token: claim.value,
          outcome: canonicalBytes(candidate.outcome),
        })
      }
      case "trigger": {
        const reason = predicateRefusal(candidate.predicate)
        if (reason !== null) return refused(reason)
        const translated = translatePredicate(candidate.predicate)
        if (translated === null) return refused("absence-trigger")
        if (!refMember(context.catalog, "program", candidate.declaration)) {
          return refused("forward-reference")
        }
        return admitted({
          _tag: "trigger",
          predicate: translated,
          declaration: candidate.declaration,
        })
      }
      case "spawn": {
        if (!refMember(context.catalog, "policy", candidate.parent)) {
          return refused("forward-reference")
        }
        if (!refMember(context.catalog, "policy", candidate.request)) {
          return refused("forward-reference")
        }
        return admitted({ _tag: "spawn", parent: candidate.parent, request: candidate.request })
      }
      case "updateInPlace":
        return refused("past-mutation")
    }
  },
})

/**
 * The ground admission context of `Kernel.Planted.door`. The pinned universe
 * deliberately omits one admitted schema, so the off-writ row has a referent
 * that resolves and still refuses.
 */
export const PLANTED_CONTEXT: KernelDoorContext = {
  catalog: [
    { kind: "schema", id: 8 },
    { kind: "schema", id: 9 },
    { kind: "program", id: 3 },
    { kind: "policy", id: 4 },
    { kind: "policy", id: 5 },
    { kind: "lane", id: 1 },
    { kind: "index", id: 2 },
    { kind: "resource", id: 6 },
    { kind: "algebra", id: 7 },
  ],
  pinned: [
    { kind: "schema", id: 8 },
    { kind: "program", id: 3 },
    { kind: "policy", id: 4 },
    { kind: "lane", id: 1 },
  ],
}

const groundAnchor = { foldId: 2, lane: 1, shard: 0, floor: 4, state: 11, head: 6 } as const

/**
 * The planted candidates, keyed by the `Kernel.Planted` def name the emitted
 * admission records carry. One row per closure row, the two
 * signature-discipline rows, and the lawful twin whose admission refutes the
 * door that refuses everything.
 */
export const PLANTED_CANDIDATES: {
  readonly [name: string]: KernelCandidateAct
} = {
  clockFold: {
    _tag: "fold",
    declared: 2,
    anchor: groundAnchor,
    query: [{ _tag: "clockNow" }],
  },
  absenceTrigger: {
    _tag: "trigger",
    predicate: { _tag: "onAbsence", subject: 6 },
    declaration: 3,
  },
  unfencedDecide: {
    _tag: "decide",
    register: 3,
    token: null,
    outcome: [{ _tag: "literal", value: 42 }],
  },
  lastWriterJoin: {
    _tag: "join",
    cell: 6,
    contribution: [{ _tag: "literal", value: 42 }],
    strategy: { _tag: "lastWriterWins" },
  },
  trustingRead: { _tag: "trustBytes", kind: "schema", target: 8, asserted: 999 },
  crossRegisterDecide: {
    _tag: "decide",
    register: 3,
    token: { register: 99, value: 7 },
    outcome: [{ _tag: "literal", value: 42 }],
  },
  mintedDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "mintedId", token: 12345 }],
    writ: 4,
  },
  latestRead: { _tag: "readLatest", subject: 6 },
  forwardDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 77 }],
    writ: 4,
  },
  secretEmit: { _tag: "emit", lane: 1, body: [{ _tag: "secretBytes", bytes: 31337 }] },
  absenceClaimTrigger: {
    _tag: "trigger",
    predicate: { _tag: "absentEverywhere", cell: 6 },
    declaration: 3,
  },
  pastMutation: {
    _tag: "updateInPlace",
    target: 8,
    payload: [{ _tag: "literal", value: 43 }],
  },
  offWritDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 9 }],
    writ: 4,
  },
  functionDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "functionValue", code: 555 }],
    writ: 4,
  },
  anchoredResolve: { _tag: "resolveDigest", kind: "schema", target: 8, anchor: 4 },
  holeyEmit: { _tag: "emit", lane: 1, body: [{ _tag: "hole", name: 0 }] },
  lawfulDeclare: {
    _tag: "declare",
    kind: "schema",
    payload: [{ _tag: "digestRef", kind: "schema", id: 8 }, { _tag: "literal", value: 5 }],
    writ: 4,
  },
}

/**
 * A door that refuses everything with one reason. The control the harness
 * needs: a replay that cannot fail is not evidence, so the suite proves this
 * mutant is caught before it believes the reference door's pass.
 */
export const refuseEverythingDoor: KernelDoor = {
  admit: () => refused("clock-read"),
}
