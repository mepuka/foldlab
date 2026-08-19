/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import { createHash } from "node:crypto"

import { Digest } from "../truth/Digest.js"

const sha256Hex = (bytes: Uint8Array): Digest =>
  Digest.make(createHash("sha256").update(bytes).digest("hex"))

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
export const digestOfCanonicalBytes = sha256Hex

/**
 * Identity for the bytes a content-addressed store holds.
 *
 * A blob store addresses exactly the bytes it was handed: `put` derives this
 * digest before writing and `get` re-derives it over what it fetched, so the
 * store's answers are locally checkable whatever the backend is. That is a
 * different precondition from `digestOfCanonicalBytes` — this door claims
 * nothing about the bytes being one canonical wire value, and the seam that
 * needs that claim (`Resolved.decodePayload`) checks it itself.
 *
 * One implementation, two names: the name is the precondition, and the two
 * preconditions are not the same one (DEV-738 T2).
 */
export const digestOfStoredBytes = sha256Hex
