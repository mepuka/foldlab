import { afterAll, expect, test } from "bun:test"
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { generateProject } from "../src/generate.ts"

const MINI_INVENTORY = new URL(
  "../../entity-store-extract/sample-mini-inventory.json",
  import.meta.url
).pathname

const temporaryRoots: Array<string> = []
const temporaryRoot = (prefix: string): string => {
  const root = mkdtempSync(join(tmpdir(), prefix))
  temporaryRoots.push(root)
  return root
}

afterAll(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true })
})

test("two runs generate byte-identical trees", () => {
  const root = temporaryRoot("entity-store-generate-determinism-")
  const inventory = join(root, "inventory.json")
  const first = join(root, "first")
  const second = join(root, "second")
  copyFileSync(MINI_INVENTORY, inventory)

  const firstFiles = generateProject(inventory, first)
  const secondFiles = generateProject(inventory, second)

  expect(firstFiles).toEqual(secondFiles)
  for (const file of firstFiles) {
    expect(readFileSync(join(first, file))).toEqual(readFileSync(join(second, file)))
  }
})

test("emitted Lean preserves inventory order and carries the exact source pins", () => {
  const root = temporaryRoot("entity-store-generate-content-")
  const inventoryPath = join(root, "inventory.json")
  const generated = join(root, "generated")
  copyFileSync(MINI_INVENTORY, inventoryPath)
  const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"))

  const files = generateProject(inventoryPath, generated)
  for (const file of files) {
    const text = readFileSync(join(generated, file), "utf8")
    expect(text.includes("\r")).toBe(false)
    expect(text.endsWith("\n")).toBe(true)
    expect(text.includes("/Users/")).toBe(false)
    expect(text.includes("\\\\")).toBe(false)
    expect(text).not.toMatch(/20\d\d-\d\d-\d\dT/)
  }
  const leanFiles = files.filter((file) => file.endsWith(".lean"))
  for (const file of leanFiles) {
    const text = readFileSync(join(generated, file), "utf8")
    expect(text.split("\n", 1)[0]).toContain("src/generate.ts")
    expect(text.split("\n", 1)[0]).toContain(JSON.stringify(inventory.source))
  }

  const lean = readFileSync(join(generated, "EntityStoreGenerate", "Inventory.lean"), "utf8")
  expect(lean.indexOf("tag_Null")).toBeLessThan(lean.indexOf("tag_Suspend"))
  expect(lean.indexOf("tag_Suspend")).toBeLessThan(lean.indexOf("tag_Union"))
  expect(lean).toContain("theorem all_variants_complete")
  expect(lean).toContain("theorem tags_distinct")
  expect(lean).toContain("theorem constructor_count : allVariants.length = 3")
})

test("schemaVersion 1 validation rejects malformed input before writing output", () => {
  const root = temporaryRoot("entity-store-generate-schema-")
  const inventoryPath = join(root, "inventory.json")
  const output = join(root, "generated")
  const inventory = JSON.parse(readFileSync(MINI_INVENTORY, "utf8"))
  inventory.schemaVersion = 2
  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + "\n")

  expect(() => generateProject(inventoryPath, output)).toThrow(
    "schema-invalid: $.schemaVersion: expected exactly 1"
  )
})

test("generation leaves the handwritten fixture unchanged", () => {
  const root = temporaryRoot("entity-store-generate-fixture-")
  const inventoryPath = join(root, "inventory.json")
  const output = join(root, "generated")
  const fixturePath = join(output, "EntityStoreGenerate", "Fixtures.lean")
  const fixture = "-- HAND-WRITTEN\n"
  copyFileSync(MINI_INVENTORY, inventoryPath)
  mkdirSync(join(output, "EntityStoreGenerate"), { recursive: true })
  writeFileSync(fixturePath, fixture)

  generateProject(inventoryPath, output)

  expect(readFileSync(fixturePath, "utf8")).toBe(fixture)
})
