import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"

import { Schema } from "effect"

const Ports = Schema.Struct({ nats: Schema.Array(Schema.String) })
const goRoot = resolve(import.meta.dir, "../../../go")

/**
 * The pin the Go module lock must resolve to. It names the cache directory as
 * well as the check, so moving the pin moves the cached path with it.
 */
const serverPin = "v2.14.4"
const binaryName = process.platform === "win32" ? "nats-server.exe" : "nats-server"
const cacheRoot = resolve(import.meta.dir, "../node_modules/.cache/plait-nats-server")
const cachedBinary = join(cacheRoot, serverPin, binaryName)

export interface NatsServerBinary {
  readonly binary: string
}

export interface NatsHarness {
  readonly url: string
  readonly directory: string
  readonly stop: () => Promise<void>
}

export interface NatsServerOptions {
  /** Additional server configuration, used by walls that exercise authorization. */
  readonly configuration?: string
}

const waitForPorts = async (directory: string): Promise<string> => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const file = (await readdir(directory)).find((name) => name.endsWith(".ports"))
    if (file !== undefined) return join(directory, file)
    await Bun.sleep(25)
  }
  throw new Error("nats-server did not write its ports file within 5 seconds")
}

/** Reports whether a built server answers `-v` with the pin this harness binds. */
const answersToPin = (binary: string): boolean => {
  const version = Bun.spawnSync({ cmd: [binary, "-v"], stdout: "pipe", stderr: "pipe" })
  return version.exitCode === 0 && version.stdout.toString().includes(serverPin)
}

const compileServerBinary = async (): Promise<NatsServerBinary> => {
  if (existsSync(cachedBinary) && answersToPin(cachedBinary)) return { binary: cachedBinary }

  await mkdir(cacheRoot, { recursive: true })
  const staging = await mkdtemp(join(cacheRoot, "staging-"))
  const staged = join(staging, binaryName)
  try {
    const build = Bun.spawnSync({
      cmd: ["go", "build", "-o", staged, "github.com/nats-io/nats-server/v2"],
      cwd: goRoot,
      stdout: "pipe",
      stderr: "pipe",
    })
    if (build.exitCode !== 0) {
      throw new Error(`build nats-server: ${build.stderr.toString()}`)
    }
    const version = Bun.spawnSync({ cmd: [staged, "-v"], stdout: "pipe", stderr: "pipe" })
    if (version.exitCode !== 0 || !version.stdout.toString().includes(serverPin)) {
      throw new Error(`wrong nats-server pin: ${version.stdout.toString()}${version.stderr.toString()}`)
    }
    await mkdir(dirname(cachedBinary), { recursive: true })
    // Publish by rename inside the same cache root, so no reader can ever
    // observe a half-linked binary and a loser of the race leaves the winner's
    // file untouched. Windows refuses to replace an existing destination; that
    // arm falls through to the same `-v` check, which is the only thing that
    // decides whether a file at the cached path may be used.
    try {
      await rename(staged, cachedBinary)
    } catch (cause) {
      if (!answersToPin(cachedBinary)) {
        throw new Error(`publish nats-server: ${String(cause)}`)
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
  return { binary: cachedBinary }
}

let compiled: Promise<NatsServerBinary> | undefined

/**
 * Resolves the pinned upstream nats-server, building it from the Go module
 * lock only when the cache has no binary that answers to the pin.
 *
 * The binary is CONTENT, not incarnation: seam rule 7 binds row isolation to a
 * fresh server on a fresh store on a fresh port, and `startNatsServer` still
 * mints all three per call. Rebuilding the same pinned executable at each of
 * the seventeen call sites bought no isolation, so the build lands once at a
 * path keyed by the pin and is shared from there. The `-v` check did not move:
 * it now gates REUSE as well as construction, so a cached file that is not the
 * pin is rebuilt rather than trusted.
 */
export const buildServerBinary = (): Promise<NatsServerBinary> => {
  // A rejected build is not memoized: the failure is usually a missing or
  // wrong Go toolchain, and a caller that fixes it mid-suite deserves a retry
  // rather than a cached refusal.
  compiled ??= compileServerBinary().catch((cause: unknown) => {
    compiled = undefined
    throw cause
  })
  return compiled
}

/**
 * Starts one fresh single-node JetStream server on a fresh file store.
 * Row isolation is a fresh server, never bucket destroy+recreate: bucket
 * lifecycle mutation resets the revision order, which is exactly the
 * fixed-incarnation edge the register's claims exclude (seam rule 7).
 */
export const startNatsServer = async (
  prebuilt: string,
  options: NatsServerOptions = {},
): Promise<NatsHarness> => {
  const directory = await mkdtemp(join(tmpdir(), "plait-nats-"))
  const configurationPath = join(directory, "nats.conf")
  if (options.configuration !== undefined) {
    await writeFile(configurationPath, options.configuration, "utf8")
  }
  const server = Bun.spawn({
    cmd: [
      prebuilt,
      ...(options.configuration === undefined ? [] : ["-c", configurationPath]),
      "-js",
      "-sd",
      join(directory, "store"),
      "-a",
      "127.0.0.1",
      "-p",
      "-1",
      "--ports_file_dir",
      directory,
    ],
    cwd: goRoot,
    stdout: "ignore",
    stderr: "ignore",
  })

  try {
    const portsPath = await waitForPorts(directory)
    const ports = Schema.decodeUnknownSync(Ports)(
      JSON.parse(await readFile(portsPath, "utf8")),
      { onExcessProperty: "ignore" },
    )
    const url = ports.nats[0]
    if (url === undefined) throw new Error("nats-server ports file has no client URL")
    return {
      url,
      directory,
      stop: async () => {
        server.kill()
        await server.exited
        await rm(directory, { recursive: true, force: true })
      },
    }
  } catch (error) {
    server.kill()
    await server.exited
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

/** Resolves the pinned binary and starts one fresh server on it. */
export const startNatsHarness = async (options: NatsServerOptions = {}): Promise<NatsHarness> =>
  startNatsServer((await buildServerBinary()).binary, options)

export const waitForFile = async (path: string): Promise<void> => {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (await Bun.file(path).exists()) return
    await Bun.sleep(25)
  }
  throw new Error(`timed out waiting for ${basename(path)}`)
}
