import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import {
  GENERATE_COMMAND,
  MANIFEST_PATH,
  SOURCE_ROOT,
  checkTaughtPayloads,
  countTaughtPayloads,
  renderTaughtPayloads,
  sourceFiles,
} from "./refusal-payloads.js"

const repository = resolve(import.meta.dir, "../../..")
const root = resolve(repository, SOURCE_ROOT)
const rendered = renderTaughtPayloads(
  sourceFiles(root),
  (file) => readFileSync(resolve(root, file), "utf8"),
)

// A walk that found nothing would byte-compare an empty manifest against an
// empty manifest and report green over no wall at all.
const payloads = countTaughtPayloads(rendered)
if (payloads === 0) {
  console.error(`REFUSAL PAYLOADS: FAIL — the walk over ${SOURCE_ROOT} found no taught payload`)
  process.exit(1)
}

const manifest = resolve(repository, MANIFEST_PATH)
if (process.argv.includes("--write")) {
  await Bun.write(manifest, rendered)
  console.log(`REFUSAL PAYLOADS: wrote ${MANIFEST_PATH} (${payloads} taught payloads)`)
} else {
  const file = Bun.file(manifest)
  const committed = await file.exists() ? await file.text() : ""
  const checked = checkTaughtPayloads(committed, rendered)
  if (!checked.ok) {
    console.error(`REFUSAL PAYLOADS: FAIL — ${checked.reason}`)
    console.error(`  regenerate with: ${GENERATE_COMMAND}`)
    console.error("--- committed ---")
    console.error(committed)
    console.error("--- rendered ---")
    console.error(rendered)
    process.exit(1)
  }
  console.log(`REFUSAL PAYLOADS: PASS (${payloads} taught payloads pinned byte for byte)`)
}
