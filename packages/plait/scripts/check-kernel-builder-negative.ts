/**
 * The builder's compile-time control arm.
 *
 * Four unlawful spellings, each in its own project, each of which must fail to
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
 * Run with `--write` to re-record the traces after a deliberate change.
 */
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")

const controls = [
  {
    name: "a generator application that reads a clock",
    project: "tsconfig.negative-program-clock.json",
    trace: "negative-controls/KernelProgram.clock.trace.txt",
  },
  {
    name: "a function value as an argument",
    project: "tsconfig.negative-program-closure.json",
    trace: "negative-controls/KernelProgram.closure.trace.txt",
  },
  {
    name: "a join carrying a merge strategy",
    project: "tsconfig.negative-program-strategy.json",
    trace: "negative-controls/KernelProgram.strategy.trace.txt",
  },
  {
    name: "a local handle spent at the wrong sort",
    project: "tsconfig.negative-program-cross-sort.json",
    trace: "negative-controls/KernelProgram.cross-sort.trace.txt",
  },
] as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const write = process.argv.includes("--write")

for (const control of controls) {
  const run = Bun.spawnSync({
    cmd: ["bunx", "tsc", "-p", control.project, "--noEmit", "--pretty", "false"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })

  if (run.exitCode === 0) {
    console.error(`KERNEL BUILDER CONTROL: FAIL - ${control.name} typechecked`)
    process.exit(1)
  }

  const actual = normalize(`${run.stdout.toString()}${run.stderr.toString()}`)
  if (write) {
    await Bun.write(resolve(packageRoot, control.trace), actual)
    console.log(`KERNEL BUILDER CONTROL: wrote ${control.trace}`)
    continue
  }
  const expected = normalize(await Bun.file(resolve(packageRoot, control.trace)).text())
  if (actual !== expected) {
    console.error(`KERNEL BUILDER CONTROL: FAIL - ${control.name} compiler trace moved`)
    console.error("--- expected ---")
    console.error(expected)
    console.error("--- actual ---")
    console.error(actual)
    process.exit(1)
  }
}

if (!write) {
  console.log(
    `KERNEL BUILDER CONTROL: PASS (${controls.length} unlawful spellings refused at compile time:` +
      " clock, closure, strategy, cross-sort handle)",
  )
}
