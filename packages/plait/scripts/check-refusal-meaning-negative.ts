/**
 * The meaning law's control arm, executed.
 *
 * The trace is the contract: the arm has to keep failing for its own named
 * reasons, and a refusal that moves is reported as a moved trace rather than
 * absorbed. Run with `--write` to re-record it after a deliberate change — the
 * bytes come from EXECUTING the mutant, never from typing what it ought to say.
 */
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const mutant = "negative-controls/RefusalMeaning.meaningless-kind.mutant.ts"
const trace = "negative-controls/RefusalMeaning.meaningless-kind.trace.txt"

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const run = Bun.spawnSync({
  cmd: ["bun", mutant],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

if (run.exitCode === 0) {
  console.error("REFUSAL MEANING CONTROL: FAIL — meaningless mutant was accepted")
  process.exit(1)
}

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
if (process.argv.includes("--write")) {
  await Bun.write(resolve(packageRoot, trace), actual)
  console.log(`REFUSAL MEANING CONTROL: wrote ${trace}`)
  process.exit(0)
}

const expected = normalize(await Bun.file(resolve(packageRoot, trace)).text())
if (actual !== expected) {
  console.error("REFUSAL MEANING CONTROL: FAIL — named refusal trace moved")
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

console.log(
  "REFUSAL MEANING CONTROL: PASS (planted meaningless kind, marked meaning, and"
    + " paraphrased page each refused for their committed reasons)",
)
