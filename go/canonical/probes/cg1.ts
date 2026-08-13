import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { entryDigest, GENESIS } from "../../../proto/ts/src/jcs.ts"

interface Vector {
  readonly goInvalidUtf8Hex: readonly [string, string]
  readonly tsLoneSurrogate: string
  readonly tsReplacementScalar: string
}

const vector = JSON.parse(
  readFileSync(resolve(import.meta.dir, "cg1-vector.json"), "utf8"),
) as Vector
const goModule = resolve(import.meta.dir, "../..")
const goProbe = Bun.spawnSync({
  cmd: [
    "go",
    "run",
    "./canonical/probes/cg1-go",
    vector.goInvalidUtf8Hex[0],
    vector.goInvalidUtf8Hex[1],
  ],
  cwd: goModule,
  stdout: "pipe",
  stderr: "pipe",
})
const goOutput = goProbe.stdout.toString().trim()
if (goOutput.length > 0) console.log(goOutput)
if (goProbe.exitCode !== 0) {
  console.error(goProbe.stderr.toString().trim())
  process.exit(goProbe.exitCode)
}
if (
  !goOutput.includes("go-invalid-ff-refused=true field=payload") ||
  !goOutput.includes("go-invalid-fe-refused=true field=payload")
) {
  console.error("CG1 gate: Go did not return typed invalid-UTF-8 refusals")
  process.exit(2)
}

try {
  entryDigest({ seq: 0, prev: GENESIS, payload: vector.tsLoneSurrogate })
  console.error("CG1 gate: proto/ts entryDigest accepted a lone surrogate")
  process.exit(1)
} catch (error) {
  console.log(`ts-lone-surrogate-refused=true error=${String(error)}`)
}

const replacementDigest = entryDigest({
  seq: 0,
  prev: GENESIS,
  payload: vector.tsReplacementScalar,
})
console.log(`ts-replacement-scalar-digest=${replacementDigest}`)
console.log("CG1 GATE PASS: both identity implementations refuse outside their Unicode domain")
