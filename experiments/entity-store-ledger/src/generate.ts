import { writeFileSync } from "node:fs"
import { relative } from "node:path"
import { extractLedger } from "./extract.ts"
import { committedLedgerPath, repositoryRoot } from "./paths.ts"

export const generateCommittedLedger = (): number => {
  const ledger = extractLedger()
  const bytes = Buffer.from(ledger, "utf8")
  writeFileSync(committedLedgerPath, bytes)
  return bytes.byteLength
}

if (import.meta.main) {
  try {
    const bytes = generateCommittedLedger()
    console.log(
      `wrote ${relative(repositoryRoot, committedLedgerPath)} from fresh reports (${bytes} bytes)`
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
