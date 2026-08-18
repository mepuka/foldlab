import { describe, expect, test } from "bun:test"
import { Effect } from "effect"

import {
  evidenceSubject,
  factSubject,
  nodeSubject,
} from "../src/kernel/Subjects.js"

describe("fabric subject constructors", () => {
  test("construct exactly the ruled routing grammar", async () => {
    const [evidence, fact, node] = await Effect.runPromise(
      Effect.all([
        evidenceSubject("distill", 3),
        factSubject("venue-a"),
        nodeSubject("worker-7"),
      ]),
    )

    expect(String(evidence)).toBe("flb.fab.ev.distill.3")
    expect(String(fact)).toBe("flb.fab.fact.venue-a")
    expect(String(node)).toBe("flb.fab.node.worker-7")
  })

  test("refuses wildcard and dotted routing tokens", async () => {
    const refusal = await Effect.runPromise(
      Effect.flip(evidenceSubject("lane.*", 0)),
    )

    expect(refusal.sort).toBe("structural")
    expect(refusal.kind).toBe("invalid-subject-token")
  })

  test("refuses non-finite evidence parts without throwing across the seam", async () => {
    const refusal = await Effect.runPromise(
      Effect.flip(evidenceSubject("lane", Number.NaN)),
    )

    expect(refusal.got).toBe("NaN")
  })
})
