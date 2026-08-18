import { JetStreamApiError, JetStreamError } from "@nats-io/jetstream"
import { errors } from "@nats-io/nats-core"
import { describe, expect, test } from "bun:test"
import { Cause, Effect, Exit } from "effect"

import {
  absenceRefusal,
  isRetryable,
  retryAbsence,
  structuralRefusal,
  type Refusal,
} from "../src/Refusal.js"
import { transportRefusal as registersRefusal } from "../src/internal/registers.js"
import {
  isCasRefusal,
  isTransportCause,
  KvFailure,
  type TransportTerms,
} from "../src/internal/transport.js"

/**
 * The B-7 disposition made executable: *defects never wear the absence sort*
 * (ruled 2026-08-18 — "defects are defects and are not part of the estate
 * domain language").
 *
 * `TransportSpine.test.ts` pins WHAT each adapter mints. This file pins WHEN it
 * mints at all: a cause the pinned client raised becomes that adapter's absence
 * exactly as before, and any other cause dies as a defect instead of entering
 * the one retryable sort.
 *
 * The oracle is outside the spine twice over. The vocabulary is read from the
 * client's own registries — `@nats-io/nats-core`'s `errors` map and the two
 * `@nats-io/jetstream` roots — so the wall never asks the seam to confirm its
 * own list. The harm is measured on `Refusal.retryAbsence`, the shipped retry
 * policy, not on a predicate: the finding was "a defect dressed as absence
 * invites a retry loop on a bug," and a retry count is what refutes it.
 *
 * Its negative control is the pre-disposition mint — one that classifies every
 * cause as an absence — run through the same checkers.
 */

/** The refusal the CAS arm mints, so a CAS cause is visibly not a transport one. */
const casRefusal = structuralRefusal({
  kind: "lost-anchor-cas",
  law: "A lost anchor revision CAS is a fatal detach.",
  path: ["token"],
  got: "stale",
  expected: "the current revision",
  next: [{ subject: "Folds.deploy", note: "Detach and redeploy." }],
})

/**
 * The three shapes a shipped adapter classifies a cause at, each reproduced
 * from the site it is transcribed from. Which seam the throw happens at is the
 * whole question — `Effect` dies on a throw in all three, and a fixture that
 * flattened them would only ever measure one.
 */
const seams = {
  /** `catch:` mapper — 21 sites, transcribed from internal/registers.ts:170-173. */
  tryPromiseCatch: (mint: typeof registersRefusal, operation: string, cause: unknown) =>
    Effect.tryPromise({
      try: (): Promise<never> => Promise.reject(cause),
      catch: (raised) => mint(operation, raised),
    }),
  /**
   * `Effect.catch` handler over the `KvFailure` carrier — 6 sites, transcribed
   * from internal/anchors.ts:233-238. The `isCasRefusal` branch is part of the
   * transcription, not decoration: it is the reconcile-before-classify order
   * this ticket leaves untouched, and it runs ahead of the mint here as there.
   */
  effectCatchHandler: (mint: typeof registersRefusal, operation: string, cause: unknown) =>
    Effect.fail(new KvFailure(cause)).pipe(Effect.catch(({ cause: raised }) =>
      isCasRefusal(raised)
        ? Effect.fail(casRefusal)
        : Effect.fail(mint(operation, raised)))),
  /**
   * `Effect.gen` body — 4 sites, transcribed from internal/cells.ts:279-284,
   * where a read-back precedes the mint and the CAS code is consulted first.
   */
  genBody: (mint: typeof registersRefusal, operation: string, cause: unknown) =>
    Effect.gen(function* () {
      yield* Effect.void
      if (isCasRefusal(cause)) return yield* casRefusal
      return yield* mint(operation, cause)
    }),
} as const

const seamNames = Object.keys(seams) as ReadonlyArray<keyof typeof seams>

type Verdict =
  | { readonly _tag: "absence"; readonly refusal: Refusal }
  | { readonly _tag: "defect"; readonly defect: unknown }
  | { readonly _tag: "succeeded" }

/** Runs one seam and reports which channel the cause came out on. */
const classify = async (
  seam: keyof typeof seams,
  mint: typeof registersRefusal,
  operation: string,
  cause: unknown,
): Promise<Verdict> => {
  const exit = await Effect.runPromiseExit(
    seams[seam](mint, operation, cause) as Effect.Effect<unknown, Refusal>,
  )
  if (Exit.isSuccess(exit)) return { _tag: "succeeded" }
  const die = exit.cause.reasons.find(Cause.isDieReason)
  if (die !== undefined) return { _tag: "defect", defect: die.defect }
  const fail = exit.cause.reasons.find(Cause.isFailReason)
  return { _tag: "absence", refusal: fail!.error }
}

/**
 * Instances by prototype, not by constructor: the seam's question is
 * `instanceof`, the thirteen core classes take thirteen different constructor
 * signatures, and a hand-written argument list per class would be a
 * transcription of the pin rather than a reading of it.
 */
const instanceOf = (klass: unknown): Error =>
  Object.create((klass as { prototype: object }).prototype) as Error

/** Every error class the pinned client publishes, named by its own registry. */
const clientCauses: ReadonlyArray<readonly [string, unknown]> = [
  ...Object.entries(errors).map(([name, klass]) => [name, instanceOf(klass)] as const),
  ["JetStreamApiError", instanceOf(JetStreamApiError)] as const,
  ["JetStreamError", instanceOf(JetStreamError)] as const,
]

/**
 * What must die. The first row is the disposition's named control; the rest are
 * the ways a defect reaches this seam in practice — a mis-shaped call inside
 * the client, a rejection that is not an error at all, and the near-miss that
 * proves the Node system-error admission is a shape and not a loophole
 * (`code` without `syscall` is `ERR_*`, a programming error).
 */
const defectCauses: ReadonlyArray<readonly [string, unknown]> = [
  ["TypeError", new TypeError("cannot read properties of undefined")],
  ["RangeError", new RangeError("invalid array length")],
  ["plain Error", new Error("boom")],
  ["string rejection", "not an error"],
  ["null rejection", null],
  ["undefined rejection", undefined],
  ["plain object", { message: "shaped like an error" }],
  ["node ERR_ code without syscall", Object.assign(new TypeError("bad arg"), {
    code: "ERR_INVALID_ARG_TYPE",
  })],
]

/**
 * The unresolvable-host cause, reproduced field-for-field from the DEV-735
 * probe against `@nats-io/transport-node@3.4.0`: only `ECONNREFUSED` is wrapped
 * as `ConnectionError`, so this one reaches the seam unwrapped and is transport
 * evidence all the same.
 */
const nodeSystemError = Object.assign(new Error("getaddrinfo ENOTFOUND"), {
  code: "ENOTFOUND",
  syscall: "getaddrinfo",
  errno: -3008,
})

describe("a cause the pinned client raised keeps its absence", () => {
  for (const [name, cause] of [...clientCauses, ["node system error", nodeSystemError] as const]) {
    test(`${name} is transport evidence`, () => {
      expect(isTransportCause(cause)).toBe(true)
    })
  }

  test("the vocabulary covers the client's whole published registry", () => {
    // 13 core classes + the 2 JetStream roots. The count is pinned so a pin
    // move that adds a class reds here instead of silently widening.
    expect(clientCauses.length).toBe(15)
    expect(clientCauses.every(([, cause]) => isTransportCause(cause))).toBe(true)
  })

  for (const seam of seamNames) {
    test(`${seam} still mints the adapter's own absence`, async () => {
      const verdict = await classify(seam, registersRefusal, "register.read", nodeSystemError)
      expect(verdict._tag).toBe("absence")
      if (verdict._tag !== "absence") return
      expect(verdict.refusal.sort).toBe("absence")
      expect(verdict.refusal.kind).toBe("register-transport-unavailable")
      expect(verdict.refusal.path).toEqual(["register.read"])
      // The cause survives verbatim: the narrowing decides the sort, never the
      // evidence (DECISIONS T0's preserved half).
      expect(verdict.refusal.got).toBe(String(nodeSystemError))
      expect(isRetryable(verdict.refusal)).toBe(true)
    })
  }
})

describe("the CAS classification path is untouched", () => {
  /**
   * Duplicate create and stale update at the pin: `JetStreamApiError` status
   * 400, code 10071, distinguished only by the operation that observed them
   * (DEV-704 seam rule 2, DECISIONS T13).
   */
  const wrongLastSequence = new JetStreamApiError({
    code: 400,
    err_code: 10071,
    description: "wrong last sequence: 3",
  })

  test("a wrong-last-sequence cause is still transport-class evidence", () => {
    // The narrowing never reclassifies it: it is a client error class, so it
    // reaches the CAS branch on the same channel it always did.
    expect(isTransportCause(wrongLastSequence)).toBe(true)
    expect(isCasRefusal(wrongLastSequence)).toBe(true)
  })

  for (const seam of ["effectCatchHandler", "genBody"] as const) {
    test(`${seam} takes the CAS arm before the mint`, async () => {
      const verdict = await classify(seam, registersRefusal, "register.commit", wrongLastSequence)
      expect(verdict._tag).toBe("absence")
      if (verdict._tag !== "absence") return
      expect(verdict.refusal.kind).toBe("lost-anchor-cas")
      expect(verdict.refusal.sort).toBe("structural")
    })
  }
})

describe("negative control — a defect dies as a defect", () => {
  for (const seam of seamNames) {
    for (const [name, cause] of defectCauses) {
      test(`${seam} dies on ${name}`, async () => {
        const verdict = await classify(seam, registersRefusal, "register.read", cause)
        expect(verdict._tag).toBe("defect")
        if (verdict._tag !== "defect") return
        // Rethrown unchanged: a defect carries no refusal vocabulary at all.
        expect(verdict.defect).toBe(cause as never)
      })
    }
  }

  test("every defect cause is refused by the predicate too", () => {
    expect(defectCauses.filter(([, cause]) => isTransportCause(cause))).toEqual([])
  })
})

describe("the harm the finding named — retrying a bug", () => {
  /** One adapter-shaped operation that counts how often it is attempted. */
  const counting = (cause: unknown) => {
    let attempts = 0
    const operation = Effect.suspend(() => {
      attempts++
      return Effect.tryPromise({
        try: (): Promise<never> => Promise.reject(cause),
        catch: (raised) => registersRefusal("register.read", raised),
      })
    })
    return { attempts: () => attempts, operation }
  }

  test("a planted TypeError is attempted once, not four times", async () => {
    const planted = new TypeError("cannot read properties of undefined")
    const { attempts, operation } = counting(planted)
    const exit = await Effect.runPromiseExit(retryAbsence(operation, 3))
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true)
    expect(attempts()).toBe(1)
  })

  test("a transport cause is still retried to exhaustion", async () => {
    const { attempts, operation } = counting(new errors.ConnectionError("connection refused"))
    const exit = await Effect.runPromiseExit(retryAbsence(operation, 3))
    expect(Exit.isFailure(exit) && Cause.hasFails(exit.cause)).toBe(true)
    expect(attempts()).toBe(4)
  })
})

describe("negative control on the control — the pre-disposition mint", () => {
  /**
   * What shipped before this ticket, transcribed from `transportRefusalFor` at
   * `954f2b1` — the merge commit before this narrowing existed — and carrying
   * the register adapter's own terms (`internal/registers.ts:63-68`) so that
   * classification is the ONLY difference between it and the shipped mint.
   * Every checker above must refute it, or none of them measures anything.
   */
  const preDispositionTerms: TransportTerms = {
    kind: "register-transport-unavailable",
    law: "Transport absence may be retried; fencing-law refusals may not.",
    expected: "the pinned local NATS KV operation to be available",
    next: () => [{
      subject: "register.observe",
      note: "Reconnect to the pinned server and observe the register: a transport refusal leaves this operation's outcome unknown, so read the landed holder, token, and outcome back before retrying it.",
    }],
  }
  const unnarrowed: typeof registersRefusal = (operation, cause) =>
    absenceRefusal({
      kind: preDispositionTerms.kind,
      law: preDispositionTerms.law,
      path: [operation],
      got: String(cause),
      expected: preDispositionTerms.expected,
      next: preDispositionTerms.next(operation),
    })

  test("it dresses every defect as a retryable absence", async () => {
    for (const seam of seamNames) {
      for (const [, cause] of defectCauses) {
        const verdict = await classify(seam, unnarrowed, "register.read", cause)
        expect(verdict._tag).toBe("absence")
        if (verdict._tag !== "absence") return
        expect(isRetryable(verdict.refusal)).toBe(true)
      }
    }
  })

  test("and it retries a planted TypeError four times", async () => {
    let attempts = 0
    const operation = Effect.suspend(() => {
      attempts++
      return Effect.tryPromise({
        try: (): Promise<never> => Promise.reject(new TypeError("planted")),
        catch: (raised) => unnarrowed("register.read", raised),
      })
    })
    await Effect.runPromiseExit(retryAbsence(operation, 3))
    expect(attempts).toBe(4)
  })

  test("the shipped mint and the control are indistinguishable on a transport cause", async () => {
    const cause = new errors.TimeoutError()
    const shipped = await classify("tryPromiseCatch", registersRefusal, "register.read", cause)
    const control = await classify("tryPromiseCatch", unnarrowed, "register.read", cause)
    expect(shipped._tag).toBe("absence")
    expect(control._tag).toBe("absence")
    if (shipped._tag !== "absence" || control._tag !== "absence") return
    // Behaviour-preserving where it must be: on a cause the client raised, this
    // ticket changed nothing a caller can observe.
    expect({ ...shipped.refusal }).toEqual({ ...control.refusal })
  })
})
