import {
  copyFileSync,
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

// The gate compiler is the workspace-pinned tsgo, spawned through its JS
// launcher so the invocation is byte-identical on Windows and Linux — a
// `.bin` shim spells differently per platform, and a floating `bunx tsgo`
// would resolve a version the lockfile never pinned. `tsc` stays installed
// as the referee: a tsgo-vs-tsc diagnostic disagreement is a FINDING to
// report, never a reason to silently switch back.
const tsgoLauncher = resolve(
  repo,
  "node_modules",
  "@typescript",
  "native-preview",
  "bin",
  "tsgo",
)
const tsgoCommand = (
  args: ReadonlyArray<string>,
): readonly [string, ...ReadonlyArray<string>] => ["bun", tsgoLauncher, ...args]

// The Effect rules left the typecheck stage when tsgo replaced the patched
// tsc, so the battery runs them as their own lane through the same CLI the
// editor patch comes from. `--strict` turns rule warnings into a nonzero
// exit.
const effectRulesCommand = (
  project: string,
): readonly [string, ...ReadonlyArray<string>] => [
  "bun",
  resolve(repo, "node_modules", "@effect", "language-service", "cli.js"),
  "diagnostics",
  "--project",
  project,
  "--strict",
]

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
  { label: "go — tests", cwd: resolve(repo, "go"), command: ["go", "test", "-count=1", "-v", "./..."] },
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
  { label: "proto/ts — typecheck", cwd: resolve(repo, "proto/ts"), command: tsgoCommand(["--noEmit"]) },
  // proto/ts imports effect but is its own install island, so its Effect
  // rules run here rather than in the root typecheck script. The lane checks
  // files only where the project's tsconfig carries the language-service
  // plugin entry; without it the CLI reports "Checked 0 files" and passes
  // vacuously.
  {
    label: "proto/ts — Effect rules",
    cwd: repo,
    command: effectRulesCommand("proto/ts/tsconfig.json"),
  },
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
      mkdirSync(resolve(target.directory, "node_modules"), { recursive: true })
      return 0
    })
    runInstallPreflight(targets, (target) => {
      fired.push(target.label)
      mkdirSync(resolve(target.directory, "node_modules"), { recursive: true })
      return 0
    })
    if (fired.join(",") !==
      "root control,proto/ts control,root control,proto/ts control") {
      throw new Error(`install preflight did not verify absent and present states: ${fired.join(",")}`)
    }

    const refusalTrace: Array<string> = []
    const requireRefusal = (
      target: InstallTarget,
      install: Install,
      expected: string,
    ): void => {
      let actual = ""
      try {
        runInstallPreflight([target], install)
      } catch (error) {
        actual = error instanceof Error ? error.message : String(error)
      }
      if (actual !== expected) {
        throw new Error(`install preflight refusal moved: got ${actual}, want ${expected}`)
      }
      refusalTrace.push(actual)
    }

    const refusalRoot = resolve(temporaryRoot, "lock-change")
    mkdirSync(refusalRoot)
    const refusalTarget = {
      label: "lockfile-change control",
      directory: refusalRoot,
      lockfile: resolve(refusalRoot, "bun.lock"),
    }
    writeFileSync(refusalTarget.lockfile, "pinned-lock\n")
    requireRefusal(
      refusalTarget,
      (target) => {
        writeFileSync(target.lockfile, "moved-lock\n")
        mkdirSync(resolve(target.directory, "node_modules"))
        return 0
      },
      "preflight — lockfile-change control: frozen install changed the lockfile",
    )
    if (readFileSync(refusalTarget.lockfile, "utf8") !== "pinned-lock\n") {
      throw new Error("install preflight did not refuse and restore a moved lockfile")
    }

    const warmLockfileRoot = resolve(temporaryRoot, "warm-lockfile-drift")
    mkdirSync(resolve(warmLockfileRoot, "node_modules"), { recursive: true })
    copyFileSync(resolve(repo, "proto/ts/package.json"), resolve(warmLockfileRoot, "package.json"))
    const warmLockfile = resolve(warmLockfileRoot, "bun.lock")
    copyFileSync(resolve(repo, "proto/ts/bun.lock"), warmLockfile)
    const pinnedLock = readFileSync(warmLockfile, "utf8")
    const driftedLock = pinnedLock.replaceAll("4.0.0-rc.108", "4.0.0-rc.107")
    if (driftedLock === pinnedLock) {
      throw new Error("warm lockfile-drift control could not plant the lock mismatch")
    }
    writeFileSync(warmLockfile, driftedLock)
    const warmLockfileTarget = {
      label: "warm lockfile-drift control",
      directory: warmLockfileRoot,
      lockfile: warmLockfile,
    }
    let warmInstallOutput = ""
    requireRefusal(
      warmLockfileTarget,
      (target) => {
        console.log(`\n== preflight — ${target.label}`)
        const result = Bun.spawnSync({
          cmd: ["bun", "install", "--frozen-lockfile"],
          cwd: target.directory,
          stdout: "pipe",
          stderr: "pipe",
          env: process.env,
        })
        const stdout = text(result.stdout)
        const stderr = text(result.stderr)
        warmInstallOutput = `${stdout}${stderr}`
        if (stdout !== "") process.stdout.write(stdout)
        if (stderr !== "") process.stderr.write(stderr)
        return result.exitCode
      },
      "preflight — warm lockfile-drift control: frozen install exited 1",
    )
    if (!warmInstallOutput.includes("lockfile is frozen")) {
      throw new Error(
        `warm lockfile-drift control failed for another reason\n${warmInstallOutput}`,
      )
    }

    const frozenExitRoot = resolve(temporaryRoot, "frozen-exit")
    mkdirSync(resolve(frozenExitRoot, "node_modules"), { recursive: true })
    const frozenExitTarget = {
      label: "failing-installer control",
      directory: frozenExitRoot,
      lockfile: resolve(frozenExitRoot, "bun.lock"),
    }
    writeFileSync(frozenExitTarget.lockfile, "pinned-lock\n")
    requireRefusal(
      frozenExitTarget,
      () => 17,
      "preflight — failing-installer control: frozen install exited 17",
    )

    const missingModulesRoot = resolve(temporaryRoot, "missing-modules")
    mkdirSync(missingModulesRoot)
    const missingModulesTarget = {
      label: "missing node_modules control",
      directory: missingModulesRoot,
      lockfile: resolve(missingModulesRoot, "bun.lock"),
    }
    writeFileSync(missingModulesTarget.lockfile, "pinned-lock\n")
    requireRefusal(
      missingModulesTarget,
      () => 0,
      "preflight — missing node_modules control: install did not create node_modules",
    )

    const actualTrace = `${refusalTrace.join("\n")}\n`
    const expectedTrace = readFileSync(resolve(repo, "scripts/gates-preflight.trace.txt"), "utf8")
      .replaceAll("\r\n", "\n")
    if (actualTrace !== expectedTrace) {
      throw new Error(`install preflight trace moved\n${actualTrace}`)
    }
    console.log(
      "\ninstall preflight self-test: PASS (absent and present installs fired; warm lockfile drift, lockfile mutation, exit 17, and missing node_modules refused)",
    )
  } finally {
    if (!temporaryRoot.startsWith(`${resolvedTemp}\\`) &&
      !temporaryRoot.startsWith(`${resolvedTemp}/`)) {
      throw new Error(`refusing to remove non-temporary preflight directory: ${temporaryRoot}`)
    }
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

const selfTestTypecheckPlant = (): void => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "foldlab-gates-typecheck-"))
  const resolvedTemp = resolve(tmpdir())
  try {
    // The temporary project extends the repository's own tsconfig.base.json,
    // copied byte-for-byte, so the plants are judged under the battery's
    // exact compiler options. One stated deviation: `types` is emptied,
    // because ambient bun types do not resolve upward from a temporary
    // directory and no planted violation involves them. The healthy control
    // below is what proves the temporary project itself compiles — a red
    // that appeared without it could be blaming the scaffolding, not the
    // plant.
    copyFileSync(
      resolve(repo, "tsconfig.base.json"),
      resolve(temporaryRoot, "tsconfig.base.json"),
    )
    writeFileSync(
      resolve(temporaryRoot, "tsconfig.json"),
      '{\n  "extends": "./tsconfig.base.json",\n  "compilerOptions": { "types": [] },\n  "include": ["plant.ts"]\n}\n',
    )

    const plant = resolve(temporaryRoot, "plant.ts")
    writeFileSync(plant, [
      'export const plain: string = "42"',
      "export type Opt = { readonly value?: string }",
      "export const opt: Opt = {}",
      "const xs: ReadonlyArray<number> = [1, 2, 3]",
      "export const indexed: number = xs[0] ?? 0",
      "",
    ].join("\n"))
    const healthyExit = run({
      label: "typecheck plant — healthy control",
      cwd: temporaryRoot,
      command: tsgoCommand(["-p", "tsconfig.json", "--noEmit"]),
    })
    if (healthyExit !== 0) {
      throw new Error(`typecheck plant healthy control failed: tsgo exited ${healthyExit}`)
    }

    // Three planted violations, one per option class the battery leans on:
    // plain strict assignability (TS2322), exactOptionalPropertyTypes
    // (TS2375), and noUncheckedIndexedAccess (TS2322 again). The stage
    // command is the same tsgo invocation the real stages use; a typecheck
    // stage that cannot fail proves nothing.
    writeFileSync(plant, [
      "export const plain: string = 42",
      "export type Opt = { readonly value?: string }",
      "export const opt: Opt = { value: undefined }",
      "const xs: ReadonlyArray<number> = [1, 2, 3]",
      "export const indexed: number = xs[0]",
      "",
    ].join("\n"))
    console.log("\n== typecheck plant — planted violations")
    const refused = Bun.spawnSync({
      cmd: [...tsgoCommand(["-p", "tsconfig.json", "--noEmit"])],
      cwd: temporaryRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: process.env,
    })
    const output = `${text(refused.stdout)}${text(refused.stderr)}`
    if (output !== "") process.stdout.write(output)
    if (refused.exitCode !== 1) {
      throw new Error(
        `typecheck plant was not refused: tsgo exited ${refused.exitCode}, want 1`,
      )
    }
    const actualTrace = output.replaceAll("\r\n", "\n")
    const expectedTrace = readFileSync(
      resolve(repo, "scripts/gates-typecheck.trace.txt"),
      "utf8",
    ).replaceAll("\r\n", "\n")
    if (actualTrace !== expectedTrace) {
      throw new Error(`typecheck plant trace moved\n${actualTrace}`)
    }
    console.log(
      "\ntypecheck plant self-test: PASS (healthy control accepted; planted TS2322, TS2375, and indexed-access TS2322 refused)",
    )
  } finally {
    if (!temporaryRoot.startsWith(`${resolvedTemp}\\`) &&
      !temporaryRoot.startsWith(`${resolvedTemp}/`)) {
      throw new Error(`refusing to remove non-temporary typecheck plant directory: ${temporaryRoot}`)
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
  selfTestTypecheckPlant()
  console.log(
    "\ngate runner self-test: PASS (known pass accepted; planted exit 23, formatting drift, five install preflight controls, and the typecheck plant refused)",
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
