/**
 * The tool-schema parity wall's executed control: a single mutated byte in
 * the package copy must redden the check for its named reason, and the
 * restoration must return the wall to green. A parity check that has never
 * been seen red proves consensus, not parity.
 */
import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const packageCopy = resolve(packageRoot, "fixtures/tools.schema.json")

const original = readFileSync(packageCopy, "utf8")

const runCheck = (): { readonly status: number; readonly output: string } => {
  const result = spawnSync("bun", [resolve(import.meta.dir, "check-kernel-tools.ts")], {
    cwd: packageRoot,
    encoding: "utf8",
  })
  return { status: result.status ?? 1, output: `${result.stdout}${result.stderr}` }
}

const fail = (reason: string): never => {
  writeFileSync(packageCopy, original)
  console.error(`KERNEL TOOLS CONTROL: FAIL — ${reason}`)
  process.exit(1)
}

const before = runCheck()
if (before.status !== 0) fail("the wall is red before any mutation; nothing was planted")

writeFileSync(packageCopy, original.replace("kernel_declare", "kernel_declrae"))
const mutated = runCheck()
if (mutated.status === 0) fail("a mutated package copy passed the parity wall")
if (!mutated.output.includes("diverges from the model's emission")) {
  fail("the mutated copy was refused for the wrong reason")
}

writeFileSync(packageCopy, original)
const after = runCheck()
if (after.status !== 0) fail("the wall did not return to green after restoration")

console.log(
  "KERNEL TOOLS CONTROL: PASS (one mutated byte reddens the parity wall for its named reason; restoration returns green)",
)
