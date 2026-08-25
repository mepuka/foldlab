export interface ModelTheorem {
  theorem: string
  axioms: Array<string>
}

export interface ModelReport {
  constantCount: number
  theorems: Array<ModelTheorem>
}

export interface ShellReport {
  gateLine: string
  whitelist: Array<string>
}

export interface HarnessScriptResult {
  script: string
  status: "PASS" | "FAIL"
  transcriptLines: number
}

export interface HarnessReport {
  scripts: Array<HarnessScriptResult>
  summaryLine: string
}

export class ReportParseError extends Error {
  constructor(readonly report: string, detail: string) {
    super(`${report}-report-invalid: ${detail}`)
    this.name = "ReportParseError"
  }
}

const linesOf = (text: string): Array<string> => text.replaceAll("\r\n", "\n").split("\n")

export const parseModelReport = (text: string): ModelReport => {
  const lines = linesOf(text)
  const gatePattern = /^e2 opaque\/unsafe gate ok \((\d+) constants scanned\)$/
  const start = lines.findIndex((line) => gatePattern.test(line))
  if (start < 0) throw new ReportParseError("model", "missing gate line")

  const gate = gatePattern.exec(lines[start])!
  const theorems: Array<ModelTheorem> = []
  const withAxioms = /^'(E2\.[^']+)' depends on axioms: \[([^\]]*)\]$/
  const withoutAxioms = /^'(E2\.[^']+)' does not depend on any axioms$/

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line === "" && index === lines.length - 1) continue
    const some = withAxioms.exec(line)
    if (some !== null) {
      theorems.push({
        theorem: some[1],
        axioms: some[2] === "" ? [] : some[2].split(", ")
      })
      continue
    }
    const none = withoutAxioms.exec(line)
    if (none !== null) {
      theorems.push({ theorem: none[1], axioms: [] })
      continue
    }
    throw new ReportParseError("model", `unexpected line ${index + 1}: ${line}`)
  }

  if (theorems.length === 0) throw new ReportParseError("model", "missing axiom reports")
  return { constantCount: Number(gate[1]), theorems }
}

const SHELL_GATE =
  /^shell gates ok \(\d+ constants scanned\) — G-S1 opaque\/unsafe clean; G-S2 IO confined to \[[^\]]+\]; G-S4 no core shadowing\.$/
const SHELL_WHITELIST_HEADING =
  "G-S3 — every IO/FilePath constant this package references, all whitelisted:"
const LEAN_NAME = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/

export const parseShellReport = (text: string): ShellReport => {
  const lines = linesOf(text)
  const start = lines.findIndex((line) => SHELL_GATE.test(line))
  if (start < 0) throw new ReportParseError("shell", "missing shell gate line")
  if (lines[start + 1] !== SHELL_WHITELIST_HEADING) {
    throw new ReportParseError(
      "shell",
      `unexpected line ${start + 2}: ${lines[start + 1] ?? "<missing>"}`
    )
  }

  const whitelistLine = lines[start + 2]
  const match = /^  \[([^\]]+)\]$/.exec(whitelistLine ?? "")
  if (match === null) {
    throw new ReportParseError(
      "shell",
      `unexpected line ${start + 3}: ${whitelistLine ?? "<missing>"}`
    )
  }
  const whitelist = match[1].split(", ")
  if (whitelist.some((name) => !LEAN_NAME.test(name))) {
    throw new ReportParseError("shell", "whitelist contains an invalid Lean name")
  }
  for (let index = start + 3; index < lines.length; index += 1) {
    if (lines[index] === "" && index === lines.length - 1) continue
    throw new ReportParseError("shell", `unexpected line ${index + 1}: ${lines[index]}`)
  }
  return { gateLine: lines[start], whitelist }
}

const HARNESS_RESULT = /^(PASS|FAIL) ([^\s]+\.script) \((\d+) transcript lines\)$/
const HARNESS_SUCCESS = /^harness: (\d+) scripts, all model\/disk observables identical$/
const HARNESS_FAILURE = /^harness: (\d+) of (\d+) scripts FAILED$/

export const parseHarnessReport = (text: string): HarnessReport => {
  const lines = linesOf(text)
  const start = lines.findIndex((line) => /^(?:PASS|FAIL) /.test(line))
  if (start < 0) throw new ReportParseError("harness", "missing script result lines")
  const summary = lines.findIndex(
    (line, index) => index > start && (HARNESS_SUCCESS.test(line) || HARNESS_FAILURE.test(line))
  )
  if (summary < 0) throw new ReportParseError("harness", "missing summary line")
  if (lines[summary - 1] !== "") {
    throw new ReportParseError(
      "harness",
      `unexpected line ${summary}: ${lines[summary - 1] ?? "<missing>"}`
    )
  }

  const scripts: Array<HarnessScriptResult> = []
  for (let index = start; index < summary - 1; index += 1) {
    const match = HARNESS_RESULT.exec(lines[index])
    if (match === null) {
      throw new ReportParseError("harness", `unexpected line ${index + 1}: ${lines[index]}`)
    }
    scripts.push({
      status: match[1] as HarnessScriptResult["status"],
      script: match[2],
      transcriptLines: Number(match[3])
    })
  }
  if (scripts.length === 0) throw new ReportParseError("harness", "missing script results")
  if (new Set(scripts.map((result) => result.script)).size !== scripts.length) {
    throw new ReportParseError("harness", "duplicate script result")
  }

  const summaryLine = lines[summary]
  const success = HARNESS_SUCCESS.exec(summaryLine)
  if (success !== null) {
    if (scripts.some((result) => result.status !== "PASS")) {
      throw new ReportParseError("harness", "success summary contains a failed script")
    }
    if (Number(success[1]) !== scripts.length) {
      throw new ReportParseError("harness", "success summary script count does not match results")
    }
  } else {
    const failure = HARNESS_FAILURE.exec(summaryLine)!
    const failures = scripts.filter((result) => result.status === "FAIL").length
    if (Number(failure[1]) !== failures || Number(failure[2]) !== scripts.length) {
      throw new ReportParseError("harness", "failure summary counts do not match results")
    }
  }

  return { scripts, summaryLine }
}
