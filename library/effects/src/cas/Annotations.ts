/**
 * The estate's persistent annotation namespace on Effect Schema.
 *
 * Store metadata rides annotations, never constructors, and only string
 * keys survive: `pruneAnnotations` drops symbol-keyed and non-JSON entries
 * at persistence and code generation
 * (`SchemaRepresentation.ts:927`). Every key here therefore sits under
 * `foldlab/cas/` — a plain slash namespace, open by design, and never the
 * reserved `~*` space Effect keeps for itself.
 *
 * Two attachment facts decide the whole surface, and both are Effect's,
 * not ours:
 *
 * 1. **The representation lowers the ENCODED side.** `toRepresentation`
 *    walks `getLastEncoding`, so an annotation attached to the type side
 *    of a transformation never reaches the persisted document. Attachment
 *    goes through `Schema.annotateEncoded`.
 * 2. **`annotate` lands on the LAST CHECK when checks exist**
 *    (`SchemaAST.annotate`), and resolution reads that same slot
 *    (`internal/schema/annotations.ts:6-8`). Reading `ast.annotations`
 *    directly loses anything attached after a `.check(...)`.
 *
 * `resolveAnnotation` is the single reader that respects fact 2, and the
 * only annotation read the CAS plane performs.
 *
 * The namespace has a second face. Annotations that ride the DAG rather
 * than a live carrier are store content: `Annotation` below is the
 * described sidecar kind, whose subject is a typed reference to a schema
 * node. Its Lean twin is `Cas.Schema.Annotation`, and the two are pinned
 * to the same bytes.
 */
import { cast, Option, Predicate, Schema, SchemaAST } from "effect"
import { Byte, ContentId } from "./Node.ts"
import { refWithTag, type Root } from "./Value.ts"
import { SchemaKindTag } from "../internal/kindTags.ts"

/** The prefix every persistent foldlab annotation key carries. */
export const Namespace = "foldlab/cas/"

/** The content address of the schema a carrier describes — the first key
 * of the namespace, and the seed of the annotation-borne DAG. */
export const AddressKey = `${Namespace}address`

/** Read one annotation off an AST the way Effect resolves it: the last
 * check's slot when the node carries checks, the node's own slot
 * otherwise. Both slots are consulted, resolution slot first, so a value
 * is found whichever side of a `.check(...)` it was attached on; without
 * that fallback the attachment order silently decides whether the value
 * exists. */
export const resolveAnnotation = (
  ast: SchemaAST.AST,
  key: string | symbol,
): unknown => {
  const resolved = ast.checks === undefined
    ? undefined
    : Reflect.get(ast.checks.at(-1)?.annotations ?? {}, key)
  return resolved === undefined
    ? Reflect.get(ast.annotations ?? {}, key)
    : resolved
}

/** Attach a content address to a carrier so it survives persistence.
 * Encoded-side attachment is the point: the type side is erased from the
 * representation whenever the carrier is a transformation. */
export const annotateAddress = (address: ContentId) =>
<S extends Schema.Top>(schema: S): S["Rebuild"] =>
  Schema.annotateEncoded({ [AddressKey]: address })(schema)

/** The content address a carrier declares, read off its encoded side.
 * A missing or malformed value fails closed as `None`. */
export const addressOf = (schema: Schema.Top): Option.Option<ContentId> => {
  const carried = resolveAnnotation(
    Schema.toEncoded(schema).ast,
    AddressKey,
  )
  return Predicate.isString(carried)
    ? Schema.decodeOption(ContentId)(carried)
    : Option.none()
}

/** The sidecar annotation kind — the hand mirror of Lean
 * `Cas.Schema.Annotation`, and the codec an annotation node is stored
 * through.
 *
 * Annotation content is STORE CONTENT: nothing is added to the schema
 * carrier, and one annotation node says one thing about one schema. The
 * subject is a typed reference to a schema node (kind tag `0x53`), so
 * the edge references the schema AS a schema rather than inlining a
 * copy of it; the DAG carries as many annotations per subject as wanted.
 *
 * `subject` decodes to a `Root` and encodes to a reference sentinel, so
 * the same declaration this schema lowers to — what the byte pin
 * compares against the Lean fixture — is also the live reference codec
 * the value plane rides. Field order is the canonical (sorted) order the
 * Lean side authors in. */
export const Annotation = Schema.Struct({
  key: Schema.String,
  subject: refWithTag(Byte.make(SchemaKindTag)),
  value: Schema.String,
})

/** One annotation node's value. */
export type Annotation = typeof Annotation.Type

/** A schema node's address as the reference the subject field decodes
 * to. Nothing is checked here: encode stamps the schema kind tag into
 * the sentinel, and the store's admission law refuses the edge when the
 * subject is not a schema node. */
const subjectRoot = (subject: ContentId): Root<unknown> => cast(subject)

/** Build the annotation node value that carries `key`/`value` about the
 * schema stored at `subject` — the address `CanonicalSchema.put` answers.
 * Storing it is `Cas.value({ kindTag, revision, schema: Annotation })`;
 * the node kind an annotation resides at is the caller's, since the
 * annotation plane has no reserved tag of its own. */
export const annotationOn = (subject: ContentId) =>
(annotation: {
  readonly key: string
  readonly value: string
}): Annotation => ({
  key: annotation.key,
  subject: subjectRoot(subject),
  value: annotation.value,
})
