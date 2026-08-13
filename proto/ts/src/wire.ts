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
export const INGRESS_PREFIX = "flb.ing."

// ——— shapes ———

export const NextHint = Schema.Struct({
  subject: Schema.String,
  note: Schema.String,
  body: Schema.optionalKey(Schema.Unknown),
})
export type NextHint = typeof NextHint.Type

export const RefusalKind = Schema.Literals([
  "malformed",
  "invalid-structure",
  "unknown-ref",
  "digest-mismatch",
  "unknown-identity",
  "bad-journal",
  "unknown-journal",
  "bad-cursor",
  "bad-stream",
  "bad-bucket",
  "unknown-request",
  "unreachable",
  "malformed-reply",
  "verify-failed",
  "beyond-v0",
  "underivable",
])
export type RefusalKind = typeof RefusalKind.Type

export const Refusal = Schema.Struct({
  kind: RefusalKind,
  law: Schema.String,
  path: Schema.optionalKey(Schema.Array(Schema.String)),
  got: Schema.optionalKey(Schema.Unknown),
  expected: Schema.optionalKey(Schema.Unknown),
  example: Schema.optionalKey(Schema.Unknown),
  next: Schema.Array(NextHint),
  local: Schema.Boolean,
})
export type Refusal = typeof Refusal.Type

export const RefusalReply = Schema.Struct({
  ok: Schema.Literal(false),
  refusal: Refusal,
})
export type RefusalReply = typeof RefusalReply.Type

export const CreateReply = Schema.Struct({
  ok: Schema.Literal(true),
  created: Schema.Boolean,
  digest: Schema.String,
  scheme: Schema.String,
  catalogSeq: Schema.Int,
  catalogHead: Schema.String,
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
  refs: Schema.Array(Schema.String),
})
export type FrontierEntry = typeof FrontierEntry.Type

export const ConciergeReply = Schema.Struct({
  ok: Schema.Literal(true),
  partial: Schema.Json,
  frontier: Schema.Array(FrontierEntry),
  next: Schema.Array(NextHint),
})
export type ConciergeReply = typeof ConciergeReply.Type

export const WireEntry = Schema.Struct({
  seq: Schema.Int,
  prev: Schema.String,
  payload: Schema.String,
})
export type WireEntry = typeof WireEntry.Type

export const ReadReply = Schema.Struct({
  ok: Schema.Literal(true),
  journal: Schema.String,
  entries: Schema.Array(WireEntry),
  seq: Schema.Int,
  head: Schema.String,
  partial: Schema.Boolean,
  note: Schema.String,
  next: Schema.Array(NextHint),
})
export type ReadReply = typeof ReadReply.Type

export const AdmitReply = Schema.Struct({
  ok: Schema.Literal(true),
  admitted: Schema.Boolean,
  journal: Schema.String,
  seq: Schema.Int,
  head: Schema.String,
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

export const localRefusal = (
  kind: RefusalKind,
  law: string,
  extra?: Partial<Pick<Refusal, "got" | "expected" | "path" | "example">>,
): Refusal => ({
  kind,
  law,
  next: [],
  local: true,
  ...extra,
})

/** Decode raw reply bytes into a typed fact or a refusal. Every failure
 * mode — non-JSON, non-conforming fact, non-conforming refusal — lands
 * in the refusal channel, marked local. */
export const decodeReply = <S extends Schema.Codec<any, any, never, never>>(
  fact: S,
  raw: Uint8Array | string,
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
      }),
    }
  }
  if (typeof parsed === "object" && parsed !== null && (parsed as { ok?: unknown }).ok === false) {
    const refused = Schema.decodeUnknownResult(RefusalReply)(parsed)
    if (Result.isSuccess(refused)) return { ok: false, refusal: refused.success.refusal }
    return {
      ok: false,
      refusal: localRefusal(
        "malformed-reply",
        "the daemon said no, but its refusal does not carry the uniform shape",
        { got: parsed },
      ),
    }
  }
  const decoded = Schema.decodeUnknownResult(fact)(parsed)
  if (Result.isSuccess(decoded)) return { ok: true, fact: decoded.success }
  return {
    ok: false,
    refusal: localRefusal("malformed-reply", "the reply does not carry the declared fact shape", {
      got: parsed,
      expected: String(decoded.failure),
    }),
  }
}
