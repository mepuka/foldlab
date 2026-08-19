/**
 * First contact: the opening declaration set, its idempotence, and the four
 * refusals a bootstrap teaches with.
 *
 * The idempotence arm is EXECUTED, not asserted: the bootstrap runs twice over
 * the same arguments and every byte of the resulting tree is compared. That is
 * the property the whole design rests on — "start the substrate and say these
 * sentences again" is only a safe instruction if saying them again changes
 * nothing — so it is measured rather than argued.
 *
 * The served toolset is checked against the committed artifact's own rows
 * through the same reader the MCP face serves from, so a tool name spelled by
 * hand anywhere would show up here as a set that does not match.
 *
 * Nothing in this file reaches a substrate. The probe is the wall group's.
 */
import { describe, expect, test } from "bun:test"
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"

import { BunServices } from "@effect/platform-bun"
import { Effect } from "effect"

import { digestOf } from "../src/truth/Digest.js"
import type { Refusal } from "../src/truth/Refusal.js"
import type { WireValue } from "../src/truth/Canonical.js"
import { servedTools } from "../src/surface/mcp.js"
import {
  bootstrap,
  placeRegistration,
  registrationArguments,
  standingLine,
  type BootstrapRequest,
  type Opening,
} from "../src/surface/init.js"

const invocation = { command: "/run/time", program: "/program/cli.ts" } as const

const request = (
  directory: string,
  overrides: Partial<BootstrapRequest> = {},
): BootstrapRequest => ({
  holder: "first-party",
  directory,
  store: null,
  serverName: "foldlab-substrate",
  host: "127.0.0.1",
  port: 4222,
  views: [],
  tools: [],
  invocation,
  ...overrides,
})

const project = (): string => mkdtempSync(join(tmpdir(), "plait-init-"))

const say = (input: BootstrapRequest): Promise<Opening> =>
  Effect.runPromise(
    bootstrap(input).pipe(Effect.provide(BunServices.layer)) as Effect.Effect<Opening, never>,
  )

const refused = (input: BootstrapRequest): Promise<Refusal> =>
  Effect.runPromise(
    Effect.flip(bootstrap(input)).pipe(Effect.provide(BunServices.layer)) as Effect.Effect<
      Refusal,
      never
    >,
  )

/** Every file under one tree, keyed by its path relative to the tree's root. */
const treeBytes = (root: string): ReadonlyMap<string, string> => {
  const bytes = new Map<string, string>()
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue
    const path = resolve(entry.parentPath, entry.name)
    bytes.set(relative(root, path).replaceAll("\\", "/"), readFileSync(path, "latin1"))
  }
  return bytes
}

describe("the opening declaration set", () => {
  test("names each value by the digest of its own bytes", async () => {
    const home = project()
    try {
      const opening = await say(request(home))
      const values = join(home, ".plait", "values")
      for (const name of readdirSync(values)) {
        const bytes = readFileSync(join(values, name))
        const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
        expect(name).toBe(`${digest}.json`)
      }
      // Every value the opening names is a file the walk can reach by name.
      const named = [
        opening.holderDigest,
        opening.storeDigest,
        opening.optionsDigest,
        opening.writDigest,
      ]
      expect(readdirSync(values).sort()).toEqual(named.map((digest) => `${digest}.json`).sort())
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("the writ grants the served artifact's own rows, never a hand-spelled name", async () => {
    const home = project()
    try {
      const opening = await say(request(home))
      expect([...opening.tools]).toEqual(servedTools().map((row) => row.name).sort())
      const writ = JSON.parse(
        readFileSync(join(home, ".plait", "values", `${opening.writDigest}.json`), "utf8"),
      ) as { readonly tools: ReadonlyArray<string>; readonly views: ReadonlyArray<string> }
      expect([...writ.tools]).toEqual(servedTools().map((row) => row.name).sort())
      // The least writ is lawful and names no view; first contact declares no fold.
      expect(writ.views).toEqual([])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("a granted subset is judged against the served rows and kept as a set", async () => {
    const home = project()
    try {
      const [first, second] = servedTools().map((row) => row.name)
      const opening = await say(request(home, { tools: [second!, first!, second!] }))
      expect([...opening.tools]).toEqual([first!, second!].sort())
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("the opening names its four values and carries no address, directory, or command", async () => {
    const home = project()
    try {
      const opening = await say(request(home))
      const text = readFileSync(join(home, ".plait", "opening.json"), "utf8")
      const value = JSON.parse(text) as Record<string, unknown>
      expect(Object.keys(value).sort()).toEqual([
        "holder",
        "kind",
        "options",
        "store",
        "v",
        "writ",
      ])
      expect(value["kind"]).toBe("plait-opening")
      expect(text).not.toContain(home.replaceAll("\\", "\\\\"))
      expect(text).not.toContain("nats://")
      // The root is the one ambient name in the set; its own digest is what the
      // report cites, and it re-derives over the bytes just written.
      const derived = await Effect.runPromise(digestOf(value as WireValue))
      expect(derived).toBe(opening.openingDigest)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

describe("saying it twice is saying it once", () => {
  test("a second bootstrap over the same arguments writes byte-identical files", async () => {
    const home = project()
    try {
      const first = await say(request(home))
      const before = treeBytes(home)
      const second = await say(request(home))
      const after = treeBytes(home)

      expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
      for (const [path, bytes] of before) expect([path, after.get(path)]).toEqual([path, bytes])
      expect(second).toEqual(first)
      // A tree with nothing in it would compare equal for the wrong reason.
      expect(before.size).toBe(6)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("the digests are a function of the arguments, so a changed argument moves them", async () => {
    const home = project()
    try {
      const first = await say(request(home))
      const second = await say(request(home, { holder: "second-party" }))
      expect(second.holderDigest).not.toBe(first.holderDigest)
      expect(second.writDigest).not.toBe(first.writDigest)
      // The store and the options did not move: they do not name a holder.
      expect(second.storeDigest).toBe(first.storeDigest)
      expect(second.optionsDigest).toBe(first.optionsDigest)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

describe("the registration", () => {
  test("names the program that ran, the address, the holder, and the writ", async () => {
    const home = project()
    try {
      const opening = await say(request(home))
      const registration = JSON.parse(
        readFileSync(join(home, ".mcp.json"), "utf8"),
      ) as {
        readonly mcpServers: {
          readonly plait: { readonly command: string; readonly args: ReadonlyArray<string> }
        }
      }
      expect(registration.mcpServers.plait.command).toBe(invocation.command)
      expect(registration.mcpServers.plait.args).toEqual([
        invocation.program,
        "mcp",
        "--nats",
        "nats://127.0.0.1:4222",
        "--holder",
        "first-party",
        "--writ",
        opening.writDigest,
      ])
      expect([...opening.arguments_]).toEqual([...registration.mcpServers.plait.args])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("keeps every entry a party already registered", async () => {
    const home = project()
    try {
      writeFileSync(
        join(home, ".mcp.json"),
        JSON.stringify({ mcpServers: { other: { command: "elsewhere", args: [] } } }),
        "utf8",
      )
      await say(request(home))
      const registration = JSON.parse(readFileSync(join(home, ".mcp.json"), "utf8")) as {
        readonly mcpServers: Record<string, unknown>
      }
      expect(Object.keys(registration.mcpServers).sort()).toEqual(["other", "plait"])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("placing an entry is a pure step over whatever was there", () => {
    const placed = placeRegistration(
      { note: "kept", mcpServers: { other: { command: "elsewhere" } } },
      { command: "run", args: registrationArguments({
        invocation,
        url: "nats://127.0.0.1:4222",
        holder: "first-party" as never,
        writ: "a".repeat(64) as never,
      }) },
    )
    expect(placed["note"]).toBe("kept")
    const servers = placed["mcpServers"] as Record<string, unknown>
    expect(Object.keys(servers).sort()).toEqual(["other", "plait"])
  })
})

describe("refusals teach at the bootstrap", () => {
  test("a malformed holder is refused with reason, law, and repair", async () => {
    const home = project()
    try {
      const refusal = await refused(request(home, { holder: "" }))
      expect(refusal.sort).toBe("structural")
      expect(refusal.kind).toBe("malformed-value")
      expect(refusal.path).toEqual(["holder"])
      expect(refusal.law).toContain("attribution is never authority")
      expect(refusal.next[0]!.subject).toBe("plait init")
      expect(refusal.next[0]!.note.length).toBeGreaterThan(0)
      // Nothing was written: judgment precedes minting.
      expect(readdirSync(home)).toEqual([])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("an unserved tool name is refused, and the refusal carries the served rows", async () => {
    const home = project()
    try {
      const refusal = await refused(request(home, { tools: ["kernel_teleport"] }))
      expect(refusal.kind).toBe("malformed-value")
      expect(refusal.path).toEqual(["writ", "tools"])
      expect(refusal.got).toBe("kernel_teleport")
      expect(refusal.expected).toEqual(servedTools().map((row) => row.name))
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("a view that is not a content address is refused", async () => {
    const home = project()
    try {
      const refusal = await refused(request(home, { views: ["yesterday's fold"] }))
      expect(refusal.kind).toBe("malformed-value")
      expect(refusal.path).toEqual(["writ", "views"])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("a port no agent could dial is refused before anything is declared", async () => {
    const home = project()
    try {
      const refusal = await refused(request(home, { port: 0 }))
      expect(refusal.kind).toBe("malformed-value")
      expect(refusal.path).toEqual(["port"])
      expect(refusal.got).toBe(0)
      expect(readdirSync(home)).toEqual([])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  test("a registration whose bytes cannot be read is refused rather than overwritten", async () => {
    const home = project()
    try {
      writeFileSync(join(home, ".mcp.json"), "not json at all", "utf8")
      const refusal = await refused(request(home))
      expect(refusal.kind).toBe("malformed-value")
      expect(refusal.path).toEqual(["registration"])
      // The party's own bytes are still there.
      expect(readFileSync(join(home, ".mcp.json"), "utf8")).toBe("not json at all")
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})

describe("the standing line carries no tracking artifact", () => {
  test("names digests and the party's own holder, and nothing ambient", async () => {
    const home = project()
    try {
      const line = standingLine(await say(request(home)))
      expect(line.split("\n").length).toBe(1)
      expect(line).toContain("your agent can now speak")
      expect(line).toContain("declared and not yet a guard")
      // No board id, no path, no command a reader would have to be told to run.
      expect(line).not.toMatch(/\b[A-Z]{2,}-\d+\b/u)
      expect(line).not.toContain(home)
      expect(line).not.toContain("/")
      expect(line).not.toContain("\\")
      expect(line).not.toContain("bun ")
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})
