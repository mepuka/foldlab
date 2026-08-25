import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { extractLedger } from "../src/extract.ts"

test("two fresh end-to-end extractions are byte-identical", () => {
  const first = extractLedger()
  const second = extractLedger()
  const expected = readFileSync(
    new URL("fixtures/expected-ledger.md", import.meta.url),
    "utf8"
  )

  expect(Buffer.from(first)).toEqual(Buffer.from(second))
  expect(first).toBe(expected)
}, 60_000)
