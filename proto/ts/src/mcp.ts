// The MCP face: tools are DERIVED from contract.describe at startup —
// the daemon's own description, through the json-schema codegen target,
// becomes each tool's input schema. There is no hand-written tool list
// to drift (drift is structurally impossible; a daemon that grows a
// request kind grows a tool).
//
// Tool results carry facts and refusals as DATA, never MCP protocol errors
// (W8 holds across the MCP seam too). Request/publish facts remain verbatim;
// journal reads expose ProtoClient's verified cursor instead of forwarding the
// daemon's head claim.
import { Effect, Layer, Result, Schema, Sink, Stdio, Stream } from "effect"
import { McpProtocol, McpServer, Tool, Toolkit } from "effect/unstable/ai"
import { SUBJECT_JOURNAL_READ, type ProtoClient } from "./client.ts"
import { toJsonSchema } from "./codegen.ts"
import type { Json } from "./jcs.ts"
import {
  Refusal as RefusalSchema,
  CursorSeq,
  Hex64,
  NonNegativeInt,
  SUBJECT_CONTRACT_DESCRIBE,
  localRefusal,
  type Contract,
  type Refusal,
} from "./wire.ts"

export interface DerivedTool {
  readonly name: string
  readonly description: string
  readonly subject: string
  readonly kind: "request" | "read" | "publish"
  readonly inputSchema: Record<string, Json>
}

/** Derive the tool list from a contract reply. Failures are refusal
 * values (a contract this derivation cannot render is a broken daemon,
 * and the caller should hear that as data). */
export const toolsFromContract = (
  contract: Contract,
): { ok: true; tools: DerivedTool[] } | { ok: false; refusal: Refusal } => {
  const tools: DerivedTool[] = []
  const names = new Map<string, ReadonlyArray<string>>()
  const nameCollision = (name: string, path: ReadonlyArray<string>): Refusal | undefined => {
    const first = names.get(name)
    if (first === undefined) {
      names.set(name, path)
      return undefined
    }
    return localRefusal(
      "malformed-reply",
      "W10: every contract operation must derive one injective MCP tool name",
      {
        got: { name, first: [...first], duplicate: [...path] },
        expected: "a name used by exactly one request or ingress operation",
        path: [...path],
        next: [{
          subject: SUBJECT_CONTRACT_DESCRIBE,
          note: "repair the daemon contract so every operation name is unique, then describe it again",
          body: {},
        }],
      },
    )
  }
  for (const [index, request] of contract.requests.entries()) {
    const duplicate = nameCollision(request.name, ["contract", "requests", String(index), "name"])
    if (duplicate !== undefined) return { ok: false, refusal: duplicate }
    const input = toJsonSchema(request.body as Json)
    if (!input.ok) return { ok: false, refusal: input.refusal }
    tools.push({
      name: request.name,
      description: `${request.note} (subject: ${request.subject})`,
      subject: request.subject,
      kind: request.subject === SUBJECT_JOURNAL_READ ? "read" : "request",
      inputSchema: input.value,
    })
  }
  const ingressDuplicate = nameCollision(contract.ingress.name, ["contract", "ingress", "name"])
  if (ingressDuplicate !== undefined) return { ok: false, refusal: ingressDuplicate }
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

const JournalReadArguments = Schema.Struct({
  journal: Schema.String,
  from: Schema.optionalKey(
    Schema.Struct({
      seq: CursorSeq,
      head: Hex64,
    }),
  ),
  max: Schema.optionalKey(NonNegativeInt),
})

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
        // Refusals stay {ok:false, refusal}. Facts remain verbatim except for
        // READ, whose whole purpose is to replace the daemon's head claim with
        // the client's locally verified cursor.
        if (tool.kind === "publish") {
          const body = payload as { journal: string; frame: Json }
          const reply = await client.publish(body.journal, body.frame)
          return reply.ok ? reply.fact : { ok: false, refusal: reply.refusal }
        }
        if (tool.kind === "read") {
          const argumentsResult = Schema.decodeUnknownResult(
            JournalReadArguments,
            { onExcessProperty: "error" },
          )(payload)
          if (Result.isSuccess(argumentsResult)) {
            const body = argumentsResult.success
            const reply = await client.read(body.journal, body.from, body.max)
            return reply.ok
              ? { ok: true, ...reply.fact }
              : { ok: false, refusal: reply.refusal }
          }
          return {
            ok: false,
            refusal: localRefusal(
              "malformed",
              "W8: journal_read arguments must decode before the verified read verb runs",
              {
                got: payload,
                expected: String(argumentsResult.failure),
                path: [],
                next: [{
                  subject: SUBJECT_JOURNAL_READ,
                  note: "correct the journal_read arguments, then explicitly retry the verified read",
                  body: { journal: "catalog", from: { seq: -1, head: "0".repeat(64) }, max: 0 },
                }],
              },
            ),
          }
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
  const decoded = Schema.decodeUnknownResult(RefusalSchema, { onExcessProperty: "error" })(value)
  return decoded._tag === "Success" ? decoded.success : undefined
}
