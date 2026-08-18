/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A local handle spent at the wrong sort. `declare` takes its writ as a policy
 * digest, and the handle offered here came from an emission, which produces no
 * declaration kind at all. The brand a handle carries is the generator that
 * made it and the kind that generator named, so spending one where another
 * sort is required has no derivation - the same referent-pinning discipline
 * the model carries in its digest brands, at the builder's own surface.
 *
 * The lawful twin below spends a handle of the right sort: a policy declared
 * earlier in the same program.
 */
import { program } from "../src/kernel/KernelProgram.js"

/** The witness: the writ is a policy this program declared. */
export const lawful = program("cross-sort-witness", {}, ($) => {
  const policy = $.declare({ kind: "policy", value: $.literal(1n) })
  return $.declare({ kind: "schema", value: $.literal(5n), writ: policy })
})

/** The planted spelling: the writ is an emission, which is no policy. */
export const planted = program("cross-sort-mutant", {}, ($) => {
  const evidence = $.emit({ lane: $.digest("lane", 1n), body: $.literal(1n) })
  return $.declare({ kind: "schema", value: $.literal(5n), writ: evidence })
})
