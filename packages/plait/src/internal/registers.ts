import { StorageType } from "@nats-io/jetstream"
import { Kvm, type KV, type KvEntry } from "@nats-io/kv"
import type { NatsConnection } from "@nats-io/nats-core"
import { connect } from "@nats-io/transport-node"
import { Effect, Result, Schema, Scope } from "effect"

import {
  REGISTER_BUCKET,
  REGISTER_HISTORY,
  type RegisterOptions,
  type RegisterService,
  type RegisterState,
} from "../Register.js"
import { absenceRefusal, structuralRefusal, type Refusal } from "../Refusal.js"

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

const transportRefusal = (operation: string, cause: unknown): Refusal =>
  absenceRefusal({
    kind: "register-transport-unavailable",
    law: "Transport absence may be retried; fencing-law refusals may not.",
    path: [operation],
    got: String(cause),
    expected: "the pinned local NATS KV operation to be available",
    next: [],
  })

const lawRefusal = (
  kind: string,
  law: string,
  path: ReadonlyArray<string>,
  got: string | number,
  expected: string | number,
): Refusal => structuralRefusal({ kind, law, path, got, expected, next: [] })

const validWork = (work: string): Effect.Effect<string, Refusal> =>
  workPattern.test(work)
    ? Effect.succeed(work)
    : Effect.fail(lawRefusal(
      "invalid-register-key",
      "A work digest maps to one literal NATS KV key.",
      ["work"],
      work,
      "one non-empty token without dots, whitespace, or wildcards",
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
    ),
  })
  return Effect.flatMap(parsed, (value) => {
    const result = Schema.decodeUnknownResult(StoredRegister)(value)
    return Result.isSuccess(result)
      ? Effect.succeed(result.success)
      : Effect.fail(lawRefusal(
        "malformed-register-state",
        "Register state is a closed holder/outcome record.",
        ["value"],
        String(result.failure),
        "{ holder: string, outcome: null | { token, value } }",
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

const closeConnection = (connection: NatsConnection): Effect.Effect<void> =>
  Effect.tryPromise({
    try: () => connection.close(),
    catch: () => undefined,
  }).pipe(Effect.catch(() => Effect.void))

const requirePresent = (
  entry: KvEntry | null,
): Effect.Effect<KvEntry, Refusal> => entry === null
  ? Effect.fail(lawRefusal(
    "register-absent",
    "Renew, commit, and expire-steal require a present register.",
    ["register"],
    "absent",
    "present",
  ))
  : Effect.succeed(entry)

export const makeRegisterService = Effect.fn("Registers.make")(function* (
  options: RegisterOptions,
): Effect.fn.Return<RegisterService, Refusal, Scope.Scope> {
  const connection = yield* Effect.acquireRelease(
    Effect.tryPromise({
      try: () => connect({
        servers: typeof options.servers === "string" ? options.servers : [...options.servers],
        name: options.connectionName ?? "foldlab-plait-register",
      }),
      catch: (cause) => transportRefusal("connection.acquire", cause),
    }),
    closeConnection,
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
    )
  }

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
      )
      const token = yield* Effect.tryPromise({
        try: () => bucket.create(work, encode({ holder, outcome: null })),
        catch: () => lawRefusal(
          "duplicate-grant",
          "grant requires the register to be absent",
          ["register"],
          "present or concurrently created",
          "absent",
        ),
      })
      return { token, holder, outcome: null }
    },
  )

  const renew: RegisterService["renew"] = Effect.fn("Registers.renew")(
    function* (rawWork, token) {
      const work = yield* validWork(rawWork)
      const entry = yield* requirePresent(yield* read(bucket, work))
      const stored = yield* decode(entry)
      if (stored.outcome !== null || token !== entry.revision) return yield* lawRefusal(
        "stale-register-token",
        "renew requires the current fencing token",
        ["token"],
        token,
        entry.revision,
      )
      const next = yield* Effect.tryPromise({
        try: () => bucket.update(work, encode(stored), token),
        catch: () => lawRefusal(
          "stale-register-token",
          "renew requires the current fencing token",
          ["token"], token, "the current revision",
        ),
      })
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
      )
      if (token !== entry.revision) return yield* lawRefusal(
        "stale-register-token",
        "no stale token ever lands",
        ["token"], token, entry.revision,
      )
      const landed = { token, value: outcome }
      yield* Effect.tryPromise({
        try: () => bucket.update(work, encode({ holder: stored.holder, outcome: landed }), token),
        catch: () => lawRefusal(
          "stale-register-token",
          "no stale token ever lands",
          ["token"], token, "the current revision",
        ),
      })
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
      )
      const next = yield* Effect.tryPromise({
        try: () => bucket.update(work, encode({ holder, outcome: null }), entry.revision),
        catch: () => lawRefusal(
          "concurrent-register-update",
          "expire-steal grants a strictly larger token from the current revision",
          ["token"], entry.revision, "the current revision",
        ),
      })
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
