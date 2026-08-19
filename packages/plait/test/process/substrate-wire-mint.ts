/**
 * The TypeScript half of the wire vocabulary's byte-parity wall.
 *
 * One value crosses the boundary: the whole wire vocabulary as this language
 * renders it. The daemon's Go side renders the same value from the normative
 * tables and compares byte for byte, so the two languages are one table read
 * twice rather than two tables somebody keeps in step.
 *
 * The row counts ride along so the far side can see this language's own census
 * beside its own — a count derived here, from the emitted tables, rather than
 * restated from the far side's.
 *
 * Test-only. Nothing imports this from `src/`.
 */
import { Effect } from "effect"

import { WIRE_VOCABULARY } from "../../src/internal/wirevocabulary.js"
import { canonicalBytes, type WireValue } from "../../src/truth/Canonical.js"
import { digestOf } from "../../src/truth/Digest.js"

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

await Effect.runPromise(
  Effect.gen(function* () {
    const value = WIRE_VOCABULARY as unknown as WireValue
    const counts = WIRE_VOCABULARY.groups.map((group) => ({
      group: group.group,
      rows: group.rows.length,
    }))
    process.stdout.write(
      `${
        JSON.stringify({
          bytes: hex(yield* canonicalBytes(value)),
          digest: yield* digestOf(value),
          counts,
        })
      }\n`,
    )
  }),
)
