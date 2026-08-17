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
  {
    name: "Stream error inside Effect success",
    project: "tsconfig.negative-stream-success.json",
    trace: "negative-controls/PublicEffects.stream-success.trace.txt",
  },
  {
    name: "plain Effect value export",
    project: "tsconfig.negative-effect-value.json",
    trace: "negative-controls/PublicEffects.effect-value.trace.txt",
  },
  {
    name: "curried data-last Effect operation",
    project: "tsconfig.negative-curried.json",
    trace: "negative-controls/PublicEffects.curried.trace.txt",
  },
  {
    name: "deeply nested Effect operation",
    project: "tsconfig.negative-deep-object.json",
    trace: "negative-controls/PublicEffects.deep-object.trace.txt",
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

console.log("PUBLIC EFFECT CONTROL: PASS (seven public-surface regressions refused)")
