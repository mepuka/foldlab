/**
 * The plane-layering wall's control.
 *
 * Runs the planted mutant and requires it to be refused for the reason
 * committed in its trace. The trace is recorded by executing the mutant
 * (`bun run generate:layering-control`), never transcribed: a hand-typed
 * expectation is a second statement of the law, and the two would agree on a
 * falsehood the first time one of them was edited.
 *
 * @module
 */
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const mutant = "negative-controls/PlaneLayering.shallower-import.mutant.ts"
const trace = "negative-controls/PlaneLayering.shallower-import.trace.txt"
const marker = "PLANE LAYERING MUTANT ARM: "

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const run = Bun.spawnSync({
  cmd: ["bun", mutant],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)

if (run.exitCode === 0) {
  console.error("PLANE LAYERING CONTROL: FAIL — planted shallower imports were accepted")
  console.error(actual)
  process.exit(1)
}

if (process.argv.slice(2).includes("--write")) {
  await Bun.write(resolve(packageRoot, trace), actual)
  console.log("PLANE LAYERING CONTROL: wrote the executed refusal trace")
  process.exit(0)
}

const expected = normalize(await Bun.file(resolve(packageRoot, trace)).text())
if (actual !== expected) {
  console.error("PLANE LAYERING CONTROL: FAIL — named refusal trace moved")
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

// The arm count is counted out of the run that just happened, never asserted:
// a mutant that quietly lost an arm would otherwise still match a trace
// re-recorded beside it, and the PASS line would keep claiming the old breadth.
const arms = actual.split("\n").filter((line) => line.startsWith(marker))
if (arms.length === 0) {
  console.error("PLANE LAYERING CONTROL: FAIL — the mutant named no arm")
  process.exit(1)
}

console.log(
  `PLANE LAYERING CONTROL: PASS (${arms.length} planted arms refused for the committed`
    + ` reasons: ${arms.map((line) => line.slice(marker.length)).join(", ")})`,
)
