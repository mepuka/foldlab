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
 */
import { Option, Predicate, Schema, SchemaAST } from "effect"
import { ContentId } from "./Node.ts"

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
