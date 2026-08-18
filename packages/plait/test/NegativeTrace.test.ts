import { describe, expect, test } from "bun:test"

import { errorDiagnostics } from "../scripts/negative-trace.js"

/**
 * The wall for what a committed negative-control trace commits to. The filter
 * is load-bearing gate logic — it decides which lines twenty controls compare
 * on — and its dangerous failure is silent in one direction only: a rule that
 * dropped a SECOND error would let a mutant failing for a new reason pass as a
 * mutant failing for its committed one. That row is the reason this file
 * exists; the rest pin the contract's edges.
 *
 * The inputs are real `--pretty false` output, copied from the compiler at
 * 265f7b0 — the advisories are the six that reddened main (DEV-797), and the
 * chained error is the cross-sort control's.
 */
const plantedError =
  "negative-controls/PublicEffects.value-union.mutant.ts(13,3): error TS2344: Type 'false' does not satisfy the constraint 'true'.\n"

const advisories = [
  "src/internal/registers.ts(43,53): suggestion TS377098: This Schema number API accepts `NaN`, `Infinity`, and `-Infinity`. Use `Schema.Finite` for finite domain numbers. If non-finite values are intentional, disable this diagnostic for that line. effect(schemaNumber)",
  "src/internal/transport.ts(161,11): suggestion TS377099: `Effect.ignore` expresses ignored failure more directly than `Effect.catch` returning `Effect.void`. effect(catchToIgnore)",
  "src/truth/Refusal.ts(188,19): suggestion TS377010: `Effect.mapError` expresses the same error-type transformation more directly than `Effect.catch` followed by `Effect.fail`. effect(catchAllToMapError)",
].join("\n")

const chainedError =
  "negative-controls/KernelProgram.cross-sort.mutant.ts(25,60): error TS2322: Type 'KernelHandle<\"emit\", null>' is not assignable to type 'KernelDigestArg<\"policy\">'.\n" +
  "  Type 'KernelHandle<\"emit\", null>' is not assignable to type 'KernelHandle<\"emit\", \"policy\">'.\n" +
  "    Type 'null' is not assignable to type '\"policy\"'.\n"

describe("the committed negative-control trace", () => {
  test("keeps the planted error and drops the language service's advisories", () => {
    expect(errorDiagnostics(`${plantedError}${advisories}\n`)).toBe(plantedError)
  })

  test("keeps a second error the mutant did not commit to, so the trace moves", () => {
    const unexpected =
      "negative-controls/PublicEffects.value-union.mutant.ts(9,7): error TS2564: Property 'other' has no initializer.\n"

    expect(errorDiagnostics(`${plantedError}${advisories}\n${unexpected}`)).toBe(
      `${plantedError}${unexpected}`,
    )
  })

  test("keeps a multi-line error whole, indented chain and all", () => {
    expect(errorDiagnostics(`${chainedError}${advisories}\n`)).toBe(chainedError)
  })

  test("drops the indented chain under an advisory along with its header", () => {
    const chainedAdvisory =
      "src/planes/Lane.ts(17,58): suggestion TS377098: This Schema number API accepts `NaN`.\n" +
      "  Use `Schema.Finite` for finite domain numbers.\n"

    expect(errorDiagnostics(`${chainedAdvisory}${plantedError}`)).toBe(plantedError)
  })

  test("keeps an error the compiler blames on no file", () => {
    const global = "error TS18003: No inputs were found in config file.\n"

    expect(errorDiagnostics(`${global}${advisories}\n`)).toBe(global)
  })

  test("reports nothing at all when only advisories were printed", () => {
    expect(errorDiagnostics(`${advisories}\n`)).toBe("")
    expect(errorDiagnostics("")).toBe("")
  })
})
