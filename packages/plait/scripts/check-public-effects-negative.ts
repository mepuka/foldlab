import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")

const controls = [
  {
    name: "value-union export",
    project: "tsconfig.negative-control.json",
    trace: "negative-controls/PublicEffects.value-union.trace.txt",
  },
  {
    name: "new non-Refusal Effect export",
    project: "tsconfig.negative-new-export.json",
    trace: "negative-controls/PublicEffects.new-export.trace.txt",
  },
  {
    name: "FabricClient class layer",
    project: "tsconfig.negative-fabric-client.json",
    trace: "negative-controls/PublicEffects.fabric-client.trace.txt",
  },
] as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

for (const control of controls) {
  const run = Bun.spawnSync({
    cmd: ["bunx", "tsc", "-p", control.project, "--noEmit", "--pretty", "false"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })

  if (run.exitCode === 0) {
    console.error(`PUBLIC EFFECT CONTROL: FAIL — ${control.name} typechecked`)
    process.exit(1)
  }

  const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
  const expected = normalize(await Bun.file(resolve(packageRoot, control.trace)).text())
  if (actual !== expected) {
    console.error(`PUBLIC EFFECT CONTROL: FAIL — ${control.name} compiler trace moved`)
    console.error("--- expected ---")
    console.error(expected)
    console.error("--- actual ---")
    console.error(actual)
    process.exit(1)
  }
}

console.log("PUBLIC EFFECT CONTROL: PASS (three public-surface regressions refused)")
