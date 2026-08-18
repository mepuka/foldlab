import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import {
  GENERATE_SCHEMAS_COMMAND,
  GENERATED_SCHEMAS_PATH,
  checkKernelSchemas,
} from "./kernel-schemas.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const committed = await Bun.file(resolve(repository, GENERATED_SCHEMAS_PATH)).text()
const checked = checkKernelSchemas(committed, corpus, CORPUS_PATH)
if (!checked.ok) {
  console.error(`KERNEL SCHEMAS: FAIL - ${checked.reason}`)
  console.error(`  regenerate with: ${GENERATE_SCHEMAS_COMMAND}`)
  process.exit(1)
}
console.log(`KERNEL SCHEMAS: PASS (byte-identical regeneration from ${CORPUS_PATH})`)
