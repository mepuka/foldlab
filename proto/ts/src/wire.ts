// The seam as data, typed: Effect Schema faces for every wire shape the
// daemon speaks. Decoding is Result-based — a malformed reply is a
// local refusal value, never a throw across the seam (W8).
import { Result, Schema } from "effect"

// ——— subjects (must match proto/wire/CONTRACT.md and the Go side) ———

export const SUBJECT_TYPE_CREATE = "flb.req.type.create"
export const SUBJECT_TYPE_FILL = "flb.req.type.fill"
export const SUBJECT_TYPE_UNFILL = "flb.req.type.unfill"
export const SUBJECT_JOURNAL_READ = "flb.req.journal.read"
export const SUBJECT_CONTRACT_DESCRIBE = "flb.req.contract.describe"
export const SUBJECT_SESSION_OPEN = "flb.req.session.open"
export const SUBJECT_SESSION_MOVE = "flb.req.session.move"
export const SUBJECT_SESSION_STATE = "flb.req.session.state"
export const SUBJECT_SESSION_COMMIT = "flb.req.session.commit"
export const INGRESS_PREFIX = "flb.ing."

// Daemon refusal sorts are persisted on the wire. A future refusal corpus may
// admit only `structural`; `absence` is a head-relative observation that later
// presence can repeal. Readers retain the field rather than reclassifying an
// archived refusal through the current table.
export const DAEMON_REFUSAL_SORTS = {
  "malformed": "structural",
  "invalid-structure": "structural",
  "digest-mismatch": "structural",
  "bad-cursor": "structural",
  "unknown-request": "structural",
  "bad-journal": "structural",
  "unknown-ref": "absence",
  "unknown-identity": "absence",
  "unknown-journal": "absence",
  "session-stale": "absence",
  "session-principal": "structural",
  "compaction-blocked": "absence",
} as const

export type DaemonRefusalKind = keyof typeof DAEMON_REFUSAL_SORTS
export type RefusalSort = typeof DAEMON_REFUSAL_SORTS[DaemonRefusalKind]

// Digest of the canonical { grammar, sortByKind } manifest frozen in
// proto/wire/refusal-sorts.json. A re-sort must mint a new grammar digest.
export const REFUSAL_SORT_GRAMMAR = "flb.type.v0+flb.session.v0"
export const REFUSAL_SORT_GRAMMAR_DIGEST =
  "080507edd048db53696fa855243c2f7811b867f2b92820957bda2798949999fc"

export const refusalSortOf = (kind: string): RefusalSort | undefined =>
  Object.prototype.hasOwnProperty.call(DAEMON_REFUSAL_SORTS, kind)
    ? DAEMON_REFUSAL_SORTS[kind as DaemonRefusalKind]
    : undefined

// ——— shapes ———

export const Hex64 = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/))
export const NonNegativeInt = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
)
export const CursorSeq = Schema.Int.check(
  Schema.isBetween({ minimum: -1, maximum: Number.MAX_SAFE_INTEGER }),
)

export const NextHint = Schema.Struct({
  subject: Schema.String,
  note: Schema.String,
  body: Schema.optionalKey(Schema.Unknown),
})
export type NextHint = typeof NextHint.Type

const RefusalFields = {
  kind: Schema.String,
  law: Schema.String,
  path: Schema.optionalKey(Schema.Array(Schema.String)),
  got: Schema.optionalKey(Schema.Unknown),
  expected: Schema.optionalKey(Schema.Unknown),
  example: Schema.optionalKey(Schema.Unknown),
  next: Schema.Array(NextHint),
} as const

export const DaemonRefusal = Schema.Struct({
  ...RefusalFields,
  sort: Schema.Literals(["structural", "absence"]),
  local: Schema.Literal(false),
})
export type DaemonRefusal = typeof DaemonRefusal.Type

export const LocalRefusal = Schema.Struct({
  ...RefusalFields,
  local: Schema.Literal(true),
})
export type LocalRefusal = typeof LocalRefusal.Type

export const Refusal = Schema.Union([DaemonRefusal, LocalRefusal])
export type Refusal = typeof Refusal.Type

export const RefusalReply = Schema.Struct({
  ok: Schema.Literal(false),
  refusal: DaemonRefusal,
})
export type RefusalReply = typeof RefusalReply.Type

export const CreateReply = Schema.Struct({
  ok: Schema.Literal(true),
  created: Schema.Boolean,
  digest: Hex64,
  scheme: Schema.String,
  catalogSeq: NonNegativeInt,
  catalogHead: Hex64,
  next: Schema.Array(NextHint),
})
export type CreateReply = typeof CreateReply.Type

export const FrontierChoice = Schema.Struct({
  kind: Schema.String,
  example: Schema.Json,
})
export type FrontierChoice = typeof FrontierChoice.Type

export const FrontierEntry = Schema.Struct({
  path: Schema.Array(Schema.String),
  legal: Schema.Array(FrontierChoice),
  refs: Schema.Array(Hex64),
})
export type FrontierEntry = typeof FrontierEntry.Type

export const ConciergeReply = Schema.Struct({
  ok: Schema.Literal(true),
  partial: Schema.Json,
  frontier: Schema.Array(FrontierEntry),
  next: Schema.Array(NextHint),
})
export type ConciergeReply = typeof ConciergeReply.Type

export const SessionAnchor = Schema.Struct({
  key: Schema.String,
  head: Schema.String,
  stateDigest: Schema.String,
})
export interface SessionAnchor extends Schema.Schema.Type<typeof SessionAnchor> {}

export const SessionStateReply = Schema.Struct({
  ok: Schema.Literal(true),
  session: Schema.String,
  head: Schema.String,
  step: Schema.Int,
  principal: Schema.String,
  partial: Schema.Json,
  stateDigest: Schema.String,
  stateScheme: Schema.String,
  catalogHead: Schema.String,
  frontier: Schema.Array(FrontierEntry),
  anchor: SessionAnchor,
  next: Schema.Array(NextHint),
})
export interface SessionStateReply extends Schema.Schema.Type<typeof SessionStateReply> {}

export const SessionCommitReply = Schema.Struct({
  ok: Schema.Literal(true),
  session: Schema.String,
  head: Schema.String,
  step: Schema.Int,
  principal: Schema.String,
  stateDigest: Schema.String,
  digest: Schema.String,
  scheme: Schema.String,
  catalogSeq: Schema.Int,
  catalogHead: Schema.String,
  next: Schema.Array(NextHint),
})
export interface SessionCommitReply extends Schema.Schema.Type<typeof SessionCommitReply> {}

export const WireEntry = Schema.Struct({
  seq: NonNegativeInt,
  prev: Hex64,
  payload: Schema.String,
})
export type WireEntry = typeof WireEntry.Type

export const ReadReply = Schema.Struct({
  ok: Schema.Literal(true),
  journal: Schema.String,
  entries: Schema.Array(WireEntry),
  seq: CursorSeq,
  head: Hex64,
  note: Schema.String,
  next: Schema.Array(NextHint),
})
export type ReadReply = typeof ReadReply.Type

export const AdmitReply = Schema.Struct({
  ok: Schema.Literal(true),
  admitted: Schema.Boolean,
  journal: Schema.String,
  seq: NonNegativeInt,
  head: Hex64,
  note: Schema.String,
  next: Schema.Array(NextHint),
})
export type AdmitReply = typeof AdmitReply.Type

export const ContractRequest = Schema.Struct({
  name: Schema.String,
  subject: Schema.String,
  note: Schema.String,
  body: Schema.Unknown,
  reply: Schema.Unknown,
})
export type ContractRequest = typeof ContractRequest.Type

export const ContractIngress = Schema.Struct({
  name: Schema.String,
  subjectPattern: Schema.String,
  example: Schema.String,
  note: Schema.String,
  frame: Schema.Unknown,
  reply: Schema.Unknown,
})
export type ContractIngress = typeof ContractIngress.Type

export const Contract = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  scheme: Schema.String,
  note: Schema.String,
  requests: Schema.Array(ContractRequest),
  ingress: ContractIngress,
  refusal: Schema.Unknown,
})
export type Contract = typeof Contract.Type

export const DescribeReply = Schema.Struct({
  ok: Schema.Literal(true),
  contract: Contract,
})
export type DescribeReply = typeof DescribeReply.Type

// ——— reply decoding: fact-or-refusal, as data ———

export type Reply<A> =
  | { readonly ok: true; readonly fact: A }
  | { readonly ok: false; readonly refusal: Refusal }

const defaultLocalNext = (): ReadonlyArray<NextHint> => [{
  subject: SUBJECT_CONTRACT_DESCRIBE,
  note: "inspect the current contract before choosing an explicit repair; no action was retried",
  body: {},
}]

export const localRefusal = (
  kind: string,
  law: string,
  extra?: Partial<Pick<Refusal, "got" | "expected" | "path" | "example" | "next">>,
): Refusal => ({
  kind,
  law,
  next: defaultLocalNext(),
  local: true,
  ...extra,
})

/** Decode raw reply bytes into a typed fact or a refusal. Every failure
 * mode — non-JSON, non-conforming fact, non-conforming refusal — lands
 * in the refusal channel, marked local. */
export const decodeReply = <S extends Schema.Codec<any, any, never, never>>(
  fact: S,
  raw: Uint8Array | string,
  repair?: NextHint,
): Reply<S["Type"]> => {
  let parsed: unknown
  try {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw)
    parsed = JSON.parse(text)
  } catch (error) {
    return {
      ok: false,
      refusal: localRefusal("malformed-reply", "the reply is not JSON", {
        got: String(error),
        ...(repair === undefined ? {} : { next: [repair] }),
      }),
    }
  }
  if (typeof parsed === "object" && parsed !== null && (parsed as { ok?: unknown }).ok === false) {
    const refused = Schema.decodeUnknownResult(RefusalReply, { onExcessProperty: "error" })(parsed)
    if (Result.isSuccess(refused)) return { ok: false, refusal: refused.success.refusal }
    return {
      ok: false,
      refusal: localRefusal(
        "malformed-reply",
        "the daemon said no, but its refusal does not carry the uniform shape",
        { got: parsed, ...(repair === undefined ? {} : { next: [repair] }) },
      ),
    }
  }
  const decoded = Schema.decodeUnknownResult(fact, { onExcessProperty: "error" })(parsed)
  if (Result.isSuccess(decoded)) return { ok: true, fact: decoded.success }
  return {
    ok: false,
    refusal: localRefusal("malformed-reply", "the reply does not carry the declared fact shape", {
      got: parsed,
      expected: String(decoded.failure),
      ...(repair === undefined ? {} : { next: [repair] }),
    }),
  }
}
