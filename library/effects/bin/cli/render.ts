/**
 * The two output registers (CLI grill round 2): the human register is
 * a rendering of the content, and `--json` is the described canonical
 * document — the node encoded through the same generated-mirror codec
 * the vectors and the wire speak, rendered sorted-key like the Lean
 * emitter. Nothing here invents a shape.
 *
 * Kind names are owed to the Lean-emitted registry (materialize,
 * byte-gated); until that surface exists, tags render as bare hex —
 * the ruled fallback — and the name table lives in `--help`'s
 * vocabulary, seeded from VOCABULARY.md.
 */
import { Schema } from "effect"
import { Cas } from "../../src/index.ts"
import { canonicalJson } from "../../src/cas/Value.ts"

/** A loaded node as the described binding document: the Lean-computed
 * address and the node it binds — the vector wire shape. */
export const toBinding = (
  address: Cas.ContentId,
  node: Cas.NodeInput,
): Cas.ConformanceVector.VectorBinding => ({
  address,
  node: {
    version: node.kind.version,
    tag: node.kind.tag,
    payload: node.payload,
    refs: node.refs.map((ref) => ({ expectedTag: ref.expectedTag, id: ref.id })),
  },
})

/** The `--json` register for one node: encode through the described
 * codec, then render with the ratified canonical printer — compact,
 * keys ordered by codepoint at every depth. These are the bytes the
 * identity is computed over, so the register is not merely
 * machine-readable, it is the content's own spelling. */
export const renderBindingJson = (
  address: Cas.ContentId,
  node: Cas.NodeInput,
): string =>
  canonicalJson(Schema.encodeSync(Cas.ConformanceVector.VectorBinding)(
    toBinding(address, node),
  ))

/** A kind tag in the protocol spelling: bare hex, two digits. */
export const tagLabel = (tag: number): string =>
  `0x${tag.toString(16).padStart(2, "0")}`

/** A store refusal in the everyday register: every clause named, in
 * the words VOCABULARY.md pins — link, kind, address, store. The fold
 * is the library's own, so a new clause cannot slip through unworded. */
export const casErrorMessage: (error: Cas.Error) => string = Cas.matchError({
  AddressMismatch: (error) =>
    `refused: the bytes stored at ${error.expected} hash to ${error.actual} — storage returned content the address does not name`,
  ContentNotFound: (error) => `nothing in the store at ${error.id}`,
  DanglingReference: (error) =>
    `refused: a link points at ${error.missing}, which is not in the store`,
  NonCanonicalBytes: (error) =>
    `refused: the bytes at ${error.id} are not canonical — the store never renormalizes on read`,
  StoreFailure: (error) => `the store could not answer: ${error.reason}`,
  UnknownKind: (error) =>
    `refused: unknown kind ${tagLabel(error.tag)} at scheme ${error.version}`,
  WrongKindReference: (error) =>
    `refused: a link to ${error.ref} expects kind ${tagLabel(error.expectedTag)}, but that address holds kind ${tagLabel(error.actualTag)}`,
})

/** Printable ASCII only. A payload with any other byte renders as hex:
 * the human register never guesses at an encoding it cannot show. */
const printable = /^[ -~\n\t]*$/u

/** Lenient on purpose: invalid UTF-8 becomes U+FFFD, which the
 * printable test then rejects — so the decision needs no exception. */
const utf8 = new TextDecoder("utf-8")

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

/** The human payload rendering: text when it decodes and prints, hex
 * otherwise, truncated either way. `--json` carries the exact bytes. */
export const renderPayload = (payload: Uint8Array): string => {
  if (payload.length === 0) return "(empty)"
  const text = utf8.decode(payload)
  const shown = printable.test(text) ? text : hex(payload.slice(0, 48))
  const truncated = shown.length > 96 ? `${shown.slice(0, 96)}...` : shown
  return `${truncated.replaceAll("\n", "\\n")}  (${payload.length} bytes)`
}
