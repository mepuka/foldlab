import { afterEach, describe, expect, test } from "bun:test"

import {
  DiscardPolicy,
  RetentionPolicy,
  StorageType,
  StoreCompression,
  jetstreamManager,
} from "@nats-io/jetstream"
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
import { Holder } from "../src/kernel/Wire.js"
import { OutcomeValue, WorkKey } from "../src/planes/Register.js"

/**
 * The register carrier's authority walls: which bucket, and whose facts.
 *
 * **Which bucket** is the incarnation pin (DEV-779), walled against the chaos
 * it exists for: the bucket is DELETED and RECREATED out of band while a holder
 * is still carrying a fence, and the holder then replays its fenced operation.
 * Bucket destroy+recreate is never an isolation primitive in this package
 * (DECISIONS T0, seam rule 7) — here it is the SUBJECT, performed deliberately
 * on a connection the register service does not own, which is exactly the
 * administrative lifecycle mutation the register's claims used to be bounded
 * away from. Row isolation is still one fresh server per test.
 *
 * **Whose facts** is the DEV-780 admin-surface completion riding this lane: the
 * register bucket's gate now reads the same nine admin fields the lane, cell,
 * and anchor carriers pin, through the shared laws in `internal/carriers.ts`.
 * The arm below plants the one that matters most at this carrier — a MIRRORED
 * backing stream — because a register is the authority carrier par excellence:
 * a mirror stores its origin's facts at its origin's sequence numbers and is
 * locally read-only, so a fence taken against one is a fence against a copy.
 */

const work = WorkKey.make("0123456789abcdef")

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

/** The mirror origin the planted arm imports from; its subjects touch no carrier. */
const MIRROR_ORIGIN = "FLB_TEST_REGISTER_MIRROR_ORIGIN"

const duplicateWindowNanos = 2 * 60 * 1_000_000_000

/**
 * The register bucket's backing stream exactly as `@nats-io/kv` 3.4.0 creates
 * it for the options this carrier passes, written out by hand rather than
 * imported: the wall states the shape it admits instead of asking the gate to
 * agree with itself. Mirrors `lawfulKvStream` in `CarrierAdminSurface.test.ts`
 * at this carrier's history.
 */
const lawfulRegisterStream = (): Record<string, unknown> => ({
  name: `KV_${REGISTER_BUCKET}`,
  subjects: [`$KV.${REGISTER_BUCKET}.>`],
  retention: RetentionPolicy.Limits,
  storage: StorageType.File,
  num_replicas: 1,
  max_msgs: -1,
  max_bytes: -1,
  max_age: 0,
  max_msgs_per_subject: REGISTER_HISTORY,
  discard: DiscardPolicy.New,
  duplicate_window: duplicateWindowNanos,
  deny_delete: false,
  deny_purge: false,
  allow_rollup_hdrs: true,
  allow_direct: true,
  mirror_direct: false,
  allow_atomic: false,
  allow_msg_counter: false,
  compression: StoreCompression.None,
  max_msg_size: -1,
  allow_msg_ttl: false,
})

describe("register incarnation pin", () => {
  test("a reborn bucket refuses the stale holder's commit, and the substrate would have accepted it", async () => {
    harness = await startNatsHarness()
    const url = harness.url

    // One scope, held open across the chaos: the service pins the incarnation
    // it opened and never re-opens, which is the state a live holder is in.
    const verdict = await Effect.runPromise(Effect.result(Effect.gen(function* () {
      const registers = yield* Registers
      const granted = yield* registers.grant(work, Holder.make("holder-a"))
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
      const replayed = yield* Effect.result(registers.commit(work, granted.token, OutcomeValue.make("zombie")))

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
      const granted = yield* registers.grant(work, Holder.make("holder-a"))
      const kvm = yield* Effect.promise(() => chaosHand(url))
      const reborn = yield* Effect.promise(() => rebornBucket(kvm))
      yield* Effect.promise(() => reborn.create(work, encode({ holder: "holder-b", outcome: null })))

      const refusalOf = <A>(action: Effect.Effect<A, Refusal>) =>
        Effect.map(Effect.result(action), (result) =>
          Result.isFailure(result) ? result.failure.kind : `ACCEPTED:${JSON.stringify(result)}`)

      return {
        grant: yield* refusalOf(registers.grant(work, Holder.make("holder-a"))),
        renew: yield* refusalOf(registers.renew(work, granted.token)),
        commit: yield* refusalOf(registers.commit(work, granted.token, OutcomeValue.make("zombie"))),
        expireSteal: yield* refusalOf(registers.expireSteal(work, Holder.make("holder-c"))),
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
      const granted = yield* registers.grant(work, Holder.make("holder-a"))
      const kvm = yield* Effect.promise(() => chaosHand(url))
      yield* Effect.promise(async () => {
        await (await kvm.open(REGISTER_BUCKET)).destroy()
      })
      return yield* Effect.flip(registers.commit(work, granted.token, OutcomeValue.make("zombie")))
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
      const granted = yield* registers.grant(work, Holder.make("holder-a"))
      const renewed = yield* registers.renew(work, granted.token)
      const stolen = yield* registers.expireSteal(work, Holder.make("holder-b"))
      const committed = yield* registers.commit(work, stolen.token, OutcomeValue.make("done"))
      const observed = yield* registers.observe(work)
      return { granted, renewed, stolen, committed, observed }
    }))

    expect(Result.isSuccess(result)).toBe(true)
    if (!Result.isSuccess(result)) return
    const { granted, renewed, stolen, committed, observed } = result.success
    expect(String(granted.holder)).toBe("holder-a")
    expect(renewed.token).toBeGreaterThan(granted.token)
    expect(String(stolen.holder)).toBe("holder-b")
    expect(committed.outcome).toEqual({ token: stolen.token, value: OutcomeValue.make("done") })
    expect(observed.outcome).toEqual({ token: stolen.token, value: OutcomeValue.make("done") })
  }, 120_000)
})

/**
 * The DEV-780 register-seam completion. That ticket widened the lane, cell, and
 * anchor gates to the nine admin-surface fields and left the register's gate
 * named as an owed follow-up (its stated residual (b)); this lane owns
 * `internal/registers.ts` tonight, so the widening lands here against the same
 * shared laws rather than a second minting of them.
 */
describe("register carrier admin surface", () => {
  /** Plants the register bucket's backing stream by hand on a fresh server. */
  const plant = async (url: string, config: Record<string, unknown>): Promise<void> => {
    const connection = await connect({ servers: url })
    try {
      const manager = await jetstreamManager(connection)
      await manager.streams.add({
        name: MIRROR_ORIGIN,
        subjects: ["flb.test.register.mirror.origin.>"],
        storage: StorageType.File,
        num_replicas: 1,
      } as never)
      await manager.streams.add(config as never)
    } finally {
      await connection.close()
    }
  }

  const openRegisters = (url: string): Effect.Effect<unknown, Refusal> =>
    Registers.pipe(Effect.provide(Registers.layer({ servers: url })), Effect.scoped)

  test("the hand-built lawful backing stream is admitted", async () => {
    harness = await startNatsHarness()
    await plant(harness.url, lawfulRegisterStream())
    // No flip: the carrier must OPEN on the planted shape. This is what makes
    // the mirrored arm below attributable to the one field it moved.
    await Effect.runPromise(openRegisters(harness.url))
  }, 120_000)

  test("a mirrored backing stream refuses by the named mirror law, not by shape", async () => {
    harness = await startNatsHarness()
    const { subjects: _subjects, ...rest } = lawfulRegisterStream()
    await plant(harness.url, { ...rest, mirror: { name: MIRROR_ORIGIN } })

    const refusal = await Effect.runPromise(Effect.flip(openRegisters(harness.url)))
    expect(refusal.sort).toBe("structural")
    // A mirror carries no subjects, so a shape gate refuses one INCIDENTALLY and
    // teaches "restore the bucket shape" — the wrong repair for an operator
    // whose actual repair is a replica read-plane carrier (ADR-0009).
    expect(refusal.kind).toBe("mirrored-authority-carrier")
    expect(refusal.kind).not.toBe("register-substrate-shape")
    expect(refusal.path).toEqual(["bucket", "stream", "config", "mirror"])
    expect(refusal.next.length).toBeGreaterThan(0)
  }, 120_000)
})
