/**
 * The no-bypass wall: candidate judgment is one function object, and every
 * host is that object rather than a wrapper around it.
 *
 * Identity is the strongest statement available here and the cheapest to
 * check — a host that grew a private validator would stop being `===` the
 * door. The fixture row is the one place a bypass could still enter, because
 * `FabricClient.testLayer` accepts a caller-supplied service: it must refuse
 * an `admit` the fixture carries rather than hand it to the program.
 */
import { describe, expect, test } from "bun:test"

import { Effect, Stream } from "effect"

import { FabricClient, type FabricClientService } from "../src/carriage/FabricClient.js"
import * as CasDaemon from "../src/carriage/CasDaemon.js"
import { admit, type KernelAdmit } from "../src/kernel/KernelDoor.js"
import { KERNEL_REFUSAL_BY_REASON } from "../src/kernel/KernelTables.generated.js"
import { admit as cliAdmit } from "../src/surface/cli.js"
import * as Public from "../src/index.js"
import { PLANTED_CANDIDATES, PLANTED_CONTEXT } from "./KernelDoor.fixtures.js"

const hostRoutes = [FabricClient.admit, CasDaemon.admit, cliAdmit] as const

const transport: Omit<FabricClientService, "admit"> = {
  publish: () => Effect.die("unused transport fixture"),
  subscribe: () => Effect.succeed(Stream.empty),
}

describe("the one admission seam", () => {
  test("every implemented host route is the KernelDoor function itself", () => {
    expect(hostRoutes.every((route) => route === admit)).toBe(true)
    expect(Public.KernelDoor.admit).toBe(admit)
  })

  test("the identity control catches a private judgment route", () => {
    const bypass: KernelAdmit = () => ({
      verdict: "refused",
      reason: "clock-read",
      law: "invented",
      repair: "invented",
      applicability: "advisory",
    })
    expect(hostRoutes.every((route) => route === admit)).toBe(true)
    expect([...hostRoutes, bypass].every((route) => route === admit)).toBe(false)
  })

  test("a poisoned transport fixture cannot replace judgment", async () => {
    const poisoned = {
      ...transport,
      // Deliberately an extra property: `testLayer` takes the transport half
      // of the service, so a fixture that also spells `admit` must have it
      // overwritten by the production route rather than accepted.
      admit: (() => ({
        verdict: "refused",
        ...KERNEL_REFUSAL_BY_REASON["clock-read"],
      })) as KernelAdmit,
    }

    const route = await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* FabricClient
        return client.admit
      }).pipe(Effect.provide(FabricClient.testLayer(poisoned))),
    )

    expect(route).toBe(admit)
    expect(route).not.toBe(poisoned.admit)
  })

  test("every host carries the same reason, law, repair, and applicability", () => {
    const candidate = PLANTED_CANDIDATES.clockFold!
    const expected = {
      verdict: "refused",
      ...KERNEL_REFUSAL_BY_REASON["clock-read"],
    } as const
    for (const route of hostRoutes) {
      expect(route(PLANTED_CONTEXT, candidate)).toEqual(expected)
    }
  })
})
