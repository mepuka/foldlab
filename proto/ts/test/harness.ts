// Test harness: build the protod binary once, spawn instances against
// temp JetStream stores, and shut them down by closing stdin (the
// portable path — Windows has no SIGTERM worth sending). All tracer
// data lives in temp dirs; nothing outside proto/ is written.
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const PROTO_GO = new URL("../../go", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")

let building: Promise<string> | undefined

export const buildProtod = (): Promise<string> => {
  building ??= (async () => {
    const dir = mkdtempSync(join(tmpdir(), "flb-protod-bin-"))
    const bin = join(dir, process.platform === "win32" ? "protod.exe" : "protod")
    const proc = Bun.spawn(["go", "build", "-o", bin, "./cmd/protod"], {
      cwd: PROTO_GO,
      stdout: "pipe",
      stderr: "pipe",
    })
    const code = await proc.exited
    if (code !== 0) {
      throw new Error(`go build protod failed: ${await new Response(proc.stderr).text()}`)
    }
    return bin
  })()
  return building
}

export interface RunningDaemon {
  readonly url: string
  stop(): Promise<void>
}

export const spawnProtod = async (): Promise<RunningDaemon> => {
  const bin = await buildProtod()
  const store = mkdtempSync(join(tmpdir(), "flb-protod-store-"))
  const proc = Bun.spawn([bin, "--store", store], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  })

  const reader = proc.stdout.getReader()
  const decoder = new TextDecoder()
  let buffered = ""
  const deadline = Date.now() + 30_000
  while (!buffered.includes("\n")) {
    if (Date.now() > deadline) {
      proc.kill()
      throw new Error(`protod never printed its ready line: ${buffered}`)
    }
    const chunk = await reader.read()
    if (chunk.done) {
      throw new Error(`protod exited before ready: ${await new Response(proc.stderr).text()}`)
    }
    buffered += decoder.decode(chunk.value)
  }
  const ready = JSON.parse(buffered.slice(0, buffered.indexOf("\n")))
  if (ready.ready !== true || typeof ready.url !== "string") {
    proc.kill()
    throw new Error(`unexpected ready line: ${buffered}`)
  }

  return {
    url: ready.url,
    async stop() {
      try {
        proc.stdin.end()
        // nats-server shutdown can be slow on Windows; give it room,
        // then escalate rather than hang the suite.
        const exited = await Promise.race([
          proc.exited,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 15_000)),
        ])
        if (exited === null) proc.kill()
        await proc.exited
      } finally {
        try {
          rmSync(store, { recursive: true, force: true })
        } catch {
          // Windows holds file locks a beat after exit; temp cleanup is
          // best-effort — the OS owns the directory anyway.
        }
      }
    },
  }
}
