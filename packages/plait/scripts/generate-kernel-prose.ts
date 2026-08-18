import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import { PROSE_PATH, renderKernelProse } from "./render-kernel-prose.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const rendered = renderKernelProse(corpus, CORPUS_PATH)
await Bun.write(resolve(repository, PROSE_PATH), rendered)
console.log(
  `KERNEL PROSE: wrote ${PROSE_PATH} from ${CORPUS_PATH}` +
    ` (${corpus.refusals.length} refusals, ${corpus.types.length} types,` +
    ` ${corpus.docs.length} docstrings, ${corpus.canons.length} canon vectors,` +
    ` ${corpus.programs.length} program vectors)`,
)
