/**
 * The TypeScript half of the server-option vocabulary's byte-parity wall.
 *
 * Three declared values cross the boundary: the transcribed option table, the
 * closed-channel inventory, and one declared server-options value minted from
 * coordinates the far side chooses. The daemon's Go side declares the same
 * three and compares byte for byte, so the two languages are one table read
 * twice rather than two tables somebody keeps in step.
 *
 * The coordinates come in as one JSON argument so that neither side chooses
 * them: whatever the far side sends is what both sides declare. A value whose
 * bytes differ is a defect — on whichever side the vendor's own declarations
 * say it is.
 *
 * Test-only. Nothing imports this from `src/`.
 */
import { Effect } from "effect"

import {
  CLOSED_CHANNEL_INVENTORY,
  declaredServerOptions,
  SERVER_OPTION_TABLE,
  type DeclaredServerOptionsInput,
} from "../../src/internal/serveroptions.js"
import { canonicalBytes, type WireValue } from "../../src/truth/Canonical.js"
import { digestOf } from "../../src/truth/Digest.js"

const [coordinates] = process.argv.slice(2)
if (coordinates === undefined) {
  throw new Error("usage: substrate-options-mint COORDINATES-JSON")
}

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

const input = JSON.parse(coordinates) as DeclaredServerOptionsInput

await Effect.runPromise(
  Effect.gen(function* () {
    const minted = {
      table: SERVER_OPTION_TABLE as unknown as WireValue,
      inventory: CLOSED_CHANNEL_INVENTORY as unknown as WireValue,
      options: declaredServerOptions(input) as unknown as WireValue,
    }
    const rows: Record<string, { bytes: string; digest: string }> = {}
    for (const [name, declared] of Object.entries(minted)) {
      rows[name] = {
        bytes: hex(yield* canonicalBytes(declared)),
        digest: yield* digestOf(declared),
      }
    }
    process.stdout.write(`${JSON.stringify({ values: rows })}\n`)
  }),
)
