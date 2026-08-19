import { Effect, Option } from "effect"

import type { WireValue } from "../src/truth/Canonical.js"
import { Catalog, Payloads } from "../src/planes/Catalog.js"
import { digestOf, type Digest } from "../src/truth/Digest.js"
import { absenceRefusal, structuralRefusal, type Refusal } from "../src/truth/Refusal.js"

/**
 * NEGATIVE BUILD VARIANT — never import outside the named control test.
 *
 * This is the payload resolve leg with exactly one law dropped: identity is
 * taken over the DECODED VALUE rather than over the fetched bytes, and the
 * decode that produces that value is the platform parser over a non-fatal
 * decoder. The check it performs is `sha256(canonical(parse(bytes))) == D`,
 * which is the question the repaired door no longer asks.
 *
 * It is a deliberate restatement rather than a re-use, because the shipped leg
 * is a private function of the resolve seam and exporting a substitution point
 * for it would put a test seam on the package's public surface with no law
 * licensing it. The restatement is held honest by the control test, which
 * requires this variant to ADMIT byte strings the shipped door refuses: a
 * variant that had drifted into agreeing with the shipped door would fail the
 * control rather than pass it quietly.
 *
 * The refusals it mints carry the same kinds as the shipped leg so the control
 * measures the admission decision and nothing else.
 */
export const valueIdentityResolve = Effect.fn("ValueIdentityMutant.resolve")(function* (
  digest: Digest,
): Effect.fn.Return<WireValue, Refusal, Catalog | Payloads> {
  const catalog = yield* Catalog
  const cataloged = yield* catalog.get(digest)
  if (Option.isSome(cataloged)) return yield* verified(digest, cataloged.value)
  const payloads = yield* Payloads
  const payload = yield* payloads.get(digest)
  if (Option.isNone(payload)) {
    return yield* absenceRefusal({
      kind: "cataloged-value-absent",
      law: "A reference resolves only against a catalog or payload store that holds its value.",
      path: ["digest"],
      got: "absent",
      expected: digest,
      next: [{ subject: "catalog.publish", note: "Publish the value under this digest." }],
    })
  }
  return yield* verified(digest, yield* decodePayload(digest, payload.value))
})

const verified = Effect.fn("ValueIdentityMutant.verified")(function* (
  digest: Digest,
  value: WireValue,
): Effect.fn.Return<WireValue, Refusal> {
  const rederived = yield* digestOf(value)
  if (rederived === digest) return value
  return yield* structuralRefusal({
    kind: "digest-mismatch",
    law: "A resolved value's identity is re-derived on read and never asserted.",
    path: ["digest"],
    got: rederived,
    expected: digest,
    next: [{ subject: "catalog.publish", note: "Reference the value under its own digest." }],
  })
})

const decodePayload = (
  digest: Digest,
  bytes: Uint8Array,
): Effect.Effect<WireValue, Refusal> =>
  Effect.try({
    try: () => JSON.parse(new TextDecoder().decode(bytes)) as WireValue,
    catch: (cause) =>
      structuralRefusal({
        kind: "malformed-value",
        law: "Stored payload bytes decode as one wire value.",
        path: ["blob", digest],
        got: String(cause),
        expected: "one RFC 8785 wire value",
        next: [{ subject: "catalog.publish", note: "Store canonical uncompressed bytes." }],
      }),
  })
