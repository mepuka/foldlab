import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import {
  GENERATED_BUILDER_PATH,
  builderGenerators,
  renderKernelBuilder,
} from "./kernel-builder.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
const generators = builderGenerators(corpus)
await Bun.write(
  resolve(repository, GENERATED_BUILDER_PATH),
  renderKernelBuilder(corpus, CORPUS_PATH),
)
console.log(
  `KERNEL BUILDER: wrote ${GENERATED_BUILDER_PATH} from ${CORPUS_PATH}` +
    ` (${generators.length} generators,` +
    ` ${generators.reduce((total, generator) => total + generator.fields.length, 0)} fields)`,
)
