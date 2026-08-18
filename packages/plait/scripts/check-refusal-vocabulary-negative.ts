import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const mutant = "negative-controls/RefusalVocabulary.hand-minted.mutant.ts"
const trace = "negative-controls/RefusalVocabulary.hand-minted.trace.txt"

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const run = Bun.spawnSync({
  cmd: ["bun", mutant],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

if (run.exitCode === 0) {
  console.error("REFUSAL VOCABULARY CONTROL: FAIL — hand-minted mutant was accepted")
  process.exit(1)
}

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
const expected = normalize(await Bun.file(resolve(packageRoot, trace)).text())
if (actual !== expected) {
  console.error("REFUSAL VOCABULARY CONTROL: FAIL — named refusal trace moved")
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

console.log(
  "REFUSAL VOCABULARY CONTROL: PASS (planted hand-minted kind refused for the committed reason)",
)
