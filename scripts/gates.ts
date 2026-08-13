import { resolve } from "node:path"

type Stage = {
  readonly label: string
  readonly cwd: string
  readonly command: readonly [string, ...ReadonlyArray<string>]
  readonly requireEmptyStdout?: boolean
}

const repo = resolve(import.meta.dir, "..")

const stages: ReadonlyArray<Stage> = [
  {
    label: "bootstrap — Effect language-service prepare guard",
    cwd: repo,
    command: ["bun", "test", "./scripts/prepare-effect-language-service.test.ts"],
  },
  { label: "root — typecheck", cwd: repo, command: ["bun", "run", "typecheck"] },
  { label: "root — tests", cwd: repo, command: ["bun", "test"] },
  { label: "workspace packages — test scripts", cwd: repo, command: ["bun", "run", "test:packages"] },
  { label: "go — formatting", cwd: resolve(repo, "go"), command: ["gofmt", "-l", "."], requireEmptyStdout: true },
  { label: "go — vet", cwd: resolve(repo, "go"), command: ["go", "vet", "./..."] },
  { label: "go — tests", cwd: resolve(repo, "go"), command: ["go", "test", "./..."] },
  { label: "proto/go — formatting", cwd: resolve(repo, "proto/go"), command: ["gofmt", "-l", "."], requireEmptyStdout: true },
  { label: "proto/go — vet", cwd: resolve(repo, "proto/go"), command: ["go", "vet", "./..."] },
  { label: "proto/go — tests", cwd: resolve(repo, "proto/go"), command: ["go", "test", "./..."] },
  { label: "proto/ts — typecheck", cwd: resolve(repo, "proto/ts"), command: ["bunx", "tsc", "--noEmit"] },
  { label: "proto/ts — tests", cwd: resolve(repo, "proto/ts"), command: ["bun", "test", "."] },
]

const text = (bytes: Uint8Array | undefined): string =>
  bytes === undefined ? "" : new TextDecoder().decode(bytes)

const run = (stage: Stage): number => {
  console.log(`\n== ${stage.label}`)
  const result = Bun.spawnSync({
    cmd: [...stage.command],
    cwd: stage.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  })
  const stdout = text(result.stdout)
  const stderr = text(result.stderr)
  if (stdout !== "") process.stdout.write(stdout)
  if (stderr !== "") process.stderr.write(stderr)
  if (result.exitCode !== 0) return result.exitCode
  if (stage.requireEmptyStdout && stdout.trim() !== "") {
    console.error(`${stage.label}: REFUSED — the command must print nothing`)
    return 1
  }
  return 0
}

const selfTest = (): void => {
  const passing = run({
    label: "runner self-control — known pass",
    cwd: repo,
    command: ["bun", "-e", "process.exit(0)"],
  })
  if (passing !== 0) throw new Error("gate runner rejected its known-pass control")

  const failing = run({
    label: "runner self-control — planted failure",
    cwd: repo,
    command: ["bun", "-e", "console.error('planted gate failure'); process.exit(23)"],
  })
  if (failing !== 23) {
    throw new Error(`gate runner did not preserve the planted exit code: got ${failing}, want 23`)
  }

  const noisy = run({
    label: "runner self-control — planted formatting drift",
    cwd: repo,
    command: ["bun", "-e", "console.log('planted-unformatted-file.ts')"],
    requireEmptyStdout: true,
  })
  if (noisy !== 1) {
    throw new Error(`gate runner accepted planted formatting output: got ${noisy}, want 1`)
  }
  console.log(
    "\ngate runner self-test: PASS (known pass accepted; planted exit 23 and formatting drift refused)",
  )
}

if (process.argv.includes("--self-test")) {
  selfTest()
} else {
  for (const stage of stages) {
    const exitCode = run(stage)
    if (exitCode !== 0) process.exit(exitCode)
  }
  console.log("\nFOLDLAB GATES: PASS")
}
