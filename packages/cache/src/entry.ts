/**
 * What an entry has to be before anything is allowed to believe it.
 *
 * An entry is one string: the canonical JSON of a fold state. That is a
 * checkable claim on its own, without the fold, without the history, and
 * without asking the node that sent it — canonical form gives each value
 * exactly one byte string, so bytes that do not re-encode to themselves are
 * bytes no honest writer produced. The check costs one decode and one encode of
 * the entry, never a walk of the history, which is why it can be always on.
 *
 * It is the cheap half of verification. It refuses damage; it cannot refuse a
 * well-formed lie, because a well-formed encoding of the wrong answer is still
 * canonical. That one is caught by re-folding, which costs a history walk, and
 * therefore lives behind a Layer the operator chooses (`FoldCacheVerified`).
 */

import { encodeFoldState, type FoldState } from "@foldlab/core/algebra"
import { decodeJson } from "@foldlab/core/jcs"
import { corruptEntry, type CorruptEntry } from "./refusal.ts"

const utf8 = new TextEncoder()

/**
 * Reads an entry's bytes back to a fold state, or refuses.
 *
 * The value comes back from the bytes rather than from a shared object, so a
 * holder of the returned value cannot reach into the store and change what a
 * later reader sees — the same property the core cache gets by parsing on read.
 * The re-encode comparison is the check: `decode` then `encode` is the identity
 * on canonical bytes and on nothing else.
 */
export const readEntry = (
  key: string,
  bytes: string,
): { readonly ok: true; readonly value: FoldState } | {
  readonly ok: false
  readonly refusal: CorruptEntry
} => {
  const decoded = decodeJson(utf8.encode(bytes))
  if (!decoded.ok) {
    return {
      ok: false,
      refusal: corruptEntry(
        key,
        "non-canonical-bytes",
        `the stored entry is not one decodable JSON value: ${decoded.refusal.reason}`,
      ),
    }
  }
  const value = decoded.value as FoldState
  const reencoded = encodeFoldState(value)
  if (!reencoded.ok) {
    return {
      ok: false,
      refusal: corruptEntry(
        key,
        "non-canonical-bytes",
        `the stored entry decodes to a value with no canonical form: ${reencoded.refusal.reason}`,
      ),
    }
  }
  if (reencoded.bytes !== bytes) {
    return {
      ok: false,
      refusal: corruptEntry(
        key,
        "non-canonical-bytes",
        "the stored entry is not the canonical encoding of the value it decodes to",
      ),
    }
  }
  return { ok: true, value }
}
