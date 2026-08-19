/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * @module
 */
import { JetStreamApiError, StorageType, StoreCompression } from "@nats-io/jetstream"
import { Kvm, type KV, type KvEntry, type KvStatus } from "@nats-io/kv"
import { Effect, Equal, Result, Schema, Scope } from "effect"

import {
  REGISTER_BUCKET,
  REGISTER_HISTORY,
  Holder,
  OutcomeValue,
  workKey,
  type RegisterOptions,
  type RegisterService,
  type RegisterState,
} from "../planes/Register.js"
import {
  structuralRefusal,
  type Next,
  type Refusal,
  type StructuralRefusalKind,
} from "../truth/Refusal.js"
import {
  KV_ALLOW_DIRECT,
  adminSurface,
  expiresFacts,
  expiringAuthorityCarrier,
  hasPinnedAdminSurface,
  importsFacts,
  mirroredAuthorityCarrier,
  type CarrierSite,
} from "./carriers.js"
import {
  KvFailure,
  acquireConnection,
  isCasRefusal,
  transportRefusalFor,
} from "./transport.js"

/**
 * NATS KV adapter for the commitment register.
 *
 * Incarnation pin (DEV-779). KV revisions are backing-stream sequences, so a
 * bucket delete+recreate resets the token order and a stale holder's
 * `update(expected)` would otherwise land on the reborn bucket as though its
 * fence still held. This adapter records the backing stream's incarnation
 * identity at open and re-asserts it ahead of every action, so no fence
 * derived from one incarnation is ever honored by another. The assertion runs
 * BEFORE any staleness comparison: a reborn bucket refuses
 * `incarnation-mismatch`, never `stale-register-token`, which would name a
 * current fence the reborn bucket never minted.
 *
 * What the pin does not claim: it is a precondition, not a two-phase commit.
 * A rebirth that lands between the assertion and the CAS is a residual window
 * of one round trip, which no client-side check can close — the pinned server
 * publishes no expected-stream-identity precondition to attach to the write.
 * The DEV-716 ACL suite (application credentials cannot delete or recreate
 * streams and buckets) is the other half of the guard. See
 * packages/plait/DECISIONS.md, Task DEV-779.
 */

/**
 * The sorts are suspended because `Register.ts` imports this adapter: the cycle
 * is the shipped public/internal split, and a direct reference here would read
 * the bindings before the public module has initialized them — the same reason
 * the cell adapter suspends its observation schema.
 */
const StoredOutcome = Schema.Struct({
  token: Schema.Finite,
  value: Schema.suspend(() => OutcomeValue),
})
const StoredRegister = Schema.Struct({
  holder: Schema.suspend(() => Holder),
  outcome: Schema.NullOr(StoredOutcome),
})

type StoredRegister = typeof StoredRegister.Type

const encoder = new TextEncoder()

const encode = (value: StoredRegister): Uint8Array =>
  encoder.encode(JSON.stringify(value))

/**
 * The absence sort's taught repair. A transport refusal leaves the operation's
 * outcome ambiguous (seam rule 2), and the reconciliation this adapter uses
 * everywhere else is read-back, never a retried write on faith.
 */
const teachTransportReadBack: ReadonlyArray<Next> = [{
  subject: "register.observe",
  note: "Reconnect to the pinned server and observe the register: a transport refusal leaves this operation's outcome unknown, so read the landed holder, token, and outcome back before retrying it.",
}]

/** Exported for the spine wall; no other `src` module imports it. */
export const transportRefusal = transportRefusalFor({
  kind: "register-transport-unavailable",
  law: "Transport absence may be retried; fencing-law refusals may not.",
  expected: "the pinned local NATS KV operation to be available",
  next: () => teachTransportReadBack,
})

const lawRefusal = (
  kind: StructuralRefusalKind,
  law: string,
  path: ReadonlyArray<string>,
  got: string | number,
  expected: string | number,
  next: ReadonlyArray<Next>,
): Refusal => structuralRefusal({ kind, law, path, got, expected, next })

/** One taught repair per structural law; every refusal names its legal next step. */
const teachStoredState: ReadonlyArray<Next> = [{
  subject: "register.observe",
  note: "Restore the closed {holder, outcome} record at this key; only register operations write this bucket.",
}]
const teachGrantFirst: ReadonlyArray<Next> = [{
  subject: "register.grant",
  note: "Grant the register first; renew, commit, and expire-steal act only on a present register.",
}]
const teachObserveHolder: ReadonlyArray<Next> = [{
  subject: "register.observe",
  note: "Observe the register for its current holder and token; grant only an absent register.",
}]
const teachLandedOutcome: ReadonlyArray<Next> = [{
  subject: "register.observe",
  note: "Observe the landed outcome and take it as this work's result; an outcome, once set, never changes.",
}]
const teachSupersededLease: ReadonlyArray<Next> = [{
  subject: "register.observe",
  note: "Observe the register for the current token and holder; this lease is superseded; do not renew with this token.",
}]
const teachSupersededRound: ReadonlyArray<Next> = [{
  subject: "register.observe",
  note: "Observe the register for the current token and landed outcome; this round is superseded; do not retry this commit.",
}]
const teachReattemptSteal: ReadonlyArray<Next> = [{
  subject: "register.observe",
  note: "Re-read the register at its current revision and re-attempt the expire-steal against it.",
}]
const teachReopenRegister: ReadonlyArray<Next> = [{
  subject: "register.open",
  note: "Re-open the register and re-derive the fence from the live bucket; a reborn bucket's revisions restart, so every token minted under the destroyed incarnation is void and none of them may be presented again.",
}]

/**
 * The law the pin defends: F5's fencing order is an order within one backing
 * stream, and a reborn stream is a different one.
 */
const incarnationLaw =
  "A fencing token is honored only by the backing-stream incarnation that minted it."

/**
 * The backing stream's incarnation identity.
 *
 * `StreamInfo.created` is the strongest identity the pinned
 * `@nats-io/jetstream@3.4.0` publishes. Its `StreamInfo` carries `config`,
 * `created`, `state`, `cluster`, `mirror`, `sources`, `alternates`, and `ts`,
 * and none of them is a server-minted stream UID: `config.name` is the bucket's
 * own name and identical across incarnations by construction,
 * `config.metadata` carries only the server's `_nats.level`/`_nats.req.level`/
 * `_nats.ver` rows, and every `state` field moves under ordinary writes.
 * `created` is the one field fixed for a stream's whole life and re-minted by
 * its rebirth.
 *
 * `null` is the answer for a status a server did not stamp. It refuses rather
 * than pins, because pinning an empty identity would compare equal to every
 * later empty identity and leave a guard that guards nothing.
 */
const incarnationOf = (status: KvStatus): string | null => {
  const created: unknown = status.streamInfo.created
  return typeof created === "string" && created !== "" ? created : null
}

/**
 * Whether the pinned client answered a stream-info request with "this stream
 * is not here".
 *
 * Classified by operation context plus the API status, never by an error name
 * (DEV-704 seam rule 2), and read off the published `JetStreamApiError` getter
 * rather than an unpublished code constant: `@nats-io/jetstream@3.4.0` exports
 * `JetStreamApiCodes` without a stream-not-found row, and the concrete
 * `StreamNotFoundError` class is absent from the package entrypoint. On a
 * stream-info request for one named stream a 404 says exactly one thing, and
 * that thing is a destroyed incarnation, not a retryable absence.
 */
const isMissingStream = (cause: unknown): boolean =>
  cause instanceof JetStreamApiError && cause.status === 404

/** Where the register carrier is opened, for a named law to address. */
const registerSite: CarrierSite = { path: ["bucket"], subject: "bucket.ensure" }

const decode = (entry: KvEntry): Effect.Effect<StoredRegister, Refusal> => {
  const parsed = Effect.try({
    try: () => JSON.parse(entry.string()) as unknown,
    catch: (cause) => lawRefusal(
      "malformed-register-state",
      "Register state is a closed holder/outcome record.",
      ["value"],
      String(cause),
      "valid JSON register state",
      teachStoredState,
    ),
  })
  return Effect.flatMap(parsed, (value) => {
    const result = Schema.decodeUnknownResult(StoredRegister, {
      onExcessProperty: "error",
      errors: "first",
    })(value)
    return Result.isSuccess(result)
      ? Effect.succeed(result.success)
      : Effect.fail(lawRefusal(
        "malformed-register-state",
        "Register state is a closed holder/outcome record.",
        ["value"],
        String(result.failure),
        "{ holder: string, outcome: null | { token, value } }",
        teachStoredState,
      ))
  })
}

const stateOf = Effect.fn("Registers.stateOf")(function* (
  entry: KvEntry,
): Effect.fn.Return<RegisterState, Refusal> {
  const stored = yield* decode(entry)
  return {
    token: stored.outcome?.token ?? entry.revision,
    holder: stored.holder,
    outcome: stored.outcome,
  }
})

const read = (
  bucket: KV,
  work: string,
): Effect.Effect<KvEntry | null, Refusal> =>
  Effect.tryPromise({
    try: () => bucket.get(work),
    catch: (cause) => transportRefusal("register.read", cause),
  })

const requirePresent = (
  entry: KvEntry | null,
): Effect.Effect<KvEntry, Refusal> => entry === null
  ? Effect.fail(lawRefusal(
    "register-absent",
    "Renew, commit, and expire-steal require a present register.",
    ["register"],
    "absent",
    "present",
    teachGrantFirst,
  ))
  : Effect.succeed(entry)

export const makeRegisterService = Effect.fn("Registers.make")(function* (
  options: RegisterOptions,
): Effect.fn.Return<RegisterService, Refusal, Scope.Scope> {
  const connection = yield* acquireConnection(
    options,
    "foldlab-plait-register",
    "connection.acquire",
    transportRefusal,
  )
  const bucket = yield* Effect.tryPromise({
    try: () => new Kvm(connection).create(REGISTER_BUCKET, {
      storage: StorageType.File,
      replicas: 1,
      history: REGISTER_HISTORY,
      ttl: 0,
      max_bytes: -1,
      // Declared, not feature-detected — see the cell carrier's twin.
      allow_direct: KV_ALLOW_DIRECT,
    }),
    catch: (cause) => transportRefusal("bucket.ensure", cause),
  })
  const status = yield* Effect.tryPromise({
    try: () => bucket.status(),
    catch: (cause) => transportRefusal("bucket.status", cause),
  })
  const config = status.streamInfo.config
  if (importsFacts(config)) return yield* mirroredAuthorityCarrier(registerSite, config)
  if (expiresFacts(config)) return yield* expiringAuthorityCarrier(registerSite, config)
  if (status.storage !== StorageType.File || status.replicas !== 1 ||
    status.history !== REGISTER_HISTORY || status.ttl !== 0 || status.max_bytes !== -1 ||
    !hasPinnedAdminSurface(config, KV_ALLOW_DIRECT)) {
    return yield* lawRefusal(
      "register-substrate-shape",
      "The register bucket is file-backed R=1 with 64 retained revisions, no age or size eviction, and no admin surface beyond it.",
      ["bucket", "config"],
      JSON.stringify({
        storage: status.storage,
        replicas: status.replicas,
        history: status.history,
        ttl: status.ttl,
        max_bytes: status.max_bytes,
        ...adminSurface(config),
      }),
      "file/R=1/history=64/ttl=0/max_bytes=-1/direct=on, and no republish, subject transform, mirror-direct, atomic publish, message counter, compression, or value-size cap",
      [{
        subject: "bucket.ensure",
        note: "Configure the register bucket file-backed with one replica, 64 retained revisions, no age or size eviction, and none of the admin surface beyond it.",
        body: {
          storage: StorageType.File,
          replicas: 1,
          history: REGISTER_HISTORY,
          ttl: 0,
          max_bytes: -1,
          republish: null,
          subject_transform: null,
          allow_direct: KV_ALLOW_DIRECT,
          mirror_direct: false,
          allow_atomic: false,
          allow_msg_counter: false,
          compression: StoreCompression.None,
          max_msg_size: -1,
        },
      }],
    )
  }

  /**
   * The incarnation this service is bound to, taken from the status the shape
   * check already read — so the pin itself costs no extra round trip at open.
   * An unstamped identity refuses here rather than pinning a value that would
   * make every later assertion vacuously true.
   */
  const pinned = incarnationOf(status)
  if (pinned === null) {
    return yield* structuralRefusal({
      kind: "incarnation-mismatch",
      law: incarnationLaw,
      path: ["bucket", "incarnation"],
      got: "a backing stream that reports no creation time",
      expected: "a backing stream that reports its creation time",
      next: teachReopenRegister,
    })
  }

  /**
   * Minted as a literal rather than through `lawRefusal`, so the taught-payload
   * wall pins this law and this repair byte for byte: the positional helper
   * builds its record from shorthand properties, which the walk does not see.
   */
  const incarnationRefusal = (got: string): Refusal => structuralRefusal({
    kind: "incarnation-mismatch",
    law: incarnationLaw,
    path: ["bucket", "incarnation"],
    got,
    expected: pinned,
    next: teachReopenRegister,
  })

  /**
   * Re-reads the backing stream's identity and refuses unless it is still the
   * incarnation this service pinned at open.
   *
   * Every action runs this FIRST, ahead of its own law checks. Ordering is the
   * whole point: a reborn bucket's revisions restart from one, so a stale token
   * compared against them would refuse `stale-register-token` naming a
   * "current" fence that no holder of this register was ever granted. The pin
   * refuses the question instead of answering it wrongly.
   *
   * The cost is one stream-info round trip per action, measured at 0.109ms p50
   * against the pinned local server — the same order as the `get` each action
   * already performs (0.093ms p50). That cost is what DECISIONS T6 deferred and
   * what Task DEV-779 accepts.
   */
  const assertIncarnation = (operation: string): Effect.Effect<void, Refusal> =>
    Effect.flatMap(
      Effect.tryPromise({
        try: () => bucket.status(),
        // A destroyed bucket is not a retryable absence: no future retry can
        // make the pinned incarnation exist again.
        catch: (cause) => isMissingStream(cause)
          ? incarnationRefusal("a destroyed backing stream")
          : transportRefusal(operation, cause),
      }),
      (current) => {
        const observed = incarnationOf(current)
        return observed === pinned
          ? Effect.void
          : Effect.fail(incarnationRefusal(
            observed ?? "a backing stream that reports no creation time",
          ))
      },
    )

  /**
   * Reconciles one failed `update(presented)` per DEV-704 seam rules 1-2.
   * The outcome of a failed CAS append is ambiguous (it may have LANDED
   * before the failure surfaced), so the subject is read back and compared
   * to the intended append — never resolved by expecting a duplicate PubAck:
   * - read-back matches the intended record at a later revision: the append
   *   landed; the read-back entry is returned as success evidence;
   * - read-back shows a different current revision: a genuine CAS conflict;
   *   the typed fencing refusal cites its law with the fresh revision;
   * - read-back shows the presented revision unchanged: nothing landed; a
   *   definitive wrong-last-sequence code still refuses on the law, while a
   *   transport-class cause stays a retryable transport refusal, cause
   *   preserved.
   * Within this envelope only this register's contenders write the key, so
   * a matching read-back identifies this call's append (holder names are
   * descriptive; identical contender names are one principal).
   */
  const reconcileUpdate = (options: {
    readonly operation: string
    readonly work: string
    readonly presented: number
    readonly intended: StoredRegister
    readonly kind: StructuralRefusalKind
    readonly law: string
    readonly next: ReadonlyArray<Next>
    readonly cause: unknown
  }): Effect.Effect<KvEntry, Refusal> => Effect.gen(function* () {
    const { operation, work, presented, intended, kind, law, next, cause } = options
    const entry = yield* read(bucket, work)
    if (entry === null) {
      // Vanishing mid-flight is lifecycle mutation. Ask the pin which kind it
      // was: a bucket reborn under this call refuses on the pin's law, and a
      // still-pinned incarnation leaves this write's outcome genuinely
      // ambiguous, which is a transport absence.
      yield* assertIncarnation(operation)
      return yield* transportRefusal(operation, cause)
    }
    const stored = yield* decode(entry)
    // Whole-record equality, not a hand-listed field comparison: a field added
    // to StoredRegister is compared the day it is added rather than silently
    // dropped from the check. The closed decode above is the other half —
    // foreign fields refuse instead of comparing equal.
    if (entry.revision > presented && Equal.equals(stored, intended)) {
      return entry
    }
    if (entry.revision !== presented) {
      return yield* lawRefusal(kind, law, ["token"], presented, entry.revision, next)
    }
    if (isCasRefusal(cause)) {
      return yield* lawRefusal(kind, law, ["token"], presented, "the current revision", next)
    }
    return yield* transportRefusal(operation, cause)
  })

  const grant: RegisterService["grant"] = Effect.fn("Registers.grant")(
    function* (rawWork, holder) {
      const work = yield* workKey(rawWork)
      yield* assertIncarnation("register.grant")
      const existing = yield* read(bucket, work)
      if (existing !== null) return yield* lawRefusal(
        "duplicate-grant",
        "grant requires the register to be absent",
        ["register"],
        "present",
        "absent",
        teachObserveHolder,
      )
      const intended: StoredRegister = { holder, outcome: null }
      const created = yield* Effect.tryPromise({
        try: () => bucket.create(work, encode(intended)),
        catch: (cause) => new KvFailure(cause),
      }).pipe(
        Effect.map((token): RegisterState => ({ token, holder, outcome: null })),
        Effect.catch(({ cause }) => Effect.gen(function* () {
          // Reconcile the ambiguous create by read-back (rule 1), classify
          // the conflict by context plus code (rule 2).
          const entry = yield* read(bucket, work)
          if (entry !== null) {
            const stored = yield* decode(entry)
            if (Equal.equals(stored, intended)) {
              return { token: entry.revision, holder, outcome: null } satisfies RegisterState
            }
            return yield* lawRefusal(
              "duplicate-grant",
              "grant requires the register to be absent",
              ["register"],
              "present",
              "absent",
              teachObserveHolder,
            )
          }
          if (isCasRefusal(cause)) {
            return yield* lawRefusal(
              "duplicate-grant",
              "grant requires the register to be absent",
              ["register"],
              "present or concurrently created",
              "absent",
              teachObserveHolder,
            )
          }
          return yield* transportRefusal("register.grant", cause)
        })),
      )
      return created
    },
  )

  const renew: RegisterService["renew"] = Effect.fn("Registers.renew")(
    function* (rawWork, token) {
      const work = yield* workKey(rawWork)
      yield* assertIncarnation("register.renew")
      const entry = yield* requirePresent(yield* read(bucket, work))
      const stored = yield* decode(entry)
      // A landed outcome refuses on its own law even when the presented
      // token is current: the outcome, not staleness, is the reason.
      if (stored.outcome !== null) return yield* lawRefusal(
        "outcome-already-landed",
        "an outcome, once set, never changes",
        ["outcome"], stored.outcome.value, "absent",
        teachLandedOutcome,
      )
      if (token !== entry.revision) return yield* lawRefusal(
        "stale-register-token",
        "renew requires the current fencing token",
        ["token"],
        token,
        entry.revision,
        teachSupersededLease,
      )
      const intended = stored
      const next = yield* Effect.tryPromise({
        try: () => bucket.update(work, encode(intended), token),
        catch: (cause) => new KvFailure(cause),
      }).pipe(Effect.catch(({ cause }) =>
        Effect.map(
          reconcileUpdate({
            operation: "register.renew",
            work,
            presented: token,
            intended,
            kind: "stale-register-token",
            law: "renew requires the current fencing token",
            next: teachSupersededLease,
            cause,
          }),
          (landedEntry) => landedEntry.revision,
        )))
      return { token: next, holder: stored.holder, outcome: null }
    },
  )

  const commit: RegisterService["commit"] = Effect.fn("Registers.commit")(
    function* (rawWork, token, outcome) {
      const work = yield* workKey(rawWork)
      yield* assertIncarnation("register.commit")
      const entry = yield* requirePresent(yield* read(bucket, work))
      const stored = yield* decode(entry)
      if (stored.outcome !== null) return yield* lawRefusal(
        "outcome-already-landed",
        "an outcome, once set, never changes",
        ["outcome"], stored.outcome.value, "absent",
        teachLandedOutcome,
      )
      if (token !== entry.revision) return yield* lawRefusal(
        "stale-register-token",
        "no stale token ever lands",
        ["token"], token, entry.revision,
        teachSupersededRound,
      )
      const landed = { token, value: outcome }
      const intended: StoredRegister = { holder: stored.holder, outcome: landed }
      yield* Effect.tryPromise({
        try: () => bucket.update(work, encode(intended), token),
        catch: (cause) => new KvFailure(cause),
      }).pipe(Effect.catch(({ cause }) =>
        reconcileUpdate({
          operation: "register.commit",
          work,
          presented: token,
          intended,
          kind: "stale-register-token",
          law: "no stale token ever lands",
          next: teachSupersededRound,
          cause,
        })))
      return { token, holder: stored.holder, outcome: landed }
    },
  )

  const expireSteal: RegisterService["expireSteal"] = Effect.fn("Registers.expireSteal")(
    function* (rawWork, holder) {
      const work = yield* workKey(rawWork)
      yield* assertIncarnation("register.expireSteal")
      const entry = yield* requirePresent(yield* read(bucket, work))
      const stored = yield* decode(entry)
      if (stored.outcome !== null) return yield* lawRefusal(
        "outcome-already-landed",
        "an outcome, once set, never changes",
        ["outcome"], stored.outcome.value, "absent",
        teachLandedOutcome,
      )
      const intended: StoredRegister = { holder, outcome: null }
      const next = yield* Effect.tryPromise({
        try: () => bucket.update(work, encode(intended), entry.revision),
        catch: (cause) => new KvFailure(cause),
      }).pipe(Effect.catch(({ cause }) =>
        Effect.map(
          reconcileUpdate({
            operation: "register.expireSteal",
            work,
            presented: entry.revision,
            intended,
            kind: "concurrent-register-update",
            law: "expire-steal grants a strictly larger token from the current revision",
            next: teachReattemptSteal,
            cause,
          }),
          (landedEntry) => landedEntry.revision,
        )))
      return { token: next, holder, outcome: null }
    },
  )

  const observe: RegisterService["observe"] = Effect.fn("Registers.observe")(
    function* (rawWork) {
      const work = yield* workKey(rawWork)
      // `observe` is the taught repair of nearly every register refusal, so it
      // is pinned too: handing back a reborn bucket's holder and token as this
      // register's state is the silent answer the pin exists to refuse.
      yield* assertIncarnation("register.observe")
      const entry = yield* read(bucket, work)
      if (entry === null) return { token: 0, holder: null, outcome: null }
      return yield* stateOf(entry)
    },
  )

  return { grant, renew, commit, expireSteal, observe }
})
