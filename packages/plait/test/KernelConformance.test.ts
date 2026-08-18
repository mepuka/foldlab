/**
 * The kernel-conformance wall.
 *
 * Three claims. The generated tables are the corpus's tables and not a stale
 * copy. Every emitted encoding vector decodes and re-encodes to itself. Every
 * emitted admission verdict is the verdict a runtime door returns, for all
 * seventeen planted candidates.
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
 * The door under test is the shipping implementation. The harness still takes
 * its target as a parameter so the mutant below crosses the identical replay;
 * a replay that cannot fail is not evidence.
 */
import { describe, expect, test } from "bun:test"

import { makeKernelDoor } from "../src/kernel/Door.js"
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
} from "./KernelDoor.reference.js"

const corpus = await loadKernelArtifact()

/** The shipping door is the conformance target, never a test-side twin. */
const doorUnderTest = makeKernelDoor(PLANTED_CONTEXT)

describe("kernel conformance tables", () => {
  test("the committed tables carry the artifact's provenance", () => {
    // The generated constants are literal-typed, so every comparison reads
    // artifact-first: the wide value is the subject, the pinned literal is the
    // expectation.
    expect(corpus.header.format).toBe(KERNEL_TABLE_PROVENANCE.format)
    expect(corpus.header.generator).toBe(KERNEL_TABLE_PROVENANCE.generator)
    expect(corpus.header.source).toBe(KERNEL_TABLE_PROVENANCE.source)
    expect(KERNEL_TABLE_PROVENANCE.command).toBe("bun run generate:kernel-tables")
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
    expect(admittedCount).toBe(1)
    console.info(
      `KERNEL DOOR: PASS target=shipping replayed=${replays.length}/${corpus.admissions.length}` +
        ` refused=${refusedCount} admitted=${admittedCount} skipped=0`,
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
