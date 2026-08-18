/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A function value as an argument. A closure has no canonical bytes, so it has
 * no identity, so nothing can reference it: the argument grammar has a digest
 * form, a local form, a hole form and a literal form, and a function is none
 * of the four. This is the refusal that keeps the declaration a value rather
 * than a program text with code in it.
 *
 * The lawful twin below passes the same computation the only way the estate
 * allows: by naming a declaration that already exists.
 */
import { program } from "../src/KernelProgram.js"

/** The witness: the computation referenced by digest, which is the lawful way. */
export const lawful = program("closure-witness", {}, ($) =>
  $.declare({
    kind: "schema",
    value: $.digest("algebra", 7n),
    writ: $.digest("policy", 4n),
  }))

/** The planted spelling: the computation carried inline as a function. */
export const planted = program("closure-mutant", {}, ($) =>
  $.declare({
    kind: "schema",
    value: (left: bigint, right: bigint) => left + right,
    writ: $.digest("policy", 4n),
  }))
