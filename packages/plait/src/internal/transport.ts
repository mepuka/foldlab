import { JetStreamApiCodes, JetStreamApiError } from "@nats-io/jetstream"
import type { NatsConnection } from "@nats-io/nats-core"
import { connect } from "@nats-io/transport-node"
import { Effect, Scope } from "effect"

import { absenceRefusal, type Next, type Refusal } from "../Refusal.js"

/**
 * The transport spine every NATS adapter in this package sits on.
 *
 * Connection lifecycle, transport-absence minting, and CAS classification were
 * one implementation living behind eight copies of itself (audit B-8, friction
 * card FH-1: eight adapters at one shape is a seam with no module at it). This
 * module is that seam. What stays per-adapter is data, not shape: each adapter
 * owns its absence kind, its law sentence, its expectation, and its taught
 * repair, and passes them to `transportRefusalFor` once.
 *
 * Internal by construction — no NATS type and no unclassified cause crosses a
 * package seam, so no lawful-surface question arises here.
 */

/** The connection bootstrap fields every adapter's options carry. */
export interface ConnectionOptions {
  readonly servers: string | ReadonlyArray<string>
  readonly connectionName?: string | undefined
}

/** Mints one adapter's transport absence for the operation that observed a cause. */
export type TransportRefusal = (operation: string, cause: unknown) => Refusal

/** The per-adapter data a transport absence carries. */
export interface TransportTerms {
  /** The absence kind this adapter persists; retry classification reads it. */
  readonly kind: string
  /** The one-sentence law, stating what the retryable half does NOT cover. */
  readonly law: string
  /** What the refused operation expected of the substrate. */
  readonly expected: string
  /** The taught repair, given the operation that observed the cause. */
  readonly next: (operation: string) => ReadonlyArray<Next>
}

/**
 * The taught repair for an operation whose only legal next step is itself.
 * Adapters whose refusals teach a different repair pass their own `next`.
 */
export const teachRetryOperation = (operation: string): ReadonlyArray<Next> => [{
  subject: operation,
  note: "Retry this absence with retryAbsence and a temporal Schedule.",
}]

/** Binds one adapter's terms into the refusal it mints on every transport cause. */
export const transportRefusalFor = (terms: TransportTerms): TransportRefusal =>
  (operation, cause) =>
    absenceRefusal({
      kind: terms.kind,
      law: terms.law,
      path: [operation],
      got: String(cause),
      expected: terms.expected,
      next: terms.next(operation),
    })

/** Releases a connection without ever failing the scope that owns it. */
export const closeConnection = (connection: NatsConnection): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => connection.close(),
    catch: () => undefined,
  }).pipe(Effect.catch(() => Effect.void))

/**
 * Opens one scope-owned connection to the pinned servers.
 *
 * The refusal stays the caller's: `operation` names the acquire in the refusal
 * path and `refuse` carries the adapter's own absence kind, so collapsing the
 * six copies of this block changes no refusal any wall observes.
 */
export const acquireConnection = (
  options: ConnectionOptions,
  defaultName: string,
  operation: string,
  refuse: TransportRefusal,
): Effect.Effect<NatsConnection, Refusal, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.tryPromise({
      try: () => connect({
        servers: typeof options.servers === "string" ? options.servers : [...options.servers],
        name: options.connectionName ?? defaultName,
      }),
      catch: (cause) => refuse(operation, cause),
    }),
    closeConnection,
  )

/**
 * The definitive CAS refusal, classified by operation context plus code
 * (DEV-704 seam rule 2): duplicate create and stale update are both
 * `JetStreamApiError{status: 400, code: 10071}`, distinguished only by the
 * operation that observed them. Anything else is transport-class and its
 * outcome is ambiguous.
 */
export const isCasRefusal = (cause: unknown): boolean =>
  cause instanceof JetStreamApiError &&
  cause.status === 400 &&
  cause.code === JetStreamApiCodes.StreamWrongLastSequence

/** Internal carrier for a failed KV call awaiting classification. */
export class KvFailure {
  readonly _tag = "KvFailure"
  constructor(readonly cause: unknown) {}
}
