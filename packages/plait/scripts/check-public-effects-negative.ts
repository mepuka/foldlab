import { resolve } from "node:path"

import {
  emitDeclarations,
  inspectPublicDeclarations,
} from "./public-effect-declarations.js"

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
  {
    name: "Schema-shaped fallible decode",
    project: "tsconfig.negative-schema-value.json",
    trace: "negative-controls/PublicEffects.schema-value.trace.txt",
  },
  {
    name: "plain class fallible static",
    project: "tsconfig.negative-plain-class.json",
    trace: "negative-controls/PublicEffects.plain-class.trace.txt",
  },
] as const

const declarationControls = [
  {
    name: "fallible first overload signature",
    project: "tsconfig.negative-overload-first.json",
    entry: "negative-controls/PublicEffects.overload-first.mutant.d.ts",
    trace: "negative-controls/PublicEffects.overload-first.trace.txt",
  },
  {
    name: "fallible last overload signature",
    project: "tsconfig.negative-overload-last.json",
    entry: "negative-controls/PublicEffects.overload-last.mutant.d.ts",
    trace: "negative-controls/PublicEffects.overload-last.trace.txt",
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

for (const control of declarationControls) {
  const emitted = emitDeclarations(control.project)
  let failed = false
  try {
    const actual = inspectPublicDeclarations(
      emitted.directory,
      control.entry,
      "plantedPublicApi",
    ).violations
    if (actual === "") {
      console.error(`PUBLIC EFFECT CONTROL: FAIL — ${control.name} typechecked`)
      failed = true
    } else {
      const traceFile = Bun.file(resolve(packageRoot, control.trace))
      const expected = await traceFile.exists() ? normalize(await traceFile.text()) : ""
      if (normalize(actual) !== expected) {
        console.error(`PUBLIC EFFECT CONTROL: FAIL — ${control.name} declaration trace moved`)
        console.error("--- expected ---")
        console.error(expected)
        console.error("--- actual ---")
        console.error(actual)
        failed = true
      }
    }
  } finally {
    emitted.dispose()
  }
  if (failed) process.exit(1)
}

console.log("PUBLIC EFFECT CONTROL: PASS (eleven public-surface regressions refused)")
