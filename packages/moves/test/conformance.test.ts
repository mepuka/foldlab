/**
 * The differential wall: every corpus line was computed by executing the
 * Lean model (`verify/moves`, `lake exe oracle emit 2000`); the TS kernel
 * must reproduce each line byte-for-byte from the `moves` field alone.
 * Zero skips — a vector that cannot be decoded or replayed is a failure,
 * not an omission. Agreement is evidence, not proof: the theorems hold of
 * the instantiated model, and this wall pins the transliteration to it.
 */

import { describe, expect, test } from "bun:test"
import { decodeJson } from "@foldlab/core/jcs"
import { movesFromJson, verdictLine } from "../src/wire.ts"

const pinnedCases = 2000
const utf8 = new TextEncoder()

const raw = await Bun.file(new URL("../fixtures/moves-conformance.ndjson", import.meta.url)).text()
const lines = raw.split("\n").filter((line) => line.length > 0)

const decoded = (line: string, what: string) => {
  const result = decodeJson(utf8.encode(line))
  if (!result.ok) throw new Error(`${what}: ${result.refusal.reason}`)
  return result.value
}

describe("moves conformance corpus", () => {
  test("provenance header names the generation command", () => {
    expect(decoded(lines[0]!, "header")).toEqual({
      command: `lake exe oracle emit ${pinnedCases}`,
      format: 1,
      generator: "verify/moves oracle",
    })
  })

  test(`replays all ${pinnedCases} vectors byte-identically, zero skips`, () => {
    const vectors = lines.slice(1)
    expect(vectors.length).toBe(pinnedCases)
    let driven = 0
    for (const [index, line] of vectors.entries()) {
      const moves = movesFromJson(decoded(line, `vector ${index}`))
      const replayed = verdictLine(moves)
      if (replayed !== line) {
        throw new Error(
          `vector ${index} diverged from the model\n  moves:  ${JSON.stringify(moves)}\n  lean:   ${line}\n  kernel: ${replayed}`,
        )
      }
      driven += 1
    }
    expect(driven).toBe(pinnedCases)
  })

  test("the corpus exercises refusals, disputes, and decided holes", () => {
    let refusals = 0
    let decides = 0
    let disputes = 0
    for (const line of lines.slice(1)) {
      const verdict = decoded(line, "vector") as {
        readonly repairK: {
          readonly receipts: ReadonlyArray<boolean>
          readonly state: { readonly [hole: string]: { readonly meaning: { readonly tag: string } } }
        }
      }
      if (verdict.repairK.receipts.includes(false)) refusals += 1
      const tags = Object.values(verdict.repairK.state).map((h) => h.meaning.tag)
      if (tags.includes("decided")) decides += 1
      if (tags.includes("disputed")) disputes += 1
    }
    expect(refusals).toBeGreaterThan(100)
    expect(decides).toBeGreaterThan(20)
    expect(disputes).toBeGreaterThan(100)
  })
})
