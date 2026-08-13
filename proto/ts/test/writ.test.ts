import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

test("W9: the client owns only the three transport verbs", () => {
  const source = readFileSync(join(import.meta.dir, "../src/client.ts"), "utf8")
  const manifest = JSON.parse(
    readFileSync(join(import.meta.dir, "../package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> }

  for (const verb of ["request", "publish", "read"]) {
    expect(source).toMatch(new RegExp(`async\\s+${verb}(?:<|\\()`))
  }

  // Lifecycle close plus raw request are the only direct NATS operations.
  // Publish/read and every convenience method must stay above request.
  const directOperations = [...source.matchAll(/this\.connection\.([A-Za-z]+)\b/g)]
    .map((match) => match[1])
  expect([...new Set(directOperations)].sort()).toEqual(["close", "request"])

  // The client cannot grow JetStream/CAS authority through an undeclared NATS
  // package while this dependency boundary remains checked.
  expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual([
    "@nats-io/transport-node",
    "effect",
  ])
})
