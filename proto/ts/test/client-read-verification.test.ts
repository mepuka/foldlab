// Regression controls for issues #52 and #53. These exercise the public
// ProtoClient seam against a real daemon; corrupted-reply controls live beside
// them so a positive daemon round trip cannot make the verifier tautological.
import { expect, test } from "bun:test"
import { ProtoClient } from "../src/client.ts"
import { GENESIS } from "../src/jcs.ts"
import { spawnProtod, spawnReadReplyServer } from "./harness.ts"

test("an evidence-free cursor is refused and cannot poison the catalog writer", async () => {
  const daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
  const client = connected.fact

  try {
    const forged = await client.read("catalog", { seq: 0, head: "a".repeat(64) })
    expect(forged.ok).toBe(false)
    if (forged.ok) {
      throw new Error(`fabricated cursor became verified: ${forged.fact.verified.head}`)
    }
    expect(forged.refusal.kind).toBe("bad-cursor")
    expect(forged.refusal.local).toBe(false)

    const created = await client.createType({ k: "string" })
    expect(created.ok).toBe(true)
    const catalog = await client.read("catalog")
    expect(catalog.ok).toBe(true)
    if (catalog.ok) expect(catalog.fact.journal).toBe("catalog")
  } finally {
    await client.close()
    await daemon.stop()
  }
}, 120_000)

test.each([
  ["another valid journal", "other_journal"],
  ["an invalid journal name", "../../etc"],
])(
  "a read refuses a reply attributed to %s",
  async (_label, returnedJournal) => {
    const responder = await spawnReadReplyServer({
      ok: true,
      journal: returnedJournal,
      entries: [],
      seq: -1,
      head: GENESIS,
      note: "heads are claims",
      next: [],
    })
    const connected = await ProtoClient.connect(responder.url)
    if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
    const client = connected.fact

    try {
      const read = await client.read("requested_journal")
      expect(read.ok).toBe(false)
      if (read.ok) throw new Error(`substituted journal became verified: ${read.fact.journal}`)
      expect(read.refusal.kind).toBe("verify-failed")
      expect(read.refusal.path).toEqual(["journal"])
    } finally {
      await client.close()
      await responder.stop()
    }
  },
  120_000,
)
