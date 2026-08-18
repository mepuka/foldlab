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

console.log(
  "PLANE LAYERING CONTROL: PASS (planted value and type-only shallower imports"
    + " refused for the committed reason)",
)
