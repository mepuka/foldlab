/**
 * The kernel-conformance wall.
 *
 * Three claims. The generated tables are the corpus's tables and not a stale
 * copy. Every emitted encoding vector decodes and re-encodes to itself. Every
 * emitted admission verdict is the verdict a runtime door returns, for all
 * nineteen planted candidates in the HOST roster - seventeen refused, two
 * admitted.
 *
 * The admitted two are what a closure list cannot state. A refusal roster says
 * which spellings the door rejects and never which it ACCEPTS, so a door that
 * refused everything would satisfy every closure row and still be wrong. One of
 * them carries a claim of its own, replayed below: the first admission ever to
 * reach the trigger arm's referent check.
 *
 * A tenth record group, `model-admission`, is emitted marked model-internal and
 * is deliberately NOT part of this roster; the wall below is that it stays out.
 *
 * Two controls stand beside them for the things the vectors cannot say. The
 * corpus's identity labels are unbounded, so one row drives a value past what a
 * double holds exactly and pins the encoding it must keep. And the corpus
 * carries the anchored resolve that must be REFUSED but not the bare one that
 * must be ADMITTED, so one row spells absence the way the generated schema
 * spells it and holds the door to admitting it.
 *
 * A fourth claim used to stand here: a second reading of the model, transcribed
 * from its Lean sources by hand, agreed with the emission line for line. It is
 * retired. The standing ruling is that model-to-runtime vectors are generated
 * by executing the model and never hand-typed, and a hand-transcribed control
 * is exactly the artifact that ruling forbids - it drifts silently, and the
 * agreement it reports is agreement with whoever last retyped it. What replaces
 * it is stronger and mechanical: the corpus is checked byte for byte against
 * its own canonical form, and everything derived from it regenerates
 * byte-identically.
 *
 * The door under test is the shipping admission seam. The mutant row below is
 * what makes the pass mean something: a replay that cannot fail is not
 * evidence.
 */
import { describe, expect, test } from "bun:test"

import { Schema } from "effect"

import { Candidate, decodeAct, make } from "../src/kernel/KernelDoor.js"
import {
  KERNEL_DECL_KINDS,
  KERNEL_DECL_KIND_RANK,
  KERNEL_HOLE_STAGES,
  KERNEL_HOLE_STAGE_RANK,
  KERNEL_REFUSALS,
  KERNEL_REFUSAL_BY_REASON,
  KERNEL_TABLE_PROVENANCE,
  type ProgramDigest,
  type SchemaDigest,
} from "../src/kernel/KernelTables.generated.js"
import {
  divergences,
  loadKernelArtifact,
  replayAdmissions,
  replayEncodings,
} from "./KernelConformance.harness.js"
import {
  PLANTED_CANDIDATES,
  PLANTED_CONTEXT,
  refuseEverythingDoor,
} from "./KernelDoor.fixtures.js"

const corpus = await loadKernelArtifact()

/** The shipping door: the production seam must agree with every emitted vector. */
const doorUnderTest = make(PLANTED_CONTEXT)

describe("kernel conformance tables", () => {
  test("the committed tables name the artifact by its digest", () => {
    // The generated constants are literal-typed, so every comparison reads
    // artifact-first: the wide value is the subject, the pinned literal is the
    // expectation.
    //
    // Provenance is a digest and not a location (root law 10): the corpus these
    // tables were rendered from is named by SHA-256 over its canonical bytes, so
    // this assertion re-derives that identity from the corpus the harness just
    // read and compares. A path would have made the same claim uncheckable —
    // there is nothing to verify about a string naming where a file sat.
    expect(corpus.header.format).toBe(KERNEL_TABLE_PROVENANCE.format)
    expect(corpus.digest).toBe(KERNEL_TABLE_PROVENANCE.corpus)
    expect(corpus.digest).toMatch(/^[0-9a-f]{64}$/)
  })

  test("the kind and stage registries are the artifact's, ranks included", () => {
    expect(corpus.kinds.map((kind) => kind.name)).toEqual([...KERNEL_DECL_KINDS])
    expect(corpus.stages.map((stage) => stage.name)).toEqual([...KERNEL_HOLE_STAGES])
    for (const kind of corpus.kinds) {
      // Number on the left: the corpus carries ranks unbounded, the generated
      // table carries them as the small dense indices they are.
      expect(Number(kind.rank))
        .toBe(KERNEL_DECL_KIND_RANK[kind.name as keyof typeof KERNEL_DECL_KIND_RANK])
    }
    for (const stage of corpus.stages) {
      expect(Number(stage.rank))
        .toBe(KERNEL_HOLE_STAGE_RANK[stage.name as keyof typeof KERNEL_HOLE_STAGE_RANK])
    }
  })

  test("the refusal table carries every taught law, repair, and mark", () => {
    expect(corpus.refusals.map((row) => row.reason))
      .toEqual(KERNEL_REFUSALS.map((row) => row.reason))
    for (const emitted of corpus.refusals) {
      const row = KERNEL_REFUSAL_BY_REASON[
        emitted.reason as keyof typeof KERNEL_REFUSAL_BY_REASON
      ]
      expect(emitted.law).toBe(row.law)
      expect(emitted.repair).toBe(row.repair)
      expect(emitted.applicability).toBe(row.applicability)
    }
    const machineApplicable = KERNEL_REFUSALS
      .filter((row) => row.applicability === "machine-applicable")
      .map((row) => row.reason)
    expect(machineApplicable.length).toBeGreaterThan(0)
    console.info(
      `KERNEL TABLES: PASS kinds=${KERNEL_DECL_KINDS.length}` +
        ` stages=${KERNEL_HOLE_STAGES.length} refusals=${KERNEL_REFUSALS.length}` +
        ` machine-applicable=${machineApplicable.join(",")}`,
    )
  })

  test("a digest brand does not unify across declaration kinds", () => {
    const program = 3 as unknown as ProgramDigest
    // @ts-expect-error a program digest is not a schema digest; the brands are sorts
    const crossed: SchemaDigest = program
    expect(crossed as unknown as number).toBe(3)
  })
})

describe("kernel door conformance", () => {
  test("every emitted encoding vector decodes and re-encodes to itself", () => {
    const replays = replayEncodings(corpus)
    expect(replays).toHaveLength(corpus.encodings.length)
    expect(divergences(replays)).toBe("")
    console.info(
      `KERNEL ENCODING: PASS round-tripped=${replays.length}/${corpus.encodings.length}` +
        ` vectors=${replays.map((replay) => replay.name).join(",")}`,
    )
  })

  test("the door returns the model's verdict for every planted candidate", () => {
    const replays = replayAdmissions(doorUnderTest, corpus, PLANTED_CANDIDATES)
    expect(replays).toHaveLength(corpus.admissions.length)
    expect(divergences(replays)).toBe("")
    const refusedCount = corpus.admissions
      .filter((admission) => admission.verdict === "refused").length
    const admittedCount = corpus.admissions.length - refusedCount
    expect(refusedCount).toBe(17)
    expect(admittedCount).toBe(2)
    console.info(
      `KERNEL DOOR: PASS target=shipping replayed=${replays.length}/${corpus.admissions.length}` +
        ` refused=${refusedCount} admitted=${admittedCount} skipped=0`,
    )
  })

  test("a fully catalogued trigger is admitted: the trigger arm's referent check runs", () => {
    // Both other planted triggers refuse on their PREDICATE, so before this row
    // no passing admission ever reached the trigger arm's referent check at all.
    // This one names (program, 3) as its declaration and (lane, 1) in its
    // predicate, both catalogued, and is admitted.
    //
    // Scope, stated because the omission is deliberate: this claims NOTHING
    // about a predicate naming an uncatalogued lane, cell, or register.
    // Predicate leaves are bare naturals rather than raw arguments, so the
    // model's `requiredCatalog` trigger arm names only the declaration; whether
    // that is intended is an open question, and no vector here answers it.
    const emitted = corpus.admissions.find((row) => row.name === "catalogedTrigger")
    expect(emitted?.verdict).toBe("admitted")
    expect(emitted?.verdict === "admitted" && emitted.encoded).toEqual([6n, 0n, 1n, 17n, 0n, 3n])

    const verdict = doorUnderTest.admit(PLANTED_CANDIDATES["catalogedTrigger"]!)
    expect(verdict).toEqual({
      verdict: "admitted",
      act: {
        _tag: "trigger",
        predicate: {
          _tag: "evidenceAppears",
          lane: { id: 1n },
          pattern: { bytes: 17n },
        },
        declaration: { id: 3n },
      },
      encoded: [6n, 0n, 1n, 17n, 0n, 3n],
    })

    // The same sentence the encoding group already states, reached this time
    // through the door rather than through the encoder.
    const committed = corpus.encodings.find((row) => row.name === "trigger-evidence-appears")
    expect(committed?.act).toEqual([6n, 0n, 1n, 17n, 0n, 3n])
    console.info(
      "KERNEL TRIGGER: PASS declaration=program/3 predicate-leaf=lane/1 catalogued=both" +
        " verdict=admitted encoded=[6,0,1,17,0,3] vector=trigger-evidence-appears" +
        " uncatalogued-leaves=NOT-CLAIMED",
    )
  })

  test("the model-internal aliasing rows never reach the conformance roster", () => {
    // The model's payload canonicalizer folds distinct lawful payloads to one
    // identity - a digest reference weighs 1 + kind.rank * 4096 + id, a literal
    // 2 + value * 16, so [ref lane 1] and [literal 1024] both weigh 16386. That
    // quotient is RULED INTENDED and model-internal (operator grill ruling A8,
    // sitting record DEV-772, 2026-08-19): a payload denotes its canonical
    // value, so inside the model two spellings of one value are one sentence.
    //
    // Real injectivity is the byte-level canonicalizer's obligation, walled
    // separately under DEV-807. So the claim this wall makes is the EXCLUSION,
    // not the collision: the emitter marks those rows model-internal, and the
    // door is never replayed against them. A host that reproduced the collision
    // would be reproducing a model convenience, not the estate's byte identity.
    expect(corpus.admissions.map((row) => row.name)).not.toContain("aliasRefDeclare")
    expect(corpus.admissions.map((row) => row.name)).not.toContain("aliasLiteralDeclare")
    expect(corpus.skipped).toContain("model-admission")
    expect(PLANTED_CANDIDATES["aliasRefDeclare"]).toBeUndefined()
    expect(PLANTED_CANDIDATES["aliasLiteralDeclare"]).toBeUndefined()
    console.info(
      "KERNEL MODEL-INTERNAL: PASS group=model-admission skipped=yes" +
        " in-conformance-roster=no ruling=A8/DEV-772 injectivity-owner=DEV-807",
    )
  })

  test("the generated bigint carrier crosses the shipping door without rounding", () => {
    const beyondDouble = 9007199254740993n
    const verdict = doorUnderTest.admit({
      _tag: "declare",
      kind: "schema",
      payload: [{ _tag: "literal", value: beyondDouble }],
      writ: 4n,
    })
    expect(verdict).toEqual({
      verdict: "admitted",
      act: {
        _tag: "declare",
        kind: "schema",
        value: { bytes: 7n * 1_000_003n + 2n + beyondDouble * 16n },
        writ: { id: 4n },
      },
      encoded: [0n, 0n, 7n * 1_000_003n + 2n + beyondDouble * 16n, 4n],
    })
  })

  test("absence spelled the generated way is admitted, executed, and its trace committed", () => {
    // The candidate comes out of the generated codec rather than being written
    // here, because the whole class this control watches is a door that reads
    // absence by a spelling the schema does not use. `Schema.UndefinedOr` is
    // the model's `none`, so a door testing `!== null` refuses this LAWFUL
    // sentence and no planted vector says so: the corpus carries the anchored
    // resolve that must be refused, never the bare one that must be admitted.
    const candidate = Schema.decodeUnknownSync(Candidate)({
      _tag: "resolveDigest",
      kind: "schema",
      target: 8n,
      anchor: undefined,
    })
    expect(candidate).toMatchObject({ _tag: "resolveDigest", anchor: undefined })

    const verdict = doorUnderTest.admit(candidate)
    expect(verdict).toEqual({
      verdict: "admitted",
      act: { _tag: "resolve", kind: "schema", target: { id: 8n } },
      encoded: [1n, 0n, 8n],
    })

    // The trace is written out independently above and then held against the
    // model's own committed vector, so neither side can drift alone.
    const committed = corpus.encodings.find((encoding) => encoding.name === "resolve-schema")
    expect(committed?.act).toEqual([1n, 0n, 8n])
    expect(decodeAct([1n, 0n, 8n])).toEqual({
      _tag: "resolve",
      kind: "schema",
      target: { id: 8n },
    })

    console.info(
      "KERNEL ABSENCE: PASS candidate=resolveDigest anchor=undefined verdict=admitted" +
        " vector=resolve-schema trace=[1,0,8]",
    )
  })

  test("a door that refuses everything is caught by the same replay", () => {
    const replays = replayAdmissions(refuseEverythingDoor, corpus, PLANTED_CANDIDATES)
    const caught = replays.filter((replay) => !replay.agreed)
    expect(caught.length).toBeGreaterThan(0)
    expect(caught.some((replay) => replay.name === "lawfulDeclare")).toBe(true)
    console.info(
      `KERNEL DOOR CONTROL: PASS mutant=refuse-everything caught=${caught.length}` +
        `/${replays.length} killed-by=${caught.slice(0, 3).map((replay) => replay.name).join(",")}`,
    )
  })

  test("a candidate missing from the table diverges rather than skipping", () => {
    const replays = replayAdmissions(doorUnderTest, corpus, {})
    expect(replays.every((replay) => replay.actual === "no-candidate-in-table")).toBe(true)
    expect(replays.every((replay) => !replay.agreed)).toBe(true)
  })
})
