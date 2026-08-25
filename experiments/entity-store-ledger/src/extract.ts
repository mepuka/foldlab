import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { runLake } from "./command.ts"
import { parseHarnessReport, parseModelReport, parseShellReport } from "./parse.ts"
import { modelDirectory, shellDirectory } from "./paths.ts"
import { renderLedger } from "./render.ts"

type Progress = (message: string) => void

const quiet: Progress = () => {}

export const extractLedger = (progress: Progress = quiet): string => {
  const model = parseModelReport(
    runLake(["env", "lean", "E2/Gates.lean"], modelDirectory)
  )
  progress("fresh model gate report parsed")
  const shell = parseShellReport(
    runLake(["env", "lean", "Shell/Gate.lean"], shellDirectory)
  )
  progress("fresh shell gate report parsed")

  const harnessWork = mkdtempSync(join(tmpdir(), "entity-store-ledger-harness-"))
  try {
    const harness = parseHarnessReport(
      runLake(["exe", "harness", "harness", harnessWork], shellDirectory)
    )
    progress("fresh harness report parsed")
    return renderLedger({ model, shell, harness })
  } finally {
    rmSync(harnessWork, { recursive: true, force: true })
  }
}

export const verifyLeanBuilds = (progress: Progress = quiet): void => {
  progress("building formal/entity-store with ~/.elan/bin/lake build")
  runLake(["build"], modelDirectory)
  progress("formal/entity-store build passed")
  progress("building experiments/entity-store-shell with ~/.elan/bin/lake build")
  runLake(["build"], shellDirectory)
  progress("experiments/entity-store-shell build passed")
}
