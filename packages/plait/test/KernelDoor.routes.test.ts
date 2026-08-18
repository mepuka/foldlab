import { describe, expect, test } from "bun:test"

import { FabricClient } from "../src/carriage/FabricClient.js"
import * as CasDaemon from "../src/carriage/CasDaemon.js"
import { admit, type KernelAdmit } from "../src/kernel/KernelDoor.js"
import { KERNEL_REFUSAL_BY_REASON } from "../src/kernel/KernelTables.generated.js"
import { admit as cliAdmit } from "../src/surface/cli.js"
import * as Public from "../src/index.js"
import { PLANTED_CANDIDATES, PLANTED_CONTEXT } from "./KernelDoor.fixtures.js"

const hostRoutes = [FabricClient.admit, CasDaemon.admit, cliAdmit] as const

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
