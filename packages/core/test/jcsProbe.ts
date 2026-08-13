import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { once } from "node:events"
import { fileURLToPath } from "node:url"
import { createInterface, type Interface } from "node:readline"
import { canonicalizeJson } from "../src/jcs.ts"

export type ProbeOutcome =
  | { readonly accepted: false }
  | { readonly accepted: true; readonly canonical: string }

export const localProbeOutcome = (input: Uint8Array): ProbeOutcome => {
  const outcome = canonicalizeJson(input)
  return outcome.ok
    ? { accepted: true, canonical: outcome.bytes }
    : { accepted: false }
}

const goRoot = fileURLToPath(new URL("../../../go/", import.meta.url))

/** One persistent process makes every shrink candidate cross the real TS↔Go seam. */
export class GoJcsProbe {
  private readonly process: ChildProcessWithoutNullStreams
  private readonly lines: Interface
  private readonly iterator: AsyncIterator<string>
  private stderr = ""
  private closed = false

  constructor() {
    this.process = spawn("go", ["run", "./cmd/jcsprobe"], {
      cwd: goRoot,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })
    this.process.stderr.setEncoding("utf8")
    this.process.stderr.on("data", (chunk: string) => {
      this.stderr += chunk
    })
    this.lines = createInterface({ input: this.process.stdout, crlfDelay: Infinity })
    this.iterator = this.lines[Symbol.asyncIterator]()
  }

  async canonicalize(input: Uint8Array): Promise<ProbeOutcome> {
    if (this.closed) throw new Error("Go JCS probe is closed")
    const request = JSON.stringify({ input: Buffer.from(input).toString("base64") }) + "\n"
    if (!this.process.stdin.write(request, "utf8")) await once(this.process.stdin, "drain")
    const next = await this.iterator.next()
    if (next.done) {
      throw new Error(`Go JCS probe exited before replying${this.stderr === "" ? "" : `: ${this.stderr.trim()}`}`)
    }
    const decoded = JSON.parse(next.value) as unknown
    if (typeof decoded !== "object" || decoded === null || !("accepted" in decoded)) {
      throw new Error(`Go JCS probe returned an invalid reply: ${next.value}`)
    }
    const reply = decoded as { readonly accepted: unknown; readonly canonical?: unknown; readonly error?: unknown }
    if (reply.accepted === false) return { accepted: false }
    if (reply.accepted === true && typeof reply.canonical === "string") {
      return { accepted: true, canonical: reply.canonical }
    }
    throw new Error(
      `Go JCS probe could not canonicalize a decoded value: ${String(reply.error ?? next.value)}`,
    )
  }

  async close(): Promise<void> {
    if (this.closed) return
    this.closed = true
    this.process.stdin.end()
    if (this.process.exitCode === null) await once(this.process, "exit")
    this.lines.close()
    if (this.process.exitCode !== 0) {
      throw new Error(`Go JCS probe exited ${this.process.exitCode}: ${this.stderr.trim()}`)
    }
  }
}
