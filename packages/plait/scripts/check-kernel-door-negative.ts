/**
 * The one-door wall's control arm.
 *
 * Runs the planted mutant and requires it to be refused for the reasons
 * committed beside it. Two ways to fail: the mutant is accepted, which means a
 * clause stopped refusing; or the trace moved, which means a clause now refuses
 * for a different reason than the one this control claims. A control that could
 * go green on either is a control that names no law.
 *
 * The trace is recorded by EXECUTING the mutant (`--write`), never transcribed:
 * the committed reasons are the ones the production law actually raised.
 */
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const mutant = "negative-controls/KernelDoor.second-door.mutant.ts"
const trace = "negative-controls/KernelDoor.second-door.trace.txt"

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const write = process.argv.includes("--write")

const run = Bun.spawnSync({
  cmd: ["bun", mutant],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

if (run.exitCode === 0) {
  console.error("ONE DOOR CONTROL: FAIL — a planted second door was accepted")
  console.error(normalize(`${run.stdout.toString()}${run.stderr.toString()}`))
  process.exit(1)
}

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)

if (write) {
  await Bun.write(resolve(packageRoot, trace), actual)
  console.log(`ONE DOOR CONTROL: wrote ${trace}`)
} else {
  const expected = normalize(await Bun.file(resolve(packageRoot, trace)).text())
  if (actual !== expected) {
    console.error("ONE DOOR CONTROL: FAIL — named refusal trace moved")
    console.error("--- expected ---")
    console.error(expected)
    console.error("--- actual ---")
    console.error(actual)
    process.exit(1)
  }
  const clauses = expected.split("\n").filter((line) => line !== "").length
  console.log(
    `ONE DOOR CONTROL: PASS (${clauses} planted second-door spellings refused,`
      + " each for its committed reason)",
  )
}
