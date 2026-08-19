/**
 * Plane: kernel — the language: corpus, door, programs, and wire grammar.
 *
 * The one guarded seam between the runtime's content addresses and the model's
 * identity labels (operator ruling A1, 2026-08-19; board DEV-772).
 *
 * The model carries identity labels — unbounded naturals — and states nothing
 * about any hash function. The runtime carries content addresses: lowercase
 * SHA-256 hexadecimal. {@link kernelIdentity} is the map between them. It is
 * believed because base-16 is a reading of the same bytes, not because anything
 * here was proved, and it lives at exactly one seam so a reviewer can bound the
 * trust by reading one function.
 *
 * ## The guard, and where its domain comes from
 *
 * The width and the alphabet are NOT restated here. They are read from
 * `truth/Digest.ts`, which is the one place this package states what a runtime
 * content address is, and the guard is that schema's own decode. Two reasons,
 * and the second is the one worth writing down:
 *
 * 1. A second `/^[0-9a-f]{64}$/` in this plane would be the hand-written twin
 *    the estate refuses everywhere else. If the digest domain ever moves, it
 *    moves in one file.
 * 2. **There is nothing generated to read it from.** The corpus does not state
 *    a hex width, and that is deliberate rather than an omission — the
 *    generated `KernelDigest` schema's own emitted description says a real
 *    digest "is a hash over one canonical byte form" that "stays in the trusted
 *    base". The model models identity labels; hexadecimal is the runtime's
 *    spelling and the trusted base's claim. So the guard's domain is the
 *    runtime's own statement of it, and this module says so rather than
 *    pretending to a generated ancestry it does not have.
 *
 * ## What the guard buys
 *
 * The refusal rides the error channel and carries its law and its repair; this
 * function never throws on the meaning path. That matters concretely and not
 * only as style: the ungrilled shape of this map was `BigInt("0x" + hex)`
 * applied to a bare `string`, which throws a `SyntaxError` on `""` and on any
 * non-hex text — a bare throw across a package seam, at the exact place a host
 * hands in caller-supplied bytes.
 *
 * After the guard the conversion cannot throw, because the guarded domain is
 * exactly the digest schema's: a fixed-width lowercase hexadecimal numeral is
 * always a lawful `BigInt` literal.
 *
 * ## Bounds
 *
 * The map is INJECTIVE on the guarded domain — a fixed-width lowercase hex
 * string is the base-16 numeral of exactly one integer — so two distinct
 * addresses can never name one identity. Injectivity is a property of the
 * guarded domain and not of the function's parameter type, which is the
 * difference the guard makes. It is NOT surjective, and nothing here claims a
 * model identity label comes from a digest at all: the model mints labels the
 * runtime never sees.
 *
 * Nothing here judges. This is the trusted base's translation; the verdict over
 * a candidate built from it stays `KernelDoor.admit`'s.
 *
 * @module
 */
import { Effect } from "effect"

import { Digest } from "../truth/Digest.js"
import { decodeRefusing, type Refusal } from "../truth/Refusal.js"

/**
 * Reads a runtime content address as the model's identity label.
 *
 * The one place in this package where a digest becomes a model identity. A
 * caller-supplied address that is not one is refused with the law it fails and
 * the repair that answers it, never thrown.
 *
 * @example
 * ```ts
 * import { kernelIdentity } from "@foldlab/plait/KernelIdentity"
 * import { Effect } from "effect"
 *
 * Effect.runSync(kernelIdentity("0".repeat(63) + "f"))
 * // 15n
 * ```
 */
export const kernelIdentity = Effect.fn("KernelIdentity.kernelIdentity")(function* (
  address: string,
): Effect.fn.Return<bigint, Refusal> {
  const guarded = yield* decodeRefusing(Digest)(address)
  return BigInt(`0x${guarded}`)
})
