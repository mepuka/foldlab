/**
 * What a committed negative-control trace commits to.
 *
 * A negative control fails a compile on purpose and commits the diagnostic it
 * fails with, so that it keeps failing for its own named reason rather than for
 * any reason at all. That makes the committed trace a contract, and this module
 * is where the contract says what is in it: the error class, and nothing else —
 * and the compiler that printed it.
 *
 * The compiler is the workspace-patched tsgo, and the control projects inherit
 * the `@effect/language-service` plugin from `tsconfig.base.json`, so its
 * ADVISORY findings — `suggestion`-category lines carrying rule names like
 * `effect(schemaNumber)` — arrive on the same stream as the errors. An advisory
 * is a property of the package's own source, never of the mutant: it appears
 * and disappears as `src/` is edited and as the language service ships new
 * rules, and none of them decides whether the mutant compiles. A trace that
 * committed them would make every control a second, accidental lint gate,
 * reddening on work it does not watch — which is how main's gate went red at
 * 265f7b0 (DEV-797).
 */

/**
 * A `--pretty false` diagnostic opens with `file(line,col): <category> TS<code>:`
 * — or, when the compiler blames no file, with `<category> TS<code>:`. The lines
 * under it that continue the same message chain are indented, so an unindented
 * header is what opens the next diagnostic.
 */
const diagnosticHeader =
  /^(?:.+?\(\d+,\d+\): )?(error|warning|suggestion|message) TS\d+:/

/**
 * The contract applied to one compiler trace: every error diagnostic kept
 * whole — its header line and the indented chain beneath it — in the order the
 * compiler printed them, and `suggestion`, `message`, and `warning` dropped
 * alike. Callers run it over the fresh compile AND over the committed file, so
 * one rule reads both sides and a re-recorded trace cannot smuggle an advisory
 * into the contract.
 *
 * The trailing newline survives whenever anything does, so the result compares
 * byte for byte against a committed file. An empty result means the compiler
 * printed no error at all, which is never a trace this repository commits: its
 * callers read it as a refusal rather than as a match.
 */
export const errorDiagnostics = (trace: string): string => {
  const kept: Array<string> = []
  let keeping = false
  for (const line of trace.split("\n")) {
    if (line === "") continue
    const header = diagnosticHeader.exec(line)
    if (header !== null) keeping = header[1] === "error"
    else if (!/^\s/.test(line)) keeping = false
    if (keeping) kept.push(line)
  }
  return kept.length === 0 ? "" : `${kept.join("\n")}\n`
}

/**
 * The other half of the contract: a committed trace is a recording of ONE
 * compiler, and the diagnostic text inside an error is that compiler's prose.
 *
 * The error class rule above says which diagnostics the contract holds. It
 * deliberately says nothing about the words inside one, because those words are
 * the claim — "this type is not assignable to that type", named in full. A
 * control that let itself rewrite that text before comparing would be grading
 * the compiler's answer against a paraphrase of its own.
 *
 * Which makes the printer's stability the contract's problem rather than the
 * comparison's. It is a real problem: the same four-arm builder control recorded
 * `KernelHandle<"join" | "declare" | "resolve" | ...>` under TypeScript 5.9.2,
 * prints `"join" | "emit" | "declare" | ...` under 5.9.3, and prints the members
 * sorted under the pinned 7.0.2 — three orders for one unchanged type, because
 * 5.x printed a union in whatever order the checker happened to instantiate it
 * and 7.x prints it canonically (DEV-824). No normalizer was needed to settle
 * that, only an answer to "which compiler is this trace of": the pin, read from
 * the repository's own manifest so it can never drift from the version the
 * lockfile installs, and enforced here so a host on some other compiler is told
 * so by name instead of reporting a moved trace it cannot act on.
 */
export interface CompilerPin {
  readonly ok: boolean
  readonly expected: string
  readonly actual: string
}

/**
 * The pinned compiler, spelled the way `tsc --version` spells it: the
 * `typescript` pin, then the `@effect/tsgo` patch that `prepare` applies over
 * it. Both are devDependencies of the repository root, and both move the
 * printer, so the contract names both.
 */
export const compilerPin = async (
  packageRoot: string,
  repositoryRoot: string,
): Promise<CompilerPin> => {
  const manifest = (await Bun.file(`${repositoryRoot}/package.json`).json()) as {
    devDependencies?: Record<string, string>
  }
  const pinned = manifest.devDependencies ?? {}
  const typescript = pinned["typescript"]
  const tsgo = pinned["@effect/tsgo"]
  if (typescript === undefined || tsgo === undefined) {
    return {
      ok: false,
      expected: "typescript and @effect/tsgo pinned in the root devDependencies",
      actual: "one or both absent",
    }
  }
  const expected = `${typescript}+effect-tsgo.${tsgo}`
  const run = Bun.spawnSync({
    cmd: ["bunx", "tsc", "--version"],
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  const actual = run.stdout.toString().trim().replace(/^Version /, "")
  return { ok: actual === expected, expected, actual }
}
