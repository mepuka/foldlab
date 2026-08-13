import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { AdmitReply, CreateReply, decodeReply } from "../src/wire.ts"

const hex = "0".repeat(64)
const validCreate = () => ({
  ok: true as const,
  created: false,
  digest: hex,
  scheme: "bytes-sha256-v1",
  catalogSeq: 0,
  catalogHead: hex,
  next: [{ subject: "flb.req.journal.read", note: "read it", body: { journal: "catalog" } }],
})

const accepted = (value: unknown): boolean => decodeReply(CreateReply, JSON.stringify(value)).ok

describe("the TS reply decoder is a strict wire twin", () => {
  test("W7/W8/W7b: excess fields, daemon-local refusals, and lax scalar costumes refuse", () => {
    expect(accepted(validCreate())).toBe(true)

    expect(accepted({ ...validCreate(), ghost: true })).toBe(false)
    expect(accepted({
      ...validCreate(),
      next: [{ ...validCreate().next[0], ghost: true }],
    })).toBe(false)

    const localCostume = decodeReply(CreateReply, JSON.stringify({
      ok: false,
      refusal: {
        kind: "unknown-identity",
        law: "costume",
        next: [],
        local: true,
      },
    }))
    expect(localCostume.ok).toBe(false)
    if (!localCostume.ok) {
      expect(localCostume.refusal.kind).toBe("malformed-reply")
      expect(localCostume.refusal.local).toBe(true)
      expect(localCostume.refusal.next.length).toBeGreaterThan(0)
    }

    expect(accepted({ ...validCreate(), digest: "not-a-digest" })).toBe(false)
    expect(accepted({ ...validCreate(), catalogSeq: -5 })).toBe(false)
    expect(accepted({ ...validCreate(), catalogHead: "" })).toBe(false)
  })

  test("the Go-oracled adversarial corpus has identical TS accept/reject verdicts", () => {
    const corpus = JSON.parse(
      readFileSync(join(import.meta.dir, "..", "..", "wire", "reply-conformance.json"), "utf8"),
    ) as {
      readonly cases: ReadonlyArray<{
        readonly name: string
        readonly kind: "create" | "admit" | "refusal"
        readonly accept: boolean
        readonly value: unknown
      }>
    }
    expect(corpus.cases.length).toBeGreaterThan(0)
    for (const row of corpus.cases) {
      const schema = row.kind === "admit" ? AdmitReply : CreateReply
      const decoded = decodeReply(schema, JSON.stringify(row.value))
      const got = row.kind === "refusal"
        ? !decoded.ok && decoded.refusal.local === false
        : decoded.ok
      expect(got, row.name).toBe(row.accept)
    }
  })
})
