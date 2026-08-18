import { resolve } from "node:path"

import { loadKernelCorpus } from "./kernel-corpus.js"
import {
  ARTIFACT_PATH,
  GENERATE_COMMAND,
  GENERATED_PATH,
  checkKernelTables,
} from "./kernel-tables.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const committed = await Bun.file(resolve(repository, GENERATED_PATH)).text()
const checked = checkKernelTables(committed, corpus, ARTIFACT_PATH)
if (!checked.ok) {
  console.error(`KERNEL TABLES: FAIL - ${checked.reason}`)
  console.error(`  regenerate with: ${GENERATE_COMMAND}`)
  process.exit(1)
}
console.log(`KERNEL TABLES: PASS (byte-identical regeneration from ${ARTIFACT_PATH})`)
