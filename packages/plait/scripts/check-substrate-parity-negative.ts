import { resolve } from "node:path"

// The runtime sibling of check-public-effects-negative.ts: the mutant narrows
// the field set the substrate parity wall compares, and the field-set guard
// must refuse it with exactly the committed trace. A control that cannot
// fail proves nothing — if the guard accepts the narrowed shape, this
// runner reds the battery.
const packageRoot = resolve(import.meta.dir, "..")

const control = {
  name: "substrate parity field drop",
  mutant: "negative-controls/SubstrateParity.field-drop.mutant.ts",
  trace: "negative-controls/SubstrateParity.field-drop.trace.txt",
} as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const run = Bun.spawnSync({
  cmd: ["bun", control.mutant],
  cwd: packageRoot,
  stdout: "pipe",
  stderr: "pipe",
})

if (run.exitCode === 0) {
  console.error(`SUBSTRATE PARITY CONTROL: FAIL — ${control.name} mutant was accepted`)
  process.exit(1)
}

const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
const expected = normalize(await Bun.file(resolve(packageRoot, control.trace)).text())
if (actual !== expected) {
  console.error(`SUBSTRATE PARITY CONTROL: FAIL — ${control.name} refusal trace moved`)
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

console.log("SUBSTRATE PARITY CONTROL: PASS (narrowed field set refused on the committed trace)")
