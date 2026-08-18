import { resolve } from "node:path"

import {
  GENERATED_DIR,
  GENERATED_FILES,
  renderAll,
} from "./expressibility.js"
import { sharedOf, termBytes, termDigest, termPreimage } from "./expressibility-term.js"

const repository = resolve(import.meta.dir, "../../..")
const digest = await termDigest()
const preimage = await termPreimage()
const rendered = renderAll(sharedOf(digest), digest, preimage)

for (const name of GENERATED_FILES) {
  await Bun.write(resolve(repository, GENERATED_DIR, name), rendered.get(name)!)
}

// The count is the door's own byte length, not a string length: the two differ
// wherever the canonical form carries a character outside ASCII.
console.log(
  `EXPRESSIBILITY: wrote ${GENERATED_FILES.length} artifacts to ${GENERATED_DIR}` +
    ` (term ${digest}, ${(await termBytes()).length} canonical bytes)`,
)
