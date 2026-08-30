/**
 * The shell surface, driven the way a shell drives it: every case here
 * runs the REAL command tree — the same `cas` value `bin/cas.ts` hands
 * to the runner — over an argument vector, so flags, arguments, the
 * store resolution, and the refusal rendering are all under test and
 * none of them is re-spelled here.
 *
 * `bin/cli/entry.ts`'s own runner is the door: the argv is explicit
 * instead of the process's, and everything else — the deferring
 * formatter, the refusal register — is exactly what ships. The platform
 * is the test one — a drained `Stdio`, a terminal that is never read,
 * no child processes — and the `Console` is a capturing service, so the
 * assertions read exactly the lines a user would see, in both registers.
 * `--store` is named on almost every invocation, which keeps the suite
 * hermetic: the flag is present, so the `CAS_STORE` fallback and walk-up
 * discovery are never consulted. The cases that are ABOUT resolution
 * name it deliberately and say so.
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
import { CliError } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"
import { runCas as runEntry } from "../bin/cli/entry.ts"
import { casErrorMessage } from "../bin/cli/render.ts"
import { cas } from "../bin/cli/tree.ts"
import { AddressMismatch, ContentId } from "../src/cas/Node.ts"
import { vocabularyWords } from "../bin/cli/vocabulary.ts"
import { layerDiskFs } from "./fixtures/diskFs.ts"

/** THE tree and THE runner the binary uses — imported, not composed
 * again, so this suite cannot pass over an arrangement that only
 * resembles what ships. */
const runCas = runEntry(cas, { version: "0.1.0" })

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

/** One invocation, with both registers captured: `out` is what the
 * verb printed for a reader or a machine, `err` is what it said
 * alongside — the refusal rendering and `put`'s working-tag note. They
 * are kept apart because the whole point of `--json` is that one of
 * them is a single parseable object and the other is not. */
const invokeBoth = (
  ...args: ReadonlyArray<string>
): Effect.Effect<
  { readonly out: ReadonlyArray<string>; readonly err: ReadonlyArray<string> },
  unknown,
  FileSystem.FileSystem
> => {
  const out: Array<string> = []
  const err: Array<string> = []
  const capturing: Console.Console = Object.assign(Object.create(console), {
    log: (...parts: ReadonlyArray<unknown>) => {
      out.push(parts.map(String).join(" "))
    },
    error: (...parts: ReadonlyArray<unknown>) => {
      err.push(parts.map(String).join(" "))
    },
  })
  return runCas(args).pipe(
    Effect.provideService(Console.Console, capturing),
    Effect.provide(layerCliEnvironment),
    Effect.as({ err: err as ReadonlyArray<string>, out: out as ReadonlyArray<string> }),
  )
}

/** One invocation, with everything it printed. The lines are what the
 * verb logged, in order. */
const invoke = (
  ...args: ReadonlyArray<string>
): Effect.Effect<ReadonlyArray<string>, unknown, FileSystem.FileSystem> =>
  invokeBoth(...args).pipe(Effect.map((both) => both.out))

/** What an invocation PRINTED, whether it succeeded or not — both
 * registers, joined. `Effect.flip` reads the error VALUE; this reads
 * the surface a person actually sees, which is what the audit graded.
 * It is also how a bare `cas` is read: printing help and then failing
 * with `ShowHelp` at exit code 0 is the runner's own contract. */
const printed = (
  ...args: ReadonlyArray<string>
): Effect.Effect<{ readonly out: string; readonly err: string }, never, FileSystem.FileSystem> => {
  const out: Array<string> = []
  const err: Array<string> = []
  const capturing: Console.Console = Object.assign(Object.create(console), {
    log: (...parts: ReadonlyArray<unknown>) => {
      out.push(parts.map(String).join(" "))
    },
    error: (...parts: ReadonlyArray<unknown>) => {
      err.push(parts.map(String).join(" "))
    },
  })
  return runCas(args).pipe(
    Effect.provideService(Console.Console, capturing),
    Effect.provide(layerCliEnvironment),
    Effect.ignore,
    // `map` and not `as`: the lines are collected while the invocation
    // runs, and `as` would read the arrays before they had any.
    Effect.map(() => ({ err: err.join("\n"), out: out.join("\n") })),
  ) as Effect.Effect<{ readonly out: string; readonly err: string }, never, FileSystem.FileSystem>
}

/** Just the refusal register of an invocation that was meant to fail. */
const printedRefusal = (
  ...args: ReadonlyArray<string>
): Effect.Effect<string, never, FileSystem.FileSystem> =>
  printed(...args).pipe(Effect.map((both) => both.err))

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
const refusalText = (error: unknown): string => {
  if (error instanceof CliError.ShowHelp) {
    return error.errors.map((member) => member.message).join("\n")
  }
  if (error instanceof CliError.UserError) {
    return error.userMessage ?? String(error.cause)
  }
  return String(error)
}

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
      expect(lines[1]).toBe("kind       value (0x01)  (scheme 0)")
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
      expect(named[1]).toBe("kind       entry (0x0c)  (scheme 0)")
      // A tag outside the byte plane never reaches the store, and the
      // refusal is the estate's own sentence — not the parser's, and
      // with no help document in front of it.
      const refused = yield* Effect.flip(
        invoke("put", file, "--kind-tag", "256", "--store", store),
      )
      expect(refusalText(refused)).toContain(
        "not a kind tag: 256 — a kind tag is one byte, 0 to 255",
      )
      const printed = yield* printedRefusal("put", file, "--kind-tag", "256", "--store", store)
      expect(printed).toContain("ERROR")
      expect(printed).not.toContain("USAGE")
      expect(printed).not.toContain("GLOBAL FLAGS")
    })))

it.effect("put: a file that is not there is refused in house words, not the parser's", () =>
  withWorkspace(({ store }) =>
    Effect.gen(function* () {
      const missing = `${store}/nothing-here.txt`
      const refused = yield* Effect.flip(invoke("put", missing, "--store", store))
      expect(refusalText(refused)).toContain(`no file at ${missing}`)
      // The audit's grade-D shape: twenty lines of help above the one
      // line that mattered. It must not come back.
      const printed = yield* printedRefusal("put", missing, "--store", store)
      expect(printed).not.toContain("USAGE")
      expect(printed).not.toContain("GLOBAL FLAGS")
      expect(printed).toContain("put reads a file's bytes")
    })))

it.effect("put: a tag with no registry row is admitted, and said out loud", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      // 0xc8 is not a registry row. The store admits every tag at the
      // scheme version, so this is a note and not a refusal — and it
      // goes to stderr, which is what leaves `--json`'s object alone.
      const working = yield* invokeBoth("put", file, "--kind-tag", "200", "--store", store)
      expect(working.out[1]).toBe("kind       0xc8  (scheme 0)")
      expect(working.err.join("\n")).toContain("kind 0xc8 has no registry row")
      expect(working.err.join("\n")).toContain("REGISTRY.md")
      // A registered tag says nothing extra.
      const registered = yield* invokeBoth("put", file, "--kind-tag", "83", "--store", store)
      expect(registered.out[1]).toBe("kind       schema (0x53)  (scheme 0)")
      expect(registered.err).toEqual([])
    })))

it.effect("publish: the address becomes a root, and a root that will not load is refused", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const address = addressOf(yield* invoke("put", file, "--store", store))
      const published = yield* invoke("publish", address, "--store", store)
      expect(published[0]).toBe(`published  ${address}`)
      expect(published[1]).toBe("kind       value (0x01)  (scheme 0)")
      // Published means listed.
      const listed = yield* invoke("ls", "--store", store)
      expect(listed).toEqual([`${address}  kind value (0x01)  0 links`])
      // Fail-closed: an address nothing is stored at never becomes a
      // root, and the refusal carries the store's own clause.
      const absent = "0".repeat(64)
      const refused = yield* Effect.flip(
        invoke("publish", absent, "--store", store),
      )
      expect(refusalText(refused)).toContain(`nothing in the store at ${absent}`)
      expect(yield* invoke("ls", "--store", store)).toEqual([
        `${address}  kind value (0x01)  0 links`,
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
        `${address}  kind value (0x01)  0 links`,
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
        `${address}  kind value (0x01)  0 links`,
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

/* ── the phantom store, closed ─────────────────────────────────────── */

/**
 * THE ALARM CASE (CLI audit E11/E13/E15, decision 24's BROKEN-SILENT
 * category). `locateStore` resolved an explicitly named path without
 * ever asking whether it was a store, and the file backend makes its
 * own layout on write — so a typo'd `--store` silently CREATED a
 * second, phantom store that `status` then reported as real. No case
 * in this file exercised an explicit non-store path, which is exactly
 * why it survived.
 *
 * These cases are that hole, closed: every verb refuses, and the
 * directory is still not there afterwards.
 */
it.effect("--store at a path that is not a store refuses, and creates nothing", () =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-cli-ghost-" })
    const ghost = `${directory}/typo`
    const file = `${directory}/note.txt`
    yield* fs.writeFileString(file, "hello foldlab\n")

    // Read, write, and publish: the three the audit graded F, plus the
    // verbs that reach the same resolution.
    for (
      const args of [
        ["status", "--store", ghost],
        ["put", file, "--store", ghost],
        ["publish", "0".repeat(64), "--store", ghost],
        ["ls", "--store", ghost],
        ["verify", "--store", ghost],
        ["doctor", "--store", ghost],
      ]
    ) {
      const refused = yield* Effect.flip(invoke(...args))
      const text = refusalText(refused)
      // The guidance names the path, says why nothing else was
      // searched, and ends on the one verb that creates a store.
      expect(text).toContain(`no store at ${ghost}`)
      expect(text).toContain("named outright by --store or CAS_STORE")
      expect(text).toContain("cas init --bare <directory>")
      // And nothing was made on the way to saying so.
      expect(yield* fs.exists(ghost)).toBe(false)
    }
  })).pipe(Effect.provide(layerDiskFs)))

it.effect("the CAS_STORE path is refused by the same branch as the flag", () =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-cli-env-" })
    const ghost = `${directory}/typo`
    // `CAS_STORE` arrives through the SAME channel as the flag —
    // `Flag.withFallbackConfig` resolves the environment into the
    // flag's own value before `locateStore` is reached — so an
    // explicitly named path is one branch with two sources, and this
    // asserts the refusal names both of them.
    const refused = yield* Effect.flip(invoke("status", "--store", ghost))
    expect(refusalText(refused)).toContain(`no store at ${ghost}`)
    expect(refusalText(refused)).toContain("--store or CAS_STORE")
    expect(yield* fs.exists(ghost)).toBe(false)
  })).pipe(Effect.provide(layerDiskFs)))

it.effect("init then put still works — the refusal gates typos, not the workflow", () =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-cli-flow-" })
    const store = `${directory}/store`
    const file = `${directory}/note.txt`
    yield* fs.writeFileString(file, "hello foldlab\n")

    // Before init the path refuses; after init the same path works.
    expect(refusalText(yield* Effect.flip(invoke("put", file, "--store", store))))
      .toContain(`no store at ${store}`)
    yield* invoke("init", "--bare", store)
    const put = yield* invoke("put", file, "--store", store)
    expect(addressOf(put)).toMatch(/^[0-9a-f]{64}$/u)
    expect(yield* invoke("status", "--store", store)).toContainEqual("objects    1")
  })).pipe(Effect.provide(layerDiskFs)))

it.effect("a store the config alone claims is still not a store", () =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-cli-half-" })
    // A config naming the sqlite backend with no database beside it is
    // a half-created store, and `isStoreRoot` already says no. The
    // explicit branch must ask the same question the walk-up does —
    // that is the whole content of the fix.
    yield* fs.writeFileString(`${directory}/config.json`, `{"backend":"sqlite"}`)
    expect(refusalText(yield* Effect.flip(invoke("status", "--store", directory))))
      .toContain(`no store at ${directory}`)
  })).pipe(Effect.provide(layerDiskFs)))

/* ── the config refusals ───────────────────────────────────────────── */

it.effect("a config that will not read names the file and the fix", () =>
  withWorkspace(({ store }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const configPath = `${store}/config.json`

      // E16: not JSON at all.
      yield* fs.writeFileString(configPath, "not json at all")
      const malformed = refusalText(yield* Effect.flip(invoke("status", "--store", store)))
      expect(malformed).toContain(configPath)
      expect(malformed).toContain("the file is not valid JSON")
      expect(malformed).toContain("cas init writes it as")

      // E17: a backend this build does not have. The two legal words
      // are said, rather than a schema union rendering.
      yield* fs.writeFileString(configPath, `{"backend":"postgres"}`)
      const wrong = refusalText(yield* Effect.flip(invoke("status", "--store", store)))
      expect(wrong).toContain(configPath)
      expect(wrong).toContain(`"backend" says "postgres"`)
      expect(wrong).toContain(`"file" (a directory of objects)`)
      expect(wrong).toContain(`"sqlite" (one cas.db)`)

      // A config with no backend at all is its own clause.
      yield* fs.writeFileString(configPath, `{}`)
      expect(refusalText(yield* Effect.flip(invoke("status", "--store", store))))
        .toContain(`"backend" is missing`)
    })))

/* ── the machine register ──────────────────────────────────────────── */

/** One JSON object, parsed. That it parses at all is the first thing
 * `--json` owes an agent. */
const oneObject = (lines: ReadonlyArray<string>): Record<string, unknown> => {
  expect(lines).toHaveLength(1)
  return JSON.parse(lines[0]!) as Record<string, unknown>
}

it.effect("--json: status, ls, verify, put and publish answer as one object", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const empty = oneObject(yield* invoke("status", "--store", store, "--json"))
      expect(empty["store"]).toBe(store)
      expect(empty["backend"]).toBe("file")
      expect(empty["origin"]).toBe("explicit")
      expect(empty["objects"]).toBe(0)
      expect(empty["roots"]).toBe(0)
      // The policy `init` writes, field for field — the same numbers
      // the prose line prints.
      expect(empty["serve"]).toMatchObject({
        anonymousReads: true,
        maxBatchKeys: 64,
        maxInFlight: 64,
        maxNodeBytes: 1_048_576,
        port: 8080,
      })

      // Nothing published: an empty list, not an absent key — an agent
      // must be able to read "no roots" without special-casing.
      expect(oneObject(yield* invoke("ls", "--store", store, "--json"))["roots"]).toEqual([])
      expect(oneObject(yield* invoke("verify", "--store", store, "--json"))["roots"]).toEqual([])

      const put = oneObject(yield* invoke("put", file, "--store", store, "--json"))
      const address = put["address"] as string
      expect(address).toMatch(/^[0-9a-f]{64}$/u)
      expect(put["bytes"]).toBe(14)
      // The kind carries all three facts, so nothing has to parse
      // "value (0x01)" back apart.
      expect(put["kind"]).toEqual({ name: "value", registered: true, tag: 1, version: 0 })

      const published = oneObject(yield* invoke("publish", address, "--store", store, "--json"))
      expect(published["published"]).toBe(address)

      expect(oneObject(yield* invoke("ls", "--store", store, "--json"))["roots"]).toEqual([
        {
          address,
          kind: { name: "value", registered: true, tag: 1, version: 0 },
          links: 0,
          refused: null,
        },
      ])

      expect(oneObject(yield* invoke("verify", "--store", store, "--json"))["roots"]).toEqual([
        { address, nodes: 1, refused: null, verified: true },
      ])

      // The named-root form answers in the same shape as the listing
      // one, so an agent parses one thing.
      expect(oneObject(yield* invoke("verify", address, "--store", store, "--json"))["roots"])
        .toEqual([{ address, nodes: 1, refused: null, verified: true }])
    })))

it.effect("--json: a root that will not load is reported, not dropped", () =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const address = addressOf(yield* invoke("put", file, "--store", store))
      yield* invoke("publish", address, "--store", store)
      yield* fs.writeFileString(
        `${store}/objects/${address.slice(0, 2)}/${address.slice(2)}`,
        "not a node",
      )
      // `verified: false` with the clause beside it: an agent branches
      // on the boolean and reads the reason from the same row.
      const verdicts = oneObject(yield* invoke("verify", "--store", store, "--json"))
      const row = (verdicts["roots"] as ReadonlyArray<Record<string, unknown>>)[0]!
      expect(row["address"]).toBe(address)
      expect(row["verified"]).toBe(false)
      expect(row["nodes"]).toBe(null)
      expect(String(row["refused"])).toContain("refused:")

      const listed = oneObject(yield* invoke("ls", "--store", store, "--json"))
      const listedRow = (listed["roots"] as ReadonlyArray<Record<string, unknown>>)[0]!
      expect(listedRow["address"]).toBe(address)
      expect(listedRow["kind"]).toBe(null)
      expect(String(listedRow["refused"])).toContain("refused:")
    })))

it.effect("--json: init answers the store it made", () =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-cli-init-" })
    const store = `${directory}/store`
    expect(oneObject(yield* invoke("init", "--bare", store, "--json"))).toEqual({
      backend: "file",
      bare: true,
      config: `${store}/config.json`,
      created: true,
      store,
    })
  })).pipe(Effect.provide(layerDiskFs)))

/* ── the checkup ───────────────────────────────────────────────────── */

it.effect("doctor: the emitted ledgers are read, and their counters said out loud", () =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    // The lab is THIS checkout, reached from the working directory the
    // suite runs in: the ledgers under test are the ones the emitters
    // actually wrote, so this case fails if a reader here drifts from
    // the shape an emitter produces.
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-cli-lab-" })
    const store = `${directory}/store`
    yield* invoke("init", "--bare", store)

    const json = oneObject(yield* invoke("doctor", "--store", store, "--json"))
    expect(typeof json["lab"]).toBe("string")
    const ledgers = json["ledgers"] as Record<string, Record<string, unknown>>
    for (const name of ["admissionMap", "environment", "laws", "obligations"]) {
      expect(ledgers[name]!["state"]).toBe("read")
      expect(ledgers[name]!["facts"]).not.toBe(null)
    }
    // Counters, not re-derivations: every number here is one an emitter
    // already wrote down.
    expect(ledgers["laws"]!["facts"]).toMatchObject({ rulings: expect.any(Number) })
    expect(ledgers["admissionMap"]!["facts"]).toMatchObject({ rows: expect.any(Number) })
    expect(ledgers["obligations"]!["facts"]).toMatchObject({ discharged: expect.any(Number) })
    expect(ledgers["environment"]!["facts"]).toMatchObject({ pins: expect.any(Array) })

    const prose = (yield* invoke("doctor", "--store", store)).join("\n")
    for (const label of ["lab", "toolchain", "laws", "obligations", "admission"]) {
      expect(prose).toContain(`\n${label}`)
    }
  })).pipe(Effect.provide(layerDiskFs)))

it.effect("doctor: the store block states the store, line for line", () =>
  withWorkspace(({ store }) =>
    Effect.gen(function* () {
      const lines = yield* invoke("doctor", "--store", store)
      // Whole-line equality, not `toContain`: the first rendering of
      // this block printed a stray array index after every line —
      // `Effect.forEach` hands its callback the index, and a point-free
      // `Console.log` printed it — and `toContain` was happy with it.
      expect(lines[0]).toBe(`store        ${store}  (file backend)`)
      expect(lines[1]).toBe(`config       ${store}/config.json — reads`)
      expect(lines[2]).toBe("objects      0")
      expect(lines[3]).toBe("roots        0 published")
      expect(lines[4]).toContain("serve        port 8080")
      expect(lines[5]).toBe("")

      const json = oneObject(yield* invoke("doctor", "--store", store, "--json"))
      expect(json["store"]).toMatchObject({ backend: "file", objects: 0, roots: 0, store })
    })))

it.effect("doctor: a config that will not read refuses the checkup", () =>
  withWorkspace(({ store }) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      yield* fs.writeFileString(`${store}/config.json`, "not json")
      // `doctor` is where config validation finally has a home, so it
      // must never report a store as well over a config it could not
      // decode.
      expect(refusalText(yield* Effect.flip(invoke("doctor", "--store", store))))
        .toContain("the file is not valid JSON")
    })))

/* ── the parser's own refusals ─────────────────────────────────────── */

it.effect("a shape mistake answers in the everyday register, with no help dump", () =>
  withWorkspace(({ store }) =>
    Effect.gen(function* () {
      // A misspelled flag: the verb's own flags are listed, and the
      // runner's suggestion is passed on.
      const flag = yield* printedRefusal("status", "--store", store, "--jsom")
      expect(flag).toContain("no such flag: --jsom")
      expect(flag).toContain("this verb takes: --store, --json")
      expect(flag).toContain("usage: cas status [flags]")
      expect(flag).not.toContain("GLOBAL FLAGS")
      expect(flag).not.toContain("DESCRIPTION")

      // A misspelled verb: the verbs are listed.
      const verb = yield* printedRefusal("frobnicate")
      expect(verb).toContain("no such verb: frobnicate")
      expect(verb).toContain("the verbs are: init, status, doctor, put")
      expect(verb).not.toContain("GLOBAL FLAGS")

      // A missing argument: named, with its own description.
      const missing = yield* printedRefusal("show", "--store", store)
      expect(missing).toContain("missing address")
      expect(missing).toContain("the 64-hex address to load")
      expect(missing).toContain("usage: cas show [flags] <address>")
      expect(missing).not.toContain("GLOBAL FLAGS")
    })))

it.effect("help asked for is still help", () =>
  Effect.gen(function* () {
    // The deferring formatter must not swallow the document a reader
    // actually wanted. `--help` asks for it outright; a bare `cas`
    // gets it because a parent command has no handler, which the
    // runner signals as a `ShowHelp` carrying no errors at exit code
    // zero. Both print the document, and neither prints a refusal.
    const asked = yield* printed("--help")
    expect(asked.out).toContain("SUBCOMMANDS")
    expect(asked.out).toContain("the words (see library/effects/VOCABULARY.md)")
    expect(asked.err).toBe("")

    const bare = yield* printed()
    expect(bare.out).toContain("SUBCOMMANDS")
    expect(bare.out).toContain("the words (see library/effects/VOCABULARY.md)")
    expect(bare.err).toBe("")
  }).pipe(Effect.provide(layerDiskFs)))

/* ── the vocabulary, gated against its seed ────────────────────────── */

it.effect("the help vocabulary carries every word VOCABULARY.md's everyday register does", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    // VOCABULARY.md calls itself "the seed that content derives from —
    // never a second, drifting copy". `bin/cli/vocabulary.ts` IS a hand
    // copy, so this case is what keeps that sentence true: the seed's
    // table is parsed, and the two must agree word for word and in
    // order. Freshness defect F2 was exactly this drift, undetected.
    const source = yield* fs.readFileString(
      new URL("../VOCABULARY.md", import.meta.url).pathname,
    )
    const table = source.split("## The everyday register")[1]!
      .split("## The protocol register")[0]!
    const seeded = table.split("\n")
      .filter((line) => line.startsWith("|"))
      .map((line) => line.split("|")[1]!.trim())
      // The header row and its dashes are not words.
      .filter((word) => word !== "Word" && !word.startsWith("---"))

    expect(seeded.length).toBeGreaterThan(0)
    expect(vocabularyWords.map(([word]) => word)).toEqual(seeded)
  }).pipe(Effect.provide(layerDiskFs)))

/* ── the digest-mismatch diagnostic names both readings (R5) ───────── */

it("a digest mismatch says it may be a scheme mismatch, not only corruption", () => {
  // Ruling ask R5 (BACKEND-ROBUSTNESS): verification recomputes with the
  // ambient scheme, so under a second same-width scheme every cross-scheme
  // read surfaces as AddressMismatch. The refusal must not present corrupt
  // content as the only reading — the cheap half of R5 is that the message
  // names the other one.
  const message = casErrorMessage(
    new AddressMismatch({
      expected: ContentId.make("ab".repeat(32)),
      actual: ContentId.make("cd".repeat(32)),
    }),
  )
  expect(message).toContain("refused:")
  expect(message).toContain("possible scheme mismatch")
})
