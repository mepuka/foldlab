import { describe, expect, test } from "bun:test"

import { Effect } from "effect"

import {
  CLOSED_CHANNEL_INVENTORY,
  CLOSED_CHANNEL_LAW,
  CLOSED_CHANNELS,
  closedChannelInventoryDigest,
  declaredServerOptions,
  enabledClosedChannels,
  optionAt,
  SERVER_OPTION_PIN,
  SERVER_OPTION_TABLE,
  SERVER_OPTIONS,
  serverOptionTableDigest,
  type ClosedChannelRow,
  type DeclaredServerOptionsInput,
} from "../src/internal/serveroptions.js"

/**
 * The estate's own declared server-options value at the posture these tests
 * read: every closed-inventory row at its closed setting.
 *
 * The values here are transcription and not ruling. Nothing in this file moves
 * a priced row; what it holds is that the table, the inventory and the value
 * agree with one another.
 */
const estate: DeclaredServerOptionsInput = {
  serverName: "foldlab-substrate",
  storeDir: "/var/lib/foldlab/substrate",
  host: "127.0.0.1",
  port: 4222,
  jetStream: true,
  listen: true,
  noLog: false,
  signals: false,
  syncInterval: "2m0s",
  syncAlways: false,
  httpPort: 0,
  httpsPort: 0,
  profPort: 0,
  websocketPort: 0,
  mqttPort: 0,
  clusterPort: 0,
  gatewayPort: 0,
  leafNodePort: 0,
  leafNodeRemotes: [],
}

/** Declares one value with exactly one inventory row open. */
const enabling = (row: string): DeclaredServerOptionsInput => {
  switch (row) {
    case "websocket":
      return { ...estate, websocketPort: 18080 }
    case "mqtt":
      return { ...estate, mqttPort: 11883 }
    case "cluster":
      return { ...estate, clusterPort: 16222 }
    case "gateway":
      return { ...estate, gatewayPort: 17222 }
    case "leafnode-listener":
      return { ...estate, leafNodePort: 17422 }
    case "leafnode-remotes":
      return { ...estate, leafNodeRemotes: ["nats-leaf://127.0.0.1:17422"] }
    case "https-monitoring":
      return { ...estate, httpsPort: 18222 }
    case "profiling":
      return { ...estate, profPort: 16060 }
    default:
      throw new Error(`no probe knows how to enable the inventory row ${row}`)
  }
}

describe("the transcribed server-option table", () => {
  test("names one pinned vendor and carries a declaration and a site per row", () => {
    expect(SERVER_OPTION_PIN.module).toBe("github.com/nats-io/nats-server/v2")
    expect(SERVER_OPTIONS.length).toBeGreaterThan(0)
    for (const row of SERVER_OPTIONS) {
      expect(row.declaration.startsWith("server.Options.")).toBe(true)
      expect(row.site).toMatch(/^server\/[a-z_]+\.go:\d+$/)
    }
  })

  test("names every row once", () => {
    const names = SERVER_OPTIONS.map((row) => row.name)
    expect(new Set(names).size).toBe(names.length)
  })

  test("the declared value carries exactly the table's rows", () => {
    const declared = declaredServerOptions(estate)
    for (const row of SERVER_OPTIONS) {
      expect(optionAt(declared, row.name)).toBeDefined()
    }
    const carried: Array<string> = []
    const walk = (record: { readonly [key: string]: unknown }, prefix: string): void => {
      for (const [key, value] of Object.entries(record)) {
        const path = prefix === "" ? key : `${prefix}.${key}`
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          walk(value as { readonly [key: string]: unknown }, path)
          continue
        }
        carried.push(path)
      }
    }
    walk(declared.options, "")
    expect(carried.sort()).toEqual(SERVER_OPTIONS.map((row) => row.name).sort())
  })

  test("the table has a name of its own", async () => {
    const digest = await Effect.runPromise(serverOptionTableDigest(SERVER_OPTION_TABLE))
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("the closed-channel inventory", () => {
  test("reads only options the table carries, at the same declaration and site", () => {
    for (const channel of CLOSED_CHANNELS) {
      const row = SERVER_OPTIONS.find((option) => option.name === channel.option)
      expect(row).toBeDefined()
      expect(row?.declaration).toBe(channel.declaration)
      expect(row?.site).toBe(channel.site)
    }
  })

  test("every row teaches a repair that names the inventory, the declaration and the act", () => {
    for (const channel of CLOSED_CHANNELS) {
      expect(channel.subject.length).toBeGreaterThan(0)
      for (
        const required of [
          "closed-channel inventory",
          "closed by declaration rather than by accident",
          "operator ruling",
        ]
      ) {
        expect(channel.repair).toContain(required)
      }
      // "Remove the field" is a FAILING repair: the field is how the estate
      // declares the channel closed, so removing it would replace a declared
      // closure with an absence — the state the declared value exists to
      // retire.
      for (const failing of ["remove the field", "delete the field", "drop the field"]) {
        expect(channel.repair.toLowerCase()).not.toContain(failing)
      }
    }
  })

  test("the estate's own declared value enables nothing", () => {
    expect(enabledClosedChannels(declaredServerOptions(estate))).toEqual([])
  })

  test("each row is enabled on its own, by the value that opens it", () => {
    for (const channel of CLOSED_CHANNELS) {
      const enabled = enabledClosedChannels(declaredServerOptions(enabling(channel.row)))
      expect(enabled.map((row) => row.row)).toEqual([channel.row])
    }
  })

  test("an emptied inventory enables nothing, which is what the daemon's control executes", () => {
    for (const channel of CLOSED_CHANNELS) {
      const empty: ReadonlyArray<ClosedChannelRow> = []
      expect(enabledClosedChannels(declaredServerOptions(enabling(channel.row)), empty)).toEqual([])
    }
  })

  test("the inventory carries one law and has a name of its own", async () => {
    expect(CLOSED_CHANNEL_INVENTORY.law).toBe(CLOSED_CHANNEL_LAW)
    const digest = await Effect.runPromise(closedChannelInventoryDigest(CLOSED_CHANNEL_INVENTORY))
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })
})
