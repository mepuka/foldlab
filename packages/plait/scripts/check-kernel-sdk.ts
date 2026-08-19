/**
 * The plain-TypeScript SDK's byte wall.
 *
 * Three clauses, and each catches something the others cannot.
 *
 * **Determinism.** Two consecutive renderings of one corpus are byte-equal. A
 * generator that reached for a clock, a hash seed, or an unordered map would
 * pass a committed comparison on the run that wrote the file and fail here.
 *
 * **Served equals derived.** The committed bytes equal a fresh rendering. This
 * is the clause a hand edit trips, and the reason the surface can be read as
 * the model rather than as a file someone maintains.
 *
 * **Provenance is a digest.** The committed header names the corpus this
 * reading hashed to, so the file says which bytes it came from and a reader can
 * check that claim rather than trust it. A path would have been a hope.
 */
import { resolve } from "node:path"

import { CORPUS_PATH, loadKernelCorpus } from "./kernel-corpus.js"
import {
  GENERATE_SDK_COMMAND,
  GENERATED_SDK_PATH,
  checkKernelSdk,
  renderKernelSdk,
} from "./kernel-sdk.js"

const repository = resolve(import.meta.dir, "../../..")

// Annotated at the binding, not only at the arrow, so that TypeScript reads a
// bare `fail(...)` as control flow that does not return and narrows after it.
const fail: (reason: string) => never = (reason) => {
  console.error(`KERNEL SDK: FAIL - ${reason}`)
  console.error(`  regenerate with: ${GENERATE_SDK_COMMAND}`)
  return process.exit(1)
}

const corpus = await loadKernelCorpus(repository)

const first = renderKernelSdk(corpus)
const second = renderKernelSdk(corpus)
if (first !== second) fail("two consecutive renderings of one corpus differ")

const committed = await Bun.file(resolve(repository, GENERATED_SDK_PATH)).text()
const checked = checkKernelSdk(committed, corpus)
if (!checked.ok) fail(checked.reason)

const provenance = `Corpus:  ${corpus.digest}`
if (!committed.includes(provenance)) {
  fail(`the committed surface does not name the corpus digest this reading hashed to`)
}

console.log(
  `KERNEL SDK: PASS (byte-identical regeneration of ${GENERATED_SDK_PATH} from ${CORPUS_PATH},`
    + ` two renderings byte-equal, provenance carried as the corpus digest)`,
)
