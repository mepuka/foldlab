import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const experimentDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..")
export const repositoryRoot = resolve(experimentDirectory, "../..")
export const modelDirectory = join(repositoryRoot, "formal", "entity-store")
export const shellDirectory = join(repositoryRoot, "experiments", "entity-store-shell")
export const committedLedgerPath = join(repositoryRoot, "docs", "entity-store", "LEDGER.md")
export const lakePath = join(homedir(), ".elan", "bin", "lake")
