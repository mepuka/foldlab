import { describe, expect, test } from "bun:test"

import { Effect, Layer, Result, Stream } from "effect"

import {
  admit as daemonAdmit,
  casDaemonOver,
  type CasDaemon,
  type CasStore,
} from "../src/carriage/CasDaemon.js"
import {
  FabricClient,
  type FabricTransport,
  type PublishedEnvelope,
} from "../src/carriage/FabricClient.js"
import {
  Admission,
  admit as admissionAdmit,
  type KernelSentence,
} from "../src/kernel/Admission.js"
import {
  admissionContextOver,
  declarationPublication,
  envelopePublication,
} from "../src/kernel/Candidates.js"
import type { KernelProgramDeclaration } from "../src/kernel/KernelCorpusSchemas.js"
import { KERNEL_REFUSAL_BY_REASON } from "../src/kernel/KernelTables.generated.js"
import { evidenceSubject } from "../src/kernel/Subjects.js"
import { decodeEnvelope, type DecodedEnvelope } from "../src/kernel/Wire.js"
import type { Refusal } from "../src/truth/Refusal.js"
import {
  admit as cliAdmit,
  admitChaosRun,
  chaosContext,
  type CliOptions,
} from "../src/surface/cli.js"
import {
  PLANTED_CANDIDATES,
  PLANTED_CONTEXT,
  refuseEverythingDoor,
} from "./KernelDoor.reference.js"

const utf8 = new TextEncoder()
const LANE = "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862"
const OTHER_LANE = "f".repeat(63) + "e"
const WRIT = "a".repeat(63) + "1"
const ALGEBRA = "b".repeat(63) + "2"
const FOLD = "c".repeat(63) + "3"
const REGISTER = "d".repeat(63) + "4"
const OUTCOME = "e".repeat(63) + "5"

const transport: FabricTransport = {
  publish: () => Effect.die("unused transport fixture"),
  subscribe: () => Effect.die("unused transport fixture"),
}

const fabricRoute = (): Promise<typeof admissionAdmit> => {
  const poisonedFixture = {
    ...transport,
    // This is deliberately an extra property. The door is installed above a
    // transport, so a fixture that spells `admit` supplies nothing.
    admit: () => Effect.die("private fixture door escaped"),
  }
  return Effect.runPromise(
    Effect.gen(function* () {
      const fabric = yield* FabricClient
      return fabric.admit
    }).pipe(
      Effect.provide(Layer.provide(
        FabricClient.testLayer(poisonedFixture),
        Admission.layer(PLANTED_CONTEXT),
      )),
    ),
  )
}

describe("the one admission seam", () => {
  test("every host exposes the same service accessor and fixtures cannot replace it", async () => {
    const routes = [
      FabricClient.admit,
      await fabricRoute(),
      daemonAdmit,
      cliAdmit,
    ] as const

    expect(routes.every((route) => route === admissionAdmit)).toBe(true)
  })

  test("a planted door replacement reaches every host, so none bypasses Admission", async () => {
    const candidate = PLANTED_CANDIDATES.lawfulDeclare!
    const routes = [
      FabricClient.admit,
      await fabricRoute(),
      daemonAdmit,
      cliAdmit,
    ] as const
    const layer = Admission.fromDoor(refuseEverythingDoor)

    const refusals = await Promise.all(routes.map((route) =>
      Effect.runPromise(route(candidate).pipe(Effect.provide(layer), Effect.flip))
    ))

    expect(refusals.every((refusal: Refusal) => refusal.kind === "kernel-admission")).toBe(true)
    expect(refusals.every((refusal: Refusal) => refusal.next[0]?.subject === "clock-read"))
      .toBe(true)
  })

  test("reason, law, repair, and applicability stay identical through every host", async () => {
    const candidate = PLANTED_CANDIDATES.clockFold!
    const routes = [
      admissionAdmit,
      FabricClient.admit,
      await fabricRoute(),
      daemonAdmit,
      cliAdmit,
    ] as const
    const layer = Admission.layer(PLANTED_CONTEXT)

    const refusals = await Promise.all(routes.map((route) =>
      Effect.runPromise(route(candidate).pipe(Effect.provide(layer), Effect.flip))
    ))
    const expected = refusals[0]!
    for (const refusal of refusals.slice(1)) expect(refusal).toEqual(expected)

    const taught = KERNEL_REFUSAL_BY_REASON["clock-read"]
    expect(expected).toMatchObject({
      kind: "kernel-admission",
      law: taught.law,
      next: [{
        subject: taught.reason,
        note: taught.repair,
        body: { applicability: taught.applicability },
      }],
    })
  })
})

/**
 * The no-bypass control, at the operations that actually do something.
 *
 * Route identity is necessary and not sufficient: a host can carry the exact
 * `admit` function object and still publish, store, or read without ever
 * calling it. Each arm below drives a REAL operation, counts what reached the
 * byte-moving half, and requires the count to be zero on a refusal.
 */
describe("real host operations route through the door", () => {
  const envelopeFor = (lane: string): Promise<DecodedEnvelope> =>
    Effect.runPromise(decodeEnvelope(utf8.encode(
      `{"v":0,"kind":"emit","lane":"${lane}","key":"k","holder":"h","body":1,"pins":[]}`,
    )))

  const spyTransport = (): {
    readonly transport: FabricTransport
    readonly calls: () => number
  } => {
    let calls = 0
    return {
      calls: () => calls,
      transport: {
        publish: (_subject, encoded): Effect.Effect<PublishedEnvelope, Refusal> => {
          calls += 1
          return Effect.succeed({ digest: encoded.digest, sequence: 1, duplicate: false })
        },
        subscribe: () => Effect.succeed(Stream.empty),
      },
    }
  }

  const publishThrough = async (
    lane: string,
    admission: ReturnType<typeof Admission.layer>,
  ): Promise<{ readonly result: PublishedEnvelope | Refusal; readonly calls: number }> => {
    const spy = spyTransport()
    const subject = await Effect.runPromise(evidenceSubject("routes", 0))
    const decoded = await envelopeFor(lane)
    const outcome = await Effect.runPromise(Effect.gen(function* () {
      const client = yield* FabricClient
      return yield* client.publish(subject, decoded.envelope)
    }).pipe(
      Effect.provide(Layer.provide(FabricClient.testLayer(spy.transport), admission)),
      Effect.result,
    ))
    return {
      result: Result.isSuccess(outcome) ? outcome.success : outcome.failure,
      calls: spy.calls(),
    }
  }

  test("FabricClient.publish reaches JetStream only for an admitted emission", async () => {
    const authorized = Admission.layer(
      admissionContextOver([{ kind: "lane", digest: LANE }]),
    )

    const admitted = await publishThrough(LANE, authorized)
    expect(admitted.calls).toBe(1)
    expect(admitted.result).toMatchObject({ sequence: 1 })

    const undeclared = await publishThrough(OTHER_LANE, authorized)
    expect(undeclared.calls).toBe(0)
    expect(undeclared.result).toMatchObject({
      kind: "kernel-admission",
      law: KERNEL_REFUSAL_BY_REASON["forward-reference"].law,
      next: [{ subject: "forward-reference" }],
    })
  })

  test("a refuse-everything door stops the publish path an identity check cannot", async () => {
    const spy = spyTransport()
    const subject = await Effect.runPromise(evidenceSubject("routes", 0))
    const decoded = await envelopeFor(LANE)

    const refusal = await Effect.runPromise(Effect.gen(function* () {
      const client = yield* FabricClient
      return yield* client.publish(subject, decoded.envelope)
    }).pipe(
      Effect.provide(Layer.provide(
        FabricClient.testLayer(spy.transport),
        Admission.fromDoor(refuseEverythingDoor),
      )),
      Effect.flip,
    ))

    expect(spy.calls()).toBe(0)
    expect(refusal.next[0]?.subject).toBe("clock-read")

    // Refusal parity: what the host returned is what the seam returns for the
    // very same candidate, field for field.
    const direct = await Effect.runPromise(
      admissionAdmit(envelopePublication(decoded.envelope, decoded.digest)).pipe(
        Effect.provide(Admission.fromDoor(refuseEverythingDoor)),
        Effect.flip,
      ),
    )
    expect(refusal).toEqual(direct)
  })

  const DECLARATION: KernelProgramDeclaration = {
    edges: [],
    holes: [],
    lineage: [],
    nodes: [],
  }

  const spyStore = (): { readonly store: CasStore; readonly calls: () => number } => {
    let calls = 0
    const count = <A>(value: A): Effect.Effect<A, Refusal> =>
      Effect.sync(() => {
        calls += 1
        return value
      })
    return {
      calls: () => calls,
      store: {
        publish: () => count("00"),
        resolve: () => count(DECLARATION),
        readAt: () => count("00"),
        land: () => count(undefined),
      },
    }
  }

  const daemonUnder = <A>(
    admission: ReturnType<typeof Admission.layer>,
    use: (daemon: CasDaemon) => Effect.Effect<A, Refusal>,
  ): Promise<{ readonly result: A | Refusal; readonly calls: number }> =>
    Effect.runPromise(Effect.gen(function* () {
      const spy = spyStore()
      const daemon = yield* casDaemonOver(spy.store)
      const outcome = yield* Effect.result(use(daemon))
      return {
        result: Result.isSuccess(outcome) ? outcome.success : outcome.failure,
        calls: spy.calls(),
      }
    }).pipe(Effect.provide(admission)))

  test("CasDaemon operations reach the store only for admitted acts", async () => {
    const authorized = Admission.layer(admissionContextOver([
      { kind: "policy", digest: WRIT },
      { kind: "program", digest: REGISTER },
    ]))
    const writ = BigInt(`0x${WRIT}`)

    const published = await daemonUnder(authorized, (daemon) =>
      daemon.publish(DECLARATION, writ))
    expect(published.calls).toBe(1)

    // The same declaration under a writ nothing admitted: the store is never
    // asked, and the reason is the kernel's, not the daemon's.
    const unwritten = await daemonUnder(authorized, (daemon) =>
      daemon.publish(DECLARATION, BigInt(`0x${ALGEBRA}`)))
    expect(unwritten.calls).toBe(0)
    expect(unwritten.result).toMatchObject({ next: [{ subject: "forward-reference" }] })

    // An unfenced landing is spellable and refused; the outcome never lands.
    const unfenced = await daemonUnder(authorized, (daemon) =>
      daemon.land({ register: REGISTER, outcome: OUTCOME }))
    expect(unfenced.calls).toBe(0)
    expect(unfenced.result).toMatchObject({ next: [{ subject: "unfenced-decide" }] })

    const fenced = await daemonUnder(authorized, (daemon) =>
      daemon.land({
        register: REGISTER,
        outcome: OUTCOME,
        token: { register: BigInt(`0x${REGISTER}`), value: 7n },
      }))
    expect(fenced.calls).toBe(1)
  })

  test("a refuse-everything door stops every daemon operation before the store", async () => {
    const mutant = Admission.fromDoor(refuseEverythingDoor)
    const arms: ReadonlyArray<(daemon: CasDaemon) => Effect.Effect<unknown, Refusal>> = [
      (daemon) => daemon.publish(DECLARATION, BigInt(`0x${WRIT}`)),
      (daemon) => daemon.resolve(REGISTER),
      (daemon) =>
        daemon.readAt({ foldId: 2n, lane: 1n, shard: 0n, floor: 4n, state: 11n, head: 6n }),
      (daemon) => daemon.land({ register: REGISTER, outcome: OUTCOME }),
    ]

    for (const arm of arms) {
      const run = await daemonUnder(mutant, arm)
      expect(run.calls).toBe(0)
      expect(run.result).toMatchObject({ next: [{ subject: "clock-read" }] })
    }

    const direct = await Effect.runPromise(
      admissionAdmit(declarationPublication("program", [], "00".repeat(32), BigInt(`0x${WRIT}`)))
        .pipe(Effect.provide(mutant), Effect.flip),
    )
    expect(direct.kind).toBe("kernel-admission")
  })

  const options = (over: Partial<CliOptions>): CliOptions => ({
    pinHead: false,
    axes: ["kill"],
    seed: 7,
    repeat: 1,
    output: "json",
    ...over,
  })

  const REFS = { fold: FOLD, lane: LANE, algebra: ALGEBRA }

  // No default for `refs`: a default parameter fires on an explicit
  // `undefined`, and "no module was loaded" is exactly the case these arms
  // have to be able to state.
  const judgeChaos = (
    over: Partial<CliOptions>,
    refs: typeof REFS | undefined,
    door?: ReturnType<typeof Admission.fromDoor>,
  ): Promise<KernelSentence | Refusal> =>
    Effect.runPromise(admitChaosRun(options(over), refs).pipe(
      Effect.provide(door ?? Admission.layer(chaosContext(refs))),
      Effect.result,
      Effect.map((outcome) =>
        Result.isSuccess(outcome) ? outcome.success : outcome.failure
      ),
    ))

  test("the CLI's execution path asks the door, and the door answers in kernel words", async () => {
    // The unpinned run `execute` would have made: no anchor, so no lawful
    // spelling, so the kernel's own reason rather than a CLI law string.
    const unpinned = await judgeChaos({ modulePath: "./fixture.ts" }, REFS)
    expect(unpinned).toMatchObject({
      kind: "kernel-admission",
      law: KERNEL_REFUSAL_BY_REASON["ambient-query-input"].law,
      next: [{
        subject: "ambient-query-input",
        note: KERNEL_REFUSAL_BY_REASON["ambient-query-input"].repair,
      }],
    })

    // A lane the fold's declaration never committed.
    const foreignLane = await judgeChaos({ head: 20, lane: OTHER_LANE }, REFS)
    expect(foreignLane).toMatchObject({ next: [{ subject: "forward-reference" }] })

    // A fold selector with no module behind it: an empty catalog, and the
    // door refuses the reference rather than the CLI pre-empting it.
    const uncataloged = await judgeChaos(
      { head: 1, foldDigest: "f".repeat(64) },
      undefined,
    )
    expect(uncataloged).toMatchObject({ next: [{ subject: "forward-reference" }] })

    // The pinned run over the module's own declarations is admitted.
    const pinned = await judgeChaos({ head: 20 }, REFS)
    expect(pinned).toMatchObject({ act: { _tag: "fold" } })
  })

  test("a refuse-everything door reaches the CLI's own execution judgment", async () => {
    const mutant = Admission.fromDoor(refuseEverythingDoor)
    const refused = await judgeChaos({ head: 20 }, REFS, mutant)
    expect(refused).toMatchObject({
      kind: "kernel-admission",
      next: [{ subject: "clock-read" }],
    })
  })
})
