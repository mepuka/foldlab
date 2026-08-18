import { resolve } from "node:path"

import {
  ARTIFACT_PATH,
  GENERATED_PATH,
  parseKernelArtifact,
  renderKernelTables,
} from "./kernel-tables.js"

const repository = resolve(import.meta.dir, "../../..")
const artifact = parseKernelArtifact(
  await Bun.file(resolve(repository, ARTIFACT_PATH)).text(),
)
await Bun.write(
  resolve(repository, GENERATED_PATH),
  renderKernelTables(artifact, ARTIFACT_PATH),
)
console.log(
  `KERNEL TABLES: wrote ${GENERATED_PATH} from ${ARTIFACT_PATH}` +
    ` (${artifact.kinds.length} kinds, ${artifact.stages.length} stages,` +
    ` ${artifact.refusals.length} refusals, ${artifact.types.length} types)`,
)
