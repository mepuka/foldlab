import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { entryDigest, GENESIS } from "../../../proto/ts/src/jcs.ts"

interface Vector {
  readonly goInvalidUtf8Hex: readonly [string, string]
  readonly invalidSequence: readonly [number, number]
  readonly validSequenceBoundary: readonly [number, number]
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
    String(vector.invalidSequence[0]),
    String(vector.invalidSequence[1]),
    String(vector.validSequenceBoundary[1]),
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
for (const seq of vector.invalidSequence) {
  if (!goOutput.includes(`go-invalid-sequence-refused=true seq=${seq}`)) {
    console.error(`CG1 gate: Go did not return typed invalid-sequence refusal for ${seq}`)
    process.exit(2)
  }
}

const loneSurrogate = entryDigest({ seq: 0, prev: GENESIS, payload: vector.tsLoneSurrogate })
if (loneSurrogate.ok) {
  console.error("CG1 gate: proto/ts entryDigest accepted a lone surrogate")
  process.exit(1)
}
if (loneSurrogate.refusal._tag !== "InvalidUnicode" || loneSurrogate.refusal.field !== "payload") {
  console.error("CG1 gate: proto/ts entryDigest did not return the typed Unicode refusal")
  process.exit(2)
}
console.log(
  `ts-lone-surrogate-refused=true tag=${loneSurrogate.refusal._tag} field=${loneSurrogate.refusal.field} reason=${loneSurrogate.refusal.reason}`,
)

for (const seq of vector.invalidSequence) {
  const result = entryDigest({ seq, prev: GENESIS, payload: "valid" })
  if (result.ok || result.refusal._tag !== "InvalidSequence") {
    console.error(`CG1 gate: proto/ts did not return typed invalid-sequence refusal for ${seq}`)
    process.exit(2)
  }
  console.log(`ts-invalid-sequence-refused=true tag=${result.refusal._tag} seq=${seq}`)
}

const validMaxSeq = vector.validSequenceBoundary[1]
const validMax = entryDigest({ seq: validMaxSeq, prev: GENESIS, payload: "valid" })
if (!validMax.ok) {
  console.error(`CG1 gate: proto/ts refused valid max sequence ${validMaxSeq}`)
  process.exit(2)
}
if (!goOutput.includes(`go-valid-max-sequence-digest=${validMax.digest} seq=${validMaxSeq}`)) {
  console.error("CG1 gate: Go and proto/ts disagree at the valid max sequence boundary")
  process.exit(2)
}
console.log(`cross-language-valid-max-sequence-digest=${validMax.digest} seq=${validMaxSeq}`)

const replacement = entryDigest({
  seq: 0,
  prev: GENESIS,
  payload: vector.tsReplacementScalar,
})
if (!replacement.ok) {
  console.error(`CG1 gate: proto/ts refused the replacement scalar: ${replacement.refusal.reason}`)
  process.exit(2)
}
console.log(`ts-replacement-scalar-digest=${replacement.digest}`)
console.log("CG1 GATE PASS: both identity implementations agree on their Unicode and sequence domains")
