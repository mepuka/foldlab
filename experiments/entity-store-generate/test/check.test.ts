import { afterAll, expect, test } from "bun:test"
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkGeneratedTree, lakeBuild } from "../src/check.ts"
import { generateProject } from "../src/generate.ts"

const MINI_INVENTORY = new URL(
  "../../entity-store-extract/sample-mini-inventory.json",
  import.meta.url
).pathname

const temporaryRoots: Array<string> = []

afterAll(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true })
})

const makeMiniCase = (): { inventory: string; generated: string } => {
  const root = mkdtempSync(join(tmpdir(), "entity-store-generate-check-"))
  temporaryRoots.push(root)
  const inventory = join(root, "inventory.json")
  const generated = join(root, "generated")
  copyFileSync(MINI_INVENTORY, inventory)
  generateProject(inventory, generated)
  writeFileSync(
    join(generated, "EntityStoreGenerate", "Fixtures.lean"),
    '-- HAND-WRITTEN: mini gate fixture\nimport EntityStoreGenerate.Inventory\n\nopen EntityStoreGenerate\n\nexample : tagOf .tag_Null = "Null" := rfl\n'
  )
  return { inventory, generated }
}

/** Every test that calls `lakeBuild` shells out to a COLD `lake build` of a
 * fresh temp project, which is minutes of work on a loaded machine and well
 * past bun's 5 s default. That default made this suite pass on an idle host and
 * time out under `mise run check`, which is the worst way for a gate to fail:
 * red for a reason that has nothing to do with what it asserts. */
const LAKE_BUILD_TIMEOUT_MS = 300_000

test("the mini inventory and handwritten fixture build together", () => {
  const fixture = makeMiniCase()
  const build = lakeBuild(fixture.generated)

  expect(build.exitCode).toBe(0)
}, LAKE_BUILD_TIMEOUT_MS)

test("a hand edit to generated text fails the whole-tree comparison", () => {
  const fixture = makeMiniCase()
  const inventoryLean = join(fixture.generated, "EntityStoreGenerate", "Inventory.lean")
  writeFileSync(inventoryLean, readFileSync(inventoryLean, "utf8") + "-- hand edit\n")

  expect(() => checkGeneratedTree(fixture.inventory, fixture.generated)).toThrow(
    /generated-tree-drift: changed file EntityStoreGenerate\/Inventory\.lean/
  )
})

test("tag drift fails the comparison and the handwritten fixture fails the kernel build", () => {
  const fixture = makeMiniCase()
  const inventory = JSON.parse(readFileSync(fixture.inventory, "utf8"))
  const nullVariant = inventory.variants.find((variant: { tagLiteral: string }) =>
    variant.tagLiteral === "Null"
  )
  nullVariant.tagLiteral = "NullDrifted"
  writeFileSync(fixture.inventory, JSON.stringify(inventory, null, 2) + "\n")

  expect(() => checkGeneratedTree(fixture.inventory, fixture.generated)).toThrow(
    /generated-tree-drift: changed file EntityStoreGenerate\/Inventory\.lean/
  )

  const driftedProject = join(fixture.generated, "..", "drifted-generated")
  generateProject(fixture.inventory, driftedProject)
  copyFileSync(
    join(fixture.generated, "EntityStoreGenerate", "Fixtures.lean"),
    join(driftedProject, "EntityStoreGenerate", "Fixtures.lean")
  )
  const build = lakeBuild(driftedProject)
  expect(build.exitCode).not.toBe(0)
  expect(build.stdout + build.stderr).toContain("Fixtures.lean")
  expect(build.stdout + build.stderr).toContain("tag_Null")
}, LAKE_BUILD_TIMEOUT_MS)

test("an added inventory constructor fails the whole-tree comparison", () => {
  const fixture = makeMiniCase()
  const inventory = JSON.parse(readFileSync(fixture.inventory, "utf8"))
  inventory.variants.push({
    variant: "AddedForGateTest",
    tagLiteral: "AddedForGateTest",
    unionIndex: 21,
    declLine: 1,
    tagDeclLine: 1,
    fields: [],
    ctorParams: []
  })
  writeFileSync(fixture.inventory, JSON.stringify(inventory, null, 2) + "\n")

  expect(() => checkGeneratedTree(fixture.inventory, fixture.generated)).toThrow(
    /generated-tree-drift: changed file EntityStoreGenerate\/Inventory\.lean/
  )
})

test("an extra committed file fails the whole-tree comparison", () => {
  const fixture = makeMiniCase()
  writeFileSync(join(fixture.generated, "Unexpected.lean"), "-- unexpected\n")

  expect(() => checkGeneratedTree(fixture.inventory, fixture.generated)).toThrow(
    /generated-tree-drift: extra committed file Unexpected\.lean/
  )
})

test("a missing committed file fails the whole-tree comparison", () => {
  const fixture = makeMiniCase()
  unlinkSync(join(fixture.generated, "EntityStoreGenerate.lean"))

  expect(() => checkGeneratedTree(fixture.inventory, fixture.generated)).toThrow(
    /generated-tree-drift: missing committed file EntityStoreGenerate\.lean/
  )
})
