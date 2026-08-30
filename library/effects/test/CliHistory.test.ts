/**
 * `cas history`, driven the way a shell drives it — the same harness
 * discipline as `Cli.test.ts`, over a command tree of exactly the
 * verbs this suite exercises. Both layouts are under test, because
 * the claim is the seam's: the same history comes out of a directory
 * store and a database store.
 *
 * The suite runs on the LIVE clock (`it.live`): receipts carry the
 * admitting host's wall clock, and the rendering under test prints
 * it, so a virtual clock would test a rendering no user ever sees.
 */
import { expect, it } from "@effect/vitest"
import {
  Console,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
  Sink,
  Stdio,
  Stream,
  Terminal,
} from "effect"
import { Command } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"
import { init, put } from "../bin/cli/commands.ts"
import { history } from "../bin/cli/history.ts"
import { wordHistorySchema } from "../src/cas/generated/WordLogSchema.ts"
import { layerDiskFs } from "./fixtures/diskFs.ts"

const cas = Command.make("cas").pipe(
  Command.withSubcommands([init, put, history]),
)

const runCas = Command.runWith(cas, { version: "0.1.0", renderErrors: false })

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
      readInput: Effect.die("the history suite never reads input"),
      readLine: Effect.die("the history suite never reads input"),
      display: () => Effect.void,
    }),
  ),
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(() => Effect.die("the history suite spawns nothing")),
  ),
)

/** One invocation, with everything it printed. */
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

const withWorkspace = <A, E>(
  use: (workspace: { readonly store: string; readonly file: string }) => Effect.Effect<
    A,
    E,
    FileSystem.FileSystem
  >,
  backend: "file" | "sqlite" = "file",
): Effect.Effect<A, E | unknown> =>
  Effect.scoped(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* fs.makeTempDirectoryScoped({ prefix: "foldlab-history-" })
    const file = `${directory}/note.txt`
    yield* fs.writeFileString(file, "hello foldlab\n")
    yield* invoke("init", "--bare", directory, "--backend", backend)
    return yield* use({ store: directory, file })
  })).pipe(Effect.provide(layerDiskFs))

const addressOf = (lines: ReadonlyArray<string>): string =>
  lines[0]!.replace("address", "").trim()

/** The claims, once — run below over both layouts. */
const historyClaims = (backend: "file" | "sqlite") =>
  withWorkspace(({ file, store }) =>
    Effect.gen(function* () {
      // Before anything is admitted, the verb still answers at grade
      // A: what the silence means, and where the history will start.
      const empty = yield* invoke("history", "--store", store)
      expect(empty[0]).toContain("no history yet")
      expect(empty[1]).toBe("next mark  0")

      const first = addressOf(yield* invoke("put", file, "--store", store))
      // A duplicate put is the identity on the store and SILENT in the
      // history; a second file is a second receipt.
      yield* invoke("put", file, "--store", store)
      const fs = yield* FileSystem.FileSystem
      const other = `${store}/other.txt`
      yield* fs.writeFileString(other, "a second admission\n")
      const second = addressOf(yield* invoke("put", other, "--kind-tag", "12", "--store", store))

      // Admission order is the reading order: mark, when, address,
      // kind (named off the generated registry), payload size.
      const lines = yield* invoke("history", "--store", store)
      expect(lines).toHaveLength(3)
      expect(lines[0]).toMatch(
        new RegExp(`^0  \\d{4}-\\d{2}-\\d{2}T[\\d:]+Z  ${first}  value  14 bytes$`, "u"),
      )
      expect(lines[1]).toMatch(
        new RegExp(`^1  \\d{4}-\\d{2}-\\d{2}T[\\d:]+Z  ${second}  entry  19 bytes$`, "u"),
      )
      expect(lines[2]).toBe("next mark  2")

      // `--since` consumes the word semantics: the suffix from a mark,
      // and past the end an honest "nothing" that still says where the
      // history stands.
      const suffix = yield* invoke("history", "--since", "1", "--store", store)
      expect(suffix).toHaveLength(2)
      expect(suffix[0]).toContain(second)
      const beyond = yield* invoke("history", "--since", "7", "--store", store)
      expect(beyond[0]).toBe("nothing since mark 7")
      expect(beyond[1]).toBe("next mark  2")

      // `--json` is the registered history document, decodable through
      // the generated word-wire schema — the front end's feed.
      const json = yield* invoke("history", "--json", "--store", store)
      expect(json).toHaveLength(1)
      const document = Schema.decodeUnknownSync(wordHistorySchema)(JSON.parse(json[0]!))
      expect(document.next).toBe(2)
      expect(document.word.map((entry) => entry.address)).toEqual([first, second])
      expect(document.word.map((entry) => entry.seq)).toEqual([0, 1])
    }), backend)

it.live("history: admission order, marks, kinds, and the registered --json document (file store)", () =>
  historyClaims("file"))

it.live("history: the same claims over the database layout", () =>
  historyClaims("sqlite"))
