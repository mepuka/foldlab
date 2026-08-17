import { Context, Duration, Effect, Layer, Scope, SynchronizedRef } from "effect"

import type { Refusal } from "./Refusal.js"
import { makeRegisterService } from "./internal/registers.js"

/** The file-backed KV bucket that is authoritative for commitment registers. */
export const REGISTER_BUCKET = "flb-fab-reg"

/** Per-key retained revisions; there is no age or byte-size eviction policy. */
export const REGISTER_HISTORY = 64

/** A terminal result landed under one fencing token. */
export interface RegisterOutcome {
  readonly token: number
  readonly value: string
}

/** The observable meaning-state of one per-work-digest register. */
export interface RegisterState {
  readonly token: number
  readonly holder: string | null
  readonly outcome: RegisterOutcome | null
}

/** Connection bootstrap for the register bucket. */
export interface RegisterOptions {
  readonly servers: string | ReadonlyArray<string>
  readonly connectionName?: string
}

/** The five-action register surface proved by the Veil model. */
export interface RegisterService {
  readonly grant: (work: string, holder: string) => Effect.Effect<RegisterState, Refusal>
  readonly renew: (work: string, token: number) => Effect.Effect<RegisterState, Refusal>
  readonly commit: (
    work: string,
    token: number,
    outcome: string,
  ) => Effect.Effect<RegisterState, Refusal>
  readonly expireSteal: (work: string, holder: string) => Effect.Effect<RegisterState, Refusal>
  readonly observe: (work: string) => Effect.Effect<RegisterState, Refusal>
}

/**
 * Scope-owned commitment registers. Holder identity is descriptive; only the
 * revision-derived token is authority.
 */
export class Registers extends Context.Service<Registers, RegisterService>()(
  "@foldlab/plait/Registers",
) {
  /** Builds a scope-owned live NATS KV implementation. */
  static readonly layer = (
    options: RegisterOptions,
  ): Layer.Layer<Registers, Refusal> =>
    Layer.effect(Registers, makeRegisterService(options))

  /** Supplies a complete fixture implementation through the production tag. */
  static readonly testLayer = (
    service: RegisterService,
  ): Layer.Layer<Registers> =>
    Layer.succeed(Registers, Registers.of(service))
}

/**
 * Runs work under a scope-bound heartbeat. If a renewal loses its CAS fence,
 * the renewal branch fails and `raceFirst` interrupts the holder fiber.
 */
export const hold = <A, R>(
  work: string,
  holder: string,
  use: (currentToken: Effect.Effect<number>) => Effect.Effect<A, Refusal, R>,
  heartbeatEvery: Duration.Input = "1 second",
): Effect.Effect<A, Refusal, R | Registers | Scope.Scope> =>
  Effect.gen(function* () {
    const registers = yield* Registers
    const initial = yield* registers.grant(work, holder)
    const token = yield* SynchronizedRef.make(initial.token)
    yield* Effect.addFinalizer(() => Effect.void)

    const renewals = Effect.gen(function* () {
      while (true) {
        yield* Effect.sleep(heartbeatEvery)
        const current = yield* SynchronizedRef.get(token)
        const renewed = yield* registers.renew(work, current)
        yield* SynchronizedRef.set(token, renewed.token)
      }
    })

    return yield* Effect.raceFirst(use(SynchronizedRef.get(token)), renewals)
  })
