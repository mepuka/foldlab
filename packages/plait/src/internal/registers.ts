import { StorageType } from "@nats-io/jetstream"
import { Kvm, type KV, type KvEntry } from "@nats-io/kv"
import { Effect, Equal, Result, Schema, Scope } from "effect"

import {
  REGISTER_BUCKET,
  REGISTER_HISTORY,
  type RegisterOptions,
  type RegisterService,
  type RegisterState,
} from "../Register.js"
import {
  structuralRefusal,
  type Next,
  type Refusal,
  type StructuralRefusalKind,
} from "../Refusal.js"
import {
  KvFailure,
  acquireConnection,
  isCasRefusal,
  transportRefusalFor,
} from "./transport.js"

/**
 * NATS KV adapter for the commitment register.
 *
 * Incarnation bound: every claim this adapter's walls make holds within a
 * fixed backing-stream incarnation; administrative lifecycle mutation is
 * outside the credential guard. KV revisions are stream sequences, so a
 * bucket delete+recreate resets the token order and a stale holder's
 * `update(expected)` can land on the reborn bucket. The incarnation pin at
 * open (record the backing stream's creation time; refuse on mismatch) is
 * NOT yet implemented — recorded deferral, see packages/plait/DECISIONS.md;
 * the DEV-716 ACL suite is the other half of the guard.
 */

const StoredOutcome = Schema.Struct({ token: Schema.Number, value: Schema.String })
const StoredRegister = Schema.Struct({
  holder: Schema.String,
  outcome: Schema.NullOr(StoredOutcome),
})

type StoredRegister = typeof StoredRegister.Type

const encoder = new TextEncoder()
const workPattern = /^[^.*>\s]+$/u

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

const transportRefusal = transportRefusalFor({
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
const teachRegisterKey: ReadonlyArray<Next> = [{
  subject: "register.key",
  note: "Present the work digest as one literal KV token without dots, whitespace, or wildcards.",
}]
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

const validWork = (work: string): Effect.Effect<string, Refusal> =>
  workPattern.test(work)
    ? Effect.succeed(work)
    : Effect.fail(lawRefusal(
      "invalid-register-key",
      "A work digest maps to one literal NATS KV key.",
      ["work"],
      work,
      "one non-empty token without dots, whitespace, or wildcards",
      teachRegisterKey,
    ))

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
    }),
    catch: (cause) => transportRefusal("bucket.ensure", cause),
  })
  const status = yield* Effect.tryPromise({
    try: () => bucket.status(),
    catch: (cause) => transportRefusal("bucket.status", cause),
  })
  if (status.storage !== StorageType.File || status.replicas !== 1 ||
    status.history !== REGISTER_HISTORY || status.ttl !== 0 || status.max_bytes !== -1) {
    return yield* lawRefusal(
      "register-substrate-shape",
      "The register bucket is file-backed R=1 with 64 retained revisions and no age or size eviction.",
      ["bucket", "config"],
      JSON.stringify({
        storage: status.storage,
        replicas: status.replicas,
        history: status.history,
        ttl: status.ttl,
        max_bytes: status.max_bytes,
      }),
      "file/R=1/history=64/ttl=0/max_bytes=-1",
      [{
        subject: "bucket.ensure",
        note: "Configure the register bucket file-backed with one replica, 64 retained revisions, and no age or size eviction.",
        body: {
          storage: StorageType.File,
          replicas: 1,
          history: REGISTER_HISTORY,
          ttl: 0,
          max_bytes: -1,
        },
      }],
    )
  }

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
      // Vanishing mid-flight is lifecycle mutation: outside the fixed
      // backing-stream incarnation this adapter is bounded to.
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
      const work = yield* validWork(rawWork)
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
      const work = yield* validWork(rawWork)
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
      const work = yield* validWork(rawWork)
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
      const work = yield* validWork(rawWork)
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
      const work = yield* validWork(rawWork)
      const entry = yield* read(bucket, work)
      if (entry === null) return { token: 0, holder: null, outcome: null }
      return yield* stateOf(entry)
    },
  )

  return { grant, renew, commit, expireSteal, observe }
})
