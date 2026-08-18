/**
 * NEGATIVE CONTROL - this file must not typecheck.
 *
 * A path walked without a root. `at` takes the root digest first and every
 * later argument is a name, so there is no arity that carries a path alone;
 * the surface refuses a rootless walk not by validating it but by having
 * nowhere to write it. The same fence the kernel builder's clock control
 * states: a current directory would be an ambient input, and a path that
 * inherits one names a position rather than a value.
 *
 * The lawful twin below compiles, so the failure is the missing root and not
 * the spelling around it.
 */
import { at } from "../src/planes/Address.js"
import { Digest } from "../src/truth/Digest.js"

const root = Digest.make("0".repeat(64))

/** The witness: the same walk, rooted at a digest the caller holds. */
export const lawful = at(root, "config", "model")

/** The planted spelling: the petname list on its own, with no root to read from. */
export const planted = at("config", "model")
