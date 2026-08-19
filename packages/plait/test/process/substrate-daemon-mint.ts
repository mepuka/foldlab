/**
 * The TypeScript half of the daemon's carriage-invariance differential.
 *
 * One spine connection is opened to the daemon's client URL through the SAME
 * establishment path every adapter in this package uses — not a re-typed copy
 * of it — so the three groups this process emits are exactly the groups the
 * spine folds in production. What crosses back out is the folded session, its
 * canonical bytes, its digest, and the two declared values the daemon cannot
 * know about a connection it did not open: the connect-options declaration the
 * process ran under, and the estate's own declaration about the layer.
 *
 * The declared VALUES cross rather than only their digests, which is the point
 * of sending them at all: the far side canonicalizes them with its own
 * canonicalizer and derives their digests independently, so the comparison is
 * across two implementations rather than across one implementation twice.
 *
 * Test-only. Nothing imports this from `src/`.
 */
import { Effect } from "effect"

import { mintSession } from "../../src/internal/sessionfacts.js"
import { connectOptionsDeclaration } from "../../src/internal/substrate.js"
import {
  establishConnection,
  teachRetryOperation,
  transportRefusalFor,
} from "../../src/internal/transport.js"
import { canonicalBytes, type WireValue } from "../../src/truth/Canonical.js"

const [url, layer] = process.argv.slice(2)
if (url === undefined || layer === undefined) {
  throw new Error("usage: substrate-daemon-mint URL LAYER")
}

const refuse = transportRefusalFor({
  kind: "substrate-daemon-differential-unreachable",
  law:
    "The differential opens one connection to the daemon; an unreachable daemon refuses the run rather than weakening the comparison.",
  expected: "one reachable daemon client URL",
  next: teachRetryOperation,
})

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

await Effect.runPromise(
  Effect.gen(function* () {
    const established = yield* establishConnection(
      { servers: [url] },
      layer,
      "daemon-differential",
      refuse,
    )
    const session = yield* mintSession(established.groups, null)
    const bytes = yield* canonicalBytes(session.value as unknown as WireValue)
    // The declaration the connection ran under, re-declared from the same
    // inputs the establishment path used, so the value that crosses is the
    // value whose digest the fold consumed rather than a reconstruction of it.
    const declaration = yield* connectOptionsDeclaration({
      servers: [url],
      name: layer,
      inboxPrefix: null,
      authenticator: null,
    })
    const info = established.connection.info
    process.stdout.write(`${
      JSON.stringify({
        client_id: info === undefined ? null : info.client_id,
        layer,
        greeting: info === undefined ? null : info,
        connect_options: declaration,
        estate: established.groups.estate,
        options_digest: established.groups.options,
        substrate: established.groups.substrate,
        session: session.value,
        digest: session.digest,
        bytes: hex(bytes),
        established: session.established,
      })
    }\n`)
    // The connection stays open until the far side closes this process's
    // input. The daemon's half of the differential reads the registration the
    // substrate holds for THIS connection, and a registration is gone the
    // moment the connection is: releasing the scope here would make the two
    // carriages describe different connections.
    yield* Effect.promise(() => Bun.stdin.text())
  }).pipe(Effect.scoped),
)
