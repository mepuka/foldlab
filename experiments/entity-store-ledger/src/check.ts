import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { assertLedgerMatches } from "./compare.ts"
import { extractLedger, verifyLeanBuilds } from "./extract.ts"
import { committedLedgerPath } from "./paths.ts"

type Progress = (message: string) => void

export const checkCommittedLedger = (progress: Progress = () => {}): number => {
  verifyLeanBuilds(progress)
  const temporaryRoot = mkdtempSync(join(tmpdir(), "entity-store-ledger-check-"))
  try {
    const regeneratedPath = join(temporaryRoot, "LEDGER.md")
    writeFileSync(regeneratedPath, extractLedger(progress), "utf8")
    const regenerated = readFileSync(regeneratedPath)
    assertLedgerMatches(committedLedgerPath, regenerated)
    return regenerated.byteLength
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  try {
    const bytes = checkCommittedLedger(console.log)
    console.log(`committed LEDGER.md matches fresh extraction (${bytes} bytes)`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
