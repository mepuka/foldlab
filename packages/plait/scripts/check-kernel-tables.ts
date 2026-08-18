import { resolve } from "node:path"

import {
  ARTIFACT_PATH,
  GENERATED_PATH,
  checkKernelTables,
  parseKernelArtifact,
} from "./kernel-tables.js"

const repository = resolve(import.meta.dir, "../../..")
const artifact = parseKernelArtifact(
  await Bun.file(resolve(repository, ARTIFACT_PATH)).text(),
)
const committed = await Bun.file(resolve(repository, GENERATED_PATH)).text()
const checked = checkKernelTables(committed, artifact, ARTIFACT_PATH)
if (!checked.ok) {
  console.error(`KERNEL TABLES: FAIL - ${checked.reason}`)
  console.error(`  regenerate with: bun run generate:kernel-tables`)
  process.exit(1)
}
console.log(
  `KERNEL TABLES: PASS (byte-identical regeneration from ${ARTIFACT_PATH})`,
)
