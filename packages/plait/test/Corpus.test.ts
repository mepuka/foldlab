import { describe, expect, test } from "bun:test"

import { checkCorpus, generateCorpus } from "../scripts/corpus.js"

describe("generated envelope corpus", () => {
  test("names its generation command on the first line", () => {
    expect(generateCorpus().split("\n", 1)[0]).toBe(
      '{"provenance":"bun run generate:corpus"}',
    )
  })

  test("the regeneration diff refuses a hand-edited row", () => {
    const mutated = generateCorpus().replace("seat-alpha", "seat-edited")
    const checked = checkCorpus(mutated)

    expect(checked.ok).toBe(false)
    if (checked.ok) throw new Error("hand-edited corpus was accepted")
    expect(checked.reason).toContain("byte-identical regeneration")
  })
})
