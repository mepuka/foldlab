/**
 * The TypeScript half of the incarnation vocabulary's byte-parity wall.
 *
 * The daemon's Go side TRANSCRIBES this package's incarnation declarations —
 * the incarnation value, the round it competes at, and the three lifecycle
 * facts — and a transcription is honest only if something compares the bytes.
 * This process mints each declared value through the spine's own canonicalizer
 * and writes what it minted; the Go side mints the same values from the same
 * coordinates and compares byte for byte.
 *
 * The coordinates come in on the command line so that neither side chooses
 * them: whatever the far side sends is what both sides declare. A value whose
 * bytes differ is a defect on the Go side, because this package's declaration
 * is the reference.
 *
 * Test-only. Nothing imports this from `src/`.
 */
import { Effect } from "effect"

import {
  establishedFact,
  incarnation,
  lameDuckFact,
  retiredFact,
  roundKey,
  store,
  type RetirementCause,
} from "../../src/internal/incarnations.js"
import { canonicalBytes, type WireValue } from "../../src/truth/Canonical.js"
import { Digest } from "../../src/truth/Digest.js"
import { digestOf } from "../../src/truth/Digest.js"

const [dir, options, predecessor, session, server, cause] = process.argv.slice(2)
if (
  dir === undefined || options === undefined || predecessor === undefined ||
  session === undefined || server === undefined || cause === undefined
) {
  throw new Error(
    "usage: substrate-incarnation-mint DIR OPTIONS PREDECESSOR SESSION SERVER CAUSE",
  )
}

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

/** An empty predecessor on the wire is the null a chain head carries. */
const head = predecessor === "" ? null : Digest.make(predecessor)

await Effect.runPromise(
  Effect.gen(function* () {
    const storeValue = store(dir)
    const storeDigest = yield* digestOf(storeValue as unknown as WireValue)
    const value = incarnation({
      store: storeDigest,
      options: Digest.make(options),
      predecessor: head,
    })
    const digest = yield* digestOf(value as unknown as WireValue)
    const round = yield* roundKey(storeDigest, head)

    const minted = {
      store: storeValue as unknown as WireValue,
      incarnation: value as unknown as WireValue,
      established: establishedFact(digest, value) as unknown as WireValue,
      "lame-duck": lameDuckFact({
        incarnation: digest,
        session: Digest.make(session),
        server,
      }) as unknown as WireValue,
      retired: retiredFact(digest, cause as RetirementCause) as unknown as WireValue,
    }

    const rows: Record<string, { bytes: string; digest: string }> = {}
    for (const [name, declared] of Object.entries(minted)) {
      rows[name] = {
        bytes: hex(yield* canonicalBytes(declared)),
        digest: yield* digestOf(declared),
      }
    }
    process.stdout.write(`${JSON.stringify({ round, values: rows })}\n`)
  }),
)
