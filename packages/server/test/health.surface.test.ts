import { describe, expect, test } from "bun:test"
import { HttpRouter } from "effect/unstable/http"
import { Routes } from "../src/server.ts"

describe("the HTTP audience split", () => {
  test("SL1: the machine probe is plain while the browser demos retain their laws", async () => {
    const { dispose, handler } = HttpRouter.toWebHandler(Routes, { disableLogger: true })

    try {
      const health = await handler(new Request("http://localhost/health"))
      expect(health.status).toBe(200)
      expect(await health.text()).toBe("foldlab: two folds, one law")

      const merge = await handler(new Request("http://localhost/demo/merge"))
      const mergeBody = await merge.json() as {
        readonly law?: unknown
        readonly mergedHeads?: { readonly equal?: unknown }
        readonly foldStateDigests?: { readonly equal?: unknown }
      }
      expect(mergeBody.law).toBe("SL1: the chain remembers what the fold forgives")
      expect(mergeBody.mergedHeads?.equal).toBe(false)
      expect(mergeBody.foldStateDigests?.equal).toBe(true)

      const fork = await handler(new Request("http://localhost/demo/fork"))
      const forkBody = await fork.json() as { readonly law?: unknown }
      expect(forkBody.law).toBe(
        "SL4: a fork is two heads, one parent — shared structure, distinct identity",
      )
    } finally {
      await dispose()
    }
  })
})
