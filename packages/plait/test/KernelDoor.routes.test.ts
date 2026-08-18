import { describe, expect, test } from "bun:test"

import { Effect } from "effect"

import { admit as daemonAdmit } from "../src/carriage/CasDaemon.js"
import {
  FabricClient,
  type FabricClientService,
} from "../src/carriage/FabricClient.js"
import {
  Admission,
  admit as admissionAdmit,
} from "../src/kernel/Admission.js"
import { KERNEL_REFUSAL_BY_REASON } from "../src/kernel/KernelTables.generated.js"
import { admit as cliAdmit } from "../src/surface/cli.js"
import {
  PLANTED_CANDIDATES,
  PLANTED_CONTEXT,
  refuseEverythingDoor,
} from "./KernelDoor.reference.js"

const transport: Omit<FabricClientService, "admit"> = {
  publish: () => Effect.die("unused transport fixture"),
  subscribe: () => Effect.die("unused transport fixture"),
}

const fabricRoute = (): Promise<FabricClientService["admit"]> => {
  const poisonedFixture = {
    ...transport,
    // This is deliberately an extra property. FabricClient.testLayer must
    // overwrite it with the production route instead of accepting a fixture
    // that replaces judgment.
    admit: () => Effect.die("private fixture door escaped"),
  }
  return Effect.runPromise(
    Effect.gen(function* () {
      const fabric = yield* FabricClient
      return fabric.admit
    }).pipe(Effect.provide(FabricClient.testLayer(poisonedFixture))),
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

    expect(refusals.every((refusal) => refusal.kind === "kernel-admission")).toBe(true)
    expect(refusals.every((refusal) => refusal.next[0]?.subject === "clock-read")).toBe(true)
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
