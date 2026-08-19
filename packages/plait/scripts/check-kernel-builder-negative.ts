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
 * **Only ERROR diagnostics are recorded, and the compiler that prints them is
 * pinned.** Both clauses are `scripts/negative-trace.ts`'s to state, not this
 * script's to restate: the error-class rule (DEV-797) keeps a lint advisory
 * about unrelated `src/` from reddening a fence it does not watch, and the
 * compiler pin (DEV-824) keeps a host on some other TypeScript from reporting a
 * moved trace when nothing about the refused spellings moved. This control is
 * the one the address, rung, and public-effect controls copied their shape
 * from, and it was the last one still holding a private copy of the rule.
 *
 * The pin is what makes the recorded diagnostic text safe to compare verbatim.
 * The cross-sort arm names a union of eight sorts, and 5.x printed that union's
 * members in instantiation order — an order that moved between 5.9.2 and 5.9.3
 * on its own. The pinned 7.0.2 prints them sorted, so the recording is stable by
 * construction and the comparison stays total: the words inside the diagnostic
 * ARE the claim, so nothing here rewrites them before checking them.
 *
 * Run with `--write` to re-record the traces after a deliberate change.
 */
import { resolve } from "node:path"

import { compilerPin, errorDiagnostics } from "./negative-trace.js"

const packageRoot = resolve(import.meta.dir, "..")
const repositoryRoot = resolve(packageRoot, "../..")

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

// Before any arm runs: a trace is a recording of one compiler, so a host on a
// different one is told which it is rather than shown four moved traces.
const pin = await compilerPin(packageRoot, repositoryRoot)
if (!pin.ok) {
  console.error("KERNEL BUILDER CONTROL: REFUSED - the compiler is not the pinned one")
  console.error(`  pinned:  ${pin.expected}`)
  console.error(`  running: ${pin.actual}`)
  console.error("  the committed traces are recordings of the pinned compiler; run `bun install`")
  process.exit(1)
}

for (const control of controls) {
  const run = Bun.spawnSync({
    cmd: ["bunx", "tsc", "-p", control.project, "--noEmit", "--pretty", "false"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })

  const actual = errorDiagnostics(
    normalize(`${run.stdout.toString()}${run.stderr.toString()}`),
  )
  if (actual === "") {
    console.error(`KERNEL BUILDER CONTROL: FAIL - ${control.name} typechecked`)
    process.exit(1)
  }

  if (write) {
    await Bun.write(resolve(packageRoot, control.trace), actual)
    console.log(`KERNEL BUILDER CONTROL: wrote ${control.trace}`)
    continue
  }
  // The rule reads BOTH sides, so a re-recorded trace cannot smuggle an
  // advisory into the contract this control compares against.
  const expected = errorDiagnostics(
    normalize(await Bun.file(resolve(packageRoot, control.trace)).text()),
  )
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
