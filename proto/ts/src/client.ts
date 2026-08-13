// The three-verb client: READ / PUBLISH / REQUEST — the whole writ
// (W9). No authority protocol lives here: no CAS, no fencing, no
// journal shapes. Refusals are surfaced unchanged as values; client-
// local failures (unreachable, timeout, malformed reply) become local
// refusal values (W8). Nothing here ever retries silently.
import { connect, type NatsConnection } from "@nats-io/transport-node"
import { foldChain, GENESIS, type ChainEntry, type Json } from "./jcs.ts"
import {
  AdmitReply,
  ConciergeReply,
  CreateReply,
  DescribeReply,
  INGRESS_PREFIX,
  ReadReply,
  SessionCommitReply,
  SessionStateReply,
  SUBJECT_CONTRACT_DESCRIBE,
  SUBJECT_JOURNAL_READ,
  SUBJECT_TYPE_CREATE,
  SUBJECT_TYPE_FILL,
  SUBJECT_TYPE_UNFILL,
  SUBJECT_SESSION_COMMIT,
  SUBJECT_SESSION_MOVE,
  SUBJECT_SESSION_OPEN,
  SUBJECT_SESSION_STATE,
  decodeReply,
  localRefusal,
  type Refusal,
  type Reply,
} from "./wire.ts"
import { Schema } from "effect"

export interface Cursor {
  readonly seq: number
  readonly head: string
}

export interface VerifiedRead {
  readonly journal: string
  readonly entries: ReadonlyArray<ChainEntry>
  /** The cursor this client recomputed locally — not the daemon's claim. */
  readonly verified: Cursor
}

const REQUEST_TIMEOUT_MS = 15_000

export class ProtoClient {
  private constructor(private readonly connection: NatsConnection) {}

  static async connect(url: string): Promise<Reply<ProtoClient>> {
    try {
      const connection = await connect({ servers: url, maxReconnectAttempts: 0 })
      return { ok: true, fact: new ProtoClient(connection) }
    } catch (error) {
      return {
        ok: false,
        refusal: localRefusal("unreachable", "no daemon answered at this URL", {
          got: String(error),
          expected: url,
        }),
      }
    }
  }

  async close(): Promise<void> {
    await this.connection.close()
  }

  /** VERB 1 of 3 — REQUEST: data on a daemon-owned subject; the reply is
   * a fact or a refusal, decoded against the declared shape. */
  async request<S extends Schema.Codec<any, any, never, never>>(
    subject: string,
    body: Json,
    fact: S,
  ): Promise<Reply<S["Type"]>> {
    let raw: Uint8Array
    try {
      const reply = await this.connection.request(subject, JSON.stringify(body), {
        timeout: REQUEST_TIMEOUT_MS,
      })
      raw = reply.data
    } catch (error) {
      return {
        ok: false,
        refusal: localRefusal(
          "unreachable",
          "the request found no reply — absence of an answer is a local condition, not a daemon refusal",
          { got: String(error), expected: subject },
        ),
      }
    }
    return decodeReply(fact, raw)
  }

  /** VERB 2 of 3 — PUBLISH: a canonical frame to a designated ingress
   * subject. Request/reply: the reply admits or refuses. */
  async publish(journal: string, frame: Json): Promise<Reply<AdmitReply>> {
    return this.request(INGRESS_PREFIX + journal, frame, AdmitReply)
  }

  /** VERB 3 of 3 — READ, verify-on-read: entries come back with a
   * claimed head; this client recomputes the chain locally and refuses
   * a claim it cannot verify (W6). The returned cursor is the local one. */
  async read(
    journal: string,
    from: Cursor = { seq: -1, head: GENESIS },
    max = 0,
  ): Promise<Reply<VerifiedRead>> {
    const reply = await this.request(
      SUBJECT_JOURNAL_READ,
      { journal, from: { seq: from.seq, head: from.head }, max },
      ReadReply,
    )
    if (!reply.ok) return reply
    const fold = foldChain(reply.fact.entries, from)
    if (!fold.ok) {
      return {
        ok: false,
        refusal: localRefusal(
          "verify-failed",
          "W6: heads are claims — the returned entries do not fold to a verifiable chain",
          { got: fold.reason, path: [journal, String(fold.seq)] },
        ),
      }
    }
    if (fold.head !== reply.fact.head) {
      return {
        ok: false,
        refusal: localRefusal(
          "verify-failed",
          "W6: heads are claims — the daemon's claimed head does not match the locally recomputed one",
          { got: reply.fact.head, expected: fold.head },
        ),
      }
    }
    return {
      ok: true,
      fact: {
        journal: reply.fact.journal,
        entries: reply.fact.entries,
        verified: { seq: fold.seq, head: fold.head },
      },
    }
  }

  // — sugar strictly above the writ (each is exactly one verb) —

  async describe(): Promise<Reply<DescribeReply>> {
    return this.request(SUBJECT_CONTRACT_DESCRIBE, {}, DescribeReply)
  }

  async createType(
    structure: Json,
    options: { assertedDigest?: string; submitter?: string } = {},
  ): Promise<Reply<CreateReply>> {
    const body: Record<string, Json> = { structure }
    if (options.assertedDigest !== undefined) body["assertedDigest"] = options.assertedDigest
    if (options.submitter !== undefined) body["submitter"] = options.submitter
    return this.request(SUBJECT_TYPE_CREATE, body, CreateReply)
  }

  async fillType(
    partial: Json,
    path: ReadonlyArray<string>,
    subtree: Json,
  ): Promise<Reply<ConciergeReply>> {
    return this.request(
      SUBJECT_TYPE_FILL,
      { partial, path: [...path], subtree },
      ConciergeReply,
    )
  }

  async unfillType(
    partial: Json,
    path: ReadonlyArray<string>,
  ): Promise<Reply<ConciergeReply>> {
    return this.request(
      SUBJECT_TYPE_UNFILL,
      { partial, path: [...path] },
      ConciergeReply,
    )
  }

  async openSession(options: {
    readonly grammar: string
    readonly author: string
    readonly seed?: Json
  }): Promise<Reply<SessionStateReply>> {
    const body: Record<string, Json> = {
      grammar: options.grammar,
      author: options.author,
    }
    if (options.seed !== undefined) body["seed"] = options.seed
    return this.request(SUBJECT_SESSION_OPEN, body, SessionStateReply)
  }

  async moveSession(
    session: string,
    expectedHead: string,
    move:
      | { readonly op: "fill"; readonly path: ReadonlyArray<string>; readonly subtree: Json }
      | { readonly op: "unfill"; readonly path: ReadonlyArray<string> },
  ): Promise<Reply<SessionStateReply>> {
    const body: Record<string, Json> = {
      session,
      expectedHead,
      op: move.op,
      path: [...move.path],
    }
    if (move.op === "fill") body["subtree"] = move.subtree
    return this.request(SUBJECT_SESSION_MOVE, body, SessionStateReply)
  }

  async sessionState(session: string): Promise<Reply<SessionStateReply>> {
    return this.request(SUBJECT_SESSION_STATE, { session }, SessionStateReply)
  }

  async commitSession(
    session: string,
    expectedHead: string,
    submitter?: string,
  ): Promise<Reply<SessionCommitReply>> {
    const body: Record<string, Json> = { session, expectedHead }
    if (submitter !== undefined) body["submitter"] = submitter
    return this.request(SUBJECT_SESSION_COMMIT, body, SessionCommitReply)
  }
}

export {
  SUBJECT_TYPE_CREATE,
  SUBJECT_TYPE_FILL,
  SUBJECT_TYPE_UNFILL,
  SUBJECT_JOURNAL_READ,
  SUBJECT_CONTRACT_DESCRIBE,
  SUBJECT_SESSION_OPEN,
  SUBJECT_SESSION_MOVE,
  SUBJECT_SESSION_STATE,
  SUBJECT_SESSION_COMMIT,
  INGRESS_PREFIX,
}
export type {
  Refusal,
  Reply,
  AdmitReply,
  ConciergeReply,
  CreateReply,
  DescribeReply,
  ReadReply,
  SessionStateReply,
  SessionCommitReply,
}
