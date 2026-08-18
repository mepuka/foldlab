/**
 * The kernel-conformance wall.
 *
 * Four claims. A second, independently transcribed reading of the model agrees
 * with the emitted artifact line for line. The generated tables are the
 * artifact's tables and not a stale copy. Every emitted encoding vector decodes
 * and re-encodes to itself. Every emitted admission verdict is the verdict a
 * runtime door returns, for all seventeen planted candidates.
 *
 * The door under test is the reference transliteration, because no admission
 * door ships in this package yet; the harness takes its target as a parameter,
 * so a real door is checked by editing one line of this file. The mutant row
 * below is what makes the pass mean something: a replay that cannot fail is
 * not evidence.
 */
import { describe, expect, test } from "bun:test"

import { SAMPLE_ARTIFACT_PATH, closedTableLines } from "../scripts/kernel-tables.js"
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
} from "../src/KernelTables.generated.js"
import {
  artifactPath,
  divergences,
  loadKernelArtifact,
  replayAdmissions,
  replayEncodings,
  sampleArtifactPath,
} from "./KernelConformance.harness.js"
import {
  PLANTED_CANDIDATES,
  PLANTED_CONTEXT,
  referenceDoor,
  refuseEverythingDoor,
} from "./KernelDoor.reference.js"

const artifact = await loadKernelArtifact()

/** The door the wall replays. Swap this for a shipping door when one lands. */
const doorUnderTest = referenceDoor(PLANTED_CONTEXT)

describe("kernel conformance corroboration", () => {
  test("the hand-transcribed control agrees with the emitted artifact", async () => {
    // Two independent readings of one model: the emitter executes it, the
    // control transcribes its Lean sources by hand. Where they agree, a
    // transcription slip on either side would have shown. Encoding vectors are
    // excluded because the schema fixes only their floor, not the choice.
    const emitted = closedTableLines(await Bun.file(artifactPath).text())
    const control = closedTableLines(await Bun.file(sampleArtifactPath).text())
    expect(control).toEqual([...emitted])
    expect(emitted.length).toBeGreaterThan(0)
    console.info(
      `KERNEL CORROBORATION: PASS control=${SAMPLE_ARTIFACT_PATH}` +
        ` agreed-lines=${emitted.length} excluded=header,encoding`,
    )
  })
})

describe("kernel conformance tables", () => {
  test("the committed tables carry the artifact's provenance", () => {
    // The generated constants are literal-typed, so every comparison reads
    // artifact-first: the wide value is the subject, the pinned literal is the
    // expectation.
    expect(artifact.header.format).toBe(KERNEL_TABLE_PROVENANCE.format)
    expect(artifact.header.generator).toBe(KERNEL_TABLE_PROVENANCE.generator)
    expect(artifact.header.source).toBe(KERNEL_TABLE_PROVENANCE.source)
    expect(KERNEL_TABLE_PROVENANCE.command).toBe("bun run generate:kernel-tables")
  })

  test("the kind and stage registries are the artifact's, ranks included", () => {
    expect(artifact.kinds.map((kind) => kind.name)).toEqual([...KERNEL_DECL_KINDS])
    expect(artifact.stages.map((stage) => stage.name)).toEqual([...KERNEL_HOLE_STAGES])
    for (const kind of artifact.kinds) {
      expect(kind.rank)
        .toBe(KERNEL_DECL_KIND_RANK[kind.name as keyof typeof KERNEL_DECL_KIND_RANK])
    }
    for (const stage of artifact.stages) {
      expect(stage.rank)
        .toBe(KERNEL_HOLE_STAGE_RANK[stage.name as keyof typeof KERNEL_HOLE_STAGE_RANK])
    }
  })

  test("the refusal table carries every taught law, repair, and mark", () => {
    expect(artifact.refusals.map((row) => row.reason))
      .toEqual(KERNEL_REFUSALS.map((row) => row.reason))
    for (const emitted of artifact.refusals) {
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
    const replays = replayEncodings(artifact)
    expect(replays).toHaveLength(artifact.encodings.length)
    expect(divergences(replays)).toBe("")
    console.info(
      `KERNEL ENCODING: PASS round-tripped=${replays.length}/${artifact.encodings.length}` +
        ` vectors=${replays.map((replay) => replay.name).join(",")}`,
    )
  })

  test("the door returns the model's verdict for every planted candidate", () => {
    const replays = replayAdmissions(doorUnderTest, artifact, PLANTED_CANDIDATES)
    expect(replays).toHaveLength(artifact.admissions.length)
    expect(divergences(replays)).toBe("")
    const refusedCount = artifact.admissions
      .filter((admission) => admission.verdict === "refused").length
    const admittedCount = artifact.admissions.length - refusedCount
    expect(admittedCount).toBe(1)
    console.info(
      `KERNEL DOOR: PASS target=reference replayed=${replays.length}/${artifact.admissions.length}` +
        ` refused=${refusedCount} admitted=${admittedCount} skipped=0`,
    )
  })

  test("a door that refuses everything is caught by the same replay", () => {
    const replays = replayAdmissions(refuseEverythingDoor, artifact, PLANTED_CANDIDATES)
    const caught = replays.filter((replay) => !replay.agreed)
    expect(caught.length).toBeGreaterThan(0)
    expect(caught.some((replay) => replay.name === "lawfulDeclare")).toBe(true)
    console.info(
      `KERNEL DOOR CONTROL: PASS mutant=refuse-everything caught=${caught.length}` +
        `/${replays.length} killed-by=${caught.slice(0, 3).map((replay) => replay.name).join(",")}`,
    )
  })

  test("a candidate missing from the table diverges rather than skipping", () => {
    const replays = replayAdmissions(doorUnderTest, artifact, {})
    expect(replays.every((replay) => replay.actual === "no-candidate-in-table")).toBe(true)
    expect(replays.every((replay) => !replay.agreed)).toBe(true)
  })
})
