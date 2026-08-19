import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
// tsc, so the battery runs them as their own lane. That lane followed the
// TypeScript 7 cutover with it: `@effect/language-service` refuses TS 7 by
// design (`TypeScriptFoundIsNot5Or6`) and names `@effect/tsgo` as its
// successor, so the rules now run through the tsgo CLI — the same mechanism
// the CI workflow moved to at b93d29a. Spawned through the package's own
// entrypoint rather than `node_modules/.bin`, for the reason `tsgoLauncher`
// above states: on POSIX that path is a symlink into this very file, on
// Windows it is a generated shim with a different name.
//
// `--strict` is kept from the pre-cutover lane and means the same thing in
// both CLIs — warnings exit nonzero. Without it the 15 warning-severity rules
// print and pass, which is a coverage drop wearing a green tick.
const effectRulesCommand = (
  project: string,
): readonly [string, ...ReadonlyArray<string>] => [
  "bun",
  resolve(repo, "node_modules", "@effect", "tsgo", "dist", "effect-tsgo.cjs"),
  "diagnostics",
  "--project",
  project,
  "--strict",
]

// Top-level trees the root test stage never owns. `packages/` and `proto/`
// have stages of their own below, and `repos/` is vendored reference source no
// gate may discover (root AGENTS.md, "Effect v4"). `scratch/` joined them when
// the Q1 eval landed: its tests import `ajv` from its own install island, so a
// root stage that claimed them would resolve the import from a gitignored
// `node_modules` on the authoring host and from nothing at all on a fresh
// clone — a green row that only ever proved where it was run.
const stagedElsewhere = new Set([
  ".git",
  "node_modules",
  "packages",
  "proto",
  "repos",
  "scratch",
])

// The candidates git ignores, out of the paths a working-tree walk found. One
// batched `check-ignore` call judges the whole list: the paths go in and come
// back in the identical `./`-prefixed, `/`-separated spelling the walk built,
// so the echo compares as plain strings, and `-z` keeps quoting out of it.
// Exit 1 is check-ignore's "nothing matched"; any other failure — 128 when
// the root is no git repository at all — means git can name nothing to
// ignore, and the walk stands as it would have without git.
const gitIgnored = (
  root: string,
  candidates: ReadonlyArray<string>,
): ReadonlySet<string> => {
  if (candidates.length === 0) return new Set()
  const result = Bun.spawnSync({
    cmd: ["git", "check-ignore", "--stdin", "-z"],
    cwd: root,
    stdin: new TextEncoder().encode(candidates.map((path) => `${path}\u0000`).join("")),
    stdout: "pipe",
    stderr: "pipe",
    env: process.env,
  })
  if (result.exitCode !== 0) return new Set()
  return new Set(
    new TextDecoder().decode(result.stdout).split("\u0000")
      .filter((path) => path !== ""),
  )
}

/**
 * The test files the repository root itself owns, named rather than
 * discovered.
 *
 * `bunfig.toml` scopes bare `bun test` to `packages/` so the vendored tree
 * stays out of discovery — which quietly made the root stage a second full run
 * of `test:packages`, because the two stages resolved to the identical file
 * set and the plait battery paid for itself twice per gates invocation. Naming
 * the root's own files removes the duplicate without narrowing what runs: the
 * walk is over the working tree, so a test file added tomorrow outside those
 * staged trees joins this stage by construction rather than by someone
 * remembering to list it.
 *
 * The working tree, minus what git ignores. A gitignored local playground —
 * a `.reference/` clone, a spike parked beside the repository — exists only
 * on the host that grew it, so a stage that claimed its tests would make
 * "battery green" a claim about which machine ran the battery. The walk's
 * candidates pass through one batched `git check-ignore` before the stage
 * owns them: an ignored file can neither join this stage nor redden it. A
 * root outside any git repository ignores nothing.
 */
const rootOwnedTests = (root: string): ReadonlyArray<string> => {
  const found: Array<string> = []
  const visit = (directory: string, prefix: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules") continue
        if (prefix === "" && stagedElsewhere.has(entry.name)) continue
        visit(resolve(directory, entry.name), path)
      } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        found.push(`./${path}`)
      }
    }
  }
  visit(root, "")
  const ignored = gitIgnored(root, found)
  const claimed = found.filter((path) => !ignored.has(path))
  // An empty argument list would send `bun test` back to bunfig discovery and
  // silently restore the duplicate this stage exists to remove, so an empty
  // walk is a refusal rather than a skip.
  if (claimed.length === 0) throw new Error("root test discovery found no test file")
  return claimed.sort()
}

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
  {
    label: "q1 eval dependencies",
    directory: resolve(repo, "scratch/evals/q1-schema-confusion"),
    lockfile: resolve(repo, "scratch/evals/q1-schema-confusion/bun.lock"),
  },
]

const stages: ReadonlyArray<Stage> = [
  {
    label: "bootstrap — Effect language-service prepare guard",
    cwd: repo,
    command: ["bun", "test", "./scripts/prepare-effect-language-service.test.ts"],
  },
  { label: "root — typecheck", cwd: repo, command: ["bun", "run", "typecheck"] },
  { label: "root — tests", cwd: repo, command: ["bun", "test", ...rootOwnedTests(repo)] },
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
  // The daemon's carriage-invariance differential and its committed control.
  // Both spawn a TypeScript process against the daemon's client URL, so both
  // run from the Go module with the root install already warmed by the
  // preflight above. The differential is the wall the posture transition
  // rests on: without it, every later slice that moves work from the
  // privileged-client posture to the daemon moves it on faith. The control is
  // the other half — one field mutated in one group must fail the comparison,
  // and the stage passes only when it does, because a differential that
  // cannot fail proves nothing.
  {
    label: "daemon — CL-1 session-fact differential",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/daemonwall"],
  },
  {
    label: "daemon — CL-1 differential control (mutated group)",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/daemonwall", "--control"],
  },
  // The supervisor slice's four walls and the vocabulary parity that binds its
  // two languages. Each is run bare from the Go module and each prints its
  // numbers, because a wall whose numbers are not recorded is a claim rather
  // than evidence.
  //
  // The register wall races N supervisors against one store directory for R
  // successive chain positions, one racer out of process, and measures that
  // exactly one incarnation lands per round and that no loser ever bound the
  // client port or wrote to the store. The pin control is the committed
  // refutation beside it: the same stale-token presentation is executed with
  // the incarnation pin and without it, and the stage passes only when the
  // first refuses and the second lands — a control that cannot fail proves
  // nothing about the guard it is controlling.
  {
    label: "daemon — incarnation register wall",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/incarnationwall"],
  },
  {
    label: "daemon — incarnation pin control",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/incarnationwall", "--pin-control"],
  },
  // The incarnation vocabulary crosses the language boundary as a
  // transcription, so its bytes are compared rather than its tables inspected.
  // This stage spawns a TypeScript process, like the CL-1 differential above,
  // and needs the root install already warmed by the preflight.
  {
    label: "daemon — incarnation vocabulary parity",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/incarnationwall", "--parity"],
  },
  // The teardown differential runs three teardowns as three processes and
  // compares the fact chains they leave. The kill arm kills a whole process,
  // because an in-process shutdown is not a process crash. Its consumer control
  // is the other half of the shuttle seam: a consumer wired to the vendor's own
  // lame-duck callback reacts, and the stage passes only when no second reader
  // holding an anchor on the session lane can see that it did.
  {
    label: "daemon — teardown fact-chain differential",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/teardownwall"],
  },
  {
    label: "daemon — lane-driven lame-duck consumer control",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/teardownwall", "--consumer-control"],
  },
  // The server-options slice's four walls. The options a substrate runs under
  // are declared data now, so what the battery measures is that the data is
  // what decides: the inventory refuses at the one admission door, the door
  // refuses because of the inventory and not because of something else, a
  // running incarnation cites the exact value it started under, and the two
  // languages' tables are one table rather than twins.
  //
  // The refusal stage probes every inventory row ON ITS OWN and measures the
  // absence of a server from the host — no listener on either port the refused
  // value named, and an untouched store directory — because "no server was
  // constructed" is a claim about the world rather than about a return value.
  // Its control is the other half: the same enabling values pass the same door
  // over an emptied inventory and must be ADMITTED, since a refusal that cannot
  // be turned off proves nothing about what is doing the refusing.
  {
    label: "daemon — closed-channel refusal",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/optionswall"],
  },
  {
    label: "daemon — closed-channel admission control",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/optionswall", "--admission-control"],
  },
  {
    label: "daemon — options digest citation",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/optionswall", "--citation"],
  },
  // The parity stage spawns a TypeScript process, like the CL-1 differential
  // and the incarnation parity above, and needs the root install already warmed
  // by the preflight. It also carries the oracles that keep it from being two
  // transcriptions agreeing with each other: the pin is checked against the
  // module the binary links, and every row's site is read in the pinned
  // vendor's own source.
  {
    label: "daemon — options schema parity",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/optionswall", "--parity"],
  },
  // The wire vocabulary's parity wall and its executed controls. Five arms —
  // byte parity across the language boundary, every row's provenance digest
  // re-derived from the pinned vendor source as installed, an independently
  // derived row census, per-row closure, and a sweep for wire words written as
  // bare literals anywhere outside the transcription modules — each failing on
  // its own named reason. The wall spawns a TypeScript process for the parity
  // arm, like the CL-1 differential and the options parity above, so it needs
  // the root install already warmed by the preflight; it also reads the pinned
  // vendor sources out of the module cache and the spine's own install, and a
  // pinned source this checkout does not carry FAILS the arm rather than
  // skipping it.
  //
  // The controls stage is the other half: four planted defects — one mutated
  // byte of the committed rendering, one row with its pin dropped, one bare
  // wire word planted in a source tree of the control's own, and one
  // provenance digest edited as a table typed from memory would be — each of
  // which must refute, and each on the arm it was planted against. A control
  // that reddens for the wrong reason proves the wrong thing, so the stage
  // checks which arm refused and not merely that one did.
  {
    label: "daemon — wire vocabulary parity wall",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/wirewall"],
  },
  {
    label: "daemon — wire vocabulary wall controls",
    cwd: resolve(repo, "go"),
    command: ["go", "run", "./cmd/wirewall", "--controls"],
  },
  // The ports-file poll's retirement, in the empty-output shape this battery
  // already uses for formatting drift: the check prints every line in the
  // daemon-backed suite that reaches for a ports file or for the stock-binary
  // harness whose readiness IS that poll, and the runner refuses any output.
  // The detector's own control runs inside it, so a scanner that stopped
  // matching reports itself instead of reading as a pass.
  {
    label: "daemon — ports-file poll retirement",
    cwd: repo,
    command: ["bun", resolve(repo, "scripts/check-daemon-ports-file.ts")],
    requireEmptyStdout: true,
  },
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
  // vacuously. The tsgo CLI inherited that hazard unchanged, and it still
  // looks for the entry spelled `@effect/language-service`: renaming the
  // plugin to `@effect/tsgo` to match the new CLI measures "Checked 0 files
  // out of 28" and exits 0. `proto/ts/tsconfig.json` keeps the old spelling
  // on purpose.
  {
    label: "proto/ts — Effect rules",
    cwd: repo,
    command: effectRulesCommand("proto/ts/tsconfig.json"),
  },
  { label: "proto/ts — tests", cwd: resolve(repo, "proto/ts"), command: ["bun", "test", "."] },
  // The Q1 eval is its own install island, like proto/ts, so its compiler and
  // rules stages run from the repository root against its project while its
  // tests run where its dependencies resolve. Law 9 is what puts the last two
  // rows here: a generated artifact needs a check wired into the battery and a
  // control proving that check can fail, or the artifacts are unwalled.
  {
    label: "q1 eval — typecheck",
    cwd: repo,
    command: tsgoCommand([
      "-p",
      "scratch/evals/q1-schema-confusion/tsconfig.json",
      "--noEmit",
    ]),
  },
  {
    label: "q1 eval — Effect rules",
    cwd: repo,
    command: effectRulesCommand("scratch/evals/q1-schema-confusion/tsconfig.json"),
  },
  {
    label: "q1 eval — tests",
    cwd: resolve(repo, "scratch/evals/q1-schema-confusion"),
    command: ["bun", "test", "./test"],
  },
  {
    label: "q1 eval — generated artifacts",
    cwd: resolve(repo, "scratch/evals/q1-schema-confusion"),
    command: ["bun", "run", "check:generated"],
  },
  {
    label: "q1 eval — generated-artifact control",
    cwd: resolve(repo, "scratch/evals/q1-schema-confusion"),
    command: ["bun", "run", "check:generated-control"],
  },
  // The skills steering wall and its control, in the same shape as the q1
  // pair above: a roster check wired into the battery and a control that
  // replays mutated input and refuses (scripts/check-skills.ts --self-test),
  // or the AGENTS.md skills section is prose only and cannot fail.
  {
    label: "skills — roster agreement",
    cwd: repo,
    command: ["bun", resolve(repo, "scripts/check-skills.ts")],
  },
  {
    label: "skills — roster-agreement control",
    cwd: repo,
    command: ["bun", resolve(repo, "scripts/check-skills.ts"), "--self-test"],
  },
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

const selfTestRootTestDiscovery = (): void => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), "foldlab-gates-root-tests-"))
  const resolvedTemp = resolve(tmpdir())
  try {
    // Two plants the root stage must claim, and five it must leave to the
    // stage that owns them. A discovery that stopped walking would pass a
    // stage that runs nothing; a discovery that stopped excluding would
    // restore the duplicate run this stage exists to remove — or, for the
    // scratch plant, would claim a test whose dependencies the root install
    // does not carry.
    const planted = [
      "scripts",
      "verify/unit",
      "packages/plait/test",
      "proto/ts",
      "repos/effect",
      "docs/node_modules",
      "scratch/evals/q1-schema-confusion/test",
    ] as const
    for (const directory of planted) {
      mkdirSync(resolve(temporaryRoot, directory), { recursive: true })
      writeFileSync(resolve(temporaryRoot, directory, "planted.test.ts"), "")
    }
    const found = rootOwnedTests(temporaryRoot).join(",")
    const wanted = "./scripts/planted.test.ts,./verify/unit/planted.test.ts"
    if (found !== wanted) {
      throw new Error(`root test discovery moved: got ${found}, want ${wanted}`)
    }

    // The assertion above ran while the tree was no repository — the walk
    // that git cannot advise must claim exactly what a bare walk claims. Now
    // the same tree becomes a repository that ignores a local playground,
    // and the plant inside it must leave discovery while the claimed plants
    // stay: an ignore filter inverted, dropped, or matching on the wrong
    // path spelling all turn this red.
    const init = Bun.spawnSync({
      cmd: ["git", "init", "--quiet"],
      cwd: temporaryRoot,
      stdout: "pipe",
      stderr: "pipe",
      env: process.env,
    })
    if (init.exitCode !== 0) {
      throw new Error(`ignored-plant control could not init a repository: git exited ${init.exitCode}`)
    }
    writeFileSync(resolve(temporaryRoot, ".gitignore"), "local-playground/\n")
    mkdirSync(resolve(temporaryRoot, "local-playground"))
    writeFileSync(resolve(temporaryRoot, "local-playground", "planted.test.ts"), "")
    const foundUnderIgnore = rootOwnedTests(temporaryRoot).join(",")
    if (foundUnderIgnore !== wanted) {
      throw new Error(
        `root test discovery did not exclude the gitignored plant: got ${foundUnderIgnore}, want ${wanted}`,
      )
    }

    const emptyRoot = resolve(temporaryRoot, "no-tests")
    mkdirSync(emptyRoot)
    let refusal = ""
    try {
      rootOwnedTests(emptyRoot)
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error)
    }
    if (refusal !== "root test discovery found no test file") {
      throw new Error(`root test discovery accepted an empty tree: ${refusal}`)
    }
    console.log(
      "\nroot test discovery self-test: PASS (scripts and verify plants claimed; packages, proto, vendored, node_modules, and scratch plants left to their stages; gitignored playground plant excluded; empty tree refused)",
    )
  } finally {
    if (!temporaryRoot.startsWith(`${resolvedTemp}\\`) &&
      !temporaryRoot.startsWith(`${resolvedTemp}/`)) {
      throw new Error(`refusing to remove non-temporary root test directory: ${temporaryRoot}`)
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
  selfTestRootTestDiscovery()
  selfTestTypecheckPlant()
  console.log(
    "\ngate runner self-test: PASS (known pass accepted; planted exit 23, formatting drift, five install preflight controls, root test discovery, and the typecheck plant refused)",
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
