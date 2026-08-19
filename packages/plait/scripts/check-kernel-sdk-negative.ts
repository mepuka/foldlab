/**
 * The plain-TypeScript SDK's control arm, executed.
 *
 * A control that merely fails is weak - almost any edit makes a script fail -
 * so the trace is compared too: the arm has to keep failing for its own named
 * reason, and a diagnostic that moves is reported as a moved trace rather than
 * absorbed.
 *
 * Run with `--write` to re-record the trace after a deliberate change.
 */
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const mutant = "negative-controls/KernelSdk.moved-corpus.mutant.ts"
const trace = "negative-controls/KernelSdk.moved-corpus.trace.txt"

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const run = Bun.spawnSync({
  cmd: ["bun", mutant],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

if (run.exitCode === 0) {
  console.error("KERNEL SDK CONTROL: FAIL - the moved-corpus mutant was accepted")
  console.error(normalize(`${run.stdout.toString()}${run.stderr.toString()}`))
  process.exit(1)
}

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
if (process.argv.includes("--write")) {
  await Bun.write(resolve(packageRoot, trace), actual)
  console.log(`KERNEL SDK CONTROL: wrote ${trace}`)
  process.exit(0)
}

const expected = normalize(await Bun.file(resolve(packageRoot, trace)).text())
if (actual !== expected) {
  console.error("KERNEL SDK CONTROL: FAIL - named refusal trace moved")
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

console.log(
  "KERNEL SDK CONTROL: PASS (a moved docstring, a moved taught repair and a moved candidate"
    + " field each reach the surface for their committed reasons; an unprojected record does"
    + " not move it)",
)
