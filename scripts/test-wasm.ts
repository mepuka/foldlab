/**
 * Runs the executable WASM wall without laundering its known Unicode-table
 * finding. The two unaffected assertions must pass, the divergence classifier
 * must prove it can fail, and the observed divergent set must remain exactly
 * the frozen #27 allowlist.
 *
 * This command requires an existing `dist/`; build it with
 * `bun run build:wasm` first. Requiring the artifact is deliberate: an absent
 * wall is a refusal at this gate, never a green skip.
 */

import { join } from "node:path"

const root = join(import.meta.dir, "..")
const wall = join(root, "packages/core/test/wasm.wall.test.ts")
const classifier = join(root, "scripts/wasm-wall-divergence.ts")
const requiredEnv = { ...process.env, FOLDLAB_REQUIRE_WASM: "1" }

const checks: ReadonlyArray<{
  readonly command: ReadonlyArray<string>
  readonly env?: Record<string, string | undefined>
}> = [
  {
    command: [process.execPath, "test", wall, "-t", "reproduces the frozen pin"],
    env: requiredEnv,
  },
  {
    command: [process.execPath, "test", wall, "-t", "garbage refuses as data"],
    env: requiredEnv,
  },
  { command: [process.execPath, classifier, "--self-test"] },
  { command: [process.execPath, classifier] },
]

for (const check of checks) {
  const child = Bun.spawn({
    cmd: [...check.command],
    cwd: root,
    env: check.env ?? process.env,
    stdout: "inherit",
    stderr: "inherit",
  })
  const exitCode = await child.exited
  if (exitCode !== 0) process.exit(exitCode)
}
