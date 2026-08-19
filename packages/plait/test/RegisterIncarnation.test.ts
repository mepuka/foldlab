import { afterEach, describe, expect, test } from "bun:test"

import { StorageType } from "@nats-io/jetstream"
import { Kvm, type KV } from "@nats-io/kv"
import { connect, type NatsConnection } from "@nats-io/transport-node"
import { Effect, Result } from "effect"

import {
  REGISTER_BUCKET,
  REGISTER_HISTORY,
  Registers,
  type RegisterService,
} from "../src/planes/Register.js"
import type { Refusal } from "../src/truth/Refusal.js"
import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

/**
 * The register incarnation pin (DEV-779), walled against the chaos it exists
 * for: the bucket is DELETED and RECREATED out of band while a holder is still
 * carrying a fence, and the holder then replays its fenced operation.
 *
 * Bucket destroy+recreate is never an isolation primitive in this package
 * (DECISIONS T0, seam rule 7) — here it is the SUBJECT, performed deliberately
 * on a connection the register service does not own, which is exactly the
 * administrative lifecycle mutation the register's claims used to be bounded
 * away from. Row isolation is still one fresh server per test.
 */

const work = "0123456789abcdef"

/** The ruled register bucket shape, restated for the out-of-band chaos hand. */
const registerBucketShape = {
  storage: StorageType.File,
  replicas: 1,
  history: REGISTER_HISTORY,
  ttl: 0,
  max_bytes: -1,
} as const

const encode = (value: {
  readonly holder: string
  readonly outcome: null | { readonly token: number; readonly value: string }
}): Uint8Array => new TextEncoder().encode(JSON.stringify(value))

let harness: NatsHarness | undefined
let chaos: NatsConnection | undefined

afterEach(async () => {
  if (chaos !== undefined) await chaos.close()
  chaos = undefined
  if (harness !== undefined) await harness.stop()
  harness = undefined
})

/**
 * The chaos hand: a second connection, standing in for the operator or the
 * mis-scoped credential the DEV-716 ACL suite is the other half of the guard
 * against. Nothing the register service holds is reused here.
 */
const chaosHand = async (url: string): Promise<Kvm> => {
  chaos = await connect({ servers: url, name: "incarnation-chaos" })
  return new Kvm(chaos)
}

/** Destroys the register bucket and creates a new one at the same ruled shape. */
const rebornBucket = async (kvm: Kvm): Promise<KV> => {
  await (await kvm.open(REGISTER_BUCKET)).destroy()
  return kvm.create(REGISTER_BUCKET, registerBucketShape)
}

/** Runs one action against a live register service bound to one scope. */
const withRegisters = <A>(
  url: string,
  use: (registers: RegisterService) => Effect.Effect<A, Refusal>,
): Promise<Result.Result<A, Refusal>> =>
  Effect.runPromise(Effect.result(
    Effect.flatMap(Registers, use).pipe(
      Effect.provide(Registers.layer({ servers: url })),
      Effect.scoped,
    ),
  ))

const incarnationLaw =
  "A fencing token is honored only by the backing-stream incarnation that minted it."

describe("register incarnation pin", () => {
  test("a reborn bucket refuses the stale holder's commit, and the substrate would have accepted it", async () => {
    harness = await startNatsHarness()
    const url = harness.url

    // One scope, held open across the chaos: the service pins the incarnation
    // it opened and never re-opens, which is the state a live holder is in.
    const verdict = await Effect.runPromise(Effect.result(Effect.gen(function* () {
      const registers = yield* Registers
      const granted = yield* registers.grant(work, "holder-a")
      expect(granted.token).toBe(1)

      const kvm = yield* Effect.promise(() => chaosHand(url))
      const reborn = yield* Effect.promise(() => rebornBucket(kvm))

      // The reborn bucket is driven to the exact revision the stale holder's
      // token names. This is the silent-success setup, not an incidental one:
      // KV revisions are stream sequences and a reborn stream restarts at one,
      // so a fresh grant on the reborn bucket sits at revision 1 — numerically
      // the same fence "holder-a" is still carrying.
      const rebornRevision = yield* Effect.promise(() =>
        reborn.create(work, encode({ holder: "holder-b", outcome: null })))
      expect(rebornRevision).toBe(granted.token)

      // The stale fenced operation, replayed through the pinned service.
      const replayed = yield* Effect.result(registers.commit(work, granted.token, "zombie"))

      // Nothing landed: the reborn bucket still carries holder-b's open round.
      const after = yield* Effect.promise(() => reborn.get(work))
      const landed = JSON.parse(after!.string()) as { readonly outcome: unknown }

      // The hazard, demonstrated on the same bucket the pin just refused: the
      // substrate itself accepts the stale token. The refusal above is a fence
      // this wall holds, not a write the substrate was going to reject anyway.
      // The outcome is carried as a value rather than raised, so a pin deleted
      // from the adapter reddens this assertion instead of dying here — under
      // that mutation the adapter's own commit has already consumed revision 1
      // and this write answers "wrong last sequence" instead.
      const substrate = yield* Effect.promise(() =>
        reborn.update(work, encode({
          holder: "holder-b",
          outcome: { token: granted.token, value: "zombie" },
        }), granted.token).then(
          (revision) => `landed at ${revision}`,
          (cause: unknown) => `refused: ${String(cause)}`,
        ))

      return { replayed, landedOutcome: landed.outcome, rebornRevision, substrate }
    }).pipe(
      Effect.provide(Registers.layer({ servers: url })),
      Effect.scoped,
    )))

    expect(Result.isSuccess(verdict)).toBe(true)
    if (!Result.isSuccess(verdict)) return
    const { replayed, landedOutcome, substrate } = verdict.success

    expect(Result.isFailure(replayed)).toBe(true)
    if (!Result.isFailure(replayed)) return
    const refusal = replayed.failure
    // Not silent success, and not a wrong-last-sequence classification: the
    // reborn bucket's revision 1 IS "current", so a staleness comparison would
    // have named a fence holder-a was never granted.
    expect(refusal.kind).toBe("incarnation-mismatch")
    expect(refusal.kind).not.toBe("stale-register-token")
    expect(refusal.sort).toBe("structural")
    expect(refusal.law).toBe(incarnationLaw)
    expect(refusal.path).toEqual(["bucket", "incarnation"])
    expect(refusal.next[0]?.subject).toBe("register.open")

    // The refused commit left no outcome behind.
    expect(landedOutcome).toBeNull()
    // ...and the same token, presented to the raw substrate, lands.
    expect(substrate).toBe("landed at 2")
  }, 120_000)

  test("every register action refuses on the reborn bucket, none of them as staleness", async () => {
    harness = await startNatsHarness()
    const url = harness.url

    const kinds = await Effect.runPromise(Effect.gen(function* () {
      const registers = yield* Registers
      const granted = yield* registers.grant(work, "holder-a")
      const kvm = yield* Effect.promise(() => chaosHand(url))
      const reborn = yield* Effect.promise(() => rebornBucket(kvm))
      yield* Effect.promise(() => reborn.create(work, encode({ holder: "holder-b", outcome: null })))

      const refusalOf = <A>(action: Effect.Effect<A, Refusal>) =>
        Effect.map(Effect.result(action), (result) =>
          Result.isFailure(result) ? result.failure.kind : `ACCEPTED:${JSON.stringify(result)}`)

      return {
        grant: yield* refusalOf(registers.grant(work, "holder-a")),
        renew: yield* refusalOf(registers.renew(work, granted.token)),
        commit: yield* refusalOf(registers.commit(work, granted.token, "zombie")),
        expireSteal: yield* refusalOf(registers.expireSteal(work, "holder-c")),
        observe: yield* refusalOf(registers.observe(work)),
      }
    }).pipe(
      Effect.provide(Registers.layer({ servers: url })),
      Effect.scoped,
    ))

    expect(kinds).toEqual({
      grant: "incarnation-mismatch",
      renew: "incarnation-mismatch",
      commit: "incarnation-mismatch",
      expireSteal: "incarnation-mismatch",
      observe: "incarnation-mismatch",
    })
  }, 120_000)

  test("a destroyed bucket refuses structurally, never as a retryable absence", async () => {
    harness = await startNatsHarness()
    const url = harness.url

    const refusal = await Effect.runPromise(Effect.gen(function* () {
      const registers = yield* Registers
      const granted = yield* registers.grant(work, "holder-a")
      const kvm = yield* Effect.promise(() => chaosHand(url))
      yield* Effect.promise(async () => {
        await (await kvm.open(REGISTER_BUCKET)).destroy()
      })
      return yield* Effect.flip(registers.commit(work, granted.token, "zombie"))
    }).pipe(
      Effect.provide(Registers.layer({ servers: url })),
      Effect.scoped,
    ))

    // A retryable absence would teach a retry loop over a bucket that no future
    // retry can bring back at the pinned incarnation.
    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("incarnation-mismatch")
    expect(refusal.got).toBe("a destroyed backing stream")
  }, 120_000)

  test("an untouched incarnation leaves the five actions exactly as they were", async () => {
    harness = await startNatsHarness()
    const result = await withRegisters(harness.url, (registers) => Effect.gen(function* () {
      const granted = yield* registers.grant(work, "holder-a")
      const renewed = yield* registers.renew(work, granted.token)
      const stolen = yield* registers.expireSteal(work, "holder-b")
      const committed = yield* registers.commit(work, stolen.token, "done")
      const observed = yield* registers.observe(work)
      return { granted, renewed, stolen, committed, observed }
    }))

    expect(Result.isSuccess(result)).toBe(true)
    if (!Result.isSuccess(result)) return
    const { granted, renewed, stolen, committed, observed } = result.success
    expect(granted.holder).toBe("holder-a")
    expect(renewed.token).toBeGreaterThan(granted.token)
    expect(stolen.holder).toBe("holder-b")
    expect(committed.outcome).toEqual({ token: stolen.token, value: "done" })
    expect(observed.outcome).toEqual({ token: stolen.token, value: "done" })
  }, 120_000)
})
