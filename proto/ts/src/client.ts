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
  /** The daemon's complete wire claim, retained as re-verifiable evidence. */
  readonly claimed: ReadReply
  /** The cursor this client recomputed locally — not the daemon's claim. */
  readonly verified: Cursor
}

const REQUEST_TIMEOUT_MS = 15_000
const JOURNAL_NAME = /^[A-Za-z0-9_-]+$/

const repairHint = (subject: string, body: Json, note: string) => ({ subject, body, note })

const badJournal = (journal: string, verb: "publish" | "read"): Refusal => {
  const example = "data"
  const subject = verb === "publish" ? INGRESS_PREFIX + example : SUBJECT_JOURNAL_READ
  const body: Json = verb === "publish"
    ? { type: "0".repeat(64), payload: null }
    : { journal: example, from: { seq: -1, head: GENESIS }, max: 0 }
  return localRefusal(
    "bad-journal",
    "W9: journal names use only ASCII letters, digits, underscore, and hyphen",
    {
      got: journal,
      expected: "a non-empty name matching ^[A-Za-z0-9_-]+$",
      path: ["journal"],
      example,
      next: [repairHint(subject, body, `correct the journal name, then explicitly ${verb}`)],
    },
  )
}

export class ProtoClient {
  private constructor(
    private readonly connection: NatsConnection,
    readonly endpoint: string,
  ) {}

  static async connect(url: string): Promise<Reply<ProtoClient>> {
    let expected = url
    try {
      const parsed = new URL(url)
      const user = decodeURIComponent(parsed.username)
      const pass = decodeURIComponent(parsed.password)
      parsed.username = ""
      parsed.password = ""
      expected = parsed.toString()
      const connection = await connect({
        servers: parsed.toString(),
        maxReconnectAttempts: 0,
        name: "foldlab-proto-ts/0.0.0/application-client",
        ...(user === "" ? {} : { user, pass }),
      })
      // Endpoint attribution intentionally excludes credentials even though
      // the Acquire URL carries the generated application secret.
      return { ok: true, fact: new ProtoClient(connection, expected) }
    } catch (error) {
      return {
        ok: false,
        refusal: localRefusal("unreachable", "no daemon answered at this URL", {
          got: String(error),
          expected,
          next: [repairHint(
            SUBJECT_CONTRACT_DESCRIBE,
            {},
            "restore a connection to this endpoint, then explicitly describe the daemon contract",
          )],
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
    let payload: string
    try {
      payload = JSON.stringify(body)
    } catch (error) {
      return {
        ok: false,
        refusal: localRefusal("malformed", "W9: a request body must be JSON data", {
          got: String(error),
          expected: subject,
          next: [repairHint(subject, {}, "replace the body with JSON data, then explicitly retry")],
        }),
      }
    }
    const maxPayload = this.connection.info?.max_payload
    const payloadBytes = new TextEncoder().encode(payload).byteLength
    if (maxPayload !== undefined && payloadBytes > maxPayload) {
      return {
        ok: false,
        refusal: localRefusal("malformed", "W9: a request body must fit the connected daemon's payload bound", {
          got: payloadBytes,
          expected: maxPayload,
          next: [repairHint(subject, {}, "reduce or chunk the body at a licensed seam, then explicitly retry")],
        }),
      }
    }
    let raw: Uint8Array
    try {
      const reply = await this.connection.request(subject, payload, {
        timeout: REQUEST_TIMEOUT_MS,
      })
      raw = reply.data
    } catch (error) {
      return {
        ok: false,
        refusal: localRefusal(
          "unreachable",
          "the request produced no reply before its client deadline — this does not distinguish network failure from remote silence",
          {
            got: String(error),
            expected: subject,
            next: [repairHint(subject, body, "restore reachability, then explicitly retry this request")],
          },
        ),
      }
    }
    return decodeReply(
      fact,
      raw,
      repairHint(subject, body, "inspect the malformed response, then explicitly retry this request"),
    )
  }

  /** VERB 2 of 3 — PUBLISH: a canonical frame to a designated ingress
   * subject. Request/reply: the reply admits or refuses. */
  async publish(journal: string, frame: Json): Promise<Reply<AdmitReply>> {
    if (!JOURNAL_NAME.test(journal)) return { ok: false, refusal: badJournal(journal, "publish") }
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
    if (!JOURNAL_NAME.test(journal)) return { ok: false, refusal: badJournal(journal, "read") }
    const readBody: Json = { journal, from: { seq: from.seq, head: from.head }, max }
    const reply = await this.request(
      SUBJECT_JOURNAL_READ,
      readBody,
      ReadReply,
    )
    if (!reply.ok) return reply
    if (!JOURNAL_NAME.test(reply.fact.journal)) {
      return {
        ok: false,
        refusal: localRefusal(
          "verify-failed",
          "W6: a verified read is attributed only to a journal name in the public grammar",
          {
            got: reply.fact.journal,
            expected: "a name matching ^[A-Za-z0-9_-]+$",
            path: ["journal"],
            next: [repairHint(SUBJECT_JOURNAL_READ, readBody, "refuse the substituted attribution and explicitly reread the requested journal")],
          },
        ),
      }
    }
    if (reply.fact.journal !== journal) {
      return {
        ok: false,
        refusal: localRefusal(
          "verify-failed",
          "W6: a verified read belongs to the exact journal the caller requested",
          {
            got: reply.fact.journal,
            expected: journal,
            path: ["journal"],
            next: [repairHint(SUBJECT_JOURNAL_READ, readBody, "refuse the substituted attribution and explicitly reread the requested journal")],
          },
        ),
      }
    }
    const fold = foldChain(reply.fact.entries, from)
    if (!fold.ok) {
      return {
        ok: false,
        refusal: localRefusal(
          "verify-failed",
          "W6: heads are claims — the returned entries do not fold to a verifiable chain",
          {
            got: fold.reason,
            path: [journal, String(fold.seq)],
            next: [repairHint(SUBJECT_JOURNAL_READ, readBody, "retain the last verified cursor and explicitly reread from it")],
          },
        ),
      }
    }
    if (fold.seq !== reply.fact.seq) {
      return {
        ok: false,
        refusal: localRefusal(
          "verify-failed",
          "W6: sequence positions are claims — the daemon's claimed sequence does not match the locally folded one",
          {
            got: reply.fact.seq,
            expected: fold.seq,
            path: ["seq"],
            next: [repairHint(SUBJECT_JOURNAL_READ, readBody, "retain the locally folded sequence and explicitly reread from the prior verified cursor")],
          },
        ),
      }
    }
    if (fold.head !== reply.fact.head) {
      return {
        ok: false,
        refusal: localRefusal(
          "verify-failed",
          "W6: heads are claims — the daemon's claimed head does not match the locally recomputed one",
          {
            got: reply.fact.head,
            expected: fold.head,
            next: [repairHint(SUBJECT_JOURNAL_READ, readBody, "retain the locally folded head and explicitly reread from the prior verified cursor")],
          },
        ),
      }
    }
    return {
      ok: true,
      fact: {
        journal: reply.fact.journal,
        entries: reply.fact.entries,
        claimed: reply.fact,
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
    principal: string,
    move:
      | { readonly op: "fill"; readonly path: ReadonlyArray<string>; readonly subtree: Json }
      | { readonly op: "unfill"; readonly path: ReadonlyArray<string> },
  ): Promise<Reply<SessionStateReply>> {
    const body: Record<string, Json> = {
      session,
      expectedHead,
      principal,
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
    principal: string,
    submitter?: string,
  ): Promise<Reply<SessionCommitReply>> {
    const body: Record<string, Json> = { session, expectedHead, principal }
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
