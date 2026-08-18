import { createHash } from "node:crypto"

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
 * Internal on purpose: the precondition "these bytes are canonical" is not
 * checkable here, so this door stays inside the package that establishes it.
 */
export const digestOfCanonicalBytes = (bytes: Uint8Array): Digest =>
  Digest.make(createHash("sha256").update(bytes).digest("hex"))
