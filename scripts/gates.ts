import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"

type Stage = {
  readonly label: string
  readonly cwd: string
  readonly command: readonly [string, ...ReadonlyArray<string>]
  readonly requireEmptyStdout?: boolean
}

type InstallTarget = {
  readonly label: string
  readonly directory: string
  readonly lockfile: string
}

type Install = (target: InstallTarget) => number

const repo = resolve(import.meta.dir, "..")

const installTargets: ReadonlyArray<InstallTarget> = [
  {
    label: "root dependencies",
    directory: repo,
    lockfile: resolve(repo, "bun.lock"),
  },
  {
    label: "proto/ts dependencies",
    directory: resolve(repo, "proto/ts"),
    lockfile: resolve(repo, "proto/ts/bun.lock"),
  },
]

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
  // `-count=1` on EVERY Go test stage, because the hazard is a property of the
  // class and not of the one member that was measured first. Go's test cache
  // records only the opened files it can attribute to the package's own module
  // root, so a fixture read from OUTSIDE the module is invisible to the cache
  // key and `go test ./...` reports `ok (cached)` over a mutated one. All four
  // present cross-module readers were measured, each stale-passing under a
  // one-byte mutation and failing under `-count=1`:
  //   foldlab/canonical       → fixtures/golden-conformance.json, jcs-rfc8785.json
  //   foldlab/journal         → proto/wire/fixtures/chains.json
  //   foldlab/proto/protod    → proto/wire/fixtures/*, proto/wire/refusal-sorts.json
  //   foldlab/proto/catalogr4 → proto/wire/reply-conformance.json
  // A wall that can report a stale pass on exactly the input it exists to watch
  // is worse than no wall, because it is believed. Arming the stage rather than
  // the package is what keeps a reader added tomorrow from inheriting the gap.
  { label: "go — tests", cwd: resolve(repo, "go"), command: ["go", "test", "-count=1", "./..."] },
  { label: "proto/go — formatting", cwd: resolve(repo, "proto/go"), command: ["gofmt", "-l", "."], requireEmptyStdout: true },
  { label: "proto/go — vet", cwd: resolve(repo, "proto/go"), command: ["go", "vet", "./..."] },
  { label: "proto/go — tests", cwd: resolve(repo, "proto/go"), command: ["go", "test", "-count=1", "./..."] },
  // Kept as its own stage after the arming above absorbed its cache defense:
  // the label is what a red line names, and "wire fixture regeneration" is a
  // different claim from "proto/go tests" even when the same flag protects both.
  {
    label: "proto/go — wire fixture regeneration",
    cwd: resolve(repo, "proto/go"),
    command: ["go", "test", "-count=1", "./cmd/wirefix/"],
  },
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

const installFrozen: Install = (target) => run({
  label: `preflight — ${target.label}`,
  cwd: target.directory,
  command: ["bun", "install", "--frozen-lockfile"],
})

const runInstallPreflight = (
  targets: ReadonlyArray<InstallTarget>,
  install: Install,
): void => {
  for (const target of targets) {
    const modules = resolve(target.directory, "node_modules")
    if (existsSync(modules)) {
      console.log(`\n== preflight — ${target.label} (present)`)
      continue
    }
    if (!existsSync(target.lockfile)) {
      throw new Error(`preflight — ${target.label}: lockfile is missing`)
    }

    const lockBefore = readFileSync(target.lockfile)
    const exitCode = install(target)
    const lockAfter = readFileSync(target.lockfile)
    if (!lockBefore.equals(lockAfter)) {
      writeFileSync(target.lockfile, lockBefore)
      throw new Error(`preflight — ${target.label}: frozen install changed the lockfile`)
    }
    if (exitCode !== 0) {
      throw new Error(`preflight — ${target.label}: frozen install exited ${exitCode}`)
    }
    if (!existsSync(modules)) {
      throw new Error(`preflight — ${target.label}: install did not create node_modules`)
    }
  }
}

const selfTestInstallPreflight = (): void => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "foldlab-gates-preflight-"))
  const resolvedTemp = resolve(tmpdir())
  try {
    const root = resolve(temporaryRoot, "root")
    const proto = resolve(temporaryRoot, "proto/ts")
    mkdirSync(root, { recursive: true })
    mkdirSync(proto, { recursive: true })
    const targets = [
      { label: "root control", directory: root, lockfile: resolve(root, "bun.lock") },
      { label: "proto/ts control", directory: proto, lockfile: resolve(proto, "bun.lock") },
    ] as const
    writeFileSync(targets[0].lockfile, "root-lock\n")
    writeFileSync(targets[1].lockfile, "proto-lock\n")

    const fired: Array<string> = []
    runInstallPreflight(targets, (target) => {
      fired.push(target.label)
      mkdirSync(resolve(target.directory, "node_modules"))
      return 0
    })
    if (fired.join(",") !== "root control,proto/ts control") {
      throw new Error(`install preflight did not fire for both absent states: ${fired.join(",")}`)
    }

    const refusalRoot = resolve(temporaryRoot, "lock-change")
    mkdirSync(refusalRoot)
    const refusalTarget = {
      label: "lockfile-change control",
      directory: refusalRoot,
      lockfile: resolve(refusalRoot, "bun.lock"),
    }
    writeFileSync(refusalTarget.lockfile, "pinned-lock\n")
    let refused = false
    try {
      runInstallPreflight([refusalTarget], (target) => {
        writeFileSync(target.lockfile, "moved-lock\n")
        mkdirSync(resolve(target.directory, "node_modules"))
        return 0
      })
    } catch (error) {
      refused = String(error).includes("frozen install changed the lockfile")
    }
    if (!refused || readFileSync(refusalTarget.lockfile, "utf8") !== "pinned-lock\n") {
      throw new Error("install preflight did not refuse and restore a moved lockfile")
    }
    console.log(
      "\ninstall preflight self-test: PASS (both absent installs fired; lockfile mutation refused and restored)",
    )
  } finally {
    if (!temporaryRoot.startsWith(`${resolvedTemp}\\`) &&
      !temporaryRoot.startsWith(`${resolvedTemp}/`)) {
      throw new Error(`refusing to remove non-temporary preflight directory: ${temporaryRoot}`)
    }
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
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
  selfTestInstallPreflight()
  console.log(
    "\ngate runner self-test: PASS (known pass accepted; planted exit 23, formatting drift, and install preflight controls refused)",
  )
}

if (process.argv.includes("--self-test")) {
  selfTest()
} else {
  runInstallPreflight(installTargets, installFrozen)
  for (const stage of stages) {
    const exitCode = run(stage)
    if (exitCode !== 0) process.exit(exitCode)
  }
  console.log("\nFOLDLAB GATES: PASS")
}
