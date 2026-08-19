import { resolve } from "node:path"

import {
  CANONICALIZER_HOME,
  formatFindings,
  inspectOneCanonicalizer,
} from "./one-canonicalizer.js"

const packageRoot = resolve(import.meta.dir, "..")
const findings = inspectOneCanonicalizer(packageRoot)

if (findings.length > 0) {
  console.error(`ONE CANONICALIZER: FAIL — ${findings.length} second canonicalizer(s) under src/`)
  console.error(formatFindings(findings))
  process.exit(1)
}

console.log(
  `ONE CANONICALIZER: PASS (no canonical-JSON encoder under src/ outside ${CANONICALIZER_HOME})`,
)
