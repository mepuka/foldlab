/**
 * What a committed negative-control trace commits to.
 *
 * A negative control fails a compile on purpose and commits the diagnostic it
 * fails with, so that it keeps failing for its own named reason rather than for
 * any reason at all. That makes the committed trace a contract, and this module
 * is where the contract says which diagnostics are in it: the error class, and
 * nothing else.
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
