// Regression for issue #39: an empty read from the current tail must not
// relabel an unverified caller-supplied head as a locally verified fact.
import { expect, test } from "bun:test"
import { ProtoClient } from "../src/client.ts"
import { spawnProtod } from "./harness.ts"

test("read at tail refuses an unverified caller head", async () => {
  const daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
  const client = connected.fact

  try {
    const created = await client.createType({ k: "string" })
    if (!created.ok) throw new Error(`create refused: ${JSON.stringify(created.refusal)}`)
    const admitted = await client.publish("read_tail_verification", {
      type: created.fact.digest,
      payload: "first",
    })
    if (!admitted.ok) throw new Error(`publish refused: ${JSON.stringify(admitted.refusal)}`)

    const read = await client.read("read_tail_verification", {
      seq: 0,
      head: "a".repeat(64),
    })
    expect(read.ok).toBe(false)
    if (read.ok) {
      throw new Error(`forged head was returned as verified: ${read.fact.verified.head}`)
    }
    expect(read.refusal.kind).toBe("bad-cursor")
    expect(read.refusal.local).toBe(false)
  } finally {
    await client.close()
    await daemon.stop()
  }
}, 120_000)
