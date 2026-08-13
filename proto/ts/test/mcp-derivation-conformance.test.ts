import { expect, test } from "bun:test"
import { Schema } from "effect"
import { toolsFromContract } from "../src/mcp.ts"
import { Contract } from "../src/wire.ts"

const contractWithNames = (requestNames: ReadonlyArray<string>, ingressName: string) =>
  Schema.decodeUnknownSync(Contract)({
    name: "flb.proto.v0",
    version: "0",
    scheme: "bytes-sha256-v1",
    note: "synthetic collision control",
    requests: requestNames.map((name, index) => ({
      name,
      subject: `flb.req.type.${index}`,
      note: "create",
      body: { k: "opaque" },
      reply: { k: "opaque" },
    })),
    ingress: {
      name: ingressName,
      subjectPattern: "flb.ing.*",
      example: "flb.ing.data",
      note: "publish",
      frame: { k: "opaque" },
      reply: { k: "opaque" },
    },
    refusal: { k: "opaque" },
  })

test("W10: contract-derived MCP tool names are injective across request and ingress", () => {
  const honest = toolsFromContract(contractWithNames(["type_create"], "frame_publish"))
  expect(honest.ok).toBe(true)

  const requestCollision = toolsFromContract(
    contractWithNames(["type_create", "type_create"], "frame_publish"),
  )
  expect(requestCollision.ok).toBe(false)
  if (!requestCollision.ok) {
    expect(requestCollision.refusal.path).toEqual(["contract", "requests", "1", "name"])
  }

  const collision = toolsFromContract(contractWithNames(["type_create"], "type_create"))
  expect(collision.ok).toBe(false)
  if (!collision.ok) {
    expect(collision.refusal.kind).toBe("malformed-reply")
    expect(collision.refusal.path).toEqual(["contract", "ingress", "name"])
    expect(collision.refusal.next.length).toBeGreaterThan(0)
  }
})
