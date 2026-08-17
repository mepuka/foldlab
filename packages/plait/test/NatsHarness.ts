import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join, resolve } from "node:path"

import { Schema } from "effect"

const Ports = Schema.Struct({ nats: Schema.Array(Schema.String) })
const goRoot = resolve(import.meta.dir, "../../../go")

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

export const startNatsHarness = async (): Promise<NatsHarness> => {
  const directory = await mkdtemp(join(tmpdir(), "plait-nats-"))
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

  const server = Bun.spawn({
    cmd: [
      binary,
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

export const waitForFile = async (path: string): Promise<void> => {
  for (let attempt = 0; attempt < 400; attempt++) {
    if (await Bun.file(path).exists()) return
    await Bun.sleep(25)
  }
  throw new Error(`timed out waiting for ${basename(path)}`)
}
