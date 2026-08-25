import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { extractLedger } from "../src/extract.ts"

test("two fresh end-to-end extractions are byte-identical", () => {
  const first = extractLedger()
  const second = extractLedger()
  // The live expectation is the COMMITTED ledger — the single maintained home —
  // never the pure fixture (that would be a second copy that drifts by design;
  // adjudication fix at merge). The fixture ledger belongs to the fixture-log
  // pipeline tests only.
  const committed = readFileSync(
    new URL("../../../docs/entity-store/LEDGER.md", import.meta.url),
    "utf8"
  )

  expect(Buffer.from(first)).toEqual(Buffer.from(second))
  expect(first).toBe(committed)
}, 120_000)
