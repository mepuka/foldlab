import { Schema } from "effect"

import { ANCHOR_BUCKET } from "../planes/Anchor.js"
import { CELL_BUCKET } from "../planes/Cell.js"
import { REGISTER_BUCKET } from "../planes/Register.js"

/**
 * Server-side carrier permissions, declared without credential material.
 *
 * This is the security projection of the writ, not the writ itself. The map
 * names what each connection role may address at NATS; passwords and issued
 * users remain environmental inputs owned by the daemon that provisions them.
 */

const LiteralSubjectToken = Schema.String.check(
  Schema.isPattern(/^[^.*>\s]+$/u),
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
  "register",
  "requester",
])

export type ReplyingCarrierRole = typeof ReplyingCarrierRole.Type

/** The complete set of application roles the current carriers require. */
export const CarrierPermissionMap = Schema.Record(CarrierRole, CarrierPermission)

/** The complete set of application roles the current carriers require. */
export type CarrierPermissionMap = typeof CarrierPermissionMap.Type

const InboxPrefixes = Schema.Record(ReplyingCarrierRole, InboxPrefix)

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

const kv = (
  bucket: string,
  inboxPrefix: string,
): CarrierPermission => withInbox([
  jetStreamManagerInfo,
  `$JS.API.STREAM.INFO.KV_${bucket}`,
  `$JS.API.DIRECT.GET.KV_${bucket}.>`,
  `$KV.${bucket}.>`,
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
  const scope = Schema.decodeUnknownSync(CarrierPermissionScope)(input, {
    onExcessProperty: "error",
  })
  const inboxes = Object.values(scope.inboxPrefixes)
  if (new Set(inboxes).size !== inboxes.length) {
    throw new Error("carrier permission inbox prefixes must be unique per credential role")
  }

  return Schema.decodeUnknownSync(CarrierPermissionMap)({
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
    cell: kv(CELL_BUCKET, scope.inboxPrefixes.cell),
    anchor: kv(ANCHOR_BUCKET, scope.inboxPrefixes.anchor),
    register: kv(REGISTER_BUCKET, scope.inboxPrefixes.register),
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
