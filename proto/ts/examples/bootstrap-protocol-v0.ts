import { ProtoClient } from "../src/client.ts"
import { bootstrapTaskAcceptance } from "../src/protocol.ts"

const url = process.env.FOLDLAB_PROTO_URL
if (url === undefined || url === "") {
  throw new Error("set FOLDLAB_PROTO_URL to an acquired protod URL")
}

const connected = await ProtoClient.connect(url)
if (!connected.ok) throw new Error(JSON.stringify(connected.refusal))

try {
  const bootstrapped = await bootstrapTaskAcceptance(connected.fact)
  process.stdout.write(`${JSON.stringify(bootstrapped, null, 2)}\n`)
} finally {
  await connected.fact.close()
}
