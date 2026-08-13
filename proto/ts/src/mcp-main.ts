// MCP stdio entry point: connect to a running protod (FLB_URL), derive
// the tool surface from contract.describe, and serve MCP over stdio.
// Usage: FLB_URL=nats://127.0.0.1:PORT bun src/mcp-main.ts
import { Effect, Layer } from "effect"
import { ProtoClient } from "./client.ts"
import { mcpLayer, processStdioLayer, toolsFromContract } from "./mcp.ts"

const url = process.env["FLB_URL"]
if (url === undefined) {
  process.stderr.write("mcp-main: FLB_URL is required\n")
  process.exit(2)
}

const connected = await ProtoClient.connect(url)
if (!connected.ok) {
  process.stderr.write(`mcp-main: ${JSON.stringify(connected.refusal)}\n`)
  process.exit(1)
}
const client = connected.fact

const described = await client.describe()
if (!described.ok) {
  process.stderr.write(`mcp-main: describe refused: ${JSON.stringify(described.refusal)}\n`)
  process.exit(1)
}

const derived = toolsFromContract(described.fact.contract)
if (!derived.ok) {
  process.stderr.write(`mcp-main: tool derivation refused: ${JSON.stringify(derived.refusal)}\n`)
  process.exit(1)
}

await Effect.runPromise(
  Layer.launch(mcpLayer(client, derived.tools).pipe(Layer.provide(processStdioLayer()))) as any,
).catch((error) => {
  process.stderr.write(`mcp-main: ${String(error)}\n`)
  process.exit(1)
})
