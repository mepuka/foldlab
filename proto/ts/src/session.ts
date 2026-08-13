// The session facade: sugar strictly above the writ. Every method is
// exactly one client verb plus a transcript entry; no capability is
// added — a session can do nothing a bare three-verb client cannot.
// The transcript is what makes a thread auditable after the fact:
// verb, subject, sent, received, in order.
import type { ProtoClient, Cursor } from "./client.ts"
import { GENESIS, type Json } from "./jcs.ts"
import type { Reply } from "./wire.ts"
import {
  INGRESS_PREFIX,
  SUBJECT_CONTRACT_DESCRIBE,
  SUBJECT_JOURNAL_READ,
  SUBJECT_TYPE_CREATE,
  SUBJECT_TYPE_FILL,
  SUBJECT_TYPE_UNFILL,
} from "./wire.ts"

export interface TranscriptEntry {
  readonly step: number
  readonly verb: "request" | "publish" | "read"
  readonly subject: string
  readonly sent: Json
  readonly received: unknown
  readonly endpoint: string
  readonly startedAt: number
  readonly completedAt: number | null
}

export interface SessionClient extends Pick<
  ProtoClient,
  "describe" | "createType" | "fillType" | "unfillType" | "publish" | "read"
> {
  readonly endpoint: string
}

export class Session {
  private readonly entries: TranscriptEntry[] = []

  constructor(private readonly client: SessionClient) {}

  get transcript(): ReadonlyArray<TranscriptEntry> {
    return Object.freeze(structuredClone(this.entries))
  }

  private async record<A>(
    verb: TranscriptEntry["verb"],
    subject: string,
    sent: Json,
    run: () => Promise<Reply<A>>,
  ): Promise<Reply<A>> {
    const step = this.entries.length
    const startedAt = Date.now()
    const base = {
      step,
      verb,
      subject,
      sent: structuredClone(sent),
      endpoint: this.client.endpoint,
      startedAt,
    }
    this.entries.push({ ...base, received: { pending: true }, completedAt: null })
    const reply = await run()
    this.entries[step] = {
      ...base,
      received: structuredClone(reply),
      completedAt: Date.now(),
    }
    return reply
  }

  async describe() {
    return this.record("request", SUBJECT_CONTRACT_DESCRIBE, {}, () => this.client.describe())
  }

  async createType(structure: Json, options: { assertedDigest?: string; submitter?: string } = {}) {
    const sent: Json = { structure, ...options }
    return this.record("request", SUBJECT_TYPE_CREATE, sent, () => this.client.createType(structure, options))
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
      () => this.client.fillType(partial, path, subtree),
    )
  }

  async unfillType(partial: Json, path: ReadonlyArray<string>) {
    const sent: Json = { partial, path: [...path] }
    return this.record(
      "request",
      SUBJECT_TYPE_UNFILL,
      sent,
      () => this.client.unfillType(partial, path),
    )
  }

  async publish(journal: string, frame: Json) {
    return this.record("publish", INGRESS_PREFIX + journal, frame, () => this.client.publish(journal, frame))
  }

  async read(journal: string, from?: Cursor, max = 0) {
    const cursor = from ?? { seq: -1, head: GENESIS }
    const sent: Json = { journal, from: { seq: cursor.seq, head: cursor.head }, max }
    return this.record("read", SUBJECT_JOURNAL_READ, sent, () => this.client.read(journal, cursor, max))
  }
}
