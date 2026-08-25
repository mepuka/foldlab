import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import {
  parseHarnessReport,
  parseModelReport,
  parseShellReport
} from "../src/parse.ts"

const fixture = (name: string): string =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8")

test("an unexpected line inside the model report is refused", () => {
  expect(() => parseModelReport(fixture("model-unexpected.log"))).toThrow(
    "model-report-invalid: unexpected line 3: this line is not part of the model report format"
  )
})

test("the model report preserves the gate block's theorem order", () => {
  const report = parseModelReport(fixture("model.log"))

  expect(report.constantCount).toBe(1444)
  expect(report.theorems[0]).toEqual({
    theorem: "E2.Correspondence.tags_distinct",
    axioms: []
  })
  expect(report.theorems.at(-1)).toEqual({
    theorem: "E2.M12E_dedup",
    axioms: ["propext", "Classical.choice", "Quot.sound"]
  })
})

test("the shell report retains the gate line and enumerates the whitelist", () => {
  const report = parseShellReport(fixture("shell.log"))

  expect(report.gateLine).toStartWith("shell gates ok (884 constants scanned)")
  expect(report.whitelist).toEqual([
    "BaseIO",
    "EIO",
    "IO",
    "IO.Error",
    "IO.FS.DirEntry",
    "IO.FS.DirEntry.fileName",
    "IO.FS.DirEntry.path",
    "IO.FS.createDirAll",
    "IO.FS.readBinFile",
    "IO.FS.rename",
    "IO.FS.writeBinFile",
    "IO.eprintln",
    "IO.println",
    "System.FilePath",
    "System.FilePath._sizeOf_inst",
    "System.FilePath.instDiv",
    "System.FilePath.instHDivString",
    "System.FilePath.mk",
    "System.FilePath.pathExists",
    "System.FilePath.readDir"
  ])
})

test("the harness report captures every script result and summary", () => {
  const report = parseHarnessReport(fixture("harness.log"))

  expect(report.scripts).toHaveLength(10)
  expect(report.scripts[0]).toEqual({
    script: "01-schema-put-dedup.script",
    status: "PASS",
    transcriptLines: 12
  })
  expect(report.summaryLine).toBe(
    "harness: 10 scripts, all model/disk observables identical"
  )
})
