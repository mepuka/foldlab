/**
 * The sorts sweep's compile-time control arm.
 *
 * The sweep's claim is a claim about what can be SPELLED: no bare string
 * survives for any canonical value crossing a public seam. No test that runs
 * can state it — a suite would have to construct the very values the claim
 * says are unconstructible, and a suite that constructed them through a cast
 * would be asserting the opposite. So the wall is a compiler run, and its
 * verdict is a refusal to compile.
 *
 * One project, eight planted spellings, one per sort plus the cross-sort
 * spend, each with its lawful twin beside it in the same file. The twins are
 * what make the refusal mean something: they keep compiling, so the file's
 * failure is the planted spellings' and not the file's. The trace is compared
 * too — a control that merely fails is weak, since almost any edit makes a
 * file fail — so a diagnostic that moves is reported as a moved trace rather
 * than absorbed.
 *
 * **The trace names the brand identifiers, and that is deliberate.** Renaming
 * a sort, or adding one to the family, moves this trace, and re-recording it
 * is the point: the sweep's fence should cost exactly one deliberate
 * re-recording when the family it fences changes.
 *
 * **Only ERROR diagnostics are recorded, and the compiler that prints them is
 * pinned.** Both clauses belong to `scripts/negative-trace.ts` and are read
 * from there rather than restated: the error-class rule keeps a lint advisory
 * about unrelated source from reddening a fence it does not watch, and the
 * compiler pin keeps a host on some other TypeScript from reporting a moved
 * trace when nothing about the refused spellings moved.
 *
 * Run with `--write` to re-record the trace after a deliberate change.
 */
import { resolve } from "node:path"

import { compilerPin, errorDiagnostics } from "./negative-trace.js"

const packageRoot = resolve(import.meta.dir, "..")
const repositoryRoot = resolve(packageRoot, "../..")

const control = {
  name: "bare strings offered where the seven canonical sorts are demanded",
  project: "tsconfig.negative-sorts.json",
  trace: "negative-controls/Sorts.bare-string.trace.txt",
} as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

const write = process.argv.includes("--write")

// Before the arm runs: a trace is a recording of one compiler, so a host on a
// different one is told which it is rather than shown a moved trace.
const pin = await compilerPin(packageRoot, repositoryRoot)
if (!pin.ok) {
  console.error("SORTS CONTROL: REFUSED - the compiler is not the pinned one")
  console.error(`  pinned:  ${pin.expected}`)
  console.error(`  running: ${pin.actual}`)
  console.error("  the committed trace is a recording of the pinned compiler; run `bun install`")
  process.exit(1)
}

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
  console.error(`SORTS CONTROL: FAIL - ${control.name} typechecked`)
  process.exit(1)
}

if (write) {
  await Bun.write(resolve(packageRoot, control.trace), actual)
  console.log(`SORTS CONTROL: wrote ${control.trace}`)
  process.exit(0)
}

// The rule reads BOTH sides, so a re-recorded trace cannot smuggle an advisory
// into the contract this control compares against.
const expected = errorDiagnostics(
  normalize(await Bun.file(resolve(packageRoot, control.trace)).text()),
)
if (actual !== expected) {
  console.error(`SORTS CONTROL: FAIL - ${control.name} compiler trace moved`)
  console.error("--- expected ---")
  console.error(expected)
  console.error("--- actual ---")
  console.error(actual)
  process.exit(1)
}

console.log(
  "SORTS CONTROL: PASS (8 bare-string and cross-sort spellings refused at compile time:" +
    " lane handle, holder, stream name, segment name, cell name, work key," +
    " outcome value, work key spent as a cell name)",
)
