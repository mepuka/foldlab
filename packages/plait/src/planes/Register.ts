/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Context, Duration, Effect, Layer, Schedule, Scope, SynchronizedRef } from "effect"

import type { ConnectionBootstrap } from "../carriage/FabricClient.js"
import type { Refusal } from "../truth/Refusal.js"
import { makeRegisterService } from "../internal/registers.js"

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
export interface RegisterOptions extends ConnectionBootstrap {}

/**
 * The five-action register surface walled against the proved Veil model.
 *
 * Every claim holds within a fixed backing-stream incarnation;
 * administrative lifecycle mutation is outside the credential guard. The
 * incarnation pin at open is a recorded deferral (DECISIONS); the DEV-716
 * ACL suite is the other half of the guard.
 */
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
 * the renewal branch fails and `raceFirst` interrupts the holder fiber. The
 * `Scope` requirement is intentional even though `hold` adds no finalizer of
 * its own: a hold only runs inside the scope that owns the live `Registers`
 * connection, so the heartbeat fiber can never outlive its transport.
 */
export const hold = Effect.fn("Register.hold")(function*<A, R> (
  work: string,
  holder: string,
  use: (currentToken: Effect.Effect<number>) => Effect.Effect<A, Refusal, R>,
  heartbeatEvery: Duration.Input = "1 second",
): Effect.fn.Return<A, Refusal, R | Registers | Scope.Scope> {
  const registers = yield* Registers
  const initial = yield* registers.grant(work, holder)
  const token = yield* SynchronizedRef.make(initial.token)

  /** Read-renew-write as one step under the ref's own semaphore. */
  const renewOnce = SynchronizedRef.updateEffect(token, (current) =>
    Effect.map(registers.renew(work, current), (renewed) => renewed.token))

  // `Effect.repeat` runs its source once before it steps the schedule, so the
  // first heartbeat stays an explicit sleep and `Schedule.spaced` carries every
  // later one — the same instants the hand-rolled loop produced. `spaced` never
  // exhausts; the `never` tail is unreachable and states what the type cannot,
  // that this branch only ever ends by failing its fence.
  const renewals = Effect.sleep(heartbeatEvery).pipe(
    Effect.andThen(Effect.repeat(renewOnce, Schedule.spaced(heartbeatEvery))),
    Effect.andThen(Effect.never),
  )

  return yield* Effect.raceFirst(use(SynchronizedRef.get(token)), renewals)
})
