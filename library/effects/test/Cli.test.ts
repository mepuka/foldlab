/**
 * The shell surface, driven the way a shell drives it: every case here
 * runs the REAL command tree — the same `cas` value `bin/cas.ts` hands
 * to the runner — over an argument vector, so flags, arguments, the
 * store resolution, and the refusal rendering are all under test and
 * none of them is re-spelled here.
 *
 * `Command.runWith` is the door: the runner with an explicit argv
 * instead of the process's. The platform is the test one — a drained
 * `Stdio`, a terminal that is never read, no child processes — and the
 * `Console` is a capturing service, so the assertions read exactly the
 * lines a user would see. `--store` is named on every invocation, which
 * keeps the suite hermetic: the flag is present, so the `CAS_STORE`
 * fallback and walk-up discovery are never consulted.
 */
import { expect, it } from "@effect/vitest"
import {
  Console,
  Effect,
  FileSystem,
  Layer,
  Path,
  Sink,
  Stdio,
  Stream,
  Terminal,
} from "effect"
import { CliError, Command } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"
import { init, ls, publish, put, serve, show, status, verify } from "../bin/cli/commands.ts"
import { layerDiskFs } from "./fixtures/diskFs.ts"

/** The command tree exactly as `bin/cas.ts` composes it. */
const cas = Command.make("cas").pipe(
  Command.withSubcommands([init, status, put, publish, ls, show, verify, serve]),
)

const runCas = Command.runWith(cas, { version: "0.1.0", renderErrors: false })

/** The runner's environment, minus the process: real filesystem and
 * path (the store is a real directory), a drained stdio, a terminal
 * nothing reads, and a spawner nothing calls. */
const layerCliEnvironment = Layer.mergeAll(
  layerDiskFs,
  Path.layer,
  Stdio.layerTest({
    stdout: () => Sink.drain,
    stderr: () => Sink.drain,
    stdin: Stream.empty,
  }),
  Layer.succeed(
    Terminal.Terminal,
    Terminal.make({
      columns: Effect.succeed(80),
      rows: Effect.succeed(24),
      readInput: Effect.die("the CLI suite never reads input"),
      readLine: Effect.die("the CLI suite never reads input"),
      display: () => Effect.void,
    }),
  ),
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(() => Effect.die("the CLI suite spawns nothing")),
  ),
)

/** One invocation, with everything it printed. The lines are what the
 * verb logged, in order. */
const invoke = (
  ...args: ReadonlyArray<string>
): Effect.Effect<ReadonlyArray<string>, unknown, FileSystem.FileSystem> => {
  const lines: Array<string> = []
  const capturing: Console.Console = Object.assign(Object.create(console), {
    log: (...parts: ReadonlyArray<unknown>) => {
      lines.push(parts.map(String).join(" "))
    },
  })
  return runCas(args).pipe(
    Effect.provideService(Console.Console, capturing),
    Effect.provide(layerCliEnvironment),
    Effect.as(lines as ReadonlyArray<string>),
  )
}

/** A store and a file to put in it, in a temp directory that goes away
 * with the scope. Answers the store path and the file path, both
 * absolute — the `file` argument resolves against the process's
 * working directory, which a test must never depend on. */
const withWorkspace = <A, E>(
  use: (workspace: { readonly store: string; readonly file: string }) => Effect.Effect<
    A,
    E,
    FileSystem.FileSystem
  >,
  /** Which layout `init` creates. The verbs under test are the same
   * either way — that is the claim the sqlite cases make. */
  backend: "file" | "sqlite" = "file",
): Effect.Effect<A, E | unknown> =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-cli-" })
    const file = `${directory}/note.txt`
    yield* fs.writeFileString(file, "hello foldlab\n")
    yield* invoke("init", "--bare", directory, "--backend", backend)
    return yield* use({ store: directory, file })
  })).pipe(Effect.provide(layerDiskFs))

/** What a refusal actually says. A verb's own refusal arrives as the
 * `UserError` the CLI module builds, message and all; a parse-time one
 * arrives wrapped in `ShowHelp`, which carries the help document and
 * the errors beneath it — so the assertion reads those, not the
 * wrapper. */
const refusalText = (error: unknown): string =>
  error instanceof CliError.ShowHelp
    ? error.errors.map((member) => member.message).join("\n")
    : String(error)

/** The address `put` answered, read off its first rendered line. */
const addressOf = (lines: ReadonlyArray<string>): string =>
  lines[0]!.replace("address", "").trim()

it.effect("put: a file's bytes become one node, at the address it answers", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const lines = yield* invoke("put", file, "--store", store)
      const address = addressOf(lines)
      expect(address).toMatch(/^[0-9a-f]{64}$/u)
      // The default kind is registry row 1, and the payload is the
      // file's bytes — nothing wraps them.
      expect(lines[1]).toBe("kind       0x01  (scheme 0)")
      expect(lines[2]).toBe("payload    14 bytes")
      // Content addressing, end to end: the same bytes put again give
      // back the same address, and `show` reads the payload back.
      const again = yield* invoke("put", file, "--store", store)
      expect(addressOf(again)).toBe(address)
      const shown = yield* invoke("show", address, "--store", store)
      expect(shown[2]).toBe("payload    hello foldlab\\n  (14 bytes)")
    })))

it.effect("put: the kind tag is the caller's to name, and it must be a byte", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const named = yield* invoke("put", file, "--kind-tag", "12", "--store", store)
      expect(named[1]).toBe("kind       0x0c  (scheme 0)")
      // A tag outside the byte plane never reaches the store: the
      // flag's own schema refuses it.
      const refused = yield* Effect.flip(
        invoke("put", file, "--kind-tag", "256", "--store", store),
      )
      expect(refusalText(refused)).toContain("--kind-tag")
    })))

it.effect("publish: the address becomes a root, and a root that will not load is refused", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const address = addressOf(yield* invoke("put", file, "--store", store))
      const published = yield* invoke("publish", address, "--store", store)
      expect(published[0]).toBe(`published  ${address}`)
      expect(published[1]).toBe("kind       0x01  (scheme 0)")
      // Published means listed.
      const listed = yield* invoke("ls", "--store", store)
      expect(listed).toEqual([`${address}  kind 0x01  0 links`])
      // Fail-closed: an address nothing is stored at never becomes a
      // root, and the refusal carries the store's own clause.
      const absent = "0".repeat(64)
      const refused = yield* Effect.flip(
        invoke("publish", absent, "--store", store),
      )
      expect(refusalText(refused)).toContain(`nothing in the store at ${absent}`)
      expect(yield* invoke("ls", "--store", store)).toEqual([
        `${address}  kind 0x01  0 links`,
      ])
      // And a string that is not an address is refused before the
      // store is asked anything.
      const malformed = yield* Effect.flip(invoke("publish", "nope", "--store", store))
      expect(refusalText(malformed)).toContain("not an address")
    })))

it.effect("verify: the audit runs from a named root, or over every published one", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      // Nothing published yet: the listing form says so rather than
      // failing.
      expect(yield* invoke("verify", "--store", store)).toEqual(["no roots published"])

      const address = addressOf(yield* invoke("put", file, "--store", store))
      yield* invoke("publish", address, "--store", store)

      const named = yield* invoke("verify", address, "--store", store)
      expect(named).toEqual([`${address}  verified  1 node`])
      expect(yield* invoke("verify", "--store", store)).toEqual([
        `${address}  verified  1 node`,
      ])

      // A named root the store cannot answer is the command's own
      // refusal — the verb is a gate.
      const absent = "0".repeat(64)
      const refused = yield* Effect.flip(invoke("verify", absent, "--store", store))
      expect(refusalText(refused)).toContain(`nothing in the store at ${absent}`)
    })))

/* ── the sqlite backend ───────────────────────────────────────────── */

it.effect("init --backend sqlite: the store is a config and a database, no directories", () =>
  withWorkspace(({ store }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      // The whole layout: the config that names the backend, and the
      // database beside it. No objects/, no roots/ — those are the
      // file backend's, and nothing writes them here.
      expect(yield* fs.exists(`${store}/cas.db`)).toBe(true)
      expect(yield* fs.exists(`${store}/objects`)).toBe(false)
      expect(yield* fs.exists(`${store}/roots`)).toBe(false)
      expect(yield* fs.readFileString(`${store}/config.json`)).toContain(
        `"backend": "sqlite"`,
      )

      // The config plus the database IS the store-root witness: init
      // refuses to create a second store over it, which is what
      // discovery recognizes too.
      const refused = yield* Effect.flip(
        invoke("init", "--bare", store, "--backend", "sqlite"),
      )
      expect(refusalText(refused)).toContain("a store already lives at")
    }), "sqlite"))

it.effect("the same verbs over a sqlite store: put, publish, ls, verify", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const lines = yield* invoke("put", file, "--store", store)
      const address = addressOf(lines)
      expect(address).toMatch(/^[0-9a-f]{64}$/u)
      expect(lines[2]).toBe("payload    14 bytes")
      // Content addressing over the database: the same bytes give the
      // same address back, and the payload reads back through the full
      // load law.
      expect(addressOf(yield* invoke("put", file, "--store", store))).toBe(address)
      expect((yield* invoke("show", address, "--store", store))[2]).toBe(
        "payload    hello foldlab\\n  (14 bytes)",
      )

      // The roots table is the naming plane: published means listed,
      // and re-publishing the same root leaves one row.
      expect(yield* invoke("ls", "--store", store)).toEqual(["no roots published"])
      yield* invoke("publish", address, "--store", store)
      yield* invoke("publish", address, "--store", store)
      expect(yield* invoke("ls", "--store", store)).toEqual([
        `${address}  kind 0x01  0 links`,
      ])

      expect(yield* invoke("verify", "--store", store)).toEqual([
        `${address}  verified  1 node`,
      ])

      // Fail-closed publication is the verb's gate, over this backend
      // as over the file one: the adapter never judges, so an address
      // nothing is stored at is refused before the row is written.
      const absent = "0".repeat(64)
      const refused = yield* Effect.flip(invoke("publish", absent, "--store", store))
      expect(refusalText(refused)).toContain(`nothing in the store at ${absent}`)
      expect(yield* invoke("ls", "--store", store)).toEqual([
        `${address}  kind 0x01  0 links`,
      ])

      // status states the layout it actually opened, and the backup
      // advice that goes with it.
      const reported = yield* invoke("status", "--store", store)
      expect(reported[0]).toBe(`store      ${store}  (sqlite backend)`)
      expect(reported[3]).toBe("roots      1 published")
      expect(reported.at(-1)).toContain("litestream")
    }), "sqlite"))

it.effect("verify: a corrupted object is refused at the node that witnesses it", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const address = addressOf(yield* invoke("put", file, "--store", store))
      yield* invoke("publish", address, "--store", store)
      // Rewrite the object file under the store's feet. The audit
      // recomputes every address, so the store cannot hide it — and
      // over every root the verdict is reported in place, the way `ls`
      // reports a root that will not load.
      yield* fs.writeFileString(
        `${store}/objects/${address.slice(0, 2)}/${address.slice(2)}`,
        "not a node",
      )
      const verdicts = yield* invoke("verify", "--store", store)
      expect(verdicts).toHaveLength(1)
      expect(verdicts[0]).toContain(address)
      expect(verdicts[0]).toContain("refused:")
      expect(verdicts[0]).not.toContain("verified")
    })))

it.effect("serve: the verb is wired, and reads the policy `init` writes", () =>
  withWorkspace(({ store }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      // `init` writes a policy whose reads are anonymous. Gate them,
      // and the MCP host refuses to serve the store over stdio instead
      // of answering reads the store's own config says to gate — the
      // one `ServePolicy` field that stops an invocation rather than
      // being reported as inapplicable.
      const configPath = `${store}/config.json`
      const config = JSON.parse(yield* fs.readFileString(configPath)) as {
        serve: { anonymousReads: boolean; credentialEnv?: string }
      }
      config.serve.anonymousReads = false
      config.serve.credentialEnv = "CAS_TOKEN"
      yield* fs.writeFileString(configPath, JSON.stringify(config, undefined, 2))

      const refusal = yield* Effect.flip(invoke("serve", "--store", store))
      const text = refusalText(refusal)
      expect(text).toContain("requires a credential for reads")
      expect(text).toContain("CAS_TOKEN")
    })))
