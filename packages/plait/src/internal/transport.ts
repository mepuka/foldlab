import { JetStreamApiCodes, JetStreamApiError, JetStreamError } from "@nats-io/jetstream"
import { errors, type NatsConnection } from "@nats-io/nats-core"
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
 * It is also where the error channel's two-sided discipline is executed. The
 * house rule was stated one-sided — transport causes are preserved and never
 * wear fencing laws (DECISIONS T0) — and its symmetric half is ruled here:
 * defects never wear the absence sort. Refusals are the whole domain language;
 * a defect is not in it.
 *
 * Internal by construction — no NATS type crosses a package seam, so no
 * lawful-surface question arises here. An unclassified cause does now leave as
 * a defect, which is the point: it rides the fiber's cause, never the error
 * channel, and the channel stays `Refusal` exactly as before.
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

/**
 * The pinned client's own error classes, read from the client's registries
 * rather than transcribed from them. `errors` is `@nats-io/nats-core@3.4.0`'s
 * own map of its thirteen classes, so a hand-listed copy cannot drift from it;
 * `JetStreamApiError` and `JetStreamError` are the two roots every
 * `@nats-io/jetstream@3.4.0` class this package can observe descends from
 * (`ConsumerNotFoundError` and `StreamNotFoundError` extend the first,
 * `JetStreamStatusError` the second).
 *
 * Not reachable, and named so nobody reads the omission as an oversight:
 * `InvalidNameError` and `JetStreamNotEnabled` are declared in that package's
 * `jserrors` but are absent from its entrypoint, so no `instanceof` can name
 * them without reaching past the published surface. `@nats-io/kv@3.4.0` and
 * `@nats-io/obj@3.4.0` declare no error class at all; they raise these.
 */
const clientErrorClasses: ReadonlyArray<new (...args: Array<never>) => Error> = [
  ...Object.values(errors),
  JetStreamApiError,
  JetStreamError,
]

/**
 * The transport's own unwrapped causes.
 *
 * `@nats-io/transport-node@3.4.0` wraps exactly one dial failure — a Node
 * `ECONNREFUSED` becomes `ConnectionError` — and rethrows every other socket
 * error as it stands, so an unresolvable host reaches this seam as a plain
 * `Error` carrying `code` and `syscall`. Measured, not assumed (DEV-735 probe):
 * connecting to a closed port yields `ConnectionError`, connecting to an
 * unresolvable host yields `Error { code: "ENOTFOUND", syscall: "getaddrinfo" }`.
 * The client emits that shape as its transport vocabulary, so enumerating the
 * vocabulary honestly includes it; dropping it would file "the host does not
 * resolve" — the most ordinary retryable absence there is — as a defect.
 *
 * The shape is what admits it, not the class: both fields must be strings.
 * Node's `ERR_*` programming errors carry `code` alone and stay defects.
 */
const isNodeSystemError = (cause: unknown): boolean =>
  cause instanceof Error &&
  typeof (cause as { readonly code?: unknown }).code === "string" &&
  typeof (cause as { readonly syscall?: unknown }).syscall === "string"

/** Whether the pinned client raised this cause as substrate evidence. */
export const isTransportCause = (cause: unknown): boolean =>
  clientErrorClasses.some((klass) => cause instanceof klass) || isNodeSystemError(cause)

/**
 * Binds one adapter's terms into the refusal it mints on every transport cause
 * — and only on a transport cause (audit B-7, ruled 2026-08-18: "defects are
 * defects and are not part of the estate domain language").
 *
 * A cause the pinned client did not raise is a defect of this package's own
 * making — a `TypeError` inside the client, a mis-shaped call — and it is
 * rethrown unchanged rather than dressed as an absence. The rethrow is how a
 * defect stays a defect through every seam an adapter classifies at: inside
 * `Effect.tryPromise`'s `catch` the pin states that a thrown value is treated
 * as a defect, and a throw in an `Effect.catch` handler or an `Effect.gen` body
 * dies the same way. `Refusal.retryAbsence` retries the absence sort, so the
 * one thing the old classification guaranteed was a retry loop over a bug.
 *
 * Placing the narrowing at the mint keeps the classification one edit: the
 * thirty-one sites that observe a transport cause all reach it through here,
 * and none of their signatures move (audit B-12).
 */
export const transportRefusalFor = (terms: TransportTerms): TransportRefusal =>
  (operation, cause) => {
    if (!isTransportCause(cause)) throw cause
    return absenceRefusal({
      kind: terms.kind,
      law: terms.law,
      path: [operation],
      got: String(cause),
      expected: terms.expected,
      next: terms.next(operation),
    })
  }

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
