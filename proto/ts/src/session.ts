// The session facade: sugar strictly above the writ. Every method is
// exactly one client verb plus a transcript entry; no capability is
// added — a session can do nothing a bare three-verb client cannot.
// The transcript is what makes a thread auditable after the fact:
// verb, subject, sent, received, in order.
import type { ProtoClient, Cursor } from "./client.ts"
import type { Json } from "./jcs.ts"
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
