/**
 * DEV-807: which walls are actually armed against the value the jcs seam
 * would produce for the `big-integer` canon vector?
 *
 * Two mutation shapes, because they fail at different walls:
 *   A. bytes rounded, value left exact  — the model gate's own control.
 *   B. bytes AND value rounded together — internally consistent, so it tests
 *      whether anything but the emitter pins the value itself.
 *
 * Done in memory. The committed fixture is not touched: the finding stays red
 * as evidence, per the findings-before-fixes precept.
 */
import { readFileSync } from "node:fs"

import { readKernelCorpus, CORPUS_PATH } from "../../packages/plait/scripts/kernel-corpus.js"

const source = readFileSync(CORPUS_PATH, "utf8")
const committed =
  "{\"bytes\":\"9007199254740993\",\"name\":\"big-integer\",\"record\":\"canon\",\"value\":9007199254740993}"
if (!source.includes(committed)) throw new Error("the probe did not find the vector it meant to mutate")

const attempt = (label: string, replacement: string): void => {
  console.log(`\n--- ${label} ---`)
  console.log(`  ${replacement}`)
  try {
    readKernelCorpus(source.replace(committed, replacement))
    console.log("  corpus reader: ADMITS")
  } catch (error) {
    console.log(`  corpus reader: REFUSES — ${error instanceof Error ? error.message : String(error)}`)
  }
}

console.log("=== the committed corpus reads clean ===")
readKernelCorpus(source)
console.log("  corpus reader: ADMITS (baseline)")

attempt(
  "A. bytes rounded to the jcs output, value left exact (the model gate's control)",
  "{\"bytes\":\"9007199254740992\",\"name\":\"big-integer\",\"record\":\"canon\",\"value\":9007199254740993}",
)
attempt(
  "B. bytes and value both rounded to the jcs output",
  "{\"bytes\":\"9007199254740992\",\"name\":\"big-integer\",\"record\":\"canon\",\"value\":9007199254740992}",
)

console.log("\n=== what pins the value itself ===")
const gate = readFileSync("verify/unity/run.sh", "utf8").split("\n")
gate.forEach((line, index) => {
  if (line.includes("9007199254740993") || line.includes("9007199254740992")) {
    console.log(`  verify/unity/run.sh:${index + 1}: ${line.trim()}`)
  }
})
const emit = readFileSync("verify/kernel/../unity/Unity/Emit.lean", "utf8").split("\n")
emit.forEach((line, index) => {
  if (line.includes("9007199254740993")) {
    console.log(`  verify/unity/Unity/Emit.lean:${index + 1}: ${line.trim()}`)
  }
})
const test = readFileSync("packages/plait/test/KernelCorpus.test.ts", "utf8").split("\n")
test.forEach((line, index) => {
  if (line.includes("9007199254740993")) {
    console.log(`  packages/plait/test/KernelCorpus.test.ts:${index + 1}: ${line.trim()}`)
  }
})
