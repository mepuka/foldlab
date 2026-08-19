import { resolve } from "node:path"

import { loadKernelCorpus } from "./kernel-corpus.js"
import {
  ARTIFACT_PATH,
  GENERATED_PATH,
  REFUSAL_KINDS_PATH,
  renderKernelTables,
  renderRefusalKinds,
} from "./kernel-tables.js"

const repository = resolve(import.meta.dir, "../../..")
const corpus = await loadKernelCorpus(repository)
await Bun.write(
  resolve(repository, GENERATED_PATH),
  renderKernelTables(corpus),
)
await Bun.write(
  resolve(repository, REFUSAL_KINDS_PATH),
  renderRefusalKinds(corpus),
)
console.log(
  `KERNEL TABLES: wrote ${GENERATED_PATH} and ${REFUSAL_KINDS_PATH} from ${ARTIFACT_PATH}` +
    ` (${corpus.kinds.length} kinds, ${corpus.stages.length} stages,` +
    ` ${corpus.refusals.length} refusals, ${corpus.types.length} types)`,
)
