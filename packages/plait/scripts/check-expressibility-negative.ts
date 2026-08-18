/**
 * The expressibility wall's control arm.
 *
 * A checker that has never been seen red proves nothing. This script mutates
 * the committed artifacts one at a time, runs the real wall against the mutant,
 * and requires it to refuse FOR ITS OWN NAMED REASON — a control that merely
 * fails is weak, because almost any edit makes a check fail.
 *
 * The first arm is the witness: an UNMUTATED copy must pass. Without it a green
 * control could mean the harness reddens everything it is pointed at, which
 * would make the five mutation arms vacuous.
 *
 * Arms 2 and 3 are the ones the round-1 review's worst finding turned on. The
 * served callable schema used to be hand-written outside the declaration with
 * nothing comparing it, so perturbing `required` or `items.type` left every arm
 * green. They are pinned here so that can never silently return.
 *
 * Every mutant lives in a scratch directory that is removed on the way out, and
 * the committed artifacts are re-read afterwards to confirm this script left
 * them byte-identical.
 */
import { rmSync } from "node:fs"
import { resolve } from "node:path"

import { GENERATED_DIR, GENERATED_FILES } from "./expressibility.js"

const packageRoot = resolve(import.meta.dir, "..")
const repository = resolve(packageRoot, "../..")
const committedDir = resolve(repository, GENERATED_DIR)
const mutantDir = resolve(packageRoot, ".expressibility-mutant")
const mutantRelative = "packages/plait/.expressibility-mutant"

interface Control {
  readonly name: string
  readonly file: (typeof GENERATED_FILES)[number]
  /** The edit, applied to that artifact's committed text. */
  readonly mutate: (text: string) => string
  /** The wall's own words this refusal must carry. */
  readonly reason: string
}

const controls: readonly Control[] = [
  {
    name: "the served `required` list names something the declaration does not",
    file: "tool.schema.json",
    mutate: (text) => text.replace('"cell_digest",', '"cell_digest_DROPPED",'),
    reason: "the served callable schema is not what the declared signature derives",
  },
  {
    name: "the served `items.type` is widened past the declaration",
    file: "tool.schema.json",
    mutate: (text) => text.replace('"type": "string"\n', '"type": "number"\n'),
    reason: "the served callable schema is not what the declared signature derives",
  },
  {
    name: "a donor is mangled in the tool projection alone",
    file: "tool.schema.json",
    mutate: (text) => text.replace("f1_history_convergence; rung", "f1_history_convergenc; rung"),
    reason: "donors DIFFERS in 1/3 projections",
  },
  {
    name: "the committed preimage no longer matches the declaration",
    file: "denotation.json",
    mutate: (text) => text.replace('"evidence":"donor"', '"evidence":"proof"'),
    reason: "denotation.json is not a byte-identical regeneration",
  },
  {
    // The docstring wraps, so the rung is split across two comment lines and
    // only exists as one word after the wall reflows the paragraph. Mutating
    // the second half is what exercises that reflow.
    name: "the rung is weakened in the generated TypeScript surface",
    file: "joinAll.generated.ts",
    mutate: (text) => text.replace("bounded-semilattice; evidence", "semilattice; evidence"),
    reason: "rung DIFFERS in 1/3 projections",
  },
]

const readCommitted = async (): Promise<Map<string, string>> => {
  const map = new Map<string, string>()
  for (const name of GENERATED_FILES) {
    map.set(name, await Bun.file(resolve(committedDir, name)).text())
  }
  return map
}

const before = await readCommitted()

const runWall = (): { readonly code: number; readonly output: string } => {
  const run = Bun.spawnSync({
    cmd: ["bun", "scripts/check-expressibility.ts", "--dir", mutantRelative, "--quiet"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    code: run.exitCode ?? 1,
    output: `${run.stdout.toString()}${run.stderr.toString()}`,
  }
}

const plant = async (file: string | null, mutate: (text: string) => string): Promise<boolean> => {
  let changed = false
  for (const name of GENERATED_FILES) {
    const original = before.get(name)!
    const text = name === file ? mutate(original) : original
    if (name === file && text === original) changed = false
    else if (name === file) changed = true
    await Bun.write(resolve(mutantDir, name), text)
  }
  return file === null ? true : changed
}

const fail = (reason: string): never => {
  rmSync(mutantDir, { recursive: true, force: true })
  console.error(`EXPRESSIBILITY CONTROL: FAIL - ${reason}`)
  process.exit(1)
}

// -- Arm 1: the witness -------------------------------------------------------

await plant(null, (text) => text)
const witness = runWall()
if (witness.code !== 0) {
  fail(
    "the unmutated copy did not pass, so every mutation arm below is vacuous:\n" +
      witness.output,
  )
}

// -- Arms 2-6: the mutations --------------------------------------------------

for (const control of controls) {
  const changed = await plant(control.file, control.mutate)
  if (!changed) {
    fail(`the planted edit did not change ${control.file}; "${control.name}" proves nothing`)
  }
  const run = runWall()
  if (run.code === 0) {
    fail(`the wall stayed green with ${control.name}`)
  }
  if (!run.output.includes(control.reason)) {
    fail(
      `the wall refused ${control.name}, but not for its own reason.\n` +
        `  expected to find: ${control.reason}\n` +
        `  got:\n${run.output}`,
    )
  }
}

rmSync(mutantDir, { recursive: true, force: true })

// -- The restoration ----------------------------------------------------------

const after = await readCommitted()
for (const name of GENERATED_FILES) {
  if (before.get(name) !== after.get(name)) {
    console.error(`EXPRESSIBILITY CONTROL: FAIL - this script changed ${name}`)
    process.exit(1)
  }
}

console.log(
  `EXPRESSIBILITY CONTROL: PASS (${controls.length} mutations each refused for its own reason:` +
    " served required, served items.type, donor drift, preimage drift, rung drift;" +
    " unmutated witness passes; committed artifacts byte-identical after)",
)
