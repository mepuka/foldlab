// Line-oriented Bun endpoint for Go's Task 09 differential tests and fuzzing.
import { createInterface } from "node:readline"
import { canonicalizeJson } from "../src/jcs.ts"

interface ProbeRequest {
  readonly input: string
}

const main = async (): Promise<void> => {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of lines) {
    const request = JSON.parse(line) as ProbeRequest
    if (typeof request.input !== "string") throw new Error("probe request input must be base64")
    const outcome = canonicalizeJson(Buffer.from(request.input, "base64"))
    const reply = outcome.ok
      ? { accepted: true, canonical: outcome.bytes }
      : { accepted: false }
    process.stdout.write(`${JSON.stringify(reply)}\n`)
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})
