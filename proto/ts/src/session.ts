// The session facade: sugar strictly above the writ. Every method is
// exactly one client verb plus a transcript entry; no capability is
// added — a session can do nothing a bare three-verb client cannot.
// The transcript is what makes a thread auditable after the fact:
// verb, subject, sent, received, in order.
import type { ProtoClient, Cursor } from "./client.ts"
import type { Json } from "./jcs.ts"
import type { Reply } from "./wire.ts"
import { canonicalize, sha256Hex, structureDigest } from "./jcs.ts"
import {
  INGRESS_PREFIX,
  SUBJECT_CONTRACT_DESCRIBE,
  SUBJECT_JOURNAL_READ,
  SUBJECT_TYPE_CREATE,
  SUBJECT_TYPE_FILL,
  SUBJECT_TYPE_UNFILL,
  SUBJECT_SESSION_STATE,
} from "./wire.ts"
import type { SessionCommitReply, SessionStateReply } from "./wire.ts"

export const SESSION_VERSION = "flb.session.v0"
export const SESSION_JOURNAL_PREFIX = "flb_session_v0_"
export const SESSION_STATE_SCHEME = "bytes-sha256-v1"
export const SESSION_GRAMMAR_DESCRIPTOR: Json = {
  name: "flb.type.v0",
  partialKind: { k: "hole", required: ["k"] },
  productions: [
    { k: "bool", required: ["k"] },
    { k: "brand", required: ["k", "name", "of"], children: { name: "non-empty-string", of: "T" } },
    { k: "check", required: ["base", "check", "k"], children: { base: "T", check: "{name:non-empty-string,args:json-object}" } },
    { k: "float", required: ["k"] },
    { k: "int", required: ["k"] },
    { k: "list", required: ["k", "of"], children: { of: "T" } },
    { k: "literal", required: ["k", "value"], children: { value: "json" } },
    { k: "null", required: ["k"] },
    { k: "opaque", required: ["k"] },
    { k: "ref", required: ["digest", "k"], children: { digest: "hex64" } },
    { k: "string", required: ["k"] },
    {
      k: "struct",
      required: ["fields", "k"],
      optional: ["optional"],
      children: { fields: "record<string,T>", optional: "sorted-unique-field-names" },
    },
    { k: "union", required: ["k", "of"], children: { of: "non-empty-unique-unordered-T-array" } },
  ],
}
export const SESSION_GRAMMAR_DIGEST = sha256Hex(canonicalize(SESSION_GRAMMAR_DESCRIPTOR))

/** The Task-37 state scheme is intentionally pinned to the current dual-record
 * side. When flb.type.v1 lands, old session commits remain bytes-sha256-v1
 * facts and bridge to the new digest; they are never rewritten in place. */
export const sessionStateDigest = (partial: Json): string => structureDigest(partial)

export type SessionRetentionTier = "compactible" | "irreducible" | "never-discardable"

export interface SessionRetentionMark {
  readonly step: number
  readonly kind: string
  readonly tier: SessionRetentionTier
}

export const sessionRetentionTier = (kind: string): SessionRetentionTier => {
  switch (kind) {
    case "fill":
    case "unfill":
    case "refusal":
    case "read":
      return "compactible"
    case "adoption":
    case "commit":
      return "never-discardable"
    default:
      return "irreducible"
  }
}

/** The compaction path is deliberately total but cannot compact yet. Task 32's
 * flb.certification.v0 seam must first export structural refusals and return a
 * corpus digest sealing the summarized prefix; absence refusals may then die. */
export const refuseSessionCompaction = (
  session: string,
  kinds: ReadonlyArray<string>,
): { readonly marks: ReadonlyArray<SessionRetentionMark>; readonly reply: Reply<never> } => ({
  marks: kinds.map((kind, step) => ({ step, kind, tier: sessionRetentionTier(kind) })),
  reply: {
    ok: false,
    refusal: {
      kind: "compaction-blocked",
      law: "G4: session compaction refuses until structural refusals can be sealed into the refusal corpus",
      got: { session, marked: kinds.length },
      expected: "the flb.certification.v0 corpus seam and its emitted corpus digest",
      next: [{
        subject: SUBJECT_SESSION_STATE,
        note: "retain the full session and continue without compaction",
        body: { session },
      }],
      local: true,
    },
  },
})

/** A durable authoring session. This facade composes request only; it neither
 * retries stale heads nor adds an authority protocol. */
export class JournalSession {
  private constructor(
    private readonly client: ProtoClient,
    private currentState: SessionStateReply,
  ) {}

  static async open(
    client: ProtoClient,
    author: string,
    seed?: Json,
  ): Promise<Reply<JournalSession>> {
    const options = seed === undefined
      ? { grammar: SESSION_GRAMMAR_DIGEST, author }
      : { grammar: SESSION_GRAMMAR_DIGEST, author, seed }
    const opened = await client.openSession(options)
    return opened.ok
      ? { ok: true, fact: new JournalSession(client, opened.fact) }
      : opened
  }

  static async resume(client: ProtoClient, session: string): Promise<Reply<JournalSession>> {
    const resumed = await client.sessionState(session)
    return resumed.ok
      ? { ok: true, fact: new JournalSession(client, resumed.fact) }
      : resumed
  }

  get state(): SessionStateReply {
    return this.currentState
  }

  async fill(path: ReadonlyArray<string>, subtree: Json): Promise<Reply<SessionStateReply>> {
    const moved = await this.client.moveSession(
      this.currentState.session,
      this.currentState.head,
      { op: "fill", path, subtree },
    )
    if (moved.ok) this.currentState = moved.fact
    return moved
  }

  async unfill(path: ReadonlyArray<string>): Promise<Reply<SessionStateReply>> {
    const moved = await this.client.moveSession(
      this.currentState.session,
      this.currentState.head,
      { op: "unfill", path },
    )
    if (moved.ok) this.currentState = moved.fact
    return moved
  }

  async refresh(): Promise<Reply<SessionStateReply>> {
    const refreshed = await this.client.sessionState(this.currentState.session)
    if (refreshed.ok) this.currentState = refreshed.fact
    return refreshed
  }

  async commit(submitter?: string): Promise<Reply<SessionCommitReply>> {
    return this.client.commitSession(this.currentState.session, this.currentState.head, submitter)
  }
}

export interface TranscriptEntry {
  readonly step: number
  readonly verb: "request" | "publish" | "read"
  readonly subject: string
  readonly sent: Json
  readonly received: unknown
}

export class Session {
  private readonly entries: TranscriptEntry[] = []

  constructor(private readonly client: ProtoClient) {}

  get transcript(): ReadonlyArray<TranscriptEntry> {
    return this.entries
  }

  private record<A>(verb: TranscriptEntry["verb"], subject: string, sent: Json, reply: Reply<A>): Reply<A> {
    this.entries.push({ step: this.entries.length, verb, subject, sent, received: reply })
    return reply
  }

  async describe() {
    return this.record("request", SUBJECT_CONTRACT_DESCRIBE, {}, await this.client.describe())
  }

  async createType(structure: Json, options: { assertedDigest?: string; submitter?: string } = {}) {
    const sent: Json = { structure, ...options }
    return this.record("request", SUBJECT_TYPE_CREATE, sent, await this.client.createType(structure, options))
  }

  async startType() {
    const hole: Json = { k: "hole" }
    return this.fillType(hole, [], hole)
  }

  async fillType(partial: Json, path: ReadonlyArray<string>, subtree: Json) {
    const sent: Json = { partial, path: [...path], subtree }
    return this.record(
      "request",
      SUBJECT_TYPE_FILL,
      sent,
      await this.client.fillType(partial, path, subtree),
    )
  }

  async unfillType(partial: Json, path: ReadonlyArray<string>) {
    const sent: Json = { partial, path: [...path] }
    return this.record(
      "request",
      SUBJECT_TYPE_UNFILL,
      sent,
      await this.client.unfillType(partial, path),
    )
  }

  async publish(journal: string, frame: Json) {
    return this.record("publish", INGRESS_PREFIX + journal, frame, await this.client.publish(journal, frame))
  }

  async read(journal: string, from?: Cursor, max = 0) {
    const sent: Json = { journal, from: from ? { seq: from.seq, head: from.head } : null, max }
    return this.record("read", SUBJECT_JOURNAL_READ, sent, await this.client.read(journal, from, max))
  }
}
