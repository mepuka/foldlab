/**
 * Plane: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import {
  Context,
  Duration,
  Effect,
  Layer,
  Order,
  Schedule,
  Schema,
  Scope,
  SynchronizedRef,
} from "effect"

import type { ConnectionBootstrap } from "../internal/transport.js"
import {
  structuralRefusal,
  type Next,
  type Refusal,
  type StructuralRefusal,
} from "../truth/Refusal.js"
import { TOKEN_PATTERN } from "../kernel/Subjects.js"
import { Holder } from "../kernel/Wire.js"
import { makeRegisterService } from "../internal/registers.js"

/**
 * Who a commitment is attributed to, re-exported at the concept it names.
 *
 * The sort is declared once in the wire grammar, where the envelope carries it;
 * this seam is the other place the estate speaks it, and holder identity here
 * is descriptive exactly as it is there — only the revision-derived token is
 * authority.
 */
export { Holder } from "../kernel/Wire.js"

/** The file-backed KV bucket that is authoritative for commitment registers. */
export const REGISTER_BUCKET = "flb-fab-reg"

/** Per-key retained revisions; there is no age or byte-size eviction policy. */
export const REGISTER_HISTORY = 64

/**
 * The key one commitment register is held at.
 *
 * The grammar is the fabric's literal-token alphabet, which is what the KV
 * keyspace can carry. The kernel's direction is that this key IS a work digest,
 * so the sort is expected to tighten into a digest alias; the brand lands now
 * so that tightening is a change of check behind one name rather than a sweep
 * of every seam that spells it.
 */
export const WorkKey = Schema.String
  .check(Schema.isPattern(TOKEN_PATTERN))
  .pipe(Schema.brand("@foldlab/plait/WorkKey"))
  .annotate({ identifier: "PlaitWorkKey" })

/** The key one commitment register is held at. */
export type WorkKey = typeof WorkKey.Type

/**
 * The terminal value a fenced commit lands.
 *
 * Today the register treats it as opaque: the only standing law is that a
 * landed outcome says something, so the check is that it is non-empty. The
 * commit door that will judge an outcome against its declared schema lands on
 * this brand, which is why the sort exists before the constraint does.
 */
export const OutcomeValue = Schema.String
  .check(Schema.isMinLength(1))
  .pipe(Schema.brand("@foldlab/plait/OutcomeValue"))
  .annotate({ identifier: "PlaitOutcomeValue" })

/** The terminal value a fenced commit lands. */
export type OutcomeValue = typeof OutcomeValue.Type

/** One taught repair per structural law; every refusal names its legal next step. */
const teachRegisterKey: ReadonlyArray<Next> = [{
  subject: "register.key",
  note: "Present the work digest as one literal KV token without dots, whitespace, or wildcards.",
}]

/**
 * Admits one work key, refusing anything the KV keyspace cannot carry.
 *
 * This is the sort's one minting site: the adapter under this seam calls it
 * rather than re-testing the grammar, so a key that reached the substrate was
 * admitted exactly once and the teaching has one home.
 *
 * @example
 * ```ts
 * import { workKey } from "@foldlab/plait/Register"
 * import { Effect } from "effect"
 *
 * Effect.runSync(workKey("render-report"))
 * // "render-report"
 * ```
 */
export const workKey = Effect.fn("Register.workKey")(function* (
  key: string,
): Effect.fn.Return<WorkKey, StructuralRefusal> {
  if (!Schema.is(WorkKey)(key)) {
    return yield* structuralRefusal({
      kind: "invalid-register-key",
      law: "A work digest maps to one literal NATS KV key.",
      path: ["work"],
      got: key,
      expected: "one non-empty token without dots, whitespace, or wildcards",
      next: teachRegisterKey,
    })
  }
  return key
})

/** A terminal result landed under one fencing token. */
export interface RegisterOutcome {
  readonly token: number
  readonly value: OutcomeValue
}

/** The observable meaning-state of one per-work-digest register. */
export interface RegisterState {
  readonly token: number
  readonly holder: Holder | null
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
  readonly grant: (work: WorkKey, holder: Holder) => Effect.Effect<RegisterState, Refusal>
  readonly renew: (work: WorkKey, token: number) => Effect.Effect<RegisterState, Refusal>
  readonly commit: (
    work: WorkKey,
    token: number,
    outcome: OutcomeValue,
  ) => Effect.Effect<RegisterState, Refusal>
  readonly expireSteal: (work: WorkKey, holder: Holder) => Effect.Effect<RegisterState, Refusal>
  readonly observe: (work: WorkKey) => Effect.Effect<RegisterState, Refusal>
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
  work: WorkKey,
  holder: Holder,
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
