/**
 * The bootstrap gate: a fresh directory, the shipped `init` verb, the shipped
 * substrate lifecycle command, and an agent client that connects to what the
 * registration named and speaks one admitted sentence.
 *
 * Every step runs the thing a practitioner would run. The two CLI verbs are
 * spawned as child processes, the daemon is the real Go binary built from this
 * repository's own module, and the agent client is a bare MCP stdio session
 * driven over the registration's own command and arguments — so what this wall
 * measures is first contact rather than a rehearsal of it.
 *
 * Three arms are worth naming.
 *
 * **The missing-substrate arm runs first**, before anything is started, because
 * that is the order a practitioner meets it in: the declarations are minted, the
 * registration is written, and the report is a taught absence whose repair names
 * the shipped daemon's own verb. That the verb is the shipped one is MEASURED —
 * the binary's own usage text is the oracle — rather than asserted against a
 * word this file typed.
 *
 * **The cross-language arm is the options and store digests.** The bootstrap
 * declares the value the substrate will run under; the daemon declares its own
 * and prints both digests before it touches anything. Comparing them is an
 * independent oracle across the two languages: a posture row that drifted on
 * either side moves a digest and reddens this row.
 *
 * **The idempotence arm is executed twice under real conditions** — once with no
 * substrate, once with one serving — and the declaration bytes are compared.
 *
 * What this wall does NOT claim: nothing here is a liveness or performance
 * measurement, and no timing is asserted. The bounds it carries are budgets for
 * a loaded machine, in the same shape the harness states for its own.
 */
import { afterAll, describe, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { encodeJsonValue } from "@foldlab/core/jcs"

import { startNatsHarness, type NatsHarness } from "./NatsHarness.js"

const packageRoot = resolve(import.meta.dir, "..")
const goRoot = resolve(packageRoot, "../../go")
const cli = resolve(packageRoot, "src/surface/cli.ts")

/** Everything this file created, released whichever way the rows went. */
const trash: Array<() => void | Promise<void>> = []

afterAll(async () => {
  for (const release of trash.reverse()) await release()
})

/**
 * A port nothing is listening on.
 *
 * The bootstrap declares the address it registers, so the substrate's port has
 * to be known before the declaration is made — the vendor's random-port
 * sentinel would name a substrate the registration could not point at. The
 * window between closing this listener and the daemon binding it is the
 * ordinary one every port-picking harness carries.
 */
const freePort = (): Promise<number> =>
  new Promise((settle, refuse) => {
    const server = createServer()
    server.once("error", refuse)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      const port = typeof address === "object" && address !== null ? address.port : 0
      server.close(() => (port === 0 ? refuse(new Error("no free port")) : settle(port)))
    })
  })

interface Ran {
  readonly exit: number
  readonly stdout: string
  readonly stderr: string
}

const run = async (binary: string, args: ReadonlyArray<string>, cwd: string): Promise<Ran> => {
  const child = Bun.spawn({ cmd: [binary, ...args], cwd, stdout: "pipe", stderr: "pipe" })
  const [stdout, stderr] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { exit: await child.exited, stdout, stderr }
}

const runInit = (args: ReadonlyArray<string>): Promise<Ran> =>
  run("bun", [cli, "init", ...args], packageRoot)

/** Reads one newline-delimited record at a time off a child's output. */
const lineReader = (stream: ReadableStream<Uint8Array>): () => Promise<string | null> => {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let held = ""
  return async () => {
    for (;;) {
      const index = held.indexOf("\n")
      if (index >= 0) {
        const line = held.slice(0, index)
        held = held.slice(index + 1)
        if (line.trim().length > 0) return line
        continue
      }
      const { done, value } = await reader.read()
      if (done) return null
      held += decoder.decode(value, { stream: true })
    }
  }
}

/**
 * Consumes a child's diagnostic stream.
 *
 * Two reasons, and the second is the load-bearing one: a failing row should
 * report what the child said, and a pipe nobody reads fills and blocks the
 * process writing into it. Diagnostics are evidence machinery here and nothing
 * reads them back into meaning — no assertion in this file is load-bearing on a
 * line collected this way.
 */
const drain = (stream: ReadableStream<Uint8Array>, held: Array<string>): void => {
  void (async () => {
    const next = lineReader(stream)
    for (;;) {
      const line = await next()
      if (line === null) return
      held.push(line)
    }
  })()
}

/**
 * The load-stretched budget the harness states for its own waits, in the same
 * shape: a saturated machine overruns every sleep, so the bound is generous and
 * still bounded — a daemon that never reports ready fails the row loudly.
 */
const READY_ATTEMPTS = 2400

const awaitLine = async (
  next: () => Promise<string | null>,
  held: Array<string>,
  diagnostics: ReadonlyArray<string>,
  matches: (line: string) => boolean,
): Promise<string> => {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
    const line = await next()
    if (line === null) break
    held.push(line)
    if (matches(line)) return line
  }
  throw new Error(
    `the daemon never reported the line this wall waits for:\n${held.join("\n")}\n${
      diagnostics.join("\n")
    }`,
  )
}

describe("the bootstrap gate", () => {
  test(
    "one command declares the opening, the daemon serves it, and an agent speaks one admitted sentence",
    async () => {
      /* ---------------------------------------------------- the coordination */
      // The incarnation fence and the lifecycle lanes live on a substrate other
      // than the one being decided about; that is the daemon's own ruling and
      // this wall consumes it rather than working around it.
      const coordination: NatsHarness = await startNatsHarness()
      trash.push(() => coordination.stop())

      const project = mkdtempSync(join(tmpdir(), "plait-bootstrap-"))
      const store = mkdtempSync(join(tmpdir(), "plait-bootstrap-store-"))
      trash.push(() => rmSync(project, { recursive: true, force: true }))
      trash.push(() => rmSync(store, { recursive: true, force: true }))

      const port = await freePort()
      const name = "foldlab-bootstrap-wall"
      const initArguments = [
        "--holder",
        "bootstrap-wall",
        "--directory",
        project,
        "--store",
        store,
        "--name",
        name,
        "--addr",
        "127.0.0.1",
        "--port",
        String(port),
      ]

      /* ------------------------------------- the missing-substrate arm, first */
      const cold = await runInit(initArguments)
      expect(cold.exit).toBe(2)
      const absence = JSON.parse(cold.stderr) as {
        readonly _tag: string
        readonly sort: string
        readonly kind: string
        readonly law: string
        readonly expected: string
        readonly path: ReadonlyArray<string>
        readonly next: ReadonlyArray<{ readonly subject: string; readonly note: string }>
      }
      expect(absence._tag).toBe("AbsenceRefusal")
      expect(absence.sort).toBe("absence")
      expect(absence.kind).toBe("transport-unavailable")
      expect(absence.path).toEqual(["init.substrate"])
      expect(absence.expected).toBe("a substrate answering at the declared address")
      expect(absence.law).toBe(
        "An agent speaks to a substrate that is already serving; a declaration set names one and never starts it.",
      )
      // The taught row is a whole teaching and is pinned as one.
      expect(absence.next.length).toBe(1)
      expect(absence.next[0]!.subject).toBe("substrate up")
      expect(absence.next[0]!.note).toContain("Start the substrate over the store directory")
      expect(absence.next[0]!.note).toContain("say these sentences again")
      // A declaration does not need a server to be true: the whole set is here.
      const declared = readFileSync(join(project, ".plait", "opening.json"), "latin1")
      const opening = JSON.parse(declared) as {
        readonly store: string
        readonly options: string
        readonly writ: string
        readonly holder: string
      }
      expect(readdirSync(join(project, ".plait", "values")).sort()).toEqual(
        [opening.holder, opening.options, opening.store, opening.writ]
          .map((digest) => `${digest}.json`).sort(),
      )

      /* ------------------------------------------------------- the daemon */
      const binaryHome = mkdtempSync(join(tmpdir(), "plait-substrate-bin-"))
      trash.push(() => rmSync(binaryHome, { recursive: true, force: true }))
      const binary = join(binaryHome, process.platform === "win32" ? "substrate.exe" : "substrate")
      const built = Bun.spawnSync({
        cmd: ["go", "build", "-o", binary, "./cmd/substrate"],
        cwd: goRoot,
        stdout: "pipe",
        stderr: "pipe",
      })
      if (built.exitCode !== 0) throw new Error(`build the lifecycle command: ${built.stderr}`)

      // The refusal's repair names a verb; the binary's own usage is the oracle
      // that it is the shipped one, rather than a word this file agreed with.
      const usage = await run(binary, [], goRoot)
      expect(usage.exit).toBe(2)
      expect(usage.stderr).toContain(absence.next[0]!.subject)

      const daemon = Bun.spawn({
        cmd: [
          binary,
          "up",
          "--coordination",
          coordination.url,
          "--store",
          store,
          "--name",
          name,
          "--addr",
          "127.0.0.1",
          "--port",
          String(port),
        ],
        cwd: goRoot,
        stdout: "pipe",
        stderr: "pipe",
      })
      const spoken: Array<string> = []
      const daemonDiagnostics: Array<string> = []
      const nextDaemonLine = lineReader(daemon.stdout)
      drain(daemon.stderr, daemonDiagnostics)
      trash.push(async () => {
        daemon.kill()
        await daemon.exited
      })
      const readyLine = await awaitLine(
        nextDaemonLine,
        spoken,
        daemonDiagnostics,
        (line) => line.startsWith("READY: "),
      )
      expect(readyLine).toContain(`url=nats://127.0.0.1:${port}`)

      /* ----------------------------------- the cross-language digest oracle */
      const printed = (prefix: string): string => {
        const line = spoken.find((held) => held.startsWith(prefix))
        if (line === undefined) throw new Error(`the daemon printed no ${prefix} line`)
        return line.slice(prefix.length).trim()
      }
      expect(printed("declared options:")).toBe(opening.options)
      expect(printed("store:")).toBe(opening.store)

      /* ------------------------------------------ the same sentences again */
      const warm = await runInit(initArguments)
      expect(warm.exit).toBe(0)
      expect(warm.stdout.trimEnd().split("\n").length).toBe(1)
      expect(warm.stdout).toContain("your agent can now speak")
      expect(warm.stdout).toContain(`writ=${opening.writ}`)
      expect(warm.stdout).toContain(`store=${opening.store}`)
      expect(warm.stdout).toContain("holder=bootstrap-wall")
      expect(warm.stdout).toContain("declared and not yet a guard")
      // Byte-identical over a real substrate, not only in the pure suite.
      expect(readFileSync(join(project, ".plait", "opening.json"), "latin1")).toBe(declared)

      /* ----------------------------------------- the agent client connects */
      const registration = JSON.parse(readFileSync(join(project, ".mcp.json"), "utf8")) as {
        readonly mcpServers: {
          readonly plait: { readonly command: string; readonly args: ReadonlyArray<string> }
        }
      }
      const entry = registration.mcpServers.plait
      expect(entry.args).toContain(`nats://127.0.0.1:${port}`)
      expect(entry.args).toContain(opening.writ)

      const agent = Bun.spawn({
        cmd: [entry.command, ...entry.args],
        cwd: project,
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      })
      trash.push(async () => {
        agent.kill()
        await agent.exited
      })
      const nextAgentLine = lineReader(agent.stdout)
      const agentDiagnostics: Array<string> = []
      drain(agent.stderr, agentDiagnostics)
      const speak = async (
        id: number,
        method: string,
        params: unknown,
      ): Promise<Record<string, unknown>> => {
        agent.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`)
        agent.stdin.flush()
        for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
          const line = await nextAgentLine()
          if (line === null) break
          const message = JSON.parse(line) as Record<string, unknown>
          if (message["id"] === id) return message
        }
        throw new Error(
          `the served face never answered ${method}\n${agentDiagnostics.join("\n")}`,
        )
      }

      const initialized = await speak(1, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "plait-bootstrap-wall", version: "0" },
      })
      expect((initialized["result"] as { readonly serverInfo: { readonly name: string } }).serverInfo.name)
        .toBe("plait-kernel")
      agent.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
      )
      agent.stdin.flush()

      const listed = await speak(2, "tools/list", {})
      const tools = (listed["result"] as { readonly tools: ReadonlyArray<{ readonly name: string }> })
        .tools.map((tool) => tool.name).sort()
      const granted = JSON.parse(
        readFileSync(join(project, ".plait", "values", `${opening.writ}.json`), "utf8"),
      ) as { readonly tools: ReadonlyArray<string> }
      expect(tools).toEqual([...granted.tools].sort())

      /* --------------------------------- one kernel_declare, round-tripped */
      const value = encodeJsonValue({ v: 0, kind: "resource", cell: "first-contact" })
      if (!value.ok) throw new Error("the wall's own value is not canonical")
      const called = await speak(3, "tools/call", {
        name: "kernel_declare",
        arguments: {
          kind: "resource",
          value: value.bytes,
          writ_digest: `sha256:${opening.writ}`,
        },
      })
      const result = called["result"] as {
        readonly isError?: boolean
        readonly content: ReadonlyArray<{ readonly type: string; readonly text: string }>
      }
      expect(result.isError ?? false).toBe(false)
      const admitted = JSON.parse(result.content[0]!.text) as Record<string, unknown>
      // Admitted, not refused: a refused sentence answers with the taught row's
      // `reason`, and an admitted one answers with the sentence and its name.
      expect(admitted["reason"]).toBeUndefined()
      expect(Array.isArray(admitted["sentence"])).toBe(true)
      expect(String(admitted["digest"])).toMatch(/^sha256:[0-9a-f]{64}$/u)

      /* ------------------------------------------------------- the teardown */
      const down = await run(
        binary,
        ["down", "--coordination", coordination.url, "--store", store],
        goRoot,
      )
      expect(down.exit).toBe(0)

      const trace = "BOOTSTRAP GATE: PASS"
        + " arms=missing-substrate,cross-language-digests,idempotence,agent-declare"
        + " tools=" + String(tools.length)
      console.info(trace)
    },
    600_000,
  )
})
