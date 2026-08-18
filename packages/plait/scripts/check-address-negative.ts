/**
 * The addressing seam's compile-time control arm.
 *
 * The explicit-root fence is a claim about what can be SPELLED, so a runtime
 * test cannot state it: a rootless walk has to fail to typecheck. This runs
 * that control in its own project and compares the committed diagnostic, so a
 * control that starts failing for a different reason is reported as a moved
 * trace rather than absorbed - the shape `check-kernel-builder-negative.ts`
 * established for the clock, closure, strategy, and cross-sort controls.
 *
 * The mutant carries a lawful twin beside the planted spelling, in the same
 * project, so the compiler reports one error and not two.
 *
 * **Only ERROR diagnostics are recorded, and that is the control's claim.**
 * The pinned compiler also emits advisory `suggestion` diagnostics for every
 * file the project pulls in, including modules this control does not own and
 * this ticket may not edit. Recording those would couple the fence to lint
 * advice about unrelated code: a later cleanup elsewhere would "move" this
 * trace while the spelling it refuses had not changed at all. The claim here is
 * that the rootless walk does not compile, and for which reason - so the
 * comparison is over the errors, and an empty error set fails the control.
 *
 * Run with `--write` to re-record the trace after a deliberate change.
 */
import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")

const controls = [
  {
    name: "a path walked with no root",
    project: "tsconfig.negative-address-rootless.json",
    trace: "negative-controls/Address.rootless.trace.txt",
  },
] as const

const normalize = (text: string): string =>
  text.replaceAll("\\", "/").replaceAll("\r\n", "\n")

/** Opens a diagnostic block: a file position, a severity, and a TS code. */
const diagnosticHead = /^\S.*: (error|suggestion|warning|message) TS[0-9]+:/

/**
 * Keeps the `error` diagnostics and drops every other severity, carrying each
 * diagnostic's indented continuation lines with the line that opened it.
 */
const errorsOnly = (text: string): string => {
  const kept: Array<string> = []
  let keeping = false
  for (const line of text.split("\n")) {
    const opened = diagnosticHead.exec(line)
    if (opened !== null) keeping = opened[1] === "error"
    else if (line.trim() === "") keeping = false
    if (keeping) kept.push(line)
  }
  return kept.length === 0 ? "" : `${kept.join("\n")}\n`
}

const write = process.argv.includes("--write")

for (const control of controls) {
  const run = Bun.spawnSync({
    cmd: ["bunx", "tsc", "-p", control.project, "--noEmit", "--pretty", "false"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })

  const actual = errorsOnly(
    normalize(`${run.stdout.toString()}${run.stderr.toString()}`),
  )
  if (actual === "") {
    console.error(`ADDRESS CONTROL: FAIL - ${control.name} typechecked`)
    process.exit(1)
  }

  if (write) {
    await Bun.write(resolve(packageRoot, control.trace), actual)
    console.log(`ADDRESS CONTROL: wrote ${control.trace}`)
    continue
  }
  const expected = normalize(await Bun.file(resolve(packageRoot, control.trace)).text())
  if (actual !== expected) {
    console.error(`ADDRESS CONTROL: FAIL - ${control.name} compiler trace moved`)
    console.error("--- expected ---")
    console.error(expected)
    console.error("--- actual ---")
    console.error(actual)
    process.exit(1)
  }
}

if (!write) {
  console.log(
    `ADDRESS CONTROL: PASS (${controls.length} unlawful spelling refused at compile time: rootless walk)`,
  )
}
