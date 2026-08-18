import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import { GENERATED_SCHEMAS_PATH, renderKernelSchemas } from "./kernel-schemas.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const rendered = renderKernelSchemas(corpus, CORPUS_PATH)
await Bun.write(resolve(repository, GENERATED_SCHEMAS_PATH), rendered)
console.log(
  `KERNEL SCHEMAS: wrote ${GENERATED_SCHEMAS_PATH} from ${CORPUS_PATH}` +
    ` (${corpus.types.length} types, ${corpus.docs.length} docstrings,` +
    ` ${corpus.encodings.length} encoding examples, ${corpus.canons.length} canon examples)`,
)
