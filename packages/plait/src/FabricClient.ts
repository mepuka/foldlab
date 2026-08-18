/**
 * Plane: carriage — hosts and transport clients.
 *
 * @module
 */
import { Context, Effect, Layer, Scope, Stream } from "effect"

import type { Digest } from "./Digest.js"
import type { Refusal } from "./Refusal.js"
import type { FabricSubject } from "./Subjects.js"
import type { Envelope } from "./Wire.js"
import { makeNatsService } from "./internal/nats.js"

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

/** The transport-free client surface used by fabric programs. */
export interface FabricClientService {
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
  /** Builds a scope-owned live NATS implementation. */
  static readonly layer = (
    options: FabricClientOptions,
  ): Layer.Layer<FabricClient, Refusal> =>
    Layer.effect(FabricClient, makeNatsService(options))

  /** Supplies a complete fixture implementation through the production service tag. */
  static readonly testLayer = (
    service: FabricClientService,
  ): Layer.Layer<FabricClient> =>
    Layer.succeed(FabricClient, FabricClient.of(service))
}
