/**
 * Plane: internal — private adapters, housed flat.
 * Seam: carriage — hosts and transport clients.
 *
 * Server-side carrier permissions, declared without credential material.
 *
 * This is the security projection of the writ, not the writ itself. The map
 * names what each connection role may address at NATS; passwords and issued
 * users remain environmental inputs owned by the daemon that provisions them.
 * The seam is carriage rather than planes because what this module declares is
 * a connection's authority at the broker — the bucket names it reads are the
 * subjects it grants, not state it carries.
 *
 * @module
 */
import { Schema } from "effect"

import { TOKEN_PATTERN } from "../kernel/Subjects.js"
import { ANCHOR_BUCKET } from "../planes/Anchor.js"
import { CATALOG_BUCKET } from "../planes/Catalog.js"
import { CELL_BUCKET } from "../planes/Cell.js"
import { REGISTER_BUCKET } from "../planes/Register.js"

/**
 * One free coordinate of a subject family: the fabric's own literal-token
 * grammar, imported rather than restated. The families below compose tokens
 * with fixed prefixes and wildcards and stay their own anchored patterns; the
 * alphabet a single coordinate is drawn from has one statement.
 */
const LiteralSubjectToken = Schema.String.check(
  Schema.isPattern(TOKEN_PATTERN),
)

const InboxPrefix = Schema.String.check(
  Schema.isPattern(/^_INBOX\.[^.*>\s]+(?:\.[^.*>\s]+)*$/u),
)

/** A valid NATS permission subject other than the unsafe global inbox grant. */
export const PermissionSubject = Schema.String.check(
  Schema.isPattern(/^(?!_INBOX\.>$)(?:(?:[^.*>\s]+|\*)\.)*(?:[^.*>\s]+|\*|>)$/u),
)

/** A valid NATS permission subject other than the unsafe global inbox grant. */
export type PermissionSubject = typeof PermissionSubject.Type

export const ResponsePermission = Schema.Struct({
  max: Schema.Literal(1),
  expires: Schema.Literal("2s"),
})

export type ResponsePermission = typeof ResponsePermission.Type

export const CarrierPermission = Schema.Struct({
  publish: Schema.Array(PermissionSubject),
  subscribe: Schema.Array(PermissionSubject),
  allow_responses: Schema.optionalKey(ResponsePermission),
})

export type CarrierPermission = typeof CarrierPermission.Type

export const CarrierRole = Schema.Literals([
  "evidence-publisher",
  "fact-publisher",
  "node-publisher",
  "cell",
  "anchor",
  "catalog",
  "register",
  "requester",
  "responder",
])

export type CarrierRole = typeof CarrierRole.Type

export const ReplyingCarrierRole = Schema.Literals([
  "evidence-publisher",
  "fact-publisher",
  "node-publisher",
  "cell",
  "anchor",
  "catalog",
  "register",
  "requester",
])

export type ReplyingCarrierRole = typeof ReplyingCarrierRole.Type

/** The complete set of application roles the current carriers require. */
export const CarrierPermissionMap = Schema.Record(CarrierRole, CarrierPermission)

/** The complete set of application roles the current carriers require. */
export type CarrierPermissionMap = typeof CarrierPermissionMap.Type

const tokenPrefixesOverlap = (left: string, right: string): boolean =>
  left === right || left.startsWith(`${right}.`) || right.startsWith(`${left}.`)

const InboxPrefixes = Schema.Record(ReplyingCarrierRole, InboxPrefix).check(
  Schema.makeFilter((prefixes) => {
    const issues: Array<Schema.FilterIssue> = []
    for (const [index, role] of ReplyingCarrierRole.literals.entries()) {
      const prefix = prefixes[role]
      for (const otherRole of ReplyingCarrierRole.literals.slice(index + 1)) {
        const otherPrefix = prefixes[otherRole]
        if (tokenPrefixesOverlap(prefix, otherPrefix)) {
          issues.push({
            path: [otherRole],
            issue: `inbox prefix must be token-prefix-disjoint from ${role} (${prefix})`,
          })
        }
      }
    }
    return issues
  }),
)

export const CarrierPermissionScope = Schema.Struct({
  evidenceLane: LiteralSubjectToken,
  evidenceStreams: Schema.NonEmptyArray(LiteralSubjectToken),
  commonsStream: LiteralSubjectToken,
  factVenue: LiteralSubjectToken,
  node: LiteralSubjectToken,
  inboxPrefixes: InboxPrefixes,
})

export type CarrierPermissionScope = typeof CarrierPermissionScope.Type

const streamInfo = (streams: ReadonlyArray<string>): ReadonlyArray<string> =>
  streams.map((stream) => `$JS.API.STREAM.INFO.${stream}`)

const jetStreamManagerInfo = "$JS.API.INFO"

const withInbox = (
  publish: ReadonlyArray<string>,
  inboxPrefix: string,
): CarrierPermission => ({
  publish,
  subscribe: [`${inboxPrefix}.>`],
})

/**
 * One role's authority over the KV buckets its carrier opens.
 *
 * A role usually opens one bucket, but the anchor carrier opens two: the
 * checkpoint facts are its own, and the state those facts name is an ordinary
 * cataloged value in the durable catalog's bucket, which the carrier reads and
 * writes on the same connection. A role that could reach only one of them could
 * not resume a fold.
 */
const kv = (
  buckets: ReadonlyArray<string>,
  inboxPrefix: string,
): CarrierPermission => withInbox([
  jetStreamManagerInfo,
  ...buckets.flatMap((bucket) => [
    `$JS.API.STREAM.INFO.KV_${bucket}`,
    `$JS.API.DIRECT.GET.KV_${bucket}.>`,
    `$KV.${bucket}.>`,
  ]),
], inboxPrefix)

/**
 * Projects one deployment's carrier coordinates into exact NATS permissions.
 *
 * Streams and buckets are pre-provisioned: application roles may inspect the
 * exact backing stream but receive no create, update, purge, or delete API.
 * Every request-bearing role receives only its credential-owned inbox prefix.
 */
export const declareCarrierPermissionMap = (
  input: CarrierPermissionScope,
): CarrierPermissionMap => {
  const scope = Schema.decodeSync(CarrierPermissionScope)(input, {
    onExcessProperty: "error",
  })

  return Schema.decodeSync(CarrierPermissionMap)({
    "evidence-publisher": withInbox([
      jetStreamManagerInfo,
      ...streamInfo(scope.evidenceStreams),
      `flb.fab.ev.${scope.evidenceLane}.*`,
    ], scope.inboxPrefixes["evidence-publisher"]),
    "fact-publisher": withInbox([
      jetStreamManagerInfo,
      ...streamInfo([scope.commonsStream]),
      `flb.fab.fact.${scope.factVenue}`,
    ], scope.inboxPrefixes["fact-publisher"]),
    "node-publisher": withInbox([
      jetStreamManagerInfo,
      ...streamInfo([scope.commonsStream]),
      `flb.fab.node.${scope.node}`,
    ], scope.inboxPrefixes["node-publisher"]),
    cell: kv([CELL_BUCKET], scope.inboxPrefixes.cell),
    anchor: kv([ANCHOR_BUCKET, CATALOG_BUCKET], scope.inboxPrefixes.anchor),
    catalog: kv([CATALOG_BUCKET], scope.inboxPrefixes.catalog),
    register: kv([REGISTER_BUCKET], scope.inboxPrefixes.register),
    requester: withInbox(
      ["flb.req.>"],
      scope.inboxPrefixes.requester,
    ),
    responder: {
      publish: [],
      subscribe: ["flb.req.>"],
      allow_responses: { max: 1, expires: "2s" },
    },
  }, { onExcessProperty: "error" })
}
