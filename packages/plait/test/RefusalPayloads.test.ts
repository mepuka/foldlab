import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  MANIFEST_PATH,
  SOURCE_ROOT,
  checkTaughtPayloads,
  countTaughtPayloads,
  renderTaughtPayloads,
  sourceFiles,
} from "../scripts/refusal-payloads.js"

const repository = resolve(import.meta.dir, "../../..")
const root = resolve(repository, SOURCE_ROOT)
const files = sourceFiles(root)
const readSource = (file: string): string => readFileSync(resolve(root, file), "utf8")

// The one payload the mutation arm edits. It is a taught repair note on a
// shipped minting site, chosen because it is a plain literal in the source.
const MUTATED_FILE = "internal/anchors.ts"
const MUTATED_NOTE =
  "Restore the checkpoint fact and state bytes written only by the anchor adapter."

describe("the taught refusal payloads", () => {
  test("the walk finds the shipped minting sites", () => {
    expect(countTaughtPayloads(renderTaughtPayloads(files, readSource))).toBeGreaterThan(0)
  })

  test("the committed manifest is byte-identical to a fresh walk", async () => {
    expect(checkTaughtPayloads(
      await Bun.file(resolve(repository, MANIFEST_PATH)).text(),
      renderTaughtPayloads(files, readSource),
    ).ok).toBe(true)
  })

  test("editing one taught note at one minting site moves the manifest", () => {
    const original = readSource(MUTATED_FILE)
    expect(original).toContain(MUTATED_NOTE)
    const mutated = renderTaughtPayloads(files, (file) =>
      file === MUTATED_FILE
        ? original.replace(MUTATED_NOTE, `${MUTATED_NOTE} And retry it.`)
        : readSource(file))
    const checked = checkTaughtPayloads(mutated, renderTaughtPayloads(files, readSource))
    expect(checked).toEqual({
      ok: false,
      reason: "committed taught refusal payloads failed byte-identical rendering",
    })
    expect(mutated).toContain(`${MUTATED_NOTE} And retry it.`)
  })
})
