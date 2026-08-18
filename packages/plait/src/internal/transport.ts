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
 * The classes in the pinned registry whose meaning is a caller defect, excluded
 * by name.
 *
 * `InvalidArgumentError` is raised when a caller passes a value the API cannot
 * use, `InvalidSubjectError` when a caller names a subject that is not one, and
 * `InvalidOperationError` when a caller performs an operation the object it
 * holds does not support — the pin's own words: "trying to iterate on an object
 * that was configured with a callback" (`nats-core/lib/errors.d.ts`). None of
 * the three says anything about the substrate. Every one of them says this
 * package called the client wrong, which is a defect, and a defect is not part
 * of the estate domain language.
 *
 * `@nats-io/jetstream@3.4.0`'s caller-validation class, `InvalidNameError`, is
 * absent from that package's entrypoint, so no `instanceof` can name it and
 * nothing admits it in the first place.
 */
const callerDefectClasses: ReadonlyArray<unknown> = [
  errors.InvalidArgumentError,
  errors.InvalidOperationError,
  errors.InvalidSubjectError,
]

/**
 * The pinned client's transport and connection classes, read from the client's
 * registries rather than transcribed from them, minus the caller-validation
 * family above. `errors` is `@nats-io/nats-core@3.4.0`'s own map of its
 * thirteen classes, so a hand-listed copy cannot drift from it;
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
  ...Object.values(errors).filter((klass) => !callerDefectClasses.includes(klass)),
  JetStreamApiError,
  JetStreamError,
]

/**
 * Whether the pinned client raised this cause as substrate evidence.
 *
 * Membership in a pinned class is the whole test. There is deliberately no
 * structural admission — no rule that reads fields off a foreign object and
 * infers transport from their shape — because such a rule cannot tell the
 * client's vocabulary from an impostor wearing the same two fields, and a
 * counterfeit that passes becomes a retryable absence over a bug. That is the
 * fence this narrowing exists to hold, so the fence has no shape-shaped gate
 * in it.
 */
export const isTransportCause = (cause: unknown): boolean =>
  clientErrorClasses.some((klass) => cause instanceof klass)

/**
 * Binds one adapter's terms into the refusal it mints on every transport cause
 * — and only on a transport cause (audit B-7, ruled 2026-08-18: "defects are
 * defects and are not part of the estate domain language").
 *
 * A cause the pinned client did not raise as substrate evidence is a defect of
 * this package's own making — a `TypeError` inside the client, a mis-shaped
 * call the client rejected as an invalid argument, subject, or operation — and
 * it is rethrown unchanged rather than dressed as an absence. The rethrow is how a
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
