/**
 * The program-builder coherence wall.
 *
 * The builder is a compiler: one authoring act produces a declaration and an
 * identity, and if those can be reached another way they had better agree. So
 * this file is not a unit test of an accumulator. It is the set of comparisons
 * that would catch a builder quietly making something else.
 *
 * 1. **Vector for vector.** Every program vector the interchange carries is
 *    written out here as a program an author would write, built through the
 *    generated `$` surface, and compared byte for byte with the bytes the
 *    vector pins. No recipe reads its vector.
 * 2. **Both ways over the group.** Every program line parses and re-emits to
 *    itself through the estate's one canonicalizer, and each record's
 *    declaration canonicalizes to the record's own `bytes` - the same bytes
 *    the builder's digest is taken over.
 * 3. **Through the door, where a node is a sentence.** Every node of the
 *    committed group is offered to the model's reference door, and the reason
 *    each one is not a sentence is printed rather than skipped. Because none
 *    of them is, the door arm itself runs on a built witness and its refusing
 *    twin - a door that admits nothing and a door that admits everything are
 *    both refuted, and neither would be by a suite that reported "0 admitted".
 * 4. **The consistency law.** Every vector erases to a node list satisfying
 *    the model's admission relation - newest first, nothing consumed before it
 *    is admitted, no name minted twice - and its holes are exactly the
 *    requirements its nodes read. That is the precondition the bridge's
 *    transport theorems need.
 * 5. **The valuation correspondence.** Filling the parameterized vector
 *    reaches the closed one, byte for byte, though the two were written
 *    independently.
 * 6. **The mutant arm.** A builder that drops the edge list, or flattens the
 *    holes away, produces different bytes and is refused by the reader for its
 *    own named reason. A wall with no failing case is a wall around nothing.
 * 7. **The fences.** Publication is a separate act and building performs none;
 *    the effect field carries no executable; the surface offers no clock, no
 *    seed and no secret, because the grammar it transcribes names none.
 *
 * Nothing here runs a program. Every vector is a declaration, no node is
 * executed, replayed, or scheduled, and a green run says the builder agrees
 * with the committed vectors - never that anything works.
 */
import { describe, expect, test } from "bun:test"

import type { JsonValue } from "@foldlab/core/jcs"

import { KernelProgramRecord } from "../src/kernel/KernelCorpusSchemas.js"
import { KERNEL_GENERATOR_FIELDS, KERNEL_GENERATORS } from "../src/kernel/KernelBuilder.generated.js"
import { admissionFault, erase, fill, program } from "../src/kernel/KernelProgram.js"
import {
  readCanonicalValue,
  readKernelCorpus,
  roundTripsCanonically,
  writeCanonicalValue,
} from "../scripts/kernel-corpus.js"
import { make } from "../src/kernel/KernelDoor.js"
import { PLANTED_CONTEXT } from "./KernelDoor.fixtures.js"
import {
  PROGRAM_RECIPES,
  asProgramRecord,
  doorWitness,
  doorWitnessOffCatalog,
  programDivergences,
  projectNode,
  readPrograms,
  replayPrograms,
  withoutEdges,
  withoutHoles,
} from "./KernelProgram.harness.js"

const reading = await readPrograms()
const programs = reading.corpus.programs
const door = make(PLANTED_CONTEXT)

describe("the program group", () => {
  test("the ninth group is present and counted", () => {
    expect(programs.length).toBeGreaterThan(0)
    expect(reading.corpus.header.counts.program).toBe(BigInt(programs.length))
    console.log(
      `PROGRAM GROUP: PASS vectors=${programs.length}` +
        ` names=${programs.map((record) => record.name).join(",")}` +
        ` lines=${reading.corpus.lines.length} rule=add-only-within-format-2`,
    )
  })

  test("every line is canonical and survives its own schema", () => {
    const lines = reading.source
      .split("\n")
      .filter((line) => line.includes("\"record\":\"program\""))
    expect(lines.length).toBe(programs.length)
    for (const line of lines) {
      expect(writeCanonicalValue(readCanonicalValue(line))).toBe(line)
      const round = roundTripsCanonically(KernelProgramRecord, line)
      expect(round.ok ? "" : round.reason).toBe("")
    }
    console.log(
      `PROGRAM BOTH-WAYS: PASS lines=${lines.length} writer=@foldlab/core/jcs` +
        " parse-then-reemit=byte-identical",
    )
  })

  test("each record's declaration canonicalizes to its own bytes", () => {
    for (const record of programs) {
      expect(writeCanonicalValue(record.declaration as unknown as JsonValue))
        .toBe(record.bytes)
    }
    console.log(`PROGRAM SELF-TEST: PASS vectors=${programs.length} pairing=value-and-bytes`)
  })
})

describe("the builder reaches the committed vectors", () => {
  test("every vector builds through the generated surface to its own bytes", () => {
    const replays = replayPrograms(programs)
    expect(programDivergences(replays)).toBe("")
    console.log(
      `PROGRAM BUILD: PASS built=${replays.length}/${programs.length}` +
        ` vectors=${replays.map((replay) => replay.name).join(",")}` +
        " surface=generated-from-the-Act-record",
    )
  })

  test("a vector with no recipe is a divergence, never a skip", () => {
    const invented = [{ ...programs[0]!, name: "no-such-vector" }]
    const replays = replayPrograms(invented)
    expect(replays[0]!.agreed).toBe(false)
    expect(replays[0]!.built).toBe("no-recipe-in-table")
  })

  test("building twice reaches the same bytes and the same address", () => {
    for (const record of programs) {
      const recipe = PROGRAM_RECIPES[record.name]!
      const first = recipe()
      const second = recipe()
      expect(second.bytes).toBe(first.bytes)
      expect(second.digestHex).toBe(first.digestHex)
      expect(first.digestHex).toMatch(/^[0-9a-f]{64}$/)
    }
    console.log(
      `PROGRAM IDENTITY: PASS vectors=${programs.length} hash=sha256-over-canonical-bytes` +
        " basis=trusted-base-not-a-theorem",
    )
  })
})

describe("the consistency law", () => {
  test("every vector erases to a node list the model would admit", () => {
    const shapes: Array<string> = []
    for (const record of programs) {
      const erased = erase(record.declaration)
      const fault = admissionFault(erased)
      expect(`${record.name}: ${fault ?? "admitted"}`).toBe(`${record.name}: admitted`)
      shapes.push(`${record.name}=${erased.length}`)
    }
    console.log(
      `PROGRAM ADMISSION: PASS erased=${shapes.join(",")} order=newest-first` +
        " relation=Kernel.ProgramAdmission",
    )
  })

  test("a cycle in the erased list is a fault, not an oversight", () => {
    const cyclic = [
      { name: 1n, generator: "emit" as const, args: [], uses: [2n], requires: [] },
      { name: 2n, generator: "emit" as const, args: [], uses: [1n], requires: [] },
    ]
    expect(admissionFault(cyclic)).toBe("node 2 consumes 1, which is not yet admitted")
  })

  test("the edges are exactly the consumptions the arguments imply", () => {
    for (const record of programs) {
      const implied = erase(record.declaration)
        .flatMap((node) => node.uses.map((use) => `${node.name}->${use}`))
      const declared = record.declaration.edges.map((edge) => `${edge.from}->${edge.to}`)
      expect(declared).toEqual(implied)
    }
    console.log(
      "PROGRAM EDGES: PASS redundancy=checked order=node-walk-newest-first-then-field-order",
    )
  })

  test("the holes are exactly the requirements the nodes read", () => {
    for (const record of programs) {
      const required = erase(record.declaration).flatMap((node) => node.requires)
      const holes = record.declaration.holes.map((hole) => hole.name)
      expect([...new Set(required)].sort().join(",")).toBe([...holes].sort().join(","))
    }
    console.log("PROGRAM REQUIREMENTS: PASS correspondence=holes-are-requirements")
  })
})

describe("the door, where a node is a sentence", () => {
  test("no committed node is a sentence, and each says why", () => {
    const withheld: Array<string> = []
    for (const record of programs) {
      for (const node of record.declaration.nodes) {
        const projected = projectNode(record.declaration, node.name)
        expect(projected.ok).toBe(false)
        withheld.push(`${record.name}#${node.name}=${projected.ok ? "" : projected.reason}`)
      }
    }
    const reasons = withheld.map((row) =>
      /consumes local/.test(row)
        ? "consumes-a-local"
        : /reads hole/.test(row)
        ? "reads-a-hole"
        : /declaration kind/.test(row)
        ? "no-declaration-kind-in-the-value"
        : "other"
    )
    expect(reasons.includes("other")).toBe(false)
    console.log(
      `PROGRAM DOOR SCOPE: PASS nodes=${withheld.length} act-level=0` +
        ` withheld=${[...new Set(reasons)].sort().join(",")}` +
        " note=a-declaration-is-not-a-sentence",
    )
  })

  test("a built witness is admitted, and its off-catalog twin refused", () => {
    const witness = doorWitness()
    const projected = projectNode(witness.declaration, witness.declaration.nodes[0]!.name, "schema")
    if (!projected.ok) throw new Error(`the witness is not a sentence: ${projected.reason}`)
    const verdict = door.admit(projected.candidate)
    expect(verdict.verdict).toBe("admitted")

    const offCatalog = doorWitnessOffCatalog()
    const twin = projectNode(offCatalog.declaration, offCatalog.declaration.nodes[0]!.name, "schema")
    if (!twin.ok) throw new Error(`the twin is not a sentence: ${twin.reason}`)
    const refusal = door.admit(twin.candidate)
    expect(refusal.verdict).toBe("refused")
    expect(refusal.verdict === "refused" ? refusal.reason : "").toBe("forward-reference")
    console.log(
      "PROGRAM DOOR: PASS witness=admitted off-catalog-twin=refused:forward-reference" +
        " door=shipping",
    )
  })
})

describe("the valuation correspondence", () => {
  test("filling the parameterized vector reaches the closed one", () => {
    const parameterized = PROGRAM_RECIPES.holey!()
    expect(parameterized.requirements).toEqual([7n])
    const filled = fill(parameterized, new Map([[7n, 42n]]))
    const written = PROGRAM_RECIPES["holey-filled"]!()
    expect(filled.bytes).toBe(written.bytes)
    expect(filled.digestHex).toBe(written.digestHex)
    expect(filled.requirements).toEqual([])
    console.log(
      "PROGRAM FILL: PASS filled=holey->holey-filled bytes=equal address=equal" +
        " remaining-requirements=0",
    )
  })

  test("a valuation naming an undeclared hole is refused", () => {
    const parameterized = PROGRAM_RECIPES.holey!()
    expect(() => fill(parameterized, new Map([[9n, 1n]]))).toThrow(/not a declared hole/)
  })
})

describe("the mutant arm", () => {
  test("a builder that drops the edges diverges and is refused", () => {
    const withEdges = programs.find((record) => record.declaration.edges.length > 0)!
    const mutant = withoutEdges(withEdges.declaration)
    expect(writeCanonicalValue(mutant as unknown as JsonValue)).not.toBe(withEdges.bytes)
    const spliced = reading.source.replace(
      asProgramRecord(withEdges.name, withEdges.declaration),
      asProgramRecord(withEdges.name, mutant),
    )
    expect(spliced).not.toBe(reading.source)
    expect(() => readKernelCorpus(spliced))
      .toThrow(/the edge list and the local arguments disagree/)
    console.log(
      `PROGRAM CONTROL: PASS mutant=dropped-edges vector=${withEdges.name}` +
        " killed-by=edge-argument-disagreement",
    )
  })

  test("a builder that flattens the holes diverges and is refused", () => {
    const holey = programs.find((record) => record.declaration.holes.length > 0)!
    const mutant = withoutHoles(holey.declaration)
    expect(writeCanonicalValue(mutant as unknown as JsonValue)).not.toBe(holey.bytes)
    const spliced = reading.source.replace(
      asProgramRecord(holey.name, holey.declaration),
      asProgramRecord(holey.name, mutant),
    )
    expect(spliced).not.toBe(reading.source)
    expect(() => readKernelCorpus(spliced))
      .toThrow(/which this declaration never declared/)
    console.log(
      `PROGRAM CONTROL: PASS mutant=flattened-holes vector=${holey.name}` +
        " killed-by=undeclared-hole",
    )
  })

  test("a declared hole no node reads is refused at build time", () => {
    expect(() =>
      program("unread-hole", { holes: [{ name: 7n, schema: 3n }] }, ($) =>
        $.declare({ kind: "schema", value: $.literal(1n) }))
    ).toThrow(/declared and never read/)
  })

  test("a hole that was never declared cannot be referenced", () => {
    expect(() =>
      program("undeclared-hole", {}, ($) => {
        const forged = { arg: "hole", name: 9n } as const
        return $.declare({ kind: "schema", value: forged })
      })
    ).toThrow(/hole 9 was never declared/)
  })

  test("a handle from another program names no local here", () => {
    const foreign = program("elsewhere", {}, (other) => other.emit({ body: other.literal(0n) }))
    expect(foreign.declaration.nodes.length).toBe(1)
    expect(() =>
      program("borrowed", {}, ($) =>
        $.emit({ body: { arg: "local", name: 99n } as never }))
    ).toThrow(/names no node of this program/)
  })
})

describe("the fences", () => {
  test("building publishes nothing; the declare candidate is a separate act", () => {
    const built = PROGRAM_RECIPES["ground-two-node"]!()
    const candidate = built.toDeclareCandidate(4n)
    expect(candidate._tag).toBe("declare")
    expect(candidate.kind).toBe("program")
    expect(candidate.writ).toBe(4n)
    expect(candidate.bytes).toBe(built.bytes)
    expect(candidate.digestHex).toBe(built.digestHex)
    console.log(
      "PROGRAM PUBLICATION: PASS act=explicit writ=required-argument" +
        " build-side-effects=none",
    )
  })

  test("the effect field carries a type and no executable", () => {
    const built = PROGRAM_RECIPES["ground-two-node"]!()
    expect(built.effect.stub).toBe("typed-stub")
    expect(Object.hasOwn(built.effect, "channels")).toBe(false)
    expect(Object.keys(built.effect)).toEqual(["stub"])
    console.log(
      "PROGRAM EFFECT: PASS stub=typed-stub channels=phantom runtime-members=1" +
        " executes=nothing",
    )
  })

  test("the surface offers the eight generators and no ninth", () => {
    expect([...KERNEL_GENERATORS]).toEqual([
      "declare",
      "resolve",
      "emit",
      "join",
      "fold",
      "decide",
      "trigger",
      "spawn",
    ])
    const fields = Object.entries(KERNEL_GENERATOR_FIELDS)
      .flatMap(([generator, rows]) => rows.map((row) => `${generator}.${row.name}`))
    expect(fields.some((field) => /clock|time|now|seed|random|secret|closure/i.test(field)))
      .toBe(false)
    const absent = Object.entries(KERNEL_GENERATOR_FIELDS)
      .flatMap(([generator, rows]) =>
        rows.filter((row) => row.form.form === "absent").map((row) => `${generator}.${row.name}`)
      )
    console.log(
      `PROGRAM SURFACE: PASS generators=${KERNEL_GENERATORS.length} fields=${fields.length}` +
        ` clock-fields=0 seed-fields=0 secret-fields=0 no-reference-form=${absent.join(",")}`,
    )
  })
})
