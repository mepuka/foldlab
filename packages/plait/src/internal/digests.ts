import { createHash } from "node:crypto"

import { Effect } from "effect"

import { Digest } from "../Digest.js"

/**
 * Identity for bytes already known canonical.
 *
 * `Digest.digestOf` canonicalizes and then hashes, which is the right door for
 * a wire VALUE. A caller that already holds the canonical bytes — the envelope
 * decode does, one line earlier — would canonicalize the same value a second
 * time to reach the same hash (audit B-5). Envelope identity is defined as
 * exactly SHA-256 over those bytes, so hashing them directly derives the same
 * digest without re-deriving the bytes.
 *
 * The span is named `Digest.digestOf`, not this function: B-5 removes a
 * redundant canonicalization and nothing else, so the trace a decode emits must
 * not change shape either. A consumer still sees one `Digest.digestOf` child
 * under `Wire.decodeEnvelope` exactly where it saw one before (DEV-748
 * round-2, charge 2).
 *
 * Internal on purpose: the precondition "these bytes are canonical" is not
 * checkable here, so this door stays inside the package that establishes it.
 */
export const digestOfCanonicalBytes = Effect.fn("Digest.digestOf")(function* (
  bytes: Uint8Array,
): Effect.fn.Return<Digest> {
  return Digest.make(createHash("sha256").update(bytes).digest("hex"))
})
