/**
 * The foldlab MCP server: the agent surface over stdio. Mount it in any
 * MCP client (e.g. .mcp.json):
 *
 *   { "mcpServers": { "foldlab": { "command": "bun",
 *     "args": ["packages/mcp/src/mcpMain.ts"] } } }
 *
 * Auto-annotation default: every mint carries the surface and primitive it
 * came through — configure `annotate` in makeAgentSurface for agent ids,
 * sessions, source pointers.
 */

import { Layer } from "effect"
import { McpProtocol, McpServer } from "effect/unstable/ai"
import { BunRuntime, BunStdio } from "@effect/platform-bun"
import { makeAgentSurface } from "./agentSurface.ts"

const surface = makeAgentSurface({
  annotate: (ctx) => ({
    "x-minted-via": `foldlab-mcp:${ctx.tool}`,
    ...(ctx.primitive === undefined ? {} : { "x-primitive": ctx.primitive }),
  }),
})

const ServerLayer = McpServer.toolkit(surface.toolkit).pipe(
  Layer.provide(surface.handlersLayer),
  Layer.provide(
    McpServer.layerStdio({
      name: "foldlab",
      version: "0.1.0",
      protocols: [McpProtocol.v2025_06_18],
    }),
  ),
  Layer.provide(BunStdio.layer),
)

BunRuntime.runMain(Layer.launch(ServerLayer))
