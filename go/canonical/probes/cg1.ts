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
if (!goOutput.includes("go-collision=true")) {
  console.error("CG1 Go collision no longer reproduces")
  process.exit(2)
}

try {
  const loneDigest = entryDigest({ seq: 0, prev: GENESIS, payload: vector.tsLoneSurrogate })
  const replacementDigest = entryDigest({
    seq: 0,
    prev: GENESIS,
    payload: vector.tsReplacementScalar,
  })
  console.log(`ts-lone-high-surrogate=${loneDigest}`)
  console.log(`ts-replacement-scalar=${replacementDigest}`)
  console.log("ts-lone-surrogate-accepted=true")
  console.log("CG1 RED: proto/ts entryDigest minted identity for a lone surrogate")
  process.exit(1)
} catch (error) {
  console.log(`CG1 no longer reproduces: proto/ts refused lone surrogate: ${String(error)}`)
}
