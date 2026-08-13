import { expect, test } from "bun:test"
import { ProtoClient } from "../src/client.ts"
import { GENESIS } from "../src/jcs.ts"
import { Session } from "../src/session.ts"
import { DescribeReply, localRefusal, type Reply } from "../src/wire.ts"
import { spawnProtod } from "./harness.ts"

test("GitHub #57: a read transcript preserves exact sent and claimed evidence and owns its log", async () => {
  const daemon = await spawnProtod()
  const connected = await ProtoClient.connect(daemon.url)
  if (!connected.ok) throw new Error(`connect refused: ${JSON.stringify(connected.refusal)}`)
  const client = connected.fact
  const session = new Session(client)

  try {
    const read = await session.read("catalog")
    expect(read.ok).toBe(true)

    const snapshot = session.transcript
    expect(snapshot).toHaveLength(1)
    expect(snapshot[0]?.sent).toEqual({
      journal: "catalog",
      from: { seq: -1, head: GENESIS },
      max: 0,
    })
    expect(JSON.stringify(snapshot[0]?.received)).toContain('"claimed"')
    const publicEndpoint = new URL(daemon.url)
    publicEndpoint.username = ""
    publicEndpoint.password = ""
    expect(snapshot[0]).toMatchObject({ endpoint: publicEndpoint.toString() })
    expect(Object.hasOwn(snapshot[0] ?? {}, "startedAt")).toBe(true)
    expect(Object.hasOwn(snapshot[0] ?? {}, "completedAt")).toBe(true)

    Reflect.set(snapshot, "length", 0)
    expect(session.transcript).toHaveLength(1)
  } finally {
    await client.close()
    await daemon.stop()
  }
}, 120_000)

test("GitHub #57: transcript steps are allocated at send time, not completion time", async () => {
  const resolvers: Array<(reply: Reply<DescribeReply>) => void> = []
  const describe = () => new Promise<Reply<DescribeReply>>((resolve) => resolvers.push(resolve))
  const unsupported = async () => ({
    ok: false as const,
    refusal: localRefusal("malformed", "unused fake operation"),
  })
  const session = new Session({
    endpoint: "nats://controlled.test",
    describe,
    createType: unsupported,
    fillType: unsupported,
    unfillType: unsupported,
    publish: unsupported,
    read: unsupported,
  })

  const first = session.describe()
  const second = session.describe()
  expect(session.transcript.map((entry) => entry.step)).toEqual([0, 1])

  resolvers[1]?.({
    ok: false,
    refusal: localRefusal("malformed", "second completed first", { got: "second" }),
  })
  await second
  expect(session.transcript.map((entry) => entry.step)).toEqual([0, 1])
  expect(JSON.stringify(session.transcript[1]?.received)).toContain("second")

  resolvers[0]?.({
    ok: false,
    refusal: localRefusal("malformed", "first completed second", { got: "first" }),
  })
  await first
  expect(JSON.stringify(session.transcript[0]?.received)).toContain("first")
})
