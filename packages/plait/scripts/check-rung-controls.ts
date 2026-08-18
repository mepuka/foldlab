/**
 * The rung ladder's compile-time control arm.
 *
 * Three unlawful spellings, each in its own project, each of which must fail to
 * typecheck, and each committed with the exact diagnostic it fails with. A
 * control that merely fails is weak - almost any edit makes a file fail - so
 * the trace is compared too: the control has to keep failing for its own named
 * reason, and a diagnostic that moves is reported as a moved trace rather than
 * absorbed.
 *
 * Every mutant file carries a lawful twin beside the planted spelling, in the
 * same project, so the compiler reports one error and not two. That is what
 * separates "the unlawful shape is unrepresentable" from "this file does not
 * compile".
 *
 * The fourth arm is the mutation arm, and it is the one that makes the other
 * three mean something: it plants the same three spellings against a weakened
 * rule and requires them to COMPILE. Without it a green suite could report a
 * rotted file as a working constraint.
 *
 * Run with `--write` to re-record the traces after a deliberate change.
 */
import { resolve } from "node:path"

import { errorDiagnostics } from "./negative-trace.js"

const packageRoot = resolve(import.meta.dir, "..")

const controls = [
  {
    name: "a partitioned fold at an algebra that earned no law",
    project: "tsconfig.negative-fold-shards.json",
    trace: "negative-controls/Fold.positional-shards.trace.txt",
  },
  {
    name: "a fold over a lane that might shard, at an algebra that earned no law",
    project: "tsconfig.negative-union-partitions.json",
    trace: "negative-controls/Fold.union-partitions.trace.txt",
  },
  {
    name: "a positional algebra reading the set plane",
    project: "tsconfig.negative-set-plane-read.json",
    trace: "negative-controls/Algebra.set-plane-read.trace.txt",
  },
  {
    name: "a counting monoid reading the set plane",
    project: "tsconfig.negative-counting-join.json",
    trace: "negative-controls/Algebra.counting-join.trace.txt",
  },
] as const

const mutationArm = {
  name: "the same three spellings against a weakened rung",
  project: "tsconfig.rung-witness.json",
} as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

/**
 * What a committed trace here commits to is the estate's one rule, imported
 * rather than restated: `scripts/negative-trace.ts`. These controls are read by
 * the same patched compiler that carries the language service's advisories on
 * the diagnostic stream, and they answer the same one question every other
 * control answers — does the mutant compile, and does it fail for its committed
 * reason. A second copy of that rule would be a second answer waiting to
 * disagree.
 */
const typecheck = (project: string): { readonly code: number; readonly output: string } => {
  const run = Bun.spawnSync({
    cmd: ["bunx", "tsc", "-p", project, "--noEmit", "--pretty", "false"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    code: run.exitCode,
    output: errorDiagnostics(normalize(`${run.stdout.toString()}${run.stderr.toString()}`)),
  }
}

const write = process.argv.includes("--write")

for (const control of controls) {
  const { code, output } = typecheck(control.project)

  if (code === 0) {
    console.error(`RUNG CONTROL: FAIL - ${control.name} typechecked`)
    process.exit(1)
  }
  // A compile that failed with no error diagnostic failed for something other
  // than the planted spelling — a missing project, an unreadable file — and an
  // empty trace must never read as a control that refused for its own reason.
  if (output === "") {
    console.error(`RUNG CONTROL: FAIL - ${control.name} failed with no error diagnostic`)
    process.exit(1)
  }

  if (write) {
    await Bun.write(resolve(packageRoot, control.trace), output)
    console.log(`RUNG CONTROL: wrote ${control.trace}`)
    continue
  }
  // The rule reads the committed file too, so a trace recorded before it
  // existed cannot smuggle an advisory into the contract.
  const expected = errorDiagnostics(
    normalize(await Bun.file(resolve(packageRoot, control.trace)).text()),
  )
  if (output !== expected) {
    console.error(`RUNG CONTROL: FAIL - ${control.name} compiler trace moved`)
    console.error("--- expected ---")
    console.error(expected)
    console.error("--- actual ---")
    console.error(output)
    process.exit(1)
  }
}

const arm = typecheck(mutationArm.project)
if (arm.code !== 0) {
  console.error(`RUNG CONTROL: FAIL - ${mutationArm.name} did not compile`)
  console.error(arm.output)
  process.exit(1)
}

if (!write) {
  console.log(
    `RUNG CONTROL: PASS (${controls.length} unlawful spellings refused at compile time:` +
      " partitioned shards, union partitions, positional set-plane read," +
      " counting set-plane read; mutation arm compiled, so the rung is load-bearing)",
  )
}
