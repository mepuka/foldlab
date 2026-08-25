import { afterAll, expect, test } from "bun:test"
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assertLedgerMatches } from "../src/compare.ts"

const roots: Array<string> = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

test("a mutated committed ledger fails the byte comparison", () => {
  const root = mkdtempSync(join(tmpdir(), "entity-store-ledger-drift-"))
  roots.push(root)
  const source = new URL("fixtures/expected-ledger.md", import.meta.url).pathname
  const committed = join(root, "LEDGER.md")
  copyFileSync(source, committed)
  const expected = readFileSync(committed)
  writeFileSync(committed, Buffer.concat([expected, Buffer.from("mutated\n")]))

  expect(() => assertLedgerMatches(committed, expected)).toThrow(
    /ledger-drift: committed LEDGER\.md differs from fresh extraction/
  )
})
