import { resolve } from "node:path"

import { checkCorpus } from "./corpus.js"

const target = resolve(import.meta.dir, "../fixtures/envelopes.ndjson")
const checked = checkCorpus(await Bun.file(target).text())
if (!checked.ok) {
  console.error(`CORPUS: FAIL — ${checked.reason}`)
  process.exit(1)
}
console.log("CORPUS: PASS (byte-identical regeneration)")
