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
 * described sidecar kind, whose subject is a typed reference to whatever
 * addressable plane the annotation is about. Its Lean twin is
 * `Cas.Schema.Annotation`, and the two are pinned to the same bytes.
 */
import { cast, Option, Predicate, Schema, SchemaAST } from "effect"
import { Byte, ContentId } from "./Node.ts"
import { refWithTag, type Root } from "./Value.ts"
import { GitKindTag, SchemaKindTag } from "../internal/kindTags.ts"
import { KindTagsByName } from "./generated/grammar/kindTags.ts"
import { KindTag as ExchangeKindTag } from "./Exchanges.ts"

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

/** The tag `cont` nodes reside at — a published program is a `cont`
 * node at an address (R7), which is what makes a human-facing name on a
 * program spellable at all. Read off the generated registry, never
 * spelled. */
export const ProgramKindTag = KindTagsByName.cont

/** The tag system nodes reside at — the service-topology plane's
 * WORKING tag, owned in Lean by `Cas.Schema.systemKindTag`.
 *
 * It is spelled here rather than in a system module because there is no
 * TypeScript mirror of `SystemNode`: that lane generates layers, it does
 * not ingest topologies. When a mirror lands, this constant moves to it
 * the way `Exchanges.KindTag` sits with the exchange mirror. Like every
 * working tag it is deliberately absent from `ReservedKindTags`. */
export const SystemKindTag = 0x54

/** What one annotation is about, by plane — the hand mirror of Lean
 * `Cas.Schema.AnnotationSubject`.
 *
 * The subject was a bare `refWithTag(SchemaKindTag)`: a schema node and
 * nothing else. A projection of a program, a topology, an exchange or a
 * git object was literally unspellable, which made three separate
 * things impossible at once — a view's link to the value it projects, a
 * program's human-facing name, and a topology's link to written code.
 * A reference demands ONE kind tag, so "which plane" is genuinely
 * alternatives and the answer is a union, on the `Exchanges.Subject`
 * precedent.
 *
 * A derived union's mode is `oneOf` and the mode is part of its
 * identity, so this is `Schema.Union([...], { mode: "oneOf" })` and not
 * `Schema.TaggedUnion`, which builds at the default `anyOf`. Member
 * order and field order are the canonical order the deriving handler
 * spells: members by ascending tag, fields with `_tag` first. */
export const Subject = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("exchange"),
    address: refWithTag(Byte.make(ExchangeKindTag)),
  }),
  Schema.Struct({
    _tag: Schema.Literal("git"),
    address: refWithTag(Byte.make(GitKindTag)),
  }),
  Schema.Struct({
    _tag: Schema.Literal("program"),
    address: refWithTag(Byte.make(ProgramKindTag)),
  }),
  Schema.Struct({
    _tag: Schema.Literal("schema"),
    address: refWithTag(Byte.make(SchemaKindTag)),
  }),
  Schema.Struct({
    _tag: Schema.Literal("system"),
    address: refWithTag(Byte.make(SystemKindTag)),
  }),
], { mode: "oneOf" })

/** What one annotation is about. */
export type Subject = typeof Subject.Type

/** What one annotation SAYS — the hand mirror of Lean
 * `Cas.Schema.AnnotationValue`.
 *
 * The value was a plain `Schema.String`, and the kind's own docstring
 * admitted what that cost: "a content address in hex when the value is
 * itself store content." A hex string is not an edge. It never reaches
 * `refCount`, `Graph.verify` never walks it, and `WrongKindReference`
 * can never fire on it — which is exactly the out-of-band config a
 * content-addressed estate exists to remove.
 *
 * The `ref` arm carries a `Subject` rather than a bare reference for the
 * reason the subject is a union at all: a reference must name its
 * expected tag, so a single generic arm cannot be spelled, and a second
 * flattened copy of the plane list would drift from the first. Nesting
 * keeps admission checkable — every arm still names its tag, and the
 * store refuses an edge whose target is of another kind. */
export const Value = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("ref"),
    address: Subject,
  }),
  Schema.Struct({
    _tag: Schema.Literal("text"),
    text: Schema.String,
  }),
], { mode: "oneOf" })

/** What one annotation says. */
export type Value = typeof Value.Type

/** The sidecar annotation kind — the hand mirror of Lean
 * `Cas.Schema.Annotation`, and the codec an annotation node is stored
 * through.
 *
 * Annotation content is STORE CONTENT: nothing is added to the schema
 * carrier, and one annotation node says one thing about one addressed
 * value. The DAG carries as many annotations per subject as wanted.
 *
 * Every reference decodes to a `Root` and encodes to a reference
 * sentinel, so the same declaration this schema lowers to — what the
 * byte pin compares against the Lean fixture — is also the live
 * reference codec the value plane rides. Field order is the canonical
 * (sorted) order the Lean side authors in. */
export const Annotation = Schema.Struct({
  key: Schema.String,
  subject: Subject,
  value: Value,
})

/** One annotation node's value. */
export type Annotation = typeof Annotation.Type

/** An address as the reference an arm decodes to. Nothing is checked
 * here: encode stamps the arm's expected tag into the sentinel, and the
 * store's admission law refuses the edge when the node at that address
 * is of another kind. */
const arm = (address: ContentId): Root<unknown> => cast(address)

/** The annotation is about the schema stored at this address. */
export const onSchema = (address: ContentId): Subject => ({
  _tag: "schema",
  address: arm(address),
})

/** The annotation is about the service topology stored at this address
 * — the arm the NAME SEAT rides. */
export const onSystem = (address: ContentId): Subject => ({
  _tag: "system",
  address: arm(address),
})

/** The annotation is about the published program (`cont` node) stored
 * at this address. */
export const onProgram = (address: ContentId): Subject => ({
  _tag: "program",
  address: arm(address),
})

/** The annotation is about the recorded turn stored at this address. */
export const onExchange = (address: ContentId): Subject => ({
  _tag: "exchange",
  address: arm(address),
})

/** The annotation is about the git object stored at this address. */
export const onGit = (address: ContentId): Subject => ({
  _tag: "git",
  address: arm(address),
})

/** The annotation says this text. */
export const text = (text: string): Value => ({ _tag: "text", text })

/** The annotation points at this addressed content — a typed edge the
 * store walks and refuses, where a hex string used to sit. */
export const ref = (address: Subject): Value => ({ _tag: "ref", address })

/** Build the annotation node value that carries `key`/`value` about
 * whatever `subject` addresses. Storing it is
 * `Cas.value({ kindTag, revision, schema: Annotation })`; the node kind
 * an annotation resides at is the caller's, since the annotation plane
 * has no reserved tag of its own. */
export const annotationOn = (subject: Subject) =>
(annotation: {
  readonly key: string
  readonly value: Value
}): Annotation => ({
  key: annotation.key,
  subject,
  value: annotation.value,
})
