/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A generator application that reads a clock. The kernel's fold carrier has no
 * clock parameter and no generator takes one, so there is no field to put a
 * time in; the surface refuses it not by validating the value but by having
 * nowhere to write it. The claimed time of a fact travels as a tick fact on an
 * evidence lane instead.
 *
 * The lawful twin below compiles, so the failure is the clock and not the
 * spelling around it.
 */
import { program } from "../src/kernel/KernelProgram.js"

/** The witness: the same emission with nothing but its lane and its body. */
export const lawful = program("clock-witness", {}, ($) =>
  $.emit({ lane: $.digest("lane", 1n), body: $.literal(5n) }))

/** The planted spelling: an emission that also carries the time it happened. */
export const planted = program("clock-mutant", {}, ($) =>
  $.emit({
    lane: $.digest("lane", 1n),
    body: $.literal(5n),
    clock: $.literal(1755500000n),
  }))
