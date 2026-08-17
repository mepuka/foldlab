import { describe, expect, test } from "bun:test"

import {
  evidenceSubject,
  factSubject,
  nodeSubject,
} from "../src/Subjects.js"

describe("fabric subject constructors", () => {
  test("construct exactly the ruled routing grammar", () => {
    const evidence = evidenceSubject("distill", 3)
    const fact = factSubject("venue-a")
    const node = nodeSubject("worker-7")

    expect(evidence.ok).toBe(true)
    expect(fact.ok).toBe(true)
    expect(node.ok).toBe(true)
    if (!evidence.ok || !fact.ok || !node.ok) throw new Error("valid subject refused")
    expect(String(evidence.subject)).toBe("flb.fab.ev.distill.3")
    expect(String(fact.subject)).toBe("flb.fab.fact.venue-a")
    expect(String(node.subject)).toBe("flb.fab.node.worker-7")
  })

  test("refuses wildcard and dotted routing tokens", () => {
    const invalid = evidenceSubject("lane.*", 0)

    expect(invalid.ok).toBe(false)
    if (invalid.ok) throw new Error("wildcard token was admitted")
    expect(invalid.refusal.sort).toBe("structural")
    expect(invalid.refusal.kind).toBe("invalid-subject-token")
  })

  test("refuses non-finite evidence parts without throwing across the seam", () => {
    const invalid = evidenceSubject("lane", Number.NaN)

    expect(invalid.ok).toBe(false)
    if (invalid.ok) throw new Error("non-finite evidence part was admitted")
    expect(invalid.refusal.got).toBe("NaN")
  })
})
