#!/usr/bin/env node
/**
 * The runtime-portable entry for the `cas` bin.
 *
 * The CLI itself (./cas.ts) is Bun-native by ruling — BunRuntime and
 * BunServices are the platform layer, and the honest v0 distribution
 * bar is repo + bun + mise (FRONTEND ask 11; see PACKAGING.md). This
 * shim implements that bar cleanly rather than pretending otherwise:
 *
 *   - under Bun, it hands straight to the CLI in-process;
 *   - under Node, it re-executes the CLI through the `bun` on PATH,
 *     propagating argv and the exit code;
 *   - where bun is absent, it says exactly what is missing and how to
 *     get it, instead of `env: bun: No such file or directory`.
 *
 * CommonJS on purpose: this file must parse and run under plain Node
 * with zero dependencies installed, before any runtime choice is made.
 * It is a platform boundary, not Effect code — errors here are process
 * exits with guidance, by design.
 *
 * Windows note: Bun ships a real bun.exe, which Node's spawn resolves
 * from PATH without a shell, so no `.cmd` shim or `shell: true` is
 * needed here.
 */
"use strict"
const { spawnSync } = require("node:child_process")
const { join } = require("node:path")

if (process.versions.bun === undefined) {
  const cli = join(__dirname, "cas.ts")
  const result = spawnSync("bun", [cli, ...process.argv.slice(2)], {
    stdio: "inherit",
  })
  if (result.error === undefined) {
    process.exit(result.status === null ? 1 : result.status)
  }
  const guidance = result.error.code === "ENOENT"
    ? [
      "cas: the Bun runtime is required and was not found on PATH.",
      "",
      "This CLI is Bun-native (engines.bun >= 1.4.0). Install one of:",
      "  - mise, then `mise install` in the repository (the pinned route), or",
      "  - bun directly: https://bun.sh",
    ]
    : [`cas: failed to start bun: ${String(result.error)}`]
  console.error(guidance.join("\n"))
  process.exit(127)
} else {
  require("./cas.ts")
}
