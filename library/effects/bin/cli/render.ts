/**
 * The two output registers (CLI grill round 2): the human register is
 * a rendering of the content, and `--json` is the described canonical
 * document — the node encoded through the same generated-mirror codec
 * the vectors and the wire speak, rendered sorted-key like the Lean
 * emitter. Nothing here invents a shape.
 *
 * Kind names come from the Lean-emitted registry — `KindTagRows` in
 * `src/cas/generated/grammar/kindTags.ts`, byte-identity-gated by
 * `check:cas`. The hex stays beside the name because the tag is the
 * wire fact and the name is the everyday one, and a reader of `show`
 * needs both: "schema (0x53)". A tag the registry gives no row is
 * printed as bare hex, which is now a statement about that tag rather
 * than about this file.
 */
import { Schema } from "effect"
import { Cas } from "../../src/index.ts"
import { canonicalJson } from "../../src/cas/Value.ts"
import { KindTagRows, KindTagsByName } from "../../src/cas/generated/grammar/kindTags.ts"
import { AnnotationKindTag } from "./naming.ts"

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
export const tagHex = (tag: number): string =>
  `0x${tag.toString(16).padStart(2, "0")}`

/** The registry row a tag has, by tag — the generated table indexed
 * once, so no rendering re-spells a number the emitter already owns. */
const kindNames: ReadonlyMap<number, string> = new Map(
  KindTagRows.map((row): readonly [number, string] => [row.tag, row.name]),
)

/** Whether the registry gives this tag a row. A tag with none is still
 * admitted — the store admits every tag at the scheme version — but it
 * is a working tag, and `put` says so. */
export const isRegisteredTag = (tag: number): boolean => kindNames.has(tag)

/** The everyday overlay on the registry names (vocabulary collision
 * 3): a `cont` node is never named in a rendered surface — it is the
 * program — and a `step` node is one of the program's steps. Only the
 * human register wears this; the machine register keeps the registry
 * names, which are the emitted facts. */
const everydayNames: ReadonlyMap<number, string> = new Map([
  [KindTagsByName.cont, "program"],
  [KindTagsByName.step, "program step"],
  // The annotation plane's working tag — the Lean pin's own choice
  // (`pinAnnotationKindTag`, 0x41), the tag `cas name` writes at. A
  // working tag has no registry row, so `isRegisteredTag` still says
  // false and `put` still says so out loud; this row only keeps a
  // published name from rendering as an unexplained hex byte in `ls`.
  [AnnotationKindTag, "annotation"],
])

/** A kind in the everyday register: its name with the wire byte beside
 * it, `schema (0x53)` — the everyday word where the vocabulary rules
 * one (`program (0x0f)`), the registry's name otherwise. A tag the
 * registry gives no row has no name to print, so it renders as the
 * byte alone. */
export const tagLabel = (tag: number): string => {
  const name = everydayNames.get(tag) ?? kindNames.get(tag)
  return name === undefined ? tagHex(tag) : `${name} (${tagHex(tag)})`
}

/**
 * A kind in the machine register: the registry name when there is one,
 * the wire tag as a number, and whether the registry gives it a row —
 * spelled so an agent does not have to parse `schema (0x53)` back
 * apart. The everyday overlay is prose-only on purpose: `name` here is
 * the emitted registry's own word (`cont`, `step`), because the machine
 * register reports emitted facts, not renderings of them.
 */
export const kindJson = (tag: number, version: number): Schema.Json => ({
  name: kindNames.get(tag) ?? null,
  registered: isRegisteredTag(tag),
  tag,
  version,
})

/** THE `--json` printer for every verb: the ratified canonical one, so
 * the machine register is compact and its keys are ordered by codepoint
 * at every depth — one shape, whoever is reading. The argument is
 * `Schema.Json` and not `unknown`, so a verb that tried to print
 * something with no JSON spelling would not compile. */
export const renderJson = (value: Schema.Json): string => canonicalJson(value)

/** A store refusal in the everyday register: every clause named, in
 * the words VOCABULARY.md pins — link, kind, address, store. The fold
 * is the library's own, so a new clause cannot slip through unworded. */
export const casErrorMessage: (error: Cas.Error) => string = Cas.matchError({
  AddressMismatch: (error) =>
    `refused: the bytes stored at ${error.expected} hash to ${error.actual} — storage returned content the address does not name (corrupt content, or a possible scheme mismatch: the store verifies with its own address scheme)`,
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
