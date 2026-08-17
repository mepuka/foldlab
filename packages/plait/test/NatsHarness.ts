import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"

import { Schema } from "effect"

const Ports = Schema.Struct({ nats: Schema.Array(Schema.String) })
const goRoot = resolve(import.meta.dir, "../../../go")

export interface NatsServerBinary {
  readonly binary: string
  readonly cleanup: () => Promise<void>
}

export interface NatsHarness {
  readonly url: string
  readonly directory: string
  readonly stop: () => Promise<void>
}

const waitForPorts = async (directory: string): Promise<string> => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const file = (await readdir(directory)).find((name) => name.endsWith(".ports"))
    if (file !== undefined) return join(directory, file)
    await Bun.sleep(25)
  }
  throw new Error("nats-server did not write its ports file within 5 seconds")
}

/** Builds the pinned upstream nats-server once from the Go module lock. */
export const buildServerBinary = async (): Promise<NatsServerBinary> => {
  const directory = await mkdtemp(join(tmpdir(), "plait-nats-bin-"))
  const binary = join(directory, process.platform === "win32" ? "nats-server.exe" : "nats-server")
  const build = Bun.spawnSync({
    cmd: ["go", "build", "-o", binary, "github.com/nats-io/nats-server/v2"],
    cwd: goRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  if (build.exitCode !== 0) {
    await rm(directory, { recursive: true, force: true })
    throw new Error(`build nats-server: ${build.stderr.toString()}`)
  }
  const version = Bun.spawnSync({ cmd: [binary, "-v"], stdout: "pipe", stderr: "pipe" })
  if (version.exitCode !== 0 || !version.stdout.toString().includes("v2.14.4")) {
    await rm(directory, { recursive: true, force: true })
    throw new Error(`wrong nats-server pin: ${version.stdout.toString()}${version.stderr.toString()}`)
  }
  return {
    binary,
    cleanup: async () => {
      await rm(directory, { recursive: true, force: true })
    },
  }
}

/**
 * Starts one fresh single-node JetStream server on a fresh file store.
 * Row isolation is a fresh server, never bucket destroy+recreate: bucket
 * lifecycle mutation resets the revision order, which is exactly the
 * fixed-incarnation edge the register's claims exclude (seam rule 7).
 */
export const startNatsServer = async (prebuilt: string): Promise<NatsHarness> => {
  const directory = await mkdtemp(join(tmpdir(), "plait-nats-"))
  const server = Bun.spawn({
    cmd: [
      prebuilt,
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

/** Builds the pinned binary and starts one server; stop() cleans up both. */
export const startNatsHarness = async (): Promise<NatsHarness> => {
  const built = await buildServerBinary()
  let harness: NatsHarness
  try {
    harness = await startNatsServer(built.binary)
  } catch (error) {
    await built.cleanup()
    throw error
  }
  return {
    url: harness.url,
    directory: harness.directory,
    stop: async () => {
      await harness.stop()
      await built.cleanup()
    },
  }
}

export const waitForFile = async (path: string): Promise<void> => {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (await Bun.file(path).exists()) return
    await Bun.sleep(25)
  }
  throw new Error(`timed out waiting for ${basename(path)}`)
}
