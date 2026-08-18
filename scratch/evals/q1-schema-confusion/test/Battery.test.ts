import { describe, expect, test } from "bun:test"
import { BunServices } from "@effect/platform-bun"
import { Effect } from "effect"
import { resolve } from "node:path"

import {
  canonicalSlots,
  deriveBattery,
  deriveLedger,
  ledgerCandidates,
  plantedDigests,
} from "../src/Battery.ts"
import { loadKernelCorpus } from "../src/Corpus.ts"
import { readToolDocumentSource } from "../src/Files.ts"

const repository = resolve(import.meta.dir, "../../../..")

const load = () =>
  Effect.runPromise(
    Effect.gen(function*() {
      const source = yield* readToolDocumentSource(
        resolve(repository, "verify/kernel/projections/tools.schema.json"),
      )
      const corpus = yield* loadKernelCorpus(
        resolve(repository, "packages/plait/src/kernel/KernelBuilder.generated.ts"),
      )
      const ledger = deriveLedger(source.document, corpus)
      return { base: source.document, corpus, ledger, battery: deriveBattery(source.document, ledger) }
    }).pipe(Effect.provide(BunServices.layer)),
  )

describe("the derived candidate ledger", () => {
  /**
   * The round-1 blocker, as a regression. That battery asked models to
   * "trigger the planted declaration" while its hand-written ledger carried no
   * `declaration` key, and sixteen of the seventeen confused calls in the whole
   * population were models guessing at that unresolvable referent. Deriving
   * both sides from one walk makes the failure unconstructible; this test is
   * what says so out loud.
   */
  test("every referent a task names is a ledger key", async () => {
    const { ledger, battery } = await load()
    const keys = new Set(ledger.map((entry) => entry.key))

    const unresolvable = battery.flatMap((task) =>
      task.assignments
        .filter((assignment) => !keys.has(assignment.ledger_key))
        .map((assignment) => `${task.id} → ${assignment.ledger_key}`)
    )

    expect(unresolvable).toEqual([])
    expect(battery.every((task) => task.assignments.length > 0)).toBe(true)
  })

  test("the trigger declaration slot is a ledger key branded by the corpus", async () => {
    const { ledger } = await load()
    const entry = ledger.find((row) => row.key === "trigger.declaration")

    expect(entry).toBeDefined()
    expect(entry?.corpus_field).toBe("declaration")
    expect(entry?.corpus_kind).toBe("program")
    expect(entry?.cross_walk).toBe("name")
  })

  test("planted digests are distinct, so a slot is mechanically recoverable", async () => {
    const { ledger } = await load()
    const digests = plantedDigests(ledger)

    expect(new Set(digests).size).toBe(digests.length)
    expect(digests.every((value) => /^sha256:[0-9a-f]{64}$/.test(value))).toBe(true)
    expect(canonicalSlots(ledger).size).toBe(ledger.length)
  })

  test("every ledger entry carries the base schema's own description as its role", async () => {
    const { base, ledger } = await load()
    for (const entry of ledger) {
      const tool = base.tools.find((candidate) => candidate.name === entry.tool)
      expect(entry.role).toBe(tool?.input_schema.properties[entry.field]?.description ?? "")
      expect(entry.role.length).toBeGreaterThan(0)
    }
  })

  test("derivation is a pure function of the base and the corpus", async () => {
    const first = await load()
    const second = await load()

    expect(ledgerCandidates(second.ledger)).toEqual(ledgerCandidates(first.ledger))
    expect(second.battery).toEqual(first.battery)
  })

  test("the battery is the tool list, so it cannot be hand-picked", async () => {
    const { base, battery } = await load()

    expect(battery.map((task) => task.tool)).toEqual(base.tools.map((tool) => tool.name))
  })

  test("every task fills exactly the fields its tool requires", async () => {
    const { base, battery } = await load()
    for (const task of battery) {
      const tool = base.tools.find((candidate) => candidate.name === task.tool)
      expect(Object.keys(task.arguments).sort())
        .toEqual([...(tool?.input_schema.required ?? [])].sort())
    }
  })

  /**
   * The base projection declares itself hand-derived; where it names a digest
   * slot the generated grammar does not, that is a finding about the sketch.
   * The count is pinned so a corpus or sketch change surfaces here.
   */
  test("the cross-walk to the generated corpus is pinned", async () => {
    const { ledger } = await load()
    const byWalk = (walk: string) => ledger.filter((entry) => entry.cross_walk === walk).length

    expect(ledger.length).toBe(13)
    expect(byWalk("name")).toBe(5)
    expect(byWalk("position")).toBe(3)
    expect(byWalk("unresolved")).toBe(5)
    expect(
      ledger.filter((entry) => entry.cross_walk === "unresolved").map((entry) => entry.key),
    ).toEqual([
      "fold.reduction",
      "fold.lane",
      "trigger.lane",
      "trigger.cell",
      "trigger.register",
    ])
  })
})
