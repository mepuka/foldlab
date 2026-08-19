/**
 * The plain-TypeScript SDK's mutation arm.
 *
 * Every plant is made in the *bytes of the corpus the production generator
 * reads*, then read back through the production reader and rendered by the
 * production renderer. Nothing here re-states the projection or hands the
 * renderer a built argument: each arm differs from the green run by exactly
 * the one mutation it names.
 *
 * The comparison masks the corpus digest, on both the header line and the
 * provenance record, and that mask is what makes the arms mean anything. Any
 * byte moved in the corpus moves its digest, so an unmasked comparison would
 * redden for every plant whether or not the plant ever reached the surface -
 * which would prove the digest changed and nothing else.
 *
 * Three arms that must move the surface:
 *
 * 1. **A docstring.** One word of the prose the model attaches to a type. The
 *    SDK carries that prose as the doc comment a reader reads, so a model
 *    sentence edited anywhere reaches this file or the file is not derived
 *    from it.
 * 2. **A taught repair.** One word of the legal next move a refusal teaches.
 *    This is the drift class the sketch actually suffered: three of its
 *    sixteen taught texts had gone stale because nothing watched them.
 * 3. **A candidate field name.** The projection table names the fields it
 *    fills; the generator compares that list against the model's own, in
 *    order, and refuses to render at all rather than silently dropping an
 *    argument into the wrong slot.
 *
 * And one arm that must NOT move it:
 *
 * 4. **An encoding vector's name.** A real corpus edit this surface does not
 *    project. A wall that reddened here would be reddening on any change
 *    rather than on a vocabulary change, and its three green arms above would
 *    say nothing.
 */
import { resolve } from "node:path"

import { CORPUS_PATH, readKernelCorpus } from "../scripts/kernel-corpus.js"
import { renderKernelSdk } from "../scripts/kernel-sdk.js"

const repository = resolve(import.meta.dir, "../../..")

const abandon = (reason: string): never => {
  console.error(`KERNEL SDK MUTANT: ${reason}`)
  return process.exit(0)
}

/** The corpus digest, masked wherever the surface renders it. */
const maskProvenance = (rendered: string): string =>
  rendered
    .replace(/^ \* Corpus:  [0-9a-f]{64}$/m, " * Corpus:  <masked>")
    .replace(/^ {2}corpus: "[0-9a-f]{64}",$/m, "  corpus: \"<masked>\",")

const source = await Bun.file(resolve(repository, CORPUS_PATH)).text()
const clean = maskProvenance(renderKernelSdk(readKernelCorpus(source)))

const plant = (arm: string, was: string, now: string): string => {
  if (!source.includes(was)) return abandon(`the corpus does not carry the ${arm} plant site`)
  const mutated = source.replace(was, now)
  if (mutated === source) return abandon(`the ${arm} plant changed nothing`)
  let rendered: string
  try {
    rendered = maskProvenance(renderKernelSdk(readKernelCorpus(mutated)))
  } catch (cause) {
    // The generator refused to render at all. That is a refusal, not a crash:
    // the arm is judged by whether the surface could have shipped the plant.
    return cause instanceof Error ? cause.message : String(cause)
  }
  if (rendered === clean) return abandon(`the ${arm} plant was accepted`)
  const before = clean.split("\n")
  const after = rendered.split("\n")
  const at = before.findIndex((line, index) => line !== after[index])
  return `${arm}\n  was  ${before[at] ?? "<absent>"}\n  now  ${after[at] ?? "<absent>"}`
}

console.error(plant(
  "a model docstring",
  "A lane partition: the venue-local shard of an evidence stream.",
  "A lane partition: the venue-local slice of an evidence stream.",
))
console.error(plant(
  "a taught repair",
  "declare the merge algebra; idempotent join leaves nothing for arrival order to choose",
  "declare the merge algebra; idempotent join leaves nothing for arrival order to pick",
))
console.error(plant(
  "a candidate field name",
  "{\"name\":\"outcome\",\"type\":\"List(RawArg)\"}",
  "{\"name\":\"outcomes\",\"type\":\"List(RawArg)\"}",
))

// The discrimination arm. It is judged the other way round: a corpus edit this
// surface does not project must leave the bytes exactly where they were.
const unprojected = source.replace("\"name\":\"emit-lane\"", "\"name\":\"emit-on-lane\"")
if (unprojected === source) abandon("the corpus carries no encoding vector to rename")
if (maskProvenance(renderKernelSdk(readKernelCorpus(unprojected))) !== clean) {
  abandon("renaming an unprojected record moved the surface; the arms above prove nothing")
}
console.error("an unprojected record\n  was  <unmoved>\n  now  <unmoved>")

process.exit(1)
