// The MCP wall: a real protod, a real MCP server subprocess speaking
// stdio JSON-RPC, and the law that the tool surface IS the contract —
// derived at startup, not authored. Refusals surface as data in tool
// results, never as MCP protocol errors.
import { afterAll, beforeAll, expect, test } from "bun:test"
import { ProtoClient } from "../src/client.ts"
import { toolsFromContract } from "../src/mcp.ts"
import { spawnProtod, type RunningDaemon } from "./harness.ts"

let daemon: RunningDaemon

beforeAll(async () => {
  daemon = await spawnProtod()
}, 120_000)

afterAll(async () => {
  await daemon?.stop()
}, 60_000)

interface McpProcess {
  send(message: object): void
  next(): Promise<any>
  stop(): Promise<void>
}

const spawnMcp = async (): Promise<McpProcess> => {
  const proc = Bun.spawn(["bun", "src/mcp-main.ts"], {
    cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    env: { ...process.env, FLB_URL: daemon.url },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  })
  const reader = proc.stdout.getReader()
  const decoder = new TextDecoder()
  let buffered = ""
  const lines: string[] = []
  const pump = async (): Promise<void> => {
    while (!buffered.includes("\n")) {
      const chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("mcp reply timeout")), 30_000),
        ),
      ])
      if (chunk.done) {
        throw new Error(`mcp server exited: ${await new Response(proc.stderr).text()}`)
      }
      buffered += decoder.decode(chunk.value)
    }
    const split = buffered.split("\n")
    buffered = split.pop()!
    lines.push(...split.filter((line) => line.trim() !== ""))
  }
  return {
    send(message) {
      proc.stdin.write(JSON.stringify(message) + "\n")
      proc.stdin.flush()
    },
    async next() {
      while (lines.length === 0) await pump()
      return JSON.parse(lines.shift()!)
    },
    async stop() {
      proc.stdin.end()
      const exited = await Promise.race([
        proc.exited,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
      ])
      if (exited === null) proc.kill()
      await proc.exited
    },
  }
}

test("tool schemas are derived from contract.describe, and refusals are data in results", async () => {
  const mcp = await spawnMcp()
  try {
    mcp.send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "smoke-agent", version: "0.0.1" },
      },
    })
    const initialized = await mcp.next()
    expect(initialized.id).toBe(1)
    expect(initialized.result.serverInfo.name).toBe("flb-proto")
    mcp.send({ jsonrpc: "2.0", method: "notifications/initialized" })

    mcp.send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
    const listed = await mcp.next()
    const tools: any[] = listed.result.tools
    expect(tools.map((t) => t.name).sort()).toEqual([
      "contract_describe",
      "journal_read",
      "publish",
      "type_create",
    ])

    // The wall: the served schemas equal what the contract derives —
    // the MCP surface cannot drift from the daemon's self-description.
    const client = (await ProtoClient.connect(daemon.url)) as any
    expect(client.ok).toBe(true)
    const described = await client.fact.describe()
    expect(described.ok).toBe(true)
    const derived = toolsFromContract(described.fact.contract)
    expect(derived.ok).toBe(true)
    if (!derived.ok) throw new Error("derivation refused")
    for (const tool of derived.tools) {
      const served = tools.find((t) => t.name === tool.name)
      expect(served).toBeDefined()
      expect(served.inputSchema).toEqual(tool.inputSchema)
    }
    await client.fact.close()

    // A typo'd create through the MCP seam: the refusal arrives as DATA
    // in the tool result — kind, law, path, example — not an MCP error.
    mcp.send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "type_create", arguments: { structure: { k: "strng" } } },
    })
    const refused = await mcp.next()
    expect(refused.error).toBeUndefined()
    const refusedReply = refused.result.structuredContent ?? JSON.parse(refused.result.content[0].text)
    expect(refusedReply.ok).toBe(false)
    expect(refusedReply.refusal.kind).toBe("invalid-structure")
    expect(refusedReply.refusal.example).toEqual({ k: "string" })

    // Self-repair through the same seam, then publish and read: the
    // whole writ is reachable from MCP, and nothing more.
    mcp.send({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "type_create", arguments: { structure: { k: "string" } } },
    })
    const created = await mcp.next()
    const createdReply = created.result.structuredContent ?? JSON.parse(created.result.content[0].text)
    expect(createdReply.ok).toBe(true)
    expect(createdReply.created).toBe(true)

    mcp.send({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "publish",
        arguments: { journal: "data", frame: { type: createdReply.digest, payload: "via-mcp" } },
      },
    })
    const admitted = await mcp.next()
    const admittedReply = admitted.result.structuredContent ?? JSON.parse(admitted.result.content[0].text)
    expect(admittedReply.ok).toBe(true)
    expect(admittedReply.admitted).toBe(true)
    expect(admittedReply.note).toContain("NOT checked")

    mcp.send({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "journal_read", arguments: { journal: "data" } },
    })
    const read = await mcp.next()
    const readReply = read.result.structuredContent ?? JSON.parse(read.result.content[0].text)
    expect(readReply.ok).toBe(true)
    expect(readReply.entries.length).toBe(1)
  } finally {
    await mcp.stop()
  }
}, 120_000)
