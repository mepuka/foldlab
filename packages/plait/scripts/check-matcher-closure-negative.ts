/**
 * The read-side folds' compile-time control arm.
 *
 * The closure suites beside the folds hold the runtime half: every kind the
 * vocabulary carries dispatches, and to its own arm. They cannot hold the other
 * half. "A caller that has not handled a new kind fails to compile" is a claim
 * about what can be SPELLED, and no test that runs can state it — a suite that
 * built its arms from the union would keep passing on the day the union grew,
 * because it would grow with it. That is precisely the caller this control
 * stands in for: one whose arm record was written before the kind existed.
 *
 * Two unlawful spellings, each in its own project, each of which must fail to
 * typecheck, and each committed with the exact diagnostic it fails with. A
 * control that merely fails is weak - almost any edit makes a file fail - so the
 * trace is compared too, and a diagnostic that moves is reported as a moved
 * trace rather than absorbed.
 *
 * Each mutant carries a lawful twin beside the planted spelling, in the same
 * project, so the compiler reports one error and not two. That is what separates
 * "an arm-short fold is unrepresentable" from "this file does not compile".
 *
 * **The traces name the unions, and that is deliberate.** A recorded diagnostic
 * here prints the whole arm record, so growing the refusal vocabulary moves this
 * trace. Re-recording it is the point: a kind added to the vocabulary should
 * cost exactly one deliberate re-recording of the fence that says every caller
 * must now handle it.
 *
 * **Only ERROR diagnostics are recorded, and the compiler that prints them is
 * pinned.** Both clauses belong to `scripts/negative-trace.ts` and are read from
 * there rather than restated: the error-class rule keeps a lint advisory about
 * unrelated source from reddening a fence it does not watch, and the compiler
 * pin keeps a host on some other TypeScript from reporting a moved trace when
 * nothing about the refused spellings moved.
 *
 * Run with `--write` to re-record the traces after a deliberate change.
 */
import { resolve } from "node:path"

import { compilerPin, errorDiagnostics } from "./negative-trace.js"

const packageRoot = resolve(import.meta.dir, "..")
const repositoryRoot = resolve(packageRoot, "../..")

const controls = [
  {
    name: "a structural-kind fold one arm short of the vocabulary",
    project: "tsconfig.negative-matcher-refusal-kind.json",
    trace: "negative-controls/MatchClosure.refusal-kind.trace.txt",
  },
  {
    name: "an envelope-kind fold one arm short of the grammar",
    project: "tsconfig.negative-matcher-envelope-kind.json",
    trace: "negative-controls/MatchClosure.envelope-kind.trace.txt",
  },
] as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const write = process.argv.includes("--write")

// Before any arm runs: a trace is a recording of one compiler, so a host on a
// different one is told which it is rather than shown two moved traces.
const pin = await compilerPin(packageRoot, repositoryRoot)
if (!pin.ok) {
  console.error("MATCHER CLOSURE CONTROL: REFUSED - the compiler is not the pinned one")
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
    console.error(`MATCHER CLOSURE CONTROL: FAIL - ${control.name} typechecked`)
    process.exit(1)
  }

  if (write) {
    await Bun.write(resolve(packageRoot, control.trace), actual)
    console.log(`MATCHER CLOSURE CONTROL: wrote ${control.trace}`)
    continue
  }
  // The rule reads BOTH sides, so a re-recorded trace cannot smuggle an
  // advisory into the contract this control compares against.
  const expected = errorDiagnostics(
    normalize(await Bun.file(resolve(packageRoot, control.trace)).text()),
  )
  if (actual !== expected) {
    console.error(`MATCHER CLOSURE CONTROL: FAIL - ${control.name} compiler trace moved`)
    console.error("--- expected ---")
    console.error(expected)
    console.error("--- actual ---")
    console.error(actual)
    process.exit(1)
  }
}

if (!write) {
  console.log(
    `MATCHER CLOSURE CONTROL: PASS (${controls.length} arm-short folds refused at compile time:` +
      " structural kind, envelope kind)",
  )
}
