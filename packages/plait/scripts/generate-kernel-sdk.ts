import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import { GENERATED_SDK_PATH, renderKernelSdk } from "./kernel-sdk.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
await Bun.write(resolve(repository, GENERATED_SDK_PATH), renderKernelSdk(corpus))
console.log(
  `KERNEL SDK: wrote ${GENERATED_SDK_PATH} from ${CORPUS_PATH}` +
    ` (${corpus.kinds.length} kinds, ${corpus.stages.length} stages,` +
    ` ${corpus.refusals.length} refusals, ${corpus.types.length} types)`,
)
