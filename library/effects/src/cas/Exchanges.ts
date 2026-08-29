/**
 * The exchange kind — interactions as content.
 *
 * R15 rules the agent seam SYMMETRIC: an agent programs the store as a
 * client of `CasSig`, and the store programs an agent as a handler of
 * `LlmSig`, where `infer` is an operation whose ANSWER ENTERS ONLY AS
 * RECORDED CONTENT. This module is the stored form of that recording,
 * and it is the hand mirror of Lean `Cas.Schema.Exchange` — the two are
 * pinned to the same bytes and the same address.
 *
 * Nothing here is new theory. An exchange is a described kind like any
 * other: it rides the store's admission law, its references are typed
 * edges the store checks, and the provenance of an answer is the DAG
 * walk the store already performs.
 *
 * `subject` is a tagged union rather than a single reference because a
 * reference demands ONE kind tag and "what this exchange was about" is
 * genuinely alternatives: the `schema` arm addresses a schema node, and
 * the `exchange` arm addresses the exchange before it. Following the
 * second arm to exhaustion IS the conversation.
 *
 * No `role` field is spelled. Role is a property of an UTTERANCE and an
 * exchange is the PAIR; the seam has one operation and one answer, so
 * position already says which side spoke.
 */
import { cast, Schema } from "effect"
import { Byte, ContentId } from "./Node.ts"
import { refWithTag, type Root } from "./Value.ts"
import { SchemaKindTag } from "../internal/kindTags.ts"

/** The kind tag exchange nodes reside at.
 *
 * A WORKING tag, deliberately absent from `ReservedKindTags`: minting
 * plane identity is the reserved-tag ruling's question, and until it is
 * answered an exchange resides at a tag its callers own — which is what
 * lets `Cas.value` accept it. The `exchange` arm of the subject union
 * demands this tag, so a chain is only walkable when its nodes reside
 * here; that constraint is the whole content of the ruling. */
export const KindTag = 0x58

/** What one exchange is about, by plane — the hand mirror of Lean
 * `Cas.Schema.ExchangeSubject`.
 *
 * A derived union's mode is `oneOf` and the mode is part of its
 * identity, so this is `Schema.Union([...], { mode: "oneOf" })` and not
 * `Schema.TaggedUnion`, which builds at the default `anyOf`. Member
 * order and field order are the canonical order the deriving handler
 * spells: members by ascending tag, fields with `_tag` first. */
export const Subject = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal("exchange"),
    address: refWithTag(Byte.make(KindTag)),
  }),
  Schema.Struct({
    _tag: Schema.Literal("schema"),
    address: refWithTag(Byte.make(SchemaKindTag)),
  }),
], { mode: "oneOf" })

/** What one exchange is about. */
export type Subject = typeof Subject.Type

/** One recorded turn of the agent seam — the hand mirror of Lean
 * `Cas.Schema.Exchange`, and the codec an exchange node is stored
 * through.
 *
 * The answer's bytes are kept AS SPOKEN. Under the acquisition loop the
 * model's output is evidence and carries no trust, so normalizing it
 * here would destroy the very thing a later gate has to judge. Field
 * order is the canonical (sorted) order the Lean side authors in. */
export const Exchange = Schema.Struct({
  answer: Schema.String,
  prompt: Schema.String,
  subject: Subject,
})

/** One exchange node's value. */
export type Exchange = typeof Exchange.Type

/** An address as the reference an arm decodes to. Nothing is checked
 * here: encode stamps the arm's expected tag into the sentinel, and the
 * store's admission law refuses the edge when the node at that address
 * is of another kind. */
const arm = (address: ContentId): Root<unknown> => cast(address)

/** The exchange was about the schema stored at this address. */
export const aboutSchema = (address: ContentId): Subject => ({
  _tag: "schema",
  address: arm(address),
})

/** The exchange followed the exchange stored at this address — the edge
 * a conversation is walked along. */
export const aboutExchange = (address: ContentId): Subject => ({
  _tag: "exchange",
  address: arm(address),
})

/** Build the exchange node value recording one turn about `subject`.
 * Storing it is `Cas.value({ kindTag: Exchanges.KindTag, revision,
 * schema: Exchanges.Exchange })` — the `exchange` arm only resolves for
 * chains stored at `KindTag`. */
export const recorded = (subject: Subject) =>
(turn: {
  readonly prompt: string
  readonly answer: string
}): Exchange => ({
  answer: turn.answer,
  prompt: turn.prompt,
  subject,
})
