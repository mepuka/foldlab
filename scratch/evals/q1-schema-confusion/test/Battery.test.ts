import { describe, expect, test } from "bun:test"
import { BunServices } from "@effect/platform-bun"
import { Effect } from "effect"

import { Battery, CandidateDigests } from "../src/Battery.ts"
import { readToolDocument } from "../src/Files.ts"
import { makePrompt, projectExpectedCall } from "../src/Prompt.ts"
import { projectToolDocument, Variants } from "../src/Projection.ts"
import { compileToolValidators } from "../src/Scoring.ts"

const basePath =
  `${import.meta.dir}/../../../../verify/kernel/projections/tools.schema.json`

describe("fixed battery", () => {
  test("covers every base tool once", async () => {
    const base = await Effect.runPromise(
      readToolDocument(basePath).pipe(Effect.provide(BunServices.layer)),
    )

    expect(Battery.map((task) => task.tool)).toEqual(
      base.tools.map((tool) => tool.name),
    )
    expect(new Set(Battery.map((task) => task.id)).size).toBe(8)
  })

  test("projects every expected call into a schema-valid arm", async () => {
    const base = await Effect.runPromise(
      readToolDocument(basePath).pipe(Effect.provide(BunServices.layer)),
    )

    for (const variant of Variants) {
      const projected = projectToolDocument(base, variant)
      const validators = await Effect.runPromise(compileToolValidators(projected))

      for (const task of Battery) {
        const expected = projectExpectedCall(base, task, variant)
        expect(validators.get(expected.name)?.(expected.arguments)).toBe(true)
      }
    }
  })

  test("renders one deterministic prompt with schemas, candidates, and tasks", async () => {
    const base = await Effect.runPromise(
      readToolDocument(basePath).pipe(Effect.provide(BunServices.layer)),
    )
    const prompt = makePrompt({
      tools: projectToolDocument(base, "nested"),
      tasks: Battery,
      candidates: CandidateDigests,
    })

    expect(prompt).toContain('"lane":{"type":"object"')
    expect(prompt).toContain('"task_id":"fold-at-anchor"')
    expect(prompt).toContain(CandidateDigests.schema)
    expect(prompt).not.toContain('"lane_digest"')
  })
})
