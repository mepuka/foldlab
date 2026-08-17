import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const tracePath = resolve(packageRoot, "negative-controls/PublicEffects.value-union.trace.txt")
const run = Bun.spawnSync({
  cmd: ["bunx", "tsc", "-p", "tsconfig.negative-control.json", "--noEmit", "--pretty", "false"],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

if (run.exitCode === 0) {
  console.error("PUBLIC EFFECT CONTROL: FAIL — the planted value-union export typechecked")
  process.exit(1)
}

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
const expected = normalize(await Bun.file(tracePath).text())
if (actual !== expected) {
  console.error("PUBLIC EFFECT CONTROL: FAIL — compiler trace moved")
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

console.log("PUBLIC EFFECT CONTROL: PASS (value-union export refused)")
