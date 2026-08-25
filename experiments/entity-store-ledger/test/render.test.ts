import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import {
  parseHarnessReport,
  parseModelReport,
  parseShellReport
} from "../src/parse.ts"
import { renderLedger } from "../src/render.ts"

const fixture = (name: string): string =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8")

test("two renders are byte-identical and match the fixed ledger fixture", () => {
  const reports = {
    model: parseModelReport(fixture("model.log")),
    shell: parseShellReport(fixture("shell.log")),
    harness: parseHarnessReport(fixture("harness.log"))
  }
  reports.harness.scripts.reverse()

  const first = renderLedger(reports)
  const second = renderLedger(reports)

  expect(Buffer.from(first)).toEqual(Buffer.from(second))
  expect(first).toBe(fixture("expected-ledger.md"))
  expect(first.endsWith("\n")).toBe(true)
  expect(first).not.toContain("\r")
  expect(first).not.toMatch(/\/Users\/|[A-Za-z]:\\/)
  expect(first).not.toMatch(/20\d\d-\d\d-\d\dT/)
  expect(first).not.toMatch(/\b[0-9a-f]{40}\b/)
  expect(first.indexOf("01-schema-put-dedup.script")).toBeLessThan(
    first.indexOf("10-a4-constructors.script")
  )
})
