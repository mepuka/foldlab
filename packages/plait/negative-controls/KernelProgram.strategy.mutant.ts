/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A join carrying a merge strategy. The candidate layer can spell
 * last-writer-wins so that the door can refuse it and teach why; the intrinsic
 * layer cannot, because a lawful join merges through a declared algebra and
 * `Act.join` has exactly two fields. A builder that offered a strategy slot
 * would be re-opening a refusal the model closed.
 *
 * The lawful twin below is the same join with nothing but its cell and its
 * contribution, which is all a join is.
 */
import { program } from "../src/kernel/KernelProgram.js"

/** The witness: a join through the cell's own declared algebra. */
export const lawful = program("strategy-witness", {}, ($) =>
  $.join({ cell: $.digest("resource", 6n), contribution: $.literal(1n) }))

/** The planted spelling: the same join, told how to break ties. */
export const planted = program("strategy-mutant", {}, ($) =>
  $.join({
    cell: $.digest("resource", 6n),
    contribution: $.literal(1n),
    strategy: "lastWriterWins",
  }))
