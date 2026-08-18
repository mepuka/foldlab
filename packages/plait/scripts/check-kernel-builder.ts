import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import {
  GENERATE_BUILDER_COMMAND,
  GENERATED_BUILDER_PATH,
  checkKernelBuilder,
} from "./kernel-builder.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const committed = await Bun.file(resolve(repository, GENERATED_BUILDER_PATH)).text()
const checked = checkKernelBuilder(committed, corpus, CORPUS_PATH)
if (!checked.ok) {
  console.error(`KERNEL BUILDER: FAIL - ${checked.reason}`)
  console.error(`  regenerate with: ${GENERATE_BUILDER_COMMAND}`)
  process.exit(1)
}
console.log(`KERNEL BUILDER: PASS (byte-identical regeneration from ${CORPUS_PATH})`)
