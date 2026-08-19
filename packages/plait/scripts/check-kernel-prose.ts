import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import {
  PROSE_PATH,
  RENDER_PROSE_COMMAND,
  checkKernelProse,
} from "./render-kernel-prose.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const committed = await Bun.file(resolve(repository, PROSE_PATH)).text()
const checked = checkKernelProse(committed, corpus)
if (!checked.ok) {
  console.error(`KERNEL PROSE: FAIL - ${checked.reason}`)
  console.error(`  regenerate with: ${RENDER_PROSE_COMMAND}`)
  process.exit(1)
}
console.log(`KERNEL PROSE: PASS (byte-identical regeneration from ${CORPUS_PATH})`)
