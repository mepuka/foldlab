// The MCP face: tools are DERIVED from contract.describe at startup —
// the daemon's own description, through the json-schema codegen target,
// becomes each tool's input schema. There is no hand-written tool list
// to drift (drift is structurally impossible; a daemon that grows a
// request kind grows a tool).
//
// Tool results carry the daemon's replies verbatim: facts and refusals
// alike are DATA in the tool result, never MCP protocol errors (W8
// holds across the MCP seam too).
import { Effect, Layer, Schema, Sink, Stdio, Stream } from "effect"
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/unstable/ai"
import type { ProtoClient } from "./client.ts"
import { toJsonSchema } from "./codegen.ts"
import type { Json } from "./jcs.ts"
import { Refusal as RefusalSchema, type Contract, type Refusal } from "./wire.ts"

export interface DerivedTool {
  readonly name: string
  readonly description: string
  readonly subject: string
  readonly kind: "request" | "publish"
  readonly inputSchema: Record<string, Json>
}

/** Derive the tool list from a contract reply. Failures are refusal
 * values (a contract this derivation cannot render is a broken daemon,
 * and the caller should hear that as data). */
export const toolsFromContract = (
  contract: Contract,
): { ok: true; tools: DerivedTool[] } | { ok: false; refusal: Refusal } => {
  const tools: DerivedTool[] = []
  for (const request of contract.requests) {
    const input = toJsonSchema(request.body as Json)
    if (!input.ok) return { ok: false, refusal: input.refusal }
    tools.push({
      name: request.name,
      description: `${request.note} (subject: ${request.subject})`,
      subject: request.subject,
      kind: "request",
      inputSchema: input.value,
    })
  }
  const frame = toJsonSchema(contract.ingress.frame as Json)
  if (!frame.ok) return { ok: false, refusal: frame.refusal }
  tools.push({
    name: contract.ingress.name,
    description: `${contract.ingress.note} (subject: ${contract.ingress.subjectPattern})`,
    subject: contract.ingress.subjectPattern,
    kind: "publish",
    inputSchema: {
      type: "object",
      properties: { journal: { type: "string" }, frame: frame.value },
      required: ["journal", "frame"],
      additionalProperties: false,
    },
  })
  return { ok: true, tools }
}

/** Build the MCP server layer over a connected client: derive tools
 * from the live contract, register them in a Toolkit, and serve MCP
 * over the provided Stdio. */
export const mcpLayer = (
  client: ProtoClient,
  derived: ReadonlyArray<DerivedTool>,
): Layer.Layer<never, unknown, Stdio.Stdio> => {
  const tools = derived.map((tool) =>
    Tool.dynamic(tool.name, {
      description: tool.description,
      parameters: tool.inputSchema as any,
      success: Schema.Unknown,
    }),
  )
  const toolkit = Toolkit.make(...tools)
  const handlers: Record<string, (payload: unknown) => Effect.Effect<unknown>> = {}
  for (const tool of derived) {
    handlers[tool.name] = (payload) =>
      Effect.promise(async () => {
        // The daemon's reply travels VERBATIM: a fact stays a fact, a
        // refusal stays {ok:false, refusal} — the MCP seam adds nothing.
        if (tool.kind === "publish") {
          const body = payload as { journal: string; frame: Json }
          const reply = await client.publish(body.journal, body.frame)
          return reply.ok ? reply.fact : { ok: false, refusal: reply.refusal }
        }
        const reply = await client.request(tool.subject, (payload as Json) ?? {}, Schema.Unknown)
        return reply.ok ? reply.fact : { ok: false, refusal: reply.refusal }
      })
  }
  const handlersLayer = toolkit.toLayer(handlers as any)
  return McpServer.toolkit(toolkit).pipe(
    Layer.provide(handlersLayer),
    Layer.provide(
      McpServer.layerStdio({
        name: "flb-proto",
        version: "0.0.1",
        protocols: [McpProtocol.v2025_06_18],
      }),
    ),
  ) as Layer.Layer<never, unknown, Stdio.Stdio>
}

/** A Stdio service over this process's real stdin/stdout — the runtime
 * face for `bun src/mcp-main.ts`. Kept here so tests can substitute
 * Stdio.layerTest with in-memory streams instead. */
export const processStdioLayer = (): Layer.Layer<Stdio.Stdio> =>
  Layer.succeed(Stdio.Stdio)(
    Stdio.make({
      args: Effect.sync(() => process.argv.slice(2)),
      stdin: Stream.fromAsyncIterable(
        process.stdin as AsyncIterable<Uint8Array>,
        (error) => error as any,
      ),
      stdout: () =>
        Sink.forEach((chunk: string | Uint8Array) =>
          Effect.sync(() => {
            process.stdout.write(chunk)
          }),
        ),
      stderr: () =>
        Sink.forEach((chunk: string | Uint8Array) =>
          Effect.sync(() => {
            process.stderr.write(chunk)
          }),
        ),
    }),
  )

/** Decode an unknown reply piece as a refusal, if it is one — used by
 * MCP clients inspecting tool results. */
export const asRefusal = (value: unknown): Refusal | undefined => {
  const decoded = Schema.decodeUnknownResult(RefusalSchema)(value)
  return decoded._tag === "Success" ? decoded.success : undefined
}
