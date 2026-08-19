/**
 * The one-canonicalizer wall's negative control.
 *
 * The wall is a scan, and a scan that matches nothing passes over an empty
 * tree just as happily as over a clean one. So the control plants the twin the
 * wall exists to refuse — the committed mutant at
 * `negative-controls/OneCanonicalizer.private-twin.mutant.ts` — copied into
 * `src/truth/` under the twin's own retired path, runs the wall against it, and
 * restores the tree whatever happens. A green run means the wall went red for
 * the committed reason and the tree came back byte for byte.
 *
 * Both arms of the plant are checked, because they fail for different repairs:
 * the retired path exists again, and the module carries the canonicalizer
 * signature under the retired name.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { RETIRED_TWINS } from "./one-canonicalizer.js"

const packageRoot = resolve(import.meta.dir, "..")
const mutantSource = resolve(packageRoot, "negative-controls/OneCanonicalizer.private-twin.mutant.ts")
const plantedAt = RETIRED_TWINS[0]
const planted = resolve(packageRoot, plantedAt)

const fail = (reason: string): never => {
  console.error(`ONE CANONICALIZER CONTROL: FAIL — ${reason}`)
  process.exit(1)
}

if (existsSync(planted)) {
  fail(`${plantedAt} already exists; the control refuses to overwrite a tracked file`)
}

let output: string
let exitCode: number
try {
  writeFileSync(planted, readFileSync(mutantSource, "utf8"))
  const run = Bun.spawnSync({
    cmd: ["bun", "scripts/check-one-canonicalizer.ts"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  output = `${run.stdout.toString()}${run.stderr.toString()}`
  exitCode = run.exitCode
} finally {
  rmSync(planted, { force: true })
}

if (existsSync(planted)) fail("the planted twin survived the run; the tree is not restored")
if (exitCode === 0) fail("the planted private twin was accepted")

const required = [
  `${plantedAt}:0`,
  "the module exists again",
  "A twin retired by DEV-804 slice C does not come back.",
  "a member sort beside a JSON serializer is a second one",
  "CanonicalJson",
]
const missing = required.filter((fragment) => !output.includes(fragment))
if (missing.length > 0) {
  console.error("--- wall output ---")
  console.error(output)
  fail(`the refusal did not name ${missing.join(", ")}`)
}

console.log(
  `ONE CANONICALIZER CONTROL: PASS (planted twin at ${plantedAt} refused on both arms,` +
    " tree restored)",
)
