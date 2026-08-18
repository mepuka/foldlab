/**
 * Plane: carriage — hosts and transport clients.
 *
 * The fabric client is two halves that must not be one. The transport half
 * moves bytes and knows nothing about meaning; the client half judges what the
 * caller asked for and only then hands the transport its work. A publication
 * therefore cannot reach JetStream without a verdict, and no fixture can make
 * it: `testLayer` supplies a transport, never a service, so the door sits above
 * whatever transport is installed.
 *
 * @module
 */
import { Context, Effect, Layer, Scope, Stream } from "effect"

import type { Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import {
  Admission,
  admit as admissionAdmit,
  type AdmissionService,
} from "../kernel/Admission.js"
import { envelopePublication } from "../kernel/Candidates.js"
import type { FabricSubject } from "../kernel/Subjects.js"
import { encodeEnvelope, type DecodedEnvelope, type Envelope } from "../kernel/Wire.js"
import { makeNatsService } from "../internal/nats.js"

/** Connection bootstrap for the file-backed slice-0 fact/node commons gate. */
export interface FabricClientOptions {
  readonly servers: string | ReadonlyArray<string>
  /** Names only the fact/node commons stream ensured at construction; subscriptions discover their subject's owner. */
  readonly stream: string
  readonly connectionName?: string
}

/** The acknowledgement returned after JetStream stores an envelope. */
export interface PublishedEnvelope {
  readonly digest: Digest
  readonly sequence: number
  readonly duplicate: boolean
}

/** A received envelope whose message id was re-derived and checked. */
export interface ReceivedEnvelope {
  readonly subject: FabricSubject
  readonly envelope: Envelope
  readonly digest: Digest
}

/**
 * The byte-moving half: a transport is handed an already-canonical envelope
 * and stores it. It performs no admission, and a fixture that replaces it
 * therefore replaces no judgment.
 */
export interface FabricTransport {
  readonly publish: (
    subject: FabricSubject,
    encoded: DecodedEnvelope,
  ) => Effect.Effect<PublishedEnvelope, Refusal>
  readonly subscribe: (
    subject: FabricSubject,
  ) => Effect.Effect<Stream.Stream<ReceivedEnvelope, Refusal>, Refusal, Scope.Scope>
}

/** The transport-free client surface used by fabric programs. */
export interface FabricClientService {
  /** Candidate judgment is the one Admission accessor, independent of transport. */
  readonly admit: typeof admissionAdmit
  /**
   * Publishes one envelope, after the door admits the emission it names.
   *
   * The lane the envelope carries must be a declared lane of the acting
   * admission context; an envelope on an undeclared lane is refused
   * `forward-reference` and the transport is never reached.
   */
  readonly publish: (
    subject: FabricSubject,
    envelope: Envelope,
  ) => Effect.Effect<PublishedEnvelope, Refusal>
  readonly subscribe: (
    subject: FabricSubject,
  ) => Effect.Effect<Stream.Stream<ReceivedEnvelope, Refusal>, Refusal, Scope.Scope>
}

/**
 * Installs the door above one transport.
 *
 * The publication is canonicalized first because identity is what the kernel
 * sentence carries: the emitted act's value is the envelope's own address, so
 * the candidate cannot be built before the bytes exist. Canonicalization moves
 * nothing and reaches no server; the transport call after the verdict is the
 * first act with an outside.
 */
const gated = (
  admission: AdmissionService,
  transport: FabricTransport,
): FabricClientService => ({
  admit: admissionAdmit,
  publish: Effect.fn("FabricClient.publish")(function* (subject, envelope) {
    const encoded = yield* encodeEnvelope(envelope)
    yield* admission.admit(envelopePublication(envelope, encoded.digest))
    return yield* transport.publish(subject, encoded)
  }),
  subscribe: transport.subscribe,
})

/**
 * Scope-owned connection to the fabric; NATS types remain internal.
 *
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { FabricClient } from "@foldlab/plait/FabricClient"
 *
 * const program = Effect.gen(function* () {
 *   const fabric = yield* FabricClient
 *   return fabric.publish(subject, envelope)
 * })
 * ```
 */
export class FabricClient extends Context.Service<FabricClient, FabricClientService>()(
  "@foldlab/plait/FabricClient",
) {
  /** The one candidate-judgment route; carriage adds no validator. */
  static readonly admit = admissionAdmit

  /** Builds a scope-owned live NATS implementation under the one door. */
  static readonly layer = (
    options: FabricClientOptions,
  ): Layer.Layer<FabricClient, Refusal, Admission> =>
    Layer.effect(
      FabricClient,
      Effect.gen(function* () {
        const admission = yield* Admission
        const transport = yield* makeNatsService(options)
        return gated(admission, transport)
      }),
    )

  /**
   * Supplies fixture transport through the production tag.
   *
   * A fixture owns bytes, never verdicts: the door is installed here, above
   * whatever transport is handed in, so a test cannot construct a client whose
   * publish path skips admission.
   */
  static readonly testLayer = (
    transport: FabricTransport,
  ): Layer.Layer<FabricClient, never, Admission> =>
    Layer.effect(
      FabricClient,
      Effect.gen(function* () {
        const admission = yield* Admission
        return gated(admission, transport)
      }),
    )
}
