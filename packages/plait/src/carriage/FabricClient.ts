/**
 * Plane: carriage — hosts and transport clients.
 *
 * @module
 */
import { Context, Effect, Layer, Schema, Scope, Stream } from "effect"

import type { Digest } from "../truth/Digest.js"
import type { Refusal } from "../truth/Refusal.js"
import { admit as kernelAdmit } from "../kernel/KernelDoor.js"
import { TOKEN_PATTERN, type FabricSubject } from "../kernel/Subjects.js"
import type { Envelope } from "../kernel/Wire.js"
import { makeNatsService } from "../internal/nats.js"
import type { ConnectionBootstrap } from "../internal/transport.js"

export type { ConnectionBootstrap, ConnectionCredential } from "../internal/transport.js"

/**
 * The name of one JetStream stream this client ensures at construction.
 *
 * A stream name reaches the substrate verbatim, so its grammar is the fabric's
 * literal-token alphabet. The brand keeps a stream name from being spent as a
 * lane handle or a cell name: all three are tokens, and none of them names the
 * same thing. The internal per-lane stream composer stays internal — nothing
 * outside this package spells a lane's own stream.
 */
export const StreamName = Schema.String
  .check(Schema.isPattern(TOKEN_PATTERN))
  .pipe(Schema.brand("@foldlab/plait/StreamName"))
  .annotate({ identifier: "PlaitStreamName" })

/** The name of one JetStream stream this client ensures at construction. */
export type StreamName = typeof StreamName.Type

/** Connection bootstrap for the file-backed slice-0 fact/node commons gate. */
export interface FabricClientOptions extends ConnectionBootstrap {
  /** Names only the fact/node commons stream ensured at construction; subscriptions discover their subject's owner. */
  readonly stream: StreamName
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

/** The transport-free client surface used by fabric programs. */
export interface FabricClientService {
  /** Candidate judgment is the kernel function itself, independent of transport. */
  readonly admit: typeof kernelAdmit
  readonly publish: (
    subject: FabricSubject,
    envelope: Envelope,
  ) => Effect.Effect<PublishedEnvelope, Refusal>
  readonly subscribe: (
    subject: FabricSubject,
  ) => Effect.Effect<Stream.Stream<ReceivedEnvelope, Refusal>, Refusal, Scope.Scope>
}

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
  /** The kernel's one candidate-judgment function; carriage adds no validator. */
  static readonly admit = kernelAdmit

  /** Builds a scope-owned live NATS implementation. */
  static readonly layer = (
    options: FabricClientOptions,
  ): Layer.Layer<FabricClient, Refusal> =>
    Layer.effect(
      FabricClient,
      Effect.map(makeNatsService(options), (service) => ({ ...service, admit: kernelAdmit })),
    )

  /** Supplies fixture transport through the production tag; admission cannot be replaced. */
  static readonly testLayer = (
    service: Omit<FabricClientService, "admit">,
  ): Layer.Layer<FabricClient> =>
    Layer.succeed(FabricClient, FabricClient.of({ ...service, admit: kernelAdmit }))
}
