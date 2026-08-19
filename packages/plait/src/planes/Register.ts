/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { Context, Duration, Effect, Layer, Order, Schedule, Scope, SynchronizedRef } from "effect"

import type { ConnectionBootstrap } from "../internal/transport.js"
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
 * Folds an observed register over the three states the model gives it.
 *
 * The vocabulary is the proved model's own — a key nobody has fenced is
 * **absent**, a lease standing with no result is **held**, and a result written
 * under its fencing token is **landed**. Landed is terminal: at most one commit
 * lands per key and no stale token lands at all, which is what lets the arm take
 * the outcome as a value rather than as a maybe.
 *
 * A conditional fold and not a pattern matcher: the three states are readings of
 * two nullable fields on one struct rather than three struct types, so a matcher
 * would be ceremony over a shape it cannot discriminate. `holder` is the absence
 * marker, because a register nobody has fenced has no holder to name.
 *
 * Read-side only. Nothing here arbitrates — deciding which of two observations
 * wins is the register's own act, under its revision fence.
 *
 * @example
 * ```ts
 * import { matchState } from "@foldlab/plait/Register"
 *
 * const rendered = matchState({
 *   absent: () => "unclaimed",
 *   held: (state) => `held by ${state.holder}`,
 *   landed: (state) => `decided: ${state.outcome.value}`,
 * })
 * ```
 */
export const matchState: <Out>(cases: {
  readonly absent: () => Out
  readonly held: (state: {
    readonly token: RegisterState["token"]
    readonly holder: NonNullable<RegisterState["holder"]>
  }) => Out
  readonly landed: (state: {
    readonly token: RegisterState["token"]
    readonly holder: NonNullable<RegisterState["holder"]>
    readonly outcome: NonNullable<RegisterState["outcome"]>
  }) => Out
}) => (state: RegisterState) => Out =
  <Out>(cases: {
    readonly absent: () => Out
    readonly held: (state: {
      readonly token: RegisterState["token"]
      readonly holder: NonNullable<RegisterState["holder"]>
    }) => Out
    readonly landed: (state: {
      readonly token: RegisterState["token"]
      readonly holder: NonNullable<RegisterState["holder"]>
      readonly outcome: NonNullable<RegisterState["outcome"]>
    }) => Out
  }) =>
  (state: RegisterState): Out => {
    if (state.holder === null) return cases.absent()
    if (state.outcome === null) {
      return cases.held({ token: state.token, holder: state.holder })
    }
    return cases.landed({
      token: state.token,
      holder: state.holder,
      outcome: state.outcome,
    })
  }

/**
 * The order fencing tokens carry: a token never decreases, and a grant or a
 * steal strictly increases it.
 *
 * **Bounds, and they are the whole of the claim.** The order is meaningful
 * within ONE register key and ONE backing-stream incarnation, and nowhere else.
 * The token is a revision of a bucket-global monotone stream, so it is total per
 * key and never consecutive per key, and comparing tokens across two keys
 * compares two positions in a shared stream rather than two moments of one
 * round. A bucket destroyed and recreated starts the stream again, so a token
 * from the dead incarnation orders against nothing in the live one.
 *
 * Read-side only. This sorts observed states — an audit rendering, a task view's
 * attempt list — and licenses no client-side arbitration: "read the maximum and
 * act on it" is the register's act, taken under its revision fence, and taking
 * it out here would be a second arbitration path beside the fenced one.
 */
export const TokenOrder: Order.Order<RegisterState["token"]> = Order.Number

/**
 * Observed register states ordered by their fencing token.
 *
 * Carries `TokenOrder`'s bounds unchanged: one register key, one backing-stream
 * incarnation, read side only.
 *
 * @example
 * ```ts
 * import { byToken } from "@foldlab/plait/Register"
 * import { Order } from "effect"
 *
 * const later = Order.max(byToken)(mine, observed)
 * ```
 */
export const byToken: Order.Order<RegisterState> = Order.mapInput(
  Order.Number,
  (state: RegisterState) => state.token,
)

/**
 * The five-action register surface walled against the proved Veil model.
 *
 * Every claim holds within one backing-stream incarnation, and the live layer
 * now enforces that rather than assuming it: the incarnation is pinned at open
 * and re-asserted ahead of every action, so a fence minted under a destroyed
 * bucket refuses `incarnation-mismatch` instead of landing on its reborn
 * successor (DECISIONS, Task DEV-779). The pin is a precondition, not a
 * two-phase commit — a rebirth landing between the assertion and the CAS is a
 * residual one-round-trip window — and the DEV-716 ACL suite is the other half
 * of the guard.
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
