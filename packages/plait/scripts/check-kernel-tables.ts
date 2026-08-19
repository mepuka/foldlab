import { resolve } from "node:path"

import { loadKernelCorpus } from "./kernel-corpus.js"
import {
  ARTIFACT_PATH,
  GENERATE_COMMAND,
  GENERATED_PATH,
  REFUSAL_KINDS_PATH,
  checkKernelTables,
  checkRefusalKinds,
} from "./kernel-tables.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const committed = await Bun.file(resolve(repository, GENERATED_PATH)).text()
const checked = checkKernelTables(committed, corpus)
if (!checked.ok) {
  console.error(`KERNEL TABLES: FAIL - ${checked.reason}`)
  console.error(`  regenerate with: ${GENERATE_COMMAND}`)
  process.exit(1)
}
const committedKinds = await Bun.file(resolve(repository, REFUSAL_KINDS_PATH)).text()
const checkedKinds = checkRefusalKinds(committedKinds, corpus)
if (!checkedKinds.ok) {
  console.error(`KERNEL TABLES: FAIL - ${checkedKinds.reason}`)
  console.error(`  regenerate with: ${GENERATE_COMMAND}`)
  process.exit(1)
}
console.log(
  `KERNEL TABLES: PASS (byte-identical regeneration of ${GENERATED_PATH}` +
    ` and ${REFUSAL_KINDS_PATH} from ${ARTIFACT_PATH})`,
)
