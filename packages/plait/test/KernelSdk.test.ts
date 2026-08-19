/**
 * The plain-TypeScript SDK, measured at the door.
 *
 * The reference sketch this surface succeeds could describe the language and
 * could not hand it to anything: it declared an admitted-or-refused result and
 * contained nothing able to produce one, because it had no way to spell a
 * candidate and the one judgment function takes a candidate. That was the
 * structural finding of its census, and it is the property this file measures.
 *
 * Four measurements, in rising strength.
 *
 * 1. The grammar is the SAME grammar, not a lookalike: a candidate written in
 *    the SDK's types is accepted where the door's types are required, and a
 *    door candidate is accepted where the SDK's are. Assignability both ways
 *    is what makes "exactly" a checkable word.
 * 2. Every generator of the model reaches admission through its constructor,
 *    and each admitted sentence carries the generator tag and the arity the
 *    corpus itself pins for that generator.
 * 3. Every conformance vector the model emitted - all nineteen - is presented
 *    to the door as an SDK value and gets the model's own verdict. Twelve of
 *    them are built by the eight constructors; the remaining seven are the
 *    crimes the constructors refuse to spell, written as candidate values,
 *    which is exactly how the door gets to teach them.
 * 4. The four dependent ties are carried by CONSTRUCTION rather than by an
 *    inference guard, so they are measured on the values the constructors
 *    return rather than argued from a signature.
 *
 * Everything here is pure. No harness, no server, no layer.
 */
import { describe, expect, test } from "bun:test"

import { GENERATOR_ARITY } from "../scripts/kernel-corpus.js"
import {
  admit,
  make,
  type KernelCandidateAct,
  type KernelDoorContext,
  type KernelVerdict,
} from "../src/kernel/KernelDoor.js"
import * as Sdk from "../src/kernel/KernelSdk.generated.js"
import {
  KERNEL_TABLE_PROVENANCE,
  type LaneDigest,
} from "../src/kernel/KernelTables.generated.js"
import { divergences, loadKernelArtifact, replayAdmissions } from "./KernelConformance.harness.js"

const corpus = await loadKernelArtifact()

/** The planted context, spelled in the SDK's own door type. */
const context: Sdk.Door = {
  catalog: [
    { kind: "schema", id: 8n },
    { kind: "schema", id: 9n },
    { kind: "program", id: 3n },
    { kind: "policy", id: 4n },
    { kind: "policy", id: 5n },
    { kind: "lane", id: 1n },
    { kind: "index", id: 2n },
    { kind: "resource", id: 6n },
    { kind: "algebra", id: 7n },
  ],
  pinned: [
    { kind: "schema", id: 8n },
    { kind: "program", id: 3n },
    { kind: "policy", id: 4n },
    { kind: "lane", id: 1n },
  ],
}

const corpusSchema = Sdk.digestOf("schema", 8n)
const distillWork = Sdk.digestOf("program", 3n)
const rootWrit = Sdk.digestOf("policy", 4n)
const narrowRequest = Sdk.digestOf("policy", 5n)
const opsLane = Sdk.digestOf("lane", 1n)
const searchIndex = Sdk.digestOf("index", 2n)
const progressCell = Sdk.digestOf("resource", 6n)
const mergeAlgebra = Sdk.digestOf("algebra", 7n)

const shardZero: Sdk.LanePartition = { lane: opsLane, shard: 0n }
const anchorAtFour: Sdk.AnchorFact = { floor: 4n, state: 11n, head: 6n }

/**
 * One lawful sentence per generator, in the model's declaration order, built
 * through the constructor the SDK offers for it.
 */
const lawful: { readonly [Generator in Sdk.Generator]: Sdk.CandidateAct } = {
  declare: Sdk.declare("schema", [Sdk.digestRef("schema", 8n), Sdk.literal(5n)], rootWrit),
  resolve: Sdk.resolve("schema", corpusSchema),
  emit: Sdk.emit(opsLane, [Sdk.literal(42n)]),
  join: Sdk.join(progressCell, [Sdk.literal(42n)], mergeAlgebra),
  fold: Sdk.fold(searchIndex, shardZero, anchorAtFour, [Sdk.literal(555n)]),
  decide: Sdk.decide(distillWork, 9n, [Sdk.literal(42n)]),
  trigger: Sdk.trigger(Sdk.evidenceAppears(1n, 17n), distillWork),
  spawn: Sdk.spawn(rootWrit, narrowRequest),
}

/**
 * The twelve conformance vectors the eight constructors can build. Each is the
 * model's own planted candidate, respelled through the surface a caller has.
 */
const constructed: { readonly [name: string]: Sdk.CandidateAct } = {
  clockFold: Sdk.fold(searchIndex, shardZero, anchorAtFour, [Sdk.clockNow()]),
  absenceTrigger: Sdk.trigger(Sdk.onAbsence(6n), distillWork),
  mintedDeclare: Sdk.declare("schema", [Sdk.mintedId(12345n)], rootWrit),
  forwardDeclare: Sdk.declare("schema", [Sdk.digestRef("schema", 77n)], rootWrit),
  secretEmit: Sdk.emit(opsLane, [Sdk.secretBytes(31337n)]),
  absenceClaimTrigger: Sdk.trigger(Sdk.absentEverywhere(6n), distillWork),
  offWritDeclare: Sdk.declare("schema", [Sdk.digestRef("schema", 9n)], rootWrit),
  functionDeclare: Sdk.declare("schema", [Sdk.functionValue(555n)], rootWrit),
  holeyEmit: Sdk.emit(opsLane, [Sdk.hole(0n)]),
  staleStageTrigger: Sdk.trigger(Sdk.holeReaches(0n, 5n), distillWork),
  lawfulDeclare: lawful.declare,
  catalogedTrigger: lawful.trigger,
}

/**
 * The seven the constructors refuse to spell, written as candidate values.
 *
 * Each is a structural crime one of the four dependent ties forbids, or one of
 * the three arms that have no lawful generator at all. They are here rather
 * than absent because a surface that made them unwritable would PREVENT the
 * crime; writing them is what lets the door refuse it and teach the repair.
 */
const spelled: { readonly [name: string]: Sdk.CandidateAct } = {
  // No token: the constructor takes a fence and never omits one.
  unfencedDecide: {
    _tag: "decide",
    register: 3n,
    token: undefined,
    outcome: [Sdk.literal(42n)],
  },
  // A strategy that overrides the declared algebra: the constructor writes the
  // declared-algebra spelling and takes no other.
  lastWriterJoin: {
    _tag: "join",
    cell: 6n,
    contribution: [Sdk.literal(42n)],
    strategy: Sdk.lastWriterWins(7n),
  },
  // No lawful generator: a read that trusts the bytes it was handed.
  trustingRead: { _tag: "trustBytes", kind: "schema", target: 8n, asserted: 999n },
  // A token fenced elsewhere: the constructor writes the register it commits at.
  crossRegisterDecide: {
    _tag: "decide",
    register: 3n,
    token: { register: 99n, value: 7n },
    outcome: [Sdk.literal(42n)],
  },
  // No lawful generator: an unanchored latest read.
  latestRead: { _tag: "readLatest", subject: 6n },
  // No lawful generator: an in-place mutation of the past.
  pastMutation: {
    _tag: "updateInPlace",
    kind: "schema",
    target: 8n,
    payload: [Sdk.literal(43n)],
    writ: 4n,
  },
  // An anchored resolve: the constructor writes no anchor, ever.
  anchoredResolve: { _tag: "resolveDigest", kind: "schema", target: 8n, anchor: 4n },
}

const candidates = { ...constructed, ...spelled }

describe("the SDK is the same grammar the door judges", () => {
  test("a candidate crosses in both directions with no conversion", () => {
    // SDK to door. The value is the one a caller builds; the annotation is the
    // one the judgment function requires.
    const outward: KernelCandidateAct = lawful.fold
    // Door to SDK. A door candidate is spellable in the SDK's own types, which
    // is what makes the SDK's exported grammar the whole grammar rather than a
    // lawful slice of it.
    const doorSide: KernelCandidateAct = {
      _tag: "decide",
      register: 3n,
      token: { register: 3n, value: 9n },
      outcome: [{ _tag: "literal", value: 42n }],
    }
    const inward: Sdk.CandidateAct = doorSide
    expect(outward._tag).toBe("fold")
    expect(inward._tag).toBe("decide")
  })

  test("the admission context and the verdict cross too", () => {
    const outward: KernelDoorContext = context
    const verdict: KernelVerdict = admit(outward, lawful.spawn)
    const inward: Sdk.Verdict = verdict
    expect(inward.verdict).toBe("admitted")
  })

  test("a digest brand unifies with the generated table's alias", () => {
    // Both projections spell a brand as a string-literal key over the model's
    // carrier, so one kind's digest is ONE type across the two files rather
    // than two types that happen to look alike.
    const tableSide: LaneDigest<bigint> = opsLane
    const sdkSide: Sdk.LaneDigest = tableSide
    expect(sdkSide as bigint).toBe(1n)
  })

  test("the surface names the corpus the runtime tables name", () => {
    expect<string>(Sdk.KERNEL_SDK_PROVENANCE.corpus).toBe(corpus.digest)
    expect<string>(Sdk.KERNEL_SDK_PROVENANCE.corpus).toBe(KERNEL_TABLE_PROVENANCE.corpus)
    expect<bigint>(Sdk.KERNEL_SDK_PROVENANCE.format).toBe(corpus.header.format)
  })
})

describe("the SDK carries the corpus's own vocabulary", () => {
  test("every closed inventory matches the corpus at full cardinality and order", () => {
    expect(Sdk.DECL_KINDS).toEqual(corpus.kinds.map((kind) => kind.name) as never)
    expect(Sdk.HOLE_STAGES).toEqual(corpus.stages.map((stage) => stage.name) as never)
    expect(Sdk.REFUSAL_REASONS).toEqual(
      corpus.refusals.map((refusal) => refusal.reason) as never,
    )
    expect<number>(Sdk.GENERATORS.length).toBe(GENERATOR_ARITY.length)
    for (const kind of corpus.kinds) {
      expect<bigint>(Sdk.DECL_KIND_RANK[kind.name as Sdk.DeclKind]).toBe(kind.rank)
    }
    for (const stage of corpus.stages) {
      expect<bigint>(Sdk.HOLE_STAGE_RANK[stage.name as Sdk.HoleStage]).toBe(stage.rank)
    }
  })

  test("the taught table is the corpus's rows, law and repair for law and repair", () => {
    expect<number>(Sdk.TAUGHT.length).toBe(corpus.refusals.length)
    corpus.refusals.forEach((refusal, index) => {
      const row = Sdk.TAUGHT[index]!
      expect(row.reason).toBe(refusal.reason as never)
      expect(row.law).toBe(refusal.law as never)
      expect(row.repair).toBe(refusal.repair as never)
      expect(row.applicability).toBe(refusal.applicability as never)
      expect(Sdk.TAUGHT_BY_REASON[refusal.reason as Sdk.RefusalReason]).toBe(row as never)
    })
  })

  test("every refusal the door can mint is a row the SDK teaches", () => {
    for (const candidate of Object.values(candidates)) {
      const verdict = admit(context, candidate)
      if (verdict.verdict === "refused") {
        const taught = Sdk.TAUGHT_BY_REASON[verdict.reason]
        expect(taught.law).toBe(verdict.law as never)
        expect(taught.repair).toBe(verdict.repair as never)
        expect(taught.applicability).toBe(verdict.applicability as never)
      }
    }
  })
})

describe("the door is reachable from every generator", () => {
  test("each of the eight constructors builds a sentence the door admits", () => {
    const admitted = Sdk.GENERATORS.map((generator) => {
      const verdict = admit(context, lawful[generator])
      return { generator, verdict }
    })
    const refused = admitted.filter(({ verdict }) => verdict.verdict !== "admitted")
    expect(refused.map(({ generator }) => generator)).toEqual([])
    expect(admitted).toHaveLength(8)
  })

  test("each admitted sentence carries the tag and arity the corpus pins", () => {
    Sdk.GENERATORS.forEach((generator, tag) => {
      const verdict = admit(context, lawful[generator])
      if (verdict.verdict !== "admitted") throw new Error(`${generator} was refused`)
      expect(verdict.encoded[0]).toBe(BigInt(tag))
      expect(verdict.encoded).toHaveLength(GENERATOR_ARITY[tag]!)
    })
  })
})

describe("the conformance vectors reach the door as SDK values", () => {
  test("every emitted verdict is the verdict the door returns", () => {
    const replays = replayAdmissions(make(context), corpus, candidates)
    expect(replays).toHaveLength(corpus.admissions.length)
    expect(divergences(replays)).toBe("")
    // The count is asserted, not inferred: a corpus that lost rows would
    // otherwise turn a shrunken roster into a green run.
    expect(corpus.admissions.length).toBe(19)
    expect(corpus.admissions.filter((row) => row.verdict === "refused")).toHaveLength(17)
  })

  test("twelve of them are built by the eight constructors", () => {
    expect(Object.keys(constructed)).toHaveLength(12)
    expect(Object.keys(spelled)).toHaveLength(7)
    expect(Object.keys(candidates)).toHaveLength(corpus.admissions.length)
    for (const admission of corpus.admissions) {
      expect(Object.keys(candidates)).toContain(admission.name)
    }
  })

  test("an admitted vector reproduces the model's own encoding", () => {
    for (const admission of corpus.admissions) {
      if (admission.verdict !== "admitted") continue
      const verdict = admit(context, candidates[admission.name]!)
      if (verdict.verdict !== "admitted") throw new Error(`${admission.name} was refused`)
      expect(verdict.encoded.join(",")).toBe(admission.encoded.join(","))
    }
  })

  test("an integer past what a double holds exactly survives the surface", () => {
    // The pinned canon boundary, carried through a constructor rather than
    // asserted about one: a `number` carrier would round this on the way in.
    const past = 9_007_199_254_740_993n
    const verdict = admit(context, Sdk.emit(opsLane, [Sdk.literal(past)]))
    if (verdict.verdict !== "admitted") throw new Error("the lawful emit was refused")
    expect(verdict.encoded[2]).toBe(7n * 1_000_003n + 2n + past * 16n)
  })
})

describe("the four dependent ties are carried by construction", () => {
  test("a resolve never carries an anchor", () => {
    for (const kind of Sdk.DECL_KINDS) {
      const candidate = Sdk.resolve(kind, Sdk.digestOf(kind, 8n))
      if (candidate._tag !== "resolveDigest") throw new Error("resolve built another arm")
      expect(candidate.anchor).toBeUndefined()
    }
  })

  test("a fold's anchor belongs to the reduction it folds at", () => {
    for (const id of [2n, 40n, 9_007_199_254_740_993n]) {
      const candidate = Sdk.fold(
        Sdk.digestOf("index", id),
        shardZero,
        anchorAtFour,
        [Sdk.literal(0n)],
      )
      if (candidate._tag !== "fold") throw new Error("fold built another arm")
      expect(candidate.anchor?.foldId).toBe(id)
      expect(candidate.anchor?.lane).toBe(1n)
    }
  })

  test("a decide's token is fenced at the register it commits to", () => {
    for (const id of [3n, 99n]) {
      const candidate = Sdk.decide(Sdk.digestOf("program", id), 7n, [Sdk.literal(1n)])
      if (candidate._tag !== "decide") throw new Error("decide built another arm")
      expect(candidate.token?.register).toBe(id)
      expect(candidate.token?.value).toBe(7n)
    }
  })

  test("a join always carries the declared algebra", () => {
    const candidate = Sdk.join(progressCell, [Sdk.literal(1n)], mergeAlgebra)
    if (candidate._tag !== "join") throw new Error("join built another arm")
    expect(candidate.strategy._tag).toBe("declaredAlgebra")
    expect(candidate.strategy.algebra).toBe(7n)
  })
})
